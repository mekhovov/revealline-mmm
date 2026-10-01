import { canonicalJSON, required } from './data-json.mjs';
import { exportBackup, MAX_BACKUP_BYTES } from './backup.mjs';
import { exportMediaBundle } from './media-bundle.mjs';
import { exportStoryBundle } from './story-bundle.mjs';
import { exportSoundtrackBundle, ownSoundtrackAssets } from './soundtrack-bundle.mjs';
import { SOUNDTRACK_FORMAT_V3, soundtrackReferencedTracks } from './soundtrack.mjs';
import { soundtrackPortableRecoveryPlan } from './soundtrack-portable.mjs';
import { MANAGED_MEDIA_LIMITS } from './managed-media-store.mjs';

// One saved shared-media inventory plus the existing per-format metadata bounds.
// Existing serializers still enforce their stricter individual limits.
export const BACKUP_SET_MAX_BYTES = MAX_BACKUP_BYTES + MANAGED_MEDIA_LIMITS.bytes + 8 * 1024 * 1024;
const abort = (signal) => {
  if (signal?.aborted) throw new DOMException('Backup preparation cancelled.', 'AbortError');
};
const digest = async (blob, signal) => {
  abort(signal);
  const bytes = await blob.arrayBuffer();
  abort(signal);
  const hash = await crypto.subtle.digest('SHA-256', bytes);
  abort(signal);
  return [...new Uint8Array(hash)].map((b) => b.toString(16).padStart(2, '0')).join('');
};
const generations = (value) => {
  for (const key of ['media', 'story', 'audio'])
    required(Number.isSafeInteger(value[key]) && value[key] >= 0, 'Invalid backup generation.');
  return canonicalJSON(value);
};

/** Read-only coordination of the existing four portable formats. Adapters and
 * the current writer are borrowed. No store is committed, closed or replaced.
 * Metadata fences establish a stable observation, not a cross-store lock.
 */
export async function prepareBackupSet(
  source,
  { signal, onProgress = () => {}, maxBytes = BACKUP_SET_MAX_BYTES } = {},
) {
  abort(signal);
  required(
    Number.isSafeInteger(maxBytes) && maxBytes > 0 && maxBytes <= BACKUP_SET_MAX_BYTES,
    'Invalid backup-set byte budget.',
  );
  onProgress('Reading saved original inventories…');
  const gameIdentity = source.gameIdentity(),
    savedAt = new Date().toISOString(),
    // One prefix for this observed snapshot, independent of browser rename rules.
    filenamePrefix = `fpv-line-backup-${savedAt.replace(/[^0-9TZ]/g, '')}-${crypto.randomUUID().replace(/-/g, '')}`,
    metadata = await source.readMetadata({ signal }),
    generationIdentity = generations(metadata);
  abort(signal);
  onProgress('Reading game data and the saved flight…');
  const game = await source.readGame({ savedAt, signal });
  abort(signal);
  const gameContents = canonicalJSON(game.contents);
  const assertGameCurrent = () => {
    required(
      source.gameIdentity() === gameIdentity,
      'Game data changed. Prepare the backup set again.',
    );
  };
  assertGameCurrent();
  const files = [];
  let total = 0;
  async function add(id, filename, blob) {
    abort(signal);
    total += blob.size;
    required(total <= maxBytes, 'Backup set exceeds its bounded preparation budget.');
    onProgress(
      `Hashing the ${id === 'coverage' ? 'coverage report' : id === 'audio' ? 'music backup' : id === 'media' ? 'picture backup' : id === 'story' ? 'story backup' : 'game-data backup'}…`,
    );
    const sha256 = await digest(blob, signal);
    assertGameCurrent();
    files.push(Object.freeze({ id, filename, blob, bytes: blob.size, sha256 }));
  }
  onProgress('Checking game data and the saved flight…');
  await add(
    'game',
    `${filenamePrefix}-game-data.json`,
    new Blob([await exportBackup(game.contents, { ...game.options, signal })], {
      type: 'application/json',
    }),
  );
  onProgress('Checking picture and poster originals…');
  const still = await source.readStill({ signal });
  required(
    still.generation === metadata.media,
    'Picture originals changed. Prepare the backup set again.',
  );
  await add(
    'media',
    `${filenamePrefix}-originals.rlmedia`,
    await exportMediaBundle(still.document, still.assets, {
      signal,
      decodeImage: source.decodeImage,
    }),
  );
  onProgress('Checking story originals…');
  const story = await source.readStory({ signal });
  required(story.generation === metadata.story, 'Stories changed. Prepare the backup set again.');
  await add(
    'story',
    `${filenamePrefix}-stories.rlstory`,
    await exportStoryBundle(story.document, story.assets, { still: still.document, signal }),
  );
  onProgress('Checking saved music originals…');
  const audio = await source.readAudio({ signal });
  required(audio.generation === metadata.audio, 'Music changed. Prepare the backup set again.');
  const audioPlan = soundtrackPortableRecoveryPlan(audio.library, { catalogue: source.catalogue }),
    referencedAudio = soundtrackReferencedTracks(audio.library),
    referencedHashes = new Set(referencedAudio.map((track) => track.asset.sha256)),
    requiredAudio = new Map(audioPlan.requiredTracks.map((track) => [track.asset.sha256, track])),
    savedAudio = ownSoundtrackAssets(audio.assets);
  required(
    savedAudio.every((asset) => referencedHashes.has(asset.sha256)),
    'Music inventory contains an unreferenced original.',
  );
  required(
    total + [...requiredAudio.values()].reduce((sum, track) => sum + track.asset.bytes, 0) <=
      maxBytes,
    'Backup set exceeds its bounded preparation budget.',
  );
  const audioAssets = new Map(
    savedAudio
      .filter((asset) => requiredAudio.has(asset.sha256))
      .map((asset) => [asset.sha256, asset]),
  );
  for (const [sha256, track] of requiredAudio) {
    abort(signal);
    if (audioAssets.has(sha256)) continue;
    required(
      typeof source.readAudioAsset === 'function',
      `Music original is unavailable: ${track.title}. Download or restore it before preparing the backup set.`,
    );
    onProgress(`Reading the permitted music original: ${track.title}…`);
    const blob = await source.readAudioAsset(sha256, { signal, purpose: 'export' });
    abort(signal);
    assertGameCurrent();
    required(blob, `Music original is unavailable: ${track.title}. Download or restore it first.`);
    audioAssets.set(sha256, { sha256, blob });
  }
  const audioBlob = await exportSoundtrackBundle(audio.library, [...audioAssets.values()], {
    signal,
    catalogue: source.catalogue,
  });
  // The serializer may install previously offloaded pins or upgrade a restricted
  // legacy upload to reference-only v3. Coverage describes the actual portable
  // document, not a different saved-state manifest.
  const audioHeader = new Uint8Array(await audioBlob.slice(0, 12).arrayBuffer()),
    audioManifestBytes = new DataView(audioHeader.buffer).getUint32(8, false),
    portableAudio = JSON.parse(await audioBlob.slice(12, 12 + audioManifestBytes).text()).library,
    referenceOnlyMusic = referencedAudio
      .filter((track) => audioPlan.referenceOnlyTrackIds.includes(track.id))
      .map((track) => ({ id: track.id, title: track.title, sha256: track.asset.sha256 }));
  await add('audio', `${filenamePrefix}-soundtrack.rlsound`, audioBlob);
  const detachedStories = story.document.stories
    .filter((row) => !story.document.originals.includes(row.source.sha256))
    .map((row) => ({ id: row.id, sha256: row.source.sha256 }));
  onProgress('Hashing inventory metadata for the coverage report…');
  const coverage = Object.freeze({
    report: 'RevealLine backup set coverage',
    reportVersion: portableAudio.format === SOUNDTRACK_FORMAT_V3 ? 2 : 1,
    preparedAt: savedAt,
    edition: {
      version: source.edition.version,
      channel: source.edition.channel,
      sourceRevision: source.edition.sourceRevision ?? null,
    },
    generations: { ...metadata },
    mediaScope: 'Saved shared-origin media, paired with this one game profile channel',
    domains: await Promise.all(
      [
        ['media', still.document, still.assets],
        ['story', story.document, story.assets],
        ['audio', portableAudio, [...audioAssets.values()]],
      ].map(async ([id, document, assets]) => ({
        id,
        metadataSha256: await digest(new Blob([canonicalJSON(document)]), signal),
        originals: assets.length,
        originalBytes: assets.reduce((sum, asset) => sum + asset.blob.size, 0),
      })),
    ),
    coverage: detachedStories.length
      ? referenceOnlyMusic.length
        ? 'incomplete: detached story originals and reference-only music'
        : 'incomplete: detached story originals'
      : referenceOnlyMusic.length
        ? 'incomplete: reference-only music'
        : 'saved referenced inventory',
    detachedStories,
    ...(portableAudio.format === SOUNDTRACK_FORMAT_V3
      ? { referenceOnlyMusic, musicRecoveryNotice: audioPlan.notice }
      : {}),
    exclusions: [
      'Unsaved editor drafts',
      'Other profile channels',
      'Unreferenced blobs and browser caches',
      'Unavailable or detached originals',
      ...(audioPlan.omittedCatalogueTrackIds.length
        ? ['Unused, uninstalled online catalogue recordings']
        : []),
      ...(referenceOnlyMusic.length ? ['Audio bytes of reference-only restricted music'] : []),
    ],
    restoreOrder: [
      'Restore .rlmedia picture/poster originals',
      'Restore .rlstory stories',
      'Restore .rlsound saved music',
      'Review and import game-data JSON',
    ],
    files: files.map(({ id, filename, bytes, sha256 }) => ({
      id,
      filename,
      bytes,
      sha256,
      status: 'Prepared',
    })),
    note:
      'Prepared files have not been saved to disk. Download each file and check its bytes and SHA-256. Restore uses the existing independent reviews; it is not an atomic multi-file transaction.' +
      (audioPlan.notice ? ` ${audioPlan.notice}` : ''),
  });
  await add(
    'coverage',
    `${filenamePrefix}-coverage.json`,
    new Blob([JSON.stringify(coverage, null, 2) + '\n'], { type: 'application/json' }),
  );
  // Re-read full game metadata with the SAME export timestamp. A newly generated
  // savedAt must not mask a changed replay or falsely invalidate an idle flight.
  onProgress('Rechecking game data for a consistent backup set…');
  const finalGame = await source.readGame({ savedAt, signal });
  required(
    canonicalJSON(finalGame.contents) === gameContents,
    'Game data changed. Prepare the backup set again.',
  );
  onProgress('Rechecking saved original inventories…');
  required(
    generations(await source.readMetadata({ signal })) === generationIdentity,
    'Originals changed. Prepare the backup set again.',
  );
  abort(signal);
  assertGameCurrent();
  return Object.freeze({ files: Object.freeze(files), coverage, assertGameCurrent });
}
