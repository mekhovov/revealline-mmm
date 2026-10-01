import { canonicalJSON, plainObject, required } from './data-json.mjs';
import { exportReplay } from './replay.mjs';
import { snapshotSession, SESSION_STORAGE_BYTES } from './sessions.mjs';
import { prepareAttemptExport } from './attempt-export.mjs';

const adapters = [
  'getState',
  'snapshotCurrent',
  'resolveCampaign',
  'readStored',
  'readBackupMarker',
  'readJournal',
  'withStorageLock',
];
const stateFields = [
  'run',
  'recorder',
  'runId',
  'library',
  'packs',
  'started',
  'paused',
  'practice',
  'courseActive',
  'courseEntry',
  'recordingStopped',
  'contentBusy',
  'sessionBusy',
  'backupBusy',
  'hidden',
  'themeId',
  'bodyId',
];

function ownOptions(value, keys, label) {
  required(plainObject(value), `${label} must be an object.`);
  const result = {};
  for (const key of Reflect.ownKeys(value)) {
    required(keys.includes(key), `${label} contains an unsupported option.`);
    const field = Object.getOwnPropertyDescriptor(value, key);
    required(field.enumerable && Object.hasOwn(field, 'value'), `${label} needs own data fields.`);
    result[key] = field.value;
  }
  return result;
}

function cancelled(message = 'Attempt export was cancelled by a newer change.') {
  const error = new Error(message);
  error.name = 'AbortError';
  return error;
}

function selection(state) {
  const unavailable = (reason) => ({ source: null, label: 'Export attempt', reason });
  if (state.practice || state.courseActive || state.courseEntry)
    return unavailable('Attempt export is unavailable in practice or during training entry.');
  if (state.hidden) return unavailable('Return to the game before exporting an attempt.');
  if (state.contentBusy || state.sessionBusy || state.backupBusy)
    return unavailable('Wait for the current content, saved-flight or backup operation to finish.');
  if (state.started && ['running', 'respawning'].includes(state.run?.status)) {
    if (!state.recorder || state.recordingStopped)
      return unavailable(
        'The current flight lacks a complete recording. An earlier checkpoint may remain in a complete backup.',
      );
    return { source: 'current', label: 'Export current attempt', reason: '' };
  }
  if (state.started && !['won', 'lost'].includes(state.run?.status))
    return unavailable(
      'The current flight state is unavailable; an older checkpoint is not this attempt.',
    );
  return {
    source: 'stored',
    label: 'Export saved attempt',
    reason: ['won', 'lost'].includes(state.run?.status)
      ? 'This exports an earlier saved checkpoint, if one remains; it may be from another run.'
      : '',
  };
}

/**
 * Finite host adapter. Only snapshotCurrent may perform the existing live
 * pause/release/save behavior. All stored-source adapters must be read-only.
 * readStored/readBackupMarker/resolveCampaign/getState/snapshotCurrent are
 * synchronous. readJournal may yield; withStorageLock(work, signal) must await
 * work and release its short backup lock before resolving. A host without Web
 * Locks can pass work through, without claiming cross-store atomicity.
 *
 * Call invalidate on every resume, selection/adoption, close and lifecycle
 * transition, including resume/re-pause with no intervening simulation tick.
 */
export function createAttemptFilePreparer(config) {
  const host = ownOptions(
    config,
    [...adapters, 'resolveMediaIdentityCatalog'],
    'Attempt export adapters',
  );
  for (const key of adapters)
    required(typeof host[key] === 'function', `${key} must be a function.`);
  required(
    host.resolveMediaIdentityCatalog === undefined ||
      typeof host.resolveMediaIdentityCatalog === 'function',
    'The picture identity resolver must be a trusted function.',
  );
  let generation = 0,
    active = null;

  function invalidate() {
    generation++;
    if (active) {
      active.controller.abort();
      active.detach();
      active = null;
    }
  }
  function readState() {
    const value = host.getState();
    required(plainObject(value), 'Attempt export state is unavailable.');
    const state = Object.fromEntries(stateFields.map((key) => [key, value[key]]));
    state.status = value.run?.status;
    return state;
  }
  function source() {
    return Object.freeze(selection(readState()));
  }
  function check(ticket) {
    if (
      active !== ticket ||
      ticket.generation !== generation ||
      ticket.controller.signal.aborted ||
      ticket.external?.aborted
    )
      throw cancelled();
  }
  function stateCurrent(ticket, baseline, selected) {
    check(ticket);
    const state = readState();
    if (
      stateFields.some((key) => state[key] !== baseline[key]) ||
      state.status !== baseline.status ||
      selection(state).source !== selected
    )
      throw cancelled();
    return state;
  }
  function wait(ticket, work) {
    check(ticket);
    return new Promise((resolve, reject) => {
      const signal = ticket.controller.signal;
      let settled = false;
      const finish = (action, value) => {
        if (settled) return;
        settled = true;
        signal.removeEventListener('abort', abort);
        action(value);
      };
      const abort = () => finish(reject, cancelled());
      signal.addEventListener('abort', abort, { once: true });
      Promise.resolve()
        .then(() => {
          check(ticket);
          return work();
        })
        .then(
          (value) => finish(resolve, value),
          (error) => finish(reject, error),
        );
    });
  }
  function markerClear() {
    let marker;
    try {
      marker = host.readBackupMarker();
    } catch (error) {
      throw new Error('Backup transaction marker could not be read.', { cause: error });
    }
    required(
      marker === null || typeof marker === 'string',
      'Backup transaction marker is unreadable.',
    );
    required(
      marker === null,
      'An interrupted or active backup must finish before exporting a saved attempt.',
    );
  }
  function rawStored() {
    let raw;
    try {
      raw = host.readStored();
    } catch (error) {
      throw new Error('Saved attempt could not be read.', { cause: error });
    }
    required(raw === null || typeof raw === 'string', 'Saved attempt is unreadable.');
    return raw;
  }
  async function storedSnapshot(ticket, baseline, expected) {
    return wait(ticket, () =>
      host.withStorageLock(async () => {
        stateCurrent(ticket, baseline, 'stored');
        markerClear();
        let journal;
        try {
          journal = await wait(ticket, () => host.readJournal());
        } catch (error) {
          if (error?.name === 'AbortError') throw error;
          throw new Error('Backup recovery journal could not be read.', { cause: error });
        }
        stateCurrent(ticket, baseline, 'stored');
        required(journal !== undefined, 'Backup recovery journal is unreadable.');
        required(
          journal === null,
          'An interrupted or unreadable backup journal must be recovered before exporting a saved attempt.',
        );
        markerClear();
        const raw = rawStored();
        if (expected !== undefined && raw !== expected)
          throw cancelled('The saved checkpoint changed during export.');
        required(raw !== null, 'No saved attempt to export.');
        required(
          raw.length <= SESSION_STORAGE_BYTES &&
            new TextEncoder().encode(raw).byteLength <= SESSION_STORAGE_BYTES,
          'The stored attempt exceeds its local byte budget; preserve the original bytes for recovery.',
        );
        return raw;
      }, ticket.controller.signal),
    );
  }

  async function prepare(options = {}) {
    invalidate();
    const { signal, onProgress } = ownOptions(
      options,
      ['signal', 'onProgress'],
      'Attempt preparation options',
    );
    required(
      onProgress === undefined || typeof onProgress === 'function',
      'onProgress must be a function.',
    );
    required(
      signal === undefined ||
        (signal !== null &&
          typeof signal === 'object' &&
          typeof signal.aborted === 'boolean' &&
          typeof signal.addEventListener === 'function' &&
          typeof signal.removeEventListener === 'function'),
      'signal must be an AbortSignal capability.',
    );
    const controller = new AbortController();
    const abort = () => controller.abort();
    const ticket = {
      generation,
      controller,
      external: signal,
      detach: () => signal?.removeEventListener('abort', abort),
    };
    active = ticket;
    if (signal?.aborted) abort();
    else signal?.addEventListener('abort', abort, { once: true });
    try {
      check(ticket);
      let baseline = readState();
      const selected = selection(baseline);
      required(selected.source !== null, selected.reason);
      let session, raw, replayText;
      if (selected.source === 'current') {
        const before = baseline;
        session = snapshotSession(host.snapshotCurrent());
        check(ticket);
        baseline = readState();
        required(
          baseline.paused && selection(baseline).source === 'current',
          'The current attempt must remain paused for export.',
        );
        if (['run', 'recorder', 'runId'].some((key) => baseline[key] !== before[key]))
          throw cancelled();
        required(
          session.runId === baseline.runId &&
            session.themeId === baseline.themeId &&
            session.bodyId === baseline.bodyId,
          'Current attempt snapshot identity differs.',
        );
        replayText = canonicalJSON(session.replay);
      } else {
        raw = await storedSnapshot(ticket, baseline);
        session = snapshotSession(raw);
      }
      const assertCurrent = () => {
        const state = stateCurrent(ticket, baseline, selected.source);
        if (selected.source === 'current') {
          if (
            !state.paused ||
            canonicalJSON(exportReplay(state.recorder, state.run)) !== replayText
          )
            throw cancelled('The current flight or recording changed during export.');
        } else {
          markerClear();
          if (rawStored() !== raw) throw cancelled('The saved checkpoint changed during export.');
        }
        check(ticket);
      };
      assertCurrent();
      const campaign = host.resolveCampaign(session.campaignKey);
      stateCurrent(ticket, baseline, selected.source);
      // Context resolution is synchronous; missing content is explicit. Any
      // other value is supplied to the strict verifier and must not downgrade.
      const prepared = await prepareAttemptExport(session, {
        ...(campaign === null || campaign === undefined ? {} : { campaign }),
        ...(session.presentationPins
          ? { mediaIdentityCatalog: host.resolveMediaIdentityCatalog?.() }
          : {}),
        signal: controller.signal,
        onProgress: (progress) => {
          stateCurrent(ticket, baseline, selected.source);
          onProgress?.(progress);
          stateCurrent(ticket, baseline, selected.source);
        },
      });
      if (selected.source === 'stored') await storedSnapshot(ticket, baseline, raw);
      assertCurrent();
      return Object.freeze({ ...prepared, source: selected.source, assertCurrent });
    } catch (error) {
      controller.abort();
      ticket.detach();
      if (active === ticket) active = null;
      throw error;
    }
  }

  return Object.freeze({ source, prepare, invalidate });
}
