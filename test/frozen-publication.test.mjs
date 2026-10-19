import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { gunzipSync } from 'node:zlib';

const root = new URL('../', import.meta.url);
const sha = (bytes) => createHash('sha256').update(bytes).digest('hex');

test('archived frozen records reproduce their exact original bytes and Git identities', async () => {
  const receipt = JSON.parse(
    await readFile(new URL('migration/frozen-publication-receipt.json', root)),
  );
  assert.equal(receipt.format, 'revealline-frozen-owned-records.v1');
  assert.match(receipt.sourceRevision, /^[0-9a-f]{40}$/);
  const expected = new Map(receipt.files.map((row) => [row.path, row]));
  assert.equal(expected.size, receipt.files.length);
  const seen = new Set();
  for (const archive of receipt.archives) {
    assert.match(archive.path, /^content\/archive\/frozen-publication\/records-\d{3}\.json\.gz$/);
    const compressed = await readFile(new URL(archive.path, root));
    assert.equal(compressed.length, archive.bytes);
    assert.equal(sha(compressed), archive.sha256);
    const bytes = gunzipSync(compressed, { maxOutputLength: 32 * 1024 * 1024 });
    assert.equal(bytes.length, archive.decodedBytes);
    const batch = JSON.parse(bytes);
    assert.equal(batch.format, 'revealline-frozen-owned-record-batch.v1');
    assert.equal(batch.files.length, archive.files);
    for (const { base64, ...row } of batch.files) {
      assert.match(row.path, /^publishing\/pages-controller\/(metadata|evidence|delivery)\//);
      assert.equal(seen.has(row.path), false);
      seen.add(row.path);
      assert.deepEqual({ ...row, archive: archive.path }, expected.get(row.path));
      const original = Buffer.from(base64, 'base64');
      assert.equal(original.toString('base64'), base64);
      assert.equal(original.length, row.bytes);
      assert.equal(sha(original), row.sha256);
      assert.equal(
        createHash('sha1').update(`blob ${original.length}\0`).update(original).digest('hex'),
        row.gitBlob,
      );
    }
  }
  assert.equal(seen.size, expected.size);
});
