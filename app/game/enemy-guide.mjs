import { t } from './i18n/index.mjs';
import { contentText } from './i18n/content.mjs';
import { ENEMY_CATALOG, ENEMY_THEMES, emptyEnemyCatalogDraft } from './enemy-catalog.mjs';
import { createEnemyCatalogScenario } from './enemy-catalog-scenarios.mjs';
import { validateScenario } from './content.mjs';
import {
  ENCOUNTER_GUIDE_TOPICS,
  isEncounterGuideTopic,
  encounterGuideEntry,
  createEncounterGuideScenario,
} from './encounter-guide.mjs';

const advice = () => ({
  bouncer: [
    t('errors:watchItsDirectionBeforeLeavingTheBorder'),
    t('errors:closeAShortCutWhileItIsMovingAway'),
  ],
  'border-patrol': [
    t('errors:itFollowsTheOutsideEdgeIncludingYourStartingGround'),
    t('errors:leaveItsPathBeforeItReachesYouSecuredGroundIs'),
  ],
  'contour-patrol': [
    t('errors:lookForTheCornerBadgeOnTheChangingFrontier'),
    t('errors:afterACaptureCheckTheNewBoundaryBeforeChoosingYour'),
  ],
  'claimed-rover': [
    t('errors:itsSleepingOutlineMeansItCannotMoveYet'),
    t('errors:watchForTheWakeUpWarningWhenItsWholeFootprint'),
  ],
  eroder: [
    t('errors:aBiteShapedBadgeMarksAThreatToCapturedGround'),
    t('errors:watchTheWarningAtASecuredEdgeReopenedCellsBecome'),
  ],
  'lane-boss': [
    t('errors:theMarkedLaneWarnsBeforeTheAttackBecomesActive'),
    t('errors:crossDuringTheGapDoNotWaitInsideAWarned'),
  ],
  'relay-sentinel': [
    t('interface:enemyGuide.sentinelSpot'),
    t('interface:enemyGuide.sentinelTry', { coreOpen: t('interface:coreOpen') }),
  ],
});
export const ENEMY_GUIDE_TOPICS = Object.freeze([
  ...ENEMY_CATALOG.map(({ type, label }) => Object.freeze({ id: type, label })),
  ...ENCOUNTER_GUIDE_TOPICS,
  Object.freeze({ id: 'line-impact', label: t('errors:raceTheImpact') }),
]);

/** Short player copy, separate from authoring controls and runtime authority. */
export function enemyGuideEntry(topic, themeId = 'fpv') {
  if (isEncounterGuideTopic(topic)) return encounterGuideEntry(topic);
  const theme = ENEMY_THEMES.includes(themeId) ? themeId : 'fpv';
  if (topic === 'line-impact')
    return Object.freeze({
      id: topic,
      label: t('errors:raceTheImpact'),
      form: t('errors:twoSparksOnYourUnfinishedLine'),
      spot: t('errors:aLineStrikeSendsOneSparkBackToTheStart'),
      risk: t('errors:thePursuingSparkCostsALifeIfItReachesYou'),
      try: t('errors:closeTheCutBeforeTheSparkCatchesYouClosingSafely'),
      note: t('errors:thisRuleIsActiveInFirstLightR3AndThis'),
    });
  const record = ENEMY_CATALOG.find(({ type }) => type === topic);
  if (!record) throw new TypeError(t('errors:chooseARegisteredEnemyLesson'));
  return Object.freeze({
    id: topic,
    label: contentText(record, 'label'),
    form: contentText(record, `forms.${ENEMY_THEMES.indexOf(theme)}`),
    spot: `${contentText(record, 'domain')}. ${advice()[topic][0]}`,
    risk: contentText(record, 'risk'),
    try: advice()[topic][1],
    note: t('errors:theSmallCenterMarksContactTheLargerAnimatedBodyHelps'),
  });
}

export function enemyGuidePracticeInstructions(topic, exercise = 'observe') {
  if (isEncounterGuideTopic(topic)) return t('interface:encounterGuide.instructions');
  if (topic === 'line-impact') {
    if (!['observe', 'escape'].includes(exercise))
      throw new TypeError(t('errors:unknownImpactExercise'));
    return exercise === 'observe'
      ? t('errors:firstLeaveBoostOffAndTapDownWatchTheHit')
      : t('errors:enableBoostBeforeTappingDownHoldYourBoostButtonOr');
  }
  return t('interface:enemyGuide.practiceInstructions', { advice: enemyGuideEntry(topic).try });
}

/** Materializes a fresh isolated practice recipe; it never changes a pack or live run. */
export function createEnemyGuideScenario({
  topic,
  themeId = 'fpv',
  turnPolicy = 'immediate',
  themes,
  impactScenario,
  encounterLevel,
  encounterTheme,
  runOptions,
}) {
  enemyGuideEntry(topic, themeId);
  if (!['immediate', 'grid-center'].includes(turnPolicy))
    throw new TypeError(t('errors:unknownTurningMode'));
  const selected = ENEMY_THEMES.includes(themeId) ? themeId : 'fpv',
    theme =
      isEncounterGuideTopic(topic) && encounterTheme
        ? encounterTheme
        : themes?.find((entry) => entry.id === selected);
  if (!theme) throw new Error(t('errors:thisLessonThemeIsUnavailable'));
  if (isEncounterGuideTopic(topic))
    return createEncounterGuideScenario({
      topic,
      level: encounterLevel,
      theme,
      turnPolicy,
      runOptions,
    });
  let scenario;
  if (topic === 'line-impact') {
    if (impactScenario?.level?.id !== 'line-impact-demo')
      throw new Error(t('errors:theImpactLessonCouldNotLoad'));
    scenario = structuredClone(impactScenario);
    scenario.theme = structuredClone(theme);
  } else {
    scenario = createEnemyCatalogScenario(topic, emptyEnemyCatalogDraft(selected), themes);
    scenario.level.id = `guide-${topic}`;
    scenario.level.name = `Field guide: ${ENEMY_CATALOG.find((record) => record.type === topic).label}`;
    scenario.level.rules = { ...scenario.level.rules, stopOnCapture: true };
  }
  scenario.settings.turnPolicy = turnPolicy;
  scenario.masteryDefinition = null;
  const checked = validateScenario(scenario);
  if (!checked.valid) throw new Error(checked.errors.join('\n'));
  return scenario;
}
