import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
const root = new URL('../', import.meta.url);
const json = async (name) => JSON.parse(await readFile(new URL(name, root), 'utf8'));
test('every named ownership candidate is preserved with its original Git blob and byte hash', async () => {
  const inventory = await json('migration/upstream-inventory.json'),
    receipt = await json('migration/owned-source-receipt.json');
  const expected = inventory.items
    .filter((row) => row.reasons.includes('named-ownership-candidate'))
    .map((row) => row.path)
    .sort();
  assert.deepEqual(receipt.items.map((row) => row.sourcePath).sort(), expected);
  for (const row of receipt.items) {
    assert.ok(row.destination.startsWith('content/'));
    assert.ok(!row.destination.split('/').includes('..'));
    const bytes = await readFile(new URL(row.destination, root));
    assert.equal(bytes.length, row.bytes, row.sourcePath);
    assert.equal(createHash('sha256').update(bytes).digest('hex'), row.sha256, row.sourcePath);
    assert.equal(
      createHash('sha1')
        .update(Buffer.from(`blob ${bytes.length}\0`))
        .update(bytes)
        .digest('hex'),
      row.sourceGitBlob,
      row.sourcePath,
    );
  }
});

test('owned mission display numbers survive retirement from the shared registry', async () => {
  const receipt = await json('migration/level-numbering-receipt.json');
  const { officialLevelNumber, OFFICIAL_LEVEL_COUNT } = await import(
    '../app/game/level-numbering.mjs'
  );
  assert.equal(OFFICIAL_LEVEL_COUNT, 47);
  for (const entry of receipt.entries)
    assert.equal(officialLevelNumber(entry.key), entry.number, entry.key);
  for (const key of receipt.previouslyUnnumbered) assert.equal(officialLevelNumber(key), null);
  assert.equal(
    officialLevelNumber('["mission","journey-opening","prologue","first-return"]'),
    null,
  );
});

test('additional owned archives retain exact bytes and every selected reserve original', async () => {
  const receipt = await json('migration/additional-owned-source-receipt.json');
  const paths = new Set();
  for (const row of receipt.items) {
    assert.ok(row.destination.startsWith('content/archive/owned-source/'));
    assert.ok(!row.destination.split('/').includes('..'));
    assert.ok(!paths.has(row.sourcePath));
    paths.add(row.sourcePath);
    const bytes = await readFile(new URL(row.destination, root));
    assert.equal(bytes.length, row.bytes, row.sourcePath);
    assert.equal(createHash('sha256').update(bytes).digest('hex'), row.sha256, row.sourcePath);
    assert.equal(
      createHash('sha1')
        .update(Buffer.from(`blob ${bytes.length}\0`))
        .update(bytes)
        .digest('hex'),
      row.sourceGitBlob,
      row.sourcePath,
    );
  }
  const reserve = await json('content/archive/coupa-reserve-art.json');
  assert.equal(reserve.entries.length, 10);
  for (const entry of reserve.entries) {
    assert.equal(entry.themeId, 'coupa');
    const original = receipt.items.find((row) => row.sourcePath === entry.original.path);
    assert.ok(original, entry.id);
    assert.equal(original.sha256, entry.original.sha256, entry.id);
    assert.equal(original.sourceGitBlob, entry.original.gitBlob, entry.id);
    for (const prompt of entry.prompts) assert.ok(paths.has(prompt.path), prompt.path);
  }
});

test('mixed source fragments retain their verified source pointers and archive hashes', async () => {
  const receipt = await json('migration/mixed-source-receipt.json');
  let count = 0;
  for (const row of receipt.items) {
    assert.ok(row.destination.startsWith('content/archive/mixed-source/'));
    assert.ok(!row.destination.split('/').includes('..'));
    const bytes = await readFile(new URL(row.destination, root));
    assert.equal(bytes.length, row.bytes, row.sourcePath);
    assert.equal(createHash('sha256').update(bytes).digest('hex'), row.sha256, row.sourcePath);
    const archive = JSON.parse(bytes);
    assert.equal(archive.sourcePath, row.sourcePath);
    assert.equal(archive.sourceSHA256, row.sourceSHA256);
    assert.equal(archive.entries.length, row.entries);
    assert.match(archive.sourceRevision, /^[a-f0-9]{40}$/);
    assert.match(archive.sourceGitBlob, /^[a-f0-9]{40}$/);
    for (const entry of archive.entries) {
      assert.ok(entry.pointer.startsWith('/'));
      assert.ok(Object.hasOwn(entry, 'value'));
    }
    count += archive.entries.length;
  }
  assert.equal(count, receipt.entries);
});

test('owned presentation records retain every removed slot, recipe and binding', async () => {
  const receipt = await json('migration/presentation-source-receipt.json');
  const bytes = await readFile(new URL(receipt.destination, root));
  assert.equal(bytes.length, receipt.bytes);
  assert.equal(createHash('sha256').update(bytes).digest('hex'), receipt.sha256);
  const archive = JSON.parse(bytes);
  assert.equal(archive.sourceSHA256, receipt.sourceSHA256);
  assert.equal(archive.entries.length, receipt.entries);
  const slots = archive.entries.filter((row) => /^\/slots\/\d+$/.test(row.pointer));
  const assets = archive.entries.filter((row) => /^\/assets\/\d+$/.test(row.pointer));
  assert.equal(slots.length, receipt.slots);
  assert.equal(assets.length, receipt.assets);
  const slotIds = new Set(slots.map((row) => row.value.id));
  const assetIds = new Set(assets.map((row) => `${row.value.id}@${row.value.revision}`));
  for (const row of archive.entries.filter((row) => row.pointer.includes('/bindings/'))) {
    assert.ok(
      slotIds.has(row.pointer.split('/bindings/')[1].replaceAll('~1', '/').replaceAll('~0', '~')),
    );
    assert.ok(assetIds.has(`${row.value.id}@${row.value.revision}`));
  }
});

test('owned engine regressions and route proofs keep their recorded source identities', async () => {
  const receipt = await json('migration/owned-test-receipt.json');
  for (const row of receipt.items) {
    assert.ok(row.destination.startsWith('authoring/company/tests/'));
    const bytes = await readFile(new URL(row.destination, root));
    assert.equal(bytes.length, row.bytes, row.sourcePath);
    assert.equal(createHash('sha256').update(bytes).digest('hex'), row.sha256, row.sourcePath);
    if (row.sourceGitBlob)
      assert.equal(
        createHash('sha1')
          .update(Buffer.from(`blob ${bytes.length}\0`))
          .update(bytes)
          .digest('hex'),
        row.sourceGitBlob,
        row.sourcePath,
      );
    if (row.selectedRows) {
      const fixture = JSON.parse(bytes);
      assert.equal(fixture.rows.length, row.selectedRows);
      assert.ok(fixture.rows.every((route) => route.id.startsWith('coupa-')));
    }
  }
  assert.deepEqual(
    receipt.tests.sort(),
    receipt.items
      .filter((row) => row.sourcePath.endsWith('.test.mjs'))
      .map((row) => row.sourcePath)
      .sort(),
  );
});

test('published runtime excludes authoring transfer answers and retains its QR dependencies', async () => {
  for (const name of ['playtest-fixtures.mjs', 'lessons.mjs'])
    await assert.rejects(
      readFile(new URL(`../app/game/company-campaigns/${name}`, import.meta.url)),
      { code: 'ENOENT' },
    );
  for (const name of ['qrcodegen-1.8.0.mjs', 'qrcodegen-1.8.0.json', 'QRCODEGEN-LICENSE.txt'])
    assert.ok((await readFile(new URL(`../app/game/vendor/${name}`, import.meta.url))).length > 0);
});
