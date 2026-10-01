// Small, reusable fictional-friction silhouettes. These recipes own only pixels;
// movement, pressure badges and collision-centre cues remain engine-owned.
import { FPV_BODY_RECIPES, drawFpvBodyRecipe } from './fpv-body-recipes.mjs';
const sheet = (ctx, x, y, rotation, colors) => {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(rotation);
  ctx.fillStyle = colors.dark;
  ctx.fillRect(-8, -11, 16, 22);
  ctx.fillStyle = colors.light;
  ctx.fillRect(-7, -10, 14, 20);
  ctx.fillStyle = colors.trim;
  for (const line of [-5, 0, 5]) ctx.fillRect(-4, line, 8, 2);
  ctx.restore();
};
const recipes = Object.freeze({
  'paper-tangle'(ctx, frame, colors) {
    sheet(ctx, -3, 1, -0.3, colors);
    sheet(ctx, 3, -1, 0.2 + (frame.reduced ? 0 : Math.sin(frame.phase) * 0.05), colors);
  },
  'missing-cloud'(ctx, _frame, colors) {
    ctx.fillStyle = colors.dark;
    for (const [x, y, r] of [
      [-7, 0, 7],
      [0, -5, 9],
      [8, 1, 6],
    ]) {
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.fillStyle = colors.light;
    ctx.fillRect(-10, -2, 20, 9);
    ctx.beginPath();
    ctx.arc(0, -3, 7, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = colors.trim;
    ctx.fillRect(-1, -7, 2, 8);
    ctx.fillRect(-1, 4, 2, 2);
  },
  'stale-fragments'(ctx, frame, colors) {
    for (const [x, y, r] of [
      [-6, -5, -0.5],
      [5, 1, 0.4],
      [-5, 8, 0.1],
    ]) {
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(r);
      ctx.fillStyle = colors.dark;
      ctx.fillRect(-5, -5, 10, 10);
      ctx.fillStyle = colors.light;
      ctx.fillRect(-4, -4, 8, 8);
      ctx.fillStyle = colors.trim;
      ctx.fillRect(-2, 0, 4, 2);
      ctx.restore();
    }
  },
  'backlog-knot'(ctx, _frame, colors) {
    for (let i = 0; i < 4; i++) {
      ctx.save();
      ctx.rotate((i * Math.PI) / 2);
      ctx.strokeStyle = colors.dark;
      ctx.lineWidth = 7;
      ctx.beginPath();
      ctx.ellipse(0, -5, 8, 5, 0, 0, Math.PI * 2);
      ctx.stroke();
      ctx.strokeStyle = colors.trim;
      ctx.lineWidth = 4;
      ctx.stroke();
      ctx.restore();
    }
  },
});
export const ACTOR_RECIPE_IDS = Object.freeze([
  ...Object.keys(recipes),
  ...Object.keys(FPV_BODY_RECIPES),
]);
export function resolveActorRecipe(value) {
  return Object.hasOwn(recipes, value) || Object.hasOwn(FPV_BODY_RECIPES, value) ? value : null;
}
export function drawActorRecipe(ctx, frame, colors) {
  if (drawFpvBodyRecipe(ctx, frame, colors)) return true;
  const recipe = recipes[resolveActorRecipe(frame.bodyRecipe)];
  if (!recipe) return false;
  recipe(ctx, frame, colors);
  return true;
}
