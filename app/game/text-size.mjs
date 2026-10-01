export const TEXT_SIZES = Object.freeze(['standard', 'large']);
export const DEFAULT_TEXT_SIZE = 'standard';

export function resolveTextSize(value) {
  if (!TEXT_SIZES.includes(value)) throw new TypeError('Unsupported text size.');
  return value;
}
