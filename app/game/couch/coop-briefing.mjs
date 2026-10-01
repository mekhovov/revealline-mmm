import { t } from '../i18n/index.mjs';
import { coopGroundContext, coopGroundLabel } from './coop-ground.mjs';
import { teamBonusHelp } from './coop-bonus-view.mjs';
import { hasTeamLineImpacts } from '../coop/foundations.mjs';

/** Presentation advice for an already validated arena. Never changes its recipe. */
export function coopArenaGuidance(level, { jointCuts = true } = {}) {
  const groundName = coopGroundLabel(level);
  const context = coopGroundContext(level);
  const hunters = level.enemies.some((enemy) => enemy.type === 'hunter');
  const drifters = level.enemies.some((enemy) => enemy.type === 'drifter');
  const roamers = level.enemies.some((enemy) => enemy.type === 'claimed-rover');
  const relays = Boolean(level.strongholds?.length);
  const trailImpacts = hasTeamLineImpacts(level) && level.enemies.length > 0;
  const requiredCores = level.goal.cores?.length ?? 0;
  const threats = [];
  if (level.timedBonuses) threats.push(teamBonusHelp());
  const slow = level.terrain?.some((area) => area.kind === 'slow'),
    lethal = level.terrain?.some((area) => area.kind === 'lethal');
  if (slow) threats.push(t('interface:pairedDashesSlowOnlyYourCraftOnUnclaimedFieldEnemies'));
  if (lethal) threats.push(t('interface:framedCrossesHarmYourCraftOnUnclaimedFieldEncloseThem'));
  if (slow || lethal)
    threats.push(t('interface:capturingFieldNeutralizesItsTerrainForBothCraftWallsNever'));
  if (hunters) threats.push(t('interface:huntersMarkARouteBeforeChargingCrossDuringRecoveryOr'));
  if (drifters)
    threats.push(t('interface:driftersPatrolContinuouslyAndCanHitYourCraftOrUnfinished'));
  if (roamers) threats.push(t('interface:trackedRoamersDoNotRetainFieldReclaimTheirFullFootprint'));
  if (relays) threats.push(t('interface:relayCoresWarnBeforeSendingASparkAlongAnUnfinished'));
  if (trailImpacts)
    threats.push(t('interface:team.trailImpactContact'), t('interface:team.trailImpactDirections'));
  const supportRoles = level.supportRoles ?? ['hybrid', 'hybrid'];
  const specialist = level.supportRoles?.length === 2;
  const intercept = relays || trailImpacts;
  const canSlow = hunters || drifters || roamers;
  const interceptorSeat = supportRoles.indexOf('interceptor') + 1;
  const disruptorSeat = supportRoles.indexOf('disruptor') + 1;
  const pulse = specialist
    ? intercept && canSlow
      ? t('interface:team.specialistSupportSlowAndIntercept', {
          interceptor: interceptorSeat,
          disruptor: disruptorSeat,
        }) + ' '
      : intercept
        ? t('interface:team.specialistSupportIntercept', { player: interceptorSeat }) + ' '
        : canSlow
          ? t('interface:team.specialistSupportSlow', { player: disruptorSeat }) + ' '
          : ''
    : canSlow
      ? t(intercept ? 'gameplay:team.supportSlowAndIntercept' : 'gameplay:team.supportSlow') + ' '
      : intercept
        ? '' + t('interface:tapSupportNearATravellingSparkToInterceptIt') + ' '
        : '';
  const rescue = t('gameplay:team.rescueAdvice', { context });
  const route = jointCuts
    ? t('interface:startWithASmallLoopThenMeetYourPartnerTo')
    : t('gameplay:team.separateCuts', { context });
  return {
    groundName,
    groundContext: context,
    threatTitle: threats.length
      ? t('interface:watchTheThreats')
      : t('interface:practiceYourRoutes'),
    threatText: threats.length ? threats.join(' ') : t('gameplay:team.noThreats', { context }),
    supportText: pulse + rescue,
    supportCapabilities: Object.freeze({
      intercept,
      slow: canSlow,
      specialist,
      interceptorSeat: specialist ? interceptorSeat : null,
      disruptorSeat: specialist ? disruptorSeat : null,
    }),
    supportBySeat: supportRoles.map((role) =>
      role === 'interceptor'
        ? t('interface:interceptorRemovesNearbyTravellingImpacts')
        : role === 'disruptor'
          ? t('interface:disruptorSlowsNearbyEnemies')
          : t('interface:supportSlowsNearbyEnemiesAndInterceptsImpacts'),
    ),
    showStrongholds: relays,
    strongholdTitle: requiredCores
      ? t('interface:secureTheRelayCores')
      : t('interface:relayDefenses'),
    strongholdText:
      t('gameplay:team.strongholdAdvice') +
      (requiredCores ? '' : ' ' + t('interface:yourGoalIsTheCoverageTarget') + ''),
    briefingTitle:
      requiredCores > 1
        ? t('interface:secureTheRequiredCores')
        : requiredCores
          ? t('interface:takeTheStrongholdTogether')
          : t('interface:makeYourCommonGround'),
    levelNote: requiredCores
      ? t('interface:planRoutesToTheAnchorsThenClaimTheExposedCores')
      : context === 'reclaimed'
        ? t('interface:createReturnRoutesTogetherUseReclaimedGroundToLaunchYour')
        : t('interface:createSafeRoutesTogetherUseTheRevealedGroundToLaunch'),
    startMessage: `${specialist ? '' + t('interface:specialistsShareTheBoardInterceptorCoversExposedLinesDisruptorOpens') + ' ' : ''}${
      roamers
        ? t('gameplay:team.startRoamer', { route })
        : hunters
          ? t('gameplay:team.startHunter', { route })
          : drifters
            ? t('gameplay:team.startDrifter', { route })
            : relays
              ? t('gameplay:team.startRelay', { route })
              : route
    }`,
  };
}
