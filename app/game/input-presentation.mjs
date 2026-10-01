import { arcadeActionCapabilities } from './core/arcade-actions.mjs';

/** Presentation only: never changes a command, saved heading, or simulation tick. */
export const SCREEN_STEERING_HANDS = Object.freeze(['left', 'right']);
export const DEFAULT_SCREEN_STEERING_HAND = 'left';
export function resolveScreenSteeringHand(value) {
  if (!SCREEN_STEERING_HANDS.includes(value))
    throw new TypeError('On-screen steering hand must be left or right.');
  return value;
}
export function resolveScreenControls(value) {
  if (!['auto', 'always', 'off'].includes(value))
    throw new TypeError('On-screen steering must be auto, always or off.');
  return value;
}
export function nextInputModality(previous, event) {
  if (event.type === 'keydown') {
    if (
      event.repeat ||
      event.ctrlKey ||
      event.metaKey ||
      event.altKey ||
      ['Shift', 'Control', 'Alt', 'Meta'].includes(event.key)
    )
      return previous;
    return 'keyboard';
  }
  if (event.type !== 'pointerdown' || (event.button !== undefined && event.button !== 0))
    return previous;
  return event.pointerType === 'touch' ? 'touch' : 'pointer';
}
export function showScreenControls({ preference = 'auto', modality, scope, running }) {
  return (
    scope === 'flight' &&
    running &&
    (preference === 'always' || (preference === 'auto' && modality === 'touch'))
  );
}

/** Validated authored level only: current phase or surviving actors cannot resize the board. */
export function hasFieldWarningBand(level) {
  return !(
    (level?.encounter === null ||
      (level?.version === 'xonix-level.v1' && level.encounter === undefined)) &&
    Array.isArray(level.enemies) &&
    level.enemies.every((enemy) =>
      ['bouncer', 'border-patrol', 'contour-patrol'].includes(enemy.type),
    )
  );
}

export function hasCompactArcadeArena(level) {
  return (
    !arcadeActionCapabilities(level).manualAbility &&
    level?.encounter === null &&
    !hasFieldWarningBand(level)
  );
}
