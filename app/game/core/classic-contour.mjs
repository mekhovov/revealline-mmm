import { CELL } from './registry.mjs';
import { EPS } from './geometry.mjs';

const vectors = [
  [0, -1],
  [1, 0],
  [0, 1],
  [-1, 0],
];
const pointKey = (p, state) => Math.round(p.y * 2) * (state.width * 2 + 1) + Math.round(p.x * 2);
const same = (a, b) => Math.abs(a.x - b.x) < EPS && Math.abs(a.y - b.y) < EPS;
export function contourEdgeId(edge, width) {
  return (edge.y * width + edge.x) * 4 + ['north', 'east', 'south', 'west'].indexOf(edge.side);
}
export function classicContourGraph(state) {
  if (state._classicContour?.revision === state.classic.topologyRevision)
    return state._classicContour;
  const edges = new Map(),
    vertices = new Map(),
    starts = new Map(),
    ends = new Map();
  for (let y = 1; y < state.height - 1; y++)
    for (let x = 1; x < state.width - 1; x++) {
      const index = y * state.width + x;
      if (state.cells[index] !== CELL.FIELD) continue;
      for (let side = 0; side < 4; side++) {
        const [dx, dy] = vectors[side];
        if (state.cells[(y + dy) * state.width + x + dx] !== CELL.SAFE) continue;
        const points = [
          { x, y },
          { x: x + 1, y },
          { x: x + 1, y: y + 1 },
          { x, y: y + 1 },
        ];
        const edge = {
          id: index * 4 + side,
          a: points[side],
          b: points[(side + 1) % 4],
          direction: (side + 1) % 4,
        };
        edges.set(edge.id, edge);
        for (const point of [edge.a, edge.b]) vertices.set(pointKey(point, state), point);
        for (const [map, point] of [
          [starts, edge.a],
          [ends, edge.b],
        ]) {
          const key = pointKey(point, state);
          if (!map.has(key)) map.set(key, []);
          map.get(key).push(edge);
        }
      }
    }
  state._classicContour = {
    revision: state.classic.topologyRevision,
    edges,
    vertices,
    starts,
    ends,
  };
  return state._classicContour;
}
export function orientedContourEdge(edge, clockwise) {
  return clockwise ? edge : { ...edge, a: edge.b, b: edge.a, direction: (edge.direction + 2) % 4 };
}
export function nextContourEdge(state, enemy, edge) {
  const graph = classicContourGraph(state),
    turn = enemy.clockwise ? 1 : 3;
  const preference = [turn, 0, (4 - turn) % 4, 2];
  return (
    [...((enemy.clockwise ? graph.starts : graph.ends).get(pointKey(edge.b, state)) ?? [])]
      .map((item) => orientedContourEdge(item, enemy.clockwise))
      .sort(
        (a, b) =>
          preference.indexOf((a.direction - edge.direction + 4) % 4) -
            preference.indexOf((b.direction - edge.direction + 4) % 4) || a.id - b.id,
      )[0] ?? null
  );
}
function closedSafe(state, point) {
  for (const y of new Set([Math.floor(point.y - EPS), Math.floor(point.y + EPS)]))
    for (const x of new Set([Math.floor(point.x - EPS), Math.floor(point.x + EPS)]))
      if (
        x >= 0 &&
        y >= 0 &&
        x < state.width &&
        y < state.height &&
        state.cells[y * state.width + x] === CELL.SAFE
      )
        return true;
  return false;
}
function safeSegment(state, a, b, radius) {
  const left = Math.min(a.x, b.x) - radius,
    right = Math.max(a.x, b.x) + radius;
  const top = Math.min(a.y, b.y) - radius,
    bottom = Math.max(a.y, b.y) + radius;
  if (left < -EPS || top < -EPS || right > state.width + EPS || bottom > state.height + EPS)
    return false;
  for (
    let y = Math.max(0, Math.floor(top + EPS));
    y <= Math.min(state.height - 1, Math.floor(bottom - EPS));
    y++
  )
    for (
      let x = Math.max(0, Math.floor(left + EPS));
      x <= Math.min(state.width - 1, Math.floor(right - EPS));
      x++
    )
      if (state.cells[y * state.width + x] === CELL.WALL) return false;
  return (
    closedSafe(state, a) &&
    closedSafe(state, b) &&
    closedSafe(state, { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 })
  );
}
/** Bounded half-cell lattice; connectors preserve actual fractional position. */
export function contourRejoinPath(state, enemy) {
  const graph = classicContourGraph(state),
    row = state.width * 2 + 1;
  const starts = [];
  if (Math.abs(enemy.x * 2 - Math.round(enemy.x * 2)) < EPS)
    for (const y of new Set([Math.floor(enemy.y * 2) / 2, Math.ceil(enemy.y * 2) / 2]))
      starts.push({ x: enemy.x, y });
  if (Math.abs(enemy.y * 2 - Math.round(enemy.y * 2)) < EPS)
    for (const x of new Set([Math.floor(enemy.x * 2) / 2, Math.ceil(enemy.x * 2) / 2]))
      starts.push({ x, y: enemy.y });
  let best = null;
  for (const start of starts) {
    if (!safeSegment(state, enemy, start, enemy.radius)) continue;
    const key = pointKey(start, state),
      queue = [key],
      parent = new Map([[key, null]]),
      distance = new Map([[key, 0]]);
    const point = (id) => ({ x: (id % row) / 2, y: Math.floor(id / row) / 2 });
    let target = null,
      depth = Infinity;
    for (let head = 0; head < queue.length; head++) {
      const id = queue[head],
        d = distance.get(id),
        p = point(id);
      if (d > depth) break;
      if (graph.vertices.has(id)) {
        if (target === null || id < target) target = id;
        depth = d;
        continue;
      }
      for (const [dx, dy] of vectors) {
        const next = { x: p.x + dx / 2, y: p.y + dy / 2 },
          n = pointKey(next, state);
        if (
          next.x < 0 ||
          next.x > state.width ||
          next.y < 0 ||
          next.y > state.height ||
          parent.has(n) ||
          !safeSegment(state, p, next, enemy.radius)
        )
          continue;
        parent.set(n, id);
        distance.set(n, d + 1);
        queue.push(n);
      }
    }
    if (target === null) continue;
    const length = Math.abs(start.x - enemy.x) + Math.abs(start.y - enemy.y) + depth / 2;
    if (
      best &&
      (length > best.length + EPS ||
        (Math.abs(length - best.length) < EPS && target >= best.target))
    )
      continue;
    const path = [];
    for (let id = target; id !== null; id = parent.get(id)) path.push(point(id));
    path.reverse();
    if (path.length && same(path[0], enemy)) path.shift();
    best = { length, target, path };
  }
  return best?.path ?? null;
}

export function repairClassicContours(state) {
  const graph = classicContourGraph(state);
  for (const enemy of state.enemies) {
    if (enemy.type !== 'contour-patrol' || enemy.classic.topologyRevision === graph.revision)
      continue;
    const c = enemy.classic;
    c.topologyRevision = graph.revision;
    if (c.mode === 'patrolling' && graph.edges.has(c.edgeId)) continue;
    const path = contourRejoinPath(state, enemy);
    c.mode = path === null ? 'idle' : 'rejoining';
    c.path = path ?? [];
    c.pathIndex = 0;
    c.edgeId = null;
    c.distance = 0;
    state.events.push({
      type: 'contour.routeChanged',
      tick: state.tick,
      time: state.time,
      id: enemy.id,
      mode: c.mode,
    });
  }
}

export function attachContourAtVertex(state, enemy) {
  const graph = classicContourGraph(state);
  const edge = [
    ...((enemy.clockwise ? graph.starts : graph.ends).get(pointKey(enemy, state)) ?? []),
  ]
    .map((value) => orientedContourEdge(value, enemy.clockwise))
    .filter((value) => same(value.a, enemy))
    .sort((a, b) => a.id - b.id)[0];
  if (!edge) {
    enemy.classic.mode = 'idle';
    return null;
  }
  Object.assign(enemy.classic, {
    mode: 'patrolling',
    edgeId: edge.id,
    distance: 0,
    path: [],
    pathIndex: 0,
  });
  return edge;
}
