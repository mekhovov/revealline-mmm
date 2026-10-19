import { EPS } from '../core/geometry.mjs';
import { t, formatNumber } from '../i18n/index.mjs';

/** Explain an accepted core medal. This projection cannot award or save one. */
export function captureMedalGoal(run) {
  if (run?.status !== 'won') return null;
  const thresholds = run.rules?.timeMedals;
  if (
    !['gold', 'silver', 'bronze'].includes(run.medal) ||
    !Number.isFinite(run.time) ||
    run.time < 0 ||
    !Array.isArray(thresholds) ||
    thresholds.length !== 2 ||
    !thresholds.every((value) => Number.isFinite(value) && value > 0) ||
    thresholds[1] < thresholds[0]
  )
    return Object.freeze({ state: 'unavailable' });
  if (run.medal === 'gold') return Object.freeze({ state: 'highest' });
  const medal = run.medal === 'bronze' ? 'silver' : 'gold',
    target = thresholds[medal === 'gold' ? 0 : 1];
  let clean = null;
  if (medal === 'gold') {
    if (run.classic) {
      if (!Number.isInteger(run.classic.livesLost) || run.classic.livesLost < 0)
        return Object.freeze({ state: 'unavailable' });
      clean = run.classic.livesLost === 0;
    } else {
      if (
        !Number.isInteger(run.lives) ||
        !Number.isInteger(run.rules.lives) ||
        run.lives < 1 ||
        run.rules.lives < 1
      )
        return Object.freeze({ state: 'unavailable' });
      clean = run.lives === run.rules.lives;
    }
  }
  return Object.freeze({
    state: 'next',
    medal,
    target,
    clean,
    shortfall: run.time <= target + EPS ? 0 : run.time - target,
  });
}

export function captureMedalGoalCopy(run) {
  const goal = captureMedalGoal(run);
  if (!goal) return '';
  if (goal.state === 'unavailable') return t('interface:captureMedal.unavailable');
  if (goal.state === 'highest') return t('interface:captureMedal.highest');
  const number = (value, maximumFractionDigits) =>
    formatNumber(value, {
      useGrouping: false,
      maximumFractionDigits,
    });
  const target = t(`interface:captureMedal.${goal.medal}`, { target: number(goal.target, 20) }),
    time =
      goal.shortfall === 0
        ? t('interface:captureMedal.timeMet')
        : goal.shortfall < 0.01
          ? t('interface:captureMedal.tiny')
          : t('interface:captureMedal.shortfall', {
              seconds: number(Math.ceil(goal.shortfall * 100) / 100, 2),
            }),
    clean =
      goal.clean === null
        ? ''
        : t(`interface:captureMedal.${goal.clean ? 'cleanMet' : 'cleanMissing'}`);
  return [target, time, clean].filter(Boolean).join(' ');
}
