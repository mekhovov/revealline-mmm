import { createRun, stepRun, releaseInputs, FIXED_DT } from './core/index.mjs';
import {
  verifyReplayAsync,
  authoritativeCheckpoint,
  MAX_REPLAY_BYTES,
  MAX_REPLAY_TICKS,
} from './replay.mjs';
import { boundedJSON } from './data-json.mjs';

export const PLAYBACK_RATES = Object.freeze([0.5, 1, 2]);
export const MAX_PLAYBACK_FRAME_SECONDS = 0.25;
const abort = (signal) => {
  if (signal?.aborted) {
    const error = new Error('Replay loading cancelled.');
    error.name = 'AbortError';
    throw error;
  }
};

/**
 * Verify before returning any player. Own the input before the verifier's first
 * yield, so caller edits cannot replace the recording between verification and use.
 */
export async function prepareReplayPlayer(source, { signal, onProgress, chunkTicks = 600 } = {}) {
  return preparePlayer(source, { signal, onProgress, chunkTicks });
}

/** Bundled reviewed routes pin their complete input trace, level and result, but
 * native trigonometry can give roaming enemies a different final sub-pixel
 * checkpoint on another browser engine. Qualify that one presentation-only
 * difference on the current runtime while retaining every ordinary replay
 * verifier guarantee. This is deliberately unavailable to imported or saved
 * recordings; the demo catalogue is the only caller. */
export async function prepareReviewedReplayPlayer(
  source,
  { signal, onProgress, chunkTicks = 600 } = {},
) {
  return preparePlayer(source, {
    signal,
    onProgress,
    chunkTicks,
    allowReviewedEnemyCheckpoint: true,
  });
}

async function preparePlayer(
  source,
  { signal, onProgress, chunkTicks, allowReviewedEnemyCheckpoint = false },
) {
  abort(signal);
  const recording = boundedJSON(source, {
    maxBytes: MAX_REPLAY_BYTES,
    maxNodes: 3_000_000,
    maxDepth: 24,
    maxArray: MAX_REPLAY_TICKS,
    maxString: 262_144,
  });
  const verified = await verifyReplayAsync(recording, { signal, onProgress, chunkTicks });
  abort(signal);
  if (!verified.match) {
    const compatibleEnemyCheckpoint =
      allowReviewedEnemyCheckpoint &&
      recording.summary.status === verified.actual.summary.status &&
      verified.diagnostics.length === 1 &&
      verified.diagnostics[0].code === 'state-mismatch' &&
      verified.diagnostics[0].section === 'enemies';
    if (compatibleEnemyCheckpoint) {
      recording.checkpoint = structuredClone(verified.actual.checkpoint);
      return playerFor(recording);
    }
    const error = new Error(
      'Replay verification failed. Its inputs do not reproduce the recorded final state.',
    );
    error.name = 'ReplayVerificationError';
    error.diagnostics = verified.diagnostics;
    throw error;
  }
  return playerFor(recording);
}

function playerFor(recording) {
  let state, phase, segmentIndex, segmentTick, accumulator, finalCheckpoint, failure;
  let generation = 0;
  let disposed = false;
  const assertActive = () => {
    if (disposed) throw new Error('Replay player is disposed.');
  };
  let rate = 1;
  const info = Object.freeze({
    build: recording.build,
    levelId: recording.level.id,
    levelName:
      typeof recording.level.name === 'string'
        ? recording.level.name.slice(0, 160)
        : recording.level.id,
    turnPolicy: recording.options.turnPolicy,
    classId: recording.options.classId,
    seed: recording.options.seed,
    totalTicks: recording.ticks,
    durationSeconds: recording.ticks * FIXED_DT,
    recordedStatus: recording.summary.status,
  });
  function finish() {
    if (phase === 'complete') return;
    if (recording.releaseAfter) releaseInputs(state);
    const actual = authoritativeCheckpoint(state);
    const expected = recording.checkpoint;
    const match =
      state.tick === recording.ticks &&
      actual.algorithm === expected.algorithm &&
      actual.hash === expected.hash &&
      Object.entries(expected.sections).every(([key, value]) => actual.sections[key] === value);
    if (!match) {
      phase = 'error';
      failure = 'Playback stopped: the final state does not match the verified recording.';
      throw new Error(failure);
    }
    finalCheckpoint = Object.freeze({
      matched: true,
      hash: actual.hash,
      algorithm: actual.algorithm,
    });
    phase = 'complete';
    accumulator = 0;
  }
  function reset() {
    assertActive();
    generation++;
    state = createRun(recording.level, recording.options);
    phase = 'paused';
    segmentIndex = 0;
    segmentTick = 0;
    accumulator = 0;
    finalCheckpoint = null;
    failure = null;
    if (recording.ticks === 0) finish();
    return report();
  }
  function report(events = [], ticks = 0, reason = null) {
    return {
      phase,
      tick: state.tick,
      totalTicks: recording.ticks,
      rate,
      ticks,
      events,
      reason,
      finalCheckpoint,
    };
  }
  function tick() {
    if (phase === 'complete' || phase === 'error') return [];
    const segment = recording.segments[segmentIndex];
    if (!segment) {
      finish();
      return [];
    }
    if (segmentTick === 0 && segment.releaseBefore) releaseInputs(state);
    if (state.status === 'won' || state.status === 'lost') {
      phase = 'error';
      failure = 'Playback reached a terminal state before the recording ended.';
      throw new Error(failure);
    }
    stepRun(state, segment.input, FIXED_DT);
    const events = state.events.map((event) => structuredClone(event));
    segmentTick++;
    if (segmentTick === segment.ticks) {
      segmentIndex++;
      segmentTick = 0;
    }
    if (state.tick === recording.ticks) finish();
    return events;
  }
  function pause() {
    if (disposed) return report();
    if (phase === 'playing') phase = 'paused';
    accumulator = 0;
    // Transport pause is not a recorded release: preserve the exact action latch,
    // speed and queued direction until the next recording command says otherwise.
    return report();
  }
  function play() {
    if (disposed) return report();
    if (phase === 'paused') phase = 'playing';
    return report();
  }
  function setRate(value) {
    assertActive();
    if (!PLAYBACK_RATES.includes(value)) throw new TypeError('Playback rate must be 0.5, 1 or 2.');
    rate = value;
    return report();
  }
  function step(count = 1) {
    assertActive();
    if (!Number.isInteger(count) || count < 1 || count > 240)
      throw new TypeError('Step must contain 1..240 ticks.');
    pause();
    const start = state.tick,
      events = [];
    for (let index = 0; index < count && phase === 'paused'; index++) events.push(...tick());
    return report(events, state.tick - start);
  }
  function advance(seconds) {
    if (!Number.isFinite(seconds) || seconds < 0)
      throw new TypeError('Frame time must be a finite nonnegative number.');
    if (phase !== 'playing') return report();
    if (seconds > MAX_PLAYBACK_FRAME_SECONDS) {
      pause();
      return report([], 0, 'frame-gap');
    }
    accumulator += seconds * rate;
    const start = state.tick,
      events = [];
    // At most 61 ticks including a prior fractional remainder: no backlog chase.
    while (accumulator + 1e-9 >= FIXED_DT && phase === 'playing') {
      accumulator = Math.max(0, accumulator - FIXED_DT);
      events.push(...tick());
    }
    return report(events, state.tick - start);
  }
  /** Reconstruct an owned practice run; never hand the renderer's mutable state
   * to a second owner. The host releases only the returned run's inputs. */
  async function forkForPractice({ signal, onProgress } = {}) {
    abort(signal);
    assertActive();
    if (phase === 'playing' || phase === 'error')
      throw new Error('Pause a valid recording before taking over.');
    if (!['running', 'respawning'].includes(state.status))
      throw new Error('This recording has ended. Start the level again instead.');
    const target = state.tick,
      ticket = generation,
      expected = authoritativeCheckpoint(state),
      fork = createRun(recording.level, recording.options);
    const current = () => {
      abort(signal);
      if (disposed || ticket !== generation || state.tick !== target || phase === 'playing') {
        const error = new Error('The recording changed while preparing practice.');
        error.name = 'AbortError';
        throw error;
      }
    };
    let consumed = 0,
      chunk = 0,
      chunkStart = performance.now();
    await new Promise((resolve) => setTimeout(resolve, 0));
    current();
    for (const segment of recording.segments) {
      const count = Math.min(segment.ticks, target - consumed);
      if (!count) break;
      if (segment.releaseBefore) releaseInputs(fork);
      for (let index = 0; index < count; index++) {
        stepRun(fork, segment.input, FIXED_DT);
        consumed++;
        chunk++;
        if (chunk >= 600 || (chunk % 8 === 0 && performance.now() - chunkStart >= 8)) {
          onProgress?.({
            ticks: consumed,
            total: target,
            fraction: target ? consumed / target : 1,
          });
          await new Promise((resolve) => setTimeout(resolve, 0));
          current();
          chunk = 0;
          chunkStart = performance.now();
        }
      }
    }
    if (target === recording.ticks && recording.releaseAfter) releaseInputs(fork);
    onProgress?.({ ticks: target, total: target, fraction: 1 });
    current();
    if (
      authoritativeCheckpoint(fork).hash !== expected.hash ||
      authoritativeCheckpoint(state).hash !== expected.hash
    )
      throw new Error('Practice could not reproduce the displayed recording.');
    return {
      run: fork,
      origin: Object.freeze({
        source: 'replay',
        levelId: info.levelId,
        tick: target,
        ruleset: fork.ruleset,
      }),
    };
  }
  reset();
  return Object.freeze({
    info,
    // Read model for BoardPainter. Consumers must not mutate it; terminal
    // checkpoint comparison detects any future-affecting accidental mutation.
    get state() {
      return state;
    },
    get phase() {
      return phase;
    },
    get rate() {
      return rate;
    },
    get finalCheckpoint() {
      return finalCheckpoint;
    },
    get error() {
      return failure;
    },
    play,
    pause,
    reset,
    setRate,
    step,
    advance,
    forkForPractice,
    exportRecording: () => {
      assertActive();
      return structuredClone(recording);
    },
    dispose() {
      if (disposed) return;
      disposed = true;
      generation++;
      accumulator = 0;
      phase = 'disposed';
    },
  });
}
