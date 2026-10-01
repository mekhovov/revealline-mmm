import { CELL } from './registry.mjs';
import { EPS } from './geometry.mjs';
import { classicEffectActive } from './classic-state.mjs';
import { classicDomainHit } from './classic-motion.mjs';
import { fitsClassicDomain } from './classic-topology.mjs';
import { COMBAT_RADIUS, COMBAT_SHOT_RADIUS, COMBAT_MAX_PROJECTILES } from './combat-definition.mjs';

const directions = [
  [0, -1],
  [1, -1],
  [1, 0],
  [1, 1],
  [0, 1],
  [-1, 1],
  [-1, 0],
  [-1, -1],
];
export const combatActors = (state) => state.classic?.combatPatrols?.actors ?? [];
const definitions = (state) => state.level.classic.combatPatrols.actors;
const definition = (state, actor) => definitions(state).find((item) => item.id === actor.id);
const live = (actor) => actor.alive;
const emit = (state, type, data) =>
  state.events.push({
    type: `combat.${type}`,
    tick: state.tick,
    time: state.time,
    ...data,
  });

function actorSeed(seed, id) {
  let hash = (2166136261 ^ seed) >>> 0;
  for (let i = 0; i < id.length; i++) hash = Math.imul(hash ^ id.charCodeAt(i), 16777619) >>> 0;
  return hash || 0x9e3779b9;
}
function nextRandom(actor) {
  let x = actor.random;
  x ^= x << 13;
  x ^= x >>> 17;
  x ^= x << 5;
  actor.random = x >>> 0;
  return actor.random;
}
function velocity(actor, x, y, speed) {
  const length = Math.hypot(x, y);
  actor.vx = (x / length) * speed;
  actor.vy = (y / length) * speed;
}

/** No new authority at all for absent/disabled historical extensions. */
export function initializeCombatPatrols(state) {
  const descriptor = state.level.classic?.combatPatrols;
  if (!descriptor?.enabled) return;
  state.classic.combatPatrols = {
    version: 'combat-patrol-state.v1',
    nextShotId: 1,
    actors: descriptor.actors
      .map((item) => {
        const actor = {
          id: item.id,
          role: item.role,
          x: item.x,
          y: item.y,
          radius: COMBAT_RADIUS,
          alive: true,
          random: actorSeed(state.seed, item.id),
          nextTurnTick: item.turnTicks,
          phase: 'cooldown',
          ...(item.role === 'sentry'
            ? {
                nextScanTick: item.openingTicks,
                warningUntil: null,
                recoveryUntil: null,
                aim: null,
              }
            : {}),
        };
        velocity(actor, item.headingX, item.headingY, item.speed);
        return actor;
      })
      .sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0)),
    projectiles: [],
    eliminations: [],
  };
}

function removeShots(state, predicate, reason) {
  const combat = state.classic?.combatPatrols;
  if (!combat) return;
  combat.projectiles = combat.projectiles.filter((shot) => {
    if (!predicate(shot)) return true;
    emit(state, reason === 'expiry' ? 'expired' : 'projectileRemoved', {
      id: shot.id,
      actorId: shot.actorId,
      reason,
      x: shot.x,
      y: shot.y,
    });
    return false;
  });
}

export function eliminateCombatPatrol(state, actor, cause) {
  if (!actor.alive) return;
  actor.alive = false;
  actor.phase = 'eliminated';
  if (actor.role === 'sentry') {
    actor.aim = null;
    actor.warningUntil = null;
    actor.recoveryUntil = null;
  }
  const record = {
    id: actor.id,
    cause,
    x: actor.x,
    y: actor.y,
    tick: state.tick,
    time: state.time,
  };
  state.classic.combatPatrols.eliminations.push(record);
  emit(state, 'eliminated', record);
  removeShots(state, (shot) => shot.actorId === actor.id, 'owner-eliminated');
}

function cancelWarning(state, actor, reason) {
  if (actor.phase !== 'warning') return;
  actor.phase = 'cooldown';
  actor.nextScanTick = state.classic.actorTick + definition(state, actor).restTicks;
  actor.aim = null;
  actor.warningUntil = null;
  emit(state, 'cancelled', { id: actor.id, reason });
}

/** Event-driven cleanup is mandatory even while AI and projectiles are frozen. */
export function clearCombatPatrols(state, reason) {
  const combat = state.classic?.combatPatrols;
  if (!combat) return;
  removeShots(state, () => true, reason);
  for (const actor of combat.actors.filter(live)) {
    cancelWarning(state, actor, reason);
    if (reason === 'recovery' && actor.role === 'sentry') {
      actor.phase = 'cooldown';
      actor.recoveryUntil = null;
      actor.nextScanTick = state.classic.actorTick + definition(state, actor).restTicks;
    }
  }
}

const clearRay = (state, actor, target) =>
  classicDomainHit(state, actor, target, 0, CELL.FIELD) === null;
function warningValid(state, actor) {
  return (
    state.status === 'running' &&
    state.player.cutting &&
    state.player.graceUntil <= state.time + EPS &&
    actor.aim &&
    clearRay(state, actor, actor.aim)
  );
}

/** Capture never treats these actors as region seeds. Shared radius envelopes
 * match classic domain motion, including corners, so no actor is left embedded. */
export function captureCombatPatrols(state) {
  const combat = state.classic?.combatPatrols;
  if (!combat) return;
  for (const actor of combat.actors.filter(live)) {
    if (!fitsClassicDomain(state, actor, actor.radius, CELL.FIELD))
      eliminateCombatPatrol(state, actor, 'capture');
    else if (actor.phase === 'warning' && !warningValid(state, actor))
      cancelWarning(state, actor, 'capture');
  }
  removeShots(
    state,
    (shot) => !fitsClassicDomain(state, shot, COMBAT_SHOT_RADIUS, CELL.FIELD),
    'capture',
  );
}

export function expireCombatProjectiles(state) {
  if (classicEffectActive(state, 'enemy-freeze')) return;
  removeShots(state, (shot) => state.classic.actorTick >= shot.expiresAtTick, 'expiry');
}

/** Exactly one AI pass after the world and release/capture transaction. Descriptor
 * speed and rest are resolved values; preset factors never run in the core. */
export function updateCombatPatrols(state) {
  const combat = state.classic?.combatPatrols;
  if (
    !combat ||
    !['running', 'respawning'].includes(state.status) ||
    classicEffectActive(state, 'enemy-freeze')
  )
    return;
  const tick = state.classic.actorTick;
  for (const actor of combat.actors.filter(live)) {
    const def = definition(state, actor);
    if (actor.role === 'sentry') {
      if (actor.phase === 'warning') {
        if (!warningValid(state, actor)) cancelWarning(state, actor, 'target-unavailable');
        else if (tick >= actor.warningUntil) {
          if (combat.projectiles.length < COMBAT_MAX_PROJECTILES) {
            const dx = actor.aim.x - actor.x,
              dy = actor.aim.y - actor.y;
            const length = Math.hypot(dx, dy);
            if (length > EPS) {
              const shot = {
                id: `combat-shot-${combat.nextShotId++}`,
                actorId: actor.id,
                x: actor.x,
                y: actor.y,
                vx: (dx / length) * def.shotSpeed,
                vy: (dy / length) * def.shotSpeed,
                expiresAtTick: tick + def.shotLifeTicks,
              };
              combat.projectiles.push(shot);
              emit(state, 'fired', {
                id: shot.id,
                actorId: actor.id,
                x: shot.x,
                y: shot.y,
                aim: { ...actor.aim },
              });
            }
          } else emit(state, 'shotSkipped', { id: actor.id, reason: 'capacity' });
          actor.phase = 'recovery';
          actor.recoveryUntil = tick + def.recoveryTicks;
          actor.warningUntil = null;
          actor.aim = null;
        }
      } else if (actor.phase === 'recovery' && tick >= actor.recoveryUntil) {
        actor.phase = 'cooldown';
        actor.nextScanTick = actor.recoveryUntil + def.restTicks;
        actor.recoveryUntil = null;
      } else if (actor.phase === 'cooldown' && tick >= actor.nextScanTick) {
        if (
          state.status === 'running' &&
          state.player.cutting &&
          state.player.graceUntil <= state.time + EPS &&
          Math.hypot(state.player.x - actor.x, state.player.y - actor.y) <= def.senseRadius + EPS &&
          clearRay(state, actor, state.player)
        ) {
          actor.phase = 'warning';
          actor.aim = { x: state.player.x, y: state.player.y };
          actor.warningUntil = tick + def.warningTicks;
          emit(state, 'locked', {
            id: actor.id,
            aim: { ...actor.aim },
            warningUntil: actor.warningUntil,
          });
        } else actor.nextScanTick = tick + def.scanTicks;
      }
    }
    if (actor.phase === 'cooldown' && tick >= actor.nextTurnTick) {
      const [x, y] = directions[nextRandom(actor) % directions.length];
      velocity(actor, x, y, def.speed);
      actor.nextTurnTick = tick + def.turnTicks;
    }
  }
}

export function impactCombatProjectile(state, shot) {
  emit(state, 'impact', { id: shot.id, actorId: shot.actorId, x: shot.x, y: shot.y });
}

export function removeCombatProjectile(state, id, reason) {
  removeShots(state, (shot) => shot.id === id, reason);
}
