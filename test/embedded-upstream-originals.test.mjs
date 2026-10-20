import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { gunzipSync } from 'node:zlib';

const root = new URL('../', import.meta.url);
const sha = (bytes) => createHash('sha256').update(bytes).digest('hex');

test('compact upstream archive preservation accounts for every unique original and member path', async () => {
  const receipt = JSON.parse(
    await fs.readFile(new URL('migration/embedded-upstream-20261020-receipt.json', root)),
  );
  assert.equal(receipt.format, 'revealline-embedded-upstream-originals.v1');
  assert.match(receipt.sourceRevision, /^[a-f0-9]{40}$/);
  assert.equal(receipt.archives.length, 21);
  assert.equal(receipt.leaves.length, 42);
  assert.equal(receipt.files.length, 354);
  const archives = new Set(), leaves = new Map(), paths = new Set(), used = new Set();
  for (const row of receipt.archives) {
    assert.match(row.sourcePath, /^docs\/[a-zA-Z0-9_./-]+\.tgz$/);
    assert.equal(row.sourcePath.split('/').includes('..'), false);
    assert.equal(archives.has(row.sourcePath), false);
    assert.match(row.sha256, /^[a-f0-9]{64}$/);
    assert.match(row.gitBlob, /^[a-f0-9]{40}$/);
    assert.ok(Number.isSafeInteger(row.bytes) && row.bytes > 0);
    archives.add(row.sourcePath);
  }
  for (const row of receipt.leaves) {
    assert.equal(row.path, `content/archive/embedded-upstream-20261020/${row.rawSHA256}.gz`);
    assert.match(row.rawSHA256, /^[a-f0-9]{64}$/);
    assert.equal(leaves.has(row.rawSHA256), false);
    const bytes = await fs.readFile(new URL(row.path, root));
    assert.equal(bytes.length, row.archiveBytes);
    assert.equal(sha(bytes), row.archiveSHA256);
    const raw = gunzipSync(bytes, { maxOutputLength: 64 * 1024 * 1024 });
    assert.equal(raw.length, row.rawBytes);
    assert.equal(sha(raw), row.rawSHA256);
    leaves.set(row.rawSHA256, row);
  }
  for (const row of receipt.files) {
    assert.ok(archives.has(row.sourceArchive));
    assert.ok(row.member.startsWith(`${row.sourceArchive}!`));
    assert.equal(row.member.split(/[!/]/).includes('..'), false);
    assert.equal(paths.has(row.member), false);
    assert.ok(leaves.has(row.rawSHA256));
    assert.equal(row.rawBytes, leaves.get(row.rawSHA256).rawBytes);
    assert.ok(['owned-name', 'owned-content-or-dependency'].includes(row.reason));
    paths.add(row.member);
    used.add(row.rawSHA256);
  }
  assert.equal(used.size, leaves.size);
});
