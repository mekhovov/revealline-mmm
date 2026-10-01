import { boundedJSON, exactKeys, required, stableId, dataIdentity } from '../data-json.mjs';
import { inspectImageDataUrl } from '../content.mjs';
import { freezeDesign } from './catalogs.mjs';
import { CONTENT_ARTWORK_LOAD_TIMEOUT_MS, CONTENT_ASSET_MAX_BYTES } from './limits.mjs';

const verified = new WeakMap();
export function compileAssetRevision(source) {
  const asset = boundedJSON(source, { maxBytes: 4096, maxNodes: 30, maxDepth: 2 });
  exactKeys(
    asset,
    [
      'format',
      'id',
      'revision',
      'kind',
      'path',
      'sha256',
      'bytes',
      'width',
      'height',
      'alt',
      'review',
    ],
    'asset',
  );
  required(
    asset.format === 'AssetRevisionV1' && stableId(asset.id) && stableId(asset.revision),
    'Invalid asset revision.',
  );
  required(
    asset.kind === 'reveal-background' && asset.review === 'candidate',
    'Only candidate reveal backgrounds are supported.',
  );
  required(
    typeof asset.path === 'string' &&
      /^(?:content-design\/assets|editions\/assets)\/[a-z0-9/_-]+\.(?:png|jpe?g|webp)$/.test(
        asset.path,
      ) &&
      !asset.path.includes('//'),
    'Asset must be a local versioned PNG, JPEG or WebP path.',
  );
  required(
    typeof asset.sha256 === 'string' && /^[a-f0-9]{64}$/.test(asset.sha256),
    'Asset needs its original SHA-256.',
  );
  required(
    Number.isSafeInteger(asset.bytes) && asset.bytes > 0 && asset.bytes <= CONTENT_ASSET_MAX_BYTES,
    'Asset exceeds the 4 MiB image budget.',
  );
  required(
    [asset.width, asset.height].every((n) => Number.isInteger(n) && n > 0 && n <= 8192) &&
      asset.width * asset.height <= 16000000,
    'Invalid image dimensions.',
  );
  required(
    typeof asset.alt === 'string' && asset.alt.trim() && asset.alt.length <= 512,
    'Asset needs a picture description.',
  );
  return freezeDesign(asset);
}

/** MIME is derived from the immutable local path, so historical PNG records
 * keep their original schema and identity. The byte inspector enforces it. */
export function assetRevisionMime(source) {
  const asset = compileAssetRevision(source);
  return asset.path.endsWith('.png')
    ? 'image/png'
    : asset.path.endsWith('.webp')
      ? 'image/webp'
      : 'image/jpeg';
}

export function verifiedPreviewBackground(asset, media) {
  const pin = compileAssetRevision(asset);
  required(
    verified.get(media) === dataIdentity(pin),
    'Load and verify this exact asset revision before preview.',
  );
  return { dataUrl: media.dataUrl, fit: 'cover', name: pin.alt };
}

/** Same-origin, bounded bytes, exact digest and dimensions. Merely assigning an
 * asset ID never establishes that art exists, has loaded or is visually approved. */
export async function loadPreviewArtwork(
  source,
  {
    signal,
    fetchAsset = (path, options) => fetch(new URL(path, new URL('../', import.meta.url)), options),
    digest = (bytes) => crypto.subtle.digest('SHA-256', bytes),
    timeoutMs = CONTENT_ARTWORK_LOAD_TIMEOUT_MS,
  } = {},
) {
  const asset = compileAssetRevision(source);
  required(
    Number.isFinite(timeoutMs) && timeoutMs > 0 && timeoutMs <= CONTENT_ARTWORK_LOAD_TIMEOUT_MS,
    'Invalid artwork timeout.',
  );
  const controller = new AbortController();
  let timer, cancel, reader;
  const stop = new Promise((_, reject) => {
    cancel = () => {
      controller.abort();
      reject(new DOMException('Artwork preview cancelled.', 'AbortError'));
    };
    timer = setTimeout(() => {
      controller.abort();
      reject(new Error('Artwork did not load in time. Your draft is intact.'));
    }, timeoutMs);
    signal?.addEventListener('abort', cancel, { once: true });
    if (signal?.aborted) cancel();
  });
  try {
    return await Promise.race([
      stop,
      Promise.resolve().then(async () => {
        if (controller.signal.aborted)
          throw new DOMException('Artwork preview cancelled.', 'AbortError');
        const response = await fetchAsset(asset.path, {
          signal: controller.signal,
          redirect: 'error',
        });
        if (controller.signal.aborted)
          throw new DOMException('Artwork preview cancelled.', 'AbortError');
        required(
          response.ok && !response.redirected,
          'Artwork failed to load without redirection.',
        );
        required(response.body?.getReader, 'Artwork streaming is unavailable.');
        reader = response.body.getReader();
        const chunks = [];
        let length = 0;
        while (true) {
          const { done, value } = await reader.read();
          if (controller.signal.aborted)
            throw new DOMException('Artwork preview cancelled.', 'AbortError');
          if (done) break;
          length += value.byteLength;
          required(length <= asset.bytes, 'Artwork exceeds its pinned byte length.');
          chunks.push(value);
        }
        required(length === asset.bytes, 'Artwork byte length differs from its pinned revision.');
        const bytes = new Uint8Array(length);
        let offset = 0;
        for (const chunk of chunks) {
          bytes.set(chunk, offset);
          offset += chunk.length;
        }
        const hash = Array.from(new Uint8Array(await digest(bytes)), (b) =>
          b.toString(16).padStart(2, '0'),
        ).join('');
        required(hash === asset.sha256, 'Artwork digest differs from its pinned revision.');
        let binary = '';
        for (let start = 0; start < bytes.length; start += 16384)
          binary += String.fromCharCode(...bytes.subarray(start, start + 16384));
        const mime = assetRevisionMime(asset);
        const media = { dataUrl: `data:${mime};base64,${btoa(binary)}` };
        const image = inspectImageDataUrl(media.dataUrl);
        required(
          image.valid &&
            image.mime === mime &&
            image.width === asset.width &&
            image.height === asset.height,
          'Artwork dimensions or raster header differ from its revision.',
        );
        verified.set(media, dataIdentity(asset));
        return Object.freeze(media);
      }),
    ]);
  } finally {
    clearTimeout(timer);
    signal?.removeEventListener('abort', cancel);
    controller.abort();
    try {
      if (reader) Promise.resolve(reader.cancel()).catch(() => {});
    } catch {
      /* Already closed. */
    }
  }
}
