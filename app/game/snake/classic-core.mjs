import {
  CLASSIC_SNAKE_V6_LEVEL,
  CLASSIC_SNAKE_V6_CORE,
  CLASSIC_SNAKE_V6_REPLAY,
  validateClassicSnakeLevelV6,
  createClassicSnakeV6,
  queueClassicSnakeTurnV6,
  stepClassicSnakeV6,
  classicSnakeSummaryV6,
  exportClassicSnakeReplayV6,
  restoreClassicSnakeReplayV6,
} from './classic-core-v6.mjs';
export {
  CLASSIC_SNAKE_V6_LEVEL,
  CLASSIC_SNAKE_V6_CORE,
  CLASSIC_SNAKE_V6_REPLAY,
} from './classic-core-v6.mjs';
import {
  CLASSIC_SNAKE_V5_LEVEL,
  CLASSIC_SNAKE_V5_CORE,
  CLASSIC_SNAKE_V5_REPLAY,
  validateClassicSnakeLevelV5,
  createClassicSnakeV5,
  queueClassicSnakeTurnV5,
  stepClassicSnakeV5,
  classicSnakeSummaryV5,
  exportClassicSnakeReplayV5,
  restoreClassicSnakeReplayV5,
} from './classic-core-v5.mjs';
export {
  CLASSIC_SNAKE_V5_LEVEL,
  CLASSIC_SNAKE_V5_CORE,
  CLASSIC_SNAKE_V5_REPLAY,
} from './classic-core-v5.mjs';
import {
  CLASSIC_SNAKE_V4_LEVEL,
  CLASSIC_SNAKE_V4_CORE,
  CLASSIC_SNAKE_V4_REPLAY,
  validateClassicSnakeLevelV4,
  createClassicSnakeV4,
  queueClassicSnakeTurnV4,
  stepClassicSnakeV4,
  classicSnakeSummaryV4,
  exportClassicSnakeReplayV4,
  restoreClassicSnakeReplayV4,
} from './classic-core-v4.mjs';
export {
  makeClassicSnakeV4,
  CLASSIC_SNAKE_V4_LEVEL,
  CLASSIC_SNAKE_V4_CORE,
  CLASSIC_SNAKE_V4_REPLAY,
  classicSnakeContactHazardV4,
  classicSnakeHazardAtV4,
  CLASSIC_SNAKE_V4_KINDS,
  classicSnakeUsesVariableHazards,
  classicSnakeSignalView,
  classicSnakeSignalCoverage,
} from './classic-core-v4.mjs';
import {
  CLASSIC_SNAKE_V3_LEVEL,
  CLASSIC_SNAKE_V3_CORE,
  CLASSIC_SNAKE_V3_REPLAY,
  validateClassicSnakeLevelV3,
  createClassicSnakeV3,
  queueClassicSnakeTurnV3,
  stepClassicSnakeV3,
  classicSnakeSummaryV3,
  exportClassicSnakeReplayV3,
  restoreClassicSnakeReplayV3,
} from './classic-core-v3.mjs';
export {
  makeClassicSnakeV3,
  CLASSIC_SNAKE_V3_LEVEL,
  CLASSIC_SNAKE_V3_CORE,
  CLASSIC_SNAKE_V3_REPLAY,
  classicSnakeContactHazardV3,
} from './classic-core-v3.mjs';
import {
  CLASSIC_SNAKE_V2_LEVEL,
  CLASSIC_SNAKE_V2_CORE,
  CLASSIC_SNAKE_V2_REPLAY,
  validateClassicSnakeLevelV2,
  createClassicSnakeV2,
  queueClassicSnakeTurnV2,
  stepClassicSnakeV2,
  classicSnakeSummaryV2,
  exportClassicSnakeReplayV2,
  restoreClassicSnakeReplayV2,
} from './classic-core-v2.mjs';
export {
  makeClassicSnakeV2,
  CLASSIC_SNAKE_V2_LEVEL,
  CLASSIC_SNAKE_V2_CORE,
  CLASSIC_SNAKE_V2_REPLAY,
} from './classic-core-v2.mjs';

import {
  boundedJSON,
  canonicalJSON,
  dataIdentity,
  exactKeys,
  required,
  stableId,
} from '../data-json.mjs';

export const CLASSIC_SNAKE_LEVEL_VERSION = 'classic-snake-level.v1';
export const CLASSIC_SNAKE_CORE_VERSION = 'classic-snake-core.v1';
export const CLASSIC_SNAKE_REPLAY_VERSION = 'classic-snake-replay.v1';
export const CLASSIC_SNAKE_MAX_STEPS = 30000;
export const CLASSIC_SNAKE_MAX_TURNS = 16384;
export const CLASSIC_SNAKE_INITIAL_LENGTH = 4;
const DIRECTIONS = Object.freeze({ up: [0, -1], right: [1, 0], down: [0, 1], left: [-1, 0] });
const OPPOSITE = Object.freeze({ up: 'down', right: 'left', down: 'up', left: 'right' });
const directionNames = Object.keys(DIRECTIONS);
const integer = (value, low, high) => Number.isInteger(value) && value >= low && value <= high;
const key = ({ x, y }) => `${x},${y}`;
const same = (a, b) => a.x === b.x && a.y === b.y;
const point = ({ x, y }) => ({ x, y });
const geometryCache = new WeakMap();
function geometry(level) {
  let value = geometryCache.get(level);
  if (!value) {
    const walls = new Set(level.walls.map(key)),
      cells = [];
    for (let y = 0; y < level.height; y++)
      for (let x = 0; x < level.width; x++) {
        const cell = { x, y };
        if (!walls.has(key(cell))) cells.push(cell);
      }
    value = { walls, cells };
    geometryCache.set(level, value);
  }
  return value;
}
const freeze = (value) => {
  if (value && typeof value === 'object') {
    for (const child of Object.values(value)) freeze(child);
    Object.freeze(value);
  }
  return value;
};
const inside = (level, cell) =>
  integer(cell.x, 0, level.width - 1) && integer(cell.y, 0, level.height - 1);
const destination = (level, cell, direction, backwards = false) => {
  const [dx, dy] = DIRECTIONS[direction],
    sign = backwards ? -1 : 1;
  const x = cell.x + dx * sign,
    y = cell.y + dy * sign;
  return level.wrap
    ? { x: (x + level.width) % level.width, y: (y + level.height) % level.height }
    : { x, y };
};
function initialBody(level, spawn) {
  const cells = [point(spawn)];
  while (cells.length < CLASSIC_SNAKE_INITIAL_LENGTH)
    cells.push(destination(level, cells.at(-1), spawn.direction, true));
  return cells;
}

/** A separate classic-grid recipe: no territory, captures, abilities or old-core conversion. */
export function validateClassicSnakeLevel(source) {
  if (source?.version === CLASSIC_SNAKE_V6_LEVEL) return validateClassicSnakeLevelV6(source);
  if (source?.version === CLASSIC_SNAKE_V5_LEVEL) return validateClassicSnakeLevelV5(source);
  if (source?.version === CLASSIC_SNAKE_V4_LEVEL) return validateClassicSnakeLevelV4(source);
  if (source?.version === CLASSIC_SNAKE_V3_LEVEL) return validateClassicSnakeLevelV3(source);
  if (source?.version === CLASSIC_SNAKE_V2_LEVEL) return validateClassicSnakeLevelV2(source);
  const level = boundedJSON(source, {
    maxBytes: 64 * 1024,
    maxNodes: 6000,
    maxArray: 1536,
    maxDepth: 4,
  });
  exactKeys(
    level,
    [
      'version',
      'id',
      'revision',
      'name',
      'width',
      'height',
      'walls',
      'spawns',
      'goal',
      'stepMs',
      'speedupEvery',
      'minStepMs',
      'wrap',
      'targetMovement',
      'fleeEvery',
    ],
    'Classic Snake level',
  );
  required(
    level.version === CLASSIC_SNAKE_LEVEL_VERSION && stableId(level.id),
    'Unsupported Classic Snake level identity.',
  );
  required(
    typeof level.revision === 'string' && level.revision.length > 0 && level.revision.length <= 80,
    'Classic Snake requires a revision.',
  );
  required(
    typeof level.name === 'string' && level.name.trim().length > 0 && level.name.length <= 120,
    'Classic Snake requires a short level name.',
  );
  required(
    integer(level.width, 16, 48) && integer(level.height, 12, 32),
    'Classic Snake grid dimensions are outside the admitted bounds.',
  );
  required(
    typeof level.wrap === 'boolean' &&
      ['still', 'flee'].includes(level.targetMovement) &&
      integer(level.fleeEvery, 3, 12),
    'Unsupported Classic Snake edge or target policy.',
  );
  required(
    integer(level.goal, 1, 128) &&
      integer(level.stepMs, 80, 300) &&
      integer(level.minStepMs, 60, level.stepMs) &&
      integer(level.speedupEvery, 0, 16),
    'Invalid Classic Snake goal or clock.',
  );
  required(
    Array.isArray(level.walls) && level.walls.length <= level.width * level.height,
    'Classic Snake walls must be a bounded cell list.',
  );
  for (const cell of level.walls) {
    exactKeys(cell, ['x', 'y'], 'Classic Snake wall');
    required(inside(level, cell), 'Classic Snake wall is outside the grid.');
  }
  const walls = new Set(level.walls.map(key));
  required(walls.size === level.walls.length, 'Classic Snake walls must be unique.');
  level.walls.sort((a, b) => a.y - b.y || a.x - b.x);
  required(
    Array.isArray(level.spawns) && level.spawns.length === 2,
    'Classic Snake requires two explicitly authored starts.',
  );
  const bodies = level.spawns.map((spawn) => {
    exactKeys(spawn, ['x', 'y', 'direction'], 'Classic Snake spawn');
    required(
      inside(level, spawn) && Object.hasOwn(DIRECTIONS, spawn.direction),
      'Invalid Classic Snake spawn.',
    );
    return initialBody(level, spawn);
  });
  const occupied = new Set(bodies.flat().map(key));
  required(
    occupied.size === 8 &&
      bodies.flat().every((cell) => inside(level, cell) && !walls.has(key(cell))),
    'Both complete four-cell starting bodies must be clear and separate.',
  );
  const first = level.spawns.map((spawn) => destination(level, spawn, spawn.direction));
  required(
    !same(first[0], first[1]) &&
      first.every(
        (cell) => inside(level, cell) && !walls.has(key(cell)) && !occupied.has(key(cell)),
      ),
    'Both initial automatic moves must be clear and separate.',
  );
  const freeCount = level.width * level.height - walls.size;
  required(
    freeCount >= level.goal + 9,
    'Classic Snake requires space for its finite goal, both bodies and the next target.',
  );
  // All authored free cells belong to one static component. A target can never
  // appear in an inaccessible wall pocket; dynamic body routing remains gameplay.
  const reached = new Set([key(level.spawns[0])]),
    pending = [point(level.spawns[0])];
  for (let index = 0; index < pending.length; index++) {
    for (const direction of directionNames) {
      const next = destination(level, pending[index], direction),
        identity = key(next);
      if (!inside(level, next) || walls.has(identity) || reached.has(identity)) continue;
      reached.add(identity);
      pending.push(next);
    }
  }
  required(reached.size === freeCount, 'Classic Snake free cells must form one reachable region.');
  return level;
}

function random(run) {
  let value = run.random;
  value ^= value << 13;
  value ^= value >>> 17;
  value ^= value << 5;
  run.random = value >>> 0;
  return run.random;
}
const occupiedCells = (run) => new Set(run.snakes.flatMap((snake) => snake.body.map(key)));
function spawnTarget(run) {
  if (run.catches >= run.level.goal) {
    run.target = null;
    return;
  }
  const occupied = occupiedCells(run),
    available = geometry(run.level).cells;
  // Recipe capacity admission makes this unreachable for a valid living run.
  const offset = random(run) % available.length;
  let cell = null;
  for (let step = 0; step < available.length; step++) {
    const candidate = available[(offset + step) % available.length];
    if (!occupied.has(key(candidate))) {
      cell = candidate;
      break;
    }
  }
  required(cell, 'Classic Snake has no free target cell.');
  // Identical-seed Versus boards share a preferred sequence; their target only
  // diverges when one current body actually occupies the preferred spawn cell.
  run.target = {
    id: `humanoid-${run.catches + 1}`,
    kind: 'humanoid',
    ...cell,
  };
}

export function createClassicSnake(source, options = {}) {
  if (source?.version === CLASSIC_SNAKE_V6_LEVEL) return createClassicSnakeV6(source, options);
  if (source?.version === CLASSIC_SNAKE_V5_LEVEL) return createClassicSnakeV5(source, options);
  if (source?.version === CLASSIC_SNAKE_V4_LEVEL) return createClassicSnakeV4(source, options);
  if (source?.version === CLASSIC_SNAKE_V3_LEVEL) return createClassicSnakeV3(source, options);
  if (source?.version === CLASSIC_SNAKE_V2_LEVEL) return createClassicSnakeV2(source, options);
  const settings = boundedJSON(options, { maxBytes: 1024, maxNodes: 10, maxDepth: 1 });
  exactKeys(settings, ['mode', 'seed'], 'Classic Snake options');
  const { mode = 'solo', seed = 17 } = settings;
  required(
    ['solo', 'team'].includes(mode) && integer(seed, 0, 0xffffffff),
    'Unsupported Classic Snake mode or seed.',
  );
  const level = freeze(validateClassicSnakeLevel(source));
  const run = {
    version: CLASSIC_SNAKE_CORE_VERSION,
    level,
    levelIdentity: dataIdentity(level),
    mode,
    seed,
    random: seed || 0x9e3779b9,
    tick: 0,
    elapsedMs: 0,
    status: 'running',
    failure: null,
    snakes: level.spawns.slice(0, mode === 'team' ? 2 : 1).map((spawn, id) => ({
      id,
      body: initialBody(level, spawn),
      direction: spawn.direction,
      turns: [],
      catches: 0,
      alive: true,
    })),
    target: null,
    catches: 0,
    score: 0,
    recentCatches: [],
    events: [],
    history: [],
  };
  spawnTarget(run);
  return run;
}

/** One input edge, not a held direction. No reversal against pending turns. */
export function queueClassicSnakeTurn(run, playerId, direction) {
  if (run?.version === CLASSIC_SNAKE_V6_CORE)
    return queueClassicSnakeTurnV6(run, playerId, direction);
  if (run?.version === CLASSIC_SNAKE_V5_CORE)
    return queueClassicSnakeTurnV5(run, playerId, direction);
  if (run?.version === CLASSIC_SNAKE_V4_CORE)
    return queueClassicSnakeTurnV4(run, playerId, direction);
  if (run?.version === CLASSIC_SNAKE_V3_CORE)
    return queueClassicSnakeTurnV3(run, playerId, direction);
  if (run?.version === CLASSIC_SNAKE_V2_CORE)
    return queueClassicSnakeTurnV2(run, playerId, direction);
  if (
    run.status !== 'running' ||
    !integer(playerId, 0, run.snakes.length - 1) ||
    !Object.hasOwn(DIRECTIONS, direction)
  )
    return false;
  const snake = run.snakes[playerId],
    previous = snake.turns.at(-1) ?? snake.direction;
  if (
    !snake.alive ||
    snake.turns.length >= 2 ||
    direction === previous ||
    direction === OPPOSITE[previous]
  )
    return false;
  if (run.history.length >= CLASSIC_SNAKE_MAX_TURNS) {
    return false;
  }
  snake.turns.push(direction);
  run.history.push({ tick: run.tick, playerId, direction });
  // The final accepted input owns the limit result, so its journal reproduces
  // even this terminal boundary without an unrecorded rejected-input side effect.
  if (run.history.length === CLASSIC_SNAKE_MAX_TURNS) {
    run.events = [];
    finish(run, 'lost', { cause: 'input-limit', players: [] });
  }
  return true;
}
function finish(run, status, failure = null) {
  run.status = status;
  run.failure = failure;
  run.events.push({
    type: 'run.completed',
    tick: run.tick,
    status,
    catches: run.catches,
    score: run.score,
    failure,
  });
}
function gridDistance(level, a, b) {
  const dx = Math.abs(a.x - b.x),
    dy = Math.abs(a.y - b.y);
  return level.wrap ? Math.min(dx, level.width - dx) + Math.min(dy, level.height - dy) : dx + dy;
}
function fleeTarget(run) {
  if (!run.target || run.level.targetMovement !== 'flee' || run.tick % run.level.fleeEvery !== 0)
    return;
  const occupied = occupiedCells(run),
    { walls } = geometry(run.level);
  const distance = (cell) =>
    Math.min(...run.snakes.map((snake) => gridDistance(run.level, cell, snake.body[0])));
  const options = directionNames
    .map((direction) => destination(run.level, run.target, direction))
    .filter((cell) => inside(run.level, cell) && !walls.has(key(cell)) && !occupied.has(key(cell)));
  const bestDistance = Math.max(distance(run.target), ...options.map(distance));
  const best = options.filter((cell) => distance(cell) === bestDistance);
  if (!best.length) return;
  Object.assign(run.target, best[random(run) % best.length]);
  run.events.push({ type: 'target.moved', tick: run.tick, target: { ...run.target } });
}

function stepMilliseconds(run) {
  const speedup = run.level.speedupEvery
    ? Math.floor(run.catches / run.level.speedupEvery) * 10
    : 0;
  return Math.max(run.level.minStepMs, run.level.stepMs - speedup);
}

/** One automatic, simultaneous grid step. UI pausing simply stops calling this. */
export function stepClassicSnake(run) {
  if (run?.version === CLASSIC_SNAKE_V6_CORE) return stepClassicSnakeV6(run);
  if (run?.version === CLASSIC_SNAKE_V5_CORE) return stepClassicSnakeV5(run);
  if (run?.version === CLASSIC_SNAKE_V4_CORE) return stepClassicSnakeV4(run);
  if (run?.version === CLASSIC_SNAKE_V3_CORE) return stepClassicSnakeV3(run);
  if (run?.version === CLASSIC_SNAKE_V2_CORE) return stepClassicSnakeV2(run);
  if (run.status !== 'running') return run;
  run.events = [];
  if (run.tick >= CLASSIC_SNAKE_MAX_STEPS) {
    finish(run, 'lost', { cause: 'step-limit', players: [] });
    return run;
  }
  const { walls } = geometry(run.level);
  const plans = run.snakes.map((snake) => {
    const direction = snake.turns[0] ?? snake.direction;
    const next = destination(run.level, snake.body[0], direction);
    return { snake, direction, next, grows: !!run.target && same(next, run.target) };
  });
  const failures = new Map();
  const fail = (id, cause) => {
    if (!failures.has(id)) failures.set(id, cause);
  };
  for (const plan of plans)
    if (!inside(run.level, plan.next) || walls.has(key(plan.next))) fail(plan.snake.id, 'wall');
  if (plans.length === 2) {
    if (same(plans[0].next, plans[1].next))
      for (const plan of plans) fail(plan.snake.id, 'head-on');
    if (same(plans[0].next, plans[1].snake.body[0]) && same(plans[1].next, plans[0].snake.body[0]))
      for (const plan of plans) fail(plan.snake.id, 'head-swap');
  }
  // Remove exactly the tails that vacate in this transaction. Growing tails stay.
  for (const plan of plans)
    for (const owner of plans) {
      const occupied = owner.grows ? owner.snake.body : owner.snake.body.slice(0, -1);
      if (occupied.some((cell) => same(cell, plan.next)))
        fail(plan.snake.id, owner.snake.id === plan.snake.id ? 'body' : 'partner-body');
    }
  run.elapsedMs += stepMilliseconds(run);
  run.tick++;
  for (const plan of plans) {
    plan.snake.direction = plan.direction;
    if (plan.snake.turns.length) plan.snake.turns.shift();
  }
  if (failures.size) {
    const players = [...failures]
      .sort(([a], [b]) => a - b)
      .map(([playerId, cause]) => ({ playerId, cause, at: point(plans[playerId].next) }));
    for (const failure of players) {
      run.snakes[failure.playerId].alive = false;
      run.events.push({ type: 'snake.failed', tick: run.tick, ...failure });
    }
    finish(run, 'lost', { cause: players[0].cause, players });
    return run;
  }
  for (const plan of plans) {
    plan.snake.body.unshift(plan.next);
    if (!plan.grows) plan.snake.body.pop();
  }
  const caught = plans.find((plan) => plan.grows);
  if (caught) {
    const target = { ...run.target };
    caught.snake.catches++;
    run.catches++;
    run.score += 100;
    run.recentCatches.push({
      id: target.id,
      x: target.x,
      y: target.y,
      playerId: caught.snake.id,
      tick: run.tick,
    });
    if (run.recentCatches.length > 24) run.recentCatches.shift();
    run.events.push({
      type: 'target.caught',
      tick: run.tick,
      playerId: caught.snake.id,
      target,
      catches: run.catches,
      score: run.score,
      length: caught.snake.body.length,
    });
    if (run.catches === run.level.goal) {
      run.target = null;
      finish(run, 'won');
    } else spawnTarget(run);
  } else fleeTarget(run);
  if (run.status === 'running' && run.tick === CLASSIC_SNAKE_MAX_STEPS)
    finish(run, 'lost', { cause: 'step-limit', players: [] });
  return run;
}

export function classicSnakeSummary(run) {
  if (run?.version === CLASSIC_SNAKE_V6_CORE) return classicSnakeSummaryV6(run);
  if (run?.version === CLASSIC_SNAKE_V5_CORE) return classicSnakeSummaryV5(run);
  if (run?.version === CLASSIC_SNAKE_V4_CORE) return classicSnakeSummaryV4(run);
  if (run?.version === CLASSIC_SNAKE_V3_CORE) return classicSnakeSummaryV3(run);
  if (run?.version === CLASSIC_SNAKE_V2_CORE) return classicSnakeSummaryV2(run);
  return {
    version: run.version,
    levelId: run.level.id,
    levelIdentity: run.levelIdentity,
    mode: run.mode,
    seed: run.seed,
    tick: run.tick,
    elapsedMs: run.elapsedMs,
    status: run.status,
    catches: run.catches,
    goal: run.level.goal,
    score: run.score,
    lengths: run.snakes.map((snake) => snake.body.length),
    playerCatches: run.snakes.map((snake) => snake.catches),
    stepMs: stepMilliseconds(run),
    failure: run.failure ? structuredClone(run.failure) : null,
  };
}
const checkpoint = (run) =>
  dataIdentity({
    version: run.version,
    levelIdentity: run.levelIdentity,
    mode: run.mode,
    seed: run.seed,
    random: run.random,
    tick: run.tick,
    elapsedMs: run.elapsedMs,
    status: run.status,
    failure: run.failure,
    snakes: run.snakes,
    target: run.target,
    catches: run.catches,
    score: run.score,
    recentCatches: run.recentCatches,
    events: run.events,
  });
export function exportClassicSnakeReplay(run) {
  if (run?.version === CLASSIC_SNAKE_V6_CORE) return exportClassicSnakeReplayV6(run);
  if (run?.version === CLASSIC_SNAKE_V5_CORE) return exportClassicSnakeReplayV5(run);
  if (run?.version === CLASSIC_SNAKE_V4_CORE) return exportClassicSnakeReplayV4(run);
  if (run?.version === CLASSIC_SNAKE_V3_CORE) return exportClassicSnakeReplayV3(run);
  if (run?.version === CLASSIC_SNAKE_V2_CORE) return exportClassicSnakeReplayV2(run);
  return {
    version: CLASSIC_SNAKE_REPLAY_VERSION,
    ruleset: CLASSIC_SNAKE_CORE_VERSION,
    level: structuredClone(run.level),
    levelIdentity: run.levelIdentity,
    mode: run.mode,
    seed: run.seed,
    steps: run.tick,
    turns: structuredClone(run.history),
    checkpoint: checkpoint(run),
  };
}

/** Saves contain only an accepted recipe, turn journal and verified checkpoint.
 * No serialized body/score can become authority without reproducing the inputs. */
export function restoreClassicSnakeReplay(source, { level: expectedLevel } = {}) {
  if (source?.version === CLASSIC_SNAKE_V6_REPLAY)
    return restoreClassicSnakeReplayV6(source, { level: expectedLevel });
  if (source?.version === CLASSIC_SNAKE_V5_REPLAY)
    return restoreClassicSnakeReplayV5(source, { level: expectedLevel });
  if (source?.version === CLASSIC_SNAKE_V4_REPLAY)
    return restoreClassicSnakeReplayV4(source, { level: expectedLevel });
  if (source?.version === CLASSIC_SNAKE_V3_REPLAY)
    return restoreClassicSnakeReplayV3(source, { level: expectedLevel });
  if (source?.version === CLASSIC_SNAKE_V2_REPLAY)
    return restoreClassicSnakeReplayV2(source, { level: expectedLevel });
  const saved = boundedJSON(source, {
    maxBytes: 2 * 1024 * 1024,
    maxNodes: 80000,
    maxArray: CLASSIC_SNAKE_MAX_TURNS,
    maxDepth: 6,
  });
  exactKeys(
    saved,
    [
      'version',
      'ruleset',
      'level',
      'levelIdentity',
      'mode',
      'seed',
      'steps',
      'turns',
      'checkpoint',
    ],
    'Classic Snake replay',
  );
  required(
    saved.version === CLASSIC_SNAKE_REPLAY_VERSION && saved.ruleset === CLASSIC_SNAKE_CORE_VERSION,
    'Unsupported Classic Snake replay.',
  );
  const run = createClassicSnake(saved.level, { mode: saved.mode, seed: saved.seed });
  required(
    saved.levelIdentity === run.levelIdentity &&
      (!expectedLevel ||
        canonicalJSON(validateClassicSnakeLevel(expectedLevel)) === canonicalJSON(run.level)),
    'Classic Snake save belongs to a different level recipe.',
  );
  required(
    integer(saved.steps, 0, CLASSIC_SNAKE_MAX_STEPS) &&
      Array.isArray(saved.turns) &&
      saved.turns.length <= CLASSIC_SNAKE_MAX_TURNS &&
      typeof saved.checkpoint === 'string' &&
      /^[a-f0-9]{16}$/.test(saved.checkpoint),
    'Invalid Classic Snake replay bounds.',
  );
  let previousTick = 0;
  for (const turn of saved.turns) {
    exactKeys(turn, ['tick', 'playerId', 'direction'], 'Classic Snake recorded turn');
    required(
      integer(turn.tick, previousTick, saved.steps) &&
        integer(turn.playerId, 0, run.snakes.length - 1) &&
        Object.hasOwn(DIRECTIONS, turn.direction),
      'Invalid Classic Snake recorded turn.',
    );
    previousTick = turn.tick;
  }
  let cursor = 0;
  for (let tick = 0; tick <= saved.steps; tick++) {
    while (saved.turns[cursor]?.tick === tick) {
      const turn = saved.turns[cursor++];
      required(
        queueClassicSnakeTurn(run, turn.playerId, turn.direction),
        'Classic Snake replay contains a rejected turn.',
      );
    }
    if (tick < saved.steps) {
      required(run.status === 'running', 'Classic Snake replay continues after its result.');
      stepClassicSnake(run);
    }
  }
  required(checkpoint(run) === saved.checkpoint, 'Classic Snake replay failed exact verification.');
  return run;
}
