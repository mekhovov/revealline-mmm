export const CONTROLLER_BOOST_MODES = Object.freeze(['hold', 'toggle']);
export const DEFAULT_CONTROLLER_BOOST_MODE = 'hold';

/** Default only an omitted preference at its boundary, never malformed data. */
export function resolveControllerBoostMode(value) {
  if (value !== 'hold' && value !== 'toggle')
    throw new TypeError('Controller Boost mode must be hold or toggle.');
  return value;
}
