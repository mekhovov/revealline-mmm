import assert from 'node:assert/strict';
import { lstat, mkdir, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { buildCountercurrent } from '../countercurrent/build.mjs';
import { ROOT, ordinaryFile, digest } from '../sentinel-circuit/files.mjs';
import { IDS } from '../countercurrent/build.mjs';
import { preparePack, resolvePackCampaign } from '../../../game/packs.mjs';
import { createExecutionCatalog } from '../../../game/campaign-contexts.mjs';
import { campaignKey } from '../../../game/library.mjs';
import { prepareStillAsset } from '../../../game/media-still.mjs';
import { prepareStoredStillMedia } from '../../../game/media-storage-record.mjs';
import { exportMediaBundle } from '../../../game/media-bundle.mjs';
import {
  EXTERNAL_CHAPTER_FORMAT,
  prepareExternalChapter,
} from '../../../game/external-chapter.mjs';
import { decodeOriginalPNG } from '../four-worlds-chapters/verify-images.mjs';
import { boundedJSON, exactKeys } from '../../../game/data-json.mjs';

export { ROOT, IDS, digest };
export const SOURCE_PROOF = 'authoring/library/countercurrent/routes.json';
export const SOURCE_PACK_SHA = 'fa1ad192dbb09efe1ea97ec2689064cf84dc086e9a293e2c1a482d5e97cac6bb';
export async function readPinned(file, limit, expected) {
  const bytes = await ordinaryFile(path.join(ROOT, file), limit);
  if (expected !== undefined) assert.equal(digest(bytes), expected, `Exact source: ${file}`);
  return bytes;
}
export const THEME_IDS = Object.freeze(['fpv', 'ukraine', 'retro']);
export const EDITIONS_FILE = 'authoring/library/countercurrent-chapters/editions.json';
export const INPUTS = Object.freeze({
  'authoring/library/countercurrent/build.mjs':
    'e0689abb6dc91be8da928f83035ad169f68a041d02377976485e68bfa9ccdd12',
  'authoring/library/countercurrent/layouts.json':
    'daaeb40b6260ada3632d602d42b41788fb0c36de109bcc0a1f648018112f3abc',
  'authoring/library/countercurrent/controls.mjs':
    'cffb060cbe1132ce4987820d3d5bd0bff47392b3dd10a42bd85486470f29d4eb',
  'authoring/library/countercurrent/routes.json':
    'e729ead2a1014b7edf2809d2d32dfd2958f66441194468d36b9e9f7b534ba856',
  'game/content/themes.json': '77f3e7e8f0951172bd0c11649b0203808b3d1b00ca434c2a576ef631899958b2',
  'authoring/library/countercurrent-art/provenance.json':
    '41f8d87480fa488bddcbd29f66b9dd239ece2acbf860c143f6eef82c6fc733e4',
  'authoring/library/countercurrent-art/manifest.json':
    'c563bcdbcd0503081f24aa451437540b67ceabd545b4edb05b3256d0ccd75543',
});
export const artRoot = () => 'authoring/library/countercurrent-art';
// The source IDs and revision remain physical authority. Only these display fields differ.
export function physicalLevel(level) {
  const copy = structuredClone(level);
  for (const key of ['name', 'themeId']) delete copy[key];
  for (const key of ['title', 'description', 'rightsStatus']) delete copy.metadata[key];
  return copy;
}

/** Pure bounded metadata check; it grants no decoder or owner capability. */
export function validateCountercurrentThemeEditions(value, provenances) {
  const doc = boundedJSON(value, {
    maxBytes: 32768,
    maxNodes: 2000,
    maxDepth: 8,
    maxArray: 16,
    maxString: 4096,
  });
  exactKeys(doc, ['format', 'editions'], 'Countercurrent theme editions');
  assert.equal(doc.format, 'revealline-countercurrent-editions.v1');
  assert.deepEqual(
    doc.editions.map((e) => e.themeId),
    THEME_IDS,
  );
  assert.equal(provenances.length, THEME_IDS.length);
  for (const [index, edition] of doc.editions.entries()) {
    exactKeys(
      edition,
      ['themeId', 'id', 'artRoot', 'provenanceSha256', 'images'],
      'Countercurrent theme',
    );
    const themeId = THEME_IDS[index],
      provenance = provenances[index];
    assert.equal(edition.id, `countercurrent-${themeId}`);
    assert.equal(edition.artRoot, artRoot(themeId));
    assert.equal(edition.provenanceSha256, INPUTS[`${edition.artRoot}/provenance.json`]);
    assert.equal(provenance.format, 'revealline-source-art-provenance.v1');
    assert.equal(provenance.images.length, THEME_IDS.length * 3);
    assert.equal(edition.images.length, 3);
    for (const [i, picture] of edition.images.entries()) {
      exactKeys(
        picture,
        ['sourceCellId', 'sourceLevelId', 'path', 'sha256', 'title', 'description'],
        'Countercurrent theme picture',
      );
      const slot = IDS[i].replace('countercurrent-', ''),
        original = provenance.images.filter((image) => image.themeId === themeId)[i];
      assert.equal(picture.sourceCellId, `countercurrent/${slot}/${themeId}`);
      assert.equal(picture.sourceLevelId, IDS[i]);
      assert.equal(picture.path, `originals/${slot}-${themeId}.png`);
      assert.equal(original.cellId, picture.sourceCellId);
      assert.equal(original.sourceLevelId, picture.sourceLevelId);
      assert.equal(original.themeId, themeId);
      assert.equal(original.missionSlot, slot);
      assert.equal(original.path, picture.path);
      assert.equal(original.sha256, picture.sha256);
      assert.equal(original.runtimeBinding, null);
      assert.deepEqual([original.width, original.height], [1774, 887]);
      assert.ok(
        Number.isSafeInteger(original.bytes) &&
          original.bytes > 0 &&
          original.bytes <= 4 * 1024 * 1024,
      );
      for (const [key, maximum] of [
        ['title', 160],
        ['description', 2048],
      ])
        assert.ok(
          typeof picture[key] === 'string' && picture[key].trim() && picture[key].length <= maximum,
        );
    }
  }
  return doc;
}

export async function buildCountercurrentTheme(themeId) {
  assert.ok(THEME_IDS.includes(themeId), 'Choose fpv, ukraine or retro.');
  const inputPins = [];
  for (const [file, sha256] of Object.entries(INPUTS)) {
    const bytes = await readPinned(file, 4 * 1024 * 1024, sha256);
    inputPins.push({ path: file, bytes: bytes.length, sha256 });
  }
  const { pack: sourcePack } = await buildCountercurrent();
  const sourceBytes = Buffer.from(JSON.stringify(sourcePack));
  assert.equal(digest(sourceBytes), SOURCE_PACK_SHA);
  const provenances = await Promise.all(
    THEME_IDS.map(async (theme) => {
      const file = `${artRoot(theme)}/provenance.json`;
      return JSON.parse(await readPinned(file, 65536, INPUTS[file]));
    }),
  );
  const editionBytes = await readPinned(EDITIONS_FILE, 32768);
  const editions = validateCountercurrentThemeEditions(JSON.parse(editionBytes), provenances);
  inputPins.push({ path: EDITIONS_FILE, bytes: editionBytes.length, sha256: digest(editionBytes) });
  const edition = editions.editions.find((e) => e.themeId === themeId);
  const provenance = provenances[THEME_IDS.indexOf(themeId)],
    id = edition.id;
  const themes = JSON.parse(
    await readPinned('game/content/themes.json', 32768, INPUTS['game/content/themes.json']),
  );
  const theme = structuredClone(themes.themes.find((t) => t.id === themeId));
  assert.ok(theme);
  theme.subtitle = 'Countercurrent · Arcade';
  const next = structuredClone(sourcePack);
  next.id = id;
  next.name = `${theme.name} · Countercurrent — Arcade`;
  next.description =
    'Round the offset docks, braid the sandbar lanes, and cross the watch islands. Three original scenic rewards.';
  next.metadata.rightsStatus = `Original Countercurrent layouts and AI-assisted ${theme.name} scenery. Exact prompts and PNGs retained; fictional places and objects. Existing theme music; no new story, movie or track.`;
  next.themes = [theme];
  next.visualOverrides = {};
  next.levelVisuals = [];
  const campaign = next.campaigns[0];
  campaign.id = id;
  campaign.title = next.name;
  campaign.themeId = themeId;
  for (const [i, level] of campaign.levels.entries()) {
    assert.equal(level.id, IDS[i]);
    level.name = edition.images[i].title;
    level.themeId = themeId;
    level.metadata.title = level.name;
    level.metadata.description = edition.images[i].description;
    level.metadata.rightsStatus =
      'Exact Countercurrent layout; independent theme owner and original scenery. Painted routes are not collision geometry.';
  }
  const decoded = new Map();
  const decodeImage = async (value) => {
    const bytes =
      typeof value === 'string'
        ? Buffer.from(value.split(',')[1], 'base64')
        : Buffer.from(await value.arrayBuffer());
    const hash = digest(bytes);
    if (!decoded.has(hash))
      decoded.set(hash, decodeOriginalPNG(`data:image/png;base64,${bytes.toString('base64')}`));
    const { naturalWidth, naturalHeight } = decoded.get(hash);
    return { naturalWidth, naturalHeight };
  };
  const { pack } = await preparePack(next, { decodeImage });
  for (const [i, level] of pack.campaigns[0].levels.entries()) {
    assert.deepEqual(physicalLevel(level), physicalLevel(sourcePack.campaigns[0].levels[i]));
    assert.equal(level.themeId, themeId);
    assert.equal(level.name, edition.images[i].title);
    assert.equal(level.metadata.title, level.name);
    assert.equal(level.metadata.description, edition.images[i].description);
  }
  assert.deepEqual(pack.classRecipes, sourcePack.classRecipes);
  assert.deepEqual(pack.themes, [theme]);
  assert.deepEqual(pack.music, sourcePack.music);
  const resolved = resolvePackCampaign(pack, id),
    executionCatalog = createExecutionCatalog([resolved]);
  const baseCampaignKey = campaignKey(resolved.campaign);
  assert.notEqual(
    baseCampaignKey,
    campaignKey(resolvePackCampaign(sourcePack, sourcePack.id).campaign),
  );
  assert.deepEqual(
    executionCatalog.entries.map((e) => e.difficulty),
    ['standard', 'gentle'],
  );
  const library = {
    format: 'revealline-media-library.v1',
    assets: [],
    presentations: [],
    assignments: [],
  };
  const assets = [],
    originals = [];
  for (const [i, picture] of edition.images.entries()) {
    const record = provenance.images.filter((image) => image.themeId === themeId)[i],
      file = `${edition.artRoot}/${record.path}`;
    const bytes = await readPinned(file, 4 * 1024 * 1024, picture.sha256);
    assert.equal(bytes.length, record.bytes);
    const assetId = `${id}-poster-${i + 1}`,
      presentationId = `${assetId}-presentation`;
    const prepared = await prepareStillAsset(
      new Blob([bytes]),
      {
        id: assetId,
        provenance: {
          kind: 'original',
          credit: 'RevealLine · AI-assisted original artwork',
          source: `${file}; exact original PNG; ${edition.artRoot}/provenance.json`,
        },
      },
      { decodeImage },
    );
    assert.deepEqual([prepared.asset.width, prepared.asset.height], [record.width, record.height]);
    const level = pack.campaigns[0].levels[i];
    const identity = { baseCampaignKey, levelId: level.id, levelRevision: level.revision, themeId };
    library.assets.push(prepared.asset);
    library.presentations.push({
      format: 'revealline-media-presentation.v1',
      id: presentationId,
      revision: 1,
      identity,
      poster: { assetId, fit: 'contain', sampling: 'nearest' },
      story: null,
      description: level.name,
    });
    library.assignments.push({ identity, presentationId, revision: 1 });
    assets.push({ sha256: prepared.asset.sha256, blob: prepared.blob });
    originals.push({
      assetId,
      presentationId,
      levelId: level.id,
      levelRevision: level.revision,
      ...Object.fromEntries(
        ['sha256', 'bytes', 'mime', 'width', 'height'].map((key) => [key, prepared.asset[key]]),
      ),
    });
    inputPins.push({ path: file, bytes: bytes.length, sha256: record.sha256 });
  }
  assert.equal(new Set(originals.map((o) => o.sha256)).size, 3);
  const media = await prepareStoredStillMedia(library, assets, { executionCatalog, decodeImage });
  const mediaBlob = await exportMediaBundle(media.library, media.assets, { decodeImage });
  const packBytes = Buffer.from(JSON.stringify(pack));
  const descriptor = {
    format: EXTERNAL_CHAPTER_FORMAT,
    id,
    revision: 1,
    source: { id: sourcePack.id, bytes: sourceBytes.length, sha256: SOURCE_PACK_SHA },
    pack: { bytes: packBytes.length, sha256: digest(packBytes) },
    media: { bytes: mediaBlob.size, sha256: digest(Buffer.from(await mediaBlob.arrayBuffer())) },
    campaignKey: baseCampaignKey,
    themeId,
    originals,
  };
  const payloads = { pack: new Blob([packBytes], { type: 'application/json' }), media: mediaBlob };
  const prepared = await prepareExternalChapter(descriptor, payloads, { decodeImage });
  assert.deepEqual(prepared.descriptor, descriptor);
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

export async function writeCountercurrentTheme(themeId, outputDirectory) {
  assert.ok(THEME_IDS.includes(themeId), 'Choose fpv, ukraine or retro.');
  assert.equal(typeof outputDirectory, 'string');
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
    assert.ok(info.isDirectory() && !info.isSymbolicLink(), 'Ordinary cache parents required.');
  }
  await assert.rejects(lstat(output), { code: 'ENOENT' });
  const result = await buildCountercurrentTheme(themeId);
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
  assert.equal(process.argv.length, 4, 'Use build.mjs THEME NEW_CACHE_OUTPUT_DIRECTORY');
  const result = await writeCountercurrentTheme(process.argv[2], process.argv[3]);
  console.log(
    JSON.stringify({ output: path.resolve(process.argv[3]), ...result.descriptor }, null, 2),
  );
}
