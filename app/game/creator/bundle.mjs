import { boundedJSON, canonicalJSON, exactKeys, required } from '../data-json.mjs';
import { validateTheme } from '../content.mjs';
import { compileContentProject } from '../content-design/project.mjs';
import { assetRevisionMime, loadPreviewArtwork } from '../content-design/assets.mjs';
import { freezeDesign } from '../content-design/catalogs.mjs';
import { prepareStillAsset } from '../media-still.mjs';
import { openVideoPosterSource, VIDEO_POSTER_LIMITS } from '../video-poster.mjs';
import { creatorAbort, creatorSHA256, ownCreatorBlob } from './bytes.mjs';
import { creatorStoryAssetFacts, validateCreatorStoryBindings } from './media-bundle.mjs';
import { validateCreatorProvenance, verifyCreatorRoutes } from './templates.mjs';
import { verifyCreatorVersusRoutes } from './versus.mjs';

export const CREATOR_BUNDLE_FORMAT = 'revealline-content-bundle.v1';
export const CREATOR_BUNDLE_LIMITS = Object.freeze({
  imageBytes: 24 * 1024 * 1024,
  bytes: 256 * 1024 * 1024,
  manifestBytes: 2 * 1024 * 1024,
});
export const CREATOR_COMPATIBILITY = freezeDesign({
  format: 'revealline-creator-runtime.v1',
  modes: ['solo'],
  gameplayPolicy: 'compiled-preset-v1',
});
export const CREATOR_VIDEO_COMPATIBILITY = freezeDesign({
  format: 'revealline-creator-runtime.v2',
  modes: ['solo'],
  gameplayPolicy: 'compiled-preset-v1',
  victoryStories: 'revealline-creator-story-bindings.v1',
});
export const CREATOR_VERSUS_COMPATIBILITY = freezeDesign({
  format: 'revealline-creator-runtime.v2',
  modes: ['solo', 'versus'],
  gameplayPolicy: 'compiled-preset-v1',
});
export const CREATOR_VIDEO_VERSUS_COMPATIBILITY = freezeDesign({
  format: 'revealline-creator-runtime.v3',
  modes: ['solo', 'versus'],
  gameplayPolicy: 'compiled-preset-v1',
  victoryStories: 'revealline-creator-story-bindings.v1',
});
const MAGIC = new TextEncoder().encode('RLCNB1\r\n');
const preparations = new WeakSet(),
  approvals = new WeakMap();
const hashValid = (value) => typeof value === 'string' && /^[a-f0-9]{64}$/.test(value);
const copy = (value) =>
  boundedJSON(value, {
    maxBytes: CREATOR_BUNDLE_LIMITS.manifestBytes,
    maxNodes: 100000,
    maxDepth: 26,
    maxArray: 4096,
  });

function authoredMissionIds(project, pack) {
  const campaigns = new Map(project.campaigns.map((campaign) => [campaign.id, campaign]));
  return pack.campaignIds.flatMap((campaignId) => {
    const campaign = campaigns.get(campaignId);
    required(campaign, 'The selected pack references a missing campaign.');
    return campaign.missionIds;
  });
}

function scopedProvenance(source, missionIds) {
  const values = Array.isArray(source) ? source : [source];
  required(
    values.length === missionIds.length,
    'Provide one generation record for every included mission.',
  );
  const byMission = new Map();
  for (const entry of values) {
    const provenance = validateCreatorProvenance(entry);
    required(
      missionIds.includes(provenance.missionId) && !byMission.has(provenance.missionId),
      'Generation evidence is missing, duplicated or belongs to another mission.',
    );
    byMission.set(provenance.missionId, provenance);
  }
  const ordered = missionIds.map((missionId) => byMission.get(missionId));
  return ordered.length === 1 ? ordered[0] : ordered;
}

const knownCompatibility = (value) =>
  [
    CREATOR_COMPATIBILITY,
    CREATOR_VIDEO_COMPATIBILITY,
    CREATOR_VERSUS_COMPATIBILITY,
    CREATOR_VIDEO_VERSUS_COMPATIBILITY,
  ].some((candidate) => canonicalJSON(value) === canonicalJSON(candidate));

const creatorCompatibility = ({ media, versus }) =>
  media
    ? versus
      ? CREATOR_VIDEO_VERSUS_COMPATIBILITY
      : CREATOR_VIDEO_COMPATIBILITY
    : versus
      ? CREATOR_VERSUS_COMPATIBILITY
      : CREATOR_COMPATIBILITY;

/** Export scope is determined from the selected pack, never from the browser's
 * media inventory. Campaign and mission order follow the authored pack graph. */
function scopedContent(source) {
  const input = copy(source);
  exactKeys(
    input,
    [
      'project',
      'packId',
      'themes',
      'provenance',
      'credits',
      ...(Object.hasOwn(input, 'media') ? ['media'] : []),
    ],
    'creator content',
  );
  const compiled = compileContentProject(input.project),
    project = structuredClone(compiled.source);
  const pack = project.packs.find((p) => p.id === input.packId);
  required(pack, 'Select a pack from this project.');
  project.packs = [pack];
  project.campaigns = project.campaigns.filter((c) => pack.campaignIds.includes(c.id));
  required(
    project.campaigns.length === pack.campaignIds.length,
    'The selected pack has a missing or duplicate campaign.',
  );
  const missionIds = authoredMissionIds(project, pack);
  const ids = new Set(missionIds);
  required(
    missionIds.length >= 1 && missionIds.length <= 50 && ids.size === missionIds.length,
    'A creator pack needs 1 to 50 missions assigned once in authored order.',
  );
  project.missions = project.missions.filter((m) => ids.has(m.id));
  required(
    project.missions.length === missionIds.length,
    'The selected pack has a missing or duplicate mission.',
  );
  project.maps = project.maps.filter((map) =>
    project.missions.some((m) => m.map.id === map.id && m.map.revision === map.revision),
  );
  const provenance = scopedProvenance(input.provenance, missionIds);
  const provenances = Array.isArray(provenance) ? provenance : [provenance];
  const solo = project.missions.every(
    (mission) => mission.modes.length === 1 && mission.modes[0] === 'solo',
  );
  const versus = project.missions.every(
    (mission) =>
      mission.modes.length === 2 && mission.modes[0] === 'solo' && mission.modes[1] === 'versus',
  );
  required(solo || versus, 'Creator missions must declare one consistent supported mode set.');
  required(
    !versus || provenances.every((entry) => entry.templateVersion === 'creator-layouts.v3'),
    'Only qualified creator-layouts.v3 missions support Versus.',
  );
  const wantedAssets = new Set(
    project.missions.map((mission) => mission.presentation.backgroundAssetId),
  );
  project.assets = (project.assets ?? []).filter((asset) => wantedAssets.has(asset.id));
  required(
    project.assets.length === wantedAssets.size && project.assets.length <= 50,
    'Attach every reveal picture before reviewing this campaign.',
  );
  required(Array.isArray(input.themes), 'Provide the selected presentation theme.');
  const wantedThemes = new Set(project.missions.map((mission) => mission.presentation.themeId));
  const themes = input.themes.filter((theme) => wantedThemes.has(theme.id));
  required(
    themes.length === wantedThemes.size && themes.every((theme) => validateTheme(theme).valid),
    'Every mission needs one valid presentation theme.',
  );
  exactKeys(input.credits, ['creator', 'picture', 'license'], 'creator credits');
  required(
    Object.values(input.credits).length === 3 &&
      Object.values(input.credits).every(
        (v) => typeof v === 'string' && v.trim() && v.length <= 512,
      ),
    'Review creator, picture credit and sharing permission.',
  );
  const media = Object.hasOwn(input, 'media')
    ? validateCreatorStoryBindings(input.media, { project })
    : null;
  return freezeDesign({
    project: compileContentProject(project).source,
    packId: pack.id,
    themes,
    provenance,
    credits: input.credits,
    ...(media ? { media } : {}),
    compatibility: creatorCompatibility({ media, versus }),
  });
}

function provenanceEntries(content) {
  return Array.isArray(content.provenance) ? content.provenance : [content.provenance];
}

function evidenceEntries(content, evidence) {
  const provenances = provenanceEntries(content);
  if (provenances.length === 1) {
    required(
      Array.isArray(evidence) && evidence.length === 6,
      'Manifest needs completion evidence for all supported configurations.',
    );
    return [{ missionId: provenances[0].missionId, routes: evidence }];
  }
  required(
    Array.isArray(evidence) && evidence.length === provenances.length,
    'Manifest needs one completion evidence entry for every mission.',
  );
  return evidence.map((entry, index) => {
    exactKeys(entry, ['missionId', 'routes'], 'mission completion evidence');
    required(
      entry.missionId === provenances[index].missionId &&
        Array.isArray(entry.routes) &&
        entry.routes.length === 6 &&
        entry.routes.every((route) => route?.missionId === entry.missionId),
      'Mission completion evidence differs from authored mission order.',
    );
    return entry;
  });
}
function scopedAssets(source, wanted) {
  required(
    Array.isArray(source) &&
      Object.getPrototypeOf(source) === Array.prototype &&
      source.length <= 512,
    'Invalid creator asset table.',
  );
  const found = new Map();
  const descriptors = Object.getOwnPropertyDescriptors(source);
  required(
    Reflect.ownKeys(descriptors).length === source.length + 1,
    'Creator asset table must be dense.',
  );
  for (let i = 0; i < source.length; i++) {
    const row = descriptors[i];
    required(
      row && Object.hasOwn(row, 'value') && row.enumerable,
      'Creator assets cannot use accessors.',
    );
    const fields = Object.getOwnPropertyDescriptors(row.value);
    required(
      Reflect.ownKeys(fields).length === 2 &&
        ['sha256', 'blob'].every(
          (key) => fields[key]?.enumerable && Object.hasOwn(fields[key], 'value'),
        ),
      'Creator assets need an owned hash and Blob.',
    );
    const hash = fields.sha256.value;
    required(hashValid(hash) && !found.has(hash), 'Invalid or duplicate creator asset hash.');
    // Unselected library objects are deliberately not read into an export.
    const facts = wanted.get(hash);
    found.set(
      hash,
      facts
        ? ownCreatorBlob(
            fields.blob.value,
            facts.kind === 'victory-video-original'
              ? VIDEO_POSTER_LIMITS.sourceBytes
              : 4 * 1024 * 1024,
            facts.kind === 'victory-video-original' ? 'Victory video original' : 'Reveal picture',
          )
        : null,
    );
  }
  required(
    [...wanted.keys()].every((hash) => found.get(hash)),
    'A required reveal picture or victory video is missing. Select it again.',
  );
  return Object.freeze(
    [...wanted.keys()].sort().map((sha256) => Object.freeze({ sha256, blob: found.get(sha256) })),
  );
}

function requiredAssetFacts(content) {
  const wanted = new Map(
    content.project.assets.map((asset) => [
      asset.sha256,
      { sha256: asset.sha256, bytes: asset.bytes, mime: assetRevisionMime(asset), kind: 'poster' },
    ]),
  );
  for (const [sha256, facts] of creatorStoryAssetFacts(content.media)) {
    const previous = wanted.get(sha256);
    required(
      !previous || canonicalJSON(previous) === canonicalJSON(facts),
      'A creator asset hash claims different poster or video facts.',
    );
    wanted.set(sha256, facts);
  }
  return wanted;
}

async function verifyCreatorVideo(blob, expected, { signal, inspectVideo }) {
  creatorAbort(signal);
  required(
    blob.size === expected.bytes &&
      (await creatorSHA256(await blob.arrayBuffer())) === expected.sha256,
    'Victory video bytes differ from the complete original pin.',
  );
  creatorAbort(signal);
  const inspected = await inspectVideo(blob, { signal });
  try {
    for (const key of ['sha256', 'bytes', 'mime', 'width', 'height', 'durationSeconds'])
      required(
        inspected.info?.[key] === expected[key],
        `Victory video ${key} differs from the inspected original.`,
      );
  } finally {
    inspected?.dispose?.();
  }
}

/** Only returned, frozen preparations may be approved. Imported approval flags
 * are not part of this format and cannot bypass media or gameplay verification. */
export async function prepareCreatorBundle(
  source,
  sourceAssets,
  { signal, decodeImage, inspectVideo = openVideoPosterSource } = {},
) {
  creatorAbort(signal);
  const content = scopedContent(source),
    requiredFacts = requiredAssetFacts(content),
    assetByHash = new Map(
      scopedAssets(sourceAssets, requiredFacts).map((asset) => [asset.sha256, asset]),
    ),
    verifiedAssets = new Map();
  for (const asset of content.project.assets) {
    let facts = verifiedAssets.get(asset.sha256);
    if (!facts) {
      const media = await prepareStillAsset(
        assetByHash.get(asset.sha256).blob,
        {
          id: asset.id,
          provenance: {
            kind: 'user-supplied',
            credit: content.credits.picture,
            source: 'Reviewed creator runtime derivative',
          },
        },
        { signal, decodeImage },
      );
      facts = media.asset;
      verifiedAssets.set(asset.sha256, facts);
    }
    required(
      facts.sha256 === asset.sha256 &&
        facts.bytes === asset.bytes &&
        facts.mime === assetRevisionMime(asset) &&
        facts.width === asset.width &&
        facts.height === asset.height,
      'Reveal picture bytes differ from the project pin. Prepare and review the picture again.',
    );
  }
  for (const story of content.media?.stories ?? [])
    await verifyCreatorVideo(assetByHash.get(story.video.sha256).blob, story.video, {
      signal,
      inspectVideo,
    });
  const verified = [];
  for (const provenance of provenanceEntries(content)) {
    const routes = await verifyCreatorRoutes(content.project, provenance, {
      signal,
      buildVersion: 'creator-route-v1',
    });
    if (content.compatibility.modes.includes('versus'))
      await verifyCreatorVersusRoutes(content.project, provenance, {
        signal,
        buildVersion: 'creator-versus-v1',
        verifiedSoloRoutes: routes,
      });
    verified.push({ missionId: provenance.missionId, routes });
  }
  const evidence = verified.length === 1 ? verified[0].routes : freezeDesign(verified);
  creatorAbort(signal);
  const assets = Object.freeze([...assetByHash.values()]);
  const document = freezeDesign({
    format: CREATOR_BUNDLE_FORMAT,
    content,
    evidence,
    assets: assets.map(({ sha256, blob }) => {
      const facts = requiredFacts.get(sha256);
      return content.media
        ? { sha256, bytes: blob.size, mime: facts.mime, kind: facts.kind }
        : { sha256, bytes: blob.size, mime: facts.mime };
    }),
  });
  const encoded = new TextEncoder().encode(canonicalJSON(document));
  required(
    encoded.length <= CREATOR_BUNDLE_LIMITS.manifestBytes,
    'Creator manifest exceeds its byte budget.',
  );
  const editionId = await creatorSHA256(encoded);
  creatorAbort(signal);
  const manifest = freezeDesign({ ...document, editionId });
  const manifestBytes = new TextEncoder().encode(canonicalJSON(manifest)).length;
  const bytes = 12 + manifestBytes + assets.reduce((n, a) => n + a.blob.size, 0);
  const packageLimit = content.media
    ? CREATOR_BUNDLE_LIMITS.bytes
    : CREATOR_BUNDLE_LIMITS.imageBytes;
  required(
    manifestBytes <= CREATOR_BUNDLE_LIMITS.manifestBytes && bytes <= packageLimit,
    content.project.missions.length === 1
      ? 'The pack is too large. Reduce its picture size.'
      : 'The pack is too large. Review an explicit split plan or remove selected pictures.',
  );
  const result = Object.freeze({
    manifest,
    assets,
    editionId,
    bytes,
    review: freezeDesign({
      name: content.project.name,
      missions: content.project.missions.length,
      picture: content.project.assets[0],
      ...(content.project.assets.length > 1
        ? { pictures: content.project.assets, campaigns: content.project.campaigns }
        : {}),
      credits: content.credits,
      ...(content.media ? { stories: content.media.stories.length } : {}),
      validation: content.compatibility.modes.includes('versus')
        ? 'Automated route verified for all Solo presets and equal-board Versus configurations. Visual review is still required.'
        : 'Automated route verified for all Solo presets and steering modes. Visual review is still required.',
    }),
  });
  preparations.add(result);
  return result;
}
export const isPreparedCreatorBundle = (value) => preparations.has(value);

/** Metadata inspection is suitable for browsing, never proof of playable media
 * or a successful route. Deliberate launch still prepares the complete bundle. */
export async function inspectCreatorManifest(source) {
  const manifest = copy(source);
  exactKeys(manifest, ['format', 'content', 'evidence', 'assets', 'editionId'], 'content manifest');
  required(
    manifest.format === CREATOR_BUNDLE_FORMAT && hashValid(manifest.editionId),
    'Invalid content manifest identity.',
  );
  exactKeys(
    manifest.content,
    [
      'project',
      'packId',
      'themes',
      'provenance',
      'credits',
      ...(Object.hasOwn(manifest.content, 'media') ? ['media'] : []),
      'compatibility',
    ],
    'bundle content',
  );
  const { compatibility, ...content } = manifest.content;
  required(
    knownCompatibility(compatibility) &&
      canonicalJSON(scopedContent(content)) === canonicalJSON(manifest.content),
    'Content manifest requires unsupported or unrelated content.',
  );
  const assets = [...requiredAssetFacts(manifest.content).values()].sort((a, b) =>
    a.sha256.localeCompare(b.sha256),
  );
  required(
    canonicalJSON(manifest.assets) ===
      canonicalJSON(
        assets.map((asset) =>
          manifest.content.media
            ? {
                sha256: asset.sha256,
                bytes: asset.bytes,
                mime: asset.mime,
                kind: asset.kind,
              }
            : { sha256: asset.sha256, bytes: asset.bytes, mime: asset.mime },
        ),
      ),
    'Manifest inventory differs from its required pictures and victory videos.',
  );
  evidenceEntries(manifest.content, manifest.evidence);
  const { editionId, ...document } = manifest;
  required(
    (await creatorSHA256(new TextEncoder().encode(canonicalJSON(document)))) === editionId,
    'Manifest edition hash differs from its content.',
  );
  return freezeDesign(manifest);
}
export function approveCreatorBundle(prepared) {
  required(preparations.has(prepared), 'Prepare this exact pack before approving it.');
  const approval = Object.freeze({ editionId: prepared.editionId });
  approvals.set(approval, prepared);
  return approval;
}
export function assertCreatorApproval(prepared, approval) {
  required(
    preparations.has(prepared) && approvals.get(approval) === prepared,
    'This approval is stale or belongs to another draft. Review and approve the current pack.',
  );
}
export function exportCreatorBundle(prepared, approval) {
  assertCreatorApproval(prepared, approval);
  const manifest = new TextEncoder().encode(canonicalJSON(prepared.manifest));
  const header = new Uint8Array(12);
  header.set(MAGIC);
  new DataView(header.buffer).setUint32(8, manifest.length, false);
  return new Blob([header, manifest, ...prepared.assets.map((a) => a.blob)], {
    type: 'application/vnd.revealline.content',
  });
}
export async function importCreatorBundle(
  source,
  { signal, decodeImage, inspectVideo = openVideoPosterSource } = {},
) {
  creatorAbort(signal);
  const blob = ownCreatorBlob(source, CREATOR_BUNDLE_LIMITS.bytes, 'Content pack');
  required(blob.size >= 12, 'Truncated content pack header.');
  const header = new Uint8Array(await blob.slice(0, 12).arrayBuffer());
  creatorAbort(signal);
  required(
    MAGIC.every((byte, i) => header[i] === byte),
    'Unsupported content pack. Choose an .rlpack file.',
  );
  const length = new DataView(header.buffer).getUint32(8, false);
  required(
    length > 0 && length <= CREATOR_BUNDLE_LIMITS.manifestBytes && length + 12 <= blob.size,
    'Invalid content pack manifest length.',
  );
  const manifest = copy(
    new TextDecoder('utf-8', { fatal: true }).decode(
      await blob.slice(12, 12 + length).arrayBuffer(),
    ),
  );
  exactKeys(manifest, ['format', 'content', 'evidence', 'assets', 'editionId'], 'content bundle');
  required(
    manifest.format === CREATOR_BUNDLE_FORMAT && hashValid(manifest.editionId),
    'Unsupported content bundle identity.',
  );
  exactKeys(
    manifest.content,
    [
      'project',
      'packId',
      'themes',
      'provenance',
      'credits',
      ...(Object.hasOwn(manifest.content, 'media') ? ['media'] : []),
      'compatibility',
    ],
    'bundle content',
  );
  required(
    knownCompatibility(manifest.content.compatibility),
    'This pack requires an unsupported creator runtime.',
  );
  required(
    Array.isArray(manifest.assets) && manifest.assets.length >= 1,
    'Expected reveal pictures.',
  );
  const assets = [];
  let offset = 12 + length;
  for (const row of manifest.assets) {
    exactKeys(
      row,
      ['sha256', 'bytes', 'mime', ...(manifest.content.media ? ['kind'] : [])],
      'bundle asset',
    );
    const video = row.kind === 'victory-video-original';
    required(
      hashValid(row.sha256) &&
        Number.isSafeInteger(row.bytes) &&
        row.bytes > 0 &&
        row.bytes <= (video ? VIDEO_POSTER_LIMITS.sourceBytes : 4 * 1024 * 1024) &&
        offset + row.bytes <= blob.size &&
        (video
          ? ['video/mp4', 'video/webm'].includes(row.mime)
          : ['image/png', 'image/jpeg', 'image/webp'].includes(row.mime) &&
            (!manifest.content.media || row.kind === 'poster')),
      'Invalid or truncated content asset.',
    );
    assets.push({ sha256: row.sha256, blob: blob.slice(offset, offset + row.bytes, row.mime) });
    offset += row.bytes;
  }
  required(offset === blob.size, 'Content pack contains trailing or unrelated bytes.');
  const { compatibility: _compatibility, ...content } = manifest.content;
  const prepared = await prepareCreatorBundle(content, assets, {
    signal,
    decodeImage,
    inspectVideo,
  });
  required(
    canonicalJSON(prepared.manifest) === canonicalJSON(manifest),
    'Content identity or completion evidence differs from current verification. Regenerate and review the pack.',
  );
  return prepared;
}

/** Preserve the exact logical raster path and private verified-artwork brand.
 * A path can only resolve to a dependency in this exact prepared edition. */
export function creatorArtworkLoader(prepared) {
  required(preparations.has(prepared), 'Prepare the content pack before resolving artwork.');
  return (asset, { signal } = {}) =>
    loadPreviewArtwork(asset, {
      signal,
      fetchAsset: async (path) => {
        const pin = prepared.manifest.content.project.assets.find(
          (item) => item.id === asset.id && item.path === path,
        );
        required(
          pin && canonicalJSON(pin) === canonicalJSON(asset),
          'Artwork is outside this installed edition.',
        );
        const bytes = prepared.assets.find((item) => item.sha256 === pin.sha256);
        required(bytes, 'This edition’s picture bytes are missing. Reinstall its exact pack.');
        return new Response(bytes.blob, { headers: { 'Content-Type': assetRevisionMime(pin) } });
      },
    });
}

/** Runtime-only lookup from an already verified immutable edition. Serialized
 * story metadata or today's filename pairing can never select another blob. */
export function creatorVictoryStoryDependency(prepared, missionId) {
  required(preparations.has(prepared), 'Verify the installed edition before opening its story.');
  const story = prepared.manifest.content.media?.stories.find(
      (entry) => entry.missionId === missionId,
    ),
    mission = prepared.manifest.content.project.missions.find((entry) => entry.id === missionId),
    poster =
      mission &&
      prepared.manifest.content.project.assets.find(
        (entry) => entry.id === mission.presentation.backgroundAssetId,
      );
  if (!story) return null;
  required(
    mission && poster && poster.sha256 === story.poster.sha256,
    'Installed victory story differs from its exact mission poster.',
  );
  const original = prepared.assets.find((entry) => entry.sha256 === story.video.sha256);
  required(original, 'This edition’s victory video is missing. Reinstall its exact pack.');
  return Object.freeze({ story, mission, poster, original: original.blob });
}
