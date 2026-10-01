import { EPS, movingCirclesTime } from '../core/geometry.mjs';
import { validFieldCourse, steerFieldCourse } from '../core/field-course.mjs';
import { JOURNEY_POLICY, journeyPreset } from '../content-design/catalogs.mjs';
import {
  compileCoopFoundationGeometry,
  COOP_FOUNDATION_LEVEL_VERSION,
  COOP_TERRAIN_LEVEL_VERSION,
  COOP_ROVER_LEVEL_VERSION,
  COOP_BONUS_LEVEL_VERSION,
  COOP_IMPACT_LEVEL_VERSION,
  COOP_SPECIALIST_LEVEL_VERSION,
  hasTeamRoamers,
  hasTeamTerrain,
  hasTeamLineImpacts,
  hasTeamSpecialists,
  journeyTeamPackEdition,
  isJourneyTeamLevel,
  isJourneyTeamRuleset,
} from './foundations.mjs';
import {
  validateCoopTimedBonuses,
  createCoopBonusState,
  updateCoopTimedBonuses,
  coopBonusActive,
  coopBonusPlayerFactor,
  coopBonusEnemyFactor,
  clearCoopPlayerBonus,
  planCoopBonusContacts,
  collectCoopBonuses,
} from './timed-bonuses.mjs';
import { fitsClassicDomain } from '../core/classic-topology.mjs';
import {
  isCoopRoamer,
  activeCoopRoamer,
  initializeCoopRoamers,
  updateCoopRoamers,
  coopRoamerWallContact,
  reflectCoopRoamer,
} from './roamers.mjs';
import { coopTerrainSpeed, coopTerrainContact } from './terrain.mjs';
import {
  cellAt,
  positionAt,
  nextCell,
  enemyWallContact,
  playerWallContact,
  reflectEnemy,
  trailContact,
  circleFitsField,
} from './geometry.mjs';
import {
  COOP_TIMING,
  COOP_ENCOUNTER_BOUNDS,
  initializeThreats,
  updateThreatClocks,
  nextThreatDeadline,
  clearInvalidImpacts,
  seedTrailImpacts,
  planImpacts,
  advanceImpacts,
  useSupport,
  strongholdIndex,
} from './threats.mjs';

export const COOP_RULESET = 'revealline-coop.v3';
export const COOP_LEVEL_VERSION = 'revealline-coop-level.v1';
export const FIXED_DT = 1 / 120;
export const FIELD = 0;
export const SAFE = 1;
export const WALL = 2;
export const CELL = Object.freeze({ FIELD, SAFE, WALL });
const PLAYER_RADIUS = 0.18;
const DIRECTIONS = Object.freeze({
  up: { x: 0, y: -1 },
  right: { x: 1, y: 0 },
  down: { x: 0, y: 1 },
  left: { x: -1, y: 0 },
});
const DIFFICULTIES = Object.freeze({ gentle: 5, standard: 3, expert: 1 });
const finite = (value, low, high) => Number.isFinite(value) && value >= low && value <= high;
const plain = (value) =>
  value !== null && typeof value === 'object' && Object.getPrototypeOf(value) === Object.prototype;
const ownData = (value) =>
  Object.values(Object.getOwnPropertyDescriptors(value)).every((d) => Object.hasOwn(d, 'value'));
const keys = (value, allowed) =>
  plain(value) && ownData(value) && Reflect.ownKeys(value).every((key) => allowed.includes(key));
const dataArray = (value) =>
  Array.isArray(value) &&
  Object.getPrototypeOf(value) === Array.prototype &&
  ownData(value) &&
  Object.keys(value).length === value.length &&
  Reflect.ownKeys(value).length === value.length + 1 &&
  Object.keys(value).every((key, index) => key === String(index));
const identifier = (value) => typeof value === 'string' && value.length > 0 && value.length <= 100;

function buildGrid(level) {
  if (isJourneyTeamLevel(level)) return Uint8Array.from(compileCoopFoundationGeometry(level).cells);
  const cells = new Uint8Array(level.width * level.height);
  for (let y = 0; y < level.height; y++)
    for (let x = 0; x < level.width; x++)
      if (!x || !y || x === level.width - 1 || y === level.height - 1)
        cells[y * level.width + x] = SAFE;
  for (const [rectangles, kind] of [
    [level.safeRects || [], SAFE],
    [level.walls || [], WALL],
  ])
    for (const rectangle of rectangles)
      for (let y = rectangle.y; y < rectangle.y + rectangle.h; y++)
        for (let x = rectangle.x; x < rectangle.x + rectangle.w; x++)
          cells[y * level.width + x] = kind;
  return cells;
}

/** Validate before adopting content; the engine owns its copy and never changes the caller's level. */
export function validateCoopLevel(level) {
  const errors = [];
  const check = (condition, message) => {
    if (!condition) errors.push(message);
  };
  if (
    !keys(level, [
      'version',
      'id',
      'revision',
      'name',
      'width',
      'height',
      'spawns',
      'walls',
      'safeRects',
      'enemies',
      'goal',
      'rules',
      'strongholds',
      'encounter',
      'journeyDifficulty',
      'terrain',
      'timedBonuses',
      'lineImpact',
      'supportRoles',
    ])
  )
    return {
      valid: false,
      errors: ['Co-op level must be a plain data object with supported fields.'],
    };
  check(
    [
      COOP_LEVEL_VERSION,
      COOP_FOUNDATION_LEVEL_VERSION,
      COOP_TERRAIN_LEVEL_VERSION,
      COOP_ROVER_LEVEL_VERSION,
      COOP_BONUS_LEVEL_VERSION,
      COOP_IMPACT_LEVEL_VERSION,
      COOP_SPECIALIST_LEVEL_VERSION,
    ].includes(level.version),
    'Unsupported co-op level version.',
  );
  check(
    isJourneyTeamLevel(level)
      ? typeof level.journeyDifficulty === 'string' &&
          Object.hasOwn(DIFFICULTIES, level.journeyDifficulty)
      : level.journeyDifficulty === undefined,
    'Only the new Team edition pins an explicit Journey difficulty.',
  );
  check(
    hasTeamTerrain(level) ? dataArray(level.terrain) : !Object.hasOwn(level, 'terrain'),
    'Terrain requires an explicit Team terrain edition and a terrain array.',
  );
  check(
    [COOP_BONUS_LEVEL_VERSION, COOP_IMPACT_LEVEL_VERSION, COOP_SPECIALIST_LEVEL_VERSION].includes(
      level.version,
    ) || !Object.hasOwn(level, 'timedBonuses'),
    'Timed bonuses require the explicit Team bonus edition.',
  );
  check(
    !Object.hasOwn(level, 'timedBonuses') ||
      Object.getOwnPropertyDescriptor(level, 'timedBonuses').enumerable,
    'Timed bonuses must be an enumerable data field, never silently omitted by copying.',
  );
  check(
    ![COOP_BONUS_LEVEL_VERSION, COOP_IMPACT_LEVEL_VERSION, COOP_SPECIALIST_LEVEL_VERSION].includes(
      level.version,
    ) ||
      (!Object.hasOwn(level, 'strongholds') &&
        !Object.hasOwn(level, 'encounter') &&
        keys(level.goal, ['coverage']) &&
        Object.hasOwn(level.goal, 'coverage')),
    'The Team bonus edition currently qualifies coverage, keepers and roamers only.',
  );
  check(
    hasTeamLineImpacts(level)
      ? keys(level.lineImpact, ['version', 'speed']) &&
          level.lineImpact.version === 'team-line-impact.v2' &&
          finite(level.lineImpact.speed, 1, 60)
      : !Object.hasOwn(level, 'lineImpact'),
    'Travelling trail impacts require the explicit Team impact edition and bounded v2 settings.',
  );
  check(
    hasTeamSpecialists(level)
      ? dataArray(level.supportRoles) &&
          level.supportRoles.length === 2 &&
          new Set(level.supportRoles).size === 2 &&
          level.supportRoles.every((role) => ['interceptor', 'disruptor'].includes(role))
      : !Object.hasOwn(level, 'supportRoles'),
    'Specialist Team missions require one Interceptor and one Disruptor in seat order.',
  );
  check(level.width === 72 && level.height === 36, 'Co-op boards must be 72 × 36.');
  check(
    identifier(level.id) && identifier(level.name),
    'Level id and name must be nonempty strings.',
  );
  check(
    identifier(level.revision) || (Number.isInteger(level.revision) && level.revision > 0),
    'Level revision is required.',
  );
  check(
    keys(level.goal, ['coverage', 'cores']) &&
      Object.keys(level.goal).length === 1 &&
      (Object.hasOwn(level.goal, 'coverage')
        ? finite(level.goal.coverage, 0.0001, 1)
        : dataArray(level.goal.cores) &&
          level.goal.cores.length > 0 &&
          level.goal.cores.length <= 8 &&
          level.goal.cores.every(identifier) &&
          new Set(level.goal.cores).size === level.goal.cores.length),
    'Goal requires either positive coverage at most one or unique required core IDs.',
  );
  const rects = (value) =>
    dataArray(value) &&
    value.length <= 128 &&
    value.every(
      (r) =>
        keys(r, ['x', 'y', 'w', 'h']) &&
        ['x', 'y', 'w', 'h'].every((k) => Number.isInteger(r[k])) &&
        r.x >= 0 &&
        r.y >= 0 &&
        r.w > 0 &&
        r.h > 0 &&
        r.x + r.w <= 72 &&
        r.y + r.h <= 36,
    );
  check(
    level.walls === undefined || rects(level.walls),
    'Walls must be bounded integer rectangles.',
  );
  check(
    level.safeRects === undefined || rects(level.safeRects),
    'Safe areas must be bounded integer rectangles.',
  );
  check(
    dataArray(level.spawns) &&
      level.spawns.length === 2 &&
      level.spawns.every(
        (spawn) =>
          keys(spawn, ['x', 'y']) && finite(spawn.x, 0.5, 71.5) && finite(spawn.y, 0.5, 35.5),
      ),
    'Two in-board spawn points are required.',
  );
  const ids = new Set();
  check(
    dataArray(level.enemies) &&
      level.enemies.length <= 16 &&
      level.enemies.every((enemy) => {
        if (
          !keys(enemy, ['id', 'type', 'x', 'y', 'vx', 'vy', 'radius', 'course']) ||
          !validFieldCourse(enemy, 'drifter') ||
          !identifier(enemy.id) ||
          ids.has(enemy.id)
        )
          return false;
        ids.add(enemy.id);
        return (
          (enemy.type === 'drifter' ||
            (enemy.type === 'hunter' && level.version !== COOP_BONUS_LEVEL_VERSION) ||
            (hasTeamRoamers(level) && isCoopRoamer(enemy))) &&
          finite(enemy.x, 1, 71) &&
          finite(enemy.y, 1, 35) &&
          finite(enemy.vx, -20, 20) &&
          finite(enemy.vy, -20, 20) &&
          Math.hypot(enemy.vx, enemy.vy) <= 20 &&
          finite(enemy.radius, 0.01, 0.49)
        );
      }),
    'Enemies must be unique bounded drifters or Hunters; reclaimed roamers require Team level v4.',
  );
  const point = (value) =>
    keys(value, ['x', 'y']) &&
    finite(value.x, 1.5, 70.5) &&
    finite(value.y, 1.5, 34.5) &&
    Number.isInteger(value.x - 0.5) &&
    Number.isInteger(value.y - 0.5);
  const strongholdIds = new Set();
  const objectiveCells = new Set();
  check(
    level.strongholds === undefined ||
      (dataArray(level.strongholds) &&
        level.strongholds.length <= 8 &&
        level.strongholds.every((stronghold) => {
          if (
            !keys(stronghold, ['id', 'core', 'anchors']) ||
            !identifier(stronghold.id) ||
            strongholdIds.has(stronghold.id) ||
            !point(stronghold.core) ||
            !dataArray(stronghold.anchors) ||
            stronghold.anchors.length !== 2 ||
            !stronghold.anchors.every(point)
          )
            return false;
          strongholdIds.add(stronghold.id);
          for (const item of [stronghold.core, ...stronghold.anchors]) {
            const index = Math.floor(item.y) * 72 + Math.floor(item.x);
            if (objectiveCells.has(index)) return false;
            objectiveCells.add(index);
          }
          return true;
        })),
    'Strongholds require unique cores and two distinct anchors at field cell centers.',
  );
  if (keys(level.goal, ['coverage', 'cores']) && dataArray(level.goal.cores))
    check(
      level.goal.cores.every((id) => strongholdIds.has(id)),
      'Required cores must identify authored strongholds.',
    );
  check(
    level.rules === undefined ||
      (keys(level.rules, ['moveSpeed', 'boostMultiplier']) &&
        (level.rules.moveSpeed === undefined || finite(level.rules.moveSpeed, 1, 20)) &&
        (level.rules.boostMultiplier === undefined || finite(level.rules.boostMultiplier, 1, 3))),
    'Unsupported movement rules.',
  );
  check(
    level.encounter === undefined ||
      (keys(level.encounter, Object.keys(COOP_ENCOUNTER_BOUNDS)) &&
        Object.entries(level.encounter).every(([name, value]) =>
          finite(value, ...COOP_ENCOUNTER_BOUNDS[name]),
        )),
    'Encounter settings must use supported, bounded timing and attack values.',
  );
  if (errors.length) return { valid: false, errors };
  let cells;
  try {
    cells = buildGrid(level);
    if ([COOP_BONUS_LEVEL_VERSION, COOP_IMPACT_LEVEL_VERSION].includes(level.version))
      validateCoopTimedBonuses(level, compileCoopFoundationGeometry(level));
  } catch (error) {
    return { valid: false, errors: [`Invalid shared Team foundations: ${error.message}`] };
  }
  const board = { width: 72, height: 36, cells };
  check(
    board.cells.some((cell) => cell === FIELD),
    'The board needs claimable field.',
  );
  for (const spawn of level.spawns)
    check(
      board.cells[cellAt(board, spawn.x, spawn.y)] === SAFE,
      'Spawn points must be on safe ground.',
    );
  for (const enemy of level.enemies)
    check(
      isCoopRoamer(enemy)
        ? fitsClassicDomain(board, enemy, enemy.radius, FIELD) ||
            fitsClassicDomain(board, enemy, enemy.radius, SAFE)
        : circleFitsField(board, enemy),
      `Actor ${enemy.id} must fit entirely inside its movement domain.`,
    );
  for (const index of objectiveCells)
    check(board.cells[index] === FIELD, 'Core and anchors must initially occupy field.');
  // Recovery routes must not be disconnected by authored walls or isolated initial islands.
  const firstSafe = board.cells.findIndex((cell) => cell === SAFE);
  const seen = new Set(firstSafe < 0 ? [] : [firstSafe]);
  const queue = [...seen];
  for (let head = 0; head < queue.length; head++)
    for (const next of neighbors(board, queue[head]))
      if (board.cells[next] === SAFE && !seen.has(next)) {
        seen.add(next);
        queue.push(next);
      }
  if (level.version === COOP_LEVEL_VERSION)
    check(
      seen.size === board.cells.filter((cell) => cell === SAFE).length,
      'Initial safe ground must be connected.',
    );
  return { valid: !errors.length, errors };
}

function neighbors(run, index) {
  const x = index % run.width;
  const y = Math.floor(index / run.width);
  return [
    y > 0 ? index - run.width : -1,
    x + 1 < run.width ? index + 1 : -1,
    y + 1 < run.height ? index + run.width : -1,
    x > 0 ? index - 1 : -1,
  ].filter((i) => i >= 0);
}

export function createCoop(
  level,
  {
    seed = 17,
    difficulty,
    jointCuts = true,
    assistCaptures = true,
    advancedCooperation = true,
  } = {},
) {
  const validation = validateCoopLevel(level);
  if (!validation.valid) throw new TypeError(validation.errors.join(' '));
  if (difficulty === undefined)
    difficulty = isJourneyTeamLevel(level) ? level.journeyDifficulty : 'standard';
  if (
    !Number.isInteger(seed) ||
    seed < 0 ||
    seed > 0xffffffff ||
    !Object.hasOwn(DIFFICULTIES, difficulty) ||
    typeof jointCuts !== 'boolean' ||
    typeof assistCaptures !== 'boolean' ||
    typeof advancedCooperation !== 'boolean'
  )
    throw new TypeError('Invalid co-op options.');
  if (isJourneyTeamLevel(level) && difficulty !== level.journeyDifficulty)
    throw new TypeError('Team difficulty must match its compiled Journey edition.');
  const owned = structuredClone(level);
  const cells = buildGrid(owned);
  const run = {
    ruleset: isJourneyTeamLevel(owned) ? journeyTeamPackEdition(owned).ruleset : COOP_RULESET,
    level: owned,
    width: owned.width,
    height: owned.height,
    cells,
    ...(hasTeamTerrain(owned)
      ? { terrain: Uint8Array.from(compileCoopFoundationGeometry(owned).terrain) }
      : {}),
    seed,
    difficulty,
    config: { jointCuts, assistCaptures, advancedCooperation },
    rules: { moveSpeed: 8, boostMultiplier: 1.5, ...owned.rules },
    players: owned.spawns.map((spawn, id) => ({
      id,
      x: spawn.x,
      y: spawn.y,
      cellIndex: cellAt(owned, spawn.x, spawn.y),
      radius: PLAYER_RADIUS,
      direction: null,
      status: 'active',
      cutting: false,
      trail: [],
      safeAnchor: { ...spawn },
      downedUntil: null,
      blockedDirection: null,
      departureIndex: null,
      graceUntil: 0,
      downedClaimedAt: null,
      support: { readyAt: 0, held: false, uses: 0, intercepts: 0, slows: 0 },
      supportRole: owned.supportRoles?.[id] ?? 'hybrid',
      rescue: null,
      rescueBlocked: false,
      ...(hasTeamLineImpacts(owned) ? { cutId: null, nextCutId: 1, impactSources: [] } : {}),
    })),
    enemies: owned.enemies.slice().sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0)),
    strongholds: (owned.strongholds || []).map((stronghold) => ({
      ...stronghold,
      anchors: stronghold.anchors.map((anchor) => ({ ...anchor, captured: false })),
      shielded: true,
      defeated: false,
      emitter: { phase: 'idle', target: null, cellIndex: null, targetPoint: null, phaseUntil: 0.5 },
    })),
    supportEffects: [],
    ...(owned.timedBonuses ? { bonuses: createCoopBonusState(owned.timedBonuses) } : {}),
    tick: 0,
    time: 0,
    status: 'ready',
    totalClaimable: cells.filter((cell) => cell === FIELD).length,
    claimedCount: 0,
    coverage: 0,
    team: {
      // A Journey team starts with one active team life; the rest are shared
      // reserve recoveries. Historical Team reserve counts remain untouched.
      reserves: isJourneyTeamLevel(owned)
        ? journeyPreset(difficulty).lives - 1
        : DIFFICULTIES[difficulty],
      recoveryAt: null,
      captureCredits: 0,
      interceptions: 0,
      jointCuts: 0,
      rescues: 0,
    },
    events: [],
    headsTouching: false,
    needsNeutral: [false, false],
  };
  initializeThreats(run);
  if (hasTeamRoamers(owned)) initializeCoopRoamers(run);
  run.headsTouching = headsTouch(run);
  return run;
}

export function releaseCoopInputs(run) {
  for (const player of run.players) {
    player.direction = null;
    player.blockedDirection = null;
    if (player.rescue)
      emit(run, 'rescue.cancelled', {
        player: player.id,
        target: player.rescue.target,
        reason: 'input-release',
      });
    player.rescue = null;
    player.rescueBlocked = false;
    player.support.held = false;
  }
  run.needsNeutral = [true, true];
  return run;
}
export function startCoop(run) {
  if (run.status === 'ready') run.status = 'running';
  return run;
}
export function pauseCoop(run) {
  if (run.status === 'running') {
    run.status = 'paused';
    releaseCoopInputs(run);
  }
  return run;
}
export function resumeCoop(run) {
  if (run.status === 'paused') {
    run.status = 'running';
    releaseCoopInputs(run);
  }
  return run;
}

function validateCommands(commands) {
  if (
    !dataArray(commands) ||
    commands.length !== 2 ||
    !commands.every(
      (command) =>
        keys(command, ['direction', 'boost', 'support', 'steer']) &&
        (command.direction === null || Object.hasOwn(DIRECTIONS, command.direction)) &&
        typeof command.boost === 'boolean' &&
        typeof command.support === 'boolean' &&
        (command.steer === undefined || typeof command.steer === 'boolean'),
    )
  )
    throw new TypeError('Exactly two co-op direction/boost/support commands are required.');
}

function emit(run, type, data = {}) {
  run.events.push({ type, tick: run.tick, time: run.time, ...data });
}
const headsTouch = (run) =>
  Math.hypot(run.players[0].x - run.players[1].x, run.players[0].y - run.players[1].y) <=
  PLAYER_RADIUS * 2 + EPS;
const cellDescription = (run, index) => ({
  x: index % run.width,
  y: Math.floor(index / run.width),
  index,
});

function movement(run, commands, stopped) {
  return run.players.map((player, index) => {
    const command = commands[index];
    let direction = command.direction;
    if (run.needsNeutral[index]) {
      if (direction === null && !command.boost && !command.support) run.needsNeutral[index] = false;
      direction = null;
    }
    if (player.blockedDirection !== null) {
      if (direction !== player.blockedDirection) player.blockedDirection = null;
      else direction = null;
    }
    if (player.rescue || stopped.has(player.id)) direction = null;
    player.direction = direction;
    const axis = DIRECTIONS[direction] || { x: 0, y: 0 };
    const speed =
      player.status === 'downed'
        ? 3
        : run.rules.moveSpeed *
          (command.boost ? run.rules.boostMultiplier : 1) *
          coopBonusPlayerFactor(run, player) *
          coopTerrainSpeed(run, player);
    return { x: axis.x * speed, y: axis.y * speed };
  });
}

function knockDown(run, player, cause, commands, enemy = null) {
  if (player.status !== 'active') return;
  player.status = 'downed';
  clearCoopPlayerBonus(run, player);
  player.downedUntil =
    run.time +
    (isJourneyTeamRuleset(run.ruleset)
      ? JOURNEY_POLICY.rules.respawnSeconds
      : COOP_TIMING[run.difficulty].recovery);
  player.downedClaimedAt = run.claimedCount;
  if (player.rescue)
    emit(run, 'rescue.cancelled', {
      player: player.id,
      target: player.rescue.target,
      reason: 'hit',
    });
  player.rescue = null;
  player.rescueBlocked = true;
  player.graceUntil = 0;
  player.cutting = false;
  player.trail = [];
  player.departureIndex = null;
  if (hasTeamLineImpacts(run.level)) {
    player.cutId = null;
    player.impactSources = [];
  }
  player.x = player.safeAnchor.x;
  player.y = player.safeAnchor.y;
  player.cellIndex = cellAt(run, player.x, player.y);
  player.direction = null;
  player.blockedDirection = commands[player.id].direction;
  emit(run, 'player.downed', { player: player.id, cause, ...(enemy === null ? {} : { enemy }) });
  if (hasTeamLineImpacts(run.level)) clearInvalidImpacts(run, emit);
}

function revive(run, player, commands, reason = 'reserve') {
  player.status = 'active';
  player.downedUntil = null;
  player.downedClaimedAt = null;
  player.graceUntil = run.time + 2;
  player.direction = null;
  player.blockedDirection = commands[player.id].direction;
  emit(run, 'player.revived', { player: player.id, reason, graceUntil: player.graceUntil });
}

function finish(run, status) {
  if (['won', 'lost'].includes(run.status)) return;
  run.status = status;
  emit(run, 'run.completed', { status, coverage: run.coverage });
  releaseCoopInputs(run);
}

function recover(run, commands) {
  const downed = run.players.filter((player) => player.status === 'downed');
  if (downed.length === 2) {
    if (!run.team.reserves) {
      finish(run, 'lost');
      return;
    }
    run.team.reserves--;
    for (const player of downed) {
      const spawn = run.level.spawns[player.id];
      player.x = spawn.x;
      player.y = spawn.y;
      player.cellIndex = cellAt(run, spawn.x, spawn.y);
      player.safeAnchor = { ...spawn };
      revive(run, player, commands, 'team-reserve');
    }
    emit(run, 'team.recovery', { reserves: run.team.reserves });
    return;
  }
  for (const player of downed)
    if (run.time + EPS >= player.downedUntil && run.team.reserves > 0) {
      run.team.reserves--;
      revive(run, player, commands);
    }
}

function canRescue(run, player, target) {
  return (
    player.status === 'active' &&
    target?.status === 'downed' &&
    run.cells[player.cellIndex] === SAFE &&
    Math.hypot(player.x - target.x, player.y - target.y) <= 2 + EPS
  );
}

/** Held Support chooses a rescue before a pulse. Same-direction gestures remain observable via steer. */
function prepareSupport(run, commands) {
  const pulses = [];
  for (const player of run.players) {
    const command = commands[player.id];
    if (!command.support) player.rescueBlocked = false;
    if (player.rescue) {
      const target = run.players[player.rescue.target];
      if (
        !command.support ||
        command.steer ||
        command.direction !== player.rescue.direction ||
        !canRescue(run, player, target)
      ) {
        const steered = command.steer || command.direction !== player.rescue.direction;
        if (!steered) {
          player.direction = null;
          player.blockedDirection = command.direction;
        }
        emit(run, 'rescue.cancelled', {
          player: player.id,
          target: player.rescue.target,
          reason: 'input-or-position',
          requiresFreshSteering: !steered,
        });
        player.rescue = null;
        player.rescueBlocked = command.support;
      }
    }
    if (run.needsNeutral[player.id]) {
      player.support.held = command.support;
      continue;
    }
    if (player.status === 'active' && command.support && !player.rescue && !player.rescueBlocked) {
      const target = run.players.find(
        (candidate) => candidate.id !== player.id && canRescue(run, player, candidate),
      );
      if (target) {
        player.rescue = { target: target.id, startedAt: run.time, direction: command.direction };
        emit(run, 'rescue.started', { player: player.id, target: target.id });
      } else if (!player.support.held) pulses.push(player);
    }
    player.support.held = command.support;
  }
  // Simultaneous edges have spatial, not seat-number, priority for actual-effect attribution.
  pulses.sort((a, b) => a.x - b.x || a.y - b.y || a.id - b.id);
  for (const player of pulses) useSupport(run, player, emit);
}

function finishFreeRescues(run, commands, stopped) {
  for (const player of run.players) {
    if (!player.rescue) continue;
    const target = run.players[player.rescue.target];
    if (!canRescue(run, player, target)) {
      emit(run, 'rescue.cancelled', {
        player: player.id,
        target: player.rescue.target,
        reason: 'target-or-position',
        requiresFreshSteering: true,
      });
      player.rescue = null;
      player.rescueBlocked = commands[player.id].support;
      player.direction = null;
      player.blockedDirection = commands[player.id].direction;
      stopped.add(player.id);
      continue;
    }
    if (run.time + EPS < player.rescue.startedAt + 1) continue;
    revive(run, target, commands, 'contact');
    run.team.rescues++;
    emit(run, 'rescue.completed', { player: player.id, target: target.id });
    player.rescue = null;
    player.rescueBlocked = commands[player.id].support;
    player.direction = null;
    player.blockedDirection = commands[player.id].direction;
    stopped.add(player.id);
    stopped.add(target.id);
  }
}

function goalReached(run) {
  return Object.hasOwn(run.level.goal, 'coverage')
    ? run.coverage + EPS >= run.level.goal.coverage
    : run.level.goal.cores.every((id) =>
        run.strongholds.some((stronghold) => stronghold.id === id && stronghold.defeated),
      );
}

function completeRecoveryAndGoal(run, commands, stopped) {
  finishFreeRescues(run, commands, stopped);
  if (goalReached(run) && run.players.some((player) => player.status === 'active')) {
    for (const player of run.players)
      if (player.status === 'downed') revive(run, player, commands, 'victory');
    finish(run, 'won');
  } else recover(run, commands);
}

/** Enemy centers alone retain field. Friendly trails never suppress another player's fill. */
function flood(run, secured, retainedCores) {
  const retained = new Uint8Array(run.cells.length);
  const queue = [];
  for (const enemy of run.enemies) {
    if (enemy.active === false || isCoopRoamer(enemy)) continue;
    const index = cellAt(run, enemy.x, enemy.y);
    if (run.cells[index] === FIELD && !retained[index]) {
      retained[index] = 1;
      queue.push(index);
    }
  }
  for (const index of retainedCores)
    if (run.cells[index] === FIELD && !retained[index]) {
      retained[index] = 1;
      queue.push(index);
    }
  for (let head = 0; head < queue.length; head++)
    for (const index of neighbors(run, queue[head]))
      if (run.cells[index] === FIELD && !retained[index]) {
        retained[index] = 1;
        queue.push(index);
      }
  for (let index = 0; index < run.cells.length; index++)
    if (run.cells[index] === FIELD && !retained[index]) {
      run.cells[index] = SAFE;
      secured.add(index);
    }
}

/** One monotonic transaction banks every eligible prefix before its next fill. */
function capture(run, closers, commands, stopped, joint = false) {
  const secured = new Set();
  const completed = new Map();
  const retainedCores = new Set(
    run.strongholds
      .filter((stronghold) => stronghold.shielded)
      .map((stronghold) => strongholdIndex(run, stronghold.core)),
  );
  const contributions = closers.map(
    (player) =>
      new Set(
        player.trail.filter((cell) => run.cells[cell.index] === FIELD).map((cell) => cell.index),
      ).size,
  );
  const secure = (trail) => {
    for (const cell of trail)
      if (run.cells[cell.index] === FIELD && !retainedCores.has(cell.index)) {
        run.cells[cell.index] = SAFE;
        secured.add(cell.index);
      }
  };
  const complete = (player, reason) => {
    const cutId = player.cutId;
    secure(player.trail);
    player.trail = [];
    player.cutting = false;
    player.departureIndex = null;
    player.direction = null;
    player.blockedDirection = commands[player.id].direction;
    if (hasTeamLineImpacts(run.level)) {
      player.cutId = null;
      player.impactSources = [];
    }
    player.safeAnchor = {
      x: (player.cellIndex % run.width) + 0.5,
      y: Math.floor(player.cellIndex / run.width) + 0.5,
    };
    stopped.add(player.id);
    completed.set(player.id, { reason, cutId });
  };
  for (const player of closers) complete(player, joint ? 'joint' : 'return');
  flood(run, secured, retainedCores);
  for (let iteration = 0; iteration <= run.cells.length; iteration++) {
    let changed = false;
    const prefixes = [];
    const assistedClosers = [];
    for (const player of run.players) {
      if (player.status !== 'active' || !player.cutting) continue;
      if (run.cells[player.cellIndex] === SAFE) {
        assistedClosers.push(player);
        changed = true;
        continue;
      }
      let lastSafe = -1;
      for (let i = 0; i < player.trail.length; i++)
        if (run.cells[player.trail[i].index] === SAFE) lastSafe = i;
      if (lastSafe < 0) continue;
      const anchor = player.trail[lastSafe];
      if (run.config.assistCaptures) prefixes.push(player.trail.slice(0, lastSafe + 1));
      player.trail = player.trail.slice(lastSafe + 1);
      player.safeAnchor = { x: anchor.x + 0.5, y: anchor.y + 0.5 };
      player.departureIndex = anchor.index;
      changed = true;
      emit(run, 'trail.anchored', { player: player.id, index: anchor.index });
    }
    for (const prefix of prefixes) secure(prefix);
    for (const player of assistedClosers) complete(player, 'assist');
    if (!changed) break;
    flood(run, secured, retainedCores);
    if (iteration === run.cells.length) throw new Error('Co-op capture failed to converge.');
  }
  run.claimedCount += secured.size;
  run.coverage = run.claimedCount / run.totalClaimable;
  for (const enemy of run.enemies)
    if (
      enemy.active !== false &&
      enemy.type === 'hunter' &&
      enemy.phase !== 'commit' &&
      run.cells[cellAt(run, enemy.x, enemy.y)] === SAFE
    ) {
      enemy.active = false;
      enemy.vx = enemy.vy = 0;
      emit(run, 'enemy.defeated', { enemy: enemy.id, cause: 'captured' });
    }
  let requiredObjective = false;
  for (const stronghold of run.strongholds) {
    const required = run.level.goal.cores?.includes(stronghold.id) === true;
    for (const [anchorIndex, anchor] of stronghold.anchors.entries())
      if (!anchor.captured && run.cells[strongholdIndex(run, anchor)] === SAFE) {
        anchor.captured = true;
        requiredObjective ||= required;
        emit(run, 'objective.captured', {
          stronghold: stronghold.id,
          kind: 'anchor',
          anchor: anchorIndex,
          required,
        });
      }
    if (stronghold.shielded && stronghold.anchors.every((anchor) => anchor.captured)) {
      stronghold.shielded = false;
      emit(run, 'shield.disabled', { stronghold: stronghold.id });
    }
    if (
      !stronghold.defeated &&
      !retainedCores.has(strongholdIndex(run, stronghold.core)) &&
      run.cells[strongholdIndex(run, stronghold.core)] === SAFE
    ) {
      stronghold.defeated = true;
      stronghold.emitter.phase = 'disabled';
      requiredObjective ||= required;
      emit(run, 'objective.captured', { stronghold: stronghold.id, kind: 'core', required });
      emit(run, 'core.defeated', { stronghold: stronghold.id });
    }
  }
  const credits = Math.floor((run.claimedCount * 50 + EPS) / run.totalClaimable);
  const earned = credits - run.team.captureCredits;
  run.team.captureCredits = credits;
  if (run.config.advancedCooperation && earned > 0) {
    for (const player of run.players)
      player.support.readyAt = Math.max(run.time, player.support.readyAt - earned * 2);
    emit(run, 'support.recharged', { credits: earned });
  }
  if (run.config.advancedCooperation)
    for (const player of run.players)
      if (
        player.status === 'downed' &&
        (requiredObjective ||
          (run.claimedCount - player.downedClaimedAt) * 50 + EPS >= run.totalClaimable)
      ) {
        revive(run, player, commands, requiredObjective ? 'objective' : 'capture');
        run.team.rescues++;
        stopped.add(player.id);
      }
  emit(run, 'cells.claimed', {
    indices: [...secured].sort((a, b) => a - b),
    cells: secured.size,
    coverage: run.coverage,
  });
  for (const [player, completedCut] of [...completed].sort((a, b) => a[0] - b[0]))
    emit(run, 'cut.closed', {
      player,
      reason: completedCut.reason,
      cells: secured.size,
      ...(Number.isInteger(completedCut.cutId) ? { cutId: completedCut.cutId } : {}),
    });
  if (joint) {
    const meaningful =
      secured.size * 50 + EPS >= run.totalClaimable && contributions.every((count) => count >= 4);
    if (meaningful) run.team.jointCuts++;
    emit(run, 'cut.joint', {
      players: closers.map((player) => player.id).sort(),
      cells: secured.size,
      meaningful,
    });
  }
  clearInvalidImpacts(run, emit);
}

function hazards(run, velocities, horizon, actors = run.enemies) {
  const contacts = [];
  for (const player of run.players) {
    const material = coopTerrainContact(run, player, velocities[player.id], horizon);
    if (material) contacts.push(material);
    if (player.status !== 'active' || player.graceUntil > run.time + EPS) continue;
    if (coopBonusActive(run, 'enemy-freeze')) continue;
    for (const enemy of actors) {
      if (enemy.active === false) continue;
      if (isCoopRoamer(enemy) ? !activeCoopRoamer(enemy) : !player.cutting) continue;
      if (enemy.type === 'hunter' && enemy.phase !== 'commit') continue;
      const sourceHandled =
        hasTeamLineImpacts(run.level) && player.impactSources?.includes(`enemy:${enemy.id}`);
      const time = sourceHandled ? null : trailContact(run, enemy, player.trail, horizon);
      if (time !== null)
        contacts.push({ time, player: player.id, enemy: enemy.id, cause: 'enemy-trail' });
      const fraction = movingCirclesTime(
        player,
        positionAt(player, velocities[player.id], horizon),
        enemy,
        positionAt(enemy, { x: enemy.vx, y: enemy.vy }, horizon),
        PLAYER_RADIUS + enemy.radius,
      );
      if (fraction !== null)
        contacts.push({
          time: fraction * horizon,
          player: player.id,
          enemy: enemy.id,
          cause: 'enemy-player',
        });
    }
  }
  return contacts.sort(
    (a, b) =>
      a.time - b.time ||
      a.player - b.player ||
      (a.enemy < b.enemy ? -1 : a.enemy > b.enemy ? 1 : 0) ||
      (a.cause < b.cause ? -1 : 1),
  );
}

/** A shared event clock resolves swept hazards before closures, including exact-time ties. */
export function stepCoop(run, commands, dt = FIXED_DT) {
  if (dt !== FIXED_DT) throw new TypeError('Co-op advances exactly one 120 Hz tick per step.');
  validateCommands(commands);
  if (run.status !== 'running') return run;
  run.events = [];
  if (run.roverActorTick !== undefined) {
    if (!coopBonusActive(run, 'enemy-freeze')) run.roverActorTick++;
    updateCoopRoamers(run, emit);
  }
  const tickStart = run.tick * FIXED_DT;
  const tickEnd = (run.tick + 1) * FIXED_DT;
  run.time = tickStart;
  updateCoopTimedBonuses(run);
  const stopped = new Set();
  updateThreatClocks(run, emit, {
    suppressImpacts: coopBonusActive(run, 'enemy-freeze'),
  });
  clearInvalidImpacts(run, emit);
  run.supportEffects = run.supportEffects.filter((effect) => effect.until > run.time);
  prepareSupport(run, commands);
  if (!coopBonusActive(run, 'enemy-freeze'))
    for (const enemy of run.enemies)
      if (enemy.active !== false) steerFieldCourse(enemy, run.seed, run.tick);
  let iterations = 0;
  while (run.time < tickEnd - EPS && run.status === 'running') {
    if (++iterations > 128) throw new Error('Co-op movement failed to advance.');
    updateThreatClocks(run, emit, {
      suppressImpacts: coopBonusActive(run, 'enemy-freeze'),
    });
    clearInvalidImpacts(run, emit);
    const horizon = tickEnd - run.time;
    const velocities = movement(run, commands, stopped);
    const actors = run.bonuses
      ? run.enemies.map((enemy) => {
          const factor = coopBonusEnemyFactor(run, enemy);
          return { ...enemy, vx: enemy.vx * factor, vy: enemy.vy * factor };
        })
      : run.enemies;
    const transitions = run.players.map((player, index) =>
      nextCell(run, player, velocities[index], horizon),
    );
    const obstacles = run.players.map((player, index) =>
      playerWallContact(run, player, velocities[index], horizon),
    );
    const walls = actors.map((enemy) =>
      enemy.active === false
        ? null
        : isCoopRoamer(enemy)
          ? coopRoamerWallContact(run, enemy, horizon)
          : enemyWallContact(run, enemy, horizon),
    );
    const contacts = hazards(run, velocities, horizon, actors);
    const bonusContacts = planCoopBonusContacts(run, velocities, horizon);
    const impactPlans = planImpacts(run, velocities, horizon);
    if (!headsTouch(run)) run.headsTouching = false;
    const meeting = run.headsTouching
      ? null
      : movingCirclesTime(
          run.players[0],
          positionAt(run.players[0], velocities[0], horizon),
          run.players[1],
          positionAt(run.players[1], velocities[1], horizon),
          PLAYER_RADIUS * 2,
        );
    const meetingTime = meeting === null ? null : meeting * horizon;
    const deadlines = [
      nextThreatDeadline(run),
      ...run.players
        .filter((player) => player.status === 'downed' && run.team.reserves > 0)
        .map((player) => player.downedUntil),
      ...run.players.filter((player) => player.rescue).map((player) => player.rescue.startedAt + 1),
    ];
    let elapsed = horizon;
    for (const event of [...transitions, ...obstacles, ...walls, ...contacts, ...bonusContacts])
      if (event) elapsed = Math.min(elapsed, event.time);
    for (const plan of impactPlans) elapsed = Math.min(elapsed, plan.waypointAt, plan.contactAt);
    if (meetingTime !== null) elapsed = Math.min(elapsed, meetingTime);
    for (const deadline of deadlines) elapsed = Math.min(elapsed, Math.max(0, deadline - run.time));
    const due = (time) => time !== null && time <= elapsed + EPS;
    for (const player of run.players) {
      const next = positionAt(player, velocities[player.id], elapsed);
      player.x = next.x;
      player.y = next.y;
    }
    for (const [index, enemy] of run.enemies.entries()) {
      if (enemy.active === false) continue;
      enemy.x += actors[index].vx * elapsed;
      enemy.y += actors[index].vy * elapsed;
    }
    const expiredImpacts = advanceImpacts(impactPlans, elapsed);
    run.time += elapsed;
    if (expiredImpacts.length) {
      const expiredIds = new Set(expiredImpacts.map((impact) => impact.id));
      run.impacts = run.impacts.filter((impact) => !expiredIds.has(impact.id));
      for (const impact of expiredImpacts)
        emit(run, 'impact.ended', {
          impact: impact.id,
          owner: impact.owner,
          player: impact.player,
          cutId: impact.cutId,
          reason: 'departure',
        });
    }
    // Half-open attack phases change before contacts exactly at their boundary.
    updateThreatClocks(run, emit, {
      suppressImpacts: coopBonusActive(run, 'enemy-freeze'),
    });
    for (const player of run.players)
      if (obstacles[player.id] && due(obstacles[player.id].time)) {
        stopped.add(player.id);
        player.direction = null;
      }
    const closers = [];
    const selfHits = [];
    for (const player of run.players) {
      const transition = transitions[player.id];
      if (!transition || !due(transition.time)) continue;
      const index = transition.index;
      if (
        index < 0 ||
        run.cells[index] === WALL ||
        (player.status === 'downed' && run.cells[index] !== SAFE) ||
        run.strongholds.some(
          (stronghold) => stronghold.shielded && strongholdIndex(run, stronghold.core) === index,
        )
      ) {
        stopped.add(player.id);
        player.direction = null;
        continue;
      }
      const previous = player.cellIndex;
      player.cellIndex = index;
      if (run.cells[index] === SAFE) {
        if (player.cutting) closers.push(player);
        else
          player.safeAnchor = {
            x: (index % run.width) + 0.5,
            y: Math.floor(index / run.width) + 0.5,
          };
      } else {
        player.graceUntil = 0;
        if (!player.cutting) {
          player.cutting = true;
          player.departureIndex = previous;
          if (hasTeamLineImpacts(run.level)) {
            player.cutId = player.nextCutId++;
            player.impactSources = [];
          }
          emit(run, 'cut.started', {
            player: player.id,
            ...(Number.isInteger(player.cutId) ? { cutId: player.cutId } : {}),
          });
        }
        if (player.trail.some((cell) => cell.index === index)) selfHits.push(player);
        else player.trail.push(cellDescription(run, index));
      }
    }
    // Freshly entered trail cells participate in this same instant before either player can bank.
    // Positions changed; use current positions with the same effective velocities.
    const instantActors = run.bonuses
      ? run.enemies.map((enemy, index) => ({
          ...enemy,
          vx: actors[index].vx,
          vy: actors[index].vy,
        }))
      : run.enemies;
    const instantContacts = hazards(run, velocities, 0, instantActors);
    const hits = [...contacts.filter((contact) => due(contact.time)), ...instantContacts];
    for (const player of selfHits) knockDown(run, player, 'self-trail', commands);
    for (const contact of hits)
      if (contact.cause === 'lethal-terrain')
        knockDown(run, run.players[contact.player], contact.cause, commands);
      else if (
        run.enemies.some(
          (enemy) =>
            enemy.id === contact.enemy &&
            enemy.active !== false &&
            (enemy.type !== 'hunter' || enemy.phase === 'commit'),
        )
      ) {
        const player = run.players[contact.player];
        if (contact.cause === 'enemy-trail' && hasTeamLineImpacts(run.level)) {
          const enemy = run.enemies.find((actor) => actor.id === contact.enemy);
          const cell = player.trail.reduce((nearest, candidate) => {
            const distance = Math.hypot(candidate.x + 0.5 - enemy.x, candidate.y + 0.5 - enemy.y);
            return !nearest || distance < nearest.distance ? { candidate, distance } : nearest;
          }, null)?.candidate;
          if (cell)
            seedTrailImpacts(
              run,
              { owner: enemy.id, source: 'enemy', player: player.id, cellIndex: cell.index },
              emit,
            );
        } else knockDown(run, player, contact.cause, commands, contact.enemy);
      }
    const impactHits = new Map(
      impactPlans
        .filter((plan) => due(plan.contactAt))
        .map((plan) => [plan.impact.id, plan.impact]),
    );
    for (const impact of run.impacts) {
      const player = run.players[impact.player];
      if (
        player?.status === 'active' &&
        player.cutting &&
        (impact.direction ?? 1) > 0 &&
        Math.hypot(impact.x - player.x, impact.y - player.y) <= 0.3 + EPS
      )
        impactHits.set(impact.id, impact);
    }
    const deferredImpactHits = [];
    for (const impact of impactHits.values()) {
      if (impact.version === 'team-line-impact.v2') {
        deferredImpactHits.push(impact);
        continue;
      }
      const player = run.players[impact.player];
      if (player.graceUntil <= run.time + EPS)
        knockDown(run, player, 'line-impact', commands, impact.owner);
      run.impacts = run.impacts.filter((candidate) => candidate.id !== impact.id);
    }
    collectCoopBonuses(run, bonusContacts, elapsed, emit);
    for (let i = 0; i < walls.length; i++)
      if (walls[i] && due(walls[i].time)) {
        if (walls[i].rover) reflectCoopRoamer(run.enemies[i], walls[i]);
        else reflectEnemy(run.enemies[i], walls[i].normals, run.seed);
      }
    const newMeeting = meetingTime !== null && due(meetingTime);
    if (newMeeting) run.headsTouching = true;
    const joint =
      newMeeting &&
      run.config.jointCuts &&
      run.players.every((player) => player.status === 'active' && player.cutting);
    const surviving = joint ? run.players : closers.filter((player) => player.status === 'active');
    if (surviving.length) capture(run, surviving, commands, stopped, joint);
    for (const impact of deferredImpactHits) {
      if (!run.impacts.some((candidate) => candidate.id === impact.id)) continue;
      const player = run.players[impact.player];
      if (
        player?.status === 'active' &&
        player.cutting &&
        player.cutId === impact.cutId &&
        player.graceUntil <= run.time + EPS
      )
        knockDown(run, player, 'line-impact', commands, impact.owner);
      run.impacts = run.impacts.filter((candidate) => candidate.id !== impact.id);
    }
    if (run.roverActorTick !== undefined) updateCoopRoamers(run, emit);
    completeRecoveryAndGoal(run, commands, stopped);
  }
  run.tick++;
  run.time = run.tick * FIXED_DT;
  run.headsTouching = headsTouch(run);
  return run;
}

export function getCoopSummary(run) {
  return {
    ruleset: run.ruleset,
    levelId: run.level.id,
    levelRevision: run.level.revision,
    status: run.status,
    tick: run.tick,
    time: run.time,
    seed: run.seed,
    difficulty: run.difficulty,
    config: { ...run.config },
    coverage: run.coverage,
    goal: run.level.goal.coverage ?? null,
    requiredCores: [...(run.level.goal.cores || [])],
    strongholds: run.strongholds.map((stronghold) => ({
      id: stronghold.id,
      shielded: stronghold.shielded,
      defeated: stronghold.defeated,
      anchors: stronghold.anchors.filter((anchor) => anchor.captured).length,
    })),
    claimedCount: run.claimedCount,
    totalClaimable: run.totalClaimable,
    reserves: run.team.reserves,
    teamwork: {
      interceptions: run.team.interceptions,
      jointCuts: run.team.jointCuts,
      rescues: run.team.rescues,
    },
    players: run.players.map((player) => ({
      id: player.id,
      status: player.status,
      cutting: player.cutting,
      trailCells: player.trail.length,
      x: player.x,
      y: player.y,
      downedUntil: player.downedUntil,
      graceUntil: player.graceUntil,
      supportCooldown: Math.max(0, player.support.readyAt - run.time),
      supportRole: player.supportRole,
      rescue: player.rescue
        ? {
            target: player.rescue.target,
            progress: Math.min(1, run.time - player.rescue.startedAt),
          }
        : null,
    })),
  };
}
