import { validateBodyBacking } from './body-motion.mjs';

/** Find only enclosed transparent regions. Flooding from the border preserves
 * exterior transparency, padding and every original antialiased outer edge. */
export function interiorAlphaMask(rgba, width, height) {
  if (
    !Number.isSafeInteger(width) ||
    !Number.isSafeInteger(height) ||
    width < 1 ||
    height < 1 ||
    width * height > 4 * 1024 * 1024 ||
    rgba.length !== width * height * 4
  )
    throw new TypeError('Invalid identity image bounds.');
  const size = width * height,
    outside = new Uint8Array(size),
    queue = new Uint32Array(size);
  let next = 0,
    end = 0;
  const visit = (i) => {
    if (!outside[i] && rgba[i * 4 + 3] < 255) {
      outside[i] = 1;
      queue[end++] = i;
    }
  };
  for (let x = 0; x < width; x++) {
    visit(x);
    visit((height - 1) * width + x);
  }
  for (let y = 0; y < height; y++) {
    visit(y * width);
    visit(y * width + width - 1);
  }
  while (next < end) {
    const i = queue[next++],
      x = i % width;
    if (x > 0) visit(i - 1);
    if (x + 1 < width) visit(i + 1);
    if (i >= width) visit(i - width);
    if (i + width < size) visit(i + width);
  }
  return outside.map((value, i) => (!value && rgba[i * 4 + 3] < 255 ? 255 : 0));
}

const masks = new WeakMap();
const RECOVERY_PROBE_MS = 250;
function stopRecoveryProbe(surface) {
  if (surface.probe === null) return;
  clearTimeout(surface.probe.id);
  surface.probe = null;
}
function scheduleRecoveryProbe(surface) {
  if (
    surface.probe !== null ||
    !surface.lost ||
    !surface.owners.size ||
    typeof surface.context.isContextLost !== 'function'
  )
    return;
  // Painting stops during recovery. Probe only unavailable owned storage, never
  // decode, read pixels or retain the source image in this timer.
  const probe = { id: null };
  surface.probe = probe;
  probe.id = setTimeout(() => {
    if (surface.probe !== probe) return;
    surface.probe = null;
    if (!surface.owners.size || !surface.lost) return;
    setSurfaceLost(surface, surface.context.isContextLost());
    scheduleRecoveryProbe(surface);
  }, RECOVERY_PROBE_MS);
}
function setSurfaceLost(surface, value) {
  const lost = Boolean(value);
  if (surface.lost === lost) return;
  surface.lost = lost;
  surface.dirty = true;
  if (!lost) stopRecoveryProbe(surface);
  for (const owner of [...surface.owners]) owner.notify(lost);
  if (lost) scheduleRecoveryProbe(surface);
}

/** Explicit painter ownership; cached surfaces never permanently retain scenes. */
export function createBodyBackingOwner({
  onContextLoss = () => {},
  onContextRestored = () => {},
} = {}) {
  const owned = new Map();
  let disposed = false;
  const clear = ({ preserveLost = false } = {}) => {
    const retired = [...owned.values()].filter(
      (owner) => !preserveLost || (!owner.lost && !owner.isSurfaceLost()),
    );
    // Unlink every retired subscription before callbacks may invalidate again.
    for (const owner of retired) owner.detach();
    for (const owner of retired) owner.retire();
  };
  return {
    track(surface) {
      if (disposed || owned.has(surface)) return;
      const owner = {
        lost: false,
        active: true,
        // A shared surface is lost before every subscriber has been notified.
        isSurfaceLost: () => surface.lost,
        notify(lost) {
          if (!owner.active || owner.lost === lost) return;
          owner.lost = lost;
          const event = { source: 'body-backing', owner };
          if (lost) onContextLoss(event);
          else onContextRestored(event);
        },
        detach() {
          if (!owner.active) return;
          owner.active = false;
          owned.delete(surface);
          surface.owners.delete(owner);
          if (!surface.owners.size) stopRecoveryProbe(surface);
        },
        retire() {
          if (!owner.lost) return;
          owner.lost = false;
          onContextRestored({ source: 'body-backing', owner, retired: true });
        },
        release() {
          owner.detach();
          owner.retire();
        },
      };
      owned.set(surface, owner);
      surface.owners.add(owner);
      owner.notify(surface.lost);
      scheduleRecoveryProbe(surface);
    },
    clear,
    dispose() {
      if (disposed) return;
      disposed = true;
      clear();
      onContextLoss = onContextRestored = () => {};
    },
  };
}
function createInteriorSurface(width, height) {
  const canvas =
    typeof OffscreenCanvas === 'function'
      ? new OffscreenCanvas(width, height)
      : document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext('2d', { willReadFrequently: true });
  if (!context) throw new Error('Body backing context unavailable.');
  const surface = {
    canvas,
    context,
    width,
    height,
    hasLossEvents:
      typeof canvas.addEventListener === 'function' &&
      'oncontextlost' in canvas &&
      'oncontextrestored' in canvas,
    lost: false,
    dirty: true,
    owners: new Set(),
    probe: null,
  };
  // Keep event closures separate from the source image and its weak cache key.
  canvas.addEventListener?.('contextlost', () => setSurfaceLost(surface, true));
  canvas.addEventListener?.('contextrestored', () => {
    surface.dirty = true;
    // An event is not readiness when the browser still reports lost storage.
    setSurfaceLost(
      surface,
      typeof context.isContextLost === 'function' ? context.isContextLost() : false,
    );
  });
  return surface;
}
function interiorImage(image, color, owner) {
  let variants = masks.get(image);
  if (!variants) {
    variants = new Map();
    masks.set(image, variants);
  }
  let surface = variants.get(color);
  if (!surface) {
    surface = createInteriorSurface(
      image.naturalWidth ?? image.width,
      image.naturalHeight ?? image.height,
    );
    variants.set(color, surface);
  }
  owner?.track(surface);
  const { canvas, context: ctx } = surface;
  // Clean event-supported cache hits need no native polling or pixel readback.
  const checkNativeLoss = !surface.hasLossEvents || surface.dirty || surface.lost;
  const lost =
    checkNativeLoss && typeof ctx.isContextLost === 'function' ? ctx.isContextLost() : surface.lost;
  setSurfaceLost(surface, lost);
  if (lost) return null;
  if (!surface.dirty) return canvas;
  try {
    const { width, height } = surface;
    ctx.drawImage(image, 0, 0);
    const data = ctx.getImageData(0, 0, width, height),
      mask = interiorAlphaMask(data.data, width, height);
    const rgb = [1, 3, 5].map((at) => parseInt(color.slice(at, at + 2), 16));
    for (let i = 0; i < mask.length; i++) {
      data.data[i * 4] = rgb[0];
      data.data[i * 4 + 1] = rgb[1];
      data.data[i * 4 + 2] = rgb[2];
      data.data[i * 4 + 3] = mask[i];
    }
    ctx.putImageData(data, 0, 0);
    surface.dirty = false;
    return canvas;
  } catch (error) {
    // A failed readback remains a visible failure and cannot poison the cache.
    if (variants.get(color) === surface) variants.delete(color);
    for (const owner of [...surface.owners]) owner.release();
    throw error;
  }
}

export function paintBodyBacking(ctx, body, image, width, height, owner) {
  const backing = validateBodyBacking(body);
  if (!backing) return;
  if (backing.kind === 'disc') {
    ctx.fillStyle = backing.color;
    ctx.beginPath();
    ctx.arc(0, 0, Math.min(width, height) * backing.radiusRatio, 0, Math.PI * 2);
    ctx.fill();
  } else {
    const pivot = body.presentationPivot ?? { x: 0.5, y: 0.5 };
    const backingImage = interiorImage(image, backing.color, owner);
    if (!backingImage) return;
    ctx.drawImage(backingImage, -width * pivot.x, -height * pivot.y, width, height);
  }
}
