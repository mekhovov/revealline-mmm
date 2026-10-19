import { boundedJSON, canonicalJSON, exactKeys, required } from './data-json.mjs';
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
  validateReceipt,
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
  if (validateReceipt !== undefined)
    required(typeof validateReceipt === 'function', 'A receipt validator is required.');
  const receiptKey = `${key}.receipt.v1`;
  const receiptOf = (source) => {
    const value = boundedJSON(source, {
      maxBytes: 64 * 1024,
      maxDepth: 16,
      maxArray: 256,
      maxString: 32768,
    });
    exactKeys(value, ['format', 'id', 'input', 'result'], 'Profile write receipt');
    required(value.format === 'profile-write-receipt.v1', 'Unsupported profile write receipt.');
    required(
      typeof value.id === 'string' && /^[a-zA-Z0-9._-]{1,128}$/.test(value.id),
      'Invalid profile write identity.',
    );
    required(
      typeof value.input === 'string' && value.input.length <= 32768,
      'Invalid profile write input.',
    );
    return { ...value, result: validateReceipt(value.result) };
  };
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
  function transaction(update, { signal } = {}, once = null) {
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
            request = store.get(key),
            receiptRequest = once ? store.get(receiptKey) : null;
          let state,
            result,
            failure,
            remaining = once ? 2 : 1;
          const received = () => {
            if (--remaining) return;
            try {
              boundedSignal.throwIfAborted();
              state = request.result === undefined ? empty() : validate(request.result);
              if (update) {
                required(canWrite(), 'This tab does not own the saving lease.');
                const previous =
                  receiptRequest?.result === undefined ? null : receiptOf(receiptRequest.result);
                if (once && previous?.id === once.id) {
                  required(
                    previous.input === once.input,
                    'A saved result identity cannot describe a different result.',
                  );
                  result = { state, receipt: previous.result, replayed: true };
                } else {
                  const updated = update(state);
                  state = validate(once ? updated.state : updated);
                  boundedSignal.throwIfAborted();
                  required(canWrite(), 'This tab does not own the saving lease.');
                  if (once) {
                    const receipt = receiptOf({
                      format: 'profile-write-receipt.v1',
                      ...once,
                      result: updated.receipt,
                    });
                    store.put(receipt, receiptKey);
                    result = { state, receipt: receipt.result, replayed: false };
                  }
                  store.put(state, key);
                }
              }
              result ??= state;
            } catch (error) {
              failure = error;
              try {
                tx.abort();
              } catch {
                /* A timed-out transaction is already inactive. */
              }
            }
          };
          request.onsuccess = received;
          if (receiptRequest) receiptRequest.onsuccess = received;
          tx.oncomplete = () => resolve(result);
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
    update: (update, options) => transaction(update, options),
    /** Commit one result and its receipt in the same transaction. Historical
     * profile records retain their exact schema. The caller owns attempt
     * ordering; this receipt only deduplicates its current durable attempt. */
    updateOnce({ id, input }, update, options) {
      required(
        typeof validateReceipt === 'function',
        'This store does not accept result receipts.',
      );
      required(
        typeof id === 'string' && /^[a-zA-Z0-9._-]{1,128}$/.test(id),
        'Invalid profile write identity.',
      );
      const snapshot = canonicalJSON(
        boundedJSON(input, { maxBytes: 32768, maxDepth: 12, maxArray: 256 }),
      );
      required(snapshot.length <= 32768, 'Profile write input is too large.');
      return transaction(update, options, { id, input: snapshot });
    },
    close() {
      if (closed) return;
      closed = true;
      opening?.cancel(new Error('Reward storage is closed.'));
      connection?.close();
      connection = null;
    },
  };
}
