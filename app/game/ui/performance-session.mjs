const PHASES = Object.freeze([
  'boot',
  'preparing',
  'ready',
  'playing',
  'paused',
  'result',
  'hidden',
  'error',
]);
const BOUNDS = Object.freeze([
  1,
  2,
  4,
  6,
  8.34,
  10,
  12,
  16.67,
  20,
  25,
  33.34,
  50,
  100,
  250,
  Infinity,
]);
const FRAME_FIELDS = 8;
const INPUT_KINDS = Object.freeze(['keyboard', 'touch', 'pointer', 'controller']);
const EVENT_KINDS = Object.freeze([
  'run-adopted',
  'capture-accepted',
  'victory-accepted',
  'defeat-accepted',
  'terminal-work-begin',
  'terminal-work-end',
  'result-overlay-shown',
  // Terminal HUD substage stamps share the existing numeric ring. They are
  // emitted only by the immediate post-terminal HUD, never ordinary frames.
  'terminal-hud-begin',
  'terminal-hud-clocks',
  'terminal-hud-owners',
  'terminal-hud-picture',
  'terminal-hud-values',
  'terminal-hud-controls',
  'terminal-hud-end',
  // Rare synchronous pause/save substages reuse the same bounded ring.
  'pause-begin',
  'pause-phase',
  'pause-input',
  'pause-audio',
  'pause-snapshot-begin',
  'pause-snapshot-end',
  'pause-snapshot-failed',
  'pause-save-begin',
  'pause-save-end',
  'pause-save-failed',
  'pause-readback-begin',
  'pause-readback-end',
  'pause-readback-failed',
  'pause-persist-failed',
  'pause-save-skipped',
  'pause-overlay',
  'pause-hud',
  'pause-link',
  'pause-end',
  // Rare optional Missions observations share the existing fixed ring.
  'missions-opening',
  'missions-after-pause',
  'missions-build-cached',
  'missions-build-joined',
  'missions-imports-begin',
  'missions-imports-end',
  'missions-data-begin',
  'missions-data-end',
  'missions-sources-begin',
  'missions-sources-end',
  'missions-supplemental-imports-begin',
  'missions-supplemental-imports-end',
  'missions-hunt-begin',
  'missions-hunt-end',
  'missions-duel-begin',
  'missions-duel-end',
  'missions-team-begin',
  'missions-team-end',
  'missions-installed-begin',
  'missions-installed-end',
  'missions-chooser-build-begin',
  'missions-chooser-build-end',
  'missions-refresh-begin',
  'missions-refresh-end',
  'missions-open-begin',
  'missions-campaigns-begin',
  'missions-campaigns-end',
  'missions-render-begin',
  'missions-render-end',
  'missions-modal-begin',
  'missions-modal-end',
  'missions-complete',
  'missions-cancelled',
  'missions-failed',
  'missions-observer-overflow',
]);
const EVENT_CAPACITY = 256;
const clean = (value) => (Number.isFinite(value) && value >= 0 ? value : 0);
const aggregate = () => ({
  count: 0,
  totalMs: 0,
  maxMs: 0,
  over33ms: 0,
  over50ms: 0,
  over100ms: 0,
  over250ms: 0,
  missedOpportunities: 0,
  maxMissedStreak: 0,
  currentMissedStreak: 0,
  histogram: new Float64Array(BOUNDS.length),
});
function collect(stats, duration, baselineMs = 0) {
  stats.count++;
  stats.totalMs += duration;
  stats.maxMs = Math.max(stats.maxMs, duration);
  if (duration > 33.34) stats.over33ms++;
  if (duration > 50) stats.over50ms++;
  if (duration > 100) stats.over100ms++;
  if (duration > 250) stats.over250ms++;
  let bucket = 0;
  while (duration > BOUNDS[bucket]) bucket++;
  stats.histogram[bucket]++;
  if (baselineMs) {
    const missed = Math.max(0, Math.round(duration / baselineMs) - 1);
    stats.missedOpportunities += missed;
    stats.currentMissedStreak = missed ? stats.currentMissedStreak + missed : 0;
    stats.maxMissedStreak = Math.max(stats.maxMissedStreak, stats.currentMissedStreak);
  }
}
const summarize = (stats) => {
  const upperBound = (fraction) => {
    if (!stats.count) return null;
    const target = Math.ceil(stats.count * fraction);
    let count = 0;
    for (let i = 0; i < BOUNDS.length; i++) {
      count += stats.histogram[i];
      if (count >= target) return Math.min(BOUNDS[i], stats.maxMs);
    }
    return null;
  };
  return {
    ...stats,
    histogram: Array.from(stats.histogram),
    p50UpperBoundMs: upperBound(0.5),
    p95UpperBoundMs: upperBound(0.95),
    p99UpperBoundMs: upperBound(0.99),
  };
};

/** Bounded numeric diagnostics. No logging, DOM, storage, timers or network. */
export function createPerformanceSession({
  now = () => performance.now(),
  capacity = 600,
  enabled = true,
  resourceSnapshot = null,
} = {}) {
  if (!Number.isInteger(capacity) || capacity < 1 || capacity > 10000)
    throw new RangeError('Invalid performance sample capacity');
  const startedAt = clean(now());
  let phase = 0,
    phaseStartedAt = startedAt,
    previous = startedAt,
    previousPhase = 0,
    hiddenSinceFrame = false,
    frameCount = 0,
    unattributedWorkFrames = 0,
    transitionCount = 0,
    inputSerial = 0,
    inputOverwrites = 0,
    inputCancelled = 0,
    failureCount = 0,
    interruptions = 0,
    worstInterruptionMs = 0,
    baselineMs = 1000 / 60,
    worstCount = 0,
    smallestWorst = 0;
  const frames = new Float64Array(capacity * FRAME_FIELDS);
  const worst = new Float64Array(16 * FRAME_FIELDS);
  const transitions = new Float64Array(64 * 2);
  const failureTimes = new Float64Array(16 * 2);
  const failureMessages = new Array(16);
  const phaseDurations = new Float64Array(PHASES.length);
  const phaseFrames = PHASES.map(aggregate);
  const phaseWork = PHASES.map(aggregate);
  const phaseUpdate = PHASES.map(aggregate);
  const phaseDraw = PHASES.map(aggregate);
  const phaseHUD = PHASES.map(aggregate);
  const phaseSimulation = PHASES.map(aggregate);
  const callbackWork = PHASES.map(aggregate);
  const totals = aggregate();
  const update = aggregate(),
    draw = aggregate(),
    hud = aggregate(),
    simulation = aggregate(),
    appWork = aggregate();
  const longTasks = aggregate(),
    longAnimationFrames = aggregate();
  const inputToTick = INPUT_KINDS.map(aggregate),
    inputToRender = INPUT_KINDS.map(aggregate);
  // id, input stamp, first tick stamp, kind. A consumed slot has id 0.
  const inputs = new Float64Array(32 * 4);
  // Timestamp, kind, accepted-run generation, tick, phase. Never retain a run.
  const eventRows = new Float64Array(EVENT_CAPACITY * 5);
  const eventCounts = new Float64Array(EVENT_KINDS.length);
  let eventCount = 0,
    rejectedEvents = 0,
    lastEventAt = startedAt;
  let longTaskSupported = false,
    longAnimationFrameSupported = false;
  function setPhase(name, atMs = now()) {
    const next = PHASES.indexOf(name);
    if (next < 0) throw new RangeError('Unknown performance phase');
    if (next === phase || !Number.isFinite(atMs)) return;
    const stamp = Math.max(phaseStartedAt, atMs);
    if (enabled) phaseDurations[phase] += stamp - phaseStartedAt;
    phaseStartedAt = stamp;
    phase = next;
    phaseFrames[phase].currentMissedStreak = 0;
    if (name === 'hidden') hiddenSinceFrame = true;
    if (!enabled) return;
    const offset = (transitionCount++ % 64) * 2;
    transitions[offset] = stamp;
    transitions[offset + 1] = phase;
  }
  function recordFrame(
    atMs,
    updateMs = 0,
    drawMs = 0,
    hudMs = 0,
    simulationMs = 0,
    totalWorkMs = updateMs + drawMs,
    workPhase = null,
  ) {
    if (!enabled || !Number.isFinite(atMs) || atMs < previous) return;
    const interval = atMs - previous;
    const attribution = hiddenSinceFrame ? PHASES.indexOf('hidden') : previousPhase;
    updateMs = clean(updateMs);
    drawMs = clean(drawMs);
    hudMs = clean(hudMs);
    simulationMs = clean(simulationMs);
    totalWorkMs = clean(totalWorkMs);
    collect(totals, interval, baselineMs);
    collect(phaseFrames[attribution], interval, baselineMs);
    collect(update, updateMs);
    collect(draw, drawMs);
    collect(hud, hudMs);
    collect(simulation, simulationMs);
    collect(appWork, totalWorkMs);
    collect(phaseWork[attribution], totalWorkMs);
    collect(phaseUpdate[attribution], updateMs);
    collect(phaseDraw[attribution], drawMs);
    collect(phaseHUD[attribution], hudMs);
    collect(phaseSimulation[attribution], simulationMs);
    // The interval belongs to the previous callback. Current callback work is
    // labeled only by an explicit entry-phase observation, never the final phase.
    const workAttribution = PHASES.indexOf(workPhase);
    if (workAttribution < 0) unattributedWorkFrames++;
    else collect(callbackWork[workAttribution], totalWorkMs);
    const offset = (frameCount++ % capacity) * FRAME_FIELDS;
    frames[offset] = atMs;
    frames[offset + 1] = interval;
    frames[offset + 2] = attribution;
    frames[offset + 3] = clean(updateMs);
    frames[offset + 4] = clean(drawMs);
    frames[offset + 5] = clean(hudMs);
    frames[offset + 6] = clean(simulationMs);
    frames[offset + 7] = workAttribution;
    // Retain the worst foreground frames even after the recent ring wraps.
    // Hidden suspension cannot evict useful active-play evidence.
    if (
      attribution !== 6 &&
      (worstCount < 16 || interval > worst[smallestWorst * FRAME_FIELDS + 1])
    ) {
      const row = worstCount < 16 ? worstCount++ : smallestWorst;
      for (let i = 0; i < FRAME_FIELDS; i++) worst[row * FRAME_FIELDS + i] = frames[offset + i];
      smallestWorst = 0;
      for (let i = 1; i < worstCount; i++)
        if (worst[i * FRAME_FIELDS + 1] < worst[smallestWorst * FRAME_FIELDS + 1])
          smallestWorst = i;
    }
    previous = atMs;
    previousPhase = phase;
    hiddenSinceFrame = false;
  }
  const validInput = (token) => {
    if (!Number.isSafeInteger(token) || token < 1) return -1;
    const offset = ((token - 1) % 32) * 4;
    return inputs[offset] === token ? offset : -1;
  };
  return {
    setPhase,
    recordFrame,
    markEvent(kind, generation, tick, atMs) {
      // A default-parameter clock read would still run when collection is off.
      if (!enabled) return;
      const type = EVENT_KINDS.indexOf(kind);
      if (atMs === undefined) atMs = now();
      if (
        type < 0 ||
        !Number.isSafeInteger(generation) ||
        generation < 1 ||
        !Number.isSafeInteger(tick) ||
        tick < 0 ||
        !Number.isFinite(atMs) ||
        atMs < lastEventAt
      ) {
        rejectedEvents++;
        return;
      }
      const offset = (eventCount++ % EVENT_CAPACITY) * 5;
      eventRows[offset] = lastEventAt = atMs;
      eventRows[offset + 1] = type;
      eventRows[offset + 2] = generation;
      eventRows[offset + 3] = tick;
      eventRows[offset + 4] = phase;
      eventCounts[type]++;
    },
    setBaseline(value) {
      if (phase === 3 || !Number.isFinite(value) || value < 4 || value > 50) return false;
      baselineMs = value;
      return true;
    },
    setEnabled(value) {
      value = Boolean(value);
      if (enabled === value) return;
      const stamp = Math.max(phaseStartedAt, clean(now()));
      if (enabled) phaseDurations[phase] += stamp - phaseStartedAt;
      enabled = value;
      phaseStartedAt = previous = stamp;
      previousPhase = phase;
      hiddenSinceFrame = false;
      inputs.fill(0);
    },
    input(kind, atMs = now()) {
      if (!enabled) return 0;
      const type = INPUT_KINDS.indexOf(kind);
      if (type < 0 || !Number.isFinite(atMs)) return 0;
      const token = ++inputSerial;
      const offset = ((token - 1) % 32) * 4;
      if (inputs[offset]) inputOverwrites++;
      inputs[offset] = token;
      inputs[offset + 1] = atMs;
      inputs[offset + 2] = -1;
      inputs[offset + 3] = type;
      return token;
    },
    tick(token, atMs = now()) {
      if (!enabled) return;
      const offset = validInput(token);
      if (
        offset < 0 ||
        !Number.isFinite(atMs) ||
        atMs < inputs[offset + 1] ||
        inputs[offset + 2] >= 0
      )
        return;
      inputs[offset + 2] = atMs;
      collect(inputToTick[inputs[offset + 3]], atMs - inputs[offset + 1]);
    },
    rendered(token, atMs = now()) {
      if (!enabled) return;
      const offset = validInput(token);
      if (
        offset < 0 ||
        !Number.isFinite(atMs) ||
        inputs[offset + 2] < 0 ||
        atMs < inputs[offset + 2]
      )
        return;
      collect(inputToRender[inputs[offset + 3]], atMs - inputs[offset + 1]);
      inputs[offset] = 0;
    },
    discardInputs() {
      let discarded = 0;
      for (let offset = 0; offset < inputs.length; offset += 4) {
        if (inputs[offset]) discarded++;
        inputs[offset] = 0;
      }
      inputCancelled += discarded;
      return discarded;
    },
    reportFailure(message, atMs = now()) {
      if (!enabled || !Number.isFinite(atMs)) return;
      const row = failureCount++ % 16;
      failureTimes[row * 2] = Math.max(startedAt, atMs);
      failureTimes[row * 2 + 1] = phase;
      failureMessages[row] =
        typeof message === 'string' ? message.slice(0, 512) : 'Unknown failure';
    },
    interruption(durationMs) {
      if (!enabled || !Number.isFinite(durationMs) || durationMs <= 250) return;
      interruptions++;
      worstInterruptionMs = Math.max(worstInterruptionMs, durationMs);
    },
    setObserverSupport({ longTask = false, longAnimationFrame = false } = {}) {
      longTaskSupported = Boolean(longTask);
      longAnimationFrameSupported = Boolean(longAnimationFrame);
    },
    longTask(durationMs) {
      if (enabled && Number.isFinite(durationMs) && durationMs >= 0) collect(longTasks, durationMs);
    },
    longAnimationFrame(durationMs) {
      if (enabled && Number.isFinite(durationMs) && durationMs >= 0)
        collect(longAnimationFrames, durationMs);
    },
    export({ paused = false } = {}) {
      if (!paused) throw new Error('Pause gameplay before exporting diagnostics');
      const end = Math.max(phaseStartedAt, clean(now()));
      const frameSummary = (storage, offset) => ({
        atMs: storage[offset],
        intervalMs: storage[offset + 1],
        phase: PHASES[storage[offset + 2]],
        workPhase: PHASES[storage[offset + 7]] ?? null,
        updateMs: storage[offset + 3],
        drawMs: storage[offset + 4],
        hudMs: storage[offset + 5],
        simulationMs: storage[offset + 6],
      });
      const recentFrames = [];
      for (let i = Math.max(0, frameCount - capacity); i < frameCount; i++) {
        const offset = (i % capacity) * FRAME_FIELDS;
        recentFrames.push({
          atMs: frames[offset],
          intervalMs: frames[offset + 1],
          phase: PHASES[frames[offset + 2]],
          workPhase: PHASES[frames[offset + 7]] ?? null,
          updateMs: frames[offset + 3],
          drawMs: frames[offset + 4],
          hudMs: frames[offset + 5],
          simulationMs: frames[offset + 6],
        });
      }
      const recentTransitions = [];
      for (let i = Math.max(0, transitionCount - 64); i < transitionCount; i++) {
        const offset = (i % 64) * 2;
        recentTransitions.push({
          atMs: transitions[offset],
          phase: PHASES[transitions[offset + 1]],
        });
      }
      const worstHitches = [];
      for (let i = 0; i < worstCount; i++) worstHitches.push(frameSummary(worst, i * FRAME_FIELDS));
      worstHitches.sort((a, b) => b.intervalMs - a.intervalMs);
      const recentFailures = [];
      for (let i = Math.max(0, failureCount - 16); i < failureCount; i++) {
        const row = i % 16;
        recentFailures.push({
          atMs: failureTimes[row * 2],
          phase: PHASES[failureTimes[row * 2 + 1]],
          message: failureMessages[row],
        });
      }
      const recentEvents = [];
      const retainedEventsByKind = new Float64Array(EVENT_KINDS.length);
      for (let i = Math.max(0, eventCount - EVENT_CAPACITY); i < eventCount; i++) {
        const offset = (i % EVENT_CAPACITY) * 5;
        const kind = eventRows[offset + 1];
        retainedEventsByKind[kind]++;
        recentEvents.push({
          atMs: eventRows[offset],
          kind: EVENT_KINDS[kind],
          runGeneration: eventRows[offset + 2],
          tick: eventRows[offset + 3],
          phase: PHASES[eventRows[offset + 4]],
        });
      }
      let resources = { supported: false };
      if (typeof resourceSnapshot === 'function')
        try {
          resources = resourceSnapshot();
        } catch {
          resources = { supported: false, reason: 'Resource snapshot unavailable' };
        }
      return {
        version: 1,
        enabled,
        baselineMs,
        startedAtMs: startedAt,
        durationMs: end - startedAt,
        phase: PHASES[phase],
        histogramUpperBoundsMs: BOUNDS.map((value) => (Number.isFinite(value) ? value : null)),
        frames: summarize(totals),
        phases: Object.fromEntries(
          PHASES.map((name, index) => [
            name,
            {
              durationMs:
                phaseDurations[index] + (enabled && index === phase ? end - phaseStartedAt : 0),
              frames: summarize(phaseFrames[index]),
              work: summarize(phaseWork[index]),
              stages: {
                update: summarize(phaseUpdate[index]),
                draw: summarize(phaseDraw[index]),
                hud: summarize(phaseHUD[index]),
                simulation: summarize(phaseSimulation[index]),
              },
            },
          ]),
        ),
        callbackWork: {
          version: 1,
          definition:
            'Completed PRE_STEP-to-POST_RENDER elapsed work labeled by the phase observed immediately before the application update. workPhase is a caller-supplied entry observation, not a claim that every substage ran in that phase. It includes a playing callback that pauses, wins or fails during update. Missing entry observations remain null and unattributed. The existing phase fields, interval counts and legacy phase work/stage buckets retain prior-interval attribution, including hidden suspension. This additive view does not change those metrics or prove CPU time, browser composition, physical presentation or a frame-gap cause.',
          attributedFrameCount: frameCount - unattributedWorkFrames,
          unattributedFrameCount: unattributedWorkFrames,
          phases: Object.fromEntries(
            PHASES.map((name, index) => [name, { work: summarize(callbackWork[index]) }]),
          ),
        },
        stages: {
          work: summarize(appWork),
          update: summarize(update),
          draw: summarize(draw),
          hud: summarize(hud),
          simulation: summarize(simulation),
        },
        interruptions: { count: interruptions, maxMs: worstInterruptionMs },
        failures: { count: failureCount, recent: recentFailures },
        eventWitnesses: {
          version: 1,
          definition:
            'Host observations on the performance.now time origin. Accepted events are observed after stepRun returns; generation identifies a host-local accepted run, not a persistent identity. rAF stamps share this origin but are not callback execution start times. Markers do not change frame attribution or establish asynchronous durability. Terminal HUD markers delimit inclusive elapsed substages in the immediate post-terminal callback, not CPU time; a missing end marker remains incomplete. Pause markers delimit the synchronous full unfinished-flight pause path: phase includes owner/phase/cancellation; input includes clearing/paused state; audio includes optional flush invocation, sound and warning; snapshot/save/readback have separate boundaries; overlay/HUD/link record synchronous work only. Failure kinds retain the failed substage and suppress pause-end. Early-return pause branches remain prefixes. A completed span does not prove storage durability, asynchronous flush/link completion, CPU time or the cause of the preceding frame gap. Missions markers delimit inclusive first-open import, construction, refresh and open/render work. Missing ends remain incomplete; cancellation closes only the observer. Joined builds do not inherit another opening observer. These are not CPU samples, import network attribution, or proof that a received pending stage caused a page hang.',
          capacity: EVENT_CAPACITY,
          total: eventCount,
          retained: recentEvents.length,
          omitted: Math.max(0, eventCount - EVENT_CAPACITY),
          rejected: rejectedEvents,
          byKind: Object.fromEntries(
            EVENT_KINDS.map((kind, index) => [
              kind,
              {
                total: eventCounts[index],
                retained: retainedEventsByKind[index],
                omitted: eventCounts[index] - retainedEventsByKind[index],
              },
            ]),
          ),
          recent: recentEvents,
        },
        longTasks: longTaskSupported
          ? { supported: true, ...summarize(longTasks) }
          : { supported: false },
        longAnimationFrames: longAnimationFrameSupported
          ? { supported: true, ...summarize(longAnimationFrames) }
          : { supported: false },
        inputLatency: {
          definition:
            'Observed input to simulation tick and submitted draw; excludes device and display latency.',
          overwritten: inputOverwrites,
          cancelled: inputCancelled,
          pending: Array.from(inputs).filter((value, index) => index % 4 === 0 && value > 0).length,
          byKind: Object.fromEntries(
            INPUT_KINDS.map((kind, index) => [
              kind,
              { toTick: summarize(inputToTick[index]), toRender: summarize(inputToRender[index]) },
            ]),
          ),
        },
        retainedFrameCount: recentFrames.length,
        omittedFrameCount: Math.max(0, frameCount - capacity),
        recentFrames,
        recentTransitions,
        worstHitches,
        resources,
      };
    },
  };
}
