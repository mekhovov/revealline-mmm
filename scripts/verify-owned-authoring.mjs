import fs from 'node:fs/promises';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { createHash } from 'node:crypto';
import { isDeepStrictEqual } from 'node:util';
import { parse } from 'acorn';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2);
const remote = args.length === 1 && args[0] === '--remote';
if (!remote && (args.length !== 2 || args[0] !== '--source'))
  throw new Error('Use --source PINNED_ENGINE_CHECKOUT or --remote.');
const lock = JSON.parse(await fs.readFile(path.join(root, 'upstream.lock.json'), 'utf8'));
const revision = lock.commit;
if (!/^[a-f0-9]{40}$/.test(revision))
  throw new Error('Authoring requires the pinned engine commit.');
await fs.mkdir(path.join(root, '.cache'), { recursive: true });
const source = remote
  ? await fs.mkdtemp(path.join(root, '.cache/authoring-objects-'))
  : await fs.realpath(path.resolve(args[1]));
const git = (...values) =>
  execFileSync('git', ['-C', source, ...values], { maxBuffer: 32 * 1024 * 1024 });
if (remote) {
  const config = JSON.parse(await fs.readFile(path.join(root, 'brand.config.json'), 'utf8'));
  if (!/^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/.test(config.upstream.repository))
    throw new Error('Invalid engine repository.');
  try {
    git('init', '--quiet');
    git('remote', 'add', 'origin', `https://github.com/${config.upstream.repository}.git`);
    git('config', 'remote.origin.promisor', 'true');
    git('config', 'remote.origin.partialclonefilter', 'blob:none');
    git('fetch', '--quiet', '--depth=1', '--filter=blob:none', 'origin', revision);
  } catch (error) {
    await fs.rm(source, { recursive: true, force: true });
    throw error;
  }
}
if (git('rev-parse', `${revision}^{commit}`).toString().trim() !== revision)
  throw new Error('The checkout does not contain the pinned engine.');
const enginePaths = new Set(
  git('ls-tree', '-r', '--name-only', revision).toString().trim().split('\n'),
);
const authoredRoot = path.join(root, 'authoring/company/files');
const testRoot = path.join(root, 'authoring/company/tests');
const testReceipt = JSON.parse(
  await fs.readFile(path.join(root, 'migration/owned-test-receipt.json'), 'utf8'),
);
const ownedTests = testReceipt.tests;
const ownedModules = new Set([
  'scripts/produce-company-content.mjs',
  ...[
    'brands',
    'catalog',
    'content',
    'progression',
    'rewards',
    'lessons',
    'learning-rewards',
    'playtest-fixtures',
  ].map((name) => `game/company-campaigns/${name}.mjs`),
]);
const safe = (name) =>
  typeof name === 'string' &&
  !path.isAbsolute(name) &&
  !name.split('/').some((part) => !part || part === '.' || part === '..') &&
  !name.includes('\\');
async function localFile(name) {
  const file = path.join(name.startsWith('game/test/') ? testRoot : authoredRoot, name);
  try {
    const stat = await fs.lstat(file);
    if (!stat.isFile() || stat.size > 32 * 1024 * 1024)
      throw new Error(`Invalid local authoring input: ${name}`);
    const bytes = await fs.readFile(file);
    const recorded = testReceipt.items.find((row) => row.sourcePath === name);
    if (
      recorded &&
      (bytes.length !== recorded.bytes ||
        createHash('sha256').update(bytes).digest('hex') !== recorded.sha256)
    )
      throw new Error(`Owned regression input changed without updating its receipt: ${name}`);
    return bytes;
  } catch (error) {
    if (error.code !== 'ENOENT' || ownedModules.has(name) || ownedTests.includes(name)) throw error;
    return null;
  }
}
function references(node, found) {
  if (!node || typeof node !== 'object') return;
  if (
    [
      'ImportDeclaration',
      'ExportNamedDeclaration',
      'ExportAllDeclaration',
      'ImportExpression',
    ].includes(node.type) &&
    typeof node.source?.value === 'string'
  )
    found.push(node.source.value);
  if (
    node.type === 'NewExpression' &&
    node.callee?.name === 'URL' &&
    node.arguments?.[1]?.type === 'MemberExpression' &&
    node.arguments[1].object?.type === 'MetaProperty' &&
    node.arguments[1].object.meta?.name === 'import' &&
    node.arguments[1].property?.name === 'url'
  ) {
    const value = node.arguments[0]?.value;
    if (
      typeof value === 'string' &&
      !value.startsWith('/') &&
      !value.includes(':') &&
      /\.(?:json|mjs|js|css|html|txt|png|jpg|webp)$/.test(value)
    )
      found.push({ resource: value.startsWith('.') ? value : `./${value}` });
  }
  for (const value of Object.values(node)) {
    if (Array.isArray(value)) value.forEach((child) => references(child, found));
    else if (value && typeof value === 'object') references(value, found);
  }
}

await fs.mkdir(path.join(root, '.cache'), { recursive: true });
const work = await fs.mkdtemp(path.join(root, '.cache/owned-authoring-'));
try {
  await fs.writeFile(path.join(work, 'package.json'), '{"type":"module"}\n');
  await fs.copyFile(
    path.join(authoredRoot, '.prettierrc.json'),
    path.join(work, '.prettierrc.json'),
  );
  await fs.symlink(path.join(root, 'node_modules'), path.join(work, 'node_modules'), 'dir');
  const pending = [
    'scripts/produce-company-content.mjs',
    'game/company-campaigns/playtest-fixtures.mjs',
    ...ownedTests,
  ];
  const seen = new Set(),
    inputs = [];
  while (pending.length) {
    const name = pending.pop();
    if (seen.has(name)) continue;
    if (!safe(name)) throw new Error(`Unsafe authoring dependency: ${name}`);
    seen.add(name);
    const local = await localFile(name);
    const bytes = local ?? git('show', `${revision}:${name}`);
    inputs.push({
      path: name,
      owner: local ? 'local' : 'engine',
      sha256: createHash('sha256').update(bytes).digest('hex'),
    });
    const destination = path.join(work, name);
    await fs.mkdir(path.dirname(destination), { recursive: true });
    await fs.writeFile(destination, bytes);
    if (/\.m?js$/.test(name)) {
      const found = [];
      references(
        parse(bytes.toString('utf8'), { ecmaVersion: 'latest', sourceType: 'module' }),
        found,
      );
      for (const reference of found) {
        if (reference.resource) {
          const resource = path.posix.normalize(
            path.posix.join(path.posix.dirname(name), reference.resource),
          );
          // URL constructors also describe optional host files. Preserve their
          // absence; only materialize files that the pinned inputs actually own.
          if (
            enginePaths.has(resource) ||
            testReceipt.items.some((row) => row.sourcePath === resource) ||
            ownedModules.has(resource)
          )
            pending.push(resource);
        } else if (reference.startsWith('.'))
          pending.push(
            path.posix.normalize(
              path.posix.join(path.posix.dirname(name), reference.split('?')[0]),
            ),
          );
        else if (
          !reference.startsWith('node:') &&
          !['prettier', 'lz-string', 'acorn', 'parse5'].includes(reference)
        )
          throw new Error(`Unreviewed authoring dependency: ${reference}`);
      }
    }
  }
  const { produceCompanyContent } = await import(
    pathToFileURL(path.join(work, 'scripts/produce-company-content.mjs'))
  );
  const authoring = JSON.parse(
    await fs.readFile(path.join(root, 'authoring/company/inputs.json'), 'utf8'),
  );
  const result = await produceCompanyContent(authoring);
  const fixtures = await import(
    pathToFileURL(path.join(work, 'game/company-campaigns/playtest-fixtures.mjs'))
  );
  if (fixtures.COMPANY_PLAYTEST_FIXTURES.length !== 4)
    throw new Error('Missing retained playtest fixtures.');
  const preserved = JSON.parse(
    await fs.readFile(path.join(root, 'migration/owned-source-receipt.json'), 'utf8'),
  );
  const destinations = new Map(preserved.items.map((item) => [item.sourcePath, item.destination]));
  const byteDifferences = [];
  for (const [name, bytes] of result.files) {
    const target =
      name === 'game/editions/catalog.json'
        ? 'content/catalog.json'
        : (destinations.get(name) ?? `content/files/${name}`);
    const existing = await fs.readFile(path.join(root, target));
    if (!bytes.equals(existing)) byteDifferences.push(target);
    if (!isDeepStrictEqual(JSON.parse(bytes), JSON.parse(existing))) {
      await fs.writeFile(
        path.join(root, '.cache/owned-authoring-difference.json'),
        JSON.stringify(
          { target, actual: JSON.parse(bytes), expected: JSON.parse(existing) },
          null,
          2,
        ),
      );
      throw new Error(`Local authoring changes content identities or data: ${target}`);
    }
  }
  await fs.writeFile(
    path.join(root, '.cache/owned-authoring-verification.json'),
    JSON.stringify(
      {
        format: 'owned-authoring-verification.v1',
        engineRevision: revision,
        generatedFiles: result.files.size,
        campaigns: result.catalog.campaigns.length,
        fixtures: fixtures.COMPANY_PLAYTEST_FIXTURES.length,
        byteDifferences,
        inputs,
      },
      null,
      2,
    ) + '\n',
  );
  console.log(
    `Verified ${result.files.size} generated files, five chapters and four playtest fixtures using locally owned generators.`,
  );
  execFileSync(process.execPath, ['--test', ...ownedTests], { cwd: work, stdio: 'inherit' });
} finally {
  await fs.rm(work, { recursive: true, force: true });
  if (remote) await fs.rm(source, { recursive: true, force: true });
}
