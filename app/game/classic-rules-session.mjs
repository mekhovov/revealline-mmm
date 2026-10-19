import { boundedJSON, canonicalJSON, exactKeys, required } from './data-json.mjs';
import { createDifficultyContext } from './campaign-difficulty.mjs';
import {
  CLASSIC_RULES_CURRENT,
  projectClassicCurrentRulesEntry,
} from './mission-library/classic-current-rules.mjs';

/** A saved original is evidence to compare with the installed execution, never
 * a campaign to install or an authority to select new pictures. */
export function classicRulesSessionPictureContext(source, { campaignKey, levelId, campaign }) {
  const owned = boundedJSON(source, {
    maxBytes: 16 * 1024 * 1024,
    maxNodes: 400000,
    maxDepth: 24,
    maxArray: 4096,
    maxString: 65536,
  });
  exactKeys(owned, ['campaign', 'difficulty'], 'Current rules picture source');
  required(
    ['standard', 'gentle'].includes(owned.difficulty),
    'Current rules saves need their explicit difficulty.',
  );
  const projected = projectClassicCurrentRulesEntry(
    { campaign: owned.campaign },
    CLASSIC_RULES_CURRENT,
  );
  const execution = createDifficultyContext(projected.campaign, owned.difficulty);
  required(
    execution.campaignKey === campaignKey &&
      (campaign === undefined || canonicalJSON(execution.campaign) === canonicalJSON(campaign)),
    'Saved Current rules picture source differs from the installed execution.',
  );
  const original = createDifficultyContext(owned.campaign, owned.difficulty);
  const level = original.campaign.levels.find((item) => item.id === levelId);
  required(level, 'Saved Current rules picture mission is unavailable in its original.');
  return {
    source: owned,
    campaignKey: original.campaignKey,
    level,
    executionCampaign: execution.campaign,
  };
}
