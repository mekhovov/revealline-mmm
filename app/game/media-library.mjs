import { boundedJSON, canonicalJSON, exactKeys, required, stableId } from './data-json.mjs';
import { createDifficultyContext } from './campaign-difficulty.mjs';
import { EXECUTION_CATALOG_LIMITS } from './campaign-contexts.mjs';
import { CONTENT_LIMITS } from './content.mjs';

export const STILL_ASSET_FORMAT = 'revealline-still-asset.v1';
export const MEDIA_PRESENTATION_FORMAT = 'revealline-media-presentation.v1';
export const MEDIA_LIBRARY_FORMAT = 'revealline-media-library.v1';
export const MEDIA_LIMITS = Object.freeze({
  metadataBytes: 2 * 1024 * 1024,
  assets: 512,
  presentations: 256,
  assignments: 512,
  assetBytes: CONTENT_LIMITS.maxImageBytes,
  imageSide: CONTENT_LIMITS.maxImageSide,
  imagePixels: CONTENT_LIMITS.maxImagePixels,
  posterWidth: 1920,
  posterHeight: 1080,
});
const libraries = new WeakSet(),
  catalogs = new WeakSet();
export function freezeMedia(value) {
  if (value && typeof value === 'object') {
    Object.values(value).forEach(freezeMedia);
    Object.freeze(value);
  }
  return value;
}
const text = (value, max) =>
  typeof value === 'string' && value.trim().length > 0 && value.length <= max;
const integer = (value, max) => Number.isSafeInteger(value) && value > 0 && value <= max;
const own = (source) =>
  boundedJSON(source, {
    maxBytes: MEDIA_LIMITS.metadataBytes,
    maxNodes: 30000,
    maxArray: 512,
    maxString: 4096,
  });

function identity(value) {
  exactKeys(value, ['baseCampaignKey', 'levelId', 'levelRevision', 'themeId'], 'media identity');
  required(
    text(value.baseCampaignKey, 512) &&
      stableId(value.levelId) &&
      text(value.levelRevision, 80) &&
      stableId(value.themeId),
    'Invalid media identity.',
  );
  return value;
}
const identityKey = (value) => canonicalJSON(identity(value));
const revisionKey = (value) => JSON.stringify([value.id, value.revision]);

/** Snapshot exact installed execution wrappers, including their real base owner.
 * No name/prefix inference, campaign editing, media decoding or registration.
 */
export function createMediaIdentityCatalog(executionCatalog) {
  const descriptor = Object.getOwnPropertyDescriptor(executionCatalog ?? {}, 'entries');
  required(descriptor && Object.hasOwn(descriptor, 'value'), 'Expected an execution catalog.');
  const source = descriptor.value;
  required(
    Array.isArray(source) &&
      Object.getPrototypeOf(source) === Array.prototype &&
      source.length <= EXECUTION_CATALOG_LIMITS.executionEntries,
    'Invalid execution catalog entries.',
  );
  const descriptors = Object.getOwnPropertyDescriptors(source);
  required(
    Reflect.ownKeys(descriptors).length === source.length + 1,
    'Execution entries must be a dense array.',
  );
  const known = new Map(),
    executions = new Map();
  for (let index = 0; index < source.length; index++) {
    const item = descriptors[index];
    required(
      item?.enumerable && Object.hasOwn(item, 'value'),
      'Execution entries must be own data.',
    );
    const entry = boundedJSON(item.value, {
      maxBytes: EXECUTION_CATALOG_LIMITS.entryBytes,
      maxNodes: EXECUTION_CATALOG_LIMITS.entryNodes,
      maxDepth: 24,
      maxArray: 4096,
      maxString: 6 * 1024 * 1024,
    });
    const context = createDifficultyContext(entry.baseCampaign, entry.difficulty);
    required(
      entry.executionKey === context.campaignKey &&
        entry.baseCampaignKey === context.baseCampaignKey &&
        entry.policyVersion === context.policyVersion &&
        canonicalJSON(entry.campaign) === canonicalJSON(context.campaign),
      'Media execution owner does not match its verified base campaign.',
    );
    required(!executions.has(entry.executionKey), 'Duplicate media execution key.');
    required(entry.activity !== 'challenge', 'Dated challenges do not accept media assignments.');
    required(
      Array.isArray(entry.themes) && entry.themes.length <= 64,
      'Media context needs its installed themes.',
    );
    const themes = new Set();
    for (const theme of entry.themes) {
      required(
        stableId(theme.id) && !themes.has(theme.id),
        'Invalid or duplicate installed theme.',
      );
      themes.add(theme.id);
    }
    const map = new Map();
    for (const [index, level] of entry.baseCampaign.levels.entries()) {
      const actual = context.campaign.levels[index];
      const base = {
        baseCampaignKey: context.baseCampaignKey,
        levelId: level.id,
        levelRevision: level.revision,
      };
      map.set(JSON.stringify([actual.id, actual.revision]), base);
      const key = JSON.stringify([context.baseCampaignKey, level.id, level.revision]);
      if (!known.has(key)) known.set(key, new Set());
      for (const themeId of themes) known.get(key).add(themeId);
    }
    executions.set(entry.executionKey, { map, themes });
  }
  const result = Object.freeze({
    has(source) {
      const value = identity(own(source));
      return (
        known
          .get(JSON.stringify([value.baseCampaignKey, value.levelId, value.levelRevision]))
          ?.has(value.themeId) ?? false
      );
    },
    resolve(source) {
      const value = own(source);
      exactKeys(value, ['executionKey', 'levelId', 'levelRevision', 'themeId'], 'media request');
      required(
        text(value.executionKey, 512) &&
          stableId(value.levelId) &&
          text(value.levelRevision, 80) &&
          stableId(value.themeId),
        'Invalid media request.',
      );
      const context = executions.get(value.executionKey),
        base = context?.map.get(JSON.stringify([value.levelId, value.levelRevision]));
      return base && context.themes.has(value.themeId)
        ? freezeMedia({ ...base, themeId: value.themeId })
        : null;
    },
  });
  catalogs.add(result);
  return result;
}
export function isMediaIdentityCatalog(value) {
  return catalogs.has(value);
}

/** Metadata validation alone does not establish available bytes or decodability. */
export function validateStillAsset(source) {
  const value = own(source);
  exactKeys(
    value,
    ['format', 'id', 'sha256', 'bytes', 'mime', 'width', 'height', 'provenance'],
    'still asset',
  );
  required(
    value.format === STILL_ASSET_FORMAT && stableId(value.id),
    'Invalid still asset format/id.',
  );
  required(
    typeof value.sha256 === 'string' && /^[a-f0-9]{64}$/.test(value.sha256),
    'Invalid still asset SHA-256.',
  );
  required(
    integer(value.bytes, MEDIA_LIMITS.assetBytes),
    'Still asset exceeds its 4 MiB byte budget.',
  );
  required(
    ['image/png', 'image/jpeg', 'image/webp'].includes(value.mime),
    'Only static PNG/JPEG/WebP assets are supported.',
  );
  required(
    integer(value.width, MEDIA_LIMITS.imageSide) &&
      integer(value.height, MEDIA_LIMITS.imageSide) &&
      value.width * value.height <= MEDIA_LIMITS.imagePixels,
    'Still asset dimensions exceed the image budget.',
  );
  exactKeys(value.provenance, ['kind', 'credit', 'source'], 'still provenance');
  required(
    ['original', 'licensed', 'user-supplied'].includes(value.provenance.kind) &&
      text(value.provenance.credit, 512) &&
      text(value.provenance.source, 2048),
    'Still asset needs bounded declared provenance.',
  );
  return freezeMedia(value);
}

export function isMediaLibrary(value) {
  return libraries.has(value);
}

/** Atomic, append-only immutable history; only assignments may change/remove.
 * Pass the previous accepted library on every subsequent adoption. This module
 * does not persist a ledger, fetch bytes or certify a metadata record playable.
 */
export function validateMediaLibrary(source, { identityCatalog, previous = null } = {}) {
  required(catalogs.has(identityCatalog), 'Expected a validated media identity catalog.');
  required(
    previous === null || libraries.has(previous),
    'Previous media library must be validated.',
  );
  const value = own(source);
  exactKeys(value, ['format', 'assets', 'presentations', 'assignments'], 'media library');
  required(value.format === MEDIA_LIBRARY_FORMAT, 'Unsupported media library format.');
  for (const [field, limit] of [
    ['assets', MEDIA_LIMITS.assets],
    ['presentations', MEDIA_LIMITS.presentations],
    ['assignments', MEDIA_LIMITS.assignments],
  ])
    required(
      Array.isArray(value[field]) && value[field].length <= limit,
      `Too many media ${field}.`,
    );
  const assets = new Map(),
    presentations = new Map(),
    owners = new Map(),
    hashes = new Map();
  value.assets = value.assets.map((asset) => {
    const checked = validateStillAsset(asset);
    required(!assets.has(checked.id), 'Duplicate still asset ID.');
    const facts = canonicalJSON([checked.bytes, checked.mime, checked.width, checked.height]);
    required(
      !hashes.has(checked.sha256) || hashes.get(checked.sha256) === facts,
      'One asset hash cannot claim different media facts.',
    );
    hashes.set(checked.sha256, facts);
    assets.set(checked.id, checked);
    return checked;
  });
  for (const item of value.presentations) {
    exactKeys(
      item,
      ['format', 'id', 'revision', 'identity', 'poster', 'story', 'description'],
      'media presentation',
    );
    required(
      item.format === MEDIA_PRESENTATION_FORMAT &&
        stableId(item.id) &&
        integer(item.revision, 1000000),
      'Invalid presentation format/id/revision.',
    );
    const key = identityKey(item.identity);
    // Existing immutable history can remain archived after a pack is removed.
    const retained = previous?.presentations.some(
      (old) => revisionKey(old) === revisionKey(item) && canonicalJSON(old) === canonicalJSON(item),
    );
    required(
      retained || identityCatalog.has(item.identity),
      'Presentation identity is not in the execution catalog.',
    );
    required(
      !owners.has(item.id) || owners.get(item.id) === key,
      'A presentation ID cannot move to another map/theme.',
    );
    owners.set(item.id, key);
    exactKeys(item.poster, ['assetId', 'fit', 'sampling'], 'presentation poster');
    const asset = assets.get(item.poster.assetId);
    required(
      asset && asset.width <= MEDIA_LIMITS.posterWidth && asset.height <= MEDIA_LIMITS.posterHeight,
      'Poster needs a known asset within 1920 × 1080.',
    );
    required(
      item.poster.fit === 'contain' && item.poster.sampling === 'nearest',
      'Unsupported poster fit/sampling.',
    );
    required(
      item.story === null && text(item.description, 2048),
      'Still presentations require story:null and a description.',
    );
    required(!presentations.has(revisionKey(item)), 'Duplicate presentation revision.');
    presentations.set(revisionKey(item), item);
  }
  const assignments = new Set();
  for (const item of value.assignments) {
    exactKeys(item, ['identity', 'presentationId', 'revision'], 'media assignment');
    const key = identityKey(item.identity),
      presentation = presentations.get(JSON.stringify([item.presentationId, item.revision]));
    required(
      presentation && identityKey(presentation.identity) === key,
      'Assignment must match its exact presentation identity/revision.',
    );
    required(!assignments.has(key), 'Duplicate media assignment identity.');
    assignments.add(key);
  }
  if (previous) {
    for (const item of previous.assets)
      required(
        canonicalJSON(assets.get(item.id)) === canonicalJSON(item),
        'An immutable asset cannot be changed or removed.',
      );
    for (const item of previous.presentations)
      required(
        canonicalJSON(presentations.get(revisionKey(item))) === canonicalJSON(item),
        'An immutable presentation revision cannot be changed or removed.',
      );
    const oldKeys = new Set(previous.presentations.map(revisionKey));
    for (const item of value.presentations)
      if (!oldKeys.has(revisionKey(item))) {
        const max = Math.max(
          0,
          ...previous.presentations.filter((old) => old.id === item.id).map((old) => old.revision),
        );
        required(item.revision > max, 'New presentation revisions must increase.');
      }
  }
  freezeMedia(value);
  libraries.add(value);
  return value;
}
