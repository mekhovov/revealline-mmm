import { boundedJSON, canonicalJSON, exactKeys, required } from './data-json.mjs';
import { campaignKey } from './library.mjs';
import { createExecutionCatalog } from './campaign-contexts.mjs';
import { MEDIA_LIMITS, freezeMedia } from './media-library.mjs';
import { MANAGED_MEDIA_LIMITS } from './managed-media-store.mjs';
import {
  validateStoredStillMedia,
  verifyStoredStillAssets,
  assertStoredStillTransition,
  prepareStoredStillMedia,
} from './media-storage-record.mjs';

export const MEDIA_BUNDLE_FORMAT = 'revealline-media-bundle.v1';
export const MEDIA_BUNDLE_LIMITS = Object.freeze({
  bytes: MANAGED_MEDIA_LIMITS.bytes,
  manifestBytes: MEDIA_LIMITS.metadataBytes + 65536,
  assets: MANAGED_MEDIA_LIMITS.assets,
  sourceBytes: MANAGED_MEDIA_LIMITS.sourceBytes,
});
const MAGIC = new TextEncoder().encode('RLMDB1\r\n');
const nativeSize = Object.getOwnPropertyDescriptor(Blob.prototype, 'size').get;
const imports = new WeakSet(),
  restores = new WeakMap();
const hashValid = (value) => typeof value === 'string' && /^[a-f0-9]{64}$/.test(value);
const abort = (signal) => {
  if (signal?.aborted) throw new DOMException('Still bundle operation cancelled.', 'AbortError');
};
function ownBundle(source) {
  let size;
  try {
    size = nativeSize.call(source);
  } catch {
    throw new TypeError('Choose a native still-media bundle Blob.');
  }
  required(size >= 12 && size <= MEDIA_BUNDLE_LIMITS.bytes, 'Still bundle exceeds its byte bound.');
  return Blob.prototype.slice.call(source, 0, size);
}
const sortHashes = (a, b) => (a.sha256 < b.sha256 ? -1 : a.sha256 > b.sha256 ? 1 : 0);

/** Complete referenced still-domain inventory, including retained generic bytes.
 * It excludes audio-only assets, profiles, sessions and packs. Export does not
 * establish compatibility with another store's immutable identity history.
 */
export async function exportMediaBundle(document, sourceAssets, { signal, decodeImage } = {}) {
  abort(signal);
  const safe = validateStoredStillMedia(document);
  const assets = [
    ...(await verifyStoredStillAssets(safe, sourceAssets, { signal, decodeImage })),
  ].sort(sortHashes);
  abort(signal);
  const manifest = new TextEncoder().encode(
    canonicalJSON({
      format: MEDIA_BUNDLE_FORMAT,
      document: safe,
      assets: assets.map(({ sha256, blob }) => ({ sha256, bytes: nativeSize.call(blob) })),
    }),
  );
  required(
    manifest.length <= MEDIA_BUNDLE_LIMITS.manifestBytes,
    'Still bundle manifest is too large.',
  );
  const bytes = 12 + manifest.length + assets.reduce((sum, a) => sum + nativeSize.call(a.blob), 0);
  required(bytes <= MEDIA_BUNDLE_LIMITS.bytes, 'Still bundle exceeds 256 MiB including metadata.');
  const header = new Uint8Array(12);
  header.set(MAGIC);
  new DataView(header.buffer).setUint32(8, manifest.length, false);
  return new Blob([header, manifest, ...assets.map((a) => a.blob)], {
    type: 'application/vnd.revealline.media',
  });
}

/** Own and verify the entire file before offering a target-store restore review.
 * Real browser decoding is required by default; tests may inject a decoder.
 */
export async function importMediaBundle(source, { signal, decodeImage } = {}) {
  abort(signal);
  const blob = ownBundle(source),
    header = new Uint8Array(await blob.slice(0, 12).arrayBuffer());
  abort(signal);
  required(
    MAGIC.every((byte, index) => header[index] === byte),
    'Unsupported still bundle.',
  );
  const length = new DataView(header.buffer).getUint32(8, false);
  required(
    length > 0 && length <= MEDIA_BUNDLE_LIMITS.manifestBytes && 12 + length <= blob.size,
    'Invalid still bundle manifest length.',
  );
  const text = new TextDecoder('utf-8', { fatal: true }).decode(
    await blob.slice(12, 12 + length).arrayBuffer(),
  );
  abort(signal);
  const manifest = boundedJSON(text, {
    maxBytes: MEDIA_BUNDLE_LIMITS.manifestBytes,
    maxNodes: 105000,
    maxDepth: 26,
    maxArray: 4096,
    maxString: 65536,
  });
  exactKeys(manifest, ['format', 'document', 'assets'], 'still bundle');
  required(manifest.format === MEDIA_BUNDLE_FORMAT, 'Unsupported still bundle manifest.');
  const document = validateStoredStillMedia(manifest.document);
  required(
    Array.isArray(manifest.assets) && manifest.assets.length <= MEDIA_BUNDLE_LIMITS.assets,
    'Invalid still bundle asset table.',
  );
  let offset = 12 + length,
    previous = '';
  const assets = [];
  for (const item of manifest.assets) {
    exactKeys(item, ['sha256', 'bytes'], 'still bundle asset');
    required(
      hashValid(item.sha256) &&
        item.sha256 > previous &&
        Number.isSafeInteger(item.bytes) &&
        item.bytes > 0 &&
        item.bytes <= MEDIA_BUNDLE_LIMITS.sourceBytes &&
        offset + item.bytes <= blob.size,
      'Invalid, duplicated, unordered or truncated still bundle asset.',
    );
    assets.push({ sha256: item.sha256, blob: blob.slice(offset, offset + item.bytes) });
    offset += item.bytes;
    previous = item.sha256;
  }
  required(offset === blob.size, 'Still bundle has trailing bytes.');
  const owned = await verifyStoredStillAssets(document, assets, { signal, decodeImage });
  abort(signal);
  const result = Object.freeze({ document, assets: owned });
  imports.add(result);
  return result;
}
export const isImportedMediaBundle = (value) => imports.has(value);

function mergeById(current, incoming, key, label) {
  const result = new Map(current.map((item) => [key(item), item]));
  for (const item of incoming) {
    const id = key(item),
      old = result.get(id);
    required(!old || canonicalJSON(old) === canonicalJSON(item), `Conflicting immutable ${label}.`);
    if (!old) result.set(id, item);
  }
  return [...result.values()];
}
function mergedDocument(current, incoming, assignmentMode) {
  const legacy = mergeById(
    current.legacy.items,
    incoming.legacy.items,
    (item) => item.id,
    'retained generic reference',
  );
  const owners = new Map(
    current.owners.map((owner) => [campaignKey(owner.campaign), structuredClone(owner)]),
  );
  for (const owner of incoming.owners) {
    const key = campaignKey(owner.campaign),
      old = owners.get(key);
    required(
      !old || canonicalJSON(old.campaign) === canonicalJSON(owner.campaign),
      'Conflicting retained campaign owner.',
    );
    if (!old) owners.set(key, structuredClone(owner));
    else old.themeIds = [...new Set([...old.themeIds, ...owner.themeIds])].sort();
  }
  const assignments = new Map(
    current.library.assignments.map((item) => [canonicalJSON(item.identity), item]),
  );
  for (const item of incoming.library.assignments)
    if (!assignments.has(canonicalJSON(item.identity)))
      assignments.set(canonicalJSON(item.identity), item);
  const document = validateStoredStillMedia({
    format: current.format,
    owners: [...owners.values()],
    library: {
      format: current.library.format,
      assets: mergeById(
        current.library.assets,
        incoming.library.assets,
        (item) => item.id,
        'asset identity',
      ),
      presentations: mergeById(
        current.library.presentations,
        incoming.library.presentations,
        (item) => JSON.stringify([item.id, item.revision]),
        'presentation revision',
      ),
      assignments:
        assignmentMode === 'restore' ? incoming.library.assignments : [...assignments.values()],
    },
    legacy: { format: current.legacy.format, items: legacy },
  });
  assertStoredStillTransition(current, document);
  return document;
}

/** Merge validated immutable picture history without assigning a storage generation
 * or committing bytes. Destination assignments remain authoritative by default.
 */
export function mergeStoredMediaDocuments(current, incoming, { assignmentMode = 'preserve' } = {}) {
  required(
    ['preserve', 'restore'].includes(assignmentMode),
    'Unsupported still assignment merge mode.',
  );
  return mergedDocument(
    validateStoredStillMedia(current),
    validateStoredStillMedia(incoming),
    assignmentMode,
  );
}

/** A target-specific, cancellable review; no writes/reservations are made here.
 * preserve: destination assignments win, missing bindings are added.
 * restore: the bundle's exact assignment set replaces current assignments.
 * Originals/owners/revisions always remain append-only in either mode.
 */
export async function prepareMediaBundleRestore(
  imported,
  { store, assignmentMode = 'preserve', signal, decodeImage } = {},
) {
  abort(signal);
  required(imports.has(imported), 'Verify a still bundle before reviewing restore.');
  required(
    store && typeof store.read === 'function' && typeof store.commit === 'function',
    'Restore needs the shared v3 still store.',
  );
  required(
    ['preserve', 'restore'].includes(assignmentMode),
    'Unsupported still assignment restore mode.',
  );
  const current = await store.read({ signal });
  abort(signal);
  const previous = validateStoredStillMedia(current.document);
  required(
    Number.isSafeInteger(current.generation) && current.generation >= 0,
    'Invalid current media generation.',
  );
  const document = mergedDocument(previous, imported.document, assignmentMode);
  const assets = new Map(current.assets.map((item) => [item.sha256, item]));
  for (const item of imported.assets) {
    const old = assets.get(item.sha256);
    required(
      !old || nativeSize.call(old.blob) === nativeSize.call(item.blob),
      'One original hash has inconsistent byte lengths.',
    );
    if (!old) assets.set(item.sha256, item);
  }
  // Imported owners have been fully validated, not installed. Use the merged
  // historical document as the preparation context, then let the manager check
  // the actual current row again in its serialized commit transaction.
  const prepared = await prepareStoredStillMedia(document.library, [...assets.values()], {
    previous: document,
    executionCatalog: createExecutionCatalog([]),
    signal,
    decodeImage,
  });
  abort(signal);
  const review = freezeMedia({
    expectedGeneration: current.generation,
    assignmentMode,
    document: prepared.library,
    originals: prepared.assets.length,
    originalBytes: prepared.assets.reduce((sum, item) => sum + nativeSize.call(item.blob), 0),
  });
  restores.set(review, { store, prepared });
  return review;
}

/** Explicit commit of precisely the reviewed target/generation. Quota, shared
 * staging leases, rollback and append-only checks belong to the existing store.
 * Cancellation after a completed transaction cannot turn success into failure.
 */
export async function commitMediaBundleRestore(review, { signal } = {}) {
  abort(signal);
  const owned = restores.get(review);
  required(owned, 'Prepare this still bundle restore before committing.');
  return owned.store.commit(owned.prepared, {
    expectedGeneration: review.expectedGeneration,
    signal,
  });
}
