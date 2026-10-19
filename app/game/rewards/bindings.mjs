import { dataIdentity } from '../data-json.mjs';
import { createContentExecutionCatalog } from '../content-design/execution.mjs';
import { freezeDesign } from '../content-design/catalogs.mjs';
import { createRun } from '../core/index.mjs';
import { applyGameplayTuning, resolveGameplayTuning } from '../gameplay-tuning.mjs';
import { journeyMissionId } from '../journey/catalog.mjs';
import { prepareRunningEnemyLevel } from '../hunt/running-enemies.mjs';

const gameplayIdentity = (run) =>
  dataIdentity({ ruleset: run.ruleset, level: run.level, classes: run.classRecipes });

/** Derive allowed Solo completion identities through the same selected content,
 * class recipes and single pressure application used by the canonical host.
 * Authoring IDs stay separate from the Journey IDs used by accepted clears. */
export function createRewardMissionBindings(source, { includeRunningEnemies = false } = {}) {
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
          ...(includeRunningEnemies ? { runningEnemyBindings: [] } : {}),
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
        gameplayId: gameplayIdentity(run),
      };
      if (
        !mission.bindings.some(
          (item) =>
            item.difficulty === binding.difficulty && item.gameplayId === binding.gameplayId,
        )
      )
        mission.bindings.push(binding);
      if (includeRunningEnemies) {
        try {
          // Preserve authored reward promises. This runtime-only equivalence is
          // derived from the exact unchanged base plus the finite Bonus recipe;
          // no recording metadata can nominate its own reward identity.
          const overlay = createRun(
            prepareRunningEnemyLevel(run.level, {
              classes: run.classRecipes,
              style: run.level.pursuit ? 'varied' : 'original',
            }),
            { classRecipes: run.classRecipes },
          );
          const gameplayId = gameplayIdentity(overlay);
          if (
            gameplayId !== binding.gameplayId &&
            !mission.runningEnemyBindings.some(
              (item) => item.difficulty === binding.difficulty && item.gameplayId === gameplayId,
            )
          ) {
            mission.bindings.push({ difficulty: binding.difficulty, gameplayId });
            mission.runningEnemyBindings.push({
              difficulty: binding.difficulty,
              gameplayId,
              baseGameplayId: binding.gameplayId,
            });
          }
        } catch {
          // A level without a safe overlay keeps its ordinary binding.
        }
      }
    }
  return freezeDesign([...missions.values()]);
}
