import { boundedJSON, exactKeys } from './data-json.mjs';

export const ENCOUNTER_DISPLAY_PREFERENCES_KEY = 'revealline-mmm.encounter-display.v1';
const format = 'EncounterDisplayPreferencesV1';
const sessionOnly = 'common:preferences.encounterSessionOnly';
const saveFailed = 'common:preferences.encounterSaveFailed';
const warnings = {
  [sessionOnly]: 'Enemy remains changed for this session; saving is disabled here.',
  [saveFailed]:
    'Enemy remains preference is session-only. Existing saved data was kept where possible. Retry saving when storage is available.',
};

export function validateEncounterDisplayPreferences(source) {
  const value = boundedJSON(source, { maxBytes: 256, maxNodes: 3, maxDepth: 1 });
  exactKeys(value, ['format', 'showRemains'], 'Encounter display preferences');
  if (value.format !== format || typeof value.showRemains !== 'boolean')
    throw new TypeError('Unsupported encounter display preferences.');
  return Object.freeze(value);
}

/** Cosmetic, page-owned authority. Reads never write or repair saved data.
 * Explicit unsaved intent survives cross-tab events and back/forward restores. */
export function createEncounterDisplayPreferences({
  window: eventTarget = globalThis,
  getStorage = () => globalThis.localStorage,
  writable = () => true,
  onWarning = () => {},
} = {}) {
  let disposed = false,
    pending = false,
    saving = false,
    action = 0,
    announcedWarning = '';
  const listeners = new Set();
  const read = () => {
    const storage = getStorage();
    if (!storage) throw new Error('Storage unavailable.');
    const raw = storage.getItem(ENCOUNTER_DISPLAY_PREFERENCES_KEY);
    let value = null;
    try {
      if (raw !== null && typeof raw !== 'string') throw new TypeError('Stored text required.');
      if (raw !== null) value = validateEncounterDisplayPreferences(raw);
    } catch {
      return { storage, raw, valid: false, value: null };
    }
    return { storage, raw, valid: true, value };
  };
  let initial = { showRemains: true, durable: true, warningKey: '' };
  try {
    const current = read();
    if (!current.valid) throw new Error('Saved record is unsupported.');
    initial.showRemains = current.value?.showRemains ?? true;
  } catch {
    initial = { ...initial, durable: false, warningKey: saveFailed };
  }
  let state = Object.freeze({ ...initial, revision: 0 });
  const update = (values, force = false) => {
    if (!force && Object.entries(values).every(([key, value]) => state[key] === value))
      return false;
    state = Object.freeze({ ...state, ...values, revision: state.revision + 1 });
    return true;
  };
  const notify = () => {
    if (disposed) return state;
    if (announcedWarning !== state.warningKey) {
      announcedWarning = state.warningKey;
      try {
        onWarning(warnings[state.warningKey] ?? '', state.warningKey);
      } catch {
        // Feedback cannot undo an accepted cosmetic choice.
      }
    }
    for (const listener of [...listeners]) {
      if (disposed || !listeners.has(listener)) continue;
      try {
        // A preceding observer may have accepted a newer choice.
        listener(state);
      } catch {
        // One cosmetic view cannot prevent other views or play.
      }
    }
    return state;
  };
  const active = (expected) => !disposed && action === expected;
  const save = () => {
    // Injected storage can call back into set/retry. Keep that newer intent
    // pending; do not recursively write while an older setItem is in progress.
    if (disposed || saving) return state;
    saving = true;
    const expected = action;
    try {
      (() => {
        const allowed = writable();
        if (!active(expected)) return;
        if (allowed !== true) {
          update({ durable: false, warningKey: sessionOnly });
          return;
        }
        const current = read();
        if (!active(expected)) return;
        if (!current.valid) throw new Error('Saved record is unsupported.');
        const raw = JSON.stringify({ format, showRemains: state.showRemains });
        current.storage.setItem(ENCOUNTER_DISPLAY_PREFERENCES_KEY, raw);
        if (!active(expected)) return;
        const saved = current.storage.getItem(ENCOUNTER_DISPLAY_PREFERENCES_KEY);
        if (!active(expected)) return;
        if (saved !== raw) throw new Error('Readback failed.');
        pending = false;
        update({ durable: true, warningKey: '' });
      })();
    } catch {
      if (active(expected)) update({ durable: false, warningKey: saveFailed });
    } finally {
      saving = false;
      if (!disposed && pending && action !== expected)
        update({ durable: false, warningKey: saveFailed });
      notify();
    }
    return state;
  };
  const refresh = (event) => {
    if (disposed || pending) return state;
    if (
      event.type === 'storage' &&
      event.key !== ENCOUNTER_DISPLAY_PREFERENCES_KEY &&
      !(event.key === null && event.newValue === null)
    )
      return state;
    if (event.type === 'pageshow' && event.persisted !== true) return state;
    const expected = action;
    let changed = false;
    try {
      const current = read();
      if (!active(expected) || pending) return state;
      if (
        event.type === 'storage' &&
        (event.storageArea !== current.storage || event.newValue !== current.raw)
      )
        return state;
      changed = current.valid
        ? update({
            showRemains: current.value?.showRemains ?? true,
            durable: true,
            warningKey: '',
          })
        : update({ durable: false, warningKey: saveFailed });
    } catch {
      // An unverifiable storage event has no authority over the current choice.
      if (active(expected) && event.type !== 'storage')
        changed = update({ durable: false, warningKey: saveFailed });
    }
    if (changed) {
      action++;
      notify();
    }
    return state;
  };
  const ensureActive = () => {
    if (disposed) throw new Error('Encounter display preferences are disposed.');
  };
  eventTarget?.addEventListener?.('storage', refresh);
  eventTarget?.addEventListener?.('pageshow', refresh);
  notify();
  return Object.freeze({
    snapshot: () => state,
    set(value) {
      ensureActive();
      if (typeof value !== 'boolean') throw new TypeError('Choose whether enemy remains appear.');
      action++;
      pending = true;
      update({ showRemains: value, durable: false }, true);
      return save();
    },
    retry() {
      ensureActive();
      if (!pending) return refresh({ type: 'pageshow', persisted: true });
      action++;
      return save();
    },
    subscribe(listener) {
      ensureActive();
      if (typeof listener !== 'function') throw new TypeError('Encounter listener required.');
      if (listeners.has(listener)) throw new Error('Encounter listener already subscribed.');
      listeners.add(listener);
      try {
        listener(state);
      } catch {
        // A failed cosmetic view does not own the preference.
      }
      return () => listeners.delete(listener);
    },
    dispose() {
      if (disposed) return;
      disposed = true;
      listeners.clear();
      eventTarget?.removeEventListener?.('storage', refresh);
      eventTarget?.removeEventListener?.('pageshow', refresh);
    },
  });
}
