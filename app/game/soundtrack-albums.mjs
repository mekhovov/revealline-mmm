import { boundedJSON, canonicalJSON, exactKeys, required, stableId } from './data-json.mjs';
import {
  freezeSoundtrack,
  resolveSoundtrackLibrary,
  upgradeSoundtrackLibrary,
  soundtrackStoredTracks,
  SOUNDTRACK_FORMAT,
  SOUNDTRACK_LIMITS,
} from './soundtrack.mjs';
import { isPreparedSoundtrackLibrary, ownSoundtrackAssets } from './soundtrack-bundle.mjs';

export const SOUNDTRACK_ALBUM_CATALOG_FORMAT = 'revealline-soundtrack-albums.v1';
export const SOUNDTRACK_ALBUM_CATALOG_BYTES = 512 * 1024;
export const SOUNDTRACK_ALBUM_CATALOG_LIMIT = 32;
const text = (value, limit) => typeof value === 'string' && value.trim() && value.length <= limit;
const sourceURL = (value) => {
  if (!text(value, 1024)) return false;
  try {
    const url = new URL(value);
    return ['https:', 'http:'].includes(url.protocol) && !url.username && !url.password;
  } catch {
    return false;
  }
};
const copy = (value) =>
  boundedJSON(value, {
    maxBytes: SOUNDTRACK_ALBUM_CATALOG_BYTES,
    maxNodes: 60000,
    maxDepth: 12,
    maxArray: 128,
    maxString: 1024,
  });

/** Finite data only. Each album carries the exact complete library its body must contain. */
export function resolveSoundtrackAlbum(value) {
  const album = copy(value);
  exactKeys(
    album,
    [
      'id',
      'title',
      'genre',
      'description',
      'credit',
      'source',
      'path',
      'bytes',
      'sha256',
      'library',
    ],
    'soundtrack album',
  );
  required(stableId(album.id) && !album.id.startsWith('builtin.'), 'Invalid soundtrack album ID.');
  required(
    text(album.title, 120) &&
      text(album.genre, 80) &&
      text(album.description, 280) &&
      text(album.credit, 280) &&
      sourceURL(album.source),
    'Invalid soundtrack album description or source.',
  );
  required(
    album.path === `optional/soundtracks/${album.id}.rlsound`,
    'Invalid soundtrack album path.',
  );
  required(
    Number.isSafeInteger(album.bytes) &&
      album.bytes >= 12 &&
      album.bytes <= SOUNDTRACK_LIMITS.optionalBundleTargetBytes &&
      /^[0-9a-f]{64}$/.test(album.sha256),
    'Invalid soundtrack album byte or hash declaration.',
  );
  album.library = resolveSoundtrackLibrary(album.library);
  const { tracks, playlists, assignments, selection } = album.library;
  required(
    tracks.length > 0 &&
      tracks.length <= SOUNDTRACK_LIMITS.tracks &&
      assignments.length === 0 &&
      playlists.length === 1 &&
      playlists[0].id === album.id &&
      [null, album.id].includes(selection.playlistId),
    'Album must contain one playlist and no automatic assignments.',
  );
  required(
    canonicalJSON(playlists[0].trackIds) === canonicalJSON(tracks.map((track) => track.id)),
    'Album playlist must list each declared track exactly once in order.',
  );
  required(
    tracks.every(
      (track) =>
        ['licensed', 'original'].includes(track.rights.kind) &&
        text(track.rights.license, 280) &&
        sourceURL(track.rights.source),
    ),
    'Album tracks require original or licensed publication source records.',
  );
  const assets = new Map(tracks.map((track) => [track.asset.sha256, track.asset.bytes]));
  required(
    [...assets.values()].reduce((sum, bytes) => sum + bytes, 12) < album.bytes,
    'Album body is smaller than its declared originals and manifest.',
  );
  return freezeSoundtrack(album);
}

export function resolveSoundtrackAlbumCatalog(value) {
  const catalog = copy(value);
  exactKeys(catalog, ['format', 'albums'], 'soundtrack album catalog');
  required(
    catalog.format === SOUNDTRACK_ALBUM_CATALOG_FORMAT &&
      Array.isArray(catalog.albums) &&
      catalog.albums.length <= SOUNDTRACK_ALBUM_CATALOG_LIMIT,
    'Unsupported soundtrack album catalog.',
  );
  catalog.albums = catalog.albums.map(resolveSoundtrackAlbum);
  required(
    new Set(catalog.albums.map((album) => album.id)).size === catalog.albums.length,
    'Duplicate soundtrack album ID.',
  );
  return freezeSoundtrack(catalog);
}

/** Add to an owned draft, never to storage. Existing selection/assignments survive intact.
 * The caller prepares this complete result before publication and uses the normal CAS Save. */
export function mergeSoundtrackAlbum(value, sourceAssets, prepared, declaration) {
  const current = resolveSoundtrackLibrary(value),
    currentAssets = ownSoundtrackAssets(sourceAssets),
    album = resolveSoundtrackAlbum(declaration);
  required(
    isPreparedSoundtrackLibrary(prepared),
    'Album addition requires an actual verified import.',
  );
  required(
    canonicalJSON(prepared.library) === canonicalJSON(album.library),
    'Imported soundtrack differs from the selected album.',
  );
  const base =
    current.format !== SOUNDTRACK_FORMAT || prepared.library.format !== SOUNDTRACK_FORMAT
      ? upgradeSoundtrackLibrary(current)
      : current;
  const append = (old, incoming, label) => {
    const found = new Map(old.map((item) => [item.id, item])),
      result = [...old];
    for (const item of incoming) {
      const prior = found.get(item.id);
      required(
        !prior || canonicalJSON(prior) === canonicalJSON(item),
        `Conflicting ${label} ID: ${item.id}`,
      );
      if (!prior) {
        result.push(item);
        found.set(item.id, item);
      }
    }
    return result;
  };
  let library = resolveSoundtrackLibrary({
    ...base,
    tracks: append(base.tracks, prepared.library.tracks, 'track'),
    playlists: append(base.playlists, prepared.library.playlists, 'playlist'),
    ...(base.tags
      ? {
          tags: {
            ...base.tags,
            ...Object.fromEntries(
              prepared.library.tracks
                .filter((track) => !current.tracks.some((prior) => prior.id === track.id))
                .map((track) => [
                  track.id,
                  prepared.library.tags?.[track.id] ?? {
                    genres: [/metal|rock/i.test(album.genre) ? 'metal' : 'synth90s'],
                    role: 'any',
                    energy: 3,
                    themes: [/metal|rock/i.test(album.genre) ? 'fpv' : 'retro'],
                  },
                ]),
            ),
          },
        }
      : {}),
  });
  if (library.format !== SOUNDTRACK_FORMAT) library = setBonusDownload(library, album, true);
  const retainedTracks = soundtrackStoredTracks(library);
  const wanted = new Map(retainedTracks.map((track) => [track.asset.sha256, track.asset.bytes])),
    collected = new Map(currentAssets.map((asset) => [asset.sha256, asset]));
  // A verified incoming copy can repair an existing missing/corrupt copy with the same identity.
  for (const asset of prepared.assets) collected.set(asset.sha256, asset);
  required(
    collected.size === wanted.size &&
      [...collected].every(([hash, asset]) => wanted.get(hash) === asset.blob.size),
    'Album addition needs every draft original and no extra assets.',
  );
  const assets = ownSoundtrackAssets([...collected.values()]);
  required(
    assets.reduce((sum, asset) => sum + asset.blob.size, 0) <= SOUNDTRACK_LIMITS.managedBytes,
    'Combined soundtrack exceeds the managed byte limit.',
  );
  return Object.freeze({
    library,
    assets,
    addedTracks: library.tracks.length - current.tracks.length,
    addedPlaylists: library.playlists.length - current.playlists.length,
  });
}

function matchingAlbumTracks(library, album) {
  const declared = new Map(album.library.tracks.map((track) => [track.id, track]));
  const retained = library.tracks.filter((track) => declared.has(track.id));
  required(retained.length > 0, 'This album is not in the library. Add it to the draft first.');
  required(
    retained.every(
      (track) => canonicalJSON(track.asset) === canonicalJSON(declared.get(track.id).asset),
    ),
    'This album has a conflicting recording identity; its existing tracks were preserved.',
  );
  const pin = library.bonusAlbums?.find((entry) => entry.id === album.id);
  required(
    !pin || pin.trackIds.every((id) => declared.has(id)),
    'Bonus album ownership differs from its shipped declaration.',
  );
  return retained;
}

function setBonusDownload(value, album, downloaded) {
  const library = upgradeSoundtrackLibrary(value);
  const tracks = matchingAlbumTracks(library, album);
  return resolveSoundtrackLibrary({
    ...library,
    bonusAlbums: [
      ...(library.bonusAlbums ?? []).filter((entry) => entry.id !== album.id),
      { id: album.id, trackIds: tracks.map((track) => track.id), downloaded },
    ],
  });
}

/** Explicit shipped-album offload changes ownership only. Every playlist and track ID is retained. */
export function offloadSoundtrackAlbum(value, sourceAssets, declaration) {
  const current = resolveSoundtrackLibrary(value),
    album = resolveSoundtrackAlbum(declaration),
    originalAssets = ownSoundtrackAssets(sourceAssets),
    tracks = matchingAlbumTracks(current, album),
    library = setBonusDownload(current, album, false),
    wanted = new Set(soundtrackStoredTracks(library).map((track) => track.asset.sha256)),
    albumHashes = new Set(tracks.map((track) => track.asset.sha256)),
    assets = ownSoundtrackAssets(originalAssets.filter((asset) => wanted.has(asset.sha256)));
  return Object.freeze({
    library,
    assets,
    removedBytes: originalAssets
      .filter((asset) => !wanted.has(asset.sha256))
      .reduce((sum, asset) => sum + asset.blob.size, 0),
    retainedSharedBytes: assets
      .filter((asset) => albumHashes.has(asset.sha256))
      .reduce((sum, asset) => sum + asset.blob.size, 0),
  });
}

/** Only an explicitly fetched, verified shipped album restores bytes; pins never authorize fetching. */
export function restoreSoundtrackAlbum(value, sourceAssets, prepared, declaration) {
  const current = resolveSoundtrackLibrary(value),
    album = resolveSoundtrackAlbum(declaration);
  required(
    isPreparedSoundtrackLibrary(prepared),
    'Album restoration requires an actual verified import.',
  );
  required(
    canonicalJSON(prepared.library) === canonicalJSON(album.library),
    'Imported soundtrack differs from the selected album.',
  );
  const tracks = matchingAlbumTracks(current, album),
    library = setBonusDownload(current, album, true),
    wanted = new Map(
      soundtrackStoredTracks(library).map((track) => [track.asset.sha256, track.asset.bytes]),
    ),
    collected = new Map(ownSoundtrackAssets(sourceAssets).map((asset) => [asset.sha256, asset]));
  for (const asset of prepared.assets)
    if (wanted.has(asset.sha256)) collected.set(asset.sha256, asset);
  const assets = ownSoundtrackAssets(
    [...collected.values()].filter((asset) => wanted.has(asset.sha256)),
  );
  required(
    assets.length === wanted.size &&
      assets.every((asset) => asset.blob.size === wanted.get(asset.sha256)),
    'Album restoration needs every retained original.',
  );
  required(
    assets.reduce((sum, asset) => sum + asset.blob.size, 0) <= SOUNDTRACK_LIMITS.managedBytes,
    'Combined soundtrack exceeds the managed byte limit.',
  );
  return Object.freeze({ library, assets, restoredTracks: tracks.length });
}
