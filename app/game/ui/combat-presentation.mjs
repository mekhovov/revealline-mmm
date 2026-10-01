import { t } from '../i18n/index.mjs';
import {
  actorDiameter,
  actorScreenScale,
  PRESENTATION_INK,
  PRESENTATION_PLATE,
} from './actor-presentation.mjs';

const CELL = 16;
const live = (view) => view?.valid === true && ['running', 'respawning'].includes(view.status);
const unitFor = (options) => 1 / actorScreenScale(options.screenScale);
const diameterFor = (options) => actorDiameter({ ...options, role: 'enemy', style: 'microtile' });
const colors = (palette = {}) => ({
  body: /^#[\da-f]{6}$/i.test(palette.accent) ? palette.accent : '#79d7ce',
  warning: /^#[\da-f]{6}$/i.test(palette.danger) ? palette.danger : '#ffd27b',
  ink: PRESENTATION_INK,
  plate: PRESENTATION_PLATE,
});
const pixel = (ctx, color, x, y, w, h) => {
  ctx.fillStyle = color;
  ctx.fillRect(x, y, w, h);
};

/** Original16px mechanical silhouettes; native coordinates, no runtime state. */
export function drawCombatPixelBody(ctx, { role, pose = 0 }, palette = {}) {
  if (!['scout', 'sentry'].includes(role) || ![0, 1, 2].includes(pose))
    throw new TypeError(t('interface:chooseARegisteredCombatRoleAndPixelPose'));
  const c = colors(palette);
  ctx.save();
  // Separate open brackets identify removable bodies rather than round keepers.
  for (const x of [0, 14]) {
    pixel(ctx, c.plate, x, 4, 2, 8);
    pixel(ctx, c.ink, x, 4, 2, 1);
    pixel(ctx, c.ink, x, 11, 2, 1);
    pixel(ctx, c.ink, x === 0 ? 0 : 15, 5, 1, 6);
  }
  pixel(ctx, c.plate, 4, 3, 8, 10);
  pixel(ctx, c.body, 5, 4, 6, 7);
  pixel(ctx, c.plate, 5, 5, 6, 3);
  pixel(ctx, c.ink, 6, 6, 4, 1);
  pixel(ctx, c.ink, 7, 9, 2, 1);
  const feet = pose === 1 ? [13, 11] : pose === 2 ? [11, 13] : [12, 12];
  for (const [i, x] of [4, 9].entries()) {
    pixel(ctx, c.plate, x, 10, 3, feet[i] - 8);
    pixel(ctx, c.body, x + 1, 11, 1, feet[i] - 9);
    pixel(ctx, c.ink, x, feet[i] + 1, 3, 1);
  }
  if (role === 'sentry') {
    pixel(ctx, c.plate, 3, 0, 10, 4);
    pixel(ctx, c.warning, 4, 1, 8, 2);
    pixel(ctx, c.ink, 7, 0, 2, 3);
  } else {
    pixel(ctx, c.plate, 6, 1, 4, 3);
    pixel(ctx, c.body, 7, 2, 2, 2);
  }
  ctx.restore();
}

/** Bounded per-painter sprite cache, never a cache of runs or actor references. */
export function createCombatPresentation({
  createCanvas = () => document.createElement('canvas'),
} = {}) {
  let paletteKey = '',
    sprites = new Map();
  function sprite(role, pose, palette) {
    const key = JSON.stringify(colors(palette));
    if (paletteKey !== key) {
      paletteKey = key;
      sprites = new Map();
    }
    const id = `${role}:${pose}`;
    if (!sprites.has(id)) {
      const canvas = createCanvas();
      canvas.width = canvas.height = 16;
      const ctx = canvas.getContext('2d');
      if (!ctx) throw new Error(t('interface:combatPixelPresentationRequiresA2dCanvas'));
      drawCombatPixelBody(ctx, { role, pose }, palette);
      sprites.set(id, canvas);
    }
    return sprites.get(id);
  }
  return Object.freeze({
    reset() {
      paletteKey = '';
      sprites = new Map();
    },
    drawActors(ctx, view, palette, options = {}) {
      if (!live(view)) return false;
      const u = unitFor(options),
        c = colors(palette);
      const size = diameterFor(options);
      ctx.save();
      ctx.globalAlpha = 1;
      ctx.imageSmoothingEnabled = false;
      for (const actor of view.actors) {
        const moving =
          !options.reduced &&
          !view.frozen &&
          actor.phase === 'cooldown' &&
          Math.hypot(actor.vx, actor.vy) > 0;
        const pose = moving ? 1 + (Math.floor(view.actorTick / 24) % 2) : 0;
        const x = actor.x * CELL,
          y = actor.y * CELL;
        ctx.drawImage(sprite(actor.role, pose, palette), x - size / 2, y - size / 2, size, size);
        // This exact collision footprint is separate from enlarged body artwork.
        ctx.setLineDash([]);
        for (const [ink, width] of [
          [c.plate, 3 * u],
          [c.ink, u],
        ]) {
          ctx.strokeStyle = ink;
          ctx.lineWidth = width;
          ctx.beginPath();
          ctx.arc(x, y, actor.radius * CELL, 0, Math.PI * 2);
          ctx.stroke();
        }
        pixel(ctx, c.plate, x - u, y - u, 2 * u, 2 * u);
        pixel(ctx, c.ink, x - u / 2, y - u / 2, u, u);
        if (view.frozen) pauseMark(ctx, x, y - size / 2 - 4 * u, u, c);
        else if (actor.phase === 'recovery') {
          pixel(ctx, c.plate, x - 4 * u, y - size / 2 - 4 * u, 8 * u, 3 * u);
          pixel(ctx, c.ink, x - 3 * u, y - size / 2 - 3 * u, 6 * u, u);
        }
      }
      ctx.restore();
      return true;
    },
  });
}

function pauseMark(ctx, x, y, unit, c) {
  pixel(ctx, c.plate, x - 4 * unit, y - 3 * unit, 8 * unit, 6 * unit);
  for (const dx of [-2, 1]) pixel(ctx, c.ink, x + dx * unit, y - 2 * unit, unit, 4 * unit);
}

/** Place beneath the live trail/craft. Shape, not colour or audio, carries warning. */
export function drawCombatWarnings(ctx, view, palette, options = {}) {
  if (!live(view)) return false;
  const u = unitFor(options),
    c = colors(palette);
  ctx.save();
  ctx.globalAlpha = 1;
  for (const actor of view.actors) {
    if (actor.phase !== 'warning') continue;
    const x = actor.x * CELL,
      y = actor.y * CELL;
    ctx.setLineDash([4 * u, 3 * u]);
    for (const [ink, width] of [
      [c.plate, 3 * u],
      [c.ink, u],
    ]) {
      ctx.strokeStyle = ink;
      ctx.lineWidth = width;
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(actor.rayEnd.x * CELL, actor.rayEnd.y * CELL);
      ctx.stroke();
    }
    ctx.setLineDash([]);
    const ax = actor.aim.x * CELL,
      ay = actor.aim.y * CELL;
    for (const [ink, width] of [
      [c.plate, 3 * u],
      [c.ink, u],
    ]) {
      ctx.strokeStyle = ink;
      ctx.lineWidth = width;
      ctx.beginPath();
      ctx.moveTo(ax - 3 * u, ay);
      ctx.lineTo(ax + 3 * u, ay);
      ctx.moveTo(ax, ay - 3 * u);
      ctx.lineTo(ax, ay + 3 * u);
      ctx.stroke();
    }
    const fraction = Math.max(0, Math.min(1, actor.warningTicks / actor.warningTotal));
    const barTop = y + diameterFor(options) / 2 + 2 * u;
    pixel(ctx, c.plate, x - 7 * u, barTop, 14 * u, 6 * u);
    pixel(ctx, c.ink, x - 6 * u, barTop + u, 12 * u, 4 * u);
    pixel(ctx, c.plate, x - 5 * u, barTop + 2 * u, 10 * u, 2 * u);
    pixel(ctx, c.warning, x - 5 * u, barTop + 2 * u, 10 * u * fraction, 2 * u);
    if (view.frozen) pauseMark(ctx, x, barTop + 10 * u, u, c);
  }
  ctx.restore();
  return true;
}

/** Place above static territory but below the craft; shots never disappear in reduced mode. */
export function drawCombatProjectiles(ctx, view, palette, options = {}) {
  if (!live(view)) return false;
  const u = unitFor(options),
    c = colors(palette);
  ctx.save();
  ctx.globalAlpha = 1;
  ctx.setLineDash([]);
  for (const shot of view.projectiles) {
    const x = shot.x * CELL,
      y = shot.y * CELL;
    const length = Math.hypot(shot.vx, shot.vy) || 1;
    const dx = shot.vx / length,
      dy = shot.vy / length;
    for (const [ink, width] of [
      [c.plate, 3 * u],
      [c.ink, u],
    ]) {
      ctx.strokeStyle = ink;
      ctx.lineWidth = width;
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x - dx * 9 * u, y - dy * 9 * u);
      ctx.stroke();
    }
    for (const [ink, radius] of [
      [c.plate, 4 * u],
      [c.ink, 3 * u],
    ]) {
      ctx.fillStyle = ink;
      ctx.beginPath();
      ctx.moveTo(x, y - radius);
      ctx.lineTo(x + radius, y);
      ctx.lineTo(x, y + radius);
      ctx.lineTo(x - radius, y);
      ctx.closePath();
      ctx.fill();
    }
    pixel(ctx, c.plate, x - u / 2, y - u / 2, u, u);
    if (view.frozen) pauseMark(ctx, x, y - 7 * u, u, c);
  }
  ctx.restore();
  return true;
}

/** Inert scrap and short local sparks only. Call before hazards, trail and craft. */
export function drawCombatScrap(ctx, view, palette, options = {}) {
  if (view?.valid !== true) return false;
  const u = unitFor(options),
    c = colors(palette);
  ctx.save();
  ctx.globalAlpha = 1;
  for (const mark of view.eliminations) {
    const x = mark.x * CELL,
      y = mark.y * CELL;
    if (options.showScrap !== false) {
      pixel(ctx, c.plate, x - 4 * u, y - 2 * u, 8 * u, 4 * u);
      pixel(ctx, c.ink, x - 3 * u, y - u, 3 * u, u);
      pixel(ctx, c.body, x + u, y, 2 * u, u);
    }
    const age = view.tick - mark.tick;
    if (!options.reduced && live(view) && age >= 0 && age < 30) {
      const offset = (3 + Math.floor(age / 10)) * u;
      const points =
        mark.cause === 'ram'
          ? [
              [-1, -1],
              [1, -1],
              [-1, 1],
              [1, 1],
            ]
          : [
              [-1, 0],
              [1, 0],
              [0, -1],
              [0, 1],
            ];
      for (const [dx, dy] of points) {
        pixel(ctx, c.plate, x + dx * offset - u, y + dy * offset - u, 3 * u, 3 * u);
        pixel(ctx, c.ink, x + dx * offset, y + dy * offset, u, u);
      }
    }
  }
  ctx.restore();
  return true;
}
