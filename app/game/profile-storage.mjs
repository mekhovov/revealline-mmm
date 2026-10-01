import { required } from './data-json.mjs';
import { JOURNEY_PROFILE_DATABASE } from './profile-database.mjs';

export function validateTimeout(value) {
  required(
    Number.isFinite(value) && value > 0,
    'Reward storage needs a positive operation timeout.',
  );
}

export function boundedOperation(start, milliseconds, { signal, onAbort } = {}) {
  return new Promise((resolve, reject) => {
    const controller = new AbortController();
    let settled = false,
      timer;
    const clean = () => {
      clearTimeout(timer);
      signal?.removeEventListener('abort', cancelled);
    };
    const fail = (error) => {
      if (settled) return;
      settled = true;
      clean();
      controller.abort(error);
      try {
        onAbort?.(error);
      } catch {
        /* A failed cancellation cannot hold up recovery. */
      }
      reject(error);
    };
    const cancelled = () => fail(signal.reason ?? new Error('Reward storage was cancelled.'));
    if (signal?.aborted) {
      cancelled();
      return;
    }
    signal?.addEventListener('abort', cancelled, { once: true });
    timer = setTimeout(() => fail(new Error('Reward storage operation timed out.')), milliseconds);
    Promise.resolve()
      .then(() => {
        controller.signal.throwIfAborted();
        return start(controller.signal);
      })
      .then((value) => {
        if (settled) return;
        settled = true;
        clean();
        resolve(value);
      }, fail);
  });
}

/** A versioned sidecar in the existing Journey database. The profile and its
 * historical backup formats remain unchanged; this never writes arcade clears. */
export function createProfileRecordBackend({
  key,
  empty,
  validate,
  indexedDB = globalThis.indexedDB,
  canWrite = () => true,
  operationTimeoutMs = 1500,
} = {}) {
  required(
    typeof key === 'string' && key.length > 0 && key.length <= 256,
    'A bounded profile record key is required.',
  );
  required(
    typeof empty === 'function' && typeof validate === 'function',
    'Profile record validation is required.',
  );
  required(typeof canWrite === 'function', 'Rewards require a write guard.');
  validateTimeout(operationTimeoutMs);
  let opening = null,
    connection = null,
    closed = false;
  const open = () => {
    required(!closed, 'Reward storage is closed.');
    required(indexedDB, 'Reward storage is unavailable.');
    if (connection) return Promise.resolve(connection);
    if (opening) return opening.promise;
    const attempt = { promise: null, failed: false, cancel: null };
    opening = attempt;
    attempt.promise = new Promise((resolve, reject) => {
      const fail = (error) => {
        attempt.failed = true;
        if (opening === attempt) opening = null;
        reject(error ?? new Error('Reward storage could not be opened.'));
      };
      attempt.cancel = fail;
      let request;
      try {
        request = indexedDB.open(JOURNEY_PROFILE_DATABASE, 1);
      } catch (error) {
        fail(error);
        return;
      }
      request.onupgradeneeded = () => {
        if (closed || attempt.failed) {
          request.transaction?.abort();
          return;
        }
        if (!request.result.objectStoreNames.contains('profiles'))
          request.result.createObjectStore('profiles');
      };
      request.onsuccess = () => {
        const db = request.result;
        if (attempt.failed || closed) {
          db.close();
          return;
        }
        connection = db;
        if (opening === attempt) opening = null;
        db.onversionchange = () => {
          db.close();
          if (connection === db) connection = null;
        };
        resolve(db);
      };
      request.onerror = () => fail(request.error);
      request.onblocked = () => fail(new Error('Reward storage is busy in another tab.'));
    });
    return attempt.promise;
  };
  function transaction(update, { signal } = {}) {
    let tx, pendingOpen;
    return boundedOperation(
      async (boundedSignal) => {
        if (update) required(canWrite(), 'This tab does not own the saving lease.');
        const openingPromise = open();
        pendingOpen = opening;
        const db = await openingPromise;
        pendingOpen = null;
        boundedSignal.throwIfAborted();
        required(!closed, 'Reward storage is closed.');
        if (update) required(canWrite(), 'This tab does not own the saving lease.');
        return new Promise((resolve, reject) => {
          tx = db.transaction('profiles', update ? 'readwrite' : 'readonly');
          const store = tx.objectStore('profiles'),
            request = store.get(key);
          let state, failure;
          request.onsuccess = () => {
            try {
              boundedSignal.throwIfAborted();
              state = request.result === undefined ? empty() : validate(request.result);
              if (update) {
                required(canWrite(), 'This tab does not own the saving lease.');
                state = validate(update(state));
                boundedSignal.throwIfAborted();
                store.put(state, key);
              }
            } catch (error) {
              failure = error;
              try {
                tx.abort();
              } catch {
                /* A timed-out transaction is already inactive. */
              }
            }
          };
          tx.oncomplete = () => resolve(state);
          tx.onerror = tx.onabort = () =>
            reject(failure ?? tx.error ?? new Error('Rewards could not be saved.'));
        });
      },
      operationTimeoutMs,
      {
        signal,
        onAbort(error) {
          if (pendingOpen && opening === pendingOpen) pendingOpen.cancel(error);
          if (tx) {
            try {
              tx.abort();
            } catch {
              /* The transaction may already have completed. */
            }
          }
        },
      },
    );
  }
  return {
    key,
    read: (options) => transaction(null, options),
    update: transaction,
    close() {
      if (closed) return;
      closed = true;
      opening?.cancel(new Error('Reward storage is closed.'));
      connection?.close();
      connection = null;
    },
  };
}
