import { boundedJSON, exactKeys, plainObject, required, stableId } from './data-json.mjs';
import { MAX_REPLAY_BYTES, snapshotReplay } from './replay.mjs';
import {
  ACTOR_APPEARANCE_PIN_BYTES,
  snapshotActorAppearancePin,
} from './presentation/actor-appearance-pin.mjs';

export const REPLAY_PRESENTATION_FORMAT = 'revealline-replay-presentation.v1';
export const AUTHORED_REPLAY_PRESENTATION_FORMAT = 'revealline-replay-presentation.v2';
export const REPLAY_PRESENTATION_METADATA_BYTES = 4096;
export const MAX_REPLAY_PRESENTATION_BYTES =
  MAX_REPLAY_BYTES + ACTOR_APPEARANCE_PIN_BYTES + REPLAY_PRESENTATION_METADATA_BYTES;

const encoder = new TextEncoder();

// Inspect only descriptors at this boundary. Each component then goes through
// its existing bounded parser; never stringify caller-owned getters or toJSON.
function fields(source, names) {
  required(plainObject(source), 'Replay presentation must be a plain object.');
  const descriptors = Object.getOwnPropertyDescriptors(source),
    keys = Reflect.ownKeys(descriptors);
  required(
    keys.length === names.length && keys.every((key) => names.includes(key)),
    'Replay presentation has unsupported or missing fields.',
  );
  const result = {};
  for (const name of names) {
    const descriptor = descriptors[name];
    required(
      descriptor?.enumerable && Object.hasOwn(descriptor, 'value'),
      'Replay presentation accessors and hidden fields are not supported.',
    );
    result[name] = descriptor.value;
  }
  return result;
}

function freeze(value) {
  if (value && typeof value === 'object') {
    Object.values(value).forEach(freeze);
    Object.freeze(value);
  }
  return value;
}

/** A bounded declaration, not accepted content, decoded actors or verified
 * performance. Hosts still reconstruct the exact accepted execution owner,
 * compare the actor pin, verify replay outcome and stage resources independently.
 * Raw recordings and their historical readers/exports are unchanged.
 */
export function snapshotReplayPresentation(source) {
  if (typeof source === 'string') {
    required(
      source.length <= MAX_REPLAY_PRESENTATION_BYTES &&
        encoder.encode(source).byteLength <= MAX_REPLAY_PRESENTATION_BYTES,
      'Replay presentation exceeds its aggregate byte budget.',
    );
    try {
      source = JSON.parse(source);
    } catch {
      throw new TypeError('Replay presentation must contain valid JSON.');
    }
  }
  const value = fields(source, ['format', 'execution', 'actorAppearancePin', 'replay']);
  required(
    [REPLAY_PRESENTATION_FORMAT, AUTHORED_REPLAY_PRESENTATION_FORMAT].includes(value.format),
    'Unsupported replay presentation format.',
  );
  required(
    plainObject(value.execution) &&
      plainObject(value.actorAppearancePin) &&
      plainObject(value.replay),
    'Replay presentation components must be objects, not embedded JSON strings.',
  );
  // Account for outer field names/delimiters as well as execution metadata. The
  // replay and pin each retain their independent budgets; neither borrows slack.
  const metadata = boundedJSON(
    { format: value.format, execution: value.execution, actorAppearancePin: null, replay: null },
    {
      maxBytes: REPLAY_PRESENTATION_METADATA_BYTES,
      maxNodes: 32,
      maxDepth: 3,
      maxArray: 0,
      maxString: 512,
    },
  );
  exactKeys(metadata.execution, ['campaignKey', 'sourcePackId'], 'replay execution');
  required(
    Object.hasOwn(metadata.execution, 'campaignKey') &&
      Object.hasOwn(metadata.execution, 'sourcePackId') &&
      typeof metadata.execution.campaignKey === 'string' &&
      metadata.execution.campaignKey.trim().length > 0 &&
      (metadata.execution.sourcePackId === null || stableId(metadata.execution.sourcePackId)),
    'Replay execution requires an exact campaign key and explicit source pack ID or null.',
  );
  const actorAppearancePin = snapshotActorAppearancePin(value.actorAppearancePin);
  required(
    actorAppearancePin.content.mode === 'solo' &&
      (value.format === REPLAY_PRESENTATION_FORMAT
        ? actorAppearancePin.style === 'fpv'
        : actorAppearancePin.style === 'campaign' &&
          !!actorAppearancePin.authoredPresentationSha256),
    'Replay presentation needs recorded Solo FPV actors or an exact authored actor receipt.',
  );
  // Reuse the replay module's semantic version, level, class, input, tick and
  // checkpoint validation. It deliberately does not replay/approve the outcome.
  const replay = snapshotReplay(value.replay);
  return freeze({
    format: metadata.format,
    execution: metadata.execution,
    actorAppearancePin,
    replay,
  });
}

/** Wrap an already exported raw recording without changing its simulation data.
 * Callers provide all three fields explicitly; no global preference is consulted.
 */
export function exportReplayPresentation(source) {
  const value = fields(source, ['execution', 'actorAppearancePin', 'replay']);
  const actorAppearancePin = snapshotActorAppearancePin(value.actorAppearancePin);
  return snapshotReplayPresentation({
    format: actorAppearancePin.authoredPresentationSha256
      ? AUTHORED_REPLAY_PRESENTATION_FORMAT
      : REPLAY_PRESENTATION_FORMAT,
    ...value,
    actorAppearancePin,
  });
}
