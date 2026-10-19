import { nativeCaptureSession as nativeSession } from '../capture-presentation-session.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { soloPage, SoloElement, memoryStorage, settle } from './helpers/solo-dom.mjs';
import { Document, Events } from './helpers/couch-dom.mjs';
import { attachEnemyGuide } from '../ui/enemy-guide.mjs';
import { managedIndexedDB } from './helpers/managed-idb.mjs';
import { RasterImage } from './helpers/raster-image.mjs';
import { authoritativeCheckpoint } from '../replay.mjs';
import { COMMUNITY_ROUTES } from '../community-routes.mjs';
import { editionPublicSlug } from '../edition-context.mjs';
import { WORKSHOP_TOOLS, workshopReturnLinks } from '../ui/workshop-return.mjs';

const sourceRoot = new URL('../../', import.meta.url);
const bytes = new Map();
function friendlyPage(t, href, options = {}) {
  const { browserSetup, ...pageOptions } = options;
  const url = new URL(href);
  const site = url.pathname.slice(0, url.pathname.indexOf('/game/') + 1);
  const requests = [];
  return soloPage(t, {
    titleScreen: true,
    search: url.search,
    journeyIndexedDB: managedIndexedDB().indexedDB,
    pictures: { Image: RasterImage },
    browserSetup(context) {
      const { globals } = context;
      Object.assign(globals.location, {
        href: url.href,
        pathname: url.pathname,
        search: url.search,
        origin: url.origin,
      });
      browserSetup?.(context);
    },
    async fetchResponse(value) {
      const request = new URL(value, `${url.origin}${site}game/index.html`);
      const relative =
        request.protocol === 'file:'
          ? request.pathname.slice(sourceRoot.pathname.length)
          : request.pathname.startsWith(site)
            ? request.pathname.slice(site.length)
            : null;
      assert.ok(
        relative && !relative.startsWith('../'),
        `Request escaped release: ${request.href}`,
      );
      requests.push(relative);
      try {
        if (!bytes.has(relative))
          bytes.set(relative, await readFile(new URL(relative, sourceRoot)));
        return new Response(bytes.get(relative));
      } catch (error) {
        if (error.code !== 'ENOENT') throw error;
        return new Response('', { status: 404 });
      }
    },
    ...pageOptions,
  }).then((page) => ({ page, requests }));
}

test('actual friendly More and Workshop links compose at the canonical game root', async (t) => {
  for (const [slug, query, base, editionId] of [
    ['coupa', '', 'http://localhost/', 'coupa-all'],
    ['droneaid', '', 'http://localhost/revealline/', 'droneaid-nl-community'],
    [
      'coupa',
      '?edition=coupa-culture&journey=legacy#details',
      'http://localhost/revealline/releases/v0.142.3/site/',
      'coupa-culture',
    ],
  ])
    await t.test(`${slug}${query}`, async (t) => {
      const href = `${base}game/communities/${slug}/${query}`;
      const { page } = await friendlyPage(t, href, {
        browserSetup({ document }) {
          // Native anchors reflect href assignments into their attributes. The
          // second production mount reads those attributes after the first mount.
          for (const link of document.querySelectorAll('a'))
            Object.defineProperty(link, 'href', {
              configurable: true,
              get() {
                return new URL(this.getAttribute('href') ?? '', href).href;
              },
              set(value) {
                this.setAttribute('href', value);
              },
            });
        },
      });
      const checkpoint = authoritativeCheckpoint(page.rendered.run);
      const saved = [...page.storage.map];
      page.$('shell-workshop').click();
      assert.equal(page.$('shell-workshop-dialog').open, true);
      const disclosure = page.$('shell-workshop-dialog').querySelector('details');
      // Model the native disclosure default; its links use the actual host mounts.
      disclosure.open = true;
      for (const { id, path, opener } of WORKSHOP_TOOLS) {
        const link = page.$(opener);
        const owner = page.$(
          id === 'controller-lab' ? 'settings-panel-controls' : 'shell-workshop-dialog',
        );
        assert.ok(owner.contains(link), `${id} stays in its current native menu owner`);
        assert.equal(link.hidden, false);
        const target = new URL(link.href);
        if (['controller-lab', 'replay-theater'].includes(id)) {
          assert.equal(target.origin + target.pathname, `${base}${path}`);
          assert.deepEqual([...target.searchParams].sort(), [
            ['edition', editionPublicSlug(editionId)],
            ['journey', editionId],
          ]);
          const returned = new URL(workshopReturnLinks(target.href, id).game);
          assert.equal(returned.origin + returned.pathname, `${base}game/`);
          assert.equal(returned.searchParams.get('edition'), editionPublicSlug(editionId));
          assert.equal(returned.searchParams.get('journey'), editionId);
        } else {
          assert.equal(target.href, `https://mekhovov.github.io/revealline/${path}`);
          assert.equal(link.target, '_blank');
          assert.equal(link.rel, 'noopener noreferrer');
        }
        assert.equal(target.hash, '');
      }
      page.frame(0);
      assert.equal(page.win.location.href, href);
      assert.equal(page.doc.body.dataset.editionId, editionId);
      assert.deepEqual(authoritativeCheckpoint(page.rendered.run), checkpoint);
      assert.deepEqual([...page.storage.map], saved);
      assert.deepEqual(page.errors, []);
    });
});

async function verifyFriendlyGameplay(t, slug, query, base) {
  const route = COMMUNITY_ROUTES.find((item) => item.slug === slug);
  const editionId = new URLSearchParams(query).get('edition') || route.editionId;
  const href = `${base}game/communities/${slug}/${query}`;
  const { page, requests } = await friendlyPage(t, href, { pictures: { Image: RasterImage } });
  assert.equal(page.win.location.href, href);
  assert.equal(page.doc.body.dataset.editionId, editionId);
  assert.deepEqual(
    [...page.$('edition-select').options].map((option) => option.value),
    route.editionIds,
  );
  page.$('shell-featured').click();
  await settle(() => page.doc.body.dataset.flightState === 'running');
  page.frame(0);
  assert.equal(page.rendered.actorAppearance.style, 'campaign');
  assert.ok(page.rendered.backdrop?.image?.width > 0, 'Accepted original raster was decoded.');
  const picture = page.rendered.backdrop;
  const tick = page.rendered.run.tick;
  page.key('ArrowDown');
  for (let i = 0; i < 12; i++) page.frame();
  page.key('ArrowDown', false);
  assert.ok(page.rendered.run.tick > tick);
  page.$('pause-button').click();
  page.frame(0);
  const before = authoritativeCheckpoint(page.rendered.run);
  const picker = page.$('edition-select');
  picker.value = route.brandId === 'coupa' ? 'droneaid-nl-community' : 'coupa-all';
  assert.equal(await picker.onchange(), false);
  assert.equal(picker.value, editionId);
  for (let i = 0; i < 3; i++) page.frame();
  assert.deepEqual(authoritativeCheckpoint(page.rendered.run), before);
  assert.equal(page.rendered.backdrop, picture);
  page.$('save-attempt-button').click();
  const key = `revealline.suspended.journey-${editionId}.v1.solo-v2`;
  await settle(() => !!page.storage.getItem(key));
  assert.equal(
    nativeSession(JSON.parse(page.storage.getItem(key))).actorAppearancePin.content.editionId,
    editionId,
  );
  assert.equal(page.win.location.href, href);
  assert.ok(requests.every((request) => !request.startsWith(`game/communities/${slug}/`)));
  assert.deepEqual(page.errors, []);
}

test('real friendly communities run in the common host with their own artwork, saves and controls', async (t) => {
  const cases = [
    ['coupa', '', 'http://localhost/'],
    ['droneaid', '', 'http://localhost/revealline/'],
    ['droneaid-community', '', 'http://localhost/revealline/releases/v0.142.3/site/'],
    ['coupa', '?edition=coupa-culture', 'http://localhost/revealline/releases/v0.142.3/site/'],
  ];
  for (const [slug, query, base] of cases)
    await t.test(`${slug}${query}`, (t) => verifyFriendlyGameplay(t, slug, query, base));
});

test('four newly added public communities preserve their current gameplay and save ownership at friendly routes', async (t) => {
  for (const slug of ['social-drone-ua', 'victory-drones', 'ukraine-culture', 'fpv-learning'])
    await t.test(slug, (t) => verifyFriendlyGameplay(t, slug, '', 'http://localhost/revealline/'));
});

test('the actual friendly host rejects a cross-company selector before content reads or flight setup', async (t) => {
  const requests = [];
  await assert.rejects(
    friendlyPage(t, 'http://localhost/game/communities/coupa/?edition=droneaid', {
      fetchResponse(value) {
        requests.push(String(value));
        throw new Error('Unexpected content read');
      },
    }),
    /cannot open another company/,
  );
  assert.deepEqual(requests, []);
});

test('the actual friendly field guide opens and closes without changing company progress', async (t) => {
  const getContext = SoloElement.prototype.getContext;
  t.mock.method(SoloElement.prototype, 'getContext', function (...args) {
    return this.id === 'enemy-guide-preview' ? null : getContext.apply(this, args);
  });
  const base = 'http://localhost/revealline/releases/v0.142.3/site/';
  const href = `${base}game/communities/coupa/?edition=coupa-culture#details`;
  const { page } = await friendlyPage(t, href);
  page.$('shell-featured').click();
  await settle(() => page.doc.body.dataset.flightState === 'running');
  page.key('ArrowDown');
  for (let i = 0; i < 12; i++) page.frame();
  page.key('ArrowDown', false);
  page.$('pause-button').click();
  page.frame(0);
  const before = authoritativeCheckpoint(page.rendered.run);
  const picture = page.rendered.backdrop;
  page.$('shell-guide').click();
  assert.equal(page.$('enemy-guide-dialog').open, true);
  assert.equal(page.$('enemy-guide-frame').hidden, true);
  // Opening the guide saves the held attempt through the normal Pause path.
  // Closing it must retain those exact saved bytes and never resume the flight.
  const saved = [...page.storage.map];
  // This actual company host checks guide ownership only. Its pre-existing
  // generic-theme lookup cannot yet launch a campaign-specific practice theme.
  // The independent panel test below exercises the real shared lesson handoff.
  page.$('enemy-guide-back').click();
  assert.equal(page.$('enemy-guide-dialog').open, false);
  for (let i = 0; i < 3; i++) page.frame();
  assert.equal(page.rendered.paused, true);
  assert.deepEqual(authoritativeCheckpoint(page.rendered.run), before);
  assert.equal(page.rendered.backdrop, picture);
  assert.deepEqual([...page.storage.map], saved);
  assert.equal(page.win.location.href, href);
  assert.equal(page.doc.body.dataset.editionId, 'coupa-culture');
  assert.deepEqual(page.errors, []);
});

test('friendly guide panel practice uses the shared release game root and restores its temporary handoff', async (t) => {
  const themes = JSON.parse(
    await readFile(new URL('../content/themes.json', import.meta.url)),
  ).themes;
  const base = 'http://localhost/revealline/releases/v0.142.3/site/';
  for (const { slug } of COMMUNITY_ROUTES)
    await t.test(slug, async (t) => {
      const doc = new Document();
      const host = new Events();
      host.location = new URL(`${base}game/communities/${slug}/?mission=first#details`);
      host.crypto = globalThis.crypto;
      const key = 'revealline.playground.current';
      host.sessionStorage = memoryStorage({ [key]: 'previous preview' });
      doc.createElement = (tag) => {
        const element = new SoloElement(doc, tag);
        element.getContext = () => null;
        return element;
      };
      let returned = 0;
      const guide = attachEnemyGuide({
        document: doc,
        window: host,
        themes,
        onReturn: () => returned++,
      });
      t.after(() => guide.dispose());
      guide.frame.contentWindow = {};
      guide.open();
      assert.equal(await doc.getElementById('enemy-guide-play').onclick(), true);
      const practice = new URL(guide.frame.src);
      assert.equal(practice.origin + practice.pathname, `${base}game/`);
      assert.equal(practice.searchParams.get('practice'), '1');
      assert.equal(practice.searchParams.get('practice-return'), 'enemy-guide');
      const token = practice.searchParams.get('enemy-workshop-session');
      assert.match(token, /^[a-f0-9]{32}$/);
      for (const name of ['edition', 'company', 'campaign', 'presentation', 'mission'])
        assert.equal(practice.searchParams.has(name), false);
      assert.equal(practice.hash, '');
      assert.notEqual(host.sessionStorage.getItem(key), 'previous preview');
      host.emit('message', {
        origin: practice.origin,
        source: guide.frame.contentWindow,
        data: { format: 'revealline.enemy-workshop-return.v1', session: token },
      });
      assert.equal(guide.frame.hidden, true);
      assert.equal(guide.frame.src, 'about:blank');
      assert.equal(guide.dialog.open, true);
      assert.equal(guide.practiceActive, false);
      assert.equal(returned, 1);
      assert.equal(host.sessionStorage.getItem(key), 'previous preview');
    });
});
