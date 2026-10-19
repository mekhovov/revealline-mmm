import { t } from '../i18n/index.mjs';
import { createEnemyPresentations, ENEMY_PRESENTATION_LIMITS } from '../enemy-presentations.mjs';

const cancelled = () => new DOMException(t('interface:enemyArtworkCancelled'), 'AbortError');
const check = (signal) => {
  if (signal?.aborted) throw cancelled();
};
const require = (condition, message) => {
  if (!condition) throw new Error(message);
};
const dispose = (drawable) => drawable?.release?.();

async function readBounded(response, maxBytes, signal) {
  require(response?.ok, t('interface:enemyArtworkIsUnavailable'));
  const chunks = [];
  let bytes = 0;
  if (response.body?.getReader) {
    const reader = response.body.getReader();
    try {
      while (true) {
        check(signal);
        const item = await reader.read();
        if (item.done) break;
        bytes += item.value.byteLength;
        require(bytes <= maxBytes, t('interface:enemyArtworkExceedsItsByteBound'));
        chunks.push(item.value);
      }
    } catch (error) {
      await reader.cancel().catch(() => {});
      throw error;
    } finally {
      reader.releaseLock();
    }
  } else {
    const raw = new Uint8Array(await response.arrayBuffer());
    require(raw.byteLength <= maxBytes, t('interface:enemyArtworkExceedsItsByteBound'));
    bytes = raw.byteLength;
    chunks.push(raw);
  }
  check(signal);
  const result = new Uint8Array(bytes);
  let offset = 0;
  for (const chunk of chunks) {
    result.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return result;
}

let catalogPromise = null;
export async function loadEnemyPresentationCatalog() {
  catalogPromise ??= (async () => {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 15000);
    try {
      const response = await fetch(
        new URL('../content/enemy-presentations.json', import.meta.url),
        { signal: controller.signal },
      );
      const bytes = await readBounded(response, ENEMY_PRESENTATION_LIMITS.bytes, controller.signal);
      return createEnemyPresentations(new TextDecoder('utf-8', { fatal: true }).decode(bytes));
    } finally {
      clearTimeout(timer);
    }
  })();
  try {
    return await catalogPromise;
  } catch (error) {
    catalogPromise = null;
    throw error;
  }
}

function abortable(start, signal) {
  check(signal);
  return new Promise((resolve, reject) => {
    let settled = false;
    const abort = () => {
      if (settled) return;
      settled = true;
      signal.removeEventListener('abort', abort);
      reject(cancelled());
    };
    signal.addEventListener('abort', abort, { once: true });
    Promise.resolve()
      .then(() => {
        check(signal);
        return start();
      })
      .then(
        (value) => {
          signal.removeEventListener('abort', abort);
          if (settled) return dispose(value);
          settled = true;
          resolve(value);
        },
        (error) => {
          signal.removeEventListener('abort', abort);
          if (settled) return;
          settled = true;
          reject(error);
        },
      );
    if (signal.aborted) abort();
  });
}

async function imageFallback(blob, record, signal) {
  check(signal);
  require(typeof Image === 'function', t('interface:enemyImageDecoderIsUnavailable'));
  const image = new Image();
  const url = URL.createObjectURL(blob);
  let released = false,
    decoding = null;
  const release = () => {
    if (released) return;
    released = true;
    image.onload = image.onerror = null;
    image.removeAttribute('src');
    URL.revokeObjectURL(url);
  };
  try {
    await new Promise((resolve, reject) => {
      const abort = () => finish(cancelled());
      let done = false;
      const finish = (error) => {
        if (done) return;
        done = true;
        clearTimeout(timer);
        signal.removeEventListener('abort', abort);
        image.onload = image.onerror = null;
        error ? reject(error) : resolve();
      };
      const timer = setTimeout(
        () => finish(new Error(t('interface:enemyImageDecodeTimedOut'))),
        15000,
      );
      signal.addEventListener('abort', abort, { once: true });
      image.onload = () => {
        decoding = Promise.resolve().then(() => image.decode?.());
        decoding.then(() => finish(), finish);
      };
      image.onerror = () => finish(new Error(t('interface:enemyImageCouldNotDecode')));
      if (signal.aborted) return abort();
      image.src = url;
    });
    check(signal);
    require(image.naturalWidth === record.width && image.naturalHeight === record.height, t(
      'interface:enemyDecodedDimensionsDiffer',
    ));
    return { image, release, kind: 'image', rgbaBytes: record.width * record.height * 4 };
  } catch (error) {
    release();
    // Keep the pool reservation until a browser decoder actually settles.
    await decoding?.catch(() => {});
    throw error;
  }
}

export async function loadEnemyDrawable(record, { signal }) {
  check(signal);
  const response = await fetch(new URL(`../../${record.src}`, import.meta.url), { signal });
  const bytes = await readBounded(response, record.bytes, signal);
  require(bytes.byteLength === record.bytes, t('interface:enemyOriginalByteLengthDiffers'));
  require(globalThis.crypto?.subtle, t('interface:enemyArtworkIdentityCheckIsUnavailable'));
  const hash = [...new Uint8Array(await crypto.subtle.digest('SHA-256', bytes))]
    .map((n) => n.toString(16).padStart(2, '0'))
    .join('');
  require(hash === record.sha256, t('interface:enemyOriginalHashDiffers'));
  require(bytes.length >= 29 &&
    [137, 80, 78, 71, 13, 10, 26, 10].every((n, i) => bytes[i] === n), t(
    'interface:enemyOriginalIsNotPng',
  ));
  const header = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  require(header.getUint32(16) === record.width && header.getUint32(20) === record.height, t(
    'interface:enemyPngDimensionsDiffer',
  ));
  check(signal);
  const blob = new Blob([bytes], { type: 'image/png' });
  if (typeof createImageBitmap === 'function') {
    let image = null;
    try {
      image = await createImageBitmap(blob, {
        resizeWidth: 128,
        resizeHeight: 128,
        resizeQuality: 'pixelated',
      });
      check(signal);
      require(image.width === 128 && image.height === 128, t(
        'interface:compactEnemyBitmapResizingUnavailable',
      ));
      return { image, release: () => image.close(), kind: 'bitmap', rgbaBytes: 128 * 128 * 4 };
    } catch (error) {
      image?.close();
      check(signal);
      // Unsupported bitmap decoding/resizing uses the same exact original image.
    }
  }
  return imageFallback(blob, record, signal);
}

export function createEnemyImagePool({ load = loadEnemyDrawable } = {}) {
  const entries = new Map();
  const queue = [];
  let active = false,
    reservedBytes = 0;
  const pump = () => {
    if (active || !queue.length) return;
    active = true;
    const work = queue.shift();
    reservedBytes = work.reservedBytes ?? 0;
    Promise.resolve()
      .then(work)
      .catch(() => {})
      .finally(() => {
        active = false;
        reservedBytes = 0;
        pump();
      });
  };
  const notify = (entry) => {
    for (const callback of entry.refs) {
      try {
        callback();
      } catch {}
    }
  };
  return Object.freeze({
    acquire(record, changed = () => {}) {
      const key = `${record.presentationId}:${record.sha256}`;
      let entry = entries.get(key);
      if (!entry) {
        require(entries.size < 7, t('interface:enemyImagePoolIsFull'));
        entry = {
          record,
          refs: new Set(),
          controller: new AbortController(),
          drawable: null,
          error: null,
        };
        entries.set(key, entry);
        const own = entry;
        let finishReady;
        own.ready = new Promise((resolve) => {
          finishReady = resolve;
        });
        const timer = setTimeout(() => {
          own.error = new Error(t('interface:enemyImageDecodeTimedOut'));
          own.controller.abort();
          own.finishReady();
          notify(own);
        }, 15000);
        own.finishReady = () => {
          clearTimeout(timer);
          if (own.controller.signal.aborted) {
            const index = queue.indexOf(own.work);
            if (index !== -1) queue.splice(index, 1);
          }
          finishReady();
        };
        own.work = async () => {
          if (own.controller.signal.aborted) {
            own.finishReady();
            return;
          }
          try {
            // Keep a non-cancelable decoder's reservation until it settles.
            const value = await load(record, { signal: own.controller.signal });
            if (entries.get(key) !== own || own.controller.signal.aborted) return dispose(value);
            own.drawable = value;
          } catch (error) {
            own.error = error;
          } finally {
            own.finishReady();
          }
          if (entries.get(key) === own) notify(own);
        };
        // Reserve the original-size fallback, even when bitmap resizing is available.
        own.work.reservedBytes = record.width * record.height * 4;
        queue.push(own.work);
        pump();
      }
      const token = () => changed();
      entry.refs.add(token);
      let released = false;
      return Object.freeze({
        ready: ({ signal } = {}) => (signal ? abortable(() => entry.ready, signal) : entry.ready),
        current: () => (released ? null : entry.drawable),
        error: () => (released ? null : entry.error),
        release() {
          if (released) return;
          released = true;
          entry.refs.delete(token);
          if (entry.refs.size) return;
          if (entries.get(key) === entry) entries.delete(key);
          entry.controller.abort();
          entry.finishReady();
          dispose(entry.drawable);
          entry.drawable = null;
        },
      });
    },
    size: () => entries.size,
    snapshot: () => ({
      entries: entries.size,
      active: Number(active),
      queued: queue.length,
      reservedBytes,
      decodedBytes: [...entries.values()].reduce(
        (total, entry) => total + (entry.drawable?.rgbaBytes ?? 0),
        0,
      ),
    }),
  });
}

const sharedPool = createEnemyImagePool();
export function createEnemyBodyAssets({
  pool = sharedPool,
  catalog = loadEnemyPresentationCatalog,
  changed = () => {},
} = {}) {
  let model = null,
    loading = false,
    failed = false,
    generation = 0,
    desired = [],
    overrides = {},
    pendingCatalog = Promise.resolve();
  const leases = new Map();
  function reconcile() {
    if (!model) return;
    const records = new Map();
    for (const frame of desired) {
      const record = model.forFrame(frame, overrides);
      if (record) records.set(record.type, record);
    }
    for (const [type, lease] of leases)
      if (!records.has(type)) {
        lease.release();
        leases.delete(type);
      }
    for (const [type, record] of records)
      if (!leases.has(type)) leases.set(type, pool.acquire(record, changed));
  }
  return Object.freeze({
    update(frames, uploaded = {}, { image = () => true } = {}) {
      const all = [...frames].slice(0, 64);
      desired = all.filter(image);
      overrides = uploaded;
      if (model) return reconcile();
      if (loading || failed || !all.some((frame) => frame.themeId === 'fpv')) return;
      loading = true;
      const ticket = generation;
      pendingCatalog = Promise.resolve()
        .then(catalog)
        .then(
          (value) => {
            if (ticket !== generation) return;
            model = value;
            loading = false;
            reconcile();
            changed();
          },
          () => {
            if (ticket === generation) {
              loading = false;
              failed = true;
              changed();
            }
          },
        );
    },
    async ready({ signal } = {}) {
      const ticket = generation;
      const wait = async () => {
        await pendingCatalog;
        if (ticket !== generation) throw cancelled();
        await Promise.all([...leases.values()].map((lease) => lease.ready()));
        if (ticket !== generation) throw cancelled();
      };
      return signal ? abortable(wait, signal) : wait();
    },
    current(frame) {
      const record = model?.forFrame(frame, overrides);
      const drawable = record ? leases.get(record.type)?.current() : null;
      return drawable
        ? { image: drawable.image, record, kind: drawable.kind, rgbaBytes: drawable.rgbaBytes }
        : null;
    },
    record(frame) {
      return model?.forFrame(frame, overrides) ?? null;
    },
    resourceSnapshot: () => ({ scope: 'page', ...pool.snapshot?.(), ownedLeases: leases.size }),
    status() {
      return failed || [...leases.values()].some((lease) => lease.error())
        ? 'Some enemy artwork is unavailable; its existing vector body is shown.'
        : '';
    },
    clear() {
      ++generation;
      loading = false;
      failed = false;
      pendingCatalog = Promise.resolve();
      desired = [];
      overrides = {};
      for (const lease of leases.values()) lease.release();
      leases.clear();
    },
  });
}
