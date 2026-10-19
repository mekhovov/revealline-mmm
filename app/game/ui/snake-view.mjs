import { snakeBodySegments, snakeSummary } from '../snake/rules.mjs';

/** Essential geometry, independent of decorative effects, blood and remains.
 * Both painters use the core's exact bounded body segments. */
export function drawSnakeBody(ctx, run, { unit = 16, palette, colors } = {}) {
  if (!run?.snake) return;
  const segments = snakeBodySegments(run);
  const inks = colors ?? [palette?.accent ?? '#ffda77', palette?.safe ?? '#8be0ed'];
  ctx.save();
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.setLineDash([]);
  for (const segment of segments) {
    const path = () => {
      ctx.beginPath();
      ctx.moveTo(segment.a.x * unit, segment.a.y * unit);
      ctx.lineTo(segment.b.x * unit, segment.b.y * unit);
    };
    ctx.strokeStyle = palette?.ink ?? '#071019';
    ctx.lineWidth = segment.radius * unit * 2 + unit * 0.18;
    path();
    ctx.stroke();
    ctx.strokeStyle = inks[segment.playerId] ?? inks[0];
    ctx.lineWidth = segment.radius * unit * 2;
    path();
    ctx.stroke();
  }
  ctx.restore();
}

/** Stable numbers make the optional sequence legible without colour or motion. */
export function drawSnakeTargetOrder(ctx, run, actors, { unit = 16, palette, font } = {}) {
  const order = run.level?.snake?.order;
  if (!run.snake || !order?.length) return;
  const next = snakeSummary(run)?.nextTargetId;
  ctx.save();
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = `bold ${unit * 0.72}px ${font ?? 'monospace'}`;
  for (const actor of actors ?? []) {
    const index = order.indexOf(actor.id);
    if (index < 0) continue;
    const x = actor.x * unit;
    const y = Math.max(unit * 0.55, actor.y * unit - unit * 1.15);
    ctx.fillStyle = palette?.ink ?? '#071019';
    ctx.fillRect(x - unit * 0.55, y - unit * 0.48, unit * 1.1, unit * 0.96);
    ctx.strokeStyle =
      actor.id === next ? (palette?.accent ?? '#ffda77') : (palette?.paper ?? '#fff');
    ctx.lineWidth = unit * (actor.id === next ? 0.12 : 0.06);
    ctx.setLineDash(actor.id === next ? [] : [unit * 0.12, unit * 0.1]);
    ctx.strokeRect(x - unit * 0.55, y - unit * 0.48, unit * 1.1, unit * 0.96);
    ctx.fillStyle = palette?.paper ?? '#fff';
    ctx.fillText(String(index + 1), x, y);
  }
  ctx.restore();
}
