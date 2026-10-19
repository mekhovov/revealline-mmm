import { boundedJSON, exactKeys, required, stableId } from '../data-json.mjs';
import { seedTrailImpacts } from './threats.mjs';
import { movingCirclesTime } from '../core/geometry.mjs';

// Additive edition. A v7 reader must reject this data, never drop the environment.
import { isExpeditionLevel } from './expedition-version.mjs';
export {
  EXPEDITION_LEVEL,
  EXPEDITION_PACK,
  EXPEDITION_RULESET,
  isExpeditionLevel,
} from './expedition-version.mjs';
const directions = { up: [0, -1], right: [1, 0], down: [0, 1], left: [-1, 0] };
const indexAt = (run, p) => Math.floor(p.y) * run.width + Math.floor(p.x);
const integer = (n, min, max) => Number.isInteger(n) && n >= min && n <= max;
const rectCells = (run, r) =>
  Array.from(
    { length: r.w * r.h },
    (_, i) => (r.y + Math.floor(i / r.w)) * run.width + r.x + (i % r.w),
  );
const inside = (p, r) => p.x >= r.x && p.x < r.x + r.w && p.y >= r.y && p.y < r.y + r.h;

export function inheritedExpeditionLevel(source) {
  const level = boundedJSON(source, {
    maxBytes: 256 * 1024,
    maxNodes: 20000,
    maxArray: 8192,
    maxDepth: 16,
  });
  required(
    isExpeditionLevel(level),
    'An expedition requires the explicit Team environment edition.',
  );
  level.version = 'revealline-coop-level.v7';
  delete level.environment;
  return level;
}

/** Every gameplay field is bounded and owned by the portable level. No hidden
 * per-level scripts, random geometry, wall-through effects or clock overrides. */
export function validateExpeditionEnvironment(level, cells) {
  const env = level.environment;
  exactKeys(
    env,
    ['version', 'emitters', 'relays', 'currents', 'patrols', 'erosion', 'stages'],
    'Team environment',
  );
  required(env.version === 'team-environment.v1', 'Unsupported Team environment.');
  const ids = new Set(level.enemies.map((e) => e.id));
  const identity = (item) => {
    required(stableId(item.id) && !ids.has(item.id), 'Environment identities must be unique.');
    ids.add(item.id);
  };
  const point = (p) =>
    required(
      Number.isInteger(p.x - 0.5) &&
        Number.isInteger(p.y - 0.5) &&
        p.x >= 1.5 &&
        p.x <= 70.5 &&
        p.y >= 1.5 &&
        p.y <= 34.5,
      'Environment points need interior cell centres.',
    );
  const fieldPoint = (p) => {
    point(p);
    required(
      cells[indexAt(level, p)] === 0,
      'Environment objective or source must begin in the field.',
    );
  };
  const rectangle = (r) =>
    required(
      integer(r.x, 1, 70) &&
        integer(r.y, 1, 34) &&
        integer(r.w, 1, 70) &&
        integer(r.h, 1, 34) &&
        r.x + r.w <= 71 &&
        r.y + r.h <= 35,
      'Environment rectangle is outside the field.',
    );
  for (const key of ['emitters', 'relays', 'currents', 'patrols', 'erosion', 'stages'])
    required(
      Array.isArray(env[key]) && env[key].length <= (key === 'currents' ? 12 : 4),
      'Environment population exceeds its budget.',
    );
  const occupied = new Set();
  for (const item of env.emitters) {
    exactKeys(item, ['id', 'x', 'y', 'axis', 'warningTicks', 'restTicks'], 'Team lane emitter');
    identity(item);
    fieldPoint(item);
    required(
      ['horizontal', 'vertical'].includes(item.axis) &&
        integer(item.warningTicks, 120, 360) &&
        integer(item.restTicks, 360, 1200),
      'Emitters require a readable warning and recovery window.',
    );
  }
  for (const item of env.relays) {
    exactKeys(item, ['id', 'gate', 'objective'], 'Team relay');
    identity(item);
    exactKeys(item.gate, ['x', 'y', 'w', 'h'], 'Relay gate');
    exactKeys(item.objective, ['x', 'y'], 'Relay objective');
    rectangle(item.gate);
    fieldPoint(item.objective);
    for (const i of rectCells(level, item.gate)) {
      required(
        cells[i] === 2 && !occupied.has(i),
        'Relay gates must own distinct authored wall cells.',
      );
      occupied.add(i);
    }
  }
  for (const item of env.currents) {
    exactKeys(item, ['id', 'x', 'y', 'w', 'h', 'direction'], 'Team arrows');
    identity(item);
    rectangle(item);
    required(Object.hasOwn(directions, item.direction), 'Arrow direction is unsupported.');
    for (const i of rectCells(level, item)) {
      required(
        cells[i] === 0 && !occupied.has(i),
        'Arrow fields must be distinct unclaimed ground.',
      );
      occupied.add(i);
    }
  }
  for (const item of env.patrols) {
    exactKeys(item, ['id', 'offset', 'clockwise', 'speed'], 'Team perimeter patrol');
    identity(item);
    required(
      integer(item.offset, 0, 211) &&
        typeof item.clockwise === 'boolean' &&
        Number.isFinite(item.speed) &&
        item.speed >= 1 &&
        item.speed <= 4,
      'Perimeter patrol settings are invalid.',
    );
  }
  for (const item of env.erosion) {
    exactKeys(item, ['id', 'x', 'y', 'warningTicks', 'restTicks', 'radius'], 'Team erosion source');
    identity(item);
    fieldPoint(item);
    required(
      integer(item.warningTicks, 180, 600) &&
        integer(item.restTicks, 600, 2400) &&
        integer(item.radius, 3, 12),
      'Erosion must have bounded local reach and readable timing.',
    );
  }
  const targets = new Set();
  for (const item of env.stages) {
    exactKeys(item, ['id', 'x', 'y'], 'Team stage');
    identity(item);
    fieldPoint(item);
    const i = indexAt(level, item);
    required(!targets.has(i), 'Stage targets must be distinct.');
    targets.add(i);
  }
  required(
    !Object.hasOwn(level, 'pursuit') && !Object.hasOwn(level, 'snake'),
    'Expedition environments do not silently inherit unqualified wrappers.',
  );
}

export function initializeExpedition(run) {
  if (!isExpeditionLevel(run.level)) return;
  const env = structuredClone(run.level.environment);
  run.environment = {
    ...env,
    emitters: env.emitters.map((e) => ({
      ...e,
      phase: 'rest',
      until: e.restTicks,
      target: null,
      line: null,
      cutId: null,
      disabled: false,
    })),
    relays: env.relays.map((e) => ({ ...e, open: false })),
    patrols: env.patrols.map((e) => ({ ...e, position: e.offset, x: 0.5, y: 0.5 })),
    erosion: env.erosion.map((e) => ({ ...e, until: e.restTicks, warning: [], disabled: false })),
    stage: 0,
    patrolTick: 0,
    protected: run.cells.map((cell) => (cell !== 0 ? 1 : 0)),
  };
  // Closed gate cells count from the start, so opening one cannot move the goal.
  run.totalClaimable += env.relays.reduce((n, r) => n + r.gate.w * r.gate.h, 0);
  updatePatrols(run);
}

export function expeditionSpeed(run, player) {
  if (!run.environment || player.status !== 'active' || run.cells[player.cellIndex] !== 0) return 1;
  const zone = run.environment.currents.find((z) => inside(player, z));
  const vector = directions[player.direction];
  if (!zone || !vector) return 1;
  const axis = directions[zone.direction],
    dot = axis[0] * vector[0] + axis[1] * vector[1];
  return dot > 0 ? 1.35 : dot < 0 ? 0.7 : 1;
}

// Future targets retain their region; a later enclosure is required after each
// stage opens. The active target may be captured by either pilot.
export const expeditionRetainedTargets = (run) =>
  run.environment?.stages.slice(run.environment.stage + 1).map((p) => indexAt(run, p)) ?? [];
export const expeditionFieldSources = (run) =>
  run.environment
    ? [...run.environment.emitters, ...run.environment.erosion]
        .filter((e) => !e.disabled)
        .map((p) => indexAt(run, p))
    : [];
export const expeditionGoalSatisfied = (run) =>
  !run.environment ||
  (run.environment.stage === run.environment.stages.length &&
    run.environment.relays.every((r) => r.open));

export function captureExpedition(run, emit) {
  const env = run.environment;
  if (!env) return;
  for (const relay of env.relays)
    if (!relay.open && run.cells[indexAt(run, relay.objective)] === 1) {
      relay.open = true;
      for (const i of rectCells(run, relay.gate)) {
        run.cells[i] = 1;
        env.protected[i] = 1;
        run.claimedCount++;
      }
      run.coverage = run.claimedCount / run.totalClaimable;
      emit(run, 'objective.captured', { stronghold: relay.id, kind: 'relay', required: true });
      emit(run, 'shield.disabled', { stronghold: relay.id });
    }
  const target = env.stages[env.stage];
  if (target && run.cells[indexAt(run, target)] === 1) {
    env.stage++;
    emit(run, 'objective.captured', { stronghold: target.id, kind: 'stage', required: true });
    emit(run, 'shield.disabled', { stronghold: target.id });
  }
  for (const source of [...env.emitters, ...env.erosion])
    if (!source.disabled && run.cells[indexAt(run, source)] === 1) {
      source.disabled = true;
      source.phase = 'disabled';
      source.warning = [];
      emit(run, 'core.defeated', { stronghold: source.id });
    }
}

// Removing an edge tile must not split the connected safe component. Recheck
// at impact as another erosion source may have changed the neighborhood.
function removableSafeEdge(run, index) {
  const neighbors = [index - 1, index + 1, index - run.width, index + run.width].filter(
    (i) => run.cells[i] === 1,
  );
  if (neighbors.length < 3) return false;
  const pending = [neighbors[0]],
    seen = new Set([index, neighbors[0]]);
  while (pending.length) {
    const at = pending.pop(),
      x = at % run.width,
      y = Math.floor(at / run.width);
    for (const next of [
      x > 0 ? at - 1 : -1,
      x < run.width - 1 ? at + 1 : -1,
      y > 0 ? at - run.width : -1,
      y < run.height - 1 ? at + run.width : -1,
    ]) {
      if (next >= 0 && run.cells[next] === 1 && !seen.has(next)) {
        seen.add(next);
        pending.push(next);
      }
    }
    if (neighbors.every((i) => seen.has(i))) return true;
  }
  return false;
}

function patrolPosition(run, p, tick) {
  const w = run.width - 1,
    h = run.height - 1,
    total = 2 * (w + h);
  const at =
    (((p.offset + ((p.clockwise ? 1 : -1) * p.speed * tick) / 120) % total) + total) % total;
  if (at < w) return { x: 0.5 + at, y: 0.5 };
  if (at < w + h) return { x: w + 0.5, y: 0.5 + at - w };
  if (at < 2 * w + h) return { x: w + 0.5 - (at - w - h), y: h + 0.5 };
  return { x: 0.5, y: h + 0.5 - (at - 2 * w - h) };
}
function updatePatrols(run) {
  for (const p of run.environment.patrols) {
    const now = patrolPosition(run, p, run.environment.patrolTick),
      next = patrolPosition(run, p, run.environment.patrolTick + 1);
    Object.assign(p, now, { vx: (next.x - now.x) * 120, vy: (next.y - now.y) * 120 });
  }
}
export function advanceExpeditionPatrols(run, seconds) {
  for (const p of run.environment?.patrols ?? []) {
    p.x += p.vx * seconds;
    p.y += p.vy * seconds;
  }
}

export function tickExpedition(run, emit, { frozen = false } = {}) {
  const env = run.environment;
  if (!env) return;
  if (frozen) {
    for (const s of [...env.emitters, ...env.erosion]) s.until++;
    for (const p of env.patrols) p.vx = p.vy = 0;
    return;
  }
  updatePatrols(run);
  env.patrolTick++;
  for (const e of env.emitters) {
    if (e.disabled || run.tick < e.until) continue;
    if (e.phase === 'warning') {
      const player = run.players[e.target];
      // A warning owns the original cut; closing/reopening cannot transfer it.
      if (player?.status === 'active' && player.cutId === e.cutId) {
        const cell = player.trail.find((c) => (e.axis === 'horizontal' ? c.y : c.x) === e.line);
        if (cell)
          seedTrailImpacts(
            run,
            { owner: e.id, source: 'emitter', player: player.id, cellIndex: cell.index },
            emit,
          );
      }
      e.phase = 'rest';
      e.until = run.tick + e.restTicks;
      emit(run, 'emitter.fired', { stronghold: e.id, target: e.target });
    } else {
      const candidates = run.players
        .filter(
          (p) => p.status === 'active' && p.cutting && p.trail.length && p.graceUntil <= run.time,
        )
        .sort(
          (a, b) =>
            env.emitters.filter((other) => other.phase === 'warning' && other.target === a.id)
              .length -
              env.emitters.filter((other) => other.phase === 'warning' && other.target === b.id)
                .length || a.id - b.id,
        );
      const p = candidates[0];
      if (!p) {
        e.until = run.tick + 1;
        continue;
      }
      const cell = p.trail[Math.floor(p.trail.length / 2)];
      e.phase = 'warning';
      e.target = p.id;
      e.cutId = p.cutId;
      e.line = e.axis === 'horizontal' ? cell.y : cell.x;
      e.until = run.tick + e.warningTicks;
      emit(run, 'emitter.warning', {
        stronghold: e.id,
        target: p.id,
        cellIndex: cell.index,
        phaseUntil: e.until / 120,
      });
    }
  }
  for (const e of env.erosion) {
    if (e.disabled || run.tick < e.until) continue;
    // Never remove permanent foundations, relay/stage objectives, a pilot,
    // their return anchor, a downed rescue position, or the sole safe corridor.
    const protectedNow = (i) =>
      env.protected[i] ||
      run.players.some(
        (p) =>
          Math.hypot((i % run.width) + 0.5 - p.x, Math.floor(i / run.width) + 0.5 - p.y) < 2 ||
          Math.hypot(
            (i % run.width) + 0.5 - p.safeAnchor.x,
            Math.floor(i / run.width) + 0.5 - p.safeAnchor.y,
          ) < 2,
      ) ||
      [...env.stages, ...env.relays.map((r) => r.objective)].some((p) => indexAt(run, p) === i);
    if (e.warning.length) {
      let removed = 0;
      for (const i of e.warning)
        if (run.cells[i] === 1 && !protectedNow(i) && removableSafeEdge(run, i)) {
          run.cells[i] = 0;
          removed++;
        }
      run.claimedCount = Math.max(0, run.claimedCount - removed);
      run.coverage = run.claimedCount / run.totalClaimable;
      emit(run, 'environment.eroded', { source: e.id, cells: removed });
      e.warning = [];
      e.until = run.tick + e.restTicks;
    } else {
      for (let i = run.width + 1; i < run.cells.length - run.width - 1; i++)
        if (
          run.cells[i] === 1 &&
          !protectedNow(i) &&
          Math.hypot((i % run.width) + 0.5 - e.x, Math.floor(i / run.width) + 0.5 - e.y) <=
            e.radius &&
          [i - 1, i + 1, i - run.width, i + run.width].some((n) => run.cells[n] === 0) &&
          removableSafeEdge(run, i)
        ) {
          e.warning.push(i);
          break;
        }
      e.until = run.tick + (e.warning.length ? e.warningTicks : e.restTicks);
      if (e.warning.length)
        emit(run, 'emitter.warning', {
          stronghold: e.id,
          target: null,
          cellIndex: e.warning[0],
          phaseUntil: e.until / 120,
        });
    }
  }
}

/** Swept contacts join the core's ordinary hazard/closure event ordering. */
export function expeditionPatrolContacts(run, velocities, horizon) {
  const hits = [];
  for (const patrol of run.environment?.patrols ?? [])
    for (const player of run.players) {
      if (player.status !== 'active' || player.graceUntil > run.time) continue;
      const v = velocities[player.id];
      const fraction = movingCirclesTime(
        player,
        { x: player.x + v.x * horizon, y: player.y + v.y * horizon },
        patrol,
        { x: patrol.x + patrol.vx * horizon, y: patrol.y + patrol.vy * horizon },
        player.radius + 0.28,
      );
      if (fraction !== null)
        hits.push({
          time: fraction * horizon,
          player: player.id,
          enemy: patrol.id,
          cause: 'perimeter-patrol',
        });
    }
  return hits;
}
