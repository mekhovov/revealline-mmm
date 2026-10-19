// Host scheduling only. Authoritative simulation continues to use FIXED_DT.
export function createSceneClock({ maxFrameMs = 250 } = {}) {
  if (!Number.isFinite(maxFrameMs) || maxFrameMs <= 0) throw new RangeError('Invalid frame limit');
  let previous = null;
  let wasActive = false;
  // Reused on every sample; consumers must read before sampling again.
  const sample = { elapsedSeconds: 0, rawElapsedMs: 0, interrupted: false };
  return {
    reset() {
      previous = null;
      wasActive = false;
    },
    sample(nowMs, active = false) {
      if (typeof active === 'object') active = Boolean(active?.active);
      sample.elapsedSeconds = 0;
      sample.rawElapsedMs = 0;
      sample.interrupted = false;
      if (!Number.isFinite(nowMs)) return sample;
      const stamp = previous === null ? nowMs : Math.max(previous, nowMs);
      if (previous !== null) sample.rawElapsedMs = stamp - previous;
      previous = stamp;
      if (active && wasActive) {
        sample.interrupted = sample.rawElapsedMs > maxFrameMs;
        if (!sample.interrupted) sample.elapsedSeconds = sample.rawElapsedMs / 1000;
      }
      wasActive = active;
      return sample;
    },
  };
}
