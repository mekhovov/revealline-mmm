import { clearLineImpacts } from './line-impact.mjs';
import {
  CELL,
  CLASSES,
  DIRECTIONS,
  FIXED_DT,
  MAX_CLASS_HISTORY,
  RULESET,
  TURN_POLICIES,
  validateClassRecipes,
  loadoutHash,
  rosterHash,
} from './registry.mjs';
import { normalizedLevel, validateLevel } from './level.mjs';
import { EPS, clamp, geometryForLevel, geometryForRun } from './geometry.mjs';
import {
  planPlayer,
  planEnemy,
  positionAt,
  applyPlannedEnemy,
  patrolDistance,
} from './movement.mjs';
import {
  tracePlan,
  selfContact,
  appendTrail,
  commitCapture,
  releaseIsolatedCapture,
} from './capture.mjs';
import { versionsForLevel } from './versions.mjs';
import { createEncounter, updateEncounter, canReleaseIsolated } from './encounter.mjs';
import { enemyContact } from './contacts.mjs';
import { updateAbilities, useAbilities } from './abilities.mjs';
import { createAbility, switchClass, updateSignal, challengeContact } from './systems.mjs';
import { createClassicState } from './classic-state.mjs';
import { clearCombatPatrols } from './combat-patrols.mjs';
import { initializeClassicActors, stepClassic } from './classic-step.mjs';
import { steerFieldCourse } from './field-course.mjs';
import { foundationGeometry } from './foundations.mjs';
import { createRelayState } from './relay-gates.mjs';
export {
  validateLevel,
  validateClassRecipes,
  loadoutHash,
  rosterHash,
  CELL,
  CLASSES,
  DIRECTIONS,
  FIXED_DT,
  MAX_CLASS_HISTORY,
  RULESET,
  TURN_POLICIES,
  geometryForLevel,
  geometryForRun,
};

/**
 * Owns one mutable deterministic run. Rendering may READ public fields; mutation
 * outside this module invalidates replay guarantees. No DOM, art or clock reads.
 * @param {object} source validated xonix-level.v1 through v7
 * @param {{seed?:number,turnPolicy?:'immediate'|'grid-center',classId?:string,classRecipes?:object[]}} options
 */
export function createRun(
  source,
  { seed = 1, turnPolicy = 'immediate', classId = 'scout', classRecipes = CLASSES } = {},
) {
  const level = normalizedLevel(source);
  const geometry = geometryForLevel(level),
    { width, height } = geometry;
  if (!Number.isInteger(seed) || seed < 0 || seed > 0xffffffff)
    throw new TypeError('seed must be a uint32');
  if (!TURN_POLICIES.includes(turnPolicy)) throw new TypeError('unsupported turnPolicy');
  const validation = validateClassRecipes(classRecipes);
  if (!validation.valid)
    throw new TypeError(`Invalid classRecipes: ${validation.errors.join('; ')}`);
  const recipe = classRecipes.find((c) => c.id === classId);
  if (!recipe) throw new TypeError('unsupported classId');
  const cells = new Uint8Array(geometry.cellCount);
  for (let y = 0; y < height; y++)
    for (let x = 0; x < width; x++)
      if (x === 0 || x === width - 1 || y === 0 || y === height - 1)
        cells[y * width + x] = CELL.SAFE;
  for (const w of level.walls)
    for (let y = w.y; y < w.y + w.h; y++)
      for (let x = w.x; x < w.x + w.w; x++) cells[y * width + x] = CELL.WALL;
  const foundations = [
    'xonix-level.v5',
    'xonix-level.v6',
    'xonix-level.v7',
    'xonix-level.v8',
  ].includes(level.version)
    ? foundationGeometry(level)
    : null;
  if (foundations) cells.set(foundations.cells);
  const totalClaimable = cells.filter((c) => c === CELL.FIELD).length;
  const state = {
    ruleset: versionsForLevel(level).ruleset,
    levelId: level.id,
    revision: level.revision,
    seed,
    turnPolicy,
    classId,
    activeClassId: classId,
    rosterHash: rosterHash(classRecipes),
    classRecipes: structuredClone(classRecipes),
    classHistory: [
      { classId, classRevision: recipe.revision, loadoutHash: loadoutHash(recipe), tick: 0 },
    ],
    switchCooldownUntil: 0,
    cutStartedAt: null,
    failureCause: null,
    classRevision: recipe.revision,
    loadoutHash: loadoutHash(recipe),
    level,
    rules: level.rules,
    width,
    height,
    status: 'running',
    tick: 0,
    time: 0,
    lives: level.rules.lives,
    score: 0,
    coverage: 0,
    claimedCount: 0,
    totalClaimable,
    cells,
    player: {
      ...level.spawn,
      direction: 'down',
      queuedDirection: null,
      speed: 0,
      cutting: false,
      graceUntil: 0,
    },
    trail: [],
    trailSegments: [],
    enemies: level.enemies.map((e) => ({
      ...e,
      radius: e.radius ?? 0.25,
      stunnedUntil: 0,
      slowUntil: 0,
      slowFactor: 1,
      ...(e.type === 'border-patrol' ? { perimeter: patrolDistance(e, geometry) } : {}),
      ...(e.type === 'lane-boss'
        ? {
            bossPhase: 'idle',
            lane: e.axis === 'horizontal' ? e.y : e.x,
            nextWarningAt: 2,
            warningUntil: 0,
            activeUntil: 0,
          }
        : {}),
    })),
    objectives: level.objectives.map((p) => ({
      ...p,
      required: !!p.required,
      captured: false,
      revealed: !p.hidden,
    })),
    supplies: level.supplies.map((p) => ({ ...p, radius: p.radius ?? 1.5 })),
    classRecipe: { ...recipe },
    ability: createAbility(recipe),
    _loadouts: Object.create(null),
    signalZones: level.signalZones.map((z) => ({ ...z, suppressedUntil: 0 })),
    hangars: level.hangars.map((h) => ({ ...h, radius: h.radius ?? 2 })),
    signal: null,
    events: [],
    respawnAt: 0,
    medal: null,
    result: null,
    _accumulator: 0,
    _input: { action: false, pickup: false, switchClass: null },
    _abilitySerial: 0,
    _terminalEmitted: false,
  };
  if (
    [
      'xonix-level.v2',
      'xonix-level.v3',
      'xonix-level.v4',
      'xonix-level.v5',
      'xonix-level.v6',
      'xonix-level.v7',
      'xonix-level.v8',
    ].includes(level.version)
  )
    state.encounter = level.encounter === null ? null : createEncounter(level.encounter);
  if (foundations)
    state.foundation = {
      version: 'foundation-state.v1',
      permanent: Uint8Array.from(foundations.permanent),
    };
  if (['xonix-level.v6', 'xonix-level.v7', 'xonix-level.v8'].includes(level.version))
    state.relay = createRelayState(level, foundations);
  if (
    [
      'xonix-level.v4',
      'xonix-level.v5',
      'xonix-level.v6',
      'xonix-level.v7',
      'xonix-level.v8',
    ].includes(level.version)
  ) {
    state.classic = createClassicState(level, cells);
    initializeClassicActors(state);
  }
  state._loadouts[classId] = state.ability;
  updateSignal(state);
  return state;
}

/** Explicit shell pause/focus-loss hook. It neither advances time nor resets a run. */
export function releaseInputs(state) {
  state._input = { action: false, pickup: false, switchClass: null };
  state.player.queuedDirection = null;
  state.player.speed = 0;
}

function complete(state, won) {
  if (state._terminalEmitted) return;
  clearLineImpacts(state, 'completed');
  clearCombatPatrols(state, 'completed');
  state.status = won ? 'won' : 'lost';
  state._terminalEmitted = true;
  releaseInputs(state);
  state.medal = won
    ? state.time <= state.rules.timeMedals[0] + EPS &&
      (state.classic ? state.classic.livesLost === 0 : state.lives === state.rules.lives)
      ? 'gold'
      : state.time <= state.rules.timeMedals[1] + EPS
        ? 'silver'
        : 'bronze'
    : null;
  state.result = getSummary(state);
  state.events.push({ type: 'run.completed', tick: state.tick, time: state.time, ...state.result });
}

function recover(state, contact) {
  clearLineImpacts(state, 'recovery');
  clearCombatPatrols(state, 'recovery');
  state.failureCause = contact.kind;
  const absorbed =
    ![
      'self-contact',
      'cut-timeout',
      'cable-limit',
      ...(state.classic ? ['lethal-terrain'] : []),
    ].includes(contact.kind) && state.ability.shieldUntil > state.time + EPS;
  state.trail = [];
  state.trailSegments = [];
  state.player.cutting = false;
  state.cutStartedAt = null;
  state.player.speed = 0;
  state.player.queuedDirection = null;
  state.ability.fields = [];
  state.ability.shieldUntil = 0;
  if (!absorbed) state.lives--;
  if (state.classic) {
    if (!absorbed) state.classic.livesLost++;
    state.classic.effects['player-speed'] = { from: 0, until: 0 };
    state.classic.departure = null;
  }
  state.events.push({
    type: absorbed ? 'shield.absorbed' : 'player.failed',
    tick: state.tick,
    time: state.time,
    cause: contact.kind,
    actorId: contact.id,
    lives: state.lives,
  });
  if (state.lives <= 0 && !state.classic) {
    complete(state, false);
    return;
  }
  state.status = 'respawning';
  state.respawnAt = state.time + state.rules.respawnSeconds;
}

function updateBosses(state) {
  const clock = state.classic ? state.classic.actorTime : state.time;
  for (const e of state.enemies)
    if (e.type === 'lane-boss') {
      if (clock + EPS >= e.nextWarningAt) {
        e.lane = clamp(
          Math.floor(e.axis === 'horizontal' ? state.player.y : state.player.x) + 0.5,
          1.5,
          e.axis === 'horizontal' ? state.height - 1.5 : state.width - 1.5,
        );
        e.warningUntil = clock + (e.warningSeconds ?? 1.5);
        e.activeUntil = e.warningUntil + (e.activeSeconds ?? 0.7);
        e.nextWarningAt = clock + (e.period ?? 6);
        state.events.push({
          type: 'boss.warning',
          tick: state.tick,
          time: state.time,
          id: e.id,
          axis: e.axis,
          lane: e.lane,
          activeAt: e.warningUntil,
        });
      }
      e.bossPhase =
        clock < e.warningUntil - EPS ? 'warning' : clock < e.activeUntil - EPS ? 'active' : 'idle';
    }
}

function worldStep(state, input, duration) {
  let remaining = duration;
  for (let guard = 0; remaining > EPS && guard < 6 && state.status === 'running'; guard++) {
    const playerPlan = planPlayer(state, input, remaining),
      trace = tracePlan(state, playerPlan.paths, remaining);
    const horizon = Math.min(remaining, trace.closure ?? Infinity, trace.stop ?? Infinity);
    const enemyPlans = state.enemies.map((e) => planEnemy(state, e, remaining));
    const self = selfContact(state, trace, horizon),
      contact = enemyContact(state, playerPlan.paths, enemyPlans, trace, horizon);
    let failure = contact;
    const challenge = challengeContact(state, trace, horizon);
    if (challenge && (!failure || challenge.time <= failure.time + EPS)) failure = challenge;
    if (
      self !== null &&
      (!failure ||
        self < failure.time - EPS ||
        (self <= failure.time + EPS && failure.kind !== 'mission-timeout'))
    )
      failure = { time: self, kind: 'self-contact', id: 'player' };
    const elapsed = failure ? Math.min(horizon, failure.time) : horizon;
    const position = positionAt(playerPlan.paths, elapsed, state.player);
    const activePath =
      playerPlan.paths.find((p) => p.t1 >= elapsed - EPS) ?? playerPlan.paths.at(-1);
    appendTrail(state, trace, elapsed);
    if (elapsed >= remaining - EPS)
      Object.assign(state.player, playerPlan.player, { cutting: state.player.cutting });
    else {
      state.player.x = position.x;
      state.player.y = position.y;
      state.player.direction = activePath?.direction ?? state.player.direction;
      state.player.queuedDirection = playerPlan.player.queuedDirection;
    }
    state.player.x = position.x;
    state.player.y = position.y;
    for (let i = 0; i < state.enemies.length; i++)
      applyPlannedEnemy(state.enemies[i], enemyPlans[i], elapsed, remaining, state);
    state.time += elapsed;
    remaining -= elapsed;
    if (failure && failure.time <= horizon + EPS) {
      if (failure.kind === 'mission-timeout') {
        state.failureCause = failure.kind;
        complete(state, false);
      } else recover(state, failure);
      break;
    }
    if (trace.closure !== null && trace.closure <= horizon + EPS) {
      commitCapture(state);
      if (
        state.coverage + EPS >= state.level.goal.coverage &&
        state.objectives.every((o) => !o.required || o.captured) &&
        (!state.encounter || state.encounter.defeated)
      ) {
        complete(state, true);
        break;
      }
      continue;
    }
    if (trace.stop !== null && trace.stop <= horizon + EPS) {
      state.player.speed = 0;
      // Grace blocks leaving safe territory; actors and the mission clock still advance.
      const rest =
        state.rules.timeLimitSeconds > 0
          ? Math.min(remaining, Math.max(0, state.rules.timeLimitSeconds - state.time))
          : remaining;
      const restPlans = state.enemies.map((e) => planEnemy(state, e, rest));
      for (let i = 0; i < state.enemies.length; i++)
        applyPlannedEnemy(state.enemies[i], restPlans[i], rest, rest, state);
      state.time += rest;
      remaining = 0;
      if (state.rules.timeLimitSeconds > 0 && state.time + EPS >= state.rules.timeLimitSeconds) {
        state.failureCause = 'mission-timeout';
        complete(state, false);
      }
      break;
    }
    break;
  }
  // A contact resolves partway through a tick. Recovery time still starts at
  // its exact contact timestamp; the rest of this fixed interval is elapsed.
  if (remaining > EPS && state.status === 'respawning') {
    const plans = state.enemies.map((e) => planEnemy(state, e, remaining));
    for (let i = 0; i < state.enemies.length; i++)
      applyPlannedEnemy(state.enemies[i], plans[i], remaining, remaining, state);
    state.time += remaining;
  }
}

function fixedStep(state, input) {
  if (state.classic) return stepClassic(state, input, { complete, recover, updateBosses });
  state.tick++;
  const endTime = state.time + FIXED_DT;
  updateBosses(state);
  updateEncounter(state);
  updateAbilities(state);
  if (input.switchClass && input.switchClass !== state._input.switchClass)
    switchClass(state, input.switchClass);
  updateSignal(state);
  useAbilities(state, input);
  for (const enemy of state.enemies)
    if (!(enemy.stunnedUntil > state.time + EPS))
      steerFieldCourse(enemy, state.seed, state.tick - 1);
  if (state.status === 'respawning') {
    if (state.rules.timeLimitSeconds > 0 && endTime + EPS >= state.rules.timeLimitSeconds) {
      state.time = state.rules.timeLimitSeconds;
      state.failureCause = 'mission-timeout';
      complete(state, false);
      return;
    }
    const plans = state.enemies.map((e) => planEnemy(state, e, FIXED_DT));
    for (let i = 0; i < state.enemies.length; i++)
      applyPlannedEnemy(state.enemies[i], plans[i], FIXED_DT, FIXED_DT, state);
    state.time = endTime;
    if (state.time + EPS >= state.respawnAt) {
      Object.assign(state.player, state.level.spawn, {
        direction: 'down',
        queuedDirection: null,
        speed: 0,
        cutting: false,
        graceUntil: state.time + state.rules.graceSeconds,
      });
      state.status = 'running';
      state.events.push({ type: 'player.respawned', tick: state.tick, time: state.time });
    }
    return;
  }
  worldStep(state, input, FIXED_DT);
  updateSignal(state);
  if (state.status !== 'won' && state.status !== 'lost') state.time = endTime;
  // Only a normal running world tick may isolate; recovery/respawn returned above.
  if (canReleaseIsolated(state)) {
    releaseIsolatedCapture(state);
    if (
      state.coverage + EPS >= state.level.goal.coverage &&
      state.objectives.every((o) => !o.required || o.captured)
    )
      complete(state, true);
  }
}

function normalizedInput(input) {
  if (input === undefined) input = {};
  if (input === null || typeof input !== 'object') throw new TypeError('input must be an object');
  const direction = input.direction ?? null;
  if (direction !== null && !Object.hasOwn(DIRECTIONS, direction))
    throw new TypeError('invalid cardinal direction');
  for (const key of ['boost', 'action', 'pickup'])
    if (input[key] !== undefined && typeof input[key] !== 'boolean')
      throw new TypeError(`${key} must be boolean`);
  const switchClass = input.switchClass ?? null;
  if (
    switchClass !== null &&
    (typeof switchClass !== 'string' || !/^[a-zA-Z0-9][a-zA-Z0-9._-]{0,79}$/.test(switchClass))
  )
    throw new TypeError('switchClass must be a stable class ID or null');
  return {
    direction,
    boost: !!input.boost,
    action: !!input.action,
    pickup: !!input.pickup,
    switchClass,
  };
}

/**
 * Advance by elapsed seconds using exact 1/120 s steps. Input is held for this
 * call. No elapsed time is discarded. A shell pauses by NOT calling stepRun.
 * Record inputs per simulated tick for portable replays, not per render frame.
 * `events` contains this call's events; terminal calls clear events but do no work.
 */
export function stepRun(state, input = {}, dt = FIXED_DT) {
  const command = normalizedInput(input);
  if (!Number.isFinite(dt) || dt < 0 || dt > 10) throw new TypeError('dt must be 0..10 seconds');
  state.events = [];
  if (state.status === 'won' || state.status === 'lost') return state;
  state._accumulator += dt;
  while (
    state._accumulator + EPS >= FIXED_DT &&
    state.status !== 'won' &&
    state.status !== 'lost'
  ) {
    state._accumulator = Math.max(0, state._accumulator - FIXED_DT);
    fixedStep(state, command);
  }
  return state;
}

export function getSummary(state) {
  return {
    ruleset: state.ruleset,
    levelId: state.levelId,
    revision: state.revision,
    seed: state.seed,
    turnPolicy: state.turnPolicy,
    classId: state.classId,
    activeClassId: state.activeClassId,
    rosterHash: state.rosterHash,
    classHistory: structuredClone(state.classHistory),
    switches: state.classHistory.length - 1,
    failureCause: state.failureCause,
    classRevision: state.classRevision,
    loadoutHash: state.loadoutHash,
    status: state.status,
    won: state.status === 'won',
    tick: state.tick,
    time: state.time,
    lives: state.lives,
    ...(state.classic ? { livesLost: state.classic.livesLost } : {}),
    score: state.score,
    coverage: state.coverage,
    claimedCount: state.claimedCount,
    totalClaimable: state.totalClaimable,
    medal: state.medal,
    objectives: {
      captured: state.objectives.filter((o) => o.captured).length,
      total: state.objectives.length,
      required: state.objectives.filter((o) => o.required).length,
    },
  };
}

/** Each item is one tick's input. Returns the final mutable run for rendering. */
export function replayRun(level, options, inputs) {
  if (!Array.isArray(inputs)) throw new TypeError('replay inputs must be an array');
  const state = createRun(level, options);
  for (const input of inputs) stepRun(state, input, FIXED_DT);
  return state;
}
