import { t } from '../i18n/index.mjs';
/** Repair browser-restored form values from their existing preference owner.
 * Attach after that owner's lifecycle listeners. This view-only adapter neither
 * adopts form values nor changes storage, focus, playback or preference intent. */
export function attachPreferenceRestoration({
  window: host = globalThis.window ?? globalThis,
  getSnapshot,
  render,
} = {}) {
  if (typeof getSnapshot !== 'function' || typeof render !== 'function')
    throw new TypeError(t('interface:preferenceRestorationNeedsASnapshotReaderAndRenderer'));
  const defer = host.setTimeout?.bind(host) ?? globalThis.setTimeout,
    cancelDeferred = host.clearTimeout?.bind(host) ?? globalThis.clearTimeout;
  let disposed = false,
    generation = 0,
    timer = null;
  const current = (ticket) => !disposed && ticket === generation;
  const cancelPending = () => {
    generation++;
    const pending = timer;
    timer = null;
    if (pending !== null) cancelDeferred(pending);
  };
  const repaint = (ticket) => {
    if (!current(ticket)) return;
    const snapshot = getSnapshot();
    if (current(ticket)) render(snapshot);
  };
  const restored = () => {
    if (disposed) return;
    cancelPending();
    const ticket = generation;
    repaint(ticket);
    if (!current(ticket)) return;
    // History can restore form values after pageshow dispatch. Read current
    // intent again in the next task, including any newer explicit/session edit.
    timer = defer(() => {
      if (!current(ticket)) return;
      timer = null;
      repaint(ticket);
    }, 0);
  };
  const dispose = () => {
    if (disposed) return;
    disposed = true;
    cancelPending();
    host.removeEventListener?.('pageshow', restored);
    host.removeEventListener?.('pagehide', departed);
  };
  const departed = (event) => {
    cancelPending();
    if (!event.persisted) dispose();
  };
  host.addEventListener?.('pageshow', restored);
  host.addEventListener?.('pagehide', departed);
  return Object.freeze({ dispose });
}
