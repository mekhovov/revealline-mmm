import { captureRecipe } from '../ui/feedback-cues.mjs';
import { t } from '../i18n/index.mjs';
import { drawActiveTrail, drawCapturePulse } from '../ui/actor-presentation.mjs';
import { drawPresentationImage } from '../ui/presentation-draw-image.mjs';

const CELL = 16;
const CAPTURE_LIFE = 0.65;
const CAPTURE_LIMIT = 2;

/** Team events are replaced every fixed step, so retain a small visual-only
 * history. Repeated host observation and paint in the same tick cannot create
 * another pulse or affect the simulation. */
export function createCoopCaptureFeedback() {
  let owner = null,
    tick = -1,
    time = -1,
    records = [];
  function read(run) {
    if (owner !== run || !['running', 'paused'].includes(run.status)) return Object.freeze([]);
    return Object.freeze(
      records
        .filter((record) => run.time >= record.time && run.time - record.time < CAPTURE_LIFE)
        .map((record) => Object.freeze({ ...record, age: run.time - record.time })),
    );
  }
  function observe(run) {
    if (owner !== run || run.tick < tick || run.time < time) {
      owner = run;
      tick = -1;
      time = -1;
      records = [];
    }
    if (tick !== run.tick) {
      for (const event of run.events ?? []) {
        if (
          event.type !== 'cells.claimed' ||
          !Number.isInteger(event.tick) ||
          event.tick !== run.tick ||
          !Number.isFinite(event.time) ||
          event.time > run.time ||
          !Array.isArray(event.indices)
        )
          continue;
        const indices = [...new Set(event.indices)]
          .filter(
            (index) =>
              Number.isInteger(index) &&
              index >= 0 &&
              index < run.cells.length &&
              run.cells[index] === 1,
          )
          .slice(0, run.cells.length);
        if (!indices.length) continue;
        records.push(
          Object.freeze({
            revealDuration: captureRecipe(event, run).duration,
            tick: event.tick,
            time: event.time,
            indices: Object.freeze(indices),
          }),
        );
      }
      records = records.slice(-CAPTURE_LIMIT);
    }
    tick = run.tick;
    time = run.time;
    records = records.filter(
      (record) => run.time >= record.time && run.time - record.time < CAPTURE_LIFE,
    );
    return read(run);
  }
  return Object.freeze({ observe, read });
}

/** Team paints in cells while the shared reveal primitive paints in 16-unit
 * cells. The pulse remains inside cells that are still authoritatively safe. */
export function drawCoopCaptureFeedback(ctx, effects, run, palette, reduced = false) {
  if (reduced || !effects.length) return;
  ctx.save();
  try {
    ctx.scale(1 / CELL, 1 / CELL);
    for (const effect of effects)
      drawCapturePulse(ctx, effect, run.width, run.cells, palette, reduced);
  } finally {
    ctx.restore();
  }
}

/** Borrow one already prepared frame. A missing legacy binding remains optional;
 * an advertised but malformed frame must not replace the accepted presentation. */
export function prepareCoopWall(snapshot) {
  if (typeof snapshot?.image !== 'function') return null;
  const tile = snapshot.image('terrain.wall');
  if (tile == null) return null;
  const width = tile.image?.naturalWidth ?? tile.image?.width;
  const height = tile.image?.naturalHeight ?? tile.image?.height;
  const pivot = tile.geometry?.pivot;
  if (
    !Number.isFinite(width) ||
    width <= 0 ||
    !Number.isFinite(height) ||
    height <= 0 ||
    !pivot ||
    ![pivot.x, pivot.y].every((value) => Number.isFinite(value) && value >= 0 && value <= 1)
  )
    throw new TypeError(t('interface:teamTerrainNeedsItsPreparedImageAndNormalizedPivot'));
  return tile;
}

export function drawCoopWall(ctx, tile, x, y) {
  if (!tile) return;
  ctx.save();
  try {
    ctx.imageSmoothingEnabled = false;
    drawPresentationImage(ctx, tile.image, x + 0.5, y + 0.5, 1, 1, tile.geometry);
  } finally {
    ctx.restore();
  }
}

/** Team paints in cells; the shared primitive paints in 16-unit cells. Keep
 * authoritative anchors and heads independent of cosmetic body displacement. */
export function drawCoopActiveTrail(ctx, player, accent, { time, reduced, cssCell }) {
  if (!player.trail.length) return;
  const segments = [];
  let previous = player.safeAnchor;
  for (const cell of player.trail) {
    const point = { x: cell.x + 0.5, y: cell.y + 0.5 };
    segments.push({ x1: previous.x, y1: previous.y, x2: point.x, y2: point.y });
    previous = point;
  }
  segments.push({ x1: previous.x, y1: previous.y, x2: player.x, y2: player.y });
  ctx.save();
  try {
    ctx.scale(1 / CELL, 1 / CELL);
    drawActiveTrail(
      ctx,
      segments,
      player.trail,
      player,
      { accent },
      {
        time,
        reduced,
        screenScale: cssCell / CELL,
      },
    );
  } finally {
    ctx.restore();
  }
}
