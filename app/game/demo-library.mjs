import { boundedJSON, required, stableId } from './data-json.mjs';
import {
  snapshotReplay,
  verifyReplayAsync,
  exportReplay,
  exportReplayAsync,
  MAX_REPLAY_BYTES,
} from './replay.mjs';
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
  scheduleChunk,
  canRunOptionalWork = () => true,
  ownsEntry = () => false,
  now = () => new Date().toISOString(),
} = {}) {
  let active = enabled === true,
    closed = false,
    generation = 0,
    adapter = storage;
  const operations = new Set();
  const cancelOperations = () => {
    for (const controller of [...operations]) controller.abort();
  };
  const operation = (signal) => {
    const controller = new AbortController();
    const cancel = () => controller.abort();
    operations.add(controller);
    if (signal?.aborted) cancel();
    else signal?.addEventListener('abort', cancel, { once: true });
    return {
      signal: controller.signal,
      finish() {
        signal?.removeEventListener('abort', cancel);
        operations.delete(controller);
      },
    };
  };
  const getStorage = () => {
    if (closed) throw new Error('Demo library is closed.');
    return (adapter ??= createDemoIndexedDBStorage());
  };
  const current = (ticket, signal, requireEnabled = true) => {
    abort(signal);
    if (closed || (requireEnabled && !active) || generation !== ticket)
      throw new DOMException('Demo library selection changed.', 'AbortError');
  };
  const ready = (ticket, signal, manual) => {
    current(ticket, signal, !manual);
    if (canRunOptionalWork() !== true)
      throw new DOMException('Demo retention is no longer admitted.', 'AbortError');
  };
  async function admitted(work, ticket, signal, manual) {
    let called = false,
      retired = false,
      result,
      failure;
    const invoke = () => {
      try {
        if (called || retired) throw new Error('Demo admission must invoke work exactly once.');
        called = true;
        ready(ticket, signal, manual);
        result = work();
      } catch (error) {
        failure = error;
        throw error;
      }
    };
    try {
      if (scheduleChunk) await scheduleChunk(invoke, { signal });
      else invoke();
      if (failure) throw failure;
      if (!called) throw new Error('Demo admission did not invoke work.');
      current(ticket, signal, !manual);
      return result;
    } finally {
      retired = true;
    }
  }
  const begin = ({ practice, manual = false } = {}) => {
    required(typeof manual === 'boolean', 'Manual demo retention needs an explicit boolean.');
    if ((!active && !manual) || closed) return { saved: false, reason: 'disabled' };
    if (practice !== false) return { saved: false, reason: 'practice' };
    return null;
  };
  async function retain(
    replay,
    ticket,
    { entry, signal, manual = false },
    initialDescriptor = null,
  ) {
    let descriptor = initialDescriptor,
      verification,
      retired = false;
    const check = () => {
      if (retired) throw new DOMException('Demo retention finished.', 'AbortError');
      ready(ticket, signal, manual);
    };
    try {
      const rejected = await admitted(
        () => {
          if (!descriptor) {
            if (!demoReplayMatchesEntry(replay, entry))
              return { saved: false, reason: 'incompatible' };
            const quality = demoRecordingQuality(replay);
            if (!quality.eligible) return { saved: false, reason: quality.reason };
            descriptor = demoDescriptor(replay, entry);
          }
          // Its synchronous snapshot is admitted too. Do not return this promise
          // to the main-work owner: verification needs later slots from that owner.
          verification = verifyReplayAsync(replay, {
            signal,
            ...(scheduleChunk
              ? {
                  scheduleChunk: (work, options) =>
                    scheduleChunk(() => {
                      check();
                      work();
                    }, options),
                }
              : {}),
          });
          verification.catch(() => {});
          return null;
        },
        ticket,
        signal,
        manual,
      );
      if (rejected) return rejected;
      const verified = await verification;
      const result = await admitted(
        () => {
          if (!verified.match) return { rejected: { saved: false, reason: 'verification' } };
          if (
            !demoReplayMatchesEntry(replay, entry) ||
            demoDescriptor(replay, entry).campaignKey !== descriptor.campaignKey
          )
            return { rejected: { saved: false, reason: 'incompatible' } };
          const item = {
            id: descriptor.id,
            descriptor,
            replayText: JSON.stringify(replay),
            createdAt: now(),
          };
          if (byteLength({ format: FORMAT, items: [item] }) > DEMO_LIBRARY_LIMITS.bytes)
            return { rejected: { saved: false, reason: 'size' } };
          // The transaction may finish opening/reading after Start. Its callback
          // checks admission synchronously before copying up to 32 MiB. Aborting
          // this optional write leaves the prior cache intact, without awaiting
          // inside a transaction or moving atomic eviction outside it.
          const pending = Promise.resolve(
            getStorage().update(
              (sourceLibrary) => {
                check();
                const document = snapshotLibrary(sourceLibrary);
                document.items = [
                  item,
                  ...document.items.filter((old) => old.id !== item.id),
                ].slice(0, DEMO_LIBRARY_LIMITS.recordings);
                while (byteLength(document) > DEMO_LIBRARY_LIMITS.bytes) document.items.pop();
                return document;
              },
              { signal, beforeWork: check },
            ),
          );
          pending.catch(() => {});
          return { pending };
        },
        ticket,
        signal,
        manual,
      );
      if (result.rejected) return result.rejected;
      const saved = await result.pending;
      return { saved: true, count: saved.items.length };
    } finally {
      retired = true;
    }
  }
  const captureOptions = ({ entry, practice, signal, manual = false } = {}) => ({
    entry,
    practice,
    signal,
    manual,
  });
  async function keepSource(source, options = {}) {
    const captured = captureOptions(options),
      rejected = begin(captured);
    if (rejected) return rejected;
    const ticket = generation,
      job = operation(captured.signal);
    captured.signal = job.signal;
    try {
      current(ticket, job.signal, !captured.manual);
      const replay = snapshotReplay(source);
      if (!demoReplayMatchesEntry(replay, captured.entry))
        return { saved: false, reason: 'incompatible' };
      const quality = demoRecordingQuality(replay);
      if (!quality.eligible) return { saved: false, reason: quality.reason };
      const descriptor = demoDescriptor(replay, captured.entry);
      return await retain(replay, ticket, captured, descriptor);
    } finally {
      job.finish();
    }
  }
  return Object.freeze({
    get enabled() {
      return active && !closed;
    },
    setEnabled(value) {
      required(typeof value === 'boolean', 'Demo retention needs an explicit boolean.');
      if (closed) throw new Error('Demo library is closed.');
      if (active !== value) {
        active = value;
        generation++;
        cancelOperations();
      }
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
    // Public callers retain the immediate defensive snapshot and initial
    // descriptor, including rejection of later in-place entry mutation.
    keep: keepSource,
    async keepRecording(recorder, state, options = {}) {
      const captured = captureOptions(options),
        rejected = begin(captured);
      if (rejected) return rejected;
      // Only the installed catalog/host's exact immutable publication permits
      // deferred descriptor work. Arbitrary wrappers retain public semantics.
      if (ownsEntry(captured.entry) !== true)
        return keepSource(exportReplay(recorder, state), captured);
      const ticket = generation,
        job = operation(captured.signal);
      const ownedOptions = { ...captured, signal: job.signal },
        { signal, manual } = ownedOptions;
      try {
        const replay = await exportReplayAsync(recorder, state, {
          signal,
          ...(scheduleChunk
            ? {
                scheduleChunk: (work, chunkOptions) =>
                  scheduleChunk(() => {
                    ready(ticket, signal, manual);
                    work();
                  }, chunkOptions),
              }
            : {}),
        });
        current(ticket, signal, !manual);
        return await retain(replay, ticket, ownedOptions);
      } finally {
        job.finish();
      }
    },
    async clear({ signal } = {}) {
      generation++;
      cancelOperations();
      await getStorage().update(() => empty(), { signal });
    },
    dispose() {
      closed = true;
      generation++;
      cancelOperations();
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
  async function transaction(transform, { signal, beforeWork } = {}) {
    abort(signal);
    beforeWork?.();
    const db = await open();
    abort(signal);
    beforeWork?.();
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
          beforeWork?.();
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
