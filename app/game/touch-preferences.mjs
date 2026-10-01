import { resolveTouchControls } from './touch-controls.mjs';

export const TOUCH_PREFERENCES_KEY = 'revealline-mmm.touch.v1';

/** Shared presentation preference only. Never writes a campaign/profile or changes rules. */
export function createTouchPreferences({
  storage,
  legacy = null,
  eventTarget = globalThis.window,
  onChange = () => {},
} = {}) {
  if (storage === undefined) {
    try {
      storage = globalThis.localStorage;
    } catch {
      storage = null;
    }
  }
  let value = resolveTouchControls(legacy),
    disposed = false,
    stored = false,
    explicit = false,
    sessionOnly = false,
    warning = '';
  const read = () => {
    try {
      const raw = storage?.getItem(TOUCH_PREFERENCES_KEY);
      if (raw && raw.length <= 512) {
        value = resolveTouchControls(JSON.parse(raw));
        stored = true;
      }
    } catch {
      /* Invalid/denied storage leaves this visit's valid choice intact. */
    }
  };
  read();
  const changed = (event) => {
    if (
      disposed ||
      sessionOnly ||
      warning ||
      event.key !== TOUCH_PREFERENCES_KEY ||
      (event.storageArea && event.storageArea !== storage)
    )
      return;
    const before = JSON.stringify(value);
    read();
    if (JSON.stringify(value) !== before) onChange({ ...value });
  };
  const restored = (event) => {
    if (event.persisted !== true) return;
    changed({ key: TOUCH_PREFERENCES_KEY, storageArea: storage });
  };
  eventTarget?.addEventListener?.('storage', changed);
  eventTarget?.addEventListener?.('pageshow', restored);
  return {
    snapshot: () => ({ ...value }),
    set(next, { persist = true } = {}) {
      if (disposed) return { ...value };
      value = resolveTouchControls(next);
      explicit = true;
      sessionOnly = !persist;
      warning = '';
      if (persist) {
        try {
          if (!storage) throw new Error('Storage unavailable');
          storage.setItem(TOUCH_PREFERENCES_KEY, JSON.stringify(value));
        } catch {
          warning = 'Touch controls changed for this visit; saving is unavailable.';
        }
      }
      onChange({ ...value });
      return { ...value };
    },
    adoptLegacy(next) {
      if (disposed || stored || explicit) return false;
      // Legacy profile reconciliation remains a fallback until a shared choice
      // exists. Imports and Undo cannot silently override another mode's choice.
      read();
      if (stored) return false;
      value = resolveTouchControls(next);
      return true;
    },
    warning: () => warning,
    destroy() {
      disposed = true;
      eventTarget?.removeEventListener?.('storage', changed);
      eventTarget?.removeEventListener?.('pageshow', restored);
    },
  };
}
