export const TEXT_FACES = Object.freeze(['pixel', 'plain']);
export const DEFAULT_TEXT_FACE = 'pixel';

// `pixel` is the historical preference value; the current label is Theme font.
// Theme defaults can evolve without reinterpreting old saves or loading fonts
// from a player preference. Plain also covers canvas feedback and counters.
const PLAIN_CANVAS_FONTS = Object.freeze({
  ui: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
  numeric: 'ui-monospace, "SFMono-Regular", Consolas, monospace',
});
const PIXEL_CANVAS_UI = "'Reveal Line Pixel', 'Field Kit UI', system-ui, sans-serif";

export function resolveTextFace(value) {
  if (!TEXT_FACES.includes(value)) throw new TypeError('Unsupported text style.');
  return value;
}

export function canvasTextFonts(face, themeFonts) {
  if (resolveTextFace(face) === 'plain') return PLAIN_CANVAS_FONTS;
  return Object.freeze({
    ...themeFonts,
    ui: PIXEL_CANVAS_UI,
    numeric: themeFonts?.numeric ?? "'Field Kit Mono', ui-monospace, monospace",
  });
}
