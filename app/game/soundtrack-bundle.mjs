import { boundedJSON, canonicalJSON, exactKeys, plainObject, required } from './data-json.mjs';
import {
  SOUNDTRACK_LIMITS,
  SOUNDTRACK_FORMAT_V2,
  SOUNDTRACK_FORMAT_V3,
  upgradeSoundtrackLibrary,
  soundtrackRecoveryPlan,
  soundtrackRights,
  soundtrackStoredTracks,
  soundtrackReferencedTracks,
  resolveSoundtrackLibrary,
} from './soundtrack.mjs';
import {
  inspectMP3,
  ownSoundtrackBlob,
  probeMP3Media,
  throwIfSoundtrackAborted,
  verifyMP3Media,
} from './mp3.mjs';
import { soundtrackPortableRecoveryPlan } from './soundtrack-portable.mjs';

export const SOUNDTRACK_BUNDLE_FORMAT = 'revealline-soundtrack-bundle.v1';
export const SOUNDTRACK_BUNDLE_FORMAT_V2 = 'revealline-soundtrack-bundle.v2';
export const SOUNDTRACK_BUNDLE_FORMAT_V3 = 'revealline-soundtrack-bundle.v3';
const MAGIC = new TextEncoder().encode('RLSTB1\r\n');
const MAGIC_V2 = new TextEncoder().encode('RLSTB2\r\n');
const MAGIC_V3 = new TextEncoder().encode('RLSTB3\r\n');
const MANIFEST_BYTES = SOUNDTRACK_LIMITS.metadataBytes + 65536;
const preparedLibraries = new WeakSet();
const hashValid = (value) => typeof value === 'string' && /^[0-9a-f]{64}$/.test(value);
/** Snapshot the finite Blob table without reading accessors or copying payload bytes. */
export function ownSoundtrackAssets(value) {
  required(
    Array.isArray(value) &&
      Object.getPrototypeOf(value) === Array.prototype &&
      value.length <= SOUNDTRACK_LIMITS.assets,
    'Invalid soundtrack asset table.',
  );
  const descriptors = Object.getOwnPropertyDescriptors(value);
  required(
    Reflect.ownKeys(descriptors).length === value.length + 1,
    'Sparse or decorated audio asset table.',
  );
  const result = [],
    seen = new Set();
  for (let i = 0; i < value.length; i++) {
    const d = descriptors[i];
    required(
      d?.enumerable && Object.hasOwn(d, 'value') && plainObject(d.value),
      'Invalid audio asset entry.',
    );
    const fields = Object.getOwnPropertyDescriptors(d.value);
    required(
      Reflect.ownKeys(fields).length === 2 &&
        ['sha256', 'blob'].every((k) => fields[k]?.enumerable && Object.hasOwn(fields[k], 'value')),
      'Audio asset entry requires owned hash and Blob.',
    );
    const hash = fields.sha256.value;
    required(hashValid(hash) && !seen.has(hash), 'Invalid or duplicate audio asset hash.');
    seen.add(hash);
    result.push(Object.freeze({ sha256: hash, blob: ownSoundtrackBlob(fields.blob.value) }));
  }
  return Object.freeze(result);
}
function referencedAssets(library, assets, complete = false, catalogue) {
  const tracks = complete
    ? soundtrackRecoveryPlan(library, { catalogue }).requiredTracks
    : soundtrackStoredTracks(library);
  const wanted = new Map(tracks.map((t) => [t.asset.sha256, t.asset]));
  required(
    wanted.size === assets.length && assets.every((a) => wanted.has(a.sha256)),
    'Complete soundtrack transfer requires every referenced asset and no extras.',
  );
  let total = 0;
  for (const { sha256, blob } of assets) {
    required(
      blob.size === wanted.get(sha256).bytes,
      'Audio asset byte length differs from metadata.',
    );
    total += blob.size;
  }
  required(
    total <= SOUNDTRACK_LIMITS.managedBytes,
    'Soundtrack assets exceed the managed byte budget.',
  );
  return wanted;
}
async function verifyAssets(
  library,
  assets,
  { signal, probeMedia, complete = false, catalogue } = {},
) {
  const wanted = referencedAssets(library, assets, complete, catalogue);
  for (const { sha256, blob } of assets) {
    throwIfSoundtrackAborted(signal);
    const actual = await inspectMP3(blob, { signal });
    required(
      canonicalJSON(actual) === canonicalJSON(wanted.get(sha256)),
      'MP3 bytes or frame metadata differ from the soundtrack manifest.',
    );
    if (probeMedia) await verifyMP3Media(blob, actual, { probeMedia, signal });
  }
  throwIfSoundtrackAborted(signal);
}
/** Actual import boundary: every distinct MP3 must also pass the host's media probe. */
export async function prepareSoundtrackLibrary(
  value,
  sourceAssets,
  { signal, probeMedia = probeMP3Media, catalogue } = {},
) {
  required(typeof probeMedia === 'function', 'An actual-import media probe is required.');
  const library = resolveSoundtrackLibrary(value),
    assets = ownSoundtrackAssets(sourceAssets);
  const recovery = soundtrackRecoveryPlan(library, { catalogue });
  required(
    (library.referenceOnlyTrackIds ?? []).every((id) =>
      recovery.referenceOnlyTrackIds.includes(id),
    ),
    'Recovery requires every permitted original; a permitted recording cannot be reference-only.',
  );
  for (const track of soundtrackStoredTracks(library))
    required(
      soundtrackRights(track, { catalogue }).offlineCache === 'allowed',
      'This recording is not approved for offline storage. Preserve its reference instead.',
    );
  await verifyAssets(library, assets, { signal, probeMedia, catalogue });
  const prepared = Object.freeze({
    library,
    assets,
    ...(library.format === SOUNDTRACK_FORMAT_V3
      ? { referenceOnlyTrackIds: library.referenceOnlyTrackIds }
      : {}),
  });
  preparedLibraries.add(prepared);
  return prepared;
}
export const isPreparedSoundtrackLibrary = (value) => preparedLibraries.has(value);
/** Recovery export: every owned/referenced permitted original plus restricted references.
 * Unused exact trusted online catalogue pins need no original in a v3 backup.
 * Audio payloads remain exact original bytes, never base64 or decoded PCM. */
export async function exportSoundtrackBundle(value, sourceAssets, { signal, catalogue } = {}) {
  const plan = soundtrackPortableRecoveryPlan(value, { catalogue });
  const initial = plan.library;
  const library = plan.referenceOnlyTrackIds.length ? upgradeSoundtrackLibrary(initial) : initial;
  const excluded = new Set(
    soundtrackReferencedTracks(library)
      .filter((track) => plan.referenceOnlyTrackIds.includes(track.id))
      .map((track) => track.asset.sha256),
  );
  const assets = [...ownSoundtrackAssets(sourceAssets)]
    .filter((asset) => !excluded.has(asset.sha256))
    .sort((a, b) => a.sha256.localeCompare(b.sha256));
  await verifyAssets(library, assets, { signal, complete: true, catalogue });
  const v3 = library.format === SOUNDTRACK_FORMAT_V3;
  const v2 = library.format === SOUNDTRACK_FORMAT_V2;
  const portableLibrary =
    v2 || v3
      ? {
          ...library,
          installedTrackIds: library.catalogTracks
            .filter((track) => !plan.referenceOnlyTrackIds.includes(track.id))
            .map((track) => track.id),
          ...(v3 ? { referenceOnlyTrackIds: plan.referenceOnlyTrackIds } : {}),
          ...(library.bonusAlbums
            ? { bonusAlbums: library.bonusAlbums.map((album) => ({ ...album, downloaded: true })) }
            : {}),
        }
      : library;
  const manifest = new TextEncoder().encode(
    canonicalJSON({
      format: v3
        ? SOUNDTRACK_BUNDLE_FORMAT_V3
        : v2
          ? SOUNDTRACK_BUNDLE_FORMAT_V2
          : SOUNDTRACK_BUNDLE_FORMAT,
      library: portableLibrary,
      assets: assets.map((asset) => ({ sha256: asset.sha256, bytes: asset.blob.size })),
      ...(v3 ? { referenceOnlyTrackIds: plan.referenceOnlyTrackIds } : {}),
    }),
  );
  required(manifest.length <= MANIFEST_BYTES, 'Soundtrack manifest exceeds its byte budget.');
  const size = 12 + manifest.length + assets.reduce((n, asset) => n + asset.blob.size, 0);
  required(size <= SOUNDTRACK_LIMITS.bundleBytes, 'Soundtrack bundle exceeds 256 MiB.');
  const header = new Uint8Array(12);
  header.set(v3 ? MAGIC_V3 : v2 ? MAGIC_V2 : MAGIC);
  new DataView(header.buffer).setUint32(8, manifest.length, false);
  return new Blob([header, manifest, ...assets.map((asset) => asset.blob)], {
    type: 'application/vnd.revealline.soundtrack',
  });
}
export async function importSoundtrackBundle(
  source,
  { signal, probeMedia = probeMP3Media, catalogue } = {},
) {
  throwIfSoundtrackAborted(signal);
  const blob = ownSoundtrackBlob(source, SOUNDTRACK_LIMITS.bundleBytes);
  required(blob.size >= 12, 'Truncated soundtrack bundle.');
  const header = new Uint8Array(await blob.slice(0, 12).arrayBuffer());
  throwIfSoundtrackAborted(signal);
  const v3 = MAGIC_V3.every((b, i) => b === header[i]);
  const v2 = MAGIC_V2.every((b, i) => b === header[i]);
  required(v3 || v2 || MAGIC.every((b, i) => b === header[i]), 'Unsupported soundtrack bundle.');
  const size = new DataView(header.buffer).getUint32(8, false);
  required(
    size > 0 && size <= MANIFEST_BYTES && 12 + size <= blob.size,
    'Invalid soundtrack manifest length.',
  );
  const raw = new TextDecoder('utf-8', { fatal: true }).decode(
    await blob.slice(12, 12 + size).arrayBuffer(),
  );
  throwIfSoundtrackAborted(signal);
  const manifest = boundedJSON(raw, {
    maxBytes: MANIFEST_BYTES,
    maxNodes: 65000,
    maxDepth: 12,
    maxArray: 512,
    maxString: 1024,
  });
  exactKeys(
    manifest,
    ['format', 'library', 'assets', ...(v3 ? ['referenceOnlyTrackIds'] : [])],
    'soundtrack bundle',
  );
  required(
    manifest.format ===
      (v3
        ? SOUNDTRACK_BUNDLE_FORMAT_V3
        : v2
          ? SOUNDTRACK_BUNDLE_FORMAT_V2
          : SOUNDTRACK_BUNDLE_FORMAT),
    'Unsupported soundtrack bundle format.',
  );
  const library = resolveSoundtrackLibrary(manifest.library);
  required(
    (library.format === SOUNDTRACK_FORMAT_V2) === v2 &&
      (library.format === SOUNDTRACK_FORMAT_V3) === v3,
    'Soundtrack bundle/library versions differ.',
  );
  required(
    !v2 || library.installedTrackIds.length === library.catalogTracks.length,
    'Complete soundtrack backup must install every catalogue original.',
  );
  required(
    !v2 || (library.bonusAlbums ?? []).every((album) => album.downloaded),
    'Complete soundtrack backup must install every bonus album original.',
  );
  required(
    Array.isArray(manifest.assets) && manifest.assets.length <= SOUNDTRACK_LIMITS.assets,
    'Invalid bundle asset table.',
  );
  if (v3) {
    required(
      canonicalJSON(manifest.referenceOnlyTrackIds) ===
        canonicalJSON(library.referenceOnlyTrackIds),
      'Recovery references differ from the library.',
    );
    const refs = new Set(library.referenceOnlyTrackIds);
    required(
      library.catalogTracks.every(
        (track) => refs.has(track.id) || library.installedTrackIds.includes(track.id),
      ),
      'Recovery requires every permitted catalogue original.',
    );
    required(
      (library.bonusAlbums ?? []).every((album) => album.downloaded),
      'Recovery requires every permitted bonus original.',
    );
    const omittedHashes = new Set(
      soundtrackReferencedTracks(library)
        .filter((track) => refs.has(track.id))
        .map((track) => track.asset.sha256),
    );
    required(
      manifest.assets.every((asset) => !omittedHashes.has(asset.sha256)),
      'Reference-only recordings must not contain exported audio.',
    );
    required(
      soundtrackReferencedTracks(library).every(
        (track) => !omittedHashes.has(track.asset.sha256) || refs.has(track.id),
      ),
      'Aliases of reference-only recordings must also remain references.',
    );
  }
  let offset = 12 + size,
    previous = '';
  const assets = [];
  for (const item of manifest.assets) {
    exactKeys(item, ['sha256', 'bytes'], 'bundle asset');
    required(
      hashValid(item.sha256) &&
        item.sha256 > previous &&
        Number.isSafeInteger(item.bytes) &&
        item.bytes > 0 &&
        item.bytes <= SOUNDTRACK_LIMITS.trackBytes &&
        offset + item.bytes <= blob.size,
      'Invalid, duplicated or truncated bundle asset.',
    );
    assets.push({
      sha256: item.sha256,
      blob: blob.slice(offset, offset + item.bytes, 'audio/mpeg'),
    });
    offset += item.bytes;
    previous = item.sha256;
  }
  required(offset === blob.size, 'Soundtrack bundle has trailing bytes.');
  return prepareSoundtrackLibrary(library, assets, { signal, probeMedia, catalogue });
}
