import { CELL, FIXED_DT, createRun, stepRun, releaseInputs, getSummary } from '../core/index.mjs';
import { authoritativeCheckpoint, snapshotReplay } from '../replay.mjs';
import { canonicalJSON, dataIdentity, required } from '../data-json.mjs';
import { validateCompanyLesson, verifyLearningAttempt } from './learning.mjs';

const simulationIdentity = (run) =>
  dataIdentity({ level: run.level, classes: run.classRecipes, ruleset: run.ruleset });
const releaseEvent = (event, tick) =>
  event.tick === tick &&
  ((event.type === 'cut.closed' && Number.isFinite(event.cells) && event.cells > 0) ||
    event.type === 'objective.captured');
function boundaryFor(run) {
  if (run.status === 'won' || run.status === 'lost')
    return Object.freeze({ tick: run.tick, kind: 'result' });
  if (
    run.status === 'running' &&
    !run.player.cutting &&
    run.cells[Math.floor(run.player.y) * run.width + Math.floor(run.player.x)] === CELL.SAFE
  )
    return Object.freeze({ tick: run.tick, kind: 'checkpoint' });
  return null;
}

/** Derive evidence solely from consecutive core states. Nothing is serialized as
 * trusted availability, and observing never changes the arcade simulation. */
export function createLearningEvidenceObserver({ lesson: source, run }) {
  const lesson = validateCompanyLesson(source);
  required(run.tick === 0, 'Learning evidence observation must start at tick zero.');
  required(lesson.missionId === run.levelId, 'The evidence lesson belongs to another mission.');
  const ids = lesson.records.map((record) => record.id);
  const available = [],
    first = {};
  let lastTick = -1,
    seen = new Set(),
    boundary = null;
  function release(tick) {
    if (available.length === ids.length) return;
    const id = ids[available.length];
    available.push(id);
    first[id] = tick;
  }
  function observe(state) {
    required(state === run, 'Learning evidence must follow its original run.');
    required(
      state.tick === lastTick || state.tick === lastTick + 1,
      'Learning evidence must observe every simulation tick in order.',
    );
    if (state.tick !== lastTick) seen = new Set();
    for (const event of state.events) {
      if (!releaseEvent(event, state.tick)) continue;
      const key = `${event.type}/${event.id ?? ''}`;
      if (seen.has(key)) continue;
      seen.add(key);
      release(state.tick);
    }
    if (state.status === 'won') while (available.length < ids.length) release(state.tick);
    lastTick = state.tick;
    boundary = boundaryFor(state);
    return snapshot();
  }
  function snapshot() {
    return Object.freeze({
      availableRecordIds: Object.freeze([...available]),
      firstAvailableTicks: Object.freeze({ ...first }),
      boundary,
    });
  }
  observe(run);
  return Object.freeze({ observe, snapshot });
}

const yieldToHost = () => new Promise((resolve) => setTimeout(resolve, 0));
function checkAbort(signal) {
  if (!signal?.aborted) return;
  const error = new Error('Learning evidence verification cancelled.');
  error.name = 'AbortError';
  throw error;
}

/** Replay both ledgers: every learning action must have happened at a real safe
 * tick, and Inspect can only read a record already released by the game. */
export async function verifyLearningEvidence({
  lesson: source,
  attempt: input,
  replay: sourceReplay,
  signal,
}) {
  checkAbort(signal);
  const lesson = validateCompanyLesson(source);
  const checked = verifyLearningAttempt(lesson, input);
  required(checked.valid, checked.reason ?? 'Invalid learning transcript.');
  const attempt = checked.attempt;
  const replay = snapshotReplay(sourceReplay);
  const state = createRun(replay.level, replay.options);
  required(
    attempt.missionId === state.levelId &&
      attempt.simulationIdentity === simulationIdentity(state) &&
      attempt.seed === state.seed,
    'The learning evidence belongs to a different simulation or seed.',
  );
  required(
    attempt.actions.every(
      (action) =>
        action.anchor && action.anchor.tick <= replay.ticks && action.anchor.kind !== 'practice',
    ),
    'Run-pinned learning requires an in-range core boundary for every action.',
  );
  const observer = createLearningEvidenceObserver({ lesson, run: state });
  let actionIndex = 0;
  function checkActions() {
    const evidence = observer.snapshot();
    while (attempt.actions[actionIndex]?.anchor.tick === state.tick) {
      const action = attempt.actions[actionIndex++];
      const boundary = evidence.boundary;
      required(boundary, 'A learning action occurred outside a safe core boundary.');
      required(
        action.anchor.kind === boundary.kind ||
          (action.anchor.kind === 'capture' &&
            boundary.kind === 'checkpoint' &&
            state.events.some((event) => releaseEvent(event, state.tick))),
        'A learning action has the wrong core boundary kind.',
      );
      required(
        action.type !== 'inspect' || evidence.availableRecordIds.includes(action.recordId),
        'A learning action inspected evidence before the game released it.',
      );
    }
  }
  // Snapshot caller-owned data before yielding; never accept later mutations.
  await yieldToHost();
  checkAbort(signal);
  checkActions();
  let chunkTicks = 0,
    started = performance.now();
  for (const segment of replay.segments) {
    if (segment.releaseBefore) releaseInputs(state);
    for (let tick = 0; tick < segment.ticks; tick++) {
      required(
        state.status !== 'won' && state.status !== 'lost',
        'Replay contains input after its terminal result.',
      );
      stepRun(state, segment.input, FIXED_DT);
      observer.observe(state);
      checkActions();
      chunkTicks++;
      if (chunkTicks >= 600 || (chunkTicks % 8 === 0 && performance.now() - started >= 8)) {
        await yieldToHost();
        checkAbort(signal);
        chunkTicks = 0;
        started = performance.now();
      }
    }
  }
  if (replay.releaseAfter) releaseInputs(state);
  checkAbort(signal);
  required(actionIndex === attempt.actions.length, 'Learning actions extend beyond the replay.');
  required(
    state.tick === replay.ticks &&
      canonicalJSON(authoritativeCheckpoint(state)) === canonicalJSON(replay.checkpoint) &&
      canonicalJSON(getSummary(state)) === canonicalJSON(replay.summary),
    'The learning evidence replay could not be verified.',
  );
  return { attempt, replay, state, evidence: observer.snapshot(), observer };
}
