import { createOfficialDownloads, pinOfficialFile } from './official-downloads.mjs';
import {
  LEGACY_VERSIONS,
  ENCOUNTER_VERSIONS,
  WIDE_VERSIONS,
  CLASSIC_VERSIONS,
  FOUNDATION_VERSIONS,
  RELAY_VERSIONS,
  DIRECTIONAL_VERSIONS,
  SENTINEL_VERSIONS,
  versionsForCampaign,
} from './core/versions.mjs';
import {
  validateScenario,
  validateTheme,
  inspectImageDataUrl,
  VISUAL_ROLES,
  CLASSIC_VISUAL_ROLES,
  CONTENT_LIMITS,
  SCENARIO_VERSION,
  MASTERY_SCENARIO_VERSION,
  ENCOUNTER_SCENARIO_VERSION,
  WIDE_SCENARIO_VERSION,
  CLASSIC_SCENARIO_VERSION,
  FOUNDATION_SCENARIO_VERSION,
  RELAY_SCENARIO_VERSION,
  DIRECTIONAL_SCENARIO_VERSION,
  SENTINEL_SCENARIO_VERSION,
} from './content.mjs';
import { browserDecodeImage } from './imports.mjs';
import {
  boundedJSON,
  canonicalJSON,
  plainObject,
  stableId,
  exactKeys,
  required,
} from './data-json.mjs';
import { createMasteryCatalog } from './mastery-catalog.mjs';
import { resolveMasteryDefinition } from './mastery.mjs';
import { t } from './i18n/index.mjs';

export const PACK_VERSION = 'xonix-pack.v1';
export const MASTERY_PACK_VERSION = 'xonix-pack.v2';
export const ENCOUNTER_PACK_VERSION = 'xonix-pack.v3';
export const WIDE_PACK_VERSION = 'xonix-pack.v4';
export const CLASSIC_PACK_VERSION = 'xonix-pack.v5';
export const FOUNDATION_PACK_VERSION = 'xonix-pack.v6';
export const RELAY_PACK_VERSION = 'xonix-pack.v7';
export const DIRECTIONAL_PACK_VERSION = 'xonix-pack.v8';
export const SENTINEL_PACK_VERSION = 'xonix-pack.v9';
export const PACK_LIBRARY_VERSION = 'xonix-pack-library.v1';
export const OFFICIAL_PACK_LIBRARY_VERSION = 'revealline-pack-references.v1';
const officialReferences = new WeakMap();
export const isOfficialPack = (pack) => officialReferences.has(pack);
export const PACK_LIBRARY_METADATA_VERSION = 'revealline-pack-library-metadata.v1';
export const PACK_LIMITS = Object.freeze({
  maxBytes: 24 * 1024 * 1024,
  libraryBytes: 48 * 1024 * 1024,
  installed: 12,
  levels: 128,
  themes: 16,
  campaigns: 8,
  masteries: 128,
  masteryBytes: 8 * 1024,
  combinedMasteryBytes: 256 * 1024,
});
const semver = (v) =>
  typeof v === 'string' && /^(0|[1-9]\d{0,4})\.(0|[1-9]\d{0,4})\.(0|[1-9]\d{0,4})$/.test(v);
const text = (v, max) => typeof v === 'string' && v.trim().length > 0 && v.length <= max;
const finite = (v, lo, hi) => Number.isFinite(v) && v >= lo && v <= hi;
const packError = (key, values) => t(`errors:pack.${key}`, values);
const preparedPacks = new WeakSet(),
  preparedLibraries = new WeakSet(),
  metadataLibraries = new WeakSet();
function freeze(value) {
  if (value && typeof value === 'object') {
    for (const child of Object.values(value)) freeze(child);
    Object.freeze(value);
  }
  return value;
}
const boundedPack = (candidate, library = false) =>
  boundedJSON(candidate, {
    maxBytes: library ? PACK_LIMITS.libraryBytes : PACK_LIMITS.maxBytes,
    maxNodes: 160000,
    maxDepth: 18,
    maxArray: 4096,
    maxString: CONTENT_LIMITS.maxEncodedImageChars,
  });
function trackChecks(value) {
  exactKeys(value, ['id', 'name', 'genre', 'tempo', 'root', 'scale'], 'music');
  required(stableId(value.id) && text(value.name, 120), packError('musicIdentity'));
  required(
    ['synthwave', 'chiptune', 'rock', 'metal', 'ambient'].includes(value.genre),
    packError('musicGenre'),
  );
  required(
    finite(value.tempo, 60, 180) && Number.isInteger(value.root) && finite(value.root, 36, 84),
    packError('musicTempoRoot'),
  );
  required(['minor', 'major', 'dorian'].includes(value.scale), packError('musicScale'));
}
export function validateMusicDescriptor(value) {
  try {
    trackChecks(boundedJSON(value));
    return { valid: true, errors: [] };
  } catch (error) {
    return { valid: false, errors: [error.message] };
  }
}
const levelKeys = [
  'version',
  'id',
  'revision',
  'name',
  'width',
  'height',
  'spawn',
  'goal',
  'walls',
  'enemies',
  'objectives',
  'supplies',
  'rules',
  'metadata',
  'signalZones',
  'hangars',
  'themeId',
  'musicId',
];
function packChecks(candidate) {
  const pack = boundedPack(candidate);
  const sentinel = pack.format === SENTINEL_PACK_VERSION;
  const directional = pack.format === DIRECTIONAL_PACK_VERSION || sentinel;
  const relays = pack.format === RELAY_PACK_VERSION || directional;
  const foundations = pack.format === FOUNDATION_PACK_VERSION || relays;
  const classic = pack.format === CLASSIC_PACK_VERSION || foundations;
  const wide = pack.format === WIDE_PACK_VERSION;
  const encounter = pack.format === ENCOUNTER_PACK_VERSION;
  const authoredMasteries = pack.format === MASTERY_PACK_VERSION || encounter || wide || classic;
  const versions = sentinel
    ? SENTINEL_VERSIONS
    : directional
      ? DIRECTIONAL_VERSIONS
      : relays
        ? RELAY_VERSIONS
        : foundations
          ? FOUNDATION_VERSIONS
          : classic
            ? CLASSIC_VERSIONS
            : wide
              ? WIDE_VERSIONS
              : encounter
                ? ENCOUNTER_VERSIONS
                : LEGACY_VERSIONS;
  exactKeys(
    pack,
    [
      'format',
      'id',
      'version',
      'name',
      'description',
      'engine',
      'dependencies',
      'metadata',
      'themes',
      'classRecipes',
      'campaigns',
      'visualOverrides',
      'levelVisuals',
      'music',
      ...(authoredMasteries ? ['masteries'] : []),
    ],
    'pack',
  );
  required(
    [
      PACK_VERSION,
      MASTERY_PACK_VERSION,
      ENCOUNTER_PACK_VERSION,
      WIDE_PACK_VERSION,
      CLASSIC_PACK_VERSION,
      FOUNDATION_PACK_VERSION,
      RELAY_PACK_VERSION,
      DIRECTIONAL_PACK_VERSION,
      SENTINEL_PACK_VERSION,
    ].includes(pack.format) &&
      stableId(pack.id) &&
      semver(pack.version),
    packError('formatIdentityVersion'),
  );
  required(pack.engine === versions.ruleset, packError('engine', { expected: versions.ruleset }));
  if (encounter || wide || classic)
    required(
      Array.isArray(pack.masteries) && pack.masteries.length === 0,
      classic
        ? packError('classicMasteries')
        : wide
          ? packError('wideMasteries')
          : packError('encounterMasteries'),
    );
  required(text(pack.name, 120) && text(pack.description, 4096), packError('nameDescription'));
  required(
    Array.isArray(pack.dependencies) && pack.dependencies.length <= 16,
    packError('dependenciesBudget'),
  );
  const dependencyIds = new Set();
  for (const dependency of pack.dependencies) {
    exactKeys(dependency, ['id', 'version'], 'dependency');
    required(
      stableId(dependency.id) &&
        dependency.id !== pack.id &&
        !dependencyIds.has(dependency.id) &&
        semver(dependency.version),
      packError('dependencyIdentity'),
    );
    dependencyIds.add(dependency.id);
  }
  if (pack.metadata !== undefined) {
    exactKeys(pack.metadata, ['author', 'license', 'rightsStatus', 'sourceUrl'], 'pack.metadata');
    for (const [key, val] of Object.entries(pack.metadata))
      required(text(val, key === 'sourceUrl' ? 2048 : 512), packError('metadataInvalid', { key }));
    if (pack.metadata.sourceUrl !== undefined) {
      let url;
      try {
        url = new URL(pack.metadata.sourceUrl);
      } catch {}
      required(
        url && ['https:', 'http:'].includes(url.protocol),
        t('errors:content.httpUrl', { path: 'pack.metadata.sourceUrl' }),
      );
    }
  }
  required(
    Array.isArray(pack.themes) &&
      pack.themes.length >= 1 &&
      pack.themes.length <= PACK_LIMITS.themes,
    packError('themesBudget'),
  );
  const themes = new Map();
  for (const theme of pack.themes) {
    required(stableId(theme.id), packError('themeIdentity'));
    const check = validateTheme(theme);
    required(check.valid, check.errors.join('; '));
    required(!themes.has(theme.id), packError('themeUnique'));
    themes.set(theme.id, theme);
  }
  required(
    Array.isArray(pack.classRecipes) &&
      pack.classRecipes.length >= 1 &&
      pack.classRecipes.length <= 40,
    packError('classRecipesBudget'),
  );
  required(
    pack.classRecipes.every((recipe) => stableId(recipe?.id)),
    packError('classIdentity'),
  );
  required(Array.isArray(pack.music) && pack.music.length <= 32, packError('musicBudget'));
  required(
    pack.classRecipes.every((recipe) => stableId(recipe?.id)),
    packError('classIdentity'),
  );
  const musicIds = new Set();
  for (const descriptor of pack.music) {
    trackChecks(descriptor);
    required(!musicIds.has(descriptor.id), packError('musicUnique'));
    musicIds.add(descriptor.id);
  }
  required(
    Array.isArray(pack.campaigns) &&
      pack.campaigns.length >= 1 &&
      pack.campaigns.length <= PACK_LIMITS.campaigns,
    'Pack must contain 1..8 campaigns.',
  );
  const campaignIds = new Set(),
    levelIds = new Set();
  let firstScenario = null;
  for (const campaign of pack.campaigns) {
    exactKeys(
      campaign,
      ['version', 'id', 'revision', 'title', 'levels', 'classIds', 'themeId', 'musicId'],
      'campaign',
    );
    required(
      campaign.version === 'xonix-campaign.v1' &&
        stableId(campaign.id) &&
        !campaignIds.has(campaign.id) &&
        text(campaign.revision, 60) &&
        text(campaign.title, 160),
      packError('campaignIdentity'),
    );
    campaignIds.add(campaign.id);
    required(
      campaign.themeId === undefined || themes.has(campaign.themeId),
      packError('campaignUnknownTheme'),
    );
    required(
      campaign.musicId === undefined || musicIds.has(campaign.musicId),
      packError('campaignUnknownMusic'),
    );
    if (campaign.classIds !== undefined)
      required(
        Array.isArray(campaign.classIds) &&
          campaign.classIds.length > 0 &&
          campaign.classIds.every((id) => pack.classRecipes.some((c) => c.id === id)) &&
          new Set(campaign.classIds).size === campaign.classIds.length,
        packError('campaignClassRoster'),
      );
    required(
      Array.isArray(campaign.levels) &&
        campaign.levels.length >= 1 &&
        campaign.levels.length <= PACK_LIMITS.levels,
      packError('campaignMapsBudget'),
    );
    required(
      versionsForCampaign(campaign).ruleset === versions.ruleset,
      packError('simulationVersions'),
    );
    for (const level of campaign.levels) {
      exactKeys(
        level,
        foundations
          ? [
              ...levelKeys,
              'encounter',
              'classic',
              'foundations',
              ...(relays ? ['relayGates'] : []),
              ...(directional ? ['directionalFields'] : []),
            ]
          : classic
            ? [...levelKeys, 'encounter', 'classic']
            : encounter || wide
              ? [...levelKeys, 'encounter']
              : levelKeys,
        'level',
      );
      required(stableId(level.id), packError('levelIdentity'));
      required(!levelIds.has(level.id), packError('levelUnique'));
      levelIds.add(level.id);
      required(
        level.themeId === undefined || themes.has(level.themeId),
        packError('levelUnknownTheme'),
      );
      required(
        level.musicId === undefined || musicIds.has(level.musicId),
        packError('levelUnknownMusic'),
      );
      const scenario = {
        format: sentinel
          ? SENTINEL_SCENARIO_VERSION
          : directional
            ? DIRECTIONAL_SCENARIO_VERSION
            : relays
              ? RELAY_SCENARIO_VERSION
              : foundations
                ? FOUNDATION_SCENARIO_VERSION
                : classic
                  ? CLASSIC_SCENARIO_VERSION
                  : wide
                    ? WIDE_SCENARIO_VERSION
                    : encounter
                      ? ENCOUNTER_SCENARIO_VERSION
                      : SCENARIO_VERSION,
        level,
        theme: themes.get(level.themeId ?? campaign.themeId) ?? pack.themes[0],
        settings: {
          classId: campaign.classIds?.[0] ?? pack.classRecipes[0].id,
          turnPolicy: 'immediate',
          seed: 1,
        },
        classRecipes: pack.classRecipes,
        visualOverrides: {},
        ...(encounter || wide || classic ? { masteryDefinition: null } : {}),
      };
      const checked = validateScenario(scenario);
      required(checked.valid, checked.errors.join('; '));
      firstScenario ??= scenario;
    }
  }
  required(levelIds.size <= PACK_LIMITS.levels, packError('mapBudget'));
  if (authoredMasteries) {
    required(
      Array.isArray(pack.masteries) && pack.masteries.length <= PACK_LIMITS.masteries,
      packError('masteriesBudget'),
    );
    required(
      new TextEncoder().encode(JSON.stringify(pack.masteries)).byteLength <=
        PACK_LIMITS.combinedMasteryBytes,
      packError('masteryCombinedBudget'),
    );
    const ids = new Set(),
      maps = new Set();
    pack.masteries = pack.masteries.map((candidate) => {
      const definition = resolveMasteryDefinition(
        boundedJSON(candidate, {
          maxBytes: PACK_LIMITS.masteryBytes,
          maxNodes: 256,
          maxDepth: 5,
          maxArray: 4,
          maxString: 512,
        }),
      );
      required(campaignIds.has(definition.campaignId), packError('masteryUnknownCampaign'));
      const map = `${definition.campaignId}/${definition.levelId}`;
      required(!ids.has(definition.id), packError('masteryIdUnique'));
      required(!maps.has(map), packError('masteryMapUnique'));
      ids.add(definition.id);
      maps.add(map);
      return definition;
    });
  }
  // Batch local context checks so a 128-map campaign is normalized only once.
  // Definitions stay beside maps; this cannot modify their existing identity.
  createMasteryCatalog(catalogEntries([pack]));
  required(plainObject(pack.visualOverrides), packError('visualOverridesObject'));
  required(
    Array.isArray(pack.levelVisuals) && pack.levelVisuals.length <= PACK_LIMITS.levels,
    packError('perMapVisualBudget'),
  );
  const scopes = [{ name: 'pack', visualOverrides: pack.visualOverrides }],
    scopedLevels = new Set();
  for (const entry of pack.levelVisuals) {
    exactKeys(entry, ['levelId', 'visualOverrides'], 'levelVisuals');
    required(
      levelIds.has(entry.levelId) && !scopedLevels.has(entry.levelId),
      packError('perMapUnknownRepeatedLevel'),
    );
    scopedLevels.add(entry.levelId);
    scopes.push({ name: entry.levelId, visualOverrides: entry.visualOverrides });
  }
  const images = [],
    warnings = [];
  let encodedChars = 0,
    pixels = 0;
  for (const scope of scopes) {
    const check = validateScenario({ ...firstScenario, visualOverrides: scope.visualOverrides });
    required(check.valid, check.errors.join('; '));
    warnings.push(...check.warnings);
    for (const [role, descriptor] of Object.entries(scope.visualOverrides)) {
      required(
        VISUAL_ROLES.includes(role) ||
          ([
            CLASSIC_PACK_VERSION,
            FOUNDATION_PACK_VERSION,
            RELAY_PACK_VERSION,
            DIRECTIONAL_PACK_VERSION,
            SENTINEL_PACK_VERSION,
          ].includes(pack.format) &&
            CLASSIC_VISUAL_ROLES.includes(role)),
        packError('unknownVisualRole'),
      );
      const header = inspectImageDataUrl(descriptor.dataUrl);
      required(header.valid, header.errors.join('; '));
      encodedChars += descriptor.dataUrl.length;
      pixels += header.width * header.height;
      images.push({
        role,
        scope: scope.name,
        descriptor,
        width: header.width,
        height: header.height,
      });
    }
  }
  required(
    encodedChars <= CONTENT_LIMITS.maxCombinedImageChars &&
      pixels <= CONTENT_LIMITS.maxCombinedImagePixels,
    packError('artworkBudget'),
  );
  return { pack, images, warnings: [...new Set(warnings)] };
}
export function validatePack(value) {
  try {
    const { warnings } = packChecks(value);
    return { valid: true, errors: [], warnings };
  } catch (error) {
    return { valid: false, errors: [error.message], warnings: [] };
  }
}
function campaignData(pack, source) {
  return {
    ...structuredClone(source),
    classRecipes: structuredClone(
      pack.classRecipes.filter((recipe) => !source.classIds || source.classIds.includes(recipe.id)),
    ),
  };
}
function catalogEntries(packs) {
  return packs.flatMap((pack) =>
    pack.campaigns.map((source) => ({
      campaign: campaignData(pack, source),
      sourcePackId: pack.id,
      sourcePackFormat: pack.format,
      ...(pack.format !== PACK_VERSION
        ? {
            masteries: pack.masteries.filter((definition) => definition.campaignId === source.id),
          }
        : {}),
    })),
  );
}
async function decodeCheckedPack({ pack, images, warnings }, decodeImage) {
  required(typeof decodeImage === 'function', packError('completeImageDecoder'));
  for (const image of images) {
    const decoded = await decodeImage(image.descriptor.dataUrl, {
      role: image.role,
      scope: image.scope,
    });
    required(
      decoded?.naturalWidth === image.width && decoded?.naturalHeight === image.height,
      packError('decodedDimensions', { scope: image.scope, role: image.role }),
    );
  }
  freeze(pack);
  preparedPacks.add(pack);
  return { pack, warnings };
}
/** All file/structure/image-header checks finish before the first decoder call. */
export async function preparePack(candidate, { decodeImage = browserDecodeImage, library } = {}) {
  const checked = packChecks(candidate);
  if (library !== undefined) {
    required(preparedLibraries.has(library), packError('prepareAgainstLibrary'));
    libraryChecks([...library.packs.filter((pack) => pack.id !== checked.pack.id), checked.pack]);
  }
  return decodeCheckedPack(checked, decodeImage);
}
function dependenciesValid(packs) {
  const byId = new Map(packs.map((p) => [p.id, p]));
  required(byId.size === packs.length, packError('installedUnique'));
  for (const pack of packs)
    for (const dependency of pack.dependencies)
      required(
        byId.get(dependency.id)?.version === dependency.version,
        packError('dependencyRequired', {
          name: pack.name,
          id: dependency.id,
          version: dependency.version,
        }),
      );
  const visiting = new Set(),
    done = new Set();
  function visit(id) {
    if (done.has(id)) return;
    required(!visiting.has(id), packError('dependencyCycle'));
    visiting.add(id);
    for (const d of byId.get(id).dependencies) visit(d.id);
    visiting.delete(id);
    done.add(id);
  }
  for (const id of byId.keys()) visit(id);
}
function libraryChecks(packs) {
  const imported = packs.filter((pack) => !isOfficialPack(pack));
  required(imported.length <= PACK_LIMITS.installed, packError('installationLimit'));
  required(
    packs.length - imported.length <= 66 &&
      packs
        .filter(isOfficialPack)
        .reduce((sum, pack) => sum + officialReferences.get(pack).bytes, 0) <=
        52 * 1024 * 1024,
    packError('officialMemoryBudget'),
  );
  dependenciesValid(packs);
  const library = { format: PACK_LIBRARY_VERSION, packs };
  // Includes byte budgets across every installed asset, before adoption/storage.
  boundedPack({ format: PACK_LIBRARY_VERSION, packs: imported }, true);
  createMasteryCatalog(catalogEntries(packs));
  return library;
}
function registeredLibrary(packs) {
  const library = libraryChecks(packs);
  freeze(library);
  preparedLibraries.add(library);
  return library;
}
export function emptyPackLibrary() {
  return registeredLibrary([]);
}
export function installPack(library, pack) {
  required(preparedLibraries.has(library) && preparedPacks.has(pack), packError('installPrepared'));
  let kept = library.packs.filter((p) => p.id !== pack.id);
  if (isOfficialPack(pack)) {
    const mounted = kept.filter(
      (p) => isOfficialPack(p) && officialReferences.get(p).bytes > 65536,
    );
    kept = kept.filter(
      (p) =>
        !isOfficialPack(p) ||
        officialReferences.get(p).bytes <= 65536 ||
        officialReferences.get(pack).bytes <= 65536 ||
        p === mounted.at(-1),
    );
  }
  return registeredLibrary([...kept, pack]);
}
export function removePack(library, id) {
  required(preparedLibraries.has(library), packError('removePrepared'));
  required(stableId(id), packError('identityInvalid'));
  return registeredLibrary(library.packs.filter((pack) => pack.id !== id));
}
export function exportPackLibrary(library) {
  required(preparedLibraries.has(library), packError('exportPrepared'));
  return JSON.stringify(packLibrarySnapshot(library));
}
/** Small official references are independent of the imported-pack byte/slot budget. */
export function packLibrarySnapshot(library) {
  if (!preparedLibraries.has(library) || !library.packs.some(isOfficialPack)) return library;
  return {
    format: OFFICIAL_PACK_LIBRARY_VERSION,
    packs: library.packs.filter((pack) => !isOfficialPack(pack)),
    official: library.packs.filter(isOfficialPack).map((pack) => officialReferences.get(pack)),
  };
}
async function checkedOfficial(
  reference,
  readOfficial = (hash) => createOfficialDownloads().read(hash),
) {
  exactKeys(reference, ['id', 'version', 'sha256', 'bytes'], 'official chapter');
  required(
    stableId(reference.id) &&
      semver(reference.version) &&
      /^[a-f0-9]{64}$/.test(reference.sha256) &&
      Number.isSafeInteger(reference.bytes) &&
      reference.bytes > 0 &&
      reference.bytes <= PACK_LIMITS.maxBytes,
    packError('officialReferenceInvalid'),
  );
  const blob = await readOfficial(reference.sha256);
  required(blob && blob.size === reference.bytes, packError('officialDownloadRequired'));
  const checked = packChecks(JSON.parse(await blob.text()));
  required(
    checked.pack.id === reference.id && checked.pack.version === reference.version,
    packError('officialIdentityDiffers'),
  );
  await pinOfficialFile(reference.sha256, `chapter:${reference.sha256}`);
  officialReferences.set(checked.pack, freeze({ ...reference }));
  return checked;
}
export async function prepareOfficialPack(
  reference,
  { decodeImage = browserDecodeImage, readOfficial } = {},
) {
  return decodeCheckedPack(await checkedOfficial(reference, readOfficial), decodeImage);
}
function checkedStoredLibrary(candidate) {
  const value = boundedPack(packLibrarySnapshot(candidate), true);
  if (value.format !== OFFICIAL_PACK_LIBRARY_VERSION) return checkedLibrary(value);
  exactKeys(value, ['format', 'packs', 'official'], 'official chapter library');
  required(
    Array.isArray(value.official) &&
      value.official.length <= 66 &&
      value.official.reduce(
        (sum, ref) => sum + (Number.isSafeInteger(ref?.bytes) ? ref.bytes : Infinity),
        0,
      ) <=
        52 * 1024 * 1024,
    packError('mountedBudgetInvalid'),
  );
  const checked = checkedLibrary({ format: PACK_LIBRARY_VERSION, packs: value.packs });
  return (async () => {
    for (const reference of value.official) checked.push(await checkedOfficial(reference));
    libraryChecks(checked.map((entry) => entry.pack));
    return checked;
  })();
}
function checkedLibrary(candidate) {
  const value = boundedPack(candidate, true);
  exactKeys(value, ['format', 'packs'], 'pack library');
  required(
    value.format === PACK_LIBRARY_VERSION &&
      Array.isArray(value.packs) &&
      value.packs.length <= PACK_LIMITS.installed,
    packError('libraryInvalid'),
  );
  // Validate every pack/dependency before allocating any browser decode surface.
  const checked = value.packs.map((pack) => packChecks(pack));
  libraryChecks(checked.map((entry) => entry.pack));
  return checked;
}
export async function importPackLibrary(candidate, { decodeImage = browserDecodeImage } = {}) {
  const pending = checkedStoredLibrary(candidate);
  const checked = Array.isArray(pending) ? pending : await pending;
  const packs = [];
  for (const candidate of checked)
    packs.push((await decodeCheckedPack(candidate, decodeImage)).pack);
  return registeredLibrary(packs);
}
/** Validated browsing data, NOT prepared runtime content. All pack, dependency,
 * mastery and image-header checks run, but no images are decoded or retained in
 * the returned projection. identity fingerprints the complete normalized pack,
 * including artwork, exactly as preparedPackIdentity does after preparation.
 * A matching fingerprint is not evidence of decoded or available media; Play
 * must still re-resolve and prepare the exact installed edition independently.
 */
export async function inspectPackLibraryMetadata(candidate) {
  const pending = checkedStoredLibrary(candidate);
  const checked = Array.isArray(pending) ? pending : await pending;
  const packs = [];
  for (const { pack } of checked) {
    const bytes = new TextEncoder().encode(canonicalJSON(pack));
    // Keep this primitive local: external-chapter imports packs, and importing
    // its hash helper here would introduce a dependency cycle at the boundary.
    const sha256 = [...new Uint8Array(await crypto.subtle.digest('SHA-256', bytes))]
      .map((byte) => byte.toString(16).padStart(2, '0'))
      .join('');
    packs.push({
      id: pack.id,
      version: pack.version,
      name: pack.name,
      description: pack.description,
      format: pack.format,
      engine: pack.engine,
      dependencies: pack.dependencies,
      ...(pack.metadata !== undefined ? { metadata: pack.metadata } : {}),
      identity: { bytes: bytes.byteLength, sha256 },
      entries: pack.campaigns.map((source) => campaignMetadata(pack, source)),
    });
  }
  // Deliberately do not add this DTO or any member to the prepared WeakSets.
  const projection = freeze({ format: PACK_LIBRARY_METADATA_VERSION, packs });
  metadataLibraries.add(projection);
  return projection;
}
/** Browsing provenance only; never a prepared-pack or runtime authority check. */
export function isPackLibraryMetadata(value) {
  return metadataLibraries.has(value);
}
function campaignMetadata(pack, source) {
  const campaign = campaignData(pack, source);
  return {
    campaign,
    classRecipes: structuredClone(campaign.classRecipes),
    themes: structuredClone(pack.themes),
    music: structuredClone(pack.music),
    sourcePackId: pack.id,
    ...(pack.format !== PACK_VERSION
      ? {
          sourcePackFormat: pack.format,
          masteries: structuredClone(
            pack.masteries.filter((definition) => definition.campaignId === source.id),
          ),
        }
      : {}),
  };
}
export function resolvePackCampaign(pack, campaignId) {
  required(preparedPacks.has(pack), packError('resolvePrepared'));
  const source = pack.campaigns.find((c) => c.id === campaignId);
  required(source, packError('unknownCampaign'));
  return {
    ...campaignMetadata(pack, source),
    visualOverrides: structuredClone(pack.visualOverrides),
    levelVisuals: structuredClone(pack.levelVisuals),
  };
}
export function scenarioFromPack(
  pack,
  campaignId,
  levelId,
  { classId, turnPolicy = 'immediate', seed = 1 } = {},
) {
  const resolved = resolvePackCampaign(pack, campaignId),
    level = resolved.campaign.levels.find((l) => l.id === levelId);
  required(level, packError('unknownMap'));
  const theme =
    resolved.themes.find((t) => t.id === (level.themeId ?? resolved.campaign.themeId)) ??
    resolved.themes[0];
  const visualOverrides = {
    ...resolved.visualOverrides,
    ...(resolved.levelVisuals.find((v) => v.levelId === levelId)?.visualOverrides ?? {}),
  };
  const scenario = {
    format:
      pack.format === SENTINEL_PACK_VERSION
        ? SENTINEL_SCENARIO_VERSION
        : pack.format === DIRECTIONAL_PACK_VERSION
          ? DIRECTIONAL_SCENARIO_VERSION
          : pack.format === RELAY_PACK_VERSION
            ? RELAY_SCENARIO_VERSION
            : pack.format === FOUNDATION_PACK_VERSION
              ? FOUNDATION_SCENARIO_VERSION
              : pack.format === CLASSIC_PACK_VERSION
                ? CLASSIC_SCENARIO_VERSION
                : pack.format === WIDE_PACK_VERSION
                  ? WIDE_SCENARIO_VERSION
                  : pack.format === ENCOUNTER_PACK_VERSION
                    ? ENCOUNTER_SCENARIO_VERSION
                    : pack.format === MASTERY_PACK_VERSION
                      ? MASTERY_SCENARIO_VERSION
                      : SCENARIO_VERSION,
    level,
    theme,
    classRecipes: resolved.classRecipes,
    settings: { classId: classId ?? resolved.classRecipes[0].id, turnPolicy, seed },
    visualOverrides,
    ...(pack.format !== PACK_VERSION
      ? {
          masteryDefinition: structuredClone(
            resolved.masteries.find((definition) => definition.levelId === levelId) ?? null,
          ),
        }
      : {}),
  };
  const music =
    resolved.music.find((track) => track.id === (level.musicId ?? resolved.campaign.musicId)) ??
    resolved.music[0];
  if (music) scenario.music = structuredClone(music);
  const check = validateScenario(scenario);
  required(check.valid, check.errors.join('; '));
  return scenario;
}
