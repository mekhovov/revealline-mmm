import { DEFAULT_DIALOGUE_VOLUME } from '../audio/dialogue-mix.mjs';
import { boundedJSON, exactKeys } from '../data-json.mjs';

export const REACTION_OPTIONS_KEY = 'revealline-mmm.reaction-presentation.v1';
export const DEFAULT_REACTION_OPTIONS = Object.freeze({
  sounds: true,
  speech: false,
  subtitles: true,
  volume: DEFAULT_DIALOGUE_VOLUME,
  scale: 1,
  background: true,
  readingTime: 1,
});
const format = 'ReactionPresentationV2';
const pageObservers = new WeakMap();
export function validateReactionOptions(input) {
  const value = boundedJSON(input, { maxBytes: 1024, maxNodes: 12, maxDepth: 1 });
  const legacy = value.format === 'ReactionPresentationV1';
  exactKeys(
    value,
    [
      'format',
      ...Object.keys(DEFAULT_REACTION_OPTIONS).filter((key) => !legacy || key !== 'readingTime'),
    ],
    'Reaction presentation',
  );
  if (
    (!legacy && value.format !== format) ||
    ['sounds', 'speech', 'subtitles', 'background'].some(
      (key) => typeof value[key] !== 'boolean',
    ) ||
    !Number.isFinite(value.volume) ||
    value.volume < 0 ||
    value.volume > 1 ||
    ![1, 1.5, 2].includes(value.scale) ||
    (!legacy && ![1, 2].includes(value.readingTime))
  )
    throw new TypeError('Invalid reaction presentation options.');
  // Read the earlier record without rewriting it. Only an explicit choice or
  // Retry writes the current format to the same preference owner.
  return Object.freeze({ ...value, format, readingTime: legacy ? 1 : value.readingTime });
}

/** Invalid/future bytes are retained; an unavailable store never disables play. */
export function createReactionOptions({
  getStorage = () => globalThis.localStorage,
  window: target = globalThis,
} = {}) {
  let options = { ...DEFAULT_REACTION_OPTIONS },
    durable = true,
    pending = false,
    disposed = false;
  const listeners = new Set();
  const pageKey = target && ['object', 'function'].includes(typeof target) ? target : null;
  const peers = (pageKey && pageObservers.get(pageKey)) ?? new Set();
  if (pageKey) pageObservers.set(pageKey, peers);
  const snapshot = () => ({ ...options, durable });
  const read = () => {
    const storage = getStorage();
    if (!storage) throw new Error('Storage unavailable.');
    const raw = storage.getItem(REACTION_OPTIONS_KEY);
    return {
      storage,
      raw,
      value: raw === null ? DEFAULT_REACTION_OPTIONS : validateReactionOptions(raw),
    };
  };
  const load = () => {
    try {
      const { value } = read();
      options = { ...value };
      delete options.format;
      durable = true;
    } catch {
      durable = false;
    }
  };
  load();
  const notify = () => {
    for (const fn of listeners) fn(snapshot());
    return snapshot();
  };
  const receivePageChoice = (choice) => {
    if (disposed || pending) return;
    options = { ...choice };
    delete options.durable;
    durable = choice.durable;
    notify();
  };
  peers.add(receivePageChoice);
  const save = () => {
    try {
      const { storage } = read();
      const raw = JSON.stringify(validateReactionOptions({ format, ...options }));
      storage.setItem(REACTION_OPTIONS_KEY, raw);
      if (storage.getItem(REACTION_OPTIONS_KEY) !== raw)
        throw new Error('Storage readback failed.');
      durable = true;
      pending = false;
    } catch {
      durable = false;
    }
    const result = notify();
    for (const receive of peers) if (receive !== receivePageChoice) receive(result);
    return result;
  };
  const receive = (event) => {
    if (disposed || pending) return;
    if (event.type === 'pageshow' && event.persisted !== true) return;
    if (event.type === 'storage') {
      if (event.key !== null && event.key !== REACTION_OPTIONS_KEY) return;
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
    notify();
  };
  target?.addEventListener?.('storage', receive);
  target?.addEventListener?.('pageshow', receive);
  return Object.freeze({
    snapshot,
    choose(patch) {
      if (disposed) return snapshot();
      options = { ...validateReactionOptions({ format, ...options, ...patch }) };
      delete options.format;
      pending = true;
      return save();
    },
    retry: save,
    subscribe(fn) {
      listeners.add(fn);
      fn(snapshot());
      return () => listeners.delete(fn);
    },
    dispose() {
      disposed = true;
      listeners.clear();
      peers.delete(receivePageChoice);
      if (pageKey && !peers.size) pageObservers.delete(pageKey);
      target?.removeEventListener?.('storage', receive);
      target?.removeEventListener?.('pageshow', receive);
    },
  });
}
