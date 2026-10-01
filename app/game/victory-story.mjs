import { boundedJSON, canonicalJSON, exactKeys, required, stableId } from './data-json.mjs';
import { freezeMedia, isMediaIdentityCatalog, isMediaLibrary } from './media-library.mjs';
import { snapshotPictureChoice } from './presentation-pins.mjs';
import { openVideoPosterSource, VIDEO_POSTER_LIMITS } from './video-poster.mjs';

export const VICTORY_STORY_FORMAT = 'revealline-victory-story.v1';
export const VICTORY_STORY_LIMITS = Object.freeze({
  descriptorBytes: 8192,
  ...VIDEO_POSTER_LIMITS,
});
const preparations = new WeakSet();
const aborted = () => new DOMException('Story preparation cancelled.', 'AbortError');

function validateStoryDescriptor(source) {
  const value = boundedJSON(source, {
    maxBytes: 8192,
    maxArray: 16,
    maxNodes: 256,
    maxString: 2048,
  });
  exactKeys(
    value,
    ['format', 'id', 'revision', 'picturePin', 'source', 'segment', 'description'],
    'story',
  );
  required(value.format === VICTORY_STORY_FORMAT && stableId(value.id), 'Invalid story identity.');
  required(
    Number.isSafeInteger(value.revision) && value.revision > 0 && value.revision <= 1000000,
    'Invalid story revision.',
  );
  required(
    typeof value.description === 'string' &&
      value.description.trim().length > 0 &&
      value.description.length <= 2048,
    'A story needs a bounded static description.',
  );
  value.picturePin = snapshotPictureChoice(value.picturePin);
  required(value.picturePin.kind === 'still', 'Story preview requires an exact managed still pin.');
  exactKeys(
    value.source,
    ['sha256', 'bytes', 'mime', 'width', 'height', 'durationSeconds'],
    'story source',
  );
  const info = value.source;
  required(
    typeof info.sha256 === 'string' && /^[a-f0-9]{64}$/.test(info.sha256),
    'Invalid original-video hash.',
  );
  required(
    Number.isSafeInteger(info.bytes) &&
      info.bytes > 0 &&
      info.bytes <= VIDEO_POSTER_LIMITS.sourceBytes &&
      ['video/mp4', 'video/webm'].includes(info.mime),
    'Story needs a bounded local MP4 or WebM.',
  );
  required(
    Number.isInteger(info.width) &&
      info.width > 0 &&
      info.width <= VIDEO_POSTER_LIMITS.width &&
      Number.isInteger(info.height) &&
      info.height > 0 &&
      info.height <= VIDEO_POSTER_LIMITS.height &&
      Number.isFinite(info.durationSeconds) &&
      info.durationSeconds > 0 &&
      info.durationSeconds <= VIDEO_POSTER_LIMITS.durationSeconds,
    'Invalid video dimensions or duration.',
  );
  exactKeys(value.segment, ['startSeconds', 'endSeconds'], 'story segment');
  const { startSeconds, endSeconds } = value.segment;
  required(
    Number.isFinite(startSeconds) &&
      Number.isFinite(endSeconds) &&
      startSeconds >= 0 &&
      startSeconds < endSeconds &&
      endSeconds <= info.durationSeconds,
    'Story segment must be finite and inside the original; times are never clamped.',
  );
  return freezeMedia(value);
}

/** An explicit preview sidecar. This does not extend any stored v1 presentation or receipt. */
export function validateVictoryStory(source, { library, identityCatalog } = {}) {
  const value = validateStoryDescriptor(source);
  required(
    isMediaLibrary(library) && isMediaIdentityCatalog(identityCatalog),
    'Story preview needs verified still and owner catalogs.',
  );
  const pin = value.picturePin;
  const presentation = library.presentations.find(
    (p) => p.id === pin.presentationId && p.revision === pin.presentationRevision,
  );
  const asset = library.assets.find((a) => a.id === pin.assetId);
  required(
    identityCatalog.has(pin.identity) &&
      presentation &&
      asset &&
      canonicalJSON(presentation.identity) === canonicalJSON(pin.identity) &&
      presentation.poster.assetId === pin.assetId &&
      asset.sha256 === pin.sha256,
    'Restore the exact historical poster and owner; current assignments cannot replace them.',
  );
  return value;
}

/** Authenticate a local original with the existing real inspection/hash path.
 * Injected decoder factories are trusted host capabilities, not JSON authority.
 */
export async function prepareVictoryStory(
  { descriptor, blob, library, identityCatalog },
  options = {},
) {
  const owned = validateVictoryStory(descriptor, { library, identityCatalog });
  if (options.signal?.aborted) throw aborted();
  const inspected = await openVideoPosterSource(blob, options);
  try {
    if (options.signal?.aborted) throw aborted();
    for (const [key, expected] of Object.entries(owned.source))
      required(
        inspected.info[key] === expected,
        `Original video ${key} differs from the selected story.`,
      );
    const prepared = Object.freeze({ descriptor: owned, original: inspected.original });
    preparations.add(prepared);
    return prepared;
  } finally {
    inspected.dispose();
  }
}

/** Authenticate an immutable portable story whose poster ownership was already
 * established by another prepared capability, such as a verified .rlpack. */
export async function preparePinnedVictoryStory({ descriptor, blob, picturePin }, options = {}) {
  const owned = validateStoryDescriptor(descriptor);
  required(
    canonicalJSON(owned.picturePin) === canonicalJSON(snapshotPictureChoice(picturePin)),
    'Portable story belongs to a different exact poster.',
  );
  if (options.signal?.aborted) throw aborted();
  const inspectVideo = options.inspectVideo ?? openVideoPosterSource;
  const inspected = await inspectVideo(blob, options);
  try {
    if (options.signal?.aborted) throw aborted();
    for (const [key, expected] of Object.entries(owned.source))
      required(
        inspected.info[key] === expected,
        `Original video ${key} differs from the selected story.`,
      );
    const prepared = Object.freeze({ descriptor: owned, original: inspected.original });
    preparations.add(prepared);
    return prepared;
  } finally {
    inspected.dispose();
  }
}

export function requirePreparedVictoryStory(prepared, picturePin) {
  required(
    preparations.has(prepared),
    'Story playback needs an authenticated preparation, not serialized metadata.',
  );
  required(
    canonicalJSON(snapshotPictureChoice(picturePin)) ===
      canonicalJSON(prepared.descriptor.picturePin),
    'Story belongs to a different exact poster.',
  );
  return prepared;
}
