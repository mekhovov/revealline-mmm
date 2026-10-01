import { createRun, stepRun, FIXED_DT } from './core/index.mjs';
import {
  authoritativeCheckpoint,
  createRecorder,
  recordInput,
  exportReplay,
  verifyReplayAsync,
} from './replay.mjs';
import { supportsDemoBot, BOT_LIMITS } from './demo-bot.mjs';

const MAX_FRAME_SECONDS = 0.25,
  MAX_SCENE_TICKS = 60 * 120;
const abortError = () => Object.assign(new Error('Autoplay cancelled.'), { name: 'AbortError' });
function checkAbort(signal) {
  if (signal?.aborted) throw abortError();
}

function workerTransport(WorkerClass, watchdogMs) {
  if (typeof WorkerClass !== 'function') throw new Error('Live autoplay requires a Web Worker.');
  const worker = new WorkerClass(new URL('./demo-bot-worker.mjs', import.meta.url), {
    type: 'module',
  });
  let serial = 0,
    stopped = false;
  const waiting = new Map();
  function finish(id, error, result) {
    const ticket = waiting.get(id);
    if (!ticket) return;
    waiting.delete(id);
    clearTimeout(ticket.timer);
    if (error) ticket.reject(error);
    else ticket.resolve(result);
  }
  const message = ({ data }) => {
    if (stopped || !data) return;
    finish(data.id, data.error ? new Error(data.error) : null, data.result);
  };
  const error = (event) => {
    for (const id of waiting.keys())
      finish(id, new Error(event.message || 'Autoplay worker failed.'));
  };
  worker.addEventListener('message', message);
  worker.addEventListener('error', error);
  return {
    request(state, plannerSeed, decision) {
      if (stopped) return Promise.reject(abortError());
      const id = ++serial;
      return new Promise((resolve, reject) => {
        const timer = setTimeout(() => {
          finish(id, new Error('Autoplay planning deadline reached.'));
          // A stuck search must not retain a CPU owner after the watchdog fires.
          worker.terminate();
          stopped = true;
        }, watchdogMs);
        waiting.set(id, { resolve, reject, timer });
        try {
          worker.postMessage({ type: 'plan', id, state, plannerSeed, decision });
        } catch (failure) {
          finish(id, failure);
        }
      });
    },
    dispose() {
      stopped = true;
      worker.removeEventListener('message', message);
      worker.removeEventListener('error', error);
      for (const id of waiting.keys()) finish(id, abortError());
      worker.terminate();
    },
  };
}
function validateMacro(result, state) {
  if (!result?.ok)
    throw Object.assign(new Error(`Autoplay unavailable: ${result?.reason || 'invalid-plan'}.`), {
      code: result?.reason === 'no-safe-macro' ? 'no-safe-macro' : 'autoplay-fault',
    });
  if (result.startTick !== state.tick || result.startHash !== authoritativeCheckpoint(state).hash)
    throw new Error('Autoplay plan belongs to another state.');
  if (
    !Array.isArray(result.segments) ||
    !result.segments.length ||
    result.segments.length > BOT_LIMITS.candidateTicks
  )
    throw new Error('Autoplay plan has invalid input segments.');
  let ticks = 0;
  for (const segment of result.segments) {
    if (
      !Number.isInteger(segment.ticks) ||
      segment.ticks < 1 ||
      !segment.input ||
      Object.keys(segment.input).length !== 1 ||
      !Object.hasOwn(segment.input, 'direction') ||
      ![null, 'up', 'right', 'down', 'left'].includes(segment.input.direction)
    )
      throw new Error('Autoplay plan has invalid controls.');
    ticks += segment.ticks;
  }
  if (
    ticks > BOT_LIMITS.candidateTicks ||
    result.endTick !== state.tick + ticks ||
    result.predictedState?.tick !== result.endTick ||
    authoritativeCheckpoint(result.predictedState).hash !== result.endHash ||
    result.predictedState.classic.livesLost !== state.classic.livesLost ||
    !['running', 'won'].includes(result.predictedState.status) ||
    result.predictedState.player.cutting
  )
    throw new Error('Autoplay plan has invalid completion state.');
  return result;
}

/** Owns an ephemeral normal simulation and recorder; it never opens player storage. */
export async function prepareBotPlayer(
  level,
  options = {},
  {
    signal,
    WorkerClass = globalThis.Worker,
    plannerSeed = options.seed ?? 1,
    watchdogMs = 1000,
  } = {},
) {
  checkAbort(signal);
  if (!supportsDemoBot(level, options))
    throw new Error('This level is not qualified for live autoplay.');
  if (!Array.isArray(options.classRecipes))
    throw new Error('Live autoplay needs the qualified campaign class recipes.');
  if (!Number.isInteger(plannerSeed) || plannerSeed < 0 || plannerSeed > 0xffffffff)
    throw new TypeError('Autoplay planner seed must be a uint32.');
  if (plannerSeed !== (options.seed ?? 1))
    throw new Error('Live autoplay needs the qualified matching planner seed.');
  if (!Number.isFinite(watchdogMs) || watchdogMs < 1 || watchdogMs > 10000)
    throw new TypeError('Autoplay watchdog must be 1..10000 milliseconds.');
  const sourceLevel = structuredClone(level),
    sourceOptions = structuredClone(options);
  let state,
    recorder,
    phase = 'paused',
    failure = null,
    failureCode = null,
    completionReason = null,
    accumulator = 0,
    generation = 0,
    transport,
    current,
    next,
    nextFailure,
    segmentIndex = 0,
    segmentTick = 0,
    decision = 0,
    disposed = false,
    ready = false,
    finalCheckpoint = null,
    pending = null;
  const info = Object.freeze({
    source: 'autoplay',
    levelId: level.id,
    levelName: level.name ?? level.id,
    turnPolicy: options.turnPolicy ?? 'immediate',
    classId: options.classId ?? 'scout',
    seed: options.seed ?? 1,
    plannerSeed,
    totalTicks: MAX_SCENE_TICKS,
    durationSeconds: 60,
  });
  function report(events = [], ticks = 0, reason = null) {
    return {
      phase,
      tick: state.tick,
      totalTicks: MAX_SCENE_TICKS,
      ticks,
      events,
      reason: reason ?? completionReason,
      errorCode: failureCode,
      rate: 1,
      finalCheckpoint,
    };
  }
  function fail(error) {
    failure = error instanceof Error ? error.message : String(error);
    failureCode = 'autoplay-fault';
    phase = 'error';
    accumulator = 0;
    transport?.dispose();
  }
  function prefetch() {
    if (disposed || current.predictedState.status === 'won' || current.endTick >= MAX_SCENE_TICKS)
      return;
    const version = generation,
      expected = current.predictedState;
    pending = transport
      .request(expected, plannerSeed, ++decision)
      .then((result) => {
        if (disposed || generation !== version) return;
        next = validateMacro(result, expected);
      })
      .catch((error) => {
        if (!disposed && generation === version) nextFailure = error;
      });
  }
  async function reset() {
    checkAbort(signal);
    if (disposed) throw abortError();
    const version = ++generation;
    transport?.dispose();
    phase = 'paused';
    ready = false;
    failure = null;
    failureCode = null;
    completionReason = null;
    accumulator = 0;
    current = null;
    next = null;
    nextFailure = null;
    finalCheckpoint = null;
    segmentIndex = 0;
    segmentTick = 0;
    decision = 0;
    state = createRun(sourceLevel, sourceOptions);
    recorder = createRecorder(sourceLevel, sourceOptions, 'revealline-live-demo.v1');
    transport = workerTransport(WorkerClass, watchdogMs);
    try {
      const result = await transport.request(state, plannerSeed, decision);
      checkAbort(signal);
      if (disposed || generation !== version) throw abortError();
      current = validateMacro(result, state);
      ready = true;
      prefetch();
      return report();
    } catch (error) {
      if (!disposed && generation === version) fail(error);
      throw error;
    }
  }
  function complete(matched = true, reason = null) {
    finalCheckpoint = { matched, ...authoritativeCheckpoint(state) };
    completionReason = reason;
    phase = 'complete';
    accumulator = 0;
    transport?.dispose();
  }
  function tick() {
    if (!ready || !current) {
      fail('Autoplay has no safe prepared move.');
      return [];
    }
    const input = current.segments[segmentIndex]?.input;
    if (!input) {
      fail('Autoplay exhausted its safe controls.');
      return [];
    }
    if (state.status !== 'running') {
      fail('Autoplay reached an unexpected terminal state.');
      return [];
    }
    const beforeLost = state.classic.livesLost;
    stepRun(state, input, FIXED_DT);
    recordInput(recorder, input);
    const events = structuredClone(state.events);
    if (state.classic.livesLost !== beforeLost || state.status === 'lost') {
      fail('Autoplay diverged from its safe prediction.');
      return events;
    }
    if (state.status === 'won' && state.tick !== current.endTick) {
      fail('Autoplay completed before its predicted final tick.');
      return events;
    }
    segmentTick++;
    if (segmentTick === current.segments[segmentIndex].ticks) {
      segmentIndex++;
      segmentTick = 0;
    }
    if (state.tick === current.endTick) {
      if (authoritativeCheckpoint(state).hash !== current.endHash) {
        fail('Autoplay state no longer matches its planned controls.');
        return events;
      }
      if (state.status === 'won' || state.tick >= MAX_SCENE_TICKS) complete();
      else if (!next && nextFailure?.code === 'no-safe-macro') complete(true, 'no-safe-macro');
      else if (!next) fail(nextFailure ?? 'Autoplay has no safe move ready before its deadline.');
      else {
        current = next;
        next = null;
        nextFailure = null;
        segmentIndex = 0;
        segmentTick = 0;
        prefetch();
      }
    } else if (state.tick >= MAX_SCENE_TICKS) complete(null);
    return events;
  }
  function play() {
    if (!disposed && ready && phase === 'paused') phase = 'playing';
    return report();
  }
  function pause() {
    if (phase === 'playing') phase = 'paused';
    accumulator = 0;
    return report();
  }
  function advance(seconds) {
    if (!Number.isFinite(seconds) || seconds < 0)
      throw new TypeError('Frame time must be finite and nonnegative.');
    if (phase !== 'playing' || disposed) return report();
    if (seconds > MAX_FRAME_SECONDS) {
      pause();
      return report([], 0, 'frame-gap');
    }
    accumulator += seconds;
    const start = state.tick,
      events = [];
    while (accumulator + 1e-9 >= FIXED_DT && phase === 'playing') {
      accumulator = Math.max(0, accumulator - FIXED_DT);
      events.push(...tick());
    }
    return report(events, state.tick - start, phase === 'error' ? 'autoplay-fallback' : null);
  }
  function exportRecording() {
    if (disposed) throw abortError();
    return exportReplay(recorder, state);
  }
  async function forkForPractice({ signal: forkSignal, onProgress } = {}) {
    checkAbort(forkSignal);
    if (disposed) throw abortError();
    if (phase === 'error' || state.status !== 'running')
      throw new Error('Only a playable autoplay position can become practice.');
    pause();
    const version = generation,
      recording = exportRecording();
    const checked = await verifyReplayAsync(recording, { signal: forkSignal, onProgress });
    checkAbort(forkSignal);
    if (
      !checked.match ||
      disposed ||
      generation !== version ||
      authoritativeCheckpoint(state).hash !== recording.checkpoint.hash
    )
      throw new Error('Autoplay changed while preparing practice.');
    return {
      run: checked.state,
      origin: {
        source: 'autoplay',
        levelId: state.levelId,
        tick: state.tick,
        ruleset: state.ruleset,
      },
    };
  }
  function dispose() {
    if (disposed) return;
    disposed = true;
    generation++;
    ready = false;
    pause();
    transport?.dispose();
    signal?.removeEventListener('abort', dispose);
  }
  signal?.addEventListener('abort', dispose, { once: true });
  try {
    await reset();
  } catch (error) {
    dispose();
    throw error;
  }
  return Object.freeze({
    info,
    get state() {
      return state;
    },
    get phase() {
      return phase;
    },
    get rate() {
      return 1;
    },
    get error() {
      return failure;
    },
    get errorCode() {
      return failureCode;
    },
    get completionReason() {
      return completionReason;
    },
    get finalCheckpoint() {
      return finalCheckpoint;
    },
    // Useful to prebuffer a host transition; advancing playback never awaits this.
    get planning() {
      return pending ?? Promise.resolve();
    },
    // A background clock may consume admitted wall time faster than Worker
    // messages arrive. Keep its slice inside one macro and reserve the boundary
    // tick until the next result (including a watchdog failure) has settled.
    get maxAdvanceSeconds() {
      if (disposed || phase !== 'playing' || !ready || !current) return 0;
      const terminal =
        current.predictedState.status === 'won' || current.endTick >= MAX_SCENE_TICKS;
      const reserve = !terminal && !next && !nextFailure ? 1 : 0;
      return Math.max(
        0,
        Math.min(
          MAX_FRAME_SECONDS,
          (current.endTick - state.tick - reserve) * FIXED_DT - accumulator,
        ),
      );
    },
    play,
    pause,
    advance,
    reset,
    dispose,
    exportRecording,
    forkForPractice,
  });
}
