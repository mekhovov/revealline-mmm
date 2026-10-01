import { boundedJSON, exactKeys, required, stableId } from '../data-json.mjs';
import { editionIdentityId } from '../edition-context.mjs';

export const EDITION_FORMATS = Object.freeze({
  brand: 'revealline-brand-pack.v1',
  edition: 'revealline-edition.v1',
  catalog: 'revealline-edition-catalog.v1',
});
export const EDITION_LIMITS = Object.freeze({
  brands: 32,
  editions: 128,
  campaigns: 512,
  assets: 4096,
});
export const EDITION_BOOT_KEYS = Object.freeze([
  'campaign',
  'themes',
  'presets',
  'classes',
  'packs',
  'archives',
]);
const publications = ['public', 'restricted'];
const modes = ['solo', 'versus', 'team'];
// Only this module's completely validated, deeply frozen results are reusable.
// A caller's frozen object or a mutable imported catalogue is never trusted.
// Weak ownership lets an old presentation and all its derived closures retire.
const validatedCatalogs = new WeakSet();
const assetClosures = new WeakMap();
const own = (source) =>
  boundedJSON(source, { maxBytes: 4 * 1024 * 1024, maxNodes: 100000, maxArray: 4096 });
const text = (value, max = 512) =>
  typeof value === 'string' && value.trim() === value && value.length > 0 && value.length <= max;
export function freezeEdition(value) {
  if (value && typeof value === 'object') {
    Object.values(value).forEach(freezeEdition);
    Object.freeze(value);
  }
  return value;
}
function fields(value, names, label, optional = []) {
  exactKeys(value, [...names, ...optional], label);
  required(
    names.every((name) => Object.hasOwn(value, name)),
    `${label} is incomplete.`,
  );
}
export function editionRelativePath(value) {
  return (
    typeof value === 'string' &&
    value.length > 0 &&
    value.length <= 512 &&
    value
      .split('/')
      .every((part) => /^[a-zA-Z0-9_][a-zA-Z0-9._-]*$/.test(part) && !['.', '..'].includes(part))
  );
}
function identity(value, format) {
  required(
    value.format === format &&
      stableId(value.id) &&
      Number.isSafeInteger(value.revision) &&
      value.revision > 0 &&
      text(value.name, 160),
    'Invalid edition record identity.',
  );
}
function list(value, max, label, check = stableId) {
  required(
    Array.isArray(value) &&
      value.length <= max &&
      value.every(check) &&
      new Set(value).size === value.length,
    `Invalid ${label}.`,
  );
  return value;
}
function publication(value) {
  required(publications.includes(value), 'Declare public or restricted publication.');
}
function modeList(value) {
  list(value, modes.length, 'edition modes', (mode) => modes.includes(mode));
  required(value.length > 0, 'At least one supported mode is required.');
}

/** Data only. A registered brand never supplies CSS, scripts or fetch URLs. */
export function validateBrandPack(source) {
  const value = own(source);
  fields(
    value,
    [
      'format',
      'id',
      'revision',
      'name',
      'description',
      'publication',
      'themeId',
      'actorSetId',
      'logoAssetId',
      'heroAssetId',
      'assetIds',
    ],
    'Brand pack',
    ['sources', 'iconAssetId', 'fontAssetId', 'themeIds'],
  );
  identity(value, EDITION_FORMATS.brand);
  publication(value.publication);
  required(
    text(value.description, 2048) && stableId(value.themeId) && stableId(value.actorSetId),
    'Invalid brand presentation.',
  );
  list(value.assetIds, EDITION_LIMITS.assets, 'brand assets');
  if (value.themeIds !== undefined) {
    list(value.themeIds, 32, 'brand themes');
    required(value.themeIds.includes(value.themeId), 'Brand themes must include its home theme.');
  }
  if (value.sources !== undefined) {
    required(Array.isArray(value.sources) && value.sources.length <= 32, 'Too many brand sources.');
    for (const source of value.sources) {
      fields(source, ['title', 'url', 'kind'], 'Brand source');
      required(
        text(source.title, 160) &&
          text(source.url, 2048) &&
          ['official', 'generated', 'license'].includes(source.kind),
        'Invalid public brand source.',
      );
      let url;
      try {
        url = new URL(source.url);
      } catch {
        throw new TypeError('Brand sources require a public HTTPS URL.');
      }
      required(
        url.protocol === 'https:' &&
          !url.username &&
          !url.password &&
          !/^(?:localhost|127\.|10\.|192\.168\.|\[::1\])/.test(url.hostname) &&
          !/\.(?:local|internal)$/.test(url.hostname),
        'Brand sources require a public HTTPS URL.',
      );
    }
  }
  for (const name of [
    'logoAssetId',
    'heroAssetId',
    ...['iconAssetId', 'fontAssetId'].filter((key) => Object.hasOwn(value, key)),
  ])
    required(
      value[name] === null || (stableId(value[name]) && value.assetIds.includes(value[name])),
      'Brand identity artwork must be a declared asset.',
    );
  return freezeEdition(value);
}

/** References an existing gameplay project; this introduces no new map format. */
export function validateCampaignDescriptor(source) {
  const value = own(source);
  fields(
    value,
    ['id', 'revision', 'name', 'brandId', 'publication', 'sourcePath', 'assetIds', 'modes'],
    'Campaign descriptor',
    ['lessonPath', 'rewardPath', 'localizationPath', 'localizationSha256', 'heroAssetId'],
  );
  required(
    stableId(value.id) &&
      text(value.revision, 80) &&
      text(value.name, 160) &&
      stableId(value.brandId),
    'Invalid campaign identity.',
  );
  publication(value.publication);
  required(
    editionRelativePath(value.sourcePath) && value.sourcePath.endsWith('.json'),
    'Campaigns require individual project JSON paths.',
  );
  if (value.lessonPath !== undefined)
    required(
      editionRelativePath(value.lessonPath) && value.lessonPath.endsWith('.json'),
      'Lessons require a bounded JSON path.',
    );
  if (value.rewardPath !== undefined)
    required(
      editionRelativePath(value.rewardPath) && value.rewardPath.endsWith('.json'),
      'Completion rewards require a bounded JSON path.',
    );
  if (value.localizationPath !== undefined || value.localizationSha256 !== undefined)
    required(
      editionRelativePath(value.localizationPath) &&
        value.localizationPath.endsWith('.json') &&
        /^[a-f0-9]{64}$/.test(value.localizationSha256),
      'Campaign localization requires a local JSON path and SHA-256 pin.',
    );
  list(value.assetIds, EDITION_LIMITS.assets, 'campaign assets');
  if (value.heroAssetId !== undefined)
    required(
      stableId(value.heroAssetId) && value.assetIds.includes(value.heroAssetId),
      'Campaign artwork must be one of its declared assets.',
    );
  modeList(value.modes);
  return freezeEdition(value);
}

export function validateEditionManifest(source) {
  const value = own(source);
  fields(
    value,
    [
      'format',
      'id',
      'revision',
      'name',
      'brandId',
      'audience',
      'campaignIds',
      'entryCampaignId',
      'modes',
      'publication',
    ],
    'Edition manifest',
    ['boot', 'assetIds', 'presentationHistory'],
  );
  identity(value, EDITION_FORMATS.edition);
  publication(value.publication);
  required(
    stableId(value.brandId) && stableId(value.audience),
    'Invalid edition audience or brand.',
  );
  list(value.campaignIds, EDITION_LIMITS.campaigns, 'edition campaigns');
  required(
    value.campaignIds.length > 0 && value.campaignIds.includes(value.entryCampaignId),
    'The edition entry must be one of its campaigns.',
  );
  modeList(value.modes);
  if (value.assetIds !== undefined) list(value.assetIds, EDITION_LIMITS.assets, 'edition assets');
  if (value.presentationHistory !== undefined) {
    required(
      Array.isArray(value.presentationHistory) && value.presentationHistory.length <= 16,
      'Too many retained edition presentations.',
    );
    for (const record of value.presentationHistory) {
      fields(record, ['id', 'path', 'sha256', 'bytes'], 'Retained presentation');
      required(
        /^[a-f0-9]{64}$/.test(record.id) &&
          /^[a-f0-9]{64}$/.test(record.sha256) &&
          editionRelativePath(record.path) &&
          record.path.startsWith('game/editions/retained/') &&
          record.path.endsWith('.json') &&
          Number.isSafeInteger(record.bytes) &&
          record.bytes > 0 &&
          record.bytes <= 4 * 1024 * 1024,
        'Retained presentations need exact local snapshot bytes.',
      );
    }
    for (const key of ['id', 'path'])
      required(
        new Set(value.presentationHistory.map((record) => record[key])).size ===
          value.presentationHistory.length,
        'Retained presentation identities and paths must be unique.',
      );
  }
  if (value.boot !== undefined) {
    fields(value.boot, EDITION_BOOT_KEYS, 'Edition boot files');
    required(
      Object.values(value.boot).every(
        (file) => editionRelativePath(file) && file.endsWith('.json'),
      ),
      'Boot files must be local JSON.',
    );
  }
  return freezeEdition(value);
}

export function validateEditionAsset(source) {
  const value = own(source);
  fields(
    value,
    ['id', 'path', 'sha256', 'bytes', 'publication', 'approved', 'dependencies'],
    'Edition asset',
    ['derivative'],
  );
  required(
    stableId(value.id) && editionRelativePath(value.path),
    'Invalid asset identity or path.',
  );
  required(
    /^[a-f0-9]{64}$/.test(value.sha256) &&
      Number.isSafeInteger(value.bytes) &&
      value.bytes > 0 &&
      value.bytes <= 32 * 1024 * 1024,
    'Asset bytes and SHA-256 are required.',
  );
  publication(value.publication);
  required(typeof value.approved === 'boolean', 'Asset publication approval must be explicit.');
  list(value.dependencies, EDITION_LIMITS.assets, 'asset dependencies');
  if (value.derivative !== undefined) {
    const derivative = value.derivative;
    fields(
      derivative,
      [
        'sourceAssetId',
        'sourceSha256',
        'sourceWidth',
        'sourceHeight',
        'width',
        'height',
        'kind',
        'background',
        'paddingRatio',
        'resampling',
        'implementation',
      ],
      'Asset derivative',
    );
    required(
      stableId(derivative.sourceAssetId) &&
        /^[a-f0-9]{64}$/.test(derivative.sourceSha256) &&
        derivative.sourceAssetId !== value.id &&
        value.dependencies.includes(derivative.sourceAssetId),
      'Asset derivative needs its exact original dependency.',
    );
    required(
      ['sourceWidth', 'sourceHeight'].every(
        (key) =>
          Number.isSafeInteger(derivative[key]) && derivative[key] > 0 && derivative[key] <= 8192,
      ) &&
        [192, 512].includes(derivative.width) &&
        derivative.height === derivative.width &&
        derivative.kind === 'square-install-icon' &&
        /^#[0-9a-f]{6}$/i.test(derivative.background) &&
        Number.isFinite(derivative.paddingRatio) &&
        derivative.paddingRatio >= 0.1 &&
        derivative.paddingRatio <= 0.25 &&
        derivative.resampling === 'lanczos' &&
        stableId(derivative.implementation) &&
        value.path.endsWith('.png'),
      'Invalid square install icon derivation.',
    );
  }
  return freezeEdition(value);
}

function records(source, name, max, validate) {
  required(Array.isArray(source) && source.length <= max, `Too many ${name}.`);
  const result = source.map(validate);
  required(
    new Set(result.map((item) => item.id)).size === result.length,
    `Duplicate ${name} identity.`,
  );
  return result;
}

/** Validate the complete registry before exposing any selection or dependency. */
export function createEditionRuntimeCatalog(source) {
  const value = own(source);
  fields(value, ['brands', 'editions', 'campaigns', 'defaultEditionId'], 'Edition registry', [
    'assets',
    'publication',
  ]);
  const {
    brands,
    editions,
    campaigns,
    assets = [],
    defaultEditionId,
    publication: visibility = 'public',
  } = value;
  publication(visibility);
  const result = {
    format: EDITION_FORMATS.catalog,
    publication: visibility,
    defaultEditionId,
    brands: records(brands, 'brands', EDITION_LIMITS.brands, validateBrandPack),
    editions: records(editions, 'editions', EDITION_LIMITS.editions, validateEditionManifest),
    campaigns: records(
      campaigns,
      'campaigns',
      EDITION_LIMITS.campaigns,
      validateCampaignDescriptor,
    ),
    assets: records(assets, 'assets', EDITION_LIMITS.assets, validateEditionAsset),
  };
  const byBrand = new Map(result.brands.map((item) => [item.id, item]));
  const byCampaign = new Map(result.campaigns.map((item) => [item.id, item]));
  const byAsset = new Map(result.assets.map((item) => [item.id, item]));
  required(
    result.editions.some((edition) => edition.id === defaultEditionId),
    'Choose a registered default edition.',
  );
  required(
    new Set(result.campaigns.map((item) => item.sourcePath)).size === result.campaigns.length,
    'Campaign source files must be independently compiled.',
  );
  for (const item of [...result.brands, ...result.editions, ...result.campaigns]) {
    required(
      (item.assetIds ?? []).every((id) => byAsset.has(id)),
      'A declared asset is missing.',
    );
    if (visibility === 'public')
      required(item.publication === 'public', 'Restricted content cannot enter a public catalog.');
  }
  for (const campaign of result.campaigns) {
    required(byBrand.has(campaign.brandId), 'Campaign brand is missing.');
    if (campaign.heroAssetId)
      required(
        /\.(?:png|jpe?g|webp)$/i.test(byAsset.get(campaign.heroAssetId).path),
        'Campaign artwork requires a supported static raster image.',
      );
  }
  for (const brand of result.brands) {
    if (brand.fontAssetId)
      required(
        /\.(?:ttf|otf|woff2?)$/i.test(byAsset.get(brand.fontAssetId).path),
        'Brand font must reference a declared font asset.',
      );
    if (brand.iconAssetId) {
      const icon = byAsset.get(brand.iconAssetId);
      required(
        icon.derivative?.width === 512,
        'Brand install icon must reference its square 512 pixel derivative.',
      );
      required(
        icon.dependencies.some((id) => {
          const small = byAsset.get(id)?.derivative,
            large = icon.derivative;
          return (
            small?.width === 192 &&
            [
              'sourceAssetId',
              'sourceSha256',
              'sourceWidth',
              'sourceHeight',
              'kind',
              'background',
              'paddingRatio',
              'resampling',
              'implementation',
            ].every((key) => small[key] === large[key])
          );
        }),
        'Brand install icon needs its matching 192 pixel derivative dependency.',
      );
    }
  }
  for (const edition of result.editions) {
    required(byBrand.has(edition.brandId), 'Edition brand is missing.');
    for (const id of edition.campaignIds) {
      const campaign = byCampaign.get(id);
      required(
        campaign && campaign.brandId === edition.brandId,
        'Edition campaign belongs to a different or missing brand.',
      );
      required(
        edition.modes.every((mode) => campaign.modes.includes(mode)),
        'Edition mode is not supported by every campaign.',
      );
    }
  }
  const visiting = new Set(),
    visited = new Set();
  const visit = (id) => {
    required(byAsset.has(id), 'Asset dependency is missing.');
    required(!visiting.has(id), 'Asset dependency cycle.');
    if (visited.has(id)) return;
    const asset = byAsset.get(id);
    if (visibility === 'public')
      required(
        asset.publication === 'public' && asset.approved,
        'A public asset requires explicit publication approval.',
      );
    visiting.add(id);
    asset.dependencies.forEach(visit);
    visiting.delete(id);
    visited.add(id);
  };
  result.assets.forEach((asset) => visit(asset.id));
  const paths = new Map();
  for (const asset of result.assets) {
    if (asset.derivative)
      required(
        byAsset.get(asset.derivative.sourceAssetId)?.sha256 === asset.derivative.sourceSha256,
        'Asset derivative source hash differs from its original.',
      );
    const prior = paths.get(asset.path);
    required(
      !prior ||
        (prior.sha256 === asset.sha256 &&
          prior.bytes === asset.bytes &&
          prior.publication === asset.publication &&
          prior.approved === asset.approved),
      'Conflicting asset path ownership.',
    );
    paths.set(asset.path, asset);
  }
  freezeEdition(result);
  validatedCatalogs.add(result);
  return result;
}

export function validateEditionRuntimeCatalog(source) {
  if (validatedCatalogs.has(source)) return source;
  const value = own(source);
  fields(
    value,
    ['format', 'publication', 'defaultEditionId', 'brands', 'editions', 'campaigns', 'assets'],
    'Edition catalog',
  );
  required(value.format === EDITION_FORMATS.catalog, 'Unknown edition catalog.');
  const { format: _format, ...options } = value;
  return createEditionRuntimeCatalog(options);
}

/** The compiled allowlist is authoritative; a URL or preference cannot extend it. */
export function resolveEditionSelection(source, { editionId, campaignId } = {}) {
  const catalog = validateEditionRuntimeCatalog(source);
  const edition = catalog.editions.find(
    (item) => item.id === editionIdentityId(editionId ?? catalog.defaultEditionId),
  );
  required(edition, 'This edition is not included in this build.');
  const campaigns = edition.campaignIds.map((id) =>
    catalog.campaigns.find((item) => item.id === id),
  );
  const campaign = campaigns.find((item) => item.id === (campaignId ?? edition.entryCampaignId));
  required(campaign, 'This campaign is not included in the selected edition.');
  return freezeEdition({
    edition,
    brand: catalog.brands.find((item) => item.id === edition.brandId),
    campaigns,
    entryCampaign: campaigns.find((item) => item.id === edition.entryCampaignId),
    campaign,
  });
}

/** One dependency closure for rendering, saved presentation pins and packaging.
 * The registry owns all references, including edition-specific additions. */
export function resolveEditionAssets(source, { editionId } = {}) {
  const catalog = validateEditionRuntimeCatalog(source);
  const selectedId = editionId ?? catalog.defaultEditionId;
  const closures = assetClosures.get(catalog);
  if (closures?.has(selectedId)) return closures.get(selectedId);
  const selection = resolveEditionSelection(catalog, { editionId });
  const byId = new Map(catalog.assets.map((asset) => [asset.id, asset]));
  const ids = new Set([
    ...selection.brand.assetIds,
    ...(selection.edition.assetIds ?? []),
    ...selection.campaigns.flatMap((campaign) => campaign.assetIds),
  ]);
  for (const id of ids) {
    const asset = byId.get(id);
    required(asset, 'An edition asset is unavailable.');
    asset.dependencies.forEach((dependency) => ids.add(dependency));
  }
  const closure = freezeEdition(catalog.assets.filter((asset) => ids.has(asset.id)));
  const cache = closures ?? new Map();
  cache.set(selectedId, closure);
  assetClosures.set(catalog, cache);
  return closure;
}
