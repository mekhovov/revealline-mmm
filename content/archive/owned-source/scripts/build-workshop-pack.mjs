#!/usr/bin/env node
/** Embed three original PNGs without changing Workshop's gameplay identity. */
import assert from 'node:assert/strict';
import { constants } from 'node:fs';
import { lstat, open, realpath, rename, unlink } from 'node:fs/promises';
import { createHash, randomUUID } from 'node:crypto';
import { isDeepStrictEqual } from 'node:util';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { validatePack, PACK_LIMITS } from '../game/packs.mjs';
import { CONTENT_LIMITS, inspectImageDataUrl } from '../game/content.mjs';

const ROOT = path.resolve(fileURLToPath(new URL('../', import.meta.url)));
const SOURCE = 'authoring/library/equipment-workshop';
const OUTPUT = 'game/content/packs/equipment-workshop.json';
const SOURCE_BYTES = 64 * 1024;
const sha = (bytes) => createHash('sha256').update(bytes).digest('hex');
export const WORKSHOP_BASELINE = Object.freeze({
  path: `${SOURCE}/previous/equipment-workshop-1.0.0.json`,
  sourceRevision: '8fb6b5782a6fee85211b9bbbfb3d13a1d1a60c43',
  bytes: 18389,
  sha256: '91876d315417252a65a36b1a46f3f3e03737ec26ccc08224f52e9c376f76ea1a',
});
export const WORKSHOP_PICTURES = Object.freeze(
  [
    {
      levelId: 'workshop-01',
      title: 'Garden of Threads',
      description: 'Morning light fills an imagined Ukrainian craft courtyard.',
    },
    {
      levelId: 'workshop-02',
      title: 'Neon Switchboard',
      description: 'An imagined neighborhood computer and arcade room glows after school.',
    },
    {
      levelId: 'workshop-03',
      title: 'Clear Ledger',
      description: 'A miniature exchange city connects its workshops, warehouse and canal.',
    },
  ].map(Object.freeze),
);

async function localFile(root, relative) {
  const parts = relative.split('/');
  let current = root;
  for (const part of parts.slice(0, -1)) {
    current = path.join(current, part);
    const info = await lstat(current);
    assert.ok(info.isDirectory() && !info.isSymbolicLink(), `Use a regular directory: ${relative}`);
  }
  return path.join(current, parts.at(-1));
}
const sameFile = (a, b) =>
  a.dev === b.dev &&
  a.ino === b.ino &&
  a.size === b.size &&
  a.mtimeNs === b.mtimeNs &&
  a.ctimeNs === b.ctimeNs;

async function readRegular(filename, maximum, label) {
  const before = await lstat(filename, { bigint: true });
  assert.ok(before.isFile() && !before.isSymbolicLink(), `${label} must be a regular file.`);
  assert.ok(
    before.size > 0n && before.size <= BigInt(maximum),
    `${label} exceeds its byte budget or is empty.`,
  );
  const handle = await open(filename, constants.O_RDONLY | (constants.O_NOFOLLOW ?? 0));
  try {
    assert.ok(
      sameFile(before, await handle.stat({ bigint: true })),
      `${label} changed during reading.`,
    );
    // The extra byte detects growth without allocating an unbounded readFile buffer.
    const buffer = Buffer.alloc(Number(before.size) + 1);
    let length = 0;
    while (length < buffer.length) {
      const { bytesRead } = await handle.read(buffer, length, buffer.length - length, null);
      if (!bytesRead) break;
      length += bytesRead;
    }
    const after = await handle.stat({ bigint: true });
    const current = await lstat(filename, { bigint: true });
    assert.ok(
      length === Number(before.size) && sameFile(before, after) && sameFile(before, current),
      `${label} changed during reading.`,
    );
    return buffer.subarray(0, length);
  } finally {
    await handle.close();
  }
}

async function existingOutput(filename) {
  const info = await lstat(filename).catch((error) => {
    if (error.code === 'ENOENT') return null;
    throw error;
  });
  assert.ok(
    !info || (info.isFile() && !info.isSymbolicLink()),
    'Generated output must be a regular file.',
  );
  return info;
}

async function writeOutput(filename, bytes) {
  await existingOutput(filename);
  const temporary = path.join(
    path.dirname(filename),
    `.${path.basename(filename)}.${randomUUID()}.tmp`,
  );
  let handle;
  try {
    handle = await open(temporary, 'wx', 0o644);
    await handle.writeFile(bytes);
    await handle.sync();
    await handle.close();
    handle = null;
    await existingOutput(filename);
    await rename(temporary, filename);
  } finally {
    if (handle) await handle.close();
    await unlink(temporary).catch((error) => {
      if (error.code !== 'ENOENT') throw error;
    });
  }
}

export async function buildWorkshopPack({ root = ROOT, write = false } = {}) {
  assert.equal(typeof root, 'string', 'root must be a filesystem path.');
  assert.equal(typeof write, 'boolean', 'write must be a boolean.');
  const project = await realpath(root);
  const baselineBytes = await readRegular(
    await localFile(project, WORKSHOP_BASELINE.path),
    SOURCE_BYTES,
    'Workshop v1.0.0 baseline',
  );
  assert.ok(
    baselineBytes.length === WORKSHOP_BASELINE.bytes &&
      sha(baselineBytes) === WORKSHOP_BASELINE.sha256,
    'Workshop v1.0.0 baseline must retain the exact frozen bytes.',
  );
  const baseline = JSON.parse(baselineBytes);
  const sourceBytes = await readRegular(
    await localFile(project, `${SOURCE}/pack-source.json`),
    SOURCE_BYTES,
    'Workshop source recipe',
  );
  const pack = JSON.parse(sourceBytes);
  assert.ok(
    isDeepStrictEqual(pack, { ...baseline, version: '1.1.0' }),
    'Workshop source must change only version to 1.1.0 and retain empty generated levelVisuals.',
  );
  assert.equal(pack.id, 'equipment-workshop');
  assert.equal(pack.format, 'xonix-pack.v2');
  assert.deepEqual(pack.levelVisuals, []);
  assert.deepEqual(
    pack.campaigns[0].levels.map(({ id }) => id),
    WORKSHOP_PICTURES.map(({ levelId }) => levelId),
  );
  const backgrounds = [];
  let encodedArtworkChars = 0;
  for (const picture of WORKSHOP_PICTURES) {
    const file = `${SOURCE}/backgrounds/${picture.levelId}.png`;
    const bytes = await readRegular(
      await localFile(project, file),
      CONTENT_LIMITS.maxImageBytes,
      `${picture.levelId}.png (maximum 4 MiB)`,
    );
    const dataUrl = `data:image/png;base64,${bytes.toString('base64')}`;
    const header = inspectImageDataUrl(dataUrl);
    assert.ok(header.valid, `${picture.levelId}: ${header.errors.join('; ')}`);
    assert.equal(
      header.width * 3,
      header.height * 4,
      `${picture.levelId} must have an actual 4:3 aspect ratio.`,
    );
    encodedArtworkChars += dataUrl.length;
    backgrounds.push({
      levelId: picture.levelId,
      file,
      bytes: bytes.length,
      sha256: sha(bytes),
      width: header.width,
      height: header.height,
    });
    pack.levelVisuals.push({
      levelId: picture.levelId,
      visualOverrides: {
        background: {
          dataUrl,
          name: picture.title,
          fit: 'contain',
          metadata: {
            title: picture.title,
            description: picture.description,
            author: 'Reveal Line · AI-assisted original artwork',
            license: 'Original project artwork',
            rightsStatus:
              'Original AI-generated project illustration; source and effective prompt retained separately.',
          },
        },
      },
    });
  }
  assert.equal(
    new Set(backgrounds.map(({ sha256 }) => sha256)).size,
    WORKSHOP_PICTURES.length,
    'Each Workshop map needs a distinct original picture hash.',
  );
  const checked = validatePack(pack);
  assert.ok(checked.valid, checked.errors.join('; '));
  const generated = Buffer.from(JSON.stringify(pack, null, 2) + '\n');
  assert.ok(
    generated.length <= PACK_LIMITS.maxBytes,
    'Generated Workshop exceeds its pack byte budget.',
  );
  const output = await localFile(project, OUTPUT);
  let outputBytes = generated;
  if (write) await writeOutput(output, generated);
  else {
    assert.ok(
      await existingOutput(output),
      'Generated Workshop is missing. Review sources, then run --write.',
    );
    outputBytes = await readRegular(output, PACK_LIMITS.maxBytes, 'Generated Workshop');
    assert.ok(
      isDeepStrictEqual(JSON.parse(outputBytes), pack),
      'Generated Workshop differs from its reviewed source/artwork. Run --write after reviewing the change.',
    );
  }
  return {
    pack,
    report: {
      packId: pack.id,
      version: pack.version,
      baseline: { ...WORKSHOP_BASELINE },
      sourceSha256: sha(sourceBytes),
      backgrounds,
      rawArtworkBytes: backgrounds.reduce((sum, image) => sum + image.bytes, 0),
      encodedArtworkChars,
      decodedArtworkPixels: backgrounds.reduce((sum, image) => sum + image.width * image.height, 0),
      encodedPackBytes: outputBytes.length,
      outputSha256: sha(outputBytes),
      generatedSha256: sha(generated),
      under12MiBTarget: outputBytes.length < 12 * 1024 * 1024,
      output: OUTPUT,
      wrote: write,
      validation:
        'Structure, exact source bytes and image headers checked. Actual browser installation must fully decode and visually review all three images.',
    },
  };
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const args = process.argv.slice(2);
  assert.ok(
    args.length === 0 || (args.length === 1 && args[0] === '--write'),
    'Usage: node scripts/build-workshop-pack.mjs [--write]',
  );
  console.log(
    JSON.stringify((await buildWorkshopPack({ write: args[0] === '--write' })).report, null, 2),
  );
}
