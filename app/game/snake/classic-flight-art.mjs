import { drawCoupaHead } from './coupa-art.mjs';
const UNIT = 28;
const rect=(ctx,color,x,y,w,h)=>{ctx.fillStyle=color;ctx.fillRect(x,y,w,h)};
export const drawClassicDrone = drawCoupaHead;
export function advanceClassicFlight(previous, elapsedMs, active, reduced) {
  return { timeMs: ((previous?.timeMs ?? 0) + (active && !reduced ? Math.max(0, Math.min(100, elapsedMs)) : 0)) % 60000 };
}
function direction(from, to, level) {
  if (!to) return null;
  let dx = to.x - from.x,
    dy = to.y - from.y;
  if (level.wrap) {
    if (Math.abs(dx) === level.width - 1) dx = -Math.sign(dx);
    if (Math.abs(dy) === level.height - 1) dy = -Math.sign(dy);
  }
  return Math.abs(dx) + Math.abs(dy) === 1 ? { x: dx, y: dy } : null;
}

export function drawClassicCable(
  ctx,
  snake,
  ink,
  level,
  { style = 'cable', timeMs = 0, reduced = false } = {},
) {
  const signal = style === 'signal';
  ctx.save();
  if (style === 'segmented') {
    // The original chunky Snake body is still the exact occupied-cell footprint.
    // Small connectors follow real neighbours, including a wrapped board edge.
    for (let i = snake.body.length - 1; i > 0; i--) {
      const cell = snake.body[i],
        x = cell.x * UNIT,
        y = cell.y * UNIT;
      for (const neighbour of [snake.body[i - 1], snake.body[i + 1]]) {
        const toward = direction(cell, neighbour, level);
        if (toward) rect(ctx, ink.body, x + 8 + toward.x * 8, y + 8 + toward.y * 8, 12, 12);
      }
      rect(ctx, ink.edge, x + 1, y + 1, 26, 26);
      rect(ctx, ink.body, x + 3, y + 3, 22, 22);
      rect(ctx, ink.band, x + 5, y + 5, 4, 4);
      rect(ctx, '#71966b', x + 3, y + 24, 22, 1);
      if (i === snake.body.length - 1) {
        rect(ctx, ink.edge, x + 11, y + 11, 6, 6);
        rect(ctx, ink.band, x + 13, y + 13, 2, 2);
      }
    }
    ctx.restore();
    return;
  }
  // Full occupied cells stay visible; continuous tubing carries the visual focus.
  for (let i = snake.body.length - 1; i > 0; i--) {
    const cell = snake.body[i],
      x = cell.x * UNIT,
      y = cell.y * UNIT;
    ctx.globalAlpha = 0.58;
    rect(ctx, ink.body, x + 0.5, y + 0.5, UNIT - 1, UNIT - 1);
    ctx.globalAlpha = 0.7;
    ctx.strokeStyle = ink.edge;
    ctx.lineWidth = 0.7;
    ctx.strokeRect(x + 1, y + 1, UNIT - 2, UNIT - 2);
  }
  ctx.globalAlpha = 1;
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';
  ctx.beginPath();
  for (let i = snake.body.length - 1; i > 0; i--) {
    const cell = snake.body[i],
      x = (cell.x + 0.5) * UNIT,
      y = (cell.y + 0.5) * UNIT;
    const front = direction(cell, snake.body[i - 1], level),
      back = direction(cell, snake.body[i + 1], level);
    ctx.moveTo(x + ((back?.x ?? 0) * UNIT) / 2, y + ((back?.y ?? 0) * UNIT) / 2);
    ctx.lineTo(x, y);
    ctx.lineTo(x + ((front?.x ?? 0) * UNIT) / 2, y + ((front?.y ?? 0) * UNIT) / 2);
  }
  // Stroke all joined pieces together so individual end caps cannot sever the
  // inner cable at cell boundaries. Wrap pieces terminate at their own edge.
  ctx.strokeStyle = '#071522';
  ctx.lineWidth = signal ? 7 : 10;
  ctx.stroke();
  ctx.strokeStyle = ink.edge;
  ctx.lineWidth = signal ? 4 : 7;
  ctx.stroke();
  ctx.strokeStyle = signal ? '#f0fff9' : ink.band;
  ctx.lineWidth = signal ? 1.5 : 3;
  ctx.setLineDash(signal ? [2, 4] : [5, 2]);
  ctx.lineDashOffset = reduced ? 0 : -(timeMs / 100) % 7;
  ctx.stroke();
  ctx.setLineDash([]);
  ctx.lineDashOffset = 0;
  for (let i = snake.body.length - 1; i > 0; i--) {
    const cell = snake.body[i],
      x = (cell.x + 0.5) * UNIT,
      y = (cell.y + 0.5) * UNIT;
    const front = direction(cell, snake.body[i - 1], level),
      back = direction(cell, snake.body[i + 1], level);
    if (!back && front) {
      // The terminating reel connector follows the last cable segment.
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(Math.atan2(front.y, front.x));
      rect(ctx, '#071522', -6, -5, 11, 10);
      rect(ctx, '#9caeae', -5, -4, 8, 8);
      rect(ctx, ink.body, -4, -3, 6, 6);
      rect(ctx, ink.band, -2, -3, 2, 6);
      rect(ctx, '#dae3d6', 3, -2, 3, 4);
      ctx.restore();
    } else if (i % 3 === 0 && front && back && front.x === -back.x && front.y === -back.y) {
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(Math.atan2(front.y, front.x));
      rect(ctx, '#0b1b26', -2, -5, 4, 10);
      rect(ctx, '#bac9c7', -1, -4, 2, 8);
      ctx.restore();
    }
  }
  ctx.restore();
}
