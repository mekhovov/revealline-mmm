import { freezeDesign } from './catalogs.mjs';

// Display metadata belongs to the immutable campaign created by the execution
// owner. Caller-frozen copies and saved/imported wrapper fields are not owners.
const labels = new WeakMap();
export const ownedContentExecutionLabel = (campaign) => labels.get(campaign);

/** Construct the existing execution entry after its source/preset resolution. */
export function createContentExecutionEntry({
  standard,
  base,
  resolved,
  difficulty,
  baseCampaignKey,
  executionKey,
  campaignFeedback,
}) {
  const entry = freezeDesign({
    campaign: resolved.runtime,
    baseCampaign: base.runtime,
    baseCampaignKey,
    executionKey,
    difficulty,
    policyVersion: standard.policyId,
    sourceProjectId: standard.projectId,
    sourcePackId: base.packId,
    campaignId: base.campaignId,
    manifests: resolved.manifests,
    ...(campaignFeedback ? { campaignFeedback } : {}),
    officialProgressEligible: false,
  });
  if (standard.mode === 'solo')
    labels.set(
      entry.campaign,
      Object.freeze({
        executionKey,
        baseCampaignKey,
        difficulty,
        policyVersion: entry.policyVersion,
      }),
    );
  return entry;
}
