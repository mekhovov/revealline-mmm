import { createActorDefeatPresentation } from './actor-defeat-presentation.mjs';
import {
  sharedBattlefieldGround,
  createBattlefieldGroundSurface,
  battlefieldGroundAllowed,
  paintBattlefieldGroundSpan,
} from '../presentation/battlefield-ground.mjs';
import { requireAcceptedAttemptAppearance } from '../presentation/attempt-appearance.mjs';
import { canvasInterfaceFonts } from '../presentation/theme-system.mjs';
import { createHuntDestruction } from '../hunt/destruction.mjs';
import { runtimeActorArtRevision } from '../hunt/preferences.mjs';
import { preparedRotorRecipe } from './rotor-presentation.mjs';
import {
  createArcadeAdapter,
  getArcadeCollection,
  selectedArcadeCollection,
} from '../presentation/industrial-arcade.mjs';
import { contactCueUnderstroke } from './contact-cue.mjs';
import { t } from '../i18n/index.mjs';
import { canvasTextFonts } from '../text-face.mjs';
import { presentationEvent, drawEventFeedback, drawRecoveryCue } from './event-feedback.mjs';
import { geometryForLevel, geometryForRun } from '../core/geometry.mjs';
import { drawPresentationImage } from './presentation-draw-image.mjs';
import { createDemoPictureFilter } from './demo-picture.mjs';
import { createJammerPictureFilter, jammerPictureStrength } from './jammer-picture.mjs';
import { createSignalReception } from './signal-reception.mjs';
import { drawEncounterLane, drawEncounterCore } from './encounter-view.mjs';
import { drawLaneAttack } from './lane-presentation.mjs';
import {
  drawClassicTerrain,
  drawClassicPickups,
  drawClassicEnemy,
  drawClassicStatus,
  drawLineImpacts,
  drawEnemyPressure,
} from './classic-view.mjs';
import { combatView } from './combat-view.mjs';
import { drawSnakeBody, drawSnakeTargetOrder } from './snake-view.mjs';
import {
  createCombatPresentation,
  drawCombatScrap,
  drawCombatWarnings,
  drawCombatProjectiles,
} from './combat-presentation.mjs';
import { foundationCompatibleView as classicView } from './foundation-view.mjs';
import { drawRelayGates, drawRelayTriggers, relayView } from './relay-view.mjs';
import { drawDirectionalFields, directionalView } from './directional-view.mjs';
import { createAnimationState, advanceAnimation } from '../../authoring/motion-lab/animation.mjs';
import { fittedBodySize, paintCharacter } from '../../authoring/motion-lab/render-character.mjs';
import { playerBodyOffset } from './player-body-layout.mjs';
import { bodyMotionPose } from './body-motion.mjs';
import { createBodyBackingOwner } from './body-backing.mjs';
import { createSceneArt } from './scene-art.mjs';
import { createEnemyBodyAssets } from './enemy-body-assets.mjs';
import {
  createActorPresentation,
  actorDiameter,
  actorImagePaintMetrics,
  actorScreenScale,
  actorLogicalLimit,
  drawPresentedActor,
  drawActiveTrail,
  drawCapturePulse,
  PRESENTATION_INK,
  PRESENTATION_PLATE,
} from './actor-presentation.mjs';
import {
  createCelebration,
  advanceCelebration,
  skipCelebration,
  celebrationFrame,
  drawCelebration,
} from './celebration.mjs';

// Simulation uses cells. Everything below is presentation and never mutates a run.
const CELL = 16,
  TAU = Math.PI * 2;
const paintSize = ({ width, height }) => ({
  width: width * CELL,
  height: height * CELL,
  cellSize: CELL,
});
export const boardPaintSizeForLevel = (level) => paintSize(geometryForLevel(level));
export const boardPaintSizeForRun = (run) => paintSize(geometryForRun(run));
export function playerPaintSize(
  body,
  image,
  { screenScale, canvasCSSWidth, style, scale, geometry = null },
) {
  const s = actorScreenScale(screenScale),
    fitted = fittedBodySize(body, image),
    // Keep the contained source rectangle and all attachment anchors intact.
    // Only explicitly registered compact body presets lift the small-screen
    // image rectangle. Old bodies and unavailable-image fallbacks keep their size.
    extent = image
      ? Math.max(fitted.width, fitted.height)
      : Math.max(fitted.width * 0.54, fitted.height * 0.66),
    compactMinimum = image && canvasCSSWidth < 480 && body.compactMinimumCSSPixels === 20 ? 20 : 16,
    minimum = canvasCSSWidth >= 480 ? 24 : compactMinimum,
    desired = actorDiameter({ screenScale: s, canvasCSSWidth, style, scale }) * 1.15,
    logicalCap = actorLogicalLimit({ screenScale: s, minimumCSSSize: minimum }),
    visibleDiameter = Math.max(
      Math.min(18, 32 / s),
      Math.min(logicalCap, 32 / s, Math.max(minimum / s, desired)),
    ),
    paint = image && geometry ? actorImagePaintMetrics(visibleDiameter, geometry) : null,
    frameDiameter = paint ? Math.max(paint.width, paint.height) : visibleDiameter;
  return { diameter: visibleDiameter, scale: frameDiameter / (extent * CELL) };
}
const makeCanvas = (w, h) => {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  return c;
};
const poly = (c, points, color) => {
  c.fillStyle = color;
  c.beginPath();
  points.forEach(([x, y], i) => (i ? c.lineTo(x, y) : c.moveTo(x, y)));
  c.closePath();
  c.fill();
};
const colorMix = (a, b, t) =>
  '#' +
  [1, 3, 5]
    .map((i) =>
      Math.round(parseInt(a.slice(i, i + 2), 16) * (1 - t) + parseInt(b.slice(i, i + 2), 16) * t)
        .toString(16)
        .padStart(2, '0'),
    )
    .join('');
const painterImages = {
  queue: [],
  pending: 0,
  active: 0,
  reservedPixels: 0,
  retainedPixels: 0,
};
const imageOwnership = new WeakMap();
const releaseImage = (image) => {
  const pixels = imageOwnership.get(image);
  if (pixels === undefined) return;
  imageOwnership.delete(image);
  painterImages.retainedPixels -= pixels;
  image.removeAttribute?.('src');
};
const runNextPainterImage = () => {
  if (painterImages.active || !painterImages.queue.length) return;
  const work = painterImages.queue.shift();
  painterImages.pending--;
  void work();
};
const imageLoad = (src, signal) => {
  let resolve,
    reject,
    settled = false,
    timer = null,
    rejectLoad = null,
    image = null;
  const result = new Promise((yes, no) => {
    resolve = yes;
    reject = no;
  });
  const finish = (error) => {
    if (settled) return;
    settled = true;
    clearTimeout(timer);
    signal?.removeEventListener('abort', abort);
    const queued = painterImages.queue.indexOf(work);
    if (queued !== -1) {
      painterImages.queue.splice(queued, 1);
      painterImages.pending--;
    }
    if (image) image.onload = image.onerror = null;
    if (error) {
      image?.removeAttribute?.('src');
      rejectLoad?.(error);
      reject(error);
    } else resolve(image);
  };
  const abort = () => finish(new DOMException('Painter image cancelled.', 'AbortError'));
  const work = async () => {
    if (settled) return;
    painterImages.active++;
    let pixels = 0;
    try {
      image = new Image();
      image.decoding = 'async';
      await new Promise((yes, no) => {
        rejectLoad = no;
        image.onload = yes;
        image.onerror = () => no(new Error(t('interface:artworkCouldNotBeLoaded')));
        image.src = src;
      });
      if (settled) return;
      pixels =
        (image.naturalWidth || image.width || 0) * (image.naturalHeight || image.height || 0);
      if (pixels + painterImages.retainedPixels > 16 * 1024 * 1024)
        throw new Error('Painter image pixel budget exceeded.');
      painterImages.reservedPixels = pixels;
      // Cancellation settles the caller promptly but keeps this reservation
      // until the browser decoder actually finishes. Queued canceled work is removed.
      await image.decode?.();
      if (settled) return;
      imageOwnership.set(image, pixels);
      painterImages.retainedPixels += pixels;
      finish();
    } catch (error) {
      finish(error);
    } finally {
      painterImages.reservedPixels = 0;
      painterImages.active--;
      runNextPainterImage();
    }
  };
  signal?.addEventListener('abort', abort, { once: true });
  timer = setTimeout(() => finish(new Error(t('interface:artworkCouldNotBeLoaded'))), 15000);
  if (signal?.aborted) abort();
  if (!settled) {
    painterImages.pending++;
    painterImages.queue.push(work);
    runNextPainterImage();
  }
  return result;
};
const cancelledPreparation = () => new DOMException('Painter preparation cancelled.', 'AbortError');
const waitForPreparation = (promise, signal) => {
  if (!signal) return promise;
  if (signal.aborted) return Promise.reject(cancelledPreparation());
  return new Promise((resolve, reject) => {
    const abort = () => reject(cancelledPreparation());
    signal.addEventListener('abort', abort, { once: true });
    promise.then(resolve, reject).finally(() => signal.removeEventListener('abort', abort));
  });
};

export class BoardPainter {
  constructor(
    presets,
    {
      onAsset = () => {},
      onAssetStatus = () => {},
      onContextLoss = () => {},
      onContextRestored = () => {},
      layerCanvasFactory = makeCanvas,
      pictureCanvasFactory,
      jammerCanvasFactory,
      signalCanvasFactory,
    } = {},
  ) {
    this.presets = presets;
    this.onContextLoss = onContextLoss;
    this.onContextRestored = onContextRestored;
    const contextCallbacks = {
      onContextLoss: (event) => this.onContextLoss(event),
      onContextRestored: (event) => this.onContextRestored(event),
    };
    this.bodyBacking = createBodyBackingOwner(contextCallbacks);
    this.layerCanvasFactory = layerCanvasFactory;
    this.layers = new Map();
    this.preparationGeneration = 0;
    this.paintRevision = 0;
    this.lookReady = Promise.resolve();
    this.battlefieldGround = createBattlefieldGroundSurface({
      onContextLoss: (event) => this.onContextLoss(event),
      onContextRestored: (event) => this.onContextRestored(event),
    });
    this.onAsset = onAsset;
    this.onAssetStatus = onAssetStatus;
    this.lookWarning = '';
    this.enemyBodies = createEnemyBodyAssets({ changed: () => this.reportAssets() });
    this.animation = createAnimationState();
    this.actorPresentation = createActorPresentation();
    this.actorDefeats = createActorDefeatPresentation({ kind: 'capture' });
    this.actorFinishBodies = new Map();
    this.combatPresentation = createCombatPresentation();
    this.huntDestruction = createHuntDestruction();
    this.heading = 0;
    this.time = 0;
    this.effects = [];
    this.loadToken = 0;
    this.overrides = {};
    this.images = {};
    this.style = 'hybrid';
    this.levelInfo = {};
    this.artSeed = 0;
    this.celebration = null;
    this._winState = null;
    this._celebrationPrepared = false;
    this.presentation = null;
    this.artRevision = runtimeActorArtRevision();
    this.arcadeAdapter = createArcadeAdapter({
      reviewRevision: this.artRevision,
      ...contextCallbacks,
    });
    this.arcadeProvider = () => null;
    this.interfaceProvider = () => null;
    this.arcadeCollection = null;
    this.pictureFilter = createDemoPictureFilter({
      canvasFactory: pictureCanvasFactory,
      ...contextCallbacks,
    });
    this.jammerPictureFilter = createJammerPictureFilter({
      canvasFactory: jammerCanvasFactory,
      ...contextCallbacks,
    });
    this.signalReception = createSignalReception({
      canvasFactory: signalCanvasFactory,
      ...contextCallbacks,
    });
  }
  dispose() {
    if (this.disposed) return;
    this.disposed = true;
    this.bodyBacking.dispose();
    this.invalidate();
    ++this.preparationGeneration;
    this.battlefieldGround.clear();
    this.releaseBackgroundArt();
    this.arcadeAdapter.clear();
    // Retired scenes cannot adopt a late decode or retain shared enemy leases.
    ++this.loadToken;
    this.lookController?.abort();
    for (const image of new Set(Object.values(this.images))) releaseImage(image);
    this.enemyBodies.clear();
    this.pictureFilter.clear();
    this.jammerPictureFilter.clear();
    this.signalReception.dispose();
    this.huntDestruction.reset();
    this.combatPresentation.reset();
    this.images = {};
    this.overrides = {};
    this.image = null;
    this.background = null;
    this.theme = null;
    this.presentation = null;
    this.effects = [];
    this.celebration = null;
    this._winState = null;
    this.actorPresentation.reset();
    this.actorDefeats.reset();
    this.actorFinishBodies.clear();
  }
  // A read-only compiled release snapshot is cosmetic. It never replaces the
  // source theme, picture, body preset or any simulation-owned reference.
  setPresentation(snapshot = null) {
    if (snapshot !== this.presentation) {
      this.bodyBacking.clear();
      ++this.paintRevision;
      this.arcadeAdapter.clear();
      this.actorDefeats.reset();
      this.actorFinishBodies.clear();
    }
    this.presentation = snapshot;
  }
  setInterfaceProvider(provider) {
    this.interfaceProvider = typeof provider === 'function' ? provider : () => null;
  }
  setArcadeProvider(provider) {
    this.arcadeProvider = typeof provider === 'function' ? provider : () => null;
  }
  get artSnapshot() {
    return this.arcadeAdapter.resolve(this.presentation, this.arcadeCollection);
  }
  setLook(theme, bodyId, overrides = {}) {
    this.lookReady = this.loadLook(theme, bodyId, overrides);
    return this.lookReady;
  }
  async loadLook(theme, bodyId, overrides = {}) {
    this.bodyBacking.clear();
    this.invalidate();
    ++this.preparationGeneration;
    this.pictureFilter.clear();
    this.jammerPictureFilter.clear();
    const token = ++this.loadToken;
    this.lookController?.abort();
    this.lookController = new AbortController();
    const signal = this.lookController.signal;
    for (const image of new Set(Object.values(this.images))) releaseImage(image);
    this.enemyBodies.clear();
    this.lookWarning = '';
    this.theme = theme;
    this.bodyId = bodyId;
    this.overrides = overrides;
    this.images = {};
    this.setBackgroundArt(theme);
    this.animation = createAnimationState();
    this.actorPresentation.reset();
    this.actorDefeats.reset();
    this.actorFinishBodies.clear();
    this.combatPresentation.reset();
    this.huntDestruction.reset();
    const knownBody = Object.hasOwn(this.presets.characters, bodyId)
        ? this.presets.characters[bodyId]
        : null,
      body =
        knownBody ||
        this.presets.characters['neutral-marker'] ||
        this.presets.characters['fpv-body'];
    this.body = body;
    this.recipe = this.presets.animationRecipes[body.animationRecipe];
    this.image = null;
    const jobs = [
      [
        'player',
        overrides.player?.dataUrl ||
          (body.src
            ? new URL(`../../authoring/motion-lab/${body.src}`, import.meta.url).href
            : null),
      ],
      ...Object.entries(overrides)
        .filter(([role]) => role !== 'player')
        .map(([role, v]) => [role, v.dataUrl]),
    ];
    const requested = jobs.filter(([, src]) => src);
    const report = (status, message) => {
      if (token !== this.loadToken) return;
      try {
        this.onAssetStatus({
          status,
          stage: status === 'preparing' ? 'decoding' : status,
          message,
          progress: null,
        });
      } catch {}
    };
    if (requested.length) report('preparing', t('interface:loadingCraftAndSceneArtwork'));
    const settled = await Promise.allSettled(
      requested.map(async ([role, src]) => [role, await imageLoad(src, signal)]),
    );
    if (token !== this.loadToken) {
      for (const item of settled) if (item.status === 'fulfilled') releaseImage(item.value[1]);
      return;
    }
    for (const item of settled)
      if (item.status === 'fulfilled') {
        const [role, img] = item.value;
        this.images[role] = img;
        if (role === 'player') this.image = img;
      }
    this.lookWarning = [
      !knownBody ? t('interface:theRequestedBodyIsNotRegisteredANeutralFallbackRig') : '',
      settled.some((x) => x.status === 'rejected')
        ? t('interface:someArtworkIsUnavailableAClearFallbackIsShown')
        : '',
    ]
      .filter(Boolean)
      .join(' ');
    this.reportAssets();
    // A procedural look also completes any status from the look it superseded.
    report(
      settled.some((item) => item.status === 'rejected') ? 'error' : 'ready',
      this.lookWarning || t('interface:craftAndSceneArtworkAreReady'),
    );
  }
  async whenReady({ signal } = {}) {
    const generation = this.preparationGeneration;
    await waitForPreparation(this.lookReady, signal);
    await this.enemyBodies.ready({ signal });
    if (signal?.aborted || generation !== this.preparationGeneration) throw cancelledPreparation();
  }
  async prepare(ctx, state, options = {}, { signal } = {}) {
    const generation = this.preparationGeneration;
    await waitForPreparation(this.lookReady, signal);
    if (signal?.aborted || generation !== this.preparationGeneration) throw cancelledPreparation();
    this.signalReception.prepare();
    this.jammerPictureFilter.prepare();
    const preparedOptions = {
      ...options,
      paused: true,
      signalReception: options.signalReception === 'off' ? 'off' : 'ready',
      signalEffectsRunning: false,
    };
    this.draw(ctx, state, 0, preparedOptions);
    this.jammerPictureFilter.prepare(this.preparedPicture);
    await this.whenReady({ signal });
    if (signal?.aborted || generation !== this.preparationGeneration) throw cancelledPreparation();
    this.draw(ctx, state, 0, preparedOptions);
  }
  retireLayer(name, layer) {
    const wasLost = layer.lostContext;
    layer.lostContext = false;
    layer.canvas?.removeEventListener?.('contextlost', layer.lost);
    layer.canvas?.removeEventListener?.('contextrestored', layer.restored);
    if (layer.canvas) layer.canvas.width = layer.canvas.height = 0;
    if (wasLost) this.onContextRestored({ source: name, owner: layer, retired: true });
  }
  invalidate() {
    ++this.paintRevision;
    // Loss callbacks may invalidate caches; keep their recovery obligation live.
    this.bodyBacking.clear({ preserveLost: true });
    const retired = [...this.layers.entries()];
    this.layers.clear();
    for (const [name, layer] of retired) this.retireLayer(name, layer);
    this.cellSnapshot = null;
    this.cellRuns = null;
    this.preparedPicture = null;
    this.arcadeAdapter?.clear();
    this.battlefieldGround?.clear();
    this.pictureFilter?.clear();
    this.jammerPictureFilter?.clear();
    this.signalReception?.invalidate();
  }
  resourceSnapshot() {
    const layers = this.cacheStats,
      sourcePixels =
        (this.backgroundArt?.canvas.width ?? 0) * (this.backgroundArt?.canvas.height ?? 0),
      jammer = this.jammerPictureFilter.resourceSnapshot(),
      demo = this.pictureFilter.resourceSnapshot();
    const categories = {
      staticLayers: {
        canvases: [...this.layers.values()].filter(
          (layer) => layer.canvas?.width && layer.canvas?.height,
        ).length,
        pixels: layers.pixels,
        rgbaBytesEstimate: layers.pixels * 4,
      },
      sourceArt: {
        canvases: Number(sourcePixels > 0),
        pixels: sourcePixels,
        rgbaBytesEstimate: sourcePixels * 4,
      },
      battlefieldGround: this.battlefieldGround.resourceSnapshot(),
      adaptedSprites: this.arcadeAdapter.resourceSnapshot(),
      signalNoise: this.signalReception.resourceSnapshot(),
      jammerSurface: jammer.surface,
      jammerNoise: jammer.noise,
      demoConcealment: demo,
    };
    const ownedCanvases = {
      scope: 'Unique canvases owned by this painter; excludes Phaser and shared source images.',
      categories,
      canvases: 0,
      pixels: 0,
      rgbaBytesEstimate: 0,
      retainedPixelBufferBytes: demo.pixelBufferBytes,
      estimate:
        'RGBA8 dimensions at four bytes per pixel; browser/GPU allocation, copies and overhead are unobservable.',
    };
    for (const category of Object.values(categories)) {
      ownedCanvases.canvases += category.canvases;
      ownedCanvases.pixels += category.pixels;
      ownedCanvases.rgbaBytesEstimate += category.rgbaBytesEstimate;
    }
    return {
      layers,
      ownedCanvases,
      enemyImages: this.enemyBodies.resourceSnapshot(),
      legacyImages: {
        scope: 'page',
        pending: painterImages.pending,
        active: painterImages.active,
        reservedPixels: painterImages.reservedPixels,
        retainedPixels: painterImages.retainedPixels,
        pixelLimit: 16 * 1024 * 1024,
      },
    };
  }
  get cacheStats() {
    let pixels = 0;
    for (const layer of this.layers.values())
      pixels += (layer.canvas?.width ?? 0) * (layer.canvas?.height ?? 0);
    return { layers: this.layers.size, pixels };
  }
  paintLayer(name, ctx, width, height, keys, paint) {
    let layer = this.layers.get(name);
    if (layer && (layer.width !== width || layer.height !== height)) {
      this.layers.delete(name);
      this.retireLayer(name, layer);
      layer = null;
    }
    if (!layer) {
      layer = { width, height, canvas: null, context: null, keys: null, lostContext: false };
      this.layers.set(name, layer);
      try {
        // Four ordinary board layers fit below this presentation-only bound.
        // Large custom boards retain the direct painter instead of multiplying memory.
        if (this.cacheStats.pixels + width * height > 4 * 1024 * 1024)
          throw new Error('Layer budget');
        const canvas = this.layerCanvasFactory(width, height);
        canvas.width = width;
        canvas.height = height;
        layer.canvas = canvas;
        const context = canvas.getContext('2d');
        if (!context) throw new Error('Layer context unavailable');
        layer.canvas = canvas;
        layer.context = context;
        layer.lost = () => {
          layer.lostContext = true;
          layer.keys = null;
          this.onContextLoss({ source: name, owner: layer });
        };
        layer.restored = () => {
          layer.lostContext = false;
          layer.keys = null;
          this.onContextRestored({ source: name, owner: layer });
        };
        canvas.addEventListener?.('contextlost', layer.lost);
        canvas.addEventListener?.('contextrestored', layer.restored);
      } catch {
        if (layer.canvas) layer.canvas.width = layer.canvas.height = 0;
        layer.canvas = null;
        // A failed allocation stays quarantined until invalidation.
      }
    }
    if (!layer.context || layer.lostContext) return paint(ctx);
    if (
      !layer.keys ||
      layer.keys.length !== keys.length ||
      keys.some((value, i) => value !== layer.keys[i])
    ) {
      const target = layer.context;
      target.save();
      try {
        target.setTransform(1, 0, 0, 1, 0, 0);
        target.globalAlpha = 1;
        target.globalCompositeOperation = 'source-over';
        target.imageSmoothingEnabled = false;
        target.clearRect(0, 0, width, height);
        paint(target);
        layer.keys = keys;
      } finally {
        target.restore();
      }
    }
    ctx.drawImage(layer.canvas, 0, 0);
  }
  boardCells(cells, columns, rows) {
    let changed =
      !this.cellSnapshot ||
      this.cellColumns !== columns ||
      this.cellRows !== rows ||
      this.cellSnapshot.length !== cells.length;
    if (!changed)
      for (let i = 0; i < cells.length; i++)
        if (cells[i] !== this.cellSnapshot[i]) {
          changed = true;
          break;
        }
    if (!changed) return this.cellRuns;
    this.cellSnapshot = Uint8Array.from(cells);
    this.cellColumns = columns;
    this.cellRows = rows;
    this.cellRevision = (this.cellRevision ?? 0) + 1;
    const covered = [],
      walls = [],
      boundary = [],
      boundaryGroups = [];
    for (let y = 0; y < rows; y++) {
      let start = -1;
      for (let x = 0; x <= columns; x++) {
        const value = x < columns ? cells[y * columns + x] : -1;
        if (value === 0 && start < 0) start = x;
        if (value !== 0 && start >= 0) {
          covered.push([start * CELL, y * CELL, (x - start) * CELL, CELL]);
          start = -1;
        }
        if (value === 2) walls.push([x * CELL, y * CELL]);
        if (value !== 1) continue;
        const groupStart = boundary.length;
        const xx = x * CELL,
          yy = y * CELL;
        if (y > 0 && cells[(y - 1) * columns + x] === 0) boundary.push([xx, yy, xx + CELL, yy]);
        if (y < rows - 1 && cells[(y + 1) * columns + x] === 0)
          boundary.push([xx, yy + CELL, xx + CELL, yy + CELL]);
        if (x > 0 && cells[y * columns + x - 1] === 0) boundary.push([xx, yy, xx, yy + CELL]);
        if (x < columns - 1 && cells[y * columns + x + 1] === 0)
          boundary.push([xx + CELL, yy, xx + CELL, yy + CELL]);
        if (boundary.length > groupStart) boundaryGroups.push(boundary.slice(groupStart));
      }
    }
    const paths =
      typeof Path2D === 'function'
        ? boundaryGroups.map((segments) => {
            const path = new Path2D();
            for (const [x1, y1, x2, y2] of segments) {
              path.moveTo(x1, y1);
              path.lineTo(x2, y2);
            }
            return path;
          })
        : null;
    return (this.cellRuns = { covered, walls, boundary, boundaryGroups, paths });
  }

  reportAssets() {
    ++this.paintRevision;
    this.onAsset([this.lookWarning, this.enemyBodies.status()].filter(Boolean).join(' '));
  }
  enemyBody(frame, compiled = null) {
    if (!frame) return null;
    const image = this.images[frame.role];
    if (image) return { image, geometry: null, record: null };
    return compiled
      ? {
          image: compiled.image,
          geometry: compiled.geometry,
          record: this.enemyBodies.record?.(frame) ?? null,
        }
      : this.enemyBodies.current(frame);
  }
  releaseBackgroundArt() {
    const owner = this.backgroundArt;
    if (!owner) return;
    this.backgroundArt = null;
    const wasLost = owner.lost;
    owner.lost = false;
    owner.canvas.removeEventListener?.('contextlost', owner.onLost);
    owner.canvas.removeEventListener?.('contextrestored', owner.onRestored);
    owner.canvas.width = owner.canvas.height = 0;
    if (wasLost) this.onContextRestored({ source: 'scene-art', owner, retired: true });
  }
  setBackgroundArt(theme, level = this.levelInfo, seed = this.artSeed) {
    this.releaseBackgroundArt();
    this.background = this.makeArt(theme, level, seed);
    if (typeof this.background?.getContext !== 'function') return;
    const owner = { canvas: this.background, lost: false };
    this.backgroundArt = owner;
    owner.onLost = () => {
      owner.lost = true;
      this.onContextLoss({ source: 'scene-art', owner });
    };
    owner.onRestored = () => {
      owner.lost = false;
      // Restored canvas storage is empty; regenerate the exact accepted art.
      this.setBackgroundArt(theme, level, seed);
      ++this.paintRevision;
      this.onContextRestored({ source: 'scene-art', owner });
    };
    owner.canvas.addEventListener?.('contextlost', owner.onLost);
    owner.canvas.addEventListener?.('contextrestored', owner.onRestored);
  }
  makeArt(theme, level = this.levelInfo, seed = this.artSeed) {
    return createSceneArt(theme, level, seed, () => makeCanvas(384, 288));
  }
  // Only the host's first activation or new-attempt preparation calls this.
  // Resume never rereads the menu choices for an already accepted attempt.
  setAttemptAppearance(appearance) {
    if (this.acceptedAttemptAppearance === appearance) return;
    const accepted = requireAcceptedAttemptAppearance(appearance);
    this.acceptEnemyArtwork({
      artRevision: accepted?.artRevision ?? null,
      arcadeCollection: accepted?.collection
        ? getArcadeCollection(accepted.collection.id, accepted.collection.revision)
        : null,
    });
    this.arcadeAdapter.setEnvironment(accepted?.environmentPin ?? null);
    this.acceptedAttemptAppearance = appearance;
  }
  acceptEnemyArtwork({ artRevision = runtimeActorArtRevision(), arcadeCollection } = {}) {
    ++this.paintRevision;
    this.acceptedAttemptAppearance = undefined;
    this.arcadeAdapter.setEnvironment(null);
    this.artRevision = artRevision;
    this.arcadeAdapter.setReviewRevision(artRevision);
    this.combatPresentation.setArtRevision(artRevision);
    this.huntDestruction.setArtRevision(artRevision);
    this.arcadeCollection =
      arcadeCollection === undefined
        ? selectedArcadeCollection(this.arcadeProvider())
        : arcadeCollection;
  }
  setLevel(
    level = {},
    { seed = 0, arcadeCollection = undefined, artRevision = runtimeActorArtRevision() } = {},
  ) {
    this.bodyBacking.clear();
    this.invalidate();
    ++this.preparationGeneration;
    this.acceptEnemyArtwork({ artRevision, arcadeCollection });
    this.pictureFilter.clear();
    this.jammerPictureFilter.clear();
    this.levelInfo = { id: level.id || 'gallery', revision: level.revision || '1' };
    this.artSeed = seed;
    if (this.theme) this.setBackgroundArt(this.theme);
    this.celebration = null;
    this._winState = null;
    this._celebrationPrepared = false;
    this.effects = [];
    this.heading = 0;
    this.bank = 0;
    this.speedRatio = 0;
    this.time = 0;
    this.actorPresentation.reset();
    this.actorDefeats.reset();
    this.actorFinishBodies.clear();
    this.combatPresentation.reset();
    this.huntDestruction.reset();
  }
  startCelebration({
    levelId = this.levelInfo.id || '',
    seed = this.artSeed,
    reduced = false,
  } = {}) {
    this.celebration = createCelebration({ theme: this.theme, levelId, seed, reduced });
    this._celebrationPrepared = true;
    return this.celebrationStatus;
  }
  skipCelebration() {
    this.celebration = skipCelebration(this.celebration);
    return this.celebrationStatus;
  }
  get celebrationStatus() {
    const { particles, equipment, ...status } = celebrationFrame(this.celebration);
    return status;
  }
  drawGallery(
    ctx,
    {
      theme = this.theme,
      level = this.levelInfo,
      seed = this.artSeed,
      width = ctx.canvas?.width || 768,
      height = ctx.canvas?.height || 576,
      image = null,
      fit = 'cover',
      pictureVisibility = 'clear',
    } = {},
  ) {
    if (!theme) return;
    const source = this.pictureFilter.select(
      image || this.makeArt(theme, level, seed),
      pictureVisibility,
    );
    ctx.save();
    ctx.imageSmoothingEnabled = false;
    ctx.globalAlpha = 1;
    ctx.clearRect(0, 0, width, height);
    ctx.fillStyle = theme.palette.field;
    ctx.fillRect(0, 0, width, height);
    if (!source) {
      ctx.restore();
      return;
    }
    const ratio =
      fit === 'contain'
        ? Math.min(width / source.width, height / source.height)
        : Math.max(width / source.width, height / source.height);
    ctx.drawImage(
      source,
      (width - source.width * ratio) / 2,
      (height - source.height * ratio) / 2,
      source.width * ratio,
      source.height * ratio,
    );
    ctx.restore();
  }
  effectsFor(events = [], run = null) {
    this.actorDefeats.observe(run, events, (id) => this.actorFinishBodies.get(id));
    for (const event of events) {
      const effect = presentationEvent(event, run);
      if (effect) this.effects.push(effect);
    }
    this.effects = this.effects.slice(-8);
  }

  draw(
    ctx,
    state,
    dt,
    {
      paused = false,
      reduced = false,
      quality = 'full',
      showGrid = false,
      debug = false,
      fullReveal = false,
      showCombatScrap = true,
      brutal = false,
      blood = true,
      celebrationPaused = false,
      defeatEffectsRunning = false,
      actorScale = 1,
      playerScale = 1,
      displayCSSWidth = null,
      textFace = 'pixel',
      actorSkins = {},
      actorAppearance = null,
      backdrop = null,
      feedbackComparison = null,
      pictureVisibility = 'clear',
      demoTransition = 0,
      pictureInterference = true,
      signalReception = 'off',
      signalEffectsRunning = false,
    } = {},
  ) {
    if (!this.theme || !state) return;
    brutal = false; blood = false; showCombatScrap = false;
    actorAppearance = null; actorSkins = {};
    const combat = combatView(state);
    if (combat && !combat.valid) {
      throw new Error(`Cannot render optional combat: ${combat.error}`);
    }
    // Developer comparison only: omit these flags for the accepted presentation.
    // Hide only additive decoration; functional cues and all effect clocks stay.
    const captureAccent = quality !== 'minimal' && feedbackComparison?.captureAccent !== false,
      eventAccents = quality !== 'minimal' && feedbackComparison?.eventAccents !== false;
    const presentation =
      this.theme.id === 'fpv' ||
      this.theme.family === 'fpv' ||
      this.arcadeCollection?.id === 'military-field'
        ? this.artSnapshot
        : null;
    if (
      actorAppearance !== null &&
      (!['fpv', 'campaign'].includes(actorAppearance?.style) ||
        (actorAppearance.style === 'fpv' && typeof actorAppearance.snapshot?.image !== 'function'))
    )
      throw new TypeError(
        t('interface:actorAppearanceRequiresASupportedStyleAndPreparedFpvAssets'),
      );
    // The host owns and verifies this separate lease. Its canvas, fonts and
    // theme are deliberately ignored: changing actors must not change a world.
    const fpvActors = actorAppearance?.style === 'fpv';
    const actorPresentation = fpvActors
      ? this.arcadeAdapter.resolve(actorAppearance.snapshot, this.arcadeCollection)
      : presentation;
    const interfaceFonts = canvasInterfaceFonts(this.interfaceProvider());
    const fonts = canvasTextFonts(textFace, interfaceFonts ?? presentation?.fonts, {
      useThemeFont: !!interfaceFonts || !!presentation?.appearance,
    });
    reduced = reduced || quality !== 'full' || presentation?.canvas.motionScale === 0;
    const motionDt = dt * (presentation?.canvas.motionScale ?? 1);
    const { width: columns, height: rows } = geometryForRun(state);
    const W = columns * CELL,
      H = rows * CELL;
    const reception = this.signalReception.advance(state, dt, {
      mode: fullReveal ? 'off' : signalReception,
      running: signalEffectsRunning,
      reduced,
    });
    if (fullReveal && state.status === 'won') {
      if (this._winState !== state) {
        if (!this._celebrationPrepared)
          this.startCelebration({ levelId: state.levelId, seed: state.seed, reduced });
        this._winState = state;
        this._celebrationPrepared = false;
      }
      this.celebration = advanceCelebration(this.celebration, dt, {
        paused: celebrationPaused,
        reduced,
      });
    } else if (!fullReveal) {
      this._winState = null;
      this.celebration = null;
    }
    const finale = fullReveal ? celebrationFrame(this.celebration) : null;
    const revealAlpha = fullReveal ? 1 - finale.reveal : 1;
    const p = presentation?.canvas.palette || this.theme.palette,
      time = state.time;
    const classic = fullReveal ? null : classicView(state);
    const canvasCSSWidth =
      Number.isFinite(displayCSSWidth) && displayCSSWidth > 0
        ? displayCSSWidth
        : Number.isFinite(ctx.canvas?.clientWidth) && ctx.canvas.clientWidth > 0
          ? ctx.canvas.clientWidth
          : W;
    const combatOptions = {
      artRevision: this.artRevision,
      reduced,
      screenScale: canvasCSSWidth / W,
      canvasCSSWidth,
      scale: actorScale,
      showScrap: showCombatScrap,
      brutal,
      blood,
    };
    const images = { ...this.images, presentationSprites: {} };
    const enemySprites = {};
    if (presentation) {
      for (const [slot, role] of Object.entries({
        'terrain.wall': 'wall',
        'terrain.slow': 'slowTerrain',
        'terrain.lethal': 'lethalTerrain',
        'pickup.objective': 'objective',
        'pickup.supply': 'supply',
        'pickup.life': 'lifePickup',
        'pickup.speed': 'speedPickup',
        'pickup.slow': 'slowPickup',
        'pickup.freeze': 'freezePickup',
      })) {
        const sprite = presentation.image(slot);
        if (sprite && !this.overrides[role]) {
          images[role] = sprite.image;
          images.presentationSprites[role] = sprite.geometry;
        }
      }
    }
    if (actorPresentation) {
      for (const [type, role] of Object.entries({
        bouncer: 'enemy',
        'border-patrol': 'patrol',
        'contour-patrol': 'contour',
        'claimed-rover': 'rover',
        eroder: 'eroder',
        'lane-boss': 'boss',
        'relay-sentinel': 'boss',
      })) {
        const sprite = actorPresentation.image(`enemy.${type}`);
        if (sprite && !this.overrides[role] && !actorSkins[type]) {
          enemySprites[type] = sprite;
          images[role] = sprite.image;
          images.presentationSprites[role] = sprite.geometry;
        }
      }
    }
    let playerBody = this.body,
      playerImage = this.image,
      playerRecipe = this.recipe,
      playerGeometry = null;
    if (actorPresentation && !this.overrides.player) {
      const set = this.presets.characterPresentations?.sets.find(
        (entry) =>
          entry.themeId === 'fpv' &&
          (fpvActors || Object.values(entry.classBodies).includes(this.bodyId)),
      );
      const role = fpvActors
        ? state.activeClassId || state.classId
        : set && Object.entries(set.classBodies).find(([, id]) => id === this.bodyId)?.[0];
      const treatment = this.style === 'microtile' || canvasCSSWidth < 480 ? 'compact' : 'detailed';
      const sprite = role && actorPresentation.image(`player.${role}.${treatment}`);
      const body = fpvActors ? this.presets.characters[set?.classBodies[role]] : this.body;
      if (fpvActors && (!sprite || !body))
        throw new TypeError(t('interface:actorAppearanceIsMissingThePreparedPlayerRole'));
      if (sprite) {
        playerImage = sprite.image;
        playerGeometry = sprite.geometry;
        playerBody = {
          ...body,
          sampling: 'nearest',
          rotors: sprite.geometry.rotors,
          presentationPivot: sprite.geometry.pivot,
        };
        playerRecipe = preparedRotorRecipe(
          this.presets.animationRecipes[body.animationRecipe],
          sprite.geometry,
        );
      }
    }
    const actorFrames = this.actorPresentation.sample(fullReveal ? [] : state.enemies, {
      tick: state.tick,
      time: state.time,
      dt: motionDt,
      paused: paused || state.status !== 'running',
      reduced,
      classic,
      themeId: fpvActors ? 'fpv' : this.theme.id,
      themeFamily: fpvActors ? 'fpv' : this.theme.family,
      style: this.style,
      screenScale: canvasCSSWidth / W,
      canvasCSSWidth,
      scale: actorScale,
      actorSkins,
      bodyRecipes: this.theme.actorRecipes ?? {},
    });
    if (this.actorFinishSource !== actorPresentation || !this.actorDefeats.bind(state)) {
      this.actorDefeats.reset();
      this.actorDefeats.bind(state);
      this.actorFinishBodies.clear();
      this.actorFinishSource = actorPresentation;
    }
    const actorFinishes = this.actorDefeats.advance(state, {
      dt,
      paused: state.status === 'won' ? celebrationPaused : paused,
      reduced,
      concealed: fullReveal,
    });
    for (const enemy of state.enemies) {
      if (enemy.type !== 'relay-sentinel' || state.encounter?.defeated) continue;
      const frame = actorFrames.get(enemy.id),
        sprite = this.enemyBody(frame, enemySprites[enemy.type]);
      if (sprite?.geometry?.animation) this.actorFinishBodies.set(enemy.id, { frame, sprite });
    }
    // A compiled default owns its bitmap; do not acquire the old full original too.
    // Keep every frame in the metadata request so the compiled bitmap can still
    // use the catalog's bounded surface-motion accents.
    this.enemyBodies.update([...actorFrames.values()], this.overrides, {
      image: (frame) => !enemySprites[frame.type],
    });
    this.time += paused ? 0 : motionDt;
    for (const effect of this.effects)
      if (
        fullReveal
          ? !celebrationPaused
          : !paused ||
            (defeatEffectsRunning && state.status === 'lost' && effect.type === 'player.failed')
      )
        effect.age += dt;
    ctx.clearRect(0, 0, W, H);
    ctx.imageSmoothingEnabled = false;
    // The host owns a fully decoded binding and its lifetime. Select its image
    // and fit together for this frame; never reset rigs/effects or replace the
    // authored fallback. Sampling remains nearest throughout this pixel painter.
    // Filter only the picture before masks, terrain and actors are composited.
    // Pending or unreadable artwork paints the neutral field until protected.
    const pictureSource = backdrop?.image || this.images.background || this.background;
    const protectedPicture = this.pictureFilter.select(pictureSource, pictureVisibility, {
      time: this.time,
      animate: !reduced,
    });
    this.preparedPicture = protectedPicture;
    // Reception affects only the picture. The covered-cell mask and every
    // terrain, trail, enemy and player cue are painted sharply afterward.
    // Demo transitions receive only the protected picture. Their 300ms clock
    // belongs to the host; this normalized envelope cannot sample raw artwork.
    const transitionStrength =
      !reduced && Number.isFinite(demoTransition)
        ? Math.max(0, Math.min(1, demoTransition)) * 0.35
        : 0;
    const picture = this.jammerPictureFilter.select(protectedPicture, {
      // Picture-preview preferences control concealment/decorative reception,
      // never the authoritative jammer mechanic. Apply it to protected pixels
      // too, so hiding artwork cannot disable the level's warning feedback.
      strength: Math.max(
        pictureInterference ? transitionStrength : 0,
        jammerPictureStrength(state, { fullReveal }) * (reduced ? 0.65 : 1),
      ),
      time: this.time,
      animate: !reduced,
    });
    const fit = backdrop?.image ? backdrop.fit : this.overrides.background?.fit || 'cover';
    ctx.fillStyle = p.field;
    ctx.fillRect(0, 0, W, H);
    // A tiny arrival ease gives the earned artwork a gentle landing. It ends
    // at its exact original fit; reduced effects and the settled picture never zoom.
    const pictureScale = fullReveal && !reduced ? finale.pictureScale || 1 : 1;
    ctx.save();
    if (pictureScale !== 1) {
      ctx.translate(W / 2, H / 2);
      ctx.scale(pictureScale, pictureScale);
      ctx.translate(-W / 2, -H / 2);
    }
    const paintPicture = (target) => {
      if (!picture) return;
      const ratio =
        fit === 'contain'
          ? Math.min(W / picture.width, H / picture.height)
          : Math.max(W / picture.width, H / picture.height);
      target.drawImage(
        picture,
        (W - picture.width * ratio) / 2,
        (H - picture.height * ratio) / 2,
        picture.width * ratio,
        picture.height * ratio,
      );
    };
    if (
      picture === pictureSource &&
      pictureScale === 1 &&
      (typeof picture?.getContext !== 'function' || picture === this.background)
    )
      this.paintLayer(
        'picture',
        ctx,
        W,
        H,
        [picture, picture?.width, picture?.height, fit],
        paintPicture,
      );
    else paintPicture(ctx);
    ctx.restore();
    const cells = this.boardCells(state.cells, columns, rows);
    if (!fullReveal || revealAlpha > 0) {
      const ground = this.battlefieldGround.prepare(
        sharedBattlefieldGround().snapshot().world,
        W,
        H,
        battlefieldGroundAllowed({
          environmentPin: this.acceptedAttemptAppearance?.environmentPin,
          presentation: this.presentation,
          overrides: this.overrides,
        }),
      );
      ctx.globalAlpha = revealAlpha;
      this.paintLayer(
        'concealment',
        ctx,
        W,
        H,
        [this.cellRevision, ground, this.theme.coverColor],
        (target) => {
          target.fillStyle = this.theme.coverColor ?? '#000000';
          for (const [x, y, width, height] of cells.covered)
            if (!paintBattlefieldGroundSpan(target, ground, x, y, width, height, W, H))
              target.fillRect(x, y, width, height);
        },
      );
      ctx.globalAlpha = 1;
    }
    // Degrade only the already-masked feed. Covered pixels stay secret;
    // terrain, live cuts and actors below remain sharp from the first tick.
    if (reception.kind === 'acquire') this.signalReception.draw(ctx, W, H, reception);
    const terrain = classic?.terrain ?? [];
    if (
      !this.terrainSnapshot ||
      this.terrainSnapshot.length !== terrain.length ||
      terrain.some((cell, i) => {
        const prior = this.terrainSnapshot[i];
        return cell.x !== prior.x || cell.y !== prior.y || cell.kind !== prior.kind;
      })
    ) {
      this.terrainSnapshot = terrain.map(({ x, y, kind }) => ({ x, y, kind }));
      this.terrainRevision = (this.terrainRevision ?? 0) + 1;
    }
    const terrainKey = this.terrainRevision;
    this.paintLayer(
      'terrain',
      ctx,
      W,
      H,
      [
        terrainKey,
        p.safe,
        p.danger,
        images.slowTerrain,
        images.lethalTerrain,
        images.presentationSprites.slowTerrain,
        images.presentationSprites.lethalTerrain,
      ],
      (target) => drawClassicTerrain(target, classic, p, images),
    );
    this.huntDestruction.advance(combat, dt, {
      key: state,
      sources: [state.player],
      paused: state.status === 'won' ? celebrationPaused : paused,
      brutal,
      blood,
      reduced,
      concealed: fullReveal,
    });
    if (combat && !fullReveal) drawCombatScrap(ctx, combat, p, combatOptions);
    this.huntDestruction.draw(ctx, { unit: 1 / (canvasCSSWidth / W), color: p.accent });
    this.actorDefeats.draw(ctx, actorFinishes, (count) =>
      this.huntDestruction.reserveTransientPieces(count),
    );
    // Reveal decoration belongs below current hazards, actors and live cuts.
    // An old capture pulse must never wash over a newly opened live line.
    if (!fullReveal && captureAccent)
      for (const effect of this.effects)
        if (['cells.claimed', 'relay.opened'].includes(effect.type))
          drawCapturePulse(ctx, effect, columns, state.cells, p, reduced, this.theme.family);
    if (!fullReveal || revealAlpha > 0) {
      ctx.globalAlpha = revealAlpha;
      this.paintLayer(
        'walls',
        ctx,
        W,
        H,
        [
          this.cellRevision,
          p.muted,
          p.ink,
          this.style,
          images.wall,
          images.presentationSprites.wall,
        ],
        (target) => {
          for (const [xx, yy] of cells.walls) {
            target.fillStyle = colorMix(p.muted, p.ink, 0.5);
            target.fillRect(xx, yy, CELL, CELL);
            if (images.wall)
              drawPresentationImage(
                target,
                images.wall,
                xx + CELL / 2,
                yy + CELL / 2,
                CELL,
                CELL,
                images.presentationSprites.wall,
              );
            else if (this.style === 'microtile') {
              target.fillStyle = p.muted;
              target.fillRect(xx + 2, yy + 2, 4, 4);
              target.fillRect(xx + 10, yy + 10, 4, 4);
            } else if (this.style === 'hybrid') {
              target.fillStyle = p.muted;
              target.fillRect(xx + 2, yy + 2, 12, 2);
              target.fillStyle = p.ink;
              target.fillRect(xx + 3, yy + 9, 10, 3);
            }
          }
        },
      );
      ctx.globalAlpha = 1;
    }
    if (!fullReveal) {
      ctx.strokeStyle = p.safe;
      ctx.globalAlpha = 0.7;
      ctx.lineWidth = 1.5;
      // Preserve separate cell strokes: joining them changes alpha at corners.
      if (cells.paths) for (const path of cells.paths) ctx.stroke(path);
      else
        for (const segments of cells.boundaryGroups) {
          ctx.beginPath();
          for (const [x1, y1, x2, y2] of segments) {
            ctx.moveTo(x1, y1);
            ctx.lineTo(x2, y2);
          }
          ctx.stroke();
        }
      ctx.globalAlpha = 1;
    }
    const relays = fullReveal ? null : relayView(state);
    if (!fullReveal) drawDirectionalFields(ctx, directionalView(state), CELL);
    drawRelayGates(ctx, relays, p, CELL);
    if (this.style === 'props' && !fullReveal && !images.wall)
      for (const w of state.level.walls || []) {
        const x = w.x * CELL,
          y = w.y * CELL,
          ww = w.w * CELL,
          hh = w.h * CELL;
        ctx.fillStyle = p.muted;
        ctx.fillRect(x + 2, y + 2, ww - 4, Math.min(5, hh - 4));
        ctx.fillStyle = p.ink;
        ctx.fillRect(x + 3, y + hh - 5, ww - 6, 3);
        ctx.strokeStyle = p.grid;
        ctx.lineWidth = 1;
        ctx.strokeRect(x + 1, y + 1, ww - 2, hh - 2);
        for (let sx = x + 7; sx < x + ww - 4; sx += 24) {
          ctx.fillStyle = p.accent;
          ctx.fillRect(sx, y + hh / 2 - 1, 4, 2);
        }
      }
    if (showGrid && !fullReveal) {
      ctx.strokeStyle = p.grid;
      ctx.lineWidth = 0.5;
      for (let x = 0; x < W; x += CELL) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, H);
        ctx.stroke();
      }
      for (let y = 0; y < H; y += CELL) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(W, y);
        ctx.stroke();
      }
    }
    if (!fullReveal) {
      for (const zone of state.signalZones || []) {
        const suppressed = zone.suppressedUntil > time,
          xx = zone.x * CELL,
          yy = zone.y * CELL,
          ww = zone.w * CELL,
          hh = zone.h * CELL;
        ctx.save();
        ctx.fillStyle = suppressed ? p.safe : p.danger;
        ctx.globalAlpha = suppressed ? 0.025 : 0.08;
        ctx.fillRect(xx, yy, ww, hh);
        ctx.globalAlpha = suppressed ? 0.35 : 0.7;
        ctx.strokeStyle = ctx.fillStyle;
        ctx.lineWidth = 1;
        ctx.setLineDash(suppressed ? [3, 5] : [6, 3]);
        ctx.strokeRect(xx + 0.5, yy + 0.5, ww - 1, hh - 1);
        ctx.setLineDash([]);
        const cx = xx + ww / 2,
          cy = yy + hh / 2;
        ctx.beginPath();
        ctx.arc(cx, cy, 6, 0, TAU);
        ctx.stroke();
        ctx.fillRect(cx - 1, cy - 9, 2, 12);
        ctx.fillRect(cx - 4, cy + 6, 8, 2);
        ctx.restore();
      }
      for (const hangar of state.hangars || []) {
        const x = hangar.x * CELL,
          y = hangar.y * CELL,
          r = (hangar.radius || 2) * CELL;
        ctx.save();
        ctx.strokeStyle = p.safe;
        ctx.globalAlpha = 0.65;
        ctx.lineWidth = 1;
        ctx.setLineDash([3, 4]);
        ctx.beginPath();
        ctx.arc(x, y, r, 0, TAU);
        ctx.stroke();
        ctx.setLineDash([]);
        ctx.fillStyle = p.safe;
        ctx.fillRect(x - 7, y - 7, 3, 14);
        ctx.fillRect(x + 4, y - 7, 3, 14);
        ctx.fillRect(x - 4, y - 1, 8, 2);
        ctx.restore();
      }
      for (const e of state.enemies) {
        drawLaneAttack(ctx, e, p, {
          frozen: classic?.enemies.some((enemy) => enemy.id === e.id && enemy.frozen),
          screenScale: canvasCSSWidth / W,
          boardWidth: W,
          boardHeight: H,
        });
      }
      drawSnakeBody(ctx, state, { palette: p });
      drawEncounterLane(ctx, state, p);
      drawClassicPickups(ctx, classic, p, images, {
        screenScale: canvasCSSWidth / W,
        canvasCSSWidth,
      });
      for (const pad of state.supplies) {
        if (images.supply)
          drawPresentationImage(
            ctx,
            images.supply,
            pad.x * CELL,
            pad.y * CELL,
            16,
            16,
            images.presentationSprites.supply,
          );
        else {
          ctx.strokeStyle = p.safe;
          ctx.lineWidth = 1;
          ctx.strokeRect(pad.x * CELL - 7, pad.y * CELL - 7, 14, 14);
          ctx.fillStyle = p.safe;
          ctx.fillRect(pad.x * CELL - 3, pad.y * CELL - 1, 6, 2);
          ctx.fillRect(pad.x * CELL - 1, pad.y * CELL - 3, 2, 6);
        }
      }
      for (const o of state.objectives) {
        if (o.captured || (o.hidden && !o.revealed)) continue;
        const x = o.x * CELL,
          y = o.y * CELL;
        ctx.save();
        ctx.translate(x, y);
        ctx.rotate(Math.PI / 4);
        ctx.strokeStyle = p.accent;
        ctx.lineWidth = 2;
        ctx.strokeRect(-6, -6, 12, 12);
        ctx.restore();
        if (images.objective)
          drawPresentationImage(
            ctx,
            images.objective,
            x,
            y,
            16,
            16,
            images.presentationSprites.objective,
          );
        else {
          ctx.fillStyle = p.accent;
          ctx.fillRect(x - 2, y - 2, 4, 4);
        }
        if (!reduced) {
          ctx.strokeStyle = p.accent;
          ctx.globalAlpha = 0.2;
          ctx.beginPath();
          ctx.arc(x, y, 12 + Math.sin(time * 3) * 3, 0, TAU);
          ctx.stroke();
          ctx.globalAlpha = 1;
        }
      }
      drawRelayTriggers(ctx, relays, CELL);
      for (const f of state.ability.fields || []) {
        ctx.fillStyle = p.safe;
        ctx.globalAlpha = 0.12;
        ctx.beginPath();
        ctx.arc(f.x * CELL, f.y * CELL, (f.radius || 3) * CELL, 0, TAU);
        ctx.fill();
        ctx.globalAlpha = 0.6;
        ctx.strokeStyle = p.safe;
        ctx.stroke();
        if (f.kind === 'impact-pulse' && !reduced) {
          const phase = Math.max(
            0,
            Math.min(1, 1 - (f.until - time) / (state.classRecipe?.duration || 1)),
          );
          ctx.beginPath();
          ctx.arc(f.x * CELL, f.y * CELL, (f.radius || 3) * CELL * phase, 0, TAU);
          ctx.stroke();
        }
        ctx.globalAlpha = 1;
      }
      // Staged-core artwork and brackets sit behind the live cut. Its occupied cell
      // gets a compact marker in the ordinary actor pass afterward.
      for (const e of state.enemies) {
        if (e.type !== 'relay-sentinel' || state.encounter?.defeated) continue;
        const stunned = (e.stunnedUntil || 0) > time;
        ctx.globalAlpha = stunned ? 0.4 : 1;
        const body = this.enemyBody(actorFrames.get(e.id), enemySprites[e.type]);
        drawPresentedActor(
          ctx,
          actorFrames.get(e.id),
          p,
          body?.image,
          body?.geometry,
          body?.record,
        );
        ctx.globalAlpha = 1;
        drawEncounterCore(ctx, state, e, p, reduced);
      }
      if (combat) this.combatPresentation.drawActors(ctx, combat, p, combatOptions);
      drawEnemyPressure(ctx, classic, p, {
        screenScale: canvasCSSWidth / W,
        frames: actorFrames,
        fonts,
      });
      drawSnakeTargetOrder(ctx, state, combat?.actors, { palette: p, font: fonts.numeric });
      if (combat) drawCombatWarnings(ctx, combat, p, combatOptions);
      drawActiveTrail(ctx, state.trailSegments, state.trail, state.player, p, {
        time: this.time,
        reduced,
        screenScale: canvasCSSWidth / W,
      });
      drawLineImpacts(ctx, classic, {
        screenScale: canvasCSSWidth / W,
        time: this.time,
        reduced,
      });
      for (const e of state.enemies) {
        if (
          drawClassicEnemy(
            ctx,
            classic?.enemies.find((enemy) => enemy.id === e.id),
            p,
            images,
            actorFrames.get(e.id),
            this.enemyBody(actorFrames.get(e.id), enemySprites[e.type]),
          )
        )
          continue;
        if (e.type === 'relay-sentinel') {
          if (!state.encounter?.defeated) {
            ctx.strokeStyle = p.danger;
            ctx.lineWidth = 2;
            ctx.strokeRect(
              Math.floor(e.x) * CELL + 1,
              Math.floor(e.y) * CELL + 1,
              CELL - 2,
              CELL - 2,
            );
            ctx.fillStyle = p.danger;
            ctx.fillRect(e.x * CELL - 2, e.y * CELL - 2, 4, 4);
          }
          continue;
        }
        const stunned = (e.stunnedUntil || 0) > time,
          slowed = (e.slowUntil || 0) > time;
        ctx.globalAlpha = stunned ? 0.4 : 1;
        const body = this.enemyBody(actorFrames.get(e.id), enemySprites[e.type]);
        drawPresentedActor(
          ctx,
          actorFrames.get(e.id),
          p,
          body?.image,
          body?.geometry,
          body?.record,
        );
        ctx.globalAlpha = 1;
        if ((state.ability.scanUntil || 0) > time && e.type === 'bouncer' && !stunned) {
          ctx.strokeStyle = p.accent;
          ctx.setLineDash([3, 5]);
          ctx.beginPath();
          ctx.moveTo(e.x * CELL, e.y * CELL);
          const length = Math.hypot(e.vx, e.vy) || 1;
          ctx.lineTo(
            Math.max(17, Math.min(W - 17, e.x * CELL + (e.vx / length) * 12)),
            Math.max(17, Math.min(H - 17, e.y * CELL + (e.vy / length) * 12)),
          );
          ctx.stroke();
          ctx.setLineDash([]);
        }
        if (slowed) {
          ctx.strokeStyle = p.safe;
          ctx.strokeRect(e.x * CELL - 13, e.y * CELL - 13, 26, 26);
        }
      }
      if (combat) drawCombatProjectiles(ctx, combat, p, combatOptions);
      drawClassicStatus(ctx, classic, p, {
        screenScale: canvasCSSWidth / W,
        canvasCSSWidth,
        frames: actorFrames,
        fonts,
      });
      const facing =
        { up: 0, right: Math.PI / 2, down: Math.PI, left: -Math.PI / 2 }[state.player.direction] ??
        this.heading;
      let delta = ((facing - this.heading + Math.PI * 3) % TAU) - Math.PI;
      if (!paused) {
        this.heading += reduced
          ? delta
          : Math.sign(delta) * Math.min(Math.abs(delta), motionDt * 7);
        this.bank = reduced ? 0 : Math.max(-0.16, Math.min(0.16, delta * 0.12));
        this.speedRatio = (state.player.speed || 0) / state.rules.moveSpeed;
      }
      this.animation = advanceAnimation(
        this.animation,
        playerRecipe,
        { visualSpeed: state.player.speed || 0, cruiseSpeed: state.rules.moveSpeed },
        motionDt,
        { paused, reducedMotion: reduced },
      );
      const playerSize = playerPaintSize(playerBody, playerImage, {
        screenScale: canvasCSSWidth / W,
        canvasCSSWidth,
        style: this.style,
        scale: playerScale,
        geometry: playerGeometry,
      });
      const playerPose = {
        body: playerBody,
        image: playerImage,
        recipe: playerRecipe,
        animation: this.animation,
        scale: playerSize.scale,
        ...bodyMotionPose(playerBody, {
          seconds: state.time,
          heading: this.heading,
          bank: this.bank || 0,
          speedRatio: this.speedRatio || 0,
          reduced,
        }),
        speedRatio: this.speedRatio || 0,
        reducedMotion: reduced,
        pixel: 1 / CELL,
      };
      const bodyOffset = playerBodyOffset(playerPose, {
        x: state.player.x,
        y: state.player.y,
        width: columns,
        height: rows,
        margin: W / (canvasCSSWidth * CELL),
      });
      if (bodyOffset.x !== 0 || bodyOffset.y !== 0) {
        // A quiet connector identifies the real contact point, not a second hitbox.
        ctx.save();
        ctx.globalAlpha = 0.55;
        ctx.strokeStyle = p.muted;
        ctx.lineWidth = W / canvasCSSWidth;
        ctx.beginPath();
        ctx.moveTo(state.player.x * CELL, state.player.y * CELL);
        ctx.lineTo((state.player.x + bodyOffset.x) * CELL, (state.player.y + bodyOffset.y) * CELL);
        ctx.stroke();
        ctx.restore();
      }
      ctx.save();
      ctx.scale(CELL, CELL);
      if (state.status === 'respawning')
        ctx.globalAlpha = reduced ? 0.6 : 0.35 + 0.35 * Math.sin(this.time * 15);
      paintCharacter(ctx, {
        ...playerPose,
        bodyBackingOwner: this.bodyBacking,
        colors: { body: p.safe, accent: p.accent },
        x: state.player.x + bodyOffset.x,
        y: state.player.y + bodyOffset.y,
        // Only prepared bodies declare separate rotor geometry. Uploaded and
        // historical originals may contain baked blades and keep their path.
        showRotors: Boolean(playerGeometry),
      });
      ctx.restore();
      // This ring stays at the simulation contact radius, independent of body
      // size, source padding, banking and display scale. It is not a larger hitbox.
      ctx.save();
      ctx.globalAlpha = state.status === 'respawning' ? 0.55 : 0.85;
      ctx.beginPath();
      ctx.arc(
        state.player.x * CELL,
        state.player.y * CELL,
        state.rules.playerRadius * CELL,
        0,
        TAU,
      );
      ctx.strokeStyle = PRESENTATION_PLATE;
      ctx.lineWidth = playerGeometry ? contactCueUnderstroke(feedbackComparison?.contactStyle) : 3;
      ctx.stroke();
      ctx.strokeStyle = debug ? '#ffffff' : PRESENTATION_INK;
      ctx.lineWidth = 1;
      ctx.stroke();
      ctx.restore();
      if ((state.ability.shieldUntil || 0) > time || state.player.graceUntil > time) {
        ctx.strokeStyle = p.safe;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(
          state.player.x * CELL,
          state.player.y * CELL,
          Math.max(17, playerSize.diameter / 2 + 3),
          0,
          TAU,
        );
        ctx.stroke();
      }
      if (state.player.queuedDirection) {
        ctx.fillStyle = p.accent;
        ctx.font = `500 16px ${fonts?.numeric || '"Field Kit Mono", monospace'}`;
        ctx.fillText(
          { up: '↑', right: '→', down: '↓', left: '←' }[state.player.queuedDirection],
          state.player.x * CELL + playerSize.diameter / 2 + 3,
          state.player.y * CELL - playerSize.diameter / 2 - 2,
        );
      }
    }
    for (const f of this.effects) {
      if (!fullReveal)
        drawEventFeedback(ctx, f, p, {
          themeId: this.theme.id,
          themeFamily: this.theme.family,
          reduced,
          screenScale: canvasCSSWidth / W,
          width: W,
          height: H,
          fonts,
        });
      if (!fullReveal && !reduced && eventAccents && f.type === 'craft.redeployed' && f.age < 0.6) {
        ctx.save();
        ctx.strokeStyle = p.accent;
        ctx.globalAlpha = (1 - f.age / 0.6) * 0.6;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(
          (f.x || 0) * CELL,
          (f.y || 0) * CELL,
          (f.radius || 2) * CELL * Math.min(1, f.age / 0.35),
          0,
          TAU,
        );
        ctx.stroke();
        ctx.restore();
      }
      if (!fullReveal && !reduced && eventAccents && f.type === 'player.failed' && f.age < 0.6) {
        ctx.strokeStyle = f.type === 'player.failed' ? p.danger : p.accent;
        ctx.globalAlpha = (1 - f.age / 0.6) * 0.55;
        ctx.lineWidth = 4;
        ctx.strokeRect(2, 2, W - 4, H - 4);
        ctx.globalAlpha = 1;
      }
    }
    if (!fullReveal)
      drawRecoveryCue(ctx, state, p, {
        screenScale: canvasCSSWidth / W,
        width: W,
        fonts,
      });
    this.effects = this.effects.filter((f) => f.age < 0.7);
    if (fullReveal) drawCelebration(ctx, finale, p, W, H);
    // A terminal loss degrades the completed, already-masked feed. DOM results
    // and controls sit outside this canvas; raw concealed art is never sampled.
    if (reception.kind === 'lost') this.signalReception.draw(ctx, W, H, reception);
  }
  drawActor(c, shape, x, y, size, color, img, t, reduced) {
    if (img) {
      c.drawImage(img, x - size / 2, y - size / 2, size, size);
      return;
    }
    c.save();
    c.translate(x, y);
    const s = size / 20;
    c.scale(s, s);
    c.fillStyle = color;
    if (shape === 'tank') {
      c.fillRect(-8, -8, 4, 16);
      c.fillRect(4, -8, 4, 16);
      c.fillRect(-5, -6, 10, 12);
      c.fillStyle = this.theme.palette.ink;
      c.fillRect(-3, -3, 6, 6);
      c.fillStyle = color;
      c.fillRect(-1, -12, 2, 10);
    } else if (shape === 'radar') {
      c.fillRect(-9, 1, 18, 8);
      c.fillRect(-8, 9, 4, 3);
      c.fillRect(4, 9, 4, 3);
      c.strokeStyle = color;
      c.lineWidth = 2;
      c.beginPath();
      c.arc(0, -4, 9, Math.PI, TAU);
      c.stroke();
      c.fillRect(-1, -8, 2, 10);
    } else if (shape === 'drone') {
      c.strokeStyle = color;
      c.lineWidth = 2;
      c.beginPath();
      c.moveTo(-7, -7);
      c.lineTo(7, 7);
      c.moveTo(7, -7);
      c.lineTo(-7, 7);
      c.stroke();
      for (const dx of [-7, 7])
        for (const dy of [-7, 7]) {
          c.beginPath();
          c.arc(dx, dy, 3, 0, TAU);
          c.stroke();
        }
      c.fillRect(-3, -4, 6, 8);
    } else if (shape === 'moth') {
      poly(
        c,
        [
          [0, 0],
          [-10, -8],
          [-8, 4],
          [0, 7],
        ],
        color,
      );
      poly(
        c,
        [
          [0, 0],
          [10, -8],
          [8, 4],
          [0, 7],
        ],
        color,
      );
      c.fillStyle = this.theme.palette.ink;
      c.fillRect(-1, -6, 2, 14);
    } else {
      if (!reduced) c.rotate(t * (shape === 'core' ? 0.25 : 0.5));
      c.strokeStyle = color;
      c.lineWidth = 2;
      c.strokeRect(-7, -7, 14, 14);
      c.fillRect(-3, -3, 6, 6);
      if (shape === 'flower' || shape === 'core') {
        c.rotate(Math.PI / 4);
        c.strokeRect(-8, -8, 16, 16);
      }
    }
    c.restore();
  }
}
