import { CELL } from '../core/registry.mjs';

/** Pure authoring-time placement. Preferred spacing yields to the actual body
 * clearance contract on small maps; walls and lethal field remain impassable. */
export function placeRunningEnemies({
  width,
  height,
  cells,
  terrain = [],
  spawns,
  occupied = [],
  reservedIds = [],
  count = 6,
}) {
  if (!Number.isSafeInteger(count) || count < 1) return [];
  const reachable = new Uint8Array(width * height),
    queue = [];
  const passable = (index) =>
    cells[index] !== CELL.WALL && !(cells[index] === CELL.FIELD && terrain[index] === 2);
  for (const spawn of spawns) {
    const x = Math.floor(spawn.x),
      y = Math.floor(spawn.y),
      index = y * width + x;
    if (x >= 0 && y >= 0 && x < width && y < height && passable(index) && !reachable[index]) {
      reachable[index] = 1;
      queue.push(index);
    }
  }
  for (let n = 0; n < queue.length; n++) {
    const index = queue[n],
      x = index % width,
      y = Math.floor(index / width);
    for (const [nx, ny] of [
      [x - 1, y],
      [x + 1, y],
      [x, y - 1],
      [x, y + 1],
    ]) {
      if (nx < 0 || ny < 0 || nx >= width || ny >= height) continue;
      const next = ny * width + nx;
      if (reachable[next] || !passable(next)) continue;
      reachable[next] = 1;
      queue.push(next);
    }
  }
  const spots = [];
  for (let y = 1; y < height - 1; y++)
    for (let x = 1; x < width - 1; x++) {
      const index = y * width + x,
        point = { x: x + 0.5, y: y + 0.5 };
      if (cells[index] !== CELL.FIELD || !reachable[index]) continue;
      if (spawns.some((spawn) => Math.hypot(point.x - spawn.x, point.y - spawn.y) < 2)) continue;
      if (
        occupied.some(
          (actor) =>
            Number.isFinite(actor.x) &&
            Number.isFinite(actor.y) &&
            Math.hypot(point.x - actor.x, point.y - actor.y) < 0.22 + (actor.radius ?? 0.25) + 1e-7,
        )
      )
        continue;
      spots.push({
        ...point,
        distance: Math.min(
          ...spawns.map((spawn) => Math.hypot(point.x - spawn.x, point.y - spawn.y)),
        ),
      });
    }
  spots.sort(
    (a, b) => Math.abs(a.distance - 8) - Math.abs(b.distance - 8) || a.y - b.y || a.x - b.x,
  );
  const chosen = [];
  for (const spacing of [5, 3, 1]) {
    while (chosen.length < Math.min(count, 6)) {
      let best = null,
        bestDistance = -1;
      for (const spot of spots) {
        const distance = chosen.length
          ? Math.min(...chosen.map((other) => Math.hypot(other.x - spot.x, other.y - spot.y)))
          : Infinity;
        if (distance < spacing || distance <= bestDistance) continue;
        best = spot;
        bestDistance = distance;
        if (!chosen.length) break;
      }
      if (!best) break;
      chosen.push({ x: best.x, y: best.y });
    }
  }
  const ids = new Set(reservedIds),
    result = [];
  for (const point of chosen) {
    let ordinal = result.length + 1;
    while (ids.has(`running-enemy-${ordinal}`)) ordinal++;
    const id = `running-enemy-${ordinal}`;
    ids.add(id);
    result.push(Object.freeze({ id, ...point }));
  }
  return Object.freeze(result);
}

export function runningEnemyReservedIds(value, result = new Set()) {
  if (!value || typeof value !== 'object') return result;
  if (typeof value.id === 'string') result.add(value.id);
  for (const child of Object.values(value)) runningEnemyReservedIds(child, result);
  return result;
}
