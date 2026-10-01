import { boundedJSON, canonicalJSON, required } from './data-json.mjs';
import { SOURCE_EXTERNAL_EDITIONS, sourceExternalChapter } from "./editions/standalone/external-chapters.mjs";
import { EXTERNAL_CHAPTER_LIMITS, prepareExternalChapter } from './external-chapter.mjs';

export const EXTERNAL_CATALOG_FORMAT = 'revealline-external-chapters.v1';
export const EXTERNAL_CATALOG_PATH = 'game/content/external-worlds.json';
const rootURL = new URL('../', import.meta.url);
const freeze = (value) => {
  if (value && typeof value === 'object') {
    for (const child of Object.values(value)) freeze(child);
    Object.freeze(value);
  }
  return value;
};
export const EXTERNAL_CATALOG = freeze({
  format: EXTERNAL_CATALOG_FORMAT,
  chapters: SOURCE_EXTERNAL_EDITIONS.map(({ descriptor, name, description }) => ({
    id: descriptor.id,
    name,
    description,
    themeId: descriptor.themeId,
    levels: descriptor.originals.length,
    campaignKey: descriptor.campaignKey,
    pack: {
      path: `optional/external-chapters/${descriptor.id}/pack.json`,
      ...descriptor.pack,
    },
    media: {
      path: `optional/external-chapters/${descriptor.id}/media.rlmedia`,
      ...descriptor.media,
    },
  })),
});

/** Catalog files describe this exact source registry; downloads never register authority. */
export function prepareExternalCatalog(source) {
  const candidate = boundedJSON(source, {
    maxBytes: 65536,
    maxNodes: 2048,
    maxArray: EXTERNAL_CHAPTER_LIMITS.catalogChoices,
    maxString: 1024,
  });
  required(
    canonicalJSON(candidate) === canonicalJSON(EXTERNAL_CATALOG),
    'External chapter catalog differs from this game edition. Reload the matching release.',
  );
  return EXTERNAL_CATALOG;
}
const check = (signal) => {
  if (signal?.aborted) throw new DOMException('Chapter download cancelled.', 'AbortError');
};
async function readBytes(
  relative,
  maximum,
  { baseURL = rootURL, fetch: request = globalThis.fetch, signal } = {},
) {
  check(signal);
  const base = new URL(baseURL),
    url = new URL(relative, base);
  required(
    ['http:', 'https:'].includes(base.protocol) &&
      base.href.endsWith('/') &&
      !base.username &&
      !base.password &&
      !base.search &&
      !base.hash &&
      url.origin === base.origin &&
      url.href.startsWith(base.href),
    'External chapter downloads require this game’s same-origin distribution.',
  );
  const response = await request(url.href, {
    signal,
    redirect: 'error',
    credentials: 'same-origin',
  });
  let reader;
  try {
    check(signal);
    required(
      response.ok,
      `Chapter download unavailable (HTTP ${response.status}). Retry when connected.`,
    );
    required(
      !response.redirected && (!response.url || response.url === url.href),
      'Chapter download must stay at its exact edition URL.',
    );
    const length = response.headers.get('content-length');
    required(
      length === null || (/^\d+$/.test(length) && Number(length) <= maximum),
      'Chapter response exceeds its published byte budget.',
    );
    required(
      response.body?.getReader,
      'Bounded chapter downloads are unavailable in this browser.',
    );
    reader = response.body.getReader();
  } catch (error) {
    await response.body?.cancel?.().catch(() => {});
    throw error;
  }
  const parts = [];
  let total = 0,
    finished = false;
  const cancel = () => {
    void reader.cancel().catch(() => {});
  };
  signal?.addEventListener('abort', cancel, { once: true });
  try {
    for (;;) {
      check(signal);
      const result = await reader.read();
      check(signal);
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
export async function loadExternalCatalog(options) {
  const bytes = await readBytes(EXTERNAL_CATALOG_PATH, 65536, options);
  return prepareExternalCatalog(new TextDecoder('utf-8', { fatal: true }).decode(bytes));
}
export async function prepareExternalDownload(chapterId, { decodeImage, ...options } = {}) {
  const descriptor = sourceExternalChapter(chapterId);
  const item = EXTERNAL_CATALOG.chapters.find((entry) => entry.id === descriptor.id);
  const transport = {
    ...options,
    baseURL: new URL(options.baseURL === undefined ? rootURL : options.baseURL).href,
    fetch: options.fetch === undefined ? globalThis.fetch : options.fetch,
  };
  const pack = await readBytes(item.pack.path, item.pack.bytes, transport);
  required(
    pack.byteLength === item.pack.bytes,
    'Gameplay download is incomplete. Nothing was installed.',
  );
  const media = await readBytes(item.media.path, item.media.bytes, transport);
  required(
    media.byteLength === item.media.bytes,
    'Original pictures download is incomplete. Nothing was installed.',
  );
  check(options.signal);
  return prepareExternalChapter(
    descriptor,
    {
      pack: new Blob([pack], { type: 'application/json' }),
      media: new Blob([media], { type: 'application/octet-stream' }),
    },
    { signal: options.signal, ...(decodeImage ? { decodeImage } : {}) },
  );
}
