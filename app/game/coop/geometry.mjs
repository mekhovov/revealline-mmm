import { EPS, boxTime, circleTime, pointAt } from '../core/geometry.mjs';
import { varyCollisionCourse } from '../core/field-course.mjs';

export const cellAt = (run, x, y) => Math.floor(y) * run.width + Math.floor(x);
export const positionAt = (body, velocity, seconds) => ({
  x: body.x + velocity.x * seconds,
  y: body.y + velocity.y * seconds,
});

/** Cell ownership is explicit so left/up entry at an integer edge is unambiguous. */
export function nextCell(run, player, velocity, horizon) {
  if (!velocity.x && !velocity.y) return null;
  const col = player.cellIndex % run.width;
  const row = Math.floor(player.cellIndex / run.width);
  let time, index;
  if (velocity.x) {
    time = ((velocity.x > 0 ? col + 1 : col) - player.x) / velocity.x;
    index = player.cellIndex + Math.sign(velocity.x);
    if ((velocity.x > 0 && col === run.width - 1) || (velocity.x < 0 && col === 0)) index = -1;
  } else {
    time = ((velocity.y > 0 ? row + 1 : row) - player.y) / velocity.y;
    index = player.cellIndex + Math.sign(velocity.y) * run.width;
    if ((velocity.y > 0 && row === run.height - 1) || (velocity.y < 0 && row === 0)) index = -1;
  }
  if (time < -EPS || time > horizon + EPS) return null;
  return { time: Math.max(0, Math.min(horizon, time)), index };
}

/** Earliest swept circle contact with a solid tile. Rounded corners are circular. */
function tileContact(body, velocity, horizon, x, y) {
  const radius = body.radius;
  const speed = Math.hypot(velocity.x, velocity.y);
  const end = positionAt(body, velocity, horizon);
  const hits = [];
  // A capture may move a boundary inside an otherwise harmless Hunter's radius.
  // Reflect an inward launch immediately; outward motion separates naturally.
  const closestX = Math.max(x, Math.min(x + 1, body.x));
  const closestY = Math.max(y, Math.min(y + 1, body.y));
  const separation = Math.hypot(body.x - closestX, body.y - closestY);
  if (separation > EPS && separation < radius - EPS) {
    const nx = (body.x - closestX) / separation;
    const ny = (body.y - closestY) / separation;
    if (velocity.x * nx + velocity.y * ny < -EPS) hits.push({ time: 0, nx, ny });
  }
  const face = (time, nx, ny, tangent, low, high) => {
    if (time >= -EPS && time <= horizon + EPS && tangent >= low - EPS && tangent <= high + EPS)
      hits.push({ time: Math.max(0, time), nx, ny });
  };
  if (velocity.x > EPS) {
    const time = (x - radius - body.x) / velocity.x;
    face(time, -1, 0, body.y + velocity.y * time, y, y + 1);
  } else if (velocity.x < -EPS) {
    const time = (x + 1 + radius - body.x) / velocity.x;
    face(time, 1, 0, body.y + velocity.y * time, y, y + 1);
  }
  if (velocity.y > EPS) {
    const time = (y - radius - body.y) / velocity.y;
    face(time, 0, -1, body.x + velocity.x * time, x, x + 1);
  } else if (velocity.y < -EPS) {
    const time = (y + 1 + radius - body.y) / velocity.y;
    face(time, 0, 1, body.x + velocity.x * time, x, x + 1);
  }
  for (const [cx, cy] of [
    [x, y],
    [x + 1, y],
    [x, y + 1],
    [x + 1, y + 1],
  ]) {
    if (speed <= EPS) continue;
    // A tile corner tangent to the travel line cannot obstruct it. Near-zero
    // quadratic discriminants otherwise turn exact wall sliding into a tiny
    // inward corner hit, and every subsequent tick repeats that false contact.
    const lineDistance = Math.abs((body.x - cx) * velocity.y - (body.y - cy) * velocity.x) / speed;
    if (lineDistance >= radius - EPS) continue;
    const fraction = circleTime(body, end, { x: cx, y: cy }, radius);
    if (fraction === null) continue;
    const at = pointAt(body, end, fraction);
    const length = Math.hypot(at.x - cx, at.y - cy);
    if (length < EPS) continue;
    const nx = (at.x - cx) / length;
    const ny = (at.y - cy) / length;
    if (velocity.x * nx + velocity.y * ny < -EPS) hits.push({ time: fraction * horizon, nx, ny });
  }
  hits.sort((a, b) => a.time - b.time || a.nx - b.nx || a.ny - b.ny);
  return hits[0] || null;
}

export function enemyWallContact(run, enemy, horizon) {
  const velocity = { x: enemy.vx, y: enemy.vy };
  const end = positionAt(enemy, velocity, horizon);
  const lowX = Math.max(0, Math.floor(Math.min(enemy.x, end.x) - enemy.radius) - 1);
  const highX = Math.min(run.width - 1, Math.floor(Math.max(enemy.x, end.x) + enemy.radius) + 1);
  const lowY = Math.max(0, Math.floor(Math.min(enemy.y, end.y) - enemy.radius) - 1);
  const highY = Math.min(run.height - 1, Math.floor(Math.max(enemy.y, end.y) + enemy.radius) + 1);
  let best = null;
  const normals = [];
  for (let y = lowY; y <= highY; y++)
    for (let x = lowX; x <= highX; x++) {
      if (run.cells[y * run.width + x] === 0) continue;
      const hit = tileContact(enemy, velocity, horizon, x, y);
      if (!hit) continue;
      if (!best || hit.time < best.time - EPS) {
        best = hit;
        normals.length = 0;
        normals.push(hit);
      } else if (Math.abs(hit.time - best.time) <= EPS) normals.push(hit);
    }
  if (!best) return null;
  return { time: best.time, normals };
}

/** Player bodies stop at authored walls and the safe perimeter's outside center line. */
export function playerWallContact(run, player, velocity, horizon) {
  const end = positionAt(player, velocity, horizon);
  let time = null;
  const remember = (candidate) => {
    if (candidate >= -EPS && candidate <= horizon + EPS)
      time = Math.min(time ?? Infinity, Math.max(0, candidate));
  };
  if (velocity.x < -EPS) remember((0.5 - player.x) / velocity.x);
  if (velocity.x > EPS) remember((run.width - 0.5 - player.x) / velocity.x);
  if (velocity.y < -EPS) remember((0.5 - player.y) / velocity.y);
  if (velocity.y > EPS) remember((run.height - 0.5 - player.y) / velocity.y);
  const lowX = Math.max(0, Math.floor(Math.min(player.x, end.x) - player.radius) - 1);
  const highX = Math.min(run.width - 1, Math.floor(Math.max(player.x, end.x) + player.radius) + 1);
  const lowY = Math.max(0, Math.floor(Math.min(player.y, end.y) - player.radius) - 1);
  const highY = Math.min(run.height - 1, Math.floor(Math.max(player.y, end.y) + player.radius) + 1);
  for (let y = lowY; y <= highY; y++)
    for (let x = lowX; x <= highX; x++) {
      if (
        run.cells[y * run.width + x] !== 2 &&
        !run.strongholds?.some(
          (stronghold) =>
            stronghold.shielded &&
            Math.floor(stronghold.core.x) === x &&
            Math.floor(stronghold.core.y) === y,
        )
      )
        continue;
      const hit = tileContact(player, velocity, horizon, x, y);
      if (hit) remember(hit.time);
    }
  return time === null ? null : { time };
}

export function reflectEnemy(enemy, normals, seed = 0) {
  // Combine coincident faces before reflecting; visiting a corner cannot flip an axis twice.
  const unique = [];
  for (const normal of normals)
    if (!unique.some((n) => Math.abs(n.nx - normal.nx) < EPS && Math.abs(n.ny - normal.ny) < EPS))
      unique.push(normal);
  let nx = 0,
    ny = 0;
  for (const normal of unique) {
    nx += normal.nx;
    ny += normal.ny;
  }
  const length = Math.hypot(nx, ny);
  if (length < EPS) return;
  nx /= length;
  ny /= length;
  const dot = enemy.vx * nx + enemy.vy * ny;
  if (dot >= -EPS) return;
  enemy.vx -= 2 * dot * nx;
  enemy.vy -= 2 * dot * ny;
  // Curved corner normals and opposed simultaneous faces keep their exact
  // physical reflection. Only unambiguous axis-face contacts get anti-loop bias.
  if (
    unique.every((n) => !n.nx || !n.ny) &&
    unique.every((n) => (!n.nx || n.nx * nx > 0) && (!n.ny || n.ny * ny > 0))
  )
    varyCollisionCourse(enemy, Math.sign(nx), Math.sign(ny), seed);
}

export function trailContact(run, enemy, trail, horizon) {
  const end = positionAt(enemy, { x: enemy.vx, y: enemy.vy }, horizon);
  let time = null;
  for (const cell of trail) {
    if (run.cells[cell.index] !== 0) continue;
    const fraction = boxTime(enemy, end, {
      x: cell.x - enemy.radius,
      y: cell.y - enemy.radius,
      w: 1 + 2 * enemy.radius,
      h: 1 + 2 * enemy.radius,
    });
    if (fraction !== null) time = Math.min(time ?? Infinity, fraction * horizon);
  }
  return time;
}

export function circleFitsField(run, body) {
  for (let y = Math.floor(body.y - body.radius); y <= Math.floor(body.y + body.radius); y++)
    for (let x = Math.floor(body.x - body.radius); x <= Math.floor(body.x + body.radius); x++) {
      if (x < 0 || y < 0 || x >= run.width || y >= run.height) return false;
      if (run.cells[y * run.width + x] === 0) continue;
      const dx = body.x - Math.max(x, Math.min(x + 1, body.x));
      const dy = body.y - Math.max(y, Math.min(y + 1, body.y));
      if (dx * dx + dy * dy < body.radius * body.radius - EPS) return false;
    }
  return true;
}
