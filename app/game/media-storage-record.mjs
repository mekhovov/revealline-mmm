import { readOfficialOriginal } from './official-downloads.mjs';
import { boundedJSON, canonicalJSON, exactKeys, required, stableId } from './data-json.mjs';
import { campaignKey } from './library.mjs';
import { createExecutionCatalog } from './campaign-contexts.mjs';
import { createDifficultyContext } from './campaign-difficulty.mjs';
import { CLASSES } from './core/registry.mjs';
import { normalizedLevel } from './core/level.mjs';
import {
  createMediaIdentityCatalog,
  validateMediaLibrary,
  MEDIA_LIBRARY_FORMAT,
  MEDIA_LIMITS,
  freezeMedia,
} from './media-library.mjs';
import { prepareStillAsset } from './media-still.mjs';

export const STILL_STORAGE_FORMAT = 'revealline-still-storage.v1';
const prepared = new WeakSet();
const preparedTransitions = new WeakMap();
const nativeSize = Object.getOwnPropertyDescriptor(Blob.prototype, 'size').get;
const hashValid = (value) => typeof value === 'string' && /^[a-f0-9]{64}$/.test(value);
const abort = (signal) => {
  if (signal?.aborted) throw new DOMException('Still storage operation cancelled.', 'AbortError');
};
const own = (value) =>
  boundedJSON(value, {
    maxBytes: MEDIA_LIMITS.metadataBytes,
    maxNodes: 100000,
    maxDepth: 24,
    maxArray: 4096,
    maxString: 65536,
  });
export const emptyGenericMediaLibrary = () =>
  freezeMedia({ format: 'revealline-managed-bytes.v1', items: [] });
export function validateGenericMediaLibrary(value) {
  const copy = boundedJSON(value, {
    maxBytes: MEDIA_LIMITS.metadataBytes,
    maxNodes: 4096,
    maxDepth: 5,
    maxArray: 512,
    maxString: 128,
  });
  exactKeys(copy, ['format', 'items'], 'managed byte library');
  required(
    copy.format === 'revealline-managed-bytes.v1' && Array.isArray(copy.items),
    'Unsupported managed byte library.',
  );
  const ids = new Set();
  for (const item of copy.items) {
    exactKeys(item, ['id', 'sha256'], 'managed byte reference');
    required(
      typeof item.id === 'string' &&
        /^[a-z0-9][a-z0-9._-]{0,127}$/.test(item.id) &&
        !ids.has(item.id) &&
        hashValid(item.sha256),
      'Invalid or duplicate managed byte reference.',
    );
    ids.add(item.id);
  }
  return freezeMedia(copy);
}
export function isStoredStillMedia(value) {
  return value?.format === STILL_STORAGE_FORMAT;
}
function contextForOwners(owners) {
  return createMediaIdentityCatalog(
    createExecutionCatalog(
      owners.map((owner) => ({
        campaign: owner.campaign,
        themes: owner.themeIds.map((id) => ({ id })),
      })),
    ),
  );
}

/** Rich metadata plus complete bounded historical gameplay owners. These are
 * validation contexts, not installed campaigns or evidence of earned awards.
 */
export function validateStoredStillMedia(source) {
  const value = own(source);
  exactKeys(value, ['format', 'owners', 'library', 'legacy'], 'stored still media');
  required(value.format === STILL_STORAGE_FORMAT, 'Unsupported still storage format.');
  required(
    Array.isArray(value.owners) && value.owners.length <= 104,
    'Still history needs at most 104 campaign owners.',
  );
  const keys = new Set();
  for (const owner of value.owners) {
    exactKeys(owner, ['campaign', 'themeIds'], 'still history owner');
    required(
      Array.isArray(owner.campaign?.classRecipes),
      'Stored owners require the complete effective class roster.',
    );
    // The real validator checks level versions, mechanics, filtered roster,
    // duplicate maps and class identities, not only the stored syntactic shape.
    const context = createDifficultyContext(owner.campaign);
    required(
      canonicalJSON(context.campaign) === canonicalJSON(owner.campaign),
      'Stored owner must contain its exact validated campaign.',
    );
    required(
      canonicalJSON(owner.campaign.levels) ===
        canonicalJSON(owner.campaign.levels.map(normalizedLevel)),
      'Stored owner levels must retain their effective defaults.',
    );
    required(!keys.has(context.baseCampaignKey), 'Duplicate stored campaign owner.');
    keys.add(context.baseCampaignKey);
    required(
      Array.isArray(owner.themeIds) &&
        owner.themeIds.length <= 64 &&
        owner.themeIds.every(stableId) &&
        new Set(owner.themeIds).size === owner.themeIds.length,
      'Invalid stored owner themes.',
    );
  }
  value.library = validateMediaLibrary(value.library, {
    identityCatalog: contextForOwners(value.owners),
  });
  value.legacy = validateGenericMediaLibrary(value.legacy);
  required(
    storedStillHashes(value).size <= MEDIA_LIMITS.assets,
    'Combined still and retained-byte inventory exceeds 512 assets.',
  );
  return freezeMedia(value);
}
export function hydrateStoredStillMedia(source) {
  const value = own(source);
  if (isStoredStillMedia(value)) return validateStoredStillMedia(value);
  return validateStoredStillMedia({
    format: STILL_STORAGE_FORMAT,
    owners: [],
    library: { format: MEDIA_LIBRARY_FORMAT, assets: [], presentations: [], assignments: [] },
    legacy: validateGenericMediaLibrary(value),
  });
}
export function createStoredStillIdentityCatalog(source) {
  return contextForOwners(validateStoredStillMedia(source).owners);
}
export function storedStillHashes(value) {
  return new Set([
    ...value.library.assets.map((a) => a.sha256),
    ...value.legacy.items.map((a) => a.sha256),
  ]);
}

/** Recheck against the actual row in the final write transaction, not a caller's
 * alleged previous generation. Rich history cannot drop; retained bytes may be
 * detached only through an exact prepared removal inventory.
 */
export function assertStoredStillTransition(current, next, removedLegacy = new Map()) {
  const old = hydrateStoredStillMedia(current);
  const retained = new Map(next.legacy.items.map((item) => [item.id, item.sha256]));
  required(
    old.legacy.items.every(
      (item) => retained.get(item.id) === item.sha256 || removedLegacy.get(item.id) === item.sha256,
    ),
    'Retained legacy media references cannot change or be removed.',
  );
  required(
    [...removedLegacy].every(
      ([id, sha256]) =>
        old.legacy.items.some((item) => item.id === id && item.sha256 === sha256) &&
        !retained.has(id),
    ),
    'Detached legacy media references differ from the reviewed generation.',
  );
  for (const owner of old.owners) {
    const found = next.owners.find(
      (item) => campaignKey(item.campaign) === campaignKey(owner.campaign),
    );
    required(
      found &&
        canonicalJSON(found.campaign) === canonicalJSON(owner.campaign) &&
        owner.themeIds.every((id) => found.themeIds.includes(id)),
      'Stored historical owners cannot change or be removed.',
    );
  }
  validateMediaLibrary(next.library, {
    identityCatalog: contextForOwners(next.owners),
    previous: old.library,
  });
}

/** Recheck a prepared rich-media transition with its private, exact removal
 * inventory. Callers cannot turn an ordinary prepared append into a detach by
 * changing the public document. */
export function assertPreparedStoredStillTransition(current, value) {
  required(prepared.has(value), 'Still storage transition was not prepared.');
  assertStoredStillTransition(
    current,
    value.library,
    preparedTransitions.get(value)?.removedLegacy ?? new Map(),
  );
}

function ownAssets(source) {
  required(
    Array.isArray(source) &&
      Object.getPrototypeOf(source) === Array.prototype &&
      source.length <= 512,
    'Invalid still storage asset table.',
  );
  const descriptors = Object.getOwnPropertyDescriptors(source),
    result = [],
    seen = new Set();
  required(
    Reflect.ownKeys(descriptors).length === source.length + 1,
    'Still storage assets must be a dense array.',
  );
  let total = 0;
  for (let index = 0; index < source.length; index++) {
    const d = descriptors[index];
    required(
      d?.enumerable &&
        Object.hasOwn(d, 'value') &&
        d.value &&
        Object.getPrototypeOf(d.value) === Object.prototype,
      'Invalid still storage asset.',
    );
    const fields = Object.getOwnPropertyDescriptors(d.value);
    required(
      Reflect.ownKeys(fields).length === 2 &&
        ['sha256', 'blob'].every(
          (key) => fields[key]?.enumerable && Object.hasOwn(fields[key], 'value'),
        ),
      'Still storage assets require own hash and Blob.',
    );
    const hash = fields.sha256.value,
      blob = fields.blob.value;
    let bytes;
    try {
      bytes = nativeSize.call(blob);
    } catch {
      throw new TypeError('Still storage requires native Blobs.');
    }
    required(
      hashValid(hash) && !seen.has(hash) && bytes > 0 && bytes <= 64 * 1024 * 1024,
      'Invalid still storage hash/byte bound.',
    );
    total += bytes;
    required(total <= 512 * 1024 * 1024, 'Still storage assets exceed the shared managed budget.');
    seen.add(hash);
    result.push(Object.freeze({ sha256: hash, blob: Blob.prototype.slice.call(blob, 0, bytes) }));
  }
  return Object.freeze(result);
}
export async function verifyStoredStillAssets(document, assets, { decodeImage, signal } = {}) {
  abort(signal);
  const safe = validateStoredStillMedia(document),
    owned = ownAssets(assets),
    wanted = storedStillHashes(safe);
  required(
    wanted.size === owned.length && owned.every((a) => wanted.has(a.sha256)),
    'Still storage needs every referenced original and no extras.',
  );
  if (owned.reduce((sum, item) => sum + nativeSize.call(item.blob), 0) > 256 * 1024 * 1024) {
    let importedBytes = 0;
    for (const item of owned) {
      const original = await readOfficialOriginal(item.sha256);
      if (!original || original.size !== item.blob.size) importedBytes += item.blob.size;
      abort(signal);
    }
    required(
      importedBytes <= 256 * 1024 * 1024,
      'Still storage assets exceed the shared managed budget.',
    );
  }
  for (const item of owned) {
    abort(signal);
    const expected = safe.library.assets.find((a) => a.sha256 === item.sha256);
    if (expected) {
      try {
        const checked = await prepareStillAsset(
          item.blob,
          { id: expected.id, provenance: expected.provenance },
          { decodeImage, signal },
        );
        required(
          canonicalJSON(checked.asset) === canonicalJSON(expected),
          'Stored still metadata/hash differs from decoded original bytes.',
        );
      } catch (error) {
        // Identify the exact original in multi-image imports/history merges.
        // This is diagnostic only: no format bypass, cache eviction or repair.
        if (error?.name === 'AbortError') throw error;
        throw new TypeError(
          `Still original "${expected.id}" failed byte/header/decode verification: ${error?.message || 'Original validation failed.'}`,
          { cause: error },
        );
      }
    } else {
      // Preserved generic v2 bytes may be nonimages. Never invent image metadata.
      const bytes = await item.blob.arrayBuffer();
      abort(signal);
      const digest = await crypto.subtle.digest('SHA-256', bytes);
      abort(signal);
      const hash = [...new Uint8Array(digest)]
        .map((byte) => byte.toString(16).padStart(2, '0'))
        .join('');
      required(hash === item.sha256, 'Retained legacy media hash differs from original bytes.');
    }
  }
  abort(signal);
  return owned;
}

/** Prepare a complete atomic still-domain update. New bindings must have a
 * currently supplied exact execution context; retained history may be archived.
 */
export async function prepareStoredStillMedia(
  library,
  assets,
  { executionCatalog, previous = emptyGenericMediaLibrary(), decodeImage, signal } = {},
) {
  abort(signal);
  const old = hydrateStoredStillMedia(previous);
  const current = createMediaIdentityCatalog(executionCatalog);
  const safe = validateMediaLibrary(library, { identityCatalog: current, previous: old.library });
  const owners = structuredClone(old.owners),
    byKey = new Map(owners.map((owner) => [campaignKey(owner.campaign), owner]));
  const wanted = new Map();
  for (const item of safe.presentations) {
    if (!wanted.has(item.identity.baseCampaignKey))
      wanted.set(item.identity.baseCampaignKey, new Set());
    wanted.get(item.identity.baseCampaignKey).add(item.identity.themeId);
  }
  // createMediaIdentityCatalog has already rejected accessor-bearing wrappers;
  // snapshot again before the first await, and persist only exact owners/themes.
  for (const entry of executionCatalog.entries) {
    if (entry.difficulty !== 'standard' || !wanted.has(entry.baseCampaignKey)) continue;
    let owner = byKey.get(entry.baseCampaignKey);
    if (!owner) {
      const campaign = {
        ...structuredClone(entry.baseCampaign),
        levels: entry.baseCampaign.levels.map(normalizedLevel),
        classRecipes: structuredClone(entry.baseCampaign.classRecipes ?? CLASSES),
      };
      required(
        campaignKey(campaign) === entry.baseCampaignKey,
        'Materialized owner differs from the installed gameplay identity.',
      );
      owner = { campaign, themeIds: [] };
      owners.push(owner);
      byKey.set(entry.baseCampaignKey, owner);
    }
    for (const id of wanted.get(entry.baseCampaignKey))
      if (entry.themes.some((theme) => theme.id === id) && !owner.themeIds.includes(id))
        owner.themeIds.push(id);
    owner.themeIds.sort();
  }
  const document = validateStoredStillMedia({
    format: STILL_STORAGE_FORMAT,
    owners,
    library: safe,
    legacy: old.legacy,
  });
  assertStoredStillTransition(old, document);
  const owned = await verifyStoredStillAssets(document, assets, { decodeImage, signal });
  const result = Object.freeze({ library: document, assets: owned });
  prepared.add(result);
  preparedTransitions.set(result, Object.freeze({ removedLegacy: new Map() }));
  return result;
}
export function isPreparedStoredStillMedia(value) {
  return prepared.has(value);
}

/** Append content-addressed retained files without changing image assignments,
 * historical owners or any other domain. The caller's final transaction still
 * checks the real previous row and generation before making the index visible. */
export async function prepareRetainedStillBytes(
  previous,
  references,
  assets,
  { signal, decodeImage } = {},
) {
  abort(signal);
  const old = hydrateStoredStillMedia(previous);
  const additions = validateGenericMediaLibrary({
    format: 'revealline-managed-bytes.v1',
    items: references,
  });
  const merged = new Map(old.legacy.items.map((item) => [item.id, item]));
  for (const item of additions.items) {
    const existing = merged.get(item.id);
    required(
      !existing || existing.sha256 === item.sha256,
      'An immutable retained file cannot change.',
    );
    merged.set(item.id, item);
  }
  const document = validateStoredStillMedia({
    ...old,
    legacy: { ...old.legacy, items: [...merged.values()] },
  });
  assertStoredStillTransition(old, document);
  const owned = await verifyStoredStillAssets(document, assets, { signal, decodeImage });
  abort(signal);
  const result = Object.freeze({ library: document, assets: owned });
  prepared.add(result);
  preparedTransitions.set(result, Object.freeze({ removedLegacy: new Map() }));
  return result;
}

/** Prepare an exact edit to retained creator bytes. Removals name both the
 * immutable reference id and its reviewed hash; the final transaction checks
 * that same pair against the current generation before deleting anything. */
export async function prepareRetainedStillByteEdit(
  previous,
  { add = [], remove = [] },
  assets,
  { signal, decodeImage } = {},
) {
  abort(signal);
  const old = hydrateStoredStillMedia(previous);
  const additions = validateGenericMediaLibrary({
    format: 'revealline-managed-bytes.v1',
    items: add,
  });
  const removals = validateGenericMediaLibrary({
    format: 'revealline-managed-bytes.v1',
    items: remove,
  });
  const removedLegacy = new Map(removals.items.map((item) => [item.id, item.sha256]));
  const merged = new Map(old.legacy.items.map((item) => [item.id, item]));
  for (const item of removals.items) {
    const existing = merged.get(item.id);
    required(
      existing?.sha256 === item.sha256,
      'Detached retained file differs from the reviewed generation.',
    );
    merged.delete(item.id);
  }
  for (const item of additions.items) {
    const existing = merged.get(item.id);
    required(
      !existing || existing.sha256 === item.sha256,
      'An immutable retained file cannot change.',
    );
    merged.set(item.id, item);
  }
  const document = validateStoredStillMedia({
    ...old,
    legacy: { ...old.legacy, items: [...merged.values()] },
  });
  assertStoredStillTransition(old, document, removedLegacy);
  const owned = await verifyStoredStillAssets(document, assets, { signal, decodeImage });
  abort(signal);
  const result = Object.freeze({ library: document, assets: owned });
  prepared.add(result);
  preparedTransitions.set(result, Object.freeze({ removedLegacy }));
  return result;
}
