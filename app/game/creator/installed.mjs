import { boundedJSON, canonicalJSON, required } from '../data-json.mjs';
import { createManagedMediaStore } from '../managed-media-store.mjs';
import {
  hydrateStoredStillMedia,
  prepareRetainedStillByteEdit,
  prepareRetainedStillBytes,
  storedStillHashes,
} from '../media-storage-record.mjs';
import {
  assertCreatorApproval,
  CREATOR_BUNDLE_LIMITS,
  importCreatorBundle,
  exportCreatorBundle,
  approveCreatorBundle,
  inspectCreatorManifest,
  prepareCreatorBundle,
} from './bundle.mjs';
import { creatorAbort, creatorSHA256 } from './bytes.mjs';
import { VIDEO_POSTER_LIMITS } from '../video-poster.mjs';

const PREFIX = 'creator.manifest.';
const OFFLOADED_PREFIX = 'creator.offloaded.';
const reviews = new WeakMap();
const offloadReviews = new WeakMap();
export const createCreatorStore = (options = {}) =>
  createManagedMediaStore({
    ...options,
    richStillMedia: true,
    storyMedia: true,
    soundtrackCatalogue: true,
  });

/** Installation review pins a store generation as well as the reviewed bytes.
 * All references and binary payloads commit in one existing IDB transaction.
 * No cross-store journal is needed until an operation spans storage authorities. */
export async function reviewCreatorInstallation(store, prepared, approval, { signal } = {}) {
  assertCreatorApproval(prepared, approval);
  creatorAbort(signal);
  const snapshot = await store.readDomain('media', { signal });
  const document = hydrateStoredStillMedia(snapshot.library);
  const manifestBlob = new Blob([canonicalJSON(prepared.manifest)], { type: 'application/json' });
  const manifestHash = await creatorSHA256(await manifestBlob.arrayBuffer());
  creatorAbort(signal);
  const additions = [{ sha256: manifestHash, blob: manifestBlob }, ...prepared.assets];
  const existing = new Set(snapshot.assets.map((a) => a.sha256));
  const newBytes = additions
    .filter((a) => !existing.has(a.sha256))
    .reduce((n, a) => n + a.blob.size, 0);
  const references = [
    { id: `${PREFIX}${prepared.editionId}`, sha256: manifestHash },
    ...prepared.assets.map((a) => ({ id: `creator.asset.${a.sha256}`, sha256: a.sha256 })),
  ];
  const metadataBytes =
    new TextEncoder().encode(canonicalJSON(document)).length +
    new TextEncoder().encode(canonicalJSON(references)).length +
    1024;
  const usage = await store.usage({ signal });
  const review = Object.freeze({
    editionId: prepared.editionId,
    packageBytes: prepared.bytes,
    stagingBytes: newBytes + metadataBytes,
    usedBytes: usage.usedBytes,
    limitBytes: usage.limitBytes,
    alreadyInstalled:
      document.legacy.items.some((r) => r.id === `${PREFIX}${prepared.editionId}`) &&
      !document.legacy.items.some((r) => r.id === `${OFFLOADED_PREFIX}${prepared.editionId}`),
    enoughManagedSpace:
      usage.usedBytes + usage.reservedBytes + newBytes + metadataBytes + 512 <= usage.limitBytes,
  });
  creatorAbort(signal);
  reviews.set(review, { store, prepared, approval, snapshot, additions, references });
  return review;
}
export async function installPreparedCreatorBundle(
  store,
  prepared,
  approval,
  review,
  { signal, decodeImage } = {},
) {
  assertCreatorApproval(prepared, approval);
  const state = reviews.get(review);
  required(
    state && state.store === store && state.prepared === prepared && state.approval === approval,
    'Installation review is stale. Review storage and this exact pack again.',
  );
  creatorAbort(signal);
  required(
    review.enoughManagedSpace,
    'Not enough managed storage space. Download the pack to keep your work.',
  );
  reviews.delete(review); // One deliberate commit attempt; retries need a fresh generation.
  const current = await store.readDomainMetadata('media', { signal });
  required(
    current.generation === state.snapshot.generation,
    'Media changed in another tab. Review installation again.',
  );
  const assets = new Map(state.snapshot.assets.map((a) => [a.sha256, a]));
  for (const asset of state.additions) assets.set(asset.sha256, asset);
  const offloaded = hydrateStoredStillMedia(state.snapshot.library).legacy.items.find(
    (item) => item.id === `${OFFLOADED_PREFIX}${prepared.editionId}`,
  );
  const update = offloaded
    ? await prepareRetainedStillByteEdit(
        state.snapshot.library,
        { add: state.references, remove: [offloaded] },
        [...assets.values()],
        { signal, decodeImage },
      )
    : await prepareRetainedStillBytes(
        state.snapshot.library,
        state.references,
        [...assets.values()],
        { signal, decodeImage },
      );
  creatorAbort(signal);
  await store.commitDomain('media', update, {
    expectedGeneration: state.snapshot.generation,
    signal,
  });
  return Object.freeze({ editionId: prepared.editionId });
}
async function readManifest(store, reference, signal) {
  const blob = await store.readSelectedBlob(reference.sha256, {
    signal,
    maxBytes: CREATOR_BUNDLE_LIMITS.manifestBytes,
  });
  required(blob, 'Installed content manifest is missing. Reinstall its exact .rlpack file.');
  const bytes = await blob.arrayBuffer();
  required(
    (await creatorSHA256(bytes)) === reference.sha256,
    'Installed content manifest failed its integrity check.',
  );
  creatorAbort(signal);
  const manifest = boundedJSON(new TextDecoder('utf-8', { fatal: true }).decode(bytes), {
    maxBytes: CREATOR_BUNDLE_LIMITS.manifestBytes,
    maxDepth: 26,
    maxNodes: 100000,
  });
  required(
    reference.id === `${PREFIX}${manifest.editionId}`,
    'Installed content edition differs from its index.',
  );
  return inspectCreatorManifest(manifest);
}
async function manifestFromSnapshot(reference, assets, signal) {
  const blob = assets.get(reference.sha256);
  required(blob, 'Installed content manifest is missing. Reinstall its exact .rlpack file.');
  const bytes = await blob.arrayBuffer();
  required(
    (await creatorSHA256(bytes)) === reference.sha256,
    'Installed content manifest failed its integrity check.',
  );
  creatorAbort(signal);
  const manifest = boundedJSON(new TextDecoder('utf-8', { fatal: true }).decode(bytes), {
    maxBytes: CREATOR_BUNDLE_LIMITS.manifestBytes,
    maxDepth: 26,
    maxNodes: 100000,
  });
  required(
    reference.id === `${PREFIX}${manifest.editionId}`,
    'Installed content edition differs from its index.',
  );
  return inspectCreatorManifest(manifest);
}
export async function installedCreatorManifests(store, { signal } = {}) {
  const snapshot = await store.readDomainMetadata('media', { signal });
  const items = hydrateStoredStillMedia(snapshot.library).legacy.items;
  const offloaded = new Set(
    items
      .filter((item) => item.id.startsWith(OFFLOADED_PREFIX))
      .map((item) => item.id.slice(OFFLOADED_PREFIX.length)),
  );
  const references = items.filter(
    (item) => item.id.startsWith(PREFIX) && !offloaded.has(item.id.slice(PREFIX.length)),
  );
  const manifests = [];
  for (const reference of references) manifests.push(await readManifest(store, reference, signal));
  return manifests;
}
export async function loadInstalledCreatorBundle(
  store,
  editionId,
  { signal, decodeImage, inspectVideo } = {},
) {
  required(
    typeof editionId === 'string' && /^[a-f0-9]{64}$/.test(editionId),
    'Choose an installed content edition.',
  );
  const snapshot = await store.readDomainMetadata('media', { signal });
  const items = hydrateStoredStillMedia(snapshot.library).legacy.items;
  required(
    !items.some((item) => item.id === `${OFFLOADED_PREFIX}${editionId}`),
    'This exact content edition is offloaded. Reinstall its retained .rlpack file first.',
  );
  const reference = items.find((r) => r.id === `${PREFIX}${editionId}`);
  required(
    reference,
    'This exact content edition is not installed. Import its .rlpack file first.',
  );
  const manifest = await readManifest(store, reference, signal);
  required(
    Array.isArray(manifest.assets) && manifest.assets.length >= 1,
    'Unsupported installed creator asset inventory.',
  );
  const assets = [];
  for (const item of manifest.assets)
    assets.push({
      sha256: item.sha256,
      blob: await store.readSelectedBlob(item.sha256, {
        signal,
        maxBytes:
          item.kind === 'victory-video-original'
            ? VIDEO_POSTER_LIMITS.sourceBytes
            : 4 * 1024 * 1024,
      }),
    });
  const { compatibility: _compatibility, ...content } = manifest.content;
  const prepared = await prepareCreatorBundle(content, assets, {
    signal,
    decodeImage,
    ...(inspectVideo ? { inspectVideo } : {}),
  });
  required(
    canonicalJSON(prepared.manifest) === canonicalJSON(manifest),
    'Installed content no longer verifies. Restore its exact pack.',
  );
  return prepared;
}

/** Recovery/export always uses the same bounded portable validator, even if a
 * caller obtained bytes from local storage instead of a file chooser. */
export async function exportInstalledCreatorBundle(store, editionId, options = {}) {
  const prepared = await loadInstalledCreatorBundle(store, editionId, options);
  return exportCreatorBundle(prepared, approveCreatorBundle(prepared));
}

export async function creatorEditionStorageStatus(store, editionId, { signal } = {}) {
  required(
    typeof editionId === 'string' && /^[a-f0-9]{64}$/.test(editionId),
    'Choose an installed content edition.',
  );
  const snapshot = await store.readDomainMetadata('media', { signal });
  const items = hydrateStoredStillMedia(snapshot.library).legacy.items;
  const manifest = items.find((item) => item.id === `${PREFIX}${editionId}`);
  const marker = items.find((item) => item.id === `${OFFLOADED_PREFIX}${editionId}`);
  required(!marker || marker.sha256 === manifest?.sha256, 'Offloaded edition marker is invalid.');
  if (manifest) await readManifest(store, manifest, signal);
  return Object.freeze({
    editionId,
    manifestRetained: !!manifest,
    installed: !!manifest && !marker,
    offloaded: !!manifest && !!marker,
    generation: snapshot.generation,
  });
}

/** Review an exact-edition detach. The manifest stays indexed; only asset
 * references unused by another active creator edition are relinquished. */
export async function reviewCreatorEditionOffload(store, editionId, { signal, decodeImage } = {}) {
  required(
    typeof editionId === 'string' && /^[a-f0-9]{64}$/.test(editionId),
    'Choose an installed content edition.',
  );
  creatorAbort(signal);
  const snapshot = await store.readDomain('media', { signal });
  const document = hydrateStoredStillMedia(snapshot.library);
  const markerId = `${OFFLOADED_PREFIX}${editionId}`;
  required(
    !document.legacy.items.some((item) => item.id === markerId),
    'This exact content edition is already offloaded.',
  );
  const reference = document.legacy.items.find((item) => item.id === `${PREFIX}${editionId}`);
  required(reference, 'This exact content edition is not installed.');
  const assets = new Map(snapshot.assets.map((item) => [item.sha256, item.blob]));
  const manifest = await manifestFromSnapshot(reference, assets, signal);
  const offloaded = new Set(
    document.legacy.items
      .filter((item) => item.id.startsWith(OFFLOADED_PREFIX))
      .map((item) => item.id.slice(OFFLOADED_PREFIX.length)),
  );
  const shared = new Set();
  for (const other of document.legacy.items.filter(
    (item) =>
      item.id.startsWith(PREFIX) &&
      item.id !== reference.id &&
      !offloaded.has(item.id.slice(PREFIX.length)),
  )) {
    const otherManifest = await manifestFromSnapshot(other, assets, signal);
    for (const asset of otherManifest.assets) shared.add(asset.sha256);
  }
  const remove = [];
  for (const asset of manifest.assets) {
    const assetReference = document.legacy.items.find(
      (item) => item.id === `creator.asset.${asset.sha256}`,
    );
    required(assetReference, 'Installed content asset index is incomplete.');
    required(assets.has(asset.sha256), 'Installed content asset bytes are missing.');
    if (!shared.has(asset.sha256)) remove.push(assetReference);
  }
  const add = [{ id: markerId, sha256: reference.sha256 }];
  const nextLegacy = new Map(document.legacy.items.map((item) => [item.id, item]));
  for (const item of remove) nextLegacy.delete(item.id);
  for (const item of add) nextLegacy.set(item.id, item);
  const nextDocument = {
    ...document,
    legacy: { ...document.legacy, items: [...nextLegacy.values()] },
  };
  const wanted = storedStillHashes(nextDocument);
  const retainedAssets = snapshot.assets.filter((item) => wanted.has(item.sha256));
  const prepared = await prepareRetainedStillByteEdit(
    snapshot.library,
    { add, remove },
    retainedAssets,
    { signal, decodeImage },
  );
  const detachedHashes = new Set(remove.map((item) => item.sha256));
  const retainedHashes = storedStillHashes(prepared.library);
  const review = Object.freeze({
    editionId,
    generation: snapshot.generation,
    detachedAssets: remove.length,
    detachableBytes: snapshot.assets
      .filter((item) => detachedHashes.has(item.sha256) && !retainedHashes.has(item.sha256))
      .reduce((total, item) => total + item.blob.size, 0),
    manifestRetained: true,
  });
  offloadReviews.set(review, { store, prepared });
  return review;
}

export async function offloadInstalledCreatorBundle(store, review, { signal } = {}) {
  const state = offloadReviews.get(review);
  required(state?.store === store, 'Review this exact installed edition again before offloading.');
  offloadReviews.delete(review);
  await store.commitDomain('media', state.prepared, {
    expectedGeneration: review.generation,
    signal,
  });
  return creatorEditionStorageStatus(store, review.editionId, { signal });
}
export { importCreatorBundle };
