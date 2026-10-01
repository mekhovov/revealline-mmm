import { createRun } from './core/index.mjs';
import { canonicalJSON } from './data-json.mjs';
import { matchRecordedGameplayTuning, recoverGameplayTuning } from './gameplay-tuning.mjs';

/** Compare an already validated recorded state with an accepted installed
 * campaign. This does not verify replay outcomes, approve a content source or
 * restrict terminal states. Session restore applies those checks separately.
 * Keep historical tuning reconstruction in its existing versioned owner.
 */
export function matchReplayInstalledRules({ campaign, replay, state }) {
  const level = campaign.levels.find((candidate) => candidate.id === state.levelId);
  if (!level) throw new Error('Install the matching campaign pack before loading this attempt.');
  const tuning = recoverGameplayTuning(state.level);
  const matched = tuning ? matchRecordedGameplayTuning(level, state.level) : level;
  if (!matched) throw new Error('Saved rules differ from the installed campaign.');
  const expected = createRun(matched, {
    ...replay.options,
    classRecipes: campaign.classRecipes,
  });
  if (
    canonicalJSON(expected.level) !== canonicalJSON(state.level) ||
    canonicalJSON(expected.classRecipes ?? campaign.classRecipes) !==
      canonicalJSON(replay.options.classRecipes)
  )
    throw new Error('Saved rules differ from the installed campaign.');
  return level;
}
