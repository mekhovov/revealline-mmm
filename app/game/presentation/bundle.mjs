import { inspectAudioBytes } from '../media-audio.mjs';
import { boundedJSON, canonicalJSON, exactKeys, required } from '../data-json.mjs';
import { inspectImageDataUrl } from '../content.mjs';
import { browserDecodeImage } from '../imports.mjs';
import { LIMITS, validateThemeBundle } from './model.mjs';
import {
  encodePresentationDocument,
  decodePresentationDocument,
  ownLegacyPresentationDocument,
  PRESENTATION_METADATA_LIMITS,
} from './document-codec.mjs';

const MAGIC_V1 = new TextEncoder().encode('RLTHM1\r\n');
const MAGIC_V2 = new TextEncoder().encode('RLTHM2\r\n');
const MAGIC_V3 = new TextEncoder().encode('RLTHM3\r\n');
export const THEME_BUNDLE_MIME = 'application/vnd.revealline.theme';
const nativeSize = Object.getOwnPropertyDescriptor(Blob.prototype, 'size').get;
const abort = (signal) => {
  if (signal?.aborted) throw new DOMException('Theme operation cancelled.', 'AbortError');
};
function ownBlob(source, max) {
  let size;
  try {
    size = nativeSize.call(source);
  } catch {
    throw new TypeError('A native Blob or File is required.');
  }
  required(size > 0 && size <= max, 'File exceeds its byte budget.');
  return Blob.prototype.slice.call(source, 0, size);
}
export async function hashPresentationBytes(bytes) {
  required(bytes instanceof Uint8Array, 'Hash input must be bytes.');
  const hash = await globalThis.crypto.subtle.digest('SHA-256', new Uint8Array(bytes));
  return [...new Uint8Array(hash)].map((byte) => byte.toString(16).padStart(2, '0')).join('');
}
const starts = (bytes, text) => [...text].every((char, i) => bytes[i] === char.charCodeAt(0));
function dataURL(bytes, mime) {
  let binary = '';
  for (let i = 0; i < bytes.length; i += 16384)
    binary += String.fromCharCode(...bytes.subarray(i, i + 16384));
  return `data:${mime};base64,${btoa(binary)}`;
}
function inspectFont(bytes, mime) {
  if (mime === 'font/woff2') {
    required(bytes.length >= 48 && starts(bytes, 'wOF2'), 'Invalid WOFF2 signature.');
    const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
    required(
      view.getUint32(8) === bytes.length && view.getUint16(12) > 0 && view.getUint16(12) <= 256,
      'Invalid WOFF2 header.',
    );
    return;
  }
  required(
    bytes.length >= 12 &&
      (mime === 'font/otf'
        ? starts(bytes, 'OTTO')
        : bytes[0] === 0 && bytes[1] === 1 && bytes[2] === 0 && bytes[3] === 0),
    'Invalid font signature.',
  );
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength),
    count = view.getUint16(4);
  required(
    count > 0 && count <= 256 && 12 + count * 16 <= bytes.length,
    'Invalid font table directory.',
  );
  for (let i = 0; i < count; i++) {
    const at = 12 + i * 16,
      offset = view.getUint32(at + 8),
      length = view.getUint32(at + 12);
    required(offset + length <= bytes.length, 'Font table exceeds the original bytes.');
  }
}
// validateThemeBundle already rejects inconsistent file facts for a shared hash.
// V2 and V3 derive their tables only after complete document validation.
function payloadTable(document) {
  return [
    ...new Map(
      document.assets
        .filter((asset) => asset.file)
        .map((asset) => [asset.file.sha256, asset.file.bytes]),
    ),
  ]
    .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
    .map(([sha256, bytes]) => ({ sha256, bytes }));
}
/** Hashes and headers are always verified. An optional decoder adds real image
 * decoding; font loading and audio audition remain separate host checks. */
export async function verifyThemeAssets(source, sourceAssets, { signal, decodeImage = null } = {}) {
  const document = validateThemeBundle(source);
  required(sourceAssets instanceof Map, 'Assets must be a hash-to-Blob Map.');
  const incoming = new Map(Map.prototype.entries.call(sourceAssets));
  const facts = new Map(
    document.assets
      .filter((asset) => asset.file)
      .map((asset) => [asset.file.sha256, { kind: asset.kind, ...asset.file }]),
  );
  required(
    incoming.size === facts.size && [...incoming.keys()].every((hash) => facts.has(hash)),
    'Asset byte table must exactly match the manifest.',
  );
  const owned = [...facts.keys()]
    .sort()
    .map((hash) => ({ hash, blob: ownBlob(incoming.get(hash), LIMITS.assetBytes) }));
  required(
    owned.reduce((sum, a) => sum + nativeSize.call(a.blob), 0) <= LIMITS.bundleBytes,
    'Combined assets exceed the bundle budget.',
  );
  const accepted = new Map();
  for (const { hash, blob } of owned) {
    abort(signal);
    const bytes = new Uint8Array(await blob.arrayBuffer()),
      fact = facts.get(hash);
    required(
      bytes.length === fact.bytes && (await hashPresentationBytes(bytes)) === hash,
      'Asset bytes/hash do not match the manifest.',
    );
    abort(signal);
    if (fact.kind === 'image') {
      const url = dataURL(bytes, fact.mime),
        header = inspectImageDataUrl(url);
      required(header.valid, `Invalid image header: ${header.errors.join('; ')}`);
      required(
        header.width === fact.width && header.height === fact.height,
        'Image dimensions do not match the manifest.',
      );
      if (decodeImage) {
        required(typeof decodeImage === 'function', 'Image decoder must be a function.');
        const decoded = await decodeImage(url, { signal });
        required(
          decoded?.naturalWidth === fact.width && decoded?.naturalHeight === fact.height,
          'Decoded image dimensions do not match.',
        );
      }
    } else if (fact.kind === 'font') inspectFont(bytes, fact.mime);
    else inspectAudioBytes(bytes, fact.mime);
    abort(signal);
    accepted.set(hash, new Blob([bytes], { type: fact.mime }));
  }
  return accepted;
}
/** Deterministic manifest and sorted original payloads. Never accesses storage. */
export async function exportThemeBundle(source, sourceAssets = new Map(), options = {}) {
  const document = validateThemeBundle(source),
    assets = await verifyThemeAssets(document, sourceAssets, options);
  const table = [...assets].map(([sha256, blob]) => ({ sha256, bytes: nativeSize.call(blob) }));
  const metadata = encodePresentationDocument(document);
  // Raw codec output also proves the legacy 2048-item array bound. A compact
  // document must never be emitted under an older header its reader cannot use.
  let legacyCompatible = false;
  try {
    ownLegacyPresentationDocument(document);
    legacyCompatible = metadata === canonicalJSON(document);
  } catch (error) {
    if (!(error instanceof TypeError)) throw error;
    // A valid v3 document can exceed the frozen RLTHM1/2 logical contract.
  }
  let magic = MAGIC_V3;
  let manifest = new TextEncoder().encode(metadata);
  if (legacyCompatible) {
    const v1 = new TextEncoder().encode(canonicalJSON({ document, assets: table }));
    const v2 =
      v1.length <= LIMITS.manifestBytes
        ? null
        : new TextEncoder().encode(canonicalJSON({ document }));
    if (v1.length <= LIMITS.manifestBytes) {
      magic = MAGIC_V1;
      manifest = v1;
    } else if (v2.length <= LIMITS.manifestBytes) {
      magic = MAGIC_V2;
      manifest = v2;
    }
  }
  required(manifest.length <= LIMITS.manifestBytes, 'Bundle manifest exceeds its budget.');
  const total = 12 + manifest.length + table.reduce((sum, row) => sum + row.bytes, 0);
  required(total <= LIMITS.bundleBytes, 'Theme bundle exceeds 32 MiB.');
  const header = new Uint8Array(12);
  header.set(magic);
  new DataView(header.buffer).setUint32(8, manifest.length);
  abort(options.signal);
  return new Blob([header, manifest, ...assets.values()], { type: THEME_BUNDLE_MIME });
}
/** Complete verification before returning a candidate; the caller commits only
 * after this resolves and its own compare-and-swap storage check succeeds. */
export async function importThemeBundle(
  source,
  { signal, decodeImage = browserDecodeImage, previous = null, expectedRevision } = {},
) {
  abort(signal);
  const blob = ownBlob(source, LIMITS.bundleBytes);
  required(blob.size >= 12, 'Truncated theme bundle.');
  const header = new Uint8Array(await blob.slice(0, 12).arrayBuffer());
  const compact = MAGIC_V2.every((byte, i) => header[i] === byte);
  const encoded = MAGIC_V3.every((byte, i) => header[i] === byte);
  required(
    encoded || compact || MAGIC_V1.every((byte, i) => header[i] === byte),
    'Unsupported theme bundle.',
  );
  const length = new DataView(header.buffer).getUint32(8);
  required(
    length > 0 && length <= LIMITS.manifestBytes && 12 + length <= blob.size,
    'Invalid theme manifest length.',
  );
  const metadata = new TextDecoder('utf-8', { fatal: true }).decode(
    await blob.slice(12, 12 + length).arrayBuffer(),
  );
  let document, table;
  if (encoded) {
    document = validateThemeBundle(decodePresentationDocument(metadata), {
      previous,
      expectedRevision,
    });
    table = payloadTable(document);
  } else {
    // Legacy input budgets stay unchanged even though logical documents can now
    // use a larger, explicitly versioned encoded representation.
    const manifest = boundedJSON(metadata, {
      maxBytes: LIMITS.manifestBytes,
      maxNodes: PRESENTATION_METADATA_LIMITS.legacyEnvelopeNodes,
      maxArray: 2048,
      maxDepth: 20,
      maxString: 8192,
    });
    exactKeys(manifest, compact ? ['document'] : ['document', 'assets'], 'theme transfer');
    document = validateThemeBundle(ownLegacyPresentationDocument(manifest.document), {
      previous,
      expectedRevision,
    });
    table = compact ? payloadTable(document) : manifest.assets;
  }
  required(Array.isArray(table) && table.length <= LIMITS.assets, 'Invalid theme asset table.');
  const assets = new Map();
  let offset = 12 + length,
    last = '';
  for (const row of table) {
    exactKeys(row, ['sha256', 'bytes'], 'payload row');
    required(
      typeof row.sha256 === 'string' &&
        /^[a-f0-9]{64}$/.test(row.sha256) &&
        row.sha256 > last &&
        Number.isSafeInteger(row.bytes) &&
        row.bytes > 0 &&
        row.bytes <= LIMITS.assetBytes,
      'Invalid or duplicate payload row.',
    );
    required(offset + row.bytes <= blob.size, 'Truncated theme asset.');
    assets.set(row.sha256, blob.slice(offset, offset + row.bytes));
    offset += row.bytes;
    last = row.sha256;
  }
  required(offset === blob.size, 'Unexpected trailing theme bytes.');
  const accepted = await verifyThemeAssets(document, assets, { signal, decodeImage });
  abort(signal);
  return Object.freeze({
    document,
    assets: accepted,
    imagesDecoded: typeof decodeImage === 'function',
  });
}
