import test from 'node:test';
import assert from 'node:assert/strict';
import {
  readFile,
  writeFile,
  mkdir,
  mkdtemp,
  rm,
  copyFile,
  symlink,
  readdir,
} from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import os from 'node:os';
import { fileURLToPath } from 'node:url';
import { buildWorkshopPack, WORKSHOP_BASELINE, WORKSHOP_PICTURES } from './build-workshop-pack.mjs';
import { CONTENT_LIMITS, inspectImageDataUrl } from '../game/content.mjs';
import { PACK_LIMITS, validatePack } from '../game/packs.mjs';

const ROOT = fileURLToPath(new URL('../', import.meta.url));
const SOURCE = 'authoring/library/equipment-workshop';
const OUTPUT = 'game/content/packs/equipment-workshop.json';
const sha = (bytes) => createHash('sha256').update(bytes).digest('hex');
const baselineBytes = await readFile(path.join(ROOT, WORKSHOP_BASELINE.path));
const sourceBytes = await readFile(path.join(ROOT, SOURCE, 'pack-source.json'));
// The selected original Workshop PNGs, copied only into temporary filesystem
// fixtures. Byte/header checks remain separate from browser decoding and play.
const fixtureImages = await Promise.all(
  WORKSHOP_PICTURES.map(({ levelId }) =>
    readFile(path.join(ROOT, SOURCE, 'backgrounds', `${levelId}.png`)),
  ),
);

async function fixture(t) {
  const root = await mkdtemp(path.join(os.tmpdir(), 'workshop-builder-'));
  t.after(() => rm(root, { recursive: true, force: true }));
  await mkdir(path.join(root, SOURCE, 'previous'), { recursive: true });
  await mkdir(path.join(root, SOURCE, 'backgrounds'));
  await mkdir(path.join(root, 'game/content/packs'), { recursive: true });
  await writeFile(path.join(root, WORKSHOP_BASELINE.path), baselineBytes);
  await writeFile(path.join(root, SOURCE, 'pack-source.json'), sourceBytes);
  await writeFile(path.join(root, OUTPUT), baselineBytes);
  for (const [i, picture] of WORKSHOP_PICTURES.entries())
    await writeFile(
      path.join(root, SOURCE, 'backgrounds', `${picture.levelId}.png`),
      fixtureImages[i],
    );
  const image = (index) =>
    path.join(root, SOURCE, 'backgrounds', `${WORKSHOP_PICTURES[index].levelId}.png`);
  return { root, image, output: path.join(root, OUTPUT) };
}
async function unchangedOutput(f) {
  assert.deepEqual(await readFile(f.output), baselineBytes);
  assert.deepEqual(await readdir(path.dirname(f.output)), ['equipment-workshop.json']);
}

test('source baseline pins exact frozen bytes while source recipe changes only pack semver', () => {
  assert.equal(baselineBytes.length, WORKSHOP_BASELINE.bytes);
  assert.equal(sha(baselineBytes), WORKSHOP_BASELINE.sha256);
  assert.deepEqual(JSON.parse(sourceBytes), { ...JSON.parse(baselineBytes), version: '1.1.0' });
  assert.ok(Object.isFrozen(WORKSHOP_PICTURES) && WORKSHOP_PICTURES.every(Object.isFrozen));
});

test('default check preserves stale output; explicit write embeds exact bytes and allows semantic formatting', async (t) => {
  const f = await fixture(t);
  await assert.rejects(buildWorkshopPack({ root: f.root }), /Run --write/);
  await unchangedOutput(f);
  const { pack, report } = await buildWorkshopPack({ root: f.root, write: true });
  assert.equal(validatePack(pack).valid, true);
  assert.equal(report.version, '1.1.0');
  assert.equal(report.wrote, true);
  assert.equal(report.encodedPackBytes, (await readFile(f.output)).length);
  assert.equal(report.outputSha256, sha(await readFile(f.output)));
  assert.equal(
    report.rawArtworkBytes,
    fixtureImages.reduce((total, bytes) => total + bytes.length, 0),
  );
  assert.ok(report.encodedArtworkChars <= CONTENT_LIMITS.maxCombinedImageChars);
  assert.ok(report.decodedArtworkPixels <= CONTENT_LIMITS.maxCombinedImagePixels);
  assert.ok(report.encodedPackBytes <= PACK_LIMITS.maxBytes && report.under12MiBTarget);
  assert.equal(new Set(report.backgrounds.map(({ sha256 }) => sha256)).size, 3);
  for (const [i, item] of pack.levelVisuals.entries()) {
    const descriptor = item.visualOverrides.background;
    assert.equal(item.levelId, WORKSHOP_PICTURES[i].levelId);
    assert.equal(descriptor.name, WORKSHOP_PICTURES[i].title);
    assert.equal(descriptor.fit, 'contain');
    assert.deepEqual(Buffer.from(descriptor.dataUrl.split(',')[1], 'base64'), fixtureImages[i]);
    assert.deepEqual(await readFile(f.image(i)), fixtureImages[i]);
    const header = inspectImageDataUrl(descriptor.dataUrl);
    assert.equal(header.valid, true);
    assert.equal(header.width * 3, header.height * 4);
    assert.equal(report.backgrounds[i].sha256, sha(fixtureImages[i]));
    assert.equal(report.backgrounds[i].width, header.width);
    assert.equal(report.backgrounds[i].height, header.height);
  }
  assert.deepEqual(await readFile(path.join(f.root, WORKSHOP_BASELINE.path)), baselineBytes);
  assert.deepEqual(await readFile(path.join(f.root, SOURCE, 'pack-source.json')), sourceBytes);
  const formattedDifferently = Buffer.from(JSON.stringify(pack));
  await writeFile(f.output, formattedDifferently);
  const check = await buildWorkshopPack({ root: f.root });
  assert.equal(check.report.wrote, false);
  assert.equal(check.report.outputSha256, sha(formattedDifferently));
  assert.equal(check.report.generatedSha256, report.generatedSha256);
  assert.deepEqual(await readFile(f.output), formattedDifferently);
  assert.deepEqual(await readdir(path.dirname(f.output)), ['equipment-workshop.json']);
});

test('baseline alteration and a gameplay change are rejected before the generated output is touched', async (t) => {
  const f = await fixture(t);
  await writeFile(
    path.join(f.root, WORKSHOP_BASELINE.path),
    Buffer.concat([baselineBytes, Buffer.from('\n')]),
  );
  await assert.rejects(buildWorkshopPack({ root: f.root, write: true }), /exact frozen bytes/);
  await unchangedOutput(f);
  await writeFile(path.join(f.root, WORKSHOP_BASELINE.path), baselineBytes);
  const changed = JSON.parse(sourceBytes);
  changed.campaigns[0].levels[0].name = 'Changed gameplay identity';
  await writeFile(path.join(f.root, SOURCE, 'pack-source.json'), JSON.stringify(changed));
  await assert.rejects(buildWorkshopPack({ root: f.root, write: true }), /change only version/);
  await unchangedOutput(f);
});

test('missing, empty, oversized and non-PNG originals fail without overwriting an old edition', async (t) => {
  const f = await fixture(t);
  await rm(f.image(0));
  await assert.rejects(buildWorkshopPack({ root: f.root, write: true }), /ENOENT/);
  await unchangedOutput(f);
  for (const [bytes, message] of [
    [Buffer.alloc(0), /empty/],
    [Buffer.alloc(CONTENT_LIMITS.maxImageBytes + 1), /byte budget/],
    [Buffer.from('not a PNG'), /PNG signature/],
  ]) {
    await writeFile(f.image(0), bytes);
    await assert.rejects(buildWorkshopPack({ root: f.root, write: true }), message);
    await unchangedOutput(f);
  }
});

test('duplicate artwork, wrong aspect and excessive header dimensions are rejected semantically', async (t) => {
  const f = await fixture(t);
  await copyFile(f.image(0), f.image(1));
  await assert.rejects(
    buildWorkshopPack({ root: f.root, write: true }),
    /distinct original picture hash/,
  );
  await unchangedOutput(f);
  await writeFile(f.image(1), fixtureImages[1]);
  // Negative metadata fixtures only: these deliberately changed headers are
  // never decoded, accepted, exported as art or written to source originals.
  for (const [width, height, message] of [
    [1000, 1000, /4:3/],
    [9000, 6750, /8192/],
  ]) {
    const bytes = Buffer.from(fixtureImages[0]);
    bytes.writeUInt32BE(width, 16);
    bytes.writeUInt32BE(height, 20);
    await writeFile(f.image(0), bytes);
    await assert.rejects(buildWorkshopPack({ root: f.root, write: true }), message);
    await unchangedOutput(f);
  }
});

test('combined image pixels are bounded even when each distinct header fits its own limit', async (t) => {
  const f = await fixture(t);
  for (const [i, original] of fixtureImages.entries()) {
    const bytes = Buffer.from(original);
    bytes.writeUInt32BE(4000, 16);
    bytes.writeUInt32BE(3000, 20);
    await writeFile(f.image(i), bytes);
  }
  await assert.rejects(
    buildWorkshopPack({ root: f.root, write: true }),
    /combined encoded or decoded pixel budget/,
  );
  await unchangedOutput(f);
});

test('symlinked input, source directory or output cannot redirect builder reads or writes', async (t) => {
  const f = await fixture(t);
  const outside = path.join(f.root, 'outside.png');
  await writeFile(outside, fixtureImages[0]);
  await rm(f.image(0));
  await symlink(outside, f.image(0));
  await assert.rejects(buildWorkshopPack({ root: f.root, write: true }), /regular file/);
  await unchangedOutput(f);
  await rm(f.image(0));
  await writeFile(f.image(0), fixtureImages[0]);
  const directory = path.join(f.root, SOURCE, 'backgrounds');
  const relocated = path.join(f.root, 'original-backgrounds');
  await mkdir(relocated);
  await rm(directory, { recursive: true });
  await symlink(relocated, directory, 'dir');
  await assert.rejects(buildWorkshopPack({ root: f.root, write: true }), /regular directory/);
  await unchangedOutput(f);
  await rm(directory);
  await mkdir(directory);
  for (const [i, bytes] of fixtureImages.entries()) await writeFile(f.image(i), bytes);
  await rm(f.output);
  await symlink(outside, f.output);
  await assert.rejects(
    buildWorkshopPack({ root: f.root, write: true }),
    /output must be a regular file/,
  );
  assert.deepEqual(await readFile(outside), fixtureImages[0]);
});

test('missing output is not created by check; explicit write and CLI options are deliberate', async (t) => {
  const f = await fixture(t);
  await rm(f.output);
  await assert.rejects(buildWorkshopPack({ root: f.root }), /missing.*--write/);
  assert.deepEqual(await readdir(path.dirname(f.output)), []);
  await buildWorkshopPack({ root: f.root, write: true });
  assert.deepEqual(await readdir(path.dirname(f.output)), ['equipment-workshop.json']);
  await assert.rejects(buildWorkshopPack({ root: f.root, write: 'yes' }), /boolean/);
  const before = await readFile(path.join(ROOT, OUTPUT));
  for (const args of [['--help'], ['--write', '--write'], ['--out', 'elsewhere.json']]) {
    const result = spawnSync(process.execPath, ['scripts/build-workshop-pack.mjs', ...args], {
      cwd: ROOT,
      encoding: 'utf8',
      maxBuffer: 8192,
    });
    assert.notEqual(result.status, 0);
    assert.match(result.stderr, /Usage:/);
  }
  assert.deepEqual(await readFile(path.join(ROOT, OUTPUT)), before);
});
