import {
  t,
  localizedText,
  localizedAttribute,
  localizedMessage,
  render as renderMessage,
} from '../i18n/index.mjs';
import { createGameWakeLock } from '../ui/game-wake-lock.mjs';
import { localOfficialRecordingIds } from '../official-downloads.mjs';
import { installedPresentation } from '../installed-app.mjs';
import { attachMusicCredit, musicStatusLabel } from '../ui/music-credit.mjs';
import { attachQuickMusicControls } from '../ui/quick-music-controls.mjs';
import {
  SOUNDTRACK_CATALOGUE,
  SOUNDTRACK_ARCHIVES,
  SOUNDTRACK_BUNDLED_ASSETS,
} from '../content/soundtrack-catalogue.mjs';
import { createSoundtrackSource } from '../soundtrack-source.mjs';
import { prepareOpeningTheme, usesOpeningThemeDefault } from '../opening-soundtrack.mjs';
import { Soundscape } from '../ui/audio.mjs';
import { createSoundtrackPlayer } from '../ui/soundtrack-player.mjs';
import { attachSoundtrackPanel } from '../ui/soundtrack-panel.mjs';
import { createManagedMediaStore } from '../managed-media-store.mjs';
import { createSoundtrackStore } from '../soundtrack-store.mjs';
import { createCouchMusicLibrary } from './couch-music-library.mjs';
import { createCouchMusicSession } from './couch-music-session.mjs';

/** Shared Settings controls and a single persistent page session. The host owns
 * modal/input scope and the frame pump; this adapter never resumes gameplay.
 */
export function attachCouchMusicHost({
  document: doc = globalThis.document,
  root,
  prefix,
  audioMaster,
  audioPreferences,
  soundscape,
  canOpen = () => true,
  canControl = () => true,
  quickAfter = [],
  getOwner = () => null,
  getScene = ({ active }) => (active ? 'gameplay' : 'menu'),
  onOpen = () => {},
  onClose = () => {},
} = {}) {
  const media = doc.createElement('audio');
  if (typeof media.play !== 'function') return null;
  const ownsSound = !soundscape;
  const sound = soundscape ?? new Soundscape({ persistentMusic: true, audioMaster });
  sound.configure({ master: 1 });
  const manager = createManagedMediaStore({ soundtrackCatalogue: true });
  const store = createSoundtrackStore({ managedStore: manager });
  const lifetime = new AbortController();
  let library,
    session,
    panel,
    quickControls = null,
    disposed = false,
    visit = null,
    context = { scene: 'menu' },
    warning = '',
    contextWarning = '',
    menuGestureAccepted = false;
  const section = doc.createElement('section');
  section.setAttribute('data-couch-music', prefix);
  localizedAttribute(section, 'aria-label', () => t('interface:music'));
  const make = (tag, name, text) => {
    const node = doc.createElement(tag);
    node.id = `${prefix}-music-${name}`;
    if (text !== undefined) localizedText(node, text);
    section.append(node);
    return node;
  };
  make('h3', 'title', localizedMessage('interface:music'));
  const status = make('p', 'status', localizedMessage('interface:loadingTheSharedMusicLibrary'));
  status.setAttribute('role', 'status');
  status.setAttribute('aria-live', 'polite');
  const action = (name, text, fn) => {
    const node = make('button', name, text);
    node.type = 'button';
    node.onclick = () => run(fn);
    return node;
  };
  const play = action('play', localizedMessage('interface:playMusic2'), () => session.play());
  action('pause', localizedMessage('interface:pauseMusic'), () => session.pause());
  action('previous', localizedMessage('interface:previousTrack'), () => player.previous());
  action('next', localizedMessage('interface:nextTrack'), () => player.next());
  const label = make('label', 'volume-label', localizedMessage('interface:musicVolumeThisSession'));
  label.setAttribute('for', `${prefix}-music-volume`);
  const volume = make('input', 'volume');
  for (const [key, value] of Object.entries({ type: 'range', min: '0', max: '1', step: '0.01' })) {
    volume.setAttribute(key, value);
    volume[key] = value;
  }
  volume.value = '0.55';
  volume.oninput = volume.onchange = () => {
    try {
      session.setVolume(Number(volume.value));
      render();
    } catch (error) {
      report(error);
    }
  };
  action('library', localizedMessage('interface:musicLibrary'), () => open());
  const retry = action('retry', localizedMessage('interface:retryMusicLibrary'), () => load());
  make('p', 'note', localizedMessage('interface:musicVolumeLastsForThisVisitMasterSoundIsShared'));
  root.append(section);
  const compactCredit = attachMusicCredit({
    document: doc,
    root: section,
    pauseButton: doc.getElementById(`${prefix}-pause`),
    prefix,
  });
  // These mounts live in the menu and arena, outside the Settings/Studio scope.
  // They deliberately have no live region: position ticks must stay silent.
  const credits = ['now-playing', 'menu-now-playing']
    .map((name) => doc.getElementById(`${prefix}-music-${name}`))
    .filter(Boolean)
    .map((node) => {
      const title = doc.createElement('span'),
        file = doc.createElement('span'),
        link = doc.createElement('a');
      title.className = 'couch-music-credit-title';
      file.className = 'couch-music-credit-file';
      localizedText(link, () => t('interface:musicSource'));
      link.setAttribute('target', '_blank');
      link.setAttribute('rel', 'noopener noreferrer');
      node.replaceChildren(title, file, link);
      node.hidden = true;
      return { node, title, file, link, identity: null };
    });
  function sourceWebsite(track) {
    for (const value of [...(track.websites ?? []).map((site) => site.url), track.rights?.source]) {
      try {
        const url = new URL(value);
        if (['http:', 'https:'].includes(url.protocol) && !url.username && !url.password)
          return url.href;
      } catch {
        // Legacy source credits can be plain text rather than a website.
      }
    }
    return null;
  }
  function renderCredits(playback) {
    const master = audioMaster?.snapshot(),
      track = playback.track,
      audible =
        playback.playing &&
        ['mp3', 'published'].includes(track?.kind) &&
        playback.volume > 0 &&
        !master?.muted &&
        (master?.volume ?? 1) > 0 &&
        !panel?.isOpen();
    for (const credit of credits) {
      credit.node.hidden = !audible;
      if (!audible) continue;
      const title = () =>
          t('common:music.nowPlaying', {
            title: `${track.title}${track.artist ? ` · ${track.artist}` : ''}`,
          }),
        file = () =>
          track.fileName
            ? t('common:music.file', { filename: track.fileName })
            : t('interface:originalFilenameNotRecorded'),
        url = sourceWebsite(track),
        identity = JSON.stringify([track.title, track.artist, track.fileName, url]);
      if (credit.identity === identity) continue;
      credit.identity = identity;
      localizedText(credit.title, title);
      localizedAttribute(credit.title, 'title', title);
      localizedText(credit.file, file);
      localizedAttribute(credit.file, 'title', file);
      credit.link.hidden = !url;
      if (url) {
        localizedText(credit.link, () =>
          t('common:music.source', { hostname: new URL(url).hostname }),
        );
        credit.link.setAttribute('href', url);
      } else credit.link.removeAttribute('href');
    }
  }
  const source = createSoundtrackSource({
    catalogue: SOUNDTRACK_CATALOGUE,
    archives: SOUNDTRACK_ARCHIVES,
    bundled: SOUNDTRACK_BUNDLED_ASSETS,
    readLocal: (hash, options) =>
      library?.readAsset(hash, { ...options, allowMissing: true }) ?? null,
    installedOnly: () => library?.snapshot().library?.listening?.installedOnly ?? false,
  });
  const wakeLock = createGameWakeLock({ document: doc });
  const player = createSoundtrackPlayer({
    localPlayback: installedPresentation(),
    soundscape: sound,
    audioElement: media,
    secondAudioElement: doc.createElement('audio'),
    catalogue: source.catalogue,
    bundledTrackIds: SOUNDTRACK_BUNDLED_ASSETS.map(({ id }) => id),
    audioMaster,
    readAsset: (hash, options) => source.readAsset(hash, options),
    onChange: () => {
      if (session) render();
    },
  });
  library = createCouchMusicLibrary({ player, managedStore: manager, catalogue: source.catalogue });
  player.setContext(context);
  session = createCouchMusicSession({ player, library, soundscape: sound });
  quickControls = attachQuickMusicControls({
    document: doc,
    prefix,
    after: quickAfter.map((id) => doc.getElementById(id)),
    settingsRoot: section,
    snapshot: () => player.snapshot(),
    getMaster: () => audioMaster?.snapshot(),
    active: () => !disposed && canControl() && !panel?.isOpen(),
    play: () => session.play(),
    pause: () => session.pause(),
    next: () => {
      if (!player.snapshot().desired) session.pause();
      return player.next();
    },
    onError: report,
  });
  panel = attachSoundtrackPanel({
    document: doc,
    catalogue: source.catalogue,
    bundled: SOUNDTRACK_BUNDLED_ASSETS,
    readAsset: (hash, options) => source.readAsset(hash, options),
    store,
    player,
    audioMaster,
    musicSession: session,
    adoptLibrary: (value) => library.adoptVerifiedSnapshot(value),
    onLibrary: async () => {
      await player.prepare({ allowNetwork: false });
      render();
    },
    onError: report,
    getContext: () => context,
    onMasterMuted: (value) => audioPreferences.setMuted(value),
    onMasterVolume: (value) => audioPreferences.setVolume(value),
    beforeAudio: () => player.wake(),
    onVolume: () => render(),
    onPlayback: () => render(),
    onOpen: () => {
      if (!canOpen()) throw new Error(t('interface:returnToAudioSettingsToOpenTheMusicLibrary'));
      visit = getOwner();
      onOpen();
    },
    canRestoreFocus: () => !disposed && canOpen() && getOwner() === visit,
    onClose: () => {
      visit = null;
      onClose();
      render();
    },
  });
  function report(error) {
    if (disposed) return;
    warning = error?.message || String(error);
    render();
  }
  function render() {
    if (disposed || !session) return;
    const state = session.snapshot(),
      track = state.playback;
    const preparing =
      ['idle', 'loading', 'saving'].includes(state.library.status) || state.preparing;
    const text = () =>
      preparing
        ? state.library.status === 'saving'
          ? t('interface:savingTheSharedMusicLibrary')
          : t('interface:preparingTheSharedMusicLibrary')
        : state.library.error
          ? t('common:music.libraryError', { error: state.library.error })
          : renderMessage(warning) ||
            renderMessage(contextWarning) ||
            track.preparation?.message ||
            track.error ||
            `${track.track?.title || t('interface:selectedSoundtrack')} · ${musicStatusLabel(track.status)}${state.needsPlayGesture ? ' ' + t('interface:choosePlayMusic') + '' : ''}`;
    localizedText(status, text);
    status.dataset.state = preparing
      ? 'busy'
      : state.library.error || warning || track.error
        ? 'error'
        : 'ready';
    retry.hidden = !state.library.error;
    retry.disabled = preparing;
    play.disabled = !state.readyForStart && !track.playing;
    if (doc.activeElement !== volume) volume.value = String(track.volume);
    quickControls?.render();
    renderCredits(track);
    compactCredit.render(track, audioMaster?.snapshot());
    panel?.update();
  }
  async function run(work) {
    if (disposed) return false;
    try {
      warning = '';
      const pending = work();
      render();
      return await pending;
    } catch (error) {
      report(error);
      return false;
    } finally {
      render();
    }
  }
  async function load() {
    const pending = session.loadLibrary({ signal: lifetime.signal });
    render();
    try {
      const result = await pending;
      const accepted = library.snapshot().library;
      const generation = library.snapshot().generation;
      if (accepted && usesOpeningThemeDefault(accepted, { fresh: generation === 0 }))
        await prepareOpeningTheme(player, accepted, { fresh: true });
      return result;
    } finally {
      render();
    }
  }
  async function open() {
    if (disposed || !canOpen()) return false;
    await panel.open();
    return panel.isOpen();
  }
  const unsubscribeMaster = audioMaster?.subscribe(() => render());
  function startRememberedMenuMusic(event) {
    if (disposed || !event.isTrusted || menuGestureAccepted) return;
    const state = session.snapshot(),
      master = audioMaster?.snapshot();
    if (
      !master ||
      master.muted ||
      master.volume === 0 ||
      doc.hidden ||
      doc.hasFocus?.() === false ||
      context.scene !== 'menu' ||
      state.transportChoice === 'pause' ||
      state.playback.playing ||
      !state.readyForStart
    )
      return;
    if (
      section.contains(event.target) ||
      quickControls?.contains(event.target) ||
      panel.element.contains(event.target) ||
      (event.type !== 'click' &&
        event.target?.closest?.(
          `#${prefix}-quick-sound, #${prefix}-audio, #${prefix}-master-volume`,
        ))
    )
      return;
    if (
      event.type === 'keydown' &&
      (event.repeat ||
        !['Enter', ' ', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(event.key))
    )
      return;
    // Call start in the activation task. A denied attempt may retry on another
    // trusted gesture; slow library readiness never schedules late autoplay.
    menuGestureAccepted = true;
    void run(() => session.start()).then((played) => {
      if (!played) menuGestureAccepted = false;
    });
  }
  doc.addEventListener('pointerdown', startRememberedMenuMusic, true);
  doc.addEventListener('keydown', startRememberedMenuMusic, true);
  // A native click observes explicit mute/unmute after its own button handler.
  doc.addEventListener('click', startRememberedMenuMusic);
  void run(async () => {
    player.setLocalRecordingIds(await localOfficialRecordingIds(source.catalogue));
    await load();
  });
  return Object.freeze({
    sound,
    player,
    library,
    session,
    root: () => (panel.isOpen() ? panel.element : null),
    primary: () => doc.getElementById('soundtrack-close'),
    contains: (element) =>
      section.contains(element) ||
      panel.element.contains(element) ||
      quickControls.contains(element),
    back: () => panel.close(),
    open,
    start: () => run(() => session.start()),
    resume: () => run(() => session.resume()),
    suspend: () => {
      session.suspend();
      render();
    },
    update(active, theme, state) {
      wakeLock.setActive(active);
      const scene = getScene({ active, scene: context.scene });
      if (context.scene !== scene) {
        context = Object.freeze({ ...context, scene });
        session.setAcceptedContext(context);
      }
      session.update(active, theme, state);
      render();
    },
    setContext(value) {
      contextWarning = '';
      context = Object.freeze({ scene: context.scene ?? 'menu', ...value });
      session.setAcceptedContext(context);
      render();
    },
    contextPending(
      themeId,
      message = localizedMessage('interface:preparingExactMissionMusicAssignments'),
    ) {
      contextWarning = message;
      context = Object.freeze({ scene: context.scene ?? 'menu', themeId });
      session.setAcceptedContext(context);
      render();
    },
    report,
    dispose() {
      if (disposed) return;
      disposed = true;
      wakeLock.dispose();
      lifetime.abort();
      doc.removeEventListener('pointerdown', startRememberedMenuMusic, true);
      doc.removeEventListener('keydown', startRememberedMenuMusic, true);
      doc.removeEventListener('click', startRememberedMenuMusic);
      unsubscribeMaster?.();
      quickControls.dispose();
      panel.dispose();
      session.dispose();
      player.dispose();
      library.close();
      store.close();
      manager.close();
      if (ownsSound) sound.dispose();
      for (const credit of credits) {
        credit.node.hidden = true;
        credit.node.replaceChildren();
      }
      compactCredit.dispose();
      section.remove();
    },
  });
}
