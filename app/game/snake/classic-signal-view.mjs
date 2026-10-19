import { applyAnalogSignalNoise } from '../ui/analog-signal.mjs';

export const CLASSIC_SIGNAL_MAX_BLEND = 0.65;
export const CLASSIC_SIGNAL_MAX_TEAR_CELLS = 0.15;
const receivers = new WeakMap();
const receiverOwners = new WeakMap();
const fallbackOwner = {};
export const CLASSIC_SIGNAL_RECEIVER_LIMIT = 3;
export const CLASSIC_SIGNAL_SAMPLE_EDGE = 320;
const receiverOwner = (canvas) => canvas.ownerDocument ?? fallbackOwner;
function receiverPool(canvas) {
  const owner = receiverOwner(canvas);
  if (!receiverOwners.has(owner)) receiverOwners.set(owner, new Map());
  return receiverOwners.get(owner);
}
function releaseReceiver(canvas, receiver) {
  receiverPool(canvas).delete(canvas);
  if (!receiver) return;
  receiver.surface.width = receiver.surface.height = 1;
  receiver.terrain = null;
  receiver.scratch = {};
  receiver.owner = receiver.terrainOwner = null;
}
export function classicSignalCacheStats(owner) {
  const pool = receiverOwners.get(owner ?? fallbackOwner);
  return {
    entries: pool?.size ?? 0,
    bytes: [...(pool?.values() ?? [])].reduce(
      (sum, item) =>
        sum +
        item.surface.width * item.surface.height * 4 +
        (item.terrain?.byteLength ?? 0) +
        Object.values(item.scratch).reduce((bytes, array) => bytes + array.byteLength, 0),
      0,
    ),
  };
}
const clamp = (value, lo, hi) => Math.max(lo, Math.min(hi, value));
const axisDistance = (a, b, size, wrap) => {
  const delta = Math.abs(a - b);
  return wrap ? Math.min(delta, size - delta) : delta;
};

export function classicSignalStrength(run, signal) {
  if (!signal?.active || signal.suppressed || run.status !== 'running') return 0;
  const heads = run.snakes.filter((snake) => snake.alive).map((snake) => snake.body[0]);
  return Math.max(
    0,
    ...signal.sources
      .filter((source) => source.phase === 'jamming')
      .map((source) => {
        if (source.radius == null) return 1;
        const distance = Math.min(
          ...heads.map((head) =>
            Math.hypot(
              axisDistance(head.x, source.x, run.level.width, run.level.wrap),
              axisDistance(head.y, source.y, run.level.height, run.level.wrap),
            ),
          ),
        );
        return distance > source.radius ? 0 : 0.25 + 0.75 * (1 - distance / source.radius);
      }),
  );
}

const treatmentName = (value) =>
  ['baseline', 'snow-only'].includes(value) ? value : 'contrast-loss';
const hash = (value, seed) => {
  let n = Math.imul(value ^ seed, 0x45d9f3b);
  n = Math.imul(n ^ (n >>> 16), 0x45d9f3b);
  return (n ^ (n >>> 16)) >>> 0;
};

export function classicSignalBlend(strength, treatment = 'contrast-loss') {
  const reception = clamp(strength, 0, 1);
  if (!reception) return 0;
  // Entering an active radius must already affect distant tracking. Proximity
  // increases the loss without ever removing the final 35% of fresh terrain
  // and player feed. The board painter omits enemies before either branch.
  return treatmentName(treatment) === 'baseline'
    ? CLASSIC_SIGNAL_MAX_BLEND * reception
    : 0.5 + (CLASSIC_SIGNAL_MAX_BLEND - 0.5) * reception;
}

function safeCell(x, y, columns, rows, wrap, heads, sources) {
  return (
    heads.some(
      (head) =>
        axisDistance(head.x, x, columns, wrap) <= 2 && axisDistance(head.y, y, rows, wrap) <= 2,
    ) || sources.some((source) => source.x === x && source.y === y)
  );
}

function coarseTerrain(source, output, width, height, cellWidth, cellHeight) {
  const blockWidth = Math.max(1, Math.round(cellWidth * 1.25)),
    blockHeight = Math.max(1, Math.round(cellHeight * 1.25));
  for (let by = 0; by < height; by += blockHeight)
    for (let bx = 0; bx < width; bx += blockWidth) {
      const right = Math.min(width, bx + blockWidth),
        bottom = Math.min(height, by + blockHeight);
      let grey = 0;
      for (let y = by; y < bottom; y++)
        for (let x = bx; x < right; x++) {
          const at = (y * width + x) * 4;
          grey += source[at] * 0.3 + source[at + 1] * 0.6 + source[at + 2] * 0.1;
        }
      // Flatten the receiver's terrain contrast; actor detail is absent from
      // this branch rather than being duplicated underneath stronger grain.
      const value = 70 + (grey / ((right - bx) * (bottom - by))) * 0.27;
      for (let y = by; y < bottom; y++)
        for (let x = bx; x < right; x++) {
          const at = (y * width + x) * 4;
          output[at] = output[at + 1] = output[at + 2] = value;
          output[at + 3] = 255;
        }
    }
}

/** The processed branch has no cable when current terrain is supplied. The
 * board painter excludes enemy actors from both branches during jamming.
 * Compositing leaves at least 35% of the fresh terrain/player image, while head
 * neighbourhoods and beacon cells remain exact. receiverOnly is for native
 * canvas composition: it avoids resampling the clean feed or protected cells. */
export function classicSignalPixels(
  base,
  width,
  height,
  {
    frame = 0,
    seed = 0,
    strength = 1,
    reduced = false,
    columns = 24,
    rows = 18,
    wrap = false,
    heads = [],
    sources = [],
    terrain,
    treatment = 'contrast-loss',
    receiverOnly = false,
    scratch = {},
  } = {},
) {
  treatment = treatmentName(treatment);
  const cellWidth = width / columns,
    cellHeight = height / rows,
    noiseFrame = reduced ? 0 : frame,
    blend = classicSignalBlend(strength, treatment);
  for (const key of ['torn', 'noisy', 'coarse'])
    if (scratch[key]?.length !== base.length) scratch[key] = new Uint8ClampedArray(base.length);
  const { torn, noisy, coarse } = scratch;
  if (treatment === 'contrast-loss')
    coarseTerrain(
      terrain?.length === base.length ? terrain : base,
      coarse,
      width,
      height,
      cellWidth,
      cellHeight,
    );
  const maxTear = reduced ? 0 : Math.floor(cellWidth * CLASSIC_SIGNAL_MAX_TEAR_CELLS);
  for (let y = 0; y < height; y++) {
    const band = Math.floor(y / Math.max(1, Math.floor(cellHeight * 0.35)));
    const shift = maxTear
      ? (((Math.imul(band + noiseFrame + 1, 137) ^ seed) >>> 0) % (2 * maxTear + 1)) - maxTear
      : 0;
    for (let x = 0; x < width; x++) {
      const at = (y * width + x) * 4,
        from = (y * width + clamp(x + shift, 0, width - 1)) * 4;
      const grey = base[from] * 0.3 + base[from + 1] * 0.6 + base[from + 2] * 0.1;
      for (let channel = 0; channel < 3; channel++)
        torn[at + channel] =
          treatment === 'contrast-loss'
            ? coarse[from + channel]
            : (base[from + channel] * 0.35 + grey * 0.65) * 0.62;
      torn[at + 3] = 255;
    }
  }
  applyAnalogSignalNoise(torn, width, height, noiseFrame, noisy, {
    seed: seed >>> 0,
    // Proximity controls compositing once; scaling snow twice made the old
    // radius boundary almost indistinguishable from normal reception.
    strength: treatment === 'baseline' ? clamp(strength, 0, 1) : 1,
  });
  for (let y = 0; y < height; y++) {
    const band = Math.floor(y / Math.max(1, Math.round(cellHeight * 0.7))),
      bandOffset = ((hash(band + Math.floor(noiseFrame / 2) * 67, seed) % 65) - 32) * 0.8;
    for (let x = 0; x < width; x++) {
      const at = (y * width + x) * 4,
        cx = Math.floor(x / cellWidth),
        cy = Math.floor(y / cellHeight);
      const safe = safeCell(cx, cy, columns, rows, wrap, heads, sources);
      for (let channel = 0; channel < 3; channel++) {
        const processed =
          treatment === 'baseline'
            ? noisy[at + channel]
            : clamp(
                torn[at + channel] + (noisy[at + channel] - torn[at + channel]) * 3.2 + bandOffset,
                12,
                220,
              );
        noisy[at + channel] = receiverOnly
          ? processed
          : safe
            ? base[at + channel]
            : base[at + channel] * (1 - blend) + processed * blend;
      }
      noisy[at + 3] = 255;
    }
  }
  return noisy;
}

function createReceiver(canvas) {
  const surface =
    canvas.ownerDocument?.createElement?.('canvas') ??
    (typeof OffscreenCanvas === 'function' ? new OffscreenCanvas(1, 1) : null);
  const context = surface?.getContext?.('2d', { willReadFrequently: true });
  return context?.getImageData && context?.putImageData
    ? { surface, context, owner: null, key: '', terrainOwner: null, terrainKey: '', scratch: {} }
    : null;
}

function receiverFor(canvas) {
  if (!receivers.has(canvas)) receivers.set(canvas, createReceiver(canvas));
  const receiver = receivers.get(canvas);
  if (!receiver) return null;
  const pool = receiverPool(canvas);
  pool.delete(canvas);
  while (pool.size >= CLASSIC_SIGNAL_RECEIVER_LIMIT) {
    const oldest = pool.keys().next().value;
    releaseReceiver(oldest, pool.get(oldest));
    receivers.delete(oldest);
  }
  pool.set(canvas, receiver);
  return receiver;
}

const appearanceKey = (canvas, run, visualKey) =>
  `${run.tick}/${canvas.width}/${canvas.height}/${visualKey}`;
function sampleReceiver(receiver, canvas, run, unit) {
  const width = run.level.width * unit,
    height = run.level.height * unit,
    ratio = Math.min(1, CLASSIC_SIGNAL_SAMPLE_EDGE / width, CLASSIC_SIGNAL_SAMPLE_EDGE / height),
    sampleWidth = Math.max(1, Math.round(width * ratio)),
    sampleHeight = Math.max(1, Math.round(height * ratio));
  if (receiver.surface.width !== sampleWidth || receiver.surface.height !== sampleHeight) {
    receiver.surface.width = sampleWidth;
    receiver.surface.height = sampleHeight;
  }
  receiver.context.imageSmoothingEnabled = false;
  receiver.context.drawImage(
    canvas,
    0,
    0,
    canvas.width,
    canvas.height,
    0,
    0,
    sampleWidth,
    sampleHeight,
  );
  return receiver.context.getImageData(0, 0, sampleWidth, sampleHeight);
}

/** Call after current terrain/walls, before any targets or player cable. No
 * archived frame is accepted: the subsequent draw must have this same tick. */
export function captureClassicSignalTerrain(canvas, run, { unit = 28, visualKey = '' } = {}) {
  const receiver = receiverFor(canvas);
  if (!receiver) return;
  const key = appearanceKey(canvas, run, visualKey);
  if (receiver.terrainOwner === run && receiver.terrainKey === key) return;
  try {
    receiver.terrain = sampleReceiver(receiver, canvas, run, unit).data;
    receiver.terrainOwner = run;
    receiver.terrainKey = key;
    receiver.key = '';
  } catch {
    releaseReceiver(canvas, receiver);
    receivers.set(canvas, null);
  }
}

function clipUnprotected(ctx, run, sources, unit) {
  const { width, height, wrap } = run.level,
    heads = run.snakes.filter((snake) => snake.alive).map((snake) => snake.body[0]);
  ctx.beginPath();
  // Contiguous row intervals form a union even when Team head regions overlap;
  // an even-odd set of overlapping holes would expose those protected cells.
  for (let y = 0; y < height; y++) {
    let start = null;
    for (let x = 0; x <= width; x++) {
      const safe = x === width || safeCell(x, y, width, height, wrap, heads, sources);
      if (!safe && start == null) start = x;
      if (safe && start != null) {
        ctx.rect(start * unit, y * unit, (x - start) * unit, unit);
        start = null;
      }
    }
  }
  ctx.clip();
}

function drawFallback(ctx, run, { unit, reduced, timeMs, blend }) {
  const width = run.level.width * unit,
    height = run.level.height * unit,
    frame = reduced ? 0 : Math.floor(timeMs / 100),
    seed = run.hazardSeed ?? run.seed ?? 0;
  // Canvas readback can be unavailable for a community skin. A procedural
  // receiver still removes the same information fraction without readback.
  ctx.globalAlpha = blend;
  // Disjoint grain rectangles cover every affected pixel exactly once; a
  // backdrop plus an overlaid grain layer would violate the clean-feed floor.
  const stripe = Math.max(1, unit / 4);
  for (let y = 0; y < height; y += stripe)
    for (let x = 0; x < width; x += unit / 2) {
      const value = 44 + (hash(Math.floor(x * 31 + y * 131) + frame * 977, seed) % 129);
      ctx.fillStyle = `rgb(${value} ${value} ${value})`;
      // This path is used only inside a single native clip. Drawing disjoint
      // opaque receiver cells once maintains the exact compositing bound.
      ctx.fillRect(x, y, Math.min(unit / 2, width - x), Math.min(stripe, height - y));
    }
}

export function drawClassicSignalInterference(
  ctx,
  canvas,
  run,
  signal,
  { unit = 28, reduced = false, timeMs = 0, visualKey = '', treatment = 'contrast-loss' } = {},
) {
  const strength = classicSignalStrength(run, signal);
  if (!strength) return;
  treatment = treatmentName(treatment);
  let receiver = receiverFor(canvas);
  const width = run.level.width * unit,
    height = run.level.height * unit,
    frame = reduced ? 0 : Math.floor((Number.isFinite(timeMs) ? timeMs : 0) / 100),
    key = `${appearanceKey(canvas, run, visualKey)}/${frame}/${strength}/${reduced}/${treatment}`;
  if (receiver && (receiver.owner !== run || receiver.key !== key)) {
    try {
      const image = sampleReceiver(receiver, canvas, run, unit);
      const terrain =
        receiver.terrainOwner === run &&
        receiver.terrainKey === appearanceKey(canvas, run, visualKey)
          ? receiver.terrain
          : null;
      image.data.set(
        classicSignalPixels(image.data, receiver.surface.width, receiver.surface.height, {
          frame,
          seed: run.hazardSeed ?? run.seed ?? 0,
          strength,
          reduced,
          columns: run.level.width,
          rows: run.level.height,
          terrain,
          treatment,
          receiverOnly: true,
          scratch: receiver.scratch,
        }),
      );
      receiver.context.putImageData(image, 0, 0);
      receiver.owner = run;
      receiver.key = key;
    } catch {
      // Readback failures keep a bounded, equally restrictive procedural feed.
      releaseReceiver(canvas, receiver);
      receivers.set(canvas, null);
      receiver = null;
    }
  }
  ctx.save();
  clipUnprotected(ctx, run, signal.sources, unit);
  const blend = classicSignalBlend(strength, treatment);
  ctx.globalAlpha = blend;
  if (receiver) ctx.drawImage(receiver.surface, 0, 0, width, height);
  else drawFallback(ctx, run, { unit, reduced, timeMs: frame * 100, blend });
  ctx.restore();
}

/** Truthful source/range cues are drawn after the processed live feed. */
export function drawClassicSignalSources(ctx, run, signal, { unit = 28, palette = {} } = {}) {
  if (!signal?.sources?.length) return;
  const width = run.level.width * unit,
    height = run.level.height * unit;
  ctx.save();
  ctx.beginPath();
  ctx.rect(0, 0, width, height);
  ctx.clip();
  for (const source of signal.sources) {
    const active = source.phase === 'jamming' && signal.active && !signal.suppressed;
    const warning = source.phase === 'warning' && signal.warning && !signal.suppressed;
    const x = (source.x + 0.5) * unit,
      y = (source.y + 0.5) * unit;
    ctx.strokeStyle = active ? (palette.danger ?? '#ff8478') : (palette.accent ?? '#ffd06c');
    ctx.lineWidth = active || warning ? 1.5 : 1;
    ctx.globalAlpha = active || warning ? 0.68 : 0.24;
    ctx.setLineDash([3, 6]);
    if (source.radius != null) {
      const radius = source.radius * unit;
      for (const dx of run.level.wrap ? [-width, 0, width] : [0])
        for (const dy of run.level.wrap ? [-height, 0, height] : [0]) {
          if (
            x + dx + radius < 0 ||
            x + dx - radius > width ||
            y + dy + radius < 0 ||
            y + dy - radius > height
          )
            continue;
          ctx.beginPath();
          ctx.arc(x + dx, y + dy, radius, 0, Math.PI * 2);
          ctx.stroke();
        }
    } else if (active || warning) ctx.strokeRect(2, 2, width - 4, height - 4);
    ctx.globalAlpha = 1;
    ctx.setLineDash([]);
    // This minimal radio beacon is the sole source-location cue when the
    // jammer's actor, shadow, and badges are concealed with all other enemies.
    ctx.fillStyle = '#162d30';
    const antennaOffsets = source.radius == null ? [-3, 3] : [0];
    ctx.fillRect(x - (source.radius == null ? 7 : 4), y - 9, source.radius == null ? 14 : 8, 17);
    ctx.strokeStyle = '#fff0ad';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    for (const dx of antennaOffsets) {
      ctx.moveTo(x + dx, y + 5);
      ctx.lineTo(x + dx, y - 10);
      ctx.moveTo(x + dx - 3, y - 6);
      ctx.lineTo(x + dx + 3, y - 6);
    }
    ctx.stroke();
    if (active || warning) {
      ctx.beginPath();
      ctx.arc(x, y - 6, 8, -1, 1);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(x, y - 6, 8, Math.PI - 1, Math.PI + 1);
      ctx.stroke();
    }
  }
  // Per-board text/status is owned by the host, outside the playable grid.
  ctx.restore();
}
