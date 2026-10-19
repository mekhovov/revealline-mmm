import { CELL } from './registry.mjs';

export const ROUTE_COVERAGE = 'reachable-routes.v1';

/** A conservative, geometry-only coverage budget. Every counted cell has a
 * constructive safe-to-safe cut, without crossing walls or unclaimed lethal
 * terrain. Flood-filled hazard pockets still reveal and score, but are bonus
 * territory: winning never depends on opening them. The mask is fixed at spawn,
 * so moving enemies, captures and erosion cannot move the goalposts.
 */
const budgets = new Map();
export function analyzeRouteCoverage(level, initialCells, { includeCuts = false } = {}) {
  const key = JSON.stringify([
    level.width,
    level.height,
    level.spawn,
    level.walls,
    level.foundations,
    level.classic?.terrain,
    level.rules?.maxTrailCells,
    initialCells ? Array.from(initialCells) : null,
  ]);
  if (!includeCuts && budgets.has(key)) {
    const result = budgets.get(key);
    return { ...result, eligible: Uint8Array.from(result.eligible) };
  }
  const result = computeRouteCoverage(level, initialCells, includeCuts);
  if (!includeCuts) {
    if (budgets.size >= 128) budgets.delete(budgets.keys().next().value);
    budgets.set(key, { ...result, eligible: Uint8Array.from(result.eligible) });
  }
  return result;
}

function computeRouteCoverage(level, initialCells, includeCuts) {
  const { width, height } = level;
  const cells = initialCells ? Uint8Array.from(initialCells) : new Uint8Array(width * height);
  if (!initialCells) {
    for (let y = 0; y < height; y++)
      for (let x = 0; x < width; x++)
        if (!x || !y || x === width - 1 || y === height - 1) cells[y * width + x] = CELL.SAFE;
    for (const [rectangles, kind] of [
      [level.walls ?? [], CELL.WALL],
      [level.foundations ?? [], CELL.SAFE],
    ])
      for (const r of rectangles)
        for (let y = r.y; y < r.y + r.h; y++)
          for (let x = r.x; x < r.x + r.w; x++) cells[y * width + x] = kind;
  }
  const original = Uint8Array.from(cells);
  const lethal = new Uint8Array(cells.length);
  for (const r of level.classic?.terrain ?? [])
    if (r.kind === 'lethal')
      for (let y = r.y; y < r.y + r.h; y++)
        for (let x = r.x; x < r.x + r.w; x++) lethal[y * width + x] = 1;
  const adjacent = Array.from(cells, (_, i) =>
    [
      i >= width ? i - width : -1,
      i % width < width - 1 ? i + 1 : -1,
      i < cells.length - width ? i + width : -1,
      i % width ? i - 1 : -1,
    ].filter((n) => n >= 0),
  );
  const spawn = Math.floor(level.spawn.y) * width + Math.floor(level.spawn.x);
  const eligible = new Uint8Array(cells.length),
    cuts = [];
  const limit = level.rules?.maxTrailCells || cells.length;
  for (;;) {
    const reached = new Uint8Array(cells.length),
      safe = [spawn];
    reached[spawn] = 1;
    for (let p = 0; p < safe.length; p++)
      for (const n of adjacent[safe[p]])
        if (!reached[n] && cells[n] === CELL.SAFE) {
          reached[n] = 1;
          safe.push(n);
        }
    const owner = new Int32Array(cells.length).fill(-1);
    const parent = new Int32Array(cells.length).fill(-1);
    const distance = new Int32Array(cells.length);
    const queue = [];
    const pathTo = (i) => {
      const path = [];
      while (i !== -1) {
        path.push(i);
        i = parent[i];
      }
      return path.reverse();
    };
    let cut = null;
    // Each boundary safe cell owns a search front. Meeting another front or
    // any other safe island supplies a legal return without retracing the cut.
    for (const s of safe) {
      owner[s] = s;
      for (const n of adjacent[s]) {
        if (cells[n] !== CELL.FIELD || lethal[n]) continue;
        if (owner[n] !== -1 && owner[n] !== s) {
          cut = [owner[n], n, s];
          break;
        }
        if (owner[n] === -1) {
          owner[n] = s;
          parent[n] = s;
          distance[n] = 1;
          queue.push(n);
        }
      }
      if (cut) break;
    }
    for (let p = 0; !cut && p < queue.length; p++) {
      const i = queue[p];
      for (const n of adjacent[i]) {
        if (cells[n] === CELL.SAFE && n !== owner[i]) {
          cut = [...pathTo(i), n];
          break;
        }
        if (cells[n] !== CELL.FIELD || lethal[n]) continue;
        if (owner[n] !== -1 && owner[n] !== owner[i] && distance[i] + distance[n] <= limit) {
          cut = [...pathTo(i), ...pathTo(n).reverse()];
          break;
        }
        if (owner[n] === -1 && distance[i] < limit) {
          owner[n] = owner[i];
          parent[n] = i;
          distance[n] = distance[i] + 1;
          queue.push(n);
        }
      }
    }
    if (!cut) break;
    for (const i of cut)
      if (cells[i] === CELL.FIELD) {
        eligible[i] = 1;
        cells[i] = CELL.SAFE;
      }
    if (includeCuts) cuts.push(cut);
  }
  const total = eligible.reduce((n, v) => n + v, 0);
  return {
    eligible,
    total,
    excluded: original.filter((c) => c === CELL.FIELD).length - total,
    ...(includeCuts ? { cuts } : {}),
  };
}

export function coverageCellCount(state, indices) {
  const mask = state.classic?.coverageEligible;
  let count = 0;
  for (const i of indices) count += mask ? mask[i] : 1;
  return count;
}
