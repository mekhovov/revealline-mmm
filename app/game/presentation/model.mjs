import { boundedJSON, canonicalJSON, exactKeys, required, stableId } from '../data-json.mjs';
import {
  decodePresentationDocument,
  encodePresentationDocument,
  ownPresentationDocument,
  PRESENTATION_METADATA_LIMITS,
} from './document-codec.mjs';

export const FORMATS = Object.freeze({
  bundle: 'revealline-theme-bundle.v1',
  theme: 'revealline-presentation-theme.v1',
  slot: 'revealline-asset-slot.v1',
  asset: 'revealline-asset-revision.v1',
  collection: 'revealline-asset-collection.v1',
  draft: 'revealline-presentation-draft.v1',
});
export const LIMITS = Object.freeze({
  // A complete produced collection and its immutable review successors must fit
  // together. This is separate from the existing player-media metadata quota.
  // fpv34 plus full-set review/replacement is 4,203,650 encoded bytes including
  // the portable asset table. Keep history instead of pruning accepted revisions.
  manifestBytes: 5 * 1024 * 1024,
  bundleBytes: 32 * 1024 * 1024,
  assetBytes: 4 * 1024 * 1024,
  slots: 512,
  // Logical history remains bounded separately from its lossless serialized form.
  // The 5 MiB metadata, 100k-node and 32 MiB transfer ceilings still apply.
  assets: PRESENTATION_METADATA_LIMITS.records,
  themes: 1024,
  collections: 128,
  imageSide: 1920,
  imagePixels: 2073600,
});
export const RECIPE_IDS = Object.freeze([
  'ui.panel.v1',
  'ui.button.v1',
  'ui.input.v1',
  'ui.icon.v1',
  'ui.meter.v1',
  'ui.focus.v1',
  'ui.cursor.v1',
  'scene.menu.v1',
  'scene.reveal.v1',
  'actor.player.v1',
  'actor.enemy.v1',
  'actor.rotors.v1',
  'terrain.tile.v1',
  'pickup.icon.v1',
  'team.anchor.v1',
  'team.core.v1',
  'team.support.v1',
  'team.emitter.v1',
  'team.rescue.v1',
  'team.pilot.v1',
  'team.enemy.v1',
  'team.outcome.v1',
  'trail.signal.v1',
  'effect.capture.v1',
  'effect.feedback.v1',
  'audio.ui.v1',
  'audio.music.v1',
  'font.handjet.v1',
  'font.exo2.v1',
  'font.ibm-plex-mono.v1',
]);
export const TOKEN_DEFAULTS = Object.freeze({
  ink: '#070b12',
  panel: '#101923',
  panelRaised: '#182531',
  text: '#f3f0db',
  muted: '#a5b2bb',
  line: '#425563',
  controlLine: '#647786',
  cyan: '#78dce8',
  amber: '#f4bf62',
  hazard: '#f07879',
  success: '#9dbb7a',
  field: '#070b12',
  grid: '#182631',
  sky: '#dfb781',
  land: '#687c55',
  fontDisplay: 'Handjet',
  fontUI: 'Exo 2',
  fontNumeric: 'IBM Plex Mono',
  textSize: 18,
  displaySize: 40,
  spaceUnit: 4,
  borderWidth: 2,
  cornerSize: 0,
  motionScale: 1,
});
const numericTokens = {
  textSize: [16, 32],
  displaySize: [32, 96],
  spaceUnit: [2, 8],
  borderWidth: [1, 4],
  cornerSize: [0, 16],
  motionScale: [0, 1],
};
const fontTokens = ['fontDisplay', 'fontUI', 'fontNumeric'];
const KINDS = ['image', 'font', 'audio', 'recipe'];
const STATES = ['default', 'hover', 'focus', 'pressed', 'selected', 'disabled', 'loading', 'error'];
const MIMES = {
  image: ['image/png', 'image/jpeg', 'image/webp'],
  font: ['font/ttf', 'font/otf', 'font/woff2'],
  audio: ['audio/wav', 'audio/ogg', 'audio/mpeg'],
};
const text = (v, max = 512) => typeof v === 'string' && v.trim().length > 0 && v.length <= max;
const integer = (v, max = 1000000) => Number.isSafeInteger(v) && v > 0 && v <= max;
const key = (v) => `${v.id}@${v.revision}`;
// Only this validator may confer trust, after ownership, schema, capacity and
// deep-freeze checks. Caller-owned frozen objects are not accepted identities.
const acceptedDocuments = new WeakSet();
export function freezePresentation(value) {
  if (value && typeof value === 'object') {
    for (const child of Object.values(value)) freezePresentation(child);
    Object.freeze(value);
  }
  return value;
}
function own(value) {
  return boundedJSON(value, {
    maxBytes: LIMITS.manifestBytes,
    maxNodes: PRESENTATION_METADATA_LIMITS.nodes,
    maxArray: 2048,
    maxDepth: 18,
    maxString: 8192,
  });
}
function fields(value, names, label) {
  const namesArray = names.split(' ');
  exactKeys(value, namesArray, label);
  required(
    namesArray.every((name) => Object.hasOwn(value, name)),
    `${label} is missing fields.`,
  );
}
function identity(value, format, label) {
  required(
    value.format === format && stableId(value.id) && integer(value.revision),
    `Invalid ${label} identity.`,
  );
}
function ref(value) {
  fields(value, 'id revision', 'asset reference');
  required(stableId(value.id) && integer(value.revision), 'Invalid revision reference.');
}
function list(value, max, check, label) {
  required(Array.isArray(value) && value.length <= max, `Invalid ${label} list.`);
  for (const entry of value) required(check(entry), `Invalid ${label} entry.`);
  required(new Set(value).size === value.length, `Duplicate ${label} entry.`);
}
function tokens(value) {
  exactKeys(value, Object.keys(TOKEN_DEFAULTS), 'tokens');
  for (const [name, entry] of Object.entries(value)) {
    if (numericTokens[name]) {
      const [min, max] = numericTokens[name];
      required(
        typeof entry === 'number' && Number.isFinite(entry) && entry >= min && entry <= max,
        `Invalid token ${name}.`,
      );
    } else if (fontTokens.includes(name)) {
      required(
        typeof entry === 'string' && /^[A-Za-z][A-Za-z0-9 -]{0,63}$/.test(entry),
        `Invalid font token ${name}.`,
      );
    } else
      required(
        typeof entry === 'string' && /^#[a-f0-9]{6}$/i.test(entry),
        `Invalid color token ${name}.`,
      );
  }
}
function bindings(value) {
  exactKeys(value, Object.keys(value), 'bindings');
  required(Object.keys(value).length <= LIMITS.slots, 'Too many bindings.');
  for (const [slot, target] of Object.entries(value)) {
    required(stableId(slot), 'Invalid slot ID.');
    ref(target);
  }
}
function point(value, label) {
  fields(value, 'x y', label);
  required(
    [value.x, value.y].every((n) => Number.isFinite(n) && n >= 0 && n <= 1),
    `Invalid ${label}.`,
  );
}
function rectangle(value, normalized, label) {
  fields(value, 'x y width height', label);
  required(
    [value.x, value.y, value.width, value.height].every(
      (n) => Number.isFinite(n) && (normalized || Number.isSafeInteger(n)),
    ),
    `Invalid ${label}.`,
  );
  required(
    value.x >= 0 && value.y >= 0 && value.width > 0 && value.height > 0,
    `Invalid ${label} bounds.`,
  );
  if (normalized)
    required(
      value.x + value.width <= 1 && value.y + value.height <= 1,
      `${label} exceeds the frame.`,
    );
}
function geometry(value, dimensions = null) {
  fields(value, 'frame pivot occupiedBounds rotorAnchors nineSlice', 'asset geometry');
  rectangle(value.frame, false, 'frame');
  required(
    value.frame.x + value.frame.width <= LIMITS.imageSide &&
      value.frame.y + value.frame.height <= LIMITS.imageSide,
    'Frame exceeds supported dimensions.',
  );
  if (dimensions)
    required(
      value.frame.x + value.frame.width <= dimensions.width &&
        value.frame.y + value.frame.height <= dimensions.height,
      'Frame exceeds image bounds.',
    );
  point(value.pivot, 'pivot');
  if (value.occupiedBounds !== null) rectangle(value.occupiedBounds, true, 'occupied bounds');
  required(
    Array.isArray(value.rotorAnchors) && value.rotorAnchors.length <= 8,
    'Invalid rotor anchor list.',
  );
  const centers = new Set();
  for (const anchor of value.rotorAnchors) {
    // Additive reader support only: absent motion fields retain historical
    // index-based animation. Extended anchors belong to new asset revisions;
    // older strict readers reject them and must not receive those revisions.
    exactKeys(anchor, ['x', 'y', 'radius', 'blades', 'direction', 'phaseDegrees'], 'rotor anchor');
    required(
      ['x', 'y', 'radius', 'blades'].every((name) => Object.hasOwn(anchor, name)),
      'rotor anchor is missing fields.',
    );
    if (Object.hasOwn(anchor, 'direction'))
      required([-1, 1].includes(anchor.direction), 'Invalid rotor direction.');
    if (Object.hasOwn(anchor, 'phaseDegrees'))
      required(
        Number.isFinite(anchor.phaseDegrees) &&
          anchor.phaseDegrees >= 0 &&
          anchor.phaseDegrees < 360,
        'Invalid rotor phase.',
      );
    required(
      [anchor.x, anchor.y, anchor.radius].every(Number.isFinite) &&
        anchor.radius > 0 &&
        anchor.radius <= 0.5 &&
        [2, 3, 4].includes(anchor.blades),
      'Invalid rotor anchor.',
    );
    required(
      anchor.x - anchor.radius >= 0 &&
        anchor.x + anchor.radius <= 1 &&
        anchor.y - anchor.radius >= 0 &&
        anchor.y + anchor.radius <= 1,
      'Rotor envelope exceeds its frame.',
    );
    const center = `${anchor.x},${anchor.y}`;
    required(!centers.has(center), 'Duplicate rotor anchor.');
    centers.add(center);
  }
  if (value.nineSlice !== null) {
    fields(value.nineSlice, 'left top right bottom', 'nine slice');
    required(
      Object.values(value.nineSlice).every((n) => Number.isSafeInteger(n) && n >= 0),
      'Invalid nine-slice border.',
    );
    required(
      value.nineSlice.left + value.nineSlice.right < value.frame.width &&
        value.nineSlice.top + value.nineSlice.bottom < value.frame.height,
      'Nine-slice borders leave no center.',
    );
  }
}
function owner(value) {
  if (value === null) return;
  fields(value, 'baseCampaignKey levelId levelRevision themeId', 'picture owner');
  required(
    text(value.baseCampaignKey, 512) &&
      stableId(value.levelId) &&
      text(value.levelRevision, 80) &&
      stableId(value.themeId),
    'Invalid picture owner.',
  );
}
function slotCheck(value) {
  fields(
    value,
    'format id revision label group screens kinds recipes required dimensions alpha sampling states requirements prompt budget palette geometry dependencies owner',
    'asset slot',
  );
  identity(value, FORMATS.slot, 'slot');
  required(
    text(value.label, 120) && stableId(value.group) && typeof value.required === 'boolean',
    'Invalid slot labels.',
  );
  list(value.screens, 64, stableId, 'screen');
  list(value.kinds, 4, (v) => KINDS.includes(v), 'kind');
  required(value.kinds.length > 0, 'Slot needs supported kinds.');
  list(value.recipes, RECIPE_IDS.length, (v) => RECIPE_IDS.includes(v), 'recipe');
  required(
    value.kinds.includes('recipe') || value.recipes.length === 0,
    'Recipe requires a recipe slot.',
  );
  if (value.dimensions !== null) {
    fields(value.dimensions, 'width height', 'slot dimensions');
    required(
      integer(value.dimensions.width, LIMITS.imageSide) &&
        integer(value.dimensions.height, LIMITS.imageSide),
      'Invalid slot dimensions.',
    );
  }
  required(['required', 'opaque', 'either'].includes(value.alpha), 'Invalid alpha policy.');
  required(['nearest', 'linear'].includes(value.sampling), 'Invalid sampling.');
  list(value.states, STATES.length, (v) => STATES.includes(v), 'state');
  list(value.requirements, 24, (v) => text(v, 512), 'requirement');
  required(text(value.prompt, 8192), 'Slot needs a copyable prompt.');
  fields(value.budget, 'maxBytes', 'slot byte budget');
  required(integer(value.budget.maxBytes, LIMITS.assetBytes), 'Invalid slot byte budget.');
  list(
    value.palette,
    32,
    (color) => typeof color === 'string' && /^#[a-f0-9]{6}$/i.test(color),
    'palette',
  );
  if (value.geometry !== null) geometry(value.geometry);
  required(
    value.dimensions === null ||
      (value.geometry !== null &&
        value.geometry.frame.width === value.dimensions.width &&
        value.geometry.frame.height === value.dimensions.height),
    'Slot geometry must match its frame dimensions.',
  );
  list(value.dependencies, 32, stableId, 'dependency');
  owner(value.owner);
}
function assetCheck(value) {
  fields(
    value,
    'format id revision kind description provenance file recipe geometry quality',
    'asset revision',
  );
  identity(value, FORMATS.asset, 'asset');
  required(
    KINDS.includes(value.kind) && text(value.description, 2048),
    'Invalid asset kind/description.',
  );
  fields(value.provenance, 'creator source license prompt parent', 'provenance');
  for (const name of ['creator', 'source', 'license'])
    required(text(value.provenance[name], 2048), `Missing provenance ${name}.`);
  required(
    typeof value.provenance.prompt === 'string' && value.provenance.prompt.length <= 8192,
    'Invalid effective prompt.',
  );
  if (value.provenance.parent !== null) ref(value.provenance.parent);
  fields(value.quality, 'stage evidence', 'asset quality');
  required(
    ['source', 'produced', 'reviewed'].includes(value.quality.stage),
    'Invalid asset quality stage.',
  );
  list(value.quality.evidence, 16, (v) => text(v, 2048), 'quality evidence');
  required(
    value.quality.stage !== 'reviewed' || value.quality.evidence.length > 0,
    'Reviewed assets require recorded evidence.',
  );
  if (value.kind === 'recipe') {
    required(value.file === null, 'Recipe assets cannot carry files.');
    fields(value.recipe, 'id', 'registered recipe');
    required(RECIPE_IDS.includes(value.recipe.id), 'Unregistered presentation recipe.');
    required(
      value.quality.stage !== 'produced',
      'A recipe fallback is not produced artwork; implemented components need explicit review evidence.',
    );
  } else {
    required(value.recipe === null, 'File assets cannot carry recipes.');
    fields(value.file, 'sha256 bytes mime width height', 'asset file');
    required(
      /^[a-f0-9]{64}$/.test(value.file.sha256) && integer(value.file.bytes, LIMITS.assetBytes),
      'Invalid file identity/budget.',
    );
    required(MIMES[value.kind].includes(value.file.mime), 'Unsupported asset MIME.');
    if (value.kind === 'image')
      required(
        integer(value.file.width, LIMITS.imageSide) &&
          integer(value.file.height, LIMITS.imageSide) &&
          value.file.width * value.file.height <= LIMITS.imagePixels,
        'Image exceeds dimensions.',
      );
    else
      required(
        value.file.width === null && value.file.height === null,
        'Only images have dimensions.',
      );
  }
  if (value.kind === 'image') geometry(value.geometry, value.file);
  else required(value.geometry === null, 'Only raster assets carry frame geometry.');
}
function themeCheck(value) {
  fields(value, 'format id revision name parent tokens bindings', 'theme');
  identity(value, FORMATS.theme, 'theme');
  required(text(value.name, 120), 'Invalid theme name.');
  if (value.parent !== null) ref(value.parent);
  tokens(value.tokens);
  bindings(value.bindings);
}
function collectionCheck(value) {
  fields(value, 'format id revision name themeId requiredSlots bindings', 'collection');
  identity(value, FORMATS.collection, 'collection');
  required(text(value.name, 120) && stableId(value.themeId), 'Invalid collection identity.');
  list(value.requiredSlots, LIMITS.slots, stableId, 'required slot');
  required(value.requiredSlots.length > 0, 'Collection must declare its complete required set.');
  bindings(value.bindings);
  required(
    value.requiredSlots.every((id) => Object.hasOwn(value.bindings, id)),
    'Collection is missing a required binding.',
  );
}
const standalone = (check) => (source) => {
  const value = own(source);
  check(value);
  return freezePresentation(value);
};
export const validateAssetSlotSpec = standalone(slotCheck);
export const validateAssetRevision = standalone(assetCheck);
export const validatePresentationTheme = standalone(themeCheck);
export const validateAssetCollection = standalone(collectionCheck);

function indexed(rows, check, max, label) {
  required(Array.isArray(rows) && rows.length <= max, `Too many ${label}.`);
  const byKey = new Map();
  for (const row of rows) {
    check(row);
    required(!byKey.has(key(row)), `Duplicate ${label} revision.`);
    byKey.set(key(row), row);
  }
  return byKey;
}
function tables(value) {
  const slots = new Map(value.slots.map((slot) => [slot.id, slot]));
  return {
    slots,
    assets: new Map(value.assets.map((a) => [key(a), a])),
    themes: new Map(value.themes.map((t) => [key(t), t])),
    collections: new Map(value.collections.map((c) => [key(c), c])),
  };
}
export function presentationGeometryControls(slot) {
  return Object.freeze({
    pivot: ['players', 'enemies', 'terrain', 'pickups'].includes(slot.group),
    rotors: ['players', 'enemies'].includes(slot.group),
    nineSlice: !!slot.geometry?.nineSlice,
  });
}
function checkBindings(rows, index) {
  for (const [id, target] of Object.entries(rows)) {
    const slot = index.slots.get(id),
      asset = index.assets.get(key(target));
    required(slot && asset, `Missing slot or asset reference: ${id}.`);
    required(slot.kinds.includes(asset.kind), `Wrong asset kind for ${id}.`);
    if (asset.kind === 'recipe')
      required(slot.recipes.includes(asset.recipe.id), `Wrong registered recipe for ${id}.`);
    if (asset.file)
      required(
        asset.file.bytes <= slot.budget.maxBytes,
        `Asset exceeds the slot byte budget: ${id}.`,
      );
    if (asset.kind === 'image') {
      const controls = presentationGeometryControls(slot);
      required(
        controls.pivot || (asset.geometry.pivot.x === 0.5 && asset.geometry.pivot.y === 0.5),
        `This slot uses a fixed centered pivot: ${id}.`,
      );
      required(
        controls.rotors || asset.geometry.rotorAnchors.length === 0,
        `Rotor anchors are not supported by this slot: ${id}.`,
      );
      required(
        controls.nineSlice || asset.geometry.nineSlice === null,
        `Nine-slice geometry is not supported by this slot: ${id}.`,
      );
      required(
        slot.alpha !== 'required' || asset.file.mime !== 'image/jpeg',
        `Transparent slot cannot use JPEG: ${id}.`,
      );
      if (slot.dimensions)
        required(
          asset.geometry.frame.width === slot.dimensions.width &&
            asset.geometry.frame.height === slot.dimensions.height,
          `Wrong image dimensions for ${id}.`,
        );
      if (slot.geometry?.nineSlice)
        required(asset.geometry.nineSlice !== null, `Missing nine-slice geometry for ${id}.`);
      if (slot.geometry?.rotorAnchors.length)
        required(
          asset.geometry.rotorAnchors.length === slot.geometry.rotorAnchors.length,
          `Wrong motor hub count for ${id}.`,
        );
    }
  }
}
function resolve(value, index, { themeId, collectionId, draft } = {}) {
  const newest = (rows, id) =>
    rows.filter((v) => v.id === id).sort((a, b) => b.revision - a.revision)[0];
  const theme = themeId
    ? newest(value.themes, themeId)
    : index.themes.get(key(value.selection.theme));
  required(theme, 'Selected theme is unavailable.');
  const chain = [],
    seen = new Set();
  let current = theme;
  while (current) {
    required(!seen.has(key(current)), 'Theme inheritance cycle.');
    seen.add(key(current));
    chain.unshift(current);
    current = current.parent === null ? null : index.themes.get(key(current.parent));
  }
  required(
    key(chain[0]) === key(value.selection.base),
    'Theme does not inherit the selected base.',
  );
  const resolvedTokens = {},
    resolvedBindings = {};
  for (const entry of chain) {
    Object.assign(resolvedTokens, entry.tokens);
    Object.assign(resolvedBindings, entry.bindings);
  }
  const chosen =
    collectionId === null
      ? null
      : collectionId
        ? newest(value.collections, collectionId)
        : value.selection.collection && index.collections.get(key(value.selection.collection));
  required(!collectionId || chosen, 'Selected collection is unavailable.');
  if (chosen) {
    required(chosen.themeId === theme.id, 'Collection belongs to a different theme.');
    Object.assign(resolvedBindings, chosen.bindings);
  }
  if (draft) {
    fields(draft, 'format baseRevision tokens bindings', 'presentation draft');
    required(
      draft.format === FORMATS.draft && draft.baseRevision === value.revision,
      'Stale presentation draft.',
    );
    tokens(draft.tokens);
    bindings(draft.bindings);
    checkBindings(draft.bindings, index);
    Object.assign(resolvedTokens, draft.tokens);
    Object.assign(resolvedBindings, draft.bindings);
  }
  required(
    Object.keys(TOKEN_DEFAULTS).every((id) => Object.hasOwn(resolvedTokens, id)),
    'Theme is missing required tokens.',
  );
  for (const slot of value.slots)
    required(
      !slot.required || Object.hasOwn(resolvedBindings, slot.id),
      `Missing required slot: ${slot.id}.`,
    );
  for (const id of Object.keys(resolvedBindings))
    for (const dependency of index.slots.get(id).dependencies)
      required(
        Object.hasOwn(resolvedBindings, dependency),
        `Missing selected dependency: ${dependency}.`,
      );
  const assets = {};
  for (const [id, target] of Object.entries(resolvedBindings))
    assets[id] = index.assets.get(key(target));
  return {
    theme: { id: theme.id, revision: theme.revision, name: theme.name },
    collection: chosen ? { id: chosen.id, revision: chosen.revision } : null,
    tokens: resolvedTokens,
    bindings: resolvedBindings,
    assets,
  };
}
export function validateThemeBundle(source, { previous = null, expectedRevision } = {}) {
  if (previous === null && expectedRevision === undefined && acceptedDocuments.has(source))
    return source;
  // Serialized inputs retain the legacy parse boundary. Callers holding an
  // envelope object must decode it before semantic validation; an ordinary
  // logical document receives its own explicit expanded accounting boundary.
  const value =
    typeof source === 'string'
      ? decodePresentationDocument(source)
      : ownPresentationDocument(source);
  fields(value, 'format id revision slots assets themes collections selection', 'theme bundle');
  identity(value, FORMATS.bundle, 'bundle');
  indexed(value.slots, slotCheck, LIMITS.slots, 'slots');
  required(
    value.slots.length > 0 && new Set(value.slots.map((s) => s.id)).size === value.slots.length,
    'Slots require unique stable IDs.',
  );
  indexed(value.assets, assetCheck, LIMITS.assets, 'assets');
  indexed(value.themes, themeCheck, LIMITS.themes, 'themes');
  indexed(value.collections, collectionCheck, LIMITS.collections, 'collections');
  fields(value.selection, 'base theme collection', 'selection');
  ref(value.selection.base);
  ref(value.selection.theme);
  if (value.selection.collection !== null) ref(value.selection.collection);
  const index = tables(value);
  const visitedSlots = new Set(),
    visitingSlots = new Set();
  const visitSlot = (id) => {
    required(index.slots.has(id), 'Missing slot dependency.');
    required(!visitingSlots.has(id), 'Slot dependency cycle.');
    if (visitedSlots.has(id)) return;
    visitingSlots.add(id);
    for (const dependency of index.slots.get(id).dependencies) visitSlot(dependency);
    visitingSlots.delete(id);
    visitedSlots.add(id);
  };
  for (const slot of value.slots) visitSlot(slot.id);
  required(
    index.themes.has(key(value.selection.base)) && index.themes.has(key(value.selection.theme)),
    'Missing selected base/theme.',
  );
  required(
    index.themes.get(key(value.selection.base)).parent === null,
    'Base theme cannot inherit another theme.',
  );
  required(
    value.selection.collection === null || index.collections.has(key(value.selection.collection)),
    'Missing selected collection.',
  );
  for (const theme of value.themes) {
    required(theme.parent === null || index.themes.has(key(theme.parent)), 'Missing parent theme.');
    checkBindings(theme.bindings, index);
    const seen = new Set();
    let at = theme;
    while (at) {
      required(!seen.has(key(at)), 'Theme inheritance cycle.');
      seen.add(key(at));
      at = at.parent === null ? null : index.themes.get(key(at.parent));
    }
  }
  for (const collection of value.collections) {
    required(
      value.themes.some((t) => t.id === collection.themeId),
      'Collection theme is missing.',
    );
    required(
      collection.requiredSlots.every((id) => index.slots.has(id)),
      'Collection slot is missing.',
    );
    checkBindings(collection.bindings, index);
  }
  for (const asset of value.assets) {
    const seen = new Set();
    let at = asset;
    while (at) {
      required(!seen.has(key(at)), 'Asset derivative cycle.');
      seen.add(key(at));
      const parent = at.provenance.parent;
      required(parent === null || index.assets.has(key(parent)), 'Missing derivative parent.');
      at = parent === null ? null : index.assets.get(key(parent));
    }
  }
  const fileFacts = new Map();
  for (const asset of value.assets.filter((a) => a.file)) {
    const old = fileFacts.get(asset.file.sha256);
    required(
      !old || canonicalJSON(old) === canonicalJSON(asset.file),
      'Conflicting facts for identical file hash.',
    );
    fileFacts.set(asset.file.sha256, asset.file);
  }
  if (previous) {
    const old = validateThemeBundle(previous);
    required(
      expectedRevision === undefined || expectedRevision === old.revision,
      'Stale expected revision.',
    );
    required(
      value.id === old.id && value.revision === old.revision + 1,
      'A transition must advance the same bundle exactly once.',
    );
    for (const field of ['slots', 'assets', 'themes', 'collections']) {
      const next = new Map(value[field].map((row) => [key(row), row]));
      for (const row of old[field])
        required(
          canonicalJSON(next.get(key(row))) === canonicalJSON(row),
          `Immutable ${field} history changed.`,
        );
      for (const row of value[field]) {
        if (old[field].some((prior) => key(prior) === key(row))) continue;
        const revisions = old[field]
          .filter((prior) => prior.id === row.id)
          .map((prior) => prior.revision);
        required(
          row.revision === (revisions.length ? Math.max(...revisions) + 1 : 1),
          `New ${field} revision must be the next revision.`,
        );
      }
    }
  } else if (expectedRevision !== undefined)
    required(value.revision === expectedRevision, 'Stale expected revision.');
  resolve(value, index);
  // An accepted edit must remain persistable/exportable. Structural validity
  // alone does not prove that the bounded dictionary representation fits.
  encodePresentationDocument(value);
  freezePresentation(value);
  acceptedDocuments.add(value);
  return value;
}
export function resolvePresentation(source, options = {}) {
  const value = validateThemeBundle(source);
  const safe = own(options);
  exactKeys(safe, ['themeId', 'collectionId', 'draft'], 'presentation selection');
  required(safe.themeId === undefined || stableId(safe.themeId), 'Invalid selected theme ID.');
  required(
    safe.collectionId === undefined || safe.collectionId === null || stableId(safe.collectionId),
    'Invalid selected collection ID.',
  );
  return freezePresentation(resolve(value, tables(value), safe));
}
export function presentationCoverage(source, options = {}) {
  const value = validateThemeBundle(source),
    resolved = resolvePresentation(value, options);
  const rows = value.slots.map((slot) => {
    const asset = resolved.assets[slot.id];
    return {
      slotId: slot.id,
      required: slot.required,
      owner: slot.owner,
      stage: asset?.quality.stage ?? 'missing',
      asset: asset ? { id: asset.id, revision: asset.revision } : null,
      evidence: asset?.quality.evidence ?? [],
    };
  });
  const counts = Object.fromEntries(
    ['missing', 'source', 'produced', 'reviewed'].map((stage) => [
      stage,
      rows.filter((row) => row.stage === stage).length,
    ]),
  );
  return freezePresentation({
    counts,
    rows,
    requiredReady: rows.filter((row) => row.required).every((row) => row.stage === 'reviewed'),
  });
}
/** A complete immutable successor, suitable for a compare-and-swap store. */
export function proposeDraft(source, draftSource, { expectedRevision } = {}) {
  const value = validateThemeBundle(source, { expectedRevision });
  const draft = own(draftSource);
  resolve(value, tables(value), { draft });
  const next = structuredClone(value),
    current = next.themes.find((t) => key(t) === key(next.selection.theme));
  const revision =
    Math.max(...next.themes.filter((t) => t.id === current.id).map((t) => t.revision)) + 1;
  next.themes.push({
    ...structuredClone(current),
    revision,
    tokens: { ...current.tokens, ...draft.tokens },
    bindings: { ...current.bindings, ...draft.bindings },
  });
  next.selection.theme = { id: current.id, revision };
  // Persist the final draft above any active collection, without altering that collection.
  if (next.selection.collection) {
    const collection = next.collections.find((c) => key(c) === key(next.selection.collection));
    Object.assign(next.themes.at(-1).bindings, collection.bindings, draft.bindings);
    next.selection.collection = null;
  }
  next.revision++;
  return validateThemeBundle(next, { previous: value, expectedRevision: value.revision });
}
