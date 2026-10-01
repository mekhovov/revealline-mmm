import { validateCampaignFeedback } from '../journey/campaign-feedback.mjs';
import { exactKeys, required, stableId } from '../data-json.mjs';

export const DISCOVERY_PACING_BEATS = Object.freeze([
  'discover',
  'choose',
  'combine',
  'breathe',
  'mastery',
  'resolve',
]);
export const DISCOVERY_EXHIBIT_LAYOUTS = Object.freeze(['route', 'gallery', 'mosaic']);

export function validateDiscoveryRewardRef(value) {
  exactKeys(value, ['id', 'revision'], 'discovery reward reference');
  required(
    stableId(value.id) &&
      typeof value.revision === 'string' &&
      value.revision.trim().length > 0 &&
      value.revision.length <= 128,
    'Discovery rewards require an ID and exact revision.',
  );
}

export function validateMissionDiscovery(design) {
  if (design.pacingBeat !== undefined)
    required(DISCOVERY_PACING_BEATS.includes(design.pacingBeat), 'Unknown discovery pacing beat.');
  if (design.rewardRef !== undefined) validateDiscoveryRewardRef(design.rewardRef);
}

export function validateCampaignDiscovery(value) {
  exactKeys(value, ['exhibitLayout', 'finaleRewardRef', 'feedback'], 'campaign discovery');
  required(
    DISCOVERY_EXHIBIT_LAYOUTS.includes(value.exhibitLayout),
    'Unknown discovery exhibit layout.',
  );
  if (value.feedback !== undefined) validateCampaignFeedback(value.feedback);
  if (value.finaleRewardRef !== undefined) validateDiscoveryRewardRef(value.finaleRewardRef);
}

/** Resolve authored presentation links against the selected authoritative sidecar.
 * A teaser link never creates or changes the reward's explicit requirements. */
export function validateDiscoveryRewardBindings(project, rewards, campaignId) {
  const campaign = project.campaigns.find((item) => item.id === campaignId);
  required(campaign, 'Discovery campaign is missing.');
  const match = (ref, scope, id) => {
    if (!ref) return;
    const reward = rewards.find((item) => item.id === ref.id && item.revision === ref.revision);
    required(
      reward &&
        reward.campaignId === campaignId &&
        reward.scope.kind === scope &&
        reward.scope.id === id,
      'Discovery reward reference is missing, stale or outside its scope.',
    );
  };
  for (const mission of project.missions.filter((item) => campaign.missionIds.includes(item.id)))
    match(mission.design.rewardRef, 'mission', mission.id);
  match(campaign.discovery?.finaleRewardRef, 'campaign', campaign.id);
}
