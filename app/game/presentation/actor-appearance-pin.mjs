import { boundedJSON, canonicalJSON, exactKeys, required, stableId } from '../data-json.mjs';
import { snapshotVisualThemeContext } from './visual-theme-catalogue.mjs';
import { ACTOR_STYLES } from './actor-style-policy.mjs';

export const ACTOR_APPEARANCE_PIN_FORMAT = 'revealline-actor-appearance-pin.v1';
export const AUTHORED_ACTOR_APPEARANCE_PIN_FORMAT = 'revealline-actor-appearance-pin.v2';
export const ACTOR_APPEARANCE_RENDERER_POLICY = 'actor-style.v1';
export const ACTOR_APPEARANCE_PIN_BYTES = 8192;

function fields(value, names, label) {
  exactKeys(value, names, label);
  required(
    names.every((name) => Object.hasOwn(value, name)),
    `${label} is incomplete.`,
  );
}
function reference(value) {
  fields(value, ['id', 'revision'], 'actor presentation reference');
  required(
    stableId(value.id) &&
      Number.isSafeInteger(value.revision) &&
      value.revision > 0 &&
      value.revision <= 1000000,
    'Retain an exact actor presentation revision.',
  );
  return Object.freeze(value);
}

/** Structural metadata only. This does not approve a source, authenticate its
 * content, verify manifest bytes, decode sprites or prove a usable lease.
 * Campaign style preserves the authored path and declares no additional source.
 */
export function snapshotActorAppearancePin(source) {
  const value = boundedJSON(source, {
    maxBytes: ACTOR_APPEARANCE_PIN_BYTES,
    maxNodes: 2048,
    maxDepth: 12,
    maxArray: 64,
    maxString: 512,
  });
  fields(
    value,
    [
      'format',
      'style',
      'rendererPolicy',
      'content',
      'presentation',
      ...(value.format === AUTHORED_ACTOR_APPEARANCE_PIN_FORMAT
        ? ['authoredPresentationSha256']
        : []),
    ],
    'actor appearance pin',
  );
  required(
    [ACTOR_APPEARANCE_PIN_FORMAT, AUTHORED_ACTOR_APPEARANCE_PIN_FORMAT].includes(value.format),
    'Unsupported actor appearance pin.',
  );
  required(ACTOR_STYLES.includes(value.style), 'Unsupported retained actor style.');
  required(
    value.rendererPolicy === ACTOR_APPEARANCE_RENDERER_POLICY,
    'Unsupported actor renderer policy.',
  );
  value.content = snapshotVisualThemeContext(value.content);
  if (value.format === AUTHORED_ACTOR_APPEARANCE_PIN_FORMAT)
    required(
      value.style === 'campaign' &&
        typeof value.authoredPresentationSha256 === 'string' &&
        /^[a-f0-9]{64}$/.test(value.authoredPresentationSha256),
      'Authored actors need an exact presentation receipt.',
    );
  if (value.style === 'campaign') {
    required(
      value.presentation === null,
      'Campaign actors must preserve the authored presentation.',
    );
  } else {
    fields(value.presentation, ['source', 'theme', 'collection', 'sha256'], 'actor presentation');
    reference(value.presentation.source);
    reference(value.presentation.theme);
    if (value.presentation.collection !== null) reference(value.presentation.collection);
    required(
      typeof value.presentation.sha256 === 'string' &&
        /^[a-f0-9]{64}$/.test(value.presentation.sha256),
      'Retain the exact actor presentation manifest hash.',
    );
    Object.freeze(value.presentation);
  }
  return Object.freeze(value);
}

/** The caller supplies its already accepted content identity. Comparison alone
 * grants neither source approval nor asset readiness and never changes owners.
 */
export function validateActorAppearancePinForContent(source, actualContent) {
  const pin = snapshotActorAppearancePin(source);
  const actual = snapshotVisualThemeContext(actualContent);
  required(
    canonicalJSON(pin.content) === canonicalJSON(actual),
    'Retained actors belong to different accepted content.',
  );
  return pin;
}
