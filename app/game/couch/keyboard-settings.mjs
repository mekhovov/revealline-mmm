import { t, onLocaleChange } from '../i18n/index.mjs';
import { KEY_ACTION_LABELS, keyCodeForEvent, keyLabel } from '../key-bindings.mjs';
import { couchKeyboardActions } from './keyboard-bindings.mjs';

const tr = (key, values = {}) => t(`interface:couchKeyboard.${key}`, values);
/** Settings owns capture; the host owns accepted input and the preference store. */
export function mountCouchKeyboardSettings({
  root,
  mode = 'duel',
  prefix = mode === 'team' ? 'coop' : 'race',
  preferences,
  isOpen,
  document: doc = globalThis.document,
  window: win = globalThis.window,
}) {
  const actionsForMode = couchKeyboardActions(mode),
    actionLabel = (action) =>
      action === 'action' && mode === 'team'
        ? tr('support')
        : KEY_ACTION_LABELS[action === 'action' ? 'ability' : action];
  const area = doc.createElement('section');
  area.className = 'multiplayer-keyboard';
  root.append(area);
  const node = (tag, parent = area) => {
    const element = doc.createElement(tag);
    parent.append(element);
    return element;
  };
  const heading = node('h3'),
    intro = node('p'),
    seats = [],
    rows = [],
    removers = [];
  let capturing = null,
    message = null,
    disposed = false,
    lastChanged = null;
  const listen = (element, type, handler, options) => {
    element.addEventListener(type, handler, options);
    removers.push(() => element.removeEventListener(type, handler, options));
  };
  const available = () => !disposed && isOpen() && !area.closest('[hidden],[inert]');
  for (let player = 0; player < 2; player++) {
    const group = node('fieldset'),
      legend = node('legend', group);
    seats.push(legend);
    for (const action of actionsForMode) {
      const row = node('div', group),
        label = node('span', row),
        button = node('button', row);
      row.className = 'couch-keyboard-row';
      button.type = 'button';
      button.className = 'button secondary';
      button.id = `${prefix}-key-${player}-${action}`;
      const entry = { player, action, label, button };
      rows.push(entry);
      listen(button, 'click', () => {
        if (!available()) return;
        capturing = entry;
        message = () => tr('capture', { player: player + 1, action: actionLabel(action) });
        render();
      });
    }
  }
  const status = node('p'),
    persistence = node('p'),
    actions = node('div'),
    cancel = node('button', actions),
    reset = node('button', actions),
    retry = node('button', actions);
  actions.className = 'couch-keyboard-actions';
  status.id = `${prefix}-key-capture-status`;
  persistence.id = `${prefix}-key-save-status`;
  for (const element of [status, persistence]) {
    element.setAttribute('role', 'status');
    element.setAttribute('aria-live', 'polite');
    element.setAttribute('aria-atomic', 'true');
  }
  for (const [button, id] of [
    [cancel, 'cancel'],
    [reset, 'reset'],
    [retry, 'retry'],
  ]) {
    button.type = 'button';
    button.className = 'button secondary';
    button.id = `${prefix}-key-${id}`;
  }
  function render() {
    if (disposed) return;
    const state = preferences.snapshot();
    heading.textContent = tr(mode === 'team' ? 'teamTitle' : 'title');
    intro.textContent = tr(mode === 'team' ? 'teamIntro' : 'intro');
    seats.forEach((seat, player) => {
      seat.textContent = tr('player', { player: player + 1 });
    });
    for (const row of rows) {
      const keys = keyLabel(state.bindings.seats[row.player][row.action]);
      row.label.textContent = actionLabel(row.action);
      row.button.textContent = capturing === row ? tr('listening') : tr('change', { keys });
      row.button.setAttribute(
        'aria-label',
        tr(capturing === row ? 'capture' : 'changeLabel', {
          player: row.player + 1,
          action: actionLabel(row.action),
          keys,
        }),
      );
      row.button.setAttribute('aria-describedby', `${status.id} ${persistence.id}`);
    }
    status.textContent = message?.() ?? tr('ready');
    persistence.textContent =
      state.status === 'session'
        ? `${tr('session')} ${tr(`save.${state.reason || 'unconfirmed'}`)}`
        : state.status === 'saved'
          ? tr('saved')
          : state.status === 'external'
            ? tr('external')
            : '';
    cancel.textContent = tr('cancel');
    cancel.hidden = !capturing;
    retry.textContent = tr('retry');
    if (state.status === 'saved' && doc.activeElement === retry && available())
      (lastChanged ?? reset).focus({ preventScroll: true });
    retry.hidden = state.status !== 'session';
    retry.setAttribute('aria-disabled', String(state.saving));
    reset.textContent = tr('reset');
  }
  function stopCapture(focus = false) {
    if (!capturing) return;
    const previous = capturing;
    capturing = null;
    message = () => tr('cancelled');
    render();
    if (focus && available()) previous.button.focus({ preventScroll: true });
  }
  listen(cancel, 'click', () => stopCapture(true));
  listen(reset, 'click', () => {
    if (!available()) return;
    capturing = null;
    lastChanged = reset;
    message = () => tr('resetDone');
    preferences.reset();
  });
  listen(retry, 'click', () => {
    if (!available() || preferences.snapshot().saving) return;
    void preferences.retry();
  });
  listen(
    win,
    'keydown',
    (event) => {
      if (!capturing || !available()) return;
      const row = capturing,
        code = keyCodeForEvent(event);
      if (event.isComposing || event.keyCode === 229 || ['Dead', 'Process'].includes(event.key)) {
        message = () => tr('composition');
        render();
        return;
      }
      if (code === 'Tab' || event.key === 'Tab') {
        stopCapture();
        return;
      }
      if (
        event.ctrlKey ||
        event.metaKey ||
        event.altKey ||
        (event.shiftKey && !['ShiftLeft', 'ShiftRight'].includes(code))
      ) {
        message = () => tr('modifier');
        render();
        return;
      }
      event.preventDefault();
      event.stopPropagation();
      if (code === 'Escape' || event.key === 'Escape') {
        stopCapture(true);
        return;
      }
      if (event.repeat) return;
      try {
        preferences.set(row.player, row.action, code);
        capturing = null;
        lastChanged = row.button;
        message = () =>
          tr('changed', {
            player: row.player + 1,
            action: actionLabel(row.action),
            key: keyLabel(code),
          });
        render();
        row.button.focus({ preventScroll: true });
      } catch (error) {
        message = () =>
          error.reason === 'conflict'
            ? tr('conflict', { ...error.values, action: actionLabel(error.values.action) })
            : tr('reserved', { key: keyLabel(code) || tr('unknownKey') });
        render();
      }
    },
    true,
  );
  listen(doc, 'focusin', (event) => {
    if (capturing && event.target !== capturing.button && event.target !== cancel) stopCapture();
  });
  const suspend = () => {
    stopCapture();
    preferences.suspend();
  };
  listen(win, 'blur', suspend);
  listen(win, 'pagehide', suspend);
  const stop = preferences.subscribe(render),
    stopLocale = onLocaleChange(render);
  return {
    cancel: stopCapture,
    refresh() {
      stopCapture();
      preferences.refresh();
      render();
    },
    dispose() {
      if (disposed) return;
      disposed = true;
      capturing = null;
      stop();
      stopLocale();
      removers.forEach((remove) => remove());
      area.remove();
    },
  };
}
