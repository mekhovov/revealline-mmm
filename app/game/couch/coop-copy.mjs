import { huntText } from '../hunt/copy.mjs';
import { t, formatNumber } from '../i18n/index.mjs';

/** Presentation-only projections; validated recipes and runtime state stay canonical. */
function captureGoalLabel(level) {
  if (!level.goal.cores)
    return t('gameplay:team.goalCoverage', {
      coverage: formatNumber(Math.ceil(level.goal.coverage * 10000 - 1e-9) / 100),
    });
  return level.goal.cores.length === 1
    ? t('gameplay:team.goalCore')
    : t('gameplay:team.goalCores', { count: level.goal.cores.length });
}

export function coopGoalLabel(level) {
  if (level.hunt?.mode === 'hunt')
    return `${huntText('huntGoal')} ${huntText('targets')}: ${level.hunt.quota}`;
  const goal = captureGoalLabel(level);
  if (level.environment) {
    const parts = [goal];
    if (level.environment.relays.length)
      parts.push(t('interface:expeditions.allRelays', { count: level.environment.relays.length }));
    if (level.environment.stages.length)
      parts.push(t('interface:expeditions.allStages', { count: level.environment.stages.length }));
    return parts.join(' · ');
  }
  return level.hunt?.mode === 'capture-quota'
    ? `${goal} · ${huntText('targets')}: ${level.hunt.quota}`
    : goal;
}

export function coopObjectiveLabel(run) {
  if (run.environment) {
    const parts = [captureGoalLabel(run.level)];
    if (run.environment.relays.length)
      parts.push(
        t('interface:expeditions.relayProgress', {
          done: run.environment.relays.filter((r) => r.open).length,
          total: run.environment.relays.length,
        }),
      );
    if (run.environment.stages.length)
      parts.push(
        t('interface:expeditions.stageProgress', {
          done: run.environment.stage,
          total: run.environment.stages.length,
        }),
      );
    return parts.join(' · ');
  }
  if (run.level.hunt?.mode === 'hunt')
    return `${huntText('targets')}: ${run.hunt.kills}/${run.level.hunt.quota}`;
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
  const progress =
    strongholds.length > 1
      ? t('gameplay:team.relayObjective', {
          secured: strongholds.filter((item) => item.defeated).length,
          total: strongholds.length,
          relay: run.strongholds.indexOf(stronghold) + 1,
          objective,
        })
      : objective;
  return run.level.hunt?.mode === 'capture-quota'
    ? `${progress} · ${huntText('targets')}: ${run.hunt.kills}/${run.level.hunt.quota}`
    : progress;
}
