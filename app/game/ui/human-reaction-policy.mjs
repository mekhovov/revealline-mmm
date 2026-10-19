import { HUMAN_REACTION_CUES, isHumanoidDestruction } from './destruction-audio.mjs';

/** Cosmetic scheduling only. It never queues deaths or consumes gameplay RNG. */
export function createHumanReactionPolicy({ random = Math.random } = {}) {
  let tokens = 2,
    lastTime = null,
    lastOnset = -Infinity,
    quietUntil = -Infinity;
  let bag = [],
    previous = null;
  const metrics = { attempted: 0, admitted: 0, rejected: 0 };
  return {
    interrupt(now, duration = 0.35) {
      quietUntil = Math.max(quietUntil, now + duration);
    },
    request(now, details = {}, activeVoices = 0) {
      metrics.attempted++;
      if (!Number.isFinite(now)) {
        metrics.rejected++;
        return null;
      }
      if (lastTime !== null) tokens = Math.min(2, tokens + Math.max(0, now - lastTime));
      lastTime = now;
      if (
        !Number.isFinite(now) ||
        details.vocals === false ||
        !isHumanoidDestruction(details) ||
        details.audible === false ||
        activeVoices >= 2 ||
        now < quietUntil ||
        now - lastOnset < 0.25 ||
        tokens < 1
      ) {
        metrics.rejected++;
        return null;
      }
      if (!bag.length) {
        bag = [...HUMAN_REACTION_CUES];
        for (let i = bag.length - 1; i > 0; i--) {
          const j = Math.floor(Math.max(0, Math.min(0.999999, random())) * (i + 1));
          [bag[i], bag[j]] = [bag[j], bag[i]];
        }
        if (bag.at(-1) === previous) [bag[0], bag[bag.length - 1]] = [bag.at(-1), bag[0]];
      }
      previous = bag.pop();
      tokens--;
      lastOnset = now;
      metrics.admitted++;
      return previous;
    },
    snapshot: () => ({ ...metrics, tokens }),
    reset() {
      tokens = 2;
      lastTime = null;
      lastOnset = -Infinity;
      quietUntil = -Infinity;
      // Keep shuffle history across retries so every launch does not repeat take 1.
      metrics.attempted = metrics.admitted = metrics.rejected = 0;
    },
  };
}
