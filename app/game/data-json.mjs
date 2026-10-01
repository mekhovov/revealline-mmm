import { t } from './i18n/index.mjs';

/** Shared boundary for user-owned files. Does not invoke getters or toJSON. */
export const plainObject = (value) =>
  value !== null &&
  typeof value === 'object' &&
  !Array.isArray(value) &&
  (Object.getPrototypeOf(value) === Object.prototype || Object.getPrototypeOf(value) === null);
export const stableId = (value) =>
  typeof value === 'string' &&
  /^[a-zA-Z0-9][a-zA-Z0-9._-]{0,79}$/.test(value) &&
  !['constructor', 'prototype', '__proto__'].includes(value);
export function boundedJSON(
  source,
  {
    maxBytes = 4 * 1024 * 1024,
    maxNodes = 100000,
    maxDepth = 16,
    maxArray = 4096,
    maxString = 4096,
  } = {},
) {
  const encoder = new TextEncoder();
  // Repeated field names and short text have identical encoded lengths. Keep
  // this scalar-only cache bounded and local to one call: every external graph
  // still receives the full descriptor, structure and byte-budget traversal.
  const stringBytes = new Map();
  const encodedBytes = (value) => {
    const known = stringBytes.get(value);
    if (known !== undefined) return known;
    const length = encoder.encode(JSON.stringify(value)).byteLength;
    if (value.length <= 512 && stringBytes.size < 512) stringBytes.set(value, length);
    return length;
  };
  if (typeof source === 'string') {
    if (source.length > maxBytes || encoder.encode(source).byteLength > maxBytes)
      throw new TypeError(t('errors:dataJson.fileByteBudget'));
    try {
      source = JSON.parse(source);
    } catch {
      throw new TypeError(t('errors:dataJson.invalid'));
    }
  }
  let nodes = 0,
    size = 0;
  const ancestors = new Set();
  const add = (n) => {
    size += n;
    if (size > maxBytes) throw new TypeError(t('errors:dataJson.byteBudget'));
  };
  function copy(value, depth) {
    if (++nodes > maxNodes || depth > maxDepth)
      throw new TypeError(t('errors:dataJson.structuralBudget'));
    if (value === null || typeof value === 'boolean') {
      add(value === false ? 5 : 4);
      return value;
    }
    if (typeof value === 'number') {
      if (!Number.isFinite(value)) throw new TypeError(t('errors:dataJson.finiteNumbers'));
      add(JSON.stringify(value).length);
      return value;
    }
    if (typeof value === 'string') {
      if (value.length > maxString) throw new TypeError(t('errors:dataJson.stringBudget'));
      add(encodedBytes(value));
      return value;
    }
    const array = Array.isArray(value);
    if (
      !value ||
      typeof value !== 'object' ||
      (array ? Object.getPrototypeOf(value) !== Array.prototype : !plainObject(value))
    )
      throw new TypeError(t('errors:dataJson.plainData'));
    if (ancestors.has(value)) throw new TypeError(t('errors:dataJson.cyclesUnsupported'));
    if (array && value.length > maxArray) throw new TypeError(t('errors:dataJson.arrayItemBudget'));
    ancestors.add(value);
    add(2); // JSON container delimiters.
    const out = array ? [] : {},
      descriptors = Object.getOwnPropertyDescriptors(value);
    let count = 0;
    for (const key of Reflect.ownKeys(descriptors)) {
      if (typeof key !== 'string') throw new TypeError(t('errors:dataJson.symbolKeys'));
      if (array && key === 'length') continue;
      if (['__proto__', 'constructor', 'prototype'].includes(key))
        throw new TypeError(t('errors:dataJson.forbiddenKey', { key }));
      const descriptor = descriptors[key];
      if (!descriptor.enumerable || !Object.hasOwn(descriptor, 'value'))
        throw new TypeError(t('errors:dataJson.ordinaryFields'));
      if (key.length > 512) throw new TypeError(t('errors:dataJson.fieldNameBudget'));
      if (array && (!/^(0|[1-9]\d*)$/.test(key) || Number(key) >= value.length))
        throw new TypeError(t('errors:dataJson.arrayCustomProperties'));
      if (count) add(1); // Comma before every subsequent entry.
      if (!array) add(encodedBytes(key) + 1); // Object key and colon; array indexes are not serialized.
      out[key] = copy(descriptor.value, depth + 1);
      count++;
    }
    if (array && count !== value.length) throw new TypeError(t('errors:dataJson.sparseArrays'));
    ancestors.delete(value);
    return out;
  }
  const copied = copy(source, 0);
  if (encoder.encode(JSON.stringify(copied)).byteLength > maxBytes)
    throw new TypeError(t('errors:dataJson.encodedByteBudget'));
  return copied;
}
export function exactKeys(value, allowed, label, messages = {}) {
  if (!plainObject(value))
    throw new TypeError(
      messages.object?.({ label }) ?? t('errors:dataJson.objectRequired', { label }),
    );
  for (const key of Object.keys(value))
    if (!allowed.includes(key))
      throw new TypeError(
        messages.unsupported?.({ label, key }) ??
          t('errors:dataJson.unsupportedField', { path: `${label}.${key}` }),
      );
}
export function required(condition, message) {
  if (!condition) throw new TypeError(message);
}
export function canonicalJSON(value) {
  if (Array.isArray(value)) return `[${value.map(canonicalJSON).join(',')}]`;
  if (plainObject(value))
    return `{${Object.keys(value)
      .sort()
      .map((key) => `${JSON.stringify(key)}:${canonicalJSON(value[key])}`)
      .join(',')}}`;
  return JSON.stringify(value);
}
/** Stable local partition identity, not a signature or an anti-cheat service. */
export function dataIdentity(value) {
  let hash = 0xcbf29ce484222325n;
  for (const byte of new TextEncoder().encode(canonicalJSON(value)))
    hash = BigInt.asUintN(64, (hash ^ BigInt(byte)) * 0x100000001b3n);
  return hash.toString(16).padStart(16, '0');
}
