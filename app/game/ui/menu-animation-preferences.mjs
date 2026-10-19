// Shared menu motion intent. Reading never writes browser preferences.
export const MENU_ANIMATION_KEY = 'revealline-mmm.menu-animation.v1';
export const MENU_ANIMATION_EVENT = 'revealline-menu-animation';
const owners = new WeakMap();
function owner(win) {
  let state = owners.get(win);
  if (!state) {
    state = { value: true, pending: false, saved: false, reason: '', action: 0, saving: false };
    owners.set(win, state);
  }
  return state;
}
export function getMenuAnimation(win = globalThis.window) {
  if (!win) return true;
  const state = owner(win),
    action = state.action;
  if (state.pending) return state.value;
  try {
    const value = win.localStorage.getItem(MENU_ANIMATION_KEY) !== 'off';
    if (state.pending || state.action !== action) return state.value;
    if (state.value !== value) state.saved = false;
    state.value = value;
  } catch {
    // Keep the most recently read or explicit setting while storage is unavailable.
  }
  return state.value;
}
function notify(win, state) {
  win.dispatchEvent(
    new win.CustomEvent(MENU_ANIMATION_EVENT, { detail: { enabled: state.value } }),
  );
}
function save(win, state) {
  if (!state.pending || state.saving) return;
  state.saving = true;
  const action = state.action,
    raw = state.value ? 'on' : 'off';
  const current = () => state.action === action;
  let phase = 'unavailable';
  try {
    const storage = win.localStorage;
    if (!current()) return;
    if (!storage) throw new Error('Storage unavailable.');
    phase = 'write';
    storage.setItem(MENU_ANIMATION_KEY, raw);
    if (!current()) return;
    phase = 'verify';
    const confirmed = storage.getItem(MENU_ANIMATION_KEY);
    if (!current()) return;
    if (confirmed !== raw) {
      state.reason = 'unconfirmed';
      return;
    }
    state.pending = false;
    state.saved = true;
    state.reason = '';
  } catch (error) {
    if (current())
      state.reason =
        error?.name === 'SecurityError'
          ? 'blocked'
          : error?.name === 'QuotaExceededError'
            ? 'full'
            : phase;
  } finally {
    state.saving = false;
    notify(win, state);
  }
}
export function setMenuAnimation(enabled, win = globalThis.window) {
  const state = owner(win);
  state.value = Boolean(enabled);
  state.pending = true;
  state.saved = false;
  state.reason = 'unconfirmed';
  state.action++;
  save(win, state);
}
/** Observe the same explicit preference across menu surfaces and browser tabs. */
export function subscribeMenuAnimation(listener, win = globalThis.window) {
  const refresh = (event) => {
    if (event?.type === 'storage') {
      if (event.key !== MENU_ANIMATION_KEY && event.key !== null) return;
      try {
        if (event.storageArea && event.storageArea !== win.localStorage) return;
      } catch {
        return;
      }
    }
    listener(getMenuAnimation(win));
  };
  win?.addEventListener?.(MENU_ANIMATION_EVENT, refresh);
  win?.addEventListener?.('storage', refresh);
  win?.addEventListener?.('pageshow', refresh);
  refresh();
  return () => {
    win?.removeEventListener?.(MENU_ANIMATION_EVENT, refresh);
    win?.removeEventListener?.('storage', refresh);
    win?.removeEventListener?.('pageshow', refresh);
  };
}
const copy = {
  en: {
    saved: 'Saved',
    retry: 'Retry saving',
    session: 'Session only. The menu animation choice is active, but could not be saved.',
    unavailable: 'Browser storage is unavailable.',
    blocked: 'Browser storage is blocked.',
    full: 'Browser storage is full.',
    write: 'The browser could not save this choice.',
    verify: 'The saved choice could not be read back.',
    unconfirmed: 'The save could not be confirmed.',
  },
  uk: {
    saved: 'Збережено',
    retry: 'Повторити збереження',
    session: 'Лише в цьому сеансі. Вибір анімації меню діє, але його не вдалося зберегти.',
    unavailable: 'Сховище браузера недоступне.',
    blocked: 'Сховище браузера заблоковане.',
    full: 'Сховище браузера заповнене.',
    write: 'Браузер не зміг зберегти цей вибір.',
    verify: 'Не вдалося прочитати збережений вибір.',
    unconfirmed: 'Не вдалося підтвердити збереження.',
  },
};
/** The existing global-settings feedback contract, also used by native controls. */
export function menuAnimationBinding(win = globalThis.window) {
  const persistence = () => {
    getMenuAnimation(win);
    const state = owner(win);
    return {
      status: state.pending ? 'session' : state.saved ? 'saved' : 'idle',
      reason: state.pending ? state.reason : '',
    };
  };
  return {
    get: () => getMenuAnimation(win),
    revision: () => owner(win).action,
    set: (value) => setMenuAnimation(value, win),
    subscribe: (listener) => subscribeMenuAnimation(listener, win),
    persistence,
    retry: () => save(win, owner(win)),
    feedback(locale = 'en') {
      const labels = copy[String(locale).split('-')[0]] ?? copy.en;
      const state = persistence();
      return {
        text:
          state.status === 'saved'
            ? labels.saved
            : state.status === 'session'
              ? `${labels.session} ${labels[state.reason] || ''}`.trim()
              : '',
        retry: state.status === 'session',
        retryLabel: labels.retry,
      };
    },
  };
}
