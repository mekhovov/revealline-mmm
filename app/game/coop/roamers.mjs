import { EPS } from '../core/geometry.mjs';
import { classicDomainHit } from '../core/classic-motion.mjs';
import { fitsClassicDomain } from '../core/classic-topology.mjs';

export const COOP_ROVER_WARNING_TICKS = 120;
export const isCoopRoamer = (enemy) => enemy.type === 'claimed-rover';
export const activeCoopRoamer = (enemy) => isCoopRoamer(enemy) && enemy.rover?.mode === 'active';

export function initializeCoopRoamers(run) {
  run.roverActorTick = 0;
  for (const enemy of run.enemies)
    if (isCoopRoamer(enemy)) {
      enemy.rover = { mode: 'dormant', activationTick: null };
      enemy.vx = enemy.vy = 0;
    }
}

/** Same actor-tick warning and full-footprint domain contract as Solo. Paused
 * worlds do not advance it. Support can slow movement but cannot skip a warning. */
export function updateCoopRoamers(run, emit) {
  for (const enemy of run.enemies) {
    if (!isCoopRoamer(enemy)) continue;
    const phase = enemy.rover;
    const ready = fitsClassicDomain(run, enemy, enemy.radius, 1);
    if (phase.mode !== 'active' && !ready) {
      if (phase.mode === 'warning') emit(run, 'rover.activationCancelled', { id: enemy.id });
      phase.mode = 'dormant';
      phase.activationTick = null;
      enemy.vx = enemy.vy = 0;
    } else if (phase.mode === 'dormant' && ready) {
      phase.mode = 'warning';
      phase.activationTick = run.roverActorTick + COOP_ROVER_WARNING_TICKS;
      emit(run, 'rover.warning', { id: enemy.id, activationTick: phase.activationTick });
    } else if (phase.mode === 'warning' && run.roverActorTick >= phase.activationTick) {
      phase.mode = 'active';
      enemy.vx = enemy.patrolVelocity.x * enemy.speedScale;
      enemy.vy = enemy.patrolVelocity.y * enemy.speedScale;
      emit(run, 'rover.activated', { id: enemy.id });
    }
  }
}

/** Shared Solo domain query: a reclaimed rover reflects within reclaimed ground
 * and world bounds, never teleporting or acquiring a field-retaining role. */
export function coopRoamerWallContact(run, enemy, horizon) {
  if (!activeCoopRoamer(enemy)) return null;
  const hit = classicDomainHit(
    run,
    enemy,
    { x: enemy.x + enemy.vx * horizon, y: enemy.y + enemy.vy * horizon },
    enemy.radius,
    1,
  );
  return hit ? { time: hit.t * horizon, rover: true, nx: hit.nx, ny: hit.ny } : null;
}

export function reflectCoopRoamer(enemy, hit) {
  if (hit.nx) enemy.vx = -enemy.vx;
  if (hit.ny) enemy.vy = -enemy.vy;
  if (!hit.nx && !hit.ny) {
    enemy.vx = -enemy.vx;
    enemy.vy = -enemy.vy;
  }
  enemy.x += hit.nx * EPS * 2;
  enemy.y += hit.ny * EPS * 2;
}
