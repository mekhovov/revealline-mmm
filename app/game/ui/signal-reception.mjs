import { applyAnalogSignalNoise } from './analog-signal.mjs';

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
    disposed = false,
    canvas = null,
    context = null,
    base = null,
    output = null,
    cacheKey = '',
    failedSize = '';
  function clearCanvas() {
    if (canvas) canvas.width = canvas.height = 0;
    canvas = context = base = output = null;
    cacheKey = '';
    failedSize = '';
  }
  function reset() {
    generation++;
    owner = null;
    armed = observedReady = acquisitionHandled = lossHandled = false;
    kind = null;
    time = seed = 0;
    clearCanvas();
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
  function texture(feed, width, height, frame) {
    const ratio = Math.min(1, 512 / Math.max(width, height)),
      w = Math.max(1, Math.round(width * ratio)),
      h = Math.max(1, Math.round(height * ratio)),
      size = `${w}:${h}`;
    if (failedSize === size) return null;
    try {
      if (!canvas || canvas.width !== w || canvas.height !== h) {
        clearCanvas();
        canvas = canvasFactory();
        canvas.width = w;
        canvas.height = h;
        context = canvas.getContext('2d', { willReadFrequently: true });
        if (!context) throw new Error('Reception canvas is unavailable.');
        output = context.createImageData(w, h);
        base = new Uint8ClampedArray(w * h * 4);
      }
      const key = `${frame.generation}:${frame.kind}:${frame.seed}:${frame.noiseFrame}:${frame.reduced}`;
      if (cacheKey !== key) {
        // The painter has finished its opaque concealment mask before calling
        // us. Copy that permitted feed, then read only this bounded scratch.
        // Never copy from a raw backdrop or sample through a translated mask.
        context.globalAlpha = 1;
        context.globalCompositeOperation = 'source-over';
        context.imageSmoothingEnabled = true;
        context.fillStyle = '#182128';
        context.fillRect(0, 0, w, h);
        context.drawImage(feed, 0, 0, width, height, 0, 0, w, h);
        const pixels = context.getImageData(0, 0, w, h).data;
        if (!(pixels instanceof Uint8ClampedArray) || pixels.length !== base.length)
          throw new Error('Reception feed is unavailable.');
        let randomState = (frame.seed ^ Math.imul(frame.noiseFrame + 1, 0x45d9f3b)) >>> 0;
        const random = () => {
          randomState = (Math.imul(randomState, 1664525) + 1013904223) >>> 0;
          return randomState / 4294967296;
        };
        const losing = frame.kind === 'lost';
        const bands = Array.from({ length: 3 }, () => ({
          top: Math.floor(random() * h),
          height: Math.max(1, Math.round(h * (0.008 + random() * 0.022))),
          shift: Math.round(
            (random() < 0.5 ? -1 : 1) * w * (losing ? 0.018 : 0.004) * (1 + random()),
          ),
        }));
        const saturation = frame.reduced ? 0.35 : losing ? 0.08 : 0.4;
        const brightness = frame.reduced ? 0.9 : losing ? 0.72 : 0.98;
        for (let y = 0; y < h; y++) {
          const band = frame.reduced
            ? null
            : bands.find((item) => y >= item.top && y < item.top + item.height);
          for (let x = 0; x < w; x++) {
            const sx = x - (band?.shift ?? 0),
              index = (y * w + x) * 4;
            let r = 24,
              g = 33,
              b = 40;
            if (sx >= 0 && sx < w) {
              const at = (y * w + sx) * 4,
                alpha = pixels[at + 3] / 255;
              r += (pixels[at] - r) * alpha;
              g += (pixels[at + 1] - g) * alpha;
              b += (pixels[at + 2] - b) * alpha;
            }
            const luma = r * 0.2126 + g * 0.7152 + b * 0.0722;
            base[index] = (luma + (r - luma) * saturation) * brightness;
            base[index + 1] = (luma + (g - luma) * saturation) * brightness;
            base[index + 2] = (luma + (b - luma) * saturation) * brightness;
            base[index + 3] = 255;
          }
        }
        applyAnalogSignalNoise(base, w, h, frame.noiseFrame, output.data, {
          seed: frame.seed,
          strength: frame.reduced ? 0.25 : losing ? 0.9 : 0.55,
        });
        context.putImageData(output, 0, 0);
        cacheKey = key;
      }
      return canvas;
    } catch {
      clearCanvas();
      failedSize = size;
      return null;
    }
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
    const image = texture(ctx.canvas, width, height, frame);
    ctx.save();
    try {
      ctx.beginPath();
      ctx.rect(0, 0, width, height);
      ctx.clip();
      ctx.globalAlpha *= frame.strength;
      if (image) {
        ctx.imageSmoothingEnabled = true;
        ctx.drawImage(image, 0, 0, width, height);
      } else {
        // Allocation/readback failure gives quiet dimming, without a raw-image
        // fallback, bright flash or unbounded retry every rendered frame.
        ctx.fillStyle = '#242424';
        ctx.fillRect(0, 0, width, height);
      }
    } finally {
      ctx.restore();
    }
    return true;
  }
  return Object.freeze({
    advance,
    draw,
    reset,
    dispose() {
      if (disposed) return;
      reset();
      disposed = true;
    },
  });
}
