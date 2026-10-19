import { boundedJSON, exactKeys, required } from '../data-json.mjs';
import { EPS, linearInterval, movingCirclesTime, pointAt } from '../core/geometry.mjs';

export const SNAKE_VERSION = 'snake-hunt.v1';
export const SNAKE_STATE_VERSION = 'snake-hunt-state.v1';
export const SNAKE_BODY_RADIUS = 0.12;
export const SNAKE_NECK_LENGTH = 0.6;
export const SNAKE_LEVEL_VERSION = 'xonix-level.v11';
export const TEAM_SNAKE_LEVEL_VERSION = 'revealline-coop-level.v10';
export const TEAM_SNAKE_RULESET = 'revealline-coop.v12';
export const TEAM_SNAKE_PACK_VERSION = 'revealline-coop-pack.v10';
const distance = (a, b) => Math.hypot(b.x - a.x, b.y - a.y);
const point = ({ x, y }) => ({ x, y });
const integer = (n, lo, hi) => Number.isInteger(n) && n >= lo && n <= hi;

export function validateSnakeDefinition(source, hunt) {
  const value = boundedJSON(source, { maxBytes: 8192, maxNodes: 100, maxDepth: 3, maxArray: 24 });
  exactKeys(
    value,
    [
      'version',
      'initialLength',
      'growthPerCatch',
      'maxLength',
      'shedOnReturn',
      'friendlyTail',
      'bonus',
      'chainWindowTicks',
      'order',
    ],
    'Snake rules',
  );
  required(
    value.version === SNAKE_VERSION &&
      hunt?.mode === 'hunt' &&
      Array.isArray(hunt.targets) &&
      hunt.targets.length > 0 &&
      hunt.quota === hunt.targets.length,
    'Snake requires its versioned clear-all Hunt objective.',
  );
  required(
    integer(value.initialLength, 2, 24) &&
      integer(value.growthPerCatch, 1, 8) &&
      integer(value.maxLength, value.initialLength, 64) &&
      integer(value.shedOnReturn, 0, 16),
    'Snake body lengths must fit the bounded recipe.',
  );
  required(
    ['self', 'team'].includes(value.friendlyTail) &&
      ['none', 'chain', 'ordered'].includes(value.bonus) &&
      integer(value.chainWindowTicks, 120, 2400),
    'Unsupported Snake collision or bonus policy.',
  );
  required(
    Array.isArray(value.order) &&
      (value.bonus === 'ordered'
        ? value.order.length === hunt.targets.length &&
          new Set(value.order).size === value.order.length &&
          value.order.every((id) => hunt.targets.some((target) => target.id === id))
        : value.order.length === 0),
    'Ordered bonuses must list each Hunt target exactly once.',
  );
  return value;
}

export function snakeBaseLevel(source) {
  const level = boundedJSON(source, {
    maxBytes: 256 * 1024,
    maxNodes: 20000,
    maxDepth: 16,
    maxArray: 8192,
  });
  if (level.version === SNAKE_LEVEL_VERSION) level.version = 'xonix-level.v9';
  else if (level.version === TEAM_SNAKE_LEVEL_VERSION) level.version = 'revealline-coop-level.v8';
  delete level.snake;
  return level;
}

export function initializeSnake(run) {
  if (!run.level.snake) return;
  const players = run.players ?? [{ ...run.player, id: 0 }];
  run.snake = {
    version: SNAKE_STATE_VERSION,
    bodies: players.map((player) => ({
      playerId: player.id,
      points: [point(player)],
      length: 0,
      capacity: run.level.snake.initialLength,
      heading: null,
    })),
    catches: 0,
    caughtIds: [],
    chain: 0,
    bestChain: 0,
    bonusScore: 0,
    lastCatchTick: -1,
    orderIndex: 0,
  };
}
function trim(body, amount) {
  let left = amount;
  while (left > EPS && body.points.length > 1) {
    const length = distance(body.points[0], body.points[1]);
    if (length <= left + EPS) {
      body.points.shift();
      left -= length;
    } else {
      body.points[0] = pointAt(body.points[0], body.points[1], left / length);
      left = 0;
    }
  }
  body.length = body.points
    .slice(1)
    .reduce((sum, next, index) => sum + distance(body.points[index], next), 0);
}
function append(body, next) {
  const last = body.points.at(-1);
  if (distance(last, next) <= EPS) return;
  const before = body.points.at(-2);
  if (
    before &&
    Math.abs((last.x - before.x) * (next.y - last.y) - (last.y - before.y) * (next.x - last.x)) <
      EPS &&
    (last.x - before.x) * (next.x - last.x) + (last.y - before.y) * (next.y - last.y) > 0
  )
    body.points[body.points.length - 1] = point(next);
  else body.points.push(point(next));
  body.length += distance(last, next);
  if (body.length > body.capacity) trim(body, body.length - body.capacity);
  if (body.points.length > 132)
    throw new Error('Snake center-turn body exceeded its geometry bound.');
}
export function resetSnakeBody(run, playerId, position) {
  const body = run.snake?.bodies.find((body) => body.playerId === playerId);
  if (!body) return;
  body.points = [point(position)];
  body.length = 0;
  body.heading = null;
}
export function recordSnakeReturn(run, playerId) {
  const body = run.snake?.bodies.find((body) => body.playerId === playerId);
  if (!body) return;
  body.capacity = Math.max(
    run.level.snake.initialLength,
    body.capacity - run.level.snake.shedOnReturn,
  );
  if (body.length > body.capacity) trim(body, body.length - body.capacity);
}
export function recordSnakeCatch(run, actorId, players = [0]) {
  const state = run.snake;
  if (!state) return;
  const hunt = run.level.classic?.hunt ?? run.level.hunt;
  if (state.caughtIds.includes(actorId) || !hunt.targets.some((target) => target.id === actorId))
    return;
  const eligible = [...new Set(players)]
    .sort((a, b) => a - b)
    .filter((id) => !run.players || run.players[id]?.status === 'active');
  const body = state.bodies.find((body) => body.playerId === eligible[0]);
  if (!body) return;
  body.capacity = Math.min(
    run.level.snake.maxLength,
    body.capacity + run.level.snake.growthPerCatch,
  );
  state.catches++;
  state.caughtIds.push(actorId);
  state.chain =
    state.lastCatchTick >= 0 && run.tick - state.lastCatchTick <= run.level.snake.chainWindowTicks
      ? state.chain + 1
      : 1;
  state.lastCatchTick = run.tick;
  state.bestChain = Math.max(state.bestChain, state.chain);
  if (run.level.snake.bonus === 'chain') state.bonusScore += 25 * (state.chain - 1);
  if (run.level.snake.bonus === 'ordered') {
    if (run.level.snake.order[state.orderIndex] === actorId) {
      state.bonusScore += 50 * (state.orderIndex + 1);
    }
    // A wrong-order enclosure forfeits that target's order bonus, never leaves
    // the HUD pointing at an eliminated target or blocks the remaining bonuses.
    while (state.caughtIds.includes(run.level.snake.order[state.orderIndex])) state.orderIndex++;
  }
  run.events.push({
    type: 'snake.caught',
    tick: run.tick,
    time: run.time,
    actorId,
    player: body.playerId,
    capacity: body.capacity,
    chain: state.chain,
    bonusScore: state.bonusScore,
  });
}
const pathPoint = (path, time) =>
  pointAt(
    { x: path.x1, y: path.y1 },
    { x: path.x2, y: path.y2 },
    path.t1 - path.t0 > EPS ? Math.max(0, Math.min(1, (time - path.t0) / (path.t1 - path.t0))) : 1,
  );
function traveled(paths, time) {
  return paths.reduce(
    (sum, path) =>
      sum +
      (time <= path.t0
        ? 0
        : distance({ x: path.x1, y: path.y1 }, pathPoint(path, Math.min(time, path.t1)))),
    0,
  );
}
export function advanceSnakeBodies(run, plans, elapsed) {
  if (!run.snake) return;
  for (const plan of plans) {
    const body = run.snake.bodies.find((body) => body.playerId === plan.playerId);
    if (!body || (run.players && run.players[plan.playerId].status !== 'active')) continue;
    for (const path of plan.paths)
      if (path.t0 < elapsed - EPS) append(body, pathPoint(path, Math.min(elapsed, path.t1)));
  }
}

/** Exact swept point versus a collinear capsule whose endpoints can independently
 * slide. Tail-vacating and neck-exclusion boundaries are resolved in event time. */
function movingCapsule(a, b, startA, startB, endA, endB, radius) {
  const axis =
    distance(startA, endA) > EPS
      ? { x: endA.x - startA.x, y: endA.y - startA.y }
      : distance(startB, endB) > EPS
        ? { x: endB.x - startB.x, y: endB.y - startB.y }
        : { x: 1, y: 0 };
  const length = Math.hypot(axis.x, axis.y),
    ux = axis.x / length,
    uy = axis.y / length;
  const local = (p) => ({ x: p.x * ux + p.y * uy, y: -p.x * uy + p.y * ux });
  const p = local(a),
    q = local(b),
    s = local(startA),
    t = local(startB),
    e = local(endA),
    f = local(endB);
  let interval = linearInterval([0, 1], p.y - s.y, q.y - p.y - (t.y - s.y), -radius, radius);
  interval = linearInterval(interval, p.x - s.x, q.x - p.x - (t.x - s.x), 0, Infinity);
  interval = linearInterval(interval, p.x - e.x, q.x - p.x - (f.x - e.x), -Infinity, 0);
  const times = [
    interval?.[0],
    movingCirclesTime(a, b, startA, startB, radius),
    movingCirclesTime(a, b, endA, endB, radius),
  ].filter((t) => t != null);
  return times.length ? Math.min(...times) : null;
}
/** Each plan is {playerId,radius,paths:[{x1,y1,x2,y2,t0,t1}]}. Historical
 * editions return no contacts. Grid-center motion bounds path history exactly. */
export function snakeContacts(run, plans, horizon) {
  if (!run.snake) return [];
  const contacts = [];
  for (const plan of plans) {
    if (run.players && run.players[plan.playerId].status !== 'active') continue;
    let first = null;
    for (const body of run.snake.bodies) {
      if (body.playerId !== plan.playerId && run.level.snake.friendlyTail !== 'team') continue;
      if (run.players && run.players[body.playerId].status !== 'active') continue;
      const ownerPlan = plans.find((item) => item.playerId === body.playerId),
        ownerPaths = ownerPlan?.paths ?? [];
      let offset = 0;
      for (let index = 1; index < body.points.length; index++) {
        const start = body.points[index - 1],
          end = body.points[index],
          length = distance(start, end),
          begin = offset;
        offset += length;
        for (const path of plan.paths) {
          const lo = Math.max(0, path.t0),
            hi = Math.min(horizon, path.t1);
          if (hi < lo + EPS || length < EPS) continue;
          const cuts = [
            lo,
            hi,
            ...ownerPaths.flatMap((p) => [p.t0, p.t1]).filter((t) => t > lo + EPS && t < hi - EPS),
          ].sort((a, b) => a - b);
          for (let c = 0; c < cuts.length - 1; c++) {
            const from = cuts[c],
              to = cuts[c + 1],
              d0 = traveled(ownerPaths, from),
              d1 = traveled(ownerPaths, to);
            const splits = [from, to];
            if (d1 > d0 + EPS)
              for (const d of [
                begin + body.capacity - body.length,
                offset + body.capacity - body.length,
                begin + SNAKE_NECK_LENGTH - body.length,
                offset + SNAKE_NECK_LENGTH - body.length,
              ])
                if (d > d0 + EPS && d < d1 - EPS)
                  splits.push(from + ((to - from) * (d - d0)) / (d1 - d0));
            splits.sort((a, b) => a - b);
            for (let k = 0; k < splits.length - 1; k++) {
              const t0 = splits[k],
                t1 = splits[k + 1];
              const range = (t) => ({
                lo: Math.max(begin, body.length + traveled(ownerPaths, t) - body.capacity),
                hi: Math.min(offset, body.length + traveled(ownerPaths, t) - SNAKE_NECK_LENGTH),
              });
              if (range((t0 + t1) / 2).hi < range((t0 + t1) / 2).lo + EPS) continue;
              const r0 = range(t0),
                r1 = range(t1);
              const at = (s) => pointAt(start, end, Math.max(0, Math.min(1, (s - begin) / length)));
              const fraction = movingCapsule(
                pathPoint(path, t0),
                pathPoint(path, t1),
                at(r0.lo),
                at(r1.lo),
                at(r0.hi),
                at(r1.hi),
                (plan.radius ?? 0.18) + SNAKE_BODY_RADIUS,
              );
              if (fraction !== null) {
                const time = t0 + (t1 - t0) * fraction;
                if (first === null || time < first.time - EPS)
                  first = {
                    time,
                    player: plan.playerId,
                    owner: body.playerId,
                    kind: 'snake-body',
                    cause: 'snake-body',
                    id: `snake-${body.playerId}`,
                  };
              }
            }
          }
        }
      }
    }
    if (first) contacts.push(first);
  }
  return contacts;
}
export function snakeBodySegments(run) {
  return (run?.snake?.bodies ?? []).flatMap((body) =>
    body.points.slice(1).map((b, index) => ({
      playerId: body.playerId,
      a: point(body.points[index]),
      b: point(b),
      radius: SNAKE_BODY_RADIUS,
    })),
  );
}
export function snakeSummary(run) {
  if (!run?.snake) return null;
  const state = run.snake,
    def = run.level.snake;
  return {
    version: SNAKE_STATE_VERSION,
    lengths: state.bodies.map((body) => body.length),
    capacities: state.bodies.map((body) => body.capacity),
    catches: state.catches,
    chain:
      state.lastCatchTick >= 0 && run.tick - state.lastCatchTick <= def.chainWindowTicks
        ? state.chain
        : 0,
    bestChain: state.bestChain,
    bonusScore: state.bonusScore,
    nextTargetId: def.bonus === 'ordered' ? (def.order[state.orderIndex] ?? null) : null,
    friendlyTail: def.friendlyTail,
  };
}
