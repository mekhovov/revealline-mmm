export const MENU_STYLE_PREFERENCES_KEY = 'revealline-mmm.menu-style.v1';
const choices = Object.freeze({
  palette: ['auto', 'ukrainian'],
  ornaments: ['off', 'subtle', 'rich'],
});
const fields = Object.keys(choices);
const defaults = Object.freeze({ palette: 'auto', ornaments: 'subtle' });

function patch(value, complete = false) {
  if (
    !value ||
    typeof value !== 'object' ||
    ![Object.prototype, null].includes(Object.getPrototypeOf(value))
  )
    throw new TypeError('Menu preferences must be plain data.');
  const keys = Reflect.ownKeys(value);
  if (
    !keys.length ||
    keys.some((key) => !fields.includes(key)) ||
    (complete && keys.length !== fields.length)
  )
    throw new TypeError('Unsupported menu preference fields.');
  return Object.fromEntries(
    keys.map((key) => {
      const descriptor = Object.getOwnPropertyDescriptor(value, key);
      if (
        !descriptor?.enumerable ||
        !Object.hasOwn(descriptor, 'value') ||
        !choices[key].includes(descriptor.value)
      )
        throw new TypeError('Invalid menu preference value.');
      return [key, descriptor.value];
    }),
  );
}
function decode(raw) {
  if (typeof raw !== 'string' || raw.length > 256 || new TextEncoder().encode(raw).byteLength > 256)
    return null;
  try {
    return patch(JSON.parse(raw), true);
  } catch {
    return null;
  }
}

/** Page-owned menu chrome policy. Only explicit set() writes this independent
 * two-field record; authored presentation, display, audio and progress stay owned
 * by their existing hosts. No legacy migration or system-motion interpretation. */
export function createMenuStylePreferences({
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
        raw = storage?.getItem(MENU_STYLE_PREFERENCES_KEY);
      return { storage, raw, value: decode(raw) };
    } catch {
      return { storage: null, raw: null, value: null };
    }
  };
  let state = Object.freeze({ ...(read().value ?? defaults), revision: 0 });
  const raw = () => Object.fromEntries(fields.map((key) => [key, state[key]]));
  const notify = () => {
    const errors = [];
    for (const listener of [...listeners]) {
      if (!listeners.has(listener)) continue;
      try {
        listener(state);
      } catch (error) {
        errors.push(error);
      }
    }
    if (errors.length) throw new AggregateError(errors, 'Menu preferences could not be applied.');
    return state;
  };
  const apply = (values) => {
    state = Object.freeze({ ...values, revision: state.revision + 1 });
    return notify();
  };
  const notice = (message) => {
    warning = message;
    try {
      onWarning(message);
    } catch {
      /* Feedback cannot veto accepted local intent. */
    }
  };
  const persist = () => {
    try {
      const allowed = writable();
      if (disposed) return;
      if (!allowed) {
        unsaved = true;
        notice('Menu changes apply only to this session; saving is disabled here.');
        return;
      }
      const storage = getStorage();
      if (disposed) return;
      if (!storage) throw new Error('Storage unavailable.');
      storage.setItem(MENU_STYLE_PREFERENCES_KEY, JSON.stringify(raw()));
      if (disposed) return;
      unsaved = false;
      notice('');
    } catch {
      if (disposed) return;
      unsaved = true;
      notice('Menus changed for this session, but could not be saved for another page.');
    }
  };
  const receive = (event) => {
    if (disposed || unsaved || event.key !== MENU_STYLE_PREFERENCES_KEY) return;
    const revision = state.revision,
      current = read();
    if (
      disposed ||
      unsaved ||
      state.revision !== revision ||
      !current.storage ||
      event.storageArea !== current.storage ||
      event.newValue !== current.raw ||
      !current.value
    )
      return;
    apply(current.value);
  };
  // A frozen page can miss storage events. Only validated current storage may
  // replace saved state; failed or session-only local choices remain owned here.
  const restored = (event) => {
    if (disposed || unsaved || event.persisted !== true) return;
    const revision = state.revision,
      current = read();
    if (
      disposed ||
      unsaved ||
      state.revision !== revision ||
      !current.value ||
      fields.every((key) => state[key] === current.value[key])
    )
      return;
    apply(current.value);
  };
  eventTarget?.addEventListener?.('storage', receive);
  eventTarget?.addEventListener?.('pageshow', restored);
  return Object.freeze({
    snapshot: () => state,
    subscribe(listener) {
      if (disposed) throw new Error('Menu preferences are disposed.');
      if (typeof listener !== 'function') throw new TypeError('Menu listener required.');
      if (listeners.has(listener)) throw new Error('Menu listener already subscribed.');
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
      if (disposed) throw new Error('Menu preferences are disposed.');
      const next = { ...raw(), ...patch(value) };
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
