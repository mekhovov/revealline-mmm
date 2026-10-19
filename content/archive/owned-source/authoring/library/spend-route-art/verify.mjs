/** Read-only source-art checks. No image encoding, pack mutation or runtime adoption. */
import assert from 'node:assert/strict';
import { readFile, writeFile, lstat } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';
import { decodeOriginalPNG } from '../four-worlds-chapters/verify-images.mjs';
import { MEDIA_LIMITS } from '../../../game/media-library.mjs';

const folder = fileURLToPath(new URL('./', import.meta.url));
const root = resolve(folder, '../../..');
const names = ['value-foundry', 'shared-harbor', 'network-garden'];
const hash = (bytes) => createHash('sha256').update(bytes).digest('hex');
async function bytes(path) {
  assert.equal((await lstat(path)).isFile(), true, `Ordinary file required: ${path}`);
  return readFile(path);
}
async function pin(path, displayPath = path) {
  const value = await bytes(path);
  return { path: displayPath, bytes: value.length, sha256: hash(value) };
}
async function verify() {
  const provenance = JSON.parse(await bytes(resolve(folder, 'provenance.json')));
  const prompts = JSON.parse(await bytes(resolve(folder, 'prompts.json')));
  const generated = JSON.parse(await bytes(resolve(folder, 'generation-results.json')));
  assert.deepEqual(
    provenance.images.map((image) => image.id),
    names,
  );
  assert.deepEqual(
    prompts.prompts.map((image) => image.id),
    names,
  );
  assert.deepEqual(
    generated.generated.map((image) => image.id),
    names,
  );
  assert.deepEqual(prompts.inputImages, []);
  assert.equal(generated.calls, 3);
  assert.equal(generated.edits, 0);
  const context = [];
  for (const expected of provenance.contextPins) {
    const actual = await pin(resolve(root, expected.path), expected.path);
    assert.deepEqual(actual, expected, `Pinned source context: ${expected.path}`);
    context.push(actual);
  }
  const decoded = [];
  for (let i = 0; i < names.length; i++) {
    const item = provenance.images[i];
    assert.equal(item.path, `originals/${names[i]}.png`);
    assert.equal(item.runtimeBinding, null);
    assert.equal(hash(prompts.prompts[i].prompt), item.promptSha256);
    const value = await bytes(resolve(folder, item.path));
    assert.equal(value.length, item.bytes);
    assert.equal(hash(value), item.sha256);
    assert.equal(generated.generated[i].sha256, item.sha256);
    assert.ok(value.length <= MEDIA_LIMITS.assetBytes);
    const image = decodeOriginalPNG(`data:image/png;base64,${value.toString('base64')}`);
    assert.equal(image.naturalWidth, item.width);
    assert.equal(image.naturalHeight, item.height);
    assert.ok(image.naturalWidth <= MEDIA_LIMITS.posterWidth);
    assert.ok(image.naturalHeight <= MEDIA_LIMITS.posterHeight);
    assert.ok(Math.abs(image.naturalWidth / image.naturalHeight - 16 / 9) < 0.001);
    decoded.push({ id: item.id, ...image, bytes: value.length, sha256: hash(value) });
  }
  const files = [];
  for (const path of [
    'README.md',
    'prompts.json',
    'generation-results.json',
    'provenance.json',
    'verify.mjs',
    ...names.map((name) => `originals/${name}.png`),
  ])
    files.push(await pin(resolve(folder, path), path));
  return {
    format: 'revealline-source-art-verification.v1',
    baseCommit: provenance.baseCommit,
    sourceCandidates: 3,
    totalOriginalBytes: decoded.reduce((sum, image) => sum + image.bytes, 0),
    method:
      'Exact SHA/bytes; all PNG chunk CRCs, bounded full RGB8 scanline decompression and filters; existing unchanged decoder; no output image transformations.',
    visualReview:
      'Each actual image inspected; root separately accepted source candidates. Detailed observations and limits are in provenance and README.',
    limits: 'No browser/pack/storage/offline/gameplay/device/animation or rights certification.',
    files,
    decoded,
    protectedContext: context,
  };
}

const args = process.argv.slice(2);
assert.ok(args.length === 0 || (args.length === 1 && args[0] === '--record'));
const result = await verify();
const report = resolve(folder, 'verification.json');
if (args[0] === '--record') {
  await writeFile(report, `${JSON.stringify(result, null, 2)}\n`, { flag: 'wx' });
} else {
  assert.deepEqual(JSON.parse(await bytes(report)), result, 'Source art receipt differs.');
}
console.log(
  `PASS: ${result.sourceCandidates} original PNGs, ${result.totalOriginalBytes} bytes; all source/context pins and bounded full RGB checks match.`,
);
