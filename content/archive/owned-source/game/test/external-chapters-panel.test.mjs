import test from 'node:test';
import assert from 'node:assert/strict';
import { Document } from './helpers/couch-dom.mjs';
import { SoloElement } from './helpers/solo-dom.mjs';
import { attachOptionalChaptersPanel } from '../ui/optional-chapters-panel.mjs';
import { SOURCE_EXTERNAL_EDITIONS } from '../external-chapter-source.mjs';
import { waitFor } from './helpers/wait-for.mjs';
function fixture(t, chapters, options = {}) {
  const doc = new Document();
  doc.createElement = (tag) => new SoloElement(doc, tag);
  const panel = attachOptionalChaptersPanel({
    document: doc,
    getLibrary: () => ({ packs: [] }),
    sourceChapters: chapters,
    loadCatalog: async () => ({ format: 'revealline-optional-chapters.v1', packs: [] }),
    ...options,
  });
  t.after(() => panel.dispose());
  return { panel, $: (id) => doc.getElementById(`optional-worlds-${id}`) };
}
const chapter = (id, extra = {}) => ({
  id,
  name: id,
  description: `Exact ${id}`,
  sourceOnly: false,
  bytes: 1024,
  inspect: async () => ({ status: 'absent' }),
  choose: async () => {},
  ...extra,
});
test('only the chosen card supplies native files and shared busy blocks every other card until explicit Choose', async (t) => {
  let finish,
    seen,
    ready = false,
    selected = 0;
  const f = fixture(t, [
    chapter('a', {
      inspect: async () => ({ status: ready ? 'installed' : 'absent' }),
      install: async (files) => {
        seen = files;
        await new Promise((r) => {
          finish = r;
        });
        ready = true;
      },
      choose: async () => {
        selected++;
      },
    }),
    chapter('b', { install: () => assert.fail('other card must remain blocked') }),
  ]);
  await f.panel.open();
  const pack = new Blob(['a']),
    media = new Blob(['image-a']);
  f.$('source-a-pack').files = [pack];
  f.$('source-a-media').files = [media];
  const pending = f.$('source-a-install').onclick();
  assert.deepEqual(seen, { pack, media });
  assert(f.$('source-b-install').disabled);
  assert(f.$('source-a-choose').disabled);
  await f.$('source-b-install').onclick();
  assert.equal(selected, 0);
  finish();
  await pending;
  assert.equal(f.$('source-a-choose').disabled, false);
  assert.equal(f.$('source-b-choose').disabled, true);
  assert(f.$('dialog').open);
  await f.$('source-a-choose').onclick();
  assert.equal(selected, 1);
  assert.equal(f.$('dialog').open, false);
});
test('Back cancels old download; reopening then completing another card never publishes stale first-card readiness', async (t) => {
  let finish, signal;
  const f = fixture(t, [
    chapter('a', {
      download: async (o) => {
        signal = o.signal;
        await new Promise((r) => {
          finish = r;
        });
      },
      inspect: async () => ({ status: 'absent' }),
    }),
    chapter('b', { download: async () => {}, inspect: async () => ({ status: 'installed' }) }),
  ]);
  await f.panel.open();
  const pending = f.$('source-a-download').onclick();
  assert.match(f.$('status').textContent, /Downloading/);
  f.$('top-back').click();
  assert(signal.aborted);
  await f.panel.open();
  const current = f.$('status').textContent;
  finish();
  await pending;
  assert.equal(f.$('status').textContent, current);
  assert.equal(f.$('source-a-choose').disabled, true);
  assert.equal(f.$('source-b-choose').disabled, false);
});
test('late inspection from an old multi-card open cannot clear the new card readiness or busy owner', async (t) => {
  const jobs = [];
  let first = true;
  const f = fixture(t, [
    chapter('a'),
    chapter('b', {
      inspect: async ({ signal }) =>
        first ? { status: 'absent' } : new Promise((resolve) => jobs.push({ resolve, signal })),
    }),
  ]);
  await f.panel.open();
  f.panel.close();
  first = false;
  const old = f.panel.open();
  await waitFor(() => jobs.length === 1);
  f.panel.close();
  const fresh = f.panel.open();
  await waitFor(() => jobs.length === 2);
  jobs[0].resolve({ status: 'installed' });
  await old;
  assert(f.$('reload').disabled);
  assert.equal(f.$('source-b-choose').disabled, true);
  jobs[1].resolve({ status: 'installed' });
  await fresh;
  assert.equal(f.$('source-b-choose').disabled, false);
});

test('sixteen real choices stay reachable offline and an active Countercurrent owner survives filtering and retry', async (t) => {
  let rejectDownload,
    attempts = 0,
    selected = 0,
    ready = false;
  const editions = SOURCE_EXTERNAL_EDITIONS.map((edition) => ({
    ...edition,
    id: edition.descriptor.id,
    themeId: edition.descriptor.themeId,
  }));
  const target = editions.find((e) => e.id === 'countercurrent-coupa');
  assert.ok(target);
  const f = fixture(
    t,
    editions.map((edition) =>
      chapter(edition.id, {
        ...edition,
        inspect: async () => ({
          status: edition.id === target.id && ready ? 'installed' : 'absent',
        }),
        download: async () => {
          assert.equal(edition.id, target.id, 'only the explicitly chosen owner is downloaded');
          attempts++;
          if (attempts === 1)
            await new Promise((_, reject) => {
              rejectDownload = reject;
            });
          ready = true;
        },
        choose: async () => {
          assert.equal(edition.id, target.id);
          selected++;
        },
      }),
    ),
    {
      loadCatalog: async () => {
        throw new Error('Remote catalog unavailable');
      },
    },
  );
  await f.panel.open();
  const visible = () => editions.filter((e) => !f.$(`source-${e.id}-card`).hidden).map((e) => e.id);
  assert.match(f.$('page').textContent, /Page 1 of 4 · 16 chapters/);
  const visited = [];
  for (let page = 0; page < 4; page++) {
    assert.equal(visible().length, 4);
    visited.push(...visible());
    if (page < 3) f.$('next').click();
  }
  assert.deepEqual(
    visited,
    editions.map((e) => e.id),
  );
  assert.equal(attempts, 0);
  const action = f.$(`source-${target.id}-download`).onclick();
  await waitFor(() => rejectDownload);
  f.$('theme').value = 'ukraine';
  f.$('theme').onchange();
  assert(visible().includes(target.id), 'the in-flight exact card remains visible across filters');
  assert.match(f.$('operation').textContent, /Spend Network.*Countercurrent/);
  assert.equal(attempts, 1);
  assert.equal(selected, 0);
  rejectDownload(new Error('The exact originals response was interrupted.'));
  await action;
  assert(visible().includes(target.id));
  assert.equal(f.$(`source-${target.id}-download`).disabled, false);
  assert.equal(f.$(`source-${target.id}-choose`).disabled, true);
  await f.$(`source-${target.id}-download`).onclick();
  assert.equal(attempts, 2);
  assert.equal(selected, 0, 'retry neither auto-selects nor starts a game');
  assert.equal(f.$(`source-${target.id}-choose`).disabled, false);
  await f.$(`source-${target.id}-choose`).onclick();
  assert.equal(selected, 1);
  assert.equal(f.$('dialog').open, false);
});

function pictureConflict() {
  const error = new Error('A retained picture binding conflicts with the external chapter.');
  error.name = 'RetainedPictureAssignmentConflict';
  error.conflicts = [
    {
      identity: { levelId: 'internal-fixture-map-id' },
      levelName: 'Orchard Crossing',
      retained: { presentationId: 'custom.orchard', revision: 2 },
    },
  ];
  return error;
}
for (const pathway of ['download-play', 'download-install', 'upload']) {
  test(`picture conflict ${pathway} requires explicit review and never auto-launches`, async (t) => {
    const error = pictureConflict();
    let ready = false,
      played = 0;
    const calls = [];
    const f = fixture(t, [
      chapter('a', {
        ...(pathway === 'download-play'
          ? {
              play: async () => {
                played++;
              },
            }
          : {}),
        inspect: async () => ({ status: ready ? 'installed' : 'absent' }),
        download: async (options) => {
          calls.push(options);
          if (!options.pictureReview) throw error;
          assert.equal(options.pictureReview, error);
          ready = true;
        },
        install: async (files, options) => {
          calls.push({ ...options, files });
          if (!options.pictureReview) throw error;
          assert.equal(options.pictureReview, error);
          assert.equal(files.pack, pack);
          assert.equal(files.media, media);
          ready = true;
        },
      }),
    ]);
    const pack = new Blob(['pack']),
      media = new Blob(['media']);
    await f.panel.open();
    f.$('source-a-pack').files = [pack];
    f.$('source-a-media').files = [media];
    const opener = f.$(pathway === 'upload' ? 'source-a-install' : 'source-a-download');
    opener.focus();
    await opener.onclick();
    assert.equal(calls.length, 1);
    assert.equal(f.$('source-a-picture-review').hidden, false);
    assert.match(
      f.$('source-a-picture-review-text').textContent,
      /Orchard Crossing: your selected picture/,
    );
    assert.equal(
      f.$('source-a-picture-cancel').ownerDocument.activeElement,
      f.$('source-a-picture-cancel'),
    );
    assert.equal(played, 0);
    f.$('source-a-picture-confirm').focus();
    await f.$('source-a-picture-confirm').onclick();
    assert.equal(calls.length, 2);
    assert.equal(played, 0);
    assert.equal(f.$('dialog').open, true);
    assert.equal(f.$('source-a-picture-review').hidden, true);
    const choose = f.$(pathway === 'download-play' ? 'source-a-download' : 'source-a-choose');
    assert.equal(choose.disabled, false);
    assert.equal(choose.ownerDocument.activeElement, choose);
    assert.match(f.$('status').textContent, /paused flight.*kept/);
  });
}
for (const exit of ['cancel', 'close', 'files', 'refresh']) {
  test(`picture review discarded after ${exit}; hidden confirm cannot install`, async (t) => {
    let calls = 0;
    const f = fixture(t, [
      chapter('a', {
        download: async () => {
          calls++;
          throw pictureConflict();
        },
      }),
    ]);
    await f.panel.open();
    const opener = f.$('source-a-download');
    opener.focus();
    await opener.onclick();
    assert.equal(f.$('source-a-picture-review').hidden, false);
    if (exit === 'cancel') f.$('source-a-picture-cancel').onclick();
    else if (exit === 'close') {
      f.panel.close();
      await f.panel.open();
    } else if (exit === 'files') f.$('source-a-pack').onchange();
    else await f.$('reload').onclick();
    assert.equal(f.$('source-a-picture-review').hidden, true);
    await f.$('source-a-picture-confirm').onclick();
    assert.equal(calls, 1);
  });
}
test('late conflict after Back never reopens review or steals focus', async (t) => {
  let reject;
  const f = fixture(t, [
    chapter('a', {
      download: () =>
        new Promise((_, fail) => {
          reject = fail;
        }),
    }),
  ]);
  await f.panel.open();
  const pending = f.$('source-a-download').onclick();
  f.panel.close();
  reject(pictureConflict());
  await pending;
  assert.equal(f.$('source-a-picture-review').hidden, true);
  assert.equal(f.$('dialog').open, false);
});

test('confirmed installation reports committed originals when later inspection fails', async (t) => {
  let installed = false;
  const f = fixture(t, [
    chapter('a', {
      download: async ({ pictureReview }) => {
        if (!pictureReview) throw pictureConflict();
        installed = true;
      },
      inspect: async () => {
        if (installed) throw new Error('Read temporarily unavailable');
        return { status: 'absent' };
      },
    }),
  ]);
  await f.panel.open();
  await f.$('source-a-download').onclick();
  await f.$('source-a-picture-confirm').onclick();
  assert.match(f.$('status').textContent, /originals were installed.*choices kept.*Refresh/);
  assert.equal(f.$('dialog').open, true);
});
test('late inspection after confirmed install and Back cannot overwrite new readiness', async (t) => {
  let installed = false,
    finish;
  const f = fixture(t, [
    chapter('a', {
      download: async ({ pictureReview }) => {
        if (!pictureReview) throw pictureConflict();
        installed = true;
      },
      inspect: async () =>
        installed
          ? new Promise((resolve) => {
              finish = resolve;
            })
          : { status: 'absent' },
    }),
  ]);
  await f.panel.open();
  await f.$('source-a-download').onclick();
  const pending = f.$('source-a-picture-confirm').onclick();
  await waitFor(() => finish);
  f.panel.close();
  installed = false;
  await f.panel.open();
  const before = f.$('source-a-state').textContent;
  finish({ status: 'installed' });
  await pending;
  assert.equal(f.$('source-a-state').textContent, before);
  assert.equal(f.$('source-a-choose').disabled, true);
});

test('Cancel then retry and confirm keeps visible status messages attached', async (t) => {
  let installed = false;
  const f = fixture(t, [
    chapter('a', {
      download: async ({ pictureReview }) => {
        if (!pictureReview) throw pictureConflict();
        installed = true;
      },
      inspect: async () => ({ status: installed ? 'installed' : 'absent' }),
    }),
  ]);
  await f.panel.open();
  const label = f.$('status').querySelector('.operation-status-label');
  await f.$('source-a-download').onclick();
  f.$('source-a-picture-cancel').onclick();
  assert.equal(label.isConnected, true, 'Cancel must not detach the owned live status label');
  await f.$('source-a-download').onclick();
  assert.match(label.textContent, /Review your existing picture choices/);
  await f.$('source-a-picture-confirm').onclick();
  assert.equal(label.isConnected, true);
  assert.match(f.$('status').textContent, /Originals installed/);
  assert.doesNotMatch(f.$('status').textContent, /Installation cancelled/);
});
