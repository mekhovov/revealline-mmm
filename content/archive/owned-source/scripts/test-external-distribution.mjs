import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile, writeFile, mkdir, mkdtemp, realpath, rm, symlink } from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';
import { JOURNEY_ART_CANDIDATES } from '../game/content-design/journey-art.mjs';
import { buildProject, readBuildConfig } from './game-cli.mjs';
import {
  readExternalDistributionEntries,
  validateExternalDistributionConfig,
} from './external-distribution.mjs';
import { EXTERNAL_CATALOG } from '../game/external-chapter-catalog.mjs';
import { SOURCE_EXTERNAL_CHAPTERS } from '../game/external-chapter-source.mjs';
import {
  preparePack,
  emptyPackLibrary,
  installPack,
  exportPackLibrary,
  PACK_LIMITS,
} from '../game/packs.mjs';
const source = fileURLToPath(new URL('../', import.meta.url));
const option = {
  format: 'revealline-external-distribution.v1',
  catalog: 'game/content/external-worlds.json',
};
const sha = (b) => createHash('sha256').update(b).digest('hex');
async function directory(t) {
  const p = await realpath(await mkdtemp(path.join(os.tmpdir(), 'revealline-external-build-')));
  t.after(() => rm(p, { recursive: true, force: true }));
  return p;
}

test('absent opt-in leaves old builds byte-identical and never reads external source', async (t) => {
  const dir = await directory(t),
    root = path.join(dir, 'source'),
    out = path.join(dir, 'out');
  await mkdir(path.join(root, 'game'), { recursive: true });
  await writeFile(
    path.join(root, 'game/index.html'),
    '<html><head></head><body>Old source</body></html>',
  );
  await writeFile(
    path.join(root, 'game/build-config.json'),
    JSON.stringify({ version: 'fixture', entry: 'game/index.html', include: ['game'] }),
  );
  await buildProject({ root, out });
  const before = await readFile(path.join(out, 'distribution.zip'));
  await mkdir(path.join(root, 'optional'), { recursive: true });
  await writeFile(path.join(root, 'optional', 'media.rlmedia'), 'excluded malformed source');
  await buildProject({ root, out });
  assert.deepEqual(await readFile(path.join(out, 'distribution.zip')), before);
  assert.deepEqual(await readExternalDistributionEntries('/not-present'), []);
  for (const bad of [
    null,
    {},
    { ...option, format: 'revealline-external-distribution.v2' },
    { ...option, catalog: '../external.json' },
    { ...option, extra: true },
  ])
    assert.throws(() => validateExternalDistributionConfig(bad));
});

test('catalog symlink and missing catalog refuse before source compiler import or output creation', async (t) => {
  const dir = await directory(t),
    root = path.join(dir, 'source');
  await mkdir(path.join(root, 'game/content'), { recursive: true });
  await assert.rejects(readExternalDistributionEntries(root, option), /ENOENT/);
  await symlink(path.join(source, option.catalog), path.join(root, option.catalog));
  await assert.rejects(readExternalDistributionEntries(root, option), /symbolic links/);
});

test('explicit real-source build ships thirty-two exact generated bodies once in loose/ZIP/manifest and excludes them from all core metadata', async (t) => {
  const dir = await directory(t),
    out = path.join(dir, 'out');
  await buildProject({
    root: source,
    out,
    version: 'external-check',
    sourceRevision: 'd'.repeat(40),
  });
  const manifest = JSON.parse(await readFile(path.join(out, 'manifest.json'))),
    offline = JSON.parse(await readFile(path.join(out, 'offline-cache.json'))),
    zip = await readFile(path.join(out, 'distribution.zip'));
  const wanted = new Map(
      EXTERNAL_CATALOG.chapters.flatMap((c) => ['pack', 'media'].map((k) => [c[k].path, c[k]])),
    ),
    bodies = new Map(),
    bodySizes = [];
  assert.equal(SOURCE_EXTERNAL_CHAPTERS.length, 16);
  assert.equal(wanted.size, 32);
  for (const [name, pin] of wanted) {
    const records = manifest.files.filter((f) => f.path === name);
    assert.equal(records.length, 1);
    assert.equal(records[0].bytes, pin.bytes);
    assert.equal(records[0].sha256, pin.sha256);
    const bytes = await readFile(path.join(out, name));
    bodySizes.push(bytes.length);
    if (name.endsWith('/pack.json')) bodies.set(name, bytes);
    assert.equal(bytes.length, pin.bytes);
    assert.equal(sha(bytes), pin.sha256);
    assert(!offline.files.some((f) => f.path === name));
    assert(!offline.optionalPacks.some((f) => f.path === name));
  }
  assert.equal(bodySizes.length, 32);
  assert.equal(bodies.size, 16);
  // Journey originals remain exact release bodies but do not make preparation
  // promise that the online-only authored preview works without a connection.
  if (offline.optionalArtwork) {
    assert.equal(offline.optionalArtwork.availability, 'online-only');
    assert.equal(offline.optionalArtwork.count, JOURNEY_ART_CANDIDATES.length);
    assert.equal(
      offline.optionalArtwork.bytes,
      JOURNEY_ART_CANDIDATES.reduce((sum, asset) => sum + asset.bytes, 0),
    );
    for (const pin of offline.optionalArtwork.files) {
      assert.deepEqual(
        manifest.files.find((file) => file.path === pin.path),
        pin,
      );
      assert(!offline.files.some((file) => file.path === pin.path));
      assert.deepEqual(sha(await readFile(path.join(out, pin.path))), pin.sha256);
    }
    assert(offline.files.length <= 2000);
    assert(offline.files.reduce((total, file) => total + file.bytes, 0) <= 72 * 1024 * 1024);
  }
  // Preserve the exact historical cohorts formerly recompiled by each chapter test.
  // These are actual loose bytes already authenticated above, in catalog order.
  for (const [start, end, expected] of [
    [0, 32, 130442755],
    [0, 24, 98674097],
    [24, 32, 31768658],
    [0, 16, 64546929],
    [16, 24, 34127168],
    [0, 10, 41373627],
  ])
    assert.equal(
      bodySizes.slice(start, end).reduce((total, bytes) => total + bytes, 0),
      expected,
    );
  const counts = new Map();
  let offset = 0;
  while (zip.readUInt32LE(offset) === 0x04034b50) {
    assert.equal(zip.readUInt16LE(offset + 8), 0);
    const bytes = zip.readUInt32LE(offset + 18),
      n = zip.readUInt16LE(offset + 26),
      extra = zip.readUInt16LE(offset + 28),
      start = offset + 30 + n + extra,
      name = zip.subarray(offset + 30, offset + 30 + n).toString();
    if (wanted.has(name)) {
      counts.set(name, (counts.get(name) || 0) + 1);
      assert.equal(sha(zip.subarray(start, start + bytes)), wanted.get(name).sha256);
    }
    offset = start + bytes;
  }
  assert.equal(zip.readUInt32LE(offset), 0x02014b50);
  assert.equal(counts.size, 32);
  assert([...counts.values()].every((n) => n === 1));
  const legacy = JSON.parse(await readFile(path.join(source, 'game/content/optional-worlds.json')));
  for (const old of legacy.packs) {
    assert(offline.optionalPacks.some((f) => f.path === old.path));
    assert.equal(manifest.files.find((f) => f.path === old.path).sha256, old.sha256);
  }
  const coreConfig = await readBuildConfig(source);
  assert.equal(
    offline.optionalPacks.length,
    coreConfig.optionalOffline.length + legacy.packs.length,
  );
  const arcadePath = 'game/content/packs/fpv-arcade-r5.json';
  assert(offline.optionalPacks.some((entry) => entry.path === arcadePath));
  assert(!offline.files.some((entry) => entry.path === arcadePath));
  assert.equal(
    manifest.files.find((entry) => entry.path === arcadePath).sha256,
    sha(await readFile(path.join(source, arcadePath))),
  );
  assert(offline.files.some((f) => f.path === option.catalog));
  assert(offline.files.reduce((n, f) => n + f.bytes, 0) < 64 * 1048576);
  // The focused equipment fixture must not replace current-config inclusion coverage.
  const equipmentPath = 'game/content/packs/equipment-workshop.json';
  assert.deepEqual(
    await readFile(path.join(out, equipmentPath)),
    await readFile(path.join(source, equipmentPath)),
  );
  assert(offline.files.some((entry) => entry.path === equipmentPath));
  assert(offline.files.some((entry) => entry.path === 'game/content/packs/index.json'));
  assert(
    !manifest.files.some((f) =>
      /authoring\/library\/(route-worlds|external-chapter-pilot|ukraine-route-art|retro-route-art|spend-route-art|sentinel-circuit|sentinel-circuit-art|sentinel-circuit-external|sentinel-theme-art|sentinel-theme-chapters|fracture-lines|fracture-lines-art|fracture-lines-chapter|fracture-ukraine-art|fracture-retro-art|fracture-coupa-art|fracture-theme-chapters|countercurrent-chapters|countercurrent-art)\//.test(
        f.path,
      ),
    ),
  );
  const worker = await readFile(path.join(out, 'service-worker.js'), 'utf8');
  for (const name of wanted.keys())
    assert(
      !worker.includes(name),
      'No external body URL is registered in core or legacy worker metadata',
    );
  await t.test(
    'sixteen external choices plus five embedded choices do not relax twelve installed packs or evict owners',
    async () => {
      assert.equal(legacy.packs.length, 5);
      assert.equal(EXTERNAL_CATALOG.chapters.length + legacy.packs.length, 21);
      assert.equal(PACK_LIMITS.installed, 12);
      assert.equal(PACK_LIMITS.libraryBytes, 48 * 1024 * 1024);
      let installed = emptyPackLibrary();
      for (const item of EXTERNAL_CATALOG.chapters.slice(0, 12))
        installed = installPack(
          installed,
          (await preparePack(bodies.get(item.pack.path).toString())).pack,
        );
      const source = JSON.parse(bodies.get(EXTERNAL_CATALOG.chapters[5].pack.path));
      const value = structuredClone(source);
      value.id = 'capacity-control-thirteenth';
      value.campaigns[0].id = value.id;
      const { pack: refused } = await preparePack(value);
      const before = exportPackLibrary(installed);
      assert.throws(() => installPack(installed, refused), /At most 12/);
      assert.equal(exportPackLibrary(installed), before);
      assert.deepEqual(
        installed.packs.map((p) => p.id),
        SOURCE_EXTERNAL_CHAPTERS.slice(0, 12).map((d) => d.id),
      );
    },
  );
});
