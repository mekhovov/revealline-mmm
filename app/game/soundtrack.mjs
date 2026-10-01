import { boundedJSON, canonicalJSON, exactKeys, required, stableId } from './data-json.mjs';
import { DEFAULT_TRACKS, MUSIC_STYLES } from './ui/music.mjs';
import { SOUNDTRACK_COLLECTIONS } from './content/soundtrack-catalogue.mjs';
import {
  resolveSoundtrackPolicy,
  resolveSoundtrackWebsites,
  effectiveSoundtrackPolicy,
} from './soundtrack-rights.mjs';

export const SOUNDTRACK_FORMAT = 'revealline-soundtrack.v1';
export const SOUNDTRACK_FORMAT_V2 = 'revealline-soundtrack.v2';
export const SOUNDTRACK_FORMAT_V3 = 'revealline-soundtrack.v3';
export const SOUNDTRACK_CATALOGUE_FORMAT = 'revealline-soundtrack-catalogue.v1';
export const SOUNDTRACK_CATALOGUE_FORMAT_V2 = 'revealline-soundtrack-catalogue.v2';
const LEGACY_SOUNDTRACK_GENRES = Object.freeze(['synth90s', 'metal', 'ukrainian']);
export const SOUNDTRACK_GENRE_LABELS = Object.freeze({
  synth90s: 'Synth',
  metal: 'Metal',
  electronic: 'Electronic',
  chiptune: 'Chiptune & 8-bit',
  rock: 'Rock',
  ambient: 'Ambient',
  cinematic: 'Cinematic',
  acoustic: 'Acoustic & folk',
  ukrainian: 'Ukrainian · UA',
});
export const SOUNDTRACK_GENRES = Object.freeze(Object.keys(SOUNDTRACK_GENRE_LABELS));
export const SOUNDTRACK_MODES = Object.freeze(['auto', ...SOUNDTRACK_GENRES, 'fusion', 'mix']);
export const AUDIO_TRACK_FORMAT = 'revealline-audio-track.v1';
export const SOUNDTRACK_LIMITS = Object.freeze({
  trackBytes: 32 * 1024 * 1024,
  durationSeconds: 720,
  tracks: 128,
  customTracks: 123,
  customPlaylists: 26,
  catalogueTracks: 256,
  onlineTracks: 512,
  assets: 512,
  playlists: 32,
  playlistEntries: 128,
  assignments: 256,
  metadataBytes: 512 * 1024,
  managedBytes: 256 * 1024 * 1024,
  bundleBytes: 256 * 1024 * 1024,
  optionalBundleTargetBytes: 64 * 1024 * 1024,
});
export function freezeSoundtrack(value) {
  if (value && typeof value === 'object' && !Object.isFrozen(value)) {
    for (const child of Object.values(value)) freezeSoundtrack(child);
    Object.freeze(value);
  }
  return value;
}
export const BUILTIN_SOUNDTRACK_TRACKS = freezeSoundtrack(
  DEFAULT_TRACKS.map((recipe) => ({
    id: `builtin.${recipe.id}`,
    kind: 'synth',
    title: recipe.name,
    artist: 'RevealLine',
    recipe: { ...recipe },
  })),
);
export const BUILTIN_SOUNDTRACK_PLAYLISTS = freezeSoundtrack([
  {
    id: 'builtin.all',
    title: 'RevealLine synth collection',
    trackIds: BUILTIN_SOUNDTRACK_TRACKS.map((t) => t.id),
    order: 'ordered',
    repeat: 'all',
  },
  ...BUILTIN_SOUNDTRACK_TRACKS.map((track) => ({
    id: `builtin.genre.${track.recipe.genre}`,
    title: `${MUSIC_STYLES.find((style) => style.id === track.recipe.genre).label}: ${track.title}`,
    trackIds: [track.id],
    order: 'ordered',
    repeat: 'all',
  })),
]);
const text = (v, max, empty = false) =>
  typeof v === 'string' && v.length <= max && (empty || v.trim().length > 0);
const whole = (v, max) => Number.isSafeInteger(v) && v >= 0 && v <= max;
const ownKeys = (value, fields, label) => {
  exactKeys(value, fields, label);
  required(
    fields.every((k) => Object.hasOwn(value, k)),
    `${label} has missing fields.`,
  );
};
const customId = (id) => stableId(id) && !id.startsWith('builtin.');
const copy = (v) =>
  boundedJSON(v, {
    maxBytes: SOUNDTRACK_LIMITS.metadataBytes,
    maxNodes: 60000,
    maxArray: 512,
    maxDepth: 8,
    maxString: 1024,
  });
export function resolveAudioTrack(value) {
  const track = copy(value);
  ownKeys(
    track,
    [
      'format',
      'id',
      'kind',
      'title',
      'artist',
      'asset',
      'rights',
      ...(Object.hasOwn(track, 'fileName') ? ['fileName'] : []),
    ],
    'audio track',
  );
  required(
    track.fileName === undefined ||
      (text(track.fileName, 255) && !/[\\/\x00-\x1f]/.test(track.fileName)),
    'Invalid original audio filename.',
  );
  required(
    track.format === AUDIO_TRACK_FORMAT && track.kind === 'mp3' && customId(track.id),
    'Unsupported audio track identity/kind.',
  );
  required(text(track.title, 120) && text(track.artist, 160, true), 'Invalid audio title/artist.');
  const asset = track.asset;
  ownKeys(
    asset,
    [
      'sha256',
      'bytes',
      'mime',
      'durationSeconds',
      'sampleRate',
      'channels',
      'mpegVersion',
      'frames',
    ],
    'audio asset',
  );
  required(
    typeof asset.sha256 === 'string' &&
      /^[0-9a-f]{64}$/.test(asset.sha256) &&
      asset.mime === 'audio/mpeg',
    'Invalid audio asset hash/type.',
  );
  required(
    whole(asset.bytes, SOUNDTRACK_LIMITS.trackBytes) && asset.bytes >= 24,
    'MP3 exceeds its 32 MiB budget.',
  );
  required(
    Number.isFinite(asset.durationSeconds) &&
      asset.durationSeconds > 0 &&
      asset.durationSeconds <= 720,
    'MP3 duration must be at most 12 minutes.',
  );
  required(
    [8000, 11025, 12000, 16000, 22050, 24000, 32000, 44100, 48000].includes(asset.sampleRate) &&
      [1, 2].includes(asset.channels) &&
      ['1', '2', '2.5'].includes(asset.mpegVersion) &&
      whole(asset.frames, 60000) &&
      asset.frames >= 2,
    'Invalid MP3 frame metadata.',
  );
  const rates =
    asset.mpegVersion === '1'
      ? [32000, 44100, 48000]
      : asset.mpegVersion === '2'
        ? [16000, 22050, 24000]
        : [8000, 11025, 12000];
  required(
    rates.includes(asset.sampleRate) &&
      asset.durationSeconds ===
        (asset.frames * (asset.mpegVersion === '1' ? 1152 : 576)) / asset.sampleRate,
    'Inconsistent MP3 frame duration/rate.',
  );
  ownKeys(track.rights, ['kind', 'credit', 'license', 'source'], 'audio provenance');
  required(
    ['original', 'licensed', 'personal'].includes(track.rights.kind) &&
      text(track.rights.credit, 280) &&
      text(track.rights.license, 280, track.rights.kind !== 'licensed') &&
      text(track.rights.source, 1024, true),
    'Invalid audio provenance.',
  );
  return freezeSoundtrack(track);
}
export function emptySoundtrackLibrary({ catalogue = false, version = 3 } = {}) {
  return freezeSoundtrack({
    format: catalogue
      ? version === 2
        ? SOUNDTRACK_FORMAT_V2
        : SOUNDTRACK_FORMAT_V3
      : SOUNDTRACK_FORMAT,
    ...(catalogue
      ? {
          catalogTracks: [],
          installedTrackIds: [],
          tags: {},
          listening: {
            // New players land on the bundled Ukrainian opening theme. Older
            // saved libraries keep their explicit choice during upgrade.
            mode: version === 2 ? 'auto' : 'ukrainian',
            genres: [...(version === 2 ? LEGACY_SOUNDTRACK_GENRES : SOUNDTRACK_GENRES)],
            installedOnly: false,
            ...(version === 2 ? {} : { recordingMode: false }),
          },
          ...(version === 2 ? {} : { referenceOnlyTrackIds: [] }),
        }
      : {}),
    tracks: [],
    playlists: [],
    assignments: [],
    selection: { playlistId: null },
  });
}
const resolvedLibraries = new WeakSet();
export function resolveSoundtrackLibrary(value) {
  // Only this resolver's owned, deeply frozen output can bypass validation.
  // Imported, edited and merely frozen objects must still pass every check.
  if (resolvedLibraries.has(value)) return value;
  const library = copy(value);
  const modern = library.format === SOUNDTRACK_FORMAT_V3;
  const catalogue = modern || library.format === SOUNDTRACK_FORMAT_V2;
  ownKeys(
    library,
    [
      'format',
      'tracks',
      'playlists',
      'assignments',
      'selection',
      ...(catalogue ? ['catalogTracks', 'installedTrackIds', 'tags', 'listening'] : []),
      ...(modern ? ['referenceOnlyTrackIds'] : []),
      ...(catalogue && Object.hasOwn(library, 'bonusAlbums') ? ['bonusAlbums'] : []),
    ],
    'soundtrack library',
  );
  required(
    catalogue || library.format === SOUNDTRACK_FORMAT,
    'Unsupported soundtrack library format.',
  );
  required(
    Array.isArray(library.tracks) && library.tracks.length <= SOUNDTRACK_LIMITS.customTracks,
    'Soundtrack track count exceeds 128.',
  );
  library.tracks = library.tracks.map(resolveAudioTrack);
  required(
    modern || library.tracks.every((track) => !Object.hasOwn(track, 'fileName')),
    'Original upload filenames require library v3.',
  );
  if (catalogue) {
    if (Object.hasOwn(library, 'bonusAlbums')) {
      required(
        Array.isArray(library.bonusAlbums) && library.bonusAlbums.length <= 32,
        'Invalid bonus album count.',
      );
      const albumIds = new Set();
      for (const album of library.bonusAlbums) {
        ownKeys(album, ['id', 'trackIds', 'downloaded'], 'bonus album ownership');
        required(
          customId(album.id) && !albumIds.has(album.id) && typeof album.downloaded === 'boolean',
          'Invalid bonus album ownership.',
        );
        albumIds.add(album.id);
        required(
          Array.isArray(album.trackIds) &&
            album.trackIds.length > 0 &&
            album.trackIds.length <= SOUNDTRACK_LIMITS.customTracks &&
            new Set(album.trackIds).size === album.trackIds.length &&
            album.trackIds.every((id) => library.tracks.some((track) => track.id === id)),
          'Bonus album references missing or duplicate tracks.',
        );
      }
    }
    required(
      Array.isArray(library.catalogTracks) &&
        library.catalogTracks.length <= SOUNDTRACK_LIMITS.catalogueTracks,
      'Catalogue track count exceeds 256.',
    );
    library.catalogTracks = library.catalogTracks.map(resolveCatalogueTrack);
    required(
      modern ||
        library.catalogTracks.every((track) => !track.policy && !track.fileName && !track.websites),
      'Rights-aware catalogue records require library v3.',
    );
    required(
      Array.isArray(library.installedTrackIds) &&
        library.installedTrackIds.length <= SOUNDTRACK_LIMITS.catalogueTracks &&
        new Set(library.installedTrackIds).size === library.installedTrackIds.length &&
        library.installedTrackIds.every((id) =>
          library.catalogTracks.some((track) => track.id === id),
        ),
      'Invalid installed catalogue tracks.',
    );
    required(
      library.tags && typeof library.tags === 'object' && !Array.isArray(library.tags),
      'Invalid uploaded track tags.',
    );
    for (const [id, tags] of Object.entries(library.tags)) {
      required(
        library.tracks.some((track) => track.id === id),
        'Tags reference a missing uploaded track.',
      );
      library.tags[id] = resolveSoundtrackTags(tags);
    }
    ownKeys(
      library.listening,
      ['mode', 'genres', 'installedOnly', ...(modern ? ['recordingMode'] : [])],
      'listening settings',
    );
    required(
      !modern || typeof library.listening.recordingMode === 'boolean',
      'Invalid Recording mode.',
    );
    required(
      SOUNDTRACK_MODES.includes(library.listening.mode) &&
        typeof library.listening.installedOnly === 'boolean',
      'Invalid listening settings.',
    );
    validGenres(library.listening.genres, false);
    required(
      modern ||
        (['auto', ...LEGACY_SOUNDTRACK_GENRES, 'fusion', 'mix'].includes(library.listening.mode) &&
          [
            library.listening.genres,
            ...Object.values(library.tags).map((tags) => tags.genres),
            ...library.catalogTracks.map((track) => track.tags.genres),
          ].every((genres) => genres.every((genre) => LEGACY_SOUNDTRACK_GENRES.includes(genre)))),
      'Expanded music styles require library v3.',
    );
  }
  const trackIds = new Set(BUILTIN_SOUNDTRACK_TRACKS.map((t) => t.id)),
    assets = new Map();
  for (const track of [...library.tracks, ...(library.catalogTracks || [])]) {
    required(!trackIds.has(track.id), 'Duplicate soundtrack track ID.');
    trackIds.add(track.id);
    const prior = assets.get(track.asset.sha256);
    required(
      !prior || canonicalJSON(prior) === canonicalJSON(track.asset),
      'One audio hash has conflicting metadata.',
    );
    assets.set(track.asset.sha256, track.asset);
  }
  if (modern) {
    required(
      Array.isArray(library.referenceOnlyTrackIds) &&
        library.referenceOnlyTrackIds.length <= SOUNDTRACK_LIMITS.assets &&
        new Set(library.referenceOnlyTrackIds).size === library.referenceOnlyTrackIds.length &&
        library.referenceOnlyTrackIds.every((id) =>
          !id.startsWith('builtin.')
            ? library.tracks.some((track) => track.id === id)
            : library.catalogTracks.some((track) => track.id === id),
        ),
      'Invalid reference-only recording identities.',
    );
    required(
      !library.installedTrackIds.some((id) => library.referenceOnlyTrackIds.includes(id)),
      'Reference-only recordings cannot be marked installed.',
    );
  }
  required(
    Array.isArray(library.playlists) &&
      library.playlists.length <= SOUNDTRACK_LIMITS.customPlaylists,
    'Playlist count exceeds 32.',
  );
  const playlistIds = new Set(
    [...BUILTIN_SOUNDTRACK_PLAYLISTS, ...cataloguePlaylists(library)].map((p) => p.id),
  );
  for (const playlist of library.playlists) {
    ownKeys(playlist, ['id', 'title', 'trackIds', 'order', 'repeat'], 'playlist');
    required(
      customId(playlist.id) && !playlistIds.has(playlist.id) && text(playlist.title, 120),
      'Invalid or duplicate playlist.',
    );
    playlistIds.add(playlist.id);
    required(
      Array.isArray(playlist.trackIds) &&
        playlist.trackIds.length > 0 &&
        playlist.trackIds.length <= 128 &&
        playlist.trackIds.every((id) => trackIds.has(id)),
      'Playlist has missing tracks or invalid entry count.',
    );
    required(
      ['ordered', 'shuffle'].includes(playlist.order) &&
        ['all', 'one', 'off'].includes(playlist.repeat),
      'Unsupported playlist order/repeat.',
    );
  }
  required(
    Array.isArray(library.assignments) && library.assignments.length <= 256,
    'Assignment count exceeds 256.',
  );
  const assignmentKeys = new Set();
  for (const assignment of library.assignments) {
    ownKeys(assignment, ['scope', 'key', 'playlistId'], 'soundtrack assignment');
    required(
      ['global', 'theme', 'campaign', 'map'].includes(assignment.scope) &&
        (assignment.scope === 'global' ? assignment.key === null : text(assignment.key, 512)) &&
        playlistIds.has(assignment.playlistId),
      'Invalid soundtrack assignment.',
    );
    const key = JSON.stringify([assignment.scope, assignment.key]);
    required(!assignmentKeys.has(key), 'Duplicate soundtrack assignment.');
    assignmentKeys.add(key);
  }
  ownKeys(library.selection, ['playlistId'], 'soundtrack selection');
  required(
    library.selection.playlistId === null || playlistIds.has(library.selection.playlistId),
    'Selected playlist is unavailable.',
  );
  freezeSoundtrack(library);
  resolvedLibraries.add(library);
  return library;
}
export function resolveSoundtrackSelection(value, context = {}, { catalogue } = {}) {
  const trusted = catalogue === undefined ? undefined : resolveSoundtrackCatalogue(catalogue);
  const library = resolveSoundtrackLibrary(value),
    scope = copy(context);
  exactKeys(
    scope,
    ['mapKey', 'campaignKey', 'themeId', 'scene', 'energy', 'installedTrackIds', 'bundledTrackIds'],
    'soundtrack context',
  );
  for (const key of ['mapKey', 'campaignKey', 'themeId'])
    if (Object.hasOwn(scope, key))
      required(scope[key] === null || text(scope[key], 512), 'Invalid soundtrack context key.');
  required(
    scope.scene === undefined || ['menu', 'gameplay'].includes(scope.scene),
    'Invalid soundtrack scene.',
  );
  required(
    scope.installedTrackIds === undefined ||
      (Array.isArray(scope.installedTrackIds) &&
        scope.installedTrackIds.length <= SOUNDTRACK_LIMITS.catalogueTracks &&
        scope.installedTrackIds.every(stableId)),
    'Invalid installed soundtrack context.',
  );
  required(
    scope.bundledTrackIds === undefined ||
      (Array.isArray(scope.bundledTrackIds) &&
        scope.bundledTrackIds.length <= SOUNDTRACK_LIMITS.catalogueTracks &&
        new Set(scope.bundledTrackIds).size === scope.bundledTrackIds.length &&
        scope.bundledTrackIds.every(stableId)),
    'Invalid bundled soundtrack context.',
  );
  required(
    scope.energy === undefined ||
      (Number.isInteger(scope.energy) && scope.energy >= 1 && scope.energy <= 5),
    'Invalid soundtrack energy target.',
  );
  const playlists = [
    ...BUILTIN_SOUNDTRACK_PLAYLISTS,
    ...cataloguePlaylists(library),
    ...library.playlists,
  ];
  let id = library.selection.playlistId,
    source = 'explicit';
  if (id === null && (library.format === SOUNDTRACK_FORMAT || library.listening.mode === 'auto')) {
    for (const [kind, key] of [
      ['map', scope.mapKey],
      ['campaign', scope.campaignKey],
      ['theme', scope.themeId],
      ['global', null],
    ]) {
      if (key === undefined) continue;
      const entry = library.assignments.find((a) => a.scope === kind && a.key === key);
      if (entry) {
        id = entry.playlistId;
        source = kind;
        break;
      }
    }
  }
  if (id === null && library.format !== SOUNDTRACK_FORMAT)
    return automaticSelection(library, scope, trusted);
  if (id === null) {
    id = 'builtin.all';
    source = 'default';
  }
  const playlist = playlists.find((p) => p.id === id);
  if (library.format !== SOUNDTRACK_FORMAT) {
    const unavailable = new Set(soundtrackOffloadedBonusTrackIds(library));
    const candidates = playlist.trackIds.filter(
      (trackId) =>
        !unavailable.has(trackId) &&
        eligibleRecording(
          soundtrackTracks(library).find((track) => track.id === trackId),
          library,
          trusted,
        ),
    );
    const ids = library.listening.installedOnly
      ? installedSelection(library, scope, candidates)
      : candidates;
    return freezeSoundtrack({
      playlist: { ...playlist, trackIds: ids },
      source,
      ...(candidates.length !== playlist.trackIds.length
        ? {
            notice: library.listening.recordingMode
              ? 'Recording mode excludes music without verified gameplay-video permission and unregistered Content ID.'
              : 'Some recordings are unavailable. Use Download again for permitted albums or restore their originals.',
          }
        : !ids.length
          ? { notice: 'No tracks in this playlist are installed. Download its recordings first.' }
          : {}),
    });
  }
  return freezeSoundtrack({ playlist, source });
}
/** Presentation randomness only. Duplicate authored entries remain intentional. */
export function soundtrackOrder(playlist, { random = Math.random, previousTrackId = null } = {}) {
  const item = copy(playlist);
  ownKeys(item, ['id', 'title', 'trackIds', 'order', 'repeat'], 'playlist');
  required(
    stableId(item.id) &&
      text(item.title, 120) &&
      Array.isArray(item.trackIds) &&
      item.trackIds.length <= SOUNDTRACK_LIMITS.assets &&
      item.trackIds.every(stableId) &&
      ['ordered', 'shuffle'].includes(item.order) &&
      ['all', 'one', 'off'].includes(item.repeat),
    'Invalid playlist.',
  );
  required(
    typeof random === 'function' && (previousTrackId === null || stableId(previousTrackId)),
    'Invalid playlist random/previous input.',
  );
  const result = [...item.trackIds];
  if (item.order === 'shuffle') {
    for (let i = result.length - 1; i > 0; i--) {
      const n = random();
      required(Number.isFinite(n) && n >= 0 && n < 1, 'Playlist randomness must be in [0,1).');
      const j = Math.floor(n * (i + 1));
      [result[i], result[j]] = [result[j], result[i]];
    }
    if (result[0] === previousTrackId) {
      const next = result.findIndex((id) => id !== previousTrackId);
      if (next > 0) [result[0], result[next]] = [result[next], result[0]];
    }
  }
  return Object.freeze(result);
}

function validGenres(genres, empty = true) {
  required(
    Array.isArray(genres) &&
      genres.length <= SOUNDTRACK_GENRES.length &&
      (empty || genres.length > 0) &&
      new Set(genres).size === genres.length &&
      genres.every((genre) => SOUNDTRACK_GENRES.includes(genre)),
    'Invalid soundtrack genres.',
  );
}
export function resolveSoundtrackTags(value) {
  const tags = copy(value);
  ownKeys(tags, ['genres', 'role', 'energy', 'themes'], 'soundtrack tags');
  validGenres(tags.genres);
  required(
    ['any', 'menu', 'gameplay', 'intense'].includes(tags.role) &&
      Number.isInteger(tags.energy) &&
      tags.energy >= 1 &&
      tags.energy <= 5,
    'Invalid soundtrack role or energy.',
  );
  required(
    Array.isArray(tags.themes) &&
      tags.themes.length <= 32 &&
      new Set(tags.themes).size === tags.themes.length &&
      tags.themes.every(stableId),
    'Invalid soundtrack themes.',
  );
  return freezeSoundtrack(tags);
}
export function resolveCatalogueTrack(value) {
  const entry = copy(value);
  ownKeys(
    entry,
    [
      'format',
      'id',
      'kind',
      'title',
      'artist',
      'asset',
      'rights',
      'edition',
      'path',
      'tags',
      ...(Object.hasOwn(entry, 'policy') ? ['policy'] : []),
      ...(Object.hasOwn(entry, 'fileName') ? ['fileName'] : []),
      ...(Object.hasOwn(entry, 'websites') ? ['websites'] : []),
      ...(Object.hasOwn(entry, 'archiveId') ? ['archiveId'] : []),
    ],
    'catalogue track',
  );
  required(
    stableId(entry.id) && entry.id.startsWith('builtin.catalog.'),
    'Invalid catalogue track identity.',
  );
  required(stableId(entry.edition), 'Invalid catalogue edition.');
  required(
    text(entry.path, 512) &&
      /^[a-zA-Z0-9_./-]+\.mp3$/.test(entry.path) &&
      entry.path.split('/').every((part) => part && part !== '.' && part !== '..'),
    'Invalid catalogue audio path.',
  );
  const { edition, path, tags, policy, fileName, websites, archiveId, ...record } = entry;
  const track = resolveAudioTrack({ ...record, id: 'catalogue.validation' });
  const resolvedTags = resolveSoundtrackTags(tags);
  required(resolvedTags.genres.length > 0, 'Catalogue track requires a genre.');
  required(
    ['original', 'licensed'].includes(track.rights.kind),
    'Catalogue track needs distributable provenance.',
  );
  required(
    archiveId === undefined ||
      (stableId(archiveId) && path === `objects/${track.asset.sha256}.mp3` && policy),
    'Archive recordings require a policy and hash-addressed path.',
  );
  required(
    fileName === undefined || (text(fileName, 255) && !/[\\/\x00-\x1f]/.test(fileName)),
    'Invalid soundtrack source filename.',
  );
  return freezeSoundtrack({
    ...track,
    id: entry.id,
    edition,
    path,
    tags: resolvedTags,
    ...(archiveId === undefined ? {} : { archiveId }),
    ...(policy
      ? { policy: resolveSoundtrackPolicy(policy, { id: entry.id, sha256: track.asset.sha256 }) }
      : {}),
    ...(fileName === undefined ? {} : { fileName }),
    ...(websites === undefined ? {} : { websites: resolveSoundtrackWebsites(websites) }),
  });
}
const resolvedCatalogues = new WeakSet();
export function resolveSoundtrackCatalogue(value) {
  if (resolvedCatalogues.has(value)) return value;
  const catalogue = copy(value);
  ownKeys(catalogue, ['format', 'edition', 'tracks'], 'soundtrack catalogue');
  required(
    [SOUNDTRACK_CATALOGUE_FORMAT, SOUNDTRACK_CATALOGUE_FORMAT_V2].includes(catalogue.format) &&
      stableId(catalogue.edition) &&
      Array.isArray(catalogue.tracks) &&
      catalogue.tracks.length <= SOUNDTRACK_LIMITS.catalogueTracks,
    'Invalid soundtrack catalogue.',
  );
  catalogue.tracks = catalogue.tracks.map(resolveCatalogueTrack);
  required(
    catalogue.tracks.every((track) =>
      catalogue.format === SOUNDTRACK_CATALOGUE_FORMAT_V2 ? Boolean(track.policy) : !track.policy,
    ),
    'Catalogue version and rights policy differ.',
  );
  required(
    catalogue.tracks.every((track) => track.edition === catalogue.edition) &&
      new Set(catalogue.tracks.map((track) => track.id)).size === catalogue.tracks.length,
    'Catalogue identity or edition differs.',
  );
  const hashes = new Map();
  for (const track of catalogue.tracks) {
    const prior = hashes.get(track.asset.sha256);
    required(
      !prior || canonicalJSON(prior) === canonicalJSON(track.asset),
      'Catalogue audio hash has conflicting metadata.',
    );
    hashes.set(track.asset.sha256, track.asset);
  }
  freezeSoundtrack(catalogue);
  resolvedCatalogues.add(catalogue);
  return catalogue;
}
export function upgradeSoundtrackLibrary(value) {
  const library = resolveSoundtrackLibrary(value);
  if (library.format === SOUNDTRACK_FORMAT_V3) return library;
  return resolveSoundtrackLibrary({
    ...emptySoundtrackLibrary({ catalogue: true }),
    ...library,
    format: SOUNDTRACK_FORMAT_V3,
    listening: {
      ...(library.listening ?? emptySoundtrackLibrary({ catalogue: true }).listening),
      recordingMode: false,
    },
    referenceOnlyTrackIds: [],
  });
}
/** Adopt pinned, reviewed catalogue metadata. Existing identities can never be silently replaced. */
export function setCatalogueTracks(value, source) {
  const library = upgradeSoundtrackLibrary(value);
  required(Array.isArray(source), 'Catalogue tracks must be an array.');
  const tracks = new Map(library.catalogTracks.map((track) => [track.id, track]));
  for (const entry of source) {
    const track = resolveCatalogueTrack(entry),
      prior = tracks.get(track.id);
    required(
      !prior || canonicalJSON(prior) === canonicalJSON(track),
      'Catalogue track identity conflicts with its saved pin.',
    );
    tracks.set(track.id, track);
  }
  return resolveSoundtrackLibrary({ ...library, catalogTracks: [...tracks.values()] });
}
/** Metadata references are separate from offline ownership. Upload originals are always owned. */
export function soundtrackReferencedTracks(value) {
  const library = resolveSoundtrackLibrary(value);
  return Object.freeze([...library.tracks, ...(library.catalogTracks || [])]);
}
export function soundtrackStoredTracks(value) {
  const library = resolveSoundtrackLibrary(value);
  const references = new Set(library.referenceOnlyTrackIds ?? []);
  const owned = new Set((library.bonusAlbums ?? []).flatMap((album) => album.trackIds));
  const downloaded = new Set(
    (library.bonusAlbums ?? [])
      .filter((album) => album.downloaded)
      .flatMap((album) => album.trackIds),
  );
  return Object.freeze([
    ...library.tracks.filter(
      (track) => !references.has(track.id) && (!owned.has(track.id) || downloaded.has(track.id)),
    ),
    ...(library.catalogTracks || []).filter(
      (track) => !references.has(track.id) && library.installedTrackIds.includes(track.id),
    ),
  ]);
}
/** Offloaded bonus pins never authorize a network request; only retained local ownership plays. */
export function soundtrackOffloadedBonusTrackIds(value) {
  const library = resolveSoundtrackLibrary(value);
  const owned = new Set((library.bonusAlbums ?? []).flatMap((album) => album.trackIds));
  const requiredHashes = new Set(
    soundtrackStoredTracks(library).map((track) => track.asset.sha256),
  );
  return Object.freeze(
    library.tracks
      .filter((track) => owned.has(track.id) && !requiredHashes.has(track.asset.sha256))
      .map((track) => track.id),
  );
}
export function soundtrackTracks(value) {
  return Object.freeze([...BUILTIN_SOUNDTRACK_TRACKS, ...soundtrackReferencedTracks(value)]);
}
const genreLabels = {
  ...SOUNDTRACK_GENRE_LABELS,
  fusion: 'Fusion',
  mix: 'Mix all styles',
  auto: 'Automatic',
};
function trackTags(library, track) {
  if (track.tags) return track.tags;
  if (library.tags?.[track.id]) return library.tags[track.id];
  if (track.kind === 'synth')
    return {
      genres: [SOUNDTRACK_GENRES.includes(track.recipe.genre) ? track.recipe.genre : 'synth90s'],
      role: track.recipe.genre === 'ambient' ? 'menu' : 'any',
      energy: 3,
      themes: [],
    };
  return { genres: [], role: 'any', energy: 3, themes: [] };
}
function matchesMode(tags, mode, genres) {
  if (mode === 'fusion') return tags.genres.length > 1;
  if (SOUNDTRACK_GENRES.includes(mode)) return tags.genres.includes(mode);
  return tags.genres.length === 0 || tags.genres.some((genre) => genres.includes(genre));
}
/** Code-owned album descriptions only. These definitions never authorize audio bytes or URLs. */
export function resolveSoundtrackCollections(value) {
  const collections = boundedJSON(value, {
    maxBytes: SOUNDTRACK_LIMITS.metadataBytes,
    maxNodes: 10000,
    maxDepth: 3,
    maxArray: SOUNDTRACK_LIMITS.catalogueTracks,
    maxString: 512,
  });
  required(
    Array.isArray(collections) && collections.length <= 32,
    'Invalid soundtrack collections.',
  );
  const ids = new Set();
  for (const collection of collections) {
    ownKeys(
      collection,
      ['id', 'title', 'description', 'genre', 'trackIds', 'order', 'repeat'],
      'soundtrack collection',
    );
    required(
      stableId(collection.id) &&
        collection.id.startsWith('builtin.album.') &&
        !ids.has(collection.id),
      'Invalid or duplicate soundtrack collection identity.',
    );
    ids.add(collection.id);
    required(
      text(collection.title, 120) &&
        text(collection.description, 512) &&
        SOUNDTRACK_GENRES.includes(collection.genre),
      'Invalid soundtrack collection description.',
    );
    required(
      Array.isArray(collection.trackIds) &&
        collection.trackIds.length > 0 &&
        collection.trackIds.length <= SOUNDTRACK_LIMITS.catalogueTracks &&
        new Set(collection.trackIds).size === collection.trackIds.length &&
        collection.trackIds.every((id) => stableId(id) && id.startsWith('builtin.catalog.')),
      'Invalid soundtrack collection tracks.',
    );
    required(
      (collection.order === 'shuffle' ||
        (collection.id === 'builtin.album.ukrainian.shchedryk-opening' &&
          collection.order === 'ordered')) &&
        collection.repeat === 'all',
      'Invalid soundtrack collection playback.',
    );
  }
  return freezeSoundtrack(collections);
}
let collectionDefinitions;
function albumPlaylists(library) {
  if (library.format !== SOUNDTRACK_FORMAT_V3) return [];
  collectionDefinitions ??= resolveSoundtrackCollections(SOUNDTRACK_COLLECTIONS);
  const present = new Set(library.catalogTracks.map((track) => track.id));
  return collectionDefinitions.flatMap(({ id, title, trackIds, order, repeat }) => {
    const adopted = trackIds.filter((trackId) => present.has(trackId));
    return adopted.length ? [{ id, title, trackIds: adopted, order, repeat }] : [];
  });
}
/** Shipped albums are built-in playlists; uploads and custom-playlist capacity stay independent. */
export function soundtrackAlbumPlaylists(value) {
  return freezeSoundtrack(albumPlaylists(resolveSoundtrackLibrary(value)));
}
function uniqueRecordings(tracks) {
  const seen = new Set();
  return tracks.filter((track) => {
    const key = track.kind === 'mp3' ? track.asset.sha256 : track.id;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}
function cataloguePlaylists(library) {
  if (library.format === SOUNDTRACK_FORMAT) return [];
  const tracks = [...BUILTIN_SOUNDTRACK_TRACKS, ...library.catalogTracks, ...library.tracks];
  const genres =
    library.format === SOUNDTRACK_FORMAT_V2 ? LEGACY_SOUNDTRACK_GENRES : SOUNDTRACK_GENRES;
  const playlists = [...genres, 'fusion', 'mix'].map((mode) => ({
    id: `builtin.playlist.${mode}`,
    title: genreLabels[mode],
    trackIds: uniqueRecordings(
      tracks.filter((track) => matchesMode(trackTags(library, track), mode, SOUNDTRACK_GENRES)),
    ).map((track) => track.id),
    order: 'shuffle',
    repeat: 'all',
  }));
  const ua = library.catalogTracks.filter((track) =>
    track.id.startsWith('builtin.catalog.ua-fpv.'),
  );
  if (ua.length)
    playlists.push({
      id: 'builtin.playlist.ua-fpv',
      title: 'UA-FPV',
      trackIds: ua.map((track) => track.id),
      order: 'shuffle',
      repeat: 'all',
    });
  return [...playlists, ...albumPlaylists(library)];
}
export function soundtrackPlaylists(value) {
  const library = resolveSoundtrackLibrary(value);
  return freezeSoundtrack([
    ...BUILTIN_SOUNDTRACK_PLAYLISTS,
    ...cataloguePlaylists(library),
    ...library.playlists,
  ]);
}
function installedSelection(library, context, ids) {
  const catalogue = new Set(library.catalogTracks.map((track) => track.id));
  const present = new Set([
    ...(context.installedTrackIds ?? library.installedTrackIds),
    ...(context.bundledTrackIds ?? []),
  ]);
  const availableHashes = new Set([
    ...soundtrackStoredTracks(library)
      .filter((track) => !catalogue.has(track.id))
      .map((track) => track.asset.sha256),
    ...library.catalogTracks
      .filter((track) => present.has(track.id))
      .map((track) => track.asset.sha256),
  ]);
  const tracks = new Map(soundtrackTracks(library).map((track) => [track.id, track]));
  return ids.filter((id) => {
    const track = tracks.get(id);
    return track?.kind === 'synth' || availableHashes.has(track?.asset.sha256);
  });
}
export function soundtrackFallbackSelection(mode, genres = SOUNDTRACK_GENRES) {
  required(SOUNDTRACK_MODES.includes(mode), 'Invalid soundtrack fallback mode.');
  validGenres(genres, false);
  const trackIds = BUILTIN_SOUNDTRACK_TRACKS.filter((track) =>
    matchesMode(trackTags({}, track), mode, genres),
  ).map((track) => track.id);
  return freezeSoundtrack({
    playlist: {
      id: `builtin.listening.${mode}.fallback`,
      title: genreLabels[mode],
      trackIds,
      order: 'shuffle',
      repeat: 'all',
    },
    source: trackIds.length ? 'catalogue-fallback' : 'unavailable',
    ...(trackIds.length
      ? {}
      : {
          notice: `No ${genreLabels[mode].toLowerCase()} tracks are available. Add matching music in the library.`,
        }),
  });
}
function automaticSelection(library, context, catalogue) {
  // The host may supply a reviewed energy target. Prefer closest eligible energy only
  // after scene/theme matching; this never changes gameplay or explicit playlists.
  const { mode, genres, installedOnly } = library.listening;
  let tracks = [...library.catalogTracks, ...library.tracks];
  const recordingExcluded =
    library.listening.recordingMode &&
    tracks.some(
      (track) =>
        matchesMode(trackTags(library, track), mode, genres) &&
        !eligibleRecording(track, library, catalogue),
    );
  const recordingNotice =
    'Recording mode excludes music without verified gameplay-video permission and unregistered Content ID.';
  tracks = tracks.filter((track) => eligibleRecording(track, library, catalogue));
  tracks = tracks.filter((track) => matchesMode(trackTags(library, track), mode, genres));
  const unavailable = new Set(soundtrackOffloadedBonusTrackIds(library));
  const hasOffloaded = tracks.some((track) => unavailable.has(track.id));
  tracks = tracks.filter((track) => !unavailable.has(track.id));
  if (installedOnly) {
    const present = new Set(
      installedSelection(
        library,
        context,
        tracks.map((track) => track.id),
      ),
    );
    tracks = tracks.filter((track) => present.has(track.id));
  }
  const scene = context.scene ?? 'gameplay';
  const eligible = tracks.filter((track) => {
    const role = trackTags(library, track).role;
    return (
      role === 'any' ||
      (scene === 'menu' ? role === 'menu' : role === 'gameplay' || role === 'intense')
    );
  });
  tracks = eligible;
  if (mode === 'auto' && context.themeId) {
    const themed = tracks.filter((track) =>
      trackTags(library, track).themes.includes(context.themeId),
    );
    if (themed.length) tracks = themed;
  }
  if (mode === 'auto' && context.energy !== undefined && tracks.length) {
    const distance = Math.min(
      ...tracks.map((track) => Math.abs(trackTags(library, track).energy - context.energy)),
    );
    tracks = tracks.filter(
      (track) => Math.abs(trackTags(library, track).energy - context.energy) === distance,
    );
  }
  tracks = uniqueRecordings(tracks);
  if (!tracks.length) {
    const fallback = soundtrackFallbackSelection(mode, genres);
    if (recordingExcluded) return freezeSoundtrack({ ...fallback, notice: recordingNotice });
    return hasOffloaded
      ? freezeSoundtrack({
          ...fallback,
          notice:
            'Album recordings are not downloaded. Use Download again in Community soundtracks.',
        })
      : fallback;
  }
  return freezeSoundtrack({
    playlist: {
      id: `builtin.listening.${mode}.${scene}`,
      title: `${genreLabels[mode]} · ${scene === 'menu' ? 'Menu' : 'Play'}`,
      trackIds: tracks.map((track) => track.id),
      order: 'shuffle',
      repeat: 'all',
    },
    source: 'catalogue',
    ...(recordingExcluded ? { notice: recordingNotice } : {}),
  });
}

export function soundtrackRights(track, { catalogue } = {}) {
  return effectiveSoundtrackPolicy(
    copy(track),
    catalogue === undefined ? undefined : resolveSoundtrackCatalogue(catalogue),
  );
}
function eligibleRecording(track, library, catalogue) {
  if (!track) return false;
  const policy = effectiveSoundtrackPolicy(track, catalogue);
  if (policy.webPlayback !== 'allowed') return false;
  if (
    library.listening?.recordingMode &&
    (policy.gameplayVideo !== 'allowed' || policy.contentId !== 'not-registered')
  )
    return false;
  if ((library.referenceOnlyTrackIds ?? []).includes(track.id)) {
    return (
      (catalogue?.tracks ?? []).some((item) => item.asset.sha256 === track.asset.sha256) &&
      policy.webPlayback === 'allowed'
    );
  }
  return true;
}
/** Read-only transfer plan: omitted bytes are explicit recovery references, never URL authority. */
export function soundtrackRecoveryPlan(value, { catalogue } = {}) {
  const library = resolveSoundtrackLibrary(value);
  const trusted = catalogue === undefined ? undefined : resolveSoundtrackCatalogue(catalogue);
  const tracks = soundtrackReferencedTracks(library);
  const savedReferences = new Set(library.referenceOnlyTrackIds ?? []);
  const authoritativeHashes = new Set(
    (trusted?.tracks ?? []).filter((track) => track.policy).map((track) => track.asset.sha256),
  );
  const excluded = new Set(
    tracks
      .filter((track) => {
        const policy = effectiveSoundtrackPolicy(track, trusted);
        return (
          policy.redistribute !== 'allowed' ||
          policy.offlineCache !== 'allowed' ||
          // An imported reference may be a renamed legacy upload with no policy
          // field. Its omitted bytes remain unknown until trusted hash-bound
          // authority says otherwise; a marker never grants network permission.
          (savedReferences.has(track.id) && !authoritativeHashes.has(track.asset.sha256))
        );
      })
      .map((track) => track.asset.sha256),
  );
  const referenceOnlyTrackIds = tracks
    .filter((track) => excluded.has(track.asset.sha256))
    .map((track) => track.id);
  return freezeSoundtrack({
    requiredTracks: tracks.filter((track) => !excluded.has(track.asset.sha256)),
    referenceOnlyTrackIds,
    notice: referenceOnlyTrackIds.length
      ? `${referenceOnlyTrackIds.length} recording references are preserved without audio because offline storage or redistribution is denied or not verified. Playback requires an approved online source from the game catalogue.`
      : '',
  });
}
