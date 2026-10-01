import { boundedJSON, exactKeys, required } from './data-json.mjs';
import { preparePack, PACK_LIMITS } from './packs.mjs';
import { campaignKey } from './library.mjs';

export const OPTIONAL_CATALOG_FORMAT = 'revealline-optional-chapters.v1';
export const OPTIONAL_CATALOG_PATH = 'game/content/optional-worlds.json';
const rootURL = new URL('../', import.meta.url);
const aborted = (signal) => {
  if (signal?.aborted) throw new DOMException('Chapter download cancelled.', 'AbortError');
};
const text = (value, limit) => typeof value === 'string' && value.trim() && value.length <= limit;
const id = (value) => typeof value === 'string' && /^[a-z0-9][a-z0-9-]{0,95}$/.test(value);
const hash = (value) => typeof value === 'string' && /^[a-f0-9]{64}$/.test(value);
export function prepareOptionalCatalog(source) {
  const catalog = boundedJSON(source, {
    maxBytes: 65536,
    maxNodes: 2048,
    maxArray: 12,
    maxString: 1024,
  });
  exactKeys(catalog, ['format', 'packs'], 'Optional chapter catalog');
  required(
    catalog.format === OPTIONAL_CATALOG_FORMAT &&
      Array.isArray(catalog.packs) &&
      catalog.packs.length <= 12,
    'Unsupported optional chapter catalog.',
  );
  const ids = new Set(),
    campaigns = new Set();
  for (const item of catalog.packs) {
    exactKeys(
      item,
      [
        'id',
        'version',
        'name',
        'description',
        'themeId',
        'levels',
        'path',
        'bytes',
        'normalizedBytes',
        'sha256',
        'normalizedSha256',
        'campaignKey',
      ],
      'Optional chapter',
    );
    required(
      id(item.id) &&
        !ids.has(item.id) &&
        text(item.version, 40) &&
        text(item.name, 100) &&
        text(item.description, 640) &&
        id(item.themeId),
      'Invalid optional chapter description.',
    );
    required(
      Number.isSafeInteger(item.levels) && item.levels > 0 && item.levels <= 64,
      'Invalid optional chapter map count.',
    );
    required(
      item.path ===
        (item.id === 'fpv-route-choices'
          ? 'authoring/library/fpv-route-choices/packs/fpv-route-choices.json'
          : `authoring/library/four-worlds-chapters/packs/${item.id}.json`),
      'Optional chapter path must name its exact local distribution file.',
    );
    required(
      Number.isSafeInteger(item.bytes) &&
        item.bytes > 0 &&
        item.bytes <= PACK_LIMITS.maxBytes &&
        Number.isSafeInteger(item.normalizedBytes) &&
        item.normalizedBytes > 0 &&
        item.normalizedBytes <= item.bytes,
      'Optional chapter exceeds its byte budget.',
    );
    required(
      hash(item.sha256) &&
        hash(item.normalizedSha256) &&
        text(item.campaignKey, 512) &&
        !campaigns.has(item.campaignKey),
      'Invalid optional chapter identity.',
    );
    ids.add(item.id);
    campaigns.add(item.campaignKey);
    Object.freeze(item);
  }
  Object.freeze(catalog.packs);
  return Object.freeze(catalog);
}
export function assertOptionalPack(pack, item) {
  required(
    pack.id === item.id &&
      pack.version === item.version &&
      pack.name === item.name &&
      pack.campaigns?.length === 1 &&
      pack.themes?.length === 1 &&
      pack.themes[0].id === item.themeId &&
      pack.campaigns[0].levels.length === item.levels &&
      campaignKey({ ...pack.campaigns[0], classRecipes: pack.classRecipes }) === item.campaignKey,
    'Downloaded chapter differs from its published identity.',
  );
  return pack;
}

const verifiedInstalled = new WeakMap();
const immutable = (value) => {
  if (!value || typeof value !== 'object') return true;
  if (!Object.isFrozen(value)) return false;
  return Object.values(Object.getOwnPropertyDescriptors(value)).every(
    (descriptor) => 'value' in descriptor && immutable(descriptor.value),
  );
};
/** Only content-identical originals qualify as installed catalog editions.
 * Cache belongs to immutable prepared pack objects, never just an ID/version.
 */
export async function verifyOptionalInstalled(pack, item, { signal } = {}) {
  aborted(signal);
  assertOptionalPack(pack, item);
  const cacheable = immutable(pack);
  const cached = cacheable ? verifiedInstalled.get(pack)?.get(item.normalizedSha256) : null;
  if (cached) {
    await cached;
    aborted(signal);
    return pack;
  }
  const verification = (async () => {
    const bytes = new TextEncoder().encode(JSON.stringify(pack));
    required(
      bytes.length === item.normalizedBytes,
      'A different edition of this world is installed. Manage it in Packs before installing this original collection.',
    );
    const digest = new Uint8Array(await crypto.subtle.digest('SHA-256', bytes));
    required(
      Array.from(digest, (v) => v.toString(16).padStart(2, '0')).join('') === item.normalizedSha256,
      'A different artwork edition of this world is installed. Manage it in Packs before installing this original collection.',
    );
  })();
  if (cacheable) {
    if (!verifiedInstalled.has(pack)) verifiedInstalled.set(pack, new Map());
    verifiedInstalled.get(pack).set(item.normalizedSha256, verification);
  }
  await verification;
  aborted(signal);
  return pack;
}

async function readBytes(
  relative,
  maximum,
  { baseURL = rootURL, fetch: request = globalThis.fetch, signal } = {},
) {
  aborted(signal);
  const base = new URL(baseURL),
    url = new URL(relative, base);
  required(
    ['http:', 'https:'].includes(base.protocol) &&
      url.origin === base.origin &&
      url.href.startsWith(base.href),
    'Optional downloads require this game’s same-origin HTTP distribution.',
  );
  const response = await request(url.href, {
    signal,
    redirect: 'error',
    credentials: 'same-origin',
  });
  aborted(signal);
  required(
    response.ok,
    `Chapter download unavailable (HTTP ${response.status}). Retry when connected.`,
  );
  const length = response.headers.get('content-length');
  required(
    length === null || (/^\d+$/.test(length) && Number(length) <= maximum),
    'Chapter response exceeds its published byte budget.',
  );
  required(response.body?.getReader, 'Bounded chapter downloads are unavailable in this browser.');
  const reader = response.body.getReader(),
    parts = [];
  let total = 0,
    finished = false;
  const cancel = () => {
    void reader.cancel().catch(() => {});
  };
  signal?.addEventListener('abort', cancel, { once: true });
  try {
    for (;;) {
      aborted(signal);
      const result = await reader.read();
      aborted(signal);
      if (result.done) {
        finished = true;
        break;
      }
      total += result.value.byteLength;
      required(total <= maximum, 'Chapter response exceeds its published byte budget.');
      parts.push(result.value);
    }
  } finally {
    signal?.removeEventListener('abort', cancel);
    if (!finished) await reader.cancel().catch(() => {});
    reader.releaseLock();
  }
  const bytes = new Uint8Array(total);
  let offset = 0;
  for (const part of parts) {
    bytes.set(part, offset);
    offset += part.byteLength;
  }
  return bytes;
}
export async function loadOptionalCatalog(options) {
  const bytes = await readBytes(OPTIONAL_CATALOG_PATH, 65536, options);
  return prepareOptionalCatalog(
    JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(bytes)),
  );
}
export async function prepareOptionalDownload(item, { library, decodeImage, ...options } = {}) {
  const checked = prepareOptionalCatalog({ format: OPTIONAL_CATALOG_FORMAT, packs: [item] })
    .packs[0];
  const bytes = await readBytes(checked.path, checked.bytes, options);
  required(
    bytes.length === checked.bytes,
    'Chapter download is incomplete. Nothing was installed.',
  );
  const digest = new Uint8Array(await crypto.subtle.digest('SHA-256', bytes));
  aborted(options.signal);
  required(
    Array.from(digest, (v) => v.toString(16).padStart(2, '0')).join('') === checked.sha256,
    'Chapter checksum differs. Nothing was installed; retry from the matching release.',
  );
  const source = JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(bytes));
  required(
    new TextEncoder().encode(JSON.stringify(source)).length === checked.normalizedBytes,
    'Chapter normalized size differs.',
  );
  let prepared;
  try {
    prepared = await preparePack(source, { library, ...(decodeImage ? { decodeImage } : {}) });
  } catch (error) {
    if (error.message === 'JSON exceeds its byte budget.')
      throw new Error(
        'This world does not fit the installed library’s 48 MiB limit. Export a complete backup in Manage packs & backups, then explicitly remove a pack before retrying.',
      );
    throw error;
  }
  aborted(options.signal);
  return verifyOptionalInstalled(prepared.pack, checked, { signal: options.signal });
}
