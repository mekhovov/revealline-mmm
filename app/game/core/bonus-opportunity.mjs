import { CELL } from './registry.mjs';

const indexOf = (point, width) => Math.floor(point.y) * width + Math.floor(point.x);

/** Internal geometry query over validated runtime data. Multiple starts mean
 * any active pilot can reach it; this is not a moving-threat safety prediction.
 * The caller owns trail semantics, including exact historical Solo v1 behavior. */
export function hasBonusOpportunity(
  board,
  { anchor, trail, bodies, items, starts, maxDistance, terrain },
) {
  const index = indexOf(anchor, board.width);
  if (board.cells[index] !== CELL.FIELD || terrain[index] === 2 || trail.has(index)) return false;
  if (
    bodies.some((body) => Math.hypot(body.x - anchor.x, body.y - anchor.y) < 2 + (body.radius ?? 0))
  )
    return false;
  if (items.some((item) => item.collectedTick === null && indexOf(item, board.width) === index))
    return false;
  const distance = new Int32Array(board.cells.length).fill(-1),
    queue = [...new Set(starts)];
  for (const start of queue) distance[start] = 0;
  for (let head = 0; head < queue.length; head++) {
    const cell = queue[head];
    if (cell === index) return true;
    if (distance[cell] >= maxDistance) continue;
    const x = cell % board.width,
      y = Math.floor(cell / board.width);
    for (const next of [
      x > 0 ? cell - 1 : -1,
      x + 1 < board.width ? cell + 1 : -1,
      y > 0 ? cell - board.width : -1,
      y + 1 < board.height ? cell + board.width : -1,
    ]) {
      if (
        next < 0 ||
        distance[next] !== -1 ||
        board.cells[next] === CELL.WALL ||
        (board.cells[next] === CELL.FIELD && terrain[next] === 2) ||
        trail.has(next)
      )
        continue;
      distance[next] = distance[cell] + 1;
      queue.push(next);
    }
  }
  return false;
}
