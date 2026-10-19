import {
  derivePursuitGoals,
  validatePursuitPopulation,
  PURSUIT_GOALS_VERSION,
  PURSUIT_GOALS_V2,
} from './pursuit-goals.mjs';
import { dataIdentity, required } from '../data-json.mjs';
import { createCoop, validateCoopLevel } from '../coop/core.mjs';
import {
  TEAM_RUNNING_LEVEL_VERSION,
  TEAM_PURSUIT_LEVEL_VERSION,
  TEAM_SNAKE_PURSUIT_LEVEL_VERSION,
  TEAM_PURSUIT_V2_LEVEL_VERSION,
  TEAM_SNAKE_PURSUIT_V2_LEVEL_VERSION,
  isTeamRunningLevel,
  TEAM_RUNNING_RECIPE,
  inheritedRunningTeamLevel,
} from '../coop/running-enemies.mjs';
import { freezeDesign } from '../content-design/catalogs.mjs';
import { placeRunningEnemies } from './running-enemy-placement.mjs';

export function teamRunningEnemyBaseLevel(level) {
  return isTeamRunningLevel(level) ? inheritedRunningTeamLevel(level) : level;
}

/** Apply after accepted gameplay tuning. Existing Hunt objectives remain authored. */
export function prepareTeamRunningEnemies(
  source,
  { style = 'original', population, generation = PURSUIT_GOALS_VERSION } = {},
) {
  required(['original', 'varied'].includes(style), 'Choose original or varied Team targets.');
  required(
    [PURSUIT_GOALS_VERSION, PURSUIT_GOALS_V2].includes(generation),
    'Unsupported Team pursuit generation.',
  );
  const version =
    generation === PURSUIT_GOALS_V2 ? TEAM_PURSUIT_V2_LEVEL_VERSION : TEAM_PURSUIT_LEVEL_VERSION;
  const snakeVersion =
    generation === PURSUIT_GOALS_V2
      ? TEAM_SNAKE_PURSUIT_V2_LEVEL_VERSION
      : TEAM_SNAKE_PURSUIT_LEVEL_VERSION;
  if (source.pursuit && isTeamRunningLevel(source)) {
    const checked = validateCoopLevel(source);
    required(checked.valid, checked.errors.join(' '));
    return freezeDesign(structuredClone(source));
  }
  source = teamRunningEnemyBaseLevel(source);
  const validation = validateCoopLevel(source);
  required(validation.valid, validation.errors.join(' '));
  if (source.hunt) {
    if (style === 'original') return source;
    const runners = source.combatPatrols.actors.filter((actor) =>
      source.hunt.targets.some((target) => target.id === actor.id && target.kind === 'runner'),
    );
    if (!runners.length) return source;
    const authored = population === undefined ? null : validatePursuitPopulation(population);
    required(
      !authored ||
        authored.every((item) =>
          runners.some((actor) => actor.id === item.id && actor.x === item.x && actor.y === item.y),
        ),
      'Authored Team pursuit goals must match existing target positions.',
    );
    const level = structuredClone(source);
    level.version = source.snake ? snakeVersion : version;
    level.runningEnemies = {
      version: source.snake ? 'running-enemies.v3' : 'running-enemies.v2',
      ...(source.snake ? { inheritedSnake: structuredClone(source.snake) } : {}),
      baseVersion: source.version,
      baseRevision: source.revision,
      inheritedCombat: structuredClone(source.combatPatrols),
      inheritedHunt: structuredClone(source.hunt),
      actorIds: [],
    };
    level.pursuit = authored
      ? {
          version: generation,
          actors: authored.map(({ x: _x, y: _y, ...policy }) => policy),
        }
      : derivePursuitGoals(runners, createCoop(source, { seed: 1 }), generation);
    const checked = validateCoopLevel(level);
    required(checked.valid, checked.errors.join(' '));
    return freezeDesign(level);
  }
  const run = createCoop(source, { seed: 1 });
  const inherited = source.combatPatrols?.enabled ? source.combatPatrols.actors : [];
  const reservedIds = [];
  const visit = (value) => {
    if (!value || typeof value !== 'object') return;
    if (typeof value.id === 'string') reservedIds.push(value.id);
    for (const child of Object.values(value)) visit(child);
  };
  visit(source);
  const authored = population === undefined ? null : validatePursuitPopulation(population);
  required(!authored || style === 'varied', 'Authored goals require varied pursuit.');
  const spots =
    authored ??
    placeRunningEnemies({
      width: source.width,
      height: source.height,
      cells: run.cells,
      terrain: run.terrain ?? [],
      spawns: source.spawns,
      occupied: [
        ...source.enemies,
        ...inherited,
        ...(source.strongholds ?? []).flatMap((hold) => [hold.core, ...hold.anchors]),
      ],
      reservedIds,
      count: Math.min(6, 46 - source.enemies.length - inherited.length),
    });
  required(spots.length > 0, 'No safe running-enemy population fits this Team level.');
  const actors = spots.map(({ id, x, y }, index) => ({
    id,
    role: 'scout',
    x,
    y,
    headingX: index % 2 ? -1 : 1,
    headingY: 0,
    speed: (source.rules?.moveSpeed ?? 8) * 0.7,
    turnTicks: 60,
  }));
  const level = structuredClone(source);
  level.version = style === 'varied' ? version : TEAM_RUNNING_LEVEL_VERSION;
  level.runningEnemies = {
    version: TEAM_RUNNING_RECIPE,
    baseVersion: source.version,
    baseRevision: source.revision,
    inheritedCombat: structuredClone(source.combatPatrols ?? null),
    actorIds: actors.map((actor) => actor.id),
  };
  level.combatPatrols = {
    version: 'combat-patrols.v1',
    enabled: true,
    actors: [...inherited, ...actors],
  };
  level.hunt = {
    version: 'humanoid-hunt.v1',
    mode: 'bonus',
    quota: 0,
    targets: actors.map((actor) => ({ id: actor.id, kind: 'runner' })),
  };
  if (style === 'varied')
    level.pursuit = authored
      ? {
          version: generation,
          actors: authored.map(({ x: _x, y: _y, ...policy }) => policy),
        }
      : derivePursuitGoals(actors, run, generation);
  const checked = validateCoopLevel(level);
  required(checked.valid, checked.errors.join(' '));
  return freezeDesign(level);
}

export function matchTeamRunningEnemyLevel(source, recorded, options) {
  try {
    return (
      dataIdentity(
        prepareTeamRunningEnemies(source, {
          ...options,
          generation: recorded.pursuit?.version ?? PURSUIT_GOALS_VERSION,
        }),
      ) === dataIdentity(recorded)
    );
  } catch {
    return false;
  }
}
