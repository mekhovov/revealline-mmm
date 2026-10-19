import {
  isPursuitSpecialist,
  protectedPursuitContact,
  specialistMotionAllowed,
} from '../hunt/pursuit-specialists.mjs';
import { pursuitPolicy, updatePursuitHeading } from '../hunt/pursuit-goals.mjs';
import { actorFacingRadians } from '../hunt/actor-facing.mjs';
import { isTeamRunningLevel } from './running-enemies.mjs';
import { dataIdentity } from '../data-json.mjs';
import { EPS, movingCirclesTime } from '../core/geometry.mjs';
import { classicDomainHit } from '../core/classic-motion.mjs';
import { fitsClassicDomain } from '../core/classic-topology.mjs';
import { recordSnakeCatch } from '../snake/rules.mjs';
import {
  validateCombatPatrols,
  COMBAT_RADIUS,
  COMBAT_SHOT_RADIUS,
  COMBAT_MAX_PROJECTILES,
} from '../core/combat-definition.mjs';
import { initializeCombatPatrols } from '../core/combat-patrols.mjs';
import { coopBonusActive } from './timed-bonuses.mjs';
import {
  validateHuntDefinition,
  validateHuntReachability,
  createHuntState,
  recordHuntElimination,
  huntTargetKind,
  chooseHuntRunnerHeading,
} from '../hunt/rules.mjs';
import { compileCoopFoundationGeometry, hasTeamTerrain } from './foundations.mjs';

const live = (actor) => actor.alive;
const exposed = (run, player) =>
  player?.status === 'active' && player.cutting && player.graceUntil <= run.time + EPS;
const definition = (run, actor) =>
  run.level.combatPatrols.actors.find((entry) => entry.id === actor.id);
const emit = (run, type, data) =>
  run.events.push({ type: `combat.${type}`, tick: run.tick, time: run.time, ...data });
const clearRay = (run, from, to) => classicDomainHit(run, from, to, 0, 0) === null;
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
function random(actor) {
  let value = actor.random;
  value ^= value << 13;
  value ^= value >>> 17;
  value ^= value << 5;
  actor.random = value >>> 0;
  return actor.random;
}
function velocity(actor, x, y, speed) {
  const length = Math.hypot(x, y);
  if (length <= EPS) return;
  actor.vx = (x / length) * speed;
  actor.vy = (y / length) * speed;
}

/** Reuse the exact patrol descriptor boundary, including clear spawn envelopes. */
export function validateCoopCombat(level, cells) {
  const ids = new Set(level.enemies.map((actor) => actor.id));
  validateCombatPatrols(
    {
      version: level.hunt ? 'xonix-level.v9' : 'xonix-level.v8',
      width: level.width,
      height: level.height,
      spawn: level.spawns[0],
      enemies: level.enemies.map((actor) => ({ ...actor, type: 'bouncer' })),
      classic: { combatPatrols: level.combatPatrols, ...(level.hunt ? { hunt: level.hunt } : {}) },
    },
    {
      supplemental: isTeamRunningLevel(level),
      geometry: { cells },
      walls: Array.from(cells, (cell) => cell === 2),
      identity(actor) {
        if (ids.has(actor.id)) throw new TypeError('Team actor IDs must be unique.');
        ids.add(actor.id);
      },
    },
  );
  for (const actor of level.combatPatrols.actors)
    if (level.spawns.some((spawn) => Math.hypot(actor.x - spawn.x, actor.y - spawn.y) < 2))
      throw new TypeError('Team optional patrols need clearance from both spawns.');
  if (level.hunt) {
    validateHuntDefinition(level.hunt, level.combatPatrols.actors, {
      enabled: level.combatPatrols.enabled,
      ordinaryCount: level.enemies.length,
      supplemental: isTeamRunningLevel(level),
      playerMoveSpeed: level.rules?.moveSpeed ?? 8,
    });
    validateHuntReachability(level.hunt, level.combatPatrols.actors, {
      width: level.width,
      height: level.height,
      cells,
      terrain: hasTeamTerrain(level) ? compileCoopFoundationGeometry(level).terrain : [],
      spawns: level.spawns,
    });
  }
}

export function initializeCoopCombat(run) {
  if (!run.level.combatPatrols?.enabled) return;
  const bridge = {
    seed: run.seed,
    level: {
      classic: { combatPatrols: run.level.combatPatrols },
      ...(run.level.pursuit ? { pursuit: run.level.pursuit } : {}),
    },
    classic: {},
  };
  initializeCombatPatrols(bridge);
  run.combatPatrols = { ...bridge.classic.combatPatrols, actorTick: 0 };
  for (const actor of run.combatPatrols.actors) {
    actor.slowUntil = 0;
    if (actor.role === 'sentry') actor.targetPlayer = null;
  }
  if (run.level.hunt) {
    run.hunt = createHuntState();
    run.huntDowns = 0;
    run.huntRecordIdentity = dataIdentity({
      level: run.level,
      seed: run.seed,
      config: run.config,
      ...(isTeamRunningLevel(run.level) ? { difficulty: run.difficulty } : {}),
    });
  }
}

function removeShots(run, predicate, reason) {
  const combat = run.combatPatrols;
  if (!combat) return;
  combat.projectiles = combat.projectiles.filter((shot) => {
    if (!predicate(shot)) return true;
    emit(run, reason === 'expiry' ? 'expired' : 'projectileRemoved', {
      id: shot.id,
      actorId: shot.actorId,
      reason,
      x: shot.x,
      y: shot.y,
    });
    return false;
  });
}

export function eliminateCoopCombat(run, actor, cause, players = []) {
  if (!actor.alive) return;
  actor.alive = false;
  actor.phase = 'eliminated';
  if (actor.role === 'sentry') {
    actor.aim = null;
    actor.targetPlayer = null;
    actor.warningUntil = null;
    actor.recoveryUntil = null;
  }
  const record = {
    id: actor.id,
    cause,
    x: actor.x,
    y: actor.y,
    tick: run.tick,
    time: run.time,
    players: [...new Set(players)].sort(),
  };
  run.combatPatrols.eliminations.push(record);
  if (recordHuntElimination(run.hunt, run.level.hunt, actor.id, cause))
    recordSnakeCatch(run, actor.id, players);
  emit(run, 'eliminated', record);
  removeShots(run, (shot) => shot.actorId === actor.id, 'owner-eliminated');
}

function cancelWarning(run, actor, reason) {
  if (actor.phase !== 'warning') return;
  actor.phase = 'cooldown';
  actor.nextScanTick = run.combatPatrols.actorTick + definition(run, actor).restTicks;
  actor.aim = null;
  actor.targetPlayer = null;
  actor.warningUntil = null;
  emit(run, 'cancelled', { id: actor.id, reason });
}
function warningValid(run, actor) {
  return (
    run.status === 'running' &&
    exposed(run, run.players[actor.targetPlayer]) &&
    actor.aim &&
    clearRay(run, actor, actor.aim)
  );
}

/** Capture cleanup runs even while frozen; optional actors never seed retained regions. */
export function captureCoopCombat(run, players = []) {
  if (!run.combatPatrols) return;
  for (const actor of run.combatPatrols.actors.filter(live)) {
    if (!fitsClassicDomain(run, actor, COMBAT_RADIUS, 0))
      eliminateCoopCombat(run, actor, 'capture', players);
    else if (actor.phase === 'warning' && !warningValid(run, actor))
      cancelWarning(run, actor, 'capture');
  }
  removeShots(run, (shot) => !fitsClassicDomain(run, shot, COMBAT_SHOT_RADIUS, 0), 'capture');
}

export function beginCoopCombatTick(run) {
  const combat = run.combatPatrols;
  if (!combat || coopBonusActive(run, 'enemy-freeze')) return;
  combat.actorTick++;
  removeShots(run, (shot) => combat.actorTick >= shot.expiresAtTick, 'expiry');
}

/** Target identity and observed point remain fixed throughout each warning. */
export function updateCoopCombat(run) {
  const combat = run.combatPatrols;
  if (!combat) return;
  for (const actor of combat.actors.filter(live))
    if (actor.phase === 'warning' && !warningValid(run, actor))
      cancelWarning(run, actor, 'target-unavailable');
  if (coopBonusActive(run, 'enemy-freeze') || run.status !== 'running') return;
  const tick = combat.actorTick;
  for (const actor of combat.actors.filter(live)) {
    const def = definition(run, actor);
    if (actor.role === 'sentry') {
      if (actor.phase === 'warning' && tick >= actor.warningUntil) {
        if (combat.projectiles.length < COMBAT_MAX_PROJECTILES) {
          const dx = actor.aim.x - actor.x,
            dy = actor.aim.y - actor.y,
            length = Math.hypot(dx, dy);
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
            emit(run, 'fired', {
              id: shot.id,
              actorId: actor.id,
              x: actor.x,
              y: actor.y,
              aim: { ...actor.aim },
              targetPlayer: actor.targetPlayer,
            });
          }
        } else emit(run, 'shotSkipped', { id: actor.id, reason: 'capacity' });
        actor.phase = 'recovery';
        actor.recoveryUntil = tick + def.recoveryTicks;
        actor.warningUntil = null;
        actor.aim = null;
        actor.targetPlayer = null;
      } else if (actor.phase === 'recovery' && tick >= actor.recoveryUntil) {
        actor.phase = 'cooldown';
        actor.nextScanTick = actor.recoveryUntil + def.restTicks;
        actor.recoveryUntil = null;
      } else if (actor.phase === 'cooldown' && tick >= actor.nextScanTick) {
        const targets = run.players.filter(
          (player) =>
            exposed(run, player) &&
            Math.hypot(player.x - actor.x, player.y - actor.y) <= def.senseRadius + EPS &&
            clearRay(run, actor, player),
        );
        targets.sort(
          (a, b) =>
            Math.hypot(a.x - actor.x, a.y - actor.y) - Math.hypot(b.x - actor.x, b.y - actor.y) ||
            a.id - b.id,
        );
        const player = targets[0];
        if (player) {
          actor.phase = 'warning';
          actor.aim = { x: player.x, y: player.y };
          actor.targetPlayer = player.id;
          actor.warningUntil = tick + def.warningTicks;
          emit(run, 'locked', {
            id: actor.id,
            aim: { ...actor.aim },
            targetPlayer: player.id,
            warningUntil: actor.warningUntil,
          });
        } else actor.nextScanTick = tick + def.scanTicks;
      }
    }
    if (
      actor.phase === 'cooldown' &&
      updatePursuitHeading({
        version: run.level.pursuit?.version,
        actor,
        policy: pursuitPolicy(run.level, actor.id),
        actors: combat.actors,
        players: run.players.filter((player) => player.status === 'active'),
        geometry: run,
        tick,
        speed: def.speed,
        clearance: (from, to) => classicDomainHit(run, from, to, COMBAT_RADIUS, 0)?.t ?? 1,
      })
    )
      continue;
    if (actor.phase === 'cooldown' && tick >= actor.nextTurnTick) {
      const rotation = random(actor);
      const [x, y] =
        huntTargetKind(run.level.hunt, actor.id) === 'runner'
          ? chooseHuntRunnerHeading({
              actor,
              players: run.players,
              speed:
                def.speed *
                (coopBonusActive(run, 'enemy-slow') || actor.slowUntil > run.time + EPS ? 0.5 : 1),
              rotation,
              clearance: (from, to) => classicDomainHit(run, from, to, COMBAT_RADIUS, 0)?.t ?? 1,
            })
          : directions[rotation % directions.length];
      velocity(actor, x, y, def.speed);
      actor.nextTurnTick = tick + def.turnTicks;
    }
  }
}

function motion(run, body, duration, radius, reflect) {
  const frozen = coopBonusActive(run, 'enemy-freeze');
  const factor = frozen
    ? 0
    : coopBonusActive(run, 'enemy-slow') || body.slowUntil > run.time + EPS
      ? 0.5
      : 1;
  const moving = !reflect || body.phase === 'cooldown';
  const velocity = { x: moving ? body.vx * factor : 0, y: moving ? body.vy * factor : 0 };
  const end = { x: body.x + velocity.x * duration, y: body.y + velocity.y * duration };
  if (
    reflect &&
    !specialistMotionAllowed(
      body,
      end,
      run,
      run.players.filter((player) => player.status === 'active'),
    )
  ) {
    velocity.x = 0;
    velocity.y = 0;
    end.x = body.x;
    end.y = body.y;
  }
  const wall = velocity.x || velocity.y ? classicDomainHit(run, body, end, radius, 0) : null;
  return { body, radius, reflect, velocity, wall, time: wall ? wall.t * duration : Infinity };
}
export function planCoopCombat(run, velocities, horizon) {
  const combat = run.combatPatrols;
  if (!combat) return { patrols: [], shots: [], contacts: [] };
  const patrols = combat.actors
    .filter(live)
    .map((actor) => motion(run, actor, horizon, COMBAT_RADIUS, true));
  const shots = combat.projectiles.map((shot) =>
    motion(run, shot, horizon, COMBAT_SHOT_RADIUS, false),
  );
  const contacts = [];
  for (const player of run.players) {
    if (player.status !== 'active') continue;
    for (const plan of [...patrols, ...shots]) {
      const huntTouch = plan.reflect && huntTargetKind(run.level.hunt, plan.body.id) !== null;
      if (!player.cutting && !huntTouch) continue;
      if (
        !plan.reflect &&
        (coopBonusActive(run, 'enemy-freeze') || player.graceUntil > run.time + EPS)
      )
        continue;
      const end = {
        x: player.x + velocities[player.id].x * horizon,
        y: player.y + velocities[player.id].y * horizon,
      };
      const other = {
        x: plan.body.x + plan.velocity.x * horizon,
        y: plan.body.y + plan.velocity.y * horizon,
      };
      const fraction = movingCirclesTime(
        player,
        end,
        plan.body,
        other,
        player.radius + plan.radius,
      );
      if (fraction === null) continue;
      const time = fraction * horizon;
      if (
        huntTouch &&
        classicDomainHit(
          run,
          {
            x: player.x + velocities[player.id].x * time,
            y: player.y + velocities[player.id].y * time,
          },
          { x: plan.body.x + plan.velocity.x * time, y: plan.body.y + plan.velocity.y * time },
          0,
          null,
        )
      )
        continue;
      if (!plan.reflect && plan.wall && plan.time <= time + EPS) continue;
      if (time > plan.time + EPS) continue;
      const protectedContact =
        plan.reflect &&
        protectedPursuitContact(
          plan.body,
          {
            x: player.x + velocities[player.id].x * time,
            y: player.y + velocities[player.id].y * time,
          },
          { x: plan.body.x + plan.velocity.x * time, y: plan.body.y + plan.velocity.y * time },
        );
      if (protectedContact && player.graceUntil > run.time + EPS) continue;
      contacts.push({
        time,
        player: player.id,
        body: plan.body,
        cause: protectedContact ? 'combat-specialist' : plan.reflect ? 'ram' : 'combat-projectile',
      });
    }
  }
  contacts.sort(
    (a, b) =>
      a.time - b.time ||
      a.player - b.player ||
      (a.body.id < b.body.id ? -1 : a.body.id > b.body.id ? 1 : 0),
  );
  return { patrols, shots, contacts };
}
export function advanceCoopCombat(run, plans, elapsed) {
  for (const plan of [...plans.patrols, ...plans.shots]) {
    plan.body.x += plan.velocity.x * elapsed;
    plan.body.y += plan.velocity.y * elapsed;
    if (plan.wall && plan.time <= elapsed + EPS) {
      if (!plan.reflect) removeShots(run, (shot) => shot.id === plan.body.id, 'boundary');
      else {
        const { nx, ny } = plan.wall;
        if (isPursuitSpecialist(plan.body)) {
          plan.body.vx = 0;
          plan.body.vy = 0;
        } else {
          if (nx) plan.body.vx *= -1;
          if (ny) plan.body.vy *= -1;
        }
        if (!nx && !ny) throw new Error('Team optional patrol embedded in field boundary.');
        plan.body.x += nx * EPS * 2;
        plan.body.y += ny * EPS * 2;
      }
    }
  }
}
export function hitCoopCombatProjectile(run, shot) {
  if (!run.combatPatrols?.projectiles.some((candidate) => candidate.id === shot.id)) return false;
  emit(run, 'impact', { id: shot.id, actorId: shot.actorId, x: shot.x, y: shot.y });
  removeShots(run, (candidate) => candidate.id === shot.id, 'impact');
  return true;
}

export function supportCoopCombat(run, player, { canSlow, canIntercept }) {
  const slowedEnemies = [],
    interceptedImpacts = [];
  if (!run.combatPatrols) return { slowedEnemies, interceptedImpacts };
  for (const actor of run.combatPatrols.actors.filter(live))
    if (
      canSlow &&
      actor.slowUntil <= run.time + EPS &&
      Math.hypot(actor.x - player.x, actor.y - player.y) <= 6 + EPS
    ) {
      actor.slowUntil = run.time + 1.5;
      if (actor.phase === 'cooldown' && Math.hypot(actor.vx, actor.vy) > EPS)
        slowedEnemies.push(actor.id);
    }
  removeShots(
    run,
    (shot) => {
      if (!canIntercept || Math.hypot(shot.x - player.x, shot.y - player.y) > 6 + EPS) return false;
      interceptedImpacts.push(shot.id);
      emit(run, 'intercepted', { id: shot.id, actorId: shot.actorId, player: player.id });
      return true;
    },
    'support',
  );
  return { slowedEnemies, interceptedImpacts };
}

/** Read-only presentation projection; it has the shared Solo painter's coordinates. */
export function coopCombatView(run) {
  const combat = run.combatPatrols;
  if (!combat) return null;
  const actors = combat.actors.filter(live).map((actor) => {
    const def = definition(run, actor);
    let rayEnd = null;
    if (actor.aim) {
      const dx = actor.aim.x - actor.x,
        dy = actor.aim.y - actor.y,
        length = Math.hypot(dx, dy);
      const end = {
        x: actor.x + (dx / (length || 1)) * 100,
        y: actor.y + (dy / (length || 1)) * 100,
      };
      const hit = classicDomainHit(run, actor, end, 0, 0);
      rayEnd = {
        x: actor.x + (end.x - actor.x) * (hit?.t ?? 1),
        y: actor.y + (end.y - actor.y) * (hit?.t ?? 1),
      };
    }
    return {
      ...actor,
      facingRadians: actorFacingRadians(actor, def),
      ...(pursuitPolicy(run.level, actor.id) && !actor.pursuit
        ? { pursuit: { behavior: pursuitPolicy(run.level, actor.id).behavior, phase: 'walking' } }
        : {}),
      ...(pursuitPolicy(run.level, actor.id)?.partnerId &&
      !(
        run.level.pursuit.version === 'pursuit-goals.v2' &&
        actor.pursuit?.partnerLost === true &&
        actor.pursuit?.behavior === 'runner' &&
        !combat.actors.some(
          (other) => other.id === pursuitPolicy(run.level, actor.id).partnerId && other.alive,
        )
      )
        ? {
            pursuit: {
              ...actor.pursuit,
              behavior: 'pair',
              phase: actor.pursuit?.phase ?? 'walking',
              partnerId: pursuitPolicy(run.level, actor.id).partnerId,
            },
          }
        : {}),
      kind: huntTargetKind(run.level.hunt, actor.id),
      rayEnd,
      warningTotal: def.warningTicks ?? 0,
      warningTicks:
        actor.warningUntil == null ? 0 : Math.max(0, actor.warningUntil - combat.actorTick),
    };
  });
  return {
    valid: true,
    tick: run.tick,
    actorTick: combat.actorTick,
    status: run.status === 'paused' ? 'running' : run.status,
    frozen: run.status === 'paused' || coopBonusActive(run, 'enemy-freeze'),
    actors,
    projectiles: combat.projectiles.map((shot) => ({ ...shot, radius: COMBAT_SHOT_RADIUS })),
    eliminations: combat.eliminations.map((mark) => ({
      ...mark,
      role: definition(run, mark).role,
      ...(pursuitPolicy(run.level, mark.id)
        ? { family: pursuitPolicy(run.level, mark.id).behavior }
        : {}),
      kind: huntTargetKind(run.level.hunt, mark.id),
    })),
  };
}
