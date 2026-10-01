const RECIPES = Object.freeze({
  mission: Object.freeze([
    Object.freeze({ label: '3', durationMs: 700, blocksPlay: true }),
    Object.freeze({ label: '2', durationMs: 700, blocksPlay: true }),
    Object.freeze({ label: '1', durationMs: 700, blocksPlay: true }),
    Object.freeze({ label: 'GO', durationMs: 350, blocksPlay: false }),
  ]),
  retry: Object.freeze([
    Object.freeze({ label: 'READY', durationMs: 600, blocksPlay: true }),
    Object.freeze({ label: 'GO', durationMs: 300, blocksPlay: false }),
  ]),
});

const PHASE_BOUNDARY_EPSILON_MS = 1e-6;

export const missionStartCueDuration = (kind) =>
  (RECIPES[kind] || []).reduce((total, phase) => total + phase.durationMs, 0);

/** A paint-clock-owned mission-start cue. It never advances simulation time. */
export function createMissionStartCue(kind) {
  const recipe = RECIPES[kind];
  if (!recipe) throw new TypeError('Mission start cue must be mission or retry.');
  let startedAt = null;
  return Object.freeze({
    kind,
    sample(now) {
      if (!Number.isFinite(now)) throw new TypeError('Mission start cue time must be finite.');
      if (startedAt === null) startedAt = now;
      const elapsed = Math.max(0, now - startedAt);
      let cursor = 0;
      for (const [index, phase] of recipe.entries()) {
        cursor += phase.durationMs;
        // Repeated RAF additions can land an exact boundary a fraction below it.
        // Collapse only representation error, far below DOM timer resolution.
        if (elapsed < cursor - PHASE_BOUNDARY_EPSILON_MS)
          return Object.freeze({
            active: true,
            blocksPlay: phase.blocksPlay,
            label: phase.label,
            phase: index,
          });
      }
      return Object.freeze({ active: false, blocksPlay: false, label: '', phase: recipe.length });
    },
  });
}
