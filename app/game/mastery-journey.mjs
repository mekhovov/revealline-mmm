import { boundedJSON, dataIdentity, exactKeys, required, stableId } from './data-json.mjs';
import { createRun } from './core/index.mjs';
import { isClassicRuleset } from './core/versions.mjs';
import { snapshotReplay, verifyReplayAsync } from './replay.mjs';
import { freezeDesign } from './content-design/catalogs.mjs';

/** Registered optional presentation rule, not a simulation setting. This uses
 * the same cumulative no-life-lost condition as modern core medal evaluation.
 * It says nothing about real-world skill or certification. */
export const JOURNEY_NO_LOSS_MASTERY = freezeDesign({
  format: 'revealline-journey-mastery-definition.v1',
  id: 'journey-no-loss-win',
  revision: '1',
  locales: {
    en: {
      name: 'No-life-lost win',
      description: 'Win this mission without losing a life in that attempt.',
    },
    uk: {
      name: 'Перемога без втрати життя',
      description: 'Виграйте цю місію, не втративши жодного життя в цій спробі.',
    },
  },
});
const verified = new WeakMap();
const text = (value, limit) =>
  typeof value === 'string' &&
  value.trim() &&
  value.length <= limit &&
  !/[\x00-\x1f\x7f]/.test(value);

export function resolveJourneyMasteryRequirement(input) {
  const value = boundedJSON(input, { maxBytes: 2048, maxNodes: 16, maxDepth: 2, maxString: 256 });
  exactKeys(value, ['id', 'revision', 'missionId'], 'Journey mastery requirement');
  required(
    value.id === JOURNEY_NO_LOSS_MASTERY.id &&
      value.revision === JOURNEY_NO_LOSS_MASTERY.revision &&
      stableId(value.missionId),
    'Unsupported exact Journey mastery requirement.',
  );
  return freezeDesign(value);
}

export function resolveJourneyMasteryClear(input, requirement, bindings) {
  const value = boundedJSON(input, { maxBytes: 4096, maxNodes: 16, maxDepth: 2, maxString: 1024 });
  exactKeys(
    value,
    ['missionId', 'runId', 'gameplayId', 'difficulty'],
    'Journey mastery accepted clear',
  );
  required(
    value.missionId === requirement.missionId &&
      text(value.runId, 256) &&
      text(value.gameplayId, 256),
    'Journey mastery needs its exact accepted mission and run.',
  );
  const mission = bindings.find((entry) => entry.missionId === value.missionId);
  required(
    mission?.bindings.some(
      (entry) => entry.gameplayId === value.gameplayId && entry.difficulty === value.difficulty,
    ),
    'Journey mastery needs a selected gameplay binding.',
  );
  return freezeDesign(value);
}

/** Reuse the normal bounded replay verifier. The host separately supplies an
 * accepted Journey clear; a copied JSON flag is never verification authority.
 * Modern core already tracks every lost life, so no second event/scoring engine
 * or per-frame observer is needed for this versioned predicate. */
export async function verifyJourneyMasteryRun(
  { requirement: input, clear: accepted, replay, bindings },
  { signal, onProgress, chunkTicks = 600 } = {},
) {
  signal?.throwIfAborted();
  const requirement = resolveJourneyMasteryRequirement(input);
  const clear = resolveJourneyMasteryClear(accepted, requirement, bindings);
  const recording = snapshotReplay(replay);
  const start = createRun(recording.level, recording.options);
  required(
    isClassicRuleset(start.ruleset) && start.classic,
    'This Journey mastery requires a supported modern Solo ruleset.',
  );
  required(
    start.levelId === requirement.missionId &&
      dataIdentity({ ruleset: start.ruleset, level: start.level, classes: start.classRecipes }) ===
        clear.gameplayId,
    'Journey mastery replay differs from its accepted gameplay.',
  );
  const checked = await verifyReplayAsync(recording, { signal, onProgress, chunkTicks });
  signal?.throwIfAborted();
  required(checked.match, 'Journey mastery replay verification failed.');
  required(checked.state.status === 'won', 'Journey mastery requires a completed accepted win.');
  const livesLost = checked.state.classic?.livesLost;
  required(
    Number.isSafeInteger(livesLost) && livesLost >= 0,
    'Journey mastery lost-life evidence is unavailable.',
  );
  const result = freezeDesign({
    format: 'revealline-journey-mastery-verification.v1',
    requirement,
    clear,
    qualified: livesLost === 0,
    livesLost,
  });
  verified.set(result, result.qualified ? { ...requirement, runId: clear.runId } : null);
  return result;
}

export function verifiedJourneyMasteryEvidence(result) {
  required(verified.has(result), 'A completed Journey mastery verification is required.');
  return structuredClone(verified.get(result));
}
