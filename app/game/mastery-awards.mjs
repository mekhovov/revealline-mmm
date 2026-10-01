import { verifyMasteryRun, verifiedMasteryRecord } from './mastery-verification.mjs';

/** Host-owned eligibility and profile lifetime. Verification never blocks the
 * next mission. A committed import/Undo or page exit invalidates pending jobs;
 * an accepted replacement can hold commits until storage settles.
 * commit is a synchronous local metadata/storage operation.
 */
export function createMasteryAwards({ getGeneration, commit, onStatus = () => {} }) {
  const jobs = new Map(),
    holds = new Set(),
    waiters = new Set();
  const wake = () => {
    for (const resolve of waiters) resolve();
    waiters.clear();
  };
  let epoch = 0;
  const publish = (runId, status, message = '') => {
    const value = { runId, status, message };
    onStatus(value);
    return value;
  };
  async function submit(attempt, { eligible = false } = {}) {
    if (eligible !== true) return { runId: attempt?.runId, status: 'ineligible', message: '' };
    const runId = attempt.runId;
    if (jobs.has(runId)) return { runId, status: 'pending', message: '' };
    if (jobs.size >= 4)
      return publish(
        runId,
        'unavailable',
        'Goal checks are busy. Export this replay to keep the attempt.',
      );
    const controller = new AbortController(),
      generation = getGeneration(),
      ticket = epoch;
    jobs.set(runId, controller);
    const current = () =>
      !controller.signal.aborted && ticket === epoch && generation === getGeneration();
    try {
      publish(runId, 'checking', 'Checking your equipment goal…');
      const verified = await verifyMasteryRun(attempt, { signal: controller.signal });
      if (!current()) return { runId, status: 'cancelled', message: '' };
      const record = verifiedMasteryRecord(verified);
      if (!record)
        return publish(
          runId,
          'unqualified',
          'Picture collected. The optional seal is waiting for another route.',
        );
      // Backup replacement holds only the commit boundary; verification can
      // finish while storage decides whether the original profile survives.
      if (holds.size)
        publish(runId, 'checking', 'Goal checked. Waiting for game-data replacement…');
      while (holds.size && current()) await new Promise((resolve) => waiters.add(resolve));
      if (!current()) return { runId, status: 'cancelled', message: '' };
      const saved = commit(record);
      if (typeof saved !== 'boolean')
        throw new TypeError('Seal persistence must return a synchronous boolean result.');
      return publish(
        runId,
        saved ? 'earned' : 'session',
        saved
          ? `${verified.definitionName} seal earned and saved.`
          : `${verified.definitionName} seal earned for this session. Export your library to keep it.`,
      );
    } catch (error) {
      if (!current() || error.name === 'AbortError')
        return { runId, status: 'cancelled', message: '' };
      return publish(
        runId,
        'unavailable',
        `The optional seal could not be checked: ${error.message}`,
      );
    } finally {
      if (jobs.get(runId) === controller) jobs.delete(runId);
    }
  }
  return Object.freeze({
    submit,
    holdCommits() {
      const token = {};
      holds.add(token);
      return () => {
        holds.delete(token);
        if (!holds.size) wake();
      };
    },
    cancelAll() {
      epoch++;
      for (const [runId, controller] of jobs) {
        controller.abort();
        publish(runId, 'cancelled', 'Goal check cancelled. Retry this mission to earn the seal.');
      }
      jobs.clear();
      wake();
    },
  });
}
