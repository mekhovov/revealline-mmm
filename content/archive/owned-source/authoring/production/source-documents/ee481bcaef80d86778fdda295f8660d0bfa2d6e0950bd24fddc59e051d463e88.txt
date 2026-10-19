import assert from 'node:assert/strict';
import { readFile, lstat, mkdir, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { buildSentinelCircuit, IDS } from '../sentinel-circuit/build.mjs';
import { preparePack, resolvePackCampaign } from '../../../game/packs.mjs';
import { createExecutionCatalog } from '../../../game/campaign-contexts.mjs';
import { campaignKey } from '../../../game/library.mjs';
import { prepareStillAsset } from '../../../game/media-still.mjs';
import { prepareStoredStillMedia } from '../../../game/media-storage-record.mjs';
import { exportMediaBundle } from '../../../game/media-bundle.mjs';
import {
  EXTERNAL_CHAPTER_FORMAT,
  externalChapterHash,
  prepareExternalChapter,
} from '../../../game/external-chapter.mjs';
import { decodeOriginalPNG } from '../four-worlds-chapters/verify-images.mjs';
import { canonicalJSON } from '../../../game/data-json.mjs';

export const ROOT = fileURLToPath(new URL('../../../', import.meta.url));
export const ID = 'sentinel-circuit-fpv';
export const SOURCE_LEVEL_IDS = IDS;
export const SOURCE_PACK_SHA = 'cf6009eeadef504d033de0dd27f33aa3d6405caf1954a6417cbdfc09bc566b40';
export const SOURCE_PROOF = 'authoring/library/sentinel-circuit/routes.json';
export const SOURCE_PROOF_SHA = 'eb235f9bc26ea3670137f3f7d7ac86ac5e8c4b56b98502b8ef61f0ad98d95e70';
const ART = 'authoring/library/sentinel-circuit-art';
const INPUTS = Object.freeze({
  'authoring/library/sentinel-circuit/build.mjs':
    'e76f204cbe240bdedac79f2d92c85ab767846be32cfae50cd76ef983340c4d41',
  [SOURCE_PROOF]: SOURCE_PROOF_SHA,
  [`${ART}/provenance.json`]: 'a863d2401e01f9107d59d30b9e54daf1a7ebc27235f04d351584e5e5dd83eda7',
});
const IMAGES = ['listening-court', 'switchyard-gates', 'open-the-circuit'];
export const physicalLevel = (level) => {
  const copy = structuredClone(level);
  delete copy.id;
  delete copy.metadata.rightsStatus;
  return copy;
};
export async function boundedFile(relative, limit, expected) {
  assert.ok(
    !path.isAbsolute(relative) && relative.split('/').every((p) => p && p !== '.' && p !== '..'),
  );
  let full = ROOT;
  for (const part of relative.split('/')) {
    full = path.join(full, part);
    assert.equal((await lstat(full)).isSymbolicLink(), false, `Ordinary input: ${relative}`);
  }
  const stat = await lstat(full);
  assert.ok(stat.isFile() && stat.size <= limit, `Bounded input: ${relative}`);
  const bytes = await readFile(full);
  assert.ok(bytes.length <= limit);
  if (expected)
    assert.equal(await externalChapterHash(bytes), expected, `Exact input: ${relative}`);
  return bytes;
}
export async function buildExternalSentinel() {
  const inputPins = [];
  for (const [file, hash] of Object.entries(INPUTS)) {
    const bytes = await boundedFile(file, 2 * 1024 * 1024, hash);
    inputPins.push({ path: file, bytes: bytes.length, sha256: hash });
  }
  const { pack: sourcePack } = await buildSentinelCircuit();
  const sourceBytes = new TextEncoder().encode(JSON.stringify(sourcePack));
  assert.equal(await externalChapterHash(sourceBytes), SOURCE_PACK_SHA);
  const next = structuredClone(sourcePack);
  next.id = ID;
  next.name = 'Sentinel Circuit · FPV Front';
  next.description =
    'Three distinct Tactical missions: read the courtyards, control a crossing, then release the signal sentinel. Three exact original reward panoramas in the paired media file. Existing FPV theme music; no story movie.';
  next.metadata.rightsStatus =
    'Original fictional Sentinel missions and AI-assisted artwork; exact original PNGs and prompts retained. Scenery is independent of collision geometry.';
  const campaign = next.campaigns[0];
  campaign.id = ID;
  for (const level of campaign.levels) {
    level.id = level.id.replace('sentinel-circuit-', `${ID}-`);
    level.metadata.rightsStatus = next.metadata.rightsStatus;
  }
  const decoded = new Map();
  const decodeImage = async (value) => {
    const bytes =
      typeof value === 'string'
        ? Buffer.from(value.split(',')[1], 'base64')
        : Buffer.from(await value.arrayBuffer());
    const hash = await externalChapterHash(bytes);
    if (!decoded.has(hash))
      decoded.set(hash, decodeOriginalPNG(`data:image/png;base64,${bytes.toString('base64')}`));
    const { naturalWidth, naturalHeight } = decoded.get(hash);
    return { naturalWidth, naturalHeight };
  };
  const { pack } = await preparePack(next, { decodeImage });
  for (const [i, level] of pack.campaigns[0].levels.entries())
    assert.deepEqual(physicalLevel(level), physicalLevel(sourcePack.campaigns[0].levels[i]));
  assert.deepEqual(pack.classRecipes, sourcePack.classRecipes);
  assert.deepEqual(pack.themes, sourcePack.themes);
  assert.deepEqual(pack.music, sourcePack.music);
  const resolved = resolvePackCampaign(pack, ID),
    executionCatalog = createExecutionCatalog([resolved]);
  const baseCampaignKey = campaignKey(resolved.campaign);
  const provenance = JSON.parse(
    await boundedFile(`${ART}/provenance.json`, 65536, INPUTS[`${ART}/provenance.json`]),
  );
  assert.equal(provenance.format, 'revealline-source-art-provenance.v1');
  assert.deepEqual(
    provenance.images.map((p) => p.id),
    IMAGES,
  );
  const library = {
    format: 'revealline-media-library.v1',
    assets: [],
    presentations: [],
    assignments: [],
  };
  const assets = [],
    originals = [];
  for (const [i, record] of provenance.images.entries()) {
    assert.equal(record.path, `originals/${IMAGES[i]}.png`);
    const file = `${ART}/${record.path}`,
      bytes = await boundedFile(file, 4 * 1024 * 1024, record.sha256);
    assert.equal(bytes.length, record.bytes);
    const id = `${ID}-poster-${i + 1}`,
      presentationId = `${id}-presentation`;
    const prepared = await prepareStillAsset(
      new Blob([bytes]),
      {
        id,
        provenance: {
          kind: 'original',
          credit: 'RevealLine · AI-assisted original artwork',
          source: `${file}; exact original PNG; ${ART}/provenance.json`,
        },
      },
      { decodeImage },
    );
    assert.equal(prepared.asset.width, record.width);
    assert.equal(prepared.asset.height, record.height);
    const level = pack.campaigns[0].levels[i],
      identity = {
        baseCampaignKey,
        levelId: level.id,
        levelRevision: level.revision,
        themeId: 'fpv',
      };
    library.assets.push(prepared.asset);
    library.presentations.push({
      format: 'revealline-media-presentation.v1',
      id: presentationId,
      revision: 1,
      identity,
      poster: { assetId: id, fit: 'contain', sampling: 'nearest' },
      story: null,
      description: level.name,
    });
    library.assignments.push({ identity, presentationId, revision: 1 });
    assets.push({ sha256: prepared.asset.sha256, blob: prepared.blob });
    originals.push({
      assetId: id,
      presentationId,
      levelId: level.id,
      levelRevision: level.revision,
      ...Object.fromEntries(
        ['sha256', 'bytes', 'mime', 'width', 'height'].map((k) => [k, prepared.asset[k]]),
      ),
    });
    inputPins.push({ path: file, bytes: bytes.length, sha256: record.sha256 });
  }
  assert.equal(new Set(originals.map((o) => o.sha256)).size, 3);
  const media = await prepareStoredStillMedia(library, assets, { executionCatalog, decodeImage });
  const mediaBlob = await exportMediaBundle(media.library, media.assets, { decodeImage });
  const packBytes = new TextEncoder().encode(JSON.stringify(pack));
  const descriptor = {
    format: EXTERNAL_CHAPTER_FORMAT,
    id: ID,
    revision: 1,
    source: { id: sourcePack.id, bytes: sourceBytes.length, sha256: SOURCE_PACK_SHA },
    pack: { bytes: packBytes.length, sha256: await externalChapterHash(packBytes) },
    media: {
      bytes: mediaBlob.size,
      sha256: await externalChapterHash(await mediaBlob.arrayBuffer()),
    },
    campaignKey: baseCampaignKey,
    themeId: 'fpv',
    originals,
  };
  const payloads = { pack: new Blob([packBytes], { type: 'application/json' }), media: mediaBlob };
  const prepared = await prepareExternalChapter(descriptor, payloads, { decodeImage });
  assert.equal(canonicalJSON(prepared.descriptor), canonicalJSON(descriptor));
  return {
    descriptor,
    payloads,
    prepared,
    sourcePack,
    inputPins,
    imageProofs: originals.map((o) => ({
      levelId: o.levelId,
      sha256: o.sha256,
      bytes: o.bytes,
      fit: 'contain',
      ...decoded.get(o.sha256),
    })),
  };
}
export async function writeExternalSentinel(outputDirectory) {
  assert.equal(typeof outputDirectory, 'string', 'Choose a new cache output directory.');
  const output = path.resolve(outputDirectory),
    relative = path.relative(ROOT, output);
  assert.ok(
    relative.startsWith('.cache/') &&
      relative.split('/').every((p) => p && p !== '.' && p !== '..'),
    'Write paired payloads only to a new worktree cache directory.',
  );
  let parent = ROOT;
  for (const part of relative.split('/').slice(0, -1)) {
    parent = path.join(parent, part);
    const info = await lstat(parent);
    assert.ok(
      info.isDirectory() && !info.isSymbolicLink(),
      'Cache parents must be ordinary directories.',
    );
  }
  await assert.rejects(lstat(output), { code: 'ENOENT' });
  const result = await buildExternalSentinel();
  await mkdir(output);
  for (const [name, bytes] of [
    ['descriptor.json', Buffer.from(JSON.stringify(result.descriptor, null, 2) + '\n')],
    ['pack.json', Buffer.from(await result.payloads.pack.arrayBuffer())],
    ['media.rlmedia', Buffer.from(await result.payloads.media.arrayBuffer())],
    ['inputs.json', Buffer.from(JSON.stringify(result.inputPins, null, 2) + '\n')],
  ])
    await writeFile(path.join(output, name), bytes, { flag: 'wx' });
  return result;
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  assert.equal(process.argv.length, 3, 'Use build.mjs NEW_CACHE_OUTPUT_DIRECTORY');
  const result = await writeExternalSentinel(process.argv[2]);
  console.log(
    JSON.stringify({ output: path.resolve(process.argv[2]), ...result.descriptor }, null, 2),
  );
}
