#!/usr/bin/env node
/** Byte-preserving optional art variations; never changes the source R5 or its routes. */
import assert from 'node:assert/strict';
import { readFile, writeFile, lstat } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { validatePack, PACK_LIMITS } from '../../../game/packs.mjs';
import { inspectImageDataUrl, CONTENT_LIMITS } from '../../../game/content.mjs';
import { boundedJSON, exactKeys } from '../../../game/data-json.mjs';
import { campaignKey } from '../../../game/library.mjs';

export const ROOT = fileURLToPath(new URL('../../../', import.meta.url));
export const CHAPTER_ROOT = 'authoring/library/four-worlds-chapters';
export const SOURCE_PINS = Object.freeze({
  'game/content/packs/fpv-arcade-r5.json':
    '350d89cf41767668b3734b474e5dd3d1d301bb0b5612e5082c5d233a1a081a74',
  'game/replays/fpv-arcade-r5-routes.json':
    '0fff81cd1db68106695b3fb92ddbba04025c379597e6d4fa6dc5a8bd0b7825de',
  'game/content/themes.json': '93582f7d9ba53753106df7b63928f086820fc0f68357d3c08f26c0b89fb84774',
  'authoring/library/four-worlds-source/catalog.json':
    'dcc82dfcf403ad86e83e1d985e8c9ecd530fbfad1c7bf9d556eaff9ba0530d29',
});
export const sha = (bytes) => createHash('sha256').update(bytes).digest('hex');
export const packFile = (id) => `${CHAPTER_ROOT}/packs/${id}.json`;

async function ordinaryFile(relative, expected) {
  assert.ok(
    !path.isAbsolute(relative) && !relative.split('/').some((p) => p === '..' || p === '.' || !p),
  );
  let current = ROOT;
  for (const part of relative.split('/')) {
    current = path.join(current, part);
    assert.equal((await lstat(current)).isSymbolicLink(), false);
  }
  const info = await lstat(current);
  assert.ok(
    info.isFile() && info.size <= PACK_LIMITS.maxBytes,
    'Bounded ordinary source/output file.',
  );
  const bytes = await readFile(current);
  if (expected) assert.equal(sha(bytes), expected, `Exact source: ${relative}`);
  return bytes;
}

/** Only presentation/identity fields are rewritten. All gameplay recipe fields remain exact. */
export function compileOriginalChapter(prior, registeredThemes, chapter, images) {
  exactKeys(
    chapter,
    ['id', 'campaignId', 'themeId', 'sourceTheme', 'name', 'subtitle', 'scoutLabel', 'maps'],
    'Original chapter',
  );
  assert.equal(chapter.maps.length, 3);
  assert.equal(prior.id, 'fpv-arcade-r5');
  const pack = structuredClone(prior);
  pack.id = chapter.id;
  pack.version = '1.0.0';
  pack.name = chapter.name;
  pack.description =
    'Optional illustrated theme variation: three original pictures over the three proven Pressure Lines layouts. Direction-only Arcade with warned hunters, cut stopping and contact pickups. This is new artwork with separate progress, not new geometry or music. Import this pack explicitly; it is outside automatic core offline downloads.';
  pack.metadata = {
    author: 'RevealLine',
    license: 'Original project content',
    rightsStatus:
      'Original AI-assisted artwork; exact source files, prompts and observations retained. No reference-game assets, brand logos or endorsement claimed.',
  };
  const theme = registeredThemes.find((t) => t.id === chapter.themeId);
  assert.ok(theme, 'Use a registered runtime theme ID.');
  pack.themes = [{ ...structuredClone(theme), subtitle: chapter.subtitle }];
  pack.classRecipes = prior.classRecipes.map((r) => ({
    ...structuredClone(r),
    label: chapter.scoutLabel,
    description:
      'Direction-only Arcade craft. Cruise speed belongs to each level; fly over marked pickups for their effects. Manual Scan, supply and Boost remain disabled.',
  }));
  const campaign = pack.campaigns[0];
  campaign.id = chapter.campaignId;
  campaign.revision = '1';
  campaign.title = chapter.name;
  campaign.themeId = chapter.themeId;
  campaign.levels = prior.campaigns[0].levels.map((source, index) => {
    const map = chapter.maps[index];
    exactKeys(map, ['imageId', 'id', 'name', 'description'], 'Original map');
    return {
      ...structuredClone(source),
      id: map.id,
      revision: '1',
      name: map.name,
      themeId: chapter.themeId,
      metadata: {
        title: map.name,
        description: `Reveal ${Math.round(source.goal.coverage * 100)}%. ${map.description} Tap a direction to fly; closing a cut stops the craft. Choose a fresh direction to continue. Pressure Lines layout ${index + 1}, presented as an original art variation.`,
        author: 'RevealLine',
        license: 'Original project content',
        rightsStatus:
          'New original illustration over unchanged Pressure Lines gameplay. Distinct art and progress identity; not a new geometry or reference-game reconstruction.',
      },
    };
  });
  pack.levelVisuals = chapter.maps.map((map) => {
    const image = images.get(map.imageId);
    assert.ok(
      image && image.record.theme === chapter.sourceTheme,
      'Exact source world and image required.',
    );
    return {
      levelId: map.id,
      visualOverrides: {
        background: {
          dataUrl: image.dataUrl,
          name: map.name,
          fit: 'contain',
          metadata: {
            title: map.name,
            description: map.description,
            author: 'RevealLine · AI-assisted original artwork',
            license: 'Original project artwork',
            rightsStatus:
              'Exact original AI-assisted project artwork; raw PNG, prompt, SHA-256 and source observations retained in four-worlds-source/catalog.json.',
          },
        },
      },
    };
  });
  const checked = validatePack(pack);
  assert.equal(checked.valid, true, checked.errors.join('; '));
  assert.ok(Buffer.byteLength(JSON.stringify(pack)) <= PACK_LIMITS.maxBytes);
  return pack;
}

export async function readOriginalChapters() {
  const inputs = {};
  for (const [file, pin] of Object.entries(SOURCE_PINS))
    inputs[file] = JSON.parse(await ordinaryFile(file, pin));
  const recipe = boundedJSON(JSON.parse(await ordinaryFile(`${CHAPTER_ROOT}/chapters.json`)), {
    maxBytes: 32768,
    maxDepth: 8,
    maxNodes: 1000,
    maxArray: 32,
    maxString: 2048,
  });
  exactKeys(
    recipe,
    ['format', 'distribution', 'geometryPack', 'geometryLevels', 'chapters'],
    'Original recipes',
  );
  assert.equal(recipe.format, 'revealline-original-chapter-recipes.v1');
  assert.equal(recipe.distribution, 'manual-optional-import');
  assert.equal(recipe.geometryPack, 'fpv-arcade-r5');
  assert.deepEqual(recipe.geometryLevels, [
    'orchard-crossing',
    'courtyard-exits',
    'night-crossfire',
  ]);
  assert.deepEqual(
    recipe.chapters.map((c) => [c.id, c.themeId, c.sourceTheme]),
    [
      ['original-fpv-pressure', 'fpv', 'fpv'],
      ['original-ukraine-atlas', 'ukraine', 'heritage'],
      ['original-retro-1994', 'retro', 'retro'],
    ],
  );
  const catalog = inputs['authoring/library/four-worlds-source/catalog.json'];
  assert.equal(catalog.images.length, 9);
  const images = new Map();
  for (const record of catalog.images) {
    const bytes = await ordinaryFile(record.source, record.sha256);
    await ordinaryFile(record.prompt, record.promptSha256);
    assert.equal(bytes.length, record.bytes);
    assert.ok(bytes.length <= CONTENT_LIMITS.maxImageBytes);
    const dataUrl = `data:image/png;base64,${bytes.toString('base64')}`;
    const header = inspectImageDataUrl(dataUrl);
    assert.equal(header.valid, true, header.errors.join('; '));
    assert.equal(header.width, record.width);
    assert.equal(header.height, record.height);
    assert.equal(header.width, header.height * 2);
    assert.ok(!images.has(record.id));
    images.set(record.id, { record, dataUrl });
  }
  const ids = recipe.chapters.flatMap((c) => c.maps.map((m) => m.imageId));
  assert.deepEqual([...ids].sort(), [...images.keys()].sort());
  assert.equal(new Set([...images.values()].map((i) => i.record.sha256)).size, 12);
  assert.equal(new Set(recipe.chapters.flatMap((c) => c.maps.map((m) => m.id))).size, 12);
  assert.equal(new Set(recipe.chapters.map((c) => c.campaignId)).size, 4);
  const prior = inputs['game/content/packs/fpv-arcade-r5.json'];
  const packs = recipe.chapters.map((c) =>
    compileOriginalChapter(prior, inputs['game/content/themes.json'].themes, c, images),
  );
  assert.ok(
    Buffer.byteLength(JSON.stringify({ format: 'xonix-pack-library.v1', packs })) <=
      PACK_LIMITS.libraryBytes,
  );
  return {
    packs,
    recipe,
    images,
    prior,
    priorProof: inputs['game/replays/fpv-arcade-r5-routes.json'],
  };
}

export function distributionFor(source) {
  return {
    format: 'revealline-optional-original-chapters.v1',
    distribution: 'manual-optional-import',
    includedInDefaultBuild: false,
    sourceCatalog: 'authoring/library/four-worlds-source/catalog.json',
    sourceCatalogSha256: SOURCE_PINS['authoring/library/four-worlds-source/catalog.json'],
    distinctImages: 12,
    distinctReusedGeometries: 3,
    combinedLibraryBytes: Buffer.byteLength(
      JSON.stringify({ format: 'xonix-pack-library.v1', packs: source.packs }),
    ),
    packs: source.packs.map((pack, i) => ({
      id: pack.id,
      version: pack.version,
      path: packFile(pack.id),
      bytes: Buffer.byteLength(JSON.stringify(pack, null, 2) + '\n'),
      sha256: sha(JSON.stringify(pack, null, 2) + '\n'),
      normalizedBytes: Buffer.byteLength(JSON.stringify(pack)),
      campaignKey: campaignKey({ ...pack.campaigns[0], classRecipes: pack.classRecipes }),
      themeId: pack.themes[0].id,
      sourceTheme: source.recipe.chapters[i].sourceTheme,
      maps: pack.campaigns[0].levels.map((level, index) => ({
        id: level.id,
        sourceGeometryId: source.recipe.geometryLevels[index],
        sourceImageId: source.recipe.chapters[i].maps[index].imageId,
      })),
    })),
  };
}

export async function buildOriginalChapters({ write = false, quiet = false } = {}) {
  const source = await readOriginalChapters();
  const outputs = source.packs.map((pack) => ({
    pack,
    file: packFile(pack.id),
    bytes: Buffer.from(JSON.stringify(pack, null, 2) + '\n'),
  }));
  outputs.push({
    pack: null,
    file: `${CHAPTER_ROOT}/distribution.json`,
    bytes: Buffer.from(JSON.stringify(distributionFor(source), null, 2) + '\n'),
  });
  for (const output of outputs) assert.ok(output.bytes.length <= PACK_LIMITS.maxBytes);
  if (write)
    for (const output of outputs)
      await assert.rejects(lstat(path.join(ROOT, output.file)), { code: 'ENOENT' });
  for (const { pack, file, bytes } of outputs) {
    if (write) await writeFile(path.join(ROOT, file), bytes, { flag: 'wx' });
    else assert.deepEqual(await ordinaryFile(file), bytes, `Regenerated optional output: ${file}`);
    if (!quiet && pack)
      console.log(
        `${pack.id}: ${bytes.length} formatted bytes; ${Buffer.byteLength(JSON.stringify(pack))} normalized JSON bytes; ${sha(bytes)}`,
      );
  }
  return source;
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const args = process.argv.slice(2);
  assert.ok(args.length === 0 || (args.length === 1 && args[0] === '--write'));
  await buildOriginalChapters({ write: args.length === 1 });
}
