import { dataIdentity } from '../data-json.mjs';
import { createContentExecutionCatalog } from '../content-design/execution.mjs';
import { freezeDesign } from '../content-design/catalogs.mjs';
import { createRun } from '../core/index.mjs';
import { applyGameplayTuning, resolveGameplayTuning } from '../gameplay-tuning.mjs';
import { journeyMissionId } from '../journey/catalog.mjs';

/** Derive allowed Solo completion identities through the same selected content,
 * class recipes and single pressure application used by the canonical host.
 * Authoring IDs stay separate from the Journey IDs used by accepted clears. */
export function createRewardMissionBindings(source) {
  const catalog = createContentExecutionCatalog(source, { mode: 'solo' });
  const missions = new Map();
  for (const entry of catalog.entries)
    for (const manifest of entry.manifests) {
      const id = manifest.missionId;
      let mission = missions.get(id);
      if (!mission) {
        mission = {
          missionId: id,
          levelId: id,
          campaignId: entry.campaignId,
          journeyMissionIds: [],
          bindings: [],
        };
        missions.set(id, mission);
      }
      const journeyId = journeyMissionId({
        source: 'candidate',
        packId: entry.sourcePackId,
        campaignId: entry.campaignId,
        levelId: id,
      });
      if (!mission.journeyMissionIds.includes(journeyId)) mission.journeyMissionIds.push(journeyId);
      const run = createRun(
        applyGameplayTuning(manifest.level, resolveGameplayTuning(entry.difficulty)),
      );
      const binding = {
        difficulty: entry.difficulty,
        gameplayId: dataIdentity({
          ruleset: run.ruleset,
          level: run.level,
          classes: run.classRecipes,
        }),
      };
      if (
        !mission.bindings.some(
          (item) =>
            item.difficulty === binding.difficulty && item.gameplayId === binding.gameplayId,
        )
      )
        mission.bindings.push(binding);
    }
  return freezeDesign([...missions.values()]);
}
