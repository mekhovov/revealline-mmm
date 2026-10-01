import { t, formatNumber } from '../i18n/index.mjs';

/** Format an accepted encounter snapshot in the current locale without reading a run. */
export function encounterCopy(facts) {
  const { seconds, multiple, shieldPlural, shields, min, cutCells, isolated, frozen, suppressed } =
    facts;
  const ended = facts.status === 'lost';
  const lane = Number.isFinite(facts.lane)
    ? facts.axis === 'horizontal'
      ? t('gameplay:encounter.row', { number: Math.floor(facts.lane) })
      : t('gameplay:encounter.column', { number: Math.floor(facts.lane) })
    : '';
  const phaseName = {
    delay: shieldPlural ? t('interface:shieldRelays') : t('interface:shieldRelay'),
    warning: t('interface:laneWarning'),
    active: suppressed ? t('interface:laneSuppressed') : t('interface:laneActive'),
    rest: shieldPlural ? t('interface:shieldRelays') : t('interface:shieldRelay'),
    transition: t('interface:shieldOpening'),
    open: t('interface:coreOpen'),
    defeated: t('interface:coreReleased'),
  }[facts.phase];
  const title = ended
    ? t('interface:flightEnded2')
    : `${facts.stage === 'shielded' ? '1 / 2' : '2 / 2'} · ${phaseName}${facts.defeated ? '' : ` · ${t('common:units.secondsShort', { seconds: formatNumber(seconds, { minimumFractionDigits: 1, maximumFractionDigits: 1 }) })}`}`;
  let instruction;
  if (ended) instruction = t('interface:restartToTryTheTwoStagesAgain');
  else if (facts.status === 'respawning')
    instruction = frozen
      ? t('interface:recoveringAtHomeEnemyFreezeHoldsTheEncounterClockWait')
      : t('interface:recoveringAtHomeTheEncounterClockContinuesWaitForControl');
  else if (facts.defeated)
    instruction =
      facts.defeatCause === 'isolated'
        ? t('interface:coreIsolatedThePictureIsYours')
        : t('interface:releaseCutSecuredThePictureIsYours');
  else if (facts.stage === 'shielded')
    instruction = `${multiple ? t('gameplay:encounter.shieldProgress', { count: shields.total, captured: shields.captured }) : t('interface:captureTheShieldRelay')} ${lane ? t('gameplay:encounter.watchLane', { lane }) : multiple ? t('gameplay:encounter.reclaimedReturn') : t('gameplay:encounter.safeReturn')}`;
  else if (facts.stage === 'transition')
    instruction = shieldPlural
      ? t('gameplay:encounter.multipleTransition')
      : t('gameplay:encounter.singleTransition');
  else if (isolated)
    instruction =
      facts.phase === 'open'
        ? multiple
          ? t('gameplay:encounter.isolatedReclaimedFinish')
          : t('gameplay:encounter.isolatedSafeFinish')
        : multiple
          ? t('gameplay:encounter.isolatedReclaimedWait')
          : t('gameplay:encounter.isolatedSafeWait');
  else
    instruction = `${multiple ? t('gameplay:encounter.reclaimedCut', { cells: cutCells, minimum: min }) : t('gameplay:encounter.safeCut', { cells: cutCells, minimum: min })}${lane && facts.phase !== 'open' ? ` ${t('gameplay:encounter.watchLane', { lane })}` : ''}`;
  if (frozen && !ended && !facts.defeated && facts.status !== 'respawning')
    instruction += ' ' + t('interface:enemyFreezeHoldsTheEncounterClock') + '';
  return Object.freeze({ title, instruction, lane });
}
