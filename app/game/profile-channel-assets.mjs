import { isRecoveryChannel } from './profile-channel.mjs';

const DATABASE = 'revealline-mmm-assets-v1';
const abort = (signal) => {
  if (signal?.aborted) throw signal.reason ?? new DOMException('Cancelled.', 'AbortError');
};

/** Read existing assets only. Never open the shared media DB, upgrade, or create a store. */
export function createProfileChannelAssets({
  indexedDB = globalThis.indexedDB,
  timeoutMs = 15000,
} = {}) {
  if (!Number.isInteger(timeoutMs) || timeoutMs < 1 || timeoutMs > 15000)
    throw new TypeError('Invalid profile asset deadline.');
  let closed = false;
  const pending = new Set();
  const check = (signal) => {
    abort(signal);
    if (closed) throw new Error('Profile asset reader is closed.');
  };
  function open(signal) {
    check(signal);
    if (typeof indexedDB?.open !== 'function')
      throw new Error('Profile asset storage is unavailable.');
    return new Promise((resolve, reject) => {
      let settled = false,
        absent = false,
        request;
      const finish = (error, db = null) => {
        if (settled) {
          db?.close();
          return;
        }
        settled = true;
        clearTimeout(timer);
        signal?.removeEventListener('abort', cancel);
        pending.delete(cancel);
        if (error) reject(error);
        else resolve(db);
      };
      const cancel = () => {
        try {
          request?.transaction?.abort();
        } catch {}
        finish(new DOMException('Profile asset open cancelled.', 'AbortError'));
      };
      const timer = setTimeout(() => finish(new Error('Profile asset open timed out.')), timeoutMs);
      signal?.addEventListener('abort', cancel, { once: true });
      pending.add(cancel);
      try {
        // No requested version: any creation upgrade is explicitly aborted below.
        request = indexedDB.open(DATABASE);
        request.onupgradeneeded = (event) => {
          absent = event.oldVersion === 0;
          request.transaction.abort();
        };
        request.onerror = () =>
          finish(absent ? null : (request.error ?? new Error('Profile assets could not open.')));
        request.onblocked = () => finish(new Error('Profile assets are busy in another tab.'));
        request.onsuccess = () => {
          const db = request.result;
          if (settled || closed || signal?.aborted) {
            db.close();
            cancel();
            return;
          }
          if (db.version !== 1 || !db.objectStoreNames.contains('assets')) {
            db.close();
            finish(new Error('This profile asset database version is unsupported.'));
          } else finish(null, db);
        };
      } catch (error) {
        finish(error);
      }
      if (signal?.aborted) cancel();
    });
  }
  async function read(signal, schedule) {
    check(signal);
    const db = await open(signal);
    try {
      check(signal);
      if (!db) return Object.freeze({ state: 'absent' });
      return await new Promise((resolve, reject) => {
        const tx = db.transaction('assets', 'readonly');
        let failure, result;
        const fail = (error) => {
          failure ??= error;
          try {
            tx.abort();
          } catch {}
        };
        const cancel = () => fail(new DOMException('Profile asset read cancelled.', 'AbortError'));
        const timer = setTimeout(() => fail(new Error('Profile asset read timed out.')), timeoutMs);
        const clean = () => {
          clearTimeout(timer);
          signal?.removeEventListener('abort', cancel);
          pending.delete(cancel);
        };
        pending.add(cancel);
        signal?.addEventListener('abort', cancel, { once: true });
        db.onversionchange = () => {
          cancel();
          db.close();
        };
        tx.onabort = () => {
          clean();
          reject(failure ?? tx.error ?? new Error('Profile asset read aborted.'));
        };
        tx.onerror = () => {
          failure ??= tx.error;
        };
        tx.oncomplete = () => {
          clean();
          if (failure || closed || signal?.aborted)
            reject(failure ?? new DOMException('Cancelled.', 'AbortError'));
          else resolve(Object.freeze({ state: 'present', value: result }));
        };
        try {
          schedule(
            tx.objectStore('assets'),
            (value) => {
              result = value;
            },
            fail,
          );
        } catch (error) {
          fail(error);
        }
        if (signal?.aborted) cancel();
      });
    } finally {
      db?.close();
    }
  }
  return Object.freeze({
    keys({ signal, limit = 4096 } = {}) {
      if (!Number.isInteger(limit) || limit < 1 || limit > 4096)
        throw new TypeError('Invalid profile asset key bound.');
      return read(signal, (store, done, fail) => {
        const request = store.getAllKeys(undefined, limit + 1);
        request.onsuccess = () => {
          if (!Array.isArray(request.result) || request.result.length > limit)
            fail(new Error('Too many profile asset keys to inspect safely.'));
          else done(request.result);
        };
      });
    },
    snapshot(channel, { signal } = {}) {
      if (!isRecoveryChannel(channel))
        throw new TypeError('Choose a recognized exact profile channel.');
      return read(signal, (store, done, fail) => {
        const values = {};
        let left = 8;
        for (const [name, key] of Object.entries({
          packs: channel.packsKey,
          index: channel.indexKey,
          backup: channel.journalKey,
          external: channel.externalJournalKey,
        })) {
          const count = store.count(key),
            value = store.get(key);
          let present, data;
          const finish = () => {
            if (--left === 0) done(values);
          };
          count.onsuccess = () => {
            if (count.result !== 0 && count.result !== 1) {
              fail(new Error('Invalid exact profile key presence.'));
              return;
            }
            present = count.result === 1;
            values[name] = { present, value: data };
            finish();
          };
          value.onsuccess = () => {
            data = value.result;
            values[name] = { present, value: data };
            finish();
          };
        }
      });
    },
    close() {
      closed = true;
      for (const cancel of [...pending]) cancel();
    },
  });
}
