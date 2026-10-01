import test from 'node:test';
import assert from 'node:assert/strict';
import { access, readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { verifyApp } from '../scripts/verify-app.mjs';

const appRoot = fileURLToPath(new URL('../app/', import.meta.url));
const base = 'https://example.test/revealline-mmm/';
const game = `${base}game/index.html`;
const catalog = JSON.parse(await readFile(path.join(appRoot, 'edition-catalog.json'), 'utf8'));

function fileFetcher(requests = []) {
  return async (input) => {
    const url = new URL(input, base);
    assert.equal(url.origin, new URL(base).origin, `Unexpected external request: ${url}`);
    assert.ok(url.pathname.startsWith('/revealline-mmm/'), `Request escaped Pages subpath: ${url}`);
    const relative = decodeURIComponent(url.pathname.slice('/revealline-mmm/'.length));
    requests.push(relative);
    try {
      return new Response(await readFile(path.join(appRoot, relative)), { status: 200 });
    } catch (error) {
      if (error.code === 'ENOENT') return new Response('', { status: 404 });
      throw error;
    }
  };
}

test('the published artifact includes exactly five Coupa chapters, pinned media and a closed runtime', async () => {
  const report = await verifyApp(appRoot);
  const lock = JSON.parse(await readFile(new URL('../upstream.lock.json', import.meta.url), 'utf8'));
  assert.equal(report.campaigns, 5);
  assert.equal(report.missions, 30);
  assert.equal(report.sourceRevision, lock.commit);
  assert.match(lock.commit, /^[a-f0-9]{40}$/);
  assert.equal(lock.repository, 'mekhovov/revealline');
  assert.equal(lock.editionId, 'coupa-all');
  assert.equal(lock.brandId, 'coupa');
});

test('the actual upstream content provider boots all 30 missions under a GitHub Pages subpath', async () => {
  const { loadRuntimeContentProvider } = await import('../app/game/runtime-content-provider.mjs');
  const requests = [];
  const provider = await loadRuntimeContentProvider({
    documentRef: { documentElement: { dataset: { editionId: 'coupa-all' } } },
    locationRef: { href: game },
    fetcher: fileFetcher(requests),
  });
  assert.equal(provider.kind, 'edition');
  assert.equal(provider.editionId, 'coupa-all');
  assert.equal(provider.selection.brand.id, 'coupa');
  assert.equal(provider.selection.campaigns.length, 5);
  assert.equal(provider.bootstrap.source.missions.length, 30);
  assert.equal(provider.rootURL, base);
  assert.deepEqual(provider.boot[4].packs, []);
  assert.deepEqual(provider.missionIndex.missions, []);
  assert.equal(provider.route.profileKey, 'journey-coupa-all', 'Portable logical progress identity stays compatible');
  assert.ok(provider.route.sessionKey.startsWith('revealline-mmm.suspended.'));
  assert.ok(provider.legacySessionKey.startsWith('revealline-mmm.suspended.'));
  assert.ok(requests.includes('edition-catalog.json'));
  assert.ok(requests.every((request) => !/(?:droneaid|ukraine|fpv-learning|optional-practice)/.test(request)));
  assert.throws(() => provider.href({ edition: 'droneaid-nl-community' }));
  assert.throws(() => provider.href({ edition: 'coupa-foundations' }));
  const ownURL = new URL(provider.href());
  assert.equal(ownURL.pathname, '/revealline-mmm/game/index.html');
  assert.ok(['coupa-all', 'coupa'].includes(ownURL.searchParams.get('edition')));
});

test('foreign edition and chapter selectors fail before loading content or assets', async () => {
  const { loadRuntimeContentProvider } = await import('../app/game/runtime-content-provider.mjs');
  for (const query of [
    'edition=droneaid-nl-community', 'edition=fpv-learning', 'edition=coupa-foundations',
    'campaign=droneaid-community', 'campaign=unknown', 'course=fpv', 'practice=1',
    'mode=versus', 'mode=team', 'mode=fpv', 'import=foreign.json', 'handoff=foreign',
    'studio-preview=1', 'pack=https%3A%2F%2Fexample.test%2Fforeign.json',
    'edition=coupa-all&edition=droneaid-nl-community',
  ]) {
    const requests = [];
    await assert.rejects(loadRuntimeContentProvider({
      documentRef: { documentElement: { dataset: { editionId: 'coupa-all' } } },
      locationRef: { href: `${game}?${query}` },
      fetcher: fileFetcher(requests),
    }), undefined, query);
    assert.deepEqual(requests, [], `${query} must fail before fetching`);
  }
});

test('the web Coupa presentation never requests omitted native or FPV fallback resources', async () => {
  const { nativePlatform, onNativeInactive } = await import('../app/game/platform.mjs');
  const { createEnemyBodyAssets } = await import('../app/game/ui/enemy-body-assets.mjs');
  assert.equal(nativePlatform({ href: game }), null);
  const dispose = await onNativeInactive(() => {}, {
    locationRef: { href: game },
    loadBridge: () => assert.fail('The web build cannot request an iOS bridge'),
  });
  dispose();
  const { themes } = JSON.parse(await readFile(path.join(appRoot, catalog.editions[0].boot.themes), 'utf8'));
  let calls = 0;
  const bodies = createEnemyBodyAssets({ catalog: () => { calls++; throw new Error('Unselected FPV artwork'); } });
  for (const theme of themes) bodies.update([{ themeId: theme.id, type: 'bouncer' }]);
  await Promise.resolve();
  assert.equal(calls, 0);
  assert.equal(bodies.status(), '');
  bodies.clear();
});

test('branded guards reject alternate modes, imported packs and escape navigation', async () => {
  const { assertBrandedLocation, assertBrandedPacks, brandedHrefAllowed } =
    await import('../app/game/branded-isolation.mjs');
  for (const chapter of catalog.campaigns)
    assert.doesNotThrow(() => assertBrandedLocation(`${game}?campaign=${chapter.id}`));
  assert.doesNotThrow(() => assertBrandedLocation(game));
  assert.doesNotThrow(() => assertBrandedPacks({ packs: [] }));
  for (const packs of [{ packs: [{ id: 'other' }] }, { packs: [{ id: 'coupa-import', campaigns: [] }] }])
    assert.throws(() => assertBrandedPacks(packs));
  for (const target of [
    'https://foreign.test/game/', '../index.html?edition=droneaid', './communities/droneaid/',
    './controller-lab/', './replay-theater/', '../optional-practice/', './index.html?practice=1',
    './downloads.html',
    './index.html?edition=fpv-learning', './index.html?campaign=unknown',
  ]) assert.equal(brandedHrefAllowed(target, game), false, target);
  assert.equal(brandedHrefAllowed('./index.html', game), true);
});

test('shared-origin Pages apps have independent storage without changing portable content formats', async () => {
  const { resolveEditionContext, installedStateKey } = await import('../app/game/edition-context.mjs');
  const { JOURNEY_PROFILE_DATABASE } = await import('../app/game/profile-database.mjs');
  const { MANAGED_MEDIA_DATABASE } = await import('../app/game/managed-media-store.mjs');
  const { MEDIA_LIBRARY_FORMAT } = await import('../app/game/media-library.mjs');
  const official = await import('../app/game/official-downloads.mjs');
  const { createDemoIndexedDBStorage } = await import('../app/game/demo-library.mjs');
  assert.equal(JOURNEY_PROFILE_DATABASE, 'revealline-mmm-journey-v1');
  assert.equal(MANAGED_MEDIA_DATABASE, 'revealline-mmm-soundtrack-v1');
  assert.equal(MEDIA_LIBRARY_FORMAT, 'revealline-media-library.v1');
  for (const key of ['OFFICIAL_CACHE', 'DOWNLOAD_STATE_CACHE', 'OFFICIAL_ORIGINAL_INDEX'])
    assert.ok(official[key].startsWith('revealline-mmm-'), key);
  let demoDatabase;
  const recording = createDemoIndexedDBStorage({ indexedDB: { open(name) {
    demoDatabase = name;
    throw new Error('Database access intercepted');
  } } });
  await assert.rejects(recording.read(), /Database access intercepted/);
  assert.equal(demoDatabase, 'revealline-mmm-demo-recordings-v1');
  recording.close();
  assert.ok(installedStateKey('coupa-all').startsWith('revealline-mmm.'));
  const development = resolveEditionContext({ editionId: 'coupa-all', version: 'DEV' });
  const release = resolveEditionContext({ editionId: 'coupa-all', version: 'v0.142.4' });
  for (const key of ['profileKey', 'packsKey', 'sessionKey', 'writerKey', 'lockKey', 'journalKey', 'indexKey', 'externalJournalKey']) {
    assert.ok(development[key].startsWith('revealline-mmm.'), key);
    assert.ok(release[key].startsWith('revealline-mmm.'), key);
    assert.notEqual(development[key], release[key], key);
  }
  assert.equal(development.editionId, 'coupa-all');
  assert.equal(release.editionId, 'coupa-all');
});

test('the real pointer, inventory and backup readers accept the app storage namespace', async () => {
  const { resolveEditionContext } = await import('../app/game/edition-context.mjs');
  const { channelFromStorageKey, recoveryChannel } = await import('../app/game/profile-channel.mjs');
  const { createExternalChapterPointerStore, createExternalChapterInventoryReader } =
    await import('../app/game/external-chapter-pointer.mjs');
  const { createExternalBackupAssets } = await import('../app/game/external-backup-assets.mjs');
  const indexedDB = { open() { assert.fail('Constructor validation must not open a database'); } };
  const storage = { getItem() { return null; } };
  const lockManager = { request() { assert.fail('Constructor validation must not acquire a lock'); } };
  for (const version of ['DEV', 'v0.142.4']) {
    const context = resolveEditionContext({ editionId: 'coupa-all', version });
    const options = { ...context, indexedDB, storage, lockManager };
    const pointer = createExternalChapterPointerStore(options);
    assert.equal(pointer.keys.profileKey, context.profileKey);
    assert.equal(pointer.keys.packsKey, context.packsKey);
    assert.ok(pointer.keys.writerKey.startsWith('revealline-mmm.company.'));
    const backup = createExternalBackupAssets(options);
    assert.equal(backup.keys.profileKey, context.profileKey);
    assert.equal(backup.keys.sessionKey, context.sessionKey);
    assert.doesNotThrow(() => createExternalChapterInventoryReader(options));
    const recovered = recoveryChannel(context.channel, 'v0.142.4', { editionId: 'coupa-all' });
    assert.equal(recovered.profileKey, context.profileKey);
    for (const key of ['profileKey', 'packsKey', 'sessionKey', 'journalKey', 'indexKey', 'externalJournalKey'])
      assert.equal(channelFromStorageKey(context[key], 'v0.142.4', { editionId: 'coupa-all' })?.profileKey,
        context.profileKey, key);
    assert.throws(() => createExternalChapterPointerStore({ ...options,
      profileKey: context.profileKey.replace('revealline-mmm.', 'revealline.'),
      packsKey: context.packsKey.replace('revealline-mmm.', 'revealline.'),
    }));
    pointer.close();
    backup.close();
  }
});

test('Coupa learning progress neither reads nor overwrites the main game save', async () => {
  const { createCompanyLearningStore, createLearningAttempt } =
    await import('../app/game/company-campaigns/learning.mjs');
  const descriptor = catalog.campaigns.find((campaign) => campaign.lessonPath);
  const lessons = JSON.parse(await readFile(path.join(appRoot, descriptor.lessonPath), 'utf8'));
  const attempt = createLearningAttempt(lessons[0]);
  const previousKey = 'revealline.company-learning.coupa-all.v1';
  const previous = JSON.stringify({ format: 'revealline-learning-store.v1', editionId: 'coupa-all', attempts: [attempt] });
  const values = new Map([[previousKey, previous]]);
  const store = createCompanyLearningStore({ editionId: 'coupa-all', lessons, storage: {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, value),
  } });
  assert.equal(store.load(lessons[0].missionId), null);
  assert.equal(store.save(attempt), true);
  assert.deepEqual(store.load(lessons[0].missionId), attempt);
  assert.ok(values.has('revealline-mmm.company-learning.coupa-all.v1'));
  assert.equal(values.get(previousKey), previous);
});

test('recovery discovers app profiles without reporting unrelated main-game storage', async () => {
  const { createProfileChannelReader } = await import('../app/game/profile-channel-reader.mjs');
  const { resolveEditionContext } = await import('../app/game/edition-context.mjs');
  const context = resolveEditionContext({ editionId: 'coupa-all', version: 'v0.142.4' });
  const keys = [context.profileKey, context.profileKey.replace('revealline-mmm.', 'revealline.'),
    'revealline.another-main-game-setting.v1'];
  const reader = createProfileChannelReader({ editionId: 'coupa-all', currentVersion: 'v0.142.4',
    indexedDB: null,
    storage: { length: keys.length, key: (index) => keys[index] ?? null, getItem: () => null },
  });
  const result = await reader.discover();
  assert.deepEqual(result.channels.map(({ profileKey }) => profileKey), [context.profileKey]);
  assert.deepEqual(result.diagnostics.filter(({ component }) => component === 'discovery'), []);
  await reader.close();
});

test('the supplemental and official chapter registries cannot supply unrelated playable content', async () => {
  const external = await import('../app/game/editions/standalone/external-chapters.mjs');
  const routes = await import('../app/game/editions/standalone/route-loader.mjs');
  const host = await readFile(path.join(appRoot, 'game/app.mjs'), 'utf8');
  assert.doesNotMatch(host, /loadSupplementalJourneySources/);
  for (const omitted of ['game/runtime-library-sources.mjs', 'game/external-chapter-source.mjs', 'game/content-design/route-loader.mjs'])
    await assert.rejects(access(path.join(appRoot, omitted)), { code: 'ENOENT' });
  assert.deepEqual(external.SOURCE_EXTERNAL_CHAPTERS, []);
  assert.deepEqual(external.SOURCE_EXTERNAL_EDITIONS, []);
  assert.equal(external.sourceExternalChapter('droneaid-nl-community'), null);
  assert.throws(() => external.prepareSourceExternalChapter('fpv-learning'));
  assert.equal(await routes.loadAuthoredJourneyRoute('fpv-learning'), null);
});
