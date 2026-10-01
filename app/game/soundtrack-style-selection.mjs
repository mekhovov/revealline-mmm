import { boundedJSON, canonicalJSON, exactKeys, required } from './data-json.mjs';
import {
  PUBLIC_SOUNDTRACK_STYLE_IDS,
  matchesPublicSoundtrackStyle,
  localGenresForPublicStyles,
} from './soundtrack-style-taxonomy.mjs';
import { SOUNDTRACK_LIMITS } from './soundtrack.mjs';
import { onlineSoundtrackRecordingAllowed } from './online-soundtrack-catalogue.mjs';

export const SOUNDTRACK_STYLE_SELECTION_KEY = 'public-styles.v1';
export const SOUNDTRACK_STYLE_SELECTION_FORMAT = 'revealline-public-soundtrack-styles.v1';

/** Optional preferences live outside the historical exact-key library record. */
export function validateSoundtrackStyleSelection(source) {
  if (source === undefined || source === null) return null;
  const value = boundedJSON(source, {
    maxBytes: 1024,
    maxNodes: 20,
    maxArray: 10,
    maxDepth: 2,
    maxString: 64,
  });
  exactKeys(value, ['format', 'generation', 'styles'], 'Public soundtrack styles');
  required(
    value.format === SOUNDTRACK_STYLE_SELECTION_FORMAT &&
      Number.isSafeInteger(value.generation) &&
      value.generation >= 0 &&
      Array.isArray(value.styles) &&
      value.styles.length > 0 &&
      new Set(value.styles).size === value.styles.length &&
      value.styles.every((style) => PUBLIC_SOUNDTRACK_STYLE_IDS.includes(style)),
    'Invalid public soundtrack style selection.',
  );
  value.styles = PUBLIC_SOUNDTRACK_STYLE_IDS.filter((style) => value.styles.includes(style));
  return value;
}

export function soundtrackStyleSelection(styles, generation) {
  return validateSoundtrackStyleSelection({
    format: SOUNDTRACK_STYLE_SELECTION_FORMAT,
    generation,
    styles,
  });
}

export function sameSoundtrackListening(left, right) {
  return (
    canonicalJSON([left.listening ?? null, left.selection]) ===
    canonicalJSON([right.listening ?? null, right.selection])
  );
}

export function selectedPublicSoundtrackStyles(selection, current) {
  return selection?.generation === current.generation
    ? Object.freeze([...selection.styles])
    : undefined;
}

/** Share the public chooser's exact taxonomy, recording policy and queue bound. */
export function publicSoundtrackSelection(catalogue, styles, { recordingMode = false } = {}) {
  const selected = soundtrackStyleSelection(styles, 0).styles;
  const matches = catalogue.tracks.filter(
    (track) =>
      (!recordingMode || onlineSoundtrackRecordingAllowed(track)) &&
      selected.some((style) => matchesPublicSoundtrackStyle(track, style)),
  );
  return {
    tracks: matches.slice(0, SOUNDTRACK_LIMITS.onlineTracks),
    count: matches.length,
    mixWithLibrary: localGenresForPublicStyles(selected).length > 0,
  };
}
