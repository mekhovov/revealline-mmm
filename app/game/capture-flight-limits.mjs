import { FIXED_DT } from './core/registry.mjs';
import { MAX_REPLAY_TICKS } from './replay.mjs';
import { MAX_COLLECTION_TIME_SECONDS } from './library.mjs';

const ADVANCE_SECONDS = 5 * 60;

/** Time eligibility only: a recording never grants storage or award authority. */
export function captureFlightLimits({
  recordingTicks,
  recordingStopped,
  elapsedSeconds,
  collectionLimited,
}) {
  const remaining =
    Number.isInteger(recordingTicks) && recordingTicks >= 0
      ? Math.max(0, MAX_REPLAY_TICKS - recordingTicks) * FIXED_DT
      : null;
  const recording =
    recordingStopped || remaining === null
      ? 'unavailable'
      : remaining === 0
        ? 'full'
        : remaining <= ADVANCE_SECONDS
          ? 'near'
          : 'available';
  const collection = !collectionLimited
    ? 'journey'
    : elapsedSeconds > MAX_COLLECTION_TIME_SECONDS
      ? 'expired'
      : elapsedSeconds >= MAX_COLLECTION_TIME_SECONDS - ADVANCE_SECONDS
        ? 'near'
        : 'within';
  return Object.freeze({
    recording,
    minutes: remaining === null ? null : Math.ceil(remaining / 60),
    collection,
    urgent:
      ['near', 'full', 'unavailable'].includes(recording) ||
      ['near', 'expired'].includes(collection),
  });
}

/** One notice per boundary and actual run; reopening Pause cannot repeat it. */
export function createFlightLimitNotices() {
  let owner = null;
  const seen = new Set();
  return (run, view) => {
    if (owner !== run) {
      owner = run;
      seen.clear();
    }
    const notices = [];
    if (['near', 'full'].includes(view.recording)) notices.push('recordingWarning');
    if (view.collection === 'near') notices.push('collectionWarning');
    if (view.collection === 'expired') notices.push('collectionExpired');
    return notices.filter((key) => {
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  };
}
