import { boundedJSON, canonicalJSON, exactKeys, required, stableId } from '../data-json.mjs';
import { inspectImageDataUrl } from '../content.mjs';
import { hashPresentationBytes } from '../presentation/bundle.mjs';
import { validateCoopPack } from './recipes.mjs';

export const COOP_PRESENTATION_FORMAT = 'revealline-team-presentation-envelope.v1';
export const COOP_PRESENTATION_MIME = 'application/vnd.revealline.team-presentation';
export const COOP_PRESENTATION_LIMITS = Object.freeze({
  manifestBytes: 2 * 1024 * 1024,
  bundleBytes: 32 * 1024 * 1024,
  bodyBytes: 24 * 1024 * 1024,
  assetBytes: 4 * 1024 * 1024,
  assets: 24,
  width: 1152,
  height: 576,
});
const JSON_LIMITS = Object.freeze({
  maxBytes: COOP_PRESENTATION_LIMITS.manifestBytes,
  maxNodes: 200000,
  maxDepth: 18,
  maxArray: 4096,
  maxString: 8192,
});
const MAGIC = new TextEncoder().encode('RLTEAM1\n');
const nativeSize = Object.getOwnPropertyDescriptor(Blob.prototype, 'size').get;
const nativeSlice = Blob.prototype.slice;
const nativeRead = Blob.prototype.arrayBuffer;
const owners = new WeakMap();
const digest = (value) => typeof value === 'string' && /^[a-f0-9]{64}$/.test(value);
const revision = (value) => Number.isSafeInteger(value) && value > 0 && value <= 1000000;
const text = (value, max) => typeof value === 'string' && value.trim() && value.length <= max;
const abort = (signal) => {
  if (signal?.aborted) throw new DOMException('Team artwork import cancelled.', 'AbortError');
};
function fields(value, names, label) {
  const keys = names.split(' ');
  exactKeys(value, keys, label);
  required(
    keys.every((key) => Object.hasOwn(value, key)),
    `${label} is incomplete.`,
  );
}
function freeze(value) {
  if (value && typeof value === 'object') {
    for (const child of Object.values(value)) freeze(child);
    Object.freeze(value);
  }
  return value;
}
function ref(value, label) {
  fields(value, 'id revision', label);
  required(stableId(value.id) && revision(value.revision), `Invalid ${label}.`);
}
function ownedBlob(source) {
  let size;
  try {
    size = nativeSize.call(source);
  } catch {
    throw new TypeError('Choose a native Team artwork file.');
  }
  required(
    size >= 12 && size <= COOP_PRESENTATION_LIMITS.bundleBytes,
    'Invalid Team artwork file size.',
  );
  return nativeSlice.call(source, 0, size, COOP_PRESENTATION_MIME);
}
async function readBytes(blob, start, end, signal) {
  abort(signal);
  const result = new Uint8Array(await nativeRead.call(nativeSlice.call(blob, start, end)));
  abort(signal);
  required(result.length === end - start, 'Truncated Team artwork file.');
  return result;
}
function report(callback, stage, index, total, signal) {
  abort(signal);
  callback?.(Object.freeze({ stage, index, total }));
  abort(signal);
}
function dataURL(bytes, mime) {
  let binary = '';
  for (let i = 0; i < bytes.length; i += 16384)
    binary += String.fromCharCode(...bytes.subarray(i, i + 16384));
  return `data:${mime};base64,${btoa(binary)}`;
}
async function hashJSON(value, signal) {
  const hash = await hashPresentationBytes(new TextEncoder().encode(canonicalJSON(value)));
  abort(signal);
  return hash;
}
function manifestShape(manifest) {
  fields(manifest, 'format pack packSha256 presentation', 'Team artwork manifest');
  required(manifest.format === COOP_PRESENTATION_FORMAT, 'Unsupported Team artwork format.');
  const validation = validateCoopPack(manifest.pack);
  required(validation.valid, validation.errors.join(' '));
  required(digest(manifest.packSha256), 'Invalid Team pack hash.');
  const presentation = manifest.presentation;
  fields(presentation, 'id revision theme levels assets', 'Team artwork presentation');
  required(
    stableId(presentation.id) && revision(presentation.revision),
    'Invalid presentation identity.',
  );
  fields(presentation.theme, 'id revision collection', 'Team artwork theme');
  required(
    stableId(presentation.theme.id) && revision(presentation.theme.revision),
    'Invalid theme identity.',
  );
  if (presentation.theme.collection !== null)
    ref(presentation.theme.collection, 'Team artwork collection');
  required(
    Array.isArray(presentation.levels) &&
      presentation.levels.length === manifest.pack.levels.length,
    'Every Team level needs exactly one artwork mapping.',
  );
  required(
    Array.isArray(presentation.assets) &&
      presentation.assets.length > 0 &&
      presentation.assets.length <= COOP_PRESENTATION_LIMITS.assets,
    'Invalid Team artwork asset table.',
  );
  const assets = new Map();
  let last = '',
    total = 0;
  for (const row of presentation.assets) {
    fields(row, 'sha256 bytes mime width height provenance', 'Team artwork asset');
    required(
      digest(row.sha256) &&
        row.sha256 > last &&
        Number.isSafeInteger(row.bytes) &&
        row.bytes > 0 &&
        row.bytes <= COOP_PRESENTATION_LIMITS.assetBytes,
      'Invalid, unordered or duplicate Team artwork asset.',
    );
    required(
      ['image/png', 'image/jpeg', 'image/webp'].includes(row.mime) &&
        row.width === COOP_PRESENTATION_LIMITS.width &&
        row.height === COOP_PRESENTATION_LIMITS.height,
      'Team artwork requires complete 1152×576 PNG, JPEG or WebP images.',
    );
    fields(row.provenance, 'kind attribution source', 'Team artwork provenance');
    required(
      row.provenance.kind === 'user-supplied' &&
        text(row.provenance.attribution, 512) &&
        text(row.provenance.source, 2048),
      'Invalid local artwork provenance.',
    );
    assets.set(row.sha256, row);
    last = row.sha256;
    total += row.bytes;
  }
  required(
    total <= COOP_PRESENTATION_LIMITS.bodyBytes,
    'Team artwork exceeds its combined image budget.',
  );
  const mappings = new Map(),
    used = new Set();
  for (const row of presentation.levels) {
    fields(row, 'levelId levelRevision levelSha256 pictureSha256', 'Team artwork mapping');
    const level = manifest.pack.levels.find((entry) => entry.id === row.levelId);
    required(
      level &&
        level.revision === row.levelRevision &&
        !mappings.has(row.levelId) &&
        digest(row.levelSha256) &&
        digest(row.pictureSha256) &&
        assets.has(row.pictureSha256),
      'Team artwork mappings must match the exact pack levels and referenced pictures.',
    );
    mappings.set(row.levelId, row);
    used.add(row.pictureSha256);
  }
  required(used.size === assets.size, 'Team artwork contains unused images.');
  return { assets, mappings, total };
}

/** Validate every original before returning an opaque candidate. This does not
 * confer release-art approval or resolve compatibility with the host's catalogue.
 * The caller must supply a bounded real decoder and retain one candidate at most.
 */
export async function readCoopPresentationEnvelope(
  source,
  { decodeImage, signal, onProgress } = {},
) {
  abort(signal);
  required(typeof decodeImage === 'function', 'Team artwork needs complete image decoding.');
  required(
    onProgress === undefined || typeof onProgress === 'function',
    'Invalid import status callback.',
  );
  const blob = ownedBlob(source),
    size = nativeSize.call(blob);
  report(onProgress, 'manifest', 0, 0, signal);
  const header = await readBytes(blob, 0, 12, signal);
  required(
    MAGIC.every((byte, i) => header[i] === byte),
    'Unsupported Team artwork file.',
  );
  const length = new DataView(header.buffer, header.byteOffset, header.byteLength).getUint32(8);
  required(
    length > 0 && length <= COOP_PRESENTATION_LIMITS.manifestBytes && length + 12 <= size,
    'Invalid Team artwork manifest length.',
  );
  const manifestBytes = await readBytes(blob, 12, 12 + length, signal);
  const manifest = boundedJSON(
    new TextDecoder('utf-8', { fatal: true }).decode(manifestBytes),
    JSON_LIMITS,
  );
  const { assets, mappings, total } = manifestShape(manifest);
  required(12 + length + total === size, 'Truncated or trailing Team artwork payload.');
  required(
    (await hashJSON(manifest.pack, signal)) === manifest.packSha256,
    'Team gameplay pack hash does not match.',
  );
  for (const level of manifest.pack.levels)
    required(
      (await hashJSON(level, signal)) === mappings.get(level.id).levelSha256,
      'Team level hash does not match.',
    );
  const manifestSha256 = await hashPresentationBytes(manifestBytes);
  abort(signal);
  let offset = 12 + length,
    index = 0;
  const pictures = new Map();
  for (const [sha256, file] of assets) {
    report(onProgress, 'checking-picture', index, assets.size, signal);
    const bytes = await readBytes(blob, offset, offset + file.bytes, signal);
    required(
      (await hashPresentationBytes(bytes)) === sha256,
      'Team artwork bytes do not match their hash.',
    );
    abort(signal);
    const header = inspectImageDataUrl(dataURL(bytes, file.mime));
    required(
      header.valid && header.width === file.width && header.height === file.height,
      'Team artwork image header or dimensions are invalid.',
    );
    const picture = nativeSlice.call(blob, offset, offset + file.bytes, file.mime);
    let lease, failure;
    try {
      // Do not abandon a decoder Promise on user cancellation. The owning import
      // remains busy until its bounded decoder settles and releases its image.
      lease = await decodeImage(picture, {});
      abort(signal);
      required(
        lease &&
          typeof lease.release === 'function' &&
          lease.image?.naturalWidth === file.width &&
          lease.image?.naturalHeight === file.height,
        'Team artwork could not fully decode at its declared dimensions.',
      );
    } catch (error) {
      failure = error;
    }
    try {
      if (typeof lease?.release === 'function') lease.release();
    } catch (error) {
      failure ??= error;
    }
    if (failure) throw failure;
    abort(signal);
    pictures.set(sha256, picture);
    offset += file.bytes;
    index++;
  }
  report(onProgress, 'ready', index, assets.size, signal);
  const receipt = freeze({
    sourceKind: 'local-import',
    format: COOP_PRESENTATION_FORMAT,
    presentation: { id: manifest.presentation.id, revision: manifest.presentation.revision },
    manifestSha256,
    packSha256: manifest.packSha256,
    theme: manifest.presentation.theme,
    assets: manifest.presentation.assets,
  });
  const owner = Object.freeze({ pack: freeze(manifest.pack), receipt });
  owners.set(owner, { blob, assets, mappings, pictures, active: true });
  return owner;
}

function record(owner) {
  const value = owners.get(owner);
  required(value?.active, 'This Team artwork source is unavailable or has been released.');
  return value;
}

/** Exact original export; no canonical rewriting, pixel conversion or storage. */
export function exportCoopPresentationEnvelope(owner) {
  return record(owner).blob;
}

/** Return an immutable native slice for one exact accepted gameplay level. */
export function readCoopPresentationPicture(owner, sourceLevel) {
  const value = record(owner),
    level = boundedJSON(sourceLevel, JSON_LIMITS);
  const accepted = owner.pack.levels.find((entry) => entry.id === level.id);
  required(
    accepted && canonicalJSON(accepted) === canonicalJSON(level),
    'Choose an exact level from the accepted Team artwork pack.',
  );
  const hash = value.mappings.get(level.id).pictureSha256;
  return Object.freeze({ file: value.assets.get(hash), blob: value.pictures.get(hash) });
}

export function disposeCoopPresentationEnvelope(owner) {
  const value = owners.get(owner);
  if (!value?.active) return false;
  value.active = false;
  value.blob = null;
  value.pictures.clear();
  value.assets.clear();
  value.mappings.clear();
  return true;
}
