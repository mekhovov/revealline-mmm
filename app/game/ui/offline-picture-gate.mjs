/** Ask for package consent before the picture decoder's bounded deadline starts. */
export function withOfflinePictureGate(owner, preflight) {
  const pending = new Set();
  let disposed = false;
  const cancel = () => {
    for (const controller of pending) controller.abort();
    pending.clear();
    owner.cancel();
  };
  return Object.freeze({
    ...owner,
    async ensure(themeId, options = {}) {
      if (disposed) throw new DOMException('Picture preparation closed.', 'AbortError');
      const controller = new AbortController();
      pending.add(controller);
      const abort = () => controller.abort();
      options.signal?.addEventListener('abort', abort, { once: true });
      if (options.signal?.aborted) abort();
      try {
        controller.signal.throwIfAborted();
        await preflight({ ...options, signal: controller.signal });
        controller.signal.throwIfAborted();
        return await owner.ensure(themeId, { ...options, signal: controller.signal });
      } finally {
        pending.delete(controller);
        options.signal?.removeEventListener('abort', abort);
      }
    },
    cancel,
    dispose() {
      disposed = true;
      cancel();
      owner.dispose();
    },
  });
}
