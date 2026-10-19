import { updatePursuitSpecialist } from './pursuit-specialists.mjs';

/** Successor native pursuit. Durations use the existing freeze-aware 120 Hz actor clock. */
export const PURSUIT_TIMING_V2 = Object.freeze({ warning: 96, burst: 48, recovery: 192, rest: 60 });
const directions = [
  ['up', 0, -1],
  ['right', 1, 0],
  ['down', 0, 1],
  ['left', -1, 0],
];
const heading = (x, y) =>
  Math.abs(x) >= Math.abs(y) ? (x < 0 ? 'left' : 'right') : y < 0 ? 'up' : 'down';
const stop = (actor) => {
  actor.vx = 0;
  actor.vy = 0;
};
const near = (a, b) => Math.hypot(a.x - b.x, a.y - b.y) < 0.04;
const key = (point, geometry) => Math.floor(point.y) * geometry.width + Math.floor(point.x);
const cell = (index, geometry) => ({
  x: (index % geometry.width) + 0.5,
  y: Math.floor(index / geometry.width) + 0.5,
});
const init = (actor, policy) =>
  (actor.pursuit ??= {
    behavior: policy.behavior,
    cursor: 0,
    phase: 'idle',
    phaseUntil: 0,
    heading: heading(actor.vx, actor.vy),
    nextHeading: null,
    goal: null,
    ...(policy.behavior === 'pair' ? { partnerId: policy.partnerId, meetingGoal: null } : {}),
  });
const fallback = (actor, tick) => {
  const state = actor.pursuit;
  if (state.phase !== 'fallback') actor.nextTurnTick = Math.min(actor.nextTurnTick ?? tick, tick);
  state.phase = 'fallback';
  state.goal = null;
  state.nextHeading = null;
  return false;
};
const occupied = (actor, target, actors) =>
  actors.some(
    (other) =>
      other.alive &&
      other.id !== actor.id &&
      Math.hypot(other.x - target.x, other.y - target.y) <
        (actor.radius ?? 0.3) + (other.radius ?? 0.3),
  );

/** Includes an adjacent safe-edge player endpoint, but never crosses a wall or claimed ground. */
function detects(actor, players, geometry, field) {
  const goals = new Set(players.map((player) => key(player, geometry)));
  const queue = [[key(actor, geometry), 0]],
    seen = new Set([queue[0][0]]);
  for (let head = 0; head < queue.length; head++) {
    const [index, distance] = queue[head];
    if (goals.has(index)) return true;
    if (distance >= 6) continue;
    const x = index % geometry.width,
      y = Math.floor(index / geometry.width);
    for (const [, dx, dy] of directions) {
      const nx = x + dx,
        ny = y + dy,
        next = ny * geometry.width + nx;
      if (
        nx < 0 ||
        ny < 0 ||
        nx >= geometry.width ||
        ny >= geometry.height ||
        seen.has(next) ||
        geometry.terrain?.[next] === 2
      )
        continue;
      if (goals.has(next)) return true;
      if (!field(geometry, nx, ny)) continue;
      seen.add(next);
      queue.push([next, distance + 1]);
    }
  }
  return false;
}

function sprinter(args) {
  const { actor, players, geometry, tick, speed, clearance, actors, field } = args;
  const state = actor.pursuit;
  stop(actor);
  if (state.phase === 'warning') {
    if (tick < state.phaseUntil) return true;
    state.phase = 'burst';
    state.phaseUntil = tick + PURSUIT_TIMING_V2.burst;
    state.heading = state.nextHeading;
    state.nextHeading = null;
    state.burstOrigin = { x: actor.x, y: actor.y };
  }
  if (state.phase === 'burst') {
    const remaining = Math.max(
      0,
      2 - Math.hypot(actor.x - state.burstOrigin.x, actor.y - state.burstOrigin.y),
    );
    if (tick >= state.phaseUntil) {
      state.phase = 'recovering';
      state.phaseUntil = tick + PURSUIT_TIMING_V2.recovery;
      state.goal = null;
      return true;
    }
    if (remaining < 1e-9) return true;
    const [, dx, dy] = directions.find(([name]) => name === state.heading);
    const velocity = Math.min(speed * 2, remaining * 120);
    const end = { x: actor.x + (dx * velocity) / 120, y: actor.y + (dy * velocity) / 120 };
    if (clearance(actor, end) >= 1 - 1e-9 && !occupied(actor, end, actors)) {
      actor.vx = dx * velocity;
      actor.vy = dy * velocity;
    }
    return true;
  }
  if (state.phase === 'recovering' && tick < state.phaseUntil) return true;
  state.phase = 'idle';
  if (!detects(actor, players, geometry, field)) return true;
  const choices = directions
    .map(([name, dx, dy], order) => {
      const end = { x: actor.x + dx * 2, y: actor.y + dy * 2 };
      const distance = 2 * Math.max(0, Math.min(1, clearance(actor, end)));
      const goal = { x: actor.x + dx * distance, y: actor.y + dy * distance };
      return {
        name,
        goal,
        distance,
        order,
        separation: Math.min(
          ...players.map((player) => Math.hypot(goal.x - player.x, goal.y - player.y)),
        ),
      };
    })
    .filter((choice) => choice.distance > 0.1 && !occupied(actor, choice.goal, actors));
  choices.sort(
    (a, b) => b.distance - a.distance || b.separation - a.separation || a.order - b.order,
  );
  if (!choices.length) {
    state.phase = 'blocked';
    return true;
  }
  state.nextHeading = choices[0].name;
  state.goal = choices[0].goal;
  state.phase = 'warning';
  state.phaseUntil = tick + PURSUIT_TIMING_V2.warning;
  return true;
}

/** The lower stable ID coordinates both actors from one pre-motion snapshot. Goals
 * are shared, arrival cells are distinct, and a surviving partner becomes a Runner. */
function pairGoals(args) {
  const { actor, policy, actors, geometry, tick, pathTo, field } = args;
  const partner = actors.find((other) => other.id === policy.partnerId && other.alive);
  if (!partner) {
    actor.pursuit.behavior = 'runner';
    actor.pursuit.partnerLost = true;
    return fallback(actor, tick);
  }
  const coordinator = actor.id < partner.id ? actor : partner;
  const follower = coordinator === actor ? partner : actor;
  init(partner, { behavior: 'pair', partnerId: actor.id });
  const a = coordinator.pursuit,
    b = follower.pursuit;
  if (a.partnerLost || b.partnerLost) return fallback(actor, tick);
  if (a.phase === 'recovering' && tick < a.phaseUntil) {
    stop(actor);
    return true;
  }
  if (a.phase === 'recovering') {
    a.goal = null;
    b.goal = null;
    a.cursor++;
    b.cursor = a.cursor;
  }
  const valid =
    a.goal &&
    b.goal &&
    pathTo(geometry, coordinator, a.goal) !== null &&
    pathTo(geometry, follower, b.goal) !== null;
  if (!valid) {
    a.goal = null;
    b.goal = null;
    for (let offset = 0; offset < policy.waypoints.length; offset++) {
      const cursor = (a.cursor + offset) % policy.waypoints.length;
      const meeting = policy.waypoints[cursor];
      if (
        pathTo(geometry, coordinator, meeting) === null ||
        pathTo(geometry, follower, meeting) === null
      )
        continue;
      const coordinatorPath = new Set(pathTo(geometry, coordinator, meeting));
      const arrivals = directions
        .map(([, dx, dy], order) => ({ point: { x: meeting.x + dx, y: meeting.y + dy }, order }))
        .filter(
          ({ point }) =>
            field(geometry, Math.floor(point.x), Math.floor(point.y)) &&
            !coordinatorPath.has(key(point, geometry)) &&
            pathTo(geometry, follower, point) !== null &&
            !pathTo(geometry, follower, point).includes(key(meeting, geometry)),
        )
        .sort(
          (one, two) =>
            Math.hypot(one.point.x - follower.x, one.point.y - follower.y) -
              Math.hypot(two.point.x - follower.x, two.point.y - follower.y) ||
            one.order - two.order,
        );
      if (!arrivals.length) continue;
      a.cursor = cursor;
      b.cursor = cursor;
      a.goal = { ...meeting };
      b.goal = arrivals[0].point;
      a.meetingGoal = { ...meeting };
      b.meetingGoal = { ...meeting };
      a.phase = 'committed';
      b.phase = 'committed';
      a.blockedSince = null;
      b.blockedSince = null;
      break;
    }
  }
  if (!a.goal || !b.goal) return fallback(actor, tick);
  if (near(coordinator, a.goal) && near(follower, b.goal)) {
    a.phase = 'recovering';
    b.phase = 'recovering';
    a.phaseUntil = tick + PURSUIT_TIMING_V2.rest;
    b.phaseUntil = a.phaseUntil;
    stop(actor);
    return true;
  }
  if (near(actor, actor.pursuit.goal)) {
    actor.pursuit.phase = 'waiting';
    stop(actor);
    return true;
  }
  return null;
}

function moveGoal(args) {
  const { actor, actors, geometry, tick, speed, clearance, pathTo } = args;
  const state = actor.pursuit,
    path = pathTo(geometry, actor, state.goal);
  if (path === null) return fallback(actor, tick);
  let target = path.length ? cell(path[0], geometry) : state.goal;
  if (clearance(actor, target) < 1 - 1e-9) target = cell(key(actor, geometry), geometry);
  const dx = target.x - actor.x,
    dy = target.y - actor.y,
    distance = Math.hypot(dx, dy);
  const velocity = Math.min(speed, distance * 120);
  const end =
    distance < 1e-9
      ? actor
      : {
          x: actor.x + ((dx / distance) * velocity) / 120,
          y: actor.y + ((dy / distance) * velocity) / 120,
        };
  if (distance < 1e-9 || clearance(actor, end) < 1 - 1e-9 || occupied(actor, end, actors)) {
    stop(actor);
    state.phase = 'blocked';
    state.blockedSince ??= tick;
    // Congestion is not a topology change: retain the announced reachable goal.
    return true;
  }
  const desired = heading(dx, dy);
  if (args.policy.behavior === 'switchback' && desired !== state.heading) {
    stop(actor);
    state.nextHeading = desired;
    state.phase = 'warning';
    state.phaseUntil = tick + PURSUIT_TIMING_V2.warning;
    return true;
  }
  state.blockedSince = null;
  state.phase = 'committed';
  state.heading = desired;
  state.nextHeading = null;
  actor.vx = (dx / distance) * velocity;
  actor.vy = (dy / distance) * velocity;
  return true;
}

export function updatePursuitHeadingV2(args) {
  const { actor, policy, actors, players, geometry, tick, pathTo } = args;
  if (!policy || policy.behavior === 'runner') return false;
  if (['shield', 'brace'].includes(policy.behavior)) return updatePursuitSpecialist(args);
  const state = init(actor, policy);
  if (policy.behavior === 'sprinter') return sprinter(args);
  if (policy.behavior === 'pair') {
    const result = pairGoals(args);
    if (result !== null) return result;
    return moveGoal(args);
  }
  stop(actor);
  if (state.phase === 'recovering' && tick < state.phaseUntil) return true;
  if (state.goal && near(actor, state.goal)) {
    state.cursor++;
    state.goal = null;
    state.nextHeading = null;
    state.phase = 'recovering';
    state.phaseUntil =
      tick +
      (policy.behavior === 'patroller'
        ? 12
        : policy.behavior === 'courier'
          ? 6
          : PURSUIT_TIMING_V2.rest);
    return true;
  }
  if (state.goal && pathTo(geometry, actor, state.goal) === null) {
    state.goal = null;
    state.nextHeading = null;
  }
  if (!state.goal) {
    const usable = policy.waypoints
      .map((point, cursor) => ({ point, cursor, path: pathTo(geometry, actor, point) }))
      .filter((item) => item.path !== null && !near(actor, item.point));
    if (!usable.length) return fallback(actor, tick);
    if (policy.behavior === 'refuge' && players.length) {
      usable.sort(
        (a, b) =>
          Math.min(
            ...players.map((player) => Math.hypot(b.point.x - player.x, b.point.y - player.y)),
          ) -
            Math.min(
              ...players.map((player) => Math.hypot(a.point.x - player.x, a.point.y - player.y)),
            ) || key(a.point, geometry) - key(b.point, geometry),
      );
    } else
      usable.sort(
        (a, b) =>
          ((a.cursor - state.cursor + policy.waypoints.length) % policy.waypoints.length) -
          ((b.cursor - state.cursor + policy.waypoints.length) % policy.waypoints.length),
      );
    const selected = usable[0];
    state.cursor = selected.cursor;
    state.goal = { ...selected.point };
    if (['refuge', 'switchback'].includes(policy.behavior)) {
      const target = selected.path.length ? cell(selected.path[0], geometry) : state.goal;
      state.nextHeading = heading(target.x - actor.x, target.y - actor.y);
      state.phase = 'warning';
      state.phaseUntil = tick + PURSUIT_TIMING_V2.warning;
    } else state.phase = 'committed';
  }
  if (state.phase === 'warning') {
    if (tick < state.phaseUntil) return true;
    state.heading = state.nextHeading;
    state.nextHeading = null;
    state.phase = 'committed';
  }
  return moveGoal({ ...args, actors });
}
