export const CONTINUOUS_PLAY_KEY = 'revealline-mmm.continuous-play.v1';
export const CONTINUOUS_PLAY_DEFAULTS = Object.freeze({
  autoNext: true,
  autoRetry: true,
  autoReplay: true,
});
export const VICTORY_CELEBRATION_MS = 5200;
export const AUTO_NEXT_MS = 5000;

let sharedPreferences;
function defaultStorage() {
  try {
    return globalThis.localStorage;
  } catch {
    return null;
  }
}
export function continuousPlayPreferences({
  storage = defaultStorage(),
  window: target = globalThis.window,
} = {}) {
  const shared = storage === defaultStorage();
  if (sharedPreferences && shared) return sharedPreferences;
  let value = { ...CONTINUOUS_PLAY_DEFAULTS },
    reason = '',
    action = 0,
    saving = false,
    disposed = false;
  const listeners = new Set();
  const pending = new Set(),
    saved = new Set();
  const read = () => {
    const next = { ...CONTINUOUS_PLAY_DEFAULTS };
    const raw = storage?.getItem(CONTINUOUS_PLAY_KEY);
    try {
      const record = JSON.parse(raw ?? '{}');
      for (const key of Object.keys(next))
        if (typeof record?.[key] === 'boolean') next[key] = record[key];
    } catch {
      /* An explicit choice can replace an unreadable preference record. */
    }
    return next;
  };
  try {
    value = read();
  } catch {
    /* Startup reads do not claim that an unsaved default has been saved. */
  }
  const notify = () => {
    for (const listener of [...listeners])
      if (!disposed && listeners.has(listener)) listener({ ...value });
  };
  const persistence = (key) => ({
    status: pending.has(key) ? 'session' : saved.has(key) ? 'saved' : 'idle',
    reason: pending.has(key) ? reason : '',
  });
  const save = () => {
    if (disposed || saving || !pending.size) return;
    saving = true;
    const expected = action,
      local = { ...value },
      keys = [...pending];
    let phase = 'read';
    try {
      if (!storage) {
        reason = 'unavailable';
        return;
      }
      // Retry keeps local unsaved choices and the latest saved values for all
      // untouched settings. A different tab cannot silently retire local intent.
      const next = read();
      if (disposed || action !== expected) return;
      for (const key of keys) next[key] = local[key];
      const raw = JSON.stringify(next);
      phase = 'write';
      storage.setItem(CONTINUOUS_PLAY_KEY, raw);
      if (disposed || action !== expected) return;
      phase = 'verify';
      const confirmed = storage.getItem(CONTINUOUS_PLAY_KEY);
      if (disposed || action !== expected) return;
      if (confirmed !== raw) throw new Error('Save was not confirmed.');
      value = next;
      pending.clear();
      saved.clear();
      for (const key of keys) saved.add(key);
      reason = '';
    } catch (error) {
      if (!disposed && action === expected)
        reason =
          error?.name === 'SecurityError'
            ? 'blocked'
            : error?.name === 'QuotaExceededError'
              ? 'full'
              : phase;
    } finally {
      saving = false;
      if (!disposed) notify();
    }
  };
  const changed = (event) => {
    if (
      disposed ||
      (event.key !== CONTINUOUS_PLAY_KEY && !(event.key === null && event.newValue === null)) ||
      (event.storageArea && event.storageArea !== storage)
    )
      return;
    const expected = action;
    try {
      const current = read();
      if (disposed || action !== expected) return;
      for (const key of Object.keys(current)) if (!pending.has(key)) value[key] = current[key];
      saved.clear();
      notify();
    } catch {
      /* An unreadable event has no authority over this session's choices. */
    }
  };
  target?.addEventListener?.('storage', changed);
  const preferences = {
    snapshot: () => ({ ...value }),
    persistence,
    set(key, enabled) {
      if (disposed) throw new Error('Continuous-play preferences are disposed.');
      if (!Object.hasOwn(CONTINUOUS_PLAY_DEFAULTS, key))
        throw new TypeError('Unknown continuous-play preference.');
      value[key] = !!enabled;
      action++;
      pending.add(key);
      reason = 'unconfirmed';
      save();
      return persistence(key);
    },
    retry() {
      if (disposed || !pending.size) return;
      action++;
      save();
    },
    subscribe(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    dispose() {
      disposed = true;
      target?.removeEventListener?.('storage', changed);
      listeners.clear();
      if (sharedPreferences === preferences) sharedPreferences = null;
    },
  };
  if (shared) sharedPreferences = preferences;
  return preferences;
}

/** Presentation clock only. Hosts retain simulation, persistence and loading ownership.
 * Identity is checked again immediately before dispatch, and inactive owners cancel
 * instead of silently restarting a countdown when focus returns. */
export function createContinuousPlayController({
  onNext = () => {},
  onRetry = () => {},
  onChange = () => {},
  isCurrent = () => true,
  isActive = () => true,
  preferences = continuousPlayPreferences(),
} = {}) {
  let state = { phase: 'idle', identity: null, remainingMs: 0 },
    alive = true,
    epoch = 0;
  const listeners = new Set();
  const snapshot = () => ({ ...state });
  const publish = () => {
    onChange(snapshot());
    for (const fn of listeners) fn(snapshot());
  };
  const current = () => alive && isCurrent(state.identity);
  function cancel(reason = 'interaction') {
    epoch++;
    if (state.phase === 'idle' || state.phase === 'cancelled') return;
    state = { ...state, phase: 'cancelled', remainingMs: 0, reason };
    publish();
  }
  function dispatch(action) {
    if (!current()) return cancel('superseded');
    const identity = state.identity;
    const dispatchEpoch = ++epoch;
    state = { ...state, phase: 'idle', remainingMs: 0 };
    publish();
    if (dispatchEpoch !== epoch || !current()) return;
    (action === 'next' ? onNext : onRetry)(identity);
  }
  function phase(name, duration) {
    state = { ...state, phase: name, remainingMs: duration };
    publish();
  }
  function afterLoss() {
    if (state.canRetry && preferences.snapshot().autoRetry) phase('ready', state.readyMs);
    else phase('cancelled', 0);
  }
  function proceed() {
    if (state.phase === 'celebration') {
      if (state.canAdvance && preferences.snapshot().autoNext) phase('countdown', AUTO_NEXT_MS);
      else phase('cancelled', 0);
    } else if (state.phase === 'countdown') dispatch('next');
    else if (state.phase === 'loss-effect') {
      if (preferences.snapshot().autoReplay && state.replayMs > 0) phase('replay', state.replayMs);
      else afterLoss();
    } else if (state.phase === 'replay') afterLoss();
    else if (state.phase === 'ready') dispatch('retry');
  }
  const stopPreferences = preferences.subscribe?.(() => {
    const selected = preferences.snapshot();
    if (
      (state.phase === 'countdown' && !selected.autoNext) ||
      (state.phase === 'ready' && !selected.autoRetry)
    )
      cancel('preference');
  });
  return {
    begin({
      identity,
      outcome,
      canAdvance = false,
      canRetry = true,
      lossEffectMs = 650,
      replayMs = 1920,
      readyMs = 600,
    }) {
      if (!alive) return;
      epoch++;
      state = {
        identity,
        outcome,
        canAdvance,
        canRetry,
        replayMs,
        readyMs,
        phase: outcome === 'won' ? 'celebration' : 'loss-effect',
        remainingMs: outcome === 'won' ? VICTORY_CELEBRATION_MS : lossEffectMs,
      };
      publish();
    },
    advance(deltaMs) {
      if (!alive || ['idle', 'cancelled'].includes(state.phase)) return;
      if (!current()) return cancel('superseded');
      if (!isActive()) return cancel('inactive');
      if (!Number.isFinite(deltaMs) || deltaMs < 0) return;
      const ticket = epoch;
      let available = Math.min(deltaMs, 250);
      while (available >= 0 && ticket === epoch && !['idle', 'cancelled'].includes(state.phase)) {
        const spent = Math.min(available, state.remainingMs);
        state = { ...state, remainingMs: state.remainingMs - spent };
        available -= spent;
        if (state.remainingMs > 0) {
          publish();
          break;
        }
        proceed();
        if (available === 0) break;
      }
    },
    cancel,
    activate(action) {
      if (!['next', 'retry'].includes(action)) throw new TypeError('Unknown continuation action.');
      dispatch(action);
    },
    snapshot,
    subscribe(fn) {
      listeners.add(fn);
      fn(snapshot());
      return () => listeners.delete(fn);
    },
    dispose() {
      cancel('disposed');
      alive = false;
      stopPreferences?.();
      listeners.clear();
    },
  };
}

const FLOW_COPY = {
  en: {
    countdown: 'Next level in {seconds}s',
    celebrating: 'Mission complete!',
    replay: 'Final 8 moves',
    ready: 'Ready…',
    cancel: 'Stay here',
    autoNext: 'Play next level automatically',
    autoRetry: 'Retry automatically after defeat',
    autoReplay: 'Show failure replay automatically',
  },
  uk: {
    countdown: 'Наступний рівень за {seconds} с',
    celebrating: 'Місію завершено!',
    replay: 'Останні 8 ходів',
    ready: 'Приготуйтесь…',
    cancel: 'Залишитися тут',
    autoNext: 'Починати наступний рівень автоматично',
    autoRetry: 'Автоматично повторювати після поразки',
    autoReplay: 'Автоматично показувати повтор поразки',
  },
};
const SAVE_COPY = {
  en: {
    saved: 'Saved on this device.',
    session: 'Session only.',
    unavailable: 'Browser storage is unavailable.',
    blocked: 'The browser blocked saving.',
    full: 'Browser storage is full.',
    read: 'Saved settings could not be read.',
    write: 'These settings could not be saved.',
    verify: 'Saving could not be confirmed.',
    unconfirmed: 'Your latest choice has not been saved yet.',
    retry: 'Retry saving',
  },
  uk: {
    saved: 'Збережено на цьому пристрої.',
    session: 'Лише для цього сеансу.',
    unavailable: 'Сховище браузера недоступне.',
    blocked: 'Браузер заблокував збереження.',
    full: 'Сховище браузера заповнене.',
    read: 'Не вдалося прочитати збережені налаштування.',
    write: 'Не вдалося зберегти ці налаштування.',
    verify: 'Не вдалося підтвердити збереження.',
    unconfirmed: 'Ваш останній вибір ще не збережено.',
    retry: 'Повторити збереження',
  },
};
export function continuousPlayBindings(preferences = continuousPlayPreferences()) {
  return Object.fromEntries(
    Object.keys(CONTINUOUS_PLAY_DEFAULTS).map((key) => [
      key,
      {
        get: () => preferences.snapshot()[key],
        set: (value) => preferences.set(key, value),
        subscribe: (fn) => preferences.subscribe(fn),
        retry: () => preferences.retry(),
        feedback: (locale) => {
          const state = preferences.persistence?.(key),
            copy = SAVE_COPY[String(locale).split('-')[0]] ?? SAVE_COPY.en;
          return {
            text:
              state?.status === 'saved'
                ? copy.saved
                : state?.status === 'session'
                  ? `${copy.session} ${copy[state.reason] ?? copy.unconfirmed}`
                  : '',
            retry: state?.status === 'session',
            retryLabel: copy.retry,
          };
        },
      },
    ]),
  );
}
export function mountContinuousPlayControls({
  document: doc = globalThis.document,
  parent,
  primaryAction = null,
  controller,
  locale = 'en',
  preferences = continuousPlayPreferences(),
} = {}) {
  if (!doc.getElementById('continuous-play-style')) {
    const style = doc.createElement('style');
    style.id = 'continuous-play-style';
    style.textContent = `
.continuous-play-controls {display:flex;align-items:center;flex-wrap:wrap;gap:.35rem .65rem;min-width:0;max-width:100%;margin:0;font-size:.85rem;}
.continuous-play-controls[hidden] {display:none!important;}
.continuous-play-controls p {margin:0;overflow-wrap:anywhere;}
.continuous-play-controls .button {min-height:44px;padding:.35rem .65rem;font-size:inherit;}
.continuous-result-actions {position:sticky;bottom:0;z-index:3;display:flex;flex-wrap:wrap;align-items:center;gap:.5rem;min-width:0;padding-block:.55rem;background:var(--fk-surface,#24292b);}
.continuous-result-actions[hidden] {display:none!important;}
.continuous-result-actions > * {min-width:0;max-width:100%;}
@media(max-width:600px),(max-height:500px) {.continuous-result-actions {scroll-margin-block:1rem;} .continuous-result-actions > .continuous-play-controls {flex:1 1 100%;} .continuous-result-actions > button {min-height:44px;flex:1 1 8rem;}}
`;
    (doc.head || doc.body).append(style);
  }
  const root = doc.createElement('div'),
    status = doc.createElement('p'),
    cancel = doc.createElement('button');
  root.className = 'continuous-play-controls';
  root.dataset.continuousPlay = '';
  status.setAttribute('role', 'status');
  status.setAttribute('aria-live', 'polite');
  cancel.type = 'button';
  cancel.className = 'button secondary';
  cancel.addEventListener('click', () => controller.cancel('player'));
  root.append(status, cancel);
  const action = typeof primaryAction === 'function' ? primaryAction() : primaryAction;
  if (action?.parentElement === parent) action.after(root);
  else parent.append(root);
  let language = locale;
  const render = (state) => {
    if (state.phase === 'cancelled' && !root.hidden) {
      // Pointer-down cancels the timer, not the player's pending click. Keep
      // this exact flex slot until the result retires so sibling targets cannot
      // move between press and release (including wrapped/centred action rows).
      if (root.contains(doc.activeElement)) {
        const target = [...parent.querySelectorAll('button')].find(
          (button) => !root.contains(button) && !button.disabled && !button.hidden,
        );
        target?.focus();
      }
      root.style.visibility = 'hidden';
      root.inert = true;
      return;
    }
    root.style.visibility = '';
    root.inert = false;
    const copy =
      FLOW_COPY[(typeof language === 'function' ? language() : language) === 'uk' ? 'uk' : 'en'];
    const value =
      state.phase === 'countdown'
        ? copy.countdown.replace('{seconds}', Math.ceil(state.remainingMs / 1000))
        : state.phase === 'celebration'
          ? copy.celebrating
          : state.phase === 'replay'
            ? copy.replay
            : state.phase === 'ready'
              ? copy.ready
              : '';
    if (status.textContent !== value) status.textContent = value;
    cancel.textContent = copy.cancel;
    root.hidden = !value;
    cancel.hidden = state.phase !== 'countdown' && state.phase !== 'celebration';
  };
  const stop = controller.subscribe(render);
  const interaction = (event) => {
    if (event.target === cancel || root.contains(event.target)) return;
    if (
      event.type === 'keydown' &&
      !['Tab', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Escape'].includes(event.key)
    )
      return;
    controller.cancel('interaction');
  };
  parent.addEventListener('keydown', interaction);
  parent.addEventListener('pointerdown', interaction);
  return {
    root,
    status,
    cancel,
    preferences,
    setLocale(value) {
      language = value;
      render(controller.snapshot());
    },
    dispose() {
      stop();
      parent.removeEventListener('keydown', interaction);
      parent.removeEventListener('pointerdown', interaction);
      root.remove();
    },
  };
}
