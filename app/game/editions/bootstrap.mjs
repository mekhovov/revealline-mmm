import { boundedJSON, canonicalJSON, required } from '../data-json.mjs';
import { compileContentProject } from '../content-design/project.mjs';
import {
  validateEditionCampaignProject,
  validateEditionLessonBundle,
  validateEditionRewardBundle,
} from './project.mjs';
import { validateCompletionRewards } from '../rewards/model.mjs';
import { verifyCampaignLocalization } from './localization.mjs';
import { validateEditionPresentation } from './presets.mjs';
import {
  freezeEdition,
  resolveEditionSelection,
  resolveEditionAssets,
  validateEditionRuntimeCatalog,
} from './model.mjs';

/** Merge only already-selected, individually validated projects. Conflicting
 * immutable records fail rather than letting fetch order change a campaign. */
export function mergeEditionProjects(selection, sources) {
  required(
    Array.isArray(sources) && sources.length === selection.campaigns.length && sources.length > 0,
    'Every selected campaign needs its own project.',
  );
  const projects = sources.map(
      (source, index) => validateEditionCampaignProject(source, selection.campaigns[index]).source,
    ),
    first = projects[0];
  for (let i = 0; i < projects.length; i++) {
    const project = projects[i],
      descriptor = selection.campaigns[i];
    required(
      project.campaigns.length === 1 &&
        project.campaigns[0].id === descriptor.id &&
        project.campaigns[0].revision === descriptor.revision,
      'Campaign source differs from its selected identity.',
    );
    for (const key of ['policyId', 'actorCatalogId', 'difficultyCatalogId'])
      required(
        project[key] === first[key],
        'Edition campaigns require compatible gameplay catalogs.',
      );
  }
  const merged = {
    ...first,
    id: `edition-${selection.edition.id}`,
    revision: String(selection.edition.revision),
    name: selection.edition.name,
  };
  for (const key of ['maps', 'missions', 'campaigns', 'packs', 'assets']) {
    const records = new Map();
    for (const project of projects)
      for (const record of project[key] ?? []) {
        const id = key === 'maps' ? `${record.id}@${record.revision}` : record.id;
        required(
          !records.has(id) || canonicalJSON(records.get(id)) === canonicalJSON(record),
          'Edition has conflicting gameplay records.',
        );
        records.set(id, record);
      }
    merged[key] = [...records.values()];
  }
  return compileContentProject(merged).source;
}

/** Fetches the catalog before any company content. An absent optional catalog
 * preserves the existing game; a requested but unavailable edition fails closed.
 * Paths are relative to the build root, which the caller can explicitly supply
 * for a development catalog kept under game/editions/. */
export async function loadEditionBootstrap({
  fetcher = globalThis.fetch,
  catalogURL = 'edition-catalog.json',
  contentBaseURL = new URL(
    './',
    new URL(catalogURL, globalThis.location?.href ?? 'http://localhost/'),
  ).href,
  editionId,
  campaignId,
  allowMissing = true,
} = {}) {
  required(typeof fetcher === 'function', 'Edition loading requires a fetch function.');
  const response = await fetcher(catalogURL);
  if (response.status === 404 && allowMissing && editionId === undefined) return null;
  required(response.ok, 'The selected edition catalog is unavailable.');
  const catalog = validateEditionRuntimeCatalog(await response.text());
  const selection = resolveEditionSelection(catalog, { editionId, campaignId });
  const read = async (file) => {
    const result = await fetcher(new URL(file, contentBaseURL).href);
    required(result.ok, `Edition content is unavailable: ${file}.`);
    return boundedJSON(await result.text(), {
      maxBytes: 4 * 1024 * 1024,
      maxNodes: 100000,
      maxArray: 4096,
    });
  };
  const sources = await Promise.all(
    selection.campaigns.map((campaign) => read(campaign.sourcePath)),
  );
  const source = mergeEditionProjects(selection, sources);
  const boot = selection.edition.boot
    ? Object.fromEntries(
        await Promise.all(
          Object.entries(selection.edition.boot).map(async ([name, file]) => [
            name,
            await read(file),
          ]),
        ),
      )
    : null;
  const lessons = Object.fromEntries(
    await Promise.all(
      selection.campaigns
        .filter((campaign) => campaign.lessonPath)
        .map(async (campaign) => [
          campaign.id,
          validateEditionLessonBundle(
            await read(campaign.lessonPath),
            sources[selection.campaigns.indexOf(campaign)],
          ),
        ]),
    ),
  );
  const rewards = Object.fromEntries(
    await Promise.all(
      selection.campaigns
        .filter((campaign) => campaign.rewardPath)
        .map(async (campaign) => [
          campaign.id,
          validateEditionRewardBundle(
            await read(campaign.rewardPath),
            sources[selection.campaigns.indexOf(campaign)],
            {
              descriptor: campaign,
              editionId: selection.edition.id,
              presets: boot?.presets,
              themes: boot?.themes?.themes ?? [],
              editionProject: source,
              lessons: Object.values(lessons).flat(),
              assets: resolveEditionAssets(catalog, { editionId: selection.edition.id }),
            },
          ),
        ]),
    ),
  );
  validateCompletionRewards(Object.values(rewards).flat());
  const localizations = Object.fromEntries(
    await Promise.all(
      selection.campaigns
        .filter((campaign) => campaign.localizationPath)
        .map(async (campaign) => [
          campaign.id,
          await verifyCampaignLocalization(
            await read(campaign.localizationPath),
            sources[selection.campaigns.indexOf(campaign)],
            campaign,
          ),
        ]),
    ),
  );
  if (boot)
    validateEditionPresentation({
      catalog,
      editionId: selection.edition.id,
      themes: boot.themes,
      presets: boot.presets,
    });
  const route = freezeEdition({
    id: selection.edition.id,
    label: selection.edition.name,
    profileKey: `journey-${selection.edition.id}`,
    sessionKey: `revealline-mmm.suspended.journey-${selection.edition.id}.v1`,
    corePackIds: source.packs.map((pack) => pack.id),
    optionalCampaignIds: [],
    preserveOriginalThemes: true,
    source,
  });
  return freezeEdition({
    catalog,
    selection,
    sources,
    source,
    boot,
    lessons,
    route,
    ...(Object.keys(rewards).length ? { rewards } : {}),
    ...(Object.keys(localizations).length ? { localizations } : {}),
  });
}
