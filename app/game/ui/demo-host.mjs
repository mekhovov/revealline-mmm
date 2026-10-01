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
}) {
  const $ = (id) => doc.getElementById(id),
    dialog = $('demo-dialog'),
    canvas = $('demo-canvas');
  if (!dialog || !canvas) return null;
  const fullscreen = attachDemoFullscreen({ document: doc, dialog, button: $('demo-fullscreen') });
  const idle = createDemoIdle(),
    captions = createDemoCaptions();
  let settings = readDemoSettings(storage, settingsKey, getContext().reduced);
  let active = false,
    disposed = false,
    interrupted = false,
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
    caption = 'demo:tipStart',
    error = '',
    origin = null,
    switchClass = null,
    busy = false,
    adoptedPlayer = null,
    handoffGeneration = 0,
    handoffPending = false,
    transitionAge = 0;
  const owners = new WeakMap(),
    listeners = [];
  const listen = (element, type, fn, options) => {
    if (!element) return;
    element.addEventListener(type, fn, options);
    listeners.push(() => element.removeEventListener(type, fn, options));
  };
  const text = (id, value) => {
    if ($(id).textContent !== value) $(id).textContent = value;
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
  const watching = () => active && !practice && !interrupted && !busy;
  const takeoverAvailable = () =>
    active && !practice && !busy && !lifecycleSuspended && foreground();
  function renderControls() {
    if (!active) return;
    fullscreen.refresh();
    dialog.classList.toggle('is-practice', !!practice);
    const state = currentRun(),
      terminal = ['won', 'lost'].includes(state?.status);
    const loading = busy || !director?.player;
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
    $('demo-actions').hidden = !interrupted && !practice;
    $('demo-takeover').hidden = !!practice;
    $('demo-takeover').disabled = loading || terminal;
    $('demo-fresh').disabled = loading;
    $('demo-resume').disabled = busy || (!!practice && terminal);
    text('demo-resume', t(practice ? 'demo:continuePractice' : 'demo:keepWatching'));
    $('demo-next').hidden = !!practice;
    $('demo-next').disabled = busy;
    $('demo-practice-controls').hidden = !practice;
    $('demo-interrupt').hidden = !!practice;
    $('demo-watch-pause').hidden = !!practice;
    $('demo-watch-pause').disabled = handoffPending;
    text('demo-watch-pause', t(interrupted ? 'demo:resumeDemo' : 'demo:pauseDemo'));
    $('demo-watch-pause').setAttribute('aria-pressed', String(interrupted));
    $('demo-return').hidden = !practice;
    $('demo-pause').hidden = !practice || !armed;
    const capabilities = arcadeActionCapabilities(state?.level);
    $('demo-ability').hidden = !capabilities.manualAbility;
    $('demo-pickup').hidden = !capabilities.manualPickup;
    $('demo-boost').hidden = !capabilities.manualBoost;
    $('demo-craft').hidden = !practice || !state?.hangars?.length;
    const keys = bindingLabels(getContext().preferences.keyboardBindings);
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
    const current = getContext();
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
  function clear() {
    clearInput();
    input.clear();
  }
  function interrupt({ focus = true } = {}) {
    if (!active) return;
    interrupted = true;
    clock.reset();
    armed = false;
    director?.pause();
    practice?.pause();
    clear();
    renderControls();
    if (focus) $('demo-fresh').focus({ preventScroll: true });
  }
  function foregroundLost() {
    idle.activity();
    clear();
    if (practice || handoffPending) suspend();
  }
  function suspend() {
    idle.activity();
    if (!active) return;
    handoffGeneration++;
    handoffPending = false;
    clock.stop();
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
    clock.stop();
    audio?.cancelPending?.();
    audioControls.reset();
    handoffPending = false;
    controller?.abort();
    epoch++;
    handoffGeneration++;
    adoptedPlayer = null;
    director?.dispose();
    director = null;
    painter = picture = source = practice = context = null;
    armed = false;
    busy = false;
    clear();
    idle.activity();
    fullscreen.release();
    dialog.close();
    onExit({ handoff, origin });
  }
  async function prepare(source, { signal }) {
    const player = await source.create({ signal });
    let nextPicture = null,
      nextPainter = null,
      released = false;
    const release = () => {
      if (released) return;
      released = true;
      player.dispose?.();
      nextPicture?.dispose();
      nextPainter?.dispose?.();
    };
    const check = () => {
      if (signal.aborted) throw new DOMException('Cancelled', 'AbortError');
    };
    // A scene deadline must retire its live Worker and painter immediately,
    // even when image/media loading never settles or ignores cancellation.
    signal.addEventListener('abort', release, { once: true });
    try {
      check();
      const current = getContext(),
        entry = source.entry;
      const theme = resolveDemoTheme(entry, source.level, current.themeId);
      nextPainter = new BoardPainter(presets);
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
      owners.set(wrapper, {
        painter: nextPainter,
        picture: nextPicture,
        theme,
        overrides,
        classId: player.state.activeClassId,
      });
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
      clock.reset();
      source = painter = picture = context = adoptedPlayer = null;
      caption = 'demo:tipStart';
      canvas.getContext('2d')?.clearRect(0, 0, canvas.width, canvas.height);
    }
    if (snapshot.source && snapshot.player !== adoptedPlayer) {
      adoptedPlayer = snapshot.player;
      transitionAge = 0;
      clock.reset();
      context = null;
      source = snapshot.source;
      const look = owners.get(snapshot.player);
      ({ painter, picture } = look);
      audio?.setScene?.({ source, theme: look.theme });
      const size = boardPaintSizeForRun(snapshot.player.state);
      canvas.width = size.width;
      canvas.height = size.height;
      captions.reset();
      caption = 'demo:tipStart';
      dwell = 0;
      error = '';
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
    clear();
    active = true;
    interrupted = false;
    lifecycleSuspended = false;
    practice = null;
    armed = false;
    error = '';
    source = null;
    busy = true;
    context = null;
    picture = null;
    painter = null;
    caption = 'demo:tipStart';
    canvas.getContext('2d')?.clearRect(0, 0, canvas.width, canvas.height);
    controller?.abort();
    controller = new AbortController();
    const signal = controller.signal,
      ticket = ++epoch;
    dialog.showModal();
    clock.start();
    audioControls.render();
    canvas.focus({ preventScroll: true });
    renderControls();
    try {
      const sources = await loadSources({ signal });
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
    switchClass = null;
    clock.stop();
    practice = createDemoPractice(run);
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
    if (busy || !director?.player || practice || (intent && !takeoverAvailable())) return;
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
  listen($('demo-next'), 'click', () => {
    if (!busy && !practice) {
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
    idle.activity();
    try {
      if (canWrite()) storage.setItem(settingsKey, JSON.stringify({ version: 1, ...settings }));
    } catch {
      text('demo-settings-status', t('demo:settingsSessionOnly'));
    }
    paint(0);
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
    if (!doc.hidden) renderControls();
    if (!practice && !interrupted && director.phase === 'complete') {
      dwell += Math.min(seconds, 0.25);
      if (dwell >= 4) {
        dwell = 0;
        void director.next();
      }
    }
  }
  function paint(seconds) {
    const state = currentRun();
    if (!active || !painter || !state || doc.hidden) return;
    renderControls();
    context ??= canvas.getContext('2d');
    if (context)
      painter.draw(context, state, Math.min(seconds, 0.1), {
        displayCSSWidth:
          canvas.clientHeight > 0
            ? Math.min(canvas.clientWidth, (canvas.clientHeight * canvas.width) / canvas.height)
            : canvas.clientWidth,
        paused: practice ? practice.phase !== 'playing' : director.phase !== 'playing',
        reduced: getContext().reduced,
        fullReveal: state.status === 'won',
        backdrop: picture?.backdrop,
        pictureVisibility: pictureVisibility(),
        pictureInterference: !allPicturesPreview(),
        celebrationPaused: interrupted,
        demoTransition:
          getContext().reduced || allPicturesPreview() ? 0 : Math.max(0, 1 - transitionAge / 0.3),
      });
  }
  function updateAudio() {
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
  const unsubscribe = onLocaleChange(renderControls);
  return {
    get active() {
      return active;
    },
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
      audioControls.dispose();
      input.destroy();
      fullscreen.dispose();
      unsubscribe?.();
      for (const remove of listeners) remove();
    },
  };
}
