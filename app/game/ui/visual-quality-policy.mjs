const TIERS = Object.freeze([
  Object.freeze({ tier: 'full', reduced: false, minimal: false }),
  Object.freeze({ tier: 'reduced', reduced: true, minimal: false }),
  Object.freeze({ tier: 'minimal', reduced: true, minimal: true }),
]);

// Presentation only. No device identification or simulation/input rate changes.
export function createVisualQualityPolicy() {
  // One bounded histogram per policy; active observations never allocate.
  const intervalBuckets = new Uint32Array(128);
  let level = 0,
    reducedPreference = false,
    baselineMs = 1000 / 60,
    windowStart = null,
    count = 0,
    missed = 0,
    work = 0,
    expensive = 0,
    overBudget = 0,
    titleStalled = false,
    overloadWindows = 0,
    headroomWindows = 0,
    lastChange = -Infinity;
  const snapshot = () => TIERS[Math.max(level, reducedPreference ? 1 : 0)];
  const resetWindow = (nowMs) => {
    windowStart = nowMs;
    count = missed = work = expensive = overBudget = 0;
    titleStalled = false;
    intervalBuckets.fill(0);
  };
  return {
    snapshot,
    setReducedPreference(value) {
      reducedPreference = Boolean(value);
      return snapshot();
    },
    // Calibrate while ready/preparing, then freeze this value for active play.
    setBaseline(frameMs) {
      if (Number.isFinite(frameMs) && frameMs >= 4 && frameMs <= 50) baselineMs = frameMs;
      resetWindow(null);
      overloadWindows = headroomWindows = 0;
    },
    observe(nowMs, frameMs, workMs, continuousTitle = false) {
      if (
        !Number.isFinite(nowMs) ||
        !Number.isFinite(frameMs) ||
        !Number.isFinite(workMs) ||
        frameMs <= 0 ||
        workMs < 0
      )
        return snapshot();
      if (windowStart === null || nowMs < windowStart) resetWindow(nowMs);
      // A lifecycle interruption does not contribute a fictitious second of load.
      if (frameMs > 250 && continuousTitle !== true) {
        resetWindow(nowMs);
        overloadWindows = headroomWindows = 0;
        return snapshot();
      }
      count++;
      // Only a continuously foreground title owner may admit long delivery
      // stalls. Gameplay and Demo retain their interruption reset above.
      if (frameMs > 250) titleStalled = true;
      work += workMs;
      if (frameMs > baselineMs * 1.5) missed++;
      if (workMs > baselineMs * 0.6) expensive++;
      if (workMs > Math.min(10, baselineMs * 0.6)) overBudget++;
      // Long title stalls use the final bin; the histogram remains bounded.
      intervalBuckets[Math.min(127, Math.floor((2 * frameMs) / baselineMs))]++;
      if (nowMs - windowStart < 1000) return snapshot();
      const average = work / count;
      // Cadence alone cannot distinguish OS power throttling from overload.
      // Cheap, regular 30 Hz callbacks must not progressively erase decoration.
      // Stable delivery with bounded jitter occupies one or two adjacent bins.
      // Substantial separated populations indicate irregular presentation, not
      // its GPU, compositor, browser or device cause. Scan only once per window.
      let irregular = false;
      if (missed / count > 0.1) {
        const minimumPopulation = Math.max(4, count * 0.2);
        let firstPopulated = -1;
        for (let i = 0; i < intervalBuckets.length; i++) {
          if (intervalBuckets[i] < minimumPopulation) continue;
          if (firstPopulated < 0) firstPopulated = i;
          else if (i - firstPopulated >= 2) {
            irregular = true;
            break;
          }
        }
      }
      // A per-window tail proxy retains expensive callbacks hidden by the mean.
      // It is presentation relief, not the whole-run qualification result.
      const overloaded =
        titleStalled ||
        average > baselineMs * 0.6 ||
        overBudget / count > 0.05 ||
        (missed / count > 0.1 && expensive / count > 0.2) ||
        irregular;
      overloadWindows = overloaded ? overloadWindows + 1 : 0;
      headroomWindows =
        !overloaded && average < baselineMs * 0.35 && missed / count <= 0.02
          ? headroomWindows + 1
          : 0;
      const effectiveLevel = Math.max(level, reducedPreference ? 1 : 0);
      if (overloadWindows >= 2 && effectiveLevel < 2 && nowMs - lastChange >= 10000) {
        level = effectiveLevel + 1;
        lastChange = nowMs;
        overloadWindows = headroomWindows = 0;
      }
      resetWindow(nowMs);
      return snapshot();
    },
    safeTransition(nowMs) {
      if (
        Number.isFinite(nowMs) &&
        level > 0 &&
        headroomWindows >= 10 &&
        nowMs - lastChange >= 10000
      ) {
        level--;
        lastChange = nowMs;
        overloadWindows = headroomWindows = 0;
      }
      // Overload must be consecutive active windows, not separated by a pause.
      overloadWindows = 0;
      resetWindow(null);
      return snapshot();
    },
  };
}
