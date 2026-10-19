import { inspectMP3, ownSoundtrackBlob, throwIfSoundtrackAborted } from '../mp3-inspection.mjs';
import { createMediaPreparation } from './media-preparation.mjs';

const aborted = () => new DOMException('MP3 inspection cancelled.', 'AbortError');
const unavailable = () =>
  Object.assign(new Error('MP3 worker unavailable.'), { workerUnavailable: true });

/** One reusable worker per music transport. Playback never falls back to a
 * synchronous structural scan while gameplay is active.
 */
export function createMP3Inspector({
  preparation = createMediaPreparation(),
  createWorker = () =>
    new Worker(new URL('../mp3-inspection-worker.mjs', import.meta.url), { type: 'module' }),
  inspect = inspectMP3,
  timeoutMs = 30000,
} = {}) {
  let worker = null,
    failed = false,
    closed = false,
    sequence = 0,
    pending = null,
    ownedBytes = 0,
    pendingRequests = 0;
  function retire() {
    worker?.terminate();
    worker = null;
  }
  function inspectWorker(source, signal) {
    if (failed) return Promise.reject(unavailable());
    if (!worker) {
      try {
        worker = createWorker();
      } catch {
        failed = true;
        return Promise.reject(unavailable());
      }
    }
    return new Promise((resolve, reject) => {
      const id = ++sequence,
        current = worker;
      let settled = false;
      const finish = (error, result) => {
        if (settled) return;
        settled = true;
        clearTimeout(timer);
        signal?.removeEventListener('abort', cancel);
        current.removeEventListener('message', message);
        current.removeEventListener('error', errorEvent);
        current.removeEventListener('messageerror', errorEvent);
        pending = null;
        if (error) reject(error);
        else resolve(result);
      };
      const cancel = () => {
        if (settled) return;
        retire();
        finish(aborted());
      };
      const errorEvent = () => {
        if (settled) return;
        failed = true;
        retire();
        finish(unavailable());
      };
      const message = ({ data }) => {
        if (data?.id !== id) return;
        if (data.error) {
          const error = new Error(data.error.message);
          error.name = data.error.name;
          finish(error);
        } else finish(null, Object.freeze(data.result));
      };
      const timer = setTimeout(errorEvent, timeoutMs);
      pending = cancel;
      signal?.addEventListener('abort', cancel, { once: true });
      current.addEventListener('message', message);
      current.addEventListener('error', errorEvent);
      current.addEventListener('messageerror', errorEvent);
      if (signal?.aborted || closed) return cancel();
      try {
        current.postMessage({ id, source });
      } catch {
        errorEvent();
      }
    });
  }
  return Object.freeze({
    inspect(source, { signal } = {}) {
      const blob = ownSoundtrackBlob(source);
      ownedBytes += blob.size;
      pendingRequests++;
      return preparation
        .run(
          'inspect',
          async () => {
            if (closed) throw aborted();
            throwIfSoundtrackAborted(signal);
            try {
              return await inspectWorker(blob, signal);
            } catch (error) {
              if (!error.workerUnavailable) throw error;
              return inspect(blob, {
                signal,
                scheduleScan: (work) =>
                  preparation.run('main', work, {
                    signal,
                    eligible: () => !closed,
                  }),
              });
            }
          },
          { signal, eligible: () => !closed },
        )
        .finally(() => {
          ownedBytes -= blob.size;
          pendingRequests--;
        });
    },
    snapshot: () =>
      Object.freeze({
        workerOwned: worker !== null,
        workerActive: pending !== null,
        workerOwnedBytes: ownedBytes,
        pendingRequests,
      }),
    close() {
      closed = true;
      pending?.();
      retire();
      preparation.refresh();
    },
  });
}
