/** Draw already cropped artwork around its visual pivot. The caller's cell,
 * contact point and display size stay unchanged; source overrides keep center. */
export function drawPresentationImage(ctx, image, x, y, width, height, geometry = null) {
  const pivot = geometry?.pivot ?? { x: 0.5, y: 0.5 };
  ctx.drawImage(image, x - width * pivot.x, y - height * pivot.y, width, height);
}
