import { exactKeys, required } from '../data-json.mjs';
import { CELL, DIRECTIONS, FIXED_DT } from './registry.mjs';
import { EPS, boxTime } from './geometry.mjs';
import { fitsClassicDomain } from './classic-topology.mjs';

export const ENEMY_PRESSURE_VERSION = 'enemy-pressure.v1';
const fields = [
  'id',
  'mode',
  'senseRadius',
  'scanTicks',
  'warningTicks',
  'commitTicks',
  'cooldownTicks',
  'leadTicks',
];
const integer = (n, low, high) => Number.isInteger(n) && n >= low && n <= high;
const clamp = (n, low, high) => Math.max(low, Math.min(high, n));
const point = (x, y) => ({ x, y });
const same = (a, b) => Math.hypot(a.x - b.x, a.y - b.y) <= EPS;
const cell = (state, p) => Math.floor(p.y) * state.width + Math.floor(p.x);
const center = (state, index) =>
  point((index % state.width) + 0.5, Math.floor(index / state.width) + 0.5);

/** Called only after the level boundary has made an owned bounded JSON copy. */
export function validateEnemyPressure(level) {
  if (!Object.hasOwn(level.classic, 'enemyPressure')) return;
  const value = level.classic.enemyPressure;
  exactKeys(value, ['version', 'actors'], 'enemy pressure');
  required(value.version === ENEMY_PRESSURE_VERSION, 'unsupported enemy pressure version');
  required(
    Array.isArray(value.actors) && value.actors.length >= 1 && value.actors.length <= 8,
    'enemy pressure requires 1..8 actors',
  );
  const ids = new Set();
  for (const actor of value.actors) {
    exactKeys(actor, fields, 'enemy pressure actor');
    required(
      fields.every((key) => Object.hasOwn(actor, key)),
      'enemy pressure actor fields are required',
    );
    const enemy = level.enemies?.find((candidate) => candidate.id === actor.id);
    required(
      enemy?.type === 'bouncer' && !ids.has(actor.id),
      'enemy pressure requires unique bouncer IDs',
    );
    ids.add(actor.id);
    const speed = Math.hypot(enemy.vx, enemy.vy);
    required(
      speed > 0 && speed <= 20,
      'enemy pressure speed must be greater than 0 and at most 20',
    );
    required(
      ['trail-pursuit', 'head-intercept'].includes(actor.mode),
      'unsupported enemy pressure mode',
    );
    required(
      Number.isFinite(actor.senseRadius) && actor.senseRadius >= 4 && actor.senseRadius <= 24,
      'enemy pressure senseRadius must be 4..24',
    );
    for (const [key, low, high] of [
      ['scanTicks', 24, 240],
      ['warningTicks', 36, 180],
      ['commitTicks', 60, 360],
      ['cooldownTicks', 90, 600],
      ['leadTicks', 0, 60],
    ])
      required(
        integer(actor[key], low, high),
        `enemy pressure ${key} must be an integer in ${low}..${high}`,
      );
    required(
      actor.mode !== 'trail-pursuit' || actor.leadTicks === 0,
      'trail pursuit requires leadTicks 0',
    );
  }
}

export function initializeEnemyPressure(state) {
  for (const def of state.level.classic.enemyPressure?.actors ?? []) {
    const enemy = state.enemies.find((candidate) => candidate.id === def.id);
    enemy.classic = {
      ...enemy.classic,
      pressure: {
        version: 'enemy-pressure-state.v1',
        phase: 'patrol',
        nextScanTick: 0,
        warningUntil: null,
        commitUntil: null,
        cooldownUntil: null,
        target: null,
        path: [],
        pathIndex: 0,
        topologyRevision: state.classic.topologyRevision,
        baseSpeed: Math.hypot(enemy.vx, enemy.vy),
        aborted: false,
      },
    };
  }
}

/** Conservative swept footprint test. A grazing forbidden edge is not a clear route. */
function clearSegment(state, a, b, radius) {
  if (
    !fitsClassicDomain(state, a, radius + EPS * 4, CELL.FIELD) ||
    !fitsClassicDomain(state, b, radius + EPS * 4, CELL.FIELD)
  )
    return false;
  for (
    let y = Math.max(0, Math.floor(Math.min(a.y, b.y) - radius));
    y <= Math.min(state.height - 1, Math.floor(Math.max(a.y, b.y) + radius));
    y++
  )
    for (
      let x = Math.max(0, Math.floor(Math.min(a.x, b.x) - radius));
      x <= Math.min(state.width - 1, Math.floor(Math.max(a.x, b.x) + radius));
      x++
    )
      if (
        state.cells[y * state.width + x] !== CELL.FIELD &&
        boxTime(a, b, {
          x: x - radius - EPS,
          y: y - radius - EPS,
          w: 1 + 2 * radius + 2 * EPS,
          h: 1 + 2 * radius + 2 * EPS,
        }) !== null
      )
        return false;
  return true;
}

function sense(state, enemy, def) {
  const visible = (target) =>
    Math.hypot(target.x - enemy.x, target.y - enemy.y) <= def.senseRadius + EPS &&
    clearSegment(state, enemy, target, 0);
  if (def.mode === 'head-intercept') {
    const target = point(state.player.x, state.player.y);
    if (!visible(target)) return null;
    const direction = DIRECTIONS[state.player.direction],
      distance = Math.min(def.senseRadius / 2, state.player.speed * def.leadTicks * FIXED_DT);
    // Prediction follows only the last observed heading, stopping before blocked ground.
    for (let i = 1, steps = Math.ceil(distance * 4); i <= steps; i++) {
      const candidate = point(
        state.player.x + (direction.x * distance * i) / steps,
        state.player.y + (direction.y * distance * i) / steps,
      );
      if (!clearSegment(state, target, candidate, 0)) break;
      Object.assign(target, candidate);
    }
    return target;
  }
  let nearest = null;
  for (const segment of state.trailSegments) {
    const dx = segment.x2 - segment.x1,
      dy = segment.y2 - segment.y1,
      length2 = dx * dx + dy * dy,
      t =
        length2 > EPS
          ? clamp(((enemy.x - segment.x1) * dx + (enemy.y - segment.y1) * dy) / length2, 0, 1)
          : 0,
      target = point(segment.x1 + dx * t, segment.y1 + dy * t),
      distance2 = (enemy.x - target.x) ** 2 + (enemy.y - target.y) ** 2;
    if ((!nearest || distance2 < nearest.distance2 - EPS) && visible(target))
      nearest = { ...target, distance2 };
  }
  return nearest ? point(nearest.x, nearest.y) : null;
}

/** Finite FIELD routing with north/east/south/west ties; no player prediction in routing. */
function route(state, enemy, target) {
  if (!fitsClassicDomain(state, enemy, enemy.radius + EPS * 4, CELL.FIELD)) return null;
  if (clearSegment(state, enemy, target, enemy.radius)) return [point(target.x, target.y)];
  const start = cell(state, enemy),
    end = cell(state, target),
    parent = new Int32Array(state.cells.length).fill(-2),
    queue = [start];
  if (state.cells[end] !== CELL.FIELD) return null;
  parent[start] = -1;
  for (let head = 0; head < queue.length && parent[end] === -2; head++) {
    const index = queue[head],
      x = index % state.width,
      y = Math.floor(index / state.width);
    for (const next of [
      y > 0 ? index - state.width : -1,
      x + 1 < state.width ? index + 1 : -1,
      y + 1 < state.height ? index + state.width : -1,
      x > 0 ? index - 1 : -1,
    ]) {
      if (
        next < 0 ||
        parent[next] !== -2 ||
        state.cells[next] !== CELL.FIELD ||
        !clearSegment(state, center(state, index), center(state, next), enemy.radius)
      )
        continue;
      parent[next] = index;
      queue.push(next);
    }
  }
  if (parent[end] === -2) return null;
  const indices = [];
  for (let index = end; index !== -1; index = parent[index]) indices.push(index);
  const path = indices.reverse().map((index) => center(state, index));
  if (!clearSegment(state, enemy, path[0], enemy.radius)) return null;
  // Keep bends, not every intervening cell, so motion advances bounded waypoints.
  const compact = path.filter(
    (p, i) =>
      i === 0 ||
      i === path.length - 1 ||
      (p.x - path[i - 1].x) * (path[i + 1].y - p.y) !==
        (p.y - path[i - 1].y) * (path[i + 1].x - p.x),
  );
  if (clearSegment(state, compact.at(-1), target, enemy.radius))
    compact.push(point(target.x, target.y));
  return compact.filter((p, i) => !same(p, i ? compact[i - 1] : enemy));
}

function emit(state, enemy, def, kind, reason = null) {
  const p = enemy.classic.pressure;
  state.events.push({
    type: `pressure.${kind}`,
    tick: state.tick,
    time: state.time,
    id: enemy.id,
    mode: def.mode,
    actorTick: state.classic.actorTick,
    target: p.target ? { ...p.target } : null,
    warningUntil: p.warningUntil,
    commitUntil: p.commitUntil,
    cooldownUntil: p.cooldownUntil,
    ...(reason ? { reason } : {}),
  });
}

function cooldown(state, enemy, def, reason) {
  const p = enemy.classic.pressure;
  p.phase = 'cooldown';
  p.cooldownUntil = state.classic.actorTick + def.cooldownTicks;
  p.warningUntil = null;
  p.commitUntil = null;
  p.path = [];
  p.pathIndex = 0;
  p.aborted = false;
  emit(state, enemy, def, reason ? 'cancelled' : 'cooldown', reason);
  p.target = null;
}

export function updateEnemyPressure(state) {
  for (const def of state.level.classic.enemyPressure?.actors ?? []) {
    const enemy = state.enemies.find((candidate) => candidate.id === def.id),
      p = enemy.classic.pressure,
      tick = state.classic.actorTick;
    if (p.phase === 'warning' || p.phase === 'committed') {
      const reason =
        state.status !== 'running'
          ? 'recovery'
          : !state.player.cutting
            ? 'trail-closed'
            : p.topologyRevision !== state.classic.topologyRevision
              ? 'topology-changed'
              : p.aborted
                ? 'route-blocked'
                : null;
      if (reason) {
        cooldown(state, enemy, def, reason);
        continue;
      }
    }
    const freeze = state.classic.effects['enemy-freeze'];
    if (
      (state.tick >= freeze.from && state.tick < freeze.until) ||
      enemy.stunnedUntil > state.time + EPS
    )
      continue;
    if (p.phase === 'cooldown') {
      if (tick < p.cooldownUntil) continue;
      p.phase = 'patrol';
      p.cooldownUntil = null;
      p.nextScanTick = tick;
    }
    if (p.phase === 'warning') {
      if (tick < p.warningUntil) continue;
      const path = route(state, enemy, p.target);
      if (!path?.length) {
        cooldown(state, enemy, def, 'route-unavailable');
        continue;
      }
      p.phase = 'committed';
      p.path = path;
      p.pathIndex = 0;
      p.warningUntil = null;
      p.commitUntil = tick + def.commitTicks;
      emit(state, enemy, def, 'committed');
    } else if (p.phase === 'committed') {
      if (tick >= p.commitUntil || p.pathIndex >= p.path.length) cooldown(state, enemy, def, null);
    } else if (p.phase === 'patrol' && tick >= p.nextScanTick) {
      p.nextScanTick = tick + def.scanTicks;
      if (
        state.status !== 'running' ||
        !state.player.cutting ||
        !state.trail.length ||
        state.player.graceUntil > state.time + EPS
      )
        continue;
      const target = sense(state, enemy, def);
      if (!target) continue;
      p.phase = 'warning';
      p.target = target;
      p.warningUntil = tick + def.warningTicks;
      p.topologyRevision = state.classic.topologyRevision;
      emit(state, enemy, def, 'warning');
    }
  }
}

/** Aim only at the previously committed route. Collision integration remains classic-motion's. */
export function pressureWaypoint(enemy, factor, duration) {
  const p = enemy.classic?.pressure;
  if (p?.phase !== 'committed' || !factor || p.pathIndex >= p.path.length) return null;
  const target = p.path[p.pathIndex],
    distance = Math.hypot(target.x - enemy.x, target.y - enemy.y);
  if (distance <= EPS) return { target, duration: 0, vx: enemy.vx, vy: enemy.vy };
  return {
    target,
    duration: Math.min(duration, distance / (p.baseSpeed * factor)),
    vx: ((target.x - enemy.x) * p.baseSpeed) / distance,
    vy: ((target.y - enemy.y) * p.baseSpeed) / distance,
  };
}
