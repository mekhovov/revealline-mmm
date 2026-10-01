import { rewardMediaReferences, validateRewardMediaAsset } from '../rewards/media-format.mjs';
import { explorationAssetReferences } from '../rewards/exploration.mjs';
import { required } from '../data-json.mjs';
import { compileContentProject } from '../content-design/project.mjs';
import { validateCompanyLessons } from '../company-campaigns/learning.mjs';
import { validateCompletionRewards, completionRewardAssetReferences } from '../rewards/model.mjs';
import { createRewardMissionBindings } from '../rewards/bindings.mjs';
import { completionLearningReference } from '../rewards/learning.mjs';
import { COMPLETION_REWARD_PAYLOAD_TYPES } from '../rewards/capabilities.mjs';
import { validateDiscoveryRewardBindings } from '../content-design/discovery-schema.mjs';
import { resolveJourneyMasteryRequirement } from '../mastery-journey.mjs';
import { createRewardCosmeticRegistry, resolveRewardCosmetic } from '../rewards/cosmetics.mjs';

/** Exact player campaign projection: invisible missions, archived maps and
 * unreferenced media are source material, not runtime dependencies. */
export function validateEditionCampaignProject(source, descriptor) {
  const project = compileContentProject(source),
    value = project.source;
  required(
    value.campaigns.length === 1 &&
      value.campaigns[0].id === descriptor.id &&
      value.campaigns[0].revision === descriptor.revision,
    'Campaign source differs from its selected identity.',
  );
  if (!descriptor.rewardPath) validateDiscoveryRewardBindings(value, [], descriptor.id);
  const missionIds = new Set(value.campaigns[0].missionIds);
  required(
    value.missions.length === missionIds.size &&
      value.missions.every((mission) => missionIds.has(mission.id)),
    'Campaign source contains omitted missions.',
  );
  const mapIds = new Set(
    value.missions.map((mission) => `${mission.map.id}@${mission.map.revision}`),
  );
  required(
    value.maps.length === mapIds.size &&
      value.maps.every((map) => mapIds.has(`${map.id}@${map.revision}`)),
    'Campaign source contains unused map history.',
  );
  const assetIds = new Set(
    value.missions.map((mission) => mission.presentation.backgroundAssetId).filter(Boolean),
  );
  required(
    (value.assets ?? []).length === assetIds.size &&
      (value.assets ?? []).every((asset) => assetIds.has(asset.id)),
    'Campaign source contains unused artwork.',
  );
  required(
    value.packs.length > 0 &&
      value.packs.every(
        (pack) => pack.campaignIds.length === 1 && pack.campaignIds[0] === descriptor.id,
      ),
    'Campaign source contains omitted pack content.',
  );
  return project;
}

export function validateEditionLessonBundle(lessons, project) {
  lessons = validateCompanyLessons(lessons);
  const missionIds = new Set(project.missions.map((mission) => mission.id));
  required(
    Array.isArray(lessons) &&
      lessons.length <= 512 &&
      lessons.every(
        (lesson) =>
          lesson &&
          typeof lesson === 'object' &&
          missionIds.has(lesson.missionId) &&
          project.campaigns.some((campaign) => campaign.id === lesson.campaignId),
      ),
    'Lesson bundle contains omitted missions.',
  );
  required(
    new Set(lessons.map((lesson) => lesson.id)).size === lessons.length,
    'Lesson bundle contains conflicting identities.',
  );
  return lessons;
}

/** Rewards may describe only this exact selected campaign. Owning the sidecar
 * does not authorize a completion: accepted Journey clears remain the authority. */
export function validateEditionRewardBundle(
  source,
  project,
  {
    descriptor,
    assets = [],
    editionId,
    editionProject = project,
    lessons = [],
    presets,
    themes = [],
  } = {},
) {
  const rewards = validateCompletionRewards(source);
  required(
    rewards.every((reward) => !reward.requirements.practice?.length),
    'Arcade editions do not admit optional practice requirements without a selected practice adapter.',
  );
  const compiled = compileContentProject(project);
  required(
    descriptor && compiled.campaigns.some((campaign) => campaign.id === descriptor.id),
    'Reward campaign is not selected.',
  );
  validateDiscoveryRewardBindings(compiled.source, rewards, descriptor.id);
  const bindings = new Map(
    createRewardMissionBindings(compiled).map((row) => [row.missionId, row]),
  );
  const editionBindings = rewards.some((reward) => reward.scope.kind === 'edition')
    ? new Map(createRewardMissionBindings(editionProject).map((row) => [row.missionId, row]))
    : bindings;
  const learning = validateCompanyLessons(lessons).map((lesson) => ({
    campaignId: lesson.campaignId,
    reference: completionLearningReference(lesson),
  }));
  const cosmeticRegistry = rewards.some((reward) =>
    reward.payloads.some((payload) => payload.type === 'cosmetic'),
  )
    ? createRewardCosmeticRegistry({ presets, assets, themes, publication: descriptor.publication })
    : [];
  for (const reward of rewards) {
    required(
      reward.brandId === descriptor.brandId && reward.campaignId === descriptor.id,
      'Reward belongs to another campaign or brand.',
    );
    required(
      reward.scope.kind === 'mission'
        ? bindings.has(reward.scope.id)
        : reward.scope.kind === 'campaign'
          ? reward.scope.id === descriptor.id
          : reward.scope.id === editionId,
      'Reward scope is outside the selected edition campaign.',
    );
    for (const requirement of reward.requirements.missions) {
      const allowed = (reward.scope.kind === 'edition' ? editionBindings : bindings).get(
        requirement.missionId,
      );
      required(
        allowed && (reward.scope.kind === 'edition' || allowed.campaignId === descriptor.id),
        'Reward requires an omitted mission.',
      );
      required(
        requirement.bindings.every((binding) =>
          allowed.bindings.some(
            (known) =>
              known.difficulty === binding.difficulty && known.gameplayId === binding.gameplayId,
          ),
        ),
        'Reward gameplay binding differs from the selected mission.',
      );
    }
    for (const requirement of reward.requirements.learning) {
      const lesson = learning.find((entry) =>
        Object.entries(entry.reference).every(([key, value]) => requirement[key] === value),
      );
      const mission = (reward.scope.kind === 'edition' ? editionBindings : bindings).get(
        requirement.missionId,
      );
      required(
        lesson &&
          mission &&
          lesson.campaignId === mission.campaignId &&
          (reward.scope.kind === 'edition' || lesson.campaignId === descriptor.id),
        'Reward learning requirement differs from an exact selected lesson.',
      );
    }
    for (const requirement of reward.requirements.mastery) {
      resolveJourneyMasteryRequirement(requirement);
      const mission = (reward.scope.kind === 'edition' ? editionBindings : bindings).get(
        requirement.missionId,
      );
      required(
        mission && (reward.scope.kind === 'edition' || mission.campaignId === descriptor.id),
        'Reward mastery requires an exact selected Solo Journey mission.',
      );
    }
    if (reward.teaserImage) {
      const teaserAsset = assets.find((item) => item.id === reward.teaserImage.asset.assetId);
      required(teaserAsset, 'Reward teaser is missing from the selected asset closure.');
      validateRewardMediaAsset(teaserAsset, 'poster');
    }
    for (const payload of reward.payloads) {
      required(
        COMPLETION_REWARD_PAYLOAD_TYPES.includes(payload.type),
        `Completion reward ${payload.type} needs a registered player viewer before export.`,
      );
      if (payload.type === 'cosmetic') {
        const cosmetic = resolveRewardCosmetic(cosmeticRegistry, payload);
        if (reward.teaserImage && cosmetic.image)
          required(
            reward.teaserImage.asset.assetId !== cosmetic.image.assetId &&
              reward.teaserImage.asset.sha256 !== cosmetic.image.sha256,
            'Reward teaser artwork must be separate from its earned cosmetic image.',
          );
      }
      for (const { role, reference } of rewardMediaReferences(payload))
        validateRewardMediaAsset(
          assets.find((item) => item.id === reference.assetId),
          role,
        );
      const images =
        payload.type === 'image'
          ? [payload.asset]
          : payload.type === 'exploration'
            ? explorationAssetReferences(payload.recipe)
            : [];
      for (const image of images) {
        const asset = assets.find((item) => item.id === image.assetId);
        required(
          asset && /\.(?:png|jpe?g|webp)$/i.test(asset.path),
          'Completion reward images require a supported raster image.',
        );
      }
    }
  }
  for (const reference of completionRewardAssetReferences(rewards)) {
    const asset = assets.find((item) => item.id === reference.assetId);
    required(
      asset && asset.sha256 === reference.sha256 && asset.approved,
      'Reward media differs from the selected approved asset closure.',
    );
    required(
      descriptor.publication !== 'public' || asset.publication === 'public',
      'Reward media is not public.',
    );
  }
  return rewards;
}
