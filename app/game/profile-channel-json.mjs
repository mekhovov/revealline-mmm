import { boundedJSON } from './data-json.mjs';

/** Exact JSON-data export boundary; never coerce an unsupported structured clone. */
export function ownProfileJSON(value, maxBytes) {
  const seen = new Set();
  let nodes = 0;
  function visit(item, depth) {
    if (++nodes > 1000000 || depth > 30)
      throw new TypeError('Stored data exceeds its structural bound.');
    if (typeof item === 'number' && Object.is(item, -0))
      throw new TypeError('Stored negative zero cannot be exported exactly as JSON.');
    if (!item || typeof item !== 'object') return;
    if (seen.has(item))
      throw new TypeError('Stored references or cycles cannot be exported exactly as JSON.');
    seen.add(item);
    for (const [key, descriptor] of Object.entries(Object.getOwnPropertyDescriptors(item))) {
      if (Array.isArray(item) && key === 'length') continue;
      if (Object.hasOwn(descriptor, 'value')) visit(descriptor.value, depth + 1);
    }
  }
  visit(value, 0);
  const owned = boundedJSON(
    { value },
    {
      maxBytes,
      maxString: maxBytes,
      maxArray: 1000000,
      maxNodes: 1000002,
      maxDepth: 32,
    },
  ).value;
  const roundTrip = JSON.parse(JSON.stringify(owned));
  // The strict data boundary above rejects every value for which JSON loses identity.
  return roundTrip;
}

export function freezeProfileData(value) {
  if (value && typeof value === 'object') {
    for (const item of Object.values(value)) freezeProfileData(item);
    Object.freeze(value);
  }
  return value;
}
