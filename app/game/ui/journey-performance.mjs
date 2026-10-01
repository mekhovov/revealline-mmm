import { t, formatNumber } from '../i18n/index.mjs';

/** A truthful read-only recap. Best score and fastest time can belong to
 * different actual wins; neither is presented as one fictional combined run. */
export function journeyPerformanceText(result = {}) {
  const { comparison = null, durable = false, error = null } = result;
  if (error && !Object.hasOwn(result, 'comparison')) return t('interface:journeyBest.unavailable');
  const parts = [];
  if (!comparison) parts.push(t('interface:journeyBest.firstVerified'));
  else {
    const scoreKey =
      comparison.scoreGain > 0
        ? 'scoreImproved'
        : comparison.scoreGain === 0
          ? 'scoreMatched'
          : 'scoreReference';
    const seconds = Math.round(comparison.secondsFaster * 100) / 100;
    const timeKey = seconds > 0 ? 'timeImproved' : seconds === 0 ? 'timeMatched' : 'timeReference';
    parts.push(t('interface:journeyBest.sameSetup'));
    parts.push(
      t(`interface:journeyBest.${scoreKey}`, {
        points: formatNumber(
          comparison.scoreGain > 0 ? comparison.scoreGain : comparison.scoreBest.score,
        ),
      }),
    );
    parts.push(
      t(`interface:journeyBest.${timeKey}`, {
        seconds: formatNumber(seconds > 0 ? seconds : comparison.fastest.time, {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        }),
      }),
    );
  }
  if (!durable)
    parts.push(
      t(
        result.saveUnconfirmed
          ? 'interface:journeyBest.saveUnconfirmed'
          : 'interface:journeyBest.sessionOnly',
      ),
    );
  return parts.join(' ');
}
