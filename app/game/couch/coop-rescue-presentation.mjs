import { TEAM_RESCUE_SLOTS } from '../presentation/team-runtime-slots.mjs';
export { TEAM_RESCUE_SLOTS } from '../presentation/team-runtime-slots.mjs';
export const TEAM_RESCUE_RECIPE = 'team.rescue.v1';
export function prepareTeamRescue(snapshot) {
  const frames = {};
  for (const id of TEAM_RESCUE_SLOTS) {
    const asset = snapshot?.resolved?.assets?.[id] ?? snapshot?.canvas?.assets?.[id];
    if (!asset) continue;
    if (asset.kind === 'recipe') {
      if (asset.recipe?.id !== TEAM_RESCUE_RECIPE)
        throw new TypeError(`Wrong Team rescue recipe for ${id}.`);
      frames[id] = Object.freeze({ kind: 'recipe' });
      continue;
    }
    if (asset.kind !== 'image') throw new TypeError(`Team rescue ${id} needs artwork or a recipe.`);
    const frame = snapshot.image?.(id),
      size = 32;
    if (
      (frame?.image?.naturalWidth ?? frame?.image?.width) !== size ||
      (frame?.image?.naturalHeight ?? frame?.image?.height) !== size ||
      frame?.geometry?.pivot?.x !== 0.5 ||
      frame?.geometry?.pivot?.y !== 0.5
    )
      throw new TypeError(`Team rescue ${id} needs its prepared ${size}×${size} centered frame.`);
    frames[id] = Object.freeze({ kind: 'image', image: frame.image });
  }
  return Object.freeze(frames);
}
/** Observe the core's existing one-second contact rescue; never start or advance it. */
export function teamRescueProgress(run, player) {
  const rescue = player.rescue;
  if (
    run.status !== 'running' ||
    player.status !== 'active' ||
    !Number.isInteger(rescue?.target) ||
    !Number.isFinite(rescue.startedAt)
  )
    return null;
  const target = run.players.find((other) => other.id === rescue.target && other.id !== player.id);
  if (target?.status !== 'downed') return null;
  return Object.freeze({
    target: target.id,
    progress: Math.max(0, Math.min(1, run.time - rescue.startedAt)),
  });
}
/** Paint decoration before every actor body/identity cue. No animated substitute for real progress. */
export function drawTeamRescueDecoration(ctx, frames, run, player, reduced) {
  const rescue = teamRescueProgress(run, player);
  const slot = rescue
    ? 'team.rescue.progress'
    : player.status === 'active' && player.graceUntil > run.time
      ? 'team.player.recovery'
      : null;
  const frame = frames?.[slot];
  if (frame?.kind !== 'image') return;
  ctx.save();
  try {
    ctx.globalAlpha = reduced ? 0.18 : 0.28;
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(frame.image, player.x - 1, player.y - 1, 2, 2);
  } finally {
    ctx.restore();
  }
}
