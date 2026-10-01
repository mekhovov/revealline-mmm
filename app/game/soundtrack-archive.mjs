import { boundedJSON, canonicalJSON, exactKeys, required, stableId } from './data-json.mjs';
import { SOUNDTRACK_LIMITS, freezeSoundtrack } from './soundtrack.mjs';
import { readSoundtrackDownload, soundtrackDownloadURL } from './soundtrack-album-download.mjs';
import { throwIfSoundtrackAborted } from './mp3.mjs';

export const SOUNDTRACK_ARCHIVE_FORMAT = 'revealline-soundtrack-archive.v1';
export const SOUNDTRACK_ARCHIVE_LIMITS = Object.freeze({
  bytes: 800000000,
  inventoryBytes: 256 * 1024,
  files: 512,
  archives: 8,
});
const hashValid = (value) => typeof value === 'string' && /^[a-f0-9]{64}$/.test(value);
/** This is code-owned admission, never read from an imported library or share. */
export function resolveSoundtrackArchives(value) {
  const entries = boundedJSON(value, {
    maxBytes: 16384,
    maxNodes: 100,
    maxDepth: 3,
    maxArray: SOUNDTRACK_ARCHIVE_LIMITS.archives,
    maxString: 512,
  });
  required(
    Array.isArray(entries) && entries.length <= SOUNDTRACK_ARCHIVE_LIMITS.archives,
    'Invalid soundtrack archive admission.',
  );
  const ids = new Set();
  for (const archive of entries) {
    exactKeys(
      archive,
      [
        'id',
        'baseURL',
        'inventorySha256',
        ...(Object.hasOwn(archive, 'inventoryPath') ? ['inventoryPath'] : []),
      ],
      'soundtrack archive admission',
    );
    required(
      stableId(archive.id) && !ids.has(archive.id) && hashValid(archive.inventorySha256),
      'Invalid soundtrack archive identity or inventory pin.',
    );
    ids.add(archive.id);
    required(
      typeof archive.baseURL === 'string' &&
        /^https:\/\/mekhovov\.github\.io\/revealline-soundtracks(?:-[0-9]+)?\/(?:batches\/[a-z0-9][a-z0-9-]{0,63}\/)?$/.test(
          archive.baseURL,
        ) &&
        archive.baseURL === new URL(archive.baseURL).href,
      'Soundtrack archive must use its admitted canonical GitHub Pages owner and path.',
    );
    required(
      archive.inventoryPath === undefined ||
        /^admissions\/[a-z0-9][a-z0-9-]{0,63}\.json$/.test(archive.inventoryPath),
      'Soundtrack archive inventory path is invalid.',
    );
  }
  return freezeSoundtrack(entries);
}
export function resolveSoundtrackArchiveInventory(value, archive) {
  const inventory = boundedJSON(value, {
    maxBytes: SOUNDTRACK_ARCHIVE_LIMITS.inventoryBytes,
    maxNodes: 4096,
    maxDepth: 4,
    maxArray: SOUNDTRACK_ARCHIVE_LIMITS.files,
    maxString: 128,
  });
  exactKeys(inventory, ['format', 'id', 'files'], 'soundtrack archive inventory');
  required(
    inventory.format === SOUNDTRACK_ARCHIVE_FORMAT &&
      inventory.id === archive.id &&
      Array.isArray(inventory.files) &&
      inventory.files.length <= SOUNDTRACK_ARCHIVE_LIMITS.files,
    'Soundtrack archive inventory identity differs.',
  );
  const hashes = new Set();
  let total = 0;
  for (const file of inventory.files) {
    exactKeys(file, ['path', 'bytes', 'sha256'], 'soundtrack archive object');
    required(
      hashValid(file.sha256) &&
        !hashes.has(file.sha256) &&
        file.path === `objects/${file.sha256}.mp3` &&
        Number.isSafeInteger(file.bytes) &&
        file.bytes > 0 &&
        file.bytes <= SOUNDTRACK_LIMITS.trackBytes,
      'Invalid, duplicate or unbounded soundtrack archive object.',
    );
    hashes.add(file.sha256);
    total += file.bytes;
  }
  required(
    total <= SOUNDTRACK_ARCHIVE_LIMITS.bytes,
    'Soundtrack archive exceeds its admitted 800 MB budget.',
  );
  return freezeSoundtrack(inventory);
}
/** Successful inventory verification may be cached; cancelled/failed attempts never authorize objects. */
export function createSoundtrackArchiveResolver({
  archives = [],
  fetch: request = globalThis.fetch,
} = {}) {
  const admissions = resolveSoundtrackArchives(archives);
  const verified = new Map();
  return Object.freeze({
    async urlFor(track, { signal, cleanupTimeoutMs } = {}) {
      const archive = admissions.find((entry) => entry.id === track.archiveId);
      required(archive, 'This soundtrack archive is not admitted by this game edition.');
      throwIfSoundtrackAborted(signal);
      let inventory = verified.get(archive.id);
      if (!inventory) {
        const blob = await readSoundtrackDownload(
          soundtrackDownloadURL(archive.inventoryPath ?? 'inventory.json', archive.baseURL),
          {
            fetch: request,
            signal,
            cleanupTimeoutMs,
            limit: SOUNDTRACK_ARCHIVE_LIMITS.inventoryBytes,
            credentials: 'omit',
            mode: 'cors',
          },
        );
        const bytes = await blob.arrayBuffer();
        throwIfSoundtrackAborted(signal);
        const hash = [...new Uint8Array(await globalThis.crypto.subtle.digest('SHA-256', bytes))]
          .map((byte) => byte.toString(16).padStart(2, '0'))
          .join('');
        throwIfSoundtrackAborted(signal);
        required(
          hash === archive.inventorySha256,
          'Soundtrack archive inventory differs from its admitted hash.',
        );
        inventory = resolveSoundtrackArchiveInventory(
          new TextDecoder('utf-8', { fatal: true }).decode(bytes),
          archive,
        );
        verified.set(archive.id, inventory);
      }
      const declared = inventory.files.find((file) => file.sha256 === track.asset.sha256);
      required(
        declared &&
          canonicalJSON(declared) ===
            canonicalJSON({
              path: track.path,
              sha256: track.asset.sha256,
              bytes: track.asset.bytes,
            }),
        'Catalogue recording differs from its admitted archive inventory.',
      );
      return soundtrackDownloadURL(track.path, archive.baseURL);
    },
  });
}
