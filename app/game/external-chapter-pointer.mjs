import { boundedJSON, canonicalJSON, required } from './data-json.mjs';
import { PACK_LIMITS } from './packs.mjs';
import { abortExternalChapter, externalChapterHash } from './external-chapter.mjs';
import { createProfileChannelAssets } from './profile-channel-assets.mjs';
import { recoveryChannel } from './profile-channel.mjs';
import { parseEditionChannel } from './edition-context.mjs';

const own = (v) =>
  boundedJSON(v, {
    maxBytes: PACK_LIMITS.libraryBytes * 3 + 1024 * 1024,
    maxString: PACK_LIMITS.libraryBytes,
    maxNodes: 900000,
    maxDepth: 28,
    maxArray: 4096,
  });
function pointerKeys(profileKey, packsKey) {
  const id =
    typeof profileKey === 'string' && /^revealline-mmm\.library\.(.+)\.v1$/.exec(profileKey)?.[1];
  const edition = parseEditionChannel(id);
  required(
    typeof profileKey === 'string' &&
      (edition ||
        /^revealline-mmm\.library\.(?:dev|release-v?(?:0|[1-9]\d{0,4})\.(?:0|[1-9]\d{0,4})\.(?:0|[1-9]\d{0,4}))\.v1$/.test(
          profileKey,
        )),
    'Use an exact supported profile channel.',
  );
  required(
    packsKey === profileKey.replace('revealline-mmm.library.', 'revealline-mmm.packs.'),
    'Pack channel must match the profile channel.',
  );
  return Object.freeze({
    profileKey,
    packsKey,
    writerKey: edition ? `revealline-mmm.company.${edition.editionId}.writer` : `${profileKey}.writer`,
    lockKey: `${profileKey}.backup-lock`,
    backupJournalKey: `${profileKey}.backup-journal`,
    journalKey: `${profileKey}.external-chapter-journal.v1`,
    indexKey: `${profileKey}.external-chapter-index.v1`,
  });
}
/** Same existing asset DB/store. Pointer/index/journal publish in one native transaction.
 * No schema addition, profile/session write, media DB access or runtime adoption.
 */
export function createExternalChapterPointerStore({
  indexedDB = globalThis.indexedDB,
  profileKey,
  packsKey,
} = {}) {
  const keys = pointerKeys(profileKey, packsKey);
  required(typeof indexedDB?.open === 'function', 'IndexedDB is required for chapter publication.');
  let closed = false;
  async function open(signal) {
    abortExternalChapter(signal);
    required(!closed, 'Chapter pointer store is closed.');
    return new Promise((resolve, reject) => {
      const request = indexedDB.open('revealline-mmm-assets-v1', 1);
      let done = false;
      const finish = (error, db) => {
        if (done) {
          db?.close();
          return;
        }
        done = true;
        clearTimeout(timer);
        signal?.removeEventListener('abort', cancel);
        if (error) reject(error);
        else resolve(db);
      };
      const cancel = () =>
        finish(new DOMException('Chapter database open cancelled.', 'AbortError'));
      const timer = setTimeout(() => finish(new Error('Chapter database open timed out.')), 15000);
      signal?.addEventListener('abort', cancel, { once: true });
      request.onupgradeneeded = () => {
        if (done || closed || signal?.aborted) {
          request.transaction.abort();
          return;
        }
        request.result.createObjectStore('assets');
      };
      request.onsuccess = () => {
        if (closed || signal?.aborted) {
          request.result.close();
          cancel();
          return;
        }
        finish(null, request.result);
      };
      request.onerror = () => finish(request.error ?? new Error('Chapter database open failed.'));
      request.onblocked = () => finish(new Error('Chapter database is blocked; close older tabs.'));
      if (signal?.aborted) cancel();
    });
  }
  async function transaction(expected, next, { signal, guard = () => {} } = {}) {
    // Snapshot caller objects before the asynchronous database boundary.
    expected = expected === undefined ? undefined : own(expected);
    next = next === undefined ? undefined : own(next);
    const db = await open(signal);
    try {
      abortExternalChapter(signal);
      required(!closed, 'Chapter pointer store is closed.');
      return await new Promise((resolve, reject) => {
        const tx = db.transaction('assets', expected === undefined ? 'readonly' : 'readwrite'),
          store = tx.objectStore('assets');
        let left = 4,
          failure,
          result;
        const values = {},
          names = {
            packs: keys.packsKey,
            journal: keys.journalKey,
            backup: keys.backupJournalKey,
            index: keys.indexKey,
          };
        const fail = (error) => {
          failure = error;
          try {
            tx.abort();
          } catch {}
        };
        const cancel = () =>
          fail(new DOMException('Chapter pointer transaction cancelled.', 'AbortError'));
        signal?.addEventListener('abort', cancel, { once: true });
        tx.onabort = () => {
          signal?.removeEventListener('abort', cancel);
          reject(failure ?? tx.error ?? new Error('Chapter pointer transaction failed.'));
        };
        tx.onerror = () => {
          failure ??= tx.error;
        };
        tx.oncomplete = () => {
          signal?.removeEventListener('abort', cancel);
          resolve(result);
        };
        for (const [key, name] of Object.entries(names)) {
          const request = store.get(name);
          request.onsuccess = () => {
            try {
              values[key] = request.result === undefined ? null : request.result;
              if (--left) return;
              guard();
              abortExternalChapter(signal);
              required(!closed, 'Chapter pointer store is closed.');
              required(values.backup === null, 'Recover the existing backup journal first.');
              result = own({ packs: values.packs, journal: values.journal, index: values.index });
              if (expected === undefined) return;
              required(
                canonicalJSON(result) === canonicalJSON(expected),
                'Chapter pointer or journal changed; recovery review is required.',
              );
              required(
                next &&
                  Object.keys(next).length === 3 &&
                  Object.hasOwn(next, 'packs') &&
                  Object.hasOwn(next, 'journal') &&
                  Object.hasOwn(next, 'index'),
                'Invalid chapter pointer update.',
              );
              if (canonicalJSON(next.packs) !== canonicalJSON(result.packs))
                store.put(next.packs, keys.packsKey);
              if (canonicalJSON(next.index) !== canonicalJSON(result.index))
                store.put(next.index, keys.indexKey);
              store.put(next.journal, keys.journalKey);
              result = next;
            } catch (error) {
              fail(error);
            }
          };
        }
        if (signal?.aborted) cancel();
      });
    } finally {
      db.close();
    }
  }
  return Object.freeze({
    keys,
    snapshot: (options) => transaction(undefined, undefined, options),
    compareAndSwap: transaction,
    close() {
      closed = true;
    },
  });
}

/** Existing installed-content bytes only, not prepared packs or media readiness.
 * Reuses the no-upgrade asset reader: an absent DB's creation transaction is
 * aborted and settles before absence is returned. No writer lease, schema
 * mutation, image decoder or media database is involved.
 */
export function createExternalChapterInventoryReader({
  indexedDB = globalThis.indexedDB,
  profileKey,
  packsKey,
  storage = globalThis.localStorage,
  lockManager = globalThis.navigator?.locks,
  timeoutMs = 15000,
} = {}) {
  const keys = pointerKeys(profileKey, packsKey);
  required(
    typeof storage?.getItem === 'function' && typeof lockManager?.request === 'function',
    'Installed inventory needs readable recovery markers and Web Locks.',
  );
  const id = profileKey.slice('revealline-mmm.library.'.length, -'.v1'.length);
  // The version argument classifies recovery/transfer only. This reader uses
  // the exact authenticated keys; dev is not assigned a release identity.
  const edition = parseEditionChannel(id);
  const channel = recoveryChannel(
    id,
    edition
      ? edition.version === 'DEV'
        ? '0.0.0'
        : edition.version
      : id === 'dev'
        ? '0.0.0'
        : id.slice('release-'.length),
    edition ? { editionId: edition.editionId } : {},
  );
  const assets = createProfileChannelAssets({ indexedDB, timeoutMs });
  const owned = new WeakSet(),
    pending = new Set();
  let closed = false;
  const check = (signal) => {
    abortExternalChapter(signal);
    required(!closed, 'Installed inventory reader is closed.');
  };
  const clearMarker = () =>
    required(
      storage.getItem(keys.lockKey) === null,
      'Recover the existing backup lock before browsing installed chapters.',
    );
  const freeze = (value) => {
    if (value && typeof value === 'object') {
      Object.values(value).forEach(freeze);
      Object.freeze(value);
    }
    return value;
  };
  async function snapshot({ signal } = {}) {
    check(signal);
    const controller = new AbortController();
    pending.add(controller);
    const abort = () => controller.abort();
    signal?.addEventListener('abort', abort, { once: true });
    if (signal?.aborted) abort();
    let timer, cancel;
    const retired = new Promise((_, reject) => {
      cancel = () => reject(new DOMException('Installed inventory cancelled.', 'AbortError'));
      controller.signal.addEventListener('abort', cancel, { once: true });
      timer = setTimeout(() => controller.abort(), timeoutMs);
      if (controller.signal.aborted) cancel();
    });
    const work = Promise.resolve().then(() => {
      check(controller.signal);
      clearMarker();
      return lockManager.request(
        keys.lockKey,
        { mode: 'exclusive', ifAvailable: true },
        async (held) => {
          check(controller.signal);
          required(held, 'Another backup or chapter operation owns the profile lock.');
          clearMarker();
          const raw = await assets.snapshot(channel, { signal: controller.signal });
          check(controller.signal);
          clearMarker();
          let packs = null,
            index = null;
          const fields = {};
          if (raw.state !== 'absent') {
            for (const name of ['packs', 'index', 'backup', 'external']) {
              const field = raw.value[name];
              required(
                field &&
                  typeof field.present === 'boolean' &&
                  (!field.present || field.value !== undefined),
                'Installed chapter pointer contains an unreadable stored value.',
              );
              fields[name] = { present: field.present, value: field.present ? field.value : null };
            }
            required(fields.backup.value === null, 'Recover the existing backup journal first.');
            required(
              fields.external.value === null,
              'Recover the existing external chapter journal first.',
            );
            packs = fields.packs.value;
            index = fields.index.value;
            required(
              packs === null || typeof packs === 'string',
              'Installed packs must be exact stored JSON bytes.',
            );
            required(
              index === null || (typeof index === 'object' && !Array.isArray(index)),
              'Installed chapter index must be stored JSON metadata.',
            );
          }
          const checked = own({
            status: raw.state === 'absent' ? 'absent' : 'checked',
            packs,
            index,
          });
          const sha256 = await externalChapterHash(
            canonicalJSON(own({ status: checked.status, fields })),
          );
          check(controller.signal);
          clearMarker();
          const result = freeze({ ...checked, sha256 });
          owned.add(result);
          return result;
        },
      );
    });
    try {
      return await Promise.race([work, retired]);
    } finally {
      clearTimeout(timer);
      signal?.removeEventListener('abort', abort);
      controller.signal.removeEventListener('abort', cancel);
      pending.delete(controller);
    }
  }
  return Object.freeze({
    keys,
    snapshot,
    async confirm(previous, options) {
      required(owned.has(previous), 'Use this reader’s exact installed inventory snapshot.');
      const current = await snapshot(options);
      check(options?.signal);
      required(
        current.sha256 === previous.sha256,
        'Installed content changed. Refresh the mission library.',
      );
      return true;
    },
    close() {
      if (closed) return;
      closed = true;
      for (const controller of pending) controller.abort();
      assets.close();
    },
  });
}
