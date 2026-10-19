import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { gunzipSync } from 'node:zlib';

const root = new URL('../', import.meta.url);
const hash = (bytes) => createHash('sha256').update(bytes).digest('hex');
const verify = (row, bytes) => {
  assert.equal(bytes.length, row.bytes);
  assert.equal(hash(bytes), row.sha256);
  assert.equal(
    createHash('sha1').update(`blob ${bytes.length}\0`).update(bytes).digest('hex'),
    row.gitBlob,
  );
};

test('mixed historical records preserve every original byte before source projection', async () => {
  const receipt = JSON.parse(await readFile(new URL('migration/mixed-historical-records-receipt.json', root)));
  assert.equal(receipt.format, 'revealline-mixed-historical-records.v1');
  const expected = new Map(receipt.files.map((row) => [row.path, row]));
  assert.equal(expected.size, receipt.files.length);
  const seen = new Set();
  for (const archive of receipt.archives) {
    assert.match(archive.path, /^content\/archive\/mixed-historical-records\/records-\d{3}\.json\.gz$/);
    const compressed = await readFile(new URL(archive.path, root));
    assert.equal(compressed.length, archive.bytes);
    assert.equal(hash(compressed), archive.sha256);
    const bytes = gunzipSync(compressed, { maxOutputLength: 32 * 1024 * 1024 });
    assert.equal(bytes.length, archive.decodedBytes);
    const batch = JSON.parse(bytes);
    assert.equal(batch.format, 'revealline-mixed-historical-batch.v1');
    assert.equal(batch.files.length, archive.files);
    for (const { base64, ...row } of batch.files) {
      assert.equal(seen.has(row.path), false);
      seen.add(row.path);
      assert.deepEqual({ ...row, archive: archive.path }, expected.get(row.path));
      const original = Buffer.from(base64, 'base64');
      assert.equal(original.toString('base64'), base64);
      verify(row, original);
    }
  }
  for (const row of receipt.files.filter((row) => row.existingArchive)) {
    assert.match(row.existingArchive, /^content\/archive\/owned-source\//);
    assert.equal(row.existingArchive.split('/').includes('..'), false);
    assert.equal(seen.has(row.path), false);
    seen.add(row.path);
    verify(row, await readFile(new URL(row.existingArchive, root)));
  }
  assert.equal(seen.size, expected.size);
});
