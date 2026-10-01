import { TEAM_SUPPORT_SLOTS } from '../presentation/team-runtime-slots.mjs';
export { TEAM_SUPPORT_SLOTS } from '../presentation/team-runtime-slots.mjs';
export const TEAM_SUPPORT_RECIPE = 'team.support.v1';
const sizeFor = (id) => (id === 'team.support.pulse' ? 64 : 24);

/** Borrow decoded decoration only. Authoritative support state remains untouched. */
export function prepareTeamSupport(snapshot) {
  const frames = {};
  for (const id of TEAM_SUPPORT_SLOTS) {
    const asset = snapshot?.resolved?.assets?.[id] ?? snapshot?.canvas?.assets?.[id];
    if (!asset) continue;
    if (asset.kind === 'recipe') {
      if (asset.recipe?.id !== TEAM_SUPPORT_RECIPE)
        throw new TypeError(`Wrong Team Support recipe for ${id}.`);
      frames[id] = Object.freeze({ kind: 'recipe' });
      continue;
    }
    if (asset.kind !== 'image')
      throw new TypeError(`Team Support ${id} needs artwork or a recipe.`);
    const frame = snapshot.image?.(id),
      size = sizeFor(id);
    if (
      (frame?.image?.naturalWidth ?? frame?.image?.width) !== size ||
      (frame?.image?.naturalHeight ?? frame?.image?.height) !== size ||
      frame?.geometry?.pivot?.x !== 0.5 ||
      frame?.geometry?.pivot?.y !== 0.5
    )
      throw new TypeError(`Team Support ${id} needs its prepared ${size}×${size} centered frame.`);
    frames[id] = Object.freeze({ kind: 'image', image: frame.image });
  }
  return Object.freeze(frames);
}

/** Radius and timing are fixed by the game, never by the uploaded decoration. */
export function drawTeamSupportPulse(ctx, frames, effect, colors, reduced = false) {
  const frame = frames?.['team.support.pulse'];
  const role = ['interceptor', 'disruptor'].includes(effect.role) ? effect.role : 'hybrid';
  ctx.save();
  try {
    ctx.fillStyle = colors[effect.player];
    ctx.globalAlpha = reduced ? 0.06 : 0.1;
    ctx.beginPath();
    ctx.arc(effect.x, effect.y, 6, 0, Math.PI * 2);
    ctx.fill();
    if (frame?.kind === 'image') {
      ctx.save();
      ctx.clip();
      ctx.globalAlpha = reduced ? 0.18 : 0.28;
      ctx.imageSmoothingEnabled = false;
      ctx.drawImage(frame.image, effect.x - 6, effect.y - 6, 12, 12);
      ctx.restore();
    }
    ctx.globalAlpha = 0.65;
    ctx.strokeStyle = colors[effect.player];
    ctx.lineWidth = 0.08;
    ctx.beginPath();
    ctx.arc(effect.x, effect.y, 6, 0, Math.PI * 2);
    ctx.stroke();
    if (frame) {
      // Four stationary ticks distinguish team assistance from a scanning sweep.
      for (const [x, y] of [
        [-6, 0],
        [6, 0],
        [0, -6],
        [0, 6],
      ]) {
        ctx.beginPath();
        ctx.moveTo(effect.x + x * 0.9, effect.y + y * 0.9);
        ctx.lineTo(effect.x + x, effect.y + y);
        ctx.stroke();
      }
    }
    if (role !== 'hybrid') {
      // A persistent letter and distinct ring pattern remain legible without
      // colour, custom artwork or full effects.
      ctx.globalAlpha = 0.92;
      ctx.fillStyle = colors[effect.player];
      ctx.font = '700 1.15px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(role === 'interceptor' ? 'I' : 'D', effect.x, effect.y);
      ctx.strokeStyle = colors[effect.player];
      ctx.lineWidth = 0.1;
      ctx.setLineDash(role === 'interceptor' ? [0.25, 0.12] : [0.08, 0.13]);
      ctx.beginPath();
      ctx.arc(effect.x, effect.y, role === 'interceptor' ? 5.45 : 5.7, 0, Math.PI * 2);
      ctx.stroke();
      ctx.setLineDash([]);
    }
  } finally {
    ctx.restore();
  }
}

/** Local enemy coordinates. The functional ring and SLOWED text stay game-owned. */
export function drawTeamSlowed(ctx, frames, palette) {
  const frame = frames?.['team.enemy.slowed'],
    color = frame ? palette.safe : '#e6f8ff';
  ctx.save();
  try {
    if (frame?.kind === 'image') {
      ctx.globalAlpha = 0.5;
      ctx.imageSmoothingEnabled = false;
      ctx.drawImage(frame.image, -0.88, -0.88, 1.76, 1.76);
      ctx.globalAlpha = 1;
    }
    ctx.strokeStyle = color;
    ctx.lineWidth = 0.11;
    ctx.setLineDash([0.16, 0.12]);
    ctx.beginPath();
    ctx.arc(0, 0, 0.88, 0, Math.PI * 2);
    ctx.stroke();
    ctx.setLineDash([]);
  } finally {
    ctx.restore();
  }
  return color;
}
