import { boundedJSON, canonicalJSON, exactKeys, required } from './data-json.mjs';
import { PACK_LIMITS } from './packs.mjs';
import { abortExternalChapter } from './external-chapter.mjs';
import { parseEditionChannel } from './edition-context.mjs';

export const EXTERNAL_BACKUP_JOURNAL_FORMAT = 'xonix-backup-journal.v2';
const own = (value) =>
  boundedJSON(value, {
    maxBytes: PACK_LIMITS.libraryBytes * 3 + 8 * 1024 * 1024,
    maxString: PACK_LIMITS.libraryBytes + 4 * 1024 * 1024,
    maxNodes: 1000000,
    maxDepth: 30,
    maxArray: 4096,
  });
const equal = (a, b) => canonicalJSON(a) === canonicalJSON(b);
const pair = (state) => ({ packs: state.packs, index: state.index });
const adapters = new WeakSet();
export const isExternalBackupAssets = (value) => adapters.has(value);

/** Own-journal authority only. Caller holds the existing writer and backup lock.
 * Packs, descriptor index and the recovery journal share ONE assets transaction.
 * Shared original media and local profile/session values are never written here.
 */
export function createExternalBackupAssets({
  indexedDB = globalThis.indexedDB,
  storage = globalThis.localStorage,
  profileKey,
  packsKey,
  writer,
  timeoutMs = 15000,
} = {}) {
  const channel =
    typeof profileKey === 'string' && /^revealline-mmm\.library\.(.+)\.v1$/.exec(profileKey)?.[1];
  required(
    typeof profileKey === 'string' &&
      (parseEditionChannel(channel) ||
        /^revealline-mmm\.library\.(?:dev|release|release-v?(?:0|[1-9]\d{0,4})\.(?:0|[1-9]\d{0,4})\.(?:0|[1-9]\d{0,4}))\.v1$/.test(
          profileKey,
        )),
    'Use an exact supported backup profile channel.',
  );
  required(
    packsKey === profileKey.replace('revealline-mmm.library.', 'revealline-mmm.packs.'),
    'Backup pack channel must match its profile.',
  );
  required(
    typeof indexedDB?.open === 'function' && typeof storage?.getItem === 'function',
    'Native backup asset storage is unavailable.',
  );
  required(
    Number.isSafeInteger(timeoutMs) && timeoutMs > 0 && timeoutMs <= 15000,
    'Invalid backup asset timeout.',
  );
  const keys = Object.freeze({
    profileKey,
    packsKey,
    sessionKey: profileKey.replace('revealline-mmm.library.', 'revealline-mmm.suspended.'),
    lockKey: `${profileKey}.backup-lock`,
    journalKey: `${profileKey}.backup-journal`,
    indexKey: `${profileKey}.external-chapter-index.v1`,
    externalJournalKey: `${profileKey}.external-chapter-journal.v1`,
  });
  let closed = false;
  const check = (signal, writing = false) => {
    abortExternalChapter(signal);
    required(!closed, 'External backup assets are closed.');
    if (writing) required(writer?.writable === true, 'Hold the current profile writer lease.');
  };
  async function open(signal) {
    check(signal);
    return new Promise((resolve, reject) => {
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
      const cancel = () => finish(new DOMException('Backup assets open cancelled.', 'AbortError'));
      const timer = setTimeout(() => finish(new Error('Backup assets open timed out.')), timeoutMs);
      signal?.addEventListener('abort', cancel, { once: true });
      let request;
      try {
        request = indexedDB.open('revealline-mmm-assets-v1', 1);
      } catch (error) {
        finish(error);
        return;
      }
      request.onupgradeneeded = () => {
        if (done || closed || signal?.aborted) request.transaction.abort();
        else request.result.createObjectStore('assets');
      };
      request.onsuccess = () => {
        if (closed || signal?.aborted) {
          request.result.close();
          cancel();
        } else finish(null, request.result);
      };
      request.onerror = () => finish(request.error ?? new Error('Backup assets open failed.'));
      request.onblocked = () => finish(new Error('Close older asset database connections.'));
      if (signal?.aborted) cancel();
    });
  }
  async function transaction(change, { signal } = {}) {
    const db = await open(signal);
    try {
      check(signal, !!change);
      return await new Promise((resolve, reject) => {
        const tx = db.transaction('assets', change ? 'readwrite' : 'readonly');
        const store = tx.objectStore('assets'),
          state = {};
        let left = 4,
          result,
          failure;
        const fail = (error) => {
          failure = error;
          try {
            tx.abort();
          } catch {}
        };
        const cancel = () =>
          fail(new DOMException('Backup asset transaction cancelled.', 'AbortError'));
        const timer = setTimeout(
          () => fail(new Error('Backup asset transaction timed out.')),
          timeoutMs,
        );
        const clean = () => {
          clearTimeout(timer);
          signal?.removeEventListener('abort', cancel);
        };
        signal?.addEventListener('abort', cancel, { once: true });
        tx.onabort = () => {
          clean();
          reject(failure ?? tx.error ?? new Error('Backup asset transaction failed.'));
        };
        tx.onerror = () => {
          failure ??= tx.error;
        };
        tx.oncomplete = () => {
          clean();
          resolve(result);
        };
        for (const [name, key] of Object.entries({
          packs: keys.packsKey,
          index: keys.indexKey,
          backup: keys.journalKey,
          external: keys.externalJournalKey,
        })) {
          const request = store.get(key);
          request.onsuccess = () => {
            try {
              state[name] = request.result ?? null;
              if (--left) return;
              check(signal, !!change);
              result = own(state);
              if (!change) return;
              required(
                state.external === null,
                'Recover the external chapter journal before backup writes.',
              );
              const next = own(change(result));
              exactKeys(next, ['packs', 'index', 'backup', 'external'], 'backup asset update');
              required(next.external === null, 'Backup cannot change an external install journal.');
              for (const [name, key] of Object.entries({
                packs: keys.packsKey,
                index: keys.indexKey,
                backup: keys.journalKey,
              }))
                if (!equal(next[name], state[name])) store.put(next[name], key);
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
  function journal(candidate) {
    const value = own(candidate);
    exactKeys(value, ['format', 'token', 'targets', 'previous', 'next'], 'external backup journal');
    required(
      value.format === EXTERNAL_BACKUP_JOURNAL_FORMAT &&
        typeof value.token === 'string' &&
        value.token.length > 0 &&
        value.token.length <= 300,
      'Invalid external backup journal.',
    );
    exactKeys(
      value.targets,
      ['profileKey', 'packsKey', 'sessionKey', 'lockKey', 'indexKey'],
      'external journal targets',
    );
    for (const name of Object.keys(value.targets))
      required(
        value.targets[name] === keys[name],
        'External backup journal belongs to different keys.',
      );
    exactKeys(value.previous, ['profile', 'session', 'packs', 'index'], 'external previous state');
    exactKeys(value.next, ['packs', 'index'], 'external next assets');
    required(
      ['profile', 'session'].every(
        (name) => value.previous[name] === null || typeof value.previous[name] === 'string',
      ),
      'External journal must retain raw local values.',
    );
    return value;
  }
  function owner(value) {
    required(
      storage.getItem(keys.lockKey) === value.token,
      'Backup recovery marker ownership changed.',
    );
  }
  function pending(state, value, allowAbsent = false) {
    owner(value);
    required(
      equal(state.backup, value) || (allowAbsent && state.backup === null),
      'Backup journal ownership changed.',
    );
    required(
      equal(pair(state), pair(value.previous)) || equal(pair(state), value.next),
      'Backup asset values changed outside the owned transaction.',
    );
  }
  const api = Object.freeze({
    keys,
    snapshot: (options) => transaction(null, options),
    journal,
    begin(before, candidate, options) {
      before = own(before);
      const value = journal(candidate);
      required(
        equal(pair(before), pair(value.previous)),
        'Journal previous assets differ from the reviewed source.',
      );
      return transaction((state) => {
        owner(value);
        required(
          state.backup === null && equal(state, before),
          'Backup source changed before journal publication.',
        );
        return { ...state, backup: value };
      }, options);
    },
    publish(candidate, options) {
      const value = journal(candidate);
      return transaction((state) => {
        pending(state, value);
        required(equal(pair(state), pair(value.previous)), 'Backup was already published.');
        return { ...state, ...value.next };
      }, options);
    },
    restore(candidate, options) {
      const value = journal(candidate);
      return transaction((state) => {
        pending(state, value, true);
        return { ...state, ...pair(value.previous), backup: value };
      }, options);
    },
    finish(candidate, { restored = false, ...options } = {}) {
      const value = journal(candidate);
      return transaction((state) => {
        pending(state, value);
        required(
          equal(pair(state), restored ? pair(value.previous) : value.next),
          'Backup assets are not ready for finalization.',
        );
        return { ...state, backup: null };
      }, options);
    },
    close() {
      closed = true;
    },
  });
  adapters.add(api);
  return api;
}
