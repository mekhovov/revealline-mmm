import { formatNumber, t } from './i18n/index.mjs';

const medalKeys = Object.freeze({
  1: 'interface:library.medal.bronze',
  2: 'interface:library.medal.silver',
  3: 'interface:library.medal.gold',
});

const medalLabel = (medal) => t(`interface:library.medal.${String(medal).toLowerCase()}`);

/** Display projection: a picture's best-score run and level mastery are different records. */
export function collectionResultLabels(item, library) {
  const clear = library.campaigns?.[item.campaignKey]?.clears?.[item.levelId];
  const bestMedalKey = Number.isInteger(clear?.medals) ? (medalKeys[clear.medals] ?? null) : null;
  const score = formatNumber(item.score);
  const scoreMedal = medalLabel(item.medal);
  const time = Number.isFinite(item.time)
    ? ` · ${t('common:units.secondsShort', {
        seconds: formatNumber(item.time, { minimumFractionDigits: 2, maximumFractionDigits: 2 }),
      })}`
    : '';
  return Object.freeze({
    card: bestMedalKey
      ? t('interface:library.collectionResult.cardLevelBest', {
          score,
          medal: t(bestMedalKey),
        })
      : t('interface:library.collectionResult.cardScoreRun', { score, medal: scoreMedal }),
    detail: bestMedalKey
      ? t('interface:library.collectionResult.detailLevelBest', {
          score,
          scoreMedal,
          time,
          levelMedal: t(bestMedalKey),
        })
      : t('interface:library.collectionResult.detailScoreRun', { score, scoreMedal, time }),
  });
}
