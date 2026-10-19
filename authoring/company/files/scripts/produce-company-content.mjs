import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { format, resolveConfig } from 'prettier';
import { canonicalJSON, required } from '../game/data-json.mjs';
import { createEditionRuntimeCatalog } from '../game/editions/model.mjs';
import { compileContentProject, resolveMission } from '../game/content-design/project.mjs';
import {
  COMPANY_BRANDS,
  COMPANY_EDITIONS,
  createCompanyThemes,
  createCompanyPresets,
} from '../game/company-campaigns/brands.mjs';
import { COMPANY_CAMPAIGNS } from '../game/company-campaigns/catalog.mjs';

import { COMPANY_LESSONS } from '../game/company-campaigns/lessons.mjs';
import { createCompanyProject } from '../game/company-campaigns/content.mjs';
import { selectCurrentCompanyArtwork } from '../game/company-campaigns/artwork.mjs';

import { campaignLocalizationSha256 } from '../game/editions/localization.mjs';
import {
  COMPANY_REWARD_CAMPAIGN_IDS,
  createCompanyRewards,
} from '../game/company-campaigns/rewards.mjs';
import { createRewardMissionBindings } from '../game/rewards/bindings.mjs';
import {
  COMPANY_LEARNING_REWARD_CAMPAIGN_IDS,
  createCompanyLearningRewards,
} from '../game/company-campaigns/learning-rewards.mjs';
import {
  completionRewardAssetReferences,
  validateCompletionRewards,
} from '../game/rewards/model.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const bytes = (value) => Buffer.from(canonicalJSON(value) + '\n');

/** Build-time authoring exports are projected to independent JSON. No runtime
 * import of this module, brand registry or complete lesson factory is necessary. */
export async function produceCompanyContent({
  assets,
  artwork = [],
  assetSources = [],
  classes = [],
}) {
  const files = new Map(),
    projects = new Map();
  const factories = new Map([
    ...COMPANY_CAMPAIGNS.map((entry) => [
      entry.id,
      {
        project: createCompanyProject,
        rewards: COMPANY_REWARD_CAMPAIGN_IDS.includes(entry.id)
          ? createCompanyRewards
          : COMPANY_LEARNING_REWARD_CAMPAIGN_IDS.includes(entry.id)
            ? createCompanyLearningRewards
            : null,
      },
    ]),
  ]);
  const campaigns = await Promise.all(
    COMPANY_CAMPAIGNS.map(async (definition) => {
      const factory = factories.get(definition.id);
      const source = factory.project({
        assets,
        brandId: definition.brandId,
        campaignId: definition.id,
        artwork,
      });
      const project = compileContentProject(source);
      projects.set(definition.id, project);
      files.set(definition.sourcePath, bytes(source));
      const selectedLessons = COMPANY_LESSONS.filter((lesson) =>
        definition.missionIds.includes(lesson.missionId),
      );
      const lessonPath = selectedLessons.length
        ? `game/content/company-campaigns/${definition.id}.lessons.json`
        : null;
      if (lessonPath) files.set(lessonPath, bytes(selectedLessons));
      const assetIds = source.assets.map((asset) => {
        const descriptor = assets.find(
          (entry) =>
            entry.path === `game/${asset.path}` &&
            entry.sha256 === asset.sha256 &&
            entry.bytes === asset.bytes,
        );
        required(descriptor, `Campaign artwork has no exact public inventory entry: ${asset.id}.`);
        return descriptor.id;
      });
      const keyPicture = selectCurrentCompanyArtwork(artwork).find(
        (asset) => asset.id === `${definition.id}-key-picture`,
      );
      const heroAsset =
        keyPicture &&
        assets.find(
          (asset) =>
            asset.path === `game/${keyPicture.path}` &&
            asset.sha256 === keyPicture.sha256 &&
            asset.bytes === keyPicture.bytes,
        );
      required(!keyPicture || heroAsset, 'Campaign key art has no exact inventory entry.');
      if (heroAsset && !assetIds.includes(heroAsset.id)) assetIds.push(heroAsset.id);
      for (const assetId of definition.rewardAssetIds ?? []) {
        required(
          assets.some((asset) => asset.id === assetId),
          `Missing declared reward dependency: ${assetId}.`,
        );
        if (!assetIds.includes(assetId)) assetIds.push(assetId);
      }
      const rewardPath = factory.rewards
        ? `game/content/company-campaigns/${definition.id}.rewards.json`
        : null;
      if (rewardPath) {
        const rewards = validateCompletionRewards(
          factory.rewards({
            definition,
            source,
            assets,
            assetSources,
            missionBindings: createRewardMissionBindings(source),
            lessons: selectedLessons,
          }),
        );
        for (const reference of completionRewardAssetReferences(rewards))
          required(
            assetIds.includes(reference.assetId),
            `Reward artwork is not admitted by its campaign: ${reference.assetId}.`,
          );
        files.set(rewardPath, bytes(rewards));
      }
      const localizationPath = factory.localization
        ? `game/content/company-campaigns/${definition.id}.localization.json`
        : null;
      const localization = factory.localization?.({ definition, source });
      if (localizationPath) files.set(localizationPath, bytes(localization));
      return {
        id: definition.id,
        revision: definition.revision,
        name: definition.name,
        brandId: definition.brandId,
        publication: definition.publication,
        sourcePath: definition.sourcePath,
        assetIds: [...new Set(assetIds)],
        ...(heroAsset ? { heroAssetId: heroAsset.id } : {}),
        modes: definition.modes,
        ...(lessonPath ? { lessonPath } : {}),
        ...(rewardPath ? { rewardPath } : {}),
        ...(localizationPath
          ? { localizationPath, localizationSha256: await campaignLocalizationSha256(localization) }
          : {}),
      };
    }),
  );
  for (const edition of COMPANY_EDITIONS) {
    const project = projects.get(edition.entryCampaignId),
      themes = createCompanyThemes(edition.brandId);
    const campaign = {
      version: 'xonix-campaign.v1',
      id: edition.entryCampaignId,
      revision: project.campaigns[0].revision,
      title: project.campaigns[0].name,
      levels: project.missions.map(
        (mission) =>
          resolveMission(project, mission.id, { mode: 'solo', difficulty: 'standard' }).level,
      ),
    };
    const boot = {
      campaign,
      themes: { version: 'xonix-themes.v1', themes },
      presets: createCompanyPresets(edition.brandId),
      classes,
      packs: { format: 'xonix-pack-index.v1', packs: [] },
      archives: { format: 'xonix-pack-index.v1', packs: [] },
    };
    for (const [name, file] of Object.entries(edition.boot)) {
      const content = bytes(boot[name]);
      required(
        !files.has(file) || files.get(file).equals(content),
        'Shared company boot files conflict.',
      );
      files.set(file, content);
    }
  }
  const catalog = createEditionRuntimeCatalog({
    brands: COMPANY_BRANDS,
    editions: COMPANY_EDITIONS,
    campaigns,
    assets,
    defaultEditionId: 'coupa-all',
  });
  files.set('game/editions/catalog.json', bytes(catalog));
  const formatting = await resolveConfig(fileURLToPath(import.meta.url));
  for (const [file, source] of files)
    files.set(
      file,
      Buffer.from(await format(source.toString('utf8'), { ...formatting, parser: 'json' })),
    );
  return Object.freeze({ files, catalog });
}

async function main(args) {
  required(
    args.every((arg) => arg === '--check'),
    'Use --check to verify generated company content.',
  );
  const assets = JSON.parse(
    await fs.readFile(path.join(root, 'game/editions/assets.json'), 'utf8'),
  );
  const classes = JSON.parse(
    await fs.readFile(path.join(root, 'game/content/classes.json'), 'utf8'),
  );
  let artwork = [];
  try {
    artwork = JSON.parse(await fs.readFile(path.join(root, 'game/editions/artwork.json'), 'utf8'));
  } catch (error) {
    if (error.code !== 'ENOENT') throw error;
  }
  const assetSources = JSON.parse(
    await fs.readFile(path.join(root, 'game/editions/asset-sources.json'), 'utf8'),
  ).assets;
  const result = await produceCompanyContent({ assets, artwork, assetSources, classes });
  for (const [file, data] of result.files) {
    const target = path.join(root, file);
    if (args.includes('--check'))
      required(
        (await fs.readFile(target)).equals(data),
        `Generated company content is stale: ${file}.`,
      );
    else {
      await fs.mkdir(path.dirname(target), { recursive: true });
      await fs.writeFile(target, data);
    }
  }
  process.stdout.write(
    `${args.includes('--check') ? 'Verified' : 'Generated'} ${result.files.size} company files.\n`,
  );
}
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href)
  main(process.argv.slice(2)).catch((error) => {
    process.stderr.write(`${error.message}\n`);
    process.exitCode = 1;
  });
