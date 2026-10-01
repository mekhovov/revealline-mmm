import { boundedJSON, canonicalJSON, exactKeys, required } from '../data-json.mjs';
import { MANAGED_MEDIA_LIMITS } from '../managed-media-store.mjs';
import { prepareStillAsset } from '../media-still.mjs';
import { openVideoPosterSource, VIDEO_POSTER_LIMITS } from '../video-poster.mjs';
import { creatorAbort, creatorSHA256, ownCreatorBlob } from './bytes.mjs';
import {
  CREATOR_TEAM_PORTABLE_FORMAT,
  CREATOR_TEAM_PORTABLE_MIME,
  exportCreatorTeamCampaign,
  importCreatorTeamCampaign,
} from './team.mjs';

export const CREATOR_TEAM_MEDIA_FORMAT = 'revealline-creator-team-media.v1';
export const CREATOR_TEAM_MEDIA_MIME = 'application/vnd.revealline.team-media';
export const CREATOR_TEAM_MEDIA_LIMITS = Object.freeze({
  bytes: MANAGED_MEDIA_LIMITS.bytes,
  manifestBytes: MANAGED_MEDIA_LIMITS.metadataBytes,
  imageBytes: 4 * 1024 * 1024,
  videoBytes: MANAGED_MEDIA_LIMITS.sourceBytes,
  assets: 512,
  width: 1152,
  height: 576,
});

const MAGIC = new TextEncoder().encode('RLTMC1\r\n');
const preparedMedia = new WeakSet();
const ownedMedia = new WeakMap();
const digest = (value) => typeof value === 'string' && /^[a-f0-9]{64}$/.test(value);
const text = (value, maximum) =>
  typeof value === 'string' && value.trim().length > 0 && value.length <= maximum;

const copy = (value) =>
  boundedJSON(value, {
    maxBytes: CREATOR_TEAM_MEDIA_LIMITS.manifestBytes,
    maxNodes: 100000,
    maxDepth: 24,
    maxArray: 4096,
    maxString: 8192,
  });

function ownAssets(source) {
  required(
    Array.isArray(source) &&
      Object.getPrototypeOf(source) === Array.prototype &&
      source.length <= CREATOR_TEAM_MEDIA_LIMITS.assets,
    'Invalid Team media asset table.',
  );
  const descriptors = Object.getOwnPropertyDescriptors(source);
  required(
    Reflect.ownKeys(descriptors).length === source.length + 1,
    'Team media asset table must be dense.',
  );
  const result = new Map();
  for (let index = 0; index < source.length; index++) {
    const row = descriptors[index];
    required(row?.enumerable && Object.hasOwn(row, 'value'), 'Invalid Team media asset entry.');
    const fields = Object.getOwnPropertyDescriptors(row.value);
    required(
      Reflect.ownKeys(fields).length === 2 &&
        ['sha256', 'blob'].every(
          (key) => fields[key]?.enumerable && Object.hasOwn(fields[key], 'value'),
        ),
      'Team media assets need an owned hash and Blob.',
    );
    const sha256 = fields.sha256.value;
    required(digest(sha256) && !result.has(sha256), 'Invalid or duplicate Team media hash.');
    result.set(
      sha256,
      ownCreatorBlob(fields.blob.value, CREATOR_TEAM_MEDIA_LIMITS.videoBytes, 'Team media asset'),
    );
  }
  return result;
}

function bindings(source, pack) {
  const rows = copy(source);
  required(
    Array.isArray(rows) && rows.length === pack.levels.length,
    'Every Team level needs exactly one media binding.',
  );
  const levelIds = new Set(pack.levels.map((level) => level.id));
  const seen = new Set();
  for (const row of rows) {
    exactKeys(
      row,
      ['levelId', 'pictureSha256', ...(Object.hasOwn(row, 'story') ? ['story'] : [])],
      'Team media binding',
    );
    required(
      levelIds.has(row.levelId) && !seen.has(row.levelId) && digest(row.pictureSha256),
      'Team media binding has an invalid, duplicate or foreign level.',
    );
    seen.add(row.levelId);
    if (Object.hasOwn(row, 'story')) {
      exactKeys(
        row.story,
        ['videoSha256', 'startSeconds', 'endSeconds', 'description'],
        'Team victory story',
      );
      required(
        digest(row.story.videoSha256) &&
          Number.isFinite(row.story.startSeconds) &&
          row.story.startSeconds >= 0 &&
          Number.isFinite(row.story.endSeconds) &&
          row.story.endSeconds > row.story.startSeconds &&
          text(row.story.description, 512),
        'Invalid Team victory story.',
      );
    }
  }
  return rows;
}

async function inspectPicture(blob, sha256, { signal, decodeImage }) {
  required(blob.size <= CREATOR_TEAM_MEDIA_LIMITS.imageBytes, 'Team picture exceeds 4 MiB.');
  const prepared = await prepareStillAsset(
    blob,
    {
      id: `team-picture-${sha256.slice(0, 16)}`,
      provenance: {
        kind: 'user-supplied',
        credit: 'Creator-reviewed Team media',
        source: 'Portable Team campaign',
      },
    },
    { signal, decodeImage },
  );
  required(
    prepared.asset.sha256 === sha256 &&
      prepared.asset.width === CREATOR_TEAM_MEDIA_LIMITS.width &&
      prepared.asset.height === CREATOR_TEAM_MEDIA_LIMITS.height,
    'Team pictures must be exact decoded 1152 × 576 PNG or JPEG originals.',
  );
  return Object.freeze({
    sha256,
    bytes: blob.size,
    mime: prepared.asset.mime,
    kind: 'picture',
    width: prepared.asset.width,
    height: prepared.asset.height,
  });
}

async function inspectVideoAsset(blob, sha256, { signal, inspectVideo }) {
  required(blob.size <= CREATOR_TEAM_MEDIA_LIMITS.videoBytes, 'Team victory video exceeds 64 MiB.');
  const inspected = await inspectVideo(blob, { signal });
  try {
    const info = inspected?.info;
    required(
      info &&
        info.sha256 === sha256 &&
        info.bytes === blob.size &&
        ['video/mp4', 'video/webm'].includes(info.mime) &&
        Number.isSafeInteger(info.width) &&
        info.width > 0 &&
        info.width <= VIDEO_POSTER_LIMITS.width &&
        Number.isSafeInteger(info.height) &&
        info.height > 0 &&
        info.height <= VIDEO_POSTER_LIMITS.height &&
        Number.isFinite(info.durationSeconds) &&
        info.durationSeconds > 0 &&
        info.durationSeconds <= VIDEO_POSTER_LIMITS.durationSeconds,
      'Team victory video differs from its complete inspected original.',
    );
    return Object.freeze({
      sha256,
      bytes: blob.size,
      mime: info.mime,
      kind: 'victory-video-original',
      width: info.width,
      height: info.height,
      durationSeconds: info.durationSeconds,
    });
  } finally {
    inspected?.dispose?.();
  }
}

function gameplayDocument(prepared) {
  const portable = exportCreatorTeamCampaign(prepared);
  required(
    portable.type === CREATOR_TEAM_PORTABLE_MIME,
    'Prepare this exact Team campaign before adding media.',
  );
  return portable.text().then((value) => {
    const document = copy(value);
    required(document.format === CREATOR_TEAM_PORTABLE_FORMAT, 'Invalid Team gameplay payload.');
    return document;
  });
}

/** Build one exact dependency closure around an already replay-qualified Team
 * campaign. Every level owns a picture; stories are optional and never affect
 * gameplay evidence. Unreferenced browser-library media is rejected. */
export async function prepareCreatorTeamMediaCampaign(
  prepared,
  bindingSource,
  assetSource,
  { signal, decodeImage, inspectVideo = openVideoPosterSource, credits: creditSource } = {},
) {
  creatorAbort(signal);
  const gameplay = await gameplayDocument(prepared);
  creatorAbort(signal);
  const credits = copy(creditSource);
  exactKeys(credits, ['creator', 'media', 'license'], 'Team media credits');
  required(
    Object.values(credits).every((value) => text(value, 512)),
    'Review Team creator, media credit and sharing permission.',
  );
  const rows = bindings(bindingSource, gameplay.pack),
    assets = ownAssets(assetSource),
    expected = new Map();
  for (const row of rows) {
    const currentPicture = expected.get(row.pictureSha256);
    required(
      !currentPicture || currentPicture === 'picture',
      'One Team media hash cannot identify both picture and video bytes.',
    );
    expected.set(row.pictureSha256, 'picture');
    if (row.story) {
      const currentVideo = expected.get(row.story.videoSha256);
      required(
        !currentVideo || currentVideo === 'victory-video-original',
        'One Team media hash cannot identify both picture and video bytes.',
      );
      expected.set(row.story.videoSha256, 'victory-video-original');
    }
  }
  required(
    assets.size === expected.size && [...assets.keys()].every((hash) => expected.has(hash)),
    'Team media payload must contain exactly the selected campaign dependencies.',
  );
  const inventory = [];
  for (const [sha256, kind] of [...expected].sort(([a], [b]) => a.localeCompare(b))) {
    creatorAbort(signal);
    const blob = assets.get(sha256);
    inventory.push(
      kind === 'picture'
        ? await inspectPicture(blob, sha256, { signal, decodeImage })
        : await inspectVideoAsset(blob, sha256, { signal, inspectVideo }),
    );
  }
  const facts = new Map(inventory.map((row) => [row.sha256, row]));
  for (const row of rows)
    if (row.story)
      required(
        row.story.endSeconds <= facts.get(row.story.videoSha256).durationSeconds,
        `Team victory story for ${row.levelId} exceeds its inspected video duration.`,
      );
  const manifest = Object.freeze({
    format: CREATOR_TEAM_MEDIA_FORMAT,
    gameplay,
    credits: Object.freeze(credits),
    bindings: Object.freeze(rows),
    assets: Object.freeze(inventory),
  });
  const manifestBytes = new TextEncoder().encode(canonicalJSON(manifest));
  required(
    manifestBytes.byteLength <= CREATOR_TEAM_MEDIA_LIMITS.manifestBytes,
    'Team media manifest exceeds 2 MiB.',
  );
  const orderedAssets = Object.freeze(
    inventory.map((row) => Object.freeze({ sha256: row.sha256, blob: assets.get(row.sha256) })),
  );
  const bytes =
    12 + manifestBytes.byteLength + orderedAssets.reduce((sum, row) => sum + row.blob.size, 0);
  required(bytes <= CREATOR_TEAM_MEDIA_LIMITS.bytes, 'Team media campaign exceeds 256 MiB.');
  const result = Object.freeze({
    manifest,
    assets: orderedAssets,
    bytes,
    gameplay: prepared,
    pack: prepared.pack,
    provenance: prepared.provenance,
    evidence: prepared.evidence,
  });
  preparedMedia.add(result);
  ownedMedia.set(result, {
    assets: new Map(orderedAssets.map((row) => [row.sha256, row.blob])),
    resolved: new Map(),
  });
  return result;
}

export function exportCreatorTeamMediaCampaign(prepared) {
  required(preparedMedia.has(prepared), 'Prepare this exact Team media campaign before export.');
  const manifest = new TextEncoder().encode(canonicalJSON(prepared.manifest));
  const header = new Uint8Array(12);
  header.set(MAGIC);
  new DataView(header.buffer).setUint32(8, manifest.byteLength, false);
  return new Blob([header, manifest, ...prepared.assets.map((asset) => asset.blob)], {
    type: CREATOR_TEAM_MEDIA_MIME,
  });
}

export const isPreparedCreatorTeamMediaCampaign = (value) => preparedMedia.has(value);

export function isCreatorTeamMediaCampaign(source) {
  if (
    !(source instanceof Blob) ||
    source.size < 12 ||
    source.size > CREATOR_TEAM_MEDIA_LIMITS.bytes
  )
    return false;
  return source.type === CREATOR_TEAM_MEDIA_MIME;
}

export async function importCreatorTeamMediaCampaign(
  source,
  { signal, decodeImage, inspectVideo = openVideoPosterSource } = {},
) {
  creatorAbort(signal);
  const blob = ownCreatorBlob(source, CREATOR_TEAM_MEDIA_LIMITS.bytes, 'Team media campaign');
  required(blob.size >= 12, 'Truncated Team media campaign header.');
  const header = new Uint8Array(await blob.slice(0, 12).arrayBuffer());
  creatorAbort(signal);
  required(
    MAGIC.every((byte, index) => header[index] === byte),
    'Unsupported Team media campaign.',
  );
  const length = new DataView(header.buffer).getUint32(8, false);
  required(
    length > 0 && length <= CREATOR_TEAM_MEDIA_LIMITS.manifestBytes && 12 + length <= blob.size,
    'Invalid Team media manifest length.',
  );
  const manifest = copy(
    new TextDecoder('utf-8', { fatal: true }).decode(
      await blob.slice(12, 12 + length).arrayBuffer(),
    ),
  );
  exactKeys(
    manifest,
    ['format', 'gameplay', 'credits', 'bindings', 'assets'],
    'Team media campaign',
  );
  required(manifest.format === CREATOR_TEAM_MEDIA_FORMAT, 'Unsupported Team media format.');
  const gameplayBlob = new Blob([canonicalJSON(manifest.gameplay)], {
    type: CREATOR_TEAM_PORTABLE_MIME,
  });
  const gameplay = await importCreatorTeamCampaign(gameplayBlob, { signal });
  const inventory = copy(manifest.assets);
  required(
    Array.isArray(inventory) && inventory.length <= CREATOR_TEAM_MEDIA_LIMITS.assets,
    'Invalid Team media inventory.',
  );
  let offset = 12 + length,
    last = '';
  const assets = [];
  for (const row of inventory) {
    const names =
      row.kind === 'picture'
        ? ['sha256', 'bytes', 'mime', 'kind', 'width', 'height']
        : ['sha256', 'bytes', 'mime', 'kind', 'width', 'height', 'durationSeconds'];
    exactKeys(row, names, 'Team media inventory entry');
    required(
      digest(row.sha256) &&
        row.sha256 > last &&
        Number.isSafeInteger(row.bytes) &&
        row.bytes > 0 &&
        offset + row.bytes <= blob.size,
      'Invalid, unordered or truncated Team media inventory.',
    );
    const asset = blob.slice(offset, offset + row.bytes, row.mime);
    required(
      (await creatorSHA256(await asset.arrayBuffer())) === row.sha256,
      'Team media payload differs from its SHA-256 inventory.',
    );
    assets.push({ sha256: row.sha256, blob: asset });
    offset += row.bytes;
    last = row.sha256;
  }
  required(offset === blob.size, 'Team media campaign has trailing or missing payload bytes.');
  const prepared = await prepareCreatorTeamMediaCampaign(gameplay, manifest.bindings, assets, {
    signal,
    decodeImage,
    inspectVideo,
    credits: manifest.credits,
  });
  required(
    canonicalJSON(prepared.manifest) === canonicalJSON(manifest),
    'Team media manifest differs from current verification.',
  );
  return prepared;
}

function mediaRecord(prepared) {
  required(preparedMedia.has(prepared), 'Choose a verified Team media campaign.');
  return ownedMedia.get(prepared);
}

export function creatorTeamMediaForLevel(prepared, levelId) {
  const level = prepared.pack.levels.find((candidate) => candidate.id === levelId);
  required(level, 'Choose a level from this Team media campaign.');
  const owner = mediaRecord(prepared),
    cached = owner.resolved.get(levelId);
  if (cached) return cached;
  const row = prepared.manifest.bindings.find((candidate) => candidate.levelId === levelId),
    facts = new Map(prepared.manifest.assets.map((asset) => [asset.sha256, asset])),
    blobs = owner.assets,
    picture = facts.get(row.pictureSha256);
  const resolved = Object.freeze({
    picture: Object.freeze({ descriptor: picture, blob: blobs.get(picture.sha256) }),
    story: row.story
      ? Object.freeze({
          descriptor: Object.freeze({
            ...row.story,
            video: facts.get(row.story.videoSha256),
          }),
          blob: blobs.get(row.story.videoSha256),
        })
      : null,
  });
  owner.resolved.set(levelId, resolved);
  return resolved;
}

/** Runtime picture lease for an already verified Team media owner. It reads no
 * global media catalogue and grants no reward; the host records a reward only
 * after its normal exact completion replay succeeds. */
export function createCreatorTeamMediaPictureLease(prepared, { decodeImage } = {}) {
  mediaRecord(prepared);
  required(typeof decodeImage === 'function', 'Team media playback needs an image decoder.');
  let closed = false,
    pending = null,
    accepted = null;
  const stop = () => new DOMException('Team media picture preparation cancelled.', 'AbortError');
  const release = (entry) => {
    try {
      entry?.lease?.release?.();
    } catch {}
  };
  async function select(request) {
    required(!closed && !pending, 'Wait for the current Team media picture operation.');
    required(
      request && canonicalJSON(request.pack) === canonicalJSON(prepared.pack),
      'Team media picture belongs to a different exact gameplay pack.',
    );
    const level = prepared.pack.levels.find((candidate) => candidate.id === request.levelId);
    required(level, 'Choose a level from this Team media campaign.');
    const controller = new AbortController(),
      abort = () => controller.abort(),
      operation = { controller, requestKey: canonicalJSON([request.pack, request.levelId]) };
    pending = operation;
    request.signal?.addEventListener('abort', abort, { once: true });
    if (request.signal?.aborted) controller.abort();
    let decoded = null;
    try {
      if (controller.signal.aborted) throw stop();
      request.onStatus?.({ stage: 'verifying', status: 'preparing', progress: null });
      const media = creatorTeamMediaForLevel(prepared, level.id),
        bytes = await media.picture.blob.arrayBuffer();
      if (closed || pending !== operation || controller.signal.aborted) throw stop();
      required(
        (await creatorSHA256(bytes)) === media.picture.descriptor.sha256,
        'Team media picture bytes changed after package verification.',
      );
      if (closed || pending !== operation || controller.signal.aborted) throw stop();
      request.onStatus?.({ stage: 'decoding', status: 'preparing', progress: null });
      decoded = await decodeImage(media.picture.blob, { signal: controller.signal });
      if (closed || pending !== operation || controller.signal.aborted) throw stop();
      required(
        decoded &&
          typeof decoded.release === 'function' &&
          (decoded.image?.naturalWidth ?? decoded.image?.width) ===
            CREATOR_TEAM_MEDIA_LIMITS.width &&
          (decoded.image?.naturalHeight ?? decoded.image?.height) ===
            CREATOR_TEAM_MEDIA_LIMITS.height,
        'Decoded Team media picture dimensions disagree.',
      );
      const descriptor = media.picture.descriptor,
        binding = Object.freeze({
          snapshot: null,
          image: decoded.image,
          choice: Object.freeze({
            kind: 'image',
            sourceKind: 'creator-team-media',
            picture: Object.freeze({
              sha256: descriptor.sha256,
              bytes: descriptor.bytes,
              mime: descriptor.mime,
              width: descriptor.width,
              height: descriptor.height,
            }),
          }),
          fit: 'contain',
          sampling: 'nearest',
        });
      const previous = accepted;
      accepted = { requestKey: operation.requestKey, binding, lease: decoded };
      decoded = null;
      release(previous);
      request.onStatus?.({ stage: 'ready', status: 'ready', progress: null });
      return binding;
    } finally {
      request.signal?.removeEventListener('abort', abort);
      release(decoded && { lease: decoded });
      if (pending === operation) pending = null;
    }
  }
  return Object.freeze({
    select,
    confirm(request) {
      required(!closed && !pending && accepted, 'Prepare the exact Team media picture first.');
      required(
        accepted.requestKey === canonicalJSON([request.pack, request.levelId]),
        'Team media picture confirmation differs from its preparation.',
      );
      return accepted.binding;
    },
    dispose() {
      if (closed) return;
      closed = true;
      pending?.controller.abort();
      release(accepted);
      accepted = null;
    },
  });
}
