import { plainObject, exactKeys, required } from './data-json.mjs';

export const DEFAULT_TOUCH_CONTROLS = Object.freeze({
  mode: 'stick',
  side: 'right',
  size: 'regular',
  opacity: 0.55,
});

export function resolveTouchControls(value = null) {
  if (value === null) return { ...DEFAULT_TOUCH_CONTROLS };
  required(plainObject(value), 'Touch controls must be an object.');
  exactKeys(value, Object.keys(DEFAULT_TOUCH_CONTROLS), 'touchControls');
  required(['stick', 'swipe', 'dpad'].includes(value.mode), 'Invalid touch steering mode.');
  required(['right', 'left'].includes(value.side), 'Invalid touch control side.');
  required(['regular', 'large'].includes(value.size), 'Invalid touch control size.');
  required(
    Number.isFinite(value.opacity) && value.opacity >= 0.2 && value.opacity <= 1,
    'Touch opacity must be between 0.2 and 1.',
  );
  return { ...value };
}

/** Cardinal steering with a small diagonal bias toward the current direction.
 * No time, speed or game rules are changed by this presentation/input choice. */
export function touchDirection(x, y, previous = null, threshold = 10) {
  if (!Number.isFinite(x) || !Number.isFinite(y)) return null;
  if (Math.max(Math.abs(x), Math.abs(y)) < threshold) return null;
  if (previous === 'left' && x < 0 && -x * 1.2 >= Math.abs(y)) return 'left';
  if (previous === 'right' && x > 0 && x * 1.2 >= Math.abs(y)) return 'right';
  if (previous === 'up' && y < 0 && -y * 1.2 >= Math.abs(x)) return 'up';
  if (previous === 'down' && y > 0 && y * 1.2 >= Math.abs(x)) return 'down';
  return Math.abs(x) > Math.abs(y) ? (x < 0 ? 'left' : 'right') : y < 0 ? 'up' : 'down';
}
