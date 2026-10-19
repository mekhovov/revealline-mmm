/** Bounded source-art verification; no image encoding or runtime adoption. */
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { lstat, readFile, readdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { decodeOriginalPNG } from '../four-worlds-chapters/verify-images.mjs';
import { MEDIA_LIMITS } from '../../../game/media-library.mjs';

const folder = fileURLToPath(new URL('./', import.meta.url));
const root = resolve(folder, '../../..');
const cells = [
  {
    cellId: 'fracture-lines/split-ring/coupa',
    themeId: 'coupa',
    missionSlot: 'split-ring',
    bytes: 3057159,
    sha256: 'd914da1caf4b59d1892603154514fc865db460595ce8929d43841f1fd94d4362',
    promptSha256: '55d7e92937b32c62e185572e63122936b235fb5cdeedf314db8f67cbec0f19bf',
    originalToolPath:
      '/Users/oleksandr.mekhovov/.codex/generated_images/01a09357-2b06-77f1-b001-1afd50d8bc73/exec-aed42171-7edf-4471-93af-1e26d34464b7.png',
    path: 'originals/split-ring-coupa.png',
    sourceLevelId: 'fracture-lines-split-ring',
  },
  {
    cellId: 'fracture-lines/fault-fan/coupa',
    themeId: 'coupa',
    missionSlot: 'fault-fan',
    bytes: 2950816,
    sha256: 'e857e9fe8f6876c1bdf628e39606dde1b9c6efa987d913cec2064b86bc530d70',
    promptSha256: 'fb216ef67f198207150c5f199c7aca4e9c2deb6daccc9e06b3fa85e57bb0187b',
    originalToolPath:
      '/Users/oleksandr.mekhovov/.codex/generated_images/01a09357-2b06-77f1-b001-1afd50d8bc73/exec-2d037eee-2de1-4d03-b782-b66df73ad548.png',
    path: 'originals/fault-fan-coupa.png',
    sourceLevelId: 'fracture-lines-fault-fan',
  },
  {
    cellId: 'fracture-lines/frayed-causeway/coupa',
    themeId: 'coupa',
    missionSlot: 'frayed-causeway',
    bytes: 2698848,
    sha256: 'b4b5d78c29a5bfa1345297baf28d8851fb81a51acbc86bd1926e428e4b9d23cb',
    promptSha256: '9776d111e2f3fb70d70061a57f313f6430bae2fe9a6ed83805d49949c20d56e0',
    originalToolPath:
      '/Users/oleksandr.mekhovov/.codex/generated_images/01a09357-2b06-77f1-b001-1afd50d8bc73/exec-5b00e88b-12f1-4bfa-b04d-d539dcedf321.png',
    path: 'originals/frayed-causeway-coupa.png',
    sourceLevelId: 'fracture-lines-frayed-causeway',
  },
];
const documents = [
  'README.md',
  'prompts.json',
  'generation-results.json',
  'provenance.json',
  'verify.mjs',
];
const hash = (value) => createHash('sha256').update(value).digest('hex');
async function bytes(path) {
  const info = await lstat(path);
  assert.ok(
    info.isFile() && info.size <= MEDIA_LIMITS.assetBytes,
    `Bounded ordinary file required: ${path}`,
  );
  const value = await readFile(path);
  assert.ok(value.length <= MEDIA_LIMITS.assetBytes);
  return value;
}
async function pin(path, displayPath = path) {
  const value = await bytes(path);
  return { path: displayPath, bytes: value.length, sha256: hash(value) };
}
async function inventory(path, prefix = '') {
  const files = [];
  for (const entry of await readdir(path, { withFileTypes: true })) {
    const relative = `${prefix}${entry.name}`;
    if (entry.isDirectory()) {
      assert.equal(relative, 'originals', 'Only the originals subdirectory is allowed.');
      files.push(...(await inventory(resolve(path, entry.name), `${relative}/`)));
    } else {
      assert.equal(entry.isFile(), true, `No symlink or special file: ${relative}`);
      files.push(relative);
    }
  }
  return files.sort();
}
async function verify(toolOriginals) {
  const provenance = JSON.parse(await bytes(resolve(folder, 'provenance.json')));
  const prompts = JSON.parse(await bytes(resolve(folder, 'prompts.json')));
  const generated = JSON.parse(await bytes(resolve(folder, 'generation-results.json')));
  assert.equal(provenance.format, 'revealline-source-art-provenance.v1');
  assert.equal(provenance.baseCommit, '3b2c01040e87b2b33950c9914825dc5f13d80e58');
  assert.equal(prompts.format, 'revealline-source-art-prompts.v1');
  assert.equal(generated.format, 'revealline-source-art-generation-results.v1');
  for (const document of [provenance, prompts, generated]) {
    assert.equal(document.tool, 'image_gen.imagegen built-in');
    assert.equal(document.calls, 3);
  }
  for (const entries of [provenance.images, prompts.prompts, generated.generated])
    assert.deepEqual(
      entries.map((item) => item.cellId),
      cells.map((cell) => cell.cellId),
    );
  assert.deepEqual(prompts.inputImages, []);
  assert.equal(generated.edits, 0);
  assert.equal(provenance.editCalls, 0);
  assert.deepEqual(provenance.referenceImages, []);
  assert.deepEqual(provenance.pixelTransformations, []);
  assert.equal(provenance.rawOriginalsPreserved, true);
  assert.equal(new Set(provenance.images.map((item) => item.originalToolPath)).size, 3);
  assert.equal(MEDIA_LIMITS.assetBytes, 4 * 1024 * 1024);
  assert.equal(MEDIA_LIMITS.posterWidth, 1920);
  assert.equal(MEDIA_LIMITS.posterHeight, 1080);
  const context = [];
  for (const expected of provenance.contextPins) {
    assert.ok(!expected.path.startsWith('/') && !expected.path.split('/').includes('..'));
    const actual = await pin(resolve(root, expected.path), expected.path);
    assert.deepEqual(actual, expected, `Pinned source context: ${expected.path}`);
    context.push(actual);
  }
  assert.equal(context.length, 15);
  const decoded = [];
  for (let i = 0; i < cells.length; i++) {
    const cell = cells[i],
      item = provenance.images[i],
      result = generated.generated[i];
    for (const key of [
      'cellId',
      'themeId',
      'missionSlot',
      'path',
      'sourceLevelId',
      'bytes',
      'sha256',
      'promptSha256',
      'originalToolPath',
    ])
      assert.equal(item[key], cell[key]);
    assert.equal(item.runtimeBinding, null);
    assert.equal(item.sourceBytesEqual, true);
    assert.equal(prompts.prompts[i].themeId, cell.themeId);
    assert.equal(prompts.prompts[i].missionSlot, cell.missionSlot);
    assert.equal(prompts.prompts[i].sourceLevelId, cell.sourceLevelId);
    assert.equal(prompts.prompts[i].path, cell.path);
    assert.equal(prompts.prompts[i].title, item.title);
    for (const key of ['cellId', 'themeId', 'missionSlot']) assert.equal(result[key], cell[key]);
    assert.equal(hash(prompts.prompts[i].prompt), item.promptSha256);
    assert.equal(result.mode, 'generate');
    assert.equal(result.tool, 'image_gen.imagegen built-in');
    assert.deepEqual(result.inputImages, []);
    assert.equal(result.workspacePath, cell.path);
    for (const key of ['bytes', 'sha256', 'promptSha256', 'originalToolPath'])
      assert.equal(result[key], item[key]);
    assert.ok(result.outputHint.includes(` as ${item.originalToolPath} by default.`));
    const value = await bytes(resolve(folder, cell.path));
    assert.equal(value.length, item.bytes);
    assert.equal(hash(value), item.sha256);
    assert.ok(value.length <= MEDIA_LIMITS.assetBytes);
    if (toolOriginals) {
      const original = await bytes(cell.originalToolPath);
      assert.deepEqual(original, value, 'Workspace copy equals untouched default tool output.');
    }
    const image = decodeOriginalPNG(`data:image/png;base64,${value.toString('base64')}`);
    assert.equal(item.width, 1774);
    assert.equal(item.height, 887);
    assert.equal(image.naturalWidth, item.width);
    assert.equal(image.naturalHeight, item.height);
    assert.ok(image.naturalWidth <= MEDIA_LIMITS.posterWidth);
    assert.ok(image.naturalHeight <= MEDIA_LIMITS.posterHeight);
    assert.equal(image.naturalWidth, image.naturalHeight * 2, 'Observed panorama ratio.');
    decoded.push({ cellId: cell.cellId, ...image, bytes: value.length, sha256: hash(value) });
  }
  assert.equal(new Set(decoded.map((image) => image.sha256)).size, 3);
  assert.equal(new Set(decoded.map((image) => image.pixelsSha256)).size, 3);
  const paths = [...documents, ...cells.map((cell) => cell.path)];
  const actualPaths = (await inventory(folder)).filter((path) => path !== 'verification.json');
  assert.deepEqual(
    actualPaths,
    [...paths].sort(),
    'Exactly three originals and six documents including the separate verification receipt.',
  );
  const files = [];
  for (const path of paths) files.push(await pin(resolve(folder, path), path));
  return {
    format: 'revealline-source-art-verification.v1',
    baseCommit: provenance.baseCommit,
    sourceCandidates: 3,
    newGeometries: 0,
    totalOriginalBytes: decoded.reduce((sum, image) => sum + image.bytes, 0),
    method:
      'Exact SHA/bytes; all PNG chunk CRCs, bounded full RGB8 scanline decompression and filters; existing unchanged decoder; no output image transformations.',
    originalCopyEvidence:
      'Recording requires --tool-originals and byte equality with all three untouched default tool files. Portable verification checks workspace/source pins; --tool-originals repeats local copy comparison.',
    visualReview:
      'All three actual images visually inspected by the authoring agent. Per-image observations and deviations are in provenance and README; root visual review is separate.',
    limits:
      'Source-art checks only; no browser/pack/storage/offline/gameplay/device/animation or rights certification.',
    files,
    decoded,
    protectedContext: context,
  };
}

const args = process.argv.slice(2);
assert.equal(new Set(args).size, args.length);
assert.ok(args.every((arg) => ['--record', '--tool-originals'].includes(arg)));
assert.ok(
  !args.includes('--record') || args.includes('--tool-originals'),
  'Recording requires original-copy verification.',
);
const result = await verify(args.includes('--tool-originals'));
const report = resolve(folder, 'verification.json');
if (args.includes('--record')) {
  await writeFile(report, `${JSON.stringify(result, null, 2)}\n`, { flag: 'wx' });
} else {
  assert.deepEqual(JSON.parse(await bytes(report)), result, 'Source-art receipt differs.');
}
console.log(
  `PASS: ${result.sourceCandidates} original PNGs, ${result.totalOriginalBytes} bytes; exact source/context pins and bounded full RGB checks match.`,
);
