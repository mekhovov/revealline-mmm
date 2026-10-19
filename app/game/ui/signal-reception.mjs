import { createSignalNoiseAtlas } from './analog-signal.mjs';

const ACQUIRE_SECONDS = 0.55;
const LOSS_SECONDS = 0.65;
const WRECK_SECONDS = 0.15;
const FIRST_PLAY_TICKS = 30;
const smooth = (value) => {
  const at = Math.max(0, Math.min(1, value));
  return at * at * (3 - 2 * at);
};
const runSeed = (run) => {
  let seed = 2166136261;
  for (const character of `${run?.levelId ?? run?.level?.id ?? ''}:${run?.seed ?? 0}`)
    seed = Math.imul(seed ^ character.charCodeAt(0), 16777619) >>> 0;
  return seed;
};

/** Presentation-only reception. The sole image source is the caller's already
 * masked canvas, never a raw picture. The host chooses picture-only acquisition
 * and terminal-board loss compositing; galleries and replay opt out with `off`.
 * No gameplay mutation, input, audio or persistence belongs to this helper. */
export function createSignalReception({
  canvasFactory = () => document.createElement('canvas'),
  onContextLoss,
  onContextRestored,
} = {}) {
  let owner = null,
    armed = false,
    observedReady = false,
    acquisitionHandled = false,
    lossHandled = false,
    kind = null,
    time = 0,
    seed = 0,
    generation = 0,
    disposed = false;
  const noise = createSignalNoiseAtlas({ canvasFactory, onContextLoss, onContextRestored });
  function clearCanvas() {
    noise.clear();
  }
  function reset() {
    generation++;
    owner = null;
    armed = observedReady = acquisitionHandled = lossHandled = false;
    kind = null;
    time = seed = 0;
  }
  function metadata(reduced) {
    const settled = kind !== 'acquire' && (kind !== 'lost' || reduced || time >= LOSS_SECONDS);
    const strength =
      kind === 'acquire'
        ? 0.7 * (1 - smooth(time / ACQUIRE_SECONDS))
        : kind === 'lost'
          ? reduced
            ? 0.22
            : 0.8 * smooth((time - WRECK_SECONDS) / (LOSS_SECONDS - WRECK_SECONDS))
          : 0;
    return Object.freeze({
      kind,
      strength,
      time,
      noiseFrame: reduced ? 0 : Math.floor(time * 12),
      seed,
      reduced,
      settled,
      generation,
    });
  }
  function advance(run, dt, { mode = 'off', running = true, reduced = false } = {}) {
    if (disposed) return metadata(true);
    if (mode === 'off' || !run || !['ready', 'playing', 'lost'].includes(mode)) {
      // A validation-only off draw must not consume a candidate's first Start.
      // It also cannot retire the current owner if candidate adoption fails.
      if (run && run !== owner)
        return Object.freeze({
          ...metadata(reduced),
          kind: null,
          strength: 0,
          time: 0,
          noiseFrame: 0,
          settled: true,
        });
      // Once opted in, off for that same owner retires its current transition.
      if (owner) {
        acquisitionHandled = true;
        armed = false;
      }
      if (kind !== null) generation++;
      kind = null;
      time = 0;
      return metadata(reduced);
    }
    if (owner !== run) {
      reset();
      owner = run;
      seed = runSeed(run);
    }
    if (mode === 'ready') {
      observedReady = true;
      if (!acquisitionHandled && ['ready', 'running'].includes(run.status) && run.tick === 0)
        armed = true;
      kind = null;
      time = 0;
      return metadata(reduced);
    }
    if (mode === 'lost' && run.status === 'lost') {
      acquisitionHandled = true;
      armed = false;
      if (!lossHandled) {
        lossHandled = true;
        kind = 'lost';
        time = 0;
        generation++;
      }
    } else if (mode === 'playing' && ['running', 'paused', 'respawning'].includes(run.status)) {
      if (!acquisitionHandled) {
        const nearStart =
          Number.isInteger(run.tick) && run.tick >= 0 && run.tick <= FIRST_PLAY_TICKS;
        // Ready arms at tick zero. The first actual playing paint may arrive a
        // few simulation ticks later; restored/mid-run frames do not acquire.
        acquisitionHandled = true;
        kind =
          run.status === 'running' && nearStart && (armed || !observedReady) && !reduced
            ? 'acquire'
            : null;
        armed = false;
        time = 0;
        generation++;
      }
    } else {
      kind = null;
      time = 0;
    }
    if (reduced && kind === 'acquire') kind = null;
    if (kind === 'lost' && reduced) time = LOSS_SECONDS;
    else if (running && Number.isFinite(dt) && dt > 0 && kind !== null) {
      time = Math.min(kind === 'lost' ? LOSS_SECONDS : ACQUIRE_SECONDS, time + dt);
      if (kind === 'acquire' && time >= ACQUIRE_SECONDS) kind = null;
    }
    return metadata(reduced);
  }
  function draw(ctx, width, height, frame) {
    if (
      disposed ||
      !ctx ||
      !frame ||
      frame.generation !== generation ||
      !frame.kind ||
      !(frame.strength > 0) ||
      !Number.isFinite(width) ||
      !Number.isFinite(height) ||
      width <= 0 ||
      height <= 0
    )
      return false;
    ctx.save();
    try {
      ctx.beginPath();
      ctx.rect(0, 0, width, height);
      ctx.clip();
      ctx.globalAlpha *= frame.strength;
      // Only composite tint and prepared snow. No source pixels are sampled or
      // shifted across concealment boundaries; live gameplay cues follow this.
      ctx.fillStyle = frame.kind === 'lost' ? '#24282c' : '#7b8185';
      ctx.fillRect(0, 0, width, height);
      noise.draw(ctx, width, height, frame.noiseFrame, frame.reduced ? 0.25 : 0.9);
    } finally {
      ctx.restore();
    }
    return true;
  }
  return Object.freeze({
    resourceSnapshot: noise.resourceSnapshot,
    prepare: noise.prepare,
    invalidate: clearCanvas,
    advance,
    draw,
    reset,
    dispose() {
      if (disposed) return;
      reset();
      clearCanvas();
      disposed = true;
    },
  });
}
