import { t } from '../i18n/index.mjs';
import { CLASSES, validateLevel } from '../core/index.mjs';
import { geometryForLevel } from '../core/geometry.mjs';
import { versionsForLevel } from '../core/versions.mjs';
import { normalizedLevel } from '../core/level.mjs';
import { boundedJSON, required } from '../data-json.mjs';
import { prepareScenario } from '../imports.mjs';
import {
  validateScenario,
  MASTERY_SCENARIO_VERSION,
  ENCOUNTER_SCENARIO_VERSION,
  WIDE_SCENARIO_VERSION,
  CLASSIC_SCENARIO_VERSION,
  FOUNDATION_SCENARIO_VERSION,
  RELAY_SCENARIO_VERSION,
  DIRECTIONAL_SCENARIO_VERSION,
  SENTINEL_SCENARIO_VERSION,
  CLASSIC_VISUAL_ROLES,
} from '../content.mjs';
import { createMasteryCatalog } from '../mastery-catalog.mjs';
import {
  preparePack,
  installPack,
  importPackLibrary,
  resolvePackCampaign,
  PACK_LIMITS,
  validatePack,
  MASTERY_PACK_VERSION,
  ENCOUNTER_PACK_VERSION,
  WIDE_PACK_VERSION,
  CLASSIC_PACK_VERSION,
  FOUNDATION_PACK_VERSION,
  RELAY_PACK_VERSION,
  DIRECTIONAL_PACK_VERSION,
  SENTINEL_PACK_VERSION,
} from '../packs.mjs';

export function expansionEntries(library) {
  return library.packs.flatMap((pack) =>
    pack.campaigns.map((source) => ({
      ...resolvePackCampaign(pack, source.id),
      key: `${pack.id}/${source.id}`,
      label: `${pack.name} / ${source.title}`,
      pack,
    })),
  );
}
export function editorScenario(scenario) {
  const current = structuredClone(scenario);
  for (const key of ['walls', 'enemies', 'objectives', 'supplies', 'signalZones'])
    current.level[key] ??= [];
  current.presentation ??= { style: 'hybrid', showGrid: false };
  return current;
}
/** Only explicit whole-level replacements discard bindings unavailable in the new edition. */
export function visualsForLevelReplacement(current, format) {
  return Object.fromEntries(
    Object.entries(current.visualOverrides).filter(([role]) =>
      ![
        CLASSIC_SCENARIO_VERSION,
        FOUNDATION_SCENARIO_VERSION,
        RELAY_SCENARIO_VERSION,
        DIRECTIONAL_SCENARIO_VERSION,
        SENTINEL_SCENARIO_VERSION,
      ].includes(current.format) ||
      [
        CLASSIC_SCENARIO_VERSION,
        FOUNDATION_SCENARIO_VERSION,
        RELAY_SCENARIO_VERSION,
        DIRECTIONAL_SCENARIO_VERSION,
        SENTINEL_SCENARIO_VERSION,
      ].includes(format)
        ? true
        : !CLASSIC_VISUAL_ROLES.includes(role),
    ),
  );
}
/** Choose an explicit authored preview; null deliberately disables shipped fallback. */
export function withScenarioMastery(current, definition) {
  const candidate = {
    ...current,
    format:
      current.format === SENTINEL_SCENARIO_VERSION
        ? SENTINEL_SCENARIO_VERSION
        : current.format === DIRECTIONAL_SCENARIO_VERSION
          ? DIRECTIONAL_SCENARIO_VERSION
          : current.format === RELAY_SCENARIO_VERSION
            ? RELAY_SCENARIO_VERSION
            : current.format === FOUNDATION_SCENARIO_VERSION
              ? FOUNDATION_SCENARIO_VERSION
              : current.format === CLASSIC_SCENARIO_VERSION
                ? CLASSIC_SCENARIO_VERSION
                : current.format === WIDE_SCENARIO_VERSION
                  ? WIDE_SCENARIO_VERSION
                  : current.format === ENCOUNTER_SCENARIO_VERSION
                    ? ENCOUNTER_SCENARIO_VERSION
                    : MASTERY_SCENARIO_VERSION,
    masteryDefinition: structuredClone(definition),
  };
  const checked = validateScenario(candidate);
  required(checked.valid, checked.errors.join('; '));
  return editorScenario(candidate);
}
/** Encounter edits replace one bounded recipe; references are validated together. */
export function withScenarioEncounter(current, descriptor) {
  const candidate = {
    ...current,
    format:
      current.format === SENTINEL_SCENARIO_VERSION
        ? SENTINEL_SCENARIO_VERSION
        : current.format === DIRECTIONAL_SCENARIO_VERSION
          ? DIRECTIONAL_SCENARIO_VERSION
          : current.format === RELAY_SCENARIO_VERSION
            ? RELAY_SCENARIO_VERSION
            : current.format === FOUNDATION_SCENARIO_VERSION
              ? FOUNDATION_SCENARIO_VERSION
              : current.format === CLASSIC_SCENARIO_VERSION
                ? CLASSIC_SCENARIO_VERSION
                : current.format === WIDE_SCENARIO_VERSION
                  ? WIDE_SCENARIO_VERSION
                  : ENCOUNTER_SCENARIO_VERSION,
    masteryDefinition: null,
    level: {
      ...current.level,
      version:
        current.format === SENTINEL_SCENARIO_VERSION
          ? 'xonix-level.v8'
          : current.format === DIRECTIONAL_SCENARIO_VERSION
            ? 'xonix-level.v7'
            : current.format === RELAY_SCENARIO_VERSION
              ? 'xonix-level.v6'
              : current.format === FOUNDATION_SCENARIO_VERSION
                ? 'xonix-level.v5'
                : current.format === CLASSIC_SCENARIO_VERSION
                  ? 'xonix-level.v4'
                  : current.format === WIDE_SCENARIO_VERSION
                    ? 'xonix-level.v3'
                    : 'xonix-level.v2',
      encounter: structuredClone(descriptor),
    },
  };
  const checked = validateScenario(candidate);
  required(checked.valid, checked.errors.join('; '));
  return editorScenario(candidate);
}
/** Explicit conversion keeps the picture/objectives but removes the staged enemy. */
export function withoutScenarioEncounter(current) {
  required(current.level.encounter, t('tools:thisMapHasNoStagedEncounter'));
  const level = structuredClone(current.level);
  level.enemies = level.enemies.filter((enemy) => enemy.id !== level.encounter.enemyId);
  const wide = [
    WIDE_SCENARIO_VERSION,
    CLASSIC_SCENARIO_VERSION,
    FOUNDATION_SCENARIO_VERSION,
    RELAY_SCENARIO_VERSION,
    DIRECTIONAL_SCENARIO_VERSION,
    SENTINEL_SCENARIO_VERSION,
  ].includes(current.format);
  if (wide) level.encounter = null;
  else {
    delete level.encounter;
    level.version = 'xonix-level.v1';
  }
  return editScenario(current, {
    format: wide ? current.format : MASTERY_SCENARIO_VERSION,
    masteryDefinition: null,
    level,
  });
}
/** Validate the complete candidate before the editor records Undo or adopts a map edit. */
export function editScenario(current, changes) {
  const candidate = { ...current, ...changes };
  const checked = validateScenario(candidate);
  required(checked.valid, checked.errors.join('; '));
  return editorScenario(candidate);
}
export function entryMastery(entry, levelId) {
  const registrations = createMasteryCatalog([
    {
      campaign: {
        ...entry.campaign,
        classRecipes: entry.classRecipes ?? entry.campaign.classRecipes ?? CLASSES,
      },
      sourcePackId: entry.sourcePackId ?? null,
      ...(entry.sourcePackFormat
        ? { sourcePackFormat: entry.sourcePackFormat, masteries: entry.masteries }
        : {}),
    },
  ]).registrations;
  return registrations.find((registration) => registration.levelId === levelId)?.definition ?? null;
}
export function entryScenario(
  entry,
  levelId = entry.campaign.levels[0].id,
  settings = {},
  presentation,
) {
  const level = entry.campaign.levels.find((item) => item.id === levelId);
  required(level, t('tools:chooseAMapFromThisCampaign'));
  const classRecipes = entry.classRecipes ?? entry.campaign.classRecipes ?? CLASSES;
  const theme =
    entry.themes.find((item) => item.id === (level.themeId ?? entry.campaign.themeId)) ??
    entry.themes[0];
  const current = {
    format:
      level.version === 'xonix-level.v8'
        ? SENTINEL_SCENARIO_VERSION
        : level.version === 'xonix-level.v7'
          ? DIRECTIONAL_SCENARIO_VERSION
          : level.version === 'xonix-level.v6'
            ? RELAY_SCENARIO_VERSION
            : level.version === 'xonix-level.v5'
              ? FOUNDATION_SCENARIO_VERSION
              : level.version === 'xonix-level.v4'
                ? CLASSIC_SCENARIO_VERSION
                : level.version === 'xonix-level.v3'
                  ? WIDE_SCENARIO_VERSION
                  : entry.sourcePackFormat === ENCOUNTER_PACK_VERSION
                    ? ENCOUNTER_SCENARIO_VERSION
                    : entry.sourcePackFormat === MASTERY_PACK_VERSION
                      ? MASTERY_SCENARIO_VERSION
                      : 'xonix-playground.v1',
    ...([
      'xonix-level.v3',
      'xonix-level.v4',
      'xonix-level.v5',
      'xonix-level.v6',
      'xonix-level.v7',
      'xonix-level.v8',
    ].includes(level.version) ||
    [
      MASTERY_PACK_VERSION,
      ENCOUNTER_PACK_VERSION,
      WIDE_PACK_VERSION,
      CLASSIC_PACK_VERSION,
      FOUNDATION_PACK_VERSION,
      RELAY_PACK_VERSION,
      DIRECTIONAL_PACK_VERSION,
      SENTINEL_PACK_VERSION,
    ].includes(entry.sourcePackFormat)
      ? {
          masteryDefinition:
            entry.masteries?.find((definition) => definition.levelId === levelId) ?? null,
        }
      : {}),
    level,
    theme,
    classRecipes,
    settings: {
      classId: classRecipes.some((c) => c.id === settings.classId)
        ? settings.classId
        : classRecipes[0].id,
      turnPolicy: settings.turnPolicy ?? 'immediate',
      seed: settings.seed ?? 1,
    },
    visualOverrides: {
      ...entry.visualOverrides,
      ...(entry.levelVisuals?.find((item) => item.levelId === levelId)?.visualOverrides ?? {}),
    },
    ...(presentation ? { presentation } : {}),
  };
  const music =
    entry.music?.find((track) => track.id === (level.musicId ?? entry.campaign.musicId)) ??
    entry.music?.[0];
  if (music) current.music = structuredClone(music);
  const check = validateScenario(current);
  required(check.valid, check.errors.join('; '));
  return editorScenario(current);
}
/** Returns a complete prepared replacement; callers adopt only after stale-job checks. */
export async function prepareDocument(candidate, { current, packLibrary, decodeImage } = {}) {
  const value = boundedJSON(candidate, {
    maxBytes: PACK_LIMITS.libraryBytes,
    maxNodes: 160000,
    maxDepth: 18,
    maxArray: 4096,
    maxString: 6 * 1024 * 1024,
  });
  required(
    value && typeof value === 'object' && !Array.isArray(value),
    t('tools:chooseAScenarioMapExpansionOrLibraryJsonObject'),
  );
  if (
    [
      'xonix-pack.v1',
      MASTERY_PACK_VERSION,
      ENCOUNTER_PACK_VERSION,
      WIDE_PACK_VERSION,
      CLASSIC_PACK_VERSION,
      FOUNDATION_PACK_VERSION,
      RELAY_PACK_VERSION,
      DIRECTIONAL_PACK_VERSION,
      SENTINEL_PACK_VERSION,
      'xonix-pack-library.v1',
    ].includes(value.format)
  ) {
    let nextLibrary,
      selectedId,
      warnings = [];
    if (value.format !== 'xonix-pack-library.v1') {
      const prepared = await preparePack(value, {
        library: packLibrary,
        ...(decodeImage ? { decodeImage } : {}),
      });
      nextLibrary = installPack(packLibrary, prepared.pack);
      selectedId = prepared.pack.id;
      warnings = prepared.warnings;
    } else {
      nextLibrary = await importPackLibrary(value, { ...(decodeImage ? { decodeImage } : {}) });
      selectedId = nextLibrary.packs[0]?.id;
      required(selectedId, t('tools:theExpansionLibraryHasNoCampaignsToEdit'));
    }
    const entries = expansionEntries(nextLibrary),
      entry = entries.find((item) => item.sourcePackId === selectedId);
    return {
      kind: 'expansion',
      packLibrary: nextLibrary,
      entries,
      activeKey: entry.key,
      scenario: entryScenario(entry, undefined, current?.settings, current?.presentation),
      warnings,
    };
  }
  const candidateScenario =
    value.version === 'xonix-level.v8'
      ? { ...current, format: SENTINEL_SCENARIO_VERSION, masteryDefinition: null, level: value }
      : value.version === 'xonix-level.v7'
        ? {
            ...current,
            format: DIRECTIONAL_SCENARIO_VERSION,
            masteryDefinition: null,
            level: value,
          }
        : value.version === 'xonix-level.v6'
          ? { ...current, format: RELAY_SCENARIO_VERSION, masteryDefinition: null, level: value }
          : value.version === 'xonix-level.v5'
            ? {
                ...current,
                format: FOUNDATION_SCENARIO_VERSION,
                masteryDefinition: null,
                level: value,
              }
            : value.version === 'xonix-level.v4'
              ? {
                  ...current,
                  format: CLASSIC_SCENARIO_VERSION,
                  masteryDefinition: null,
                  level: value,
                }
              : value.version === 'xonix-level.v3'
                ? {
                    ...current,
                    format: WIDE_SCENARIO_VERSION,
                    masteryDefinition: null,
                    level: value,
                  }
                : value.version === 'xonix-level.v2'
                  ? {
                      ...current,
                      format: ENCOUNTER_SCENARIO_VERSION,
                      masteryDefinition: null,
                      level: value,
                    }
                  : value.version === 'xonix-level.v1'
                    ? {
                        ...current,
                        ...([
                          ENCOUNTER_SCENARIO_VERSION,
                          WIDE_SCENARIO_VERSION,
                          CLASSIC_SCENARIO_VERSION,
                          FOUNDATION_SCENARIO_VERSION,
                          RELAY_SCENARIO_VERSION,
                          DIRECTIONAL_SCENARIO_VERSION,
                          SENTINEL_SCENARIO_VERSION,
                        ].includes(current?.format)
                          ? { format: MASTERY_SCENARIO_VERSION, masteryDefinition: null }
                          : {}),
                        level: value,
                      }
                    : value;
  if (['xonix-level.v1', 'xonix-level.v2', 'xonix-level.v3'].includes(value.version))
    candidateScenario.visualOverrides = visualsForLevelReplacement(
      current,
      candidateScenario.format,
    );
  const prepared = await prepareScenario(candidateScenario, {
    ...(decodeImage ? { decodeImage } : {}),
  });
  return {
    kind: 'scenario',
    scenario: editorScenario(prepared.scenario),
    warnings: prepared.warnings,
  };
}
const allActors = (level) =>
  ['enemies', 'objectives', 'supplies', 'signalZones', 'hangars'].flatMap(
    (key) => level[key] ?? [],
  );
const uid = (prefix, list) => {
  let n = 1;
  while (list.some((x) => x.id === `${prefix}-${n}`)) n++;
  return `${prefix}-${n}`;
};
export function paintLevel(
  source,
  brush,
  x,
  y,
  { signalWidth = 8, signalHeight = 6, speedFactor = 0.5 } = {},
) {
  const { width, height } = geometryForLevel(source);
  required(
    Number.isInteger(x) && x >= 0 && x < width && Number.isInteger(y) && y >= 0 && y < height,
    t('tools:paintCoordinatesMustLieOnTheBoard'),
  );
  const level = structuredClone(source),
    inside = x > 0 && x < width - 1 && y > 0 && y < height - 1;
  for (const key of ['walls', 'enemies', 'objectives', 'supplies', 'signalZones'])
    level[key] ??= [];
  if (brush === 'wall' && inside) level.walls.push({ x, y, w: 1, h: 1 });
  else if (brush === 'enemy' && inside)
    level.enemies.push({
      id: uid('enemy', allActors(level)),
      type: 'bouncer',
      x: x + 0.5,
      y: y + 0.5,
      vx: 2.5,
      vy: 2,
      radius: 0.25,
    });
  else if (brush === 'objective' && inside)
    level.objectives.push({
      id: uid('objective', allActors(level)),
      x: x + 0.5,
      y: y + 0.5,
      required: true,
      hidden: false,
    });
  else if (brush === 'supply')
    level.supplies.push({
      id: uid('supply', allActors(level)),
      x: x + 0.5,
      y: y + 0.5,
      radius: 1.5,
    });
  else if (
    brush === 'spawn' &&
    (!inside ||
      ['xonix-level.v5', 'xonix-level.v6', 'xonix-level.v7', 'xonix-level.v8'].includes(
        level.version,
      ))
  )
    level.spawn = { x: x + 0.5, y: y + 0.5 };
  else if (brush === 'signal' && inside)
    level.signalZones.push({
      id: uid('signal', allActors(level)),
      x,
      y,
      w: Math.min(signalWidth, width - 1 - x),
      h: Math.min(signalHeight, height - 1 - y),
      speedFactor,
      disableBoost: true,
      lockAbility: true,
    });
  else if (brush === 'hangar') {
    level.hangars ??= normalizedLevel(source).hangars;
    level.hangars.push({ id: uid('hangar', allActors(level)), x: x + 0.5, y: y + 0.5, radius: 2 });
  } else if (brush === 'erase') {
    level.walls = level.walls.filter(
      (w) => !(x >= w.x && x < w.x + w.w && y >= w.y && y < w.y + w.h),
    );
    level.signalZones = level.signalZones.filter(
      (w) => !(x >= w.x && x < w.x + w.w && y >= w.y && y < w.y + w.h),
    );
    for (const key of ['enemies', 'objectives', 'supplies'])
      level[key] = level[key].filter((o) => Math.floor(o.x) !== x || Math.floor(o.y) !== y);
    const hangars = level.hangars ?? normalizedLevel(source).hangars;
    if (hangars.some((o) => Math.floor(o.x) === x && Math.floor(o.y) === y))
      level.hangars = hangars.filter((o) => Math.floor(o.x) !== x || Math.floor(o.y) !== y);
  } else throw new Error(t('tools:placeThisToolInItsValidAreaWallsSignalsAnd'));
  const check = validateLevel(level);
  required(check.valid, check.errors.join('; '));
  return level;
}
export const PRESET_HELP = Object.freeze({
  fiber:
    'Fly down through the striped signal zone. Compare Fiber relay with Scout: fiber keeps speed, boost and scanning; its live cable still risks enemy contact. The home hangar lets you change equipment.',
  bomber:
    'At the home pad, Pick up a charge. Fly down about one cell, then use Ability to stun the nearby enemy. Compare empty and loaded runs; return to a safe hangar to change class.',
  impact:
    'Fly down about one cell, then use Ability. The close pulse stuns the nearby enemy and cancels your cut before redeploying at home. Lives stay intact; territory is not awarded for the pulse.',
});
export function interactionPreset(kind, current, classRecipes = CLASSES) {
  required(Object.hasOwn(PRESET_HELP, kind), t('tools:unknownInteractionPreset'));
  required(
    classRecipes.some((c) => c.id === kind),
    t('tools:thisRegisteredClassIsUnavailable'),
  );
  const scenario = structuredClone(current),
    close = kind !== 'fiber';
  if (
    [
      MASTERY_SCENARIO_VERSION,
      ENCOUNTER_SCENARIO_VERSION,
      WIDE_SCENARIO_VERSION,
      CLASSIC_SCENARIO_VERSION,
      FOUNDATION_SCENARIO_VERSION,
      RELAY_SCENARIO_VERSION,
      DIRECTIONAL_SCENARIO_VERSION,
      SENTINEL_SCENARIO_VERSION,
    ].includes(scenario.format)
  ) {
    scenario.format = MASTERY_SCENARIO_VERSION;
    scenario.masteryDefinition = null;
  }
  scenario.visualOverrides = visualsForLevelReplacement(current, scenario.format);
  scenario.level = {
    version: 'xonix-level.v1',
    id: `workshop-${kind}`,
    revision: '1',
    name: { fiber: 'Signal crossing', bomber: 'Supply and stun', impact: 'Pulse and return' }[kind],
    width: 48,
    height: 36,
    spawn: { x: 24.5, y: 0.5 },
    walls: [],
    enemies: [
      ...(close
        ? [{ id: 'close-enemy', type: 'bouncer', x: 24.5, y: 4.5, vx: 0, vy: 0, radius: 0.25 }]
        : []),
      { id: 'roamer', type: 'bouncer', x: 40.5, y: 24.5, vx: 1, vy: 1, radius: 0.25 },
    ],
    objectives:
      kind === 'fiber'
        ? [{ id: 'hidden-relay', x: 8.5, y: 8.5, hidden: true, required: false }]
        : [],
    supplies: [{ id: 'home-supply', x: 24.5, y: 0.5, radius: 2 }],
    hangars: [{ id: 'home-hangar', x: 24.5, y: 0.5, radius: 2 }],
    signalZones:
      kind === 'fiber'
        ? [
            {
              id: 'signal-band',
              x: 20,
              y: 2,
              w: 9,
              h: 20,
              speedFactor: 0.4,
              disableBoost: true,
              lockAbility: true,
            },
          ]
        : [],
    goal: { coverage: 0.45 },
    rules: {
      lives: 3,
      moveSpeed: 6,
      timeLimitSeconds: 0,
      cutTimeLimitSeconds: 0,
      maxTrailCells: 0,
    },
  };
  scenario.classRecipes = structuredClone(classRecipes);
  scenario.settings.classId = kind;
  const check = validateScenario(scenario);
  required(check.valid, check.errors.join('; '));
  return editorScenario(scenario);
}
/** Export the current scenario as a new self-contained expansion with one map. */
export function expansionFromScenario(
  current,
  {
    id = `workshop-${current.level.id}`.slice(0, 80),
    name = current.level.name.slice(0, 120),
    music = current.music ? [current.music] : [],
  } = {},
) {
  const level = structuredClone(current.level);
  delete level.themeId;
  delete level.musicId;
  const pack = {
    format:
      current.format === SENTINEL_SCENARIO_VERSION
        ? SENTINEL_PACK_VERSION
        : current.format === DIRECTIONAL_SCENARIO_VERSION
          ? DIRECTIONAL_PACK_VERSION
          : current.format === RELAY_SCENARIO_VERSION
            ? RELAY_PACK_VERSION
            : current.format === FOUNDATION_SCENARIO_VERSION
              ? FOUNDATION_PACK_VERSION
              : current.format === CLASSIC_SCENARIO_VERSION
                ? CLASSIC_PACK_VERSION
                : current.format === WIDE_SCENARIO_VERSION
                  ? WIDE_PACK_VERSION
                  : current.format === ENCOUNTER_SCENARIO_VERSION
                    ? ENCOUNTER_PACK_VERSION
                    : current.format === MASTERY_SCENARIO_VERSION
                      ? MASTERY_PACK_VERSION
                      : 'xonix-pack.v1',
    ...([
      MASTERY_SCENARIO_VERSION,
      ENCOUNTER_SCENARIO_VERSION,
      WIDE_SCENARIO_VERSION,
      CLASSIC_SCENARIO_VERSION,
      FOUNDATION_SCENARIO_VERSION,
      RELAY_SCENARIO_VERSION,
      DIRECTIONAL_SCENARIO_VERSION,
      SENTINEL_SCENARIO_VERSION,
    ].includes(current.format)
      ? {
          masteries: current.masteryDefinition
            ? [
                {
                  ...structuredClone(current.masteryDefinition),
                  campaignId: current.level.id,
                },
              ]
            : [],
        }
      : {}),
    id,
    version: '1.0.0',
    name,
    description: 'A playable expansion authored in the FPV / LINE playground.',
    engine: versionsForLevel(level).ruleset,
    dependencies: [],
    metadata: {
      author: 'Local creator',
      rightsStatus: 'Review asset provenance before distribution',
      license: 'Author supplied',
    },
    themes: [structuredClone(current.theme)],
    classRecipes: structuredClone(current.classRecipes),
    campaigns: [
      {
        version: 'xonix-campaign.v1',
        id: current.level.id,
        revision: current.level.revision,
        title: name,
        themeId: current.theme.id,
        levels: [level],
        ...(music[0] ? { musicId: music[0].id } : {}),
      },
    ],
    visualOverrides: structuredClone(current.visualOverrides),
    levelVisuals: [],
    music: structuredClone(music),
  };
  const checked = validatePack(pack);
  required(checked.valid, checked.errors.join('; '));
  return pack;
}
