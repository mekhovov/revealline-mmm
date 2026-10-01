import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { mkdtemp, mkdir, writeFile, rm, symlink } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { assertGeneratedClean } from '../scripts/sync-upstream.mjs';

async function fixture(t) {
  const directory = await mkdtemp(path.join(os.tmpdir(), 'coupa-sync-test-'));
  t.after(() => rm(directory, { recursive: true, force: true }));
  const bytes = Buffer.from('export const selectedBrand = "coupa";\n');
  const file = path.join(directory, 'entry.mjs');
  await writeFile(file, bytes);
  return { directory, file, bytes, lock: { generatedFiles: [{
    path: 'entry.mjs', bytes: bytes.length,
    sha256: createHash('sha256').update(bytes).digest('hex'),
  }] } };
}

test('upstream sync accepts an unchanged generated tree', async (t) => {
  const f = await fixture(t);
  await assertGeneratedClean(f.directory, f.lock);
});

test('upstream sync refuses edited bytes even when their size is unchanged', async (t) => {
  const f = await fixture(t);
  await writeFile(f.file, f.bytes.toString().replace('coupa', 'other'));
  await assert.rejects(assertGeneratedClean(f.directory, f.lock), /was edited/);
});

test('upstream sync refuses files added outside its generated inventory', async (t) => {
  const f = await fixture(t);
  await writeFile(path.join(f.directory, 'local-work.mjs'), 'keep my work');
  await assert.rejects(assertGeneratedClean(f.directory, f.lock), /added or missing/);
});

test('upstream sync refuses deleted generated files and a missing owned tree', async (t) => {
  const f = await fixture(t);
  await rm(f.file);
  await assert.rejects(assertGeneratedClean(f.directory, f.lock), /added or missing/);
  await rm(f.directory, { recursive: true });
  await assert.rejects(assertGeneratedClean(f.directory, f.lock), /missing/);
});

test('first extraction accepts an empty destination but never replaces an unowned tree', async (t) => {
  const f = await fixture(t);
  await assert.rejects(assertGeneratedClean(f.directory, null), /no ownership manifest/);
  await rm(f.file);
  await assertGeneratedClean(f.directory, null);
  const missing = path.join(f.directory, 'new-app');
  await assertGeneratedClean(missing, null);
  await mkdir(missing);
  await assertGeneratedClean(missing, null);
});

test('upstream sync refuses symlinks instead of following them outside the generated tree', async (t) => {
  const f = await fixture(t);
  await symlink(f.file, path.join(f.directory, 'linked.mjs'));
  await assert.rejects(assertGeneratedClean(f.directory, f.lock), /symlinks/);
});
