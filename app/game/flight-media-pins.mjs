import { boundedJSON, canonicalJSON, exactKeys, required } from './data-json.mjs';
import { freezeMedia } from './media-library.mjs';
import { validateStoredStillMedia } from './media-storage-record.mjs';
import {
  PRESENTATION_PINS_FORMAT,
  PRESENTATION_PINS_BYTES,
  createPresentationPins,
  snapshotPresentationPins,
  validatePresentationPinsForRun,
} from './presentation-pins.mjs';
import { STORY_PIN_FORMAT, snapshotStoryPin } from './story-bindings.mjs';
import { validateStoredStories, verifyStoredStoryBindings } from './story-storage-record.mjs';

export const FLIGHT_MEDIA_PINS_FORMAT = 'revealline-flight-pictures.v2';
const own = (source) =>
  boundedJSON(source, {
    maxBytes: PRESENTATION_PINS_BYTES,
    maxArray: 64,
    maxNodes: 2048,
    maxString: 512,
  });
const abort = (signal) => {
  if (signal?.aborted) throw new DOMException('Flight media selection cancelled.', 'AbortError');
};

/** Compact immutable reference; the containing choice owns its exact poster. */
export function snapshotFlightStoryReference(source, picture) {
  if (source === null) return null;
  const value = own(source);
  exactKeys(
    value,
    ['id', 'revision', 'descriptorSha256', 'sourceSha256'],
    'flight story reference',
  );
  snapshotStoryPin({ format: STORY_PIN_FORMAT, picturePin: picture, ...value });
  return freezeMedia(value);
}

/** Explicit version dispatch. The v1 parser and serialized shape stay unchanged. */
export function snapshotFlightPresentationPins(source) {
  const value = own(source);
  if (value.format === PRESENTATION_PINS_FORMAT) return snapshotPresentationPins(value);
  exactKeys(
    value,
    ['format', 'executionKey', 'levelId', 'levelRevision', 'choices'],
    'flight media',
  );
  required(value.format === FLIGHT_MEDIA_PINS_FORMAT, 'Unsupported flight media format.');
  required(Array.isArray(value.choices), 'Flight media needs bounded theme choices.');
  const pictures = snapshotPresentationPins({
    ...value,
    format: PRESENTATION_PINS_FORMAT,
    choices: value.choices.map((choice) => {
      exactKeys(choice, ['picture', 'story'], 'flight media choice');
      return choice.picture;
    }),
  });
  value.choices = value.choices.map((choice, index) => ({
    picture: pictures.choices[index],
    story: snapshotFlightStoryReference(choice.story, pictures.choices[index]),
  }));
  return freezeMedia(value);
}

/** Existing still acquisition receives only its original v1 picture contract. */
export function presentationPicturePins(source) {
  const pins = snapshotFlightPresentationPins(source);
  return pins.format === PRESENTATION_PINS_FORMAT
    ? pins
    : snapshotPresentationPins({
        ...pins,
        format: PRESENTATION_PINS_FORMAT,
        choices: pins.choices.map((choice) => choice.picture),
      });
}

export function validateFlightPresentationPinsForRun(source, context) {
  const pins = snapshotFlightPresentationPins(source);
  validatePresentationPinsForRun(presentationPicturePins(pins), context);
  return pins;
}

/** A fresh retry may change difficulty, never its accepted authored media.
 * Validate every destination identity before reusing the complete picture/story refs. */
export function retryFlightPresentationPins(source, context) {
  const pins = snapshotFlightPresentationPins(source);
  required(pins.levelId === context.level?.id, 'Retry pictures belong to a different mission.');
  return validateFlightPresentationPinsForRun(
    { ...pins, executionKey: context.campaignKey, levelRevision: context.level.revision },
    context,
  );
}

/** Own and verify the complete selected metadata before freezing a fresh attempt.
 * Missing video bytes retain a story reference; no codec is allocated here. */
export async function createFlightPresentationPins(
  { storyDocument, stillDocument, ...pictures },
  { signal } = {},
) {
  abort(signal);
  const selected = createPresentationPins(pictures),
    still = validateStoredStillMedia(stillDocument),
    stories = validateStoredStories(storyDocument, still);
  await verifyStoredStoryBindings(stories, { signal });
  abort(signal);
  const bindings = new Map(
    (stories.bindings ?? []).map((b) => [canonicalJSON(b.picturePin), b.story]),
  );
  return snapshotFlightPresentationPins({
    ...selected,
    format: FLIGHT_MEDIA_PINS_FORMAT,
    choices: selected.choices.map((picture) => {
      const binding = bindings.get(canonicalJSON(picture));
      const descriptor =
        binding &&
        stories.stories.find((s) => s.id === binding.id && s.revision === binding.revision);
      return {
        picture,
        story: descriptor ? { ...binding, sourceSha256: descriptor.source.sha256 } : null,
      };
    }),
  });
}

/** Old attempts and explicit null never acquire a subsequently authored story. */
export function storyPinForTheme(source, themeId) {
  const pins = snapshotFlightPresentationPins(source);
  if (pins.format === PRESENTATION_PINS_FORMAT) {
    required(
      pins.choices.some((p) => p.identity.themeId === themeId),
      'World is absent from this attempt.',
    );
    return null;
  }
  const choice = pins.choices.find((c) => c.picture.identity.themeId === themeId);
  required(choice, 'World is absent from this attempt.');
  return choice.story === null
    ? null
    : snapshotStoryPin({
        format: STORY_PIN_FORMAT,
        picturePin: choice.picture,
        ...choice.story,
      });
}
