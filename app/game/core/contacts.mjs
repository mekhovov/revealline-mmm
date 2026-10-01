import { EPS, movingCirclesTime, boxTime } from './geometry.mjs';
import { pathPoint } from './movement.mjs';
import { classicEffectActive } from './classic-state.mjs';

const a = (s) => ({ x: s.x1, y: s.y1 }),
  b = (s) => ({ x: s.x2, y: s.y2 });
const overlap = (p, q, horizon) => [Math.max(p.t0, q.t0), Math.min(p.t1, q.t1, horizon)];
function remember(best, time, kind, id, classic = false) {
  if (time == null) return best;
  const order = ['enemy-trail', 'enemy-player', 'boss-lane'];
  const tie = best && classic ? order.indexOf(kind) - order.indexOf(best.kind) : 0;
  if (
    !best ||
    time < best.time - EPS ||
    (Math.abs(time - best.time) < EPS && (tie < 0 || (tie === 0 && id < best.id)))
  )
    return { time, kind, id };
  return best;
}

export function enemyContact(
  state,
  playerPaths,
  enemyPlans,
  trace,
  horizon,
  { ignoreTrail = false, ignoreTrailActorIds = [] } = {},
) {
  if (state.player.graceUntil > state.time + EPS) return null;
  if (classicEffectActive(state, 'enemy-freeze')) return null;
  let best = null;
  for (let n = 0; n < state.enemies.length; n++) {
    const enemy = state.enemies[n],
      plan = enemyPlans[n];
    const skipTrail = ignoreTrail || ignoreTrailActorIds.includes(enemy.id);
    if (enemy.type === 'relay-sentinel' && state.encounter?.defeated) continue;
    if (state.classic && enemy.type === 'claimed-rover' && enemy.classic.mode !== 'active')
      continue;
    for (const path of plan.paths) {
      if (path.t0 > horizon + EPS) continue;
      const endTime = Math.min(path.t1, horizon),
        start = a(path),
        end = pathPoint(path, endTime);
      for (const trail of skipTrail ? [] : state.trail) {
        const t = boxTime(start, end, {
          x: trail.x - enemy.radius,
          y: trail.y - enemy.radius,
          w: 1 + enemy.radius * 2,
          h: 1 + enemy.radius * 2,
        });
        if (t != null)
          best = remember(
            best,
            path.t0 + (endTime - path.t0) * t,
            'enemy-trail',
            enemy.id,
            !!state.classic,
          );
      }
      for (const trail of skipTrail ? [] : trace.cells) {
        const lo = Math.max(path.t0, trail.time),
          hi = endTime;
        if (lo <= hi + EPS) {
          const x = trail.index % state.width,
            y = Math.floor(trail.index / state.width);
          const t = boxTime(pathPoint(path, lo), pathPoint(path, hi), {
            x: x - enemy.radius,
            y: y - enemy.radius,
            w: 1 + enemy.radius * 2,
            h: 1 + enemy.radius * 2,
          });
          if (t != null)
            best = remember(best, lo + (hi - lo) * t, 'enemy-trail', enemy.id, !!state.classic);
        }
      }
      for (const playerPath of playerPaths) {
        let [lo, hi] = overlap(path, playerPath, horizon);
        if (
          !(state.classic
            ? ['border-patrol', 'contour-patrol', 'claimed-rover'].includes(enemy.type)
            : enemy.type === 'border-patrol') &&
          !state.player.cutting
        )
          lo = Math.max(lo, trace.started ?? Infinity);
        if (lo > hi + EPS) continue;
        const t = movingCirclesTime(
          pathPoint(playerPath, lo),
          pathPoint(playerPath, hi),
          pathPoint(path, lo),
          pathPoint(path, hi),
          enemy.radius + state.rules.playerRadius,
        );
        if (t != null)
          best = remember(best, lo + (hi - lo) * t, 'enemy-player', enemy.id, !!state.classic);
      }
    }
    const staged = enemy.type === 'relay-sentinel' ? state.encounter : null;
    if (
      ((enemy.type === 'lane-boss' && enemy.bossPhase === 'active') ||
        (staged && staged.phase === 'active')) &&
      enemy.stunnedUntil <= state.time + EPS
    ) {
      const width = staged ? state.level.encounter.laneWidth : (enemy.laneWidth ?? 1.2);
      const axis = staged ? staged.axis : enemy.axis;
      const lane = staged ? staged.lane : enemy.lane;
      const box =
        axis === 'horizontal'
          ? { x: 1, y: lane - width / 2, w: state.width - 2, h: width }
          : { x: lane - width / 2, y: 1, w: width, h: state.height - 2 };
      const overlaps = (cell) =>
        cell.x <= box.x + box.w &&
        cell.x + 1 >= box.x &&
        cell.y <= box.y + box.h &&
        cell.y + 1 >= box.y;
      for (const trail of skipTrail ? [] : state.trail)
        if (overlaps(trail)) best = remember(best, 0, 'boss-lane', enemy.id, !!state.classic);
      for (const trail of skipTrail ? [] : trace.cells) {
        if (trail.time > horizon + EPS) continue;
        if (overlaps({ x: trail.index % state.width, y: Math.floor(trail.index / state.width) }))
          best = remember(best, trail.time, 'boss-lane', enemy.id, !!state.classic);
      }
      if (state.player.cutting)
        for (const path of playerPaths) {
          const hi = Math.min(horizon, path.t1);
          if (path.t0 > hi + EPS) continue;
          const t = boxTime(a(path), pathPoint(path, hi), box);
          if (t != null)
            best = remember(
              best,
              path.t0 + (hi - path.t0) * t,
              'boss-lane',
              enemy.id,
              !!state.classic,
            );
        }
    }
  }
  return best;
}
