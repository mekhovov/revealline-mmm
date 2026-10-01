import { readOfficialRecording } from './official-downloads.mjs';
import { installedPresentation } from './installed-app.mjs';
import { canonicalJSON, required } from './data-json.mjs';
import { resolveSoundtrackCatalogue, soundtrackRights, SOUNDTRACK_LIMITS } from './soundtrack.mjs';
import { createSoundtrackArchiveResolver } from './soundtrack-archive.mjs';
import { resolveBundledSoundtrackAssets } from './soundtrack-bundled.mjs';
import { inspectMP3, throwIfSoundtrackAborted } from './mp3.mjs';
import {
  soundtrackDownloadURL,
  readSoundtrackDownload,
  soundtrackDownloadOperation,
} from './soundtrack-album-download.mjs';

const rootURL = new URL('../', import.meta.url).href;

/** Only the shipped catalogue and code-owned archive admission grant network authority. */
export function createSoundtrackSource({
  catalogue,
  readLocal = () => null,
  installedOnly = () => false,
  localPlayback = installedPresentation,
  readOfficial = readOfficialRecording,
  fetch: request = globalThis.fetch,
  baseURL = rootURL,
  archives = [],
  archive,
  bundled = [],
} = {}) {
  const trusted = resolveSoundtrackCatalogue(catalogue);
  const archiveSource = createSoundtrackArchiveResolver({
    archives: archive ? [...archives, archive] : archives,
    fetch: request,
  });
  const bundledByHash = new Map(
    resolveBundledSoundtrackAssets(bundled, trusted).map((entry) => [entry.sha256, entry]),
  );
  const byHash = new Map(trusted.tracks.map((track) => [track.asset.sha256, track]));
  return Object.freeze({
    catalogue: trusted,
    async readAsset(
      hash,
      {
        signal,
        download = false,
        purpose = download ? 'offline' : 'playback',
        localOnly = false,
      } = {},
    ) {
      required(typeof localOnly === 'boolean', 'Invalid local soundtrack acquisition policy.');
      required(
        ['playback', 'offline', 'export'].includes(purpose),
        'Unknown soundtrack byte purpose.',
      );
      const track = byHash.get(hash);
      const permission = {
        playback: 'webPlayback',
        offline: 'offlineCache',
        export: 'redistribute',
      }[purpose];
      if (track)
        required(
          soundtrackRights(track, { catalogue: trusted })[permission] === 'allowed',
          `This recording is not approved for ${purpose}. Preserve its reference instead.`,
        );
      throwIfSoundtrackAborted(signal);
      const local =
        (await readLocal(hash, { signal })) || (track ? await readOfficial(hash) : null);
      throwIfSoundtrackAborted(signal);
      if (local) return local;
      const core = bundledByHash.get(hash);
      // Silent preparation only uses already-owned originals. A core registration
      // cannot authorize requests until the host explicitly allows acquisition.
      if (localOnly || (purpose === 'playback' && localPlayback())) return null;
      required(track, 'This recording is missing locally. Restore its complete soundtrack backup.');
      required(
        purpose !== 'playback' || !installedOnly() || core,
        'Installed only is on. Download this album before listening offline.',
      );

      return soundtrackDownloadOperation(
        async (current, cleanupTimeoutMs) => {
          const url = core
            ? soundtrackDownloadURL(core.path, baseURL)
            : track.archiveId
              ? await archiveSource.urlFor(track, { signal: current, cleanupTimeoutMs })
              : soundtrackDownloadURL(track.path, baseURL);
          const blob = await readSoundtrackDownload(url, {
            fetch: request,
            signal: current,
            limit: SOUNDTRACK_LIMITS.trackBytes,
            exactBytes: track.asset.bytes,
            cleanupTimeoutMs,
            ...(track.archiveId && !core ? { credentials: 'omit', mode: 'cors' } : {}),
          });
          const actual = await inspectMP3(blob, { signal: current });
          required(
            canonicalJSON(actual) === canonicalJSON(track.asset),
            'Downloaded recording differs from its pinned catalogue original.',
          );
          return blob.slice(0, blob.size, 'audio/mpeg');
        },
        { signal, timeoutMs: 60000 },
      );
    },
  });
}

export function fetchSoundtrackCatalogue({
  fetch: request = globalThis.fetch,
  baseURL = rootURL,
  signal,
} = {}) {
  const url = soundtrackDownloadURL('game/content/soundtrack-catalogue.json', baseURL);
  return soundtrackDownloadOperation(
    async (current, cleanupTimeoutMs) => {
      const blob = await readSoundtrackDownload(url, {
        fetch: request,
        signal: current,
        limit: SOUNDTRACK_LIMITS.metadataBytes,
        cleanupTimeoutMs,
      });
      throwIfSoundtrackAborted(current);
      const raw = await blob.text();
      throwIfSoundtrackAborted(current);
      return resolveSoundtrackCatalogue(JSON.parse(raw));
    },
    { signal, timeoutMs: 15000 },
  );
}
