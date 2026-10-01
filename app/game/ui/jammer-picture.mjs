import { analogSignalSeed, applyAnalogSignalNoise } from './analog-signal.mjs';
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

/** Temporary reception damage, never a concealment/security filter. The ordinary
 * image immediately returns when reception recovers. One bounded canvas/readback
 * per source; no capture-mask, physics, reward or actor state lives here. */
export function createJammerPictureFilter({
  canvasFactory = () => document.createElement('canvas'),
} = {}) {
  let source = null,
    signature = '',
    canvas = null,
    context = null,
    original = null,
    graded = null,
    output = null,
    seed = 0,
    lastFrame = -1,
    lastStrength = -1;
  function clear() {
    if (canvas) canvas.width = canvas.height = 0;
    source = canvas = context = original = graded = output = null;
    signature = '';
    seed = 0;
    lastFrame = lastStrength = -1;
  }
  function fail() {
    const failedSource = source,
      failedSignature = signature;
    clear();
    source = failedSource;
    signature = failedSignature;
    return source;
  }
  return Object.freeze({
    clear,
    select(image, { strength = 0, time = 0, animate = false } = {}) {
      const next = `${image?.width}:${image?.height}:${image?.naturalWidth}:${image?.naturalHeight}:${image?.complete}`;
      if (source !== image || signature !== next) {
        clear();
        // Defer all canvas work until the receiver is actually jammed.
      }
      const amount = Number.isFinite(strength) ? Math.max(0, Math.min(1, strength)) : 0;
      if (!amount) return image;
      const frame =
        animate && Number.isFinite(time)
          ? Math.min(Number.MAX_SAFE_INTEGER, Math.max(0, Math.floor(time * 12)))
          : 0;
      try {
        if (source !== image || signature !== next) {
          source = image;
          signature = next;
          if (!image || image.complete === false || !(image.width > 0) || !(image.height > 0))
            return image;
          canvas = canvasFactory();
          const ratio = Math.min(1, 512 / Math.max(image.width, image.height));
          canvas.width = Math.max(1, Math.round(image.width * ratio));
          canvas.height = Math.max(1, Math.round(image.height * ratio));
          context = canvas.getContext('2d', { willReadFrequently: true });
          if (!context) return fail();
          context.imageSmoothingEnabled = true;
          context.drawImage(image, 0, 0, canvas.width, canvas.height);
          output = context.getImageData(0, 0, canvas.width, canvas.height);
          original = output.data.slice();
          graded = new Uint8ClampedArray(original.length);
          seed = analogSignalSeed(original, canvas.width, canvas.height);
        }
        if (!canvas) return image; // Quarantine a failed read until source/readiness changes.
        if (lastFrame === frame && lastStrength === amount) return canvas;
        if (lastStrength !== amount) {
          const saturation = 1 - amount * 0.82;
          for (let i = 0; i < original.length; i += 4) {
            const luma = original[i] * 0.2126 + original[i + 1] * 0.7152 + original[i + 2] * 0.0722;
            for (let channel = 0; channel < 3; channel++)
              graded[i + channel] = luma + (original[i + channel] - luma) * saturation;
            graded[i + 3] = 255;
          }
        }
        applyAnalogSignalNoise(graded, canvas.width, canvas.height, frame, output.data, {
          seed,
          strength: amount,
        });
        // Preserve the original picture's compositing footprint.
        for (let i = 3; i < original.length; i += 4) output.data[i] = original[i];
        context.putImageData(output, 0, 0);
        lastFrame = frame;
        lastStrength = amount;
        return canvas;
      } catch {
        // The normal renderer already has authority to show this image; failure
        // must neither block play nor replace it with a stale previous picture.
        return fail();
      }
    },
  });
}
