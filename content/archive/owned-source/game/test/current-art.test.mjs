import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { CURRENT_PICTURES } from '../presentation/current-pictures.mjs';
import { CURRENT_ART_SOURCES } from '../presentation/current-art-sources.mjs';
import {
  createCurrentArtPreview,
  describeCurrentArt,
  CurrentArtUnavailableError,
} from '../presentation/current-art.mjs';
import { inventoryCurrentArt } from '../../scripts/generate-current-art.mjs';
import { createSceneArt } from '../ui/scene-art.mjs';

const root = fileURLToPath(new URL('../../', import.meta.url));
const baseURL = 'https://preview.invalid/release/';
const embedded = CURRENT_ART_SOURCES.find(
  (row) => row.kind === 'embedded' && row.source.kind === 'built-in',
);
const external = CURRENT_ART_SOURCES.find((row) => row.kind === 'external');
const procedural = CURRENT_ART_SOURCES.find((row) => row.kind === 'procedural');
const file = (relative) => fs.readFile(path.join(root, relative));
const flush = () => new Promise((resolve) => setImmediate(resolve));
function canvasFixture() {
  const commands = [];
  const ctx = new Proxy(
    {},
    {
      set(target, key, value) {
        commands.push(['set', key, value]);
        target[key] = value;
        return true;
      },
      get(target, key) {
        return target[key] ?? ((...args) => commands.push([key, ...args]));
      },
    },
  );
  return { commands, getContext: () => ctx };
}
function imageDecoder(facts, closed = []) {
  return async (blob) => {
    assert.ok(blob instanceof Blob);
    const image = { width: facts.width, height: facts.height, close: () => closed.push(image) };
    return image;
  };
}
test('trusted locator mapping remains fresh for 209 exact owners including 56 FPV owners', async () => {
  assert.equal(CURRENT_ART_SOURCES.length, 209);
  assert.equal(CURRENT_ART_SOURCES.filter((row) => row.owner.themeId === 'fpv').length, 56);
  assert.deepEqual(
    CURRENT_ART_SOURCES.map(({ id, owner }) => ({ id, owner })),
    CURRENT_PICTURES.map(({ id, owner }) => ({ id, owner })),
  );
  assert.deepEqual(await inventoryCurrentArt(), CURRENT_ART_SOURCES);
});
test('lookup and construction are lazy and never accept URLs or uploaded owner locators', async () => {
  const fetch = () => {
    assert.fail('No request should occur.');
  };
  const loader = createCurrentArtPreview({ fetch, baseURL });
  assert.equal(describeCurrentArt('https://outside.invalid/art.png'), null);
  assert.equal(describeCurrentArt({ id: embedded.id, path: 'https://outside.invalid' }), null);
  await assert.rejects(loader.load('picture.unknown'), /registered exact/);
  assert.equal(describeCurrentArt(embedded.id).availability.status, 'request-required');
  assert.equal(describeCurrentArt(procedural.id).availability.distributionBytes, 0);
  assert.ok(Object.isFrozen(describeCurrentArt(embedded.id).owner));
  loader.close();
  await assert.rejects(loader.load(embedded.id), /closed/);
});
test('procedural previews use the exact registered scene renderer, theme, level and labelled seed', async () => {
  const loader = createCurrentArtPreview({
    fetch: () => assert.fail('Procedural previews do not fetch.'),
    canvasFactory: canvasFixture,
  });
  const result = await loader.load(procedural.id);
  const original = createSceneArt(procedural.theme, procedural.level, 0, canvasFixture);
  assert.deepEqual(result.image.commands, original.commands);
  assert.equal(result.kind, 'procedural');
  assert.equal(result.image.width, 384);
  assert.equal(result.downloadBytes, 0);
  assert.equal(result.fit, 'cover');
  assert.match(result.origin.label, /seed 0/);
  result.dispose();
  assert.equal(result.image.width, 0);
});
test('an exact source PNG is loaded once on request and closed with its owner', async () => {
  const calls = [],
    closed = [],
    bytes = await file(embedded.sourceImagePath);
  const loader = createCurrentArtPreview({
    baseURL,
    decodeImage: imageDecoder(embedded.image, closed),
    fetch: async (url, options) => {
      calls.push(url);
      assert.equal(options.redirect, 'error');
      assert.equal(options.credentials, 'same-origin');
      assert.equal(url, new URL(embedded.sourceImagePath, baseURL).href);
      return new Response(bytes);
    },
  });
  assert.equal(calls.length, 0);
  const result = await loader.load(embedded.id);
  assert.equal(calls.length, 1);
  assert.equal(result.downloadBytes, bytes.length);
  assert.deepEqual(result.descriptor.owner, embedded.owner);
  assert.equal(result.origin.kind, 'source-original');
  assert.equal(result.fit, embedded.fit);
  result.dispose();
  result.dispose();
  loader.close();
  assert.equal(closed.length, 1);
});
test('only a missing source PNG falls back to the exact bounded embedded pack', async () => {
  const calls = [],
    closed = [];
  const loader = createCurrentArtPreview({
    baseURL,
    decodeImage: imageDecoder(embedded.image, closed),
    fetch: async (url) => {
      calls.push(url);
      if (url === new URL(embedded.sourceImagePath, baseURL).href)
        return new Response(null, { status: 404 });
      assert.equal(url, new URL(embedded.source.path, baseURL).href);
      return new Response(await file(embedded.source.path));
    },
  });
  const result = await loader.load(embedded.id);
  assert.equal(calls.length, 2);
  assert.equal(result.downloadBytes, embedded.source.bytes);
  assert.equal(result.origin.kind, 'built-in');
  assert.equal(result.level.id, embedded.owner.levelId);
  assert.equal(result.theme.id, embedded.owner.themeId);
  loader.close();
  assert.equal(closed.length, 1);
});
test('external source previews keep external owners distinct without installing or fetching the full chapter', async () => {
  const calls = [],
    bytes = await file(external.sourceImagePath);
  const loader = createCurrentArtPreview({
    baseURL,
    decodeImage: imageDecoder(external.image),
    fetch: async (url) => {
      calls.push(url);
      assert.equal(url, new URL(external.sourceImagePath, baseURL).href);
      return new Response(bytes);
    },
  });
  const result = await loader.load(external.id);
  assert.equal(calls.length, 1);
  assert.deepEqual(result.descriptor.owner, external.owner);
  assert.equal(result.descriptor.kind, 'external');
  assert.equal(result.level, null);
  assert.equal(result.fit, 'contain');
  loader.close();
});
test('source failures, redirects, truncated bytes and bad decoded dimensions never become previews', async () => {
  const bytes = await file(embedded.sourceImagePath);
  for (const [fetch, pattern] of [
    [async () => new Response(null, { status: 403 }), /unavailable/],
    [
      async () => ({
        ok: true,
        redirected: true,
        url: 'https://outside.invalid/',
        headers: new Headers(),
        body: new Response(bytes).body,
      }),
      /changed location/,
    ],
    [async () => new Response('short'), /truncated/],
    [async () => new Response(new Uint8Array(embedded.image.bytes + 1)), /exceeds/],
    [
      async () => {
        const changed = new Uint8Array(bytes);
        changed[changed.length - 1] ^= 1;
        return new Response(changed);
      },
      /hash differs/,
    ],
  ]) {
    const loader = createCurrentArtPreview({
      baseURL,
      fetch,
      decodeImage: () => assert.fail('Rejected bytes must not decode.'),
    });
    await assert.rejects(loader.load(embedded.id), pattern);
    loader.close();
  }
  let closed = 0;
  const loader = createCurrentArtPreview({
    baseURL,
    fetch: async () => new Response(bytes),
    decodeImage: async () => ({ width: 1, height: 1, close: () => closed++ }),
  });
  await assert.rejects(loader.load(embedded.id), /Decoded original picture dimensions/);
  assert.equal(closed, 1);
  loader.close();
  const unavailable = new CurrentArtUnavailableError(404, external.source.media.path);
  assert.equal(unavailable.status, 404);
  assert.match(unavailable.message, /matching built release/);
});
test('newer requests cancel and dispose late decoded originals without affecting the replacement', async () => {
  const bytes = await file(embedded.sourceImagePath),
    controller = new AbortController();
  let finish,
    decodeStarted = false,
    closed = 0;
  const loader = createCurrentArtPreview({
    baseURL,
    fetch: async () => new Response(bytes),
    canvasFactory: canvasFixture,
    decodeImage: () => {
      decodeStarted = true;
      return new Promise((resolve) => {
        finish = () =>
          resolve({
            width: embedded.image.width,
            height: embedded.image.height,
            close: () => closed++,
          });
      });
    },
  });
  const first = assert.rejects(loader.load(embedded.id, { signal: controller.signal }), {
    name: 'AbortError',
  });
  while (!decodeStarted) await flush();
  const replacement = await loader.load(procedural.id);
  finish();
  await first;
  assert.equal(closed, 1);
  assert.equal(replacement.image.width, 384);
  controller.abort();
  assert.equal(replacement.image.width, 384);
  loader.close();
  assert.equal(replacement.image.width, 0);
});
test('abort cancels a pending response stream and a closed loader performs no new IO', async () => {
  let cancelCount = 0,
    requests = 0;
  const controller = new AbortController();
  const loader = createCurrentArtPreview({
    baseURL,
    fetch: async () => {
      requests++;
      return new Response(
        new ReadableStream({
          cancel() {
            cancelCount++;
          },
        }),
      );
    },
    decodeImage: () => assert.fail('Cancelled bytes must not decode.'),
  });
  const pending = assert.rejects(loader.load(embedded.id, { signal: controller.signal }), {
    name: 'AbortError',
  });
  await flush();
  controller.abort();
  await pending;
  assert.equal(cancelCount, 1);
  loader.close();
  await assert.rejects(loader.load(embedded.id), /closed/);
  assert.equal(requests, 1);
});
