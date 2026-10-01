import { t, localizedMessage, render } from './i18n/index.mjs';
import { boundedJSON, plainObject } from './data-json.mjs';

export const KEY_BINDINGS_VERSION = 'xonix-keybindings.v1';
export const KEY_BINDING_ACTIONS = Object.freeze([
  'up',
  'down',
  'left',
  'right',
  'ability',
  'pickup',
  'boost',
  'hangar',
  'pause',
  'stop',
]);
export const KEY_ACTION_LABELS = Object.freeze({
  get up() {
    return t('common:controls.moveUp');
  },
  get down() {
    return t('common:controls.moveDown');
  },
  get left() {
    return t('common:controls.moveLeft');
  },
  get right() {
    return t('common:controls.moveRight');
  },
  get ability() {
    return t('common:controls.useAbility');
  },
  get pickup() {
    return t('common:controls.pickUpSupply');
  },
  get boost() {
    return t('common:controls.boost');
  },
  get hangar() {
    return t('common:controls.openHangar');
  },
  get pause() {
    return t('common:controls.pauseResume');
  },
  get stop() {
    return t('common:controls.stopMovement');
  },
});
const freezeConfig = (bindings) =>
  Object.freeze({
    version: KEY_BINDINGS_VERSION,
    bindings: Object.freeze(
      Object.fromEntries(
        Object.entries(bindings).map(([action, codes]) => [action, Object.freeze(codes)]),
      ),
    ),
  });
export const KEY_BINDING_PRESETS = Object.freeze({
  default: freezeConfig({
    up: ['ArrowUp', 'KeyW'],
    down: ['ArrowDown', 'KeyS'],
    left: ['ArrowLeft', 'KeyA'],
    right: ['ArrowRight', 'KeyD'],
    ability: ['KeyE'],
    pickup: ['KeyR'],
    boost: ['ShiftLeft', 'ShiftRight'],
    hangar: ['KeyG'],
    pause: ['Escape', 'KeyP'],
    stop: ['KeyX'],
  }),
  'left-hand': freezeConfig({
    up: ['KeyW'],
    down: ['KeyS'],
    left: ['KeyA'],
    right: ['KeyD'],
    ability: ['KeyE'],
    pickup: ['KeyR'],
    boost: ['ShiftLeft'],
    hangar: ['KeyF'],
    pause: ['Escape', 'KeyQ'],
    stop: ['KeyX'],
  }),
  'right-hand': freezeConfig({
    up: ['KeyI'],
    down: ['KeyK'],
    left: ['KeyJ'],
    right: ['KeyL'],
    ability: ['KeyO'],
    pickup: ['KeyU'],
    boost: ['ShiftRight'],
    hangar: ['KeyH'],
    pause: ['Escape', 'KeyP'],
    stop: ['KeyM'],
  }),
});
export const KEY_BINDING_PRESET_LABELS = Object.freeze({
  get default() {
    return t('common:controls.arrowsWasd');
  },
  get 'left-hand'() {
    return t('common:controls.leftHandWasd');
  },
  get 'right-hand'() {
    return t('common:controls.rightHandIjkl');
  },
});
const DIRECTION_ACTIONS = new Set(['up', 'down', 'left', 'right']);
const IMPULSE_ACTIONS = ['ability', 'pickup', 'hangar', 'pause', 'stop'];
const RESERVED_CODES = new Set([
  'Tab',
  'Enter',
  'NumpadEnter',
  'Space',
  'CapsLock',
  'NumLock',
  'ScrollLock',
  'ContextMenu',
  'PrintScreen',
  'Pause',
  'Fn',
  'FnLock',
  'Power',
  'Sleep',
  'WakeUp',
  'ControlLeft',
  'ControlRight',
  'AltLeft',
  'AltRight',
  'MetaLeft',
  'MetaRight',
]);
const OTHER_CODES = new Set([
  'ArrowUp',
  'ArrowDown',
  'ArrowLeft',
  'ArrowRight',
  'ShiftLeft',
  'ShiftRight',
  'Escape',
  'Home',
  'End',
  'PageUp',
  'PageDown',
  'Insert',
  'Delete',
  'Backspace',
  'Backquote',
  'Minus',
  'Equal',
  'BracketLeft',
  'BracketRight',
  'Backslash',
  'Semicolon',
  'Quote',
  'Comma',
  'Period',
  'Slash',
  'IntlBackslash',
  'IntlRo',
  'IntlYen',
  'NumpadAdd',
  'NumpadSubtract',
  'NumpadMultiply',
  'NumpadDivide',
  'NumpadDecimal',
  'NumpadComma',
  'NumpadEqual',
]);
const reserved = (code) =>
  RESERVED_CODES.has(code) ||
  /^(F\d{1,2}|Browser\w*|Media\w*|Audio\w*|Launch\w*|OS\w*)$/.test(code);
const allowed = (code) => /^(Key[A-Z]|Digit[0-9]|Numpad[0-9])$/.test(code) || OTHER_CODES.has(code);
const ownConfig = (config) => ({
  version: KEY_BINDINGS_VERSION,
  bindings: Object.fromEntries(
    KEY_BINDING_ACTIONS.map((action) => [action, [...config.bindings[action]]]),
  ),
});

function inspect(source) {
  if (source == null) return { config: ownConfig(KEY_BINDING_PRESETS.default), errors: [] };
  if (!plainObject(source))
    return { errors: ['Keyboard bindings must be a plain object or null.'] };
  let config;
  try {
    config = boundedJSON(source, {
      maxBytes: 16384,
      maxNodes: 128,
      maxDepth: 4,
      maxArray: 4,
      maxString: 64,
    });
  } catch (error) {
    return { errors: [error.message] };
  }
  const errors = [];
  if (config.version !== KEY_BINDINGS_VERSION)
    errors.push(`Keyboard bindings version must be ${KEY_BINDINGS_VERSION}.`);
  for (const key of Object.keys(config))
    if (!['version', 'bindings'].includes(key))
      errors.push(`Unknown keyboard configuration field: ${key}.`);
  if (!plainObject(config.bindings))
    return { errors: [...errors, 'Keyboard bindings must contain an action map.'] };
  for (const action of Object.keys(config.bindings))
    if (!KEY_BINDING_ACTIONS.includes(action)) errors.push(`Unknown keyboard action: ${action}.`);
  const claimed = new Map();
  for (const action of KEY_BINDING_ACTIONS) {
    const codes = config.bindings[action];
    if (!Array.isArray(codes) || codes.length < 1 || codes.length > 4) {
      errors.push(`${KEY_ACTION_LABELS[action]} needs 1–4 key codes.`);
      continue;
    }
    for (const code of codes) {
      if (typeof code !== 'string') {
        errors.push(`${KEY_ACTION_LABELS[action]} has a non-string key code.`);
        continue;
      }
      if (reserved(code))
        errors.push(
          `${keyLabel(code)} is reserved for browser, system or focused-control behavior.`,
        );
      else if (!allowed(code)) errors.push(`Unsupported physical key code: ${code}.`);
      if (code === 'Escape' && action !== 'pause')
        errors.push('Escape is reserved for Pause / resume.');
      if (claimed.has(code))
        errors.push(
          `${keyLabel(code)} is already assigned to ${KEY_ACTION_LABELS[claimed.get(code)]}. Each key may appear only once.`,
        );
      else claimed.set(code, action);
    }
  }
  if (!Array.isArray(config.bindings.pause) || !config.bindings.pause.includes('Escape'))
    errors.push('Pause / resume must retain Escape as a fallback.');
  return { config, errors };
}

/** Bounded data only. Does not invoke user getters or mutate caller-owned presets. */
export function validateKeyBindings(source) {
  const { errors } = inspect(source);
  return { valid: errors.length === 0, errors };
}
export function resolveKeyBindings(source = null) {
  const { config, errors } = inspect(source);
  if (errors.length) throw new TypeError(`Invalid keyboard bindings: ${errors.join(' ')}`);
  return ownConfig(config);
}
/** A settings capture replaces one action's aliases; Escape always remains available. */
export function replaceKeyBinding(source, action, code) {
  if (!KEY_BINDING_ACTIONS.includes(action)) throw new TypeError('Unknown keyboard action.');
  const next = resolveKeyBindings(source);
  next.bindings[action] =
    action === 'pause' ? (code === 'Escape' ? ['Escape'] : ['Escape', code]) : [code];
  return resolveKeyBindings(next);
}

const KEY_LABELS = Object.freeze({
  ArrowUp: '↑',
  ArrowDown: '↓',
  ArrowLeft: '←',
  ArrowRight: '→',
  get ShiftLeft() {
    return t('common:controls.leftShift');
  },
  get ShiftRight() {
    return t('common:controls.rightShift');
  },
  Escape: 'Esc',
  get Space() {
    return t('common:controls.space');
  },
  Tab: 'Tab',
  Enter: 'Enter',
  get NumpadEnter() {
    return t('common:controls.numpadEnter');
  },
  Backquote: '`',
  Minus: '−',
  Equal: '=',
  BracketLeft: '[',
  BracketRight: ']',
  Backslash: '\\',
  Semicolon: ';',
  Quote: "'",
  Comma: ',',
  Period: '.',
  Slash: '/',
  PageUp: 'Page Up',
  PageDown: 'Page Down',
  Backspace: 'Backspace',
  get NumpadAdd() {
    return t('common:controls.keyNumpadAdd');
  },
  get NumpadSubtract() {
    return t('common:controls.keyNumpadSubtract');
  },
  get NumpadMultiply() {
    return t('common:controls.keyNumpadMultiply');
  },
  get NumpadDivide() {
    return t('common:controls.keyNumpadDivide');
  },
  get NumpadDecimal() {
    return t('common:controls.keyNumpadDecimal');
  },
  get NumpadComma() {
    return t('common:controls.keyNumpadComma');
  },
  get NumpadEqual() {
    return t('common:controls.keyNumpadEqual');
  },
  IntlBackslash: 'Intl \\',
  IntlRo: 'Intl Ro',
  IntlYen: 'Intl ¥',
});
/** Labels describe physical positions; they are text for textContent, never markup. */
export function keyLabel(code) {
  if (typeof code !== 'string') return 'Unknown key';
  if (Object.hasOwn(KEY_LABELS, code)) return KEY_LABELS[code];
  if (/^Key[A-Z]$/.test(code)) return code.slice(3);
  if (/^Digit[0-9]$/.test(code)) return code.slice(5);
  if (/^Numpad[0-9]$/.test(code)) return `Numpad ${code.slice(6)}`;
  return code.slice(0, 64);
}
export function bindingLabels(source = null) {
  const config = resolveKeyBindings(source);
  return Object.fromEntries(
    KEY_BINDING_ACTIONS.map((action) => [
      action,
      config.bindings[action].map(keyLabel).join(' / '),
    ]),
  );
}
const LEGACY_KEYS = Object.freeze({
  ' ': 'Space',
  Spacebar: 'Space',
  Esc: 'Escape',
  Up: 'ArrowUp',
  Down: 'ArrowDown',
  Left: 'ArrowLeft',
  Right: 'ArrowRight',
  '`': 'Backquote',
  '-': 'Minus',
  '=': 'Equal',
  '[': 'BracketLeft',
  ']': 'BracketRight',
  '\\': 'Backslash',
  ';': 'Semicolon',
  "'": 'Quote',
  ',': 'Comma',
  '.': 'Period',
  '/': 'Slash',
});
/** Use this unconditionally on keyup, including after focus, layout or modifier changes. */
export function keyCodeForEvent(event) {
  if (!event) return null;
  if (
    typeof event.code === 'string' &&
    /^[A-Za-z][A-Za-z0-9]{0,39}$/.test(event.code) &&
    event.code !== 'Unidentified'
  )
    return event.code;
  const key = event.key;
  if (typeof key !== 'string' || ['Dead', 'Process', 'Unidentified'].includes(key)) return null;
  if (/^[a-z]$/i.test(key)) return `Key${key.toUpperCase()}`;
  if (/^[0-9]$/.test(key)) return `${event.location === 3 ? 'Numpad' : 'Digit'}${key}`;
  if (['Shift', 'Control', 'Alt', 'Meta'].includes(key))
    return `${key}${event.location === 2 ? 'Right' : 'Left'}`;
  if (key === 'Enter' && event.location === 3) return 'NumpadEnter';
  if (Object.hasOwn(LEGACY_KEYS, key)) return LEGACY_KEYS[key];
  if (allowed(key) || reserved(key)) return key;
  return null;
}
/**
 * Expects a resolved config. The DOM adapter owns editable/interactive target and
 * modal checks. allowRepeat only identifies repeat keys for preventDefault; it is
 * not permission to repeat an ability, hangar, pause or stop request.
 */
export function actionForKey(config, event, { allowRepeat = false } = {}) {
  if (
    !event ||
    event.defaultPrevented ||
    event.ctrlKey ||
    event.metaKey ||
    event.altKey ||
    event.isComposing ||
    event.keyCode === 229 ||
    ['Dead', 'Process'].includes(event.key) ||
    (!allowRepeat && event.repeat)
  )
    return null;
  const code = keyCodeForEvent(event);
  if (!code) return null;
  if (code === 'Escape') return 'pause';
  const bindings = (config || KEY_BINDING_PRESETS.default).bindings;
  return KEY_BINDING_ACTIONS.find((action) => bindings?.[action]?.includes(code)) || null;
}

/**
 * Optional pure ledger for adapters that need hold/pulse state. Existing pointer
 * and controller ordering can instead keep their own ledger and use actionForKey.
 */
export function createKeyBindingState(source = null) {
  let config = resolveKeyBindings(source),
    order = 0;
  const held = new Map(),
    blocked = new Map();
  let pending = Object.fromEntries(IMPULSE_ACTIONS.map((action) => [action, false]));
  const clearPending = () => {
    pending = Object.fromEntries(IMPULSE_ACTIONS.map((action) => [action, false]));
  };
  function clear() {
    for (const [code, value] of held) blocked.set(code, value.action);
    held.clear();
    clearPending();
    order = 0;
  }
  function keyDown(event, { active = true, editing = false, interactive = false } = {}) {
    const code = keyCodeForEvent(event);
    const action =
      active && !editing && !interactive
        ? actionForKey(config, event, { allowRepeat: true })
        : null;
    if (!action || !code) return { handled: false, pressed: false, action: null, code };
    if (event.repeat || held.has(code) || blocked.has(code))
      return { handled: true, pressed: false, action, code };
    if (['pause', 'hangar', 'stop'].includes(action)) clear();
    held.set(code, { action, order: ++order });
    if (IMPULSE_ACTIONS.includes(action)) pending[action] = true;
    return { handled: true, pressed: true, action, code };
  }
  function keyUp(event) {
    const code = keyCodeForEvent(event);
    const action = held.get(code)?.action || blocked.get(code) || null;
    const released = held.delete(code) || blocked.has(code);
    blocked.delete(code);
    return { handled: released, released, action, code };
  }
  function poll() {
    const newest = [...held.values()]
      .filter((value) => DIRECTION_ACTIONS.has(value.action))
      .sort((a, b) => b.order - a.order)[0];
    const command = {
      direction: newest?.action || null,
      boost: [...held.values()].some((value) => value.action === 'boost'),
      action: pending.ability,
      pickup: pending.pickup,
      hangar: pending.hangar,
      pause: pending.pause,
      stop: pending.stop,
    };
    clearPending();
    return command;
  }
  return Object.freeze({
    keyDown,
    keyUp,
    poll,
    clear,
    get bindings() {
      return ownConfig(config);
    },
    setBindings(next) {
      const replacement = resolveKeyBindings(next);
      clear();
      config = replacement;
    },
  });
}
