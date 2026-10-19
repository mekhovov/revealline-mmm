import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import { createHash } from 'node:crypto';

const root = new URL('../', import.meta.url);
test('embedded historical originals retain exact bytes and every recorded source path', async () => {
  const receipt = JSON.parse(
    await fs.readFile(new URL('migration/embedded-historical-records-receipt.json', root)),
  );
  assert.equal(receipt.format, 'revealline-embedded-historical-originals.v1');
  assert.match(receipt.sourceRevision, /^[a-f0-9]{40}$/);
  assert.equal(receipt.archives.length, 113);
  assert.equal(receipt.files.length, 123);
  const archives = new Map();
  for (const row of receipt.archives) {
    assert.match(
      row.path,
      /^content\/archive\/embedded-historical-records\/[a-f0-9]{64}\.(zip|gz)$/,
    );
    assert.equal(archives.has(row.path), false);
    const bytes = await fs.readFile(new URL(row.path, root));
    assert.equal(bytes.length, row.bytes);
    assert.equal(createHash('sha256').update(bytes).digest('hex'), row.sha256);
    assert.equal(
      createHash('sha1').update(`blob ${bytes.length}\0`).update(bytes).digest('hex'),
      row.gitBlob,
    );
    assert.ok(
      row.path.endsWith('.zip')
        ? bytes.subarray(0, 4).equals(Buffer.from('504b0304', 'hex'))
        : bytes.subarray(0, 2).equals(Buffer.from('1f8b', 'hex')),
    );
    archives.set(row.path, row);
  }
  const names = new Set(),
    used = new Set();
  for (const row of receipt.files) {
    assert.match(row.sourcePath, /^(docs|recovery)\//);
    assert.equal(row.sourcePath.split('/').includes('..'), false);
    assert.equal(names.has(row.sourcePath), false);
    names.add(row.sourcePath);
    const archive = archives.get(row.archive);
    assert.ok(archive);
    for (const key of ['sha256', 'gitBlob', 'bytes']) assert.equal(row[key], archive[key]);
    used.add(row.archive);
  }
  assert.equal(used.size, archives.size);
});
