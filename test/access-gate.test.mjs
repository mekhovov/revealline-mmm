import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const read = (name) => readFile(new URL(name, import.meta.url), 'utf8');

test('every Coupa entry waits for the remembered access gate', async () => {
  const [root, game, company, versus, team, boot, companyEntry, versusEntry, teamEntry, gate] = await Promise.all([
    read('../app/index.html'),
    read('../app/game/index.html'),
    read('../app/game/company.html'),
    read('../app/game/couch/index.html'),
    read('../app/game/couch/relay-rescue.html'),
    read('../app/game/boot.mjs'),
    read('../app/game/company-entry.mjs'),
    read('../app/game/couch/couch.mjs'),
    read('../app/game/couch/relay-rescue.mjs'),
    read('../app/game/access-gate.mjs'),
  ]);
  for (const source of [root, game, company, versus, team]) {
    assert.match(source, /data-access-state="locked"/);
    assert.match(source, /1zbNkPra4ctJvw3ZJjCsoHQqwPRfKAxj-mV9WBUyLEw/);
  }
  assert.match(root, /await globalThis\.RevealLineAccess\?\.ready/);
  assert.match(boot, /await (?:globalThis|host)\.RevealLineAccess\?\.ready/);
  assert.match(companyEntry, /await globalThis\.RevealLineAccess\?\.ready/);
  assert.match(versusEntry, /await globalThis\.RevealLineAccess\?\.ready/);
  assert.match(teamEntry, /await globalThis\.RevealLineAccess\?\.ready/);
  assert.match(gate, /localStorage\?\.setItem/);
});


test('Snake and native collections retain one gate and await access before starting', async () => {
  for (const file of ['snake/index.html','snake/play.html','collections/index.html','couch/index.html','couch/relay-rescue.html']) {
    const source=await read('../app/game/'+file);
    assert.equal((source.match(/data-access-state="locked"/g)??[]).length,1,file);
    assert.equal((source.match(/name="revealline-access-id"/g)??[]).length,1,file);
    assert.match(source,/revealline-mmm/);
  }
  for (const file of ['snake/coupa-snake.mjs','collections/coupa-collections.mjs'])
    assert.match(await read('../app/game/'+file),/await globalThis\.RevealLineAccess\?\.ready/);
});
