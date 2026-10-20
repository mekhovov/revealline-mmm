export const TEXT_SIZES = Object.freeze(['standard', 'large', 'extra-large']);
export const DEFAULT_TEXT_SIZE = 'standard';

export function resolveTextSize(value) {
  if (!TEXT_SIZES.includes(value)) throw new TypeError('Unsupported text size.');
  return value;
}

/** Hosts explicitly opt into their additional layout. The established Large
 * presentation remains every other host's fallback. */
export function effectiveTextSize(value, { extraLarge = false } = {}) {
  return resolveTextSize(value) === 'extra-large' && !extraLarge ? 'large' : value;
}
