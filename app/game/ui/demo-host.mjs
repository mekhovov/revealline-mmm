import { attachDemoLayout } from './demo-layout.mjs';
import { REACTION_PORTRAITS } from '../journey/reaction-portraits.mjs';
import { createReactionPreferences } from '../journey/reaction-preferences.mjs';
import { musicStatusLabel } from './music-credit.mjs';
import { createDemoReward } from './demo-reward.mjs';
import { createDemoSceneTransition } from './demo-scene-transition.mjs';
import {
  REWARD_BOARD_SECONDS,
  REWARD_STORY_SECONDS,
  animateRewardArrival,
  advanceRewardAge,
} from './reward-arrival.mjs';
import { contentText } from '../i18n/content.mjs';
import { t, onLocaleChange } from '../i18n/index.mjs';
import { createRun } from '../core/index.mjs';
import { arcadeActionCapabilities } from '../core/arcade-actions.mjs';
import { BoardPainter, boardPaintSizeForRun } from './render.mjs';
import { resolveDemoPicture } from './demo-picture.mjs';
import { resolveDemoJourneyPicture } from './demo-journey-picture.mjs';
import { createDemoDirector } from '../demo-director.mjs';
import {
  createDemoIdle,
  createDemoPractice,
  createDemoCaptions,
  readDemoSettings,
} from '../demo-experience.mjs';
import { attachDemoInput } from './demo-input.mjs';
import { attachDemoFullscreen } from './demo-fullscreen.mjs';
import { attachDemoClock } from './demo-clock.mjs';
import { attachDemoAudio } from './demo-audio.mjs';
import { bindingLabels } from '../key-bindings.mjs';
import { controllerBindingLabels } from '../controller-bindings.mjs';

export function resolveDemoTheme(entry, level, preferredThemeId) {
  return (
    entry.themes.find((item) => item.id === level.themeId) ||
    entry.themes.find((item) => item.id === entry.campaign.themeId) ||
    entry.themes.find((item) => item.id === preferredThemeId) ||
    entry.themes[0]
  );
}

/** In-page spectator/practice owner. All campaign mutations are outside this host. */
export function attachDemoHost({
  document: doc = globalThis.document,
  presets,
  getContext,
  loadSources,
  readMedia,
  getJourneyPictureContext = () => null,
  canAutoStart,
  canOpen,
  onEnter,
  onExit,
  onFreshStart,
  clearInput,
  menu,
  nativeConfirmOwned = () => false,
  canWrite = () => false,
  settingsKey,
  storage = globalThis.localStorage,
  setCollect = () => {},
  clearRecordings = async () => {},
  audio = null,
  audioMaster = null,
  onPreparationPhase = () => {},
  onQualityFrame = null,
  onQualityTransition = () => {},
  prepareActors = async () => null,
  preparePresentation = async () => null,
}) {
  const $ = (id) => doc.getElementById(id),
    dialog = $('demo-dialog'),
    canvas = $('demo-canvas');
  if (!dialog || !canvas) return null;
  const guidePreferences = createReactionPreferences({
    getStorage: () => storage,
    window: doc.defaultView ?? globalThis,
  });
  const reward = createDemoReward({ document: doc, canvas, readMedia, audioMaster });
  const sceneTransition = createDemoSceneTransition(canvas, doc);
  const fullscreen = attachDemoFullscreen({ document: doc, dialog, button: $('demo-fullscreen') });
  const layout = attachDemoLayout({ document: doc, dialog, canvas });
  const idle = createDemoIdle(),
    captions = createDemoCaptions();
  let settings = readDemoSettings(storage, settingsKey, getContext().reduced);
  let active = false,
    disposed = false,
    interrupted = false,
    detailsOpen = false,
    lifecycleSuspended = false,
    director = null,
    controller = null,
    epoch = 0,
    practice = null,
    armed = false,
    context = null,
    painter = null,
    picture = null,
    source = null,
    dwell = 0,
    rewardTail = 0,
    rewardAge = 0,
    caption = 'demo:tipStart',
    error = '',
    origin = null,
    switchClass = null,
    busy = false,
    adoptedPlayer = null,
    handoffGeneration = 0,
    handoffPending = false,
    transitionAge = 0,
    lastPaint = null,
    displayRevision = 0,
    displayCSSWidth = null,
    displayLost = false,
    paintOwner = null,
    recoveryPaintTicket = 0,
    controlsRun = null,
    controlsSecond = null,
    controlsCoverage = null,
    controlsLives = null,
    controlsStatus = null,
    controlsCaption = null,
    controlsController = null,
    controlsAudio = null;
  const owners = new WeakMap(),
    resourceOwners = new Set(),
    listeners = [];
  let pendingSourceLoads = 0,
    pendingPreparations = 0,
    workerHandles = 0,
    workersCreated = 0,
    workerTerminationRequests = 0;
  function observeWorker() {
    workerHandles++;
    workersCreated++;
    let released = false;
    return () => {
      if (released) return;
      released = true;
      workerHandles--;
      workerTerminationRequests++;
    };
  }
  function resourceSnapshot() {
    const pixels = (canvas.width || 0) * (canvas.height || 0),
      images = new Set(),
      categories = {},
      painters = [];
    let unavailableImages = 0;
    const summarize = (values) => {
      let pixels = 0,
        unknownDimensions = 0;
      for (const image of values) {
        const width = image.naturalWidth || image.width || 0,
          height = image.naturalHeight || image.height || 0;
        if (width > 0 && height > 0) pixels += width * height;
        else unknownDimensions++;
      }
      return { images: values.size, pixels, rgbaBytesEstimate: pixels * 4, unknownDimensions };
    };
    const sources = { presentation: new Set(), actors: new Set(), backdrop: new Set() };
    for (const owner of resourceOwners) {
      if (owner.painter) painters.push(owner.painter.resourceSnapshot());
      for (const [kind, snapshot] of [
        ['presentation', owner.presentation?.snapshot ?? owner.painter?.presentation],
        ['actors', owner.actors?.snapshot],
      ]) {
        try {
          for (const slot of Object.keys(snapshot?.resolved?.assets ?? {})) {
            const image = snapshot.image?.(slot)?.image;
            if (image) sources[kind].add(image);
          }
        } catch {
          unavailableImages++;
        }
      }
      const backdrop = owner.picture?.backdrop?.image;
      if (backdrop) sources.backdrop.add(backdrop);
    }
    for (const [kind, values] of Object.entries(sources)) {
      for (const image of values) images.add(image);
      categories[kind] = summarize(values);
    }
    return {
      format: 'DemoOwnedResourcesV1',
      active,
      disposed,
      phase: preparationPhase(),
      pendingSourceLoads,
      pendingPreparations,
      scenes: resourceOwners.size,
      display: { canvases: Number(pixels > 0), pixels, rgbaBytesEstimate: pixels * 4 },
      painters,
      transition: sceneTransition.resourceSnapshot(),
      reward: reward.resourceSnapshot(),
      workers: {
        observedHandles: workerHandles,
        created: workersCreated,
        terminationRequests: workerTerminationRequests,
        accounting:
          'Observed bot Worker handles; successful terminate() calls are requests, not proof of native thread exit.',
      },
      sharedImages: {
        categories,
        uniqueObserved: summarize(images),
        unavailableSnapshots: unavailableImages,
        accounting:
          'Image identity is deduplicated within Demo only. Category rows overlap and are nonadditive with Solo, legacy, enemy and actor pools.',
      },
      accounting:
        'Manual owner snapshot only. Closed Demo retains its display canvas. Pending preparations include canceled work until settlement; unknown native allocations are not zero.',
      estimate:
        'Canvas/image RGBA8 dimensions only; browser/GPU copies and overhead are unobservable. No total memory is claimed.',
    };
  }
  const listen = (element, type, fn, options) => {
    if (!element) return;
    element.addEventListener(type, fn, options);
    listeners.push(() => element.removeEventListener(type, fn, options));
  };
  const text = (id, value) => {
    if ($(id).textContent !== value) $(id).textContent = value;
    if ($(id).dataset.icon) {
      $(id).setAttribute('aria-label', value);
      $(id).title = value;
    }
  };
  const currentRun = () => practice?.state ?? director?.player?.state;
  const allPicturesPreview = () =>
    settings.showAllPictures && !settings.hidePictures && picture?.previewAvailable === true;
  const pictureVisibility = () =>
    settings.hidePictures
      ? 'blurred'
      : allPicturesPreview()
        ? 'clear'
        : (picture?.pictureVisibility ?? 'blurred');
  const foreground = () => !doc.hidden && doc.hasFocus();
  const ownsUI = () => !!doc.activeElement?.closest?.('[data-demo-ui]');
  const renderingLost = () => displayLost || (paintOwner?.losses.size ?? 0) > 0;
  const watching = () => active && !practice && !interrupted && !busy && !renderingLost();
  const currentOwner = (owner) =>
    active && !owner.released && owner.epoch === epoch && paintOwner === owner;
  function repaintRecovered() {
    const owner = paintOwner,
      ticket = ++recoveryPaintTicket,
      session = epoch;
    // Painter invalidation/retirement can report restoration synchronously.
    // Repaint only after that owner operation has finished, without clock debt.
    queueMicrotask(() => {
      if (
        ticket !== recoveryPaintTicket ||
        session !== epoch ||
        !owner ||
        !currentOwner(owner) ||
        renderingLost()
      )
        return;
      context = null;
      displayRevision++;
      displayCSSWidth = null;
      paint(0);
    });
  }
  let publishedPreparationPhase = null;
  function preparationPhase() {
    if (!active) return null;
    // An explicit foreground handoff may prepare an independent main renderer
    // while this Demo display remains lost. Suspension still retires handoffs.
    if (handoffPending && foreground()) return 'preparing';
    if (lifecycleSuspended) return 'suspended';
    // Spectator transport remains available in the background. Keep required
    // fetch/decode/worker work admitted, but park bulk main-thread work.
    if (!foreground()) return practice || handoffPending ? 'suspended' : 'playing';
    if (busy || director?.phase === 'loading') return 'preparing';
    if (practice) return practice.phase === 'playing' ? 'playing' : 'paused';
    return interrupted || director?.phase === 'paused' ? 'paused' : 'playing';
  }
  function publishPreparationPhase() {
    const phase = preparationPhase();
    if (phase === null || phase === publishedPreparationPhase) return;
    publishedPreparationPhase = phase;
    onPreparationPhase(phase);
  }
  const takeoverAvailable = () =>
    active && !practice && !busy && !lifecycleSuspended && !renderingLost() && foreground();
  function renderControls() {
    if (!active) return;
    publishPreparationPhase();
    if (doc.hidden) return;
    fullscreen.refresh();
    dialog.classList.toggle('is-practice', !!practice);
    const state = currentRun(),
      terminal = ['won', 'lost'].includes(state?.status),
      current = getContext();
    controlsRun = state;
    controlsSecond = Math.floor(state?.time ?? 0);
    controlsCoverage = Math.round((state?.coverage ?? 0) * 100);
    controlsLives = state?.lives;
    controlsStatus = state?.status;
    controlsCaption = caption;
    controlsController = current.controller?.id ?? null;
    const loading = busy || !director?.player;
    dialog.dataset.scene = loading ? 'loading' : 'playing';
    const audioState = audio?.snapshot?.(),
      track = audioState?.track;
    controlsAudio = audioControlFields(audioState);
    text(
      'demo-now-playing',
      track
        ? `${track.title} · ${track.artist || t('interface:artistNotRecorded')}`
        : t('interface:noTrackSelected'),
    );
    text(
      'demo-music-state',
      audioState?.muted ? t('demo:audio.soundOff') : musicStatusLabel(audioState?.status ?? 'idle'),
    );
    $('demo-now-playing').title = $('demo-now-playing').textContent;
    const guideVisible = guidePreferences.snapshot().enabled && !practice;
    $('demo-guide-portrait').hidden = !guideVisible;
    $('demo-guide-label').hidden = !guideVisible;
    const portrait =
      REACTION_PORTRAITS.guide[
        !current.reduced &&
        (current.quality ?? 'full') === 'full' &&
        !interrupted &&
        !loading &&
        ['demo:tipClose', 'demo:tipPowerup', 'demo:tipObjective'].includes(caption)
          ? 'react'
          : 'idle'
      ];
    if ($('demo-guide-portrait').getAttribute('src') !== portrait)
      $('demo-guide-portrait').src = portrait;
    $('demo-join-hint').hidden = !!practice;

    text(
      'demo-source',
      t(
        practice
          ? 'demo:practice'
          : source?.kind === 'bot'
            ? 'demo:live'
            : source?.kind === 'improv'
              ? 'demo:improv'
              : 'demo:recorded',
      ),
    );
    text('demo-level', source ? contentText(source.level, 'name') : t('demo:loading'));
    $('demo-level').title = $('demo-level').textContent;
    text(
      'demo-caption',
      t(
        practice
          ? terminal
            ? 'demo:practiceComplete'
            : armed
              ? 'demo:steer'
              : 'demo:practicePaused'
          : state?.status === 'won'
            ? 'demo:recapWin'
            : state?.status === 'lost'
              ? 'demo:recapLoss'
              : caption,
        { percent: Math.round((state?.coverage ?? 0) * 100) },
      ),
    );
    text(
      'demo-status',
      error ||
        (loading
          ? t('demo:loading')
          : state
            ? t('demo:readout', {
                percent: Math.round(state.coverage * 100),
                lives: state.lives,
                seconds: Math.floor(state.time),
              })
            : ''),
    );
    text(
      'demo-picture-note',
      t(
        settings.hidePictures
          ? 'demo:hiddenPicture'
          : allPicturesPreview()
            ? 'demo:previewPicture'
            : pictureVisibility() === 'clear'
              ? 'demo:earnedPicture'
              : 'demo:blurredPicture',
      ),
    );
    text('demo-panel-caption', $('demo-caption').textContent);
    text('demo-panel-status', $('demo-status').textContent);
    $('demo-panel').hidden = !detailsOpen && !interrupted && !practice;
    const details = $('demo-panel').hidden ? 'closed' : 'open';
    if (dialog.dataset.details !== details) dialog.dataset.details = details;
    $('demo-details-close').hidden = interrupted || !!practice;
    $('demo-details-toggle').setAttribute('aria-expanded', String(!$('demo-panel').hidden));
    text('demo-details-toggle', t('demo:details'));
    text('demo-next', t('demo:nextShort'));
    $('demo-next').setAttribute('aria-label', t('demo:next'));
    text('demo-interrupt', t('demo:playChoices'));
    text('demo-back', t('demo:back'));
    $('demo-actions').hidden = !interrupted && !practice;
    $('demo-takeover').hidden = !!practice;
    $('demo-takeover').disabled = loading || terminal || renderingLost();
    $('demo-fresh').disabled = loading;
    $('demo-resume').disabled = busy || (!!practice && terminal) || renderingLost();
    text('demo-resume', t(practice ? 'demo:continuePractice' : 'demo:keepWatching'));
    $('demo-next').hidden = !!practice;
    $('demo-next').disabled = busy || renderingLost();
    $('demo-practice-controls').hidden = !practice;
    $('demo-interrupt').hidden = !!practice;
    $('demo-watch-pause').hidden = !!practice;
    $('demo-watch-pause').disabled = handoffPending || renderingLost();
    text('demo-watch-pause', t(interrupted ? 'demo:resumeShort' : 'demo:pauseShort'));
    $('demo-watch-pause').setAttribute(
      'aria-label',
      t(interrupted ? 'demo:resumeDemo' : 'demo:pauseDemo'),
    );
    $('demo-watch-pause').setAttribute('aria-pressed', String(interrupted));

    $('demo-return').hidden = !practice;
    $('demo-return').disabled = renderingLost();
    $('demo-pause').hidden = !practice || !armed;
    const capabilities = arcadeActionCapabilities(state?.level);
    $('demo-ability').hidden = !capabilities.manualAbility;
    $('demo-pickup').hidden = !capabilities.manualPickup;
    $('demo-boost').hidden = !capabilities.manualBoost;
    $('demo-craft').hidden = !practice || !state?.hangars?.length;
    const keys = bindingLabels(current.preferences.keyboardBindings);
    text(
      'demo-bound-controls',
      t('demo:boundControls', {
        directions: [keys.up, keys.down, keys.left, keys.right].join(' · '),
        pause:
          keys.pause
            .split(' / ')
            .filter((key) => key !== 'Esc')
            .join(' / ') || t('common:actions.pause'),
      }),
    );
    $('demo-pad-controls').hidden = !current.controller;
    if (current.controller) {
      const pad = controllerBindingLabels(
        current.preferences.controllerBindings,
        current.controller.id,
      ).flight;
      text(
        'demo-pad-controls',
        t('demo:padControls', {
          directions: [pad.up, pad.down, pad.left, pad.right].join(' · '),
          pause: pad.pause,
        }),
      );
    }
    for (const action of ['boost', 'ability', 'pickup'])
      text(`demo-${action}`, `${t(`demo:${action}`)} · ${keys[action]}`);
  }
  const audioControlFields = (state) => [
    state?.track ? String(state.track.title) : null,
    state?.track?.artist || t('interface:artistNotRecorded'),
    !!state?.muted,
    state?.status ?? 'idle',
  ];
  function audioChanged() {
    if (!active) return;
    publishPreparationPhase();
    if (doc.hidden) return;
    const fields = audioControlFields(audio?.snapshot?.());
    if (controlsAudio && fields.every((value, index) => value === controlsAudio[index])) return;
    renderControls();
  }
  function refreshReadout() {
    const state = currentRun();
    if (
      state !== controlsRun ||
      Math.floor(state?.time ?? 0) !== controlsSecond ||
      Math.round((state?.coverage ?? 0) * 100) !== controlsCoverage ||
      state?.lives !== controlsLives ||
      state?.status !== controlsStatus ||
      caption !== controlsCaption
    )
      renderControls();
  }
  const invalidateDisplay = () => {
    if (!active) return;
    displayRevision++;
    displayCSSWidth = null;
    if (lifecycleSuspended && !renderingLost()) repaintRecovered();
  };
  listen(doc.defaultView, 'resize', invalidateDisplay);
  listen(doc, 'fullscreenchange', invalidateDisplay);
  listen(doc, 'visibilitychange', () => {
    renderControls();
    if (!doc.hidden && lifecycleSuspended && !renderingLost()) repaintRecovered();
  });
  const preferencesChanged = () => {
    if (!active) return;
    invalidateDisplay();
    renderControls();
  };
  listen(doc, 'change', (event) => {
    // Demo's own controls already publish their precise change synchronously.
    if (event.target?.id?.startsWith('demo-') || event.target?.closest?.('[data-demo-ui]')) return;
    preferencesChanged();
  });
  listen(doc.defaultView, 'storage', preferencesChanged);
  listen(canvas, 'contextlost', () => {
    if (displayLost) return;
    // This canvas survives close/reopen; only its own restoration clears loss.
    displayLost = true;
    context = null;
    suspend();
  });
  listen(canvas, 'contextrestored', () => {
    displayLost = false;
    context = null;
    // A reopened display can lose context before a player exists. Let its
    // required preparation finish in a paused state instead of deadlocking
    // behind the shared suspended admission queue and a disabled Resume.
    if (active && !paintOwner && (busy || director?.phase === 'loading'))
      lifecycleSuspended = false;
    invalidateDisplay();
    renderControls();
    repaintRecovered();
  });
  const displayObserver = doc.defaultView?.ResizeObserver
    ? new doc.defaultView.ResizeObserver(invalidateDisplay)
    : null;
  displayObserver?.observe(canvas);
  function clear() {
    clearInput();
    input.clear();
  }
  function interrupt({ focus = true } = {}) {
    if (!active) return;
    interrupted = true;
    onQualityTransition();
    reward.pause();
    clock.reset();
    armed = false;
    director?.pause();
    practice?.pause();
    clear();
    renderControls();
    if (focus) $('demo-fresh').focus({ preventScroll: true });
  }
  function foregroundLost() {
    reward.pause();
    idle.activity();
    clear();
    if (practice || handoffPending) suspend();
    else publishPreparationPhase();
  }
  function suspend() {
    idle.activity();
    if (!active) return;
    handoffGeneration++;
    handoffPending = false;
    clock.stop();
    onQualityTransition();
    busy = false;
    interrupted = true;
    lifecycleSuspended = true;
    armed = false;
    director?.suspend();
    practice?.pause();
    clear();
    renderControls();
  }
  function close({ handoff = false } = {}) {
    if (!active) return;
    active = false;
    onQualityTransition();
    displayCSSWidth = null;
    publishedPreparationPhase = null;
    detailsOpen = false;
    sceneTransition.clear();
    reward.reset();
    delete dialog.dataset.reward;
    clock.stop();
    audio?.cancelPending?.();
    audioControls.reset();
    handoffPending = false;
    controller?.abort();
    epoch++;
    handoffGeneration++;
    adoptedPlayer = null;
    paintOwner = null;
    director?.dispose();
    director = null;
    painter = picture = source = practice = context = lastPaint = null;
    armed = false;
    busy = false;
    clear();
    idle.activity();
    fullscreen.release();
    dialog.close();
    onExit({ handoff, origin });
  }
  async function prepare(source, options) {
    pendingPreparations++;
    try {
      return await prepareScene(source, options);
    } finally {
      pendingPreparations--;
    }
  }
  async function prepareScene(source, { signal }) {
    const player = await source.create({ signal, onWorker: observeWorker });
    const owner = { epoch, released: false, losses: new Set(), retiredSurfaces: new WeakSet() };
    let nextPicture = null,
      nextPainter = null,
      nextActors = null,
      nextPresentation = null,
      released = false;
    const release = () => {
      if (released) return;
      released = true;
      owner.released = true;
      resourceOwners.delete(owner);
      owner.losses.clear();
      player.dispose?.();
      nextPicture?.dispose();
      nextPainter?.dispose?.();
      nextActors?.release();
      nextPresentation?.release();
    };
    const check = () => {
      if (signal.aborted) throw new DOMException('Cancelled', 'AbortError');
    };
    // A scene deadline must retire its live Worker and painter immediately,
    // even when image/media loading never settles or ignores cancellation.
    resourceOwners.add(owner);
    signal.addEventListener('abort', release, { once: true });
    try {
      check();
      const current = getContext(),
        entry = source.entry;
      const theme = resolveDemoTheme(entry, source.level, current.themeId);
      nextActors = await prepareActors(entry, source.level, theme.id, { signal });
      owner.actors = nextActors;
      if (released) nextActors?.release();
      check();
      nextPainter = new BoardPainter(presets, {
        onContextLoss: ({ owner: surface }) => {
          if (
            owner.released ||
            owner.epoch !== epoch ||
            owner.retiredSurfaces.has(surface) ||
            owner.losses.has(surface)
          )
            return;
          owner.losses.add(surface);
          if (currentOwner(owner)) suspend();
        },
        onContextRestored: ({ owner: surface, retired }) => {
          if (owner.released || owner.epoch !== epoch) return;
          if (retired) owner.retiredSurfaces.add(surface);
          if (!owner.losses.delete(surface)) return;
          if (currentOwner(owner)) {
            renderControls();
            repaintRecovered();
          }
        },
      });
      owner.painter = nextPainter;
      nextPresentation = await preparePresentation(nextPainter, entry, source.level, theme.id, {
        signal,
      });
      owner.presentation = nextPresentation;
      if (released) nextPresentation?.release();
      check();
      nextPainter.setLevel(source.level, { seed: player.info.seed });
      const overrides = {
        ...entry.visualOverrides,
        ...(entry.levelVisuals?.find((item) => item.levelId === source.levelId)?.visualOverrides ??
          {}),
      };
      // Match the runtime's theme-specific map artwork binding.
      const visual = entry.levelVisuals?.find(
        (item) => item.levelId === source.levelId && item.themeId === theme.id,
      );
      if (visual?.background) overrides.background = visual.background;
      await nextPainter.setLook(
        theme,
        theme.classBodies?.[player.state.activeClassId] || theme.player,
        overrides,
      );
      check();
      const journey = getJourneyPictureContext(source);
      nextPicture = journey
        ? await resolveDemoJourneyPicture({ entry, level: source.level, theme, journey, signal })
        : await resolveDemoPicture({
            entry,
            level: source.level,
            theme,
            library: current.library,
            entries: current.entries,
            readMedia,
            signal,
          });
      owner.picture = nextPicture;
      // A media decoder may have completed after the abort cleanup ran.
      if (released) nextPicture.dispose();
      check();
      if (nextPicture.artSeed !== null)
        nextPainter.setLevel(source.level, { seed: nextPicture.artSeed });
      const wrapper = {
        get state() {
          return player.state;
        },
        get phase() {
          return player.phase;
        },
        get error() {
          return player.error;
        },
        get maxAdvanceSeconds() {
          return player.maxAdvanceSeconds;
        },
        info: player.info,
        play: () => player.play(),
        pause: () => player.pause(),
        advance: (dt) => player.advance(dt),
        exportRecording: () => player.exportRecording(),
        forkForPractice: (options) => player.forkForPractice(options),
        dispose: release,
      };
      Object.assign(owner, {
        painter: nextPainter,
        actors: nextActors,
        picture: nextPicture,
        theme,
        overrides,
        classId: player.state.activeClassId,
      });
      owners.set(wrapper, owner);
      return wrapper;
    } catch (failure) {
      release();
      throw failure;
    } finally {
      signal.removeEventListener('abort', release);
    }
  }
  function changed(snapshot) {
    if (!active) return;
    if (snapshot.phase === 'loading') {
      sceneTransition.begin(reward.departureFrame());
      reward.reset();
      delete dialog.dataset.reward;
      clock.reset();
      source = painter = picture = context = adoptedPlayer = paintOwner = null;
      caption = 'demo:tipStart';
    }
    if (snapshot.source && snapshot.player !== adoptedPlayer) {
      adoptedPlayer = snapshot.player;
      transitionAge = 0;
      clock.reset();
      context = null;
      source = snapshot.source;
      const look = owners.get(snapshot.player);
      paintOwner = look;
      ({ painter, picture } = look);
      audio?.setScene?.({ source, theme: look.theme });
      const size = boardPaintSizeForRun(snapshot.player.state);
      canvas.width = size.width;
      canvas.height = size.height;
      displayCSSWidth = null;
      onQualityTransition();
      sceneTransition.ready();
      captions.reset();
      caption = 'demo:tipStart';
      dwell = 0;
      rewardTail = 0;
      rewardAge = 0;
      error = '';
      if (renderingLost()) suspend();
      else if (interrupted || lifecycleSuspended) repaintRecovered();
    }
    if (snapshot.phase === 'unavailable') {
      close();
      text('demo-availability', t('demo:unavailable'));
      return;
    }
    if (snapshot.phase === 'paused') interrupted = true;
    renderControls();
  }
  async function open() {
    if (disposed || active || !canOpen()) return false;
    origin = doc.activeElement;
    onEnter();
    onQualityTransition();
    displayCSSWidth = null;
    clear();
    active = true;
    interrupted = displayLost;
    lifecycleSuspended = displayLost;
    practice = null;
    armed = false;
    error = '';
    source = null;
    busy = true;
    context = null;
    picture = null;
    painter = null;
    caption = 'demo:tipStart';
    if (!displayLost) canvas.getContext('2d')?.clearRect(0, 0, canvas.width, canvas.height);
    controller?.abort();
    controller = new AbortController();
    const signal = controller.signal,
      ticket = ++epoch;
    dialog.showModal();
    if (!displayLost) clock.start();
    audioControls.render();
    canvas.focus({ preventScroll: true });
    renderControls();
    try {
      let sources;
      pendingSourceLoads++;
      try {
        sources = await loadSources({ signal });
      } finally {
        pendingSourceLoads--;
      }
      if (!active || signal.aborted || ticket !== epoch) return false;
      director = createDemoDirector({ sources, prepare, onChange: changed });
      busy = false;
      if (interrupted) {
        await director.next();
        director.pause();
      } else await director.start();
      return active;
    } catch (failure) {
      if (ticket !== epoch || signal.aborted) return false;
      error = t('demo:loadError');
      close();
      text('demo-availability', t('demo:loadError'));
      return false;
    } finally {
      if (ticket === epoch) {
        busy = false;
        renderControls();
      }
    }
  }
  function startPractice(run, intent = null) {
    reward.reset();
    delete dialog.dataset.reward;
    switchClass = null;
    clock.stop();
    practice = createDemoPractice(run);
    displayCSSWidth = null;
    onQualityTransition();
    director.pause();
    interrupted = true;
    armed = true;
    lifecycleSuspended = false;
    dwell = 0;
    $('demo-craft').replaceChildren(
      ...run.classRecipes.map((recipe) => {
        const option = doc.createElement('option');
        option.value = recipe.id;
        option.textContent = contentText(recipe, 'label');
        return option;
      }),
    );
    $('demo-craft').value = run.activeClassId;
    clear();
    if (intent && (intent.direction || ['ability', 'pickup', 'boost'].includes(intent.action)))
      practice.start(intent);
    renderControls();
    if (intent?.action === 'hangar' && !$('demo-craft').hidden)
      $('demo-craft').focus({ preventScroll: true });
    else canvas.focus({ preventScroll: true });
  }
  async function takeover(intent = null) {
    if (
      busy ||
      !director?.player ||
      practice ||
      renderingLost() ||
      (intent && !takeoverAvailable())
    )
      return;
    interrupt({ focus: false });
    busy = true;
    handoffPending = true;
    clock.stop();
    renderControls();
    const ticket = epoch,
      handoff = ++handoffGeneration,
      player = director.player;
    try {
      const terminal = ['won', 'lost'].includes(player.state.status);
      let fork;
      if (terminal && intent) {
        const recording = player.exportRecording();
        fork = { run: createRun(recording.level, recording.options) };
      } else fork = await player.forkForPractice({ signal: controller.signal });
      if (
        !active ||
        ticket !== epoch ||
        handoff !== handoffGeneration ||
        director.player !== player ||
        renderingLost() ||
        doc.hidden ||
        !doc.hasFocus()
      )
        return;
      startPractice(fork.run, intent);
    } catch {
      if (active && ticket === epoch) error = t('demo:takeoverError');
    } finally {
      if (ticket === epoch && handoff === handoffGeneration) {
        busy = false;
        handoffPending = false;
        if (!practice && !lifecycleSuspended) clock.start();
        renderControls();
      }
    }
  }
  async function fresh() {
    if (busy || !source || !director?.player) return;
    interrupt();
    busy = true;
    handoffPending = true;
    clock.stop();
    renderControls();
    const ticket = epoch,
      handoff = ++handoffGeneration,
      selected = source;
    const current = () =>
      active && ticket === epoch && handoff === handoffGeneration && !doc.hidden && doc.hasFocus();
    try {
      const adopted = await onFreshStart(selected, current);
      if (!current()) return;
      if (adopted) {
        close({ handoff: true });
        return;
      }
      // A main-game handoff owns an independent renderer. A fallback practice
      // still uses this Demo painter and must wait for its recovery.
      if (renderingLost()) return;
      const recording = director.player.exportRecording();
      startPractice(createRun(recording.level, recording.options));
    } catch {
      if (active && ticket === epoch) error = t('demo:takeoverError');
    } finally {
      if (ticket === epoch && handoff === handoffGeneration) {
        busy = false;
        handoffPending = false;
        if (!practice && !lifecycleSuspended) clock.start();
        renderControls();
      }
    }
  }
  const input = attachDemoInput({
    root: dialog,
    canvas,
    active: () => active,
    watching,
    takeoverAvailable,
    busy: () => busy,
    practice: () => !!practice && armed,
    getBindings: () => getContext().preferences.keyboardBindings,
    getTouchSettings: () => getContext().touchSettings ?? { mode: 'swipe' },
    tapMode: () => getContext().tapSteering === true,
    interrupt,
    takeover,
    back: () => close(),
    pause: interrupt,
    menu,
    nativeConfirmOwned,
    steer: (direction) => {
      if (practice && armed) {
        practice.steer(direction);
        renderControls();
      }
    },
    onHangar: () => {
      interrupt();
      $('demo-craft').focus();
    },
    ownsUI,
    onActivity: () => idle.activity(),
  });
  listen($('shell-demo'), 'click', () => void open());
  listen($('demo-button'), 'click', () => void open());
  listen($('demo-interrupt'), 'click', interrupt);
  listen($('demo-pause'), 'click', interrupt);
  listen($('demo-watch-pause'), 'click', () => {
    if (interrupted) resumeWatching();
    else interrupt({ focus: false });
  });
  listen($('demo-back'), 'click', () => close());
  listen(dialog, 'cancel', (event) => {
    event.preventDefault();
    close();
  });
  listen($('demo-takeover'), 'click', () => void takeover());
  listen($('demo-fresh'), 'click', () => void fresh());
  listen($('demo-details-toggle'), 'click', () => {
    detailsOpen = !detailsOpen;
    displayCSSWidth = null;
    renderControls();
    if (detailsOpen && !interrupted && !practice)
      $('demo-details-close').focus({ preventScroll: true });
  });
  listen($('demo-details-close'), 'click', () => {
    detailsOpen = false;
    displayCSSWidth = null;
    if (interrupted || practice) return;
    renderControls();
    $('demo-details-toggle').focus();
  });
  listen($('demo-next'), 'click', () => {
    if (!busy && !practice && !renderingLost()) {
      interrupted = false;
      lifecycleSuspended = false;
      error = '';
      clear();
      clock.reset();
      clock.start();
      void director.next({ play: true });
      canvas.focus({ preventScroll: true });
    }
  });
  listen($('demo-craft'), 'change', () => {
    switchClass = $('demo-craft').value;
  });
  function resumeWatching() {
    if (renderingLost()) return;
    onQualityTransition();
    clear();
    error = '';
    lifecycleSuspended = false;
    if (practice) armed = true;
    else {
      interrupted = false;
      void director?.play();
    }
    if (!practice) clock.start();
    renderControls();
    canvas.focus({ preventScroll: true });
  }
  listen($('demo-resume'), 'click', resumeWatching);
  listen($('demo-return'), 'click', () => {
    if (renderingLost()) return;
    onQualityTransition();
    practice = null;
    armed = false;
    interrupted = false;
    lifecycleSuspended = false;
    clear();
    void director?.play();
    clock.start();
    canvas.focus({ preventScroll: true });
    renderControls();
  });
  for (const type of ['keydown', 'pointerdown', 'wheel'])
    listen(doc, type, () => idle.activity(), true);
  const showAllPictureControls = [
    $('demo-show-all-pictures'),
    $('demo-show-all-pictures-live'),
  ].filter(Boolean);
  const saveSettings = () => {
    sceneTransition.clear();
    if (!painter) canvas.getContext('2d')?.clearRect(0, 0, canvas.width, canvas.height);
    settings = {
      ...settings,
      auto: $('demo-auto').checked,
      collect: $('demo-collect').checked,
      hidePictures: $('demo-hide-pictures').checked,
      showAllPictures:
        showAllPictureControls.some((control) => control.checked) &&
        !$('demo-hide-pictures').checked,
    };
    setCollect(settings.collect);
    if (settings.hidePictures) reward.reset();
    renderControls();
    paint(0);
    idle.activity();
    try {
      if (canWrite()) storage.setItem(settingsKey, JSON.stringify({ version: 1, ...settings }));
    } catch {
      text('demo-settings-status', t('demo:settingsSessionOnly'));
    }
  };
  $('demo-auto').checked = settings.auto;
  $('demo-collect').checked = settings.collect;
  $('demo-hide-pictures').checked = settings.hidePictures;
  for (const control of showAllPictureControls) control.checked = settings.showAllPictures;
  setCollect(settings.collect);
  listen($('demo-auto'), 'change', saveSettings);
  listen($('demo-collect'), 'change', saveSettings);
  listen($('demo-hide-pictures'), 'change', () => {
    if ($('demo-hide-pictures').checked)
      for (const control of showAllPictureControls) control.checked = false;
    saveSettings();
  });
  for (const control of showAllPictureControls)
    listen(control, 'change', () => {
      for (const other of showAllPictureControls) other.checked = control.checked;
      if (control.checked) $('demo-hide-pictures').checked = false;
      saveSettings();
    });
  listen($('demo-clear'), 'click', async () => {
    try {
      await clearRecordings();
      text('demo-settings-status', t('demo:cleared'));
    } catch {
      text('demo-settings-status', t('demo:cacheError'));
    }
  });
  function advance(seconds, { fresh = true } = {}) {
    if (renderingLost()) return;
    const result = practice
      ? practice.advance(seconds, () => {
          const controls = { ...input.controls(), switchClass };
          switchClass = null;
          return controls;
        })
      : director?.advance(seconds);
    const state = currentRun();
    if (!state || !painter) return;
    transitionAge += seconds;
    const look = owners.get(director.player);
    if (look.classId !== state.activeClassId) {
      look.classId = state.activeClassId;
      void painter.setLook(
        look.theme,
        look.theme.classBodies?.[look.classId] || look.theme.player,
        look.overrides,
      );
    }
    if (result?.reason === 'frame-gap') interrupt();
    if (
      practice &&
      result?.events?.some((event) => ['capture.stopped', 'player.failed'].includes(event.type))
    )
      clear();
    if (result?.events?.length && fresh) {
      if (!doc.hidden) painter.effectsFor(result.events, state);
      if (settings.gameSounds)
        audio?.events?.(result.events, state, look.theme, {
          bodyId: look.theme.classBodies?.[state.activeClassId] || look.theme.player,
          source,
        });
    }
    if (!practice && !interrupted) caption = captions.advance(seconds, result?.events);
    if (!doc.hidden) refreshReadout();
    if (!practice && !interrupted && director.phase === 'complete') {
      dwell += Math.min(seconds, 0.25);
      const presentation = getContext();
      const holding = reward.update({
        won: state.status === 'won',
        age: rewardAge,
        allowed: pictureVisibility() === 'clear',
        pin: picture?.storyPin,
        paused: interrupted || !foreground(),
        reduced: presentation.reduced || (presentation.quality ?? 'full') !== 'full',
        volume: presentation.library.cinematicVolume ?? 0.7,
        muted: !settings.gameSounds,
      });
      if (!holding && (foreground() ? rewardAge : dwell) >= REWARD_STORY_SECONDS)
        rewardTail += Math.min(seconds, 0.25);
      else rewardTail = 0;
      if (state.status === 'won' ? rewardTail >= 2.2 : dwell >= 4) {
        dwell = 0;
        void director.next();
      }
    }
  }

  function paint(seconds) {
    if (!active || doc.hidden || renderingLost()) return;
    const state = currentRun();
    const current = getContext();
    if (
      lastPaint &&
      (lastPaint.reduced !== current.reduced || lastPaint.quality !== (current.quality ?? 'full'))
    )
      renderControls();
    const quality = current.quality ?? 'full',
      reduced = current.reduced || quality !== 'full';
    sceneTransition.paint(seconds, reduced);
    if (!painter || !state) return;
    const options = current.renderOptions ?? {},
      paused = practice ? practice.phase !== 'playing' : director.phase !== 'playing',
      animated =
        !interrupted &&
        (practice
          ? practice.phase === 'playing'
          : ['playing', 'complete'].includes(director.phase)),
      visibility = pictureVisibility();
    // Paused presentation retains its accepted pixels. Explicit UI, sizing,
    // preference and asynchronous painter changes still invalidate this record.
    if (
      !animated &&
      lastPaint?.state === state &&
      lastPaint.tick === state.tick &&
      lastPaint.painter === painter &&
      lastPaint.generation === painter.preparationGeneration &&
      lastPaint.paintRevision === painter.paintRevision &&
      lastPaint.displayRevision === displayRevision &&
      lastPaint.paused === paused &&
      lastPaint.interrupted === interrupted &&
      lastPaint.detailsOpen === detailsOpen &&
      lastPaint.reduced === current.reduced &&
      lastPaint.quality === quality &&
      lastPaint.visibility === visibility &&
      lastPaint.textFace === options.textFace &&
      lastPaint.showGrid === options.showGrid &&
      lastPaint.showCombatScrap === options.showCombatScrap &&
      lastPaint.brutal === options.brutal &&
      lastPaint.blood === options.blood
    )
      return;
    if (state.status === 'won')
      rewardAge = advanceRewardAge(rewardAge, seconds, interrupted || !foreground());
    const expanded = state.status === 'won' && rewardAge >= REWARD_BOARD_SECONDS && !practice;
    if (expanded && dialog.dataset.reward !== 'expanded') {
      const from = canvas.getBoundingClientRect();
      dialog.dataset.reward = 'expanded';
      animateRewardArrival(canvas, from, reduced);
      displayCSSWidth = null;
    } else if (!expanded && dialog.dataset.reward) {
      delete dialog.dataset.reward;
      displayCSSWidth = null;
    }
    context ??= canvas.getContext('2d');
    if (context) {
      if (displayCSSWidth === null) {
        const height = canvas.clientHeight,
          width = canvas.clientWidth;
        displayCSSWidth =
          height > 0 ? Math.min(width, (height * canvas.width) / canvas.height) : width;
      }
      painter.draw(context, state, Math.min(seconds, 0.1), {
        ...options,
        actorAppearance: owners.get(director.player)?.actors
          ? {
              style: owners.get(director.player).actors.pin().style,
              snapshot: owners.get(director.player).actors.snapshot,
            }
          : null,
        displayCSSWidth,
        quality,
        paused,
        reduced: current.reduced,
        fullReveal: state.status === 'won',
        backdrop: picture?.backdrop,
        pictureVisibility: visibility,
        pictureInterference: true,
        celebrationPaused: interrupted,
        defeatEffectsRunning: !interrupted,
        signalReception:
          state.status === 'won' ? 'off' : state.status === 'lost' ? 'lost' : 'playing',
        signalEffectsRunning:
          !interrupted &&
          (state.status === 'lost' ||
            (practice ? practice.phase === 'playing' : director.phase === 'playing')),
        demoTransition: reduced ? 0 : Math.max(0, 1 - transitionAge / 0.55),
      });
      lastPaint ??= {};
      lastPaint.state = state;
      lastPaint.tick = state.tick;
      lastPaint.painter = painter;
      lastPaint.generation = painter.preparationGeneration;
      lastPaint.paintRevision = painter.paintRevision;
      lastPaint.displayRevision = displayRevision;
      lastPaint.paused = paused;
      lastPaint.interrupted = interrupted;
      lastPaint.detailsOpen = detailsOpen;
      lastPaint.reduced = current.reduced;
      lastPaint.quality = quality;
      lastPaint.visibility = visibility;
      lastPaint.textFace = options.textFace;
      lastPaint.showGrid = options.showGrid;
      lastPaint.showCombatScrap = options.showCombatScrap;
      lastPaint.brutal = options.brutal;
      lastPaint.blood = options.blood;
    }
  }
  function updateAudio() {
    publishPreparationPhase();
    const state = currentRun();
    const look = director?.player && owners.get(director.player);
    audio?.update?.({
      active: settings.gameSounds && (practice ? practice.phase === 'playing' : watching()),
      state,
      theme: look?.theme,
      bodyId: look?.theme.classBodies?.[state?.activeClassId] || look?.theme.player,
      source,
    });
  }
  const clock = attachDemoClock({
    document: doc,
    observeFrame: onQualityFrame,
    getFrameOwner: () => (watching() && foreground() ? (director?.player ?? null) : null),
    frameBoundary: onQualityTransition,
    getPlaybackState: () => ({
      phase:
        !active || practice
          ? 'inactive'
          : busy
            ? 'loading'
            : interrupted
              ? 'paused'
              : (director?.phase ?? 'loading'),
      maxAdvanceSeconds:
        director?.phase === 'playing' ? director.player?.maxAdvanceSeconds : undefined,
    }),
    advance,
    paint,
    updateAudio,
  });
  const audioControls = attachDemoAudio({
    root: $('demo-audio'),
    document: doc,
    audio,
    active: () => active,
    getGameSounds: () => settings.gameSounds,
    onGameSoundsChange: (value) => {
      settings.gameSounds = value;
      saveSettings();
    },
  });
  const unsubscribe = onLocaleChange(preferencesChanged);
  const unsubscribeAudio = audio?.subscribe?.(audioChanged);
  const unsubscribeGuide = guidePreferences.subscribe(renderControls);
  return {
    get active() {
      return active;
    },
    // Identity only: the parent observes practice at its existing POST_RENDER
    // boundary, including controller and submission work, without a second clock.
    get qualityPracticeOwner() {
      return active &&
        foreground() &&
        !busy &&
        !lifecycleSuspended &&
        !renderingLost() &&
        armed &&
        practice?.phase === 'playing'
        ? practice.state
        : null;
    },
    get preparationPhase() {
      return preparationPhase();
    },
    get resourceExportReady() {
      return (
        !active ||
        (!busy &&
          !handoffPending &&
          pendingSourceLoads === 0 &&
          pendingPreparations === 0 &&
          director?.phase !== 'loading' &&
          (practice ? practice.phase !== 'playing' : interrupted || lifecycleSuspended))
      );
    },
    resourceSnapshot,
    get backgroundAudio() {
      return active && !practice && !handoffPending && !lifecycleSuspended;
    },
    containsAudio: (target) => audioControls.contains(target),
    refreshAudio: () => audioControls.render(),
    get inputExclusive() {
      return active;
    },
    get gameplayInputActive() {
      return !ownsUI() && !busy && (takeoverAvailable() || (!!practice && armed));
    },
    get practiceArmed() {
      return !!practice && armed;
    },
    get toggleBoostEligible() {
      return !!practice && armed && practice.state.status === 'running';
    },
    get scope() {
      return practice && armed ? 'attract-practice' : 'attract';
    },
    open,
    close,
    suspend,
    foregroundLost,
    interrupt,
    activity: () => idle.activity(),
    controller(frame) {
      input.controller(frame);
      if ((frame.assigned?.id ?? null) !== controlsController) renderControls();
    },
    update(seconds) {
      if (!active) {
        if (idle.advance(seconds, settings.auto && canAutoStart())) void open();
        return;
      }
      if (!foreground()) {
        foregroundLost();
        return;
      }
      if (practice) {
        updateAudio();
        advance(seconds);
        paint(seconds);
      }
    },
    destroy() {
      close();
      disposed = true;
      clock.destroy();
      sceneTransition.dispose();
      audioControls.dispose();
      input.destroy();
      fullscreen.dispose();
      layout.dispose();
      displayObserver?.disconnect();
      unsubscribe?.();
      unsubscribeAudio?.();
      unsubscribeGuide?.();
      guidePreferences.dispose();
      for (const remove of listeners) remove();
    },
  };
}
