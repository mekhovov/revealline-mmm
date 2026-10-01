import { canonicalJSON, required } from './data-json.mjs';
import { importSoundtrackBundle } from './soundtrack-bundle.mjs';
import { throwIfSoundtrackAborted } from './mp3.mjs';
import {
  resolveSoundtrackAlbum,
  resolveSoundtrackAlbumCatalog,
  SOUNDTRACK_ALBUM_CATALOG_BYTES,
} from './soundtrack-albums.mjs';

const rootURL = new URL('../', import.meta.url).href;
function location(path, baseURL) {
  const base = new URL(baseURL),
    url = new URL(path, base);
  required(
    ['https:', 'http:'].includes(base.protocol) &&
      !base.username &&
      !base.password &&
      !base.search &&
      !base.hash &&
      base.pathname.endsWith('/'),
    'Album downloads need a version-local HTTP origin.',
  );
  required(
    url.origin === base.origin &&
      url.pathname.startsWith(base.pathname) &&
      !url.search &&
      !url.hash &&
      !url.username &&
      !url.password,
    'Album download escaped its version path.',
  );
  return url.href;
}
function waitFor(work, signal) {
  throwIfSoundtrackAborted(signal);
  return new Promise((resolve, reject) => {
    const stop = () => {
      cleanup();
      reject(signal.reason ?? new DOMException('Cancelled', 'AbortError'));
    };
    const cleanup = () => signal.removeEventListener('abort', stop);
    signal.addEventListener('abort', stop, { once: true });
    Promise.resolve(work).then(
      (value) => {
        cleanup();
        resolve(value);
      },
      (error) => {
        cleanup();
        reject(error);
      },
    );
  });
}
async function joinCleanup(work, milliseconds) {
  let timer;
  try {
    const joined = await Promise.race([
      Promise.resolve(work).then(
        () => true,
        () => true,
      ),
      new Promise((resolve) => {
        timer = setTimeout(() => resolve(false), milliseconds);
      }),
    ]);
    if (!joined) {
      const error = new Error(
        'Network cleanup is still pending. Late album data will be discarded; no draft was added.',
      );
      error.cleanupIncomplete = true;
      throw error;
    }
  } finally {
    clearTimeout(timer);
  }
}
async function readBounded(
  url,
  {
    fetch: request,
    signal,
    limit,
    exactBytes,
    cleanupTimeoutMs,
    credentials = 'same-origin',
    mode,
  },
) {
  const pending = Promise.resolve().then(() =>
    request(url, {
      signal,
      redirect: 'error',
      credentials,
      ...(mode ? { mode } : {}),
      cache: 'no-store',
    }),
  );
  let discarding;
  const discard = (response) => {
    if (!discarding)
      discarding = Promise.resolve()
        .then(() => response?.body?.cancel())
        .catch(() => {});
    return discarding;
  };
  // Retained even when a noncooperative request outlives the finite cleanup deadline.
  pending
    .then(
      (response) => (signal.aborted ? discard(response) : undefined),
      () => {},
    )
    .catch(() => {});
  let response;
  try {
    response = await waitFor(pending, signal);
  } catch (error) {
    if (signal.aborted)
      await joinCleanup(
        pending.then(discard, () => {}),
        cleanupTimeoutMs,
      );
    throw error;
  }
  try {
    required(
      response?.status === 200 && !response.redirected && response.url === url,
      'Album download needs direct HTTP 200 at its declared URL.',
    );
    const length = response.headers.get('content-length');
    required(
      length === null ||
        (/^[0-9]+$/.test(length) &&
          Number(length) <= limit &&
          (exactBytes === undefined || Number(length) === exactBytes)),
      'Album download size header differs or exceeds its limit.',
    );
    required(response.body?.getReader, 'Album download requires bounded streaming.');
  } catch (error) {
    await joinCleanup(discard(response), cleanupTimeoutMs);
    throw error;
  }
  const reader = response.body.getReader(),
    chunks = [];
  let bytes = 0,
    complete = false,
    reading;
  try {
    while (true) {
      reading = reader.read();
      const result = await waitFor(reading, signal);
      if (result.done) {
        complete = true;
        break;
      }
      required(result.value instanceof Uint8Array, 'Album download returned invalid bytes.');
      bytes += result.value.byteLength;
      required(
        bytes <= limit && (exactBytes === undefined || bytes <= exactBytes),
        'Album download exceeded its declared size.',
      );
      chunks.push(result.value.slice());
    }
    required(exactBytes === undefined || bytes === exactBytes, 'Album download was truncated.');
    throwIfSoundtrackAborted(signal);
    return new Blob(chunks, { type: 'application/octet-stream' });
  } finally {
    try {
      if (!complete) {
        const cancelling = Promise.resolve().then(() => reader.cancel());
        await joinCleanup(Promise.allSettled([reading, cancelling]), cleanupTimeoutMs);
      }
    } finally {
      try {
        reader.releaseLock();
      } catch {}
    }
  }
}
async function operation(work, { signal, timeoutMs = 180000, cleanupTimeoutMs = 15000 } = {}) {
  required(
    Number.isSafeInteger(cleanupTimeoutMs) && cleanupTimeoutMs >= 1 && cleanupTimeoutMs <= 15000,
    'Invalid album cleanup deadline.',
  );
  required(
    Number.isSafeInteger(timeoutMs) && timeoutMs >= 1 && timeoutMs <= 300000,
    'Invalid album download deadline.',
  );
  const controller = new AbortController(),
    cancel = () => controller.abort(new DOMException('Album operation cancelled', 'AbortError'));
  if (signal?.aborted) cancel();
  else signal?.addEventListener('abort', cancel, { once: true });
  const timer = setTimeout(
    () =>
      controller.abort(
        new DOMException('Album download or verification timed out. Try again.', 'TimeoutError'),
      ),
    timeoutMs,
  );
  try {
    throwIfSoundtrackAborted(controller.signal);
    return await work(controller.signal, cleanupTimeoutMs);
  } catch (error) {
    if (controller.signal.aborted && !error.cleanupIncomplete) throw controller.signal.reason;
    throw error;
  } finally {
    clearTimeout(timer);
    signal?.removeEventListener('abort', cancel);
  }
}

/** No network until explicitly called. Capture URL/fetch before the first await. */
export function fetchSoundtrackAlbumCatalog({
  fetch: request = globalThis.fetch,
  baseURL = rootURL,
  signal,
  timeoutMs,
  cleanupTimeoutMs,
} = {}) {
  const url = location('game/content/optional-soundtracks.json', baseURL);
  return operation(
    async (current, cleanupLimit) => {
      const body = await readBounded(url, {
        fetch: request,
        signal: current,
        limit: SOUNDTRACK_ALBUM_CATALOG_BYTES,
        cleanupTimeoutMs: cleanupLimit,
      });
      const raw = new TextDecoder('utf-8', { fatal: true }).decode(await body.arrayBuffer());
      throwIfSoundtrackAborted(current);
      return resolveSoundtrackAlbumCatalog(raw);
    },
    { signal, timeoutMs, cleanupTimeoutMs },
  );
}

export function fetchSoundtrackAlbum(
  value,
  {
    fetch: request = globalThis.fetch,
    baseURL = rootURL,
    signal,
    timeoutMs,
    cleanupTimeoutMs,
    probeMedia,
  } = {},
) {
  const album = resolveSoundtrackAlbum(value),
    url = location(album.path, baseURL);
  return operation(
    async (current, cleanupLimit) => {
      const body = await readBounded(url, {
        fetch: request,
        signal: current,
        limit: album.bytes,
        exactBytes: album.bytes,
        cleanupTimeoutMs: cleanupLimit,
      });
      const digest = await globalThis.crypto.subtle.digest('SHA-256', await body.arrayBuffer());
      throwIfSoundtrackAborted(current);
      const actual = [...new Uint8Array(digest)]
        .map((byte) => byte.toString(16).padStart(2, '0'))
        .join('');
      required(actual === album.sha256, 'Album download hash differs from its catalog.');
      const prepared = await importSoundtrackBundle(body, { signal: current, probeMedia });
      throwIfSoundtrackAborted(current);
      required(
        canonicalJSON(prepared.library) === canonicalJSON(album.library),
        'Album metadata differs from its catalog.',
      );
      return prepared;
    },
    { signal, timeoutMs, cleanupTimeoutMs },
  );
}

// The trusted track catalogue shares the same bounded, cancellable download boundary.
export {
  location as soundtrackDownloadURL,
  readBounded as readSoundtrackDownload,
  operation as soundtrackDownloadOperation,
};
