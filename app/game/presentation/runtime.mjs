import { boundedJSON, required } from '../data-json.mjs';
import { createPresentationDOMOwner } from './dom-ownership.mjs';
import { freezePresentation, resolvePresentation, validateAssetRevision } from './model.mjs';

const cssFonts = {
  fontDisplay: 'Field Kit Display',
  fontUI: 'Field Kit UI',
  fontNumeric: 'Field Kit Mono',
};
const fontAliases = {
  Handjet: 'Field Kit Display',
  'Exo 2': 'Field Kit UI',
  'IBM Plex Mono': 'Field Kit Mono',
};
const colorNames = {
  ink: 'bg',
  panel: 'panel',
  panelRaised: 'panel-raised',
  text: 'text',
  muted: 'muted',
  line: 'line',
  controlLine: 'control-line',
  cyan: 'cyan',
  amber: 'amber',
  hazard: 'hazard',
  success: 'success',
};
/** Match the role weights to the shipped WOFF2 faces instead of synthesizing
 * bold text. A file shared by roles declares their combined CSS weight range. */
export function presentationFontDescriptors(resolved, hash) {
  const weights = [];
  for (const [slot, range] of [
    ['font.display', [600]],
    ['font.ui', [400, 600]],
    ['font.numeric', [500]],
  ])
    if (resolved.assets?.[slot]?.file?.sha256 === hash) weights.push(...range);
  required(weights.length > 0, 'Font is not bound to a presentation role.');
  const min = Math.min(...weights),
    max = Math.max(...weights);
  return Object.freeze({
    weight: min === max ? String(min) : `${min} ${max}`,
    style: 'normal',
    display: 'swap',
  });
}
/** Consumes only a resolver output. Tokens are revalidated via the same closed
 * token schema by callers using resolvePresentation; this adapter checks values
 * again before touching DOM style APIs. No arbitrary CSS strings are accepted. */
export function presentationCSSVariables(resolved) {
  const tokens = boundedJSON(resolved.tokens, { maxBytes: 8192, maxNodes: 64 });
  const variables = {};
  for (const [name, css] of Object.entries(colorNames)) {
    required(
      typeof tokens[name] === 'string' && /^#[0-9a-f]{6}$/i.test(tokens[name]),
      `Invalid CSS color: ${name}.`,
    );
    variables[`--fk-${css}`] = tokens[name];
  }
  for (const [name, family] of Object.entries(cssFonts)) {
    required(
      typeof tokens[name] === 'string' && /^[A-Za-z][A-Za-z0-9 -]{0,63}$/.test(tokens[name]),
      `Invalid CSS font: ${name}.`,
    );
    const slot =
      name === 'fontDisplay' ? 'font.display' : name === 'fontUI' ? 'font.ui' : 'font.numeric';
    const font = resolved.assets?.[slot];
    const selected =
      font?.kind === 'font' && /^[a-f0-9]{64}$/.test(font.file.sha256)
        ? `RLAsset-${font.file.sha256}`
        : (fontAliases[tokens[name]] ?? tokens[name] ?? family);
    const numeric = resolved.assets?.['font.numeric'];
    const symbolFamily =
      numeric?.kind === 'font' && /^[a-f0-9]{64}$/.test(numeric.file.sha256)
        ? `RLAsset-${numeric.file.sha256}`
        : 'Field Kit Mono';
    const families = [
      ...new Set([selected, ...(name === 'fontUI' ? [symbolFamily, 'Field Kit Mono'] : [])]),
    ];
    variables[
      `--fk-font-${name === 'fontDisplay' ? 'display' : name === 'fontUI' ? 'ui' : 'mono'}`
    ] =
      `${families.map((value) => `'${value}'`).join(', ')}, ${name === 'fontUI' ? 'sans-serif' : 'monospace'}`;
  }
  for (const [name, min, max] of [
    ['textSize', 16, 32],
    ['displaySize', 32, 96],
    ['spaceUnit', 2, 8],
    ['borderWidth', 1, 4],
    ['cornerSize', 0, 16],
    ['motionScale', 0, 1],
  ])
    required(
      Number.isFinite(tokens[name]) && tokens[name] >= min && tokens[name] <= max,
      `Invalid CSS magnitude: ${name}.`,
    );
  variables['--fk-text-body'] = `${tokens.textSize}px`;
  variables['--fk-text-control'] = `${Math.max(16, tokens.textSize - 2)}px`;
  variables['--fk-text-secondary'] = `${Math.max(14, tokens.textSize - 4)}px`;
  variables['--fk-text-display'] = `${tokens.displaySize}px`;
  variables['--fk-text-counter'] = `${tokens.textSize + 8}px`;
  variables['--fk-border-width'] = `${tokens.borderWidth}px`;
  variables['--fk-corner'] = `${tokens.cornerSize}px`;
  for (let i = 1; i <= 8; i++) variables[`--fk-space-${i}`] = `${tokens.spaceUnit * i}px`;
  variables['--fk-motion-fast'] = `${tokens.motionScale * 100}ms`;
  variables['--fk-motion-normal'] = `${tokens.motionScale * 180}ms`;
  Object.assign(variables, {
    '--paper': tokens.ink,
    '--ink': tokens.text,
    '--muted': tokens.muted,
    '--line': tokens.line,
    '--accent': tokens.amber,
    '--safe': tokens.cyan,
    '--danger': tokens.hazard,
  });
  return freezePresentation(variables);
}
/** Renderer vocabulary only; no level, ruleset, replay or player-profile data. */
export function canvasPresentation(resolved) {
  const t = resolved.tokens;
  presentationCSSVariables(resolved);
  const palette = {
    ink: t.text,
    paper: t.ink,
    muted: t.muted,
    accent: t.amber,
    safe: t.cyan,
    danger: t.hazard,
    field: t.field,
    grid: t.grid,
    sky: t.sky,
    land: t.land,
  };
  for (const color of Object.values(palette))
    required(/^#[a-f0-9]{6}$/i.test(color), 'Invalid canvas palette.');
  return freezePresentation({
    themeId: resolved.theme.id,
    presentationRevision: resolved.theme.revision,
    palette,
    motionScale: t.motionScale,
    assets: resolved.assets,
  });
}
/** Compute the complete result before mutating style. Returned cleanup restores
 * only values still owned by this application, preserving later changes. */
export function applyPresentation(element, resolved) {
  required(
    element?.style && typeof element.style.setProperty === 'function',
    'A styled element is required.',
  );
  const owner = createPresentationDOMOwner();
  try {
    for (const [name, value] of Object.entries(presentationCSSVariables(resolved)))
      owner.style(element, name, value);
    return owner.release;
  } catch (error) {
    owner.release();
    throw error;
  }
}

export function preparePresentation(source, options) {
  const resolved = resolvePresentation(source, options);
  return Object.freeze({
    resolved,
    css: presentationCSSVariables(resolved),
    canvas: canvasPresentation(resolved),
  });
}
/** Convert normalized frame-local authoring coordinates into the center-relative
 * rotor convention used by the existing character renderer. This does not adopt
 * a rig into game presets or change a player's physics radius. */
export function imagePresentation(source) {
  const asset = validateAssetRevision(source);
  required(asset.kind === 'image', 'Image presentation requires raster artwork.');
  const g = asset.geometry;
  return freezePresentation({
    frame: g.frame,
    pivot: g.pivot,
    occupiedBounds: g.occupiedBounds,
    nineSlice: g.nineSlice,
    rotors: g.rotorAnchors.map((anchor, i) => ({
      x: anchor.x - g.pivot.x,
      y: anchor.y - g.pivot.y,
      radiusScale: anchor.radius / 0.16,
      direction: anchor.direction ?? (i % 2 ? -1 : 1),
      phaseDegrees: anchor.phaseDegrees ?? i * 23,
      bladeCount: anchor.blades,
    })),
  });
}
