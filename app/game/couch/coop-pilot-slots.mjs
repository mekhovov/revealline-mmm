import { TEAM_PILOT_STATES, TEAM_PILOT_SLOTS } from '../presentation/team-runtime-slots.mjs';
export { TEAM_PILOT_STATES, TEAM_PILOT_SLOTS } from '../presentation/team-runtime-slots.mjs';
export function teamPilotSlot(id, state, treatment) {
  const slot = `team.pilot.p${id + 1}.${state}.${treatment}`;
  return TEAM_PILOT_SLOTS.includes(slot) ? slot : null;
}
/** Only prepared data from the shared host. Inheritance is an explicit recipe,
 * never a replacement for malformed advertised custom artwork. */
export function prepareTeamPilots(snapshot) {
  const frames = new Map();
  for (const slot of TEAM_PILOT_SLOTS) {
    const asset = snapshot?.resolved?.assets?.[slot] ?? snapshot?.canvas?.assets?.[slot];
    if (!asset) continue;
    if (asset.kind === 'recipe') {
      if (asset.recipe?.id !== 'team.pilot.v1')
        throw new TypeError(`Wrong Team pilot recipe: ${slot}.`);
      continue;
    }
    const frame = snapshot.image?.(slot),
      g = frame?.geometry;
    const size = slot.endsWith('.compact') ? 32 : 64;
    const unit = (n) => Number.isFinite(n) && n >= 0 && n <= 1;
    const rotors = g?.rotors;
    if (
      asset.kind !== 'image' ||
      (frame?.image?.naturalWidth ?? frame?.image?.width) !== size ||
      (frame?.image?.naturalHeight ?? frame?.image?.height) !== size ||
      !unit(g?.pivot?.x) ||
      !unit(g?.pivot?.y) ||
      g?.frame?.width !== size ||
      g?.frame?.height !== size ||
      !Array.isArray(rotors) ||
      rotors.length !== 4 ||
      rotors.some(
        (a) =>
          !Number.isFinite(a.x) ||
          !Number.isFinite(a.y) ||
          !Number.isFinite(a.radiusScale) ||
          a.radiusScale <= 0 ||
          !unit(a.x + g.pivot.x - a.radiusScale * 0.16) ||
          !unit(a.x + g.pivot.x + a.radiusScale * 0.16) ||
          !unit(a.y + g.pivot.y - a.radiusScale * 0.16) ||
          !unit(a.y + g.pivot.y + a.radiusScale * 0.16) ||
          ![2, 3, 4].includes(a.bladeCount) ||
          ![1, -1].includes(a.direction) ||
          !Number.isFinite(a.phaseDegrees),
      )
    )
      throw new TypeError(
        `Team pilot ${slot} needs a prepared ${size}×${size} frame with four bounded rotor anchors.`,
      );
    frames.set(slot, frame);
  }
  return frames;
}
