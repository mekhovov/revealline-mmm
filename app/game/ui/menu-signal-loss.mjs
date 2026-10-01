import { applyAnalogSignalNoise } from './analog-signal.mjs';

const FRAME_MS = 1000 / 12;
const MAX_EDGE = 256;
const MAX_OPACITY = 0.4;

/** A brief receiver failure over the visible landing artwork. drawSource must
 * draw only that artwork in the supplied bounded viewport, never menu content.
 * The host owns off/reduced/landing visibility policy through setRunning. */
export function attachMenuSignalLoss({ canvas, drawSource, random = Math.random, scheduler }) {
  if (!canvas || typeof drawSource !== 'function')
    throw new TypeError('Menu signal loss needs a canvas and an artwork source.');
  const doc = canvas.ownerDocument,
    win = doc?.defaultView;
  const clock = scheduler ?? {
    now: () => win.performance.now(),
    setTimeout: (callback, delay) => win.setTimeout(callback, delay),
    clearTimeout: (id) => win.clearTimeout(id),
  };
  let disposed = false,
    running = false,
    failed = false,
    generation = 0,
    timer = null,
    context = null,
    burst = null;
  canvas.hidden = true;
  canvas.style.opacity = '0';
  canvas.style.pointerEvents = 'none';
  canvas.setAttribute?.('aria-hidden', 'true');
  canvas.setAttribute?.('inert', '');

  const chance = () => {
    const value = random();
    return Number.isFinite(value) ? Math.max(0, Math.min(1 - Number.EPSILON, value)) : 0.5;
  };
  function conceal() {
    canvas.style.opacity = '0';
    canvas.hidden = true;
  }
  function cancel() {
    generation++;
    if (timer !== null) clock.clearTimeout(timer);
    timer = null;
    burst = null;
    conceal();
  }
  function active() {
    return !disposed && running && !failed && !doc?.hidden;
  }
  function later(callback, delay) {
    const token = generation;
    timer = clock.setTimeout(() => {
      if (token !== generation) return;
      timer = null;
      if (!active()) {
        cancel();
        return;
      }
      callback();
    }, delay);
  }
  function schedule(first) {
    if (active() && timer === null)
      later(begin, first ? 8000 + chance() * 4000 : 18000 + chance() * 14000);
  }
  function unavailable() {
    failed = true;
    cancel();
    canvas.width = canvas.height = 0;
  }
  function begin() {
    try {
      const ownBounds = canvas.getBoundingClientRect();
      const bounds =
        ownBounds.width > 0 && ownBounds.height > 0
          ? ownBounds
          : (canvas.parentElement?.getBoundingClientRect() ?? ownBounds);
      const scale = Math.min(1, MAX_EDGE / bounds.width, MAX_EDGE / bounds.height);
      if (!(bounds.width > 0 && bounds.height > 0 && Number.isFinite(scale))) {
        schedule(false);
        return;
      }
      canvas.width = Math.max(1, Math.floor(bounds.width * scale));
      canvas.height = Math.max(1, Math.floor(bounds.height * scale));
      context ??= canvas.getContext('2d', { willReadFrequently: true });
      if (!context) return unavailable();
      const duration = 550 + chance() * 300,
        count = 1 + Math.floor(chance() * 3);
      burst = {
        started: clock.now(),
        duration,
        frame: 0,
        seed: Math.floor(chance() * 4294967296),
        bands: Array.from({ length: count }, () => ({
          top: Math.floor(chance() * canvas.height),
          height: Math.max(1, Math.round((0.012 + chance() * 0.035) * canvas.height)),
          shift: Math.round((chance() < 0.5 ? -1 : 1) * (0.015 + chance() * 0.025) * canvas.width),
        })),
        torn: new Uint8ClampedArray(canvas.width * canvas.height * 4),
        output: context.createImageData(canvas.width, canvas.height),
      };
      paint();
    } catch {
      unavailable();
    }
  }
  function paint() {
    if (!burst || !active()) return;
    const age = clock.now() - burst.started;
    if (age >= burst.duration) {
      burst = null;
      conceal();
      schedule(false);
      return;
    }
    try {
      const width = canvas.width,
        height = canvas.height;
      context.setTransform(1, 0, 0, 1, 0, 0);
      context.globalAlpha = 1;
      context.globalCompositeOperation = 'source-over';
      context.clearRect(0, 0, width, height);
      if (drawSource(context, width, height) === false) {
        burst = null;
        conceal();
        schedule(false);
        return;
      }
      const pixels = context.getImageData(0, 0, width, height).data;
      let hasPicture = false;
      for (let index = 3; index < pixels.length && !hasPicture; index += 4)
        hasPicture = pixels[index] > 0;
      if (!hasPicture) {
        burst = null;
        conceal();
        schedule(false);
        return;
      }
      for (let y = 0; y < height; y++) {
        const band = burst.bands.find((entry) => y >= entry.top && y < entry.top + entry.height);
        const shift = band ? band.shift : 0;
        for (let x = 0; x < width; x++) {
          const source = (y * width + Math.max(0, Math.min(width - 1, x + shift))) * 4,
            target = (y * width + x) * 4;
          const gray = Math.round(
            pixels[source] * 0.2126 + pixels[source + 1] * 0.7152 + pixels[source + 2] * 0.0722,
          );
          burst.torn[target] = burst.torn[target + 1] = burst.torn[target + 2] = gray;
          burst.torn[target + 3] = 255;
        }
      }
      applyAnalogSignalNoise(burst.torn, width, height, burst.frame++, burst.output.data, {
        seed: burst.seed,
        strength: 0.85,
      });
      context.putImageData(burst.output, 0, 0);
      // One smooth rise/recovery; there are no separate flashes or black frames.
      canvas.style.opacity = String(MAX_OPACITY * Math.sin((Math.PI * age) / burst.duration) ** 2);
      canvas.hidden = false;
      later(paint, Math.min(FRAME_MS, burst.duration - age));
    } catch {
      unavailable();
    }
  }
  function visibilityChanged() {
    cancel();
    schedule(true);
  }
  doc?.addEventListener?.('visibilitychange', visibilityChanged);
  return Object.freeze({
    setRunning(value) {
      if (disposed || running === Boolean(value)) return;
      running = Boolean(value);
      cancel();
      schedule(true);
    },
    reset() {
      if (disposed) return;
      cancel();
      failed = false;
      canvas.width = canvas.height = 0;
      schedule(true);
    },
    dispose() {
      if (disposed) return;
      disposed = true;
      running = false;
      cancel();
      doc?.removeEventListener?.('visibilitychange', visibilityChanged);
      context = null;
      canvas.width = canvas.height = 0;
    },
  });
}
