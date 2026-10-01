import { boundedJSON, canonicalJSON, exactKeys, required } from './data-json.mjs';
import { validateStoredStillMedia } from './media-storage-record.mjs';
import {
  validateStoredStories,
  ownStoryOriginals,
  prepareStoredStories,
  STORY_STORAGE_FORMAT,
  STORY_BINDINGS_FORMAT,
  storedStoryMetadataBytes,
  verifyStoredStoryBindings,
} from './story-storage-record.mjs';
import { MANAGED_MEDIA_LIMITS } from './managed-media-store.mjs';

export const STORY_BUNDLE_FORMAT = 'revealline-story-bundle.v1';
export const STORY_BINDING_BUNDLE_FORMAT = 'revealline-story-bundle.v2';
export const STORY_BUNDLE_LIMITS = Object.freeze({
  bytes: MANAGED_MEDIA_LIMITS.bytes,
  manifestBytes: MANAGED_MEDIA_LIMITS.metadataBytes + 65536,
  assets: MANAGED_MEDIA_LIMITS.assets,
  sourceBytes: MANAGED_MEDIA_LIMITS.sourceBytes,
});
const MAGIC = new TextEncoder().encode('RLSRB1\r\n');
const BINDING_MAGIC = new TextEncoder().encode('RLSRB2\r\n');
const bundleFormat = (document) =>
  document.format === STORY_BINDINGS_FORMAT ? STORY_BINDING_BUNDLE_FORMAT : STORY_BUNDLE_FORMAT;
const nativeSize = Object.getOwnPropertyDescriptor(Blob.prototype, 'size').get;
const imported = new WeakSet(),
  restores = new WeakMap();
const abort = (signal) => {
  if (signal?.aborted) throw new DOMException('Story transfer cancelled.', 'AbortError');
};
const encoded = (value) => new TextEncoder().encode(canonicalJSON(value));
const hashValid = (hash) => typeof hash === 'string' && /^[a-f0-9]{64}$/.test(hash);
const sortHashes = (a, b) => (a.sha256 < b.sha256 ? -1 : a.sha256 > b.sha256 ? 1 : 0);
function context(documentSource, stillSource) {
  const still = validateStoredStillMedia(stillSource),
    document = validateStoredStories(documentSource, still);
  required(
    encoded(still).length + storedStoryMetadataBytes(document) <=
      MANAGED_MEDIA_LIMITS.metadataBytes,
    'Still and story metadata exceed the shared 2 MiB budget.',
  );
  return { document, still };
}
async function hash(blob, signal) {
  const bytes = await blob.arrayBuffer();
  abort(signal);
  const digest = await crypto.subtle.digest('SHA-256', bytes);
  abort(signal);
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, '0')).join('');
}
async function verifyOriginalBytes(document, sourceAssets, signal) {
  const assets = ownStoryOriginals(sourceAssets, document.originals);
  for (const asset of assets) {
    abort(signal);
    const expected = document.stories.find((story) => story.source.sha256 === asset.sha256).source;
    required(
      nativeSize.call(asset.blob) === expected.bytes &&
        (await hash(asset.blob, signal)) === asset.sha256,
      'Story original differs from its exact hash/byte length.',
    );
  }
  return assets;
}
function ownBundle(source) {
  const size = nativeSize.call(source);
  required(
    size >= 12 && size <= STORY_BUNDLE_LIMITS.bytes,
    'Story bundle exceeds its bounded file size.',
  );
  return Blob.prototype.slice.call(source, 0, size);
}

/** Exact original export. Hash verification is intentionally independent of local
 * codec support; this operation never mints playback/restore preparation authority.
 */
export async function exportStoryBundle(
  documentSource,
  sourceAssets,
  { still: stillSource, signal } = {},
) {
  abort(signal);
  const { document, still } = context(documentSource, stillSource),
    assets = [...(await verifyOriginalBytes(document, sourceAssets, signal))].sort(sortHashes),
    verified = await verifyStoredStoryBindings(document, { signal }),
    manifest = encoded({
      format: bundleFormat(verified),
      document,
      still,
      assets: assets.map(({ sha256, blob }) => ({ sha256, bytes: nativeSize.call(blob) })),
    });
  required(
    manifest.length <= STORY_BUNDLE_LIMITS.manifestBytes,
    'Story bundle manifest exceeds its limit.',
  );
  const length = 12 + manifest.length + assets.reduce((n, a) => n + nativeSize.call(a.blob), 0);
  required(length <= STORY_BUNDLE_LIMITS.bytes, 'Story bundle exceeds 256 MiB including metadata.');
  const header = new Uint8Array(12);
  header.set(document.format === STORY_BINDINGS_FORMAT ? BINDING_MAGIC : MAGIC);
  new DataView(header.buffer).setUint32(8, manifest.length, false);
  abort(signal);
  return new Blob([header, manifest, ...assets.map((a) => a.blob)], {
    type: 'application/vnd.revealline.story',
  });
}

/** Bounded metadata + exact-byte inspection, suitable for a CLI without a codec.
 * Its plain result is explicitly NOT an imported or playable capability.
 */
export async function inspectStoryBundle(source, { signal } = {}) {
  abort(signal);
  const blob = ownBundle(source),
    header = new Uint8Array(await blob.slice(0, 12).arrayBuffer());
  abort(signal);
  const v1 = MAGIC.every((b, i) => header[i] === b),
    v2 = BINDING_MAGIC.every((b, i) => header[i] === b);
  required(v1 || v2, 'Unsupported story bundle.');
  const length = new DataView(header.buffer).getUint32(8, false);
  required(
    length > 0 && length <= STORY_BUNDLE_LIMITS.manifestBytes && 12 + length <= blob.size,
    'Invalid story manifest length.',
  );
  const text = new TextDecoder('utf-8', { fatal: true }).decode(
    await blob.slice(12, 12 + length).arrayBuffer(),
  );
  abort(signal);
  const manifest = boundedJSON(text, {
    maxBytes: STORY_BUNDLE_LIMITS.manifestBytes,
    maxNodes: 205000,
    maxDepth: 28,
    maxArray: 4096,
    maxString: 65536,
  });
  exactKeys(manifest, ['format', 'document', 'still', 'assets'], 'story bundle');
  required(
    manifest.format === (v2 ? STORY_BINDING_BUNDLE_FORMAT : STORY_BUNDLE_FORMAT),
    'Unsupported or crossed story bundle manifest.',
  );
  required(
    manifest.document?.format === (v2 ? STORY_BINDINGS_FORMAT : STORY_STORAGE_FORMAT),
    'Story bundle and storage document versions differ.',
  );
  const { document, still } = context(manifest.document, manifest.still);
  required(
    Array.isArray(manifest.assets) && manifest.assets.length <= STORY_BUNDLE_LIMITS.assets,
    'Invalid story bundle inventory.',
  );
  let offset = 12 + length,
    prior = '';
  const assets = [];
  for (const entry of manifest.assets) {
    exactKeys(entry, ['sha256', 'bytes'], 'story original');
    required(
      hashValid(entry.sha256) &&
        entry.sha256 > prior &&
        Number.isSafeInteger(entry.bytes) &&
        entry.bytes > 0 &&
        entry.bytes <= STORY_BUNDLE_LIMITS.sourceBytes &&
        offset + entry.bytes <= blob.size,
      'Invalid, unordered, duplicated or truncated story original.',
    );
    assets.push({ sha256: entry.sha256, blob: blob.slice(offset, offset + entry.bytes) });
    offset += entry.bytes;
    prior = entry.sha256;
  }
  required(offset === blob.size, 'Story bundle has trailing bytes.');
  const owned = await verifyOriginalBytes(document, assets, signal);
  await verifyStoredStoryBindings(document, { signal });
  abort(signal);
  return Object.freeze({ format: manifest.format, document, still, assets: owned });
}

/** Default import uses real native silent video inspection. A byte-only CLI
 * report, serialized object or MIME claim cannot replace this preparation.
 */
export async function importStoryBundle(source, options = {}) {
  const checked = await inspectStoryBundle(source, options),
    prepared = await prepareStoredStories(checked.document, checked.assets, {
      ...options,
      still: checked.still,
    });
  abort(options.signal);
  const result = Object.freeze({ ...checked, assets: prepared.assets });
  imported.add(result);
  return result;
}
export const isImportedStoryBundle = (value) => imported.has(value);

/** Review of one complete target update; keep all local immutable history and
 * availability. Actual target posters and codecs are verified before committing.
 */
export async function prepareStoryBundleRestore(bundle, { store, signal, ...inspection } = {}) {
  abort(signal);
  required(imported.has(bundle), 'Import and decode the story bundle before restore review.');
  required(
    store &&
      typeof store.stageRestore === 'function' &&
      typeof store.commit === 'function' &&
      typeof store.cancel === 'function',
    'Story restore needs the explicit v4 story adapter.',
  );
  const staged = await store.stageRestore(
    { document: bundle.document, assets: bundle.assets },
    { ...inspection, signal },
  );
  // stageRestore owns the signal through this explicit review/commit boundary.
  const review = Object.freeze({
    format: 'revealline-story-restore.v1',
    expectedGeneration: staged.expectedGeneration,
    document: staged.document,
    originals: staged.document.originals.length,
    reservedSourceBytes: staged.reservedSourceBytes,
    bindingPolicy: inspection.restoreBindings === true ? 'restore-incoming' : 'keep-current',
  });
  restores.set(review, { store, staged });
  return review;
}
export async function commitStoryBundleRestore(review, { signal } = {}) {
  const owned = restores.get(review);
  required(owned, 'Review this story restore before committing.');
  restores.delete(review);
  try {
    abort(signal);
    return await owned.store.commit(owned.staged, { signal });
  } catch (error) {
    await owned.store.cancel(owned.staged);
    throw error;
  }
}
export async function cancelStoryBundleRestore(review) {
  const owned = restores.get(review);
  if (!owned) return false;
  restores.delete(review);
  return owned.store.cancel(owned.staged);
}
