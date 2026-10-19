import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { isDeepStrictEqual } from 'node:util';
import { format, resolveConfig } from 'prettier';
import {
  collectEditionEngineFiles,
  collectEditionSelectedFiles,
  compileEdition,
} from '../../scripts/compile-edition.mjs';
import {
  compilePublishedSoundtracks,
  soundtrackCatalogueModule,
  readSoundtrackDistributionEntries,
} from '../../scripts/soundtrack-distribution.mjs';

// Functional qualification only: no source edits, audio downloads or ZIP output.
const root = fileURLToPath(new URL('../../', import.meta.url));
const args = process.argv.slice(2),
  options = {};
for (let i = 0; i < args.length; i += 2) {
  const flag = args[i],
    value = args[i + 1];
  if (!['--baseline', '--out'].includes(flag) || !value || options[flag])
    throw new Error(
      'Usage: node docs/evidence/verify-compact-soundtrack-metadata.mjs --baseline COMMIT [--out NEW_RECEIPT.json]',
    );
  options[flag] = value;
}
if (!/^[a-f0-9]{40}$/.test(options['--baseline'] ?? ''))
  throw new Error('Provide the exact baseline commit SHA.');
const git = (...args) => execFileSync('git', args, { cwd: root, maxBuffer: 8 * 1024 * 1024 });
const sha = (bytes) => createHash('sha256').update(bytes).digest('hex');
const read = (name) => fs.readFile(path.join(root, name));
const checks = [];
const check = (name, condition, detail = {}) => {
  checks.push({ name, passed: !!condition, ...detail });
  if (!condition) throw new Error(name);
};
const file = 'game/content/soundtrack-catalogue.mjs';
const baseline = git('show', options['--baseline'] + ':' + file);
const candidate = await read(file);
const decode = (bytes) => import('data:text/javascript;base64,' + bytes.toString('base64'));
const before = await decode(baseline),
  after = await decode(candidate);
check(
  'All exported values and strings are exactly unchanged',
  isDeepStrictEqual({ ...before }, { ...after }),
);
const names = (bytes) =>
  [...bytes.toString().matchAll(/export const ([A-Z_]+) = /g)].map((row) => row[1]);
check(
  'Export declaration order remains unchanged',
  isDeepStrictEqual(names(baseline), names(candidate)),
);
for (const key of Object.keys(before))
  check(
    'Ordered serialization unchanged: ' + key,
    JSON.stringify(before[key]) === JSON.stringify(after[key]),
  );
const formatting = {
  ...(await resolveConfig(path.join(root, file))),
  filepath: path.join(root, file),
};
check(
  'Prettier-stable output',
  candidate.equals(Buffer.from(await format(candidate.toString(), formatting))),
);
for (let i = 0; i < 2; i++) {
  const built = await compilePublishedSoundtracks(root);
  const generated = await format(
    soundtrackCatalogueModule(built.catalogue, built.archives, built.collections, built.bundled),
    formatting,
  );
  check('Exact regeneration ' + (i + 1), candidate.equals(Buffer.from(generated)));
}
const configuration = JSON.parse(await read('game/build-config.json'));
check(
  'Actual configured metadata delivery is present',
  configuration.soundtrackAlbums?.format === 'revealline-soundtrack-distribution.v2',
);
const delivery = await readSoundtrackDistributionEntries(root, configuration.soundtrackAlbums);
check(
  'Configured publication metadata and media-pin validation succeeds',
  Array.isArray(delivery),
  { deliveryFiles: delivery.length },
);
const sourceFiles = {};
for (const name of [
  'scripts/soundtrack-distribution.mjs',
  file,
  'scripts/compile-edition.mjs',
  'scripts/edition-runtime.mjs',
  'scripts/edition-offline.mjs',
  'game/editions/catalog.json',
])
  sourceFiles[name] = sha(await read(name));
const head = git('rev-parse', 'HEAD').toString().trim();
const engine = await collectEditionEngineFiles({ root });
const catalog = JSON.parse(await read('game/editions/catalog.json'));
const version = 'v' + JSON.parse(await read('package.json')).version;
// Same eighteen IDs selected by company-edition-candidate.yml.
const ids =
  'coupa-all,coupa-adventure,coupa-culture,coupa-foundations,coupa-operations,coupa-developers,droneaid-community,droneaid-nl-community,droneaid-nl-workshop-lights,droneaid-nl-parts-in-motion,droneaid-nl-signals-of-support,droneaid-nl-careful-handoff,droneaid-nl-makers-together,droneaid-nl-shared-horizon,social-drone-ua,victory-drones,ukraine-culture,fpv-learning'
    .split(',')
    .sort();
const editions = [];
for (const id of ids) {
  const files = new Map(engine);
  const selected = await collectEditionSelectedFiles({ catalog, editionIds: [id], read });
  for (const entry of selected) files.set(...entry);
  const compiled = await compileEdition({
    catalog,
    editionIds: [id],
    files,
    enginePaths: [...engine.keys()],
    version,
    sourceRevision: head,
    offline: { basePath: '/revealline/' },
  });
  const bytes = [...compiled.files.values()].reduce((sum, value) => sum + value.length, 0);
  editions.push({
    id,
    passed: true,
    files: compiled.files.size,
    bytes,
    headroomBytes: 64 * 1024 * 1024 - bytes,
  });
  process.stderr.write(id + ': ' + bytes + ' bytes\n');
}
check(
  'All eighteen existing edition capacity guards pass',
  editions.length === 18 && editions.every((row) => row.files <= 2000 && row.headroomBytes >= 0),
);
for (const [name, hash] of Object.entries(sourceFiles))
  check('No source drift: ' + name, sha(await read(name)) === hash);
const receipt = {
  format: 'LosslessSoundtrackMetadataCompaction.v1',
  generatedAt: new Date().toISOString(),
  baselineHead: options['--baseline'],
  head,
  workingTreeEvidence: true,
  passed: true,
  sourceFiles,
  metadata: {
    beforeBytes: baseline.length,
    afterBytes: candidate.length,
    savedBytes: baseline.length - candidate.length,
    beforeSha256: sha(baseline),
    afterSha256: sha(candidate),
  },
  checks,
  editions,
  limits: { files: 2000, bytes: 64 * 1024 * 1024 },
  scope:
    'Functional generator, metadata and in-memory production edition compilation. Existing unit-suite results, frozen archive admission, deployment and listening acceptance are separate.',
};
const serialized = JSON.stringify(receipt, null, 2) + '\n';
if (options['--out'])
  await fs.writeFile(path.resolve(options['--out']), serialized, { flag: 'wx' });
else process.stdout.write(serialized);
