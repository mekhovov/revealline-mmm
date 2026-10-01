import { TEAM_ANCHOR_SLOTS } from '../presentation/team-runtime-slots.mjs';
export { TEAM_ANCHOR_SLOTS } from '../presentation/team-runtime-slots.mjs';
import { drawPresentationImage } from '../ui/presentation-draw-image.mjs';

export const TEAM_ANCHOR_RECIPE = 'team.anchor.v1';

/** Borrow prepared frames; do not decode, own, replace or dispose page assets.
 * Historical snapshots without these slots keep their original cue recipe. */
export function prepareTeamAnchors(snapshot) {
  const frames = {};
  for (const id of TEAM_ANCHOR_SLOTS) {
    const asset = snapshot?.resolved?.assets?.[id] ?? snapshot?.canvas?.assets?.[id];
    if (!asset) continue;
    if (asset.kind === 'recipe') {
      if (asset.recipe?.id !== TEAM_ANCHOR_RECIPE)
        throw new TypeError(`Wrong Team anchor recipe for ${id}.`);
      frames[id] = Object.freeze({ kind: 'recipe' });
      continue;
    }
    if (asset.kind !== 'image') throw new TypeError(`Team anchor ${id} needs artwork or a recipe.`);
    const frame = snapshot.image?.(id);
    const width = frame?.image?.naturalWidth ?? frame?.image?.width;
    const height = frame?.image?.naturalHeight ?? frame?.image?.height;
    if (
      width !== 24 ||
      height !== 24 ||
      frame?.geometry?.pivot?.x !== 0.5 ||
      frame?.geometry?.pivot?.y !== 0.5
    )
      throw new TypeError(`Team anchor ${id} needs its prepared 24×24 centered frame.`);
    frames[id] = Object.freeze({
      kind: 'image',
      image: frame.image,
      geometry: Object.freeze({ pivot: Object.freeze({ x: 0.5, y: 0.5 }) }),
    });
  }
  return Object.freeze(frames);
}

/** Only decoration is replaceable. Host labels and the fixed outline preserve
 * anchor identity, state and position even with empty or misleading artwork. */
export function drawTeamAnchor(ctx, frames, { x, y, captured }, palette, size = 1.4) {
  const frame = frames?.[TEAM_ANCHOR_SLOTS[captured ? 1 : 0]];
  const edge = frame
    ? captured
      ? palette.safe
      : palette.accent
    : captured
      ? '#c9e4a0'
      : '#ffd279';
  ctx.save();
  try {
    ctx.imageSmoothingEnabled = false;
    ctx.fillStyle = frame ? palette.paper : captured ? '#315744' : '#604b30';
    ctx.fillRect(x - size / 2, y - size / 2, size, size);
    if (frame?.kind === 'image')
      drawPresentationImage(ctx, frame.image, x, y, size, size, frame.geometry);
    ctx.strokeStyle = edge;
    ctx.lineWidth = size / 14;
    ctx.strokeRect(x - size / 2, y - size / 2, size, size);
  } finally {
    ctx.restore();
  }
  return !!frame;
}
