import { EPS, movingCirclesTime } from '../core/geometry.mjs';
import { cellAt, enemyWallContact, positionAt } from './geometry.mjs';
import { hasTeamLineImpacts } from './foundations.mjs';

export const COOP_TIMING = Object.freeze({
  gentle: { recovery: 16, hunterWarning: 1.6, emitterWarning: 1.5, huntersAtOnce: 1 },
  standard: { recovery: 12, hunterWarning: 1.2, emitterWarning: 1, huntersAtOnce: 2 },
  expert: { recovery: 10, hunterWarning: 0.8, emitterWarning: 0.8, huntersAtOnce: 3 },
});

export const COOP_ENCOUNTER_DEFAULTS = Object.freeze({
  hunterWakeStep: 0,
  hunterRecovery: 1.8,
  hunterRange: 24,
  hunterAttackSpeed: 8,
  hunterCommitMax: 1.6,
  emitterCooldown: 4,
});
export const COOP_ENCOUNTER_BOUNDS = Object.freeze({
  hunterWakeStep: Object.freeze([0, 1]),
  hunterRecovery: Object.freeze([0.8, 3]),
  hunterRange: Object.freeze([8, 36]),
  hunterAttackSpeed: Object.freeze([6, 14]),
  hunterCommitMax: Object.freeze([0.8, 3]),
  emitterCooldown: Object.freeze([2, 6]),
});
const encounterFor = (run) => ({ ...COOP_ENCOUNTER_DEFAULTS, ...run.level.encounter });
const byPosition = (a, b) => a.x - b.x || a.y - b.y || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0);
const attacking = (enemy) =>
  enemy.active !== false && enemy.type === 'hunter' && ['warning', 'commit'].includes(enemy.phase);

export function initializeThreats(run) {
  const encounter = encounterFor(run);
  const hunters = run.enemies
    .filter((enemy) => enemy.type === 'hunter')
    .slice()
    .sort(byPosition);
  run.impacts = [];
  run.nextImpactId = 1;
  for (const enemy of run.enemies) {
    enemy.active = true;
    enemy.slowUntil = 0;
    enemy.speedScale = 1;
    enemy.patrolVelocity = { x: enemy.vx, y: enemy.vy };
    enemy.baseSpeed =
      enemy.type === 'hunter' ? encounter.hunterAttackSpeed : Math.hypot(enemy.vx, enemy.vy);
    if (enemy.type === 'hunter') {
      enemy.phase = 'patrol';
      enemy.target = null;
      enemy.targetPoint = null;
      enemy.wakeOrder = hunters.indexOf(enemy);
      enemy.waitingSince = null;
      enemy.phaseUntil = 0.5 + enemy.wakeOrder * encounter.hunterWakeStep;
    }
  }
}

/** One source can seed one pair per owned cut. Both fronts keep the stable
 * player/cut identity while Team capture may trim or rebase the live trail. */
export function seedTrailImpacts(
  run,
  { owner, source = 'enemy', player: playerId, cellIndex },
  emit,
) {
  if (!hasTeamLineImpacts(run.level)) return [];
  const player = run.players[playerId];
  if (
    player?.status !== 'active' ||
    !player.cutting ||
    !Number.isInteger(player.cutId) ||
    !player.trail.some((cell) => cell.index === cellIndex)
  )
    return [];
  const sourceKey = `${source}:${owner}`;
  if (player.impactSources.includes(sourceKey)) return [];
  player.impactSources.push(sourceKey);
  const x = (cellIndex % run.width) + 0.5;
  const y = Math.floor(cellIndex / run.width) + 0.5;
  const seed = run.nextImpactId++;
  const impacts = [-1, 1].map((direction) => ({
    id: `impact-${seed}-${direction < 0 ? 'departure' : 'player'}`,
    version: 'team-line-impact.v2',
    owner,
    source,
    player: player.id,
    cutId: player.cutId,
    direction,
    speed: run.level.lineImpact.speed,
    cellIndex,
    x,
    y,
    progress: 0,
  }));
  run.impacts.push(...impacts);
  emit(run, 'impact.launched', {
    impacts: impacts.map((impact) => impact.id),
    owner,
    source,
    player: player.id,
    cutId: player.cutId,
    cellIndex,
  });
  return impacts;
}

function targetTrail(run, origin, range, reachable = () => true) {
  const pressure = run.players.map(
    (player) =>
      run.enemies.filter((enemy) => attacking(enemy) && enemy.target === player.id).length +
      run.strongholds.filter(
        (hold) =>
          !hold.defeated && hold.emitter.phase === 'warning' && hold.emitter.target === player.id,
      ).length +
      run.impacts.filter((impact) => impact.player === player.id).length,
  );
  const candidates = [];
  for (const player of run.players) {
    if (player.status !== 'active' || !player.cutting || player.graceUntil > run.time + EPS)
      continue;
    for (const cell of player.trail) {
      if (run.cells[cell.index] !== 0) continue;
      const point = { x: cell.x + 0.5, y: cell.y + 0.5 };
      const distance = Math.hypot(point.x - origin.x, point.y - origin.y);
      if (distance <= range + EPS)
        candidates.push({ player: player.id, point, cellIndex: cell.index, distance });
    }
  }
  candidates.sort(
    (a, b) =>
      pressure[a.player] - pressure[b.player] ||
      a.distance - b.distance ||
      a.cellIndex - b.cellIndex ||
      a.player - b.player,
  );
  return candidates.find((candidate) => reachable(candidate.point, candidate.distance)) || null;
}

function hunterRecovery(run, enemy, emit) {
  enemy.phase = 'recovery';
  enemy.phaseUntil = run.time + encounterFor(run).hunterRecovery;
  enemy.vx = enemy.vy = 0;
  emit(run, 'enemy.recovery', {
    enemy: enemy.id,
    target: enemy.target,
    phaseUntil: enemy.phaseUntil,
  });
}

/** All target changes occur at a visible warning boundary, never during a committed attack. */
export function updateThreatClocks(run, emit, { suppressImpacts = false } = {}) {
  const timing = COOP_TIMING[run.difficulty];
  const encounter = encounterFor(run);
  const waiting = [];
  for (const enemy of run.enemies) {
    if (enemy.active === false) continue;
    // Authored reinforcements and deterministic fixtures may add an unadorned actor.
    enemy.slowUntil ??= 0;
    enemy.speedScale ??= 1;
    enemy.patrolVelocity ??= { x: enemy.vx, y: enemy.vy };
    enemy.baseSpeed ??=
      enemy.type === 'hunter' ? encounter.hunterAttackSpeed : Math.hypot(enemy.vx, enemy.vy);
    if (enemy.type === 'hunter' && enemy.phase === undefined) {
      enemy.phase = 'patrol';
      enemy.target = null;
      enemy.targetPoint = null;
      enemy.wakeOrder = run.enemies
        .filter((actor) => actor.type === 'hunter')
        .slice()
        .sort(byPosition)
        .indexOf(enemy);
      enemy.phaseUntil = run.time + 0.5 + enemy.wakeOrder * encounter.hunterWakeStep;
    }
    if (enemy.speedScale !== 1 && enemy.slowUntil <= run.time + EPS) {
      enemy.vx /= enemy.speedScale;
      enemy.vy /= enemy.speedScale;
      enemy.speedScale = 1;
    }
    if (enemy.type !== 'hunter' || enemy.phaseUntil > run.time + EPS) continue;
    if (enemy.phase === 'patrol') {
      enemy.waitingSince ??= enemy.phaseUntil;
      waiting.push(enemy);
    } else if (enemy.phase === 'warning') {
      const player = run.players[enemy.target];
      if (!player || player.status !== 'active' || player.graceUntil > run.time + EPS) {
        hunterRecovery(run, enemy, emit);
        continue;
      }
      const dx = enemy.targetPoint.x - enemy.x;
      const dy = enemy.targetPoint.y - enemy.y;
      const distance = Math.hypot(dx, dy);
      if (distance < EPS || enemy.baseSpeed < EPS) {
        hunterRecovery(run, enemy, emit);
        continue;
      }
      enemy.phase = 'commit';
      enemy.phaseUntil =
        run.time + Math.min(encounter.hunterCommitMax, Math.max(0.6, distance / enemy.baseSpeed));
      enemy.vx = (dx / distance) * enemy.baseSpeed * enemy.speedScale;
      enemy.vy = (dy / distance) * enemy.baseSpeed * enemy.speedScale;
      emit(run, 'enemy.commit', {
        enemy: enemy.id,
        target: enemy.target,
        targetPoint: { ...enemy.targetPoint },
        phaseUntil: enemy.phaseUntil,
      });
    } else if (enemy.phase === 'commit') hunterRecovery(run, enemy, emit);
    else {
      enemy.phase = 'patrol';
      enemy.phaseUntil = run.time + 0.5;
      enemy.vx = enemy.patrolVelocity.x * enemy.speedScale;
      enemy.vy = enemy.patrolVelocity.y * enemy.speedScale;
    }
  }
  // Finish existing phases before allocating fresh warnings. Waiting actors keep
  // a future deadline even when the authored concurrency budget is full.
  waiting.sort(
    (a, b) =>
      a.waitingSince - b.waitingSince ||
      (a.wakeOrder ?? 0) - (b.wakeOrder ?? 0) ||
      byPosition(a, b),
  );
  for (const enemy of waiting) {
    if (run.enemies.filter(attacking).length >= timing.huntersAtOnce) {
      enemy.phaseUntil = Math.min(
        ...run.enemies.filter(attacking).map((actor) => actor.phaseUntil),
      );
      continue;
    }
    const range = Math.min(encounter.hunterRange, enemy.baseSpeed * encounter.hunterCommitMax);
    const target = targetTrail(run, enemy, range, (point, distance) => {
      if (distance < EPS) return true;
      const velocity = { vx: (point.x - enemy.x) / distance, vy: (point.y - enemy.y) / distance };
      const wall = enemyWallContact(run, { ...enemy, ...velocity }, distance);
      return wall === null || wall.time >= distance - EPS;
    });
    if (!target) {
      enemy.waitingSince = null;
      enemy.phaseUntil = run.time + 0.25;
      continue;
    }
    enemy.phase = 'warning';
    enemy.waitingSince = null;
    enemy.target = target.player;
    enemy.targetPoint = { ...target.point };
    enemy.phaseUntil = run.time + timing.hunterWarning;
    enemy.vx = enemy.vy = 0;
    emit(run, 'enemy.warning', {
      enemy: enemy.id,
      target: enemy.target,
      targetPoint: { ...enemy.targetPoint },
      phaseUntil: enemy.phaseUntil,
    });
  }
  for (const stronghold of run.strongholds) {
    const emitter = stronghold.emitter;
    if (stronghold.defeated || emitter.phase === 'disabled' || emitter.phaseUntil > run.time + EPS)
      continue;
    if (emitter.phase === 'warning') {
      const player = run.players[emitter.target];
      if (
        !suppressImpacts &&
        player?.status === 'active' &&
        player.cutting &&
        player.graceUntil <= run.time + EPS &&
        player.trail.some((cell) => cell.index === emitter.cellIndex) &&
        run.cells[emitter.cellIndex] === 0
      ) {
        if (hasTeamLineImpacts(run.level))
          seedTrailImpacts(
            run,
            {
              owner: stronghold.id,
              source: 'emitter',
              player: player.id,
              cellIndex: emitter.cellIndex,
            },
            emit,
          );
        else {
          const impact = {
            id: `impact-${run.nextImpactId++}`,
            owner: stronghold.id,
            player: player.id,
            cellIndex: emitter.cellIndex,
            x: (emitter.cellIndex % run.width) + 0.5,
            y: Math.floor(emitter.cellIndex / run.width) + 0.5,
            progress: 0,
          };
          run.impacts.push(impact);
          emit(run, 'impact.launched', {
            impact: impact.id,
            owner: impact.owner,
            player: player.id,
            cellIndex: impact.cellIndex,
          });
        }
      }
      emitter.phase = 'cooldown';
      emitter.phaseUntil = run.time + encounter.emitterCooldown;
    } else {
      const target = targetTrail(run, stronghold.core, 14);
      if (!target) {
        emitter.phase = 'idle';
        emitter.phaseUntil = run.time + 0.25;
        continue;
      }
      emitter.phase = 'warning';
      emitter.target = target.player;
      emitter.cellIndex = target.cellIndex;
      emitter.targetPoint = { ...target.point };
      emitter.phaseUntil = run.time + timing.emitterWarning;
      emit(run, 'emitter.warning', {
        owner: stronghold.id,
        target: target.player,
        targetPoint: { ...target.point },
        phaseUntil: emitter.phaseUntil,
      });
    }
  }
}

export function nextThreatDeadline(run) {
  let time = Infinity;
  for (const enemy of run.enemies) {
    if (enemy.active === false) continue;
    if (enemy.speedScale !== 1) time = Math.min(time, enemy.slowUntil);
    if (enemy.type === 'hunter') time = Math.min(time, enemy.phaseUntil);
  }
  for (const stronghold of run.strongholds)
    if (!stronghold.defeated && stronghold.emitter.phase !== 'disabled')
      time = Math.min(time, stronghold.emitter.phaseUntil);
  return time;
}

export function clearInvalidImpacts(run, emit) {
  run.impacts = run.impacts.filter((impact) => {
    const player = run.players[impact.player];
    const owner = run.strongholds.find((stronghold) => stronghold.id === impact.owner);
    const keep =
      player?.status === 'active' &&
      player.cutting &&
      (impact.version !== 'team-line-impact.v2' || player.cutId === impact.cutId) &&
      !owner?.defeated &&
      run.cells[impact.cellIndex] === 0 &&
      player.trail.some((cell) => cell.index === impact.cellIndex);
    if (!keep)
      emit(run, 'impact.cleared', {
        impact: impact.id,
        owner: impact.owner,
        player: impact.player,
        reason: 'secured-or-recovered',
      });
    return keep;
  });
}

/** The current cell ID survives prefix trimming; array positions are never persistent identities. */
export function planImpacts(run, velocities, horizon) {
  return run.impacts.map((impact) => {
    const player = run.players[impact.player];
    const index = player.trail.findIndex((cell) => cell.index === impact.cellIndex);
    const direction = impact.direction ?? 1;
    const next = player.trail[index + direction];
    const expires = direction < 0 && !next;
    const target = next
      ? { x: next.x + 0.5, y: next.y + 0.5 }
      : expires
        ? player.safeAnchor
        : player;
    const dx = target.x - impact.x;
    const dy = target.y - impact.y;
    const distance = Math.hypot(dx, dy);
    const speed = impact.speed ?? 14;
    const velocity =
      distance > EPS ? { x: (dx / distance) * speed, y: (dy / distance) * speed } : { x: 0, y: 0 };
    const waypointAt = next || expires ? distance / speed : Infinity;
    const fraction =
      direction < 0
        ? null
        : movingCirclesTime(
            impact,
            positionAt(impact, velocity, horizon),
            player,
            positionAt(player, velocities[player.id], horizon),
            0.3,
          );
    return {
      impact,
      velocity,
      waypointAt,
      nextCellIndex: next?.index ?? null,
      expires,
      contactAt: fraction === null ? Infinity : fraction * horizon,
    };
  });
}

export function advanceImpacts(plans, seconds) {
  const expired = [];
  for (const plan of plans) {
    plan.impact.x += plan.velocity.x * seconds;
    plan.impact.y += plan.velocity.y * seconds;
    plan.impact.progress += (plan.impact.speed ?? 14) * seconds;
    if (plan.waypointAt <= seconds + EPS && plan.nextCellIndex !== null) {
      plan.impact.cellIndex = plan.nextCellIndex;
      plan.impact.progress = 0;
    } else if (plan.waypointAt <= seconds + EPS && plan.expires) expired.push(plan.impact);
  }
  return expired;
}

export function useSupport(run, player, emit) {
  if (player.support.readyAt > run.time + EPS) return;
  player.support.readyAt = run.time + 8;
  const role = player.supportRole ?? 'hybrid';
  const canSlow = role === 'hybrid' || role === 'disruptor';
  const canIntercept = role === 'hybrid' || role === 'interceptor';
  const slowedEnemies = [];
  for (const enemy of run.enemies)
    if (
      canSlow &&
      enemy.active !== false &&
      Math.hypot(enemy.x - player.x, enemy.y - player.y) <= 6 + EPS &&
      enemy.slowUntil <= run.time + EPS
    ) {
      const moving = Math.hypot(enemy.vx, enemy.vy) > EPS;
      enemy.slowUntil = run.time + 1.5;
      enemy.vx *= 0.5;
      enemy.vy *= 0.5;
      enemy.speedScale = 0.5;
      if (moving) slowedEnemies.push(enemy.id);
    }
  const interceptedImpacts = [];
  run.impacts = run.impacts.filter((impact) => {
    if (!canIntercept) return true;
    if (Math.hypot(impact.x - player.x, impact.y - player.y) > 6 + EPS) return true;
    interceptedImpacts.push(impact.id);
    emit(run, 'impact.intercepted', {
      impact: impact.id,
      owner: impact.owner,
      player: player.id,
      protectedPlayer: impact.player,
    });
    return false;
  });
  player.support.uses++;
  player.support.intercepts += interceptedImpacts.length;
  player.support.slows += slowedEnemies.length;
  run.team.interceptions += interceptedImpacts.length;
  run.supportEffects.push({
    player: player.id,
    role,
    x: player.x,
    y: player.y,
    until: run.time + 0.3,
  });
  emit(run, 'support.pulse', {
    player: player.id,
    role,
    slowedEnemies,
    interceptedImpacts,
  });
}

export function strongholdIndex(run, point) {
  return cellAt(run, point.x, point.y);
}
