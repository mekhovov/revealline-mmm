import { exportJSONFile } from './platform.mjs';
import { validateTrack } from './ui/music.mjs';
import { ACTOR_RECIPE_IDS } from './ui/actor-recipes.mjs';
import { validateLevel, validateClassRecipes, CLASSES, TURN_POLICIES } from './core/index.mjs';
import { resolveMasteryContext } from './mastery-catalog.mjs';
import { t } from './i18n/index.mjs';

const plain = (v) =>
  v !== null &&
  typeof v === 'object' &&
  !Array.isArray(v) &&
  (Object.getPrototypeOf(v) === Object.prototype || Object.getPrototypeOf(v) === null);
const own = (v, k) => Object.hasOwn(v, k);
const stableId = (v) => typeof v === 'string' && /^[a-zA-Z0-9][a-zA-Z0-9._-]{0,79}$/.test(v);
const text = (v, max) => typeof v === 'string' && v.trim().length > 0 && v.length <= max;
export const VISUAL_ROLES = Object.freeze([
  'background',
  'player',
  'enemy',
  'patrol',
  'boss',
  'objective',
  'supply',
  'wall',
]);
// These roles belong only to the Classic transport; legacy role acceptance stays fixed.
export const CLASSIC_VISUAL_ROLES = Object.freeze([
  'contour',
  'rover',
  'eroder',
  'slowTerrain',
  'lethalTerrain',
  'lifePickup',
  'speedPickup',
  'slowPickup',
  'freezePickup',
]);
export const SCENARIO_VERSION = 'xonix-playground.v1';
export const MASTERY_SCENARIO_VERSION = 'xonix-playground.v2';
export const ENCOUNTER_SCENARIO_VERSION = 'xonix-playground.v3';
export const WIDE_SCENARIO_VERSION = 'xonix-playground.v4';
export const CLASSIC_SCENARIO_VERSION = 'xonix-playground.v5';
export const FOUNDATION_SCENARIO_VERSION = 'xonix-playground.v6';
export const RELAY_SCENARIO_VERSION = 'xonix-playground.v7';
export const DIRECTIONAL_SCENARIO_VERSION = 'xonix-playground.v8';
export const SENTINEL_SCENARIO_VERSION = 'xonix-playground.v9';

/** A preview uses the authored definition's campaign ID and this single map.
 * It is deliberately separate from any installed campaign or award authority.
 */
export function scenarioMasteryCampaign(scenario, classRecipes = CLASSES) {
  return {
    version: 'xonix-campaign.v1',
    id: scenario.masteryDefinition.campaignId,
    revision: '1',
    title: scenario.level.name.slice(0, 160),
    levels: [scenario.level],
    classRecipes: scenario.classRecipes ?? classRecipes,
  };
}
export const CONTENT_LIMITS = Object.freeze({
  maxImageBytes: 4 * 1024 * 1024,
  maxEncodedImageChars: 6 * 1024 * 1024,
  maxCombinedImageChars: 20 * 1024 * 1024,
  maxImagePixels: 16_000_000,
  maxImageSide: 8192,
  maxCombinedImagePixels: 32_000_000,
  maxMetadataChars: 16_384,
  maxContentChars: 65_536,
  maxClassBodies: 40,
});
const forbidden = new Set(['__proto__', 'prototype', 'constructor']);
const result = (errors, extra = {}) => ({
  valid: errors.length === 0,
  errors: [...new Set(errors)].slice(0, 40),
  ...extra,
});
const contentError = (key, values) => t(`errors:content.${key}`, values);
const keys = (value, allowed, path, errors) => {
  for (const key of Object.keys(value))
    if (!allowed.includes(key))
      errors.push(contentError('unsupportedField', { path: `${path}.${key}` }));
};

// Imported packs are JSON, not executable objects. Bound the walk before calling
// the kernel validators, which deliberately allow presentation metadata on levels.
function checkJSON(value, path = 'content') {
  const errors = [],
    ancestors = new Set();
  let nodes = 0,
    chars = 0,
    mediaChars = 0;
  function visit(item, where, depth) {
    if (errors.length >= 40) return;
    if (++nodes > 10_000) {
      errors.push(contentError('valueBudget'));
      return;
    }
    if (depth > 12) {
      errors.push(contentError('nestingBudget', { path: where }));
      return;
    }
    if (item === null || typeof item === 'boolean') return;
    if (typeof item === 'number') {
      if (!Number.isFinite(item)) errors.push(contentError('finiteNumber', { path: where }));
      return;
    }
    if (typeof item === 'string') {
      if (/^content\.visualOverrides\.[^.]+\.dataUrl$/.test(where)) {
        mediaChars += item.length;
        if (item.length > CONTENT_LIMITS.maxEncodedImageChars)
          errors.push(contentError('imageBudget', { path: where }));
      } else {
        chars += item.length;
        if (item.length > 4096) errors.push(contentError('textBudget', { path: where }));
      }
      return;
    }
    if (
      typeof item !== 'object' ||
      (Array.isArray(item) ? Object.getPrototypeOf(item) !== Array.prototype : !plain(item))
    ) {
      errors.push(contentError('plainJson', { path: where }));
      return;
    }
    if (ancestors.has(item)) {
      errors.push(contentError('cycle', { path: where }));
      return;
    }
    ancestors.add(item);
    const descriptors = Object.getOwnPropertyDescriptors(item),
      names = Object.keys(descriptors);
    if (Array.isArray(item) && item.length > 256) {
      errors.push(contentError('arrayBudget', { path: where }));
      ancestors.delete(item);
      return;
    }
    if (names.length > 257) {
      errors.push(contentError('fieldBudget', { path: where }));
      ancestors.delete(item);
      return;
    }
    if (Object.getOwnPropertySymbols(item).length)
      errors.push(contentError('symbolKeys', { path: where }));
    for (const key of names) {
      if (Array.isArray(item) && key === 'length') continue;
      const descriptor = descriptors[key];
      if (Array.isArray(item) && (!/^(0|[1-9]\d*)$/.test(key) || Number(key) >= item.length)) {
        errors.push(contentError('arrayProperties', { path: where }));
        continue;
      }
      if (forbidden.has(key)) {
        errors.push(contentError('forbiddenKey', { path: `${where}.${key}` }));
        continue;
      }
      if (!descriptor.enumerable || !own(descriptor, 'value')) {
        errors.push(contentError('ordinaryJson', { path: `${where}.${key}` }));
        continue;
      }
      if (key.length > 120) {
        errors.push(contentError('fieldNameBudget', { path: where }));
        continue;
      }
      chars += key.length;
      visit(descriptor.value, `${where}.${key}`, depth + 1);
    }
    if (Array.isArray(item) && names.length - 1 !== item.length)
      errors.push(contentError('sparseArray', { path: where }));
    ancestors.delete(item);
  }
  visit(value, path, 0);
  if (chars > CONTENT_LIMITS.maxContentChars) errors.push(contentError('combinedTextBudget'));
  if (mediaChars > CONTENT_LIMITS.maxCombinedImageChars)
    errors.push(contentError('combinedArtworkBudget'));
  return errors;
}
function metadata(value, path, errors) {
  if (!plain(value)) {
    errors.push(contentError('objectRequired', { path }));
    return;
  }
  const limits = {
    title: 160,
    description: 4096,
    author: 160,
    sourceUrl: 2048,
    license: 512,
    rightsStatus: 160,
  };
  keys(value, Object.keys(limits), path, errors);
  for (const [key, max] of Object.entries(limits))
    if (own(value, key) && !text(value[key], max))
      errors.push(contentError('boundedText', { path: `${path}.${key}`, max }));
  if (typeof value.sourceUrl === 'string')
    try {
      if (!['http:', 'https:'].includes(new URL(value.sourceUrl).protocol)) throw new Error();
    } catch {
      errors.push(contentError('httpUrl', { path: `${path}.sourceUrl` }));
    }
  if (JSON.stringify(value).length > CONTENT_LIMITS.maxMetadataChars)
    errors.push(contentError('metadataBudget', { path }));
}
function themeChecks(theme, errors) {
  if (!plain(theme)) {
    errors.push(contentError('objectRequired', { path: 'theme' }));
    return;
  }
  keys(
    theme,
    [
      'id',
      'name',
      'subtitle',
      'family',
      'player',
      'classBodies',
      'actorRecipes',
      'soundtrack',
      'coverColor',
      'scene',
      'enemyShape',
      'patrolShape',
      'bossShape',
      'palette',
      'labels',
      'metadata',
    ],
    'theme',
    errors,
  );
  for (const key of ['id', 'family', 'player'])
    if (!stableId(theme[key]) || forbidden.has(theme[key]))
      errors.push(contentError('stableIdentifier', { path: `theme.${key}` }));
  if (own(theme, 'classBodies')) {
    if (!plain(theme.classBodies)) errors.push(contentError('classBodiesMapping'));
    else {
      if (Object.keys(theme.classBodies).length > CONTENT_LIMITS.maxClassBodies)
        errors.push(contentError('classBodiesBudget', { max: CONTENT_LIMITS.maxClassBodies }));
      for (const [classId, bodyId] of Object.entries(theme.classBodies)) {
        if (!stableId(classId) || forbidden.has(classId))
          errors.push(contentError('stableClassIds'));
        if (!stableId(bodyId) || forbidden.has(bodyId))
          errors.push(contentError('stableBodyPresetId', { path: `theme.classBodies.${classId}` }));
      }
    }
  }
  for (const key of ['name', 'subtitle'])
    if (!text(theme[key], 120))
      errors.push(contentError('boundedText', { path: `theme.${key}`, max: 120 }));
  if (own(theme, 'soundtrack')) {
    const checked = validateTrack(theme.soundtrack);
    if (!checked.valid) errors.push(...checked.errors.map((error) => `theme.soundtrack: ${error}`));
  }
  if (own(theme, 'coverColor') && !/^#[0-9a-f]{6}$/i.test(theme.coverColor))
    errors.push('theme.coverColor must be #rrggbb');
  if (own(theme, 'actorRecipes')) {
    const roles = [
      'bouncer',
      'border-patrol',
      'contour-patrol',
      'claimed-rover',
      'eroder',
      'lane-boss',
      'relay-sentinel',
    ];
    if (!plain(theme.actorRecipes))
      errors.push('theme.actorRecipes must be a registered role mapping');
    else {
      keys(theme.actorRecipes, roles, 'theme.actorRecipes', errors);
      for (const recipe of Object.values(theme.actorRecipes))
        if (!ACTOR_RECIPE_IDS.includes(recipe))
          errors.push('theme.actorRecipes contains an unregistered recipe');
    }
  }

  if (!['dawn', 'heritage', 'arcade', 'network'].includes(theme.scene))
    errors.push(contentError('registeredValue', { path: 'theme.scene' }));
  for (const role of ['enemyShape', 'patrolShape', 'bossShape'])
    if (
      !['tank', 'drone', 'radar', 'moth', 'spark', 'orb', 'cube', 'flower', 'core'].includes(
        theme[role],
      )
    )
      errors.push(contentError('registeredValue', { path: `theme.${role}` }));
  const paletteKeys = [
    'ink',
    'paper',
    'muted',
    'accent',
    'safe',
    'danger',
    'field',
    'grid',
    'sky',
    'land',
  ];
  if (!plain(theme.palette)) errors.push(contentError('objectRequired', { path: 'theme.palette' }));
  else {
    keys(theme.palette, paletteKeys, 'theme.palette', errors);
    for (const key of paletteKeys)
      if (typeof theme.palette[key] !== 'string' || !/^#[0-9a-f]{6}$/i.test(theme.palette[key]))
        errors.push(contentError('hexColor', { path: `theme.palette.${key}` }));
  }
  const labelKeys = ['objective', 'supply', 'enemy', 'boss', 'currency', 'ability'];
  if (!plain(theme.labels)) errors.push(contentError('objectRequired', { path: 'theme.labels' }));
  else {
    keys(theme.labels, labelKeys, 'theme.labels', errors);
    for (const key of labelKeys)
      if (!text(theme.labels[key], 60))
        errors.push(contentError('boundedText', { path: `theme.labels.${key}`, max: 60 }));
  }
  if (own(theme, 'metadata')) metadata(theme.metadata, 'theme.metadata', errors);
}
export function validateTheme(theme) {
  const errors = checkJSON(theme, 'theme');
  if (!errors.length) themeChecks(theme, errors);
  return result(errors);
}

/** Presentation recommendation only. The caller must check registered presets and
 * cosmetic ownership; this function never grants unlocks or changes a class recipe.
 * Unregistered pack IDs remain valid references for the caller's neutral fallback.
 */
export function recommendedBody(theme, classId, fallback = theme?.player || 'neutral-marker') {
  const mapping = theme?.classBodies;
  const value =
    plain(mapping) && stableId(classId) && !forbidden.has(classId) && own(mapping, classId)
      ? mapping[classId]
      : null;
  if (stableId(value) && !forbidden.has(value)) return value;
  return stableId(fallback) && !forbidden.has(fallback) ? fallback : 'neutral-marker';
}

const u16be = (b, p) => (b[p] << 8) | b[p + 1];
const u16le = (b, p) => b[p] | (b[p + 1] << 8);
const u24le = (b, p) => b[p] | (b[p + 1] << 8) | (b[p + 2] << 16);
const u32be = (b, p) => (b[p] * 0x1000000 + b[p + 1] * 0x10000 + b[p + 2] * 0x100 + b[p + 3]) >>> 0;
const u32le = (b, p) => (b[p] + b[p + 1] * 0x100 + b[p + 2] * 0x10000 + b[p + 3] * 0x1000000) >>> 0;
const ascii = (b, p, n) => String.fromCharCode(...b.subarray(p, p + n));
function pngSize(bytes) {
  if (
    bytes.length < 45 ||
    ascii(bytes, 0, 8) !== '\x89PNG\r\n\x1a\n' ||
    u32be(bytes, 8) !== 13 ||
    ascii(bytes, 12, 4) !== 'IHDR'
  )
    throw new Error(contentError('image.pngSignature'));
  const size = { width: u32be(bytes, 16), height: u32be(bytes, 20) };
  let p = 8,
    data = false,
    end = false;
  while (p + 12 <= bytes.length) {
    const length = u32be(bytes, p),
      kind = ascii(bytes, p + 4, 4);
    if (p + 12 + length > bytes.length) throw new Error(contentError('image.pngChunkTruncated'));
    if (kind === 'IHDR' && p !== 8) throw new Error(contentError('image.pngRepeatedHeader'));
    if (kind === 'acTL') throw new Error(contentError('image.pngAnimatedUnsupported'));
    if (kind === 'IDAT') data = true;
    p += 12 + length;
    if (kind === 'IEND') {
      end = true;
      break;
    }
  }
  if (!data || !end || p !== bytes.length) throw new Error(contentError('image.pngIncomplete'));
  return size;
}
function jpegSize(bytes) {
  if (bytes[0] !== 0xff || bytes[1] !== 0xd8) throw new Error(contentError('image.jpegSignature'));
  let p = 2,
    size = null;
  while (p < bytes.length) {
    if (bytes[p++] !== 0xff) throw new Error(contentError('image.jpegMarker'));
    while (bytes[p] === 0xff) p++;
    const marker = bytes[p++];
    if (marker === 0xd9) break;
    if (marker === 0x01 || (marker >= 0xd0 && marker <= 0xd7)) continue;
    if (p + 2 > bytes.length) throw new Error(contentError('image.jpegSegmentTruncated'));
    const length = u16be(bytes, p);
    if (length < 2 || p + length > bytes.length)
      throw new Error(contentError('image.jpegSegmentTruncated'));
    if (
      [0xc0, 0xc1, 0xc2, 0xc3, 0xc5, 0xc6, 0xc7, 0xc9, 0xca, 0xcb, 0xcd, 0xce, 0xcf].includes(
        marker,
      )
    ) {
      if (length < 8 || size) throw new Error(contentError('image.jpegFrameHeader'));
      size = { height: u16be(bytes, p + 3), width: u16be(bytes, p + 5) };
    }
    if (marker === 0xda) break;
    p += length;
  }
  if (!size) throw new Error(contentError('image.jpegDimensionsMissing'));
  return size;
}
function webpSize(bytes) {
  if (
    bytes.length < 20 ||
    ascii(bytes, 0, 4) !== 'RIFF' ||
    ascii(bytes, 8, 4) !== 'WEBP' ||
    u32le(bytes, 4) + 8 !== bytes.length
  )
    throw new Error(contentError('image.webpContainer'));
  let p = 12,
    canvas = null,
    frame = null;
  while (p + 8 <= bytes.length) {
    const kind = ascii(bytes, p, 4),
      length = u32le(bytes, p + 4),
      start = p + 8,
      end = start + length;
    if (end > bytes.length) throw new Error(contentError('image.webpChunkTruncated'));
    if (kind === 'VP8X') {
      if (length !== 10 || canvas) throw new Error(contentError('image.webpCanvasHeader'));
      if (bytes[start] & 2) throw new Error(contentError('image.webpAnimatedUnsupported'));
      canvas = { width: 1 + u24le(bytes, start + 4), height: 1 + u24le(bytes, start + 7) };
    }
    if (kind === 'VP8 ') {
      if (frame || length < 10 || ascii(bytes, start + 3, 3) !== '\x9d\x01\x2a')
        throw new Error(contentError('image.webpFrameHeader'));
      frame = { width: u16le(bytes, start + 6) & 0x3fff, height: u16le(bytes, start + 8) & 0x3fff };
    }
    if (kind === 'VP8L') {
      if (frame || length < 5 || bytes[start] !== 0x2f)
        throw new Error(contentError('image.webpLosslessHeader'));
      const bits = u32le(bytes, start + 1);
      frame = { width: 1 + (bits & 0x3fff), height: 1 + ((bits >>> 14) & 0x3fff) };
    }
    if (kind === 'ANIM' || kind === 'ANMF')
      throw new Error(contentError('image.webpAnimatedUnsupported'));
    p = end + (length % 2);
  }
  if (p !== bytes.length || !frame) throw new Error(contentError('image.webpFrameMissing'));
  if (canvas && (canvas.width !== frame.width || canvas.height !== frame.height))
    throw new Error(contentError('image.webpDimensionsDisagree'));
  return frame;
}
/** Read bounded media headers before allocating an Image. This is not a decoder:
 * callers must still await successful browser decoding before replacing a valid asset.
 * Original bytes are never converted or rewritten. No SVG, URL, script or animation.
 */
export function inspectImageDataUrl(dataUrl) {
  const errors = [];
  let mime, width, height, byteLength;
  if (typeof dataUrl !== 'string' || dataUrl.length > CONTENT_LIMITS.maxEncodedImageChars)
    return result([contentError('image.encodedBudgetOrType')]);
  const match = /^data:image\/(png|jpeg|webp);base64,/.exec(dataUrl);
  if (!match) return result([contentError('image.embeddedDataUrlRequired')]);
  mime = `image/${match[1]}`;
  const encoded = dataUrl.slice(match[0].length);
  if (!encoded.length || encoded.length % 4 !== 0 || !/^[A-Za-z0-9+/]*={0,2}$/.test(encoded))
    return result([contentError('image.malformedBase64')]);
  byteLength =
    (encoded.length / 4) * 3 - (encoded.endsWith('==') ? 2 : encoded.endsWith('=') ? 1 : 0);
  if (byteLength > CONTENT_LIMITS.maxImageBytes)
    return result([contentError('image.originalByteBudget')]);
  try {
    const binary = atob(encoded),
      bytes = Uint8Array.from(binary, (c) => c.charCodeAt(0)),
      size =
        match[1] === 'png'
          ? pngSize(bytes)
          : match[1] === 'jpeg'
            ? jpegSize(bytes)
            : webpSize(bytes);
    ({ width, height } = size);
    if (
      !width ||
      !height ||
      width > CONTENT_LIMITS.maxImageSide ||
      height > CONTENT_LIMITS.maxImageSide ||
      width * height > CONTENT_LIMITS.maxImagePixels
    )
      errors.push(contentError('image.dimensionBudget'));
  } catch (error) {
    errors.push(error.message || contentError('image.headerUnreadable'));
  }
  return result(errors, { mime, width, height, byteLength });
}
export function validateScenario(value, { classRecipes: defaultRecipes = CLASSES } = {}) {
  const errors = checkJSON(value),
    warnings = [];
  if (errors.length) return result(errors, { warnings });
  if (
    !plain(value) ||
    ![
      SCENARIO_VERSION,
      MASTERY_SCENARIO_VERSION,
      ENCOUNTER_SCENARIO_VERSION,
      WIDE_SCENARIO_VERSION,
      CLASSIC_SCENARIO_VERSION,
      FOUNDATION_SCENARIO_VERSION,
      RELAY_SCENARIO_VERSION,
      DIRECTIONAL_SCENARIO_VERSION,
      SENTINEL_SCENARIO_VERSION,
    ].includes(value.format)
  )
    return result([contentError('scenario.supportedFormat')], {
      warnings,
    });
  const sentinel = value.format === SENTINEL_SCENARIO_VERSION;
  const directional = value.format === DIRECTIONAL_SCENARIO_VERSION || sentinel;
  const relays = value.format === RELAY_SCENARIO_VERSION || directional;
  const foundations = value.format === FOUNDATION_SCENARIO_VERSION || relays;
  const classic = value.format === CLASSIC_SCENARIO_VERSION || foundations;
  const wide = value.format === WIDE_SCENARIO_VERSION;
  const hasEncounter = value.format === ENCOUNTER_SCENARIO_VERSION;
  const hasMastery = value.format === MASTERY_SCENARIO_VERSION || hasEncounter || wide || classic;
  keys(
    value,
    [
      'format',
      'level',
      'theme',
      'settings',
      'classRecipes',
      'visualOverrides',
      'presentation',
      'metadata',
      'music',
      ...(hasMastery ? ['masteryDefinition'] : []),
    ],
    'scenario',
    errors,
  );
  errors.push(...validateLevel(value.level).errors);
  if (
    plain(value.level) &&
    value.level.version !==
      (sentinel
        ? 'xonix-level.v8'
        : directional
          ? 'xonix-level.v7'
          : relays
            ? 'xonix-level.v6'
            : foundations
              ? 'xonix-level.v5'
              : classic
                ? 'xonix-level.v4'
                : wide
                  ? 'xonix-level.v3'
                  : hasEncounter
                    ? 'xonix-level.v2'
                    : 'xonix-level.v1')
  )
    errors.push(contentError('scenario.simulationVersionMatch'));
  themeChecks(value.theme, errors);
  if (plain(value.level)) {
    if (!text(value.level.name, 280))
      errors.push(contentError('boundedText', { path: 'level.name', max: 280 }));
    if (!text(value.level.revision, 80))
      errors.push(contentError('boundedText', { path: 'level.revision', max: 80 }));
    if (own(value.level, 'metadata')) metadata(value.level.metadata, 'level.metadata', errors);
  }
  const recipes = own(value, 'classRecipes') ? value.classRecipes : defaultRecipes;
  const recipeJSON = checkJSON(recipes, 'classRecipes');
  errors.push(...recipeJSON);
  if (!recipeJSON.length) {
    errors.push(...validateClassRecipes(recipes).errors);
    if (Array.isArray(recipes))
      for (const c of recipes)
        if (plain(c))
          for (const [key, max] of [
            ['label', 80],
            ['description', 600],
            ['revision', 80],
          ])
            if (!text(c[key], max))
              errors.push(contentError('boundedText', { path: `classRecipes.${key}`, max }));
  }
  if (!plain(value.settings)) errors.push(contentError('objectRequired', { path: 'settings' }));
  else {
    keys(value.settings, ['classId', 'turnPolicy', 'seed'], 'settings', errors);
    if (
      recipeJSON.length ||
      !Array.isArray(recipes) ||
      !recipes.some((c) => plain(c) && c.id === value.settings.classId)
    )
      errors.push(contentError('registeredValue', { path: 'settings.classId' }));
    if (!TURN_POLICIES.includes(value.settings.turnPolicy))
      errors.push(contentError('registeredValue', { path: 'settings.turnPolicy' }));
    if (
      !Number.isInteger(value.settings.seed) ||
      value.settings.seed < 0 ||
      value.settings.seed > 0xffffffff
    )
      errors.push(contentError('uint32', { path: 'settings.seed' }));
  }
  if (own(value, 'presentation')) {
    if (!plain(value.presentation))
      errors.push(contentError('objectRequired', { path: 'presentation' }));
    else {
      keys(value.presentation, ['style', 'showGrid'], 'presentation', errors);
      if (!['microtile', 'props', 'hybrid'].includes(value.presentation.style))
        errors.push(
          contentError('oneOf', { path: 'presentation.style', values: 'microtile, props, hybrid' }),
        );
      if (typeof value.presentation.showGrid !== 'boolean')
        errors.push(contentError('booleanRequired', { path: 'presentation.showGrid' }));
    }
  }
  if (own(value, 'metadata')) metadata(value.metadata, 'scenario.metadata', errors);
  if (own(value, 'music'))
    errors.push(
      ...validateTrack(value.music).errors.map((error) =>
        contentError('sectionError', { section: 'music', error }),
      ),
    );
  if (hasMastery) {
    if (!own(value, 'masteryDefinition')) errors.push(contentError('scenario.masteryRequired'));
    else if ((hasEncounter || wide || classic) && value.masteryDefinition !== null)
      errors.push(
        classic
          ? contentError('scenario.classicMasteryUnsupported')
          : wide
            ? contentError('scenario.wideMasteryUnsupported')
            : contentError('scenario.encounterMasteryUnsupported'),
      );
    else if (value.masteryDefinition !== null && !errors.length) {
      try {
        resolveMasteryContext({
          campaign: scenarioMasteryCampaign(value, recipes),
          definition: value.masteryDefinition,
        });
      } catch (error) {
        errors.push(
          contentError('sectionError', { section: 'masteryDefinition', error: error.message }),
        );
      }
    }
  }
  if (!plain(value.visualOverrides))
    errors.push(contentError('objectRequired', { path: 'visualOverrides' }));
  else {
    let totalPixels = 0;
    for (const [role, item] of Object.entries(value.visualOverrides)) {
      if (!VISUAL_ROLES.includes(role) && !(classic && CLASSIC_VISUAL_ROLES.includes(role))) {
        errors.push(contentError('registeredValue', { path: `visualOverrides.${role}` }));
        continue;
      }
      if (!plain(item)) {
        errors.push(contentError('imageDescriptor', { path: role }));
        continue;
      }
      keys(item, ['dataUrl', 'name', 'fit', 'metadata'], role, errors);
      if (own(item, 'name') && !text(item.name, 240))
        errors.push(contentError('boundedText', { path: `${role}.name`, max: 240 }));
      if (own(item, 'fit') && !['contain', 'cover'].includes(item.fit))
        errors.push(contentError('oneOf', { path: `${role}.fit`, values: 'contain, cover' }));
      if (own(item, 'metadata')) metadata(item.metadata, `${role}.metadata`, errors);
      const inspected = inspectImageDataUrl(item.dataUrl);
      errors.push(
        ...inspected.errors.map((error) => contentError('sectionError', { section: role, error })),
      );
      if (inspected.valid) totalPixels += inspected.width * inspected.height;
    }
    if (totalPixels > CONTENT_LIMITS.maxCombinedImagePixels)
      errors.push(contentError('scenario.combinedDecodedArtworkBudget'));
    if (own(value.visualOverrides, 'player'))
      warnings.push(contentError('scenario.playerArtworkAnchorsWarning'));
  }
  return result(errors, { warnings });
}
export function downloadJSON(value, name) {
  return exportJSONFile(value, name);
}
