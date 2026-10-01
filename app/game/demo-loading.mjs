export const DEMO_LOAD_TIMEOUT_MS = 15000;

const abortFailure = (signal) =>
  signal?.reason && typeof signal.reason === 'object' && typeof signal.reason.name === 'string'
    ? signal.reason
    : new DOMException('Demo loading cancelled.', 'AbortError');

/** Bound presentation preparation even when an injected loader ignores abort.
 * The caller keeps ownership of adopted values; abandoned late values are retired. */
export function withDemoLoadingDeadline(
  load,
  {
    signal,
    timeoutMs = DEMO_LOAD_TIMEOUT_MS,
    setTimer = globalThis.setTimeout,
    clearTimer = globalThis.clearTimeout,
    onLateResult = () => {},
  } = {},
) {
  if (!Number.isFinite(timeoutMs) || timeoutMs <= 0 || timeoutMs > DEMO_LOAD_TIMEOUT_MS)
    throw new RangeError('Demo loading needs a deadline of at most 15 seconds.');
  return new Promise((resolve, reject) => {
    const controller = new AbortController();
    let settled = false,
      timer = null;
    const finish = (failed, value) => {
      if (settled) return;
      settled = true;
      if (timer !== null) clearTimer(timer);
      signal?.removeEventListener('abort', cancel);
      if (failed) {
        controller.abort(value);
        reject(value);
      } else resolve(value);
    };
    const cancel = () => finish(true, abortFailure(signal));
    if (signal?.aborted) {
      cancel();
      return;
    }
    signal?.addEventListener('abort', cancel, { once: true });
    try {
      timer = setTimer(
        () =>
          finish(
            true,
            Object.assign(new Error('Demo preparation exceeded its loading deadline.'), {
              name: 'DemoLoadingTimeoutError',
              code: 'demo-load-timeout',
            }),
          ),
        timeoutMs,
      );
      Promise.resolve(load(controller.signal)).then(
        (value) => {
          if (!settled) finish(false, value);
          else {
            // Cleanup cannot revive a cancelled operation or create an unhandled rejection.
            try {
              Promise.resolve(onLateResult(value)).catch(() => {});
            } catch {
              /* The late owner is already abandoned. */
            }
          }
        },
        (error) => finish(true, error),
      );
    } catch (error) {
      finish(true, error);
    }
  });
}
