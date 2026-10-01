import { TEAM_CORE_SLOTS } from '../presentation/team-runtime-slots.mjs';
export { TEAM_CORE_SLOTS } from '../presentation/team-runtime-slots.mjs';
export const TEAM_CORE_RECIPE = 'team.core.v1';
export function teamCoreState(stronghold) {
  return stronghold.defeated ? 'secured' : stronghold.shielded ? 'shielded' : 'exposed';
}

// Copy only the immutable geometry needed by the shared visible-bound resolver.
// Older prepared snapshots declared only a pivot and deliberately retain their
// original full-frame sizing.
function coreImageGeometry(source) {
  const geometry = { pivot: Object.freeze({ x: 0.5, y: 0.5 }) },
    frame = source?.frame,
    occupied = source?.occupiedBounds;
  if (
    Number.isFinite(frame?.width) &&
    frame.width > 0 &&
    Number.isFinite(frame?.height) &&
    frame.height > 0 &&
    Number.isFinite(occupied?.x) &&
    Number.isFinite(occupied?.y) &&
    Number.isFinite(occupied?.width) &&
    occupied.width > 0 &&
    Number.isFinite(occupied?.height) &&
    occupied.height > 0
  ) {
    geometry.frame = Object.freeze({ width: frame.width, height: frame.height });
    geometry.occupiedBounds = Object.freeze({
      x: occupied.x,
      y: occupied.y,
      width: occupied.width,
      height: occupied.height,
    });
    geometry.rotors = Object.freeze([]);
  }
  return Object.freeze(geometry);
}

/** Page-owned, already decoded frames. Cosmetic states follow the authoritative
 * stronghold; no attack, contact geometry, timer or simulation state is written. */
export function prepareTeamCores(snapshot) {
  const frames = {};
  for (const id of TEAM_CORE_SLOTS) {
    const asset = snapshot?.resolved?.assets?.[id] ?? snapshot?.canvas?.assets?.[id];
    if (!asset) continue;
    if (asset.kind === 'recipe') {
      if (asset.recipe?.id !== TEAM_CORE_RECIPE)
        throw new TypeError(`Wrong Team core recipe for ${id}.`);
      frames[id] = Object.freeze({ kind: 'recipe' });
      continue;
    }
    if (asset.kind !== 'image') throw new TypeError(`Team core ${id} needs artwork or a recipe.`);
    const frame = snapshot.image?.(id);
    if (
      (frame?.image?.naturalWidth ?? frame?.image?.width) !== 64 ||
      (frame?.image?.naturalHeight ?? frame?.image?.height) !== 64 ||
      frame?.geometry?.pivot?.x !== 0.5 ||
      frame?.geometry?.pivot?.y !== 0.5
    )
      throw new TypeError(`Team core ${id} needs its prepared 64×64 centered frame.`);
    frames[id] = Object.freeze({
      kind: 'image',
      image: frame.image,
      geometry: coreImageGeometry(frame.geometry),
    });
  }
  return Object.freeze(frames);
}

/** Functional state overlay remains visible above both shared and replacement
 * bodies. Historical snapshots retain their original palette and geometry. */
export function drawTeamCoreCue(ctx, frames, stronghold, palette) {
  const state = teamCoreState(stronghold),
    registered = !!frames?.[`team.core.${state}`];
  const fill = registered
    ? state === 'secured'
      ? palette.safe
      : palette.danger
    : stronghold.defeated
      ? '#a0c887'
      : '#ffc1a4';
  const edge = registered
    ? state === 'shielded'
      ? palette.accent
      : state === 'secured'
        ? palette.safe
        : palette.danger
    : stronghold.shielded
      ? '#f1b860'
      : '#f48885';
  const { x, y } = stronghold.core;
  ctx.save();
  try {
    ctx.fillStyle = fill;
    ctx.strokeStyle = edge;
    ctx.lineWidth = stronghold.shielded ? 0.2 : 0.08;
    ctx.beginPath();
    for (let i = 0; i < 6; i++) {
      const angle = (i * Math.PI) / 3,
        px = x + Math.cos(angle) * 1.2,
        py = y + Math.sin(angle) * 1.2;
      if (i === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.closePath();
    ctx.stroke();
    // Authored equipment supplies its own readable center. Keep the boundary
    // and game-owned label, but do not paint the legacy solid dot over it.
    ctx.beginPath();
    ctx.arc(x, y, 0.48, 0, Math.PI * 2);
    if (frames?.[`team.core.${state}`]?.kind === 'image') {
      ctx.lineWidth = 0.06;
      ctx.stroke();
    } else ctx.fill();
  } finally {
    ctx.restore();
  }
  return fill;
}
