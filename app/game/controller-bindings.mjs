import { t, localizedMessage, render } from './i18n/index.mjs';
import { boundedJSON, plainObject } from './data-json.mjs';

export const CONTROLLER_BINDINGS_VERSION = 'xonix-controllerbindings.v1';
export const CONTROLLER_GLYPH_FAMILIES = Object.freeze(['generic', 'xbox', 'playstation']);
export const CONTROLLER_BINDING_ACTIONS = Object.freeze({
  flight: Object.freeze([
    'up',
    'down',
    'left',
    'right',
    'ability',
    'pickup',
    'boost',
    'hangar',
    'stop',
    'pause',
  ]),
  menu: Object.freeze(['up', 'down', 'left', 'right', 'confirm', 'back', 'menu']),
});
export const CONTROLLER_ACTION_LABELS = Object.freeze({
  flight: Object.freeze({
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
    get stop() {
      return t('common:controls.stopMovement');
    },
    get pause() {
      return t('common:controls.pause');
    },
  }),
  menu: Object.freeze({
    get up() {
      return t('common:controls.focusUp');
    },
    get down() {
      return t('common:controls.focusDown');
    },
    get left() {
      return t('common:controls.focusLeft');
    },
    get right() {
      return t('common:controls.focusRight');
    },
    get confirm() {
      return t('common:controls.confirm');
    },
    get back() {
      return t('common:controls.backCancel');
    },
    get menu() {
      return t('common:controls.resumePausedFlight');
    },
  }),
});
const CONTEXTS = Object.freeze(['flight', 'menu']);
const STICK_KEYS = ['enabled', 'xAxis', 'yAxis', 'invertX', 'invertY'];
const freeze = (value) => {
  for (const item of Object.values(value)) if (item && typeof item === 'object') freeze(item);
  return Object.freeze(value);
};
const defaultStick = () => ({ enabled: true, xAxis: 0, yAxis: 1, invertX: false, invertY: false });
export const DEFAULT_CONTROLLER_BINDINGS = freeze({
  version: CONTROLLER_BINDINGS_VERSION,
  mapping: 'standard',
  glyphFamily: 'generic',
  flight: {
    buttons: {
      up: 12,
      down: 13,
      left: 14,
      right: 15,
      ability: 0,
      pickup: 2,
      boost: 5,
      hangar: 3,
      stop: 1,
      pause: 9,
    },
    stick: defaultStick(),
  },
  menu: {
    buttons: { up: 12, down: 13, left: 14, right: 15, confirm: 0, back: 1, menu: 9 },
    stick: defaultStick(),
  },
  // Equal thresholds deliberately retain the existing strict > 0.35 boundary.
  // A lower release value opts into hysteresis when the router adopts this API.
  deadZone: { press: 0.35, release: 0.35 },
});
const ownConfig = (source) => ({
  version: CONTROLLER_BINDINGS_VERSION,
  mapping: 'standard',
  glyphFamily: source.glyphFamily,
  ...Object.fromEntries(
    CONTEXTS.map((context) => [
      context,
      {
        buttons: Object.fromEntries(
          CONTROLLER_BINDING_ACTIONS[context].map((action) => [
            action,
            source[context].buttons[action] + 0,
          ]),
        ),
        stick: {
          enabled: source[context].stick.enabled,
          xAxis: source[context].stick.xAxis + 0,
          yAxis: source[context].stick.yAxis + 0,
          invertX: source[context].stick.invertX,
          invertY: source[context].stick.invertY,
        },
      },
    ]),
  ),
  deadZone: { press: source.deadZone.press, release: source.deadZone.release },
});
function keys(value, expected, path, errors) {
  if (!plainObject(value)) {
    errors.push(`${path} must be a plain object.`);
    return false;
  }
  for (const key of Object.keys(value))
    if (!expected.includes(key)) errors.push(`Unknown controller field: ${path}.${key}.`);
  for (const key of expected)
    if (!Object.hasOwn(value, key)) errors.push(`Missing controller field: ${path}.${key}.`);
  return true;
}
const finite = (value, min, max) => Number.isFinite(value) && value >= min && value <= max;
const buttonIndex = (value) => Number.isInteger(value) && value >= 0 && value <= 15;
const axisIndex = (value) => Number.isInteger(value) && value >= 0 && value <= 3;
function inspect(source) {
  if (source == null) return { config: ownConfig(DEFAULT_CONTROLLER_BINDINGS), errors: [] };
  if (!plainObject(source))
    return { errors: ['Controller bindings must be a plain object or null.'] };
  let config;
  try {
    config = boundedJSON(source, {
      maxBytes: 8192,
      maxNodes: 128,
      maxDepth: 4,
      maxArray: 0,
      maxString: 64,
    });
  } catch (error) {
    return { errors: [error.message] };
  }
  const errors = [];
  keys(
    config,
    ['version', 'mapping', 'glyphFamily', 'flight', 'menu', 'deadZone'],
    'controller',
    errors,
  );
  if (config.version !== CONTROLLER_BINDINGS_VERSION)
    errors.push(`Controller version must be ${CONTROLLER_BINDINGS_VERSION}.`);
  if (config.mapping !== 'standard') errors.push('Only the standard gamepad mapping is supported.');
  if (!CONTROLLER_GLYPH_FAMILIES.includes(config.glyphFamily))
    errors.push('Controller glyph family must be generic, xbox or playstation.');
  for (const context of CONTEXTS) {
    if (!keys(config[context], ['buttons', 'stick'], context, errors)) continue;
    const { buttons, stick } = config[context];
    if (keys(buttons, CONTROLLER_BINDING_ACTIONS[context], `${context}.buttons`, errors)) {
      const claimed = new Map();
      for (const action of CONTROLLER_BINDING_ACTIONS[context]) {
        const index = buttons[action];
        if (!buttonIndex(index)) {
          errors.push(
            `${context}.${action} requires one integer button index 0–15; system/home button 16 is reserved.`,
          );
          continue;
        }
        if (claimed.has(index))
          errors.push(
            `${context}.${action}: button ${index} is already assigned to ${claimed.get(index)} in this context.`,
          );
        else claimed.set(index, action);
      }
    }
    if (keys(stick, STICK_KEYS, `${context}.stick`, errors)) {
      for (const key of ['enabled', 'invertX', 'invertY'])
        if (typeof stick[key] !== 'boolean')
          errors.push(`${context}.stick.${key} must be boolean.`);
      for (const key of ['xAxis', 'yAxis'])
        if (!axisIndex(stick[key])) errors.push(`${context}.stick.${key} must be an integer 0–3.`);
      if (stick.xAxis === stick.yAxis) errors.push(`${context} stick axes must be distinct.`);
    }
  }
  if (keys(config.deadZone, ['press', 'release'], 'deadZone', errors)) {
    const { press, release } = config.deadZone;
    if (!finite(press, 0.1, 0.6))
      errors.push('Dead-zone press must be finite and within 0.10–0.60.');
    if (!finite(release, 0.02, 0.6))
      errors.push('Dead-zone release must be finite and within 0.02–0.60.');
    if (Number.isFinite(press) && Number.isFinite(release) && release > press)
      errors.push('Dead-zone release must not exceed press.');
  }
  return { config, errors };
}

/** Validate bounded plain data without running caller getters or silently repairing fields. */
export function validateControllerBindings(source) {
  const { errors } = inspect(source);
  return { valid: errors.length === 0, errors };
}
/** null/undefined means legacy defaults; every supplied document must be complete. */
export function resolveControllerBindings(source = null) {
  const { config, errors } = inspect(source);
  if (errors.length) throw new TypeError(`Invalid controller bindings: ${errors.join(' ')}`);
  return ownConfig(config);
}
const requireContext = (context) => {
  if (!CONTEXTS.includes(context)) throw new TypeError('Unknown controller context.');
};
/** A rejected capture leaves the old configuration intact; swaps require a complete candidate. */
export function replaceControllerButtonBinding(source, context, action, index) {
  requireContext(context);
  if (!CONTROLLER_BINDING_ACTIONS[context].includes(action))
    throw new TypeError('Unknown controller action.');
  const next = resolveControllerBindings(source);
  next[context].buttons[action] = index;
  return resolveControllerBindings(next);
}

const GENERIC_BUTTON_LABELS = Object.freeze([
  localizedMessage('common:controls.south'),
  localizedMessage('common:controls.east'),
  localizedMessage('common:controls.west'),
  localizedMessage('common:controls.north'),
  localizedMessage('common:controls.leftShoulder'),
  localizedMessage('common:controls.rightShoulder'),
  localizedMessage('common:controls.leftTrigger'),
  localizedMessage('common:controls.rightTrigger'),
  localizedMessage('common:controls.viewSelect'),
  localizedMessage('common:controls.menuStart'),
  localizedMessage('common:controls.leftStickPress'),
  localizedMessage('common:controls.rightStickPress'),
  localizedMessage('common:controls.dPadUp'),
  localizedMessage('common:controls.dPadDown'),
  localizedMessage('common:controls.dPadLeft'),
  localizedMessage('common:controls.dPadRight'),
  localizedMessage('common:controls.systemHome'),
]);
const BUTTON_LABELS = Object.freeze({
  generic: GENERIC_BUTTON_LABELS,
  xbox: Object.freeze([
    'A',
    'B',
    'X',
    'Y',
    'LB',
    'RB',
    'LT',
    'RT',
    localizedMessage('common:controls.view'),
    localizedMessage('common:controls.menu'),
    'LS',
    'RS',
    ...GENERIC_BUTTON_LABELS.slice(12, 16),
    localizedMessage('common:controls.xboxButton'),
  ]),
  playstation: Object.freeze([
    localizedMessage('common:controls.cross'),
    localizedMessage('common:controls.circle'),
    localizedMessage('common:controls.square'),
    localizedMessage('common:controls.triangle'),
    'L1',
    'R1',
    'L2',
    'R2',
    localizedMessage('common:controls.createShare'),
    localizedMessage('common:controls.options'),
    'L3',
    'R3',
    ...GENERIC_BUTTON_LABELS.slice(12, 16),
    localizedMessage('common:controls.psButton'),
  ]),
});
/** Text-only player-selected labels. This does not detect hardware or promise host support. */
export function controllerButtonLabel(index, family = 'generic') {
  if (!Number.isInteger(index) || index < 0 || index > 16)
    return t('common:controls.unknownButton');
  return render(
    BUTTON_LABELS[CONTROLLER_GLYPH_FAMILIES.includes(family) ? family : 'generic'][index],
  );
}
export function controllerGlyphFamily(id = '') {
  if (/dualsense|dualshock|playstation|054c|sony/i.test(id)) return 'playstation';
  if (/x[- ]?box|xinput|steam|valve|045e|28de/i.test(id)) return 'xbox';
  return 'generic';
}
export function controllerBindingLabels(source = null, deviceId = '') {
  const config = resolveControllerBindings(source);
  const family =
    config.glyphFamily === 'generic' ? controllerGlyphFamily(deviceId) : config.glyphFamily;
  return Object.fromEntries(
    CONTEXTS.map((context) => [
      context,
      Object.fromEntries(
        CONTROLLER_BINDING_ACTIONS[context].map((action) => [
          action,
          controllerButtonLabel(config[context].buttons[action], family),
        ]),
      ),
    ]),
  );
}
export function controllerStickLabel(source, context) {
  requireContext(context);
  const { stick } = resolveControllerBindings(source)[context];
  if (!stick.enabled) return t('common:controls.buttonsOnly');
  const name =
    stick.xAxis === 0 && stick.yAxis === 1
      ? t('common:controls.leftStick')
      : stick.xAxis === 2 && stick.yAxis === 3
        ? t('common:controls.rightStick')
        : t('common:controls.axes', { x: stick.xAxis, y: stick.yAxis });
  if (!stick.invertX && !stick.invertY) return name;
  return t(
    stick.invertX && stick.invertY
      ? 'common:controls.stickBothInverted'
      : stick.invertX
        ? 'common:controls.stickHorizontalInverted'
        : 'common:controls.stickVerticalInverted',
    { stick: name },
  );
}

/** Pure stick-only reference: caller supplies previous active state, owns digital
 * precedence and resets state on scope/configuration/focus/connection changes.
 * No timer, sampler, storage, latch, Gamepad API or DOM operation runs here.
 */
export function sampleControllerStick(source, context, axes, priorActive = false) {
  requireContext(context);
  if (typeof priorActive !== 'boolean')
    throw new TypeError('Previous stick activity must be boolean.');
  const config = resolveControllerBindings(source),
    { stick } = config[context];
  const normalize = (value) => (Number.isFinite(value) ? Math.max(-1, Math.min(1, value)) : 0);
  const x = normalize(axes?.[stick.xAxis]) * (stick.invertX ? -1 : 1) || 0,
    y = normalize(axes?.[stick.yAxis]) * (stick.invertY ? -1 : 1) || 0;
  const active =
    stick.enabled &&
    Math.max(Math.abs(x), Math.abs(y)) >
      (priorActive ? config.deadZone.release : config.deadZone.press);
  const direction = !active
    ? null
    : Math.abs(x) > Math.abs(y)
      ? x > 0
        ? 'right'
        : 'left'
      : y > 0
        ? 'down'
        : 'up';
  return { x, y, active, direction };
}

/** One button belongs to at most one action in a context; this performs no edge detection. */
export function controllerActionForButton(source, context, index) {
  requireContext(context);
  const config = resolveControllerBindings(source);
  if (!buttonIndex(index)) return null;
  return (
    CONTROLLER_BINDING_ACTIONS[context].find(
      (action) => config[context].buttons[action] === index,
    ) || null
  );
}
/** Existing deterministic digital precedence: up, right, down, left. */
export const CONTROLLER_DIRECTION_PRIORITY = Object.freeze(['up', 'right', 'down', 'left']);
