import { createFlightInformationBridge } from './flight-information-bridge.mjs';
import { render } from '../i18n/index.mjs';

// The next HUD presenter reads the same accepted source as the existing caption.
// Exposing only an immutable reading does not give consumers warning/run authority.
const hosts = new WeakMap();
export function readFlightInformation(element) {
  return hosts.get(element)?.() ?? null;
}

export function attachFlightInformation({ element, getState, writeWarning }) {
  const bridge = createFlightInformationBridge();
  let run = null,
    suspended = false,
    disposed = false;
  // Capture accepted notices synchronously: the host may run several fixed ticks
  // before a renderer reads lastBatch. This is recent context, not a replay log.
  let notices = [],
    batches = [],
    omittedNotices = 0,
    omittedBatches = 0;
  const retain = (items, entry, limit) => {
    const next = [...items, entry];
    let omitted = 0;
    while (next.length > 16 || (next.length && JSON.stringify(next).length > limit)) {
      next.shift();
      omitted++;
    }
    return [next, omitted];
  };
  const read = () => {
    const value = bridge.read(getState());
    return (
      value &&
      Object.freeze({
        ...value,
        recentNotices: Object.freeze([...notices]),
        omittedNotices,
        recentBatches: Object.freeze([...batches]),
        omittedBatches,
      })
    );
  };
  hosts.set(element, read);
  const warning = (fullText, cue = null, role = 'host.unknown') => {
    if (disposed || suspended || (run && !bridge.allowsWarning(run))) return false;
    // The existing host writer retains its exact text/cue/expiry assignments.
    const value = writeWarning(fullText, cue);
    if (run && bridge.observeWarning(run, value, role)) {
      const [next, omitted] = retain(notices, bridge.read(getState()).lastWarning, 32768);
      notices = next;
      omittedNotices += omitted;
    }
    return true;
  };
  const commitWarning = (expected, fullText, cue = null, role = 'host.unknown', options) =>
    bridge.commitWarning(
      expected,
      { fullText: render(fullText), cue },
      (_text, nextCue) => warning(fullText, nextCue, role),
      options,
    );
  return Object.freeze({
    adopt(acceptedRun, attempt) {
      const token = bridge.adopt(acceptedRun, attempt);
      if (token) {
        run = acceptedRun;
        notices = [];
        batches = [];
        omittedNotices = omittedBatches = 0;
      }
      return token;
    },
    warning,
    commitWarning,
    captureWarning(role, options) {
      const expected = bridge.token();
      return (fullText, cue = null) => commitWarning(expected, fullText, cue, role, options);
    },
    token: bridge.token,
    begin: bridge.begin,
    observeEvent: bridge.observeEvent,
    finish(ticket) {
      if (!bridge.finish(ticket)) return false;
      const batch = bridge.read(getState()).lastBatch;
      if (batch.events.length) {
        const [next, omitted] = retain(batches, batch, 65536);
        batches = next;
        omittedBatches += omitted;
      }
      return true;
    },
    cancel: bridge.cancel,
    read,
    suspend() {
      suspended = true;
      bridge.suspend();
    },
    resume() {
      if (disposed) return false;
      suspended = false;
      return bridge.resume();
    },
    dispose() {
      disposed = true;
      bridge.dispose();
      notices = batches = [];
      if (hosts.get(element) === read) hosts.delete(element);
    },
  });
}
