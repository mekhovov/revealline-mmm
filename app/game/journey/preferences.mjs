import { boundedJSON, exactKeys } from '../data-json.mjs';
import { journeyPreset } from '../content-design/catalogs.mjs';

export const JOURNEY_PREFERENCES_KEY = 'revealline-mmm.journey-preferences.v1';
export const JOURNEY_PREFERENCES_VERSION = 'JourneyPreferencesV1';

export function validateJourneyPreferences(source) {
  const value = boundedJSON(source, { maxBytes: 256, maxNodes: 4, maxDepth: 1 });
  exactKeys(value, ['format', 'difficulty'], 'Journey preferences');
  if (value.format !== JOURNEY_PREFERENCES_VERSION || typeof value.difficulty !== 'string')
    throw new TypeError('Unsupported Journey preferences.');
  journeyPreset(value.difficulty);
  return Object.freeze(value);
}

/** Next-attempt intent only. Never changes an execution already handed to a host,
 * a Legacy library, or a v1 Journey progress record. Loading never writes. */
export function createJourneyPreferences({
  getStorage = () => globalThis.localStorage,
  window: eventTarget = globalThis,
} = {}) {
  let disposed = false,
    pending = false,
    revision = 0,
    difficulty = 'standard',
    durable = true,
    error = '';
  const listeners = new Set();
  const record = () => ({ format: JOURNEY_PREFERENCES_VERSION, difficulty });
  const snapshot = () => Object.freeze({ difficulty, revision, durable, error });
  const read = () => {
    const storage = getStorage();
    if (!storage) throw new Error('Journey preference storage is unavailable.');
    const raw = storage.getItem(JOURNEY_PREFERENCES_KEY);
    return { storage, raw, value: raw === null ? null : validateJourneyPreferences(raw) };
  };
  const failed = (cause) => {
    durable = false;
    error = `Difficulty applies only to this session. Retry saving or export before closing. ${cause.message}`;
  };
  try {
    difficulty = read().value?.difficulty ?? 'standard';
  } catch (cause) {
    failed(cause);
  }
  const notify = () => {
    for (const listener of [...listeners]) {
      if (!listeners.has(listener) || disposed) continue;
      try {
        listener(snapshot());
      } catch {
        // Presentation failure cannot discard a saved or session-only choice.
      }
    }
    return snapshot();
  };
  const assertActive = () => {
    if (disposed) throw new Error('Journey preferences are disposed.');
  };
  const save = () => {
    try {
      // Validate the existing record first. Never overwrite corrupt/future data,
      // including a record another tab replaced since this page loaded.
      const { storage } = read();
      storage.setItem(JOURNEY_PREFERENCES_KEY, JSON.stringify(record()));
      pending = false;
      durable = true;
      error = '';
    } catch (cause) {
      failed(cause);
    }
    return notify();
  };
  const reconcile = (event) => {
    if (disposed || pending) return;
    if (event.type === 'storage' && event.key !== JOURNEY_PREFERENCES_KEY) return;
    if (event.type === 'pageshow' && event.persisted !== true) return;
    try {
      const current = read();
      if (
        event.type === 'storage' &&
        (event.storageArea !== current.storage || event.newValue !== current.raw)
      )
        return;
      const next = current.value?.difficulty ?? 'standard';
      if (difficulty !== next) revision++;
      difficulty = next;
      durable = true;
      error = '';
    } catch (cause) {
      failed(cause);
    }
    notify();
  };
  eventTarget?.addEventListener?.('storage', reconcile);
  eventTarget?.addEventListener?.('pageshow', reconcile);
  return Object.freeze({
    snapshot,
    choose(next) {
      assertActive();
      validateJourneyPreferences({ format: JOURNEY_PREFERENCES_VERSION, difficulty: next });
      difficulty = next;
      revision++;
      pending = true;
      return save();
    },
    retry() {
      assertActive();
      if (pending) return save();
      reconcile({ type: 'pageshow', persisted: true });
      return snapshot();
    },
    export: () => JSON.stringify(record(), null, 2),
    subscribe(listener) {
      assertActive();
      if (typeof listener !== 'function') throw new TypeError('A preference listener is required.');
      listeners.add(listener);
      try {
        listener(snapshot());
      } catch {
        // Keep the subscription available for a later presentation recovery.
      }
      return () => listeners.delete(listener);
    },
    dispose() {
      disposed = true;
      listeners.clear();
      eventTarget?.removeEventListener?.('storage', reconcile);
      eventTarget?.removeEventListener?.('pageshow', reconcile);
    },
  });
}
