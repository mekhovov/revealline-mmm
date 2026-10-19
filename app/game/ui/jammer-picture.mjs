import { createSignalNoiseAtlas } from './analog-signal.mjs';
import { classicEffectActive } from '../core/classic-state.mjs';
import { EPS } from '../core/geometry.mjs';

/** Timed sweeps use their authoritative phases, including the classic actor
 * clock. Their visual reception disturbance never changes the attack itself. */
function sweepPictureStrength(state) {
  if (classicEffectActive(state, 'enemy-freeze')) return 0;
  let strength = 0;
  for (const enemy of state.enemies ?? []) {
    if (enemy.stunnedUntil > state.time + EPS) continue;
    let phase, lane;
    if (enemy.type === 'lane-boss') {
      phase = enemy.bossPhase;
      lane = enemy.lane;
    } else if (
      enemy.type === 'relay-sentinel' &&
      enemy.id === state.level?.encounter?.enemyId &&
      !state.encounter?.defeated
    ) {
      phase = state.encounter?.phase;
      lane = state.encounter?.lane;
    }
    if (Number.isFinite(lane))
      strength = Math.max(strength, phase === 'active' ? 0.8 : phase === 'warning' ? 0.24 : 0);
  }
  return strength;
}

/** Read resolved zone reception and live sweep phases. Emitter presence alone
 * isn't jamming, and Fiber's zone resistance doesn't suppress a lane attack. */
export function jammerPictureStrength(state, { fullReveal = false } = {}) {
  if (fullReveal || state?.status !== 'running') return 0;
  const sweep = sweepPictureStrength(state);
  const signal = state?.signal;
  if (signal?.resistant || !Array.isArray(signal?.zoneIds) || signal.zoneIds.length === 0)
    return sweep;
  const speed = Number.isFinite(signal.speedFactor) ? signal.speedFactor : 1;
  return Math.max(
    sweep,
    Math.min(
      0.9,
      0.45 +
        Math.max(0, Math.min(0.75, 1 - speed)) * 0.4 +
        (signal.boostBlocked ? 0.1 : 0) +
        (signal.abilityBlocked ? 0.1 : 0),
    ),
  );
}

/** Reception decoration is applied before the caller's concealment mask and
 * hazards. Prepared noise avoids pixel readback and per-frame pixel processing. */
export function createJammerPictureFilter({
  canvasFactory = () => document.createElement('canvas'),
  onContextLoss = () => {},
  onContextRestored = () => {},
} = {}) {
  const noise = createSignalNoiseAtlas({ canvasFactory, onContextLoss, onContextRestored });
  let source = null,
    signature = '',
    canvas = null,
    context = null;
  let lastFrame = -1,
    lastStrength = -1,
    lost = false,
    failed = false;
  const contextLost = () => {
    lost = true;
    onContextLoss({ source: 'jammer-picture', owner: canvas });
  };
  const contextRestored = () => {
    lost = false;
    lastFrame = lastStrength = -1;
    onContextRestored({ source: 'jammer-picture', owner: canvas });
  };
  function releaseCanvas() {
    const wasLost = lost,
      owner = canvas;
    lost = false;
    canvas?.removeEventListener?.('contextlost', contextLost);
    canvas?.removeEventListener?.('contextrestored', contextRestored);
    if (canvas) canvas.width = canvas.height = 0;
    canvas = context = null;
    lost = failed = false;
    if (wasLost) onContextRestored({ source: 'jammer-picture', owner, retired: true });
  }
  function clear() {
    releaseCanvas();
    source = null;
    signature = '';
    lastFrame = lastStrength = -1;
    noise.clear();
  }
  return Object.freeze({
    resourceSnapshot() {
      const pixels = (canvas?.width ?? 0) * (canvas?.height ?? 0);
      return {
        surface: { canvases: Number(pixels > 0), pixels, rgbaBytesEstimate: pixels * 4, lost },
        noise: noise.resourceSnapshot(),
      };
    },
    clear,
    prepare(image) {
      noise.prepare();
      if (image) this.select(image, { strength: 1, animate: false });
    },
    select(image, { strength = 0, time = 0, animate = false } = {}) {
      const next = `${image?.width}:${image?.height}:${image?.naturalWidth}:${image?.naturalHeight}:${image?.complete}`;
      if (source !== image || signature !== next) {
        releaseCanvas();
        source = image;
        signature = next;
        canvas = context = null;
        lastFrame = lastStrength = -1;
      }
      const amount = Number.isFinite(strength) ? Math.max(0, Math.min(1, strength)) : 0;
      if (
        lost ||
        failed ||
        !amount ||
        !image ||
        image.complete === false ||
        !(image.width > 0) ||
        !(image.height > 0)
      )
        return image;
      const frame = animate && Number.isFinite(time) ? Math.max(0, Math.floor(time * 12)) : 0;
      try {
        if (!canvas) {
          canvas = canvasFactory();
          const ratio = Math.min(1, 512 / Math.max(image.width, image.height));
          canvas.width = Math.max(1, Math.round(image.width * ratio));
          canvas.height = Math.max(1, Math.round(image.height * ratio));
          context = canvas.getContext('2d');
          if (!context) throw new Error('Jammer canvas unavailable');
          canvas.addEventListener?.('contextlost', contextLost);
          canvas.addEventListener?.('contextrestored', contextRestored);
        }
        // The protected source can itself be an animated canvas. Recompose it
        // even within one noise frame so no prior concealment frame is retained.
        const mutable = typeof image.getContext === 'function';
        if (!mutable && lastFrame === frame && lastStrength === amount) return canvas;
        const w = canvas.width,
          h = canvas.height;
        context.clearRect(0, 0, w, h);
        context.globalAlpha = 1;
        context.globalCompositeOperation = 'source-over';
        context.imageSmoothingEnabled = true;
        context.drawImage(image, 0, 0, w, h);
        context.globalAlpha = amount * 0.45;
        context.fillStyle = '#7b8185';
        context.fillRect(0, 0, w, h);
        context.globalAlpha = 1;
        noise.draw(context, w, h, frame, amount);
        // Preserve transparent image edges without reading source pixels.
        context.globalCompositeOperation = 'destination-in';
        context.drawImage(image, 0, 0, w, h);
        context.globalCompositeOperation = 'source-over';
        lastFrame = frame;
        lastStrength = amount;
        return canvas;
      } catch {
        releaseCanvas();
        failed = true;
        return image;
      }
    },
  });
}
