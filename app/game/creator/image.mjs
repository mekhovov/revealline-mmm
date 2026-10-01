import { boundedJSON, exactKeys, required } from '../data-json.mjs';
import { inspectImageDataUrl } from '../content.mjs';
import { compileAssetRevision } from '../content-design/assets.mjs';
import { creatorAbort, creatorSHA256, imageDataURL, ownCreatorBlob } from './bytes.mjs';
import { t } from '../i18n/index.mjs';

export const CREATOR_IMAGE_LIMITS = Object.freeze({
  sourceBytes: 4 * 1024 * 1024,
  width: 1280,
  height: 640,
  thumbnailWidth: 320,
  thumbnailHeight: 160,
});
function imageHeader(bytes) {
  const mime = bytes[0] === 137 ? 'image/png' : bytes[0] === 255 ? 'image/jpeg' : 'image/webp';
  const header = inspectImageDataUrl(imageDataURL(bytes, mime));
  required(header.valid, `Cannot use this picture. ${header.errors.join(' ')}`);
  return header;
}
const canvasBlob = (canvas) =>
  new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) =>
        blob ? resolve(blob) : reject(new Error(t('errors:creator.pictureConversionFailed'))),
      'image/png',
    );
  });

/** Decode only after bounded header inspection. Render oriented pixels into new
 * PNGs; source metadata and the original filename never enter the runtime asset.
 * Callers queue this operation serially to bound full-size pixel allocations. */
export async function prepareCreatorImage(
  source,
  options,
  {
    signal,
    decodeBitmap = (blob, settings) => createImageBitmap(blob, settings),
    createCanvas = () => document.createElement('canvas'),
    timeoutMs = 20000,
  } = {},
) {
  creatorAbort(signal);
  const settings = boundedJSON(options, { maxBytes: 4096, maxNodes: 8, maxDepth: 1 });
  exactKeys(settings, ['alt', 'fit'], 'picture options');
  required(
    typeof settings.alt === 'string' && settings.alt.trim() && settings.alt.length <= 512,
    t('errors:creator.describePicture'),
  );
  required(['contain', 'cover'].includes(settings.fit), t('errors:creator.choosePictureFitting'));
  required(
    Number.isFinite(timeoutMs) && timeoutMs > 0 && timeoutMs <= 20000,
    t('errors:creator.invalidPictureTimeout'),
  );
  const original = ownCreatorBlob(source, CREATOR_IMAGE_LIMITS.sourceBytes, t('interface:picture'));
  let stopped = false,
    timer,
    cancel,
    bitmap;
  const canvases = [];
  const check = () => {
    creatorAbort(signal);
    required(!stopped, t('errors:creator.picturePreparationExpired'));
  };
  const stop = new Promise((_, reject) => {
    cancel = () => {
      stopped = true;
      reject(new DOMException(t('errors:creator.picturePreparationCancelled'), 'AbortError'));
    };
    signal?.addEventListener('abort', cancel, { once: true });
    if (signal?.aborted) cancel();
    timer = setTimeout(() => {
      stopped = true;
      reject(new Error(t('errors:creator.picturePreparationTimedOut')));
    }, timeoutMs);
  });
  try {
    return await Promise.race([
      stop,
      (async () => {
        const bytes = new Uint8Array(await original.arrayBuffer());
        check();
        const header = imageHeader(bytes);
        const sourceHash = await creatorSHA256(bytes);
        check();
        const decoded = await decodeBitmap(new Blob([original], { type: header.mime }), {
          imageOrientation: 'from-image',
        });
        if (stopped || signal?.aborted) {
          decoded.close?.();
          check();
        }
        bitmap = decoded;
        const { width, height } = bitmap;
        // EXIF orientation may swap axes, but must not introduce a larger canvas.
        required(
          (width === header.width && height === header.height) ||
            (width === header.height && height === header.width),
          t('errors:creator.decodedDimensionsDiffer'),
        );
        const render = async (w, h) => {
          check();
          const canvas = createCanvas();
          canvases.push(canvas);
          canvas.width = w;
          canvas.height = h;
          const context = canvas.getContext('2d');
          required(context, t('errors:creator.canvasRequired'));
          context.fillStyle = '#101923';
          context.fillRect(0, 0, w, h);
          const scale =
            settings.fit === 'contain'
              ? Math.min(w / width, h / height)
              : Math.max(w / width, h / height);
          context.drawImage(
            bitmap,
            (w - width * scale) / 2,
            (h - height * scale) / 2,
            width * scale,
            height * scale,
          );
          const blob = ownCreatorBlob(
            await canvasBlob(canvas),
            CREATOR_IMAGE_LIMITS.sourceBytes,
            t('interface:creator.preparedPicture'),
          );
          check();
          const outputBytes = new Uint8Array(await blob.arrayBuffer());
          check();
          const output = imageHeader(outputBytes);
          required(
            output.mime === 'image/png' && output.width === w && output.height === h,
            t('errors:creator.preparedPictureEncoding'),
          );
          return {
            blob: new Blob([blob], { type: 'image/png' }),
            sha256: await creatorSHA256(outputBytes),
          };
        };
        const runtime = await render(CREATOR_IMAGE_LIMITS.width, CREATOR_IMAGE_LIMITS.height);
        const thumbnail = await render(
          CREATOR_IMAGE_LIMITS.thumbnailWidth,
          CREATOR_IMAGE_LIMITS.thumbnailHeight,
        );
        check();
        const asset = compileAssetRevision({
          format: 'AssetRevisionV1',
          id: 'creator-picture',
          revision: '1',
          kind: 'reveal-background',
          path: `content-design/assets/creator/${runtime.sha256}.png`,
          sha256: runtime.sha256,
          bytes: runtime.blob.size,
          width: CREATOR_IMAGE_LIMITS.width,
          height: CREATOR_IMAGE_LIMITS.height,
          alt: settings.alt.trim(),
          review: 'candidate',
        });
        return Object.freeze({
          asset,
          runtime: Object.freeze(runtime),
          thumbnail: Object.freeze(thumbnail),
          // Deliberately separate from the shareable runtime object. Only the
          // explicit source-backup action may serialize these private bytes.
          original: Object.freeze({ blob: original, sha256: sourceHash, mime: header.mime }),
          editing: Object.freeze({ fit: settings.fit }),
        });
      })(),
    ]);
  } finally {
    stopped = true;
    clearTimeout(timer);
    signal?.removeEventListener('abort', cancel);
    bitmap?.close?.();
    for (const canvas of canvases) {
      canvas.width = 0;
      canvas.height = 0;
    }
  }
}
