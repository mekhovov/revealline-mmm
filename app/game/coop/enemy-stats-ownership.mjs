import { claimProfileWriter } from '../profile-writer.mjs';

const LOCK_KEY = 'revealline-mmm.team.enemy-stats-continue.v1';
function defaultLocks() {
  try {
    return globalThis.navigator?.locks;
  } catch {
    return null;
  }
}

/** A saved Team simulation can be played in more than one tab. Only one page
 * reuses its canonical statistics cursor; the other page's new live catches
 * belong to an independent branch. The simulation/save recipe is unchanged. */
export function createTeamEnemyStatsOwnership({
  locks = defaultLocks(),
  sessionId = globalThis.crypto.randomUUID(),
} = {}) {
  let lease = null,
    closed = false;
  const selected = new WeakMap();
  const ready = claimProfileWriter(locks, LOCK_KEY).then((value) => {
    lease = value;
    if (closed) value.release();
    return value.writable;
  });
  return {
    ready,
    select(run, identity, { provenance = 'live' } = {}) {
      if (selected.has(run)) return selected.get(run);
      // A delayed/missing Web Locks implementation must not delay play or allow
      // two writers to reuse the same receipt. Snapshot ownership for this run.
      const canonical = !closed && lease?.writable === true;
      const selection = Object.freeze({
        identity: canonical ? identity : `${identity}:stats:${sessionId}`,
        provenance: !canonical && provenance === 'continue' ? 'live' : provenance,
      });
      selected.set(run, selection);
      return selection;
    },
    release() {
      closed = true;
      lease?.release();
    },
  };
}
