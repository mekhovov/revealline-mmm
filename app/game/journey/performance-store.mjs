import { canonicalJSON, required } from '../data-json.mjs';
import {
  emptyJourneyPerformance,
  inspectJourneyPerformance,
  verifyPerformanceRecord,
  performanceRecordKey,
  performanceSummary,
  performanceComparison,
  selectPerformanceRecords,
  JOURNEY_PERFORMANCE_LIMITS,
} from './performance.mjs';

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
    observedGeneration = -1;
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
      done() {
        jobs.delete(controller);
        signal?.removeEventListener('abort', abort);
      },
    };
  };
  const verify = async (input, profile, signal) => {
    const identity = canonicalJSON(input);
    let row = cache.get(identity)?.row;
    if (!row) {
      row = await verifyPerformanceRecord(input, { profile, acceptBinding, signal });
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
  const inspect = async (input, profile, signal) => {
    const value =
      input === undefined ? emptyJourneyPerformance() : inspectJourneyPerformance(input);
    const rows = [];
    for (const record of value.records) rows.push(await verify(record, profile, signal));
    return { value, rows };
  };
  const adopt = (value, rows) => {
    if (disposed || value.generation < observedGeneration) return;
    stored = value;
    retainedEnvelope = value;
    storedRows = rows;
    observedGeneration = value.generation;
    observedIdentity = canonicalJSON(value);
    lastError = null;
    emit();
  };
  const observe = (state) => {
    if (disposed) return;
    let identity;
    try {
      // IndexedDB can contain non-JSON or cyclic data. Validate before hashing
      // so optional evidence can never interrupt an ordinary clear transaction.
      const value =
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
    void inspect(state.performance, state.profile, job.signal)
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
  const allRows = () => selectPerformanceRecords([...storedRows, ...sessionRows]);
  const write = async (rows, state, signal) => {
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
        existing = [];
      try {
        await flushProfile();
        state = await backend.readState();
        const checked = await inspect(state.performance, state.profile, job.signal);
        existing = checked.rows;
        adopt(checked.value, checked.rows);
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
      await write(retained, state, job.signal);
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
        const state = await backend.readState(),
          current = await inspect(state.performance, state.profile, job.signal);
        // Only explicitly imported verified rows may join durable history here;
        // unrelated session-only rows never leak into a later write.
        for (const row of incoming.rows)
          required(
            state.profile.clears.solo[row.missionId],
            'Imported performance needs its persisted Journey mission.',
          );
        const retained = selectPerformanceRecords([...current.rows, ...incoming.rows]);
        await write(retained, state, job.signal);
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
    backup: () => {
      // Unsupported/read-only hosts preserve the existing optional field. Only
      // verified rows enter the recap; exporting original bytes grants nothing.
      const records = new Map(
        (retainedEnvelope?.records ?? []).map((row) => [performanceRecordKey(row), row]),
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
            generation: stored?.generation ?? retainedEnvelope?.generation ?? 0,
            records: retained,
          });
        } catch {
          retained.shift();
        }
      }
      return undefined;
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
