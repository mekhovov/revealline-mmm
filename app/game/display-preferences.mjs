import { DEFAULT_TEXT_FACE, resolveTextFace } from './text-face.mjs';
import { DEFAULT_TEXT_SIZE, resolveTextSize } from './text-size.mjs';

export const DISPLAY_PREFERENCES_KEY = 'revealline-mmm.display.v1';
const fields = ['textFace', 'textSize', 'reducedEffects'];
const defaults = Object.freeze({
  textFace: DEFAULT_TEXT_FACE,
  textSize: DEFAULT_TEXT_SIZE,
  reducedEffects: false,
});
const motionQuery = '(prefers-reduced-motion: reduce)';

function object(value) {
  if (
    !value ||
    typeof value !== 'object' ||
    ![Object.prototype, null].includes(Object.getPrototypeOf(value))
  )
    throw new TypeError('Display preferences must be plain data.');
  return value;
}
function field(value, key) {
  const descriptor = Object.getOwnPropertyDescriptor(value, key);
  if (!descriptor?.enumerable || !Object.hasOwn(descriptor, 'value'))
    throw new TypeError('Display preferences must contain ordinary fields.');
  if (key === 'textFace') return resolveTextFace(descriptor.value);
  if (key === 'textSize') return resolveTextSize(descriptor.value);
  if (typeof descriptor.value !== 'boolean')
    throw new TypeError('Reduced effects must be a boolean.');
  return descriptor.value;
}
function patch(value, complete = false) {
  const keys = Reflect.ownKeys(object(value));
  if (!keys.length || keys.some((key) => !fields.includes(key)))
    throw new TypeError('Unsupported display preference fields.');
  if (complete && keys.length !== fields.length)
    throw new TypeError('The shared display record must contain all three fields.');
  return Object.fromEntries(keys.map((key) => [key, field(value, key)]));
}
function legacy(value = {}) {
  object(value);
  return Object.fromEntries(
    fields.map((key) => [key, Object.hasOwn(value, key) ? field(value, key) : defaults[key]]),
  );
}
function decode(raw) {
  if (typeof raw !== 'string' || raw.length > 256) return null;
  try {
    return patch(JSON.parse(raw), true);
  } catch {
    return null;
  }
}

/** Page-owned display policy. Only explicit set() writes the separate shared
 * record; legacy profile data and system motion preferences are never saved. */
export function createDisplayPreferences({
  window: eventTarget = globalThis,
  getStorage = () => globalThis.localStorage,
  matchMedia = (query) => eventTarget?.matchMedia?.(query),
  legacyPreferences,
  writable = () => true,
  onWarning = () => {},
} = {}) {
  let disposed = false,
    explicit = false,
    stored = false,
    unsaved = false,
    warning = '',
    warningKey = '',
    systemReduced = false;
  const listeners = new Set();
  let media;
  try {
    media = matchMedia(motionQuery);
    systemReduced = media?.matches === true;
  } catch {
    // A host without this browser capability still has its explicit preference.
  }
  const read = () => {
    try {
      const storage = getStorage(),
        raw = storage?.getItem(DISPLAY_PREFERENCES_KEY);
      return { storage, raw, value: decode(raw) };
    } catch {
      return { storage: null, raw: null, value: null };
    }
  };
  const first = read();
  stored = !!first.value;
  const initial = first.value ?? legacy(legacyPreferences);
  let state = Object.freeze({
    ...initial,
    effectiveReducedEffects: initial.reducedEffects || systemReduced,
    revision: 0,
  });
  const raw = () => Object.fromEntries(fields.map((key) => [key, state[key]]));
  const notify = () => {
    const errors = [];
    for (const listener of [...listeners]) {
      if (!listeners.has(listener)) continue;
      try {
        // A preceding listener's newer action must win during reentrant updates.
        listener(state);
      } catch (error) {
        errors.push(error);
      }
    }
    if (errors.length)
      throw new AggregateError(errors, 'Display preferences could not be applied.');
    return state;
  };
  const apply = (values) => {
    state = Object.freeze({
      ...values,
      effectiveReducedEffects: values.reducedEffects || systemReduced,
      revision: state.revision + 1,
    });
    return notify();
  };
  const notice = (message, key = '') => {
    warning = message;
    warningKey = key;
    try {
      onWarning(message, key);
    } catch {
      // A notice cannot prevent the already accepted display change.
    }
  };
  const persist = () => {
    try {
      if (!writable()) {
        unsaved = true;
        notice(
          'Display changes apply only to this session; saving is disabled here.',
          'common:preferences.displaySessionOnly',
        );
        return;
      }
      const storage = getStorage();
      if (!storage) throw new Error('Storage unavailable.');
      storage.setItem(DISPLAY_PREFERENCES_KEY, JSON.stringify(raw()));
      stored = true;
      unsaved = false;
      notice('');
    } catch {
      unsaved = true;
      notice(
        'Display changed for this session, but could not be saved for another page.',
        'common:preferences.displaySaveFailed',
      );
    }
  };
  const receive = (event) => {
    if (disposed || unsaved || event.key !== DISPLAY_PREFERENCES_KEY) return;
    const current = read();
    if (
      !current.storage ||
      event.storageArea !== current.storage ||
      event.newValue !== current.raw ||
      !current.value
    )
      return;
    stored = true;
    if (fields.every((key) => state[key] === current.value[key])) return;
    apply(current.value);
  };
  const motionChanged = () => {
    if (disposed) return;
    systemReduced = media?.matches === true;
    const effectiveReducedEffects = state.reducedEffects || systemReduced;
    if (state.effectiveReducedEffects === effectiveReducedEffects) return;
    // System changes are not player intent and cannot stale a pending profile seed.
    state = Object.freeze({ ...state, effectiveReducedEffects });
    notify();
  };
  // A frozen page can miss storage/media events. Read current authority when
  // restored, without replacing explicit intent that could not be persisted.
  const restored = (event) => {
    if (disposed || event.persisted !== true) return;
    systemReduced = media?.matches === true;
    if (!unsaved) {
      const current = read();
      if (current.value) {
        stored = true;
        if (fields.some((key) => state[key] !== current.value[key])) {
          apply(current.value);
          return;
        }
      }
    }
    const effectiveReducedEffects = state.reducedEffects || systemReduced;
    if (state.effectiveReducedEffects !== effectiveReducedEffects) {
      state = Object.freeze({ ...state, effectiveReducedEffects });
      notify();
    }
  };
  eventTarget?.addEventListener?.('pageshow', restored);
  eventTarget?.addEventListener?.('storage', receive);
  if (media?.addEventListener) media.addEventListener('change', motionChanged);
  else media?.addListener?.(motionChanged);
  return Object.freeze({
    snapshot: () => state,
    subscribe(listener) {
      if (disposed) throw new Error('Display preferences are disposed.');
      if (typeof listener !== 'function') throw new TypeError('Display listener required.');
      if (listeners.has(listener)) throw new Error('Display listener already subscribed.');
      listeners.add(listener);
      try {
        listener(state);
      } catch (error) {
        listeners.delete(listener);
        throw error;
      }
      return () => listeners.delete(listener);
    },
    set(value) {
      if (disposed) throw new Error('Display preferences are disposed.');
      const next = { ...raw(), ...patch(value) };
      explicit = true;
      try {
        apply(next);
      } finally {
        if (!disposed) persist();
      }
      return state;
    },
    adoptLegacy(value, { expectedRevision = 0 } = {}) {
      if (disposed || stored || explicit || state.revision !== expectedRevision) return false;
      const current = read();
      if (current.value) {
        stored = true;
        apply(current.value);
        return false;
      }
      apply(legacy(value));
      return !explicit && !stored && !disposed && state.revision === expectedRevision + 1;
    },
    getWarning: () => warning,
    getWarningKey: () => warningKey,
    dispose() {
      if (disposed) return;
      disposed = true;
      eventTarget?.removeEventListener?.('storage', receive);
      eventTarget?.removeEventListener?.('pageshow', restored);
      if (media?.removeEventListener) media.removeEventListener('change', motionChanged);
      else media?.removeListener?.(motionChanged);
      listeners.clear();
    },
  });
}
