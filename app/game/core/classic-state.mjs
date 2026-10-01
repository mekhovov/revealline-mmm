import { CELL } from './registry.mjs';
import { isClassicRuleset } from './versions.mjs';
import { createTimedBonusState } from './timed-bonuses.mjs';

export const CLASSIC_MATERIAL = Object.freeze({ normal: 0, slow: 1, lethal: 2 });
export const CLASSIC_EFFECTS = Object.freeze({
  'player-speed': 600,
  'enemy-slow': 720,
  'enemy-freeze': 360,
});
export const CLASSIC_EFFECT_FACTORS = Object.freeze({ 'player-speed': 1.25, 'enemy-slow': 0.5 });

export function createClassicState(level, cells) {
  const terrain = new Uint8Array(cells.length);
  for (const area of level.classic.terrain)
    for (let y = area.y; y < area.y + area.h; y++)
      for (let x = area.x; x < area.x + area.w; x++)
        terrain[y * level.width + x] = CLASSIC_MATERIAL[area.kind];
  return {
    version: 'classic-state.v1',
    terrain,
    eligible: Uint8Array.from(cells, (cell) => Number(cell === CELL.FIELD)),
    everClaimed: new Uint8Array(cells.length),
    uniqueClaimedCount: 0,
    livesLost: 0,
    powerups: level.classic.powerups.map((item) => ({ ...item, collectedTick: null })),
    effects: Object.fromEntries(
      Object.keys(CLASSIC_EFFECTS).map((key) => [key, { from: 0, until: 0 }]),
    ),
    actorTick: 0,
    actorTime: 0,
    topologyRevision: 0,
    anchors: [],
    departure: null,
    tickClaims: [],
    ...(level.classic.timedBonuses
      ? { timedBonuses: createTimedBonusState(level.classic.timedBonuses) }
      : {}),
    ...(level.classic.lineImpact
      ? {
          lineImpact: {
            version: 'line-impact-state.v1',
            nextId: 1,
            seededActorIds: [],
            fronts: [],
          },
        }
      : {}),
  };
}

export function classicEffectActive(state, kind) {
  const effect = state.classic?.effects[kind];
  return !!effect && state.tick >= effect.from && state.tick < effect.until;
}

/** Complete new-branch authority. Derived graph caches are rebuilt from these fields. */
export function projectClassicState(state) {
  if (!isClassicRuleset(state.ruleset) || !state.classic)
    throw new TypeError('Classic projection requires a classic run');
  const { terrain, eligible, everClaimed, ...data } = state.classic;
  return {
    definition: structuredClone(state.level.classic),
    enemyDefinitions: structuredClone(state.level.enemies),
    state: {
      ...structuredClone(data),
      terrain: Array.from(terrain),
      eligible: Array.from(eligible),
      everClaimed: Array.from(everClaimed),
    },
    actors: state.enemies.map((enemy) => ({
      id: enemy.id,
      type: enemy.type,
      state: structuredClone(enemy.classic ?? null),
    })),
  };
}
