import { DEFAULT_ACTOR_STYLE, resolveActorStyle } from './presentation/actor-style-policy.mjs';

export const ACTOR_STYLE_PREFERENCES_KEY = 'revealline-mmm.actor-style.v1';

function record(value) {
  if (
    !value ||
    typeof value !== 'object' ||
    ![Object.prototype, null].includes(Object.getPrototypeOf(value))
  )
    throw new TypeError('Actor preferences must be plain data.');
  const keys = Reflect.ownKeys(value);
  const field = Object.getOwnPropertyDescriptor(value, 'actorStyle');
  if (
    keys.length !== 1 ||
    keys[0] !== 'actorStyle' ||
    !field?.enumerable ||
    !Object.hasOwn(field, 'value') ||
    typeof field.value !== 'string'
  )
    throw new TypeError('Use only the actorStyle preference.');
  return { actorStyle: resolveActorStyle(field.value) };
}
function decode(raw) {
  if (typeof raw !== 'string' || raw.length > 128) return null;
  try {
    return record(JSON.parse(raw));
  } catch {
    return null;
  }
}

/** Global future-attempt intent only. Subscribers may update controls immediately;
 * gameplay hosts separately choose fresh or retained appearance at their own
 * boundaries. No profile migration, presentation pin or authored media writes.
 */
export function createActorStylePreferences({
  window: eventTarget = globalThis,
  getStorage = () => globalThis.localStorage,
  writable = () => true,
  onWarning = () => {},
} = {}) {
  let disposed = false,
    unsaved = false,
    warning = '';
  const listeners = new Set();
  const read = () => {
    try {
      const storage = getStorage(),
        raw = storage?.getItem(ACTOR_STYLE_PREFERENCES_KEY);
      return { storage, raw, value: decode(raw) };
    } catch {
      return { storage: null, raw: null, value: null };
    }
  };
  let state = Object.freeze({
    ...(read().value ?? { actorStyle: DEFAULT_ACTOR_STYLE }),
    revision: 0,
  });
  const raw = () => ({ actorStyle: state.actorStyle });
  const apply = (value) => {
    state = Object.freeze({ ...value, revision: state.revision + 1 });
    const errors = [];
    for (const listener of [...listeners]) {
      if (!listeners.has(listener)) continue;
      try {
        listener(state);
      } catch (error) {
        errors.push(error);
      }
    }
    if (errors.length) throw new AggregateError(errors, 'Actor preferences could not be applied.');
    return state;
  };
  const notice = (message) => {
    warning = message;
    try {
      onWarning(message);
    } catch {
      // Feedback cannot veto the accepted local choice.
    }
  };
  const persist = () => {
    try {
      const allowed = writable();
      if (disposed) return;
      if (!allowed) {
        unsaved = true;
        notice('Actor changes apply only to this session; saving is disabled here.');
        return;
      }
      const storage = getStorage();
      if (disposed) return;
      if (!storage) throw new Error('Storage unavailable.');
      storage.setItem(ACTOR_STYLE_PREFERENCES_KEY, JSON.stringify(raw()));
      if (disposed) return;
      unsaved = false;
      notice('');
    } catch {
      if (disposed) return;
      unsaved = true;
      notice('Actor choice changed for this session, but could not be saved for another page.');
    }
  };
  const receive = (event) => {
    if (disposed || unsaved || event.key !== ACTOR_STYLE_PREFERENCES_KEY) return;
    const revision = state.revision,
      current = read();
    if (
      disposed ||
      unsaved ||
      state.revision !== revision ||
      !current.storage ||
      event.storageArea !== current.storage ||
      event.newValue !== current.raw ||
      !current.value ||
      current.value.actorStyle === state.actorStyle
    )
      return;
    apply(current.value);
  };
  const restored = (event) => {
    if (disposed || unsaved || event.persisted !== true) return;
    const revision = state.revision,
      current = read();
    if (
      disposed ||
      unsaved ||
      state.revision !== revision ||
      !current.value ||
      current.value.actorStyle === state.actorStyle
    )
      return;
    apply(current.value);
  };
  eventTarget?.addEventListener?.('storage', receive);
  eventTarget?.addEventListener?.('pageshow', restored);
  return Object.freeze({
    snapshot: () => state,
    subscribe(listener) {
      if (disposed) throw new Error('Actor preferences are disposed.');
      if (typeof listener !== 'function') throw new TypeError('Actor listener required.');
      if (listeners.has(listener)) throw new Error('Actor listener already subscribed.');
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
      if (disposed) throw new Error('Actor preferences are disposed.');
      const next = record(value);
      try {
        apply(next);
      } finally {
        if (!disposed) persist();
      }
      return state;
    },
    getWarning: () => warning,
    dispose() {
      if (disposed) return;
      disposed = true;
      eventTarget?.removeEventListener?.('storage', receive);
      eventTarget?.removeEventListener?.('pageshow', restored);
      listeners.clear();
    },
  });
}
