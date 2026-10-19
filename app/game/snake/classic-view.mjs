import { COUPA_PALETTE } from './coupa-art.mjs';

import { drawClassicCachedTerrain, classicTerrainImageKey } from './classic-terrain-cache.mjs';
import { drawClassicOperation, drawClassicOperationLinks } from './classic-operation-view.mjs';




import { createClassicTargetFacing, drawClassicTarget } from './classic-target-art.mjs';
import { drawClassicDrone, drawClassicCable } from './classic-flight-art.mjs';
export { drawClassicTarget } from './classic-target-art.mjs';
import { CLASSIC_SNAKE_CHAPTERS } from './classic-catalogue.mjs';
import { classicSnakeSignalView, classicSnakeContactHazardV4 } from './classic-core.mjs';

import {
  captureClassicSignalTerrain,
  classicSignalStrength,
  drawClassicSignalInterference,
  drawClassicSignalSources,
} from './classic-signal-view.mjs';


const UNIT = 28;
const targetFacings = new WeakMap();
const signalTerrainVersions = new WeakMap();
function signalTerrainVersion(canvas, image) {
  const previous = signalTerrainVersions.get(canvas);
  if (previous && previous.image === image) return previous.version;
  const version = (previous?.version ?? 0) + 1;
  signalTerrainVersions.set(canvas, { image, version });
  return version;
}
const INKS = [
  { body: '#153d61', edge: '#65b6ff', band: '#ffe16b' },
  { body: '#4b285e', edge: '#e3b5ff', band: '#ffffff' },
];
const ACCENT_COLORS = Object.freeze(
  [
    ['#153d61', '#65b6ff', '#ffe16b'],
    ['#4b285e', '#e3b5ff', '#ffffff'],
    ['#174c43', '#8fe2bc', '#e8ffe9'],
    ['#55431d', '#ffcd76', '#fff0c7'],
    ['#562e28', '#ffaa91', '#ffedcf'],
    ['#38315c', '#bfb0ff', '#eff0ff'],
    ['#34424c', '#c4dbea', '#ffffff'],
    ['#354923', '#c7e887', '#efffcc'],
    ['#1a4657', '#86d9f5', '#e9faff'],
    ['#512d40', '#f8b1d4', '#ffe8f3'],
    ['#174c4a', '#71ded2', '#d8fff5'],
    ['#483153', '#d9b6f2', '#f5eaff'],
    ['#51401f', '#eace86', '#fff0c9'],
    ['#243e52', '#b0e0ff', '#f0fbff'],
  ].map(([body, edge, band]) => Object.freeze({ body, edge, band })),
);
const accents = new Map(
  CLASSIC_SNAKE_CHAPTERS.map((chapter, i) => [chapter.id, ACCENT_COLORS[i % ACCENT_COLORS.length]]),
);
const pilotInk = (id, accent) => (id ? INKS[id % INKS.length] : (accents.get(accent) ?? INKS[0]));
const FALLBACK_PALETTE = Object.freeze({
  field: '#071527',
  alternate: '#10243e',
  grid: '#26394e',
  text: '#f6f3e8',
  muted: '#a8b8cc',
  accent: '#ffd64a',
  safe: '#67aaff',
  danger: '#ff7169',
});
export const RETRO_FIELD_PALETTE = Object.freeze({
  field: '#c5cfaa',
  alternate: '#d5dbba',
  grid: '#8a9b76',
  text: '#162b24',
  muted: '#61765d',
  accent: '#946516',
  safe: '#29643e',
  danger: '#8c2348',
});
const RETRO_INKS = [
  { body: '#276340', edge: '#153e2c', band: '#b3df76' },
  { body: '#6c457b', edge: '#3e274d', band: '#edd0f4' },
];
export function classicCatchMarks(run) {
  return run.recentCatches.map((mark) => ({
    ...mark,
    kind: mark.kind ?? 'runner',
    cause: 'ram',
    x: mark.x + 0.5,
    y: mark.y + 0.5,
  }));
}

function drawWall(ctx, wall, presentation, palette, retro = false) {
  const x = wall.x * UNIT,
    y = wall.y * UNIT,
    image = retro ? null : presentation?.image?.('terrain.wall');
  if (image) ctx.drawImage(image, x, y, UNIT, UNIT);
  else {
    ctx.fillStyle = retro ? '#3d4e41' : '#425563';
    ctx.fillRect(x, y, UNIT, UNIT);
    ctx.fillStyle = retro ? '#75856b' : '#a5b2bb';
    ctx.fillRect(x + 2, y + 2, UNIT - 4, 4);
    ctx.fillStyle = retro ? '#26392d' : '#182531';
    ctx.fillRect(x, y + 14, UNIT, 2);
  }
  ctx.strokeStyle = palette.muted;
  ctx.lineWidth = 1;
  ctx.strokeRect(x + 0.5, y + 0.5, UNIT - 1, UNIT - 1);
}

function drawShutters(ctx, run, palette) {
  for (const shutter of run.shutters ?? [])
    for (const cell of shutter.cells) {
      const x = cell.x * UNIT,
        y = cell.y * UNIT;
      ctx.save();
      ctx.strokeStyle = shutter.closed
        ? palette.danger
        : shutter.warning
          ? palette.accent
          : palette.safe;
      ctx.lineWidth = shutter.closed ? 3 : 2;
      ctx.setLineDash(shutter.closed ? [] : [4, 3]);
      if (shutter.closed) {
        ctx.fillStyle = '#26313e';
        ctx.fillRect(x, y, UNIT, UNIT);
        ctx.fillStyle = '#657984';
        ctx.fillRect(x + 3, y + 3, 9, 22);
        ctx.fillRect(x + 16, y + 3, 9, 22);
        ctx.fillStyle = '#172831';
        ctx.fillRect(x + 13, y + 1, 2, 26);
        ctx.strokeRect(x + 1.5, y + 1.5, UNIT - 3, UNIT - 3);
        ctx.beginPath();
        ctx.moveTo(x + 6, y + 6);
        ctx.lineTo(x + 22, y + 22);
        ctx.moveTo(x + 22, y + 6);
        ctx.lineTo(x + 6, y + 22);
        ctx.stroke();
      } else {
        ctx.fillStyle = '#829593';
        ctx.fillRect(x, y, 2, UNIT);
        ctx.fillRect(x + UNIT - 2, y, 2, UNIT);
        ctx.strokeRect(x + 2, y + 2, UNIT - 4, UNIT - 4);
        if (shutter.warning || shutter.yielding) {
          ctx.setLineDash([]);
          ctx.fillStyle = palette.accent;
          ctx.fillRect(x + 3, y + 3, 5, 3);
          ctx.fillRect(x + 20, y + 22, 5, 3);
        }
      }
      ctx.restore();
    }
}

function drawPickup(ctx, pickup) {
  if (!pickup) return;
  const x = pickup.x * UNIT,
    y = pickup.y * UNIT;
  ctx.save();
  ctx.translate(x + UNIT / 2, y + UNIT / 2);
  ctx.fillStyle = '#071527';
  ctx.strokeStyle = '#d4f5ff';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(0, -12);
  ctx.lineTo(12, 0);
  ctx.lineTo(0, 12);
  ctx.lineTo(-12, 0);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  if (pickup.kind === 'pulse') {
    ctx.fillStyle = '#d4f5ff';
    ctx.fillRect(-5, -5, 3, 10);
    ctx.fillRect(2, -5, 3, 10);
  } else {
    ctx.strokeStyle = '#ffe16b';
    ctx.beginPath();
    ctx.arc(0, 0, 5, 0, Math.PI * 2);
    ctx.stroke();
    ctx.fillStyle = '#ffe16b';
    ctx.fillRect(-2, -2, 4, 4);
  }
  ctx.restore();
}

function drawConcealedContactEdges(ctx, run, target, palette) {
  // Contact hazards stay truthful without actor silhouettes or cosmetic
  // tracking cues. Use the simulation's pre-step lethal approach predicate.
  const x = target.x * UNIT,
    y = target.y * UNIT,
    edges = [
      [0, -1, x + 2, y + 2, x + UNIT - 2, y + 2],
      [1, 0, x + UNIT - 2, y + 2, x + UNIT - 2, y + UNIT - 2],
      [0, 1, x + 2, y + UNIT - 2, x + UNIT - 2, y + UNIT - 2],
      [-1, 0, x + 2, y + 2, x + 2, y + UNIT - 2],
    ].filter(([dx, dy]) => {
      const from = { x: target.x + dx, y: target.y + dy };
      if (run.level.wrap) {
        from.x = (from.x + run.level.width) % run.level.width;
        from.y = (from.y + run.level.height) % run.level.height;
      }
      return classicSnakeContactHazardV4(run.level, target, from);
    });
  if (!edges.length) return;
  ctx.save();
  ctx.strokeStyle = palette.danger;
  ctx.lineWidth = 3;
  ctx.setLineDash([]);
  ctx.beginPath();
  for (const [, , left, top, right, bottom] of edges) {
    ctx.moveTo(left, top);
    ctx.lineTo(right, bottom);
  }
  ctx.stroke();
  ctx.restore();
}

function drawFieldMechanics(ctx, run, palette, { concealEnemies = false } = {}) {
  if (!run.relays) return;
  for (const relay of run.relays) {
    const target = run.targets.find((actor) => actor.id === relay.ownerId);
    if (!target) continue;
    ctx.save();
    ctx.strokeStyle = relay.collected ? palette.safe : palette.accent;
    // Pads remain route landmarks, but their cosmetic link must not disclose
    // an otherwise concealed relay owner's current position.
    if (!concealEnemies) {
      ctx.globalAlpha = 0.35;
      ctx.setLineDash([3, 7]);
      ctx.beginPath();
      ctx.moveTo((target.x + 0.5) * UNIT, (target.y + 0.5) * UNIT);
      ctx.lineTo((relay.x + 0.5) * UNIT, (relay.y + 0.5) * UNIT);
      ctx.stroke();
    }
    ctx.globalAlpha = 1;
    ctx.setLineDash([]);
    const x = (relay.x + 0.5) * UNIT,
      y = (relay.y + 0.5) * UNIT;
    ctx.beginPath();
    ctx.moveTo(x, y - 9);
    ctx.lineTo(x + 9, y);
    ctx.lineTo(x, y + 9);
    ctx.lineTo(x - 9, y);
    ctx.closePath();
    ctx.fillStyle = palette.field;
    ctx.fill();
    ctx.stroke();
    if (relay.collected) {
      ctx.beginPath();
      ctx.moveTo(x - 5, y);
      ctx.lineTo(x - 1, y + 4);
      ctx.lineTo(x + 5, y - 4);
      ctx.stroke();
    }
    ctx.restore();
  }
  for (const target of run.targets) {
    if (concealEnemies) drawConcealedContactEdges(ctx, run, target, palette);
    const policy = run.level.targets.required[target.policyIndex];
    const warning = target.phase === 'warning',
      active = target.phase === 'active';
    if (target.kind === 'lane' && (warning || active)) {
      const { axis, from, to } = policy.lane;
      ctx.save();
      ctx.strokeStyle = warning ? palette.accent : palette.danger;
      ctx.fillStyle = palette.danger;
      ctx.lineWidth = active ? 3 : 2;
      ctx.setLineDash(warning ? [5, 4] : []);
      for (let at = from; at <= to; at++) {
        const x = (axis === 'x' ? at : target.x) * UNIT;
        const y = (axis === 'y' ? at : target.y) * UNIT;
        if (active) {
          ctx.globalAlpha = 0.22;
          ctx.fillRect(x, y, UNIT, UNIT);
          ctx.globalAlpha = 1;
        }
        ctx.strokeRect(x + 3, y + 3, UNIT - 6, UNIT - 6);
      }
      ctx.restore();
    }
    if (target.kind === 'guard' && warning) {
      const vector = { up: [0, -1], right: [1, 0], down: [0, 1], left: [-1, 0] }[target.heading];
      ctx.save();
      ctx.strokeStyle = palette.accent;
      ctx.setLineDash([5, 4]);
      ctx.beginPath();
      ctx.moveTo((target.x + 0.5) * UNIT, (target.y + 0.5) * UNIT);
      ctx.lineTo(
        (target.x + 0.5 + vector[0] * 48) * UNIT,
        (target.y + 0.5 + vector[1] * 48) * UNIT,
      );
      ctx.stroke();
      ctx.restore();
    }
    if (target.kind === 'eroder') {
      for (const cell of policy.breaks) {
        if (run.removedWalls.some((removed) => removed.x === cell.x && removed.y === cell.y))
          continue;
        const x = cell.x * UNIT,
          y = cell.y * UNIT;
        ctx.save();
        ctx.strokeStyle = warning ? palette.accent : palette.muted;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(x + 9, y + 3);
        ctx.lineTo(x + 16, y + 11);
        ctx.lineTo(x + 10, y + 17);
        ctx.lineTo(x + 18, y + 25);
        ctx.stroke();
        ctx.restore();
      }
    }
  }
  for (const shot of run.projectiles) {
    const [dx, dy] = { up: [0, -1], right: [1, 0], down: [0, 1], left: [-1, 0] }[shot.heading];
    ctx.save();
    ctx.fillStyle = palette.danger;
    ctx.strokeStyle = palette.accent;
    ctx.fillRect(shot.x * UNIT + 9, shot.y * UNIT + 9, 10, 10);
    ctx.setLineDash([3, 3]);
    ctx.strokeRect((shot.x + dx) * UNIT + 4, (shot.y + dy) * UNIT + 4, UNIT - 8, UNIT - 8);
    ctx.restore();
  }
}

export function drawClassicBoard(
  canvas,
  run,
  {
    effects,
    brutal = false,
    blood = true,
    showRemains = true,
    style = 'cable',
    boardStyle = 'theme',
    boardScene = 'auto',
    chapterId = '',
    cast = 'rivals',
    artRevision = runtimeActorArtRevision(),
    presentation,
    accent = null,
    reduced = false,
    flight = {},
    attemptKey = run,
    pixelRatio = 1,
    cssWidth,
    locale = 'en',
    signalTreatment = 'contrast-loss',
    // Explicit visual-fixture comparison only; no gameplay preference or URL
    // setting enables the original partially visible enemy treatment.
    signalDiagnosticOriginal = false,
    terrainCache = true,
    effectTimeMs,
  } = {},
) {
  boardStyle = 'coupa'; cast = 'coupa'; artRevision = null;
  brutal = false; blood = false; showRemains = false; effects = null;
  presentation = { palette: COUPA_PALETTE }; style = 'segmented';
  const { width, height, walls, wrap } = run.level,
    retro = boardStyle === 'retro',
    living = isClassicWorldStyle(boardStyle),
    world = resolveClassicWorld({ boardStyle, boardScene, chapterId, levelId: run.level.id }),
    scene = world.scene,
    palette = retro
      ? RETRO_FIELD_PALETTE
      : living
        ? classicScenePalette(scene, world.treatment)
        : (presentation?.palette ?? FALLBACK_PALETTE);
  const logicalWidth = width * UNIT,
    logicalHeight = height * UNIT,
    signal = classicSnakeSignalView(run),
    concealEnemies = !signalDiagnosticOriginal && classicSignalStrength(run, signal) > 0;
  const resolution = Math.max(
    1,
    Math.min(
      3,
      ((Number.isFinite(cssWidth) && cssWidth > 0 ? cssWidth : logicalWidth) / logicalWidth) *
        (Number.isFinite(pixelRatio) ? Math.max(1, Math.min(2, pixelRatio)) : 1),
    ),
  );
  // Half-step scales preserve the exact grid aspect ratio while avoiding
  // bitmap/CSS feedback when the responsive footprint is measured again.
  const stableResolution = Math.ceil(resolution * 2) / 2;
  const bitmapWidth = logicalWidth * stableResolution,
    bitmapHeight = logicalHeight * stableResolution;
  if (canvas.width !== bitmapWidth || canvas.height !== bitmapHeight) {
    canvas.width = bitmapWidth;
    canvas.height = bitmapHeight;
    canvas.style.aspectRatio = `${width} / ${height}`;
  }
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  ctx.setTransform(bitmapWidth / logicalWidth, 0, 0, bitmapHeight / logicalHeight, 0, 0);
  ctx.imageSmoothingEnabled = false;
  const removed = new Set((run.removedWalls ?? []).map(({ x, y }) => `${x},${y}`));
  const visibleWalls = walls.filter(({ x, y }) => !removed.has(`${x},${y}`));
  const occupied = new Set(visibleWalls.map(({ x, y }) => `${x},${y}`));
  const wallAsset = presentation?.asset?.('terrain.wall')?.asset;
  const wallImage = presentation?.image?.('terrain.wall');
  // An image-only provider is also creator-owned. Only positively identified
  // built-in art may be replaced by the procedural construction kit.
  const creatorWall = wallAsset
    ? wallAsset.id !== 'terrain.wall.field-kit' ||
      !INDUSTRIAL_BUILTIN_SPRITES['terrain.wall'].includes(wallAsset.file?.sha256)
    : Boolean(wallImage);
  const structuredTerrain =
    !retro && !creatorWall && (living || boardStyle === 'theme' || Boolean(wallAsset));
  const structures = structuredTerrain ? classicWallStructures(visibleWalls) : null;
  const terrainKey = JSON.stringify([
    run.level.id,
    width,
    height,
    visibleWalls,
    boardStyle,
    world,
    palette,
    wallAsset,
    classicTerrainImageKey(presentation?.image?.('terrain.wall')),
    presentation?.environment ?? null,
  ]);
  drawClassicCachedTerrain(
    ctx,
    canvas.ownerDocument,
    terrainKey,
    logicalWidth,
    logicalHeight,
    (ctx) => {
      ctx.fillStyle = palette.field;
      ctx.fillRect(0, 0, logicalWidth, logicalHeight);
      if (living)
        drawClassicLivingGround(ctx, run.level, scene, {
          unit: UNIT,
          document: canvas.ownerDocument,
          treatment: world.treatment,
          zoning: world.zoning,
          composition: world,
        });
      else {
        ctx.fillStyle = palette.alternate;
        ctx.globalAlpha = 0.42;
        for (let y = 0; y < height; y++)
          for (let x = 0; x < width; x++)
            if ((x + y) % 2 === 0) ctx.fillRect(x * UNIT, y * UNIT, UNIT, UNIT);
      }
      // Fine grid and sparse surface grain echo the main game's terrain without
      // competing with silhouettes or pretending to be additional obstacles.
      ctx.globalAlpha = living ? 0.65 : 0.17;
      ctx.strokeStyle = palette.grid;
      ctx.lineWidth = 0.5;
      ctx.beginPath();
      for (let x = 1; x < width; x++) {
        ctx.moveTo(x * UNIT, 0);
        ctx.lineTo(x * UNIT, logicalHeight);
      }
      for (let y = 1; y < height; y++) {
        ctx.moveTo(0, y * UNIT);
        ctx.lineTo(logicalWidth, y * UNIT);
      }
      ctx.stroke();
      ctx.fillStyle = palette.muted;
      ctx.globalAlpha = 0.08;
      for (let y = 0; y < height; y++)
        for (let x = 0; x < width; x++) {
          if ((x * 7 + y * 11) % 5 === 0) ctx.fillRect(x * UNIT + 8, y * UNIT + 8, 1, 1);
        }
      ctx.globalAlpha = 1;
      for (const wall of visibleWalls) {
        if (structuredTerrain)
          drawClassicLivingWall(ctx, wall, scene, {
            unit: UNIT,
            document: canvas.ownerDocument,
            treatment: world.treatment,
            occupied,
            structure: structures.get(`${wall.x},${wall.y}`),
            composition: world,
          });
        else drawWall(ctx, wall, presentation, palette, retro);
      }
    },
    terrainCache,
  );
  if (showRemains && !concealEnemies) {
    ctx.save();
    ctx.scale(UNIT / 16, UNIT / 16);
    for (const mark of classicCatchMarks(run))
      drawHuntRemains(ctx, mark, { brutal, blood, artRevision });
    ctx.restore();
  }
  if (effects && !concealEnemies) {
    ctx.save();
    ctx.scale(UNIT / 16, UNIT / 16);
    effects.draw(ctx);
    ctx.restore();
  }
  ctx.globalAlpha = 1;
  const visualTimeMs = Number.isFinite(flight.timeMs)
    ? flight.timeMs
    : (run.elapsedMs ?? 0) % 60000;
  const reactionTimeMs = Number.isFinite(effectTimeMs) ? effectTimeMs : visualTimeMs;
  const worldEffects = observeClassicWorldReactions(canvas, run, attemptKey, reactionTimeMs);
  if (structuredTerrain)
    drawClassicWorldEquipment(ctx, run, world, {
      unit: UNIT,
      palette,
      timeMs: reactionTimeMs,
      reduced,
    });
  drawClassicOperationLinks(ctx, run, { unit: UNIT, palette });
  drawShutters(ctx, run, palette);
  drawPickup(ctx, run.pickup);
  ctx.lineWidth = 3;
  ctx.strokeStyle = wrap ? palette.accent : palette.muted;
  ctx.setLineDash(wrap ? [7, 7] : []);
  ctx.strokeRect(1.5, 1.5, logicalWidth - 3, logicalHeight - 3);
  ctx.setLineDash([]);
  const signalVisualKey = JSON.stringify([
    boardStyle,
    world,
    scene,
    style,
    cast,
    artRevision,
    accent,
    brutal,
    blood,
    showRemains,
    concealEnemies,
    palette,
    // Artwork may finish loading while a burst is paused at the same tick.
    signalTerrainVersion(
      canvas,
      retro || structuredTerrain ? null : presentation?.image?.('terrain.wall'),
    ),
  ]);
  // Keep current terrain separate from moving actors. During a receiver
  // dropout the degraded branch must not duplicate their full live contrast.
  if (signal.active && !signal.suppressed && signalTreatment === 'contrast-loss')
    captureClassicSignalTerrain(canvas, run, { unit: UNIT, visualKey: signalVisualKey });
  const targets = run.targets ?? (run.target ? [run.target] : []);
  if (!targetFacings.has(canvas)) targetFacings.set(canvas, createClassicTargetFacing());
  const headings = targetFacings.get(canvas)(run, attemptKey);
  // Omit actors before receiver sampling, not merely beneath the noise. This
  // also hides nearby enemies inside the protected head regions and prevents
  // shadows, labels, badges, and the clean-feed fraction leaking their motion.
  for (const target of concealEnemies ? [] : targets) {
    drawClassicTarget(
      ctx,
      target.x * UNIT,
      target.y * UNIT,
      UNIT,
      reduced || target.kind === 'still' || run.pulseTicks > 0 ? 0 : run.tick % 3,
      {
        ...target,
        heading: headings.get(target.id),
        cast,
        boardStyle,
        artRevision,
        cssUnit: (cssWidth ?? canvas.clientWidth ?? run.level.width * UNIT) / run.level.width,
        direction:
          target.kind === 'still' || (target.kind === 'sprinter' && target.phase === 'rest')
            ? undefined
            : target.heading,
        frozen: run.pulseTicks > 0,
        palette,
        timeMs: flight.timeMs,
        reducedEffects: reduced,
      },
    );
  }
  ctx.globalAlpha = 1;
  for (const snake of run.snakes) {
    const ink = retro ? RETRO_INKS[snake.id % 2] : pilotInk(snake.id, accent);
    drawClassicCable(ctx, snake, ink, run.level, {
      style: retro ? 'segmented' : style,
      ...flight,
      reduced,
    });
    drawClassicDrone(ctx, snake, ink, { ...flight, reduced });
    if (!snake.alive) {
      const head = snake.body[0];
      ctx.strokeStyle = palette.danger;
      ctx.lineWidth = 4;
      ctx.strokeRect(head.x * UNIT + 1, head.y * UNIT + 1, UNIT - 2, UNIT - 2);
    }
  }
  // A failed step keeps the previous legal body. Mark the attempted impact
  // cell as well, so the frozen failure image identifies the actual obstacle.
  for (const failure of run.failure?.players ?? []) {
    if (!failure.at) continue;
    const x = Math.max(0, Math.min(width - 1, failure.at.x)) * UNIT,
      y = Math.max(0, Math.min(height - 1, failure.at.y)) * UNIT;
    ctx.strokeStyle = '#071527';
    ctx.lineWidth = 7;
    ctx.strokeRect(x + 3, y + 3, UNIT - 6, UNIT - 6);
    ctx.strokeStyle = palette.danger;
    ctx.lineWidth = 3;
    ctx.strokeRect(x + 3, y + 3, UNIT - 6, UNIT - 6);
    ctx.beginPath();
    ctx.moveTo(x + 8, y + 8);
    ctx.lineTo(x + 20, y + 20);
    ctx.moveTo(x + 20, y + 8);
    ctx.lineTo(x + 8, y + 20);
    ctx.stroke();
  }
  drawClassicSignalInterference(ctx, canvas, run, signal, {
    unit: UNIT,
    reduced,
    timeMs: flight.timeMs,
    palette,
    treatment: signalTreatment,
    visualKey: signalVisualKey,
  });
  drawClassicOperation(ctx, run, { unit: UNIT, palette, boardStyle });
  drawClassicWorldReactions(ctx, run, worldEffects, world, {
    unit: UNIT,
    palette,
    timeMs: reactionTimeMs,
    reduced,
    concealEnemies,
  });
  // True hazard outlines stay crisp at native resolution after receiver processing.
  drawFieldMechanics(ctx, run, palette, { concealEnemies });
  drawClassicSignalSources(ctx, run, signal, { unit: UNIT, palette, locale });
}

function runtimeActorArtRevision(){ return null; }
function isClassicWorldStyle(){ return false; }
function resolveClassicWorld(){ return { scene: null }; }
const INDUSTRIAL_BUILTIN_SPRITES = { 'terrain.wall': [] };
function observeClassicWorldReactions(){ return null; }
function drawClassicWorldReactions(){}
function drawClassicWorldEquipment(){}
function drawHuntRemains(){}
