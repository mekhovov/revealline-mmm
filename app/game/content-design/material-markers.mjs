/** Initial-map symbols mirror the runtime's slow dashes and framed lethal X.
 * Call only for active field material, never its neutralized foundation layer. */
export function paintMaterialMarker(ctx, material, x, y, size) {
  if (material !== 1 && material !== 2) return;
  const unit = size / 16;
  ctx.save();
  ctx.lineWidth = Math.max(0.6, size / 10);
  ctx.strokeStyle = '#f5eed5';
  ctx.beginPath();
  const segments =
    material === 1
      ? [
          [2, 5, 7, 5],
          [9, 10, 14, 10],
        ]
      : [
          [5, 5, 11, 11],
          [5, 11, 11, 5],
        ];
  for (const [sx, sy, ex, ey] of segments) {
    ctx.moveTo(x + sx * unit, y + sy * unit);
    ctx.lineTo(x + ex * unit, y + ey * unit);
  }
  ctx.stroke();
  if (material === 2) ctx.strokeRect(x + 1.5 * unit, y + 1.5 * unit, 13 * unit, 13 * unit);
  ctx.restore();
}
