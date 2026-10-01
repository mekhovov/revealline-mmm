import { t, formatNumber } from '../i18n/index.mjs';

/** Presentation-only projections; validated recipes and runtime state stay canonical. */
export function coopGoalLabel(level) {
  if (!level.goal.cores)
    return t('gameplay:team.goalCoverage', {
      coverage: formatNumber(Math.ceil(level.goal.coverage * 10000 - 1e-9) / 100),
    });
  return level.goal.cores.length === 1
    ? t('gameplay:team.goalCore')
    : t('gameplay:team.goalCores', { count: level.goal.cores.length });
}

export function coopObjectiveLabel(run) {
  const strongholds = run.strongholds.filter((item) => run.level.goal.cores?.includes(item.id));
  const stronghold = strongholds.find((item) => !item.defeated);
  if (!stronghold)
    return strongholds.length
      ? t('interface:strongholdsSecuredTogether')
      : coopGoalLabel(run.level);
  const objective = stronghold.shielded
    ? t('gameplay:team.anchorsSecured', {
        count: stronghold.anchors.filter((anchor) => anchor.captured).length,
      })
    : t('interface:shieldDownCaptureTheExposedCoreInANewCut');
  return strongholds.length > 1
    ? t('gameplay:team.relayObjective', {
        secured: strongholds.filter((item) => item.defeated).length,
        total: strongholds.length,
        relay: run.strongholds.indexOf(stronghold) + 1,
        objective,
      })
    : objective;
}
