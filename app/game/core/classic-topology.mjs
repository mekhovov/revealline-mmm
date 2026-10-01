import { CELL } from './registry.mjs';
import { cellIndex } from './movement.mjs';
import { EPS } from './geometry.mjs';

export const classicSeedsField = (enemy) =>
  ['bouncer', 'eroder', 'lane-boss', 'relay-sentinel'].includes(enemy.type);

export function classicClaim(state, secured) {
  const classic = state.classic;
  let first = 0;
  for (const index of secured) {
    if (!classic.eligible[index]) throw new Error('Cannot claim an ineligible classic cell');
    if (!classic.everClaimed[index]) {
      classic.everClaimed[index] = 1;
      first++;
    }
  }
  classic.uniqueClaimedCount += first;
  classic.tickClaims.push(...secured);
  classic.departure = null;
  if (secured.length) classic.topologyRevision++;
  return first;
}

const neighbors = (index, state) => {
  const x = index % state.width,
    y = Math.floor(index / state.width);
  return [
    y > 0 ? index - state.width : -1,
    x + 1 < state.width ? index + 1 : -1,
    y + 1 < state.height ? index + state.width : -1,
    x > 0 ? index - 1 : -1,
  ].filter((i) => i >= 0);
};
const border = (index, state) => {
  const x = index % state.width,
    y = Math.floor(index / state.width);
  return x === 0 || y === 0 || x === state.width - 1 || y === state.height - 1;
};

/** Shortest committed-safe anchor path, with fixed north/east/south/west ties. */
function anchorPath(state, start) {
  const parent = new Int32Array(state.cells.length).fill(-2),
    queue = [start];
  parent[start] = -1;
  for (let head = 0; head < queue.length; head++) {
    const index = queue[head];
    if (border(index, state) || state.foundation?.permanent[index]) {
      const path = [];
      for (let i = index; i !== -1; i = parent[i]) path.push(i);
      return path.reverse();
    }
    for (const next of neighbors(index, state))
      if (parent[next] === -2 && state.cells[next] === CELL.SAFE) {
        parent[next] = index;
        queue.push(next);
      }
  }
  return null;
}

export function updateClassicAnchors(state) {
  const candidates = [
    ...state.objectives.filter((o) => o.required && o.captured),
    ...state.supplies,
    ...state.hangars,
  ];
  for (const item of candidates) {
    const index = cellIndex(item.x, item.y, state);
    if (state.cells[index] !== CELL.SAFE) continue;
    let anchor = state.classic.anchors.find((a) => a.id === item.id);
    if (!anchor) {
      anchor = { id: item.id, index, path: null };
      state.classic.anchors.push(anchor);
    }
    if (anchor.path === null) anchor.path = anchorPath(state, index);
  }
  state.classic.anchors.sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
}

function support(state, set, point, radius, margin = 0) {
  const lowX = Math.max(0, Math.floor(point.x - radius) - margin);
  const highX = Math.min(state.width - 1, Math.floor(point.x + radius) + margin);
  const lowY = Math.max(0, Math.floor(point.y - radius) - margin);
  const highY = Math.min(state.height - 1, Math.floor(point.y + radius) + margin);
  for (let y = lowY; y <= highY; y++)
    for (let x = lowX; x <= highX; x++)
      if (state.cells[y * state.width + x] === CELL.SAFE) set.add(y * state.width + x);
}

export function classicProtectedCells(state) {
  const protectedCells = new Set(state.classic.tickClaims);
  support(state, protectedCells, state.player, state.rules.playerRadius, 1);
  if (state.classic.departure !== null) protectedCells.add(state.classic.departure);
  for (const enemy of state.enemies)
    if (
      enemy.type === 'contour-patrol' ||
      (enemy.type === 'claimed-rover' && enemy.classic.mode === 'active')
    )
      support(state, protectedCells, enemy, enemy.radius);
  for (const anchor of state.classic.anchors) {
    protectedCells.add(anchor.index);
    for (const index of anchor.path ?? []) protectedCells.add(index);
  }
  return protectedCells;
}

export function classicErosionReason(state, index, protectedCells = classicProtectedCells(state)) {
  if (!Number.isInteger(index) || index < 0 || index >= state.cells.length || border(index, state))
    return 'border';
  if (state.cells[index] === CELL.WALL) return 'wall';
  if (state.foundation?.permanent[index]) return 'foundation';
  if (state.cells[index] !== CELL.SAFE) return 'not-safe';
  if (protectedCells.has(index)) return 'protected';
  return null;
}

/** Recheck every due request after a simultaneous capture, before terminal evaluation. */
export function commitClassicErosion(state) {
  updateClassicAnchors(state);
  const protectedCells = classicProtectedCells(state),
    erased = new Set();
  const due = state.enemies
    .filter(
      (enemy) =>
        enemy.type === 'eroder' &&
        enemy.classic.target !== null &&
        enemy.classic.erosionAt <= state.classic.actorTick,
    )
    .sort((a, b) => (a.id < b.id ? -1 : 1));
  for (const enemy of due) {
    const index = enemy.classic.target;
    const reason = classicErosionReason(state, index, protectedCells);
    enemy.classic.target = null;
    enemy.classic.erosionAt = null;
    enemy.classic.cooldownUntil = state.classic.actorTick + 120;
    if (reason)
      state.events.push({
        type: 'erosion.blocked',
        tick: state.tick,
        time: state.time,
        id: enemy.id,
        index,
        reason,
      });
    else {
      state.cells[index] = CELL.FIELD;
      erased.add(index);
    }
  }
  if (erased.size) {
    state.claimedCount -= erased.size;
    state.coverage = state.claimedCount / state.totalClaimable;
    state.classic.topologyRevision++;
    state.events.push({
      type: 'cells.eroded',
      tick: state.tick,
      time: state.time,
      indices: [...erased].sort((a, b) => a - b),
      coverage: state.coverage,
    });
  }
  return erased.size;
}

/** A radius must fit the interior of one movement domain; touching its edge is allowed. */
export function fitsClassicDomain(state, point, radius, kind) {
  if (
    point.x - radius < -EPS ||
    point.y - radius < -EPS ||
    point.x + radius > state.width + EPS ||
    point.y + radius > state.height + EPS
  )
    return false;
  for (
    let y = Math.max(0, Math.floor(point.y - radius + EPS));
    y <= Math.min(state.height - 1, Math.floor(point.y + radius - EPS));
    y++
  )
    for (
      let x = Math.max(0, Math.floor(point.x - radius + EPS));
      x <= Math.min(state.width - 1, Math.floor(point.x + radius - EPS));
      x++
    )
      if (state.cells[y * state.width + x] !== kind) return false;
  return true;
}
