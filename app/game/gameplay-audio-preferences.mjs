// Separate from the strict legacy mute/volume record: older pages cannot erase
// this new choice when they save their existing audio controls.
export const GAMEPLAY_AUDIO_KEY = 'revealline-mmm.gameplay-audio-output.v1';
const format = 'GameplayAudioOutputV1';
const observers = new WeakMap();

function decode(raw) {
  if (raw === null) return false;
  if (typeof raw !== 'string' || raw.length > 256) throw new Error('preserved');
  const value = JSON.parse(raw);
  if (
    !value ||
    typeof value !== 'object' ||
    Array.isArray(value) ||
    Object.keys(value).length !== 2 ||
    value.format !== format ||
    typeof value.monoEffects !== 'boolean'
  )
    throw new Error('preserved');
  return value.monoEffects;
}

/** One output choice, no playback or profile writes. Failed intent survives
 * peer/storage events; only explicit choice or Retry attempts persistence. */
export function createGameplayAudioPreferences({
  getStorage = () => globalThis.localStorage,
  window: target = globalThis.window ?? globalThis,
} = {}) {
  let monoEffects = false,
    durable = true,
    reason = '',
    pending = false,
    disposed = false,
    revision = 0;
  const listeners = new Set();
  const pageKey = target && ['object', 'function'].includes(typeof target) ? target : null;
  const peers = (pageKey && observers.get(pageKey)) ?? new Set();
  if (pageKey) observers.set(pageKey, peers);
  const snapshot = () => ({ monoEffects, durable, reason, pending });
  const notify = () => {
    for (const listener of [...listeners]) if (listeners.has(listener)) listener(snapshot());
    return snapshot();
  };
  const read = () => {
    const storage = getStorage();
    if (!storage?.getItem || !storage?.setItem) throw new Error('unavailable');
    const raw = storage.getItem(GAMEPLAY_AUDIO_KEY);
    let value;
    try {
      value = decode(raw);
    } catch {
      throw new Error('preserved');
    }
    return { storage, raw, value };
  };
  const failure = (error) => {
    durable = false;
    reason = ['preserved', 'unconfirmed', 'unavailable'].includes(error?.message)
      ? error.message
      : error?.name === 'QuotaExceededError'
        ? 'full'
        : 'blocked';
  };
  const load = () => {
    const token = revision;
    try {
      const record = read();
      if (disposed || revision !== token || pending) return;
      monoEffects = record.value;
      durable = true;
      reason = '';
    } catch (error) {
      if (!disposed && revision === token && !pending) failure(error);
    }
  };
  load();
  const receivePage = (state) => {
    if (disposed || pending) return;
    revision++;
    ({ monoEffects, durable, reason, pending } = state);
    notify();
  };
  peers.add(receivePage);
  const save = () => {
    if (disposed || !pending) return snapshot();
    const token = revision;
    try {
      const { storage } = read();
      if (disposed || revision !== token) return snapshot();
      const raw = JSON.stringify({ format, monoEffects });
      storage.setItem(GAMEPLAY_AUDIO_KEY, raw);
      if (disposed) return snapshot();
      if (revision !== token) {
        // A reentrant newer choice must not inherit this older write's success.
        if (read().value !== monoEffects) {
          pending = true;
          failure(new Error('unconfirmed'));
          notify();
        }
        return snapshot();
      }
      if (storage.getItem(GAMEPLAY_AUDIO_KEY) !== raw) throw new Error('unconfirmed');
      if (disposed || revision !== token) return snapshot();
      durable = true;
      pending = false;
      reason = '';
    } catch (error) {
      if (!disposed && revision === token) failure(error);
    }
    if (disposed || revision !== token) return snapshot();
    const result = notify();
    if (!disposed && revision === token)
      for (const receive of [...peers]) if (receive !== receivePage) receive(result);
    return snapshot();
  };
  const receive = (event) => {
    if (disposed || pending) return;
    if (event.type === 'pageshow' && event.persisted !== true) return;
    if (event.type === 'storage') {
      if (event.key !== null && event.key !== GAMEPLAY_AUDIO_KEY) return;
      try {
        const current = read();
        if (
          current.storage !== event.storageArea ||
          (event.key === null ? current.raw !== null : current.raw !== event.newValue)
        )
          return;
      } catch {
        return;
      }
    }
    load();
    if (!disposed) notify();
  };
  target?.addEventListener?.('storage', receive);
  target?.addEventListener?.('pageshow', receive);
  return Object.freeze({
    snapshot,
    choose(value) {
      if (disposed) return snapshot();
      if (typeof value !== 'boolean') throw new TypeError('Mono effects must be a boolean.');
      revision++;
      monoEffects = value;
      pending = true;
      return save();
    },
    retry: save,
    subscribe(listener) {
      if (disposed) return () => {};
      listeners.add(listener);
      listener(snapshot());
      return () => listeners.delete(listener);
    },
    dispose() {
      disposed = true;
      revision++;
      listeners.clear();
      peers.delete(receivePage);
      if (pageKey && !peers.size) observers.delete(pageKey);
      target?.removeEventListener?.('storage', receive);
      target?.removeEventListener?.('pageshow', receive);
    },
  });
}
