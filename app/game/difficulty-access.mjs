import { boundedJSON, exactKeys, plainObject, required, stableId } from './data-json.mjs';
import { createDifficultyContext } from './campaign-difficulty.mjs';
import {
  emptyProgress,
  validateProgress,
  appearanceMilestones,
  unlockedBodies,
} from './progress.mjs';
import { campaignContinuation } from './continuation.mjs';

const freeze = (value) => {
  if (value && typeof value === 'object') {
    for (const child of Object.values(value)) freeze(child);
    Object.freeze(value);
  }
  return value;
};

function statistics(value, withVariants = false) {
  exactKeys(
    value,
    ['score', 'time', 'medals', 'clean', ...(withVariants ? ['variants'] : [])],
    'access statistics',
  );
  // Match the existing library's retained-statistic bounds; validateProgress
  // separately validates the selected campaign's class/route identities.
  required(
    Number.isFinite(value.score) &&
      value.score >= 0 &&
      value.score <= 1e9 &&
      Number.isFinite(value.time) &&
      value.time >= 0 &&
      value.time <= 7200 &&
      Number.isInteger(value.medals) &&
      value.medals >= 1 &&
      value.medals <= 3 &&
      typeof value.clean === 'boolean',
    'Invalid access statistics.',
  );
  if (withVariants) {
    required(
      plainObject(value.variants) &&
        Object.keys(value.variants).length >= 1 &&
        Object.keys(value.variants).length <= 256,
      'Invalid access variants.',
    );
    for (const [key, variant] of Object.entries(value.variants)) {
      required((key.split('/')[2]?.length ?? 0) <= 240, 'Invalid access revision.');
      statistics(variant);
    }
  }
}

function progressAt(campaigns, context) {
  const descriptor = Object.getOwnPropertyDescriptor(campaigns, context.campaignKey);
  if (!descriptor) return emptyProgress(context.campaign);
  required(
    descriptor.enumerable && Object.hasOwn(descriptor, 'value'),
    'Difficulty progress must be own JSON data.',
  );
  const progress = boundedJSON(descriptor.value, {
    maxBytes: 4 * 1024 * 1024,
    maxNodes: 400000,
    maxDepth: 16,
    maxArray: 4096,
    maxString: 4096,
  });
  exactKeys(
    progress,
    ['version', 'campaignId', 'revision', 'clears', 'seen'],
    'difficulty progress',
  );
  required(
    plainObject(progress.clears) && Object.keys(progress.clears).length <= 128,
    'Difficulty progress needs bounded readable clears.',
  );
  for (const [id, clear] of Object.entries(progress.clears)) {
    required(stableId(id), 'Invalid access map identity.');
    statistics(clear, true);
  }
  required(
    Array.isArray(progress.seen) &&
      progress.seen.every((id) => typeof id === 'string' && id.trim().length > 0),
    'Invalid access run identities.',
  );
  const ids = new Set(context.campaign.levels.map((level) => level.id));
  // Retained unknown map IDs confer no access. Only declared, structurally valid
  // clears from these exact two campaign keys participate in this view.
  progress.clears = Object.fromEntries(
    Object.entries(progress.clears).filter(([id]) => ids.has(id)),
  );
  required(
    validateProgress(progress, context.campaign),
    'Difficulty progress does not match its campaign.',
  );
  return progress;
}

/** Access only: no returned progress/score object can be passed to an award writer. */
export function difficultyAccess(baseCampaign, campaigns = {}) {
  required(plainObject(campaigns), 'Difficulty access needs a campaign progress map.');
  const standard = createDifficultyContext(baseCampaign, 'standard'),
    gentle = createDifficultyContext(baseCampaign, 'gentle'),
    standardProgress = progressAt(campaigns, standard),
    gentleProgress = progressAt(campaigns, gentle),
    projection = emptyProgress(standard.campaign);
  const levels = standard.campaign.levels.map((level, index) => {
    const standardCleared = Object.hasOwn(standardProgress.clears, level.id),
      gentleCleared = Object.hasOwn(gentleProgress.clears, level.id);
    // Existing appearance/continuation helpers receive an internal owned count
    // projection. Its statistics are never exported, compared, or persisted.
    if (standardCleared || gentleCleared)
      projection.clears[level.id] =
        standardProgress.clears[level.id] ?? gentleProgress.clears[level.id];
    return {
      levelId: level.id,
      standardCleared,
      gentleCleared,
      completed: standardCleared || gentleCleared,
      playable:
        index === 0 ||
        standardCleared ||
        gentleCleared ||
        Object.hasOwn(projection.clears, standard.campaign.levels[index - 1].id),
    };
  });
  const continuation = campaignContinuation(projection, standard.campaign);
  return freeze({
    baseCampaignKey: standard.campaignKey,
    standardCampaignKey: standard.campaignKey,
    gentleCampaignKey: gentle.campaignKey,
    completedLevelIds: levels.filter((level) => level.completed).map((level) => level.levelId),
    count: continuation.completed,
    total: continuation.total,
    complete: continuation.complete,
    nextLevelIndex: continuation.levelIndex,
    levels,
    milestones: appearanceMilestones(projection, standard.campaign),
    unlockedBodyIds: [...unlockedBodies(projection, standard.campaign)],
  });
}

/** Host calls only around a real completion; imports never emit events here. */
export function newDifficultyAppearanceBodies(baseCampaign, beforeCampaigns, afterCampaigns) {
  const before = new Set(difficultyAccess(baseCampaign, beforeCampaigns).unlockedBodyIds);
  return difficultyAccess(baseCampaign, afterCampaigns).unlockedBodyIds.filter(
    (id) => !before.has(id),
  );
}
