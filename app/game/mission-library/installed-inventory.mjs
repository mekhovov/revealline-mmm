import { inspectPackLibraryMetadata, PACK_LIBRARY_VERSION } from '../packs.mjs';

const cancelled = () => new DOMException('Installed inventory operation cancelled.', 'AbortError');

/** Composes one owned read-only reader with non-runtime metadata inspection.
 * This factory owns reader.close(). It never writes, downloads, decodes or
 * creates a prepared-pack capability while refreshing the browsing inventory.
 *
 * getInventory() returns a dedicated empty metadata sentinel unless state.ready
 * is true. The sentinel means UNKNOWN, not absent. Hosts must veto missing
 * Classic downloads while !state.ready, show state.reason, and retain old cards
 * (now stale/Unavailable) on refresh failure instead of reconciling them away.
 * Base/Journey owners and already-loaded Solo content remain independent.
 */
export async function createMissionLibraryInventory({ reader } = {}) {
  if (!reader || ['snapshot', 'confirm', 'close'].some((key) => typeof reader[key] !== 'function'))
    throw new TypeError('Installed inventory needs its owned read-only snapshot reader.');
  let empty;
  try {
    empty = await inspectPackLibraryMetadata({ format: PACK_LIBRARY_VERSION, packs: [] });
  } catch (error) {
    reader.close();
    throw error;
  }
  const cache = new Map(),
    bindings = new WeakMap();
  let active = null,
    generation = 0,
    closed = false;
  let status = 'unread',
    reason = 'Installed content has not been checked yet.';
  const check = (signal) => {
    if (signal?.aborted) throw cancelled();
    if (closed) throw new Error('Installed inventory is closed.');
  };
  const ticketCurrent = (ticket, signal) => {
    check(signal);
    if (generation !== ticket) throw new Error('Installed inventory operation was superseded.');
  };
  const current = (record, signal) => {
    ticketCurrent(record.generation, signal);
    if (active !== record || bindings.get(record.metadata) !== record || status !== 'checked')
      throw new Error('Installed content changed. Refresh the mission library.');
  };
  function unavailable(error, ticket) {
    if (closed || generation !== ticket) return;
    active = null;
    status = 'unavailable';
    reason = `Installed content could not be checked: ${error.message || error}. Existing packs are kept. Reopen missions to retry.`;
  }
  const getInventory = () => active?.metadata ?? empty;
  async function refresh({ signal } = {}) {
    check(signal);
    const ticket = ++generation;
    active = null;
    status = 'checking';
    reason = 'Checking installed chapter metadata. Existing packs are kept.';
    try {
      const snapshot = await reader.snapshot({ signal });
      ticketCurrent(ticket, signal);
      let metadata = cache.get(snapshot.sha256);
      if (!metadata)
        metadata = await inspectPackLibraryMetadata(
          snapshot.packs ?? {
            format: PACK_LIBRARY_VERSION,
            packs: [],
          },
        );
      ticketCurrent(ticket, signal);
      // Parsing/hashing may yield. Recheck the exact storage snapshot before
      // publishing even a previously cached DTO as the current inventory.
      await reader.confirm(snapshot, { signal });
      ticketCurrent(ticket, signal);
      const record = Object.freeze({ metadata, snapshot, generation: ticket });
      bindings.set(metadata, record);
      cache.delete(snapshot.sha256);
      cache.set(snapshot.sha256, metadata);
      while (cache.size > 2) cache.delete(cache.keys().next().value);
      active = record;
      status = 'checked';
      reason = '';
      return metadata;
    } catch (error) {
      unavailable(error, ticket);
      throw error;
    }
  }
  function recordFor(metadata, signal) {
    check(signal);
    const record = bindings.get(metadata);
    if (!record) throw new Error('Use this inventory’s exact inspected metadata.');
    current(record, signal);
    return record;
  }
  async function confirmRecord(record, signal) {
    current(record, signal);
    try {
      await reader.confirm(record.snapshot, { signal });
      current(record, signal);
      return true;
    } catch (error) {
      unavailable(error, record.generation);
      throw error;
    }
  }
  return Object.freeze({
    getInventory,
    state: () =>
      Object.freeze({
        status,
        ready: status === 'checked', // Metadata freshness only, NOT artwork readiness.
        error: status === 'unavailable' ? reason : null,
        reason,
        sha256: active?.snapshot.sha256 ?? null,
        hasPrevious: cache.size > 0,
      }),
    refresh,
    confirm: (metadata, { signal } = {}) => confirmRecord(recordFor(metadata, signal), signal),
    /** Deliberate preparation only. prepare receives exact immutable raw bytes
     * and must call the genuine host validator/decoder, never fake dimensions.
     * It owns cleanup if it rejects before returning. After success, ownership
     * passes to the caller; disposeFailed is mandatory for a returned result
     * invalidated by cancellation, generation change or storage confirmation.
     * A no-op disposer is suitable only for data-only results whose preparer
     * already releases every native resource (e.g. installer.inspect).
     */
    async materialize(metadata, prepare, { signal, disposeFailed } = {}) {
      if (typeof prepare !== 'function' || typeof disposeFailed !== 'function')
        throw new TypeError('Genuine preparation and failed-result cleanup are required.');
      const record = recordFor(metadata, signal);
      await confirmRecord(record, signal);
      current(record, signal);
      const isCurrent = () => {
        try {
          current(record, signal);
          return true;
        } catch {
          return false;
        }
      };
      const result = await prepare(
        Object.freeze({
          snapshot: record.snapshot,
          metadata,
          signal,
          isCurrent,
          checkCurrent: () => current(record, signal),
        }),
      );
      try {
        await confirmRecord(record, signal);
        return result;
      } catch (error) {
        try {
          await disposeFailed(result, error);
        } catch (cleanup) {
          throw new AggregateError([error, cleanup], 'Preparation retired and cleanup failed.');
        }
        throw error;
      }
    },
    close() {
      if (closed) return;
      closed = true;
      ++generation;
      active = null;
      cache.clear();
      status = 'closed';
      reason = 'Installed inventory is closed; existing packs are kept.';
      reader.close();
    },
  });
}
