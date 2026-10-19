/** Authored tactical commitments over the shared accepted-movement boundary. */
import { boundedJSON, dataIdentity, exactKeys, required } from '../data-json.mjs';
import {
  validateClassicSnakeLevelV4,
  createClassicSnakeV4,
  queueClassicSnakeTurnV4,
  stepClassicSnakeV4,
  classicSnakeSummaryV4,
  exportClassicSnakeReplayV4,
  restoreClassicSnakeReplayWithEngine,
  classicSnakeStepMillisecondsV4,
  classicSnakeSignalCoverage,
} from './classic-core-v4.mjs';
import {
  validateClassicSnakeLevelV5,
  createClassicSnakeV5,
  classicSnakeSummaryV5,
  CLASSIC_SNAKE_V5_RULES,
} from './classic-core-v5.mjs';

export const CLASSIC_SNAKE_V6_LEVEL = 'classic-snake-level.v6';
export const CLASSIC_SNAKE_V6_CORE = 'classic-snake-core.v6';
export const CLASSIC_SNAKE_V6_REPLAY = 'classic-snake-replay.v6';
const kinds = ['runner', 'refuge', 'switchback', 'pair', 'sprinter', 'shield', 'jammer', 'guard'];
const directions = { up: [0, -1], right: [1, 0], down: [0, 1], left: [-1, 0] };
const key = (p) => `${p.x},${p.y}`;
const same = (a, b) => a.x === b.x && a.y === b.y;
const freeze = (value) => {
  if (value && typeof value === 'object') {
    Object.values(value).forEach(freeze);
    Object.freeze(value);
  }
  return value;
};
const warningTicks = (run) => Math.max(4, Math.ceil(800 / run.level.minStepMs));
function baseLevel(source) {
  const { tactics: _tactics, ...base } = source;
  return { ...base, version: `classic-snake-level.v${base.operation ? 5 : 4}` };
}
function nextCell(level, point, direction) {
  const [dx, dy] = directions[direction];
  const x = point.x + dx,
    y = point.y + dy;
  return level.wrap
    ? { x: (x + level.width) % level.width, y: (y + level.height) % level.height }
    : { x, y };
}
function heading(level, from, to) {
  return Object.keys(directions).find((direction) => same(nextCell(level, from, direction), to));
}
export function validateClassicSnakeLevelV6(source) {
  const input = boundedJSON(source, {
    maxBytes: 128 * 1024,
    maxNodes: 16000,
    maxArray: 1536,
    maxDepth: 9,
  });
  required(input.version === CLASSIC_SNAKE_V6_LEVEL, 'Unsupported tactical Snake version.');
  const base = input.operation
    ? validateClassicSnakeLevelV5(baseLevel(input))
    : validateClassicSnakeLevelV4(baseLevel(input));
  required(
    Array.isArray(input.tactics) && input.tactics.length <= base.targets.required.length,
    'Invalid tactical target profiles.',
  );
  const used = new Set(),
    blocked = new Set([...base.walls, ...base.shutters.flatMap((s) => s.cells)].map(key));
  for (const profile of input.tactics) {
    exactKeys(profile, ['policyIndex', 'route'], 'Tactical route');
    required(
      Number.isInteger(profile.policyIndex) &&
        profile.policyIndex >= 0 &&
        profile.policyIndex < base.targets.required.length &&
        !used.has(profile.policyIndex),
      'Tactical policy must be unique and present.',
    );
    used.add(profile.policyIndex);
    const policy = base.targets.required[profile.policyIndex];
    required(kinds.includes(policy.kind), 'This target does not support tactical routes.');
    required(!policy.path, 'Tactical routes cannot compete with cyclic patrol paths.');
    required(
      Array.isArray(profile.route) && profile.route.length >= 2 && profile.route.length <= 64,
      'Use two to 64 tactical route cells.',
    );
    const cells = new Set();
    for (const [index, at] of profile.route.entries()) {
      exactKeys(at, ['x', 'y'], 'Tactical cell');
      required(
        Number.isInteger(at.x) &&
          Number.isInteger(at.y) &&
          at.x >= 0 &&
          at.x < base.width &&
          at.y >= 0 &&
          at.y < base.height &&
          !blocked.has(key(at)) &&
          !cells.has(key(at)),
        'Tactical routes use unique permanent walkable cells.',
      );
      cells.add(key(at));
      required(
        index === 0 || heading(base, profile.route[index - 1], at),
        'Tactical route steps must be adjacent.',
      );
    }
    required(
      !policy.at || cells.has(key(policy.at)),
      'A fixed source must start on its tactical route.',
    );
  }
  return { ...base, version: CLASSIC_SNAKE_V6_LEVEL, tactics: input.tactics };
}
function profileFor(level, actor) {
  return actor.role === 'required'
    ? level.tactics.find((p) => p.policyIndex === actor.policyIndex)
    : null;
}
function occupied(run, actor) {
  return new Set(
    [
      ...run.level.walls.filter((at) => !run.removedWalls.some((removed) => same(at, removed))),
      ...run.shutters.filter((s) => s.closed).flatMap((s) => s.cells),
      ...run.snakes.flatMap((s) => s.body),
      ...run.targets.filter((t) => t !== actor),
      ...run.relays.filter((r) => !r.collected),
      ...(run.pickup ? [run.pickup] : []),
    ].map(key),
  );
}
function distance(level, a, b) {
  const dx = Math.abs(a.x - b.x),
    dy = Math.abs(a.y - b.y);
  return (
    (level.wrap ? Math.min(dx, level.width - dx) : dx) +
    (level.wrap ? Math.min(dy, level.height - dy) : dy)
  );
}
function chooseEndpoint(run, actor, route, index) {
  if (index === 0) return route.length - 1;
  if (index === route.length - 1) return 0;
  const partner = run.targets.find((t) => t.id === actor.partnerId);
  if (actor.kind === 'pair' && partner?.tactical)
    return partner.tactical.end === 0 ? route.length - 1 : 0;
  if (actor.kind === 'switchback') return actor.tactical?.end === 0 ? route.length - 1 : 0;
  const heads = run.snakes.filter((s) => s.alive).map((s) => s.body[0]);
  const clearance = (at) => Math.min(...heads.map((head) => distance(run.level, at, head)));
  return clearance(route[0]) >= clearance(route.at(-1)) ? 0 : route.length - 1;
}
function announce(run, actor, ticks) {
  actor.phase = 'warning';
  actor.phaseTicks = ticks;
  run.events.push({ type: 'target.warning', tick: run.tick, target: structuredClone(actor) });
}
/** Decisions read accepted heads only, never queued input or future routes. */
function moveTacticalTarget(run, actor, policy) {
  const profile = profileFor(run.level, actor);
  if (!profile) return null;
  const route = profile.route,
    mobileSource = ['jammer', 'guard'].includes(actor.kind);
  let state = actor.tactical;
  if (!state) {
    const index = route.findIndex((at) => same(at, actor));
    required(index >= 0, 'Tactical actor left its accepted route.');
    state = actor.tactical = {
      index,
      end: chooseEndpoint(run, actor, route, index),
      wait: policy.every ?? 3,
      phase: 'rest',
      ticks: 4,
    };
  }
  const stay = { next: null };
  if (mobileSource) {
    // The existing hazard scheduler owns warning/transmission/fire; mobility
    // stops immediately when that scheduler leaves recovery.
    if (actor.phase !== 'rest') {
      state.stationary = false;
      return stay;
    }
    if (
      state.stationary ||
      run.signal.jammed ||
      (actor.kind === 'guard' && run.projectiles.some((p) => p.ownerId === actor.id))
    )
      return stay;
    // Reach the authored station before arming. Congestion holds recovery,
    // never shortens the following warning or resets a committed route.
    if (actor.signalUntilMs !== undefined) {
      const step = classicSnakeStepMillisecondsV4(run);
      actor.signalStartedMs += step;
      actor.signalUntilMs = Math.max(actor.signalUntilMs + step, run.elapsedMs + step);
    } else actor.phaseTicks++;
  } else {
    if (state.phase === 'rest') {
      actor.phase = 'rest';
      actor.phaseTicks = state.ticks;
      if (--state.ticks > 0) return stay;
      if (state.index === state.end) state.end = chooseEndpoint(run, actor, route, state.index);
      state.phase = 'warning';
      state.ticks = warningTicks(run);
      announce(run, actor, state.ticks);
      return stay;
    }
    if (state.phase === 'warning') {
      actor.phaseTicks = Math.max(0, --state.ticks);
      if (state.ticks > 0) return stay;
      state.phase = 'travel';
      actor.phase = 'travel';
    }
  }
  if (state.index === state.end) {
    if (mobileSource) {
      state.stationary = true;
      state.end = chooseEndpoint(run, actor, route, state.index);
      return stay;
    }
    state.end = chooseEndpoint(run, actor, route, state.index);
    if (!mobileSource) {
      state.phase = 'rest';
      state.ticks = 8;
      actor.phase = 'rest';
      actor.phaseTicks = 8;
      return stay;
    }
  }
  if (--state.wait > 0) return stay;
  state.wait = actor.kind === 'sprinter' ? 1 : (policy.every ?? 3);
  const index = state.index + Math.sign(state.end - state.index),
    next = route[index];
  if (occupied(run, actor).has(key(next))) {
    // Cable congestion never causes a mid-route reversal or teleport.
    actor.blockedTicks++;
    return stay;
  }
  const direction = heading(run.level, actor, next);
  if (actor.kind === 'shield' && direction !== actor.heading) {
    if (actor.nextHeading !== direction) {
      actor.nextHeading = direction;
      state.phase = 'warning';
      state.ticks = warningTicks(run);
      announce(run, actor, state.ticks);
      return stay;
    }
    actor.nextHeading = null;
  }
  actor.heading = direction;
  actor.blockedTicks = 0;
  state.index = index;
  if (actor.kind === 'sprinter') {
    state.burst = (state.burst ?? 0) + 1;
    if (state.burst === 2) {
      state.burst = 0;
      state.phase = 'rest';
      state.ticks = 8;
    }
  }
  return { next };
}
function rulesFor(level) {
  return {
    ...(level.operation
      ? CLASSIC_SNAKE_V5_RULES
      : {
          grows: (_run, plan) => Boolean(plan.target),
          complete: (run) => run.level.objective === 'mission' && run.catches >= run.level.goal,
        }),
    warningTicks,
    // An overdue transmitter reserves the next quiet window. Already active
    // attacks finish normally; repeated guard fire cannot starve reception loss.
    holdSpecial: (run) =>
      run.targets.some(
        (target) =>
          target.kind === 'jammer' &&
          (run.level.targets.required[target.policyIndex].signalProfile !== 'local-burst-v2' ||
            classicSnakeSignalCoverage(run, target)) &&
          (target.phase === 'warning' ||
            (target.phase === 'rest' &&
              (!target.tactical || target.tactical.stationary) &&
              (target.signalUntilMs !== undefined
                ? target.signalUntilMs <= run.elapsedMs
                : target.phaseTicks <= 1))),
      ),
    targetCells: (_run, index, role) => {
      const profile = role === 'required' && level.tactics.find((p) => p.policyIndex === index);
      if (!profile) return undefined;
      const policy = level.targets.required[index];
      return policy.at ? [policy.at] : profile.route;
    },
    moveTarget: moveTacticalTarget,
  };
}
export function createClassicSnakeV6(source, options = {}) {
  const level = freeze(validateClassicSnakeLevelV6(source)),
    rules = rulesFor(level);
  const run = level.operation
    ? createClassicSnakeV5(baseLevel(level), options, rules)
    : createClassicSnakeV4(baseLevel(level), options, rules);
  run.version = CLASSIC_SNAKE_V6_CORE;
  run.level = level;
  run.levelIdentity = dataIdentity(level);
  return run;
}
export const queueClassicSnakeTurnV6 = queueClassicSnakeTurnV4;
export const stepClassicSnakeV6 = (run) => stepClassicSnakeV4(run, rulesFor(run.level));
export const classicSnakeSummaryV6 = (run) =>
  run.level.operation ? classicSnakeSummaryV5(run) : classicSnakeSummaryV4(run);
export function exportClassicSnakeReplayV6(run) {
  return {
    ...exportClassicSnakeReplayV4(run),
    version: CLASSIC_SNAKE_V6_REPLAY,
    ruleset: CLASSIC_SNAKE_V6_CORE,
  };
}
export function restoreClassicSnakeReplayV6(source, options = {}) {
  return restoreClassicSnakeReplayWithEngine(source, options, {
    replayVersion: CLASSIC_SNAKE_V6_REPLAY,
    coreVersion: CLASSIC_SNAKE_V6_CORE,
    create: createClassicSnakeV6,
    validate: validateClassicSnakeLevelV6,
    queue: queueClassicSnakeTurnV6,
    step: stepClassicSnakeV6,
  });
}
export function makeClassicSnakeV6(
  source,
  { tactics = [], revision = `${source.revision}-tactical` } = {},
) {
  return validateClassicSnakeLevelV6({
    ...structuredClone(source),
    version: CLASSIC_SNAKE_V6_LEVEL,
    revision,
    tactics,
  });
}
