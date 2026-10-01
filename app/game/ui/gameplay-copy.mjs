import { t, formatNumber } from '../i18n/index.mjs';
import { contentText } from '../i18n/content.mjs';
import { validateGameplayTuning, REFERENCE_MOTION_RATES } from '../gameplay-tuning.mjs';
import { REFERENCE_MOTION_RATES as v2Rates } from '../gameplay-tuning-v2.mjs';
import { REFERENCE_MOTION_RATES as v3Rates } from '../gameplay-tuning-v3.mjs';

const difficultyKeys = {
  gentle: 'interface:gentle',
  standard: 'interface:standard',
  expert: 'interface:expert',
};
export const gameplayDifficultyLabel = (id) => (difficultyKeys[id] ? t(difficultyKeys[id]) : id);

/** Presentation only: no translated copy is written into an attempt recipe. */
export function gameplayTuningDescription(snapshot) {
  const tuning = validateGameplayTuning(snapshot);
  const decimal = (number, places) =>
    formatNumber(number, { minimumFractionDigits: places, maximumFractionDigits: places });
  if (tuning.version === 'gameplay-pressure.v1')
    return t('gameplay:tuning.historical', {
      enemy: decimal(tuning.enemySpeed, 2),
      craft: decimal(tuning.playerSpeed, 2),
    });
  const density = tuning.enemyDensity
    ? t('gameplay:tuning.addedEnemies', { percent: Math.round(tuning.enemyDensity * 100) })
    : t('gameplay:tuning.authoredEnemies');
  const behaviorKey = {
    'gameplay-pressure.v2': 'gameplay:tuning.behaviorV2',
    'gameplay-pressure.v3': 'gameplay:tuning.behaviorV3',
    'gameplay-pressure.v4': 'gameplay:tuning.behaviorV4',
  }[tuning.version];
  const rates =
    tuning.version === 'gameplay-pressure.v2'
      ? v2Rates
      : tuning.version === 'gameplay-pressure.v3'
        ? v3Rates
        : REFERENCE_MOTION_RATES;
  return t('gameplay:tuning.description', {
    craft: decimal(rates.craft * tuning.playerSpeed, 3),
    field: decimal(rates.fieldKeeper * tuning.enemySpeed, 3),
    boundary: decimal(rates.boundaryPatrol * tuning.enemySpeed, 3),
    density,
    behavior: t(behaviorKey),
  });
}

export function journeyPresetDescription(preset, tuningVersion) {
  if (
    ['gameplay-pressure.v2', 'gameplay-pressure.v3', 'gameplay-pressure.v4'].includes(tuningVersion)
  )
    return t('gameplay:tuning.missionLives', {
      count: preset.lives,
      deadline: preset.failingDeadline
        ? t('interface:deadlinesOnlyOnAuthoredTimedMissions')
        : t('gameplay:tuning.noCountdown'),
    });
  return contentText(preset, 'description');
}

export function activeJourneyRules(run, preset, tuningVersion) {
  if (
    ['gameplay-pressure.v2', 'gameplay-pressure.v3', 'gameplay-pressure.v4'].includes(tuningVersion)
  )
    return t('gameplay:tuning.startingLives', {
      count: run.level.rules.lives ?? preset.lives,
      deadline:
        run.level.rules.timeLimitSeconds > 0
          ? t('gameplay:tuning.deadline', {
              seconds: formatNumber(run.level.rules.timeLimitSeconds),
            })
          : t('gameplay:tuning.noCountdown'),
    });
  return contentText(preset, 'description');
}

const statusKeys = {
  ready: 'gameplay:status.ready',
  running: 'gameplay:status.running',
  paused: 'common:status.paused',
  finished: 'gameplay:status.finished',
  won: 'gameplay:status.won',
  lost: 'gameplay:status.lost',
  respawning: 'gameplay:status.respawning',
};
export const gameplayStatusLabel = (status) =>
  statusKeys[status] ? t(statusKeys[status]) : status;

export const gameplayStatsLabel = (run) =>
  [
    `${formatNumber(run.coverage * 100, { minimumFractionDigits: 1, maximumFractionDigits: 1 })}%`,
    t('gameplay:hud.lives', { count: run.lives }),
    t('gameplay:result.points', { count: run.score }),
  ].join(' · ');
