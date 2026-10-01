import { boundedJSON, canonicalJSON, exactKeys, plainObject, required } from '../data-json.mjs';

export const PRESENTATION_METADATA_FORMAT = 'revealline-presentation-metadata.v1';
export const PRESENTATION_METADATA_LIMITS = Object.freeze({
  encodedBytes: 5 * 1024 * 1024,
  logicalBytes: 8 * 1024 * 1024,
  nodes: 125000,
  legacyNodes: 100000,
  legacyEnvelopeNodes: 110000,
  records: 4096,
  depth: 18,
  string: 8192,
});
const encoder = new TextEncoder();
const fields = ['source', 'prompt'];
const options = (maxBytes, maxArray, maxDepth = PRESENTATION_METADATA_LIMITS.depth) => ({
  maxBytes,
  maxArray,
  maxDepth,
  maxNodes: PRESENTATION_METADATA_LIMITS.nodes,
  maxString: PRESENTATION_METADATA_LIMITS.string,
});
const logicalOptions = options(
  PRESENTATION_METADATA_LIMITS.logicalBytes,
  PRESENTATION_METADATA_LIMITS.records,
);
const legacyLogicalOptions = {
  ...logicalOptions,
  maxNodes: PRESENTATION_METADATA_LIMITS.legacyNodes,
};
const rawOptions = {
  ...options(PRESENTATION_METADATA_LIMITS.encodedBytes, 2048),
  maxNodes: PRESENTATION_METADATA_LIMITS.legacyNodes,
};
const MAX_DICTIONARY_ENTRIES = PRESENTATION_METADATA_LIMITS.records;
const envelopeOptions = {
  ...options(
    PRESENTATION_METADATA_LIMITS.encodedBytes,
    MAX_DICTIONARY_ENTRIES,
    PRESENTATION_METADATA_LIMITS.depth + 1,
  ),
  // Indexing replaces each provenance string with one node. Only the bounded
  // dictionary entries and three wrapper nodes (object, format, array) are new.
  // Expanded documents still cross the unchanged logical node limit below.
  maxNodes: PRESENTATION_METADATA_LIMITS.nodes + MAX_DICTIONARY_ENTRIES + 3,
};
function documentAssets(document) {
  required(plainObject(document) && Array.isArray(document.assets), 'Invalid metadata document.');
  required(
    document.format === 'revealline-theme-bundle.v1',
    'Unsupported metadata document format.',
  );
  required(
    document.assets.length <= PRESENTATION_METADATA_LIMITS.records,
    'Too many metadata asset records.',
  );
  for (const asset of document.assets)
    required(plainObject(asset) && plainObject(asset.provenance), 'Invalid asset provenance.');
  return document.assets;
}
function requireStrings(document) {
  for (const asset of documentAssets(document))
    for (const field of fields)
      required(typeof asset.provenance[field] === 'string', 'Invalid provenance string.');
}
function fitsRaw(value, bytes) {
  if (bytes > PRESENTATION_METADATA_LIMITS.encodedBytes) return false;
  try {
    ownLegacyPresentationDocument(value);
  } catch (error) {
    if (!(error instanceof TypeError)) throw error;
    return false;
  }
  const pending = [value];
  while (pending.length) {
    const next = pending.pop();
    if (Array.isArray(next) && next.length > 2048) return false;
    if (next && typeof next === 'object') pending.push(...Object.values(next));
  }
  return true;
}

/** Own the logical JSON and account for every expanded string occurrence.
 * This is transport accounting; callers must still validate the complete
 * presentation schema, immutable history and file facts before using it. */
export function ownPresentationDocument(source) {
  required(plainObject(source), 'Logical metadata must be an owned document object.');
  const document = boundedJSON(source, logicalOptions);
  requireStrings(document);
  return document;
}

/** Preserve the exact pre-v3 logical ownership boundary for RLTHM1/2 imports.
 * Their outer transfer wrapper has separate historical overhead capacity. */
export function ownLegacyPresentationDocument(source) {
  required(plainObject(source), 'Legacy metadata must be an owned document object.');
  const document = boundedJSON(source, legacyLogicalOptions);
  requireStrings(document);
  return document;
}

/** Preserve fitting raw canonical bytes. Only source/prompt string values are
 * interned in the versioned fallback; historical logical values never change. */
export function encodePresentationDocument(source) {
  const document = ownPresentationDocument(source);
  const raw = canonicalJSON(document);
  if (fitsRaw(document, encoder.encode(raw).byteLength)) return raw;
  const strings = [
    ...new Set(document.assets.flatMap((asset) => fields.map((f) => asset.provenance[f]))),
  ].sort();
  const indexes = new Map(strings.map((value, index) => [value, index]));
  for (const asset of document.assets)
    for (const field of fields) asset.provenance[field] = indexes.get(asset.provenance[field]);
  const envelope = { format: PRESENTATION_METADATA_FORMAT, strings, document };
  return canonicalJSON(boundedJSON(envelope, envelopeOptions));
}

/** Read raw legacy metadata or a compact envelope. No schema authorization,
 * asset IO or storage mutation occurs here. All references are literal string
 * indexes, never paths, code, object references or another dictionary entry. */
export function decodePresentationDocument(source) {
  // Parse only under the serialized cap, including inputs supplied as objects.
  const encoded = boundedJSON(source, envelopeOptions);
  if (encoded?.format !== PRESENTATION_METADATA_FORMAT) {
    const document = boundedJSON(encoded, rawOptions);
    requireStrings(document);
    return document;
  }
  exactKeys(encoded, ['format', 'strings', 'document'], 'presentation metadata');
  const { strings, document } = encoded;
  required(Array.isArray(strings), 'Invalid provenance dictionary.');
  for (let index = 0; index < strings.length; index++) {
    required(typeof strings[index] === 'string', 'Invalid provenance dictionary entry.');
    required(
      index === 0 || strings[index - 1] < strings[index],
      'Noncanonical provenance dictionary.',
    );
  }
  const used = new Set();
  for (const asset of documentAssets(document)) {
    for (const field of fields) {
      const index = asset.provenance[field];
      required(
        Number.isSafeInteger(index) && index >= 0 && index < strings.length,
        'Invalid provenance dictionary reference.',
      );
      asset.provenance[field] = strings[index];
      used.add(index);
    }
  }
  required(used.size === strings.length, 'Unused provenance dictionary entry.');
  // boundedJSON counts expanded occurrences, not unique dictionary bytes. It
  // stops as soon as any logical byte/node/depth/string/record limit is reached.
  return ownPresentationDocument(document);
}
