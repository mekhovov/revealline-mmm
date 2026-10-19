/** Finite source-art verification; original decoding never writes or transforms pixels. */
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { lstat, readFile, readdir, writeFile } from 'node:fs/promises';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { decodeOriginalPNG } from '../four-worlds-chapters/verify-images.mjs';
import { inspectImageDataUrl } from '../../../game/content.mjs';
import { MEDIA_LIMITS } from '../../../game/media-library.mjs';

const folder = dirname(fileURLToPath(import.meta.url));
const root = resolve(folder, '../../..');
const hash = (b) => createHash('sha256').update(b).digest('hex');
const documents = [
  'README.md',
  'index.html',
  'manifest.json',
  'layout-briefs.json',
  'prompts.json',
  'generation-results.json',
  'provenance.json',
  'derivatives.json',
  'render-previews.mjs',
  'verify.mjs',
];
const themes = ['fpv', 'ukraine', 'retro'];
const slots = ['offset-docks', 'sandbar-braid', 'crossing-watch'];
const expectedIds = themes.flatMap((theme) =>
  slots.map((slot) => `countercurrent/${slot}/${theme}`),
);
async function bytes(file, maximum = 4 * 1024 * 1024) {
  const stat = await lstat(file);
  assert.ok(stat.isFile() && stat.size <= maximum, `Bounded ordinary file: ${file}`);
  const data = await readFile(file);
  assert.ok(data.length <= maximum);
  return data;
}
async function pin(relative) {
  const b = await bytes(resolve(folder, relative));
  return { path: relative, bytes: b.length, sha256: hash(b) };
}
async function inventory(directory, prefix = '') {
  const result = [];
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const relative = prefix + entry.name;
    if (entry.isDirectory()) {
      assert.ok(['originals', 'thumbnails'].includes(relative));
      result.push(...(await inventory(resolve(directory, entry.name), `${relative}/`)));
    } else {
      assert.ok(entry.isFile(), `No link or special file: ${relative}`);
      result.push(relative);
    }
  }
  return result.sort();
}
async function verify(toolOriginals) {
  const manifestRaw = await bytes(resolve(folder, 'manifest.json'));
  assert.equal(
    hash(manifestRaw),
    '27f31bdaa91db438066107e221ed77f16ad5325873b1512566edb7881475e6b1',
  );
  const cells = JSON.parse(manifestRaw).images;
  const readJSON = async (p) => JSON.parse(await bytes(resolve(folder, p)));
  const provenance = await readJSON('provenance.json');
  const prompts = await readJSON('prompts.json');
  const generated = await readJSON('generation-results.json');
  const derivatives = await readJSON('derivatives.json');
  const layoutRaw = await bytes(resolve(folder, 'layout-briefs.json'));
  assert.equal(hash(layoutRaw), '697a54b85573fc13e2604c2eb5cc8f192fed43036f42a4927b98be2ecb3f3435');
  assert.equal(provenance.baseCommit, '58f96f3fa0189d60230d4797b4d456b1804167fa');
  assert.equal(provenance.format, 'revealline-source-art-provenance.v1');
  assert.equal(prompts.format, 'revealline-source-art-prompts.v1');
  assert.equal(generated.format, 'revealline-source-art-generation-results.v1');
  for (const doc of [provenance, prompts, generated]) {
    assert.equal(doc.tool, 'image_gen.imagegen built-in');
    assert.equal(doc.calls, 12);
  }
  for (const list of [
    cells,
    provenance.images,
    prompts.prompts,
    generated.generated,
    derivatives.images,
  ])
    assert.deepEqual(
      list.map((r) => r.cellId),
      expectedIds,
    );
  assert.deepEqual(prompts.inputImages, []);
  assert.deepEqual(provenance.referenceImages, []);
  assert.deepEqual(provenance.pixelTransformations, []);
  assert.equal(provenance.rawOriginalsPreserved, true);
  assert.equal(provenance.editCalls, 0);
  assert.equal(generated.edits, 0);
  assert.equal(derivatives.format, 'revealline-source-art-derivatives.v1');
  assert.equal(derivatives.originalManifestSha256, hash(manifestRaw));
  assert.deepEqual(
    { ...derivatives.recipe, moduleSha256: undefined },
    {
      renderer: '@napi-rs/canvas',
      moduleSha256: undefined,
      operation: 'Full-frame proportional resample; imageSmoothingEnabled=false',
      width: 384,
      height: 192,
      format: 'jpeg',
      quality: 90,
      crop: false,
      originalChanges: false,
    },
  );
  assert.equal(typeof derivatives.recipe.moduleSha256, 'string');
  assert.match(derivatives.recipe.moduleSha256, /^[0-9a-f]{64}$/);
  assert.equal(MEDIA_LIMITS.assetBytes, 4 * 1024 * 1024);
  assert.equal(MEDIA_LIMITS.posterWidth, 1920);
  assert.equal(MEDIA_LIMITS.posterHeight, 1080);
  const context = [];
  assert.equal(provenance.contextPins.length, 38);
  for (const expected of provenance.contextPins) {
    assert.ok(!expected.path.startsWith('/') && !expected.path.split('/').includes('..'));
    const b = await bytes(resolve(root, expected.path));
    const actual = { path: expected.path, bytes: b.length, sha256: hash(b) };
    assert.deepEqual(actual, expected);
    context.push(actual);
  }
  const originals = [],
    thumbnails = [];
  for (const [i, cell] of cells.entries()) {
    const item = provenance.images[i],
      prompt = prompts.prompts[i],
      result = generated.generated[i];
    for (const [key, value] of Object.entries(cell)) assert.deepEqual(item[key], value);
    assert.equal(item.runtimeBinding, null);
    assert.equal(item.sourceBytesEqual, true);
    for (const key of [
      'cellId',
      'themeId',
      'missionSlot',
      'sourceLevelId',
      'title',
      'path',
      'promptSha256',
      'requestedDimensions',
    ])
      assert.deepEqual(prompt[key], cell[key]);
    assert.equal(cell.path, `originals/${cell.missionSlot}-${cell.themeId}.png`);
    assert.equal(cell.sourceLevelId, `countercurrent-${cell.missionSlot}`);
    assert.equal(hash(prompt.prompt), cell.promptSha256);
    assert.deepEqual(cell.requestedDimensions, { width: 1774, height: 887 });
    for (const key of [
      'cellId',
      'themeId',
      'missionSlot',
      'originalToolPath',
      'bytes',
      'sha256',
      'width',
      'height',
      'promptSha256',
      'requestedDimensions',
    ])
      assert.deepEqual(result[key], cell[key]);
    assert.equal(result.mode, 'generate');
    assert.equal(result.tool, 'image_gen.imagegen built-in');
    assert.deepEqual(result.inputImages, []);
    assert.equal(result.workspacePath, cell.path);
    assert.ok(result.outputHint.includes(` as ${cell.originalToolPath} by default.`));
    const b = await bytes(resolve(folder, cell.path));
    assert.equal(b.length, cell.bytes);
    assert.equal(hash(b), cell.sha256);
    if (toolOriginals) assert.deepEqual(await bytes(cell.originalToolPath), b);
    const image = decodeOriginalPNG(`data:image/png;base64,${b.toString('base64')}`);
    assert.equal(image.naturalWidth, cell.width);
    assert.equal(image.naturalHeight, cell.height);
    assert.equal(cell.width, 1774);
    assert.equal(cell.height, 887);
    originals.push({ cellId: cell.cellId, ...image, bytes: b.length, sha256: hash(b) });
    const thumb = derivatives.images[i];
    assert.equal(thumb.path, `thumbnails/${cell.missionSlot}-${cell.themeId}.jpg`);
    assert.equal(thumb.originalPath, cell.path);
    assert.equal(thumb.originalSha256, cell.sha256);
    assert.equal(thumb.mime, 'image/jpeg');
    assert.equal(thumb.width, 384);
    assert.equal(thumb.height, 192);
    assert.equal(typeof thumb.decodedRGBASha256, 'string');
    assert.match(thumb.decodedRGBASha256, /^[0-9a-f]{64}$/);
    const jpeg = await bytes(resolve(folder, thumb.path), 128 * 1024);
    assert.equal(jpeg.length, thumb.bytes);
    assert.equal(hash(jpeg), thumb.sha256);
    const header = inspectImageDataUrl(`data:image/jpeg;base64,${jpeg.toString('base64')}`);
    assert.ok(header.valid, header.errors.join('; '));
    assert.equal(header.width, 384);
    assert.equal(header.height, 192);
    thumbnails.push(thumb);
  }
  assert.equal(new Set(originals.map((r) => r.sha256)).size, 12);
  assert.equal(new Set(originals.map((r) => r.pixelsSha256)).size, 12);
  assert.equal(new Set(cells.map((r) => r.originalToolPath)).size, 12);
  const paths = [
    ...documents,
    ...cells.map((r) => r.path),
    ...thumbnails.map((r) => r.path),
  ].sort();
  assert.deepEqual(
    (await inventory(folder)).filter((p) => p !== 'verification.json'),
    paths,
  );
  const files = [];
  for (const p of paths) files.push(await pin(p));
  return {
    format: 'revealline-source-art-verification.v1',
    baseCommit: provenance.baseCommit,
    sourceCandidates: 12,
    newGeometries: 0,
    runtimeBindings: 0,
    totalOriginalBytes: originals.reduce((n, r) => n + r.bytes, 0),
    totalThumbnailBytes: thumbnails.reduce((n, r) => n + r.bytes, 0),
    originalMethod:
      'Unchanged bounded RGB8 PNG decoder: full chunk CRC/order, inflate and scanline reconstruction, exact original bytes/hash/dimensions. Record mode requires all default tool files to match.',
    thumbnailMethod:
      'Declared 384x192 proportional nearest-neighbor JPEG review copies; exact bytes/hash/header/source identity here. The recorded Canvas production run decoded every JPEG and recorded its RGBA hash; portable verification does not replay an optional platform encoder.',
    limits:
      'Authoring candidates only. No runtime/catalog/production-count adoption, native/partial-reveal/gameplay/animation/device/human quality or rights certification. Root visual review is separate.',
    files,
    originals,
    thumbnails,
    protectedContext: context,
  };
}
const args = process.argv.slice(2);
assert.equal(new Set(args).size, args.length);
assert.ok(args.every((a) => ['--record', '--tool-originals'].includes(a)));
assert.ok(!args.includes('--record') || args.includes('--tool-originals'));
const result = await verify(args.includes('--tool-originals'));
const file = resolve(folder, 'verification.json');
if (args.includes('--record'))
  await writeFile(file, `${JSON.stringify(result, null, 2)}\n`, { flag: 'wx' });
else assert.deepEqual(JSON.parse(await bytes(file)), result);
console.log(
  `PASS: ${result.sourceCandidates} originals / ${result.totalOriginalBytes} bytes; twelve review derivatives / ${result.totalThumbnailBytes} bytes.`,
);
