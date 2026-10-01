import { TEAM_ENEMY_SLOTS } from '../presentation/team-runtime-slots.mjs';
export { TEAM_ENEMY_SLOTS } from '../presentation/team-runtime-slots.mjs';
export function teamEnemySlot(enemy) {
  if (enemy?.active === false) return null;
  if (enemy?.type === 'drifter') return 'team.enemy.drifter';
  if (enemy?.type !== 'hunter') return null;
  const state = enemy.phase === 'commit' ? 'charge' : (enemy.phase ?? 'patrol');
  const id = `team.enemy.hunter.${state}`;
  return TEAM_ENEMY_SLOTS.includes(id) ? id : null;
}
export function teamEnemyInheritance(id) {
  if (!TEAM_ENEMY_SLOTS.includes(id)) return null;
  return id === 'team.enemy.drifter' ? 'enemy.bouncer' : 'enemy.border-patrol';
}
/** Validate prepared images before adopting a new snapshot. Slots are cosmetic;
 * core phase/target/timing remain authoritative. Historical absence inherits. */
export function prepareTeamEnemies(snapshot) {
  const frames = new Map(),
    unit = (n) => Number.isFinite(n) && n >= 0 && n <= 1;
  for (const id of TEAM_ENEMY_SLOTS) {
    const asset = snapshot?.resolved?.assets?.[id] ?? snapshot?.canvas?.assets?.[id];
    if (!asset) continue;
    if (asset.kind === 'recipe') {
      if (asset.recipe?.id !== 'team.enemy.v1')
        throw new TypeError(`Wrong Team enemy recipe: ${id}.`);
      continue;
    }
    const frame = snapshot.image?.(id),
      g = frame?.geometry,
      rotors = g?.rotors;
    if (
      asset.kind !== 'image' ||
      (frame?.image?.naturalWidth ?? frame?.image?.width) !== 32 ||
      (frame?.image?.naturalHeight ?? frame?.image?.height) !== 32 ||
      g?.frame?.x !== 0 ||
      g?.frame?.y !== 0 ||
      g?.frame?.width !== 32 ||
      g?.frame?.height !== 32 ||
      !unit(g?.pivot?.x) ||
      !unit(g?.pivot?.y) ||
      !Array.isArray(rotors) ||
      rotors.length > 8 ||
      new Set(rotors.map((a) => `${a.x},${a.y}`)).size !== rotors.length ||
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
      throw new TypeError(`Team enemy ${id} needs a prepared32×32 frame and bounded geometry.`);
    frames.set(id, frame);
  }
  return frames;
}
