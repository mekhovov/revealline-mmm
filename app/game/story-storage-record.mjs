import { boundedJSON, canonicalJSON, exactKeys, required } from './data-json.mjs';
import { MEDIA_LIMITS, freezeMedia } from './media-library.mjs';
import {
  hydrateStoredStillMedia,
  createStoredStillIdentityCatalog,
} from './media-storage-record.mjs';
import { snapshotPictureChoice } from './presentation-pins.mjs';
import { validateVictoryStory, prepareVictoryStory } from './victory-story.mjs';

export const STORY_STORAGE_FORMAT = 'revealline-story-storage.v1';
export const STORY_BINDINGS_FORMAT = 'revealline-story-storage.v2';
const hashValid = (value) => typeof value === 'string' && /^[a-f0-9]{64}$/.test(value);
const abort = (signal) => {
  if (signal?.aborted) throw new DOMException('Story binding cancelled.', 'AbortError');
};
export const storedStoryMetadataBytes = (document) =>
  document.stories.length || document.bindings?.length
    ? new TextEncoder().encode(canonicalJSON(document)).length
    : 0;
const preparations = new WeakSet();
const nativeSize = Object.getOwnPropertyDescriptor(Blob.prototype, 'size').get;
const key = (story) => JSON.stringify([story.id, story.revision]);
export const emptyStoredStories = () =>
  freezeMedia({ format: STORY_STORAGE_FORMAT, stories: [], originals: [] });
export const storedStoryHashes = (document) => new Set(document.originals);

/** Separate opt-in history. Availability can change; identities never disappear.
 * The retained still owner catalog, not today's installed pack/assignment, is authority.
 */
export function validateStoredStories(source, stillSource) {
  const value = boundedJSON(source, {
    maxBytes: MEDIA_LIMITS.metadataBytes,
    maxNodes: 100000,
    maxDepth: 16,
    maxArray: 512,
    maxString: 2048,
  });
  const bindings = value.format === STORY_BINDINGS_FORMAT;
  exactKeys(
    value,
    ['format', 'stories', 'originals', ...(bindings ? ['bindings'] : [])],
    'stored stories',
  );
  required(
    (value.format === STORY_STORAGE_FORMAT || bindings) &&
      Array.isArray(value.stories) &&
      Array.isArray(value.originals),
    'Unsupported stored stories.',
  );
  const still = hydrateStoredStillMedia(stillSource),
    identityCatalog = createStoredStillIdentityCatalog(still),
    ids = new Set(),
    sources = new Map();
  value.stories = value.stories.map((source) => {
    const story = validateVictoryStory(source, { library: still.library, identityCatalog });
    required(!ids.has(key(story)), 'Duplicate story revision.');
    ids.add(key(story));
    const prior = sources.get(story.source.sha256);
    required(
      !prior || canonicalJSON(prior) === canonicalJSON(story.source),
      'One video hash has conflicting inspected facts.',
    );
    sources.set(story.source.sha256, story.source);
    return story;
  });
  const available = new Set();
  let bytes = 0;
  for (const hash of value.originals) {
    required(
      typeof hash === 'string' && sources.has(hash) && !available.has(hash),
      'Unknown or duplicate story original.',
    );
    available.add(hash);
    bytes += sources.get(hash).bytes;
  }
  required(bytes <= 256 * 1024 * 1024, 'Story inventory exceeds the shared managed budget.');
  if (bindings) {
    required(
      Array.isArray(value.bindings) && value.bindings.length <= 512,
      'Expected explicit bounded story bindings.',
    );
    const bound = new Set();
    value.bindings = value.bindings.map((binding) => {
      exactKeys(binding, ['picturePin', 'story'], 'authored story binding');
      const picturePin = pictureInContext(binding.picturePin, still, identityCatalog),
        id = canonicalJSON(picturePin);
      required(!bound.has(id), 'Duplicate exact picture story binding.');
      bound.add(id);
      if (binding.story !== null) {
        exactKeys(
          binding.story,
          ['id', 'revision', 'descriptorSha256'],
          'authored story reference',
        );
        const selected = value.stories.find(
          (story) => story.id === binding.story.id && story.revision === binding.story.revision,
        );
        required(
          selected &&
            canonicalJSON(selected.picturePin) === id &&
            hashValid(binding.story.descriptorSha256),
          'Story binding needs the exact retained descriptor and picture.',
        );
      }
      return { picturePin, story: binding.story };
    });
  }
  return freezeMedia(value);
}

function pictureInContext(source, still, owners) {
  const pin = snapshotPictureChoice(source),
    presentation = still.library.presentations.find(
      (p) => p.id === pin.presentationId && p.revision === pin.presentationRevision,
    ),
    asset = still.library.assets.find((a) => a.id === pin.assetId);
  required(
    pin.kind === 'still' &&
      owners.has(pin.identity) &&
      presentation &&
      asset &&
      canonicalJSON(presentation.identity) === canonicalJSON(pin.identity) &&
      presentation.poster.assetId === pin.assetId &&
      asset.sha256 === pin.sha256,
    'Restore the exact historical poster and owner for this story binding.',
  );
  return pin;
}
export function validateStoredStoryPicture(source, stillSource) {
  const still = hydrateStoredStillMedia(stillSource);
  return pictureInContext(source, still, createStoredStillIdentityCatalog(still));
}

export async function storyDescriptorSha256(descriptor, { signal } = {}) {
  abort(signal);
  const own = boundedJSON(descriptor, {
      maxBytes: 8192,
      maxArray: 16,
      maxNodes: 256,
      maxString: 2048,
    }),
    bytes = new TextEncoder().encode(canonicalJSON(own)),
    digest = await crypto.subtle.digest('SHA-256', bytes);
  abort(signal);
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

/** Structural validation stays synchronous for IndexedDB's final transaction.
 * Rehash every declared reference before publishing asynchronous read/preparation authority.
 */
export async function verifyStoredStoryBindings(document, { signal } = {}) {
  abort(signal);
  for (const binding of document.bindings ?? [])
    if (binding.story !== null) {
      const selected = document.stories.find(
        (s) => s.id === binding.story.id && s.revision === binding.story.revision,
      );
      required(
        selected &&
          (await storyDescriptorSha256(selected, { signal })) === binding.story.descriptorSha256,
        'Authored story descriptor hash differs from its immutable history.',
      );
    }
  abort(signal);
  return document;
}

/** Deliberate authoring operation. Missing/null does not select the first history row. */
export async function changeStoredStoryBinding(source, request, stillSource, { signal } = {}) {
  const context = hydrateStoredStillMedia(stillSource),
    safe = validateStoredStories(source, context),
    own = boundedJSON(request, { maxBytes: 8192, maxArray: 16, maxNodes: 256, maxString: 2048 });
  exactKeys(own, ['picturePin', 'story'], 'story binding request');
  const picturePin = validateStoredStoryPicture(own.picturePin, context),
    bindings = [...(safe.bindings ?? [])];
  let story = null;
  if (own.story !== null) {
    exactKeys(own.story, ['id', 'revision'], 'story selection');
    const selected = safe.stories.find(
      (s) => s.id === own.story.id && s.revision === own.story.revision,
    );
    required(
      selected && canonicalJSON(selected.picturePin) === canonicalJSON(picturePin),
      'Select an exact existing story for this poster.',
    );
    story = {
      id: selected.id,
      revision: selected.revision,
      descriptorSha256: await storyDescriptorSha256(selected, { signal }),
    };
  }
  await verifyStoredStoryBindings(safe, { signal });
  const index = bindings.findIndex(
      (b) => canonicalJSON(b.picturePin) === canonicalJSON(picturePin),
    ),
    next = { picturePin, story };
  if (index < 0) bindings.push(next);
  else bindings[index] = next;
  return validateStoredStories({ ...safe, format: STORY_BINDINGS_FORMAT, bindings }, context);
}
export function assertStoredStoryTransition(current, next, still) {
  const old = validateStoredStories(current, still),
    safe = validateStoredStories(next, still),
    retained = new Map(safe.stories.map((story) => [key(story), story]));
  required(
    old.format !== STORY_BINDINGS_FORMAT || safe.format === STORY_BINDINGS_FORMAT,
    'Story bindings cannot be downgraded to v1.',
  );
  const bound = new Set((safe.bindings ?? []).map((binding) => canonicalJSON(binding.picturePin)));
  required(
    (old.bindings ?? []).every((binding) => bound.has(canonicalJSON(binding.picturePin))),
    'Authored binding identities cannot be removed; choose explicit null.',
  );
  for (const story of old.stories)
    required(
      canonicalJSON(retained.get(key(story)) ?? null) === canonicalJSON(story),
      'Immutable story revisions cannot change or be removed.',
    );
}

/** Own a complete bounded original table without claiming decoded-video authority. */
export function ownStoryOriginals(sourceAssets, originals) {
  originals = boundedJSON(originals, {
    maxBytes: 65536,
    maxArray: 512,
    maxNodes: 600,
    maxString: 64,
  });
  required(
    Array.isArray(originals) &&
      originals.every((hash) => typeof hash === 'string' && /^[a-f0-9]{64}$/.test(hash)) &&
      new Set(originals).size === originals.length,
    'Invalid story original reference table.',
  );
  required(
    Array.isArray(sourceAssets) &&
      Object.getPrototypeOf(sourceAssets) === Array.prototype &&
      sourceAssets.length <= 512,
    'Invalid story original table.',
  );
  const fields = Object.getOwnPropertyDescriptors(sourceAssets),
    owned = [],
    seen = new Set();
  required(
    Reflect.ownKeys(fields).length === sourceAssets.length + 1,
    'Story originals require a dense owned array.',
  );
  let total = 0;
  for (let i = 0; i < sourceAssets.length; i++) {
    const entry = fields[i];
    required(
      entry?.enumerable &&
        Object.hasOwn(entry, 'value') &&
        entry.value &&
        Object.getPrototypeOf(entry.value) === Object.prototype,
      'Story original must be an owned entry.',
    );
    const d = Object.getOwnPropertyDescriptors(entry.value);
    required(
      Reflect.ownKeys(d).length === 2 &&
        ['sha256', 'blob'].every((k) => d[k]?.enumerable && Object.hasOwn(d[k], 'value')),
      'Story original needs own hash and native Blob.',
    );
    const hash = d.sha256.value,
      blob = d.blob.value,
      bytes = nativeSize.call(blob);
    required(
      originals.includes(hash) && !seen.has(hash) && bytes > 0 && bytes <= 64 * 1024 * 1024,
      'Unknown/duplicate story original or source byte budget exceeded.',
    );
    total += bytes;
    required(total <= 256 * 1024 * 1024, 'Story originals exceed the shared budget.');
    seen.add(hash);
    owned.push({ sha256: hash, blob: Blob.prototype.slice.call(blob, 0, bytes) });
  }
  required(seen.size === originals.length, 'Restore every available story original before saving.');
  return Object.freeze(owned.map(Object.freeze));
}

/** Complete original inventory prepared through the real owned-video inspector.
 * JSON facts or a shape-compatible fake are never codec/hash authority.
 */
export async function prepareStoredStories(document, sourceAssets, { still, ...options } = {}) {
  const safe = validateStoredStories(document, still),
    context = hydrateStoredStillMedia(still),
    identityCatalog = createStoredStillIdentityCatalog(context),
    owned = ownStoryOriginals(sourceAssets, safe.originals);
  // Snapshot all caller-controlled input before the first decoder/hash await.
  await verifyStoredStoryBindings(safe, options);
  const assets = [];
  for (const item of owned) {
    const descriptor = safe.stories.find((story) => story.source.sha256 === item.sha256),
      prepared = await prepareVictoryStory(
        { descriptor, blob: item.blob, library: context.library, identityCatalog },
        options,
      );
    assets.push(Object.freeze({ sha256: item.sha256, blob: prepared.original }));
  }
  if (options.signal?.aborted) throw new DOMException('Story storage cancelled.', 'AbortError');
  const result = Object.freeze({ library: safe, assets: Object.freeze(assets) });
  preparations.add(result);
  return result;
}
export const isPreparedStoredStories = (value) => preparations.has(value);
