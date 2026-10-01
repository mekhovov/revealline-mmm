const ownedWriters = new WeakMap();

/** Only an actual, still-held lease from this module can authorize its owner. */
export const ownsProfileWriter = (lease, key) =>
  ownedWriters.get(lease) === key && lease.writable === true;

/** A conservative single writing tab. Reading, practice and exporting do not need
 * this lease. Hold the Web Lock for the page lifetime and release on pagehide.
 * Every release writer must participate; legacy clients are outside this guard.
 */
const leases = new WeakMap();
export const profileWriterOwns = (lease, key) =>
  leases.get(lease) === key && lease.writable === true;

export async function claimProfileWriter(lockManager, key) {
  const unavailable =
    'This browser cannot reserve the player library for safe writing. Progress is session-only; export a backup to keep it.';
  const occupied =
    'Another game tab owns saving. This tab is session-only; close the other game tab, then reload here to save. Export still works.';
  const denied = (reason, reasonCode = 'unavailable') =>
    Object.freeze({ writable: false, reason, reasonCode, release() {} });
  if (!lockManager || typeof lockManager.request !== 'function') return denied(unavailable);
  if (typeof key !== 'string' || !key.trim() || key.length > 512)
    return denied(
      'A valid profile writer key is required. Progress is session-only.',
      'invalid-key',
    );
  let settle,
    settled = false,
    writable = false,
    reason = '',
    reasonCode = null,
    unlock;
  const claimed = new Promise((resolve) => {
    settle = (value) => {
      if (!settled) {
        settled = true;
        resolve(value);
      }
    };
  });
  const holding = new Promise((resolve) => {
    unlock = resolve;
  });
  const lease = Object.freeze({
    get writable() {
      return writable;
    },
    get reason() {
      return reason;
    },
    get reasonCode() {
      return reasonCode;
    },
    release() {
      if (!writable) return;
      writable = false;
      reason =
        'The saving lease was released. Reload this tab to save again; export remains available.';
      reasonCode = 'released';
      unlock();
    },
  });
  leases.set(lease, key);
  try {
    const request = lockManager.request(
      key,
      { mode: 'exclusive', ifAvailable: true },
      async (lock) => {
        if (!lock) {
          settle(denied(occupied, 'occupied'));
          return;
        }
        writable = true;
        ownedWriters.set(lease, key);
        settle(lease);
        await holding;
      },
    );
    Promise.resolve(request).then(
      () => {
        if (!settled) settle(denied(unavailable));
        // Unexpected request completion must not leave a stale writable flag.
        writable = false;
      },
      () => {
        writable = false;
        reason = unavailable;
        reasonCode = 'unavailable';
        unlock();
        settle(denied(unavailable));
      },
    );
  } catch {
    writable = false;
    unlock();
    settle(denied(unavailable));
  }
  return claimed;
}
