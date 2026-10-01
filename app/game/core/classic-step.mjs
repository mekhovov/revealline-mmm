import {
  nextLineImpactSeed,
  nextLineImpactEvent,
  advanceLineImpacts,
  finishLineImpactDepartures,
  seedLineImpact,
  clearLineImpacts,
} from './line-impact.mjs';
import { CELL, FIXED_DT } from './registry.mjs';
import { EPS, boxTime, circleTime } from './geometry.mjs';
import { positionAt, cellIndex, pathPoint, patrolDistance } from './movement.mjs';
import {
  tracePlan,
  selfContact,
  appendTrail,
  commitCapture,
  releaseIsolatedCapture,
} from './capture.mjs';
import { enemyContact } from './contacts.mjs';
import { updateAbilities, useAbilities } from './abilities.mjs';
import { arcadeCommand } from './arcade-actions.mjs';
import { switchClass, updateSignal, challengeContact } from './systems.mjs';
import { updateEncounter, canReleaseIsolated } from './encounter.mjs';
import { CLASSIC_EFFECTS, classicEffectActive } from './classic-state.mjs';
import {
  classicErosionReason,
  commitClassicErosion,
  updateClassicAnchors,
  fitsClassicDomain,
} from './classic-topology.mjs';
import {
  contourEdgeId,
  classicContourGraph,
  orientedContourEdge,
  repairClassicContours,
} from './classic-contour.mjs';
import { planClassicPlayer, planClassicEnemy, applyClassicEnemy } from './classic-motion.mjs';
import { initializeEnemyPressure, updateEnemyPressure } from './enemy-pressure.mjs';
import { steerFieldCourse } from './field-course.mjs';
import {
  updateTimedBonuses,
  collectTimedBonus,
  cancelHazardousTimedBonuses,
} from './timed-bonuses.mjs';
import {
  initializeCombatPatrols,
  expireCombatProjectiles,
  updateCombatPatrols,
  impactCombatProjectile,
  clearCombatPatrols,
} from './combat-patrols.mjs';
import {
  planCombatMotion,
  combatContacts,
  advanceCombatMotion,
  finishCombatMotion,
} from './combat-motion.mjs';

export function initializeClassicActors(state) {
  for (const enemy of state.enemies) {
    if (enemy.type === 'claimed-rover') enemy.classic = { mode: 'dormant', activationTick: null };
    if (enemy.type === 'eroder')
      enemy.classic = { target: null, erosionAt: null, cooldownUntil: 0 };
    if (enemy.type === 'contour-patrol') {
      const edgeId = contourEdgeId(enemy.edge, state.width),
        edge = orientedContourEdge(classicContourGraph(state).edges.get(edgeId), enemy.clockwise);
      enemy.x = (edge.a.x + edge.b.x) / 2;
      enemy.y = (edge.a.y + edge.b.y) / 2;
      enemy.classic = {
        mode: 'patrolling',
        edgeId,
        distance: 0.5,
        path: [],
        pathIndex: 0,
        topologyRevision: 0,
      };
    }
  }
  initializeEnemyPressure(state);
  initializeCombatPatrols(state);
  updateClassicAnchors(state);
}

function updateActors(state) {
  for (const enemy of state.enemies) {
    if (enemy.type !== 'claimed-rover') continue;
    const c = enemy.classic,
      ready = fitsClassicDomain(state, enemy, enemy.radius, CELL.SAFE);
    if (c.mode !== 'active' && !ready) {
      if (c.mode === 'warning')
        state.events.push({
          type: 'rover.activationCancelled',
          tick: state.tick,
          time: state.time,
          id: enemy.id,
        });
      c.mode = 'dormant';
      c.activationTick = null;
    } else if (c.mode === 'dormant' && ready) {
      c.mode = 'warning';
      c.activationTick = state.classic.actorTick + 120;
      state.events.push({
        type: 'rover.warning',
        tick: state.tick,
        time: state.time,
        id: enemy.id,
        activationTick: c.activationTick,
      });
    } else if (c.mode === 'warning' && state.classic.actorTick >= c.activationTick) {
      c.mode = 'active';
      state.events.push({
        type: 'rover.activated',
        tick: state.tick,
        time: state.time,
        id: enemy.id,
      });
    }
  }
  repairClassicContours(state);
}

function materialContact(state, paths, horizon) {
  let best = null;
  const radius = state.rules.playerRadius;
  for (const path of paths) {
    const hi = Math.min(path.t1, horizon);
    if (path.t0 > hi + EPS) continue;
    const a = { x: path.x1, y: path.y1 },
      b = pathPoint(path, hi);
    for (
      let y = Math.max(1, Math.floor(Math.min(a.y, b.y) - radius));
      y <= Math.min(state.height - 2, Math.floor(Math.max(a.y, b.y) + radius));
      y++
    )
      for (
        let x = Math.max(1, Math.floor(Math.min(a.x, b.x) - radius));
        x <= Math.min(state.width - 2, Math.floor(Math.max(a.x, b.x) + radius));
        x++
      ) {
        const index = y * state.width + x;
        if (state.cells[index] !== CELL.FIELD || state.classic.terrain[index] !== 2) continue;
        const t = boxTime(a, b, {
          x: x - radius,
          y: y - radius,
          w: 1 + radius * 2,
          h: 1 + radius * 2,
        });
        if (t === null) continue;
        const time = path.t0 + (hi - path.t0) * t;
        if (
          !best ||
          time < best.time - EPS ||
          (Math.abs(time - best.time) < EPS && index < best.index)
        )
          best = { time, kind: 'lethal-terrain', id: `terrain-${index}`, index };
      }
  }
  return best;
}

function pickupContacts(state, paths, horizon) {
  const hits = [];
  for (const item of state.classic.powerups) {
    if (item.collectedTick !== null) continue;
    let time = null;
    for (const path of paths) {
      const hi = Math.min(path.t1, horizon);
      if (path.t0 > hi + EPS) continue;
      const t = circleTime(
        { x: path.x1, y: path.y1 },
        pathPoint(path, hi),
        item,
        0.45 + state.rules.playerRadius,
      );
      if (t !== null) time = Math.min(time ?? Infinity, path.t0 + (hi - path.t0) * t);
    }
    if (time !== null) hits.push({ time, item });
  }
  return hits.sort((a, b) => a.time - b.time || (a.item.id < b.item.id ? -1 : 1));
}

function collect(state, hits, elapsed) {
  for (const { item, time } of hits
    .filter((hit) => hit.time <= elapsed + EPS)
    .sort((a, b) => (a.item.id < b.item.id ? -1 : 1))) {
    item.collectedTick = state.tick;
    let gain = null,
      activationTick = null,
      untilTick = null;
    if (item.kind === 'extra-life') {
      gain = Number(state.lives < 9);
      state.lives += gain;
    } else {
      const effect = state.classic.effects[item.kind];
      activationTick = state.tick + 1;
      // Refresh an active effect without opening a one-tick gap in it.
      if (!classicEffectActive(state, item.kind)) effect.from = activationTick;
      effect.until = Math.max(effect.until, activationTick + CLASSIC_EFFECTS[item.kind]);
      untilTick = effect.until;
    }
    state.events.push({
      type: 'powerup.collected',
      tick: state.tick,
      time: state.time - elapsed + time,
      id: item.id,
      kind: item.kind,
      gain,
      activationTick,
      untilTick,
      ...(state.classic.timedBonuses?.schedules.some((entry) => entry.id === item.id)
        ? { x: item.x, y: item.y }
        : {}),
    });
    collectTimedBonus(state, item);
  }
}

const failureOrder = [
  'mission-timeout',
  'cut-timeout',
  'cable-limit',
  'self-contact',
  'lethal-terrain',
  'enemy-trail',
  'enemy-player',
  'boss-lane',
  'combat-projectile',
];
function firstFailure(candidates) {
  return (
    candidates
      .filter(Boolean)
      .sort((a, b) =>
        Math.abs(a.time - b.time) > EPS
          ? a.time - b.time
          : failureOrder.indexOf(a.kind) - failureOrder.indexOf(b.kind) ||
            (a.id < b.id ? -1 : a.id > b.id ? 1 : 0),
      )[0] ?? null
  );
}
function won(state) {
  return (
    state.coverage + EPS >= state.level.goal.coverage &&
    state.objectives.every((item) => !item.required || item.captured) &&
    (!state.encounter || state.encounter.defeated)
  );
}
function erosionDue(state) {
  return (
    !classicEffectActive(state, 'enemy-freeze') &&
    state.enemies.some(
      (e) =>
        e.type === 'eroder' &&
        e.classic.target !== null &&
        e.classic.erosionAt <= state.classic.actorTick,
    )
  );
}

function world(state, input, hooks) {
  const stalledDomains = new Map();
  let remaining = FIXED_DT,
    blocked = false,
    interrupted = state.status === 'respawning';
  for (let guard = 0; remaining > EPS && guard < 128; guard++) {
    const recovering = state.status === 'respawning';
    const playerPlan =
      recovering || blocked
        ? {
            player: { ...state.player, speed: 0 },
            paths: [
              {
                x1: state.player.x,
                y1: state.player.y,
                x2: state.player.x,
                y2: state.player.y,
                t0: 0,
                t1: remaining,
                direction: state.player.direction,
              },
            ],
          }
        : planClassicPlayer(state, input, remaining);
    const trace = recovering
      ? { additions: [], cells: [], started: null, closure: null, stop: null }
      : tracePlan(state, playerPlan.paths, remaining);
    const topologyRevision = state.classic.topologyRevision;
    const plans = state.enemies.map((enemy) => {
      const stalled = stalledDomains.get(enemy.id);
      return planClassicEnemy(state, enemy, remaining, {
        penetrationRecovery:
          stalled?.x === enemy.x &&
          stalled?.y === enemy.y &&
          stalled?.topologyRevision === topologyRevision
            ? stalled
            : null,
      });
    });
    const incoming = state.enemies.map(({ x, y, vx, vy }) => ({ x, y, vx, vy }));
    const combatPlans = planCombatMotion(state, remaining);
    let horizon = Math.min(
      remaining,
      trace.closure ?? Infinity,
      trace.stop ?? Infinity,
      ...plans.map((plan) => plan.event?.time ?? Infinity),
      ...combatPlans.patrols.map((plan) => plan.event?.time ?? Infinity),
      ...combatPlans.shots.map((plan) => plan.event?.time ?? Infinity),
      erosionDue(state) ? 0 : Infinity,
    );
    const impactSeed = recovering ? null : nextLineImpactSeed(state, plans, trace, horizon);
    const impactEvent = recovering ? null : nextLineImpactEvent(state, trace, horizon);
    horizon = Math.min(horizon, impactSeed?.time ?? Infinity, impactEvent?.time ?? Infinity);
    const hits = recovering ? [] : pickupContacts(state, playerPlan.paths, horizon);
    horizon = Math.min(horizon, hits[0]?.time ?? Infinity);
    const combat = recovering
      ? { rams: [], failure: null }
      : combatContacts(state, playerPlan.paths, combatPlans, trace, horizon);
    horizon = Math.min(horizon, combat.rams[0]?.time ?? Infinity);
    const self = recovering ? null : selfContact(state, trace, horizon);
    const failure = firstFailure([
      combat.failure && combat.failure.time <= horizon + EPS ? combat.failure : null,
      challengeContact(state, trace, horizon),
      self === null ? null : { time: self, kind: 'self-contact', id: 'player' },
      recovering ? null : materialContact(state, playerPlan.paths, horizon),
      recovering
        ? null
        : enemyContact(state, playerPlan.paths, plans, trace, horizon, {
            ignoreTrail: state.level.classic.lineImpact?.version === 'line-impact.v1',
            ignoreTrailActorIds: state.level.classic.lineImpact?.actorIds ?? [],
          }),
      impactEvent?.kind === 'player' &&
      impactEvent.time <= horizon + EPS &&
      !(trace.closure !== null && trace.closure <= impactEvent.time + EPS)
        ? {
            time: impactEvent.time,
            kind: 'enemy-trail',
            id: impactEvent.front.actorId,
            impact: impactEvent.front,
          }
        : null,
    ]);
    const elapsed = Math.min(horizon, failure?.time ?? Infinity);
    const position = positionAt(playerPlan.paths, elapsed, state.player),
      active = playerPlan.paths.find((p) => p.t1 >= elapsed - EPS);
    if (!recovering) appendTrail(state, trace, elapsed);
    if (elapsed >= remaining - EPS)
      Object.assign(state.player, playerPlan.player, { cutting: state.player.cutting });
    else
      Object.assign(state.player, {
        direction: active?.direction ?? state.player.direction,
        queuedDirection: playerPlan.player.queuedDirection,
      });
    Object.assign(state.player, position);
    for (const [i, enemy] of state.enemies.entries()) {
      applyClassicEnemy(enemy, plans[i], elapsed, remaining);
      if (enemy.type === 'border-patrol') enemy.perimeter = patrolDistance(enemy, state);
    }
    advanceLineImpacts(state, elapsed);
    advanceCombatMotion(state, combatPlans, elapsed);
    state.time += elapsed;
    if (!classicEffectActive(state, 'enemy-freeze')) state.classic.actorTime += elapsed;
    remaining -= elapsed;
    finishLineImpactDepartures(state);
    if (failure) {
      if (failure.shot) impactCombatProjectile(state, failure.shot);
      if (failure.impact)
        state.events.push({
          type: 'lineImpact.arrived',
          tick: state.tick,
          time: state.time,
          id: failure.impact.id,
          actorId: failure.id,
          x: state.player.x,
          y: state.player.y,
        });
      state.failureCause = failure.kind;
      if (failure.kind !== 'mission-timeout') hooks.recover(state, failure);
      interrupted = true;
    } else if (!recovering) {
      if (trace.closure !== null && trace.closure <= elapsed + EPS) {
        clearLineImpacts(state, 'capture');
        commitCapture(state);
        if (state.rules.stopOnCapture === true) {
          blocked = true;
          state.player.speed = 0;
          state.player.queuedDirection = null;
          state.events.push({ type: 'capture.stopped', tick: state.tick, time: state.time });
        }
      }
      if (impactSeed && impactSeed.time <= elapsed + EPS)
        for (const contact of impactSeed.contacts) seedLineImpact(state, contact);
      collect(state, hits, elapsed);
      if (trace.stop !== null && trace.stop <= elapsed + EPS) {
        blocked = true;
        state.player.speed = 0;
      }
    }
    finishCombatMotion(state, combatPlans, combat, elapsed, !!failure);
    for (const [i, enemy] of state.enemies.entries()) {
      const event = plans[i].event;
      if (
        enemy.type !== 'eroder' ||
        event?.kind !== 'domain-hit' ||
        event.time > elapsed + EPS ||
        enemy.classic.target !== null ||
        enemy.classic.cooldownUntil > state.classic.actorTick
      )
        continue;
      const target = [...new Set(event.indices)]
        .sort((a, b) => a - b)
        .find((index) => !classicErosionReason(state, index));
      if (target !== undefined) {
        enemy.classic.target = target;
        enemy.classic.erosionAt = state.classic.actorTick + 60;
        state.events.push({
          type: 'erosion.warning',
          tick: state.tick,
          time: state.time,
          id: enemy.id,
          index: target,
          erosionAt: enemy.classic.erosionAt,
        });
      }
    }
    if (erosionDue(state)) {
      commitClassicErosion(state);
      cancelHazardousTimedBonuses(state);
    }
    updateActors(state);
    updateEnemyPressure(state);
    // Let the first zero-time hit keep historical capture/erosion/failure order.
    // Only a repeated penetration in unchanged geometry can use recovery. Keep
    // its original approach velocity, not the repeated zero-time reversal.
    for (const [i, enemy] of state.enemies.entries()) {
      const before = incoming[i];
      if (
        elapsed <= EPS &&
        plans[i].event?.penetration &&
        plans[i].event.time <= elapsed + EPS &&
        topologyRevision === state.classic.topologyRevision &&
        enemy.x === before.x &&
        enemy.y === before.y
      )
        stalledDomains.set(enemy.id, { ...before, topologyRevision });
      else stalledDomains.delete(enemy.id);
    }
    if (failure?.kind === 'mission-timeout' || state.lives <= 0) {
      hooks.complete(state, false);
      return true;
    }
    if (!failure && !recovering && won(state)) {
      hooks.complete(state, true);
      return interrupted;
    }
    if (remaining <= EPS) break;
    if (
      elapsed <= EPS &&
      !failure &&
      trace.closure === null &&
      trace.stop === null &&
      !hits.length &&
      !plans.some((p) => p.event && p.event.time <= EPS) &&
      !erosionDue(state)
    ) {
      // A due erosion was consumed at this horizon; the next plan uses the new topology.
      continue;
    }
  }
  if (remaining > EPS) throw new Error('Classic event horizon bound exceeded');
  return interrupted;
}

export function stepClassic(state, input, hooks) {
  input = arcadeCommand(state.level, input);
  state.tick++;
  const endTime = state.time + FIXED_DT;
  state.classic.tickClaims = [];
  if (!classicEffectActive(state, 'enemy-freeze')) state.classic.actorTick++;
  hooks.updateBosses(state);
  updateEncounter(state);
  updateAbilities(state);
  if (input.switchClass && input.switchClass !== state._input.switchClass)
    switchClass(state, input.switchClass);
  updateSignal(state);
  const beforeAbility = state.status;
  useAbilities(state, input);
  if (beforeAbility !== 'respawning' && state.status === 'respawning')
    clearCombatPatrols(state, 'recovery');
  if (state.status === 'respawning') {
    state.classic.effects['player-speed'] = { from: 0, until: 0 };
    state.classic.departure = null;
  }
  updateActors(state);
  updateEnemyPressure(state);
  if (!classicEffectActive(state, 'enemy-freeze'))
    for (const enemy of state.enemies)
      if (
        !(enemy.stunnedUntil > state.time + EPS) &&
        !['warning', 'committed'].includes(enemy.classic?.pressure?.phase)
      )
        steerFieldCourse(enemy, state.seed, state.classic.actorTick - 1);
  updateTimedBonuses(state);
  expireCombatProjectiles(state);
  const interrupted = world(state, input, hooks);
  if (state.status === 'won' || state.status === 'lost') return;
  state.time = endTime;
  updateSignal(state);
  if (state.status === 'respawning' && state.time + EPS >= state.respawnAt) {
    Object.assign(state.player, state.level.spawn, {
      direction: 'down',
      queuedDirection: null,
      speed: 0,
      cutting: false,
      graceUntil: state.time + state.rules.graceSeconds,
    });
    state.status = 'running';
    state.events.push({ type: 'player.respawned', tick: state.tick, time: state.time });
  }
  if (!interrupted && canReleaseIsolated(state)) {
    releaseIsolatedCapture(state);
    updateActors(state);
    updateEnemyPressure(state);
    if (won(state)) hooks.complete(state, true);
  }
  updateCombatPatrols(state);
}
