import { CELL, DIRECTIONS } from './registry.mjs';
import { EPS, clamp, boxTime, pointAt, LEGACY_GEOMETRY } from './geometry.mjs';
import { COLLISION_COURSE_VERSION, varyCollisionCourse } from './field-course.mjs';

export const cellIndex = (x, y, { width, height } = LEGACY_GEOMETRY) =>
  clamp(Math.floor(y), 0, height - 1) * width + clamp(Math.floor(x), 0, width - 1);
export const isCenter = (p) =>
  Math.abs(p.x - (Math.floor(p.x) + 0.5)) < EPS && Math.abs(p.y - (Math.floor(p.y) + 0.5)) < EPS;
export const pathPoint = (path, time) =>
  pointAt(
    { x: path.x1, y: path.y1 },
    { x: path.x2, y: path.y2 },
    path.t1 - path.t0 > EPS ? clamp((time - path.t0) / (path.t1 - path.t0), 0, 1) : 1,
  );
export function positionAt(paths, time, fallback) {
  for (const p of paths) if (time <= p.t1 + EPS) return pathPoint(p, time);
  return paths.length
    ? { x: paths.at(-1).x2, y: paths.at(-1).y2 }
    : { x: fallback.x, y: fallback.y };
}
const segment = (a, b, t0, t1, direction) => ({
  x1: a.x,
  y1: a.y,
  x2: b.x,
  y2: b.y,
  t0,
  t1,
  direction,
});

/** Earliest contact with nearby committed topology; art and live trails absent. */
function obstacleHit(cells, a, b, radius, fieldEnemy = false, { width, height } = LEGACY_GEOMETRY) {
  let best = null;
  const xmin = clamp(Math.floor(Math.min(a.x, b.x) - radius), 0, width - 1),
    xmax = clamp(Math.floor(Math.max(a.x, b.x) + radius), 0, width - 1);
  const ymin = clamp(Math.floor(Math.min(a.y, b.y) - radius), 0, height - 1),
    ymax = clamp(Math.floor(Math.max(a.y, b.y) + radius), 0, height - 1);
  for (let y = ymin; y <= ymax; y++)
    for (let x = xmin; x <= xmax; x++) {
      const kind = cells[y * width + x];
      if (kind !== CELL.WALL && !(fieldEnemy && kind === CELL.SAFE)) continue;
      const box = { x: x - radius, y: y - radius, w: 1 + radius * 2, h: 1 + radius * 2 };
      const t = boxTime(a, b, box);
      if (t == null) continue;
      // A boundary point moving out or tangentially is not a fresh collision.
      if (t < EPS) {
        const q = pointAt(a, b, Math.min(1, 1e-5));
        if (
          q.x <= box.x + EPS ||
          q.x >= box.x + box.w - EPS ||
          q.y <= box.y + EPS ||
          q.y >= box.y + box.h - EPS
        )
          continue;
      }
      const p = pointAt(a, b, t);
      const nx = Math.abs(p.x - box.x) < 1e-7 ? -1 : Math.abs(p.x - (box.x + box.w)) < 1e-7 ? 1 : 0;
      const ny = Math.abs(p.y - box.y) < 1e-7 ? -1 : Math.abs(p.y - (box.y + box.h)) < 1e-7 ? 1 : 0;
      if (!best || t < best.t - EPS) best = { t, nx, ny };
      else if (Math.abs(t - best.t) < EPS) {
        best.nx ||= nx;
        best.ny ||= ny;
      }
    }
  return best;
}

export function planPlayer(state, input, duration) {
  const { width, height } = state;
  const start = state.player,
    p = { ...start },
    paths = [];
  const speed =
    state.rules.moveSpeed *
    (state.classRecipe.moveSpeedMultiplier ?? 1) *
    (state.signal?.speedFactor ?? 1) *
    (input.boost && !state.signal?.boostBlocked ? state.rules.boostMultiplier : 1);
  let left = duration,
    time = 0;
  if (!input.direction) {
    p.queuedDirection = null;
    p.speed = 0;
    return { player: p, paths: [segment(p, p, 0, duration, p.direction)] };
  }
  if (state.turnPolicy === 'immediate') {
    p.direction = input.direction;
    p.queuedDirection = null;
  } else if (isCenter(p)) {
    p.direction = input.direction;
    p.queuedDirection = null;
  } else p.queuedDirection = input.direction !== p.direction ? input.direction : null;
  p.speed = speed;
  for (let guard = 0; left > EPS && guard < 8; guard++) {
    if (state.turnPolicy === 'grid-center' && isCenter(p)) {
      p.direction = input.direction;
      p.queuedDirection = null;
    }
    const d = DIRECTIONS[p.direction],
      a = { x: p.x, y: p.y };
    if (state.turnPolicy === 'grid-center' && isCenter(p)) {
      const next = {
        x: clamp(a.x + d.x, 0.5, width - 0.5),
        y: clamp(a.y + d.y, 0.5, height - 0.5),
      };
      const blocked = obstacleHit(state.cells, a, next, state.rules.playerRadius, false, state);
      const protectedExit =
        state.player.graceUntil > state.time + EPS &&
        state.cells[cellIndex(next.x, next.y, state)] === CELL.FIELD;
      // Do not leave a reachable center toward a blocked center. This lets a
      // held reverse/perpendicular command escape a wall without a snap.
      if (blocked || protectedExit) {
        p.speed = 0;
        p.queuedDirection = null;
        break;
      }
    }
    let travel = speed * left;
    if (state.turnPolicy === 'grid-center') {
      const v = d.x ? p.x : p.y,
        sign = d.x || d.y;
      const next = sign > 0 ? Math.floor(v - 0.5 + EPS) + 1.5 : Math.ceil(v - 0.5 - EPS) - 0.5;
      travel = Math.min(travel, Math.abs(next - v));
    }
    let b = {
      x: clamp(a.x + d.x * travel, 0.5, width - 0.5),
      y: clamp(a.y + d.y * travel, 0.5, height - 0.5),
    };
    const hit = obstacleHit(state.cells, a, b, state.rules.playerRadius, false, state);
    if (hit) b = pointAt(a, b, hit.t);
    const distance = Math.abs(b.x - a.x) + Math.abs(b.y - a.y),
      used = distance / speed;
    if (distance > EPS) paths.push(segment(a, b, time, time + used, p.direction));
    p.x = b.x;
    p.y = b.y;
    time += used;
    left -= used;
    if (hit || distance < travel - EPS || distance < EPS) {
      p.speed = 0;
      p.queuedDirection = null;
      break;
    }
  }
  if (time < duration - EPS) paths.push(segment(p, p, time, duration, p.direction));
  return { player: p, paths };
}

export function patrolDistance(p, { width, height } = LEGACY_GEOMETRY) {
  const right = width - 1,
    bottom = height - 1;
  if (p.y === 0.5) return p.x - 0.5;
  if (p.x === width - 0.5) return right + p.y - 0.5;
  if (p.y === height - 0.5) return right + bottom + (width - 0.5) - p.x;
  return 2 * right + bottom + (height - 0.5) - p.y;
}
function perimeterPoint(t, { width, height } = LEGACY_GEOMETRY) {
  const right = width - 1,
    bottom = height - 1,
    perimeter = 2 * (right + bottom);
  t = ((t % perimeter) + perimeter) % perimeter;
  if (t <= right) return { x: 0.5 + t, y: 0.5 };
  if (t <= right + bottom) return { x: width - 0.5, y: 0.5 + t - right };
  if (t <= 2 * right + bottom) return { x: width - 0.5 - (t - (right + bottom)), y: height - 0.5 };
  return { x: 0.5, y: height - 0.5 - (t - (2 * right + bottom)) };
}
export function planEnemy(state, enemy, duration) {
  const e = { ...enemy },
    paths = [];
  let time = 0,
    left = duration;
  const factor =
    e.stunnedUntil > state.time + EPS
      ? 0
      : e.slowUntil > state.time + EPS
        ? (e.slowFactor ?? 0.25)
        : 1;
  if (e.type === 'border-patrol') {
    const right = state.width - 1,
      bottom = state.height - 1,
      perimeter = 2 * (right + bottom);
    const speed = (e.speed ?? 4) * factor,
      sign = e.clockwise === false ? -1 : 1;
    for (let guard = 0; left > EPS && speed > 0 && guard < 8; guard++) {
      const t = ((e.perimeter % perimeter) + perimeter) % perimeter;
      const limits =
        sign > 0
          ? [right, right + bottom, 2 * right + bottom, perimeter]
          : [2 * right + bottom, right + bottom, right, 0];
      const target = sign > 0 ? limits.find((v) => v > t + EPS) : limits.find((v) => v < t - EPS);
      const edge = target ?? (sign > 0 ? perimeter : 0),
        distance = Math.abs(edge - t) || perimeter;
      const travel = Math.min(speed * left, distance),
        used = travel / speed,
        a = { x: e.x, y: e.y };
      e.perimeter += sign * travel;
      const b = perimeterPoint(e.perimeter, state);
      e.x = b.x;
      e.y = b.y;
      paths.push(segment(a, b, time, time + used));
      time += used;
      left -= used;
    }
  } else if (e.type === 'bouncer') {
    for (let guard = 0; left > EPS && factor > 0 && guard < 8; guard++) {
      const a = { x: e.x, y: e.y },
        b = { x: a.x + e.vx * factor * left, y: a.y + e.vy * factor * left };
      const hit = obstacleHit(state.cells, a, b, e.radius, true, state),
        fraction = hit ? hit.t : 1,
        used = left * fraction,
        end = pointAt(a, b, fraction);
      paths.push({
        ...segment(a, end, time, time + used),
        ...(e.course === COLLISION_COURSE_VERSION
          ? { courseVelocity: { vx: e.vx, vy: e.vy } }
          : {}),
      });
      e.x = end.x;
      e.y = end.y;
      time += used;
      left -= used;
      if (!hit) break;
      if (hit.nx) e.vx = -e.vx;
      if (hit.ny) e.vy = -e.vy;
      if (!hit.nx && !hit.ny) {
        e.vx = -e.vx;
        e.vy = -e.vy;
      }
      varyCollisionCourse(e, hit.nx, hit.ny, state.seed);
      // Move away by a geometry epsilon, not a visible or distance-based step.
      e.x += (hit.nx || 0) * EPS * 2;
      e.y += (hit.ny || 0) * EPS * 2;
    }
  }
  if (!paths.length || time < duration - EPS)
    paths.push({
      ...segment(e, e, time, duration),
      ...(e.course === COLLISION_COURSE_VERSION ? { courseVelocity: { vx: e.vx, vy: e.vy } } : {}),
    });
  return { enemy: e, paths };
}

/** Split cardinal paths at cell edges, retaining exact times. */
export function ownershipSpans(paths, geometry = LEGACY_GEOMETRY) {
  const spans = [];
  for (const p of paths) {
    const dx = p.x2 - p.x1,
      dy = p.y2 - p.y1,
      length = Math.abs(dx) + Math.abs(dy);
    if (length < EPS) continue;
    const v1 = dx ? p.x1 : p.y1,
      v2 = dx ? p.x2 : p.y2,
      points = [0, 1];
    for (let v = Math.floor(Math.min(v1, v2)) + 1; v < Math.max(v1, v2) - EPS; v++)
      points.push((v - v1) / (v2 - v1));
    points.sort((a, b) => a - b);
    for (let i = 0; i < points.length - 1; i++) {
      const a = pointAt({ x: p.x1, y: p.y1 }, { x: p.x2, y: p.y2 }, points[i]);
      const b = pointAt({ x: p.x1, y: p.y1 }, { x: p.x2, y: p.y2 }, points[i + 1]);
      // Floating arithmetic may place a previous endpoint a few ulps before an
      // integer boundary. It must not create an extra historical trail segment.
      if (Math.abs(b.x - a.x) + Math.abs(b.y - a.y) < EPS) continue;
      const middle = pointAt(a, b, 0.5),
        index = cellIndex(middle.x, middle.y, geometry);
      spans.push({
        ...segment(
          a,
          b,
          p.t0 + (p.t1 - p.t0) * points[i],
          p.t0 + (p.t1 - p.t0) * points[i + 1],
          p.direction,
        ),
        index,
      });
    }
  }
  return spans;
}

export function applyPlannedEnemy(enemy, plan, time, duration, geometry = LEGACY_GEOMETRY) {
  const at = positionAt(plan.paths, time, enemy);
  if (time >= duration - EPS) Object.assign(enemy, plan.enemy);
  else {
    const path = plan.paths.find((p) => p.t1 > time + EPS) ?? plan.paths.at(-1);
    if (path?.courseVelocity) Object.assign(enemy, path.courseVelocity);
    else if (enemy.type === 'bouncer' && path && path.t1 - path.t0 > EPS) {
      const factor =
        enemy.stunnedUntil > 0 && Math.abs(path.x2 - path.x1) + Math.abs(path.y2 - path.y1) < EPS
          ? 0
          : 1;
      if (factor) {
        if (path.x2 !== path.x1) enemy.vx = Math.sign(path.x2 - path.x1) * Math.abs(enemy.vx);
        if (path.y2 !== path.y1) enemy.vy = Math.sign(path.y2 - path.y1) * Math.abs(enemy.vy);
      }
    }
    if (enemy.type === 'border-patrol') enemy.perimeter = patrolDistance(at, geometry);
  }
  enemy.x = at.x;
  enemy.y = at.y;
}
