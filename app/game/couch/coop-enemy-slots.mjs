import { TEAM_ENEMY_SLOTS } from '../presentation/team-runtime-slots.mjs';
import { FORMATS, validateAssetRevision } from '../presentation/model.mjs';
import { imagePresentation } from '../presentation/runtime.mjs';
import { canonicalJSON } from '../data-json.mjs';
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
    let atlas = null,
      admittedGeometry = null;
    if (asset.format === FORMATS.animatedAsset || asset.animation || g?.animation) {
      try {
        if (asset.format !== FORMATS.animatedAsset)
          throw new TypeError('Animation requires an explicit asset-v2 revision.');
        atlas = validateAssetRevision(asset);
        admittedGeometry = imagePresentation(atlas);
        if (canonicalJSON(g) !== canonicalJSON(admittedGeometry))
          throw new TypeError('Prepared geometry differs from the admitted atlas revision.');
      } catch (error) {
        throw new TypeError(`Team enemy ${id} needs an admitted animated atlas: ${error.message}`);
      }
    }
    if (
      asset.kind !== 'image' ||
      (frame?.image?.naturalWidth ?? frame?.image?.width) !== (atlas?.file.width ?? 32) ||
      (frame?.image?.naturalHeight ?? frame?.image?.height) !== (atlas?.file.height ?? 32) ||
      (!atlas && (g?.frame?.x !== 0 || g?.frame?.y !== 0)) ||
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
    // Re-admit detached transport geometry rather than passing an unregistered
    // cloned descriptor to the frame sampler after this snapshot is adopted.
    frames.set(id, admittedGeometry ? { ...frame, geometry: admittedGeometry } : frame);
  }
  return frames;
}
