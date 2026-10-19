import { boundedJSON, canonicalJSON, exactKeys, required } from '../data-json.mjs';
import { isExpeditionLevel } from './expedition-version.mjs';

export const TEAM_RUNNING_LEVEL_VERSION = 'revealline-coop-level.v9';
export const TEAM_RUNNING_RULESET = 'revealline-coop.v11';
export const TEAM_RUNNING_PACK_VERSION = 'revealline-coop-pack.v9';
export const TEAM_RUNNING_RECIPE = 'running-enemies.v1';
export const TEAM_PURSUIT_LEVEL_VERSION = 'revealline-coop-level.v11';
export const TEAM_PURSUIT_RULESET = 'revealline-coop.v13';
export const TEAM_PURSUIT_PACK_VERSION = 'revealline-coop-pack.v11';
export const TEAM_SNAKE_PURSUIT_LEVEL_VERSION = 'revealline-coop-level.v12';
export const TEAM_SNAKE_PURSUIT_RULESET = 'revealline-coop.v14';
export const TEAM_SNAKE_PURSUIT_PACK_VERSION = 'revealline-coop-pack.v12';
export const TEAM_PURSUIT_V2_LEVEL_VERSION = 'revealline-coop-level.v13';
export const TEAM_PURSUIT_V2_RULESET = 'revealline-coop.v15';
export const TEAM_PURSUIT_V2_PACK_VERSION = 'revealline-coop-pack.v13';
export const TEAM_SNAKE_PURSUIT_V2_LEVEL_VERSION = 'revealline-coop-level.v14';
export const TEAM_SNAKE_PURSUIT_V2_RULESET = 'revealline-coop.v16';
export const TEAM_SNAKE_PURSUIT_V2_PACK_VERSION = 'revealline-coop-pack.v14';
export const isTeamPursuitV2Level = (level) =>
  [TEAM_PURSUIT_V2_LEVEL_VERSION, TEAM_SNAKE_PURSUIT_V2_LEVEL_VERSION].includes(level?.version);
export const isTeamSnakePursuitLevel = (level) =>
  [TEAM_SNAKE_PURSUIT_LEVEL_VERSION, TEAM_SNAKE_PURSUIT_V2_LEVEL_VERSION].includes(level?.version);
export const isTeamPursuitLevel = (level) =>
  [
    TEAM_PURSUIT_LEVEL_VERSION,
    TEAM_SNAKE_PURSUIT_LEVEL_VERSION,
    TEAM_PURSUIT_V2_LEVEL_VERSION,
    TEAM_SNAKE_PURSUIT_V2_LEVEL_VERSION,
  ].includes(level?.version);
export const isTeamRunningLevel = (level) =>
  [
    TEAM_RUNNING_LEVEL_VERSION,
    TEAM_PURSUIT_LEVEL_VERSION,
    TEAM_SNAKE_PURSUIT_LEVEL_VERSION,
    TEAM_PURSUIT_V2_LEVEL_VERSION,
    TEAM_SNAKE_PURSUIT_V2_LEVEL_VERSION,
  ].includes(level?.version);
export const inheritedTeamVersion = (level) =>
  isExpeditionLevel(level)
    ? 'revealline-coop-level.v7'
    : level.version === 'revealline-coop-level.v10'
      ? 'revealline-coop-level.v8'
      : isTeamRunningLevel(level)
        ? level.runningEnemies?.baseVersion === 'revealline-coop-level.v10'
          ? 'revealline-coop-level.v8'
          : level.runningEnemies?.baseVersion
        : level.version;

/** Reconstruct the inherited edition for its unchanged admission and mechanics. */
export function inheritedRunningTeamLevel(source) {
  const level = boundedJSON(source, {
    maxBytes: 256 * 1024,
    maxNodes: 20000,
    maxDepth: 16,
    maxArray: 8192,
  });
  const recipe = level.runningEnemies;
  if (level.pursuit)
    required(
      level.pursuit.version ===
        (isTeamPursuitV2Level(level) ? 'pursuit-goals.v2' : 'pursuit-goals.v1'),
      'Team pursuit generation must match its native format.',
    );
  const snake = recipe?.version === 'running-enemies.v3';
  const preservesHunt = ['running-enemies.v2', 'running-enemies.v3'].includes(recipe?.version);
  exactKeys(
    recipe,
    [
      'version',
      'baseVersion',
      'baseRevision',
      'inheritedCombat',
      'actorIds',
      ...(preservesHunt ? ['inheritedHunt'] : []),
      ...(snake ? ['inheritedSnake'] : []),
    ],
    'Team running enemies',
  );
  required(
    isTeamSnakePursuitLevel(level) === snake,
    'Combined Team Snake pursuit requires its exact inherited Snake wrapper.',
  );
  required(
    [TEAM_RUNNING_RECIPE, 'running-enemies.v2', 'running-enemies.v3'].includes(recipe.version) &&
      (snake
        ? recipe.baseVersion === 'revealline-coop-level.v10'
        : /^revealline-coop-level\.v[1-8]$/.test(recipe.baseVersion)),
    'Unsupported Team running-enemy inheritance.',
  );
  required(
    (recipe.inheritedCombat === null || typeof recipe.inheritedCombat === 'object') &&
      Array.isArray(recipe.actorIds) &&
      recipe.actorIds.length >= (preservesHunt ? 0 : 1) &&
      recipe.actorIds.length <= 6 &&
      new Set(recipe.actorIds).size === recipe.actorIds.length,
    'Team running enemies need a bounded distinct population.',
  );
  if (preservesHunt)
    required(
      level.version ===
        (isTeamPursuitV2Level(level)
          ? snake
            ? TEAM_SNAKE_PURSUIT_V2_LEVEL_VERSION
            : TEAM_PURSUIT_V2_LEVEL_VERSION
          : snake
            ? TEAM_SNAKE_PURSUIT_LEVEL_VERSION
            : TEAM_PURSUIT_LEVEL_VERSION) &&
        (!snake || canonicalJSON(level.snake) === canonicalJSON(recipe.inheritedSnake)) &&
        recipe.actorIds.length === 0 &&
        canonicalJSON(level.hunt) === canonicalJSON(recipe.inheritedHunt),
      'Authored Team pursuit preserves the exact original hunt.',
    );
  else
    required(
      level.hunt?.mode === 'bonus' &&
        level.hunt.quota === 0 &&
        level.hunt.targets.length === recipe.actorIds.length &&
        level.hunt.targets.every(
          (target, index) => target.id === recipe.actorIds[index] && target.kind === 'runner',
        ),
      'Running enemies preserve the original objective with an optional Bonus population.',
    );
  required(
    level.combatPatrols?.enabled === true &&
      recipe.actorIds.every(
        (id) => level.combatPatrols.actors.filter((actor) => actor.id === id).length === 1,
      ),
    'Running-enemy population is incomplete.',
  );
  required(
    level.enemies.length + level.combatPatrols.actors.length <= 46,
    'Running-enemy Team editions support at most 46 total actors.',
  );
  required(
    level.revision === recipe.baseRevision,
    'Running enemies must preserve the accepted base revision.',
  );
  level.version = recipe.baseVersion;
  level.revision = recipe.baseRevision;
  const retained = level.combatPatrols.actors.filter(
    (actor) => !recipe.actorIds.includes(actor.id),
  );
  required(
    canonicalJSON(retained) ===
      canonicalJSON(recipe.inheritedCombat?.enabled ? recipe.inheritedCombat.actors : []),
    'Inherited Team patrols changed.',
  );
  if (recipe.inheritedCombat === null) delete level.combatPatrols;
  else level.combatPatrols = recipe.inheritedCombat;
  if (preservesHunt) level.hunt = recipe.inheritedHunt;
  else delete level.hunt;
  delete level.runningEnemies;
  delete level.pursuit;
  const inheritedIds = new Set();
  const visit = (value) => {
    if (!value || typeof value !== 'object') return;
    if (typeof value.id === 'string') inheritedIds.add(value.id);
    for (const child of Object.values(value)) visit(child);
  };
  visit(level);
  required(
    recipe.actorIds.every((id) => !inheritedIds.has(id)),
    'Running-enemy identities must not shadow inherited Team entities.',
  );
  return level;
}
