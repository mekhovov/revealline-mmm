import { t, formatNumber } from './i18n/index.mjs';
import { difficultyAccess } from './difficulty-access.mjs';
import { campaignSelection } from './continuation.mjs';
import { canPlay, appearanceMilestones, unlockedBodies, achievements } from './progress.mjs';
import { resolveCampaignDifficulty } from './campaign-difficulty.mjs';
import { normalizedLevel } from './core/level.mjs';
import { FIXED_DT } from './core/registry.mjs';

/** Cache a read-only access view when content or the adopted progress map changes.
 * This projection never becomes persisted progress or a source of score awards.
 */
export function createDifficultyNavigation() {
  const views = new WeakMap();
  function access(entry, campaigns) {
    if (!entry?.baseCampaign || !entry.difficulty) return null;
    const cached = views.get(entry.baseCampaign);
    if (cached?.campaigns === campaigns) return cached.access;
    const result = difficultyAccess(entry.baseCampaign, campaigns);
    views.set(entry.baseCampaign, { campaigns, access: result });
    return result;
  }
  return Object.freeze({
    access,
    selection(entry, campaigns, progress, { levelId } = {}) {
      const shared = access(entry, campaigns);
      if (!shared) return campaignSelection(progress, entry.campaign, { levelId });
      const explicit = entry.campaign.levels.findIndex((level) => level.id === levelId);
      return Object.freeze({
        complete: shared.complete,
        completed: shared.count,
        total: shared.total,
        overview: explicit < 0 && shared.complete,
        levelIndex:
          explicit >= 0 ? explicit : (shared.nextLevelIndex ?? entry.campaign.levels.length - 1),
        explicit: explicit >= 0,
      });
    },
    playable(entry, campaigns, progress, index) {
      const shared = access(entry, campaigns);
      return shared
        ? shared.levels[index]?.playable === true
        : canPlay(progress, entry.campaign, index);
    },
    bodies(entry, campaigns, progress) {
      const shared = access(entry, campaigns);
      return shared ? new Set(shared.unlockedBodyIds) : unlockedBodies(progress, entry.campaign);
    },
    milestones(entry, campaigns, progress) {
      return access(entry, campaigns)?.milestones ?? appearanceMilestones(progress, entry.campaign);
    },
    achievements(entry, campaigns, progress) {
      const shared = access(entry, campaigns);
      return achievements(progress, entry.campaign).map((item) => {
        if (!shared) return item;
        const earned = {
          'first-light': shared.count >= 1,
          pathfinder: shared.count >= Math.min(4, shared.total),
          'last-light': shared.complete,
        };
        return Object.hasOwn(earned, item.id)
          ? { ...item, earned: earned[item.id], scope: 'shared' }
          : { ...item, scope: entry.difficulty };
      });
    },
  });
}

export const difficultyLabel = (entry) =>
  entry?.difficulty === 'gentle'
    ? t('interface:gentle')
    : entry?.difficulty === 'standard'
      ? t('interface:standard')
      : '';

/** Preference changes choose the next attempt; they never convert a live run. */
export function difficultyCue({ entry, nextMode, started, recovering = false, practice = false }) {
  resolveCampaignDifficulty(nextMode);
  const current = difficultyLabel(entry);
  if (practice || !current)
    return Object.freeze({
      available: false,
      current: '',
      copy: t('gameplay:brief.difficultyAppliesToAuthoredCampaignsThisActivityKeepsItsOwn'),
      retry: '',
    });
  const next = nextMode === 'gentle' ? t('interface:gentle') : t('interface:standard');
  const pending = current !== next && (started || recovering);
  return Object.freeze({
    available: true,
    current,
    copy: pending
      ? t('gameplay:thisFlightStaysStartsOnYourNextFreshAttemptResume', {
          value1: current,
          value2: next,
        })
      : current !== next
        ? t('gameplay:thisPreparedFlightStartsOnYourSavedChoiceForLater', {
            value1: current,
            value2: next,
          })
        : t('gameplay:bothDifficultiesUnlockTheSamePicturesMissionsAndAppearancesScores', {
            value1: current,
            value2:
              entry.difficulty === 'gentle'
                ? t('gameplay:difficulty.gentleRules')
                : t('gameplay:difficulty.standardRules'),
          }),
    retry: pending
      ? t('gameplay:retryStartsThisMapFromTheBeginningOnYourCurrent', {
          value1: next,
          value2: current,
        })
      : '',
  });
}

/** Describe only actual changes on the selected authored map, in player terms. */
export function difficultyRuleComparison(standardLevel, gentleLevel) {
  const standard = normalizedLevel(standardLevel),
    gentle = normalizedLevel(gentleLevel);
  const seconds = (value) =>
    t('common:units.secondsShort', {
      seconds: formatNumber(value, { maximumFractionDigits: 2 }),
    });
  const limit = (value) => (value ? seconds(value) : t('gameplay:difficulty.noLimit'));
  const rows = [
    t('gameplay:startingLivesStandardGentle', {
      value1: standard.rules.lives,
      value2: gentle.rules.lives,
    }),
    t('gameplay:missionDeadlineStandardGentle', {
      value1: limit(standard.rules.timeLimitSeconds),
      value2: limit(gentle.rules.timeLimitSeconds),
    }),
    t('gameplay:cutDeadlineStandardGentle', {
      value1: limit(standard.rules.cutTimeLimitSeconds),
      value2: limit(gentle.rules.cutTimeLimitSeconds),
    }),
    t('gameplay:maximumLineStandardGentle', {
      value1: standard.rules.maxTrailCells
        ? t('gameplay:cells', { value1: standard.rules.maxTrailCells })
        : t('gameplay:difficulty.unlimited'),
      value2: gentle.rules.maxTrailCells
        ? t('gameplay:cells', { value1: gentle.rules.maxTrailCells })
        : t('gameplay:difficulty.unlimited'),
    }),
  ];
  if (
    standard.enemies.some(
      (enemy) =>
        enemy.type === 'border-patrol' ||
        (enemy.type === 'bouncer' && (enemy.vx !== 0 || enemy.vy !== 0)),
    )
  )
    rows.push(t('gameplay:brief.movingFieldEnemiesAndBorderPatrolsTravel40SlowerOn'));
  for (const enemy of standard.enemies.filter((enemy) => enemy.type === 'lane-boss')) {
    const changed = gentle.enemies.find((candidate) => candidate.id === enemy.id);
    rows.push(
      t('gameplay:laneWarningStandardGentleLaneCycleStandardGentle', {
        value1: seconds(enemy.warningSeconds ?? 1.5),
        value2: seconds(changed.warningSeconds),
        value3: seconds(enemy.period ?? 6),
        value4: seconds(changed.period),
      }),
    );
  }
  if (standard.encounter && gentle.encounter) {
    for (const [stage, key, label] of [
      ['shielded', 'warningTicks', t('gameplay:brief.sentinelLaneWarning')],
      ['shielded', 'restTicks', t('gameplay:brief.sentinelRest')],
      ['exposed', 'warningTicks', t('gameplay:brief.sentinelOpeningWarning')],
      ['exposed', 'openTicks', t('gameplay:brief.sentinelOpening')],
    ])
      rows.push(
        t('gameplay:standardGentle', {
          value1: label,
          value2: seconds(standard.encounter[stage][key] * FIXED_DT),
          value3: seconds(gentle.encounter[stage][key] * FIXED_DT),
        }),
      );
  }
  rows.push(t('gameplay:brief.thePictureCoverageTargetRequiredObjectivesCraftSpeedAndEquipment'));
  return Object.freeze(rows);
}
