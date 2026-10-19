/** Explicit successor-recipe specialists. Fixed 120 Hz actor time; no input or RNG reads. */
export const SPECIALIST_TIMING = Object.freeze({ turn: 96, warning: 96, burst: 48, rest: 192 });
const vectors = Object.freeze({ up: [0, -1], right: [1, 0], down: [0, 1], left: [-1, 0] });
export const isPursuitSpecialist = (actor) =>
  ['shield', 'brace'].includes(actor?.pursuit?.behavior);
const headingFor = (x, y) =>
  Math.abs(x) >= Math.abs(y) ? (x < 0 ? 'left' : 'right') : y < 0 ? 'up' : 'down';
const stop = (actor) => {
  actor.vx = 0;
  actor.vy = 0;
};

export function initializePursuitSpecialist(actor, policy, tick = 0) {
  if (!['shield', 'brace'].includes(policy?.behavior)) return false;
  actor.pursuit = {
    behavior: policy.behavior,
    cursor: 0,
    goal: null,
    heading: headingFor(actor.vx, actor.vy),
    nextHeading: null,
    phase: policy.behavior === 'brace' ? 'rest' : 'walking',
    phaseUntil: tick + (policy.behavior === 'brace' ? SPECIALIST_TIMING.rest : 0),
    committedUntil: tick + SPECIALIST_TIMING.turn,
  };
  stop(actor);
  return true;
}

/** Evaluate the face/armor that was visible before this movement transaction.
 * The exact shield side boundary is exposed. Native protection is applied by hosts. */
export function protectedPursuitContact(actor, player, position = actor) {
  const state = actor?.pursuit;
  if (state?.behavior === 'brace') return ['warning', 'burst'].includes(state.phase);
  if (state?.behavior !== 'shield') return false;
  const [dx, dy] = vectors[state.heading] ?? vectors.right;
  return (player.x - position.x) * dx + (player.y - position.y) * dy > 1e-9;
}

const distanceToSegment = (point, a, b) => {
  const dx = b.x - a.x,
    dy = b.y - a.y,
    length = dx * dx + dy * dy;
  const t = length
    ? Math.max(0, Math.min(1, ((point.x - a.x) * dx + (point.y - a.y) * dy) / length))
    : 0;
  return Math.hypot(point.x - a.x - dx * t, point.y - a.y - dy * t);
};

/** Specialists wait before moving into current heads or live cables. This deliberately
 * observes current geometry only: it never predicts controls or dodges player contact. */
export function specialistMotionAllowed(actor, end, geometry, players, playerRadius = 0.3) {
  if (!isPursuitSpecialist(actor)) return true;
  const radius = actor.radius ?? 0.3;
  for (const player of players) {
    if (distanceToSegment(player, actor, end) <= radius + (player.radius ?? playerRadius) + 1e-9)
      return false;
  }
  const trails = geometry.trail ? [geometry.trail] : players.map((player) => player.trail ?? []);
  for (const trail of trails)
    for (const cell of trail) {
      const index = typeof cell === 'number' ? cell : cell.index;
      if (!Number.isInteger(index)) continue;
      const point = {
        x: (index % geometry.width) + 0.5,
        y: Math.floor(index / geometry.width) + 0.5,
      };
      if (distanceToSegment(point, actor, end) <= radius + Math.SQRT1_2) return false;
    }
  for (const body of geometry.snake?.bodies ?? [])
    for (let i = 1; i < body.points.length; i++) {
      const a = body.points[i - 1],
        b = body.points[i];
      if (
        distanceToSegment(actor, a, b) <= radius + 0.35 ||
        distanceToSegment(end, a, b) <= radius + 0.35
      )
        return false;
    }
  return true;
}

export function updatePursuitSpecialist({
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
}) {
  if (!isPursuitSpecialist(actor)) initializePursuitSpecialist(actor, policy, tick);
  const state = actor.pursuit;
  stop(actor);
  if (state.behavior === 'brace') {
    if (state.phase === 'warning') {
      if (tick < state.phaseUntil) return true;
      state.phase = 'burst';
      state.phaseUntil = tick + SPECIALIST_TIMING.burst;
    } else if (state.phase === 'burst' && tick >= state.phaseUntil) {
      state.phase = 'rest';
      state.phaseUntil = tick + SPECIALIST_TIMING.rest;
      return true;
    } else if (state.phase === 'rest' && tick < state.phaseUntil) return true;
    if (state.phase === 'burst') {
      const [dx, dy] = vectors[state.heading];
      const end = { x: actor.x + (dx * speed * 2) / 120, y: actor.y + (dy * speed * 2) / 120 };
      if (
        clearance(actor, end) >= 1 - 1e-9 &&
        specialistMotionAllowed(actor, end, geometry, players) &&
        !actors.some(
          (other) =>
            other.alive &&
            other.id !== actor.id &&
            Math.hypot(other.x - end.x, other.y - end.y) < actor.radius * 2,
        )
      ) {
        actor.vx = dx * speed * 2;
        actor.vy = dy * speed * 2;
      }
      return true;
    }
  } else if (state.phase === 'turning') {
    if (tick < state.phaseUntil) return true;
    state.heading = state.nextHeading;
    state.nextHeading = null;
    state.committedUntil = tick + SPECIALIST_TIMING.turn;
    state.phase = 'walking';
  }
  if (state.goal && Math.hypot(actor.x - state.goal.x, actor.y - state.goal.y) < 0.04) {
    state.cursor++;
    state.goal = null;
  }
  // A captured route can vanish. Select the next reachable authored goal, deterministically.
  let path =
    state.goal && field(geometry, Math.floor(state.goal.x), Math.floor(state.goal.y))
      ? pathTo(geometry, actor, state.goal)
      : null;
  if (path === null) {
    state.goal = null;
    for (let offset = 0; offset < policy.waypoints.length; offset++) {
      const cursor = (state.cursor + offset) % policy.waypoints.length,
        point = policy.waypoints[cursor];
      const candidate = pathTo(geometry, actor, point);
      if (candidate !== null) {
        state.cursor = cursor;
        state.goal = point;
        path = candidate;
        break;
      }
    }
  }
  if (!state.goal) {
    if (state.behavior === 'shield') state.phase = 'blocked';
    return true;
  }
  const target = path.length
    ? { x: (path[0] % geometry.width) + 0.5, y: Math.floor(path[0] / geometry.width) + 0.5 }
    : state.goal;
  const dx = target.x - actor.x,
    dy = target.y - actor.y;
  if (Math.hypot(dx, dy) < 1e-9) {
    state.cursor++;
    state.goal = null;
    return true;
  }
  const desired = headingFor(dx, dy);
  if (state.behavior === 'brace') {
    state.heading = desired;
    state.phase = 'warning';
    state.phaseUntil = tick + SPECIALIST_TIMING.warning;
    return true;
  }
  if (desired !== state.heading) {
    if (tick >= state.committedUntil) {
      state.nextHeading = desired;
      state.phase = 'turning';
      state.phaseUntil = tick + SPECIALIST_TIMING.turn;
    }
    return true;
  }
  const [vx, vy] = vectors[state.heading],
    distance = vx ? Math.abs(dx) : Math.abs(dy);
  const movementSpeed = Math.min(speed, distance * 120),
    end = { x: actor.x + (vx * movementSpeed) / 120, y: actor.y + (vy * movementSpeed) / 120 };
  if (
    clearance(actor, end) < 1 - 1e-9 ||
    !specialistMotionAllowed(actor, end, geometry, players) ||
    actors.some(
      (other) =>
        other.alive &&
        other.id !== actor.id &&
        Math.hypot(other.x - end.x, other.y - end.y) < actor.radius * 2,
    )
  ) {
    state.phase = 'blocked';
    return true;
  }
  state.phase = 'walking';
  actor.vx = vx * movementSpeed;
  actor.vy = vy * movementSpeed;
  return true;
}
