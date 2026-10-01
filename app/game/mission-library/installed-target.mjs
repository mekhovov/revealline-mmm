import { campaignKey } from '../library.mjs';
import { resolvePackCampaign } from '../packs.mjs';

/** Resolve from the exact current prepared pack, never from a display name or a
 * registry row alone. Omitted levelId retains the old chapter-Continue behavior;
 * an explicit level is never silently clamped to progress or a different level.
 * This does not install content, award progress, or authorize artwork ownership.
 */
export function resolveInstalledMissionTarget({
  packs,
  pack,
  sourcePackId,
  campaignIdentity,
  levelId,
  levelRevision,
}) {
  if (!pack || !packs?.packs?.includes(pack) || pack.id !== sourcePackId)
    throw new Error('This installed chapter changed. Choose Play again.');
  const entry = pack.campaigns
    .map((source) => resolvePackCampaign(pack, source.id))
    .find((candidate) => campaignKey(candidate.campaign) === campaignIdentity);
  if (!entry) throw new Error('That exact chapter is no longer available.');
  return resolveCampaignMissionTarget({
    entry,
    campaignIdentity,
    sourcePackId,
    levelId,
    levelRevision,
  });
}

/** Caller must supply its exact owned Base entry or prepared-pack resolution. */
export function resolveCampaignMissionTarget({
  entry,
  campaignIdentity,
  sourcePackId,
  levelId,
  levelRevision,
}) {
  if (campaignKey(entry.campaign) !== campaignIdentity || entry.sourcePackId !== sourcePackId)
    throw new Error('That exact chapter is no longer available.');
  let levelIndex = null;
  if (levelId !== undefined) {
    if (typeof levelId !== 'string' || !levelId)
      throw new Error('Choose an exact mission in this chapter.');
    levelIndex = entry.campaign.levels.findIndex((level) => level.id === levelId);
    if (levelIndex < 0) throw new Error('That exact mission is no longer available.');
    if (levelRevision !== undefined && entry.campaign.levels[levelIndex].revision !== levelRevision)
      throw new Error('That mission revision changed. Choose Play again.');
  } else if (levelRevision !== undefined) {
    throw new Error('A mission revision requires an exact mission.');
  }
  const level = levelIndex === null ? null : entry.campaign.levels[levelIndex];
  return {
    entry,
    levelIndex,
    title: level?.name || entry.campaign.title || entry.campaign.name || entry.campaign.id,
    identity: {
      kind: 'world-play',
      campaignKey: campaignIdentity,
      sourcePackId,
      ...(level ? { levelId: level.id, levelRevision: level.revision } : {}),
    },
  };
}

/** Difficulty projection may change rules, not silently substitute another map.
 * The authored identity stays in the replacement ticket while the execution
 * catalog owns the projected runtime entry.
 */
export function installedMissionExecutionIndex(target, executionEntry, fallbackIndex) {
  if (target.levelIndex === null) return fallbackIndex;
  const level = executionEntry.campaign.levels[target.levelIndex];
  if (!level || level.id !== target.identity.levelId)
    throw new Error('The selected difficulty cannot launch that exact mission.');
  return target.levelIndex;
}
