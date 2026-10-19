// Readiness only: never replace a completed pre-play cadence with loaded play.
export const PREPARATION_CADENCE_TIMEOUT_MS = 10_000;
export const PREPARATION_CADENCE_SAMPLES = 30;
export class PreparationCadenceTimeoutError extends Error {
  constructor() {
    super('Quiet frame readiness did not settle before its deadline.');
    this.name = 'PreparationCadenceTimeoutError';
  }
}

export function createPreparationCadence({
  onReady,
  now = () => performance.now(),
  schedule = (callback, delay) => setTimeout(callback, delay),
  unschedule = (timer) => clearTimeout(timer),
} = {}) {
  const intervals = new Float64Array(PREPARATION_CADENCE_SAMPLES);
  let count = 0,
    baseline = null,
    pending = null,
    restartedSamples = 0;
  const aborted = () => new DOMException('Cadence preparation superseded.', 'AbortError');
  function cancel(reason = aborted()) {
    pending?.finish(reason);
  }
  return {
    get ready() {
      return baseline !== null;
    },
    get waiting() {
      return pending !== null;
    },
    get samples() {
      return count;
    },
    snapshot() {
      return {
        samples: count,
        required: intervals.length,
        baselineMs: baseline,
        restartedSamples,
        waiting: pending !== null,
        status: baseline === null ? 'pending-quiet-preparation' : 'measured-before-play',
      };
    },
    cancel,
    observe(intervalMs, workMs, eligible) {
      if (pending) {
        if (!pending.current()) {
          cancel();
          return;
        }
        if (now() >= pending.deadline) {
          cancel(new PreparationCadenceTimeoutError());
          return;
        }
      }
      if (
        baseline !== null ||
        !eligible ||
        !Number.isFinite(intervalMs) ||
        intervalMs < 4 ||
        intervalMs > 50 ||
        !Number.isFinite(workMs) ||
        workMs < 0 ||
        workMs >= 3
      )
        return;
      intervals[count++] = intervalMs;
      if (count !== intervals.length) return;
      intervals.sort();
      baseline = intervals[count >> 1];
      onReady?.(baseline);
      pending?.finish();
    },
    wait({ signal, current }) {
      signal.throwIfAborted();
      if (!current()) return Promise.reject(aborted());
      if (baseline !== null) return Promise.resolve(baseline);
      if (pending) throw new Error('Cadence preparation already has an owner.');
      // An incomplete earlier title/preparation sample set is not mixed with
      // this fresh owned quiet interval. Count the excluded observations openly.
      restartedSamples = Math.min(Number.MAX_SAFE_INTEGER, restartedSamples + count);
      count = 0;
      intervals.fill(0);
      return new Promise((resolve, reject) => {
        const owner = { current, deadline: now() + PREPARATION_CADENCE_TIMEOUT_MS };
        const onAbort = () => owner.finish(signal.reason ?? aborted());
        owner.finish = (error) => {
          if (pending !== owner) return;
          pending = null;
          unschedule(owner.timer);
          signal.removeEventListener('abort', onAbort);
          if (error) reject(error);
          else resolve(baseline);
        };
        pending = owner;
        owner.timer = schedule(
          () => owner.finish(new PreparationCadenceTimeoutError()),
          PREPARATION_CADENCE_TIMEOUT_MS,
        );
        signal.addEventListener('abort', onAbort, { once: true });
        if (signal.aborted) onAbort();
      });
    },
  };
}
