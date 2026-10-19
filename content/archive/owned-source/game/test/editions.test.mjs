import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {
  createEditionRuntimeCatalog,
  validateEditionRuntimeCatalog,
  resolveEditionSelection,
  resolveEditionAssets,
} from '../editions/model.mjs';
import { loadEditionBootstrap, mergeEditionProjects } from '../editions/bootstrap.mjs';
import {
  compileEdition,
  selectEditionClosure,
  validateEditionCodeClosure,
  editionCodeDependencies,
  collectEditionSelectedFiles,
  collectEditionEngineFiles,
} from '../../scripts/compile-edition.mjs';
import { createStarterProject } from '../content-design/starter.mjs';
import { companyPresentationIdentity } from '../company-session.mjs';
import { createCompanyTheme, createCompanyPresets } from '../company-campaigns/brands.mjs';
import { inspectImageDataUrl } from '../content.mjs';
import { loadRuntimeContentProvider } from '../runtime-content-provider.mjs';
import { validateEditionProviderParity } from '../../scripts/edition-provider-parity.mjs';
import { captureEditionPresentation } from '../editions/retained-presentation.mjs';
import { createEditionCandidate } from '../../publishing/edition-candidate.mjs';
import {
  validateEditionAdmission,
  editionPublicationAssets,
} from '../../publishing/edition-admission.mjs';
import { readEditionZip } from '../../publishing/edition-zip.mjs';
import { checkEditionSourceEligibility } from '../../scripts/check-edition-source.mjs';
import { COMPANY_PACKAGE_BUDGET } from '../editions/package-budget.mjs';

const bytes = (value) => Buffer.from(JSON.stringify(value));
const digest = (value) => createHash('sha256').update(value).digest('hex');
function fixture() {
  const files = new Map(),
    sources = [],
    assets = [],
    brands = [],
    campaigns = [],
    editions = [];
  for (const id of ['coupa', 'droneaid']) {
    const project = createStarterProject(`${id}-source`);
    project.campaigns[0].id = `${id}-adventure`;
    project.packs[0].id = `${id}-pack`;
    project.packs[0].campaignIds = [`${id}-adventure`];
    project.missions[0].id = `${id}-mission`;
    project.campaigns[0].missionIds = [`${id}-mission`];
    const sourcePath = `game/content/${id}.json`,
      assetPath = `game/editions/assets/${id}.png`,
      payload = Buffer.from(`${id} approved picture`);
    files.set(sourcePath, bytes(project));
    files.set(assetPath, payload);
    sources.push(project);
    assets.push({
      id: `${id}-hero`,
      path: assetPath,
      sha256: digest(payload),
      bytes: payload.length,
      publication: 'public',
      approved: true,
      dependencies: [],
    });
    brands.push({
      format: 'revealline-brand-pack.v1',
      id,
      revision: 1,
      name: id,
      description: `${id} edition`,
      publication: 'public',
      themeId: `${id}-theme`,
      actorSetId: `${id}-actors`,
      logoAssetId: null,
      heroAssetId: `${id}-hero`,
      assetIds: [`${id}-hero`],
    });
    campaigns.push({
      id: `${id}-adventure`,
      revision: '1',
      name: `${id} adventure`,
      brandId: id,
      publication: 'public',
      sourcePath,
      assetIds: [],
      modes: ['solo'],
    });
    const boot = Object.fromEntries(
      ['campaign', 'themes', 'presets', 'classes', 'packs', 'archives'].map((key) => [
        key,
        `game/content/${id}/${key}.json`,
      ]),
    );
    const theme = { ...createCompanyTheme(id), id: `${id}-theme` },
      presets = createCompanyPresets(id);
    Object.values(presets.characters).forEach((body) => {
      body.src = null;
    });
    Object.entries(boot).forEach(([key, file]) =>
      files.set(
        file,
        bytes(
          key === 'campaign'
            ? { levels: [{ id: `${id}-mission` }] }
            : key === 'themes'
              ? { themes: [theme] }
              : key === 'presets'
                ? presets
                : {},
        ),
      ),
    );
    editions.push({
      format: 'revealline-edition.v1',
      id: `${id}-public`,
      revision: 1,
      name: `${id} public`,
      brandId: id,
      audience: 'everyone',
      campaignIds: [`${id}-adventure`],
      entryCampaignId: `${id}-adventure`,
      modes: ['solo'],
      publication: 'public',
      boot,
    });
  }
  return {
    catalog: createEditionRuntimeCatalog({
      brands,
      editions,
      campaigns,
      assets,
      defaultEditionId: 'coupa-public',
    }),
    files,
    sources,
  };
}

test('compiler retains the selected logo and projects shared fallback resources without default artwork', async () => {
  const f = fixture();
  const catalog = structuredClone(f.catalog);
  catalog.brands[0].logoAssetId = catalog.brands[0].heroAssetId;
  const brandPath = 'game/ui/brand-identity.mjs';
  const defaultWordmark = 'game/ui/art/identity/fpv-line/wordmark.png';
  f.files.set(brandPath, await fs.readFile(new URL('../ui/brand-identity.mjs', import.meta.url)));
  f.files.set('game/i18n/index.mjs', Buffer.from('export const localizedText = () => {};'));
  f.files.set(defaultWordmark, Buffer.from('unselected default wordmark'));
  f.files.set('game/company.html', Buffer.from('<html><head></head><body></body></html>'));
  const result = await compileEdition({
    ...f,
    catalog,
    editionIds: ['coupa-public'],
    enginePaths: ['game/company.html', brandPath, 'game/i18n/index.mjs', defaultWordmark],
    version: '1.0.0',
    offline: { basePath: '/verification/' },
  });
  const logo = catalog.assets.find((asset) => asset.id === catalog.brands[0].logoAssetId);
  assert.deepEqual(result.files.get(logo.path), f.files.get(logo.path));
  assert.ok(!result.files.has(defaultWordmark));
  assert.match(result.files.get(brandPath).toString(), /\.\.\/editions\/assets\/coupa\.png/);
  const cache = JSON.parse(result.files.get('offline-cache.json'));
  assert.ok(cache.files.some((file) => file.path === logo.path));
  assert.ok(!cache.files.some((file) => file.path === defaultWordmark));
  assert.ok(f.files.has(defaultWordmark), 'Source/default package bytes are untouched');
});

test('final offline edition budget counts every generated worker and manifest', async () => {
  const f = fixture();
  f.files.set('game/company.html', Buffer.from('<html><head></head><body></body></html>'));
  const options = {
    ...f,
    editionIds: ['coupa-public'],
    enginePaths: ['game/company.html'],
    version: '1.0.0',
    offline: { basePath: '/verification/' },
  };
  const baseline = await compileEdition(options);
  const files = new Map(f.files);
  const extra = [];
  for (let i = baseline.files.size; i < 2000; i++) {
    const name = `game/budget-${i}.txt`;
    files.set(name, Buffer.from('x'));
    extra.push(name);
  }
  const atLimit = await compileEdition({
    ...options,
    files,
    enginePaths: [...options.enginePaths, ...extra],
  });
  assert.equal(atLimit.files.size, 2000);
  files.set('game/one-more.txt', Buffer.from('x'));
  await assert.rejects(
    compileEdition({
      ...options,
      files,
      enginePaths: [...options.enginePaths, ...extra, 'game/one-more.txt'],
    }),
    /Final edition output exceeds 2000 files or 80 MiB \(2001 files/,
  );
  const baselineBytes = [...baseline.files.values()].reduce((sum, bytes) => sum + bytes.length, 0);
  const large = new Map(f.files);
  large.set(
    'game/padding.txt',
    Buffer.alloc(COMPANY_PACKAGE_BUDGET.maxBytes - baselineBytes + 1024),
  );
  await assert.rejects(
    compileEdition({
      ...options,
      files: large,
      enginePaths: [...options.enginePaths, 'game/padding.txt'],
    }),
    /Final edition output exceeds 2000 files or 80 MiB/,
    'Payload fits the earlier cache inventory cap but final generated output does not',
  );
});

test('Company compiler retains runtime above the former 64 MiB ceiling within its new bounded allowance', async () => {
  const f = fixture();
  f.files.set('game/company.html', Buffer.from('<html><head></head><body></body></html>'));
  f.files.set('game/retained-runtime.txt', Buffer.alloc(65 * 1024 * 1024));
  const result = await compileEdition({
    ...f,
    editionIds: ['coupa-public'],
    enginePaths: ['game/company.html', 'game/retained-runtime.txt'],
    version: '1.0.0',
    offline: { basePath: '/verification/' },
  });
  const cache = JSON.parse(result.files.get('offline-cache.json'));
  assert.ok(cache.totalBytes > 64 * 1024 * 1024);
  assert.ok(cache.totalBytes < COMPANY_PACKAGE_BUDGET.maxBytes);
  assert.deepEqual(
    result.files.get('game/retained-runtime.txt'),
    f.files.get('game/retained-runtime.txt'),
  );
  assert.ok(cache.files.some((row) => row.path === 'game/editions/package-budget.mjs'));
  assert.ok(result.files.has('edition-build.json'));
});

test('compacted engine bytes keep candidate provenance, offline hashes and authored content exact', async () => {
  const f = fixture();
  const enginePath = 'game/engine-fixture.mjs';
  const original = Buffer.from('export function value() {\n    return `  exact literal`;\n}\n');
  const entry = Buffer.from(
    '<html><head><script type="module" src="./engine-fixture.mjs"></script></head><body></body></html>',
  );
  f.files.set(enginePath, original);
  f.files.set('game/company.html', entry);
  const options = {
    ...f,
    editionIds: ['coupa-public'],
    enginePaths: ['game/company.html', enginePath],
    version: '1.0.0',
    sourceRevision: 'a'.repeat(40),
    offline: { basePath: '/verification/' },
  };
  const compiled = await compileEdition(options);
  assert.deepEqual((await compileEdition(options)).files, compiled.files);
  const projected = compiled.files.get(enginePath);
  assert.ok(projected.length < original.length);
  assert.deepEqual(f.files.get(enginePath), original);
  assert.equal(
    (await import(`data:text/javascript;base64,${projected.toString('base64')}`)).value(),
    '  exact literal',
  );
  const pin = { path: enginePath, bytes: projected.length, sha256: digest(projected) };
  const offline = JSON.parse(compiled.files.get('offline-cache.json'));
  assert.deepEqual(
    offline.files.find((row) => row.path === enginePath),
    pin,
  );
  const selected = await collectEditionSelectedFiles({
    catalog: f.catalog,
    editionIds: options.editionIds,
    read: async (name) => f.files.get(name),
  });
  const sourceFiles = new Map([...selected, [enginePath, original], ['game/company.html', entry]]);
  const candidate = createEditionCandidate({
    compiled,
    sourceFiles,
    version: 'v1.0.0',
    sourceRevision: options.sourceRevision,
    sourceTree: 'b'.repeat(40),
  });
  const inventory = JSON.parse(candidate.files.get(candidate.edition.sourceInventory.path));
  assert.deepEqual(
    inventory.projections.find((row) => row.original.path === enginePath),
    {
      kind: 'selected-runtime-imports',
      original: { path: enginePath, bytes: original.length, sha256: digest(original) },
      output: pin,
    },
  );
  for (const archive of [
    candidate.edition.distribution.path,
    candidate.edition.sourceArchive.path,
  ]) {
    const members = readEditionZip(candidate.files.get(archive));
    assert.deepEqual(members.get(enginePath), projected);
    for (const name of ['game/content/coupa.json', 'game/editions/assets/coupa.png'])
      assert.deepEqual(members.get(name), f.files.get(name), name);
  }
  const admission = await validateEditionAdmission(
    {
      format: 'revealline-editions.v1',
      version: 'v1.0.0',
      sourceRevision: options.sourceRevision,
      sourceTree: 'b'.repeat(40),
      editions: [candidate.edition],
    },
    { read: async (row) => candidate.files.get(row.path) },
  );
  assert.equal(admission.zipMembersVerified, true);
});

async function retainedFixture() {
  const f = fixture(),
    catalog = structuredClone(f.catalog);
  for (const edition of catalog.editions) {
    const bootstrap = await loadEditionBootstrap({
      editionId: edition.id,
      catalogURL: 'https://fixture.test/catalog.json',
      contentBaseURL: 'https://fixture.test/',
      fetcher: async (request) =>
        new Response(
          new URL(request).pathname === '/catalog.json'
            ? bytes(f.catalog)
            : f.files.get(new URL(request).pathname.slice(1)),
        ),
    });
    const snapshot = await captureEditionPresentation(bootstrap),
      payload = bytes(snapshot);
    const descriptor = {
      id: snapshot.authoredPresentationSha256,
      path: `game/editions/retained/${edition.id}.json`,
      sha256: digest(payload),
      bytes: payload.length,
    };
    edition.presentationHistory = [descriptor];
    f.files.set(descriptor.path, payload);
  }
  const original = { ...catalog.assets[0] },
    replacement = Buffer.from('new approved selected artwork');
  Object.assign(catalog.assets[0], {
    path: 'game/editions/assets/coupa-new.png',
    bytes: replacement.length,
    sha256: digest(replacement),
  });
  f.files.set(catalog.assets[0].path, replacement);
  f.files.set(
    'game/company.html',
    Buffer.from('<!doctype html><html><head></head><body>Game</body></html>'),
  );
  return { ...f, catalog, original };
}

test('lazy shared panel styles retain exact bytes through selected compilation, archives and offline inventory', async (t) => {
  const f = fixture(),
    root = await fs.mkdtemp(path.join(os.tmpdir(), 'edition-panel-styles-')),
    styles = ['soundtrack-panel', 'install-offline-panel'],
    engine = new Map([
      ['game/company.html', Buffer.from('<html><script src="company-entry.mjs"></script></html>')],
      ['game/company-entry.mjs', Buffer.from('export const entry = "index.html";')],
      [
        'game/index.html',
        Buffer.from(
          '<html><script type="module" src="ui/soundtrack-panel.mjs"></script><script type="module" src="ui/install-offline-panel.mjs"></script></html>',
        ),
      ],
      ['game/controller-lab/index.html', Buffer.from('<html></html>')],
      ['game/replay-theater/index.html', Buffer.from('<html></html>')],
      ['game/snake/index.html', Buffer.from('<html></html>')],
      ['game/snake/play.html', Buffer.from('<html></html>')],
      ['game/editions/runtime-assets.json', Buffer.from('[]')],
      ['authoring/private/unselected.css', Buffer.from('UNSELECTED_PRIVATE_STYLE')],
    ]);
  t.after(() => fs.rm(root, { recursive: true, force: true }));
  for (const name of styles) {
    const owner = `game/ui/${name}.mjs`,
      original = await fs.readFile(new URL(`../../${owner}`, import.meta.url), 'utf8'),
      dynamicStyle = original.match(/style\.href = new URL\([^;]+;/)?.[0];
    assert.ok(dynamicStyle?.includes(`${name}.css`), `${owner} still owns its dynamic stylesheet`);
    // Keep the real non-import request; unrelated panel imports are not this
    // fixture's authority. The collector must follow the declared owner edge.
    engine.set(owner, Buffer.from(dynamicStyle));
    engine.set(
      `game/ui/${name}.css`,
      await fs.readFile(new URL(`../../game/ui/${name}.css`, import.meta.url)),
    );
  }
  for (const [name, contents] of engine) {
    await fs.mkdir(path.dirname(path.join(root, name)), { recursive: true });
    await fs.writeFile(path.join(root, name), contents);
  }
  const collected = await collectEditionEngineFiles({ root }),
    selected = await collectEditionSelectedFiles({
      catalog: f.catalog,
      editionIds: ['coupa-public'],
      read: async (name) => f.files.get(name),
    }),
    sourceFiles = new Map([...collected, ...selected]),
    compiled = await compileEdition({
      catalog: f.catalog,
      editionIds: ['coupa-public'],
      files: sourceFiles,
      enginePaths: [...collected.keys()],
      version: '1.0.0',
      sourceRevision: 'a'.repeat(40),
      offline: { basePath: '/game/' },
    }),
    candidate = createEditionCandidate({
      compiled,
      sourceFiles,
      version: 'v1.0.0',
      sourceRevision: 'a'.repeat(40),
      sourceTree: 'b'.repeat(40),
    }),
    distribution = readEditionZip(candidate.files.get(candidate.edition.distribution.path)),
    source = readEditionZip(candidate.files.get(candidate.edition.sourceArchive.path)),
    dependencies = JSON.parse(compiled.files.get('runtime-dependencies.json')),
    offline = JSON.parse(distribution.get('offline-cache.json')),
    sourceInventory = JSON.parse(source.get('source-inventory.json'));
  for (const name of styles) {
    const file = `game/ui/${name}.css`,
      original = engine.get(file),
      pin = { path: file, bytes: original.length, sha256: digest(original) };
    for (const output of [collected, compiled.files, distribution, source])
      assert.deepEqual(output.get(file), original, file);
    assert.ok(dependencies.resources.includes(file));
    assert.deepEqual(
      offline.files.find((row) => row.path === file),
      pin,
    );
    assert.deepEqual(
      sourceInventory.files.find((row) => row.path === file),
      pin,
    );
    const missing = new Map(compiled.files);
    missing.delete(file);
    assert.throws(() => validateEditionCodeClosure(missing), /missing a declared runtime resource/);
  }
  for (const output of [collected, compiled.files, distribution, source])
    assert.ok(
      [...output.keys()].every(
        (name) => !name.startsWith('authoring/') && !name.includes('droneaid'),
      ),
    );
  await fs.rm(path.join(root, 'game/ui/soundtrack-panel.css'));
  await assert.rejects(collectEditionEngineFiles({ root }), /ENOENT/);
});

test('selected retained presentation media stays exact in runtime, source and offline archives', async () => {
  const f = await retainedFixture(),
    requested = [];
  const selected = await collectEditionSelectedFiles({
    catalog: f.catalog,
    editionIds: ['coupa-public'],
    read: async (name) => {
      requested.push(name);
      return f.files.get(name);
    },
  });
  assert.ok(requested.every((name) => !name.includes('droneaid')));
  assert.ok(selected.has(f.original.path));
  const sourceFiles = new Map([
    ...selected,
    ['game/company.html', f.files.get('game/company.html')],
  ]);
  const options = {
    catalog: f.catalog,
    editionIds: ['coupa-public'],
    files: sourceFiles,
    enginePaths: ['game/company.html'],
    version: '1.0.0',
    sourceRevision: 'a'.repeat(40),
    offline: { basePath: '/game/' },
  };
  const compiled = await compileEdition(options),
    again = await compileEdition(options);
  assert.deepEqual(compiled.files, again.files);
  assert.equal(
    compiled.runtimeCatalog.assets.length,
    1,
    'old logical asset IDs do not alter current presentation assets',
  );
  assert.equal(compiled.runtimeCatalog.assets[0].path, 'game/editions/assets/coupa-new.png');
  const offline = JSON.parse(compiled.files.get('offline-cache.json'));
  for (const name of [f.original.path, f.catalog.editions[0].presentationHistory[0].path])
    assert.ok(offline.files.some((row) => row.path === name));
  const parity = await validateEditionProviderParity({ sourceFiles, catalog: f.catalog, compiled });
  assert.deepEqual(parity.retained, [
    { authoredPresentationSha256: f.catalog.editions[0].presentationHistory[0].id },
  ]);
  assert.notEqual(parity.authoredPresentationSha256, parity.retained[0].authoredPresentationSha256);
  const candidateOptions = {
    compiled,
    sourceFiles,
    version: 'v1.0.0',
    sourceRevision: options.sourceRevision,
    sourceTree: 'b'.repeat(40),
  };
  const candidate = createEditionCandidate(candidateOptions),
    foreign = f.catalog.editions[1].presentationHistory[0];
  for (const location of ['runtime', 'source']) {
    const extra = [foreign.path, f.files.get(foreign.path)];
    assert.throws(
      () =>
        createEditionCandidate({
          ...candidateOptions,
          ...(location === 'runtime'
            ? { compiled: { ...compiled, files: new Map([...compiled.files, extra]) } }
            : { sourceFiles: new Map([...sourceFiles, extra]) }),
        }),
      /unselected retained/,
    );
  }
  const envelope = {
    format: 'revealline-editions.v1',
    version: 'v1.0.0',
    sourceRevision: options.sourceRevision,
    sourceTree: 'b'.repeat(40),
    editions: [candidate.edition],
  };
  assert.equal(
    (
      await validateEditionAdmission(envelope, {
        read: async (row) => candidate.files.get(row.path),
      })
    ).zipMembersVerified,
    true,
  );
  const source = JSON.parse(candidate.files.get(candidate.edition.sourceInventory.path));
  assert.deepEqual(
    new Set(source.assets.map((asset) => asset.path)),
    new Set([f.original.path, 'game/editions/assets/coupa-new.png']),
  );
  for (const archive of [
    candidate.edition.sourceArchive.path,
    candidate.edition.distribution.path,
  ]) {
    const members = readEditionZip(candidate.files.get(archive));
    assert.deepEqual(members.get(f.original.path), f.files.get(f.original.path));
    assert.ok(
      [...members].every(
        ([name, value]) => !name.includes('droneaid') && !value.includes('droneaid-adventure'),
      ),
    );
  }
});

test('retained packaging rejects altered originals, foreign audiences and unselected snapshots', async () => {
  const f = await retainedFixture(),
    options = { catalog: f.catalog, files: f.files, editionIds: ['coupa-public'] };
  const saved = f.files.get(f.original.path);
  f.files.set(f.original.path, Buffer.from('changed original'));
  await assert.rejects(compileEdition(options), /bytes differ/);
  f.files.set(f.original.path, saved);
  const descriptor = f.catalog.editions[0].presentationHistory[0],
    snapshot = JSON.parse(f.files.get(descriptor.path));
  snapshot.catalog.editions[0].audience = 'other-audience';
  const payload = bytes(snapshot);
  f.files.set(descriptor.path, payload);
  Object.assign(descriptor, { bytes: payload.length, sha256: digest(payload) });
  await assert.rejects(compileEdition(options), /audience/);
});

test('whole-source eligibility includes registered historical-only originals before freezing candidates', async (t) => {
  const f = await retainedFixture(),
    root = await fs.mkdtemp(path.join(os.tmpdir(), 'edition-retained-source-'));
  t.after(() => fs.rm(root, { recursive: true, force: true }));
  const write = async (name, value) => {
    await fs.mkdir(path.dirname(path.join(root, name)), { recursive: true });
    await fs.writeFile(path.join(root, name), value);
  };
  for (const [name, value] of f.files) await write(name, value);
  await write('game/editions/catalog.json', bytes(f.catalog));
  const qualified = await checkEditionSourceEligibility(root);
  assert.equal(qualified.status, 'verified');
  assert.equal(
    qualified.assets,
    3,
    'two current pictures and the retained original are independently admitted',
  );
  await write(f.original.path, Buffer.from('changed original'));
  await assert.rejects(checkEditionSourceEligibility(root), /byte envelope|bytes differ/);
  await write(f.original.path, f.files.get(f.original.path));
  const record = f.catalog.editions[0].presentationHistory[0],
    original = f.files.get(record.path);
  await write(record.path, Buffer.concat([original, Buffer.from(' ')]));
  await assert.rejects(checkEditionSourceEligibility(root), /byte envelope/);
  await write(record.path, original);
  await write('game/editions/retained/unregistered.json', Buffer.from('{}'));
  await assert.rejects(checkEditionSourceEligibility(root), /unselected retained/);
  await fs.rm(path.join(root, 'game/editions/retained/unregistered.json'));
  await write('game/editions/assets/unregistered.png', Buffer.from('unknown'));
  await assert.rejects(checkEditionSourceEligibility(root), /no public eligibility/);
});

test('source admission retains an earlier campaign subset after expansion but rejects removed or duplicate permissions', async () => {
  const f = await retainedFixture();
  const originalEdition = f.catalog.editions.find((item) => item.id === 'coupa-public');
  const added = {
    ...f.catalog.campaigns.find((item) => item.id === originalEdition.campaignIds[0]),
    id: 'coupa-later-campaign',
  };
  const catalog = structuredClone(f.catalog);
  catalog.campaigns.push(added);
  const edition = catalog.editions.find((item) => item.id === 'coupa-public');
  edition.campaignIds.push(added.id);
  const selected = structuredClone(catalog);
  assert(
    editionPublicationAssets(selected, f.files).some((asset) => asset.path === f.original.path),
  );
  const removed = structuredClone(selected);
  removed.editions[0].campaignIds = [added.id];
  assert.throws(() => editionPublicationAssets(removed, f.files), /audience/);
  const descriptor = edition.presentationHistory[0];
  const snapshot = JSON.parse(f.files.get(descriptor.path));
  snapshot.catalog.editions[0].campaignIds.push(snapshot.catalog.editions[0].campaignIds[0]);
  const value = bytes(snapshot);
  Object.assign(selected.editions[0].presentationHistory[0], {
    bytes: value.length,
    sha256: digest(value),
  });
  assert.throws(
    () => editionPublicationAssets(selected, new Map([...f.files, [descriptor.path, value]])),
    /audience/,
  );
});

test('sparse publisher rejects retained foreign branding, private JSON, unselected art and path conflicts', async () => {
  const f = await retainedFixture(),
    base = JSON.parse(f.files.get(f.catalog.editions[0].presentationHistory[0].path));
  for (const mutate of [
    (value) => {
      value.catalog.defaultEditionId = 'another-edition';
    },
    (value) => {
      value.catalog.brands[0].id = 'another-brand';
    },
    (value) => {
      value.catalog.brands[0].publication = 'restricted';
    },
    (value) => {
      value.catalog.campaigns[0].brandId = 'another-brand';
    },
    (value) => {
      value.catalog.campaigns[0].publication = 'restricted';
    },
    (value) => {
      value.files[0].path = 'private/sentinel.json';
    },
    (value) => {
      value.catalog.assets.push({
        ...value.catalog.assets[0],
        id: 'unselected',
        path: 'game/editions/assets/foreign.png',
      });
    },
    (value) => {
      value.catalog.assets[0].path = 'game/editions/assets/coupa-new.png';
    },
  ]) {
    const snapshot = structuredClone(base),
      catalog = structuredClone(f.catalog);
    mutate(snapshot);
    const payload = bytes(snapshot),
      record = catalog.editions[0].presentationHistory[0];
    Object.assign(record, { bytes: payload.length, sha256: digest(payload) });
    assert.throws(() =>
      editionPublicationAssets(
        selectEditionClosure(catalog, ['coupa-public']),
        new Map([[record.path, payload]]),
      ),
    );
  }
});

test('catalog validates generic brands, immutable selections and strict allowlist lookup', () => {
  const { catalog } = fixture();
  assert.equal(resolveEditionSelection(catalog).brand.id, 'coupa');
  assert.equal(
    resolveEditionSelection(catalog, { editionId: 'droneaid-public' }).campaign.id,
    'droneaid-adventure',
  );
  assert.throws(() => resolveEditionSelection(catalog, { editionId: 'unshipped' }), /not included/);
  assert.throws(
    () => resolveEditionSelection(catalog, { campaignId: 'droneaid-adventure' }),
    /not included/,
  );
  assert.ok(Object.isFrozen(catalog.editions[0].boot));
  const bad = structuredClone(catalog);
  bad.brands[0].script = 'https://invalid.test/run.js';
  assert.throws(() => validateEditionRuntimeCatalog(bad), /not supported/);
  let invoked = false;
  Object.defineProperty(bad, 'editions', {
    enumerable: true,
    get() {
      invoked = true;
      return [];
    },
  });
  assert.throws(() => validateEditionRuntimeCatalog(bad), /accessors/);
  assert.equal(invoked, false);
});

test('repeated asset reads reuse only fully validated immutable edition closures', () => {
  const { catalog } = fixture();
  assert.equal(validateEditionRuntimeCatalog(catalog), catalog);
  const first = resolveEditionAssets(catalog);
  assert.equal(resolveEditionAssets(catalog, { editionId: 'coupa-public' }), first);
  assert.deepEqual(
    first.map((asset) => asset.id),
    ['coupa-hero'],
  );
  const other = resolveEditionAssets(catalog, { editionId: 'droneaid-public' });
  assert.deepEqual(
    other.map((asset) => asset.id),
    ['droneaid-hero'],
  );
  assert.notEqual(other, first);
  assert.throws(() => first.push(other[0]), TypeError);
  assert.throws(() => first[0].dependencies.push('droneaid-hero'), TypeError);
  assert.throws(() => {
    first[0].approved = false;
  }, TypeError);
  assert.throws(() => resolveEditionAssets(catalog, { editionId: 'omitted' }), /not included/);
});

test('mutable imports, copied catalogues and caller-frozen data cannot inherit admission', () => {
  const { catalog } = fixture();
  const imported = structuredClone(catalog);
  const admitted = validateEditionRuntimeCatalog(imported);
  resolveEditionAssets(imported);
  imported.assets[0].approved = false;
  assert.throws(() => resolveEditionAssets(imported), /publication approval/);
  assert.equal(resolveEditionAssets(admitted)[0].approved, true, 'Admitted snapshot stays exact.');

  const shallowFrozen = Object.freeze(structuredClone(catalog));
  resolveEditionAssets(shallowFrozen);
  shallowFrozen.assets[0].dependencies.push('undeclared');
  assert.throws(() => resolveEditionAssets(shallowFrozen), /dependency is missing/);

  const rejected = structuredClone(catalog);
  rejected.assets[0].publication = 'restricted';
  Object.freeze(rejected.assets[0]);
  Object.freeze(rejected.assets);
  Object.freeze(rejected);
  assert.throws(() => validateEditionRuntimeCatalog(rejected), /publication approval/);
  const changed = structuredClone(catalog);
  changed.assets[0].sha256 = 'd'.repeat(64);
  const replacement = validateEditionRuntimeCatalog(changed);
  assert.equal(resolveEditionAssets(replacement)[0].sha256, 'd'.repeat(64));
  assert.notEqual(
    resolveEditionAssets(replacement)[0].sha256,
    resolveEditionAssets(catalog)[0].sha256,
  );
});

test('shared-brand audience editions retain separate cached asset permissions', () => {
  const source = structuredClone(fixture().catalog);
  source.assets.push({
    ...source.assets[0],
    id: 'coupa-extended-picture',
    path: 'game/editions/assets/coupa-extended.png',
  });
  source.campaigns.push({
    ...source.campaigns[0],
    id: 'coupa-extended-campaign',
    sourcePath: 'game/content/coupa-extended.json',
    assetIds: ['coupa-extended-picture'],
  });
  source.editions.push({
    ...source.editions[0],
    id: 'coupa-extended-audience',
    audience: 'extended-learning',
    campaignIds: ['coupa-adventure', 'coupa-extended-campaign'],
  });
  const catalog = validateEditionRuntimeCatalog(source);
  const extended = resolveEditionAssets(catalog, { editionId: 'coupa-extended-audience' });
  const basic = resolveEditionAssets(catalog, { editionId: 'coupa-public' });
  assert.deepEqual(
    extended.map((asset) => asset.id),
    ['coupa-hero', 'coupa-extended-picture'],
  );
  assert.deepEqual(
    basic.map((asset) => asset.id),
    ['coupa-hero'],
  );
  assert.equal(resolveEditionAssets(catalog, { editionId: 'coupa-public' }), basic);
  assert.equal(resolveEditionAssets(catalog, { editionId: 'coupa-extended-audience' }), extended);
});

test('dependency closure rejects cycles, undeclared assets and cross-brand campaigns', () => {
  const { catalog } = fixture();
  const bad = structuredClone(catalog);
  bad.assets[0].dependencies = [bad.assets[0].id];
  assert.throws(() => validateEditionRuntimeCatalog(bad), /cycle/);
  bad.assets[0].dependencies = ['missing'];
  assert.throws(() => validateEditionRuntimeCatalog(bad), /missing/);
  bad.assets[0].dependencies = [];
  bad.editions[0].campaignIds.push('droneaid-adventure');
  assert.throws(() => validateEditionRuntimeCatalog(bad), /different/);
});

test('standalone HTML binds its real version in both attributes and text and rejects unsafe versions', async () => {
  const f = fixture();
  f.files.set(
    'game/company.html',
    Buffer.from(
      '<html data-build-version="__REVEALLINE_VERSION__"><head></head><body><span>__REVEALLINE_VERSION__</span></body></html>',
    ),
  );
  const result = await compileEdition({
    ...f,
    editionIds: ['coupa-public'],
    enginePaths: ['game/company.html'],
    version: '0.142.1',
  });
  const html = result.files.get('game/company.html').toString();
  assert.ok(!html.includes('__REVEALLINE_VERSION__'));
  assert.match(html, /data-build-version="0\.142\.1"/);
  assert.match(html, /<span>0\.142\.1<\/span>/);
  await assert.rejects(
    compileEdition({
      ...f,
      editionIds: ['coupa-public'],
      enginePaths: ['game/company.html'],
      version: '0.142.1"<&',
    }),
    /stable release version/,
  );
});

test('compilation excludes every omitted brand file and hashes exact selected media', async () => {
  const f = fixture();
  f.files.set('authoring/studio.json', bytes({ secret: 'do not publish' }));
  const options = { ...f, editionIds: ['coupa-public'] };
  const output = await compileEdition(options);
  assert.equal(output.runtimeCatalog.brands.length, 1);
  assert.equal(output.runtimeCatalog.brands[0].id, 'coupa');
  assert.ok(
    [...output.files.keys()].every(
      (name) => !name.includes('droneaid') && !name.includes('studio'),
    ),
  );
  assert.equal(JSON.parse(output.files.get('game/build-info.json')).editionId, 'coupa-public');
  assert.equal(output.manifest.catalogSha256, digest(output.files.get('edition-catalog.json')));
  f.files.set('game/editions/assets/coupa.png', Buffer.from('tampered'));
  await assert.rejects(compileEdition(options), /bytes differ/);
});

test('unselected restricted sources stay out, selected restricted and engine bypasses fail', async () => {
  const f = fixture(),
    catalog = structuredClone(f.catalog);
  catalog.publication = 'restricted';
  catalog.brands[1].publication = 'restricted';
  catalog.assets[1].publication = 'restricted';
  catalog.assets[1].approved = false;
  assert.equal(selectEditionClosure(catalog, ['coupa-public']).brands.length, 1);
  assert.throws(() => selectEditionClosure(catalog, ['droneaid-public']), /Restricted|approval/);
  await assert.rejects(
    compileEdition({
      ...f,
      catalog,
      editionIds: ['coupa-public'],
      enginePaths: ['game/content/droneaid.json'],
    }),
    /omitted/,
  );
  f.files.set('authoring/studio.json', bytes({ secret: 'sentinel' }));
  await assert.rejects(
    compileEdition({ ...f, editionIds: ['coupa-public'], enginePaths: ['authoring/studio.json'] }),
    /Source-only/,
  );
  for (const module of ['catalog', 'artwork'])
    await assert.rejects(
      compileEdition({
        ...f,
        editionIds: ['coupa-public'],
        enginePaths: [`game/company-campaigns/${module}.mjs`],
      }),
      /Build-time/,
    );
});

test('transitive assets are copied once and a boot file cannot sneak in omitted levels', async () => {
  const f = fixture(),
    catalog = structuredClone(f.catalog);
  const font = Buffer.from('shared-font');
  f.files.set('game/editions/assets/font.woff2', font);
  catalog.assets.push({
    id: 'shared-font',
    path: 'game/editions/assets/font.woff2',
    sha256: digest(font),
    bytes: font.length,
    publication: 'public',
    approved: true,
    dependencies: [],
  });
  catalog.assets[0].dependencies.push('shared-font');
  const result = await compileEdition({ ...f, catalog, editionIds: ['coupa-public'] });
  assert.ok(result.files.has('game/editions/assets/font.woff2'));
  f.files.set(catalog.editions[0].boot.campaign, bytes({ levels: [{ id: 'droneaid-mission' }] }));
  await assert.rejects(compileEdition({ ...f, catalog, editionIds: ['coupa-public'] }), /outside/);
});

test('static dependency validation catches omitted imports and CSS images', () => {
  const files = new Map([['game/app.mjs', Buffer.from("import './missing.mjs';")]]);
  assert.throws(() => validateEditionCodeClosure(files), /missing.*dependency/);
  files.set('game/missing.mjs', Buffer.from('export const value=1;'));
  assert.doesNotThrow(() => validateEditionCodeClosure(files));
  files.set('game/theme.css', Buffer.from("body{background:url('./omitted.png')}"));
  assert.throws(() => validateEditionCodeClosure(files), /omitted/);
});

test('web editions reject external or computed code dependencies except the exact staged iOS bridge', () => {
  for (const code of [
    "import 'https://external.test/renderer.mjs';",
    "export * from '/shared/renderer.mjs';",
    "import('unregistered-package');",
    "import('./' + selectedCompany + '.mjs');",
  ])
    assert.throws(
      () => editionCodeDependencies('game/company-player.mjs', Buffer.from(code)),
      /must be local|computed edition import/,
    );
  const native = "import(new URL('../native/bridge.mjs', import.meta.url).href)";
  assert.deepEqual(editionCodeDependencies('game/platform.mjs', Buffer.from(native)), []);
  assert.throws(
    () => editionCodeDependencies('game/other.mjs', Buffer.from(native)),
    /computed edition import/,
  );
  assert.throws(
    () =>
      editionCodeDependencies(
        'game/platform.mjs',
        Buffer.from(native.replace('bridge.mjs', 'other.mjs')),
      ),
    /computed edition import/,
  );
  assert.throws(
    () =>
      editionCodeDependencies(
        'game/company.css',
        Buffer.from('body{background:url(https://external.test/image.png)}'),
      ),
    /must be local/,
  );
  assert.deepEqual(
    editionCodeDependencies('game/entry.mjs', Buffer.from("export * from './dependency.mjs';")),
    ['game/dependency.mjs'],
  );
});

test('bootstrap preserves optional default and fetches only selected sources', async () => {
  const f = fixture(),
    requested = [];
  const fetcher = async (url) => {
    requested.push(url);
    const name = new URL(url, 'https://example.test/').pathname.slice(1);
    const value = name === 'edition-catalog.json' ? bytes(f.catalog) : f.files.get(name);
    return new Response(value ?? '', { status: value ? 200 : 404 });
  };
  const loaded = await loadEditionBootstrap({
    fetcher,
    catalogURL: 'https://example.test/edition-catalog.json',
    editionId: 'coupa-public',
  });
  assert.equal(loaded.route.profileKey, 'journey-coupa-public');
  assert.equal(loaded.source.campaigns.length, 1);
  assert.ok(!requested.some((url) => url.includes('droneaid')));
  assert.equal(
    await loadEditionBootstrap({ fetcher: async () => new Response('', { status: 404 }) }),
    null,
  );
  await assert.rejects(
    loadEditionBootstrap({
      fetcher: async () => new Response('', { status: 404 }),
      editionId: 'coupa-public',
    }),
    /unavailable/,
  );
});

test('project merging rejects mismatched or conflicting immutable gameplay', () => {
  const f = fixture(),
    selection = resolveEditionSelection(f.catalog);
  assert.throws(() => mergeEditionProjects(selection, [f.sources[1]]), /identity/);
  const project = mergeEditionProjects(selection, [f.sources[0]]);
  assert.equal(project.id, 'edition-coupa-public');
  assert.ok(Object.isFrozen(project));
  const leaked = structuredClone(f.sources[0]);
  leaked.missions.push({ ...structuredClone(leaked.missions[0]), id: 'unselected-mission' });
  assert.throws(() => mergeEditionProjects(selection, [leaked]), /omitted missions/);
  const history = structuredClone(f.sources[0]);
  history.maps.push({ ...structuredClone(history.maps[0]), revision: 'unused-history' });
  assert.throws(() => mergeEditionProjects(selection, [history]), /map history/);
});

test('hub and compiled edition share progress and presentation pins including transitive and edition assets', async () => {
  const f = fixture(),
    catalog = structuredClone(f.catalog);
  for (const id of ['edition-only', 'shared-dependency']) {
    const payload = Buffer.from(id),
      assetPath = `game/editions/assets/${id}.png`;
    f.files.set(assetPath, payload);
    catalog.assets.push({
      id,
      path: assetPath,
      sha256: digest(payload),
      bytes: payload.length,
      publication: 'public',
      approved: true,
      dependencies: [],
    });
  }
  catalog.editions[0].assetIds = ['edition-only'];
  catalog.assets[0].dependencies = ['shared-dependency'];
  const compile = await compileEdition({ ...f, catalog, editionIds: ['coupa-public'] });
  const load = (registry, files) =>
    loadEditionBootstrap({
      fetcher: async (url) =>
        new Response(
          new URL(url).pathname === '/edition-catalog.json'
            ? bytes(registry)
            : files.get(new URL(url).pathname.slice(1)),
        ),
      catalogURL: 'https://example.test/edition-catalog.json',
      editionId: 'coupa-public',
    });
  const hub = await load(catalog, f.files),
    standalone = await load(compile.runtimeCatalog, compile.files);
  assert.equal(hub.route.profileKey, standalone.route.profileKey);
  assert.equal(hub.route.sessionKey, standalone.route.sessionKey);
  const pin = await companyPresentationIdentity(hub);
  assert.equal(pin, await companyPresentationIdentity(standalone));
  for (const id of ['edition-only', 'shared-dependency']) {
    const changed = structuredClone(catalog);
    changed.assets.find((entry) => entry.id === id).sha256 = 'ab'.repeat(32);
    assert.notEqual(pin, await companyPresentationIdentity(await load(changed, f.files)), id);
  }
});

test('compiled first-paint and error shell uses only the selected brand and escapes HTML text', async () => {
  const f = fixture(),
    catalog = structuredClone(f.catalog);
  catalog.brands[0].name = `Coupa & <script>"brand"</script> '$&'`;
  catalog.brands[0].description = `Connect </p><img src=x onerror=alert(1)> & grow`;
  catalog.brands[0].logoAssetId = 'coupa-hero';
  catalog.editions[0].name = `Mission <b>one</b> & "two"`;
  f.files.set(
    catalog.editions[0].boot.themes,
    bytes({
      themes: [
        {
          ...createCompanyTheme('coupa'),
          id: 'coupa-theme',
          palette: {
            ...createCompanyTheme('coupa').palette,
            ink: '#123456',
            grid: '#234567',
            accent: '#abcdef',
          },
        },
      ],
    }),
  );
  const sourceHTML =
    '<!doctype html><html lang="en"><head><title>Reveal / Line</title><link rel="icon" href="DEFAULT-FPV-ICON.png"><link rel="apple-touch-icon" href="DEFAULT-FPV-TOUCH.png"><meta name="theme-color" content="#000000"></head><body><span id="brand-name">Reveal / Line</span><h1 id="home-title">Choose a company</h1><p id="brand-description">Neutral</p><span id="footer-brand">Default footer</span><img id="brand-logo" hidden alt="Default"><img id="home-art" hidden alt="Default"><a id="all-worlds" href="../index.html">All worlds</a></body></html>';
  f.files.set('game/company.html', Buffer.from(sourceHTML));
  const result = await compileEdition({
    ...f,
    catalog,
    editionIds: ['coupa-public'],
    enginePaths: ['game/company.html'],
  });
  const html = result.files.get('game/company.html').toString();
  assert.match(html, /<html data-edition-id="coupa-public" lang="en">/);
  assert.match(
    html,
    /<h1 id="home-title">Mission &lt;b&gt;one&lt;\/b&gt; &amp; &quot;two&quot;<\/h1>/,
  );
  assert.match(
    html,
    /Coupa &amp; &lt;script&gt;&quot;brand&quot;&lt;\/script&gt; &#39;\$&amp;&#39;/,
  );
  assert.match(html, /Connect &lt;\/p&gt;&lt;img src=x onerror=alert\(1\)&gt; &amp; grow/);
  assert.equal((html.match(/src="\.\.\/game\/editions\/assets\/coupa\.png"/g) ?? []).length, 2);
  assert.match(html, /<meta name="theme-color" content="#123456">/);
  assert.equal(html.includes('DEFAULT-FPV-'), false);
  assert.match(html, /<link rel="icon" href="\.\.\/game\/editions\/assets\/coupa\.png">/);
  assert.match(
    html,
    /<link rel="apple-touch-icon" href="\.\.\/game\/editions\/assets\/coupa\.png">/,
  );
  for (const token of ['--ink:#123456', '--grid:#234567', '--accent:#abcdef', '--panel:#234567'])
    assert.ok(html.includes(token));
  assert.ok(!html.includes('<script>') && !html.includes('x}body{') && !html.includes('--unsafe:'));
  assert.ok(
    !html.includes('id="all-worlds"') &&
      !html.includes('droneaid') &&
      !html.includes('Choose a company'),
  );
  assert.equal(
    f.files.get('game/company.html').toString(),
    sourceHTML,
    'The shared source shell must remain unbranded.',
  );
  const unsafe = JSON.parse(f.files.get(catalog.editions[0].boot.themes));
  unsafe.themes[0].palette.ink = '</style><script>bad()</script>';
  f.files.set(catalog.editions[0].boot.themes, bytes(unsafe));
  await assert.rejects(
    compileEdition({
      ...f,
      catalog,
      editionIds: ['coupa-public'],
      enginePaths: ['game/company.html'],
    }),
    /Invalid edition theme/,
  );
});

test('actual canonical and tool HTML brand first paint without replacing loader or localized recovery hooks', async () => {
  const f = fixture(),
    catalog = structuredClone(f.catalog),
    entries = [
      'game/company.html',
      'game/index.html',
      'game/controller-lab/index.html',
      'game/replay-theater/index.html',
    ],
    originals = new Map();
  catalog.brands[0].name = 'Selected & Brand';
  catalog.brands[0].logoAssetId = 'coupa-hero';
  catalog.editions[0].name = 'Selected <Audience>';
  for (const entry of entries) {
    const contents = await fs.readFile(new URL(`../../${entry}`, import.meta.url));
    originals.set(entry, contents);
    f.files.set(entry, contents);
  }
  const result = await compileEdition({
    ...f,
    catalog,
    editionIds: ['coupa-public'],
    enginePaths: entries,
    // This test owns HTML projection; the independent engine-closure suite
    // checks the real scripts, styles and lazy tools referenced by these pages.
    validateCode: false,
  });
  for (const entry of entries) {
    const html = result.files.get(entry).toString();
    assert.match(html, /<title>Selected &lt;Audience&gt;<\/title>/);
    assert.match(html, /<html data-edition-id="coupa-public"/);
    for (const script of originals
      .get(entry)
      .toString()
      .match(/<script\b[^>]*>/g) ?? [])
      assert.ok(html.includes(script), `${entry} retains its executable entry and loader hooks`);
    assert.deepEqual(f.files.get(entry), originals.get(entry));
  }
  const main = result.files.get('game/index.html').toString(),
    boot = main.slice(
      main.indexOf('<section id="boot-screen"'),
      main.indexOf('<div class="shell-bar"'),
    );
  assert.match(boot, /id="boot-title">Selected &lt;Audience&gt;<\/h1>/);
  assert.ok(!boot.includes('interface:findYourLine') && !boot.includes('REVEAL / LINE'));
  assert.match(
    boot,
    /class="launch-kicker[^"]*"><img class="edition-boot-logo" src="\.\.\/game\/editions\/assets\/coupa\.png" alt="" \/> Selected &amp; Brand<\/p>/,
  );
  for (const hook of ['boot-status', 'boot-retry', 'boot-online', 'boot-local', 'boot-detail'])
    assert.ok(boot.includes(`id="${hook}"`));
  for (const key of [
    'interface:preparingYourArcadeIfThisScreenStaysHereReloadOr',
    'interface:reloadGame',
    'interface:playOnline',
  ])
    assert.ok(boot.includes(`data-i18n="${key}"`));
  assert.ok(
    main.includes(
      'html[data-edition-id]:not([data-theme-styled="true"]) #boot-screen{background:var(--ink)',
    ),
  );
  for (const entry of entries.slice(2)) {
    const html = result.files.get(entry).toString();
    assert.match(
      html,
      /class="edition-boot-logo" src="\.\.\/\.\.\/game\/editions\/assets\/coupa\.png"/,
    );
    assert.ok(!html.includes('data-i18n="interface:revealLine"'));
    assert.ok(!html.includes('data-i18n="interface:revealLineReplayTheater"'));
  }
});

test('edition admission rejects mismatched themes and artwork outside the selected brand closure', async () => {
  const f = fixture(),
    boot = f.catalog.editions[0].boot;
  const originalTheme = JSON.parse(f.files.get(boot.themes));
  const compile = () => compileEdition({ ...f, editionIds: ['coupa-public'] });
  for (const theme of [
    { ...originalTheme.themes[0], id: 'droneaid-theme' },
    { ...originalTheme.themes[0], family: 'fpv' },
    { ...originalTheme.themes[0], player: 'unshipped-body' },
  ]) {
    f.files.set(boot.themes, bytes({ themes: [theme] }));
    await assert.rejects(compile(), /selected brand|selected presets|primary theme/);
  }
  f.files.set(boot.themes, bytes({ themes: [...originalTheme.themes, originalTheme.themes[0]] }));
  await assert.rejects(compile(), /unique campaign themes/);
  f.files.set(boot.themes, bytes(originalTheme));
  const presets = JSON.parse(f.files.get(boot.presets));
  for (const src of [
    '../../game/editions/assets/droneaid.png',
    '../../../outside.png',
    'https://external.test/logo.png',
    '../../game/editions/assets/coupa.png?tracking=1',
    '../../game/editions/assets/%63oupa.png',
  ]) {
    presets.characters['coupa-flower'].src = src;
    f.files.set(boot.presets, bytes(presets));
    await assert.rejects(compile(), /selected approved asset closure|local relative path/);
  }
  presets.characters['coupa-flower'].src = '../../game/editions/assets/coupa.png';
  f.files.set(boot.presets, bytes(presets));
  assert.ok((await compile()).files.has('game/editions/assets/coupa.png'));
  // The source hub performs the same admission before activating a renderer.
  presets.characters['coupa-flower'].src = '../../game/editions/assets/droneaid.png';
  f.files.set(boot.presets, bytes(presets));
  await assert.rejects(
    loadEditionBootstrap({
      catalogURL: 'https://example.test/edition-catalog.json',
      editionId: 'coupa-public',
      fetcher: async (url) =>
        new Response(
          new URL(url).pathname === '/edition-catalog.json'
            ? bytes(f.catalog)
            : f.files.get(new URL(url).pathname.slice(1)),
        ),
    }),
    /selected approved asset closure/,
  );
});

test('audience editions project primary and selected mission themes without other campaign labels', async () => {
  const f = fixture(),
    catalog = structuredClone(f.catalog),
    brand = catalog.brands[0],
    boot = catalog.editions[0].boot;
  const themes = JSON.parse(f.files.get(boot.themes)),
    primary = themes.themes[0];
  brand.themeIds = [brand.themeId, 'selected-campaign-theme', 'omitted-campaign-theme'];
  themes.themes.push(
    { ...primary, id: 'selected-campaign-theme', name: 'Selected campaign' },
    { ...primary, id: 'omitted-campaign-theme', name: 'OMITTED_CAMPAIGN_THEME_SENTINEL' },
  );
  f.files.set(boot.themes, bytes(themes));
  const project = JSON.parse(f.files.get(catalog.campaigns[0].sourcePath));
  project.missions[0].presentation.themeId = 'selected-campaign-theme';
  f.files.set(catalog.campaigns[0].sourcePath, bytes(project));
  const result = await compileEdition({ ...f, catalog, editionIds: ['coupa-public'] });
  assert.deepEqual(result.runtimeCatalog.brands[0].themeIds, [
    brand.themeId,
    'selected-campaign-theme',
  ]);
  assert.deepEqual(
    JSON.parse(result.files.get(boot.themes)).themes.map((theme) => theme.id),
    brand.themeIds.slice(0, 2),
  );
  assert.ok(!result.files.get(boot.themes).toString().includes('OMITTED_CAMPAIGN_THEME_SENTINEL'));
  assert.ok(
    f.files.get(boot.themes).toString().includes('OMITTED_CAMPAIGN_THEME_SENTINEL'),
    'Original commit input is not mutated.',
  );
  const load = (files, compiled) =>
    loadRuntimeContentProvider({
      locationRef: { href: 'https://example.test/game/index.html?edition=coupa-public' },
      documentRef: { documentElement: { dataset: compiled ? { editionId: 'coupa-public' } : {} } },
      fetcher: async (url) => {
        const value = files.get(new URL(url).pathname.slice(1));
        return new Response(value ?? '', { status: value ? 200 : 404 });
      },
    });
  const sourceProvider = await load(
      new Map([...f.files, ['game/editions/catalog.json', bytes(catalog)]]),
      false,
    ),
    compiledProvider = await load(result.files, true);
  assert.equal(
    sourceProvider.authoredPresentationSha256,
    compiledProvider.authoredPresentationSha256,
    'Source and compiled hosts must pin the exact same selected presentation after aggregate theme pruning.',
  );
  assert.deepEqual(
    await validateEditionProviderParity({ sourceFiles: f.files, catalog, compiled: result }),
    {
      editionId: 'coupa-public',
      authoredPresentationSha256: compiledProvider.authoredPresentationSha256,
    },
  );
  const changed = new Map(result.files),
    changedThemes = JSON.parse(changed.get(boot.themes));
  changedThemes.themes[0].palette.paper = '#eeeeee';
  changed.set(boot.themes, bytes(changedThemes));
  await assert.rejects(
    validateEditionProviderParity({
      sourceFiles: f.files,
      catalog,
      compiled: { ...result, files: changed },
    }),
    /presentation receipts differ/,
  );
  changed.delete(boot.themes);
  await assert.rejects(
    validateEditionProviderParity({
      sourceFiles: f.files,
      catalog,
      compiled: { ...result, files: changed },
    }),
    /undeclared input/,
  );
  project.missions[0].presentation.themeId = 'absent-theme';
  f.files.set(catalog.campaigns[0].sourcePath, bytes(project));
  await assert.rejects(
    compileEdition({ ...f, catalog, editionIds: ['coupa-public'] }),
    /mission theme is missing/,
  );
});

test('approved original-derived install icons ship both square sizes and the selected font only', async () => {
  const catalog = validateEditionRuntimeCatalog(
    await fs.readFile(new URL('../editions/catalog.json', import.meta.url), 'utf8'),
  );
  for (const editionId of ['coupa-adventure', 'droneaid-community']) {
    const selected = selectEditionClosure(catalog, [editionId]);
    const brand = selected.brands[0];
    const files = await collectEditionSelectedFiles({
      catalog,
      editionIds: [editionId],
      read: (path) => fs.readFile(new URL(`../../${path}`, import.meta.url)),
    });
    files.set(
      'game/company.html',
      Buffer.from(
        '<!doctype html><html lang="en"><head><title>Game</title></head><body></body></html>',
      ),
    );
    const result = await compileEdition({
      catalog,
      editionIds: [editionId],
      files,
      enginePaths: ['game/company.html'],
      version: '0.132.1',
      offline: { basePath: '/revealline/' },
    });
    const manifest = JSON.parse(result.files.get('app/manifest.webmanifest'));
    assert.deepEqual(
      manifest.icons.map((icon) => icon.sizes),
      ['192x192', '512x512'],
    );
    assert.ok(manifest.icons.every((icon) => icon.type === 'image/png' && icon.purpose === 'any'));
    for (const icon of manifest.icons) {
      const data = result.files.get(`app/${icon.src.slice(2)}`);
      const header = inspectImageDataUrl(`data:image/png;base64,${data.toString('base64')}`);
      assert.equal(header.valid, true);
      assert.equal(`${header.width}x${header.height}`, icon.sizes);
      const asset = selected.assets.find((asset) => asset.sha256 === digest(data));
      assert.equal(asset.bytes, data.length);
      assert.equal(asset.derivative.kind, 'square-install-icon');
      assert.equal(asset.derivative.paddingRatio, 0.12);
      assert.equal(
        asset.derivative.sourceSha256,
        selected.assets.find((source) => source.id === asset.derivative.sourceAssetId).sha256,
      );
    }
    const font = selected.assets.find((asset) => asset.id === brand.fontAssetId);
    assert.deepEqual(result.files.get('app/font.ttf'), files.get(font.path));
    assert.ok(result.files.get('game/company.html').toString().includes(`url("../${font.path}")`));
    assert.ok(
      result.files.get('app/index.html').toString().includes('font-family:"Company Brand"'),
    );
    assert.ok(
      ![...result.files.keys()].some((path) =>
        path.includes(`/assets/${brand.id === 'coupa' ? 'droneaid' : 'coupa'}/`),
      ),
    );
  }
  const bad = structuredClone(catalog),
    brand = bad.brands[0],
    primary = bad.assets.find((asset) => asset.id === brand.iconAssetId);
  primary.dependencies = [primary.derivative.sourceAssetId];
  assert.throws(() => validateEditionRuntimeCatalog(bad), /192 pixel derivative/);
  const wrongSource = structuredClone(catalog);
  wrongSource.assets.find(
    (asset) => asset.id === wrongSource.brands[0].iconAssetId,
  ).derivative.sourceSha256 = 'ab'.repeat(32);
  assert.throws(() => validateEditionRuntimeCatalog(wrongSource), /derivative|source hash/);
  const wrongFont = structuredClone(catalog);
  wrongFont.brands[0].fontAssetId = wrongFont.brands[0].logoAssetId;
  assert.throws(() => validateEditionRuntimeCatalog(wrongFont), /declared font/);
});

test('canonical public edition selector compiles one stable identity and canonical standalone launcher', async () => {
  const f = fixture();
  const catalog = structuredClone(f.catalog);
  const edition = catalog.editions[1];
  edition.id = 'droneaid-nl-community';
  edition.name = 'DroneAid / LINE';
  f.files.set(
    'game/company.html',
    Buffer.from('<!doctype html><html><head><title>Game</title></head><body></body></html>'),
  );
  const result = await compileEdition({
    ...f,
    catalog,
    editionIds: ['droneaid'],
    enginePaths: ['game/company.html'],
    version: 'v0.142.1',
    offline: { basePath: '/revealline/' },
  });
  assert.deepEqual(result.manifest.editionIds, ['droneaid-nl-community']);
  assert.deepEqual(
    result.runtimeCatalog.editions.map((item) => item.id),
    ['droneaid-nl-community'],
  );
  assert.equal(
    JSON.parse(result.files.get('game/build-info.json')).editionId,
    'droneaid-nl-community',
  );
  const app = JSON.parse(result.files.get('app/manifest.webmanifest'));
  assert.equal(app.id, '/revealline/editions/droneaid-nl-community/');
  assert.equal(app.scope, '/revealline/editions/droneaid/');
  assert.equal(app.start_url, '/revealline/editions/droneaid/app/');
  assert.equal(app.name, 'DroneAid / LINE');
  assert.match(
    result.files.get('game/company.html').toString(),
    /data-edition-id="droneaid-nl-community"/,
  );
});
