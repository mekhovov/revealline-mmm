import {
  isPursuitSpecialist,
  protectedPursuitContact,
  specialistMotionAllowed,
} from '../hunt/pursuit-specialists.mjs';
import { combatOwner, huntDefinition } from '../hunt/running-enemy-definition.mjs';
import { huntTargetKind } from '../hunt/rules.mjs';
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
  const proposed = { x: a.x + body.vx * factor * duration, y: a.y + body.vy * factor * duration };
  const b =
    reflect &&
    !specialistMotionAllowed(
      body,
      proposed,
      state,
      state.status === 'running' ? [state.player] : [],
      state.rules.playerRadius,
    )
      ? a
      : proposed;
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
    shots: (combatOwner(state)?.combatPatrols?.projectiles ?? []).map((shot) =>
      planMotion(state, shot, duration, COMBAT_SHOT_RADIUS, factor, false),
    ),
  };
}

function bodyContact(state, paths, plan, trace, horizon, radius, huntTouch = false) {
  let earliest = null;
  for (const p of paths)
    for (const q of plan.paths) {
      const lo = Math.max(
        p.t0,
        q.t0,
        huntTouch || state.player.cutting ? 0 : (trace.started ?? Infinity),
      );
      const hi = Math.min(p.t1, q.t1, horizon, huntTouch ? Infinity : (trace.closure ?? Infinity));
      if (lo > hi + EPS) continue;
      const t = movingCirclesTime(
        pathPoint(p, lo),
        pathPoint(p, hi),
        pathPoint(q, lo),
        pathPoint(q, hi),
        radius + state.rules.playerRadius,
      );
      if (t !== null) {
        const contactAt = lo + (hi - lo) * t;
        // Hunt touch crosses the reclaimed boundary, never a wall or closed gate.
        // Shot exposure and every historical scout/sentry contact keep their old gate.
        if (
          huntTouch &&
          classicDomainHit(state, pathPoint(p, contactAt), pathPoint(q, contactAt), 0, null)
        )
          continue;
        earliest = Math.min(earliest ?? Infinity, contactAt);
      }
    }
  return earliest;
}

/** Boundary hits constrain the horizon before collision testing, using pre-event
 * geometry. Frozen projectiles are inert, but frozen patrols remain removable. */
export function combatContacts(state, playerPaths, plans, trace, horizon) {
  const rams = [],
    failures = [];
  for (const plan of plans.patrols) {
    const time = bodyContact(
      state,
      playerPaths,
      plan,
      trace,
      horizon,
      plan.body.radius,
      state.status === 'running' &&
        huntTargetKind(huntDefinition(state.level), plan.body.id) !== null,
    );
    if (time !== null) {
      const player = positionAt(playerPaths, time, state.player),
        actor = positionAt(plan.paths, time, plan.body);
      if (protectedPursuitContact(plan.body, player, actor)) {
        if (state.player.graceUntil <= state.time + EPS)
          failures.push({ time, kind: 'combat-specialist', id: plan.body.id });
      } else rams.push({ time, actor: plan.body });
    }
  }
  if (!classicEffectActive(state, 'enemy-freeze') && state.player.graceUntil <= state.time + EPS)
    for (const plan of plans.shots) {
      const time = bodyContact(state, playerPaths, plan, trace, horizon, COMBAT_SHOT_RADIUS);
      if (time !== null && !(plan.event && plan.event.time <= time + EPS))
        failures.push({ time, kind: 'combat-projectile', id: plan.body.actorId, shot: plan.body });
    }
  rams.sort((a, b) => a.time - b.time || (a.actor.id < b.actor.id ? -1 : 1));
  failures.sort(
    (a, b) => a.time - b.time || ((a.shot?.id ?? a.id) < (b.shot?.id ?? b.id) ? -1 : 1),
  );
  return { rams, failure: failures[0] ?? null };
}

export function advanceCombatMotion(state, plans, elapsed) {
  for (const plan of [...plans.patrols, ...plans.shots]) {
    const body = plan.body;
    Object.assign(body, positionAt(plan.paths, elapsed, body));
    if (!plan.reflect || !plan.event || plan.event.time > elapsed + EPS) continue;
    const { nx, ny } = plan.hit;
    if (isPursuitSpecialist(body)) {
      body.vx = 0;
      body.vy = 0;
    } else {
      if (nx) body.vx = -body.vx;
      if (ny) body.vy = -body.vy;
    }
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
