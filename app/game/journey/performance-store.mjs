import { canonicalJSON, required } from '../data-json.mjs';
import {
  emptyJourneyPerformance,
  inspectJourneyPerformance,
  snapshotJourneyPerformanceSource,
  snapshotPerformanceRecordSource,
  verifyPerformanceRecord,
  performanceRecordKey,
  performanceSummary,
  performanceComparison,
  selectPerformanceRecords,
  JOURNEY_PERFORMANCE_LIMITS,
} from './performance.mjs';

export class JourneyBackupEvidenceUnavailable extends Error {
  constructor(cause) {
    super(cause?.message ?? 'Optional backup evidence could not be read.', { cause });
    this.name = 'JourneyBackupEvidenceUnavailable';
  }
}

const sameClear = (profile, record) => {
  const clear = profile?.clears?.solo?.[record.missionId];
  return (
    clear?.runId === record.runId &&
    clear.gameplayId === record.gameplayId &&
    clear.difficulty === record.difficulty
  );
};

/** Optional evidence owned by Journey's existing backend/lease. A separate
 * completion store, progression flag or metric write queue is never created. */
export function createJourneyPerformanceController({
  backend,
  getProfile,
  flushProfile,
  acceptBinding,
  scheduleChunk,
  consumeOwnedState,
  canWrite,
  onChange = () => {},
}) {
  let disposed = false,
    revision = 0,
    lastError = null;
  let stored = undefined,
    retainedEnvelope = undefined,
    storedRows = [],
    sessionRows = [];
  let observedIdentity = null,
    observedGeneration = -1,
    observation = null;
  const cache = new Map(),
    listeners = new Set(),
    jobs = new Set();
  let cachedBytes = 0;
  const allowed = typeof acceptBinding === 'function';
  let projection = { revision: 0, supported: allowed, records: [], error: null };
  const emit = () => {
    revision++;
    const durableKeys = new Set(storedRows.map(performanceRecordKey));
    projection = {
      revision,
      supported: allowed,
      records: allRows().map((row) =>
        Object.freeze({
          ...performanceSummary(row),
          durable: durableKeys.has(performanceRecordKey(row)),
        }),
      ),
      error: lastError?.message ?? null,
    };
    Object.freeze(projection.records);
    Object.freeze(projection);
    for (const callback of [onChange, ...listeners]) {
      try {
        callback();
      } catch {
        /* A result surface never owns progress. */
      }
    }
  };
  const lifetime = (signal) => {
    const controller = new AbortController(),
      abort = () => controller.abort(signal?.reason);
    jobs.add(controller);
    signal?.addEventListener('abort', abort, { once: true });
    if (signal?.aborted || disposed) abort();
    return {
      signal: controller.signal,
      abort: () => controller.abort(),
      done() {
        jobs.delete(controller);
        signal?.removeEventListener('abort', abort);
      },
    };
  };
  const admittedInspection = async (work, signal) => {
    let value,
      called = false,
      retired = false,
      failure;
    try {
      await scheduleChunk(
        () => {
          try {
            required(!retired && !called, 'Performance inspection must run exactly once.');
            called = true;
            signal?.throwIfAborted();
            value = work();
          } catch (error) {
            failure = error;
            throw error;
          }
        },
        { signal },
      );
      if (failure) throw failure;
      required(called, 'Performance inspection admission did not run work.');
      signal?.throwIfAborted();
    } finally {
      retired = true;
    }
    return value;
  };
  const verify = async (input, profile, signal) => {
    signal?.throwIfAborted();
    const source = scheduleChunk ? snapshotPerformanceRecordSource(input) : input;
    const identity = scheduleChunk
      ? await admittedInspection(() => canonicalJSON(source), signal)
      : canonicalJSON(source);
    let row = cache.get(identity)?.row;
    if (!row) {
      row = await verifyPerformanceRecord(source, {
        profile,
        acceptBinding,
        signal,
        scheduleChunk,
      });
      const bytes = new TextEncoder().encode(identity).byteLength;
      const previous = cache.get(identity);
      cachedBytes += bytes - (previous?.bytes ?? 0);
      cache.set(identity, { row, bytes });
      while (cache.size > 96 || cachedBytes > JOURNEY_PERFORMANCE_LIMITS.bytes) {
        const oldest = cache.keys().next().value;
        cachedBytes -= cache.get(oldest).bytes;
        cache.delete(oldest);
      }
    } else {
      required(
        profile?.clears?.solo?.[row.missionId],
        'Performance evidence needs an accepted Journey mission.',
      );
      signal?.throwIfAborted();
    }
    return row;
  };
  // Only locally validated envelopes enter this path. Public inspect still
  // owns and validates every input; observe already performed that boundary.
  const inspectOwned = async (value, profile, signal) => {
    const rows = [];
    for (const record of value.records) rows.push(await verify(record, profile, signal));
    return { value, rows };
  };
  const inspect = async (input, profile, signal) => {
    signal?.throwIfAborted();
    if (input === undefined) return inspectOwned(emptyJourneyPerformance(), profile, signal);
    if (!scheduleChunk) return inspectOwned(inspectJourneyPerformance(input), profile, signal);
    // Keep a bounded private snapshot before waiting. The ordinary inspector
    // still validates/copies it inside admission; no public object gains trust.
    const source = snapshotJourneyPerformanceSource(input);
    const value = await admittedInspection(() => inspectJourneyPerformance(source), signal);
    return inspectOwned(value, profile, signal);
  };
  const inspectState = async (state, signal) => {
    const owned = scheduleChunk && consumeOwnedState?.(state);
    if (!owned) return inspect(state.performance, state.profile, signal);
    // This capability consumes only a private receipt minted by the profile's
    // exclusively owned backend. It grants no validation or replay authority.
    const value = await admittedInspection(
      () =>
        state.performance === undefined
          ? emptyJourneyPerformance()
          : inspectJourneyPerformance(owned.performance),
      signal,
    );
    const checked = await inspectOwned(value, state.profile, signal);
    return { ...checked, owned };
  };
  const adopt = (value, rows, identity) => {
    if (disposed || value.generation < observedGeneration) return;
    stored = value;
    retainedEnvelope = value;
    storedRows = rows;
    observedGeneration = value.generation;
    observedIdentity = identity ?? canonicalJSON(value);
    lastError = null;
    emit();
  };
  const observeImmediately = (state) => {
    if (disposed) return;
    let identity, value;
    try {
      // IndexedDB can contain non-JSON or cyclic data. Validate before hashing
      // so optional evidence can never interrupt an ordinary clear transaction.
      value =
        state.performance === undefined
          ? emptyJourneyPerformance()
          : inspectJourneyPerformance(state.performance);
      identity = canonicalJSON(value);
      if (identity === observedIdentity) return;
      observedIdentity = identity;
      if (
        state.performance !== undefined &&
        (!retainedEnvelope || value.generation >= retainedEnvelope.generation)
      )
        retainedEnvelope = value;
    } catch (error) {
      observedIdentity = null;
      sessionRows = selectPerformanceRecords([...storedRows, ...sessionRows]);
      storedRows = [];
      lastError = error;
      emit();
      return;
    }
    if (!allowed) return;
    const job = lifetime();
    void inspectOwned(value, state.profile, job.signal)
      .then(({ value, rows }) => {
        if (observedIdentity === identity) adopt(value, rows);
      })
      .catch((error) => {
        if (!job.signal.aborted && observedIdentity === identity) {
          sessionRows = selectPerformanceRecords([...storedRows, ...sessionRows]);
          storedRows = [];
          lastError = error;
          emit();
        }
      })
      .finally(job.done);
  };
  const observe = (state) => {
    if (!scheduleChunk) return observeImmediately(state);
    if (disposed) return;
    // Only the latest pending observation owns queued optional work. Ordinary
    // progress read/write completion never waits for this optional projection.
    observation?.abort();
    const job = lifetime();
    observation = job;
    let source, readOwned, hasPerformance, profile;
    try {
      const input = state.performance;
      hasPerformance = input !== undefined;
      profile = state.profile;
      // IndexedDB results are objects, not immutable text. Own bounded plain
      // bytes before yielding; full record inspection and hashing wait below.
      const owned = consumeOwnedState?.(state);
      if (owned?.unread) readOwned = owned.read;
      source = !hasPerformance
        ? emptyJourneyPerformance()
        : owned
          ? owned.performance
          : snapshotJourneyPerformanceSource(input);
    } catch (error) {
      observedIdentity = null;
      sessionRows = selectPerformanceRecords([...storedRows, ...sessionRows]);
      storedRows = [];
      lastError = error;
      emit();
      job.done();
      if (observation === job) observation = null;
      return;
    }
    const obtain = async () => {
      if (readOwned) {
        const latest = await readOwned({ signal: job.signal });
        job.signal.throwIfAborted();
        const receipt = consumeOwnedState?.(latest);
        required(
          receipt && !receipt.unread,
          'Optional observation needs a completed private read.',
        );
        profile = latest.profile;
        hasPerformance = receipt.performance !== undefined;
        source = hasPerformance ? receipt.performance : emptyJourneyPerformance();
      }
    };
    void obtain()
      .then(() =>
        admittedInspection(() => {
          const value = inspectJourneyPerformance(source),
            identity = canonicalJSON(value);
          if (identity === observedIdentity) return null;
          if (
            hasPerformance &&
            (!retainedEnvelope || value.generation >= retainedEnvelope.generation)
          )
            retainedEnvelope = value;
          if (!allowed) {
            observedIdentity = identity;
            return null;
          }
          return { value, identity };
        }, job.signal),
      )
      .then(async (pending) => {
        if (!pending) return;
        const checked = await inspectOwned(pending.value, profile, job.signal);
        await admittedInspection(() => {
          if (observation === job) adopt(checked.value, checked.rows, pending.identity);
        }, job.signal);
      })
      .catch((error) => {
        if (!job.signal.aborted && observation === job) {
          observedIdentity = null;
          sessionRows = selectPerformanceRecords([...storedRows, ...sessionRows]);
          storedRows = [];
          lastError = error;
          emit();
        }
      })
      .finally(() => {
        job.done();
        if (observation === job) observation = null;
      });
  };
  const adoptOptional = (value, rows, signal) =>
    scheduleChunk ? admittedInspection(() => adopt(value, rows), signal) : adopt(value, rows);
  const allRows = () => selectPerformanceRecords([...storedRows, ...sessionRows]);
  const backup = (
    envelope = retainedEnvelope,
    generation = stored?.generation ?? retainedEnvelope?.generation ?? 0,
  ) => {
    // Unsupported/read-only hosts preserve the existing optional field. Only
    // verified rows enter the recap; exporting original bytes grants nothing.
    const records = new Map(
      (envelope?.records ?? []).map((row) => [performanceRecordKey(row), row]),
    );
    for (const row of allRows()) {
      const key = performanceRecordKey(row),
        old = records.get(key);
      required(
        !old || canonicalJSON(old) === canonicalJSON(row),
        'Performance run identity changed.',
      );
      records.delete(key);
      records.set(key, row);
    }
    const retained = [...records.values()];
    while (retained.length) {
      try {
        return inspectJourneyPerformance({
          ...emptyJourneyPerformance(),
          generation,
          records: retained,
        });
      } catch {
        retained.shift();
      }
    }
    return undefined;
  };
  const writeImmediately = async (rows, state, signal) => {
    required(canWrite(), 'The Journey saving lease is no longer held.');
    const before =
      state.performance === undefined ? undefined : inspectJourneyPerformance(state.performance);
    const value = inspectJourneyPerformance({
      ...emptyJourneyPerformance(),
      generation: (before?.generation ?? 0) + 1,
      records: rows,
    });
    signal?.throwIfAborted();
    const saved = await backend.commitState(
      [
        {
          type: 'performance',
          previous: canonicalJSON(state.performance ?? null),
          performance: value,
        },
      ],
      { signal },
    );
    signal?.throwIfAborted();
    // Return the backend's accepted exact field, never publish a superseded write.
    required(
      canonicalJSON(saved.performance) === canonicalJSON(value),
      'Journey performance changed while saving.',
    );
    adopt(value, rows);
  };
  const write = async (rows, state, signal, owned) => {
    if (!scheduleChunk) return writeImmediately(rows, state, signal);
    required(canWrite(), 'The Journey saving lease is no longer held.');
    // Keep external backend values private before the optional admission wait.
    const source = owned
      ? owned.performance
      : state.performance === undefined
        ? undefined
        : snapshotJourneyPerformanceSource(state.performance);
    const prepare = () => {
      required(canWrite(), 'The Journey saving lease is no longer held.');
      const before = source === undefined ? undefined : inspectJourneyPerformance(source);
      const value = inspectJourneyPerformance({
        ...emptyJourneyPerformance(),
        generation: (before?.generation ?? 0) + 1,
        records: rows,
      });
      return { value, previous: canonicalJSON(source ?? null), identity: canonicalJSON(value) };
    };
    const prepared = scheduleChunk ? await admittedInspection(prepare, signal) : prepare();
    signal?.throwIfAborted();
    const saved = await backend.commitState(
      [{ type: 'performance', previous: prepared.previous, performance: prepared.value }],
      { signal },
    );
    signal?.throwIfAborted();
    const savedOwned = consumeOwnedState?.(saved);
    const accepted = savedOwned
      ? savedOwned.performance
      : snapshotJourneyPerformanceSource(saved.performance);
    const publish = () => {
      // Compare the exact admitted identity after I/O; a backend result is not
      // trusted because a previous callback validated the proposed write.
      required(
        canonicalJSON(accepted) === prepared.identity,
        'Journey performance changed while saving.',
      );
      adopt(accepted, rows, prepared.identity);
    };
    if (scheduleChunk) await admittedInspection(publish, signal);
    else publish();
  };
  const capture = async (input, { signal } = {}) => {
    required(allowed && !disposed, 'Solo Journey performance is unavailable.');
    required(sameClear(getProfile(), input), 'Performance capture needs its exact accepted clear.');
    const job = lifetime(signal);
    let row,
      comparison,
      captured = false;
    try {
      row = await verify(input, getProfile(), job.signal);
      required(
        sameClear(getProfile(), row),
        'The accepted Journey attempt changed during verification.',
      );
      // Hydrate durable bests before comparing, including a newer tab's record.
      let state,
        checkedState,
        existing = [];
      try {
        await flushProfile();
        state = await backend.readState({ signal: job.signal });
        const checked = await inspectState(state, job.signal);
        checkedState = checked;
        existing = checked.rows;
        if (scheduleChunk) await adoptOptional(checked.value, checked.rows, job.signal);
        else adopt(checked.value, checked.rows);
      } catch (error) {
        job.signal.throwIfAborted();
        // A readable envelope can still contain a false replay. It is recovery
        // data, never an empty durable history that a new win may overwrite.
        state = undefined;
        sessionRows = selectPerformanceRecords([...storedRows, ...sessionRows]);
        storedRows = [];
        lastError = error;
      }
      comparison = performanceComparison(row, [...existing, ...sessionRows]);
      sessionRows = selectPerformanceRecords([...sessionRows, row]);
      captured = true;
      emit();
      if (!state || !sameClear(state.profile, row) || !canWrite())
        return { comparison, durable: false };
      const retained = selectPerformanceRecords([...existing, row]);
      await write(retained, state, job.signal, checkedState?.owned);
      sessionRows = sessionRows.filter(
        (item) => performanceRecordKey(item) !== performanceRecordKey(row),
      );
      emit();
      return { comparison, durable: true };
    } catch (error) {
      if (job.signal.aborted) throw error;
      lastError = error;
      emit();
      if (captured)
        return {
          comparison,
          durable: false,
          error: error.message,
          ...(error.name === 'JourneyPerformanceSaveUnconfirmed' ? { saveUnconfirmed: true } : {}),
        };
      throw error;
    } finally {
      job.done();
    }
  };
  return {
    observe,
    capture,
    async inspect(input, profile, { signal } = {}) {
      required(allowed && !disposed, 'This Journey host cannot verify Solo performance evidence.');
      const job = lifetime(signal);
      try {
        return await inspect(input, profile, job.signal);
      } finally {
        job.done();
      }
    },
    async restore(input, { signal } = {}) {
      const job = lifetime(signal);
      try {
        const incoming = await inspect(input, getProfile(), job.signal);
        sessionRows = selectPerformanceRecords([...sessionRows, ...incoming.rows]);
        emit();
        if (!(await flushProfile()) || !canWrite()) return false;
        const state = await backend.readState({ signal: job.signal }),
          current = await inspectState(state, job.signal);
        // Only explicitly imported verified rows may join durable history here;
        // unrelated session-only rows never leak into a later write.
        for (const row of incoming.rows)
          required(
            state.profile.clears.solo[row.missionId],
            'Imported performance needs its persisted Journey mission.',
          );
        const retained = selectPerformanceRecords([...current.rows, ...incoming.rows]);
        await write(retained, state, job.signal, current.owned);
        const imported = new Set(incoming.rows.map(performanceRecordKey));
        sessionRows = sessionRows.filter((row) => !imported.has(performanceRecordKey(row)));
        emit();
        return true;
      } catch (error) {
        if (!job.signal.aborted) {
          lastError = error;
          emit();
        }
        throw error;
      } finally {
        job.done();
      }
    },
    snapshot: () => projection,
    backup: () => backup(),
    async backupAsync({ signal } = {}) {
      const job = lifetime(signal);
      try {
        job.signal.throwIfAborted();
        const unavailable = (error) => {
          job.signal.throwIfAborted();
          if (error?.name === 'AbortError') throw error;
          throw new JourneyBackupEvidenceUnavailable(error);
        };
        let source;
        try {
          const state = await backend.readState({ signal: job.signal });
          job.signal.throwIfAborted();
          const owned = consumeOwnedState?.(state);
          required(!owned?.unread, 'Backup needs a completed optional read.');
          source = owned
            ? owned.performance
            : state.performance === undefined
              ? undefined
              : snapshotJourneyPerformanceSource(state.performance);
        } catch (error) {
          unavailable(error);
        }
        const prepare = () => {
          job.signal.throwIfAborted();
          let value;
          try {
            value =
              source === undefined ? emptyJourneyPerformance() : inspectJourneyPerformance(source);
          } catch (error) {
            unavailable(error);
          }
          // Export only: no replay authority, projection adoption or persistence.
          // A stale read cannot replace a newer retained envelope or pending row.
          const envelope =
            !retainedEnvelope || value.generation >= retainedEnvelope.generation
              ? value
              : retainedEnvelope;
          return backup(
            envelope,
            Math.max(value.generation, retainedEnvelope?.generation ?? 0, stored?.generation ?? 0),
          );
        };
        return scheduleChunk ? await admittedInspection(prepare, job.signal) : prepare();
      } finally {
        job.done();
      }
    },
    subscribe(callback) {
      listeners.add(callback);
      return () => listeners.delete(callback);
    },
    dispose() {
      disposed = true;
      for (const job of jobs) job.abort();
      jobs.clear();
      cache.clear();
      cachedBytes = 0;
      listeners.clear();
      sessionRows = [];
      storedRows = [];
    },
  };
}
