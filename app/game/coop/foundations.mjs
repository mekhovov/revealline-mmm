import {
  inheritedTeamVersion,
  TEAM_RUNNING_LEVEL_VERSION,
  TEAM_PURSUIT_LEVEL_VERSION,
  TEAM_PURSUIT_V2_LEVEL_VERSION,
  TEAM_PURSUIT_V2_RULESET,
  TEAM_SNAKE_PURSUIT_V2_LEVEL_VERSION,
  TEAM_SNAKE_PURSUIT_V2_RULESET,
  TEAM_SNAKE_PURSUIT_LEVEL_VERSION,
  TEAM_SNAKE_PURSUIT_RULESET,
  TEAM_SNAKE_PURSUIT_PACK_VERSION,
  TEAM_PURSUIT_RULESET,
  TEAM_PURSUIT_PACK_VERSION,
  TEAM_PURSUIT_V2_PACK_VERSION,
  TEAM_SNAKE_PURSUIT_V2_PACK_VERSION,
  TEAM_RUNNING_RULESET,
  TEAM_RUNNING_PACK_VERSION,
} from './running-enemies.mjs';
import { compileMapGeometry } from '../content-design/map.mjs';
import { EXPEDITION_LEVEL, EXPEDITION_PACK, EXPEDITION_RULESET } from './expedition-version.mjs';
import {
  TEAM_SNAKE_LEVEL_VERSION,
  TEAM_SNAKE_RULESET,
  TEAM_SNAKE_PACK_VERSION,
} from '../snake/rules.mjs';

export const COOP_FOUNDATION_LEVEL_VERSION = 'revealline-coop-level.v2';
export const COOP_FOUNDATION_RULESET = 'revealline-coop.v4';
export const COOP_FOUNDATION_PACK_VERSION = 'revealline-coop-pack.v2';
export const COOP_TERRAIN_LEVEL_VERSION = 'revealline-coop-level.v3';
export const COOP_TERRAIN_RULESET = 'revealline-coop.v5';
export const COOP_TERRAIN_PACK_VERSION = 'revealline-coop-pack.v3';
export const COOP_ROVER_LEVEL_VERSION = 'revealline-coop-level.v4';
export const COOP_ROVER_RULESET = 'revealline-coop.v6';
export const COOP_ROVER_PACK_VERSION = 'revealline-coop-pack.v4';
export const COOP_BONUS_LEVEL_VERSION = 'revealline-coop-level.v5';
export const COOP_BONUS_RULESET = 'revealline-coop.v7';
export const COOP_BONUS_PACK_VERSION = 'revealline-coop-pack.v5';
export const COOP_IMPACT_LEVEL_VERSION = 'revealline-coop-level.v6';
export const COOP_IMPACT_RULESET = 'revealline-coop.v8';
export const COOP_IMPACT_PACK_VERSION = 'revealline-coop-pack.v6';
export const COOP_SPECIALIST_LEVEL_VERSION = 'revealline-coop-level.v7';
export const COOP_SPECIALIST_RULESET = 'revealline-coop.v9';
export const COOP_SPECIALIST_PACK_VERSION = 'revealline-coop-pack.v7';

export const COOP_HUNT_LEVEL_VERSION = 'revealline-coop-level.v8';
export const COOP_HUNT_RULESET = 'revealline-coop.v10';
export const COOP_HUNT_PACK_VERSION = 'revealline-coop-pack.v8';

const editions = Object.freeze({
  [EXPEDITION_LEVEL]: Object.freeze({ version: EXPEDITION_PACK, ruleset: EXPEDITION_RULESET }),
  [TEAM_PURSUIT_V2_LEVEL_VERSION]: Object.freeze({
    version: TEAM_PURSUIT_V2_PACK_VERSION,
    ruleset: TEAM_PURSUIT_V2_RULESET,
  }),
  [TEAM_SNAKE_PURSUIT_V2_LEVEL_VERSION]: Object.freeze({
    version: TEAM_SNAKE_PURSUIT_V2_PACK_VERSION,
    ruleset: TEAM_SNAKE_PURSUIT_V2_RULESET,
  }),
  [TEAM_SNAKE_PURSUIT_LEVEL_VERSION]: Object.freeze({
    version: TEAM_SNAKE_PURSUIT_PACK_VERSION,
    ruleset: TEAM_SNAKE_PURSUIT_RULESET,
  }),
  [TEAM_SNAKE_LEVEL_VERSION]: Object.freeze({
    version: TEAM_SNAKE_PACK_VERSION,
    ruleset: TEAM_SNAKE_RULESET,
  }),
  [COOP_HUNT_LEVEL_VERSION]: Object.freeze({
    version: COOP_HUNT_PACK_VERSION,
    ruleset: COOP_HUNT_RULESET,
  }),
  [COOP_SPECIALIST_LEVEL_VERSION]: Object.freeze({
    version: COOP_SPECIALIST_PACK_VERSION,
    ruleset: COOP_SPECIALIST_RULESET,
  }),
  [COOP_IMPACT_LEVEL_VERSION]: Object.freeze({
    version: COOP_IMPACT_PACK_VERSION,
    ruleset: COOP_IMPACT_RULESET,
  }),
  [COOP_BONUS_LEVEL_VERSION]: Object.freeze({
    version: COOP_BONUS_PACK_VERSION,
    ruleset: COOP_BONUS_RULESET,
  }),
  [COOP_FOUNDATION_LEVEL_VERSION]: Object.freeze({
    version: COOP_FOUNDATION_PACK_VERSION,
    ruleset: COOP_FOUNDATION_RULESET,
  }),
  [COOP_TERRAIN_LEVEL_VERSION]: Object.freeze({
    version: COOP_TERRAIN_PACK_VERSION,
    ruleset: COOP_TERRAIN_RULESET,
  }),
  [COOP_ROVER_LEVEL_VERSION]: Object.freeze({
    version: COOP_ROVER_PACK_VERSION,
    ruleset: COOP_ROVER_RULESET,
  }),
});

export function journeyTeamPackEdition(level) {
  const edition =
    level.version === TEAM_PURSUIT_LEVEL_VERSION
      ? { version: TEAM_PURSUIT_PACK_VERSION, ruleset: TEAM_PURSUIT_RULESET }
      : level.version === TEAM_RUNNING_LEVEL_VERSION
        ? { version: TEAM_RUNNING_PACK_VERSION, ruleset: TEAM_RUNNING_RULESET }
        : Object.hasOwn(editions, level.version)
          ? editions[level.version]
          : null;
  if (!edition) throw new TypeError('Unsupported Journey Team runtime edition.');
  return edition;
}

export const hasTeamTerrain = (level) =>
  [
    COOP_TERRAIN_LEVEL_VERSION,
    COOP_ROVER_LEVEL_VERSION,
    COOP_BONUS_LEVEL_VERSION,
    COOP_IMPACT_LEVEL_VERSION,
    COOP_SPECIALIST_LEVEL_VERSION,
    COOP_HUNT_LEVEL_VERSION,
  ].includes(inheritedTeamVersion(level));

export const hasTeamRoamers = (level) =>
  [
    COOP_ROVER_LEVEL_VERSION,
    COOP_BONUS_LEVEL_VERSION,
    COOP_IMPACT_LEVEL_VERSION,
    COOP_SPECIALIST_LEVEL_VERSION,
    COOP_HUNT_LEVEL_VERSION,
  ].includes(inheritedTeamVersion(level));

export const hasTeamLineImpacts = (level) =>
  [COOP_IMPACT_LEVEL_VERSION, COOP_SPECIALIST_LEVEL_VERSION].includes(
    inheritedTeamVersion(level),
  ) ||
  (inheritedTeamVersion(level) === COOP_HUNT_LEVEL_VERSION && Object.hasOwn(level, 'lineImpact'));
export const hasTeamSpecialists = (level) =>
  inheritedTeamVersion(level) === COOP_SPECIALIST_LEVEL_VERSION ||
  (inheritedTeamVersion(level) === COOP_HUNT_LEVEL_VERSION && Object.hasOwn(level, 'supportRoles'));
export const hasTeamHunting = (level) =>
  [
    COOP_HUNT_LEVEL_VERSION,
    TEAM_RUNNING_LEVEL_VERSION,
    TEAM_SNAKE_LEVEL_VERSION,
    TEAM_PURSUIT_LEVEL_VERSION,
    TEAM_SNAKE_PURSUIT_LEVEL_VERSION,
    TEAM_PURSUIT_V2_LEVEL_VERSION,
    TEAM_SNAKE_PURSUIT_V2_LEVEL_VERSION,
  ].includes(level.version);

export const isJourneyTeamLevel = (level) => Object.hasOwn(editions, inheritedTeamVersion(level));
export const isJourneyTeamRuleset = (ruleset) =>
  Object.values(editions).some((edition) => edition.ruleset === ruleset);

/** Explicit new runtime edition. Historical Team levels retain their connected
 * safe-rectangle contract. New editions share Solo/Studio geometry validation. */
export function compileCoopFoundationGeometry(level) {
  return compileMapGeometry({
    width: level.width,
    height: level.height,
    walls: level.walls ?? [],
    foundations: level.safeRects ?? [],
    terrain: hasTeamTerrain(level) ? level.terrain : [],
    spawns: level.spawns.map((spawn, seat) => ({ id: `player-${seat + 1}`, ...spawn })),
  });
}
