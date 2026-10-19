import { libraryMissionId } from './library.mjs';
import { classifyContent } from '../content-design/content-lifecycle.mjs';
import { campaignKey } from '../library.mjs';
import { verifyIndexedInstalledPack } from './pack-identity.mjs';
import {
  CLASSIC_RULES_CURRENT,
  CLASSIC_RULES_ORIGINAL,
  classicRulesCampaignIdentity,
  supportsClassicCurrentRules,
} from './classic-current-rules.mjs';

/** Sharing derives the registry identity from the already accepted owner. It
 * never constructs another mode's runtime or grants permission to launch it. */
export function acceptedJourneyMission(mission, editionId) {
  if (!mission || !editionId) return null;
  return {
    id: libraryMissionId({
      owner: `journey:${editionId}`,
      edition: editionId,
      campaign: JSON.stringify([mission.source, mission.packId, mission.campaignId]),
      mission: mission.id,
    }),
    collection: 'Journey',
    editionId,
    lifecycle:
      classifyContent({ family: 'journey', id: editionId }) === 'archived' ? 'archive' : 'current',
    modes: mission.modes,
  };
}

export async function acceptedClassicMission({
  index,
  entry,
  level,
  baseEntry,
  packs,
  isCurrent = () => true,
}) {
  if (!isCurrent()) return null;
  const key =
    entry.classicRulesSourceCampaignKey || entry.baseCampaignKey || campaignKey(entry.campaign);
  const rulesEdition = entry.classicRulesEdition ?? CLASSIC_RULES_ORIGINAL;
  if (![CLASSIC_RULES_ORIGINAL, CLASSIC_RULES_CURRENT].includes(rulesEdition)) return null;
  const candidates = index.missions.filter(
    (row) =>
      row.campaignKey === key &&
      row.levelId === level.id &&
      row.packId === (entry.sourcePackId ?? null) &&
      row.modes.includes('solo'),
  );
  if (candidates.length !== 1) return null;
  const row = candidates[0];
  if (rulesEdition === CLASSIC_RULES_CURRENT && !supportsClassicCurrentRules(row)) return null;
  if (row.source === 'base') {
    const original = baseEntry.campaign.levels[row.levelIndex];
    if (
      campaignKey(baseEntry.campaign) !== row.campaignKey ||
      original?.id !== row.levelId ||
      original?.revision !== row.levelRevision
    )
      return null;
  } else {
    const pack = packs.packs.find((item) => item.id === row.packId);
    if (!pack || !(await verifyIndexedInstalledPack(pack, row, { isCurrent }))) return null;
  }
  if (!isCurrent()) return null;
  const current = rulesEdition === CLASSIC_RULES_CURRENT;
  const ownerId = JSON.stringify([
    'classic',
    row.source,
    row.packId,
    ...(current ? [CLASSIC_RULES_CURRENT] : []),
  ]);
  const editionId = `${row.sourceFile.sha256}${current ? `:${CLASSIC_RULES_CURRENT}` : ''}`;
  return {
    id: libraryMissionId({
      owner: ownerId,
      edition: editionId,
      campaign: classicRulesCampaignIdentity({ ...row, rulesEdition }),
      mission: row.levelId,
      revision: row.levelRevision,
    }),
    collection: 'Classic',
    ownerId,
    editionId,
    modes: row.modes,
  };
}
