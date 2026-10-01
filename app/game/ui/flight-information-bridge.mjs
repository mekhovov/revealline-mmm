import { t } from '../i18n/index.mjs';
import { flightInformationBatch, flightInformationSnapshot } from './flight-information-source.mjs';

const terminal = (run) => ['won', 'lost'].includes(run?.status);
const messageValid = (value) =>
  typeof value?.fullText === 'string' &&
  (value.cue === null || typeof value.cue === 'string') &&
  Number.isFinite(value.expiresAt) &&
  value.expiresAt >= 0;

/**
 * Observes an accepted host's warnings and event batches. It never writes a caption,
 * changes a run, plays feedback or decides current threat severity. Tokens are local
 * to this bridge; adopt again after every accepted replacement, including restore.
 */
export function createFlightInformationBridge() {
  let run = null,
    owner = null,
    generation = 0,
    sequence = 0,
    batchSequence = 0;
  let pending = null,
    context = null,
    lastWarning = null,
    lastBatch = null,
    issue = null;
  let disposed = false,
    suspended = false;
  const owns = (candidate) => !disposed && owner !== null && candidate === run;
  const currentBatch = (ticket) =>
    pending !== null && pending.ticket === ticket && owns(pending.run);
  const clear = () => {
    run = owner = pending = lastWarning = lastBatch = issue = null;
    sequence = batchSequence = 0;
    suspended = false;
  };
  const token = () => (owner && !disposed ? Object.freeze({ ...owner, sequence }) : null);
  const isCurrent = (expected, { allowTerminal = false } = {}) =>
    !disposed &&
    !suspended &&
    owner !== null &&
    (allowTerminal || !terminal(run)) &&
    expected?.attempt === owner.attempt &&
    expected.generation === owner.generation &&
    expected.sequence === sequence;

  const allowsWarning = (acceptedRun) => {
    if (!owns(acceptedRun) || suspended) return false;
    const hostScope = context?.hostOwner === owner && context?.run === run;
    return (
      !context ||
      hostScope ||
      Boolean(context.scope && context.scope === pending && owns(context.scope.run))
    );
  };

  return Object.freeze({
    adopt(acceptedRun, attempt) {
      if (disposed) return null;
      if (
        !acceptedRun ||
        typeof acceptedRun !== 'object' ||
        typeof attempt !== 'string' ||
        !attempt
      )
        throw new TypeError(t('interface:anAcceptedRunAndItsAttemptIdentityAreRequired'));
      if (!Number.isSafeInteger(generation + 1))
        throw new RangeError(t('interface:presentationGenerationExhausted'));
      clear();
      run = acceptedRun;
      owner = Object.freeze({ attempt, generation: ++generation });
      return token();
    },
    token,
    isCurrent,
    // Admission is checked before the host touches its caption or cue.
    allowsWarning,
    /** Use this only around a synchronous call to the existing warning writer. */
    commitWarning(expected, message, writeWarning, options) {
      if (!isCurrent(expected, options)) return false;
      if (
        typeof message?.fullText !== 'string' ||
        !(message.cue === null || typeof message.cue === 'string') ||
        typeof writeWarning !== 'function'
      )
        throw new TypeError(t('interface:aCompleteMessageAndSynchronousWarningWriterAreRequired'));
      // Consume before calling the writer: duplicate or reentrant completion cannot reuse this token.
      sequence++;
      const previousContext = context;
      const writerContext = { hostOwner: owner, run };
      context = writerContext;
      try {
        writeWarning(message.fullText, message.cue);
        return true;
      } finally {
        if (context === writerContext) context = previousContext;
      }
    },
    /** Call AFTER the unchanged warning writer has assigned text, cue and expiry. */
    observeWarning(acceptedRun, value, role = 'host.unknown') {
      if (!allowsWarning(acceptedRun)) return false;
      const hostScope = context?.hostOwner === owner && context?.run === run;
      if (!messageValid(value) || typeof role !== 'string' || !role) {
        issue = 'invalid-warning-observation';
        return false;
      }
      sequence++;
      const scoped =
        !hostScope && pending?.index !== null && pending?.index !== undefined && owns(pending.run);
      const eventIndex = scoped ? pending.index : null;
      const type = scoped ? pending.events[eventIndex]?.type : role;
      lastWarning = Object.freeze({
        owner,
        sequence,
        role: typeof type === 'string' ? type : 'host.unknown',
        source: scoped ? 'event' : 'host',
        fullText: value.fullText,
        cue: value.cue,
        expiresAt: value.expiresAt,
      });
      if (scoped)
        pending.messages.push({
          eventIndex,
          fullText: value.fullText,
          cue: value.cue,
          expiresAt: value.expiresAt,
        });
      return true;
    },
    begin(acceptedRun, events) {
      if (!owns(acceptedRun) || suspended) return null;
      // A newer batch supersedes an unfinished older one; no partial batch is published.
      pending = null;
      try {
        if (!Array.isArray(events)) throw new TypeError(t('interface:expectedEventArray'));
        const ticket = Object.freeze({});
        pending = {
          ticket,
          run,
          owner,
          sequence: ++batchSequence,
          events: structuredClone(events),
          messages: [],
          index: null,
          visited: -1,
          failed: false,
        };
        return ticket;
      } catch {
        issue = 'invalid-event-batch';
        return null;
      }
    },
    /** The original event body always runs once, even when observation is stale. */
    observeEvent(ticket, index, work) {
      const scope = currentBatch(ticket) ? pending : null;
      const valid =
        scope &&
        Number.isSafeInteger(index) &&
        index === scope.visited + 1 &&
        index >= 0 &&
        index < scope.events.length &&
        scope.index === null;
      if (valid) {
        scope.index = index;
        scope.visited = index;
      } else if (scope) scope.failed = true;
      const previousContext = context;
      const installedContext = { scope: valid ? scope : null };
      context = installedContext;
      try {
        return work();
      } catch (error) {
        if (scope) scope.failed = true;
        throw error;
      } finally {
        if (context === installedContext) context = previousContext;
        if (scope) scope.index = null;
      }
    },
    finish(ticket) {
      if (!currentBatch(ticket)) return false;
      const completed = pending;
      pending = null;
      if (
        completed.failed ||
        completed.index !== null ||
        completed.visited !== completed.events.length - 1
      ) {
        issue = 'incomplete-event-batch';
        return false;
      }
      try {
        const batch = flightInformationBatch({
          owner: completed.owner,
          sequence: completed.sequence,
          events: completed.events,
          messages: completed.messages,
        });
        lastBatch = batch;
        // Historical completion never rewinds lastWarning or a current snapshot.
        return true;
      } catch {
        issue = 'invalid-event-batch';
        return false;
      }
    },
    cancel(ticket) {
      if (!currentBatch(ticket)) return false;
      pending = null;
      return true;
    },
    read(host) {
      if (!owner || disposed) return null;
      let snapshot = null;
      try {
        snapshot = flightInformationSnapshot(run, host);
      } catch {
        issue = 'snapshot-unavailable';
      }
      return Object.freeze({ owner, sequence, snapshot, lastWarning, lastBatch, issue });
    },
    clear,
    suspend() {
      pending = null;
      suspended = true;
      sequence++;
    },
    resume() {
      if (disposed || !owner) return false;
      suspended = false;
      sequence++;
      return true;
    },
    dispose() {
      clear();
      disposed = true;
    },
  });
}
