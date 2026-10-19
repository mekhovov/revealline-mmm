import { readFile } from 'node:fs/promises';
import { createStarterProject } from '../../content-design/starter.mjs';
import { compileContentProject, resolveMission } from '../../content-design/project.mjs';
import { createEditionRuntimeCatalog } from '../../editions/model.mjs';
import { createCompanyWorkspaceFiles } from '../../../scripts/company-studio.mjs';

export async function editionProviderFixture() {
  const source = createStarterProject('shared-host-fixture');
  source.policyId = 'journey-trail-impact-v3';
  source.actorCatalogId = 'journey-actors-v9';
  source.difficultyCatalogId = 'journey-difficulty-v2';
  const brand = {
    format: 'revealline-brand-pack.v1',
    id: 'sample',
    revision: 1,
    name: 'Sample company',
    description: 'Test edition',
    publication: 'public',
    themeId: 'sample-theme',
    actorSetId: 'sample-actors',
    logoAssetId: null,
    heroAssetId: null,
    assetIds: [],
  };
  const template = createCompanyWorkspaceFiles({ brandId: 'fixture', name: 'Synthetic fixture' });
  const templateBoot = template.catalog.editions[0].boot;
  const theme = { ...JSON.parse(template.files.get(templateBoot.themes)).themes[0], id: brand.themeId };
  for (const mission of source.missions) mission.presentation.themeId = theme.id;
  const project = compileContentProject(source);
  const campaign = {
    id: source.campaigns[0].id,
    revision: source.campaigns[0].revision,
    name: source.campaigns[0].name,
    brandId: brand.id,
    publication: 'public',
    sourcePath: 'game/content/sample/project.json',
    assetIds: [],
    modes: ['solo'],
  };
  const boot = Object.fromEntries(
    ['campaign', 'themes', 'presets', 'classes', 'packs', 'archives'].map((key) => [
      key,
      `game/content/sample/${key}.json`,
    ]),
  );
  const edition = {
    format: 'revealline-edition.v1',
    id: 'sample-public',
    revision: 1,
    name: 'Sample public',
    brandId: brand.id,
    audience: 'everyone',
    campaignIds: [campaign.id],
    entryCampaignId: campaign.id,
    modes: ['solo'],
    publication: 'public',
    boot,
  };
  const presets = JSON.parse(template.files.get(templateBoot.presets));
  Object.values(presets.characters).forEach((body) => {
    body.src = null;
  });
  const catalog = createEditionRuntimeCatalog({
    brands: [brand],
    editions: [edition],
    campaigns: [campaign],
    assets: [],
    defaultEditionId: edition.id,
  });
  const data = {
    campaign: {
      version: 'xonix-campaign.v1',
      id: campaign.id,
      revision: campaign.revision,
      title: campaign.name,
      levels: project.missions.map(
        (mission) => resolveMission(project, mission.id, { difficulty: 'standard' }).level,
      ),
    },
    themes: { version: 'xonix-themes.v1', themes: [theme] },
    presets,
    classes: JSON.parse(
      await readFile(new URL('../../content/classes.json', import.meta.url), 'utf8'),
    ),
    packs: { format: 'xonix-pack-index.v1', packs: [] },
    archives: { format: 'xonix-pack-index.v1', packs: [] },
  };
  const files = new Map([
    ['game/editions/catalog.json', catalog],
    ['edition-catalog.json', catalog],
    [campaign.sourcePath, source],
    ...Object.entries(boot).map(([key, path]) => [path, data[key]]),
  ]);
  const requests = [];
  const fetcher = async (url) => {
    const path = new URL(url, 'http://localhost/game/').pathname.slice(1);
    if (!files.has(path)) return undefined;
    requests.push(path);
    return new Response(JSON.stringify(files.get(path)));
  };
  return { source, project, catalog, data, files, requests, fetcher };
}
