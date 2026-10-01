import { boundedJSON, exactKeys } from '../data-json.mjs';

export const JOURNEY_REACTION_PREFERENCES_KEY = 'revealline-mmm.journey-reactions.v1';
const format = 'JourneyReactionPreferencesV1';
export function validateReactionPreferences(source) {
  const value = boundedJSON(source, { maxBytes: 256, maxNodes: 4, maxDepth: 1 });
  exactKeys(value, ['format', 'enabled'], 'Character reaction preferences');
  if (value.format !== format || typeof value.enabled !== 'boolean')
    throw new TypeError('Unsupported character reaction preferences.');
  return Object.freeze(value);
}

/** A presentation-only choice shared by all modes. Loading never writes;
 * invalid/future records remain intact, and failure never prevents play. */
export function createReactionPreferences({
  getStorage = () => globalThis.localStorage,
  window: eventTarget = globalThis,
} = {}) {
  let enabled = true,
    durable = true,
    pending = false,
    disposed = false,
    error = '';
  const listeners = new Set();
  const snapshot = () => Object.freeze({ enabled, durable, error });
  const read = () => {
    const storage = getStorage();
    if (!storage) throw new Error('Storage unavailable.');
    const raw = storage.getItem(JOURNEY_REACTION_PREFERENCES_KEY);
    return { storage, raw, value: raw === null ? null : validateReactionPreferences(raw) };
  };
  const failed = () => {
    durable = false;
    error =
      'Character reaction preference is session-only. Existing saved data was kept where possible. Retry saving when storage is available.';
  };
  const notify = () => {
    for (const listener of [...listeners]) {
      if (disposed || !listeners.has(listener)) continue;
      try {
        listener(snapshot());
      } catch {
        /* Cosmetic views cannot stop play. */
      }
    }
    return snapshot();
  };
  try {
    enabled = read().value?.enabled ?? true;
  } catch {
    enabled = false;
    failed();
  }
  const refresh = (event) => {
    if (disposed || pending) return;
    if (event.type === 'storage' && event.key !== JOURNEY_REACTION_PREFERENCES_KEY) return;
    if (event.type === 'pageshow' && event.persisted !== true) return;
    try {
      const current = read();
      if (
        event.type === 'storage' &&
        (event.storageArea !== current.storage || event.newValue !== current.raw)
      )
        return;
      enabled = current.value?.enabled ?? true;
      durable = true;
      error = '';
    } catch {
      failed();
    }
    notify();
  };
  const save = () => {
    if (disposed) return snapshot();
    try {
      const { storage } = read(); // Do not replace corrupt or newer-format records.
      const raw = JSON.stringify({ format, enabled });
      storage.setItem(JOURNEY_REACTION_PREFERENCES_KEY, raw);
      if (storage.getItem(JOURNEY_REACTION_PREFERENCES_KEY) !== raw)
        throw new Error('Readback failed.');
      pending = false;
      durable = true;
      error = '';
    } catch {
      failed();
    }
    return notify();
  };
  eventTarget?.addEventListener?.('storage', refresh);
  eventTarget?.addEventListener?.('pageshow', refresh);
  return Object.freeze({
    snapshot,
    choose(value) {
      if (disposed) return snapshot();
      if (typeof value !== 'boolean')
        throw new TypeError('Choose whether character reactions are enabled.');
      enabled = value;
      pending = true;
      return save();
    },
    retry() {
      if (pending) return save();
      refresh({ type: 'pageshow', persisted: true });
      return snapshot();
    },
    subscribe(listener) {
      if (disposed || typeof listener !== 'function')
        throw new TypeError('Active reaction preference listener required.');
      listeners.add(listener);
      try {
        listener(snapshot());
      } catch {
        /* Leave the choice usable. */
      }
      return () => listeners.delete(listener);
    },
    dispose() {
      disposed = true;
      listeners.clear();
      eventTarget?.removeEventListener?.('storage', refresh);
      eventTarget?.removeEventListener?.('pageshow', refresh);
    },
  });
}
