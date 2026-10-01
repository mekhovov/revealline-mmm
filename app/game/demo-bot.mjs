import { CELL, FIXED_DT, stepRun, loadoutHash } from './core/index.mjs';
import { canonicalJSON } from './data-json.mjs';
import { authoritativeCheckpoint } from './replay.mjs';

export const LIVE_BOT_LEVEL_IDS = Object.freeze(['orchard-crossing', 'courtyard-exits']);
export const BOT_LIMITS = Object.freeze({
  candidates: 16,
  candidateTicks: 1200,
  totalTicks: 12000,
});
const DIRECTIONS = [
  { name: 'up', x: 0, y: -1 },
  { name: 'right', x: 1, y: 0 },
  { name: 'down', x: 0, y: 1 },
  { name: 'left', x: -1, y: 0 },
];
const EPS = 1e-6;
const fingerprint = (value) => {
  let hash = 2166136261;
  for (const char of canonicalJSON(value)) hash = Math.imul(hash ^ char.charCodeAt(0), 16777619);
  return (hash >>> 0).toString(16).padStart(8, '0');
};
// Exact current Standard (gameplay-pressure.v4) recipes, not the raw authored
// maps. Content or tuning revisions require fresh policy/seed qualification.
const QUALIFIED = Object.freeze({
  'orchard-crossing': '6113d4b4',
  'courtyard-exits': 'db252ca9',
});
const physics = (level) => {
  const { name, description, ...rest } = level;
  return rest;
};
export function supportsDemoBot(level, options = {}) {
  try {
    return (
      !!level &&
      Object.hasOwn(QUALIFIED, level.id) &&
      fingerprint(physics(level)) === QUALIFIED[level.id] &&
      (options.seed === undefined || [1, 2, 3].includes(options.seed)) &&
      (options.classId === undefined || options.classId === 'scout') &&
      (options.turnPolicy === undefined ||
        ['immediate', 'grid-center'].includes(options.turnPolicy)) &&
      (options.classRecipes === undefined ||
        (options.classRecipes.length === 1 &&
          loadoutHash(options.classRecipes[0]) === 'loadout-v1-8360440c'))
    );
  } catch {
    return false;
  }
}
export function demoBotLevelFingerprint(level) {
  return fingerprint(physics(level));
}
const point = (index, width) => ({ x: (index % width) + 0.5, y: Math.floor(index / width) + 0.5 });
const indexAt = (state, x, y) => Math.floor(y) * state.width + Math.floor(x);
const inside = (s, x, y) => x >= 0 && y >= 0 && x < s.width && y < s.height;
const distance = (a, b) => Math.abs(a.x - b.x) + Math.abs(a.y - b.y);

function randomFor(seed) {
  let value = seed >>> 0 || 1;
  return () => {
    value ^= value << 13;
    value ^= value >>> 17;
    value ^= value << 5;
    return (value >>> 0) / 4294967296;
  };
}
function append(segments, direction) {
  const prior = segments.at(-1);
  if (prior?.input.direction === direction) prior.ticks++;
  else segments.push({ ticks: 1, input: { direction } });
}
function safePaths(state) {
  // A capture stops at its contact point, often between centers. Resume along
  // its retained heading to the next safe center as part of the next route;
  // never move to a center and then manufacture another neutral stop.
  const anchor = { x: state.player.x, y: state.player.y };
  const heading = DIRECTIONS.find((d) => d.name === state.player.direction);
  const axis = heading.x ? 'x' : 'y',
    value = anchor[axis],
    sign = heading.x || heading.y;
  if (Math.abs(value - Math.round(value - 0.5) - 0.5) > EPS)
    anchor[axis] = sign > 0 ? Math.ceil(value - 0.5) + 0.5 : Math.floor(value - 0.5) + 0.5;
  const start = indexAt(state, anchor.x, anchor.y);
  const parents = new Int32Array(state.cells.length).fill(-1),
    lengths = new Int32Array(state.cells.length),
    queue = [start];
  parents[start] = start;
  for (let pos = 0; pos < queue.length; pos++) {
    const from = queue[pos],
      x = from % state.width,
      y = Math.floor(from / state.width);
    for (const d of DIRECTIONS) {
      const nx = x + d.x,
        ny = y + d.y,
        next = ny * state.width + nx;
      if (inside(state, nx, ny) && parents[next] < 0 && state.cells[next] === CELL.SAFE) {
        parents[next] = from;
        lengths[next] = lengths[from] + 1;
        queue.push(next);
      }
    }
  }
  return { start, anchor, parents, lengths, queue };
}
function ray(state, origin, d) {
  const cells = [];
  for (let i = 1; i <= state.width + state.height; i++) {
    const x = origin.x + d.x * i,
      y = origin.y + d.y * i;
    if (!inside(state, x, y)) return { cells, end: null };
    const kind = state.cells[indexAt(state, x, y)];
    if (kind !== CELL.FIELD) return { cells, end: kind === CELL.SAFE ? { x, y } : null };
    cells.push({ x, y });
  }
  return { cells, end: null };
}
function pathsFor(state, random, preferBent) {
  const paths = safePaths(state),
    result = [],
    seen = new Set();
  // A cheap straight-course estimate ranks routes only. Walls, terrain, patrols
  // and pursuit are still decided by the complete authoritative simulation.
  const sampleSeconds = 0.25,
    speed = state.rules.moveSpeed;
  const reflect = (value, low, high) => {
    const span = high - low,
      phase = (((value - low) % (2 * span)) + 2 * span) % (2 * span);
    return low + (phase <= span ? phase : 2 * span - phase);
  };
  const courses = Array.from({ length: 64 }, (_, sample) =>
    state.enemies
      .filter((enemy) => enemy.type === 'bouncer')
      .map((enemy) => ({
        x: reflect(
          enemy.x + enemy.vx * sample * sampleSeconds,
          1 + enemy.radius,
          state.width - 1 - enemy.radius,
        ),
        y: reflect(
          enemy.y + enemy.vy * sample * sampleSeconds,
          1 + enemy.radius,
          state.height - 1 - enemy.radius,
        ),
      })),
  );
  function routeRisk(origin, vertices, relocation, exposure) {
    let clearance = Infinity;
    for (
      let sample = Math.ceil(relocation / speed / sampleSeconds);
      sample * sampleSeconds * speed < relocation + exposure && sample < courses.length;
      sample++
    ) {
      let remaining = sample * sampleSeconds * speed - relocation,
        from = point(origin, state.width);
      for (const target of vertices) {
        if (remaining <= 0) break;
        const leg = distance(from, target),
          portion = Math.min(1, remaining / leg),
          x = from.x + (target.x - from.x) * portion,
          y = from.y + (target.y - from.y) * portion;
        for (const enemy of courses[sample]) {
          const dx =
              enemy.x - Math.max(Math.min(from.x, x), Math.min(Math.max(from.x, x), enemy.x)),
            dy = enemy.y - Math.max(Math.min(from.y, y), Math.min(Math.max(from.y, y), enemy.y));
          clearance = Math.min(clearance, dx * dx + dy * dy);
        }
        remaining -= leg;
        from = target;
      }
    }
    return 24 / (1 + clearance / 4);
  }
  function add(origin, vertices, area, bends) {
    const key = `${origin}/${vertices.map((p) => `${p.x},${p.y}`).join('/')}`;
    if (seen.has(key)) return;
    seen.add(key);
    let length = paths.lengths[origin],
      from = point(origin, state.width);
    for (const target of vertices) {
      length += distance(from, target);
      from = target;
    }
    if (length > 110 || vertices.some((p) => !inside(state, p.x, p.y))) return;
    const advantage =
      Math.sqrt(area) * 2 -
      length * 0.12 -
      paths.lengths[origin] * 0.15 -
      routeRisk(origin, vertices, paths.lengths[origin], length - paths.lengths[origin]);
    result.push({
      origin,
      vertices,
      bends,
      length,
      exposure: length - paths.lengths[origin],
      advantage,
      jitter: random(),
    });
  }
  // Candidate geometry is bounded independently of simulation work.
  const origins = paths.queue.filter((i) => paths.lengths[i] <= 48);
  for (const origin of origins) {
    const from = point(origin, state.width);
    for (const d of DIRECTIONS) {
      const first = ray(state, from, d);
      if (!first.cells.length) continue;
      if (first.end) add(origin, [first.end], first.cells.length * 4, 0);
      for (const depth of [4, 8, 12, 16, 24]) {
        const elbow = first.cells[depth - 1];
        if (!elbow) continue;
        for (const side of DIRECTIONS.filter((p) => p.x * d.x + p.y * d.y === 0)) {
          const across = ray(state, elbow, side);
          if (across.end && across.cells.length)
            add(origin, [elbow, across.end], (depth * (across.cells.length + 1)) / 2, 1);
          for (const width of [4, 8, 12, 16, 24]) {
            const corner = across.cells[width - 1];
            if (!corner) continue;
            const back = ray(state, corner, { x: -d.x, y: -d.y });
            if (back.end) add(origin, [elbow, corner, back.end], depth * width, 2);
          }
        }
      }
    }
    if (result.length >= 10000) break;
  }
  const pool = preferBent ? result.filter((c) => c.bends > 0) : result;
  pool.sort((a, b) => b.advantage + b.jitter * 6 - (a.advantage + a.jitter * 6));
  // Reserve attempts for several exposed lengths instead of spending the
  // entire allowance on large cuts that share the same dangerous crossing.
  const exposures = [24, 40, 60, Infinity];
  const shortlisted = [];
  // Adjacent starting cells often generate nearly identical large cuts. Spend
  // the finite simulation allowance on different locations and route shapes,
  // retaining short alternatives for tighter enemy windows.
  function similarity(a, b) {
    if (a.vertices.length !== b.vertices.length) return 0;
    let separation = distance(point(a.origin, state.width), point(b.origin, state.width));
    for (let i = 0; i < a.vertices.length; i++)
      separation += distance(a.vertices[i], b.vertices[i]);
    return Math.max(0, 1 - separation / (12 * (a.vertices.length + 1)));
  }
  for (let slot = 0; slot < BOT_LIMITS.candidates; slot++) {
    const choices = pool.filter((c) => c.exposure <= exposures[slot % 4]);
    let best = null,
      bestScore = -Infinity;
    for (const candidate of choices) {
      if (shortlisted.includes(candidate)) continue;
      const overlap = shortlisted.reduce(
        (max, prior) => Math.max(max, similarity(candidate, prior)),
        0,
      );
      const score = candidate.advantage + candidate.jitter * 6 - overlap * 18;
      if (score > bestScore) {
        best = candidate;
        bestScore = score;
      }
    }
    if (best) shortlisted.push(best);
  }
  return { candidates: shortlisted, paths };
}
function waypointsFor(candidate, paths, state) {
  const indices = [];
  for (let cursor = candidate.origin; cursor !== paths.start; cursor = paths.parents[cursor])
    indices.push(cursor);
  indices.reverse();
  const points = indices.map((i) => point(i, state.width)),
    waypoints = [];
  if (distance(state.player, paths.anchor) > EPS) waypoints.push(paths.anchor);
  const startCenter = point(paths.start, state.width);
  if (distance(paths.anchor, startCenter) > EPS) waypoints.push(startCenter);
  let previous = point(paths.start, state.width),
    prior = null;
  for (let i = 0; i < points.length; i++) {
    const dir = directionTo(previous, points[i]);
    if (prior && dir !== prior) waypoints.push(points[i - 1]);
    prior = dir;
    previous = points[i];
  }
  if (points.length) waypoints.push(points.at(-1));
  return [...waypoints, ...candidate.vertices];
}
function directionTo(a, b) {
  if (Math.abs(b.x - a.x) > EPS) return b.x > a.x ? 'right' : 'left';
  return b.y > a.y ? 'down' : 'up';
}

/** Run only public commands against an owned candidate. Never publish a candidate state as live authority. */
function evaluate(original, vertices, budget) {
  const state = structuredClone(original),
    segments = [];
  let localTicks = 0,
    closed = false,
    bends = 0,
    priorDirection = null;
  function tick(direction) {
    if (localTicks >= BOT_LIMITS.candidateTicks || budget.ticks >= BOT_LIMITS.totalTicks)
      return false;
    localTicks++;
    budget.ticks++;
    if (state.player.cutting && direction && priorDirection && direction !== priorDirection)
      bends++;
    if (direction) priorDirection = direction;
    stepRun(state, { direction }, FIXED_DT);
    append(segments, direction);
    if (
      state.classic.livesLost !== original.classic.livesLost ||
      state.status === 'lost' ||
      state.status === 'respawning'
    )
      return false;
    if (state.events.some((e) => e.type === 'cut.closed')) closed = true;
    return true;
  }
  let from = { ...state.player };
  for (let v = 0; v < vertices.length && !closed; v++) {
    const target = vertices[v],
      direction = directionTo(from, target),
      axis = ['left', 'right'].includes(direction) ? 'x' : 'y',
      sign = ['right', 'down'].includes(direction) ? 1 : -1;
    const nextDirection = v + 1 < vertices.length ? directionTo(target, vertices[v + 1]) : null;
    let stagnant = 0;
    while ((target[axis] - state.player[axis]) * sign > EPS && !closed) {
      const before = { ...state.player },
        remaining = (target[axis] - before[axis]) * sign;
      const queueTurn = state.turnPolicy === 'grid-center' && nextDirection && remaining < 1 - EPS;
      if (!tick(queueTurn ? nextDirection : direction)) return null;
      if (closed) break;
      if (queueTurn && state.player.direction === nextDirection) break;
      stagnant = distance(before, state.player) < EPS ? stagnant + 1 : 0;
      if (stagnant >= 3) return null;
    }
    from = target;
  }
  if (!closed || state.coverage <= original.coverage) return null;
  if (state.status !== 'won') {
    // The authored stop-on-capture permits a short pause before a new gesture.
    // This is part of the evaluated input macro, not a claim that safe
    // terrain is invulnerable to contour patrols or claimed rovers.
    for (let i = 0; i < 60; i++) if (!tick(null)) return null;
  }
  return { state, segments, bends, ticks: localTicks };
}

/** Deterministic finite planning. Intended for a Worker; tests may call it directly. */
export function planDemoMacro(
  original,
  { plannerSeed = 1, decision = 0, preferBent = decision === 0 } = {},
) {
  if (
    original.status !== 'running' ||
    original.player.cutting ||
    !original.classic ||
    original.rules.stopOnCapture !== true
  )
    return { ok: false, reason: 'unsafe-planning-boundary' };
  const start = authoritativeCheckpoint(original),
    random = randomFor((plannerSeed ^ Math.imul(decision + 1, 2654435761)) >>> 0);
  const { candidates, paths } = pathsFor(original, random, preferBent);
  const budget = { ticks: 0 };
  let best = null,
    examined = 0;
  for (const candidate of candidates) {
    if (budget.ticks >= BOT_LIMITS.totalTicks) break;
    examined++;
    const trial = evaluate(original, waypointsFor(candidate, paths, original), budget);
    if (!trial) continue;
    const score =
      (trial.state.coverage - original.coverage) * 100 +
      (trial.state.status === 'won' ? 15 : 0) +
      Math.min(trial.bends, 2) * 0.5 -
      trial.ticks / 300 +
      candidate.jitter * 0.3;
    if (!best || score > best.score) best = { ...trial, score };
  }
  if (!best) return { ok: false, reason: 'no-safe-macro', examined, simulatedTicks: budget.ticks };
  return {
    ok: true,
    startTick: original.tick,
    startHash: start.hash,
    endTick: best.state.tick,
    endHash: authoritativeCheckpoint(best.state).hash,
    segments: best.segments,
    predictedState: best.state,
    metrics: {
      examined,
      simulatedTicks: budget.ticks,
      bends: best.bends,
      ticks: best.ticks,
      gainedCoverage: best.state.coverage - original.coverage,
    },
  };
}
