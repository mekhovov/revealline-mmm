import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { gunzipSync } from 'node:zlib';
const root = new URL('../', import.meta.url);
const hash = (bytes) => createHash('sha256').update(bytes).digest('hex');
test('original packed catalogs and recovery inputs remain exact and outside the playable app', async () => {
  const receipt = JSON.parse(
    await fs.readFile(new URL('migration/packed-localization-originals-receipt.json', root)),
  );
  assert.equal(receipt.format, 'coupa-packed-localization-originals.v1');
  assert.equal(receipt.files.length, 11);
  const paths = new Set();
  for (const row of receipt.files) {
    assert.equal(paths.has(row.path), false);
    paths.add(row.path);
    assert.equal(row.archivePath, `content/archive/packed-localization-20261020/${row.sha256}.gz`);
    assert.match(row.sourceRevision, /^[a-f0-9]{40}$/);
    assert.match(row.gitBlob, /^[a-f0-9]{40}$/);
    const zipped = await fs.readFile(new URL(row.archivePath, root));
    assert.equal(zipped.length, row.archiveBytes);
    assert.equal(hash(zipped), row.archiveSHA256);
    const original = gunzipSync(zipped, { maxOutputLength: 8 * 1024 * 1024 });
    assert.equal(original.length, row.bytes);
    assert.equal(hash(original), row.sha256);
    const gitHash = createHash('sha1')
      .update(`blob ${original.length}\0`)
      .update(original)
      .digest('hex');
    assert.equal(gitHash, row.gitBlob);
  }
  assert.equal(
    paths.has('docs/performance/fixtures/solo-replay-portability/node-1255-catalogs.fixture'),
    true,
  );
  await assert.rejects(fs.stat(new URL('app/content/archive/', root)), { code: 'ENOENT' });
});

test('original replay reference retains its historical catalog pin', async () => {
  const receipt = JSON.parse(
    await fs.readFile(new URL('migration/packed-localization-originals-receipt.json', root)),
  );
  const row = receipt.files.find((item) => item.path.endsWith('first-eight-39109911286.json'));
  const fixture = JSON.parse(
    gunzipSync(await fs.readFile(new URL(row.archivePath, root)), { maxOutputLength: 1024 * 1024 }),
  );
  assert.equal(fixture.nodeSourceRevision, '1255a79a90268316f8ea768d3e0c56610b26df52');
  assert.equal(fixture.nodeModules.length, 47);
  assert.equal(
    fixture.nodeModules.find((item) => item.path === 'game/i18n/catalogs.mjs').sha256,
    'ba333d67a719078e6fca92094bee9d60e7fdcfd2ed197adadefed115766e9224',
  );
  assert.equal(fixture.nodeSourceProjection, undefined);
});
