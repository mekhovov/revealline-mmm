import { boundedJSON, exactKeys } from '../data-json.mjs';
import { isBindablePhysicalKey, keyLabel } from '../key-bindings.mjs';
import { t } from '../i18n/index.mjs';

export const COUCH_KEYBOARD_VERSION = 'revealline-couch-keyboard.v1';
export const COUCH_KEYBOARD_ACTIONS = Object.freeze([
  'up',
  'down',
  'left',
  'right',
  'action',
  'pickup',
  'boost',
]);
export const TEAM_KEYBOARD_VERSION = 'revealline-team-keyboard.v1';
const teamActions = Object.freeze(COUCH_KEYBOARD_ACTIONS.filter((action) => action !== 'pickup'));
export function couchKeyboardActions(mode = 'duel') {
  if (mode === 'team') return teamActions;
  if (mode === 'duel') return COUCH_KEYBOARD_ACTIONS;
  throw new TypeError('Unknown keyboard mode.');
}
const defaults = [
  {
    up: 'KeyW',
    down: 'KeyS',
    left: 'KeyA',
    right: 'KeyD',
    action: 'KeyQ',
    pickup: 'KeyE',
    boost: 'ShiftLeft',
  },
  {
    up: 'ArrowUp',
    down: 'ArrowDown',
    left: 'ArrowLeft',
    right: 'ArrowRight',
    action: 'Enter',
    pickup: 'Slash',
    boost: 'ShiftRight',
  },
];
export class CouchKeyboardError extends TypeError {
  constructor(reason, values = {}) {
    super(`Invalid couch keyboard bindings: ${reason}.`);
    this.reason = reason;
    this.values = values;
  }
}
function checkCode(code, seat, action) {
  const legacyEnter = seat === 1 && action === 'action' && code === 'Enter';
  if ((!isBindablePhysicalKey(code) && !legacyEnter) || ['Escape', 'KeyP'].includes(code))
    throw new CouchKeyboardError('reserved', { key: keyLabel(code) || String(code) });
}
export function resolveCouchKeyboard(source = null, mode = 'duel') {
  const actions = couchKeyboardActions(mode),
    version = mode === 'team' ? TEAM_KEYBOARD_VERSION : COUCH_KEYBOARD_VERSION;
  const value =
    source === null
      ? {
          version,
          seats: defaults.map((seat) =>
            Object.fromEntries(actions.map((action) => [action, seat[action]])),
          ),
        }
      : boundedJSON(source, {
          maxBytes: 4096,
          maxNodes: 64,
          maxDepth: 4,
          maxArray: 2,
          maxString: 64,
        });
  exactKeys(value, ['version', 'seats'], 'couch keyboard');
  if (value.version !== version || !Array.isArray(value.seats) || value.seats.length !== 2)
    throw new CouchKeyboardError('format');
  const claimed = new Map();
  for (const [seat, bindings] of value.seats.entries()) {
    exactKeys(bindings, actions, 'keyboard seat');
    for (const action of actions) {
      const code = bindings[action];
      // Preserve the existing second-seat Enter action. Native focused controls
      // keep ownership of Enter, and capture cannot newly assign it elsewhere.
      checkCode(code, seat, action);
      if (claimed.has(code)) {
        const [player, usedAction] = claimed.get(code);
        throw new CouchKeyboardError('conflict', {
          key: keyLabel(code),
          player: player + 1,
          action: usedAction,
        });
      }
      claimed.set(code, [seat, action]);
    }
  }
  return value;
}
export function replaceCouchKey(source, seat, action, code, mode = 'duel') {
  const actions = couchKeyboardActions(mode);
  if (![0, 1].includes(seat) || !actions.includes(action)) throw new CouchKeyboardError('format');
  const value = resolveCouchKeyboard(source, mode);
  checkCode(code, seat, action);
  for (const [player, bindings] of value.seats.entries())
    for (const usedAction of actions)
      if ((player !== seat || usedAction !== action) && bindings[usedAction] === code)
        throw new CouchKeyboardError('conflict', {
          key: keyLabel(code),
          player: player + 1,
          action: usedAction,
        });
  value.seats[seat][action] = code;
  return resolveCouchKeyboard(value, mode);
}
export function couchKeyMap(source = null, mode = 'duel') {
  return Object.fromEntries(
    resolveCouchKeyboard(source, mode).seats.flatMap((seat, player) =>
      couchKeyboardActions(mode).map((action) => [seat[action], [player, action]]),
    ),
  );
}
export function couchDirectionLabel(source, player, mode = 'duel') {
  const seat = resolveCouchKeyboard(source, mode).seats[player];
  if (['up', 'left', 'down', 'right'].every((action) => seat[action] === defaults[player][action]))
    return t(player === 0 ? 'interface:wASD' : 'interface:arrowKeys');
  return ['up', 'left', 'down', 'right'].map((action) => keyLabel(seat[action])).join(' ');
}
