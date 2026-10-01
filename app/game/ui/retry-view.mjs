import { t } from '../i18n/index.mjs';
const explanations = () => ({
  'self-contact': [
    t('interface:yourUnfinishedLineCrossedItself'),
    t('interface:rejoinSafeGroundWithoutCrossingTheLineYouAreDrawing'),
  ],
  'enemy-trail': [
    t('interface:anEnemyCaughtYourUnfinishedLine'),
    t('interface:tryAShorterCutWhileKeepingEnemiesAwayFromThe'),
  ],
  'enemy-player': [
    t('interface:anEnemyReachedYourCharacter'),
    t('interface:keepAGapFromEnemiesIncludingPatrolsOnSafeGround'),
  ],
  'combat-projectile': [
    t('interface:failure.combatProjectile'),
    t('interface:failure.combatProjectileTip'),
  ],
  'boss-lane': [
    t('interface:anActiveMarkedLaneCaughtYourCharacterOrUnfinishedLine'),
    t('interface:keepBothOutsideTheMarkedLaneWhileItIsActive'),
  ],
  'cut-timeout': [
    t('interface:theTimeAllowedForOneOpenLineRanOut'),
    t('interface:rejoinSafeGroundSoonerPauseTheGameWhenYouNeed'),
  ],
  'cable-limit': [
    t('interface:yourOpenLineExceededItsLengthLimit'),
    t('interface:planAShorterLineBackToSafeGround'),
  ],
  'lethal-terrain': [
    t('interface:yourCharacterTouchedALethalField'),
    t('interface:routeAroundItsWarningPatternOrEncloseItFromSafe'),
  ],
  'mission-timeout': [
    t('interface:theMissionClockRanOut'),
    t('interface:planAShorterRouteToTheRequiredRevealAreaAnd'),
  ],
});
const fallback = () => [
  t('interface:thatAttemptEnded'),
  t('interface:reviewTheMissionBriefAndChooseAnotherRoute'),
];

function ownValue(source, key) {
  if (!source || typeof source !== 'object' || Array.isArray(source)) return undefined;
  const descriptor = Object.getOwnPropertyDescriptor(source, key);
  return descriptor && Object.hasOwn(descriptor, 'value') ? descriptor.value : undefined;
}

function practiceOption(options) {
  if (
    !options ||
    typeof options !== 'object' ||
    ![Object.prototype, null].includes(Object.getPrototypeOf(options))
  )
    throw new TypeError(t('interface:retryOptionsMustBeAPlainObject'));
  const descriptor = Object.getOwnPropertyDescriptor(options, 'practice');
  if (!descriptor) return false;
  if (!Object.hasOwn(descriptor, 'value') || typeof descriptor.value !== 'boolean')
    throw new TypeError(t('interface:retryPracticeMustBeAnOwnDataBoolean'));
  return descriptor.value;
}

/** Fixed display advice for an event-time cause, without reading simulation state. */
export function failureExplanation(failureCause) {
  const messages = explanations();
  const cause =
    typeof failureCause === 'string' && Object.hasOwn(messages, failureCause) ? failureCause : null;
  const [reason, tip] = cause ? messages[cause] : fallback();
  return { cause, reason, tip };
}

/** Display-only advice; an existing cause may survive recovery and a later win. */
export function retryExplanation(run, options = {}) {
  const practice = practiceOption(options);
  if (ownValue(run, 'status') !== 'lost') return null;
  return {
    ...failureExplanation(ownValue(run, 'failureCause')),
    footnote: practice
      ? t('interface:retryStartsThisPracticeAgainThisRevealResetsPracticeGrants')
      : t('interface:retryStartsThisMissionAgainThisRevealResetsCollectedPictures'),
  };
}
