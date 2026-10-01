import { contentText } from '../i18n/content.mjs';
import { t } from '../i18n/index.mjs';
import {
  MASTERY_DEFINITION_VERSION,
  EQUIPMENT_MASTERY_DEFINITION_VERSION,
  masteryDefinitionIdentity,
} from '../mastery.mjs';
import { builtinMasteryRegistration } from '../mastery-catalog.mjs';

// Register the reviewed built-in content explicitly. Reusing campaign/map IDs
// in an edited pack must not silently opt that different board into this goal.
const registrationFor = (key, levelId, catalog) =>
  catalog === undefined
    ? builtinMasteryRegistration(key, levelId)
    : (catalog?.get(key, levelId) ?? null);

/** Sidecar registration keeps optional goals out of old map and score identity. */
export function masteryFor(actualCampaignKey, levelId, catalog) {
  return registrationFor(actualCampaignKey, levelId, catalog)?.definition ?? null;
}

const friendly = (id) =>
  ({
    'west-supply': t('interface:westPad'),
    'south-supply': t('interface:southPad'),
    'west-emitter': t('interface:westSignalRegion'),
    'south-emitter': t('interface:southSignalRegion'),
    'south-hangar': 'south hangar',
    'cable-cutter': 'cable cutter',
    carrier: t('interface:heavyCarrier'),
  })[id] || id.replaceAll('-', ' ');
const mark = (satisfied) => (satisfied ? '✓' : '○');
function equipmentLines(definition, preview) {
  const progress = (type) => preview?.predicates?.find((item) => item.type === type);
  const lines = [];
  // The clean finish follows the equipment action in the reading order.
  for (const predicate of [...definition.all].sort(
    (a, b) => Number(a.type === 'clean-win') - Number(b.type === 'clean-win'),
  )) {
    const current = progress(predicate.type);
    if (predicate.type === 'supply-pickups')
      for (const id of predicate.padIds) {
        const collected = current?.collectedPadIds?.includes(id) === true;
        lines.push(
          `${mark(collected)} ${friendly(id)}: ${collected ? 'collected' : 'collect supplies'}`,
        );
      }
    else if (predicate.type === 'suppressed-region-crossings')
      for (const region of predicate.regions) {
        const value = current?.regions?.find((item) => item.zoneId === region.zoneId);
        const banked = value?.bestClosedCells ?? 0;
        const pending = value?.pendingCells ?? 0;
        lines.push(
          t('gameplay:suppressedCellsInOneClosedCut', {
            value1: mark(banked >= region.minCells),
            value2: friendly(region.zoneId),
            value3: Math.min(banked, region.minCells),
            value4: region.minCells,
            value5:
              pending > banked
                ? t('gameplay:onYourOpenLineReturnToBankThem', { value1: pending })
                : '',
          }),
        );
      }
    else if (predicate.type === 'hangar-switch')
      lines.push(
        t('gameplay:toAtThe', {
          value1: mark(current?.satisfied),
          value2: current?.satisfied ? t('interface:switched') : t('interface:switch'),
          value3: friendly(predicate.classId),
          value4: friendly(predicate.hangarId),
        }),
      );
    else if (predicate.type === 'live-cut-impact') {
      const phase = current?.phase ?? 'not-started';
      lines.push(
        `${mark(phase === 'returned')} ${
          phase === 'returned'
            ? t('interface:qualifyingPulseCompleteCraftReturnedSafely')
            : phase === 'awaiting-return'
              ? t('interface:qualifyingPulseLandedWaitForTheCraftToReturn')
              : t('gameplay:duringACutOfCellsPulseTheAndReturnSafely', {
                  value1: predicate.minTrailCells,
                  value2: friendly(predicate.actorId),
                })
        }`,
      );
    } else if (predicate.type === 'clean-win')
      lines.push(
        `${mark(current?.satisfied)} ${preview?.cleanSoFar === false ? t('interface:lifeLostRetryForThisSeal') : current?.satisfied ? t('interface:finishedWithoutLosingALife') : t('interface:finishWithoutLosingALife')}`,
      );
  }
  if (!definition.all.some((predicate) => predicate.type === 'clean-win'))
    lines.push(
      `${mark(preview?.status === 'won')} ${preview?.status === 'won' ? t('interface:missionComplete') : t('interface:finishTheMissionToEarnTheSeal')}`,
    );
  return lines;
}

export function masteryText(
  definition,
  preview,
  { practice = false, award = null, compact = false } = {},
) {
  if (!definition) return '';
  const unearnedDetails =
    definition.version === EQUIPMENT_MASTERY_DEFINITION_VERSION &&
    award?.status === 'unqualified' &&
    !compact;
  if (award?.message && !unearnedDetails)
    return ['earned', 'session'].includes(award.status)
      ? award.message
      : `${contentText(definition, 'name')} · ${award.message}`;
  if (definition.version === EQUIPMENT_MASTERY_DEFINITION_VERSION) {
    if (compact) {
      const find = (type) => preview?.predicates?.find((item) => item.type === type);
      const pickups = definition.all.find((item) => item.type === 'supply-pickups');
      const lines = pickups
        ? [
            t('gameplay:pads', {
              value1: find('supply-pickups')?.collectedPadIds?.length ?? 0,
              value2: pickups.padIds.length,
            }),
            t('gameplay:closedSignalRegions', {
              value1:
                find('suppressed-region-crossings')?.regions?.filter((item) => item.satisfied)
                  .length ?? 0,
              value2: definition.all.find((item) => item.type === 'suppressed-region-crossings')
                .regions.length,
            }),
            t('gameplay:equipmentSwitch', {
              value1: find('hangar-switch')?.satisfied ? 'complete' : 'pending',
            }),
          ]
        : [
            {
              'not-started': t('interface:pulseDuringALiveCutThenReturnSafely'),
              'awaiting-return': t('interface:qualifyingPulseLandedCraftReturning'),
              returned: t('interface:qualifyingPulseAndReturnComplete'),
            }[find('live-cut-impact')?.phase ?? 'not-started'],
            preview?.cleanSoFar === false
              ? t('interface:lifeLostRetryForTheSeal')
              : 'no lives lost',
          ];
      return t('gameplay:pauseForTheFullChecklist', {
        value1: practice ? t('interface:practiceGoal') : t('interface:optionalSeal'),
        value2: contentText(definition, 'name'),
        value3: lines.join(' · '),
      });
    }
    return [
      `${practice ? 'Practice goal' : 'Optional seal'} · ${contentText(definition, 'name')}`,
      ...(unearnedDetails ? [award.message] : []),
      ...equipmentLines(definition, preview),
    ].join('\n');
  }
  if (definition.version !== MASTERY_DEFINITION_VERSION) return '';
  const required = definition.all.find((item) => item.type === 'resistant-cut-cells').minCells;
  const committed = preview?.bestClosedCutCells ?? 0;
  const pending = preview?.pendingCutCells ?? 0;
  const clean = preview?.cleanSoFar !== false;
  const route = preview?.qualified
    ? t('interface:routeComplete')
    : t('gameplay:interferenceCellsInOneClosedCut', {
        value1: Math.min(committed, required),
        value2: required,
      });
  return `${practice ? t('interface:practiceGoal') : t('interface:optionalSeal')} · ${contentText(definition, 'name')}: ${route}${pending > committed ? t('gameplay:onYourOpenLineReturnToSafetyToBankThem', { value1: pending }) : ''} · ${clean ? 'no lives lost' : t('interface:lifeLostRetryForTheSeal')}.`;
}

export function pictureMasteries(records, item, definition, recipes = [], catalog) {
  const matches = (records ?? []).filter(
    (record) => record.campaignKey === item.campaignKey && record.levelId === item.levelId,
  );
  const identity = definition ? masteryDefinitionIdentity(definition) : null;
  const registration = registrationFor(item.campaignKey, item.levelId, catalog);
  const currentDefinition = registration && identity === registration.definitionIdentity;
  return matches.map((record) => ({
    name:
      currentDefinition &&
      record.definitionId === definition.id &&
      record.definitionRevision === definition.revision &&
      record.definitionHash === identity &&
      record.levelIdentity === registration.levelIdentity &&
      record.levelRevision === registration.levelRevision &&
      record.setup.rosterHash === registration.rosterHash &&
      record.setup.ruleset === registration.ruleset
        ? definition.name
        : t('gameplay:archivedSeal', { value1: record.definitionId }),
    route: record.setup.classHistory
      .map((entry) => recipes.find((recipe) => recipe.id === entry.classId)?.label || entry.classId)
      .join(' → '),
    steering:
      record.setup.turnPolicy === 'grid-center'
        ? t('interface:gridBuffer')
        : t('interface:immediate'),
    seed: record.setup.seed,
    earnedAt: record.earnedAt,
  }));
}
