import { CELL, DIRECTIONS } from './registry.mjs';
import { EPS, boxTime, pointAt } from './geometry.mjs';
import {
  planPlayer,
  planEnemy,
  positionAt,
  ownershipSpans,
  isCenter,
  cellIndex,
} from './movement.mjs';
import { classicEffectActive, CLASSIC_EFFECT_FACTORS } from './classic-state.mjs';
import { fitsClassicDomain } from './classic-topology.mjs';
import { pressureWaypoint } from './enemy-pressure.mjs';
import { directionalSpeedFactor } from './directional-fields.mjs';
import { varyCollisionCourse } from './field-course.mjs';
import {
  classicContourGraph,
  orientedContourEdge,
  nextContourEdge,
  attachContourAtVertex,
} from './classic-contour.mjs';

const segment = (a, b, t0, t1, direction) => ({
  x1: a.x,
  y1: a.y,
  x2: b.x,
  y2: b.y,
  t0,
  t1,
  direction,
});

/** Split material boundaries before recomputing speed; no fixed-tick sampling shortcut. */
export function planClassicPlayer(state, input, duration) {
  if (!input.direction) return planPlayer(state, input, duration);
  let p = { ...state.player },
    elapsed = 0;
  const paths = [];
  for (let guard = 0; elapsed < duration - EPS && guard < 16; guard++) {
    const direction =
      state.turnPolicy === 'immediate' || isCenter(p) ? input.direction : p.direction;
    const vector = DIRECTIONS[direction];
    const index = cellIndex(p.x + vector.x * EPS * 4, p.y + vector.y * EPS * 4, state);
    const terrain =
      state.cells[index] === CELL.FIELD && state.classic.terrain[index] === 1 ? 0.5 : 1;
    const speed = Math.min(
      60,
      state.rules.moveSpeed *
        (state.classRecipe.moveSpeedMultiplier ?? 1) *
        (state.signal?.speedFactor ?? 1) *
        (input.boost && !state.signal?.boostBlocked ? state.rules.boostMultiplier : 1) *
        (classicEffectActive(state, 'player-speed') ? CLASSIC_EFFECT_FACTORS['player-speed'] : 1) *
        terrain *
        directionalSpeedFactor(state, index, direction),
    );
    const view = {
      ...state,
      player: p,
      rules: { ...state.rules, moveSpeed: speed },
      classRecipe: { ...state.classRecipe, moveSpeedMultiplier: 1 },
      signal: { ...state.signal, speedFactor: 1 },
    };
    const remaining = duration - elapsed,
      plan = planPlayer(view, { ...input, boost: false }, remaining);
    const spans = ownershipSpans(plan.paths, state),
      first = spans[0];
    const horizon = first && first.t1 > EPS ? Math.min(remaining, first.t1) : remaining;
    const position = positionAt(plan.paths, horizon, p),
      active = plan.paths.find((path) => path.t1 >= horizon - EPS);
    for (const path of plan.paths) {
      if (path.t0 >= horizon - EPS) break;
      const end = positionAt([path], Math.min(path.t1, horizon), p);
      paths.push(
        segment(
          { x: path.x1, y: path.y1 },
          end,
          elapsed + path.t0,
          elapsed + Math.min(path.t1, horizon),
          path.direction,
        ),
      );
    }
    if (horizon >= remaining - EPS) p = plan.player;
    else {
      p = { ...p, ...position, direction: active?.direction ?? p.direction, speed };
      p.queuedDirection =
        state.turnPolicy === 'grid-center' && !isCenter(p) && input.direction !== p.direction
          ? input.direction
          : null;
    }
    elapsed += horizon;
  }
  if (elapsed < duration - EPS) throw new Error('Classic player planning bound exceeded');
  return { player: p, paths };
}

/** Earliest domain boundary; collected indices make erosion requests deterministic. */
function domainHit(state, a, b, radius, domain) {
  let best = null;
  const visit = (box, index) => {
    const t = boxTime(a, b, box);
    if (t === null) return;
    if (t < EPS) {
      const q = pointAt(a, b, Math.min(1, 1e-5));
      if (
        q.x <= box.x + EPS ||
        q.x >= box.x + box.w - EPS ||
        q.y <= box.y + EPS ||
        q.y >= box.y + box.h - EPS
      )
        return;
    }
    const p = pointAt(a, b, t),
      nx = Math.abs(p.x - box.x) < 1e-7 ? -1 : Math.abs(p.x - box.x - box.w) < 1e-7 ? 1 : 0;
    const ny = Math.abs(p.y - box.y) < 1e-7 ? -1 : Math.abs(p.y - box.y - box.h) < 1e-7 ? 1 : 0;
    if (!best || t < best.t - EPS) best = { t, nx, ny, indices: [index] };
    else if (Math.abs(t - best.t) < EPS) {
      best.nx ||= nx;
      best.ny ||= ny;
      best.indices.push(index);
    }
  };
  for (
    let y = Math.max(0, Math.floor(Math.min(a.y, b.y) - radius));
    y <= Math.min(state.height - 1, Math.floor(Math.max(a.y, b.y) + radius));
    y++
  )
    for (
      let x = Math.max(0, Math.floor(Math.min(a.x, b.x) - radius));
      x <= Math.min(state.width - 1, Math.floor(Math.max(a.x, b.x) + radius));
      x++
    ) {
      const index = y * state.width + x;
      if (domain === null ? state.cells[index] === CELL.WALL : state.cells[index] !== domain)
        visit({ x: x - radius, y: y - radius, w: 1 + radius * 2, h: 1 + radius * 2 }, index);
    }
  for (const box of [
    { x: -2, y: -2, w: 2 + radius, h: state.height + 4 },
    { x: state.width - radius, y: -2, w: 2, h: state.height + 4 },
    { x: -2, y: -2, w: state.width + 4, h: 2 + radius },
    { x: -2, y: state.height - radius, w: state.width + 4, h: 2 },
  ])
    visit(box, -1);
  return best;
}

// The Team reclaimed-roamer edition uses this same swept domain boundary,
// including world edges. Exporting the pure query does not change Solo motion.
export { domainHit as classicDomainHit };

export function classicEnemyFactor(state, enemy) {
  if (classicEffectActive(state, 'enemy-freeze') || enemy.stunnedUntil > state.time + EPS) return 0;
  return Math.min(
    classicEffectActive(state, 'enemy-slow') ? CLASSIC_EFFECT_FACTORS['enemy-slow'] : 1,
    enemy.slowUntil > state.time + EPS ? enemy.slowFactor : 1,
  );
}

/** Resolve only a repeated illegal penetration, never an ordinary lawful rebound.
 * A closing line can secure the cell beneath a field actor before its impact arrives.
 * A boundary normal from an adjacent cell does not clear an embedded footprint.
 * The old zero-time reversal cannot leave that cell. Project into the nearest legal
 * domain footprint, with row-major ties, then resume ordinary swept motion at this
 * same horizon. No capture, score, clock, or authored descriptor is changed.
 */
function domainRepair(state, enemy, domain) {
  const margin = enemy.radius + EPS * 4;
  let best = null;
  for (let y = 0; y < state.height; y++)
    for (let x = 0; x < state.width; x++) {
      if (state.cells[y * state.width + x] !== domain) continue;
      const clamp = (value, low, high) => Math.max(low, Math.min(high, value));
      const xs = [clamp(enemy.x, x, x + 1), clamp(enemy.x, x + margin, x + 1 - margin)],
        ys = [clamp(enemy.y, y, y + 1), clamp(enemy.y, y + margin, y + 1 - margin)];
      for (const px of xs)
        for (const py of ys) {
          const point = { x: px, y: py };
          if (!fitsClassicDomain(state, point, margin, domain)) continue;
          const distance = (px - enemy.x) ** 2 + (py - enemy.y) ** 2;
          if (!best || distance < best.distance - EPS) best = { ...point, distance };
        }
    }
  if (!best) throw new Error('No legal classic domain recovery position');
  const repaired = { ...enemy, x: best.x, y: best.y };
  if ((best.x - enemy.x) * enemy.vx < -EPS) repaired.vx = -enemy.vx;
  if ((best.y - enemy.y) * enemy.vy < -EPS) repaired.vy = -enemy.vy;
  return repaired;
}

export function planClassicEnemy(state, enemy, duration, { penetrationRecovery = null } = {}) {
  const e = { ...enemy, classic: structuredClone(enemy.classic ?? null) },
    factor = classicEnemyFactor(state, e);
  if (e.type === 'border-patrol') {
    const plan = planEnemy(
      state,
      { ...e, speed: (e.speed ?? 4) * factor, stunnedUntil: 0, slowUntil: 0 },
      duration,
    );
    plan.enemy.speed = enemy.speed;
    plan.enemy.stunnedUntil = enemy.stunnedUntil;
    plan.enemy.slowUntil = enemy.slowUntil;
    return plan;
  }
  const still = () => ({ enemy: e, paths: [segment(e, e, 0, duration)], event: null });
  if (
    !factor ||
    ['lane-boss', 'relay-sentinel'].includes(e.type) ||
    (e.type === 'claimed-rover' && e.classic.mode !== 'active') ||
    (e.type === 'eroder' && e.classic.target !== null)
  )
    return still();
  if (e.type === 'contour-patrol') {
    const c = e.classic;
    if (c.mode === 'idle') return still();
    let edge = null,
      target;
    if (c.mode === 'rejoining') {
      target = c.path[c.pathIndex];
      if (!target) {
        attachContourAtVertex(state, e);
        // Publish attachment at its own horizon before another actor/pickup can
        // interrupt travel on the newly selected edge.
        return { ...still(), event: { time: 0, kind: 'contour-attach' } };
      }
    }
    if (c.mode === 'patrolling') {
      const value = classicContourGraph(state).edges.get(c.edgeId);
      edge = value ? orientedContourEdge(value, e.clockwise) : null;
      if (!edge) return still();
      target = edge.b;
    }
    if (!target) return still();
    const speed = e.speed * factor;
    if (!speed) return still();
    const distance = Math.abs(target.x - e.x) + Math.abs(target.y - e.y);
    let used = Math.min(duration, distance / speed);
    const a = { x: e.x, y: e.y };
    let end = distance > EPS ? pointAt(a, target, Math.min(1, (speed * used) / distance)) : target;
    const wall = domainHit(state, a, end, e.radius, null);
    if (wall) {
      used *= wall.t;
      end = pointAt(a, end, wall.t);
    }
    e.x = end.x;
    e.y = end.y;
    if (edge) c.distance += speed * used;
    let event = null;
    if (wall) {
      c.mode = 'idle';
      event = { time: used, kind: 'contour-blocked' };
    } else if (distance / speed <= duration + EPS) {
      if (edge) {
        const next = nextContourEdge(state, e, edge);
        if (next) {
          c.edgeId = next.id;
          c.distance = 0;
        } else c.mode = 'idle';
      } else c.pathIndex++;
      event = { time: used, kind: 'contour-turn' };
    }
    return {
      enemy: e,
      paths: [
        segment(a, end, 0, used),
        ...(used < duration - EPS ? [segment(end, end, used, duration)] : []),
      ],
      event,
    };
  }
  const domain = e.type === 'claimed-rover' ? CELL.SAFE : CELL.FIELD;
  const waypoint = pressureWaypoint(e, factor, duration),
    motionTime = waypoint?.duration ?? duration;
  if (waypoint) {
    e.vx = waypoint.vx;
    e.vy = waypoint.vy;
  }
  const a = { x: e.x, y: e.y },
    b = { x: a.x + e.vx * factor * motionTime, y: a.y + e.vy * factor * motionTime };
  const hit = domainHit(state, a, b, e.radius, domain),
    used = motionTime * (hit?.t ?? 1),
    end = pointAt(a, b, hit?.t ?? 1),
    penetration = hit && hit.t <= EPS && !fitsClassicDomain(state, a, e.radius, domain);
  if (penetration && penetrationRecovery)
    return {
      enemy: domainRepair(
        state,
        { ...e, vx: penetrationRecovery.vx, vy: penetrationRecovery.vy },
        domain,
      ),
      paths: [segment(a, a, 0, duration)],
      event: { time: 0, kind: 'domain-repair' },
    };
  e.x = end.x;
  e.y = end.y;
  if (hit) {
    if (waypoint) e.classic.pressure.aborted = true;
    if (hit.nx) e.vx = -e.vx;
    if (hit.ny) e.vy = -e.vy;
    if (!hit.nx && !hit.ny) {
      e.vx = -e.vx;
      e.vy = -e.vy;
    }
    if (!penetration && !['warning', 'committed'].includes(e.classic?.pressure?.phase))
      varyCollisionCourse(e, hit.nx, hit.ny, state.seed);
    e.x += hit.nx * EPS * 2;
    e.y += hit.ny * EPS * 2;
  }
  const reached =
    waypoint && !hit && Math.hypot(end.x - waypoint.target.x, end.y - waypoint.target.y) <= EPS;
  if (reached) e.classic.pressure.pathIndex++;
  return {
    enemy: e,
    ...(waypoint ? { pressureVelocity: { vx: waypoint.vx, vy: waypoint.vy } } : {}),
    paths: [
      segment(a, end, 0, used),
      ...(used < duration - EPS ? [segment(end, end, used, duration)] : []),
    ],
    event: hit
      ? {
          time: used,
          kind: 'domain-hit',
          indices: hit.indices,
          ...(penetration ? { penetration: true } : {}),
        }
      : reached
        ? { time: used, kind: 'pressure-waypoint' }
        : null,
  };
}

export function applyClassicEnemy(enemy, plan, elapsed, duration) {
  const at = positionAt(plan.paths, elapsed, enemy);
  if (plan.pressureVelocity) Object.assign(enemy, plan.pressureVelocity);
  if (plan.event?.kind === 'domain-repair' && elapsed >= plan.event.time - EPS) {
    Object.assign(enemy, plan.enemy);
    return;
  }
  if (elapsed >= duration - EPS || (plan.event && elapsed >= plan.event.time - EPS))
    Object.assign(enemy, plan.enemy);
  else if (enemy.type === 'contour-patrol') {
    const traveled = Math.abs(at.x - enemy.x) + Math.abs(at.y - enemy.y);
    if (enemy.classic.mode === 'patrolling') enemy.classic.distance += traveled;
  }
  enemy.x = at.x;
  enemy.y = at.y;
}
