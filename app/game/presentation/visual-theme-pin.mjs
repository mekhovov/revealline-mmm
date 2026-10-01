import { boundedJSON, canonicalJSON, exactKeys, required, stableId } from '../data-json.mjs';
import { snapshotVisualThemeContext } from './visual-theme-catalogue.mjs';

export const VISUAL_THEME_PIN_FORMAT = 'revealline-visual-theme-pin.v1';
const fields = (value, names, label) => {
  exactKeys(value, names, label);
  required(
    names.every((name) => Object.hasOwn(value, name)),
    `${label} is incomplete.`,
  );
};
const reference = (value) => {
  fields(value, ['id', 'revision'], 'retained visual reference');
  required(
    stableId(value.id) &&
      Number.isSafeInteger(value.revision) &&
      value.revision > 0 &&
      value.revision <= 1000000,
    'Retain an exact visual revision.',
  );
  return Object.freeze(value);
};

/** A portable exact compiled-presentation reference, not a picture/story pin,
 * stored attempt, authenticated collection or proof of decoded asset readiness.
 * Every restore must reverify bytes and accepted content through its real owners.
 */
export function snapshotVisualThemePin(source) {
  const value = boundedJSON(source, {
    maxBytes: 16384,
    maxNodes: 2048,
    maxDepth: 12,
    maxArray: 64,
    maxString: 512,
  });
  fields(value, ['format', 'content', 'selection', 'presentation'], 'visual theme pin');
  required(value.format === VISUAL_THEME_PIN_FORMAT, 'Unsupported visual theme pin.');
  value.content = snapshotVisualThemeContext(value.content);
  value.selection = reference(value.selection);
  fields(value.presentation, ['source', 'theme', 'collection', 'sha256'], 'retained presentation');
  reference(value.presentation.source);
  reference(value.presentation.theme);
  if (value.presentation.collection !== null) reference(value.presentation.collection);
  required(
    typeof value.presentation.sha256 === 'string' &&
      /^[a-f0-9]{64}$/.test(value.presentation.sha256),
    'Retain the exact compiled manifest hash.',
  );
  Object.freeze(value.presentation);
  return Object.freeze(value);
}

/** Retry and restore use the actual accepted authored context, including mode.
 * Difficulty adapters already return the original visual identity. This never
 * rewrites a run/execution key or authorizes a different mission under the pin.
 */
export function validateVisualThemePinForContent(source, actualContent) {
  const pin = snapshotVisualThemePin(source);
  const actual = snapshotVisualThemeContext(actualContent);
  required(
    canonicalJSON(pin.content) === canonicalJSON(actual),
    'Retained visuals belong to different accepted content.',
  );
  return pin;
}
