import { boundedJSON, exactKeys, required } from '../data-json.mjs';
import { freezeMedia, validateStillAsset } from '../media-library.mjs';
import { openVideoPosterSource, VIDEO_POSTER_LIMITS } from '../video-poster.mjs';
import { prepareCreatorImage, CREATOR_IMAGE_LIMITS } from './image.mjs';
import { creatorAbort, creatorSHA256, ownCreatorBlob } from './bytes.mjs';

export const CREATOR_MEDIA_DEPENDENCIES_FORMAT = 'revealline-creator-media-dependencies.v1';
export const CREATOR_MEDIA_INTAKE_LIMITS = Object.freeze({
  items: 100,
  filenameCharacters: 255,
  ...VIDEO_POSTER_LIMITS,
});
const nativeSize = Object.getOwnPropertyDescriptor(Blob.prototype, 'size').get;
const hashValid = (value) => typeof value === 'string' && /^[a-f0-9]{64}$/.test(value);
const abortError = (error) => error?.name === 'AbortError';
const fail = (message) => new TypeError(message);
const natural = new Intl.Collator('en', { numeric: true, sensitivity: 'base' });

/** Filenames are only a review hint. Removing or changing a name never changes an
 * asset identity, which is always the SHA-256 of the owned bytes. */
export function normalizeCreatorMediaStem(filename) {
  required(
    typeof filename === 'string' &&
      filename.length > 0 &&
      filename.length <= CREATOR_MEDIA_INTAKE_LIMITS.filenameCharacters,
    'Media filenames must be bounded text.',
  );
  const basename = filename.replaceAll('\\', '/').split('/').at(-1),
    dot = basename.lastIndexOf('.'),
    stem = (dot > 0 ? basename.slice(0, dot) : basename)
      .normalize('NFKC')
      .toLocaleLowerCase('en')
      .replace(/[^\p{Letter}\p{Number}]+/gu, '-')
      .replace(/^-+|-+$/g, '');
  required(stem.length > 0 && stem.length <= 255, 'Media filename has no usable pairing stem.');
  return stem;
}

export function validateCreatorPlaybackRange(video, source) {
  const info = boundedJSON(video, { maxBytes: 4096, maxNodes: 16, maxDepth: 2 }),
    range = boundedJSON(source, { maxBytes: 1024, maxNodes: 4, maxDepth: 1 });
  exactKeys(
    info,
    ['width', 'height', 'durationSeconds', 'mime', 'bytes', 'sha256'],
    'inspected video',
  );
  exactKeys(
    range,
    [
      'startSeconds',
      'endSeconds',
      ...(Object.hasOwn(range, 'retainsCompleteOriginal') ? ['retainsCompleteOriginal'] : []),
    ],
    'video playback range',
  );
  required(
    hashValid(info.sha256) &&
      Number.isSafeInteger(info.bytes) &&
      info.bytes > 0 &&
      info.bytes <= VIDEO_POSTER_LIMITS.sourceBytes &&
      ['video/mp4', 'video/webm'].includes(info.mime) &&
      Number.isInteger(info.width) &&
      info.width > 0 &&
      info.width <= VIDEO_POSTER_LIMITS.width &&
      Number.isInteger(info.height) &&
      info.height > 0 &&
      info.height <= VIDEO_POSTER_LIMITS.height &&
      Number.isFinite(info.durationSeconds) &&
      info.durationSeconds > 0 &&
      info.durationSeconds <= VIDEO_POSTER_LIMITS.durationSeconds,
    'Playback range requires a bounded inspected video.',
  );
  required(
    Number.isFinite(range.startSeconds) &&
      Number.isFinite(range.endSeconds) &&
      range.startSeconds >= 0 &&
      range.startSeconds < range.endSeconds &&
      range.endSeconds <= info.durationSeconds,
    'Playback range must be finite and inside the complete original; times are never clamped.',
  );
  if (Object.hasOwn(range, 'retainsCompleteOriginal'))
    required(
      range.retainsCompleteOriginal === true,
      'Playback range must retain the complete original.',
    );
  return freezeMedia({
    startSeconds: range.startSeconds,
    endSeconds: range.endSeconds,
    retainsCompleteOriginal: true,
  });
}

function ownRows(source) {
  required(
    Array.isArray(source) &&
      Object.getPrototypeOf(source) === Array.prototype &&
      source.length > 0 &&
      source.length <= CREATOR_MEDIA_INTAKE_LIMITS.items,
    'Select between 1 and 100 image or video files.',
  );
  const descriptors = Object.getOwnPropertyDescriptors(source);
  required(
    Reflect.ownKeys(descriptors).length === source.length + 1,
    'Media intake requires a dense file list.',
  );
  return source.map((_, index) => {
    const row = descriptors[index];
    required(row?.enumerable && Object.hasOwn(row, 'value'), 'Media entries must be own values.');
    const value = row.value;
    required(
      value && Object.getPrototypeOf(value) === Object.prototype,
      'Media entries must be plain records.',
    );
    const fields = Object.getOwnPropertyDescriptors(value);
    required(
      Reflect.ownKeys(fields).length === 3 &&
        ['name', 'kind', 'blob'].every(
          (key) => fields[key]?.enumerable && Object.hasOwn(fields[key], 'value'),
        ),
      'Media entries need only name, kind and blob.',
    );
    const name = fields.name.value,
      kind = fields.kind.value;
    required(['image', 'video'].includes(kind), 'Media kind must be image or video.');
    let stem;
    try {
      stem = normalizeCreatorMediaStem(name);
    } catch (error) {
      return {
        index,
        name: typeof name === 'string' ? name : '',
        kind,
        error,
        errorCode: 'invalid-filename',
      };
    }
    try {
      const blob = ownCreatorBlob(
        fields.blob.value,
        kind === 'image' ? CREATOR_IMAGE_LIMITS.sourceBytes : VIDEO_POSTER_LIMITS.sourceBytes,
        kind === 'image' ? 'Picture' : 'Video',
      );
      return { index, name, stem, kind, blob };
    } catch (error) {
      return { index, name, stem, kind, error };
    }
  });
}

const issue = (code, error) =>
  freezeMedia({
    code,
    message: error instanceof Error ? error.message : String(error),
  });

function pairSuggestions(rows) {
  const groups = new Map();
  for (const row of rows) {
    if (!row.stem) continue;
    if (!groups.has(row.stem)) groups.set(row.stem, { images: [], videos: [] });
    groups.get(row.stem)[row.kind === 'image' ? 'images' : 'videos'].push(row);
  }
  const suggestions = new Map();
  for (const [stem, group] of groups) {
    const ambiguous =
      group.images.length > 0 &&
      group.videos.length > 0 &&
      (group.images.length > 1 || group.videos.length > 1);
    for (const row of [...group.images, ...group.videos]) {
      const candidates = [
        ...new Set(
          (row.kind === 'video' ? group.images : group.videos)
            .map((candidate) => candidate.sha256)
            .filter(Boolean),
        ),
      ].sort();
      suggestions.set(
        row.index,
        freezeMedia({
          stem,
          status: ambiguous ? 'ambiguous' : candidates.length === 1 ? 'suggested' : 'none',
          candidateAssetSha256s: candidates,
        }),
      );
    }
  }
  return suggestions;
}

async function validateCandidate(source, videoSha256, signal) {
  const asset = validateStillAsset(source.asset),
    capture = boundedJSON(source.capture, { maxBytes: 8192, maxNodes: 32, maxDepth: 3 });
  exactKeys(
    capture,
    [
      'sourceSha256',
      'requestedTime',
      'observedMediaTime',
      'playheadTime',
      'timingEvidence',
      'decodedFrame',
      'width',
      'height',
      'mime',
      'sha256',
    ],
    'captured poster evidence',
  );
  required(
    capture.sourceSha256 === videoSha256 &&
      capture.sha256 === asset.sha256 &&
      capture.mime === asset.mime &&
      capture.width === asset.width &&
      capture.height === asset.height,
    'Captured poster differs from its inspected video or encoded asset.',
  );
  let bytes;
  try {
    bytes = nativeSize.call(source.blob);
  } catch {
    throw fail('Captured poster needs exact native PNG bytes.');
  }
  const blob = Blob.prototype.slice.call(source.blob, 0, bytes, 'image/png');
  required(
    bytes === asset.bytes && (await creatorSHA256(await blob.arrayBuffer())) === asset.sha256,
    'Captured poster bytes differ from its asset record.',
  );
  creatorAbort(signal);
  return { asset, capture, blob };
}

function storyDependency(video, poster, segment) {
  return {
    video,
    poster,
    playbackRange: segment,
  };
}

export function validateCreatorMediaDependencies(source) {
  const value = boundedJSON(source, {
    maxBytes: 2 * 1024 * 1024,
    maxNodes: 10000,
    maxDepth: 12,
    maxArray: 512,
    maxString: 2048,
  });
  exactKeys(value, ['format', 'stories'], 'creator media dependencies');
  required(
    value.format === CREATOR_MEDIA_DEPENDENCIES_FORMAT &&
      Array.isArray(value.stories) &&
      value.stories.length <= CREATOR_MEDIA_INTAKE_LIMITS.items,
    'Unsupported creator media dependency manifest.',
  );
  const videos = new Set();
  for (const entry of value.stories) {
    exactKeys(entry, ['video', 'poster', 'playbackRange'], 'creator story dependency');
    exactKeys(
      entry.video,
      ['sha256', 'bytes', 'mime', 'width', 'height', 'durationSeconds'],
      'creator story video',
    );
    const range = validateCreatorPlaybackRange(entry.video, entry.playbackRange);
    required(!videos.has(entry.video.sha256), 'Duplicate creator story video dependency.');
    videos.add(entry.video.sha256);
    exactKeys(
      entry.poster,
      [
        'sha256',
        'bytes',
        'mime',
        'width',
        'height',
        'origin',
        ...(entry.poster.origin?.kind === 'captured-frame' ? ['capture'] : []),
      ],
      'creator story poster',
    );
    required(
      hashValid(entry.poster.sha256) &&
        Number.isSafeInteger(entry.poster.bytes) &&
        entry.poster.bytes > 0 &&
        entry.poster.bytes <= CREATOR_IMAGE_LIMITS.sourceBytes &&
        entry.poster.mime === 'image/png' &&
        Number.isInteger(entry.poster.width) &&
        entry.poster.width > 0 &&
        entry.poster.width <= VIDEO_POSTER_LIMITS.width &&
        Number.isInteger(entry.poster.height) &&
        entry.poster.height > 0 &&
        entry.poster.height <= VIDEO_POSTER_LIMITS.height,
      'Invalid creator story poster dependency.',
    );
    exactKeys(
      entry.poster.origin,
      entry.poster.origin.kind === 'supplied-image' ? ['kind', 'sourceImageSha256'] : ['kind'],
      'creator story poster origin',
    );
    if (entry.poster.origin.kind === 'supplied-image')
      required(
        hashValid(entry.poster.origin.sourceImageSha256),
        'Invalid supplied poster identity.',
      );
    else {
      required(entry.poster.origin.kind === 'captured-frame', 'Invalid creator poster origin.');
      exactKeys(
        entry.poster.capture,
        ['requestedTime', 'observedMediaTime', 'playheadTime', 'timingEvidence', 'decodedFrame'],
        'creator poster capture',
      );
      required(
        Number.isFinite(entry.poster.capture.requestedTime) &&
          entry.poster.capture.requestedTime >= 0 &&
          entry.poster.capture.requestedTime <= entry.video.durationSeconds &&
          Number.isFinite(entry.poster.capture.playheadTime) &&
          entry.poster.capture.playheadTime >= 0 &&
          entry.poster.capture.playheadTime <= entry.video.durationSeconds &&
          ['presented-frame', 'playhead-estimate'].includes(entry.poster.capture.timingEvidence) &&
          (entry.poster.capture.timingEvidence === 'presented-frame'
            ? Number.isFinite(entry.poster.capture.observedMediaTime) &&
              entry.poster.capture.observedMediaTime >= 0 &&
              entry.poster.capture.observedMediaTime <= entry.video.durationSeconds &&
              entry.poster.capture.decodedFrame !== null
            : entry.poster.capture.observedMediaTime === null &&
              entry.poster.capture.decodedFrame === null),
        'Creator poster timestamps must stay inside the inspected video.',
      );
      if (entry.poster.capture.decodedFrame !== null) {
        exactKeys(
          entry.poster.capture.decodedFrame,
          ['width', 'height'],
          'creator decoded poster frame',
        );
        required(
          Number.isInteger(entry.poster.capture.decodedFrame.width) &&
            entry.poster.capture.decodedFrame.width > 0 &&
            Number.isInteger(entry.poster.capture.decodedFrame.height) &&
            entry.poster.capture.decodedFrame.height > 0,
          'Creator decoded poster frame needs bounded dimensions.',
        );
      }
    }
    required(
      range.retainsCompleteOriginal,
      'Creator playback never trims the original dependency.',
    );
  }
  return freezeMedia(value);
}

/** Inspect and prepare one full-size item at a time. Recoverable file failures are
 * attached to their intake row. Cancellation rejects the whole operation, disposes
 * the active decoder, and never starts the next item. */
export async function prepareCreatorMediaIntake(
  source,
  {
    signal,
    inspectVideo = openVideoPosterSource,
    prepareImage = prepareCreatorImage,
    pairingFor,
    posterTimeFor = ({ video }) => video.durationSeconds * 0.5,
    playbackRangeFor = ({ video }) => ({
      startSeconds: 0,
      endSeconds: video.durationSeconds,
    }),
    preserveOrder = false,
  } = {},
) {
  creatorAbort(signal);
  const rows = ownRows(source),
    assets = new Map();
  for (const row of rows) {
    creatorAbort(signal);
    if (row.error) continue;
    try {
      const bytes = await row.blob.arrayBuffer();
      creatorAbort(signal);
      row.sha256 = await creatorSHA256(bytes);
      creatorAbort(signal);
      row.bytes = row.blob.size;
    } catch (error) {
      if (abortError(error) || signal?.aborted) throw error;
      row.error = error;
    }
  }
  const suggestions = pairSuggestions(rows),
    imageByHash = new Map(),
    orderedRows = [...rows].sort((a, b) => natural.compare(a.name, b.name) || a.index - b.index);

  for (const row of orderedRows.filter((item) => item.kind === 'image')) {
    creatorAbort(signal);
    if (row.error) continue;
    try {
      const prepared = await prepareImage(
        row.blob,
        { alt: `Creator poster from ${row.stem}`, fit: 'contain' },
        { signal },
      );
      creatorAbort(signal);
      required(
        prepared.original.sha256 === row.sha256 && prepared.runtime?.sha256,
        'Prepared picture differs from the selected original.',
      );
      required(
        (await creatorSHA256(await prepared.runtime.blob.arrayBuffer())) ===
          prepared.runtime.sha256,
        'Prepared poster bytes differ from their asset identity.',
      );
      creatorAbort(signal);
      const poster = freezeMedia({
        sha256: prepared.runtime.sha256,
        bytes: prepared.runtime.blob.size,
        mime: 'image/png',
        width: prepared.asset.width,
        height: prepared.asset.height,
        origin: { kind: 'supplied-image', sourceImageSha256: row.sha256 },
      });
      imageByHash.set(row.sha256, poster);
      // The reviewed PNG is the only image shared in an .rlpack. Keep the
      // selected source bytes separately so a private creator checkpoint can
      // reopen the exact media choices without widening the portable pack.
      assets.set(row.sha256, {
        sha256: row.sha256,
        role: 'source-image-original',
        blob: Blob.prototype.slice.call(
          row.blob,
          0,
          row.blob.size,
          prepared.original.mime || row.blob.type,
        ),
      });
      assets.set(poster.sha256, {
        sha256: poster.sha256,
        role: 'poster',
        blob: prepared.runtime.blob,
      });
    } catch (error) {
      if (abortError(error) || signal?.aborted) throw error;
      row.error = error;
    }
  }

  const stories = [],
    videoDetails = new Map(),
    resolvedVideoPairings = new Set();
  for (const row of orderedRows.filter((item) => item.kind === 'video')) {
    creatorAbort(signal);
    if (row.error) continue;
    let opened,
      errorCode = 'video-inspection-failed';
    try {
      opened = await inspectVideo(row.blob, { signal });
      creatorAbort(signal);
      required(
        opened.info.sha256 === row.sha256 && opened.info.bytes === row.bytes,
        'Inspected video differs from the selected original.',
      );
      const video = freezeMedia({ ...opened.info });
      errorCode = 'invalid-playback-range';
      const playbackRange = validateCreatorPlaybackRange(
          video,
          playbackRangeFor({ video, assetSha256: row.sha256 }),
        ),
        suggestion = suggestions.get(row.index),
        posterCandidates = [];
      let poster = null;
      errorCode = 'invalid-poster-choice';
      const pairingChoice = pairingFor?.({
        video,
        assetSha256: row.sha256,
        suggestion,
        imageAssetSha256s: Object.freeze([...imageByHash.keys()].sort()),
      });
      required(
        pairingChoice === undefined ||
          pairingChoice === null ||
          (typeof pairingChoice === 'string' && hashValid(pairingChoice)),
        'Poster pairing choice must be an exact image hash, frame capture, or automatic.',
      );
      if (pairingChoice !== undefined) resolvedVideoPairings.add(row.index);
      if (suggestion?.status === 'ambiguous' && pairingChoice === undefined)
        throw Object.assign(
          fail('Multiple files share this name. Choose the exact poster/video pairing.'),
          { creatorCode: 'ambiguous-pairing' },
        );
      const pairedImageSha256 =
        pairingChoice === undefined
          ? suggestion?.status === 'suggested'
            ? suggestion.candidateAssetSha256s[0]
            : null
          : pairingChoice;
      if (pairedImageSha256) {
        poster = imageByHash.get(pairedImageSha256);
        if (!poster)
          throw Object.assign(
            fail('The selected poster could not be prepared. Choose or restore its original.'),
            { creatorCode: 'missing-poster-original' },
          );
      } else {
        errorCode = 'poster-capture-failed';
        const selectedTime = posterTimeFor({
          video,
          assetSha256: row.sha256,
          suggestion,
        });
        required(
          Number.isFinite(selectedTime) &&
            selectedTime >= 0 &&
            selectedTime <= video.durationSeconds,
          'Poster capture time must be finite and inside the inspected video.',
        );
        const captureTimes = [
          ...new Set(
            [0.1, 0.5, 0.9].map((ratio) => video.durationSeconds * ratio).concat(selectedTime),
          ),
        ].sort((a, b) => a - b);
        for (const requestedTime of captureTimes) {
          creatorAbort(signal);
          const captured = await validateCandidate(
            await opened.capture(
              requestedTime,
              {
                id: `creator-video-${video.sha256.slice(0, 16)}-${Math.round(requestedTime * 1000)}`,
                provenance: {
                  kind: 'user-supplied',
                  credit: 'Creator supplied video',
                  source: `Frame captured at requested ${requestedTime} seconds`,
                },
              },
              { signal },
            ),
            video.sha256,
            signal,
          );
          creatorAbort(signal);
          const candidate = freezeMedia({
            sha256: captured.asset.sha256,
            bytes: captured.asset.bytes,
            mime: captured.asset.mime,
            width: captured.asset.width,
            height: captured.asset.height,
            origin: { kind: 'captured-frame' },
            capture: {
              requestedTime: captured.capture.requestedTime,
              observedMediaTime: captured.capture.observedMediaTime,
              playheadTime: captured.capture.playheadTime,
              timingEvidence: captured.capture.timingEvidence,
              decodedFrame: captured.capture.decodedFrame,
            },
          });
          posterCandidates.push(candidate);
          assets.set(candidate.sha256, {
            sha256: candidate.sha256,
            role: 'poster-alternative',
            blob: captured.blob,
          });
        }
        poster = posterCandidates.find(
          (candidate) => candidate.capture.requestedTime === selectedTime,
        );
        required(poster, 'The selected poster frame was not captured.');
        const selected = assets.get(poster.sha256);
        assets.set(poster.sha256, { ...selected, role: 'poster' });
      }
      assets.set(video.sha256, {
        sha256: video.sha256,
        role: 'victory-video-original',
        blob: Blob.prototype.slice.call(row.blob, 0, row.blob.size, video.mime),
      });
      const dependency = storyDependency(video, poster, playbackRange);
      stories.push(dependency);
      videoDetails.set(
        row.index,
        freezeMedia({
          video,
          playbackRange,
          posterCandidates,
          selectedPosterSha256: poster.sha256,
          selectedPairingAssetSha256: pairedImageSha256,
        }),
      );
    } catch (error) {
      if (abortError(error) || signal?.aborted) throw error;
      row.error = error;
      row.errorCode = error.creatorCode ?? errorCode;
    } finally {
      opened?.dispose();
    }
  }

  const manifest = validateCreatorMediaDependencies({
      format: CREATOR_MEDIA_DEPENDENCIES_FORMAT,
      stories,
    }),
    items = rows.map((row) => {
      const pairing = suggestions.get(row.index) ?? null,
        errors = [];
      const ambiguityResolved =
        pairing?.status === 'ambiguous' &&
        rows
          .filter((candidate) => candidate.kind === 'video' && candidate.stem === row.stem)
          .every((candidate) => resolvedVideoPairings.has(candidate.index));
      if (pairing?.status === 'ambiguous' && !ambiguityResolved)
        errors.push(
          issue(
            'ambiguous-pairing',
            fail('Multiple files share this name. Choose the exact poster/video pairing.'),
          ),
        );
      if (row.error && row.error.creatorCode !== 'ambiguous-pairing')
        errors.push(
          issue(
            row.error.creatorCode ??
              row.errorCode ??
              (row.blob
                ? row.kind === 'video'
                  ? 'video-inspection-failed'
                  : 'image-preparation-failed'
                : 'missing-original'),
            row.error,
          ),
        );
      return freezeMedia({
        index: row.index,
        name: row.name,
        kind: row.kind,
        normalizedStem: row.stem ?? null,
        assetSha256: row.sha256 ?? null,
        ...(row.kind === 'image'
          ? { poster: row.sha256 ? (imageByHash.get(row.sha256) ?? null) : null }
          : {}),
        pairing,
        video: videoDetails.get(row.index) ?? null,
        errors,
      });
    });
  if (!preserveOrder) items.sort((a, b) => natural.compare(a.name, b.name) || a.index - b.index);
  return Object.freeze({
    format: 'revealline-creator-media-intake.v1',
    items: Object.freeze(items),
    dependencies: manifest,
    assets: Object.freeze(
      [...assets.values()]
        .sort((a, b) => a.sha256.localeCompare(b.sha256))
        .map((asset) => Object.freeze(asset)),
    ),
  });
}
