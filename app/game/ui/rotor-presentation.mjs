import { bladeAngles } from '../../authoring/motion-lab/animation.mjs';

const TAU = Math.PI * 2;
export const PREPARED_ROTOR_COLORS = Object.freeze({
  fillColor: '#738d91',
  tipColor: '#bed4cd',
  hubColor: '#293b40',
});

/** Hub-centred blades. Every polygon begins at the motor, never at an outside
 * corner. The complete sweep stays inside radius; alpha belongs to the caller.
 * Direction mirrors blade handedness; phase is already signed by the caller. */
export function paintRotor(
  ctx,
  {
    radius,
    phase = 0,
    direction = 1,
    bladeCount = 3,
    bladeWidth = 0.38,
    bladeShape = 'swept',
    blurOpacity = 0,
    pixel = 1,
    fillColor = PREPARED_ROTOR_COLORS.fillColor,
    tipColor = PREPARED_ROTOR_COLORS.tipColor,
    hubColor = PREPARED_ROTOR_COLORS.hubColor,
  },
) {
  ctx.save();
  const opacity = ctx.globalAlpha;
  if (blurOpacity > 0) {
    ctx.globalAlpha = opacity * blurOpacity;
    ctx.fillStyle = fillColor;
    ctx.beginPath();
    ctx.arc(0, 0, radius, 0, TAU);
    ctx.fill();
    ctx.globalAlpha = opacity;
  }
  const thickness = radius * bladeWidth;
  for (const angle of bladeAngles(bladeCount, phase)) {
    ctx.save();
    ctx.rotate(angle);
    if (direction < 0) ctx.scale(1, -1);
    const points =
      bladeShape === 'paddle'
        ? [
            [0, 0],
            [radius * 0.4, -thickness * 0.2],
            [radius * 0.44, -thickness * 0.65],
            [radius * 0.96, -thickness * 0.5],
            [radius * 0.96, thickness * 0.45],
            [radius * 0.42, thickness * 0.5],
            [0, thickness * 0.2],
          ]
        : bladeShape === 'tapered'
          ? [
              [0, 0],
              [radius * 0.7, -thickness * 0.6],
              [radius, 0],
              [radius * 0.6, thickness * 0.45],
              [0, thickness * 0.2],
            ]
          : [
              [0, 0],
              [radius * 0.55, -thickness * 0.38],
              [radius * 0.98, -thickness * 0.12],
              [radius * 0.9, thickness * 0.56],
              [radius * 0.5, thickness * 0.7],
              [0, thickness * 0.23],
            ];
    ctx.fillStyle = fillColor;
    ctx.beginPath();
    points.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = tipColor;
    ctx.fillRect(radius * 0.7, 0, radius * 0.18, thickness * 0.3);
    ctx.restore();
  }
  ctx.fillStyle = hubColor;
  const hub = Math.min(radius * 0.7, Math.max(radius * 0.23, pixel * 0.7));
  ctx.fillRect(-hub / 2, -hub / 2, hub, hub);
  ctx.restore();
}

const preparedRecipes = new WeakMap();
/** Prepared geometry declares exact frame-normalized radii. Original/manual
 * recipes keep their authored radius; they are never inferred from a bitmap. */
export function preparedRotorRecipe(recipe, geometry) {
  let cache = preparedRecipes.get(recipe);
  if (!cache) preparedRecipes.set(recipe, (cache = new WeakMap()));
  if (cache.has(geometry)) return cache.get(geometry);
  const bladeCount = Math.max(2, ...geometry.rotors.map((anchor) => anchor.bladeCount ?? 3));
  const result = Object.freeze({
    ...recipe,
    components: recipe.components.map((component) =>
      component.type === 'rotors'
        ? Object.freeze({
            ...component,
            ...PREPARED_ROTOR_COLORS,
            radius: 0.16,
            bladeWidth: 0.38,
            bladeShape: 'swept',
            blurOpacity: 0.12,
            // A shared phase must be safe for the most frequently repeating hub.
            bladeCount: Math.max(bladeCount, component.bladeCount),
          })
        : component,
    ),
  });
  cache.set(geometry, result);
  return result;
}
