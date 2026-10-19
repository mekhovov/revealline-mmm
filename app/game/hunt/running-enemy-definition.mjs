import { boundedJSON, dataIdentity, exactKeys, required } from '../data-json.mjs';
import { CELL } from '../core/registry.mjs';
import { foundationGeometry } from '../core/foundations.mjs';
import { validateCombatPatrols } from '../core/combat-definition.mjs';
import { isRunningEnemyLevel, isSnakePursuitLevel, isPursuitV2Level } from '../core/versions.mjs';
import { validateHuntDefinition, validateHuntReachability } from './rules.mjs';
import { runningEnemyReservedIds } from './running-enemy-placement.mjs';

export const RUNNING_ENEMIES_VERSION = 'running-enemies.v1';
export const runningEnemyCopy = (value) =>
  boundedJSON(value, {
    maxBytes: 160 * 1024,
    maxNodes: 12000,
    maxDepth: 14,
    maxArray: 512,
  });
export const combatOwner = (state) => state.classic ?? state.runningEnemies;
export const combatDefinition = (level) =>
  level.runningEnemies?.combatPatrols ?? level.classic?.combatPatrols;
export const huntDefinition = (level) => level.runningEnemies?.hunt ?? level.classic?.hunt;

export function runningEnemyBaseLevel(level) {
  const copy = runningEnemyCopy(level);
  if (!isRunningEnemyLevel(copy)) return copy;
  copy.version = copy.runningEnemies?.baseVersion;
  delete copy.runningEnemies;
  delete copy.pursuit;
  return copy;
}

export function runningEnemyGeometry(base) {
  const width = base.width,
    height = base.height;
  let cells;
  if (base.foundations) cells = foundationGeometry(base).cells;
  else {
    cells = new Uint8Array(width * height);
    for (let y = 0; y < height; y++)
      for (let x = 0; x < width; x++)
        if (x === 0 || y === 0 || x === width - 1 || y === height - 1)
          cells[y * width + x] = CELL.SAFE;
    for (const rect of base.walls)
      for (let y = rect.y; y < rect.y + rect.h; y++)
        for (let x = rect.x; x < rect.x + rect.w; x++) cells[y * width + x] = CELL.WALL;
  }
  const terrain = new Uint8Array(cells.length);
  for (const rect of base.classic?.terrain ?? [])
    for (let y = rect.y; y < rect.y + rect.h; y++)
      for (let x = rect.x; x < rect.x + rect.w; x++)
        terrain[y * width + x] = rect.kind === 'lethal' ? 2 : rect.kind === 'slow' ? 1 : 0;
  return { width, height, cells, terrain, spawns: [base.spawn] };
}

/** The original reader validates all inherited mechanics. This boundary only adds
 * an independently bounded population; it never upgrades historical game rules. */
export function validateRunningEnemyDefinition(level, base) {
  const value = level.runningEnemies;
  if (level.pursuit)
    required(
      level.pursuit.version === (isPursuitV2Level(level) ? 'pursuit-goals.v2' : 'pursuit-goals.v1'),
      'Pursuit generation must match its native level format.',
    );
  exactKeys(
    value,
    ['version', 'baseVersion', 'baseIdentity', 'combatPatrols', 'hunt'],
    'Running enemies',
  );
  required(
    isSnakePursuitLevel(level) === (value.version === 'running-enemies.v3'),
    'Combined Snake pursuit requires its exact inherited Snake wrapper.',
  );
  if (['running-enemies.v2', 'running-enemies.v3'].includes(value.version)) {
    const snake = value.version === 'running-enemies.v3';
    required(
      level.version ===
        (isPursuitV2Level(level)
          ? snake
            ? 'xonix-level.v15'
            : 'xonix-level.v14'
          : snake
            ? 'xonix-level.v13'
            : 'xonix-level.v12') &&
        value.baseVersion === (snake ? 'xonix-level.v11' : 'xonix-level.v9') &&
        (!snake || base.snake) &&
        base.classic?.hunt,
      'Authored pursuit requires its exact historical hunt base.',
    );
    required(
      value.baseIdentity === dataIdentity(base) &&
        dataIdentity(value.combatPatrols) === dataIdentity(base.classic.combatPatrols) &&
        dataIdentity(value.hunt) === dataIdentity(base.classic.hunt),
      'Authored pursuit preserves its complete population and objectives.',
    );
    return value;
  }
  required(value.version === RUNNING_ENEMIES_VERSION, 'Unsupported Running enemies recipe.');
  required(
    /^xonix-level\.v[1-8]$/.test(value.baseVersion),
    'Running enemies needs a supported historical base.',
  );
  required(
    !base.classic?.hunt && !Object.hasOwn(base, 'runningEnemies'),
    'Authored Hunt objectives retain their original edition.',
  );
  required(
    value.baseIdentity === dataIdentity(base),
    'Running enemies base identity does not match its inherited level.',
  );
  const inherited = base.classic?.combatPatrols?.enabled ? base.classic.combatPatrols.actors : [];
  const actors = value.combatPatrols?.actors;
  required(
    Array.isArray(actors) &&
      actors.length > inherited.length &&
      actors.length <= inherited.length + 6,
    'Running enemies adds one to six actors without replacing inherited actors.',
  );
  required(
    dataIdentity(actors.slice(0, inherited.length)) === dataIdentity(inherited),
    'Inherited patrol recipes must remain unchanged.',
  );
  const added = actors.slice(inherited.length);
  const reserved = runningEnemyReservedIds(base);
  required(
    added.every((actor) => !reserved.has(actor.id)),
    'Running enemy IDs must not shadow inherited entities.',
  );
  required(
    value.hunt?.mode === 'bonus' &&
      value.hunt?.quota === 0 &&
      value.hunt?.targets?.length === added.length &&
      value.hunt.targets.every(
        (target, i) => target.id === added[i].id && target.kind === 'runner',
      ),
    'Running enemies is a finite Bonus overlay containing only its added runners.',
  );
  const geometry = runningEnemyGeometry(base);
  const ids = new Set();
  const proxy = {
    ...base,
    version: 'xonix-level.v9',
    classic: { combatPatrols: value.combatPatrols, hunt: value.hunt },
  };
  validateCombatPatrols(proxy, {
    geometry,
    walls: geometry.cells.map((cell) => (cell === CELL.WALL ? 1 : 0)),
    supplemental: true,
    identity: (actor) => {
      required(!ids.has(actor.id), 'Combat actor IDs must be distinct.');
      ids.add(actor.id);
    },
  });
  validateHuntDefinition(value.hunt, actors, {
    ordinaryCount: base.enemies.length,
    enabled: value.combatPatrols.enabled,
    supplemental: true,
  });
  validateHuntReachability(value.hunt, actors, geometry);
  return value;
}
