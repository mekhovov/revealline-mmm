import { completionLearningReference } from './learning.mjs';

/** Translate only selected authored missions from the Journey authority. Skips,
 * practice results and unknown mission IDs never become reward evidence. */
export function rewardContext(
  provider,
  bindings,
  profile,
  acceptedLearning = [],
  acceptedMastery = [],
  historicalClears = [],
) {
  const clears = {};
  const clearAlternatives = {};
  for (const mission of bindings) {
    for (const id of mission.journeyMissionIds) {
      const clear = profile?.clears?.solo?.[id];
      // The reward model checks its promised revision. Current bindings must
      // not discard historical accepted clears from a retained promise.
      if (!clear) continue;
      const accepted = {
        runId: clear.runId,
        gameplayId: clear.gameplayId,
        difficulty: clear.difficulty,
      };
      if (!clears[mission.missionId]) {
        clears[mission.missionId] = accepted;
      } else {
        const candidates = [
          clears[mission.missionId],
          ...(clearAlternatives[mission.missionId] ?? []),
        ];
        if (
          !candidates.some(
            (candidate) =>
              candidate.runId === accepted.runId &&
              candidate.gameplayId === accepted.gameplayId &&
              candidate.difficulty === accepted.difficulty,
          )
        )
          (clearAlternatives[mission.missionId] ??= []).push(accepted);
      }
    }
  }
  // A verified proof retains the exact accepted attempt even when Journey's
  // latest-clear slot is replaced by a later win. Admit only selected rule rows,
  // supported exact bindings and currently owned missions; raw historic clears
  // cannot independently grant a win or import an unrelated mission.
  const selectedMastery = acceptedMastery.filter((record) =>
    (provider.rewards ?? []).some((reward) =>
      reward.requirements.mastery.some(
        (requirement) =>
          requirement.id === record.id &&
          requirement.revision === record.revision &&
          requirement.missionId === record.missionId,
      ),
    ),
  );
  let retainedCount = 0;
  for (const historic of historicalClears.slice(0, 4096)) {
    const mission = bindings.find((entry) => entry.missionId === historic.missionId);
    const candidates = [
      clears[historic.missionId],
      ...(clearAlternatives[historic.missionId] ?? []),
    ];
    const matchesBinding = (clear) =>
      mission?.bindings.some(
        (binding) =>
          binding.gameplayId === clear?.gameplayId && binding.difficulty === clear?.difficulty,
      );
    if (
      !selectedMastery.some(
        (record) => record.missionId === historic.missionId && record.runId === historic.runId,
      ) ||
      !matchesBinding(historic) ||
      !candidates.some(matchesBinding)
    )
      continue;
    const accepted = {
      runId: historic.runId,
      gameplayId: historic.gameplayId,
      difficulty: historic.difficulty,
    };
    if (
      candidates.some(
        (entry) =>
          entry?.runId === accepted.runId &&
          entry.gameplayId === accepted.gameplayId &&
          entry.difficulty === accepted.difficulty,
      )
    )
      continue;
    // The registered rule currently contributes at most one historic attempt
    // per mission. Preserve the model's global and per-mission import budgets.
    if ((clearAlternatives[historic.missionId]?.length ?? 0) >= 128 || retainedCount >= 4096)
      continue;
    (clearAlternatives[historic.missionId] ??= []).push(accepted);
    retainedCount++;
  }
  // Only the lesson host's replay-verified projection is passed here. The exact
  // selected lesson and mission must still match; raw attempts never qualify.
  const selectedMissions = new Set(bindings.map((mission) => mission.missionId));
  const selectedLessons = (provider.lessons ?? [])
    .filter(
      (lesson) =>
        provider.selection.edition.campaignIds.includes(lesson.campaignId) &&
        selectedMissions.has(lesson.missionId),
    )
    .map(completionLearningReference);
  const learning = acceptedLearning.filter((record) =>
    selectedLessons.some((lesson) =>
      Object.entries(lesson).every(([key, value]) => record[key] === value),
    ),
  );
  return {
    editionId: provider.editionId,
    brandId: provider.selection.brand.id,
    campaignIds: provider.selection.edition.campaignIds,
    clears,
    ...(Object.keys(clearAlternatives).length ? { clearAlternatives } : {}),
    learning,
    mastery: selectedMastery.filter((record) =>
      [clears[record.missionId], ...(clearAlternatives[record.missionId] ?? [])].some(
        (clear) => clear?.runId === record.runId,
      ),
    ),
  };
}
