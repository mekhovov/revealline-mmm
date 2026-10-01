import { getLocale, localizedText, t } from '../i18n/index.mjs';
import { createTextDraft } from './controller-text-draft.mjs';

const LAYOUTS = {
  en: ['qwertyuiop', 'asdfghjkl', 'zxcvbnm'],
  uk: ['йцукенгшщзхї', 'фівапролджє', 'ґячсмитьбю'],
  symbols: ['1234567890', '{}[]():,.;', '!@#$%^&*_-', '+="\'\\/<>?`~|'],
};
const TYPES = new Set(['text', 'search', 'email', 'url', 'tel', 'password', 'number', 'color']);
const word = (key) => t(`controllerEditor:${key}`);

export function supportsControllerField(element) {
  return (
    !element.readOnly &&
    (element.tagName === 'TEXTAREA' ||
      (element.tagName === 'INPUT' && TYPES.has(element.type || 'text')))
  );
}

/** Validate a draft without mutating the authoritative control or running its handlers. */
export function controllerFieldError(element, value) {
  if (element.required && !value) return 'required';
  if (element.type === 'color' && !/^#[0-9a-f]{6}$/i.test(value)) return 'color';
  if (element.type === 'number' && value) {
    const number = Number(value),
      min = element.min === '' ? -Infinity : Number(element.min),
      max = element.max === '' ? Infinity : Number(element.max),
      step = Number(element.step || 1);
    if (!/^[+-]?(?:\d+\.?\d*|\.\d+)(?:e[+-]?\d+)?$/i.test(value) || !Number.isFinite(number))
      return 'number';
    if (number < min || number > max) return 'bounds';
    if (element.step !== 'any' && step > 0) {
      const base = Number.isFinite(min) ? min : Number(element.getAttribute('value') || 0),
        distance = (number - base) / step;
      if (Math.abs(distance - Math.round(distance)) > 1e-7) return 'step';
    }
  }
  if (
    Number.isInteger(element.maxLength) &&
    element.maxLength >= 0 &&
    value.length > element.maxLength
  )
    return 'length';
  // Native pattern/email/url constraints remain browser-owned.
  const probe = element.ownerDocument.createElement(element.tagName.toLowerCase());
  for (const name of [
    'type',
    'min',
    'max',
    'step',
    'pattern',
    'required',
    'minlength',
    'maxlength',
    'multiple',
  ]) {
    const attribute = element.getAttribute(name);
    if (attribute !== null) probe.setAttribute(name, attribute);
  }
  probe.value = value;
  if (probe.checkValidity?.() === false) return 'invalid';
  return null;
}

/** An in-game draft editor. No browser/OS keyboard, file access, clipboard or eval is required.
 * It lives inside the owning menu root, so host top-dialog and save ownership remain unchanged.
 */
export function createControllerFieldEditor({
  element,
  root,
  label,
  onFinish,
  activateControl = (target) => target.click(),
  document: doc = element.ownerDocument,
}) {
  const multiline = element.tagName === 'TEXTAREA',
    original = element.value,
    number = element.type === 'number',
    color = element.type === 'color';
  const model = createTextDraft(original, {
    start: typeof element.selectionStart === 'number' ? element.selectionStart : original.length,
    end: typeof element.selectionEnd === 'number' ? element.selectionEnd : original.length,
    maxLength: element.maxLength ?? -1,
  });
  let panel,
    draft,
    status,
    rows = [],
    current = null,
    layout = number || color ? 'symbols' : getLocale(),
    shift = false,
    active = false;
  const contains = (target) => !!panel?.contains(target);
  const focus = (target = current) => {
    if (!target || !active) return;
    current?.classList.remove('controller-focus');
    current = target;
    current.classList.add('controller-focus');
    current.focus({ preventScroll: true });
    current.scrollIntoView({ block: 'nearest', inline: 'nearest', behavior: 'auto' });
  };
  function readDraft() {
    model.adopt(
      draft.value,
      draft.selectionStart ?? draft.value.length,
      draft.selectionEnd ?? draft.value.length,
      draft.selectionDirection,
    );
  }
  function paint() {
    const state = model.snapshot();
    draft.value = state.value;
    draft.setSelectionRange?.(state.start, state.end, state.direction);
    panel
      .querySelector('[data-editor-action="select"]')
      ?.setAttribute('aria-pressed', String(state.selecting));
  }
  function edit(kind, value) {
    if (!active) return;
    if (!model.action(kind, value)) localizedText(status, () => word('length'));
    else status.textContent = '';
    paint();
  }
  function finish(commit) {
    if (!active) return;
    if (
      !element.isConnected ||
      element.value !== original ||
      element.disabled ||
      element.readOnly
    ) {
      onFinish(false);
      return;
    }
    readDraft();
    if (commit) {
      const failure = controllerFieldError(element, model.snapshot().value);
      if (failure) {
        localizedText(status, () => word(failure));
        return;
      }
    }
    onFinish(commit);
  }
  function makeButton(row, key, action, raw = false) {
    const button = doc.createElement('button');
    button.type = 'button';
    button.setAttribute('data-editor-action', key);
    if (raw) button.textContent = key;
    else localizedText(button, () => word(key));
    button.addEventListener('click', () => {
      if (active) action();
    });
    row.append(button);
    return button;
  }
  function makeRow(parent) {
    const row = doc.createElement('div');
    row.className = 'controller-field-editor-row';
    parent.append(row);
    return row;
  }
  function keyboard() {
    const board = panel.querySelector('.controller-field-keyboard');
    const old = current?.getAttribute('data-editor-action');
    for (const child of [...board.children]) child.remove();
    rows = [[draft]];
    const language = makeRow(board);
    for (const id of ['en', 'uk', 'symbols']) {
      const button = makeButton(language, id, () => {
        layout = id;
        keyboard();
      });
      button.setAttribute('aria-pressed', String(layout === id));
    }
    rows.push([...language.children]);
    for (const chars of LAYOUTS[layout]) {
      const row = makeRow(board);
      for (const character of chars) {
        const value = shift
          ? character.toLocaleUpperCase(layout === 'uk' ? 'uk' : 'en')
          : character;
        makeButton(row, value, () => edit('insert', value), true);
      }
      rows.push([...row.children]);
    }
    const typing = makeRow(board);
    const caps = makeButton(typing, 'shift', () => {
      shift = !shift;
      keyboard();
    });
    caps.setAttribute('aria-pressed', String(shift));
    makeButton(typing, 'space', () => edit('insert', ' '));
    makeButton(typing, 'backspace', () => edit('backspace'));
    makeButton(typing, 'delete', () => edit('delete'));
    if (multiline) {
      makeButton(typing, 'newline', () => edit('insert', '\n'));
      makeButton(typing, 'tab', () => edit('insert', '\t'));
    }
    rows.push([...typing.children]);
    const caret = makeRow(board);
    for (const key of ['left', 'right', 'up', 'down', 'home', 'end'])
      makeButton(caret, key, () => edit(key));
    rows.push([...caret.children]);
    const selection = makeRow(board);
    for (const key of ['select', 'all', 'undo', 'redo'])
      makeButton(selection, key, () => edit(key));
    rows.push([...selection.children]);
    if (number) {
      const row = makeRow(board);
      for (const delta of [-10, -1, 1, 10])
        makeButton(
          row,
          `${delta > 0 ? '+' : ''}${delta}`,
          () => {
            const state = model.snapshot(),
              base = Number(state.value || 0),
              step = Number(element.step === 'any' ? 1 : element.step || 1);
            if (!Number.isFinite(base) || !Number.isFinite(step) || step <= 0) return;
            const min = element.min ? Number(element.min) : -Infinity,
              max = element.max ? Number(element.max) : Infinity;
            const value = Math.max(
              min,
              Math.min(max, Number((base + delta * step).toPrecision(12))),
            );
            edit('all');
            edit('insert', String(value));
          },
          true,
        );
      rows.push([...row.children]);
    }
    if (color) {
      const row = makeRow(board);
      for (const value of [
        '#000000',
        '#ffffff',
        '#ff0000',
        '#00ff00',
        '#0000ff',
        '#ffff00',
        '#00ffff',
        '#ff00ff',
      ]) {
        const swatch = makeButton(
          row,
          value,
          () => {
            edit('all');
            edit('insert', value);
          },
          true,
        );
        swatch.style.setProperty?.('--editor-swatch', value);
        swatch.classList.add('controller-color-swatch');
      }
      rows.push([...row.children]);
    }
    const actions = makeRow(board);
    makeButton(actions, 'done', () => finish(true));
    makeButton(actions, 'cancel', () => finish(false));
    rows.push([...actions.children]);
    paint();
    focus(
      rows.flat().find((button) => button.getAttribute('data-editor-action') === old) || rows[2][0],
    );
  }
  function move(direction) {
    const rowIndex = rows.findIndex((row) => row.includes(doc.activeElement)),
      fromRow = rowIndex < 0 ? 2 : rowIndex,
      col = Math.max(0, rows[fromRow].indexOf(doc.activeElement)),
      horizontal = direction === 'left' || direction === 'right',
      delta = direction === 'left' || direction === 'up' ? -1 : 1;
    if (horizontal)
      focus(rows[fromRow][Math.max(0, Math.min(rows[fromRow].length - 1, col + delta))]);
    else {
      const next = rows[Math.max(0, Math.min(rows.length - 1, fromRow + delta))],
        index = Math.round(((col + 0.5) / rows[fromRow].length) * next.length - 0.5);
      focus(next[Math.max(0, Math.min(next.length - 1, index))]);
    }
  }
  return {
    contains,
    focus: () => focus(),
    enter() {
      if (active || !supportsControllerField(element)) return false;
      if (doc.head && !doc.querySelector('link[data-controller-field-style]')) {
        const style = doc.createElement('link');
        style.rel = 'stylesheet';
        style.href = new URL('./controller-field-editor.css', import.meta.url).href;
        style.setAttribute('data-controller-field-style', '');
        doc.head.append(style);
      }
      panel = doc.createElement('section');
      panel.className = 'controller-field-editor';
      panel.setAttribute('role', 'dialog');
      panel.setAttribute('aria-modal', 'true');
      panel.setAttribute('aria-label', label);
      const heading = doc.createElement('h2');
      heading.textContent = label;
      draft = doc.createElement(element.type === 'password' ? 'input' : 'textarea');
      if (element.type === 'password') draft.type = 'password';
      draft.className = 'controller-field-draft';
      draft.rows = multiline ? 5 : 2;
      draft.spellcheck = false;
      draft.setAttribute('aria-label', label);
      draft.setAttribute('data-editor-draft', '');
      if (number) draft.inputMode = 'decimal';
      draft.addEventListener('input', () => {
        readDraft();
        status.textContent = '';
      });
      for (const event of ['select', 'keyup', 'pointerup'])
        draft.addEventListener(event, readDraft);
      const guidance = doc.createElement('p');
      localizedText(guidance, () => word('help'));
      status = doc.createElement('p');
      status.setAttribute('role', 'status');
      const board = doc.createElement('div');
      board.className = 'controller-field-keyboard';
      panel.append(heading, draft, guidance, status, board);
      (root.nodeType === 9 ? doc.body : root).append(panel);
      active = true;
      keyboard();
      return true;
    },
    isCurrent: () =>
      active &&
      panel.isConnected &&
      contains(doc.activeElement) &&
      element.value === original &&
      !element.readOnly,
    handle(command) {
      if (!active) return;
      if (command.back || command.menu) finish(false);
      else if (command.direction) move(command.direction);
      else if (command.confirm && contains(doc.activeElement) && doc.activeElement !== draft)
        activateControl(doc.activeElement);
    },
    keydown(event) {
      if (!contains(event.target)) return false;
      if (event.key === 'Escape') {
        event.preventDefault();
        finish(false);
        return true;
      }
      if (event.key === 'Tab') {
        event.preventDefault();
        const stops = rows.flat(),
          index = stops.indexOf(doc.activeElement);
        focus(stops[(index + (event.shiftKey ? -1 : 1) + stops.length) % stops.length]);
        return true;
      }
      if (event.target === draft) {
        if (event.key === 'Enter' && (!multiline || event.ctrlKey || event.metaKey)) {
          event.preventDefault();
          finish(true);
        }
        return true; // Preserve physical text, selection, multiline and IME editing.
      }
      if (event.key.startsWith('Arrow')) {
        event.preventDefault();
        move(
          { ArrowUp: 'up', ArrowDown: 'down', ArrowLeft: 'left', ArrowRight: 'right' }[event.key],
        );
      }
      return true; // Buttons retain their native Enter/Space activation.
    },
    exit({ commit = false } = {}) {
      if (!active) return;
      const value = model.snapshot().value;
      active = false;
      panel.remove();
      if (commit && value !== original) {
        element.value = value;
        const EventType = doc.defaultView?.Event || Event;
        element.dispatchEvent(new EventType('input', { bubbles: true }));
        element.dispatchEvent(new EventType('change', { bubbles: true }));
      }
    },
  };
}
