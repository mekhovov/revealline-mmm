import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import { createHash } from 'node:crypto';

test('historical production checkpoints preserve exact original oracle bytes', async () => {
  const root = new URL('../', import.meta.url);
  const receipt = JSON.parse(
    await fs.readFile(new URL('migration/production-oracle-originals-receipt.json', root)),
  );
  assert.equal(receipt.format, 'revealline-preserved-production-oracles.v1');
  assert.equal(receipt.items.length, 19);
  const sources = new Set();
  for (const row of receipt.items) {
    assert.match(
      row.path,
      /^content\/archive\/production-oracle-originals\/production-[a-z0-9-]+\.json$/,
    );
    assert.match(row.sourcePath, /^game\/test\/fixtures\/production-[a-z0-9-]+\.json$/);
    assert.equal(sources.has(row.sourcePath), false);
    sources.add(row.sourcePath);
    const bytes = await fs.readFile(new URL(row.path, root));
    assert.equal(bytes.length, row.bytes);
    assert.equal(createHash('sha256').update(bytes).digest('hex'), row.sha256);
    assert.equal(
      createHash('sha1').update(`blob ${bytes.length}\0`).update(bytes).digest('hex'),
      row.gitBlob,
    );
    const original = JSON.parse(bytes);
    assert.deepEqual(original.provenance, row.sourceBundle);
    assert.match(row.derivedFixtureSHA256, /^[a-f0-9]{64}$/);
    assert.notEqual(row.sha256, row.derivedFixtureSHA256);
  }
});
