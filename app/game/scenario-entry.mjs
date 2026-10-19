import { t } from './i18n/index.mjs';
import { CLASSES } from './core/registry.mjs';
import { required } from './data-json.mjs';
import {
  validateScenario,
  CLASSIC_SCENARIO_VERSION,
  DIRECTIONAL_SCENARIO_VERSION,
  ENCOUNTER_SCENARIO_VERSION,
  FOUNDATION_SCENARIO_VERSION,
  HUNT_SCENARIO_VERSION,
  MASTERY_SCENARIO_VERSION,
  PURSUIT_SCENARIO_VERSION,
  PURSUIT_V2_SCENARIO_VERSION,
  RELAY_SCENARIO_VERSION,
  SENTINEL_SCENARIO_VERSION,
  SNAKE_PURSUIT_SCENARIO_VERSION,
  SNAKE_PURSUIT_V2_SCENARIO_VERSION,
  SNAKE_SCENARIO_VERSION,
  WIDE_SCENARIO_VERSION,
} from './content.mjs';
import {
  CLASSIC_PACK_VERSION,
  DIRECTIONAL_PACK_VERSION,
  ENCOUNTER_PACK_VERSION,
  FOUNDATION_PACK_VERSION,
  HUNT_PACK_VERSION,
  MASTERY_PACK_VERSION,
  PURSUIT_PACK_VERSION,
  PURSUIT_V2_PACK_VERSION,
  RELAY_PACK_VERSION,
  SENTINEL_PACK_VERSION,
  SNAKE_PACK_VERSION,
  SNAKE_PURSUIT_PACK_VERSION,
  SNAKE_PURSUIT_V2_PACK_VERSION,
  WIDE_PACK_VERSION,
} from './packs.mjs';

export function editorScenario(scenario) {
  const current = structuredClone(scenario);
  for (const key of ['walls', 'enemies', 'objectives', 'supplies', 'signalZones'])
    current.level[key] ??= [];
  current.presentation ??= { style: 'hybrid', showGrid: false };
  return current;
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
      level.version === 'xonix-level.v15'
        ? SNAKE_PURSUIT_V2_SCENARIO_VERSION
        : level.version === 'xonix-level.v14'
          ? PURSUIT_V2_SCENARIO_VERSION
          : level.version === 'xonix-level.v13'
            ? SNAKE_PURSUIT_SCENARIO_VERSION
            : level.version === 'xonix-level.v12'
              ? PURSUIT_SCENARIO_VERSION
              : level.version === 'xonix-level.v11'
                ? SNAKE_SCENARIO_VERSION
                : level.version === 'xonix-level.v9'
                  ? HUNT_SCENARIO_VERSION
                  : level.version === 'xonix-level.v8'
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
      'xonix-level.v9',
      'xonix-level.v11',
      'xonix-level.v12',
      'xonix-level.v13',
      'xonix-level.v14',
      'xonix-level.v15',
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
      HUNT_PACK_VERSION,
      SNAKE_PACK_VERSION,
      PURSUIT_PACK_VERSION,
      SNAKE_PURSUIT_PACK_VERSION,
      PURSUIT_V2_PACK_VERSION,
      SNAKE_PURSUIT_V2_PACK_VERSION,
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
