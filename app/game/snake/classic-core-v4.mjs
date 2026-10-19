import { makeClassicSnakeV3 } from './classic-core-v3.mjs';
import {
  boundedJSON,
  canonicalJSON,
  dataIdentity,
  exactKeys,
  required,
  stableId,
} from '../data-json.mjs';

export const CLASSIC_SNAKE_V4_LEVEL = 'classic-snake-level.v4';
export const CLASSIC_SNAKE_V4_CORE = 'classic-snake-core.v4';
export const CLASSIC_SNAKE_V4_REPLAY = 'classic-snake-replay.v4';
export const CLASSIC_SNAKE_V4_KINDS = Object.freeze([
  'jammer',
  'lane',
  'relay',
  'perimeter',
  'contour',
  'rover',
  'ricochet',
  'eroder',
  'guard',
]);
const ROUTED_KINDS = ['patroller', 'courier', 'perimeter', 'contour'];
const FIXED_KINDS = ['jammer', 'lane', 'relay', 'eroder', 'guard'];
export const CLASSIC_SIGNAL_PROFILES = Object.freeze([
  'local-burst-v1',
  'local-burst-v2',
  'broadcast-burst-v1',
]);
export const classicSnakeUsesVariableHazards = (level) =>
  level?.targets?.required?.some(
    (policy) => policy.kind === 'jammer' && CLASSIC_SIGNAL_PROFILES.includes(policy.signalProfile),
  ) ?? false;
const MAX_STEPS = 30000,
  MAX_TURNS = 16384;
const DIRECTIONS = { up: [0, -1], right: [1, 0], down: [0, 1], left: [-1, 0] };
const NAMES = Object.keys(DIRECTIONS);
const OPPOSITE = { up: 'down', down: 'up', left: 'right', right: 'left' };
const integer = (v, a, b) => Number.isInteger(v) && v >= a && v <= b;
const key = ({ x, y }) => `${x},${y}`;
const same = (a, b) => a.x === b.x && a.y === b.y;
const point = ({ x, y }) => ({ x, y });
const freeze = (v) => {
  if (v && typeof v === 'object') {
    Object.values(v).forEach(freeze);
    Object.freeze(v);
  }
  return v;
};
const inside = (l, c) => integer(c.x, 0, l.width - 1) && integer(c.y, 0, l.height - 1);
function destination(l, c, direction, backwards = false) {
  const [dx, dy] = DIRECTIONS[direction],
    sign = backwards ? -1 : 1;
  const x = c.x + dx * sign,
    y = c.y + dy * sign;
  return l.wrap ? { x: (x + l.width) % l.width, y: (y + l.height) % l.height } : { x, y };
}
function bodyFor(l, spawn) {
  const body = [point(spawn)];
  while (body.length < 4) body.push(destination(l, body.at(-1), spawn.direction, true));
  return body;
}
function connected(l, walls, start) {
  const reached = new Set([key(start)]),
    queue = [point(start)];
  for (let n = 0; n < queue.length; n++)
    for (const dir of NAMES) {
      const next = destination(l, queue[n], dir),
        k = key(next);
      if (inside(l, next) && !walls.has(k) && !reached.has(k)) {
        reached.add(k);
        queue.push(next);
      }
    }
  return reached;
}
const levelFields = [
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
  'objective',
  'targets',
  'shutters',
  'pickups',
];

function validateSpecialPolicy(level, policy, cell, walls, starts, first) {
  if (Object.hasOwn(policy, 'signalProfile'))
    required(
      policy.kind === 'jammer' && CLASSIC_SIGNAL_PROFILES.includes(policy.signalProfile),
      'Unknown Snake interference profile.',
    );
  const isFixed = FIXED_KINDS.includes(policy.kind);
  if (isFixed) {
    cell(policy.at);
    required(
      !walls.has(key(policy.at)) &&
        !starts.has(key(policy.at)) &&
        !first.some((at) => same(at, policy.at)),
      'Specialist posts must leave starts clear.',
    );
  } else required(!Object.hasOwn(policy, 'at'), 'Only stationary specialists have authored posts.');
  if (policy.kind === 'lane') {
    exactKeys(policy.lane, ['axis', 'from', 'to'], 'Snake attack lane');
    const { axis, from, to } = policy.lane;
    const edge = axis === 'x' ? level.width : level.height;
    required(
      ['x', 'y'].includes(axis) && integer(from, 2, edge - 4) && integer(to, from + 1, edge - 3),
      'Attack lanes must leave permanent end bypasses.',
    );
    const cells = Array.from({ length: to - from + 1 }, (_, i) =>
      axis === 'x' ? { x: from + i, y: policy.at.y } : { x: policy.at.x, y: from + i },
    );
    required(
      cells.every((at) => !walls.has(key(at))),
      'Lanes must be permanently walkable.',
    );
    required(
      connected(level, new Set([...walls, ...cells.map(key)]), level.spawns[0]).size ===
        level.width * level.height - walls.size - cells.length,
      'An active lane must leave one connected permanent bypass.',
    );
  } else required(!Object.hasOwn(policy, 'lane'), 'Only lane emitters define an attack lane.');
  if (policy.kind === 'relay') {
    required(
      Array.isArray(policy.relays) && policy.relays.length === 2,
      'A sentinel requires two relay pads.',
    );
    policy.relays.forEach(cell);
    required(
      new Set(policy.relays.map(key)).size === 2 &&
        policy.relays.every(
          (at) => !walls.has(key(at)) && !same(at, policy.at) && !starts.has(key(at)),
        ),
      'Relay pads must be separate permanently reachable cells.',
    );
  } else required(!Object.hasOwn(policy, 'relays'), 'Only sentinels define relay pads.');
  if (policy.kind === 'eroder') {
    required(
      Array.isArray(policy.breaks) && policy.breaks.length >= 1 && policy.breaks.length <= 4,
      'Eroders mark one to four removable wall cells.',
    );
    policy.breaks.forEach(cell);
    required(
      new Set(policy.breaks.map(key)).size === policy.breaks.length &&
        policy.breaks.every(
          (at) =>
            level.walls.some((wall) => same(wall, at)) &&
            NAMES.some((dir) => same(destination(level, policy.at, dir), at)),
        ),
      'An eroder may only remove marked adjacent walls.',
    );
  } else required(!Object.hasOwn(policy, 'breaks'), 'Only eroders define removable walls.');
  if (['guard', 'ricochet'].includes(policy.kind))
    required(Object.hasOwn(DIRECTIONS, policy.heading), 'A guard or ricochet needs a heading.');
  else required(!Object.hasOwn(policy, 'heading'), 'Unexpected authored target heading.');
}

const warningTicks = (run) => Math.max(4, Math.ceil(800 / run.level.minStepMs));
const effectiveWalls = (run) => {
  const walls = new Set(geometry(run.level).walls);
  for (const cell of run.removedWalls ?? []) walls.delete(key(cell));
  return walls;
};
function initializeSpecial(run, target, policy) {
  if (policy.heading) target.heading = policy.heading;
  if (policy.kind === 'jammer') target.phaseTicks = 12;
  if (policy.signalProfile) {
    target.jamRandom =
      (run.hazardSeed ^ Math.imul(run.spawnedRequired + 1, 0x9e3779b1) ^ 0x6a09e667) >>> 0 || 1;
    setSignalPhase(run, target, 'rest', signalDuration(run, target, 2000, 4400));
  }
  if (policy.kind === 'rover') target.phase = 'dormant';
  if (policy.kind === 'relay') {
    target.phase = 'locked';
    target.phaseTicks = 0;
    policy.relays.forEach((at, index) =>
      run.relays.push({
        id: `${target.id}-relay-${index + 1}`,
        ownerId: target.id,
        ...point(at),
        collected: false,
      }),
    );
  }
}
// Draw only from a dedicated source stream. Spawn and actor-motion RNG never
// depend on radio timing. Quantize inside the limits to simulation boundaries.
function signalDuration(run, target, minimum, maximum) {
  const step = classicSnakeStepMillisecondsV4(run);
  const low = Math.ceil(minimum / step),
    high = Math.max(low, Math.floor(maximum / step));
  return (low + (random(target, 'jamRandom') % (high - low + 1))) * step;
}
function setSignalPhase(run, target, phase, duration) {
  target.phase = phase;
  target.signalStartedMs = run.elapsedMs;
  target.signalUntilMs = run.elapsedMs + duration;
  target.phaseTicks = Math.ceil(duration / classicSnakeStepMillisecondsV4(run));
  if (phase === 'warning')
    run.events.push({ type: 'target.warning', tick: run.tick, target: structuredClone(target) });
}
/** Coverage is based on living heads, not trailing cable or traversable paths.
 * Keep this projection pure so historical recordings retain their checkpoints. */
export function classicSnakeSignalCoverage(run, source, radius = 6) {
  const distance = (a, b, size) => {
    const delta = Math.abs(a - b);
    return run.level.wrap ? Math.min(delta, size - delta) : delta;
  };
  return run.snakes.some(
    (snake) =>
      snake.alive &&
      Math.hypot(
        distance(snake.body[0].x, source.x, run.level.width),
        distance(snake.body[0].y, source.y, run.level.height),
      ) <= radius,
  );
}
export function classicSnakeSignalView(run) {
  const sources = (run.targets ?? [])
    .filter((target) => target.kind === 'jammer')
    .map((target) => {
      const profile = run.level.targets.required[target.policyIndex]?.signalProfile ?? 'legacy';
      const radius = ['local-burst-v1', 'local-burst-v2'].includes(profile) ? 6 : null;
      return {
        id: target.id,
        x: target.x,
        y: target.y,
        profile,
        phase: target.phase,
        remainingMs: Math.max(
          0,
          target.signalUntilMs === undefined
            ? target.phaseTicks * classicSnakeStepMillisecondsV4(run)
            : target.signalUntilMs - run.elapsedMs,
        ),
        radius,
        exposed: radius === null || classicSnakeSignalCoverage(run, target, radius),
      };
    });
  const running = run.status === 'running',
    suppressed = run.pulseTicks > 0;
  return {
    active:
      running &&
      !suppressed &&
      sources.some((source) => source.exposed && source.phase === 'jamming'),
    warning:
      running &&
      !suppressed &&
      sources.some((source) => source.exposed && source.phase === 'warning'),
    suppressed,
    sources,
  };
}
function retireLocalSignalOutsideCoverage(run, target) {
  if (classicSnakeSignalCoverage(run, target)) return false;
  if (target.phase === 'jamming') {
    run.signalClearUntilMs = Math.max(run.signalClearUntilMs, run.elapsedMs + 1600);
    setSignalPhase(run, target, 'rest', signalDuration(run, target, 2000, 4400));
  } else if (target.phase === 'warning') {
    // Re-entry starts a whole warning, never the unfinished part of this one.
    setSignalPhase(run, target, 'rest', 0);
  }
  return true;
}
function advanceVariableJammer(run, target) {
  const step = classicSnakeStepMillisecondsV4(run);
  target.phaseTicks = Math.max(0, Math.ceil((target.signalUntilMs - run.elapsedMs) / step));
  if (
    policyFor(run, target).signalProfile === 'local-burst-v2' &&
    retireLocalSignalOutsideCoverage(run, target)
  )
    return;
  // A catch may shorten future moves after this phase chose its deadline.
  // Retire at the last visible boundary before its hard maximum, rather than
  // overshooting it on the next move. The minimum is always respected.
  const bounds =
    target.phase === 'jamming' ? [600, 1400] : target.phase === 'rest' ? [2000, 4400] : null;
  const phaseMs = run.elapsedMs - target.signalStartedMs;
  const lastBoundary = bounds && phaseMs >= bounds[0] && phaseMs + step > bounds[1];
  if (target.phaseTicks > 0 && !lastBoundary) return;
  if (lastBoundary) {
    target.signalUntilMs = run.elapsedMs;
    target.phaseTicks = 0;
  }
  if (target.phase === 'jamming') {
    run.signalClearUntilMs = Math.max(run.signalClearUntilMs, run.elapsedMs + 1600);
    setSignalPhase(run, target, 'rest', signalDuration(run, target, 2000, 4400));
    return;
  }
  const blocked =
    run.elapsedMs < run.signalClearUntilMs ||
    run.projectiles.length ||
    run.targets.some(
      (other) =>
        other !== target &&
        ((other.kind === 'jammer' && other.phase === 'jamming') ||
          (other.kind === 'lane' && other.phase === 'active')),
    );
  if (blocked) {
    if (target.phase === 'warning') setSignalPhase(run, target, 'rest', 0);
    return;
  }
  if (target.phase === 'rest') setSignalPhase(run, target, 'warning', 800);
  else setSignalPhase(run, target, 'jamming', signalDuration(run, target, 600, 1400));
}
function syncSignal(run) {
  const active = run.targets.filter(
    (target) => target.kind === 'jammer' && target.phase === 'jamming',
  );
  run.signal = {
    jammed: active.length > 0,
    remainingTicks: Math.max(0, ...active.map((target) => target.phaseTicks)),
  };
}
function collectRelays(run) {
  for (const relay of run.relays) {
    if (relay.collected) continue;
    const snake = run.snakes.find((actor) => same(actor.body[0], relay));
    if (!snake) continue;
    relay.collected = true;
    run.events.push({
      type: 'relay.collected',
      tick: run.tick,
      playerId: snake.id,
      relay: structuredClone(relay),
    });
  }
  for (const target of run.targets.filter((actor) => actor.kind === 'relay')) {
    if (
      target.phase === 'open' ||
      run.relays.some((relay) => relay.ownerId === target.id && !relay.collected)
    )
      continue;
    target.phase = 'open';
    run.events.push({ type: 'target.opened', tick: run.tick, target: structuredClone(target) });
  }
}
function laneContains(target, policy, cell) {
  const axis = policy.lane.axis,
    across = axis === 'x' ? 'y' : 'x';
  return (
    cell[across] === target[across] &&
    cell[axis] >= policy.lane.from &&
    cell[axis] <= policy.lane.to
  );
}
function shotDestination(run, shot) {
  const [dx, dy] = DIRECTIONS[shot.heading];
  // Projectiles terminate at the board edge even on wrapping Snake layouts.
  return { x: shot.x + dx, y: shot.y + dy };
}
/** Head-only hazards observe the danger already displayed before the step.
 * A shot's next cell is marked while it is in flight, including crossing swaps. */
export function classicSnakeHazardAtV4(run, next) {
  for (const target of run.targets)
    if (
      target.kind === 'lane' &&
      target.phase === 'active' &&
      laneContains(target, policyFor(run, target), next)
    )
      return 'lane';
  for (const shot of run.projectiles) {
    const to = shotDestination(run, shot);
    if (same(shot, next) || (run.pulseTicks <= 0 && same(to, next))) return 'projectile';
  }
  return null;
}
function warn(run, target) {
  target.phase = 'warning';
  target.phaseTicks = warningTicks(run);
  run.events.push({ type: 'target.warning', tick: run.tick, target: structuredClone(target) });
}
function moveNewTarget(run, target, policy, distances) {
  if (policy.kind === 'rover') {
    if (target.phase === 'dormant') {
      if ((distances.get(key(target)) ?? Infinity) <= 6) warn(run, target);
      return null;
    }
    if (target.phase === 'warning') {
      if (--target.phaseTicks > 0) return null;
      target.phase = 'moving';
      target.wait = policy.every;
      return null;
    }
    if (--target.wait > 0) return null;
    target.wait = policy.every;
    const occupied = blocked(run),
      choices = NAMES.map((heading) => ({
        heading,
        next: destination(run.level, target, heading),
      })).filter(({ next }) => inside(run.level, next) && !occupied.has(key(next)));
    choices.sort(
      (a, b) => (distances.get(key(a.next)) ?? Infinity) - (distances.get(key(b.next)) ?? Infinity),
    );
    if (!choices.length) return null;
    target.heading = choices[0].heading;
    return choices[0].next;
  }
  if (--target.wait > 0) return null;
  target.wait = policy.every;
  const next = destination(run.level, target, target.heading);
  if (inside(run.level, next) && !blocked(run).has(key(next))) return next;
  target.heading = OPPOSITE[target.heading];
  return null;
}
function advanceSpecials(run, jammedOnEntry = run.signal.jammed, rules) {
  const walls = effectiveWalls(run);
  run.projectiles = run.projectiles
    .map((shot) => ({ ...shot, ...shotDestination(run, shot) }))
    .filter(
      (shot) =>
        inside(run.level, shot) &&
        !walls.has(key(shot)) &&
        !run.shutters.some((gate) => gate.closed && gate.cells.some((at) => same(at, shot))),
    );
  // Resolve jammer first so a lane never becomes lethal in newly obscured play.
  const specialists = [...run.targets].sort(
    (a, b) => Number(b.kind === 'jammer') - Number(a.kind === 'jammer'),
  );
  for (const target of specialists) {
    const policy = policyFor(run, target);
    if (!FIXED_KINDS.includes(target.kind) || target.kind === 'relay') continue;
    if (policy.signalProfile) {
      advanceVariableJammer(run, target);
      syncSignal(run);
      continue;
    }
    if (target.phase === 'jamming' || target.phase === 'active') {
      if (--target.phaseTicks > 0) continue;
      target.phase = 'rest';
      target.phaseTicks = target.kind === 'jammer' ? 12 : 8;
      syncSignal(run);
      continue;
    }
    const jammed = run.targets.some(
      (actor) => actor.kind === 'jammer' && actor.phase === 'jamming',
    );
    if (
      ['lane', 'guard'].includes(target.kind) &&
      (jammed || jammedOnEntry || rules?.holdSpecial?.(run))
    ) {
      if (target.phase === 'warning') target.phaseTicks = warningTicks(run);
      continue;
    }
    if (target.phase === 'rest') {
      if (--target.phaseTicks > 0) continue;
      if (target.kind === 'eroder') {
        target.goal =
          policy.breaks.find((cell) => !run.removedWalls.some((removed) => same(removed, cell))) ??
          null;
        if (!target.goal) {
          target.phaseTicks = 8;
          continue;
        }
      }
      warn(run, target);
      continue;
    }
    if (target.phase !== 'warning' || --target.phaseTicks > 0) continue;
    if (target.kind === 'jammer') {
      if (
        run.projectiles.length ||
        run.targets.some((actor) => actor.kind === 'lane' && actor.phase === 'active')
      ) {
        target.phaseTicks = 1;
        continue;
      }
      target.phase = 'jamming';
      target.phaseTicks = 4;
    } else if (target.kind === 'lane') {
      target.phase = 'active';
      target.phaseTicks = 2;
    } else if (target.kind === 'guard') {
      const next = shotDestination(run, target);
      // Never materialize a shot inside any occupied body segment.
      if (bodyCells(run).has(key(next))) {
        target.phaseTicks = warningTicks(run);
        continue;
      }
      if (inside(run.level, next) && !walls.has(key(next)))
        run.projectiles.push({
          id: `${target.id}-shot-${run.tick}`,
          ownerId: target.id,
          ...next,
          heading: target.heading,
          bornTick: run.tick,
        });
      target.phase = 'rest';
      target.phaseTicks = 8;
    } else if (target.kind === 'eroder') {
      if (target.goal && !bodyCells(run).has(key(target.goal))) {
        run.removedWalls.push(point(target.goal));
        run.events.push({
          type: 'wall.opened',
          tick: run.tick,
          at: point(target.goal),
          targetId: target.id,
        });
      }
      target.goal = null;
      target.phase = 'rest';
      target.phaseTicks = 8;
    }
  }
  syncSignal(run);
}

/** V4 is an explicit authored recipe. Old V1 recipes are never reinterpreted. */
export function validateClassicSnakeLevelV4(source) {
  const l = boundedJSON(source, {
    maxBytes: 96 * 1024,
    maxNodes: 12000,
    maxArray: 1536,
    maxDepth: 8,
  });
  exactKeys(l, levelFields, 'Classic Snake v4 level');
  required(
    levelFields.every((f) => Object.hasOwn(l, f)),
    'Incomplete Classic Snake v4 level.',
  );
  required(
    l.version === CLASSIC_SNAKE_V4_LEVEL && stableId(l.id),
    'Unsupported Classic Snake v4 identity.',
  );
  required(
    typeof l.revision === 'string' && l.revision.length > 0 && l.revision.length <= 80,
    'Invalid Classic Snake revision.',
  );
  required(
    typeof l.name === 'string' && l.name.trim().length > 0 && l.name.length <= 120,
    'Invalid Classic Snake name.',
  );
  required(integer(l.width, 16, 48) && integer(l.height, 12, 32), 'Invalid Classic Snake grid.');
  required(
    typeof l.wrap === 'boolean' &&
      ['still', 'flee'].includes(l.targetMovement) &&
      integer(l.fleeEvery, 3, 12),
    'Invalid retained target metadata.',
  );
  required(
    ['mission', 'endless'].includes(l.objective) && integer(l.goal, 1, 128),
    'Invalid Classic Snake objective.',
  );
  required(
    integer(l.stepMs, 80, 300) &&
      integer(l.minStepMs, 60, l.stepMs) &&
      integer(l.speedupEvery, 0, 16),
    'Invalid Classic Snake clock.',
  );
  const cell = (v) => {
    exactKeys(v, ['x', 'y'], 'Snake cell');
    required(inside(l, v), 'Snake cell is outside the board.');
  };
  required(Array.isArray(l.walls) && l.walls.length <= l.width * l.height, 'Invalid Snake walls.');
  l.walls.forEach(cell);
  const walls = new Set(l.walls.map(key));
  required(walls.size === l.walls.length, 'Duplicate Snake wall.');
  l.walls.sort((a, b) => a.y - b.y || a.x - b.x);
  required(Array.isArray(l.spawns) && l.spawns.length === 2, 'Two Snake starts are required.');
  for (const s of l.spawns) {
    exactKeys(s, ['x', 'y', 'direction'], 'Snake spawn');
    required(inside(l, s) && Object.hasOwn(DIRECTIONS, s.direction), 'Invalid Snake spawn.');
  }
  const starts = l.spawns.flatMap((s) => bodyFor(l, s)),
    occupied = new Set(starts.map(key));
  required(
    occupied.size === 8 && starts.every((c) => inside(l, c) && !walls.has(key(c))),
    'Starting bodies must be clear.',
  );
  const first = l.spawns.map((s) => destination(l, s, s.direction));
  required(
    !same(first[0], first[1]) &&
      first.every((c) => inside(l, c) && !walls.has(key(c)) && !occupied.has(key(c))),
    'Starting moves must be clear.',
  );
  required(
    Array.isArray(l.shutters) && l.shutters.length <= 2,
    'Use at most two yielding shutters.',
  );
  const shutterCells = new Set(),
    shutterIds = new Set();
  for (const gate of l.shutters) {
    exactKeys(gate, ['id', 'cells', 'phase'], 'Snake shutter');
    required(
      stableId(gate.id) && !shutterIds.has(gate.id) && integer(gate.phase, 0, 47),
      'Invalid shutter identity or phase.',
    );
    shutterIds.add(gate.id);
    required(
      Array.isArray(gate.cells) && gate.cells.length >= 1 && gate.cells.length <= 8,
      'A shutter occupies one to eight cells.',
    );
    for (const c of gate.cells) {
      cell(c);
      const k = key(c);
      required(
        !walls.has(k) && !shutterCells.has(k) && !occupied.has(k) && !first.some((p) => same(p, c)),
        'Shutters must leave starts clear.',
      );
      shutterCells.add(k);
    }
  }
  const closed = new Set([...walls, ...shutterCells]);
  required(
    connected(l, closed, l.spawns[0]).size === l.width * l.height - closed.size,
    'All shutters closed must leave a permanent connected bypass.',
  );
  required(
    l.width * l.height - closed.size >= (l.objective === 'mission' ? l.goal + 11 : 12),
    'Insufficient body and target capacity.',
  );
  const policy = (p, bonus = false) => {
    exactKeys(
      p,
      [
        'kind',
        'every',
        'path',
        'goals',
        'at',
        'lane',
        'relays',
        'breaks',
        'heading',
        'signalProfile',
      ],
      'Snake target policy',
    );
    required(
      (bonus
        ? ['courier']
        : [
            'still',
            'runner',
            'patroller',
            'sprinter',
            'refuge',
            'switchback',
            'pair',
            'shield',
            'brace',
            ...CLASSIC_SNAKE_V4_KINDS,
          ]
      ).includes(p.kind),
      'Invalid target behavior.',
    );
    required(integer(p.every, 3, 12), 'Target movement must be bounded.');
    if (['runner', 'sprinter', 'refuge', 'switchback', 'pair', 'shield', 'brace'].includes(p.kind))
      required(p.every === 3, 'Runner and sprinter cadence is three ticks.');
    if (ROUTED_KINDS.includes(p.kind)) required(p.every === 4, 'Patrol cadence is four ticks.');
    if (['refuge', 'switchback', 'pair'].includes(p.kind)) {
      required(
        Array.isArray(p.goals) && p.goals.length >= 2 && p.goals.length <= 16,
        'Goal-driven targets require two to sixteen permanent waypoints.',
      );
      const identities = new Set();
      for (const goal of p.goals) {
        cell(goal);
        required(
          !closed.has(key(goal)) && !identities.has(key(goal)),
          'Target waypoints must be distinct permanent walkable cells.',
        );
        identities.add(key(goal));
      }
    } else required(!Object.hasOwn(p, 'goals'), 'Only goal-driven targets have waypoints.');
    if (ROUTED_KINDS.includes(p.kind)) {
      required(
        Array.isArray(p.path) && p.path.length >= 2 && p.path.length <= 96,
        'Patrol requires a bounded closed walk.',
      );
      p.path.forEach(cell);
      for (let i = 0; i < p.path.length; i++) {
        const c = p.path[i],
          next = p.path[(i + 1) % p.path.length];
        required(
          !closed.has(key(c)) && NAMES.some((dir) => same(destination(l, c, dir), next)),
          'Target route must use adjacent permanent walkable cells.',
        );
      }
    } else required(!Object.hasOwn(p, 'path'), 'Only routed targets have paths.');
    validateSpecialPolicy(l, p, cell, closed, occupied, first);
  };
  exactKeys(l.targets, ['maxActive', 'required', 'bonus'], 'Snake targets');
  required(
    integer(l.targets.maxActive, 1, 2) &&
      Array.isArray(l.targets.required) &&
      l.targets.required.length >= 1 &&
      l.targets.required.length <= 16,
    'Invalid target population.',
  );
  l.targets.required.forEach((p) => policy(p));
  if (classicSnakeUsesVariableHazards(l))
    required(
      l.targets.required.every((p) => p.kind !== 'jammer' || p.signalProfile),
      'Variable and legacy jammer schedules cannot share a recipe.',
    );
  if (l.targets.required.some((p) => p.kind === 'pair'))
    required(
      l.targets.maxActive === 2 &&
        l.targets.required.every((p) => p.kind === 'pair') &&
        l.targets.bonus === null &&
        l.targets.required.every(
          (p) => canonicalJSON(p.goals) === canonicalJSON(l.targets.required[0].goals),
        ),
      'Rendezvous missions require a shared waypoint set and two reserved target slots.',
    );
  if (l.targets.bonus !== null) {
    exactKeys(l.targets.bonus, ['at', 'policy'], 'Courier offers');
    required(
      l.targets.maxActive === 2 && canonicalJSON(l.targets.bonus.at) === '[4,8]',
      'Courier offers are fixed at four and eight required catches.',
    );
    policy(l.targets.bonus.policy, true);
  }
  required(Array.isArray(l.pickups) && l.pickups.length <= 4, 'Use at most four pickup offers.');
  let previous = 0;
  const counts = { pulse: 0, reel: 0 };
  for (const pickup of l.pickups) {
    exactKeys(pickup, ['at', 'kind', 'pads'], 'Snake pickup');
    required(
      integer(pickup.at, previous + 1, 128) && Object.hasOwn(counts, pickup.kind),
      'Invalid pickup schedule.',
    );
    previous = pickup.at;
    counts[pickup.kind]++;
    required(
      counts[pickup.kind] <= 2 &&
        Array.isArray(pickup.pads) &&
        pickup.pads.length >= 1 &&
        pickup.pads.length <= 16,
      'Invalid pickup budget or pads.',
    );
    pickup.pads.forEach(cell);
    required(
      new Set(pickup.pads.map(key)).size === pickup.pads.length &&
        pickup.pads.every((p) => !closed.has(key(p))),
      'Pickup pads must be unique and permanently walkable.',
    );
    if (pickup.kind === 'pulse')
      required(
        l.targets.required.some((p) => p.kind !== 'still') || l.targets.bonus !== null,
        'Pulse needs moving targets.',
      );
  }
  return l;
}

const caches = new WeakMap();
function geometry(l) {
  if (!caches.has(l)) {
    const walls = new Set(l.walls.map(key)),
      shutterCells = new Set(l.shutters.flatMap((s) => s.cells.map(key))),
      cells = [];
    for (let y = 0; y < l.height; y++)
      for (let x = 0; x < l.width; x++)
        if (!walls.has(`${x},${y}`) && !shutterCells.has(`${x},${y}`)) cells.push({ x, y });
    caches.set(l, { walls, shutterCells, cells });
  }
  return caches.get(l);
}
function random(state, field = 'random') {
  let x = state[field] || 0x9e3779b9;
  x ^= x << 13;
  x ^= x >>> 17;
  x ^= x << 5;
  state[field] = x >>> 0;
  return state[field];
}
const bodyCells = (run) => new Set(run.snakes.flatMap((s) => s.body.map(key)));
function blocked(run, { targets = true, pickup = true } = {}) {
  const set = new Set([...effectiveWalls(run), ...bodyCells(run)]);
  for (const s of run.shutters) if (s.closed) for (const c of s.cells) set.add(key(c));
  if (targets) for (const t of run.targets) set.add(key(t));
  if (pickup && run.pickup) set.add(key(run.pickup));
  for (const relay of run.relays ?? []) if (!relay.collected) set.add(key(relay));
  return set;
}
function finish(run, status, cause = null, players = []) {
  run.status = status;
  if (status === 'won') {
    run.signal = { jammed: false, remainingTicks: 0 };
    run.projectiles = [];
  }
  run.failure = cause ? { cause, players } : null;
  run.events.push({
    type: 'run.completed',
    tick: run.tick,
    status,
    catches: run.catches,
    score: run.score,
    failure: run.failure,
  });
}
const policyFor = (run, t) =>
  t.role === 'bonus' ? run.level.targets.bonus.policy : run.level.targets.required[t.policyIndex];
function spawn(run, role, rules) {
  const bonus = role === 'bonus',
    serial = bonus ? run.spawnedBonus : run.spawnedRequired;
  const policyIndex = bonus ? 0 : serial % run.level.targets.required.length;
  const p = bonus ? run.level.targets.bonus.policy : run.level.targets.required[policyIndex];
  const pairGroup = p.kind === 'pair' ? `pair-${Math.floor(serial / 2)}` : null;
  if (pairGroup && run.targets.length && !run.targets.some((t) => t.pairGroup === pairGroup))
    return false; // A survivor must be caught before the next pair can begin.
  const candidates =
      rules?.targetCells?.(run, policyIndex, role) ??
      (p.at ? [p.at] : (p.path ?? geometry(run.level).cells)),
    occupied = blocked(run);
  for (const cell of rules?.reservedCells?.(run) ?? []) occupied.add(key(cell));
  const stream = bonus ? 'bonusRandom' : 'random',
    snapshot = run[stream],
    offset = random(run, stream) % candidates.length;
  const safeDistances = ['shield', 'brace', ...FIXED_KINDS].includes(p.kind)
    ? headDistances(run)
    : null;
  let index = -1;
  for (let i = 0; i < candidates.length; i++) {
    const at = (offset + i) % candidates.length;
    if (
      !occupied.has(key(candidates[at])) &&
      (!safeDistances || (safeDistances.get(key(candidates[at])) ?? 0) >= 4)
    ) {
      index = at;
      break;
    }
  }
  if (index < 0) {
    run[stream] = snapshot;
    return false;
  }
  const t = {
    id: `${role}-${serial + 1}`,
    kind: p.kind,
    role,
    policyIndex,
    ...point(candidates[index]),
    age: 0,
    wait: p.every,
    routeIndex: index,
    phase: 'rest',
    phaseTicks: 8,
    heading: 'right',
    burstLeft: 0,
    goal: null,
    goalIndex: -1,
    blockedTicks: 0,
    nextHeading: null,
    pairGroup,
    partnerId: null,
    random:
      (run.seed ^ Math.imul(serial + 1, 0x85ebca6b) ^ (bonus ? 0xc2b2ae35 : 0x27d4eb2f)) >>> 0 || 1,
  };
  initializeSpecial(run, t, p);
  run.targets.push(t);
  if (pairGroup) {
    const partner = run.targets.find((other) => other !== t && other.pairGroup === pairGroup);
    if (partner) {
      t.partnerId = partner.id;
      partner.partnerId = t.id;
    }
  }
  if (bonus) run.spawnedBonus++;
  else run.spawnedRequired++;
  run.events.push({ type: 'target.spawned', tick: run.tick, target: structuredClone(t) });
  return true;
}
function refill(run, rules) {
  if (run.status !== 'running') return;
  const remaining = run.level.objective === 'endless' ? Infinity : run.level.goal - run.catches;
  if (remaining <= 0 && !rules) {
    run.targets = [];
    finish(run, 'won');
    return;
  }
  const b = run.level.targets.bonus;
  if (
    b &&
    run.spawnedBonus < b.at.length &&
    run.catches >= b.at[run.spawnedBonus] &&
    !run.targets.some((t) => t.role === 'bonus') &&
    run.targets.length < run.level.targets.maxActive
  )
    spawn(run, 'bonus', rules);
  while (
    run.targets.length < run.level.targets.maxActive &&
    run.targets.filter((t) => t.role === 'required').length < remaining
  )
    if (!spawn(run, 'required', rules)) break;
  // Shutter cells are temporary shortcuts, never required spawn locations.
  // Filling the permanent field is therefore the bounded Endless clear.
  const bodies = bodyCells(run);
  if (!run.targets.length && geometry(run.level).cells.every((cell) => bodies.has(key(cell)))) {
    run.pickup = null;
    if (!rules || rules.complete(run)) finish(run, 'won', 'board-filled');
    return;
  }
  if (!run.pickup && run.pickupCursor < run.level.pickups.length) {
    const p = run.level.pickups[run.pickupCursor];
    if (run.catches >= p.at) {
      const occupied = blocked(run),
        c = p.pads.find((v) => !occupied.has(key(v)));
      if (c) {
        run.pickup = {
          id: `pickup-${run.pickupCursor + 1}`,
          kind: p.kind,
          ...point(c),
          bornTick: run.tick,
        };
        run.pickupCursor++;
        run.events.push({ type: 'pickup.spawned', tick: run.tick, pickup: { ...run.pickup } });
      }
    }
  }
}
function syncShutters(run, closing = false) {
  const occupied = blocked(run, { targets: true });
  for (const s of run.shutters) {
    if (s.kind === 'cable-plate') continue;
    const phase = (run.tick + s.phase) % 48,
      wantsClosed = phase >= 32;
    s.warning = phase >= 24 && phase < 32;
    s.yielding = false;
    if (!wantsClosed) s.closed = false;
    else if (closing && !s.closed) {
      // The blocked set includes closed shutters; an already closed gate stays closed.
      s.yielding = s.cells.some((c) => occupied.has(key(c)));
      if (!s.yielding) s.closed = true;
    } else if (!s.closed) s.yielding = true;
  }
}
/** Distances use static/shutter traversability, never the player's queued input. */
function headDistances(run) {
  const walls = effectiveWalls(run);
  for (const s of run.shutters) if (s.closed) s.cells.forEach((c) => walls.add(key(c)));
  const map = new Map(),
    queue = [];
  for (const s of run.snakes) {
    map.set(key(s.body[0]), 0);
    queue.push(s.body[0]);
  }
  for (let n = 0; n < queue.length; n++)
    for (const dir of NAMES) {
      const c = destination(run.level, queue[n], dir),
        k = key(c);
      if (inside(run.level, c) && !walls.has(k) && !map.has(k)) {
        map.set(k, map.get(key(queue[n])) + 1);
        queue.push(c);
      }
    }
  return map;
}
function fleeDirection(run, t, distances) {
  const occupied = blocked(run),
    current = distances.get(key(t));
  if (current === undefined || current > 6) return null;
  const choices = NAMES.map((direction) => ({
    direction,
    cell: destination(run.level, t, direction),
  })).filter(({ cell }) => inside(run.level, cell) && !occupied.has(key(cell)));
  const best = Math.max(current, ...choices.map(({ cell }) => distances.get(key(cell)) ?? 0));
  const wanted = choices.filter(({ cell }) => (distances.get(key(cell)) ?? 0) === best);
  return wanted.length ? wanted[random(t) % wanted.length].direction : null;
}
/** Contact observes the displayed pre-step facing/phase, before any target movement. */
export function classicSnakeContactHazardV4(level, target, from) {
  if (target.kind === 'relay') return target.phase !== 'open';
  if (target.kind === 'brace') return target.phase === 'warning' || target.phase === 'burst';
  if (target.kind !== 'shield') return false;
  return same(destination(level, target, target.heading), from);
}
function routeTo(run, actor, goal) {
  const occupied = blocked(run);
  occupied.delete(key(actor));
  if (occupied.has(key(goal))) return null;
  const distances = new Map([[key(goal), 0]]),
    queue = [point(goal)];
  for (let i = 0; i < queue.length; i++)
    for (const direction of NAMES) {
      const next = destination(run.level, queue[i], direction),
        k = key(next);
      if (inside(run.level, next) && !occupied.has(k) && !distances.has(k)) {
        distances.set(k, distances.get(key(queue[i])) + 1);
        queue.push(next);
      }
    }
  return distances.has(key(actor)) ? distances : null;
}
function chooseGoal(run, actor, policy, headMap) {
  const candidates = policy.goals
    .map((goal, index) => ({ goal, index }))
    .filter(({ goal }) => !same(goal, actor) && routeTo(run, actor, goal));
  if (!candidates.length) return false;
  if (policy.kind === 'switchback') {
    candidates.sort(
      (a, b) =>
        ((a.index - actor.goalIndex - 1 + policy.goals.length) % policy.goals.length) -
        ((b.index - actor.goalIndex - 1 + policy.goals.length) % policy.goals.length),
    );
  } else {
    candidates.sort(
      (a, b) =>
        (headMap.get(key(b.goal)) ?? 0) - (headMap.get(key(a.goal)) ?? 0) || a.index - b.index,
    );
  }
  actor.goal = point(candidates[0].goal);
  actor.goalIndex = candidates[0].index;
  actor.phase = 'warning';
  actor.phaseTicks = 4;
  actor.blockedTicks = 0;
  run.events.push({ type: 'target.warning', tick: run.tick, target: structuredClone(actor) });
  return true;
}
function moveGoalTarget(run, actor, policy, headMap) {
  const partner = actor.partnerId && run.targets.find((target) => target.id === actor.partnerId);
  if (policy.kind === 'pair' && !partner) {
    // Once caught, a partner never respawns; the surviving target remains useful quota.
    actor.goal = null;
    actor.phase = 'flee';
    if (--actor.wait > 0) return null;
    actor.wait = policy.every;
    const direction = fleeDirection(run, actor, headMap);
    if (!direction) return null;
    actor.heading = direction;
    return destination(run.level, actor, direction);
  }
  if (actor.phase === 'warning') {
    if (--actor.phaseTicks > 0) return null;
    actor.phase = 'travel';
  } else if (actor.phase === 'rest' && actor.phaseTicks > 0) {
    actor.phaseTicks--;
    return null;
  }
  if (!actor.goal) {
    if (partner?.goal && routeTo(run, actor, partner.goal)) {
      actor.goal = point(partner.goal);
      actor.goalIndex = partner.goalIndex;
      actor.phase = 'warning';
      actor.phaseTicks = 4;
      return null;
    }
    if (chooseGoal(run, actor, policy, headMap)) return null;
    // Temporary cable congestion cannot remove targets or their quota.
    if (--actor.wait > 0) return null;
    actor.wait = policy.every;
    const direction = fleeDirection(run, actor, headMap);
    if (!direction) return null;
    actor.heading = direction;
    return destination(run.level, actor, direction);
  }
  const reached =
    same(actor, actor.goal) ||
    (partner &&
      NAMES.some((direction) => same(destination(run.level, actor, direction), actor.goal)) &&
      same(partner, actor.goal));
  if (reached) {
    actor.goal = null;
    actor.phase = 'rest';
    actor.phaseTicks = 8;
    actor.wait = policy.every;
    return null;
  }
  if (--actor.wait > 0) return null;
  actor.wait = policy.every;
  const route = routeTo(run, actor, actor.goal);
  if (!route) {
    if (++actor.blockedTicks >= 4) {
      actor.goal = null;
      actor.blockedTicks = 0;
    }
    return null;
  }
  actor.blockedTicks = 0;
  const occupied = blocked(run);
  const choices = NAMES.map((direction) => ({
    direction,
    next: destination(run.level, actor, direction),
  })).filter(
    ({ next }) =>
      !occupied.has(key(next)) &&
      route.has(key(next)) &&
      route.get(key(next)) < route.get(key(actor)),
  );
  choices.sort(
    (a, b) =>
      route.get(key(a.next)) - route.get(key(b.next)) ||
      NAMES.indexOf(a.direction) - NAMES.indexOf(b.direction),
  );
  if (!choices.length) return null;
  actor.heading = choices[0].direction;
  return choices[0].next;
}
function moveShield(run, actor, distances) {
  if (actor.phase === 'turning') {
    if (--actor.phaseTicks > 0) return null;
    actor.heading = actor.nextHeading;
    actor.nextHeading = null;
    actor.phase = 'rest';
    actor.phaseTicks = 4;
    actor.wait = 3;
    return null;
  }
  if (actor.phaseTicks > 0) actor.phaseTicks--;
  if (--actor.wait > 0) return null;
  actor.wait = 3;
  const direction = fleeDirection(run, actor, distances);
  if (!direction) return null;
  if (direction !== actor.heading) {
    if (actor.phaseTicks > 0) return null;
    actor.phase = 'turning';
    actor.phaseTicks = 4;
    actor.nextHeading = direction;
    run.events.push({ type: 'target.warning', tick: run.tick, target: structuredClone(actor) });
    return null;
  }
  return destination(run.level, actor, actor.heading);
}
function moveTargets(run, rules) {
  if (run.pulseTicks > 0) {
    run.pulseTicks--;
    return;
  }
  const distances = headDistances(run);
  for (const t of run.targets) {
    const p = policyFor(run, t);
    t.age++;
    const tactical = rules?.moveTarget?.(run, t, p);
    if (!tactical && (p.kind === 'still' || FIXED_KINDS.includes(p.kind))) continue;
    let next = null;
    if (tactical) {
      next = tactical.next;
    } else if (['rover', 'ricochet'].includes(p.kind)) {
      next = moveNewTarget(run, t, p, distances);
    } else if (['refuge', 'switchback', 'pair'].includes(p.kind)) {
      next = moveGoalTarget(run, t, p, distances);
    } else if (p.kind === 'shield') {
      next = moveShield(run, t, distances);
    } else if (p.kind === 'sprinter' || p.kind === 'brace') {
      if (t.phase === 'rest') {
        if (--t.phaseTicks > 0) continue;
        const distance = distances.get(key(t));
        if (distance === undefined || distance > 6) {
          // Recovery may finish while the heads are elsewhere. Keep waiting
          // without arming a burst until a head enters traversable range.
          t.phaseTicks = 1;
          continue;
        }
        t.heading = fleeDirection(run, t, distances) ?? t.heading;
        t.phase = 'warning';
        t.phaseTicks = rules?.warningTicks?.(run) ?? 4;
        run.events.push({ type: 'target.warning', tick: run.tick, target: structuredClone(t) });
        continue;
      }
      if (t.phase === 'warning') {
        if (--t.phaseTicks > 0) continue;
        t.phase = 'burst';
        t.burstLeft = 2;
      }
      next = destination(run.level, t, t.heading);
      t.burstLeft--;
      if (t.burstLeft === 0) {
        t.phase = 'rest';
        t.phaseTicks = 8;
      }
    } else {
      if (--t.wait > 0) continue;
      t.wait = p.every;
      if (p.path) {
        const path = rules?.targetPath?.(run, t, p) ?? p.path;
        const index = (t.routeIndex + 1) % path.length;
        next = path[index];
        if (!blocked(run).has(key(next))) t.routeIndex = index;
      } else {
        const dir = fleeDirection(run, t, distances);
        if (dir) {
          t.heading = dir;
          next = destination(run.level, t, dir);
        }
      }
    }
    if (next && inside(run.level, next) && !blocked(run).has(key(next))) {
      if (p.path)
        t.heading = NAMES.find((direction) => same(destination(run.level, t, direction), next));
      Object.assign(t, point(next));
      run.events.push({ type: 'target.moved', tick: run.tick, target: structuredClone(t) });
    }
  }
}

export function createClassicSnakeV4(source, options = {}, rules) {
  const settings = boundedJSON(options, { maxBytes: 1024, maxNodes: 10, maxDepth: 1 });
  exactKeys(settings, ['mode', 'seed', 'hazardSeed'], 'Classic Snake options');
  const { mode = 'solo', seed = 17 } = settings;
  required(
    ['solo', 'team'].includes(mode) && integer(seed, 0, 0xffffffff),
    'Invalid Snake mode or seed.',
  );
  const level = freeze(validateClassicSnakeLevelV4(source));
  const variableHazards = classicSnakeUsesVariableHazards(level);
  required(
    variableHazards
      ? integer(settings.hazardSeed, 0, 0xffffffff)
      : !Object.hasOwn(settings, 'hazardSeed'),
    'Variable Snake interference requires its accepted hazard seed.',
  );
  const run = {
    version: CLASSIC_SNAKE_V4_CORE,
    level,
    levelIdentity: dataIdentity(level),
    mode,
    seed,
    ...(variableHazards ? { hazardSeed: settings.hazardSeed, signalClearUntilMs: 0 } : {}),
    random: seed || 0x9e3779b9,
    bonusRandom: (seed ^ 0x51ed270b) >>> 0,
    tick: 0,
    elapsedMs: 0,
    status: 'running',
    failure: null,
    snakes: level.spawns.slice(0, mode === 'team' ? 2 : 1).map((s, id) => ({
      id,
      body: bodyFor(level, s),
      direction: s.direction,
      turns: [],
      catches: 0,
      bonusCatches: 0,
      alive: true,
    })),
    targets: [],
    catches: 0,
    bonusCatches: 0,
    score: 0,
    spawnedRequired: 0,
    spawnedBonus: 0,
    pulseTicks: 0,
    pickup: null,
    pickupCursor: 0,
    pickupsUsed: 0,
    shutters: level.shutters.map((s) => ({
      ...structuredClone(s),
      closed: false,
      warning: false,
      yielding: false,
    })),
    signal: { jammed: false, remainingTicks: 0 },
    projectiles: [],
    relays: [],
    removedWalls: [],
    recentCatches: [],
    events: [],
    history: [],
  };
  syncShutters(run, true);
  refill(run, rules);
  return run;
}
export function queueClassicSnakeTurnV4(run, playerId, direction) {
  if (
    run.status !== 'running' ||
    !integer(playerId, 0, run.snakes.length - 1) ||
    !Object.hasOwn(DIRECTIONS, direction)
  )
    return false;
  const s = run.snakes[playerId],
    prior = s.turns.at(-1) ?? s.direction;
  if (
    !s.alive ||
    s.turns.length >= 2 ||
    direction === prior ||
    direction === OPPOSITE[prior] ||
    run.history.length >= MAX_TURNS
  )
    return false;
  s.turns.push(direction);
  run.history.push({ tick: run.tick, playerId, direction });
  if (run.history.length === MAX_TURNS) {
    run.events = [];
    finish(run, 'lost', 'input-limit');
  }
  return true;
}
export function classicSnakeStepMillisecondsV4(run) {
  return Math.max(
    run.level.minStepMs,
    run.level.stepMs -
      (run.level.speedupEvery ? Math.floor(run.catches / run.level.speedupEvery) * 10 : 0),
  );
}
// Trusted successor adapters may extend accepted movement. Historical v4 calls
// provide no rules, preserving their state, journals and exact checkpoints.
export function stepClassicSnakeV4(run, rules) {
  if (run.status !== 'running') return run;
  run.events = [];
  if (run.tick >= MAX_STEPS) {
    finish(run, 'lost', 'step-limit');
    return run;
  }
  const localSignalOnEntry = run.targets.some(
    (target) =>
      policyFor(run, target).signalProfile === 'local-burst-v2' &&
      target.phase === 'jamming' &&
      classicSnakeSignalCoverage(run, target),
  );
  syncShutters(run);
  const walls = effectiveWalls(run);
  for (const s of run.shutters) if (s.closed) s.cells.forEach((c) => walls.add(key(c)));
  const plans = run.snakes.map((s) => {
    const direction = s.turns[0] ?? s.direction,
      next = destination(run.level, s.body[0], direction);
    const plan = { s, direction, next, target: run.targets.find((t) => same(t, next)) ?? null };
    plan.grows = rules ? rules.grows(run, plan) : Boolean(plan.target);
    return plan;
  });
  const failures = new Map(),
    fail = (id, cause) => {
      if (!failures.has(id)) failures.set(id, cause);
    };
  for (const p of plans) {
    if (!inside(run.level, p.next) || walls.has(key(p.next))) fail(p.s.id, 'wall');
    else if (p.target && classicSnakeContactHazardV4(run.level, p.target, p.s.body[0]))
      fail(p.s.id, p.target.kind);
    else {
      const hazard = classicSnakeHazardAtV4(run, p.next, p.s.body[0]);
      if (hazard) fail(p.s.id, hazard);
    }
  }
  if (plans.length === 2) {
    if (same(plans[0].next, plans[1].next)) plans.forEach((p) => fail(p.s.id, 'head-on'));
    if (same(plans[0].next, plans[1].s.body[0]) && same(plans[1].next, plans[0].s.body[0]))
      plans.forEach((p) => fail(p.s.id, 'head-swap'));
  }
  for (const p of plans)
    for (const owner of plans)
      if ((owner.grows ? owner.s.body : owner.s.body.slice(0, -1)).some((c) => same(c, p.next)))
        fail(p.s.id, owner.s.id === p.s.id ? 'body' : 'partner-body');
  const stepDuration = classicSnakeStepMillisecondsV4(run);
  run.elapsedMs += stepDuration;
  run.tick++;
  for (const p of plans) {
    p.s.direction = p.direction;
    if (p.s.turns.length) p.s.turns.shift();
  }
  if (failures.size) {
    const players = [...failures]
      .sort(([a], [b]) => a - b)
      .map(([playerId, cause]) => ({ playerId, cause, at: point(plans[playerId].next) }));
    for (const p of players) {
      run.snakes[p.playerId].alive = false;
      run.events.push({ type: 'snake.failed', tick: run.tick, ...p });
    }
    finish(run, 'lost', players[0].cause, players);
    return run;
  }
  for (const p of plans) {
    p.s.body.unshift(p.next);
    if (!p.grows) p.s.body.pop();
    if (p.target) {
      if (
        p.target.kind === 'jammer' &&
        p.target.phase === 'jamming' &&
        Object.hasOwn(run, 'hazardSeed')
      )
        run.signalClearUntilMs = Math.max(run.signalClearUntilMs, run.elapsedMs + 1600);
      const bonus = p.target.role === 'bonus';
      if (bonus) {
        run.bonusCatches++;
        p.s.bonusCatches++;
      } else {
        run.catches++;
        p.s.catches++;
      }
      run.score += bonus ? 250 : 100;
      run.targets = run.targets.filter((t) => t.id !== p.target.id);
      run.relays = run.relays.filter((relay) => relay.ownerId !== p.target.id);
      run.projectiles = run.projectiles.filter((shot) => shot.ownerId !== p.target.id);
      run.recentCatches.push({
        id: p.target.id,
        ...point(p.target),
        playerId: p.s.id,
        tick: run.tick,
        role: p.target.role,
        kind: p.target.kind,
      });
      run.events.push({
        type: 'target.caught',
        tick: run.tick,
        playerId: p.s.id,
        target: structuredClone(p.target),
        catches: run.catches,
        bonusCatches: run.bonusCatches,
        score: run.score,
        length: p.s.body.length,
      });
    }
  }
  rules?.accept?.(run, plans);
  collectRelays(run);
  syncSignal(run);
  run.recentCatches = run.recentCatches.slice(-24);
  for (const p of plans)
    if (run.pickup && run.pickup.bornTick < run.tick && same(p.next, run.pickup)) {
      const pickup = { ...run.pickup };
      run.pickup = null;
      run.pickupsUsed++;
      if (pickup.kind === 'pulse') run.pulseTicks = 8;
      else p.s.body.splice(Math.max(rules?.tailFloor?.(run, p.s) ?? 4, p.s.body.length - 4));
      run.events.push({
        type: 'pickup.collected',
        tick: run.tick,
        playerId: p.s.id,
        pickup,
        length: p.s.body.length,
      });
    }
  if (
    rules ? rules.complete(run) : run.level.objective === 'mission' && run.catches >= run.level.goal
  ) {
    run.targets = [];
    run.pickup = null;
    finish(run, 'won');
    return run;
  }
  const pausedTargets = run.pulseTicks > 0;
  if (pausedTargets && Object.hasOwn(run, 'hazardSeed')) {
    for (const target of run.targets)
      if (target.signalUntilMs !== undefined) {
        target.signalStartedMs += stepDuration;
        target.signalUntilMs += stepDuration;
      }
    if (run.signalClearUntilMs > run.elapsedMs - stepDuration)
      run.signalClearUntilMs += stepDuration;
  }
  // Heads still move during Pulse. Retire an exposed local phase at the same
  // accepted boundary as their exit, even while source clocks are frozen.
  for (const target of run.targets)
    if (policyFor(run, target).signalProfile === 'local-burst-v2')
      retireLocalSignalOutsideCoverage(run, target);
  syncSignal(run);
  moveTargets(run, rules);
  if (!pausedTargets) advanceSpecials(run, run.signal.jammed || localSignalOnEntry, rules);
  syncShutters(run, true);
  refill(run, rules);
  if (run.status === 'running' && run.tick === MAX_STEPS) finish(run, 'lost', 'step-limit');
  return run;
}
export function classicSnakeSummaryV4(run) {
  return {
    version: run.version,
    levelId: run.level.id,
    levelIdentity: run.levelIdentity,
    mode: run.mode,
    seed: run.seed,
    ...(Object.hasOwn(run, 'hazardSeed') ? { hazardSeed: run.hazardSeed } : {}),
    tick: run.tick,
    elapsedMs: run.elapsedMs,
    status: run.status,
    objective: run.level.objective,
    catches: run.catches,
    bonusCatches: run.bonusCatches,
    totalCatches: run.catches + run.bonusCatches,
    goal: run.level.objective === 'endless' ? null : run.level.goal,
    score: run.score,
    lengths: run.snakes.map((s) => s.body.length),
    playerCatches: run.snakes.map((s) => s.catches),
    playerBonusCatches: run.snakes.map((s) => s.bonusCatches),
    stepMs: classicSnakeStepMillisecondsV4(run),
    pulseTicks: run.pulseTicks,
    pickupsUsed: run.pickupsUsed,
    failure: run.failure ? structuredClone(run.failure) : null,
    signal: { ...run.signal },
    relaysCollected: run.relays.filter((relay) => relay.collected).length,
    relaysTotal: run.relays.length,
  };
}
const checkpoint = (run) => {
  const state = { ...run };
  delete state.level;
  delete state.history;
  return dataIdentity(state);
};
export function exportClassicSnakeReplayV4(run) {
  return {
    version: CLASSIC_SNAKE_V4_REPLAY,
    ruleset: CLASSIC_SNAKE_V4_CORE,
    level: structuredClone(run.level),
    levelIdentity: run.levelIdentity,
    mode: run.mode,
    seed: run.seed,
    ...(Object.hasOwn(run, 'hazardSeed') ? { hazardSeed: run.hazardSeed } : {}),
    steps: run.tick,
    turns: structuredClone(run.history),
    checkpoint: checkpoint(run),
  };
}
export function restoreClassicSnakeReplayV4(source, options = {}) {
  return restoreClassicSnakeReplayWithEngine(source, options, {
    replayVersion: CLASSIC_SNAKE_V4_REPLAY,
    coreVersion: CLASSIC_SNAKE_V4_CORE,
    create: createClassicSnakeV4,
    validate: validateClassicSnakeLevelV4,
    queue: queueClassicSnakeTurnV4,
    step: stepClassicSnakeV4,
  });
}

// Bounded verification is shared by v4 and successors; the envelope determines
// the engine explicitly. No recording is silently upgraded to newer rules.
export function restoreClassicSnakeReplayWithEngine(source, { level: expected } = {}, engine) {
  const r = boundedJSON(source, {
    maxBytes: 2 * 1024 * 1024,
    maxNodes: 120000,
    maxArray: MAX_TURNS,
    maxDepth: 10,
  });
  exactKeys(
    r,
    [
      'version',
      'ruleset',
      'level',
      'levelIdentity',
      'mode',
      'seed',
      'hazardSeed',
      'steps',
      'turns',
      'checkpoint',
    ],
    'Classic Snake replay',
  );
  required(
    r.version === engine.replayVersion && r.ruleset === engine.coreVersion,
    'Unsupported Snake replay.',
  );
  const run = engine.create(r.level, {
    mode: r.mode,
    seed: r.seed,
    ...(Object.hasOwn(r, 'hazardSeed') ? { hazardSeed: r.hazardSeed } : {}),
  });
  required(
    r.levelIdentity === run.levelIdentity &&
      (!expected || canonicalJSON(engine.validate(expected)) === canonicalJSON(run.level)),
    'Snake replay recipe differs.',
  );
  required(
    integer(r.steps, 0, MAX_STEPS) &&
      Array.isArray(r.turns) &&
      r.turns.length <= MAX_TURNS &&
      /^[a-f0-9]{16}$/.test(r.checkpoint),
    'Invalid Snake replay bounds.',
  );
  let previous = 0,
    cursor = 0;
  for (const t of r.turns) {
    exactKeys(t, ['tick', 'playerId', 'direction'], 'Snake turn');
    required(
      integer(t.tick, previous, r.steps) &&
        integer(t.playerId, 0, run.snakes.length - 1) &&
        Object.hasOwn(DIRECTIONS, t.direction),
      'Invalid Snake journal.',
    );
    previous = t.tick;
  }
  for (let tick = 0; tick <= r.steps; tick++) {
    while (r.turns[cursor]?.tick === tick) {
      const t = r.turns[cursor++];
      required(engine.queue(run, t.playerId, t.direction), 'Rejected replay turn.');
    }
    if (tick < r.steps) {
      required(run.status === 'running', 'Replay continues after result.');
      engine.step(run);
    }
  }
  required(checkpoint(run) === r.checkpoint, 'Snake replay failed exact verification.');
  return run;
}

/** Explicit successor preparation. Historical recipes never change in place. */
export function makeClassicSnakeV4(
  source,
  { varied = false, targetRemix = false, endless = false, preset = 'classic' } = {},
) {
  required(
    typeof varied === 'boolean' &&
      typeof targetRemix === 'boolean' &&
      typeof endless === 'boolean' &&
      ['classic', 'pursuit', 'tactical', 'arcade'].includes(preset),
    'Invalid Snake v4 variant.',
  );
  const l =
    source?.version === CLASSIC_SNAKE_V4_LEVEL
      ? structuredClone(validateClassicSnakeLevelV4(source))
      : structuredClone(makeClassicSnakeV3(source));
  l.version = CLASSIC_SNAKE_V4_LEVEL;
  if (varied) {
    const walls = new Set([
      ...l.walls.map(key),
      ...l.shutters.flatMap((gate) => gate.cells.map(key)),
    ]);
    const cells = [];
    for (let y = 0; y < l.height; y++)
      for (let x = 0; x < l.width; x++) if (!walls.has(`${x},${y}`)) cells.push({ x, y });
    // Spatially spread permanent goals; no hand-maintained eligibility list.
    const goals = [];
    for (let i = 0, count = Math.min(8, cells.length); i < count; i++)
      goals.push(cells[Math.floor((i * cells.length) / count)]);
    required(goals.length >= 2, 'Varied prey needs two permanent waypoints.');
    l.targets = {
      maxActive: 2,
      required: [
        { kind: 'runner', every: 3 },
        { kind: 'refuge', every: 3, goals },
        { kind: 'switchback', every: 3, goals },
        { kind: 'sprinter', every: 3 },
      ],
      bonus: null,
    };
  } else if (targetRemix) {
    l.targets = {
      maxActive: 2,
      required: [
        { kind: 'runner', every: 3 },
        { kind: 'sprinter', every: 3 },
      ],
      bonus: null,
    };
  }
  if (endless) l.objective = 'endless';
  if (preset === 'pursuit') {
    l.shutters = [];
    l.pickups = [];
  } else if (preset === 'tactical') l.pickups = [];
  else if (preset === 'arcade' && !l.pickups.length) {
    const walls = new Set(l.walls.map(key));
    const occupied = new Set(l.spawns.flatMap((spawn) => bodyFor(l, spawn)).map(key));
    const pads = [];
    for (let y = 2; y < l.height - 2; y += 3)
      for (let x = 2; x < l.width - 2; x += 3)
        if (
          !walls.has(`${x},${y}`) &&
          !occupied.has(`${x},${y}`) &&
          !l.shutters.some((gate) => gate.cells.some((cell) => cell.x === x && cell.y === y))
        )
          pads.push({ x, y });
    required(pads.length, 'No safe Snake pickup pads.');
    if (l.targets.required.every((p) => p.kind === 'still') && l.targets.bonus === null)
      l.targets.required = [{ kind: 'runner', every: 3 }];
    l.pickups = (endless ? [2, 6, 10, 14] : [2, 6]).map((at, i) => ({
      at,
      kind: i % 2 ? 'reel' : 'pulse',
      pads: pads.slice(i, i + 8).length ? pads.slice(i, i + 8) : pads.slice(0, 8),
    }));
  }
  if (
    source.version !== CLASSIC_SNAKE_V4_LEVEL ||
    varied ||
    targetRemix ||
    endless ||
    preset !== 'classic'
  )
    l.revision = `derived:${dataIdentity({ source, varied, targetRemix, endless, preset })}`;
  return freeze(validateClassicSnakeLevelV4(l));
}
