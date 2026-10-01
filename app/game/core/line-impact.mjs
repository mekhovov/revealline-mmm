import { EPS, boxTime } from './geometry.mjs';
import { pathPoint } from './movement.mjs';
import { classicEffectActive } from './classic-state.mjs';

const length = (s) => Math.hypot(s.x2 - s.x1, s.y2 - s.y1);
const point = (s, f) => ({ x: s.x1 + (s.x2 - s.x1) * f, y: s.y1 + (s.y2 - s.y1) * f });
function segmentsAt(state, trace, time) {
  const segments = [...state.trailSegments];
  for (const s of trace.additions) {
    if (s.t0 > time + EPS) continue;
    const end = point(s, s.t1 > s.t0 ? Math.max(0, Math.min(1, (time - s.t0) / (s.t1 - s.t0))) : 0);
    segments.push({ x1: s.x1, y1: s.y1, x2: end.x, y2: end.y });
  }
  return segments;
}
function pointAtDistance(segments, distance) {
  for (const s of segments) {
    const size = length(s);
    if (distance <= size + EPS)
      return point(s, size > EPS ? Math.max(0, Math.min(1, distance / size)) : 0);
    distance -= size;
  }
  const tail = segments.at(-1);
  return tail ? { x: tail.x2, y: tail.y2 } : null;
}
function nearestDistance(segments, location) {
  let offset = 0,
    best = null;
  for (const s of segments) {
    const size = length(s),
      dx = s.x2 - s.x1,
      dy = s.y2 - s.y1;
    const f =
      size > EPS
        ? Math.max(
            0,
            Math.min(1, ((location.x - s.x1) * dx + (location.y - s.y1) * dy) / (size * size)),
          )
        : 0;
    const at = point(s, f),
      squared = (at.x - location.x) ** 2 + (at.y - location.y) ** 2;
    if (!best || squared < best.squared - EPS)
      best = { squared, distance: offset + size * f, ...at };
    offset += size;
  }
  return best;
}

/** Same cell contact envelope as immediate trail damage, with stable actor/arc ties. */
export function nextLineImpactSeed(state, enemyPlans, trace, horizon) {
  const impact = state.classic?.lineImpact;
  if (
    !impact ||
    state.player.graceUntil > state.time + EPS ||
    classicEffectActive(state, 'enemy-freeze')
  )
    return null;
  const candidates = new Map();
  const remember = (enemy, time, location) => {
    if (time > horizon + EPS) return;
    const nearest = nearestDistance(segmentsAt(state, trace, time), location);
    if (!nearest) return;
    const candidate = {
      time,
      actorId: enemy.id,
      distance: nearest.distance,
      x: nearest.x,
      y: nearest.y,
    };
    const best = candidates.get(enemy.id);
    if (
      !best ||
      time < best.time - EPS ||
      (Math.abs(time - best.time) < EPS && candidate.distance < best.distance)
    )
      candidates.set(enemy.id, candidate);
  };
  const cells = [
    ...state.trail.map((c) => ({ ...c, time: 0 })),
    ...trace.cells.map((c) => ({
      x: c.index % state.width,
      y: Math.floor(c.index / state.width),
      time: c.time,
    })),
  ];
  for (const [i, enemy] of state.enemies.entries()) {
    if (
      (state.level.classic.lineImpact.version === 'line-impact.v2' &&
        !state.level.classic.lineImpact.actorIds.includes(enemy.id)) ||
      impact.seededActorIds.includes(enemy.id) ||
      (enemy.type === 'relay-sentinel' && state.encounter?.defeated) ||
      (enemy.type === 'claimed-rover' && enemy.classic.mode !== 'active')
    )
      continue;
    for (const path of enemyPlans[i].paths) {
      for (const cell of cells) {
        const lo = Math.max(path.t0, cell.time),
          hi = Math.min(path.t1, horizon);
        if (lo > hi + EPS) continue;
        const t = boxTime(pathPoint(path, lo), pathPoint(path, hi), {
          x: cell.x - enemy.radius,
          y: cell.y - enemy.radius,
          w: 1 + enemy.radius * 2,
          h: 1 + enemy.radius * 2,
        });
        if (t !== null) {
          const time = lo + (hi - lo) * t;
          remember(enemy, time, pathPoint(path, time));
        }
      }
    }
    const staged = enemy.type === 'relay-sentinel' ? state.encounter : null;
    if (
      !(
        (enemy.type === 'lane-boss' && enemy.bossPhase === 'active') ||
        staged?.phase === 'active'
      ) ||
      enemy.stunnedUntil > state.time + EPS
    )
      continue;
    const width = staged ? state.level.encounter.laneWidth : (enemy.laneWidth ?? 1.2),
      axis = staged ? staged.axis : enemy.axis,
      lane = staged ? staged.lane : enemy.lane;
    for (const cell of cells) {
      const overlaps =
        axis === 'horizontal'
          ? cell.y <= lane + width / 2 && cell.y + 1 >= lane - width / 2
          : cell.x <= lane + width / 2 && cell.x + 1 >= lane - width / 2;
      if (overlaps)
        remember(
          enemy,
          cell.time,
          axis === 'horizontal' ? { x: cell.x + 0.5, y: lane } : { x: lane, y: cell.y + 0.5 },
        );
    }
  }
  if (!candidates.size) return null;
  const time = Math.min(...[...candidates.values()].map((candidate) => candidate.time));
  return {
    time,
    contacts: [...candidates.values()]
      .filter((candidate) => Math.abs(candidate.time - time) < EPS)
      .sort((a, b) => (a.actorId < b.actorId ? -1 : 1)),
  };
}

/** Chase the growing polyline endpoint; direction changes alter geometry, not arc speed. */
function arrivalTime(state, front, trace, horizon) {
  const speed = state.level.classic.lineImpact.speed;
  let size = state.trailSegments.reduce((sum, s) => sum + length(s), 0),
    cursor = 0;
  const interval = (end, growth) => {
    const gap = size - (front.distance + speed * cursor);
    if (gap <= EPS) return cursor;
    const closing = speed - growth;
    const at = closing > EPS ? cursor + gap / closing : Infinity;
    return at <= end + EPS ? Math.max(cursor, Math.min(end, at)) : null;
  };
  for (const s of trace.additions) {
    if (s.t0 > horizon + EPS) break;
    if (s.t0 > cursor + EPS) {
      const found = interval(Math.min(s.t0, horizon), 0);
      if (found !== null) return found;
      cursor = Math.min(s.t0, horizon);
    }
    const end = Math.min(s.t1, horizon),
      rate = s.t1 > s.t0 ? length(s) / (s.t1 - s.t0) : 0;
    const found = interval(end, rate);
    if (found !== null) return found;
    size += rate * (end - cursor);
    cursor = end;
    if (cursor >= horizon - EPS) break;
  }
  return interval(horizon, 0);
}
export function nextLineImpactEvent(state, trace, horizon) {
  const impact = state.classic?.lineImpact;
  if (!impact) return null;
  let best = null;
  for (const front of impact.fronts) {
    const time =
      front.direction < 0
        ? front.distance / state.level.classic.lineImpact.speed
        : arrivalTime(state, front, trace, horizon);
    if (time === null || time > horizon + EPS) continue;
    const candidate = {
      time: Math.max(0, time),
      kind: front.direction < 0 ? 'departure' : 'player',
      front,
    };
    if (
      !best ||
      candidate.time < best.time - EPS ||
      (Math.abs(candidate.time - best.time) < EPS &&
        ((candidate.kind === 'player' && best.kind !== 'player') ||
          (candidate.kind === best.kind && front.id < best.front.id)))
    )
      best = candidate;
  }
  return best;
}

export function advanceLineImpacts(state, elapsed) {
  const impact = state.classic?.lineImpact;
  if (!impact) return;
  for (const front of impact.fronts) {
    front.distance = Math.max(
      0,
      front.distance + front.direction * state.level.classic.lineImpact.speed * elapsed,
    );
    Object.assign(front, pointAtDistance(state.trailSegments, front.distance));
  }
}
export function finishLineImpactDepartures(state) {
  const impact = state.classic?.lineImpact;
  if (!impact) return;
  impact.fronts = impact.fronts.filter((front) => {
    if (front.direction > 0 || front.distance > EPS) return true;
    state.events.push({
      type: 'lineImpact.ended',
      tick: state.tick,
      time: state.time,
      id: front.id,
      actorId: front.actorId,
      x: front.x,
      y: front.y,
      reason: 'departure',
    });
    return false;
  });
}
export function seedLineImpact(state, contact) {
  const impact = state.classic?.lineImpact;
  if (!impact || !state.player.cutting || impact.seededActorIds.includes(contact.actorId)) return;
  const pairId = impact.nextId++;
  const fronts = [-1, 1].map((direction) => ({
    id: `impact-${pairId}-${direction < 0 ? 'departure' : 'player'}`,
    actorId: contact.actorId,
    direction,
    distance: contact.distance,
    x: contact.x,
    y: contact.y,
    seededTick: state.tick,
    seededTime: state.time,
  }));
  impact.seededActorIds.push(contact.actorId);
  impact.fronts.push(...fronts);
  state.events.push({
    type: 'lineImpact.seeded',
    tick: state.tick,
    time: state.time,
    actorId: contact.actorId,
    x: contact.x,
    y: contact.y,
    distance: contact.distance,
    speed: state.level.classic.lineImpact.speed,
    fronts: fronts.map(({ id, direction }) => ({ id, direction })),
  });
}
export function clearLineImpacts(state, reason) {
  const impact = state.classic?.lineImpact;
  if (!impact) return;
  if (impact.fronts.length)
    state.events.push({
      type: 'lineImpact.cleared',
      tick: state.tick,
      time: state.time,
      reason,
      ids: impact.fronts.map((front) => front.id),
    });
  impact.fronts = [];
  impact.seededActorIds = [];
}
