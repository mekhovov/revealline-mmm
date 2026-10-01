import { TEAM_EMITTER_SLOTS } from '../presentation/team-runtime-slots.mjs';
export { TEAM_EMITTER_SLOTS } from '../presentation/team-runtime-slots.mjs';
export const TEAM_EMITTER_RECIPE = 'team.emitter.v1';
export function prepareTeamEmitter(snapshot) {
  const frames = {};
  for (const id of TEAM_EMITTER_SLOTS) {
    const asset = snapshot?.resolved?.assets?.[id] ?? snapshot?.canvas?.assets?.[id];
    if (!asset) continue;
    if (asset.kind === 'recipe') {
      if (asset.recipe?.id !== TEAM_EMITTER_RECIPE)
        throw new TypeError(`Wrong Team emitter recipe for ${id}.`);
      frames[id] = Object.freeze({ kind: 'recipe' });
      continue;
    }
    if (asset.kind !== 'image')
      throw new TypeError(`Team emitter ${id} needs artwork or a recipe.`);
    const frame = snapshot.image?.(id),
      size = id.endsWith('warning') ? 24 : 16;
    if (
      (frame?.image?.naturalWidth ?? frame?.image?.width) !== size ||
      (frame?.image?.naturalHeight ?? frame?.image?.height) !== size ||
      frame?.geometry?.pivot?.x !== 0.5 ||
      frame?.geometry?.pivot?.y !== 0.5
    )
      throw new TypeError(`Team emitter ${id} needs its prepared ${size}×${size} centered frame.`);
    frames[id] = Object.freeze({ kind: 'image', image: frame.image });
  }
  return Object.freeze(frames);
}
/** Decoration precedes the fixed warning line and target. No targeting/timing writes. */
export function drawTeamEmitterWarning(ctx, frames, core, target, palette) {
  const frame = frames?.['team.emitter.warning'];
  ctx.save();
  try {
    if (frame?.kind === 'image') {
      ctx.globalAlpha = 0.65;
      ctx.imageSmoothingEnabled = false;
      ctx.drawImage(frame.image, target.x - 0.7, target.y - 0.7, 1.4, 1.4);
      ctx.globalAlpha = 1;
    }
    ctx.strokeStyle = frame ? palette.accent : '#ffd279';
    ctx.lineWidth = 0.12;
    ctx.setLineDash([0.35, 0.3]);
    ctx.beginPath();
    ctx.moveTo(core.x, core.y);
    ctx.lineTo(target.x, target.y);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.strokeRect(target.x - 0.7, target.y - 0.7, 1.4, 1.4);
  } finally {
    ctx.restore();
  }
}
/** Position is supplied by the authoritative travelling impact, never interpolated here. */
export function drawTeamEmitterSpark(ctx, frames, point, palette) {
  const frame = frames?.['team.emitter.spark'];
  ctx.save();
  try {
    if (frame?.kind === 'image') {
      ctx.imageSmoothingEnabled = false;
      ctx.drawImage(frame.image, point.x - 0.7, point.y - 0.7, 1.4, 1.4);
    }
    ctx.fillStyle = frame ? palette.ink : '#fff0bc';
    ctx.strokeStyle = frame ? palette.danger : '#fc786f';
    ctx.lineWidth = 0.14;
    ctx.beginPath();
    ctx.arc(point.x, point.y, 0.35, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
  } finally {
    ctx.restore();
  }
}
