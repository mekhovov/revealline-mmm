/** Immutable, presentation-only chapter environments. No engine, DOM, locale,
 * networking, Studio or executable content dependency belongs in this boundary. */
import { INDUSTRIAL_ENVIRONMENT_DATA as data } from './industrial-environments-data.mjs';

export const INDUSTRIAL_ENVIRONMENT_PIN_FORMAT = 'revealline-industrial-environment-pin.v1';
export const INDUSTRIAL_ENVIRONMENT_ART_REVISION = 'industrial-roster-v3';
const fail = (message) => {
  throw new TypeError(message);
};
const required = (condition, message) => {
  if (!condition) fail(message);
};
const own = (source, { bytes = 2 * 1024 * 1024, nodes = 50000, depth = 48 } = {}) => {
  let visited = 0;
  const copy = (value, at) => {
    required(
      ++visited <= nodes && at <= depth,
      'Environment source exceeds its structural budget.',
    );
    if (value === null || typeof value === 'boolean' || typeof value === 'string') return value;
    if (typeof value === 'number') {
      required(Number.isFinite(value), 'Environment source needs finite numbers.');
      return value;
    }
    required(value && typeof value === 'object', 'Environment source must contain only JSON data.');
    const array = Array.isArray(value);
    required(
      array || [Object.prototype, null].includes(Object.getPrototypeOf(value)),
      'Environment source needs plain objects.',
    );
    const result = array ? [] : Object.create(null);
    for (const key of Reflect.ownKeys(value)) {
      if (array && key === 'length') continue;
      required(
        typeof key === 'string' && !['__proto__', 'prototype', 'constructor'].includes(key),
        'Invalid environment source key.',
      );
      const descriptor = Object.getOwnPropertyDescriptor(value, key);
      required(
        descriptor && 'value' in descriptor && descriptor.enumerable,
        'Environment source cannot execute accessors.',
      );
      if (array)
        required(
          /^(0|[1-9]\d*)$/.test(key) && Number(key) < value.length,
          'Invalid environment array.',
        );
      result[key] = copy(descriptor.value, at + 1);
    }
    if (array)
      required(
        result.length === value.length && Object.keys(result).length === value.length,
        'Sparse environment arrays are unsupported.',
      );
    return result;
  };
  const value = copy(source, 0);
  required(
    new TextEncoder().encode(JSON.stringify(value)).length <= bytes,
    'Environment source exceeds its byte budget.',
  );
  return value;
};
const canonical = (value) =>
  Array.isArray(value)
    ? `[${value.map(canonical).join(',')}]`
    : value && typeof value === 'object'
      ? `{${Object.keys(value)
          .sort()
          .map((key) => `${JSON.stringify(key)}:${canonical(value[key])}`)
          .join(',')}}`
      : JSON.stringify(value);
const freeze = (value) => {
  if (value && typeof value === 'object' && !Object.isFrozen(value)) {
    Object.values(value).forEach(freeze);
    Object.freeze(value);
  }
  return value;
};
const abort = (signal) => {
  if (signal?.aborted) throw new DOMException('Environment preparation cancelled.', 'AbortError');
};
const digest = async (value) =>
  [
    ...new Uint8Array(
      await globalThis.crypto.subtle.digest('SHA-256', new TextEncoder().encode(canonical(value))),
    ),
  ]
    .map((n) => n.toString(16).padStart(2, '0'))
    .join('');
freeze(data);
const definitions = freeze(data.definitions.map((definition) => own(definition))),
  sources = data.sources.map((row) =>
    Object.freeze({
      sourceKey: row[0],
      owner: data.owners[row[1]],
      format: data.formats[row[2]],
      id: row[3],
      revision: row[4],
      contentSha256: row[5],
      definition: definitions[row[6]],
      roomCatalogueId: row[7] ?? null,
    }),
  ),
  byKey = new Map(sources.map((row) => [row.sourceKey, row])),
  candidates = new WeakMap(),
  accepted = new WeakMap();
const matches = (row, { engine, mode, id, revision }) =>
  row.owner[0] === engine &&
  row.owner[1] === mode &&
  row.id === id &&
  row.revision === String(revision);
const sourceIdentity = (value) => ({
  id: value.id,
  revision: value.revision,
  format: value.version ?? value.format,
});
const originOwner = ({ engine, mode, origin }) => [
  engine,
  mode,
  origin.catalogueId,
  origin.catalogueRevision,
  origin.sourceForm,
];
const candidateFor = (row, signal) => {
  abort(signal);
  const candidate = Object.freeze({});
  candidates.set(candidate, { row, signal });
  return candidate;
};
const candidateRow = (candidate) => {
  const value = candidates.get(candidate);
  required(value, 'Environment preparation authority is missing.');
  abort(value.signal);
  return value.row;
};
const pinFor = (row) => {
  const pin = Object.freeze({
    format: INDUSTRIAL_ENVIRONMENT_PIN_FORMAT,
    id: row.definition.id,
    revision: row.definition.revision,
    sourceKey: row.sourceKey,
    contentSha256: row.contentSha256,
    appearanceSha256: row.definition.appearanceSha256,
  });
  accepted.set(pin, row.definition);
  return pin;
};

/** A lookup hint only. It grants no ownership and does not normalize source. */
export function hasIndustrialEnvironmentSource(hint) {
  return sources.some((row) => !row.roomCatalogueId && matches(row, hint));
}

/** Caller establishes native origin; exact registered full source still has to match. */
export async function prepareIndustrialEnvironmentSource({ engine, mode, source, origin, signal }) {
  abort(signal);
  if (origin === null || origin === undefined) return null;
  const ownedOrigin = own(origin, { bytes: 2048, nodes: 12, depth: 2 });
  if (ownedOrigin.kind !== 'builtin') return null;
  required(
    Object.keys(ownedOrigin).sort().join(',') === 'catalogueId,catalogueRevision,kind,sourceForm',
    'Invalid environment source origin.',
  );
  const value = own(source),
    identity = sourceIdentity(value),
    owner = canonical(originOwner({ engine, mode, origin: ownedOrigin }));
  const possible = sources.filter(
    (row) =>
      !row.roomCatalogueId &&
      matches(row, { engine, mode, ...identity }) &&
      row.format === identity.format &&
      canonical(row.owner) === owner,
  );
  if (!possible.length) return null;
  const hash = await digest(value);
  abort(signal);
  const row = possible.find((item) => item.contentSha256 === hash);
  return row ? candidateFor(row, signal) : null;
}

/** Network labels are hints only. The code-owned table admits exact native
 * accepted recipes, including the server's pinned pace/target-rule derivations. */
export async function prepareIndustrialRoomEnvironmentSource({
  family,
  mode,
  catalogueId,
  source,
  signal,
}) {
  abort(signal);
  const value = own(source),
    identity = sourceIdentity(value);
  const possible = sources.filter(
    (row) =>
      row.roomCatalogueId === catalogueId &&
      matches(row, { engine: family, mode, ...identity }) &&
      row.format === identity.format,
  );
  if (!possible.length) return null;
  const hash = await digest(value);
  abort(signal);
  const row = possible.find((item) => item.contentSha256 === hash);
  return row ? candidateFor(row, signal) : null;
}

/** Synchronous Start boundary; decorative preferences never prepare gameplay. */
export function acceptIndustrialEnvironment(candidate, { collection, artRevision } = {}) {
  if (candidate === null || candidate === undefined) return null;
  const row = candidateRow(candidate),
    definition = row.definition;
  if (
    artRevision !== definition.artRevision ||
    collection?.id !== definition.collection.id ||
    collection?.revision !== definition.collection.revision
  )
    return null;
  return pinFor(row);
}

/** Structural validation is deliberately not rendering authority. */
export function validateIndustrialEnvironmentPin(value) {
  if (value === null) return null;
  const pin = own(value, { bytes: 1024, nodes: 16, depth: 2 });
  required(
    Object.keys(pin).sort().join(',') ===
      'appearanceSha256,contentSha256,format,id,revision,sourceKey',
    'Invalid environment pin fields.',
  );
  const row = byKey.get(pin.sourceKey);
  required(
    pin.format === INDUSTRIAL_ENVIRONMENT_PIN_FORMAT &&
      row &&
      pin.id === row.definition.id &&
      pin.revision === row.definition.revision &&
      pin.contentSha256 === row.contentSha256 &&
      pin.appearanceSha256 === row.definition.appearanceSha256,
    'Unknown or changed immutable environment pin.',
  );
  return Object.freeze({ ...pin });
}

export function restoreIndustrialEnvironment(savedPin, candidate) {
  if (savedPin === null || savedPin === undefined) return null;
  const saved = validateIndustrialEnvironmentPin(savedPin),
    row = candidateRow(candidate);
  required(
    saved.sourceKey === row.sourceKey &&
      saved.contentSha256 === row.contentSha256 &&
      saved.appearanceSha256 === row.definition.appearanceSha256,
    'Environment restore does not match its accepted native source.',
  );
  return pinFor(row);
}

export function resolveIndustrialEnvironment(pin) {
  if (pin === null || pin === undefined) return null;
  const definition = accepted.get(pin);
  required(definition, 'Only an accepted or restored environment may bind rendering.');
  return definition;
}
