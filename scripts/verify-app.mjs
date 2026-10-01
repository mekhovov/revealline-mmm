import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readdir, readFile, stat } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { parse } from 'acorn';
import { parse as parseHTML } from 'parse5';

const repository = fileURLToPath(new URL('../', import.meta.url));
const digest = (bytes) => createHash('sha256').update(bytes).digest('hex');
// These six exact upstream references belong to branches the selected web
// edition cannot enter. They are intentionally omitted, never fetched assets.
// Keep this list explicit so a new missing resource still fails the build.
const conditionalReferences = new Map([
  // Offline navigation is disabled for compiled editions and blocked by the URL guard.
  ['game/app.mjs', new Set(['./downloads.html'])],
  ['game/ui/install-offline-panel.mjs', new Set(['../downloads.html'])],
  // The official native bridge exists only when an iOS distribution is staged.
  ['game/platform.mjs', new Set(['../native/bridge.mjs'])],
  // Historical default-game catalogs are loaded only when !editionId.
  ['game/profile-recovery-catalogs.mjs', new Set(['./content/recovery-catalogs.json'])],
  // The Coupa theme uses its own vector artwork; this loader requires themeId === 'fpv'.
  ['game/ui/enemy-body-assets.mjs', new Set(['../content/enemy-presentations.json'])],
  // This branch requires the DroneAid edition, rejected before content loading.
  ['game/ui/edition-solo.mjs', new Set(['./art/menu-scenes/droneaid-wordmark-light.svg'])],
]);
const excludedPaths = [
  /(?:^|\/)(?:optional-practice|practice|fpv-sim|fpv-simulator|communities|test|node_modules)(?:\/|$)/,
  // The enemy guide shares this small lifecycle observer with the upstream studio.
  /^game\/studio\/(?!preview-readiness\.mjs$)/,
  /^game\/(?:controller-lab|replay-theater)\//,
  /^game\/content\/(?:campaign|packs|archives|versus|team)\.json$/,
  /^game\/(?:content\/company-(?:boot|campaigns)|editions\/(?:assets|retained))\/(?:droneaid|ukraine|victory|social-drone|fpv-learning)/,
  /^game\/ui\/art\/menu-scenes\/(?:droneaid|ukraine|retro|fpv)[-.]/,
  /^game\/ui\/art\/identity\/fpv-line\//,
  /^game\/(?:fpv|civilian-practice|practice-rewards|practice-installation)[-.]/,
];

async function fileNames(root, relative = '') {
  const result = [];
  for (const entry of await readdir(path.join(root, relative), { withFileTypes: true })) {
    const name = path.posix.join(relative, entry.name);
    assert.ok(!entry.isSymbolicLink(), `Published files cannot be symlinks: ${name}`);
    if (entry.isDirectory()) result.push(...(await fileNames(root, name)));
    else if (entry.isFile()) result.push(name);
  }
  return result.sort();
}

function localReference(file, specifier) {
  const value = specifier.trim();
  if (!value || /^(?:#|data:|https?:|mailto:|tel:|blob:)/i.test(value)) return null;
  assert.ok(!value.startsWith('/'), `${file}: root-relative resource breaks GitHub project Pages: ${value}`);
  const resolved = path.posix.normalize(path.posix.join(path.posix.dirname(file), value.split(/[?#]/)[0]));
  assert.ok(!resolved.startsWith('../'), `${file}: resource escapes the application: ${value}`);
  return resolved;
}

function walk(node, visit) {
  if (!node || typeof node !== 'object') return;
  visit(node);
  for (const [key, child] of Object.entries(node)) {
    if (key === 'parentNode') continue;
    if (Array.isArray(child)) for (const item of child) walk(item, visit);
    else if (child && typeof child === 'object') walk(child, visit);
  }
}

/** Independently check the emitted artifact rather than trusting the importer. */
export async function verifyApp(appRoot = path.join(repository, 'app')) {
  const names = await fileNames(appRoot);
  const published = new Set(names);
  const json = async (name) => JSON.parse(await readFile(path.join(appRoot, name), 'utf8'));
  const assertPresent = (name, owner) => assert.ok(published.has(name), `${owner}: missing ${name}`);

  for (const name of names)
    assert.ok(!excludedPaths.some((rule) => rule.test(name)), `Unrelated content is published: ${name}`);
  assert.deepEqual(names.filter((name) => name.endsWith('.html')).sort(),
    ['game/company.html', 'game/index.html', 'index.html'], 'Only the branded game entry points may be published');

  const catalog = await json('edition-catalog.json');
  assert.equal(catalog.defaultEditionId, 'coupa-all');
  assert.deepEqual(catalog.brands.map(({ id }) => id), ['coupa']);
  assert.deepEqual(catalog.editions.map(({ id }) => id), ['coupa-all']);
  const edition = catalog.editions[0];
  assert.deepEqual(edition.modes, ['solo']);
  assert.equal(catalog.campaigns.length, 5);
  assert.deepEqual(new Set(edition.campaignIds), new Set(catalog.campaigns.map(({ id }) => id)));

  const missionIds = new Set();
  for (const chapter of catalog.campaigns) {
    assert.equal(chapter.brandId, 'coupa');
    assert.ok(chapter.id.startsWith('coupa-'));
    const source = await json(chapter.sourcePath);
    assert.equal(source.campaigns.length, 1);
    assert.equal(source.campaigns[0].id, chapter.id);
    assert.equal(source.missions.length, 6, `${chapter.id} must retain all six missions`);
    for (const mission of source.missions) {
      assert.ok(!missionIds.has(mission.id), `Duplicate mission: ${mission.id}`);
      missionIds.add(mission.id);
    }
    for (const field of ['lessonPath', 'rewardPath', 'localizationPath'])
      if (chapter[field]) assertPresent(chapter[field], chapter.id);
  }
  assert.equal(missionIds.size, 30);
  assert.deepEqual((await json(edition.boot.packs)).packs, []);
  const themes = (await json(edition.boot.themes)).themes;
  assert.ok(themes.length > 0 && themes.every(({ id }) => id.startsWith('coupa')),
    'Only Coupa presentation choices may ship');

  for (const asset of catalog.assets) {
    assert.ok(!/(?:droneaid|ukraine|victory-drones|social-drone|fpv-learning)/.test(asset.path));
    const bytes = await readFile(path.join(appRoot, asset.path));
    assert.equal(bytes.length, asset.bytes, asset.path);
    assert.equal(digest(bytes), asset.sha256, asset.path);
    assert.equal(asset.approved, true, asset.path);
    assert.equal(asset.publication, 'public', asset.path);
  }

  for (const record of edition.presentationHistory ?? []) {
    const bytes = await readFile(path.join(appRoot, record.path));
    assert.equal(bytes.length, record.bytes, record.path);
    assert.equal(digest(bytes), record.sha256, record.path);
    const snapshot = JSON.parse(bytes);
    assert.equal(snapshot.editionId, 'coupa-all');
    assert.deepEqual(snapshot.catalog.editions.map(({ id }) => id), ['coupa-all']);
    assert.deepEqual(snapshot.catalog.brands.map(({ id }) => id), ['coupa']);
    assert.ok(snapshot.catalog.campaigns.every(({ id }) => edition.campaignIds.includes(id)));
    for (const asset of snapshot.catalog.assets) {
      const original = await readFile(path.join(appRoot, asset.path));
      assert.equal(original.length, asset.bytes, asset.path);
      assert.equal(digest(original), asset.sha256, asset.path);
    }
  }

  const inventory = await json('edition-build.json');
  assert.deepEqual(inventory.editionIds, ['coupa-all']);
  assert.equal(inventory.catalogSha256, digest(await readFile(path.join(appRoot, 'edition-catalog.json'))));
  const tracked = new Set();
  for (const record of inventory.files) {
    assert.ok(!tracked.has(record.path), `Duplicate inventory entry: ${record.path}`);
    tracked.add(record.path);
    const bytes = await readFile(path.join(appRoot, record.path));
    assert.equal(bytes.length, record.bytes, record.path);
    assert.equal(digest(bytes), record.sha256, record.path);
  }
  assert.deepEqual(new Set(names.filter((name) => name !== 'edition-build.json')), tracked,
    'Every published file must be covered by the final integrity inventory');

  const lock = JSON.parse(await readFile(path.join(repository, 'upstream.lock.json'), 'utf8'));
  const lockFiles = new Map(lock.generatedFiles.map((record) => [record.path, record]));
  assert.equal(lockFiles.size, lock.generatedFiles.length, 'Upstream lock paths must be unique');
  assert.deepEqual(new Set(lockFiles.keys()), published, 'Upstream lock must cover exactly the generated app');
  for (const record of inventory.files)
    assert.deepEqual(lockFiles.get(record.path), record, `Lock and artifact disagree: ${record.path}`);
  const buildBytes = await readFile(path.join(appRoot, 'edition-build.json'));
  assert.deepEqual(lockFiles.get('edition-build.json'), {
    path: 'edition-build.json', bytes: buildBytes.length, sha256: digest(buildBytes),
  });
  assert.match(lock.commit, /^[a-f0-9]{40}$/);
  assert.equal(inventory.sourceRevision, lock.commit);
  assert.equal((await json('game/build-info.json')).sourceRevision, lock.commit);
  assert.deepEqual(new Set(lock.projectionInputs.map(({ path: name }) => name)),
    new Set(['brand.config.json', 'scripts/isolate-brand.mjs', 'scripts/sync-upstream.mjs',
      'branding/access-gate.css', 'branding/access-gate.mjs',
      'branding/coupa-landing.css', 'branding/coupa-landing.html']));
  for (const record of lock.projectionInputs) {
    const bytes = await readFile(path.join(repository, record.path));
    assert.equal(bytes.length, record.bytes, `${record.path} changed; regenerate app/ before publishing`);
    assert.equal(digest(bytes), record.sha256, `${record.path} changed; regenerate app/ before publishing`);
  }

  const runtime = await json('runtime-dependencies.json');
  for (const name of [runtime.entry, runtime.canonicalEntry, ...runtime.resources])
    assertPresent(name, 'runtime-dependencies.json');

  let references = 0;
  for (const name of names) {
    if (!/\.(?:m?js|html|css)$/.test(name)) continue;
    const source = await readFile(path.join(appRoot, name), 'utf8');
    const check = (specifier, { module = false } = {}) => {
      if (module) assert.ok(specifier.startsWith('.'), `${name}: unbundled module ${specifier}`);
      const target = localReference(name, specifier);
      if (target) {
        if (!module && !published.has(target) && conditionalReferences.get(name)?.has(specifier)) return;
        if (specifier.endsWith('/')) {
          const directory = target.replace(/\/$/, '');
          assert.ok(directory === '.' || names.some((candidate) => candidate.startsWith(`${directory}/`)),
            `${name}: missing directory ${target}`);
        }
        else assertPresent(target, name);
        references++;
      }
    };
    const checkJavaScript = (code, sourceType = 'module') => {
      const tree = parse(code, { ecmaVersion: 'latest', sourceType });
      walk(tree, (node) => {
        if (['ImportDeclaration', 'ExportAllDeclaration', 'ExportNamedDeclaration', 'ImportExpression'].includes(node.type)
          && typeof node.source?.value === 'string') check(node.source.value, { module: true });
        if (node.type === 'NewExpression' && node.callee?.name === 'URL'
          && typeof node.arguments[0]?.value === 'string'
          && node.arguments[1]?.object?.type === 'MetaProperty') check(node.arguments[0].value);
      });
    };
    if (/\.m?js$/.test(name)) checkJavaScript(source);
    if (name.endsWith('.html')) {
      walk(parseHTML(source), (node) => {
        if (!['script', 'link', 'img', 'source', 'video', 'audio'].includes(node.tagName)) return;
        for (const attribute of node.attrs ?? [])
          if (['src', 'href', 'data-boot-href', 'poster', 'data-module'].includes(attribute.name))
            check(attribute.value);
        if (node.tagName === 'script') {
          const type = node.attrs?.find(({ name }) => name === 'type')?.value;
          if (!type || type === 'module' || /^(?:text|application)\/javascript$/.test(type)) {
            const code = (node.childNodes ?? []).filter(({ nodeName }) => nodeName === '#text')
              .map(({ value }) => value).join('');
            if (code.trim()) checkJavaScript(code, type === 'module' ? 'module' : 'script');
          }
        }
      });
    }
    if (name.endsWith('.css'))
      for (const match of source.matchAll(/url\(\s*['"]?([^)'"\s]+)['"]?\s*\)/g)) check(match[1]);
  }

  const { validateEditionRuntimeCatalog, resolveEditionSelection } = await import(
    pathToFileURL(path.join(appRoot, 'game/editions/model.mjs')).href);
  validateEditionRuntimeCatalog(catalog);
  for (const editionId of ['droneaid-nl-community', 'fpv-learning', 'coupa-foundations', 'unknown'])
    assert.throws(() => resolveEditionSelection(catalog, { editionId }), /not included/);
  for (const campaignId of ['droneaid-community', 'campaign', 'unknown'])
    assert.throws(() => resolveEditionSelection(catalog, { campaignId }), /not included/);

  const totalBytes = (await Promise.all(names.map((name) => stat(path.join(appRoot, name)))))
    .reduce((sum, entry) => sum + entry.size, 0);
  return { files: names.length, bytes: totalBytes, references, campaigns: 5, missions: missionIds.size,
    sourceRevision: inventory.sourceRevision };
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    console.log(JSON.stringify(await verifyApp(process.argv[2] && path.resolve(process.argv[2])), null, 2));
  } catch (error) {
    console.error(error.stack);
    process.exitCode = 1;
  }
}
