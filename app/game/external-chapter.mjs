import { boundedJSON, canonicalJSON, exactKeys, required, stableId } from './data-json.mjs';
import { preparePack, resolvePackCampaign, PACK_LIMITS, CLASSIC_PACK_VERSION } from './packs.mjs';
import { campaignKey } from './library.mjs';
import { createExecutionCatalog } from './campaign-contexts.mjs';
import { importMediaBundle, MEDIA_BUNDLE_LIMITS } from './media-bundle.mjs';
import { freezeMedia } from './media-library.mjs';
import { prepareStoredStillMedia } from './media-storage-record.mjs';

export const EXTERNAL_CHAPTER_FORMAT = 'revealline-external-chapter.v1';
export const EXTERNAL_CHAPTER_LIMITS = Object.freeze({
  catalogChoices: 36,
  descriptorBytes: 16384,
  packBytes: 1024 * 1024,
  originals: 3,
});
const prepared = new WeakSet();
const nativeSize = Object.getOwnPropertyDescriptor(Blob.prototype, 'size').get;
export const abortExternalChapter = (signal) => {
  if (signal?.aborted)
    throw new DOMException('External chapter operation cancelled.', 'AbortError');
};
export async function externalChapterHash(value) {
  const data = typeof value === 'string' ? new TextEncoder().encode(value) : value;
  return [...new Uint8Array(await crypto.subtle.digest('SHA-256', data))]
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}
const hash = (v) => typeof v === 'string' && /^[a-f0-9]{64}$/.test(v);
const integer = (v, max) => Number.isSafeInteger(v) && v > 0 && v <= max;
function fields(value, names, label) {
  exactKeys(value, names, label);
  required(
    names.every((key) => Object.hasOwn(value, key)),
    `${label} has missing fields.`,
  );
}
function payload(value, max, label) {
  fields(value, ['bytes', 'sha256'], label);
  required(integer(value.bytes, max) && hash(value.sha256), `Invalid ${label} hash or length.`);
}
export function validateExternalChapter(candidate) {
  const d = boundedJSON(candidate, {
    maxBytes: EXTERNAL_CHAPTER_LIMITS.descriptorBytes,
    maxNodes: 512,
    maxArray: 3,
    maxString: 1024,
  });
  fields(
    d,
    ['format', 'id', 'revision', 'source', 'pack', 'media', 'campaignKey', 'themeId', 'originals'],
    'External chapter',
  );
  required(
    d.format === EXTERNAL_CHAPTER_FORMAT &&
      stableId(d.id) &&
      d.revision === 1 &&
      stableId(d.themeId),
    'Unsupported external chapter identity.',
  );
  fields(d.source, ['id', 'bytes', 'sha256'], 'Source pack');
  required(
    stableId(d.source.id) &&
      d.source.id !== d.id &&
      integer(d.source.bytes, PACK_LIMITS.maxBytes) &&
      hash(d.source.sha256),
    'Invalid separate source edition.',
  );
  payload(d.pack, EXTERNAL_CHAPTER_LIMITS.packBytes, 'Gameplay payload');
  payload(d.media, MEDIA_BUNDLE_LIMITS.bytes, 'Original media payload');
  required(
    typeof d.campaignKey === 'string' && d.campaignKey.length > 0 && d.campaignKey.length <= 512,
    'Invalid authored campaign key.',
  );
  required(
    Array.isArray(d.originals) && d.originals.length === 3,
    'The pilot requires exactly three original posters.',
  );
  const ids = new Set(),
    maps = new Set(),
    presentations = new Set(),
    hashes = new Set();
  for (const o of d.originals) {
    fields(
      o,
      [
        'assetId',
        'presentationId',
        'levelId',
        'levelRevision',
        'sha256',
        'bytes',
        'mime',
        'width',
        'height',
      ],
      'Original',
    );
    required(
      stableId(o.assetId) &&
        stableId(o.presentationId) &&
        stableId(o.levelId) &&
        !ids.has(o.assetId) &&
        !maps.has(o.levelId) &&
        !presentations.has(o.presentationId),
      'Duplicate or invalid poster identity.',
    );
    required(
      typeof o.levelRevision === 'string' &&
        o.levelRevision.length > 0 &&
        o.levelRevision.length <= 80 &&
        hash(o.sha256) &&
        !hashes.has(o.sha256) &&
        integer(o.bytes, 4 * 1024 * 1024) &&
        ['image/png', 'image/jpeg', 'image/webp'].includes(o.mime) &&
        integer(o.width, 1920) &&
        integer(o.height, 1080),
      'Invalid original facts.',
    );
    ids.add(o.assetId);
    maps.add(o.levelId);
    presentations.add(o.presentationId);
    hashes.add(o.sha256);
  }
  return freezeMedia(d);
}
function ownBlob(source, max) {
  let size;
  try {
    size = nativeSize.call(source);
  } catch {
    throw new TypeError('External chapter payload must be a native Blob.');
  }
  required(integer(size, max), 'External chapter payload exceeds its byte bound.');
  return Blob.prototype.slice.call(source, 0, size);
}
/** Strict versioned sidecar. Old pack readers and embedded visual fields are unchanged. */
export async function prepareExternalChapter(candidate, sources, { signal, decodeImage } = {}) {
  abortExternalChapter(signal);
  const descriptor = validateExternalChapter(candidate);
  required(
    sources && Object.getPrototypeOf(sources) === Object.prototype,
    'External payloads need an ordinary pack/media object.',
  );
  const fields = Object.getOwnPropertyDescriptors(sources);
  required(
    Reflect.ownKeys(fields).length === 2 &&
      ['pack', 'media'].every((k) => fields[k]?.enumerable && Object.hasOwn(fields[k], 'value')),
    'External payloads need exactly owned pack/media Blob values.',
  );
  const packSource = fields.pack.value,
    mediaSource = fields.media.value;
  const packBlob = ownBlob(packSource, EXTERNAL_CHAPTER_LIMITS.packBytes),
    mediaBlob = ownBlob(mediaSource, MEDIA_BUNDLE_LIMITS.bytes);
  for (const [blob, pin] of [
    [packBlob, descriptor.pack],
    [mediaBlob, descriptor.media],
  ]) {
    required(blob.size === pin.bytes, 'External chapter payload length differs.');
    const bytes = await blob.arrayBuffer();
    abortExternalChapter(signal);
    required(
      (await externalChapterHash(bytes)) === pin.sha256,
      'External chapter payload SHA-256 differs.',
    );
    abortExternalChapter(signal);
  }
  const text = new TextDecoder('utf-8', { fatal: true }).decode(await packBlob.arrayBuffer());
  const { pack } = await preparePack(text, { decodeImage });
  abortExternalChapter(signal);
  required(
    text === JSON.stringify(pack),
    'External gameplay payload must use exact normalized compact pack bytes.',
  );
  required(
    pack.format === CLASSIC_PACK_VERSION &&
      pack.id === descriptor.id &&
      pack.version === '1.0.0' &&
      pack.campaigns.length === 1 &&
      pack.campaigns[0].levels.length === 3 &&
      pack.themes.length === 1 &&
      pack.themes[0].id === descriptor.themeId &&
      pack.dependencies.length === 0 &&
      Object.keys(pack.visualOverrides).length === 0 &&
      pack.levelVisuals.length === 0,
    'External gameplay payload must be a separate lightweight three-map Classic edition.',
  );
  const resolved = resolvePackCampaign(pack, pack.campaigns[0].id),
    executionCatalog = createExecutionCatalog([resolved]);
  required(
    campaignKey(resolved.campaign) === descriptor.campaignKey,
    'External campaign differs from its descriptor.',
  );
  const imported = await importMediaBundle(mediaBlob, { signal, decodeImage });
  abortExternalChapter(signal);
  const { document } = imported,
    library = document.library;
  required(
    document.owners.length === 1 &&
      campaignKey(document.owners[0].campaign) === descriptor.campaignKey &&
      document.owners[0].themeIds.length === 1 &&
      document.owners[0].themeIds[0] === descriptor.themeId &&
      document.legacy.items.length === 0 &&
      library.assets.length === 3 &&
      library.presentations.length === 3 &&
      library.assignments.length === 3,
    'External media contains unexpected owners or records.',
  );
  // Re-prepare against the exact resolved gameplay owner, rather than trusting a same-key claim.
  const authored = await prepareStoredStillMedia(library, imported.assets, {
    executionCatalog,
    signal,
    decodeImage,
  });
  required(
    canonicalJSON(authored.library.owners) === canonicalJSON(document.owners),
    'Retained owner differs from the exact gameplay payload.',
  );
  for (const o of descriptor.originals) {
    const level = resolved.campaign.levels.find((l) => l.id === o.levelId),
      a = library.assets.find((a) => a.id === o.assetId),
      p = library.presentations.find((p) => p.id === o.presentationId),
      assignment = library.assignments.find((x) => x.presentationId === o.presentationId);
    required(
      level?.revision === o.levelRevision && a && p && assignment,
      'External poster mapping is incomplete.',
    );
    for (const key of ['sha256', 'bytes', 'mime', 'width', 'height'])
      required(a[key] === o[key], 'Original facts differ from the authenticated media.');
    required(
      p.revision === 1 &&
        p.poster.assetId === a.id &&
        p.poster.fit === 'contain' &&
        p.poster.sampling === 'nearest' &&
        p.story === null &&
        canonicalJSON(p.identity) ===
          canonicalJSON({
            baseCampaignKey: descriptor.campaignKey,
            levelId: level.id,
            levelRevision: level.revision,
            themeId: descriptor.themeId,
          }) &&
        canonicalJSON(assignment.identity) === canonicalJSON(p.identity) &&
        assignment.revision === 1,
      'External poster assignment differs from its full authored identity.',
    );
  }
  const result = Object.freeze({ descriptor, pack, imported, executionCatalog });
  prepared.add(result);
  return result;
}
export const isPreparedExternalChapter = (value) => prepared.has(value);

export const EXTERNAL_CHAPTER_INDEX_FORMAT = 'revealline-external-chapter-index.v1';
export function validateExternalChapterIndex(candidate) {
  const index = boundedJSON(candidate, {
    maxBytes: 256 * 1024,
    maxNodes: 6500,
    maxArray: 12,
    maxString: 1024,
  });
  fields(index, ['format', 'chapters'], 'External chapter index');
  required(
    index.format === EXTERNAL_CHAPTER_INDEX_FORMAT &&
      Array.isArray(index.chapters) &&
      index.chapters.length <= EXTERNAL_CHAPTER_LIMITS.catalogChoices,
    'Invalid external chapter index.',
  );
  const ids = new Set(),
    campaigns = new Set();
  index.chapters = index.chapters.map((item) => {
    const d = validateExternalChapter(item);
    required(!ids.has(d.id) && !campaigns.has(d.campaignKey), 'Duplicate external edition index.');
    ids.add(d.id);
    campaigns.add(d.campaignKey);
    return d;
  });
  return freezeMedia(index);
}
export const emptyExternalChapterIndex = () =>
  validateExternalChapterIndex({ format: EXTERNAL_CHAPTER_INDEX_FORMAT, chapters: [] });
