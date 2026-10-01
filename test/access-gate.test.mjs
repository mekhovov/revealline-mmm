import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const read = (name) => readFile(new URL(name, import.meta.url), 'utf8');

test('every Coupa entry waits for the remembered access gate', async () => {
  const [root, game, company, boot, companyEntry, gate] = await Promise.all([
    read('../app/index.html'),
    read('../app/game/index.html'),
    read('../app/game/company.html'),
    read('../app/game/boot.mjs'),
    read('../app/game/company-entry.mjs'),
    read('../app/game/access-gate.mjs'),
  ]);
  for (const source of [root, game, company]) {
    assert.match(source, /data-access-state="locked"/);
    assert.match(source, /1zbNkPra4ctJvw3ZJjCsoHQqwPRfKAxj-mV9WBUyLEw/);
  }
  assert.match(root, /await globalThis\.RevealLineAccess\?\.ready/);
  assert.match(boot, /await globalThis\.RevealLineAccess\?\.ready/);
  assert.match(companyEntry, /await globalThis\.RevealLineAccess\?\.ready/);
  assert.match(gate, /localStorage\?\.setItem/);
});
