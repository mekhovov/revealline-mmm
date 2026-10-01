import { boundedJSON, canonicalJSON, exactKeys, required, stableId } from './data-json.mjs';
import { freezeMedia } from './media-library.mjs';
import { snapshotPictureChoice } from './presentation-pins.mjs';
import {
  validateStoredStories,
  validateStoredStoryPicture,
  verifyStoredStoryBindings,
  storyDescriptorSha256,
} from './story-storage-record.mjs';

export const STORY_PIN_FORMAT = 'revealline-story-pin.v1';
const hashValid = (s) => typeof s === 'string' && /^[a-f0-9]{64}$/.test(s);
const abort = (signal) => {
  if (signal?.aborted) throw new DOMException('Story selection cancelled.', 'AbortError');
};

/** Serialized authored selection only; it supplies neither execution nor earned authority. */
export function snapshotStoryPin(source) {
  if (source === null) return null;
  const value = boundedJSON(source, {
    maxBytes: 8192,
    maxArray: 16,
    maxNodes: 256,
    maxString: 2048,
  });
  exactKeys(
    value,
    ['format', 'picturePin', 'id', 'revision', 'descriptorSha256', 'sourceSha256'],
    'story pin',
  );
  value.picturePin = snapshotPictureChoice(value.picturePin);
  required(
    value.format === STORY_PIN_FORMAT &&
      value.picturePin.kind === 'still' &&
      stableId(value.id) &&
      Number.isSafeInteger(value.revision) &&
      value.revision > 0 &&
      value.revision <= 1000000 &&
      hashValid(value.descriptorSha256) &&
      hashValid(value.sourceSha256),
    'Invalid exact story pin.',
  );
  return freezeMedia(value);
}

/** Freeze only a deliberate binding. V1, absent, explicit null and legacy stay null. */
export async function createAuthoredStoryPin({ document, still, picturePin }, { signal } = {}) {
  abort(signal);
  const picture = snapshotPictureChoice(picturePin);
  if (picture.kind === 'legacy') return null;
  const safe = validateStoredStories(document, still),
    exact = validateStoredStoryPicture(picture, still),
    binding = (safe.bindings ?? []).find(
      (b) => canonicalJSON(b.picturePin) === canonicalJSON(exact),
    );
  await verifyStoredStoryBindings(safe, { signal });
  if (!binding || binding.story === null) return null;
  const selected = safe.stories.find(
    (s) => s.id === binding.story.id && s.revision === binding.story.revision,
  );
  return snapshotStoryPin({
    format: STORY_PIN_FORMAT,
    picturePin: exact,
    ...binding.story,
    sourceSha256: selected.source.sha256,
  });
}

/** Resolve a previously frozen choice, never today's binding. Availability is
 * metadata only; acquire must still verify actual original bytes and native codec.
 */
export async function resolveAuthoredStoryPin(
  pinSource,
  { document, still, picturePin },
  { signal } = {},
) {
  abort(signal);
  const pin = snapshotStoryPin(pinSource);
  if (pin === null) return null;
  const safe = validateStoredStories(document, still),
    exact = validateStoredStoryPicture(picturePin, still);
  required(
    canonicalJSON(pin.picturePin) === canonicalJSON(exact),
    'Story pin belongs to a different exact picture.',
  );
  const descriptor = safe.stories.find((s) => s.id === pin.id && s.revision === pin.revision);
  required(
    descriptor &&
      canonicalJSON(descriptor.picturePin) === canonicalJSON(exact) &&
      descriptor.source.sha256 === pin.sourceSha256,
    'Restore this exact immutable story revision and original.',
  );
  required(
    (await storyDescriptorSha256(descriptor, { signal })) === pin.descriptorSha256,
    'Pinned story descriptor hash differs from immutable history.',
  );
  return freezeMedia({
    kind: safe.originals.includes(pin.sourceSha256) ? 'available' : 'unavailable',
    pin,
    descriptor,
  });
}
