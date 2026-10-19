import { updatePursuitHeadingV2 } from './pursuit-goals-v2.mjs';
import { updatePursuitSpecialist } from './pursuit-specialists.mjs';
import { boundedJSON, exactKeys, required, stableId } from '../data-json.mjs';

export const PURSUIT_GOALS_VERSION = 'pursuit-goals.v1';
export const PURSUIT_GOALS_V2 = 'pursuit-goals.v2';
export const PURSUIT_BEHAVIORS = Object.freeze([
  'runner',
  'patroller',
  'courier',
  'refuge',
  'switchback',
  'pair',
  'shield',
  'brace',
]);
const pointKey = (point, width) => Math.floor(point.y) * width + Math.floor(point.x);
const offsets = [
  [0, -1],
  [1, 0],
  [0, 1],
  [-1, 0],
];
const field = (geometry, x, y) =>
  x >= 0 &&
  y >= 0 &&
  x < geometry.width &&
  y < geometry.height &&
  geometry.cells[y * geometry.width + x] === 0 &&
  geometry.terrain?.[y * geometry.width + x] !== 2;

/** Goal policies are accepted data, never executable scripts or presentation hints. */
export function validatePursuitGoals(source, actors, geometry) {
  const value = boundedJSON(source, { maxBytes: 8192, maxNodes: 700, maxDepth: 5, maxArray: 24 });
  exactKeys(value, ['version', 'actors'], 'Pursuit goals');
  required(
    [PURSUIT_GOALS_VERSION, PURSUIT_GOALS_V2].includes(value.version) &&
      Array.isArray(value.actors) &&
      value.actors.length > 0 &&
      value.actors.length <= 6,
    'Pursuit needs one to six accepted goal policies.',
  );
  const ids = new Set();
  for (const policy of value.actors) {
    exactKeys(
      policy,
      ['id', 'behavior', 'waypoints', ...(policy.behavior === 'pair' ? ['partnerId'] : [])],
      'Pursuit actor',
    );
    required(
      stableId(policy.id) &&
        !ids.has(policy.id) &&
        (PURSUIT_BEHAVIORS.includes(policy.behavior) ||
          (value.version === PURSUIT_GOALS_V2 && policy.behavior === 'sprinter')),
      'Pursuit identities and behaviors must be distinct and registered.',
    );
    const actor = actors.find((entry) => entry.id === policy.id);
    required(actor?.role === 'scout', 'Pursuit policies require an accepted touch-catch scout.');
    required(
      Array.isArray(policy.waypoints) &&
        policy.waypoints.length >=
          (['runner', ...(value.version === PURSUIT_GOALS_V2 ? ['sprinter'] : [])].includes(
            policy.behavior,
          )
            ? 0
            : 2) &&
        policy.waypoints.length <= 8,
      'Pursuit needs two to eight authored goal cells.',
    );
    for (const point of policy.waypoints) {
      exactKeys(point, ['x', 'y'], 'Pursuit waypoint');
      required(
        Number.isFinite(point.x) &&
          Number.isFinite(point.y) &&
          point.x % 1 === 0.5 &&
          point.y % 1 === 0.5 &&
          field(geometry, Math.floor(point.x), Math.floor(point.y)),
        `Pursuit goal ${policy.id} (${point.x},${point.y}) needs a clear field cell center.`,
      );
      required(
        pathTo(geometry, actor, point) !== null,
        'Every pursuit goal must be connected to its actor.',
      );
    }
    if (policy.behavior === 'pair') {
      const partner = value.actors.find((entry) => entry.id === policy.partnerId);
      required(
        partner &&
          partner.id !== policy.id &&
          partner.behavior === 'pair' &&
          partner.partnerId === policy.id,
        'Rendezvous partners must reference each other.',
      );
      if (value.version === PURSUIT_GOALS_V2)
        required(
          partner.waypoints.length === policy.waypoints.length &&
            partner.waypoints.every(
              (point, index) =>
                point.x === policy.waypoints[index].x && point.y === policy.waypoints[index].y,
            ),
          'Successor rendezvous partners must share the same ordered meeting goals.',
        );
    }
    ids.add(policy.id);
  }
  return value;
}

/** Breadth-first routes use current field topology and stable north/east/south/west ties. */
function pathTo(geometry, from, to) {
  const start = pointKey(from, geometry.width),
    goal = pointKey(to, geometry.width);
  if (
    !field(geometry, Math.floor(from.x), Math.floor(from.y)) ||
    !field(geometry, Math.floor(to.x), Math.floor(to.y))
  )
    return null;
  if (start === goal) return [];
  const previous = new Int32Array(geometry.cells.length).fill(-1),
    queue = [start];
  previous[start] = start;
  for (let head = 0; head < queue.length; head++) {
    const current = queue[head],
      x = current % geometry.width,
      y = Math.floor(current / geometry.width);
    for (const [dx, dy] of offsets) {
      const nx = x + dx,
        ny = y + dy,
        next = ny * geometry.width + nx;
      if (!field(geometry, nx, ny) || previous[next] !== -1) continue;
      previous[next] = current;
      if (next === goal) {
        const path = [goal];
        while (previous[path[0]] !== start) path.unshift(previous[path[0]]);
        return path;
      }
      queue.push(next);
    }
  }
  return null;
}

export function pursuitPolicy(level, id) {
  return level.pursuit?.actors.find((policy) => policy.id === id) ?? null;
}

/** Cosmetic consumers may read these phases, but never advance them. No random
 * numbers or queued player inputs are consumed. Motion remains in the native engine. */
function updatePursuitHeadingV1({
  actor,
  policy,
  actors,
  players,
  geometry,
  tick,
  speed,
  clearance,
}) {
  if (!policy || policy.behavior === 'runner') return false;
  if (['shield', 'brace'].includes(policy.behavior))
    return updatePursuitSpecialist({
      actor,
      policy,
      actors,
      players,
      geometry,
      tick,
      speed,
      clearance,
      pathTo,
      field,
    });
  if (
    policy.behavior === 'pair' &&
    !actors.some((other) => other.id === policy.partnerId && other.alive)
  )
    return false;
  actor.pursuit ??= {
    behavior: policy.behavior,
    cursor: 0,
    nextDecisionTick: 0,
    restUntil: 0,
    phase: 'walking',
    goal: null,
  };
  const state = actor.pursuit;
  if (tick < state.restUntil) {
    actor.vx = 0;
    actor.vy = 0;
    return true;
  }
  const usable = policy.waypoints.filter((point) =>
    field(geometry, Math.floor(point.x), Math.floor(point.y)),
  );
  if (!usable.length) {
    state.phase = 'blocked';
    actor.vx = 0;
    actor.vy = 0;
    return true;
  }
  if (state.goal && Math.hypot(actor.x - state.goal.x, actor.y - state.goal.y) < 0.35) {
    state.cursor++;
    state.goal = null;
    state.phase = 'recovering';
    state.restUntil =
      tick + (policy.behavior === 'patroller' ? 12 : policy.behavior === 'courier' ? 6 : 60);
    actor.vx = 0;
    actor.vy = 0;
    return true;
  }
  if (
    !state.goal ||
    tick >= state.nextDecisionTick ||
    !field(geometry, Math.floor(state.goal.x), Math.floor(state.goal.y))
  ) {
    if (policy.behavior === 'refuge' && players.length) {
      state.goal = [...usable].sort(
        (a, b) =>
          Math.min(...players.map((p) => Math.hypot(b.x - p.x, b.y - p.y))) -
            Math.min(...players.map((p) => Math.hypot(a.x - p.x, a.y - p.y))) ||
          pointKey(a, geometry.width) - pointKey(b, geometry.width),
      )[0];
    } else if (
      policy.behavior === 'pair' &&
      actors.some((other) => other.id === policy.partnerId && other.alive)
    ) {
      state.goal = usable[state.cursor % usable.length];
    } else {
      state.goal = usable[state.cursor % usable.length];
    }
    state.nextDecisionTick = tick + 60;
    state.phase = policy.behavior === 'switchback' ? 'committed' : 'walking';
  }
  const path = pathTo(geometry, actor, state.goal);
  if (path === null) {
    state.goal = null;
    state.phase = 'blocked';
    actor.vx = 0;
    actor.vy = 0;
    return true;
  }
  let target = path.length
    ? { x: (path[0] % geometry.width) + 0.5, y: Math.floor(path[0] / geometry.width) + 0.5 }
    : state.goal;
  if (clearance(actor, target) < 1 - 1e-9)
    target = { x: Math.floor(actor.x) + 0.5, y: Math.floor(actor.y) + 0.5 };
  const dx = target.x - actor.x,
    dy = target.y - actor.y,
    distance = Math.hypot(dx, dy);
  if (
    distance < 1e-9 ||
    clearance(actor, target) < 1 - 1e-9 ||
    actors.some(
      (other) =>
        other.alive &&
        other.id !== actor.id &&
        Math.hypot(other.x - target.x, other.y - target.y) < actor.radius * 2,
    )
  ) {
    actor.vx = 0;
    actor.vy = 0;
    state.phase = 'blocked';
    return true;
  }
  actor.vx = (dx / distance) * speed;
  actor.vy = (dy / distance) * speed;
  return true;
}

export function updatePursuitHeading(args) {
  return args.version === PURSUIT_GOALS_V2
    ? updatePursuitHeadingV2({ ...args, pathTo, field })
    : updatePursuitHeadingV1(args);
}

/** Deterministically find nearby goal cells inside each actor's admitted region. */
export function derivePursuitGoals(actors, geometry, version = PURSUIT_GOALS_VERSION) {
  const policies = actors.slice(0, 6).map((actor, index) => {
    const candidates = [];
    for (let y = 1; y < geometry.height - 1; y++)
      for (let x = 1; x < geometry.width - 1; x++) {
        const point = { x: x + 0.5, y: y + 0.5 },
          distance = Math.hypot(point.x - actor.x, point.y - actor.y);
        if (
          distance >= 2 &&
          distance <= 7 &&
          field(geometry, x, y) &&
          pathTo(geometry, actor, point) !== null
        )
          candidates.push(point);
      }
    candidates.sort(
      (a, b) =>
        Math.hypot(b.x - actor.x, b.y - actor.y) - Math.hypot(a.x - actor.x, a.y - actor.y) ||
        pointKey(a, geometry.width) - pointKey(b, geometry.width),
    );
    const points = [];
    for (const point of candidates)
      if (points.every((other) => Math.hypot(other.x - point.x, other.y - point.y) >= 2)) {
        points.push(point);
        if (points.length === 4) break;
      }
    if (points.length < 2) return { id: actor.id, behavior: 'runner', waypoints: [] };
    return {
      id: actor.id,
      behavior: (version === PURSUIT_GOALS_V2
        ? ['patroller', 'refuge', 'switchback', 'sprinter']
        : ['patroller', 'refuge', 'switchback'])[index % (version === PURSUIT_GOALS_V2 ? 4 : 3)],
      waypoints: points,
    };
  });
  return validatePursuitGoals({ version, actors: policies }, actors, geometry);
}

export function pursuitPopulation(level) {
  const actors = level.runningEnemies?.combatPatrols?.actors ?? level.combatPatrols?.actors ?? [];
  return level.pursuit.actors.map((policy) => {
    const actor = actors.find((entry) => entry.id === policy.id);
    return { ...structuredClone(policy), x: actor.x, y: actor.y };
  });
}

export function validatePursuitPopulation(source) {
  const population = boundedJSON(source, {
    maxBytes: 8192,
    maxNodes: 700,
    maxDepth: 5,
    maxArray: 24,
  });
  required(
    Array.isArray(population) && population.length > 0 && population.length <= 6,
    'Author one to six pursuit targets.',
  );
  for (const actor of population) {
    exactKeys(
      actor,
      [
        'id',
        'x',
        'y',
        'behavior',
        'waypoints',
        ...(actor.behavior === 'pair' ? ['partnerId'] : []),
      ],
      'Authored pursuit target',
    );
    required(
      stableId(actor.id) && Number.isFinite(actor.x) && Number.isFinite(actor.y),
      'Pursuit target needs a stable identity and finite position.',
    );
  }
  return population;
}

/** A bounded view of accepted populations for setup cards; never simulation authority. */
export function pursuitRoster(level) {
  if (!level) return [];
  const hunt = level.runningEnemies?.hunt ?? level.classic?.hunt ?? level.hunt;
  return (hunt?.targets ?? []).map((target) => ({
    id: target.id,
    kind: target.kind,
    family:
      level.pursuit?.actors.find((policy) => policy.id === target.id)?.behavior ?? target.kind,
  }));
}
