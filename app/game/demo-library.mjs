import { boundedJSON, required, stableId } from './data-json.mjs';
import { snapshotReplay, verifyReplayAsync, MAX_REPLAY_BYTES } from './replay.mjs';
import { demoDescriptor, demoReplayMatchesEntry } from './demo-catalog.mjs';
import { campaignKey } from './library.mjs';
import { CLASSES } from './core/registry.mjs';

export const DEMO_LIBRARY_LIMITS = Object.freeze({ recordings: 12, bytes: 32 * 1024 * 1024 });
const FORMAT = 'revealline-local-demos.v1';
const empty = () => ({ format: FORMAT, items: [] });
const byteLength = (value) => new TextEncoder().encode(JSON.stringify(value)).byteLength;
const abort = (signal) => {
  if (signal?.aborted) throw new DOMException('Demo library operation cancelled.', 'AbortError');
};

function snapshotLibrary(source) {
  if (source == null) return empty();
  const value = boundedJSON(source, {
    maxBytes: DEMO_LIBRARY_LIMITS.bytes,
    maxNodes: 4096,
    maxDepth: 8,
    maxArray: DEMO_LIBRARY_LIMITS.recordings,
    maxString: MAX_REPLAY_BYTES,
  });
  required(value.format === FORMAT && Array.isArray(value.items), 'Invalid local demo library.');
  const ids = new Set();
  for (const item of value.items) {
    required(
      stableId(item.id) && !ids.has(item.id) && typeof item.replayText === 'string',
      'Invalid local demo record.',
    );
    ids.add(item.id);
    required(
      item.descriptor?.id === item.id &&
        typeof item.descriptor.campaignKey === 'string' &&
        typeof item.createdAt === 'string' &&
        Number.isFinite(Date.parse(item.createdAt)),
      'Invalid local demo metadata.',
    );
  }
  return value;
}

/** Admission heuristic, not a promise of human enjoyment. Verification remains
 * mandatory before a recording can be retained. */
export function demoRecordingQuality(replay) {
  const duration = replay.ticks / 120;
  if (replay.summary?.status !== 'won' || !replay.summary.won)
    return { eligible: false, reason: 'unfinished' };
  let previous = null,
    changes = 0,
    idle = 0,
    idleStreak = 0,
    longestIdle = 0;
  const directions = new Set();
  for (const segment of replay.segments) {
    const direction = segment.input.direction;
    if (direction) {
      if (previous && previous !== direction) changes++;
      previous = direction;
      directions.add(direction);
      idleStreak = 0;
    } else {
      idle += segment.ticks;
      idleStreak += segment.ticks;
      longestIdle = Math.max(longestIdle, idleStreak);
    }
  }
  const eligible =
    duration >= 8 &&
    duration <= 180 &&
    changes >= 4 &&
    directions.size >= 3 &&
    idle <= replay.ticks * 0.25 &&
    longestIdle <= 360 &&
    replay.summary.lives >= Math.max(1, replay.level.rules.lives - 1);
  return { eligible, reason: eligible ? null : 'quality', duration, directionChanges: changes };
}

/** The host lists this cache only when Watch is requested. Automatic collection
 * is opt-in; an explicit manual save works independently of that preference. */
export function createDemoLibrary({
  storage,
  enabled = false,
  now = () => new Date().toISOString(),
} = {}) {
  let active = enabled === true,
    closed = false,
    generation = 0,
    adapter = storage;
  const getStorage = () => {
    if (closed) throw new Error('Demo library is closed.');
    return (adapter ??= createDemoIndexedDBStorage());
  };
  const current = (ticket, signal, requireEnabled = true) => {
    abort(signal);
    if (closed || (requireEnabled && !active) || generation !== ticket)
      throw new DOMException('Demo library selection changed.', 'AbortError');
  };
  return Object.freeze({
    get enabled() {
      return active && !closed;
    },
    setEnabled(value) {
      required(typeof value === 'boolean', 'Demo retention needs an explicit boolean.');
      if (closed) throw new Error('Demo library is closed.');
      if (active !== value) generation++;
      active = value;
    },
    async list(installedEntries, { signal } = {}) {
      if (closed) return [];
      const ticket = generation;
      const stored = snapshotLibrary(await getStorage().read({ signal }));
      current(ticket, signal, false);
      const contexts = new Map(
        installedEntries.map((entry) => [
          campaignKey({
            ...entry.campaign,
            classRecipes: entry.classRecipes ?? entry.campaign.classRecipes ?? CLASSES,
          }),
          entry,
        ]),
      );
      const result = [];
      for (const item of stored.items) {
        const entry = contexts.get(item.descriptor.campaignKey);
        if (!entry) continue;
        try {
          const replay = snapshotReplay(item.replayText);
          if (!demoReplayMatchesEntry(replay, entry) || !demoRecordingQuality(replay).eligible)
            continue;
          const descriptor = demoDescriptor(replay, entry, { id: item.id });
          result.push({
            ...descriptor,
            entry,
            level: entry.campaign.levels.find((level) => level.id === replay.level.id),
            replay,
            source: 'local',
          });
        } catch {
          // Corrupt/stale cache entries never replace the bundled fallback.
        }
      }
      return result;
    },
    async keep(source, { entry, practice, signal, manual = false } = {}) {
      required(typeof manual === 'boolean', 'Manual demo retention needs an explicit boolean.');
      if ((!active && !manual) || closed) return { saved: false, reason: 'disabled' };
      if (practice !== false) return { saved: false, reason: 'practice' };
      const ticket = generation,
        replay = snapshotReplay(source);
      if (!demoReplayMatchesEntry(replay, entry)) return { saved: false, reason: 'incompatible' };
      const quality = demoRecordingQuality(replay);
      if (!quality.eligible) return { saved: false, reason: quality.reason };
      const descriptor = demoDescriptor(replay, entry),
        verified = await verifyReplayAsync(replay, { signal });
      current(ticket, signal, !manual);
      if (!verified.match) return { saved: false, reason: 'verification' };
      if (
        !demoReplayMatchesEntry(replay, entry) ||
        demoDescriptor(replay, entry).campaignKey !== descriptor.campaignKey
      )
        return { saved: false, reason: 'incompatible' };
      const item = {
        id: descriptor.id,
        descriptor,
        replayText: JSON.stringify(replay),
        createdAt: now(),
      };
      if (byteLength({ format: FORMAT, items: [item] }) > DEMO_LIBRARY_LIMITS.bytes)
        return { saved: false, reason: 'size' };
      const saved = await getStorage().update(
        (sourceLibrary) => {
          current(ticket, signal, !manual);
          const document = snapshotLibrary(sourceLibrary);
          document.items = [item, ...document.items.filter((old) => old.id !== item.id)].slice(
            0,
            DEMO_LIBRARY_LIMITS.recordings,
          );
          while (byteLength(document) > DEMO_LIBRARY_LIMITS.bytes) document.items.pop();
          return document;
        },
        { signal },
      );
      return { saved: true, count: saved.items.length };
    },
    async clear({ signal } = {}) {
      generation++;
      await getStorage().update(() => empty(), { signal });
    },
    dispose() {
      closed = true;
      generation++;
      adapter?.close?.();
    },
  });
}

/** A single read/write transaction serializes capacity eviction across tabs. */
export function createDemoIndexedDBStorage({
  indexedDB = globalThis.indexedDB,
  name = 'revealline-mmm-demo-recordings-v1',
} = {}) {
  let opening,
    database,
    closed = false;
  function open() {
    if (closed) return Promise.reject(new Error('Demo storage is closed.'));
    if (!indexedDB) return Promise.reject(new Error('Local demo storage is unavailable.'));
    opening ??= new Promise((resolve, reject) => {
      const request = indexedDB.open(name, 1);
      let failed = false;
      request.onupgradeneeded = () => request.result.createObjectStore('library');
      request.onerror = () => {
        opening = null;
        reject(request.error);
      };
      request.onblocked = () => {
        failed = true;
        opening = null;
        reject(new Error('Local demo storage is busy in another window.'));
      };
      request.onsuccess = () => {
        if (closed || failed) {
          request.result.close();
          reject(new Error('Demo storage is closed.'));
          return;
        }
        database = request.result;
        database.onversionchange = () => {
          database.close();
          database = null;
          opening = null;
        };
        resolve(database);
      };
    });
    return opening;
  }
  async function transaction(transform, { signal } = {}) {
    abort(signal);
    const db = await open();
    abort(signal);
    return new Promise((resolve, reject) => {
      const tx = db.transaction('library', transform ? 'readwrite' : 'readonly'),
        store = tx.objectStore('library'),
        request = store.get('current');
      let result, failure;
      const cancel = () => {
        try {
          tx.abort();
        } catch {
          /* Already committed. */
        }
      };
      signal?.addEventListener('abort', cancel, { once: true });
      const cleanup = () => signal?.removeEventListener('abort', cancel);
      request.onsuccess = () => {
        try {
          abort(signal);
          result = transform
            ? snapshotLibrary(transform(request.result ?? empty()))
            : snapshotLibrary(request.result);
          if (transform) store.put(result, 'current');
        } catch (error) {
          failure = error;
          tx.abort();
        }
      };
      tx.oncomplete = () => {
        cleanup();
        resolve(result);
      };
      tx.onabort = tx.onerror = () => {
        cleanup();
        reject(
          failure ??
            (signal?.aborted
              ? new DOMException('Demo storage cancelled.', 'AbortError')
              : (tx.error ?? new Error('Local demo storage could not be saved.'))),
        );
      };
    });
  }
  return Object.freeze({
    read: (options) => transaction(null, options),
    update: (transform, options) => transaction(transform, options),
    close() {
      closed = true;
      database?.close();
    },
  });
}
