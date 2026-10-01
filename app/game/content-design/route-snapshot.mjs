import { freezeDesign } from './catalogs.mjs';
import { admitPublishedRoute, admitPublishedChapter } from './published-journey.mjs';

/** A publisher-pinned source snapshot retains the full navigation/progress contract.
 * Artwork remains in individually selectable packages and is never prefetched here. */
export async function readPublishedSnapshot(
  descriptor,
  { fetchAsset = (path, options) => fetch(new URL(path, import.meta.url), options), signal } = {},
) {
  if (
    !descriptor ||
    !/^runtime\/[a-z0-9-]+\.json$/.test(descriptor.path) ||
    !/^[a-f0-9]{64}$/.test(descriptor.sha256) ||
    !Number.isSafeInteger(descriptor.bytes) ||
    descriptor.bytes < 1 ||
    descriptor.bytes > 8 * 1024 * 1024
  )
    throw new Error('Invalid published Journey snapshot.');
  signal?.throwIfAborted();
  const response = await fetchAsset(descriptor.path, { signal, redirect: 'error' });
  if (!response.ok || response.redirected || !response.body?.getReader) {
    await response.body?.cancel?.().catch(() => {});
    throw new Error('The prepared Journey catalogue is unavailable.');
  }
  const bytes = new Uint8Array(descriptor.bytes),
    reader = response.body.getReader();
  let length = 0;
  const cancel = () => {
    void reader.cancel().catch(() => {});
  };
  signal?.addEventListener('abort', cancel, { once: true });
  try {
    for (;;) {
      signal?.throwIfAborted();
      const { done, value } = await reader.read();
      signal?.throwIfAborted();
      if (done) break;
      if (length + value.length > bytes.length)
        throw new Error('Journey snapshot exceeds its pinned size.');
      bytes.set(value, length);
      length += value.length;
    }
  } finally {
    signal?.removeEventListener('abort', cancel);
    await reader.cancel().catch(() => {});
    reader.releaseLock();
  }
  if (length !== bytes.length) throw new Error('Journey snapshot is incomplete.');
  const hash = [...new Uint8Array(await crypto.subtle.digest('SHA-256', bytes))]
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('');
  if (hash !== descriptor.sha256) throw new Error('Journey snapshot failed integrity checking.');
  signal?.throwIfAborted();
  return freezeDesign(JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(bytes)));
}

export async function loadRouteSnapshot(descriptor, options = {}) {
  const route = await readPublishedSnapshot(descriptor, options);
  if (route.id !== descriptor.id || (!route.navigation && !Array.isArray(route.source?.missions)))
    throw new Error('Journey snapshot has a different edition.');
  return route.navigation ? admitPublishedRoute(route) : route;
}

export async function loadPublishedChapter(route, descriptor, options = {}) {
  const source = await readPublishedSnapshot(descriptor, options);
  if (
    source.id !== route.navigation.project.id ||
    source.revision !== route.navigation.project.revision ||
    source.packs?.length !== 1 ||
    source.packs[0].id !== descriptor.packId
  )
    throw new Error('Published chapter differs from its route.');
  return admitPublishedChapter(route, descriptor, source);
}
