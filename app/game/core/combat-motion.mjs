import { CELL } from './registry.mjs';
import { EPS, movingCirclesTime, pointAt } from './geometry.mjs';
import { positionAt, pathPoint } from './movement.mjs';
import { classicEffectActive } from './classic-state.mjs';
import { classicDomainHit } from './classic-motion.mjs';
import { COMBAT_SHOT_RADIUS } from './combat-definition.mjs';
import { combatActors, eliminateCombatPatrol, removeCombatProjectile } from './combat-patrols.mjs';

const segment = (a, b, t0, t1) => ({ x1: a.x, y1: a.y, x2: b.x, y2: b.y, t0, t1 });

function planMotion(state, body, duration, radius, factor, reflect) {
  const a = { x: body.x, y: body.y };
  const b = { x: a.x + body.vx * factor * duration, y: a.y + body.vy * factor * duration };
  const hit = factor ? classicDomainHit(state, a, b, radius, CELL.FIELD) : null;
  const used = duration * (hit?.t ?? 1),
    end = pointAt(a, b, hit?.t ?? 1);
  return {
    body,
    reflect,
    hit,
    paths: [
      segment(a, end, 0, used),
      ...(used < duration - EPS ? [segment(end, end, used, duration)] : []),
    ],
    event: hit ? { time: used } : null,
  };
}

export function planCombatMotion(state, duration) {
  const frozen = classicEffectActive(state, 'enemy-freeze');
  const factor = frozen ? 0 : classicEffectActive(state, 'enemy-slow') ? 0.5 : 1;
  return {
    patrols: combatActors(state)
      .filter((actor) => actor.alive)
      .map((actor) =>
        planMotion(
          state,
          actor,
          duration,
          actor.radius,
          actor.phase === 'cooldown' ? factor : 0,
          true,
        ),
      ),
    shots: (state.classic?.combatPatrols?.projectiles ?? []).map((shot) =>
      planMotion(state, shot, duration, COMBAT_SHOT_RADIUS, factor, false),
    ),
  };
}

function bodyContact(state, paths, plan, trace, horizon, radius) {
  let earliest = null;
  for (const p of paths)
    for (const q of plan.paths) {
      const lo = Math.max(p.t0, q.t0, state.player.cutting ? 0 : (trace.started ?? Infinity));
      const hi = Math.min(p.t1, q.t1, horizon, trace.closure ?? Infinity);
      if (lo > hi + EPS) continue;
      const t = movingCirclesTime(
        pathPoint(p, lo),
        pathPoint(p, hi),
        pathPoint(q, lo),
        pathPoint(q, hi),
        radius + state.rules.playerRadius,
      );
      if (t !== null) earliest = Math.min(earliest ?? Infinity, lo + (hi - lo) * t);
    }
  return earliest;
}

/** Boundary hits constrain the horizon before collision testing, using pre-event
 * geometry. Frozen projectiles are inert, but frozen patrols remain removable. */
export function combatContacts(state, playerPaths, plans, trace, horizon) {
  const rams = [],
    failures = [];
  for (const plan of plans.patrols) {
    const time = bodyContact(state, playerPaths, plan, trace, horizon, plan.body.radius);
    if (time !== null) rams.push({ time, actor: plan.body });
  }
  if (!classicEffectActive(state, 'enemy-freeze') && state.player.graceUntil <= state.time + EPS)
    for (const plan of plans.shots) {
      const time = bodyContact(state, playerPaths, plan, trace, horizon, COMBAT_SHOT_RADIUS);
      if (time !== null && !(plan.event && plan.event.time <= time + EPS))
        failures.push({ time, kind: 'combat-projectile', id: plan.body.actorId, shot: plan.body });
    }
  rams.sort((a, b) => a.time - b.time || (a.actor.id < b.actor.id ? -1 : 1));
  failures.sort((a, b) => a.time - b.time || (a.shot.id < b.shot.id ? -1 : 1));
  return { rams, failure: failures[0] ?? null };
}

export function advanceCombatMotion(state, plans, elapsed) {
  for (const plan of [...plans.patrols, ...plans.shots]) {
    const body = plan.body;
    Object.assign(body, positionAt(plan.paths, elapsed, body));
    if (!plan.reflect || !plan.event || plan.event.time > elapsed + EPS) continue;
    const { nx, ny } = plan.hit;
    if (nx) body.vx = -body.vx;
    if (ny) body.vy = -body.vy;
    if (!nx && !ny) throw new Error('Combat patrol embedded in field boundary');
    body.x += nx * EPS * 2;
    body.y += ny * EPS * 2;
  }
}

/** Invoke only after fatal/closure handling: capture gets the elimination cause,
 * and a surviving shot cannot hit through a previously accepted boundary. */
export function finishCombatMotion(state, plans, contacts, elapsed, failed) {
  for (const plan of plans.shots)
    if (plan.event && plan.event.time <= elapsed + EPS)
      removeCombatProjectile(state, plan.body.id, 'boundary');
  if (!failed)
    for (const hit of contacts.rams)
      if (hit.time <= elapsed + EPS) eliminateCombatPatrol(state, hit.actor, 'ram');
}
