import { boundedJSON, exactKeys, required } from './data-json.mjs';
import { inspectImageDataUrl } from './content.mjs';
import { MEDIA_LIMITS, STILL_ASSET_FORMAT, validateStillAsset } from './media-library.mjs';

const sizeGetter = Object.getOwnPropertyDescriptor(Blob.prototype, 'size').get;
const aborted = (signal) => {
  if (signal?.aborted) throw new DOMException('Still preparation cancelled.', 'AbortError');
};
const ownBlob = (source) => {
  let size;
  try {
    size = sizeGetter.call(source);
  } catch {
    throw new TypeError('Still import requires a Blob or File.');
  }
  required(
    size > 0 && size <= MEDIA_LIMITS.assetBytes,
    'Still import exceeds its 4 MiB byte budget.',
  );
  return Blob.prototype.slice.call(source, 0, size);
};
function imageHeader(bytes) {
  const mime =
    bytes[0] === 0x89 && bytes[1] === 0x50
      ? 'image/png'
      : bytes[0] === 0xff && bytes[1] === 0xd8
        ? 'image/jpeg'
        : bytes[0] === 0x52 && bytes[1] === 0x49 && bytes[2] === 0x46 && bytes[3] === 0x46
          ? 'image/webp'
          : null;
  required(mime, 'Only static PNG/JPEG/WebP bytes are supported.');
  let binary = '';
  for (let offset = 0; offset < bytes.length; offset += 16384)
    binary += String.fromCharCode(...bytes.subarray(offset, offset + 16384));
  const result = inspectImageDataUrl(`data:${mime};base64,${btoa(binary)}`);
  required(result.valid, `Invalid still image: ${result.errors.join('; ')}`);
  return result;
}

/** Browser adapter, invoked only after owned byte/header bounds. The temporary
 * object URL is revoked after complete decode, failure, cancellation or timeout.
 */
function browserDecode(blob, { signal }) {
  required(
    typeof globalThis.Image === 'function' && typeof URL.createObjectURL === 'function',
    'Browser image decoding is unavailable; inject a real decoder in other hosts.',
  );
  aborted(signal);
  return new Promise((resolve, reject) => {
    const image = new Image(),
      url = URL.createObjectURL(blob);
    let settled = false;
    const finish = (error, dimensions) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      signal?.removeEventListener('abort', cancel);
      image.onload = image.onerror = null;
      image.removeAttribute?.('src');
      URL.revokeObjectURL(url);
      if (error) reject(error);
      else resolve(dimensions);
    };
    const cancel = () => finish(new DOMException('Still preparation cancelled.', 'AbortError'));
    const timer = setTimeout(() => finish(new TypeError('Still image decode timed out.')), 15000);
    signal?.addEventListener('abort', cancel, { once: true });
    image.onerror = () => finish(new TypeError('Browser could not decode the still image.'));
    image.onload = async () => {
      try {
        if (typeof image.decode === 'function') await image.decode();
        finish(null, { naturalWidth: image.naturalWidth, naturalHeight: image.naturalHeight });
      } catch {
        finish(new TypeError('Browser could not completely decode the still image.'));
      }
    };
    // Image/URL allocation may run host code that aborts before the listener is
    // installed. addEventListener does not replay an earlier abort event.
    if (signal?.aborted) {
      cancel();
      return;
    }
    try {
      image.src = url;
    } catch (error) {
      finish(error);
    }
  });
}

/** Original bytes remain exact. This returns an owned record+Blob, never writes
 * storage or edits a campaign. The required decoder is a host capability, not
 * input metadata; Node callers must explicitly inject one. No header-only mode.
 */
export async function prepareStillAsset(
  source,
  metadata,
  { decodeImage = browserDecode, signal } = {},
) {
  aborted(signal);
  const owned = boundedJSON(metadata, { maxBytes: 8192, maxString: 2048 });
  exactKeys(owned, ['id', 'provenance'], 'still import metadata');
  // Validate caller-controlled metadata before reading bytes or allocating Image.
  validateStillAsset({
    ...owned,
    format: STILL_ASSET_FORMAT,
    sha256: '0'.repeat(64),
    bytes: 1,
    mime: 'image/png',
    width: 1,
    height: 1,
  });
  required(typeof decodeImage === 'function', 'A still image decoder is required.');
  const raw = ownBlob(source),
    bytes = new Uint8Array(await raw.arrayBuffer());
  aborted(signal);
  const header = imageHeader(bytes);
  const facts = validateStillAsset({
    ...owned,
    format: STILL_ASSET_FORMAT,
    sha256: '0'.repeat(64),
    bytes: bytes.length,
    mime: header.mime,
    width: header.width,
    height: header.height,
  });
  const blob = Blob.prototype.slice.call(raw, 0, raw.size, header.mime);
  const decoded = boundedJSON(await decodeImage(blob, { signal }), { maxBytes: 1024, maxNodes: 8 });
  aborted(signal);
  exactKeys(decoded, ['naturalWidth', 'naturalHeight'], 'decoded still dimensions');
  required(
    decoded.naturalWidth === header.width && decoded.naturalHeight === header.height,
    'Decoded still dimensions must match its header.',
  );
  const digest = await crypto.subtle.digest('SHA-256', bytes);
  aborted(signal);
  const sha256 = Array.from(new Uint8Array(digest), (byte) =>
    byte.toString(16).padStart(2, '0'),
  ).join('');
  const asset = validateStillAsset({
    ...facts,
    sha256,
  });
  return Object.freeze({ asset, blob });
}
