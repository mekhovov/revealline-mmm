import { t, formatNumber } from '../i18n/index.mjs';
import { coopGroundContext } from './coop-ground.mjs';
import { isJourneyTeamLevel } from '../coop/foundations.mjs';
import { foundationCaptionForCell } from '../ui/foundation-feedback.mjs';

/** Team stores its accepted return cell directly; joint/assisted banking is not
 * a physical foundation return. Keep the same explanation as Solo and Versus. */
export function coopFoundationReturnCaption(run, events = run.events) {
  if (!isJourneyTeamLevel(run.level) || run.status !== 'running') return '';
  for (const event of events) {
    if (event.type !== 'cut.closed' || event.reason !== 'return') continue;
    const player = run.players[event.player];
    if (!player || player.status !== 'active') continue;
    const caption = foundationCaptionForCell(run.level.safeRects, player.cellIndex, run.width);
    if (caption) return caption;
  }
  return '';
}

/** Describe observed failures without assigning blame or changing game state. */
export function coopFailureFeedback(run, event) {
  if (event?.cause === 'lethal-terrain')
    return {
      cause: t('interface:unclaimedLethalFieldCaughtACraft'),
      advice: t('interface:encloseTheCrossedFieldBeforeEnteringItSupportAffectsEnemies'),
    };
  if (event?.cause === 'self-trail')
    return {
      cause: t('interface:anUnfinishedLineCrossedItself'),
      advice: t('gameplay:team.selfTrailAdvice', { context: coopGroundContext(run.level) }),
    };
  if (event?.cause === 'line-impact')
    return {
      cause: t('interface:aTravellingSparkReachedAnUnfinishedCut'),
      advice: t('interface:interceptANearbySparkWithSupportOrBankTheCut'),
    };
  if (event?.cause === 'enemy-trail' || event?.cause === 'enemy-player') {
    const hunter = run.enemies.some((enemy) => enemy.id === event.enemy && enemy.type === 'hunter');
    if (run.enemies.some((enemy) => enemy.id === event.enemy && enemy.type === 'claimed-rover'))
      return {
        cause: t(
          event.cause === 'enemy-trail'
            ? 'gameplay:team.roamerCaughtLine'
            : 'gameplay:team.roamerCaughtCraft',
        ),
        advice: t('interface:reclaimedGroundClosesCutsButDoesNotProtectYouFrom'),
      };
    return {
      cause: t(
        hunter
          ? event.cause === 'enemy-trail'
            ? 'gameplay:team.hunterCaughtLine'
            : 'gameplay:team.hunterCaughtCraft'
          : event.cause === 'enemy-trail'
            ? 'gameplay:team.enemyCaughtLine'
            : 'gameplay:team.enemyCaughtCraft',
      ),
      advice: hunter
        ? t('interface:waitForTheHunterToRecoverOrUseSupportBefore')
        : t('interface:tryAShorterLoopOrSlowNearbyEnemiesWithSupport'),
    };
  }
  return {
    cause: event ? t('interface:aCraftWasKnockedDown') : t('interface:bothCraftNeedARescue'),
    advice: t('interface:trySmallerLoopsAndKeepASafeRouteBackTo'),
  };
}

export function coopRoamerCaption(event) {
  if (event.type === 'rover.warning')
    return t('interface:roamerWakingOneActiveSecondToMoveAwayKeepA');
  if (event.type === 'rover.activated')
    return t('interface:roamerActiveOnReclaimedGroundWatchBothCraftSupportCan');
  return null;
}

/** Recovery must not erase its explanation, including two same-tick revivals.
 * Empty/unknown history contributes no invented cause; repeated causes read once. */
export function coopRecoveryCause(run, knockdowns) {
  return [
    ...new Set(knockdowns.filter(Boolean).map((event) => coopFailureFeedback(run, event).cause)),
  ].join(' ');
}

export function coopRetryFeedback(run, knockdowns = []) {
  const percent = (fraction) => formatNumber(fraction * 100, { maximumFractionDigits: 1 });
  let progress;
  if (Object.hasOwn(run.level.goal, 'coverage')) {
    const goal = Math.ceil(run.level.goal.coverage * 10000 - 1e-9) / 100;
    progress = t('gameplay:team.retryCoverage', {
      coverage: percent(run.coverage),
      goal: formatNumber(goal),
    });
  } else {
    const required = run.strongholds.filter((item) => run.level.goal.cores.includes(item.id));
    const anchors = required.flatMap((item) => item.anchors);
    progress = t('gameplay:team.retryCores', {
      cores: formatNumber(required.filter((item) => item.defeated).length),
      totalCores: formatNumber(required.length),
      anchors: formatNumber(anchors.filter((item) => item.captured).length),
      totalAnchors: formatNumber(anchors.length),
    });
  }
  const feedback = (knockdowns.length ? knockdowns : [null]).map((event) =>
    coopFailureFeedback(run, event),
  );
  const causes = [...new Set(feedback.map((item) => item.cause))].join(' ');
  const advice = [...new Set(feedback.map((item) => item.advice))].join(' ');
  return t('gameplay:team.retry', { progress, causes, advice });
}
