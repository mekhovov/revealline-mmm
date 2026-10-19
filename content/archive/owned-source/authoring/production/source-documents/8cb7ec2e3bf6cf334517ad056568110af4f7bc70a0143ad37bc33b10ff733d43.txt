#!/usr/bin/env node
import assert from 'node:assert/strict';
import { readFile, lstat, mkdir, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
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
import { canonicalJSON, exactKeys } from '../../../game/data-json.mjs';

export const ROOT = fileURLToPath(new URL('../../../', import.meta.url));
export const SOURCE = 'authoring/library/fpv-route-choices/packs/fpv-route-choices.json';
export const SOURCE_SHA = '589543f693e650355216aa702844a7726b7cd6e318900b8583702fd0650ae989';
const THEME_SHA = '93582f7d9ba53753106df7b63928f086820fc0f68357d3c08f26c0b89fb84774';
export const THEME_IDS = Object.freeze(['ukraine', 'retro', 'coupa']);
export const SOURCE_LEVEL_IDS = Object.freeze([
  'route-choices-foundry',
  'route-choices-depot',
  'route-choices-switchback',
]);
const ART_ROOTS = ['ukraine-route-art', 'retro-route-art', 'spend-route-art'];
const SOURCE_AUDIT_NOTE =
  'This is an original route-choice study with fixed Standard grades, not a human-qualified difficulty rating.';
export const physicalLevel = (level) => {
  const copy = structuredClone(level);
  for (const key of ['id', 'name', 'themeId']) delete copy[key];
  delete copy.metadata.title;
  delete copy.metadata.rightsStatus;
  delete copy.metadata.description;
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

/** New editions reuse the three proven Tactical layouts; originals never become inline JSON. */
export async function buildRouteWorld(themeId) {
  assert.ok(THEME_IDS.includes(themeId), 'Choose ukraine, retro or coupa.');
  const editions = JSON.parse(
    await boundedFile('authoring/library/route-worlds/editions.json', 32768),
  );
  exactKeys(editions, ['format', 'editions'], 'route worlds');
  assert.equal(editions.format, 'revealline-route-worlds-source.v1');
  assert.deepEqual(
    editions.editions.map((e) => e.themeId),
    THEME_IDS,
  );
  for (const [i, entry] of editions.editions.entries()) {
    exactKeys(entry, ['themeId', 'artRoot', 'provenanceSha256', 'images'], 'route world');
    assert.equal(entry.artRoot, `authoring/library/${ART_ROOTS[i]}`);
    assert.match(entry.provenanceSha256, /^[a-f0-9]{64}$/);
    assert.deepEqual(
      entry.images.map((p) => p.sourceLevelId),
      SOURCE_LEVEL_IDS,
    );
    assert.equal(new Set(entry.images.map((p) => p.id)).size, 3);
    for (const picture of entry.images) {
      exactKeys(picture, ['id', 'title', 'sourceLevelId'], 'route picture');
      assert.match(picture.id, /^[a-z][a-z0-9-]{0,79}$/);
      assert.ok(
        typeof picture.title === 'string' &&
          picture.title.length > 0 &&
          picture.title.length <= 160,
      );
    }
  }
  const edition = editions.editions.find((e) => e.themeId === themeId);
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
  const sourceBytes = await boundedFile(SOURCE, 24 * 1024 * 1024, SOURCE_SHA);
  const { pack: prior } = await preparePack(sourceBytes.toString('utf8'), { decodeImage });
  assert.equal(prior.format, 'xonix-pack.v5');
  assert.equal(prior.engine, 'xonix-core.v5');
  assert.equal(prior.version, '1.0.0');
  assert.deepEqual(
    prior.campaigns[0].levels.map((l) => l.id),
    SOURCE_LEVEL_IDS,
  );
  const themes = JSON.parse(await boundedFile('game/content/themes.json', 32768, THEME_SHA));
  const theme = structuredClone(themes.themes.find((t) => t.id === themeId));
  assert.ok(theme);
  theme.subtitle = 'Route Choices · Tactical';
  const next = structuredClone(prior);
  next.id = `route-worlds-${themeId}`;
  next.name = `${theme.name} · Route Choices — Tactical`;
  next.description =
    'Three Tactical missions with original reward pictures. Choose an exit, time a carrier field or take a route without equipment, and cross the signal band or follow the safe rim.';
  next.metadata.rightsStatus = `Original project scenarios and AI-assisted ${theme.name} artwork; exact prompts and original PNGs retained. Fictional scenes, not copied game art or authenticated equipment, history or product UI. Existing theme music; no new track, actor set or story movie.`;
  next.themes = [theme];
  next.visualOverrides = {};
  next.levelVisuals = [];
  const campaign = next.campaigns[0];
  campaign.id = next.id;
  campaign.title = next.name;
  campaign.themeId = themeId;
  for (const [index, level] of campaign.levels.entries()) {
    const picture = edition.images[index];
    assert.equal(level.id, picture.sourceLevelId);
    level.id = `${next.id}-${['foundry', 'depot', 'switchback'][index]}`;
    level.name = picture.title;
    level.themeId = themeId;
    level.metadata.title = picture.title;
    if (index === 0) {
      const suffix = ` ${SOURCE_AUDIT_NOTE}`;
      assert.ok(
        level.metadata.description.endsWith(suffix),
        'Exact source audit sentence required.',
      );
      level.metadata.description = level.metadata.description.slice(0, -suffix.length);
    }
    level.metadata.rightsStatus =
      index === 0
        ? `Original scenery; separate edition. ${SOURCE_AUDIT_NOTE}`
        : 'Reuses a reviewed abstract Tactical layout with a new edition identity and original scenic reward. Scenery is independent of collision geometry.';
  }
  const { pack } = await preparePack(next, { decodeImage });
  assert.deepEqual(pack.classRecipes, prior.classRecipes);
  assert.deepEqual(pack.music, prior.music);
  for (const [i, level] of pack.campaigns[0].levels.entries()) {
    const description = prior.campaigns[0].levels[i].metadata.description;
    assert.equal(
      level.metadata.description,
      i === 0 ? description.slice(0, -` ${SOURCE_AUDIT_NOTE}`.length) : description,
    );
    assert.deepEqual(
      physicalLevel(level),
      physicalLevel(prior.campaigns[0].levels[i]),
      'Only edition/name/world/presentation metadata may differ.',
    );
  }
  const resolved = resolvePackCampaign(pack, campaign.id);
  const executionCatalog = createExecutionCatalog([resolved]);
  const baseCampaignKey = campaignKey(resolved.campaign);
  const library = {
    format: 'revealline-media-library.v1',
    assets: [],
    presentations: [],
    assignments: [],
  };
  const assets = [],
    originals = [],
    inputPins = [];
  const provenanceBytes = await boundedFile(
    `${edition.artRoot}/provenance.json`,
    65536,
    edition.provenanceSha256,
  );
  const provenance = JSON.parse(provenanceBytes);
  assert.equal(provenance.format, 'revealline-source-art-provenance.v1');
  assert.deepEqual(
    provenance.images.map((p) => p.id),
    edition.images.map((p) => p.id),
  );
  inputPins.push({
    path: `${edition.artRoot}/provenance.json`,
    bytes: provenanceBytes.length,
    sha256: edition.provenanceSha256,
  });
  for (const [index, picture] of edition.images.entries()) {
    const record = provenance.images.find((p) => p.id === picture.id);
    assert.ok(record && record.title === picture.title);
    assert.equal(record.path, `originals/${picture.id}.png`);
    const file = `${edition.artRoot}/${record.path}`;
    const bytes = await boundedFile(file, 4 * 1024 * 1024, record.sha256);
    assert.equal(bytes.length, record.bytes);
    const level = pack.campaigns[0].levels[index];
    const id = `${pack.id}-poster-${index + 1}`,
      presentationId = `${id}-presentation`;
    const prepared = await prepareStillAsset(
      new Blob([bytes]),
      {
        id,
        provenance: {
          kind: 'original',
          credit: 'RevealLine · AI-assisted original artwork',
          source: `${file}; exact original PNG; ${edition.artRoot}/provenance.json`,
        },
      },
      { decodeImage },
    );
    assert.equal(prepared.asset.width, record.width);
    assert.equal(prepared.asset.height, record.height);
    const identity = { baseCampaignKey, levelId: level.id, levelRevision: level.revision, themeId };
    library.assets.push(prepared.asset);
    library.presentations.push({
      format: 'revealline-media-presentation.v1',
      id: presentationId,
      revision: 1,
      identity,
      poster: { assetId: id, fit: 'contain', sampling: 'nearest' },
      story: null,
      description: picture.title,
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
    id: pack.id,
    revision: 1,
    source: { id: prior.id, bytes: sourceBytes.length, sha256: SOURCE_SHA },
    pack: { bytes: packBytes.length, sha256: await externalChapterHash(packBytes) },
    media: {
      bytes: mediaBlob.size,
      sha256: await externalChapterHash(await mediaBlob.arrayBuffer()),
    },
    campaignKey: baseCampaignKey,
    themeId,
    originals,
  };
  const payloads = { pack: new Blob([packBytes], { type: 'application/json' }), media: mediaBlob };
  const prepared = await prepareExternalChapter(descriptor, payloads, { decodeImage });
  assert.equal(canonicalJSON(prepared.descriptor), canonicalJSON(descriptor));
  const imageProofs = originals.map((o) => ({
    levelId: o.levelId,
    assetId: o.assetId,
    bytes: o.bytes,
    sha256: o.sha256,
    fit: 'contain',
    ...decoded.get(o.sha256),
  }));
  return { descriptor, payloads, prepared, prior, inputPins, imageProofs };
}

export async function writeRouteWorld(themeId, outputDirectory) {
  assert.equal(typeof outputDirectory, 'string', 'Choose a new cache output directory.');
  const output = path.resolve(outputDirectory);
  const relative = path.relative(ROOT, output);
  assert.ok(
    relative.startsWith('.cache/') &&
      relative.split('/').every((p) => p && p !== '.' && p !== '..'),
    'Write paired payloads only to a new directory under this worktree cache.',
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
  const result = await buildRouteWorld(themeId);
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
  const result = await writeRouteWorld(process.argv[2], process.argv[3]);
  console.log(
    JSON.stringify({ output: path.resolve(process.argv[3]), ...result.descriptor }, null, 2),
  );
}
