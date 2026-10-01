import { t, getLocale } from './i18n/index.mjs';
import { contentText } from './i18n/content.mjs';
const compact = (value, limit) => {
  const text = typeof value === 'string' ? value.trim().replace(/\s+/g, ' ') : '';
  return text.length <= limit ? text : `${text.slice(0, limit - 1).trimEnd()}…`;
};

/** Presentation only: derive requirements from the authored rules, never from
 * prose. Keep the complete authored briefing separately from the ready card.
 */
export function missionBriefing(
  level,
  { brief, objectiveLabel = t('gameplay:brief.objective'), classes = [], intro = false } = {},
) {
  const originalBrief =
    typeof brief === 'string' && brief.trim() ? brief : level.metadata?.description || '';
  const authored = brief || contentText(level, 'metadata.description') || '';
  const fullTitle = contentText(level, 'name');
  const title = compact(fullTitle, 44);
  const coverage = Number((level.goal.coverage * 100).toFixed(6));
  const required = (level.objectives || []).filter((item) => item.required).length;
  const encounter = level.encounter;
  const multiShield = encounter?.version === 'xonix-encounter.v2';
  const shieldCount = multiShield ? encounter.shieldObjectiveIds.length : 1;
  const shieldLabel = t('gameplay:brief.shieldRelays', { count: shieldCount });
  const otherRequired = multiShield ? Math.max(0, required - shieldCount - 1) : 0;
  const label =
    compact(objectiveLabel, 24).toLocaleLowerCase() ||
    t('gameplay:brief.objective').toLocaleLowerCase();
  const plural =
    getLocale() === 'en'
      ? /[^aeiou]y$/.test(label)
        ? `${label.slice(0, -1)}ies`
        : `${label}s`
      : label;
  const goal = multiShield
    ? otherRequired
      ? t('gameplay:brief.shieldGoalObjectives', {
          coverage,
          shields: shieldLabel,
          count: otherRequired,
          objective: otherRequired === 1 ? label : plural,
        })
      : t('gameplay:brief.shieldGoal', { coverage, shields: shieldLabel })
    : required
      ? t('gameplay:brief.goalObjectives', {
          coverage,
          count: required,
          objective: required === 1 ? label : plural,
        })
      : t('gameplay:brief.coverage', { coverage });
  const rules = level.rules || {};
  const limits = [
    rules.timeLimitSeconds > 0 ? t('gameplay:deadlineS', { value1: rules.timeLimitSeconds }) : '',
    rules.cutTimeLimitSeconds > 0 ? t('gameplay:cutS', { value1: rules.cutTimeLimitSeconds }) : '',
    rules.maxTrailCells > 0 ? t('gameplay:cableCells', { value1: rules.maxTrailCells }) : '',
  ]
    .filter(Boolean)
    .join(' · ');
  // Existing pack briefs use this explicit prefix. Only known class labels
  // become a compact recommendation; the full prose is always available.
  const suggested = /^\s*Recommended:\s*([^.!?]+)/i.exec(originalBrief)?.[1] || '';
  const recommendations = classes
    .filter(
      (recipe) =>
        typeof recipe.label === 'string' &&
        suggested.toLowerCase().includes(recipe.label.toLowerCase()),
    )
    .map((recipe) => contentText(recipe, 'label'));
  const recommendation = recommendations.length
    ? t('gameplay:recommended', { value1: compact(recommendations.join(' / '), 68) })
    : '';
  const encounterGoal = encounter
    ? multiShield && shieldCount > 1
      ? t('gameplay:brief.captureShields', {
          count: shieldCount,
          cells: encounter.minReleaseCutCells,
        })
      : t('gameplay:captureTheShieldRelayThenCloseNewTrailCellsDuring', {
          value1: encounter.minReleaseCutCells,
        })
    : '';
  const foundations = [
    'xonix-level.v5',
    'xonix-level.v6',
    'xonix-level.v7',
    'xonix-level.v8',
  ].includes(level.version);
  const combat = level.classic?.combatPatrols;
  const optionalRoles =
    foundations &&
    combat?.version === 'combat-patrols.v1' &&
    combat.enabled === true &&
    Array.isArray(combat.actors)
      ? combat.actors.map((actor) => actor.role)
      : [];
  // Optional actors live outside level.enemies. Their authoring design is not
  // part of the playable scenario, so derive this lesson from enabled rules.
  const optionalHint = optionalRoles.includes('sentry')
    ? t('gameplay:brief.optionalSentry')
    : optionalRoles.includes('scout')
      ? t('gameplay:brief.optionalScout')
      : '';
  const optionalDetails = optionalRoles.includes('sentry')
    ? t('gameplay:brief.optionalSentryDetails')
    : optionalRoles.includes('scout')
      ? t('gameplay:brief.optionalScoutDetails')
      : '';
  const classicHint = [
    'xonix-level.v4',
    'xonix-level.v5',
    'xonix-level.v6',
    'xonix-level.v7',
    'xonix-level.v8',
  ].includes(level.version)
    ? [
        level.directionalFields?.zones?.length ? t('gameplay:brief.arrowFields') : '',
        level.relayGates?.gates?.length ? t('gameplay:brief.relayGates') : '',
        foundations && level.enemies?.some((enemy) => enemy.type === 'lane-boss')
          ? t('gameplay:brief.laneFire')
          : '',
        level.classic?.enemyPressure?.actors?.length ? t('gameplay:brief.impactPressure') : '',
        level.classic?.powerups?.length
          ? t('gameplay:brief.touchPickupsToCollectTheirEffects')
          : '',
        level.classic?.timedBonuses ? t('gameplay:brief.timedPickups') : '',
        level.classic?.terrain?.some((tile) => tile.kind === 'lethal')
          ? t('gameplay:brief.redCrosshatchedFieldsDamageOnContactEncloseThemBeforeCrossing')
          : level.classic?.terrain?.some((tile) => tile.kind === 'slow')
            ? t('gameplay:brief.stripedFieldsSlowYourCraftWhileTheyRemainHidden')
            : '',
        level.enemies?.some((enemy) => enemy.type === 'contour-patrol')
          ? t('gameplay:brief.contourReturns')
          : '',
        level.enemies?.some((enemy) => enemy.type === 'claimed-rover')
          ? t('gameplay:brief.roversWakeOnClaimedGroundAfterAWarning')
          : '',
        level.enemies?.some((enemy) => enemy.type === 'eroder')
          ? t('gameplay:brief.erodersWarnBeforeReopeningCapturedGround')
          : '',
      ]
        .filter(Boolean)
        .slice(
          0,
          level.classic?.lineImpact ||
            (foundations && level.enemies?.some((enemy) => enemy.type === 'lane-boss'))
            ? 1
            : 2,
        )
        .join('\n')
    : '';
  const captureHint =
    rules.stopOnCapture === true
      ? t('gameplay:brief.closingACutStopsYourCraftTapAFreshDirection')
      : '';
  const impactHint = level.classic?.lineImpact
    ? level.classic.lineImpact.version === 'line-impact.v2'
      ? t('gameplay:brief.boltSparks')
      : t('gameplay:brief.lineHitCloseYourCutBeforeTheTravellingSparkReaches')
    : '';
  const facts = [goal, encounterGoal, limits, recommendation].filter(Boolean).join('\n');
  return Object.freeze({
    title,
    fullTitle,
    goal,
    facts,
    copy: intro
      ? [
          t('gameplay:leaveSafeGroundDrawALineAndReturnRevealBy', { value1: coverage }),
          optionalHint,
        ]
          .filter(Boolean)
          .join('\n')
      : [facts, captureHint, optionalHint, impactHint, classicHint].filter(Boolean).join('\n'),
    fullBrief: [
      authored || t('gameplay:brief.returnToSafeGroundToSecureEachLineRegionsWithout'),
      optionalDetails,
    ]
      .filter(Boolean)
      .join('\n\n'),
    status: encounter
      ? multiShield && shieldCount > 1
        ? t('gameplay:brief.captureShieldsFirst', { count: shieldCount })
        : t('gameplay:brief.captureTheShieldRelayFirstWatchThePatternedLaneBefore')
      : intro
        ? t('interface:yourFirstRouteFlyDownFromTheMarkedStartTo')
        : level.classic?.enemyPressure?.actors?.length
          ? t('gameplay:brief.cancelPursuit')
          : t('gameplay:brief.chooseYourRouteOpenMissionsMissionBriefForGuidance'),
  });
}
