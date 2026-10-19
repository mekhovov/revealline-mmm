import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { compileCollection } from '../authoring/collections/compile.mjs';

const root = new URL('../', import.meta.url);
const read = (file) => fs.readFile(new URL(file, root));
const json = async (file) => JSON.parse(await read(file));
const admission = await json('authoring/collections/inputs.json');
const live = await json('content/files/game/collections/catalog.json');
const report = [];
assert.deepEqual(
  admission.collections.map((c) => c.id),
  live.collections.map((c) => c.id),
);
for (const collection of admission.collections) {
  for (const file of [collection.source, collection.output])
    assert.match(
      file,
      /^content\/(?:archive\/supplemental|files\/game\/collections)\/[a-z-]+\/[a-z-]+\.json$/,
    );
  const bytes = await read(collection.source);
  assert.equal(createHash('sha256').update(bytes).digest('hex'), collection.sourceSHA256);
  const result = compileCollection(JSON.parse(bytes), collection);
  assert.deepEqual(
    result,
    await json(collection.output),
    `${collection.id}: native authoring differs`,
  );
  report.push({
    id: collection.id,
    missions: collection.levelIds.length,
    sourceSHA256: collection.sourceSHA256,
  });
}
console.log(
  `Verified ${report.length} locally authored collections / ${report.reduce((n, c) => n + c.missions, 0)} native missions.`,
);
