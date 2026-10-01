import { CELL, loadoutHash, MAX_CLASS_HISTORY } from './registry.mjs';
import { EPS } from './geometry.mjs';
import { cellIndex } from './movement.mjs';

export function createAbility(recipe) {
  return {
    primitive: recipe.primitive,
    ammo: 0,
    capacity: recipe.capacity,
    cooldownUntil: 0,
    scanUntil: 0,
    shieldUntil: 0,
    fields: [],
  };
}

/** A body can be replaced anywhere; a gameplay loadout changes only at a safe hangar. */
export function switchClass(state, classId) {
  if (!classId || classId === state.activeClassId) return false;
  const recipe = state.classRecipes.find((c) => c.id === classId);
  const hangar = state.hangars.find(
    (h) => Math.hypot(h.x - state.player.x, h.y - state.player.y) <= h.radius,
  );
  const reason = !recipe
    ? 'unknown-class'
    : state.status !== 'running'
      ? 'not-running'
      : state.player.cutting ||
          state.trail.length ||
          state.cells[cellIndex(state.player.x, state.player.y, state)] !== CELL.SAFE
        ? 'unsafe'
        : !hangar
          ? 'outside-hangar'
          : state.classHistory.length >= MAX_CLASS_HISTORY
            ? 'history-limit'
            : state.time + EPS < state.switchCooldownUntil
              ? 'switch-cooldown'
              : null;
  if (reason) {
    state.events.push({ type: 'class.rejected', tick: state.tick, time: state.time, reason });
    return false;
  }
  const fields = state.ability.fields;
  state.ability.scanUntil = 0;
  state.ability.shieldUntil = 0;
  state._loadouts[state.activeClassId] = state.ability;
  state.activeClassId = classId;
  state.classRecipe = { ...recipe };
  state.ability = Object.hasOwn(state._loadouts, classId)
    ? state._loadouts[classId]
    : createAbility(recipe);
  state.ability.fields = fields;
  state._loadouts[classId] = state.ability;
  state.switchCooldownUntil = state.time + state.rules.switchCooldownSeconds;
  state.classHistory.push({
    classId,
    classRevision: recipe.revision,
    loadoutHash: loadoutHash(recipe),
    tick: state.tick,
  });
  state.events.push({
    type: 'class.switched',
    tick: state.tick,
    time: state.time,
    classId,
    hangarId: hangar.id,
  });
  return true;
}

/** Interference is a visible, fictional arcade field. No real radio parameters. */
export function updateSignal(state) {
  for (const zone of state.signalZones) {
    zone.suppressedUntil = 0;
    for (const field of state.ability.fields) {
      if (!['stun-field', 'impact-pulse'].includes(field.kind) || field.until <= state.time + EPS)
        continue;
      if (Math.hypot(zone.x + zone.w / 2 - field.x, zone.y + zone.h / 2 - field.y) <= field.radius)
        zone.suppressedUntil = Math.max(zone.suppressedUntil, field.until);
    }
  }
  const resistant = !!state.classRecipe.signalResistance;
  const zones = state.signalZones.filter(
    (z) =>
      z.suppressedUntil <= state.time + EPS &&
      state.player.x >= z.x &&
      state.player.x < z.x + z.w &&
      state.player.y >= z.y &&
      state.player.y < z.y + z.h,
  );
  const next = {
    zoneIds: zones.map((z) => z.id),
    resistant,
    speedFactor: resistant ? 1 : zones.reduce((v, z) => Math.min(v, z.speedFactor), 1),
    boostBlocked: !resistant && zones.some((z) => z.disableBoost),
    abilityBlocked: !resistant && zones.some((z) => z.lockAbility),
  };
  if (state.signal && JSON.stringify(state.signal.zoneIds) !== JSON.stringify(next.zoneIds))
    state.events.push({ type: 'signal.changed', tick: state.tick, time: state.time, ...next });
  state.signal = next;
}

/** Earliest challenge violation shares the collision timeline; closure never outruns a tie. */
export function challengeContact(state, trace, horizon) {
  let contact = null;
  const add = (time, kind) => {
    if (time <= horizon + EPS && (!contact || time < contact.time - EPS))
      contact = { time: Math.max(0, time), kind, id: 'challenge' };
  };
  if (state.rules.timeLimitSeconds > 0)
    add(state.rules.timeLimitSeconds - state.time, 'mission-timeout');
  const started = state.player.cutting
    ? state.cutStartedAt
    : trace.started === null
      ? null
      : state.time + trace.started;
  if (started !== null && state.rules.cutTimeLimitSeconds > 0)
    add(started + state.rules.cutTimeLimitSeconds - state.time, 'cut-timeout');
  if (state.rules.maxTrailCells > 0) {
    const seen = new Set(state.trail.map((c) => c.index));
    for (const cell of trace.cells) {
      seen.add(cell.index);
      if (seen.size > state.rules.maxTrailCells) {
        add(cell.time, 'cable-limit');
        break;
      }
    }
  }
  return contact;
}
