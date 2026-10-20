export const TEXT_SIZES = Object.freeze(['standard', 'large', 'extra-large']);
export const DEFAULT_TEXT_SIZE = 'standard';

export function resolveTextSize(value) {
  if (!TEXT_SIZES.includes(value)) throw new TypeError('Unsupported text size.');
  return value;
}

/** Preserve desired intent separately. No host is qualified for the additional
 * size yet; the established Large presentation is the explicit fallback. */
export function effectiveTextSize(value) {
  return resolveTextSize(value) === 'extra-large' ? 'large' : value;
}
