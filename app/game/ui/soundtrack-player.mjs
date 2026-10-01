import { t } from '../i18n/index.mjs';
import { boundedJSON, canonicalJSON, required } from '../data-json.mjs';
import {
  soundtrackTracks,
  soundtrackPlaylists,
  upgradeSoundtrackLibrary,
  SOUNDTRACK_FORMAT,
  soundtrackFallbackSelection,
  emptySoundtrackLibrary,
  resolveSoundtrackCatalogue,
  resolveSoundtrackLibrary,
  resolveSoundtrackSelection,
  soundtrackOrder,
} from '../soundtrack.mjs';
import { validateTrack } from './music.mjs';
import { inspectMP3, ownSoundtrackBlob, throwIfSoundtrackAborted } from '../mp3.mjs';
import { bindAudioMasterMedia } from './audio-master.mjs';
import {
  fetchOnlineSoundtrackCatalogue,
  isResolvedOnlineSoundtrackTrack,
  onlineSoundtrackRecordingAllowed,
  onlineSoundtrackRecordingURL,
} from '../online-soundtrack-catalogue.mjs';

import {
  soundtrackStyleSelection,
  sameSoundtrackListening,
  publicSoundtrackSelection,
} from '../soundtrack-style-selection.mjs';

const wait = (ms, signal) =>
  new Promise((resolve, reject) => {
    const cancel = () => {
      clearTimeout(timer);
      signal?.removeEventListener('abort', cancel);
      reject(new DOMException(t('interface:musicTransitionCancelled'), 'AbortError'));
    };
    const timer = setTimeout(() => {
      signal?.removeEventListener('abort', cancel);
      resolve();
    }, ms);
    signal?.addEventListener('abort', cancel, { once: true });
    if (signal?.aborted) cancel();
  });
// Keep remote streams on one persistent element. WebKit grants playback
// permission per media element, so a second remote deck can silently stall.
const overlapTrack = (track) => track?.kind === 'mp3';
/** Session transport only. The host owns gestures, page lifecycle, settings persistence and SFX. */
export function createSoundtrackPlayer({
  soundscape,
  audioElement = globalThis.document?.createElement('audio'),
  secondAudioElement = globalThis.document?.createElement('audio'),
  readAsset,
  onChange = () => {},
  random = Math.random,
  URLImpl = globalThis.URL,
  fadeMs = 1500,
  remoteStallMs = 12000,
  audioMaster,
  catalogue = null,
  bundledTrackIds = [],
  localPlayback = false,
  localRecordingIds = [],
  onlineCatalogueDownload = {},
} = {}) {
  required(
    soundscape?.persistentMusic === true &&
      [
        'setSongEndHandler',
        'pauseMusic',
        'resumeMusic',
        'musicPosition',
        'seekMusic',
        'enable',
        'update',
        'configure',
      ].every((key) => typeof soundscape[key] === 'function'),
    t('interface:aPersistentSoundscapeWithTransportHooksIsRequired'),
  );
  required(
    audioElement &&
      typeof audioElement.play === 'function' &&
      typeof audioElement.addEventListener === 'function' &&
      typeof readAsset === 'function' &&
      typeof onChange === 'function' &&
      typeof random === 'function',
    t('interface:soundtrackPlayerRequiresMediaStorageAndCallbackAdapters'),
  );
  required(
    Number.isInteger(fadeMs) && fadeMs >= 0 && fadeMs <= 10000,
    t('interface:invalidMusicTransitionDuration'),
  );
  required(
    Array.isArray(bundledTrackIds) &&
      bundledTrackIds.length <= 256 &&
      new Set(bundledTrackIds).size === bundledTrackIds.length &&
      bundledTrackIds.every(
        (id) => typeof id === 'string' && /^[a-z0-9][a-z0-9._-]{0,127}$/.test(id),
      ),
    'Invalid bundled soundtrack identities.',
  );
  const bundledIds = Object.freeze([...bundledTrackIds]);
  required(typeof localPlayback === 'boolean', 'Invalid local soundtrack playback policy.');
  required(
    Array.isArray(localRecordingIds) &&
      localRecordingIds.length <= 256 &&
      new Set(localRecordingIds).size === localRecordingIds.length &&
      localRecordingIds.every(
        (id) => typeof id === 'string' && /^[a-z0-9][a-z0-9._-]{0,127}$/.test(id),
      ),
    'Invalid local soundtrack identities.',
  );
  required(
    Number.isInteger(remoteStallMs) && remoteStallMs >= 10 && remoteStallMs <= 60000,
    'Invalid remote music recovery duration.',
  );
  required(
    !secondAudioElement ||
      (secondAudioElement !== audioElement &&
        typeof secondAudioElement.play === 'function' &&
        typeof secondAudioElement.addEventListener === 'function'),
    t('interface:theSecondMusicDeckMustBeASeparateMediaElement'),
  );
  // Validate before acquiring media/master ownership. Only resolver-owned,
  // immutable catalogues may share a selection between reads; raw adapters
  // retain validation on every selection so permission changes remain live.
  const cacheableCatalogue =
    catalogue === null || resolveSoundtrackCatalogue(catalogue) === catalogue;
  const decks = [audioElement, secondAudioElement].filter(Boolean).map((media) => ({
    media,
    url: null,
    ownedURL: false,
    listeners: [],
    resource: 0,
    weight: 0,
    remoteWatchdog: null,
    remoteProgress: 0,
  }));
  const remoteDeck = decks[0];
  let activeDeck = decks[0];
  activeDeck.weight = 1;
  let preloaded = null,
    preloadOperation = null,
    transition = null,
    overlapDisabled = false,
    pendingDeck = null;
  // Some mobile engines expose volume but cannot apply it to media elements.
  // Detect that while both decks are silent and use the sequential path there.
  for (const deck of decks) {
    const before = deck.media.volume;
    try {
      deck.media.volume = 0.375;
      if (Math.abs(deck.media.volume - 0.375) > 0.001) overlapDisabled = true;
    } catch {
      overlapDisabled = true;
    } finally {
      deck.media.volume = before;
    }
  }

  for (const deck of decks)
    deck.masterMedia = audioMaster
      ? bindAudioMasterMedia({ audioMaster, element: deck.media, volume: 0 })
      : null;

  let library = emptySoundtrackLibrary(),
    context = {},
    override = null,
    playlist = null,
    playlistSource = null,
    queue = [],
    index = -1,
    current = null,
    pending = null,
    dirty = false;
  let published = null,
    authored = null,
    remoteTracks = [],
    remoteSelection = null,
    lastPositionSecond = -1,
    notice = null,
    selectionNotice = null;
  let preparation = null;
  let savedPublicStyles = null,
    pendingPublicStyles = null,
    publicStyleLoad = null;
  let status = 'idle',
    error = null,
    desired = false,
    intentionallyPaused = false,
    disposed = false,
    suspended = false,
    volume = soundscape.getSettings().music,
    fade = 1,
    generation = 0,
    intentGeneration = 0,
    operation = null,
    pendingSeek = null;
  let failed = new Set(),
    fallbackUsed = false,
    failureFallback = null;
  let baseSelection = null;
  const gainLeases = new Map();
  const tracks = () => [
    ...soundtrackTracks(library),
    ...(authored ? [authored] : []),
    ...(published ? [published] : []),
    ...remoteTracks,
  ];
  const selectionContext = (value = context) => ({
    ...value,
    ...(!localPlayback && bundledIds.length ? { bundledTrackIds: bundledIds } : {}),
    ...(localPlayback
      ? {
          installedTrackIds: [
            ...new Set([
              ...(value.installedTrackIds ?? library.installedTrackIds ?? []),
              ...localRecordingIds,
            ]),
          ],
        }
      : {}),
  });
  const resolveBase = () => {
    if (
      cacheableCatalogue &&
      baseSelection?.library === library &&
      baseSelection.context === context &&
      baseSelection.override === override
    )
      return baseSelection.selected;
    const selectionLibrary =
      library.selection.playlistId === override
        ? library
        : { ...library, selection: { playlistId: override } };
    const selected = resolveSoundtrackSelection(
      localPlayback && library.listening
        ? { ...selectionLibrary, listening: { ...library.listening, installedOnly: true } }
        : selectionLibrary,
      selectionContext(),
      { catalogue: catalogue ?? undefined },
    );
    if (cacheableCatalogue) baseSelection = { library, context, override, selected };
    return selected;
  };
  const resolve = () => {
    if (remoteSelection) return remoteSelection;
    const selected = resolveBase();
    const defaultChoice =
      selected.source === 'default' ||
      (selected.source === 'catalogue-fallback' && library.listening?.mode === 'auto');
    if (
      context.scene !== 'menu' &&
      defaultChoice &&
      !library.listening?.recordingMode &&
      published?.allowed() &&
      !failed.has(published.id)
    )
      return {
        source: 'published',
        playlist: {
          id: 'builtin.published.current',
          title: published.title,
          trackIds: [published.id],
          order: 'ordered',
          repeat: 'all',
        },
      };
    if (context.scene !== 'menu' && defaultChoice && authored)
      return {
        source: 'authored',
        playlist: {
          id: 'builtin.authored.current',
          title: authored.title,
          trackIds: [authored.id],
          order: 'ordered',
          repeat: 'all',
        },
      };
    return selected;
  };

  function position() {
    if (!current) return { positionSeconds: 0, durationSeconds: 0 };
    if (current.kind === 'synth') {
      const p = soundscape.musicPosition();
      return { ...p, positionSeconds: pendingSeek ?? p.positionSeconds };
    }
    const durationSeconds = ['published', 'remote'].includes(current.kind)
      ? Number.isFinite(activeDeck.media.duration)
        ? Math.max(0, activeDeck.media.duration)
        : 0
      : current.asset.durationSeconds;
    return {
      positionSeconds:
        pendingSeek ??
        (Number.isFinite(activeDeck.media.currentTime)
          ? Math.max(0, Math.min(activeDeck.media.currentTime, durationSeconds))
          : 0),
      durationSeconds,
    };
  }
  function snapshot() {
    return Object.freeze({
      status,
      preparation:
        preparation?.generation === generation
          ? Object.freeze({ stage: preparation.stage, message: preparation.message })
          : null,
      pendingPublicStyles: pendingPublicStyles !== null,
      playing: status === 'playing',
      desired,
      track: current
        ? Object.freeze({
            id: current.id,
            title: current.title,
            artist: current.artist,
            kind: current.kind,
            fileName: current.fileName ?? null,
            websites: current.websites ?? [],
            rights: current.rights ?? null,
          })
        : null,
      playlistId: playlist?.id ?? null,
      order: playlist?.order ?? null,
      repeat: playlist?.repeat ?? null,
      pendingPlaylistId: pending?.playlist.id ?? null,
      selection: override,
      source: pending?.source ?? resolve().source,
      queue: Object.freeze([...queue]),
      queueIndex: index,
      volume,
      error,
      notice: selectionNotice ?? notice,
      preloadedTrackId: preloaded?.track.id ?? null,
      transitioning: transition !== null,
      ...position(),
    });
  }
  function emit() {
    try {
      onChange(snapshot());
    } catch {
      /* A view callback cannot change transport authority. */
    }
  }
  function gains() {
    const master = soundscape.getSettings().master;
    let factor = 1;
    for (const value of gainLeases.values()) factor = Math.min(factor, value);
    soundscape.configure({ music: volume * fade * factor });
    for (const deck of decks) {
      const localVolume = Math.max(0, Math.min(1, master * volume * fade * factor * deck.weight));
      if (deck.masterMedia) deck.masterMedia.setLocal({ volume: localVolume });
      else deck.media.volume = localVolume;
    }
  }
  /** Temporary attenuation only; the player remains the owner of base volume/intent.
   * Overlapping owners use the lowest factor. Each owner releases only its lease.
   */
  function acquireGain({ factor } = {}) {
    required(
      Number.isFinite(factor) && factor >= 0 && factor <= 1,
      t('interface:musicGainMustBe01'),
    );
    required(!disposed, t('interface:theSoundtrackPlayerIsDisposed'));
    const token = {};
    gainLeases.set(token, factor);
    try {
      gains();
      required(!disposed, t('interface:theSoundtrackPlayerIsDisposed'));
    } catch (failure) {
      gainLeases.delete(token);
      try {
        gains();
      } catch {
        /* Preserve the failed mixer application; later transport updates can retry. */
      }
      throw failure;
    }
    return Object.freeze({
      release() {
        if (!gainLeases.delete(token) || disposed) return;
        gains();
      },
    });
  }
  function clearDeck(deck) {
    deck.resource++;
    clearTimeout(deck.remoteWatchdog);
    deck.remoteWatchdog = null;
    for (const [type, fn] of deck.listeners) deck.media.removeEventListener(type, fn);
    deck.listeners = [];
    deck.media.pause();
    deck.media.removeAttribute('src');
    try {
      deck.media.load();
    } catch {}
    if (deck.url !== null && deck.ownedURL) {
      try {
        URLImpl.revokeObjectURL(deck.url);
      } catch {}
    }
    deck.url = null;
    deck.ownedURL = false;
  }
  function cancelPreload(keep = null) {
    preloadOperation?.abort();
    preloadOperation = null;
    pendingDeck?.controller.abort();
    pendingDeck = null;
    preloaded = null;
    if (transition) {
      transition.controller.abort();
      clearDeck(transition.outgoing);
      transition.outgoing.weight = 0;
      transition = null;
      activeDeck.weight = 1;
      gains();
    }
    for (const deck of decks) if (deck !== activeDeck && deck !== keep) clearDeck(deck);
  }
  function cancelPublicStyleLoad() {
    publicStyleLoad?.controller.abort();
    publicStyleLoad = null;
  }
  function cancel(keep = null) {
    cancelPublicStyleLoad();
    generation++;
    operation?.abort();
    operation = null;
    cancelPreload(keep);
  }
  function clearMedia() {
    clearDeck(activeDeck);
  }
  function bind(deck, type, fn) {
    deck.media.addEventListener(type, fn);
    deck.listeners.push([type, fn]);
  }
  function watchRemote(deck, track, valid) {
    clearTimeout(deck.remoteWatchdog);
    deck.remoteWatchdog = null;
    if (track.kind !== 'remote') return;
    deck.remoteProgress = Number.isFinite(deck.media.currentTime) ? deck.media.currentTime : 0;
    deck.remoteWatchdog = setTimeout(() => {
      deck.remoteWatchdog = null;
      if (
        !valid() ||
        !desired ||
        suspended ||
        !['loading', 'playing'].includes(status) ||
        current?.id !== track.id
      )
        return;
      const at = Number.isFinite(deck.media.currentTime) ? deck.media.currentTime : 0;
      if (!deck.media.paused && at > deck.remoteProgress + 0.01) {
        watchRemote(deck, track, valid);
        return;
      }
      void failedTrack('The streamed track stopped responding.', generation);
    }, remoteStallMs);
    deck.remoteWatchdog?.unref?.();
  }
  function watchCurrentRemote() {
    if (current?.kind !== 'remote' || activeDeck !== remoteDeck) return;
    const track = current,
      resource = remoteDeck.resource,
      expectedURL = remoteDeck.url,
      valid = () =>
        !disposed &&
        activeDeck === remoteDeck &&
        resource === remoteDeck.resource &&
        remoteDeck.url === expectedURL;
    watchRemote(remoteDeck, track, valid);
  }
  async function loadDeck(deck, track, signal, token = null, { localOnly = false } = {}) {
    if (token !== null) {
      preparation = {
        generation: token,
        stage: 'reading',
        message: t('interface:readingTheSelectedAudioOriginal'),
      };
      emit();
    }
    if (track.kind === 'remote') {
      throwIfSoundtrackAborted(signal);
      installDeckURL(deck, track, track.url, { owned: false });
      return true;
    }
    const original =
      track.kind === 'published'
        ? await track.readBlob({ signal })
        : await readAsset(track.asset.sha256, {
            signal,
            purpose: 'playback',
            localOnly: localOnly || localPlayback,
          });
    throwIfSoundtrackAborted(signal);
    if (localOnly && original == null) return false;
    const blob = track.kind === 'published' ? original : ownSoundtrackBlob(original);
    if (track.kind === 'published') {
      required(
        blob instanceof Blob &&
          blob.size > 0 &&
          blob.size <= 4 * 1024 * 1024 &&
          ['audio/wav', 'audio/ogg', 'audio/mpeg'].includes(blob.type),
        t('interface:publishedAudioIsUnavailable'),
      );
    } else {
      if (token !== null && token === generation) {
        preparation = {
          generation: token,
          stage: 'verifying',
          message: t('interface:verifyingTheAudioOriginal'),
        };
        emit();
      }
      const actual = await inspectMP3(blob, { signal });
      required(
        canonicalJSON(actual) === canonicalJSON(track.asset),
        t('interface:storedAudioBytesDoNotMatchThisTrack'),
      );
    }
    throwIfSoundtrackAborted(signal);
    if (disposed) throw new DOMException(t('interface:musicPlayerDisposed'), 'AbortError');
    installDeckURL(deck, track, URLImpl.createObjectURL(blob));
    return true;
  }
  function installDeckURL(deck, track, ownedURL, { owned = true } = {}) {
    clearDeck(deck);
    deck.url = ownedURL;
    deck.ownedURL = owned;
    const resource = deck.resource,
      expectedURL = deck.url;
    const valid = () =>
      !disposed &&
      deck === activeDeck &&
      resource === deck.resource &&
      deck.url === expectedURL &&
      (!deck.media.currentSrc || deck.media.currentSrc === expectedURL);
    bind(deck, 'ended', () => {
      if (valid() && desired && !suspended) void advance(true);
    });
    bind(deck, 'error', () => {
      if (valid()) void failedTrack(t('interface:thisTrackCouldNotBePlayed'), generation);
      else if (preloaded?.deck === deck) {
        failed.add(track.id);
        notice = t('interface:theNextTrackCouldNotBePlayed');
        cancelPreload();
        emit();
      }
    });
    bind(deck, 'timeupdate', () => {
      if (valid()) {
        watchRemote(deck, track, valid);
        maybeTransition();
        emit();
      }
    });
    bind(deck, 'playing', () => {
      if (valid()) watchRemote(deck, track, valid);
    });
    for (const type of ['stalled', 'waiting', 'pause'])
      bind(deck, type, () => {
        if (valid() && desired) watchRemote(deck, track, valid);
      });
    bind(deck, 'loadedmetadata', () => {
      if (valid() && pendingSeek !== null) {
        try {
          deck.media.currentTime = pendingSeek;
        } catch {}
        pendingSeek = null;
      }
      if (valid()) emit();
    });
    deck.media.preload = 'auto';
    deck.media.loop = false;
    if (track.kind === 'remote') {
      // Release assets stream through a signed redirect without CORS response
      // headers. The trusted catalogue still pins repository, path and hash.
      if (
        track.delivery?.type !== 'external-url' &&
        track.url.startsWith('https://github.com/mekhovov/revealline-soundtracks/releases/')
      ) {
        deck.media.removeAttribute?.('crossorigin');
        deck.media.crossOrigin = null;
      } else deck.media.crossOrigin = 'anonymous';
    }
    deck.media.src = deck.url;
    deck.media.load();
    gains();
  }
  function transferDeck(from, to, track) {
    const ownedURL = from.url;
    const ownsURL = from.ownedURL;
    required(ownedURL !== null, t('interface:preparedAudioIsNoLongerAvailable'));
    // Keep the object URL while moving playback to an already permitted element.
    from.url = null;
    from.ownedURL = false;
    clearDeck(from);
    from.weight = 0;
    installDeckURL(to, track, ownedURL, { owned: ownsURL });
  }
  function prepareNext() {
    if (
      disposed ||
      suspended ||
      !desired ||
      audioMaster?.snapshot().muted ||
      status !== 'playing' ||
      !overlapTrack(current) ||
      decks.length < 2 ||
      dirty ||
      pending ||
      preloaded ||
      preloadOperation ||
      transition
    )
      return;
    const at = playableIndex(nextIndex(true));
    const track = tracks().find((t) => t.id === queue[at]);
    if (!overlapTrack(track)) return;
    const deck = decks.find((d) => d !== activeDeck),
      controller = new AbortController();
    preloadOperation = controller;
    deck.weight = 0;
    void loadDeck(deck, track, controller.signal)
      .then(() => {
        if (controller.signal.aborted || disposed) return;
        preloadOperation = null;
        preloaded = { deck, track, at };
        emit();
        maybeTransition();
      })
      .catch((failure) => {
        if (controller.signal.aborted || disposed || failure?.name === 'AbortError') return;
        preloadOperation = null;
        clearDeck(deck);
        failed.add(track.id);
        notice = failure?.message || t('interface:theNextTrackIsUnavailable');
        emit();
        prepareNext();
      });
  }
  function maybeTransition() {
    if (
      transition ||
      !preloaded ||
      !desired ||
      suspended ||
      status !== 'playing' ||
      !overlapTrack(current) ||
      dirty ||
      pending ||
      fadeMs === 0 ||
      overlapDisabled
    )
      return;
    const remaining = position().durationSeconds - position().positionSeconds;
    // The ended event owns the hard boundary if the decoder is too late to overlap.
    const windowMs = Math.min(fadeMs, position().durationSeconds * 500);
    if (remaining > 0 && remaining <= windowMs / 1000)
      void startAt(preloaded.at, { fading: true, overlapMs: Math.min(windowMs, remaining * 1000) });
  }
  function install(selection, { after = null } = {}) {
    playlist = selection.playlist;
    playlistSource = selection.source;
    selectionNotice = selection.notice ?? null;
    queue = [...soundtrackOrder(playlist, { random, previousTrackId: after })];
    index = -1;
    if (after && playlist.order === 'ordered') {
      const at = queue.indexOf(after);
      if (at >= 0) index = at;
    }
    pending = null;
    dirty = false;
  }
  function nextIndex(natural) {
    if (natural && playlist?.repeat === 'one' && index >= 0 && !failed.has(queue[index]))
      return index;
    const at = index + 1;
    if (at < queue.length) return at;
    return playlist?.repeat === 'all' ? 0 : -1;
  }
  function playableIndex(start) {
    if (start < 0) return -1;
    for (let count = 0; count < queue.length; count++) {
      const at = (start + count) % queue.length;
      if (playlist.repeat !== 'all' && at < start) return -1;
      if (!failed.has(queue[at]) && tracks().some((t) => t.id === queue[at])) return at;
    }
    return -1;
  }
  async function fadeOut(signal) {
    if (status !== 'playing' || fadeMs === 0) return;
    for (let i = 1; i <= 4; i++) {
      throwIfSoundtrackAborted(signal);
      fade = 1 - i / 4;
      gains();
      await wait(fadeMs / 4, signal);
    }
  }
  async function startAt(at, { fading = false, overlapMs = fadeMs, localOnly = !desired } = {}) {
    if (disposed || suspended) return false;
    const nextTrack = tracks().find((t) => t.id === queue[at]) ?? null;
    const prepared = preloaded?.track.id === nextTrack?.id ? preloaded : null;
    if (prepared) preloaded = null;
    const overlap =
      fading &&
      fadeMs > 0 &&
      !overlapDisabled &&
      decks.length === 2 &&
      desired &&
      status === 'playing' &&
      overlapTrack(current) &&
      overlapTrack(nextTrack);
    cancel(prepared?.deck);
    const token = generation,
      controller = new AbortController();
    operation = controller;
    preparation = {
      generation: token,
      stage: 'preparing',
      message: t('interface:preparingSelectedMusic'),
    };
    emit();
    let incoming =
      nextTrack?.kind === 'remote'
        ? remoteDeck
        : (!overlapDisabled && prepared?.deck) ||
          (overlap ? decks.find((d) => d !== activeDeck) : activeDeck);
    try {
      if (!nextTrack) {
        soundscape.pauseMusic();
        clearMedia();
        current = null;
        index = -1;
        status = 'idle';
        selectionNotice = resolve().notice || t('interface:noTracksAreAvailableForThisSelection');
        emit();
        return false;
      }
      if (overlap) {
        pendingDeck = { deck: incoming, controller };
        incoming.weight = 0;
        if (!prepared) await loadDeck(incoming, nextTrack, controller.signal, token);
        throwIfSoundtrackAborted(controller.signal);
        gains();
        try {
          await incoming.media.play();
        } catch (failure) {
          // Browsers which disallow concurrent media get a sequential transition.
          if (failure?.name !== 'NotAllowedError') throw failure;
          overlapDisabled = true;
          incoming.media.pause();
          await fadeOut(controller.signal);
          throwIfSoundtrackAborted(controller.signal);
          // Permission can be tied to the element, so retry on the deck which
          // already played under the user's gesture rather than the denied one.
          index = at;
          current = nextTrack;
          pendingSeek = null;
          status = 'loading';
          transferDeck(incoming, activeDeck, nextTrack);
          incoming = activeDeck;
          activeDeck.weight = 1;
          fade = 1;
          gains();
          await activeDeck.media.play();
        }
        throwIfSoundtrackAborted(controller.signal);
        if (token !== generation || disposed || !desired) return false;
        pendingDeck = null;
        if (activeDeck !== incoming) {
          const outgoing = activeDeck;
          activeDeck = incoming;
          index = at;
          current = nextTrack;
          pendingSeek = null;
          transition = { outgoing, controller };
          status = 'playing';
          error = null;
          emit();
          const steps = Math.max(4, Math.ceil(overlapMs / 40));
          for (let step = 1; step <= steps; step++) {
            throwIfSoundtrackAborted(controller.signal);
            activeDeck.weight = step / steps;
            outgoing.weight = 1 - step / steps;
            gains();
            await wait(overlapMs / steps, controller.signal);
          }
          clearDeck(outgoing);
          outgoing.weight = 0;
          transition = null;
        }
      } else {
        if (fading) await fadeOut(controller.signal);
        if (token !== generation) return false;
        soundscape.pauseMusic();
        clearMedia();
        activeDeck.weight = 0;
        activeDeck = incoming;
        activeDeck.weight = 1;
        index = at;
        current = nextTrack;
        pendingSeek = null;
        status = desired ? 'loading' : 'paused';
        fade = 1;
        gains();
        emit();
        throwIfSoundtrackAborted(controller.signal);
        if (current.kind === 'synth') {
          soundscape.setTrack(current.recipe);
          soundscape.resetMusic();
          if (desired) {
            const allowed = await soundscape.enable();
            if (token !== generation || disposed) return false;
            if (!allowed) {
              status = 'blocked';
              error = t('interface:enableAudioToPlayMusic');
              emit();
              return false;
            }
            if (pendingSeek !== null) {
              soundscape.seekMusic(pendingSeek);
              pendingSeek = null;
            }
            soundscape.resumeMusic();
            status = 'playing';
          }
        } else {
          if (prepared && prepared.deck !== activeDeck)
            transferDeck(prepared.deck, activeDeck, current);
          else if (!prepared) {
            const loaded = await loadDeck(activeDeck, current, controller.signal, token, {
              localOnly,
            });
            throwIfSoundtrackAborted(controller.signal);
            if (token !== generation || disposed) return false;
            if (!loaded) {
              // An online recording stays selected for a later explicit Play.
              // Absence during local preparation is not a failed recording.
              error = null;
              status = 'paused';
              emit();
              return false;
            }
          }
          throwIfSoundtrackAborted(controller.signal);
          if (token !== generation || disposed) return false;
          if (desired) {
            const enabled = soundscape.enable();
            if (
              current.kind === 'published' &&
              (!(await enabled) || token !== generation || disposed || !desired)
            )
              return false;
            watchCurrentRemote();
            await activeDeck.media.play();
            await enabled;
            if (token !== generation || disposed || !desired) return false;
            status = 'playing';
          }
        }
      }
      error = null;
      status = desired ? 'playing' : 'paused';
      if (status === 'playing') watchCurrentRemote();
      emit();
      prepareNext();
      return status === 'playing';
    } catch (failure) {
      if (token !== generation || disposed || failure?.name === 'AbortError') {
        return false;
      }
      if (pendingDeck?.controller === controller) pendingDeck = null;
      if (incoming !== activeDeck) {
        clearDeck(incoming);
        failed.add(nextTrack.id);
        notice = failure?.message || t('interface:theNextTrackCouldNotBePlayed');
        emit();
        prepareNext();
        return false;
      }
      if (failure?.name === 'NotAllowedError') {
        status = 'blocked';
        error = t('interface:yourBrowserNeedsAnAudioPlayAction');
        emit();
        return false;
      }
      return failedTrack(failure?.message || t('interface:thisTrackCouldNotBePlayed'), token);
    } finally {
      if (token === generation) {
        preparation = null;
        emit();
      }
    }
  }
  async function failedTrack(message, token) {
    if (token !== generation || disposed) return false;
    if (current) failed.add(current.id);
    error = message;
    notice = message;
    emit();
    let at = playableIndex(
      index + 1 < queue.length ? index + 1 : playlist?.repeat === 'all' ? 0 : -1,
    );
    if (at < 0 && failureFallback?.fromPlaylistId === playlist?.id) {
      const fallbackPlaylistId = failureFallback.toPlaylistId;
      failureFallback = null;
      fallbackUsed = true;
      override = fallbackPlaylistId;
      install(resolve());
      at = playableIndex(0);
    }
    if (
      at < 0 &&
      !fallbackUsed &&
      !(playlistSource === 'remote' && remoteSelection?.allowLibraryFallback === false) &&
      (library.format === SOUNDTRACK_FORMAT ||
        ['catalogue', 'catalogue-fallback', 'unavailable', 'published', 'remote'].includes(
          playlistSource,
        ))
    ) {
      fallbackUsed = true;
      let fallback;
      if (['published', 'remote'].includes(playlistSource)) {
        remoteSelection = null;
        remoteTracks = [];
        fallback = resolve();
      } else if (library.format === SOUNDTRACK_FORMAT)
        fallback = resolveSoundtrackSelection(emptySoundtrackLibrary());
      else fallback = soundtrackFallbackSelection(library.listening.mode, library.listening.genres);
      install(fallback);
      at = playableIndex(0);
    }
    if (at < 0) {
      desired = false;
      status = 'error';
      soundscape.pauseMusic();
      clearMedia();
      emit();
      return false;
    }
    // A failure skips each ID at most once until the next explicit user retry/selection.
    return startAt(at);
  }
  async function advance(natural = false) {
    if (disposed || suspended) return false;
    if (dirty || pending) {
      const next = resolve(),
        oldPlaylist = playlist?.id,
        oldTrack = current?.id;
      install(next, { after: oldPlaylist === next.playlist.id ? oldTrack : null });
    }
    const at = playableIndex(nextIndex(natural));
    if (at < 0) {
      cancel();
      desired = false;
      status = 'ended';
      soundscape.pauseMusic();
      activeDeck.media.pause();
      emit();
      return false;
    }
    return startAt(at, { fading: !natural });
  }
  function setAuthoredTrack(value) {
    let next = null;
    if (value !== null) {
      const recipe = boundedJSON(value, {
        maxBytes: 2048,
        maxNodes: 20,
        maxDepth: 2,
        maxString: 120,
      });
      const checked = validateTrack(recipe);
      required(checked.valid, checked.errors.join('; '));
      next = Object.freeze({
        id: 'builtin.authored',
        kind: 'synth',
        title: recipe.name,
        artist: t('interface:authoredGameSoundtrack'),
        recipe: Object.freeze(recipe),
      });
    }
    if (canonicalJSON(authored) === canonicalJSON(next)) return snapshot();
    authored = next;
    const selected = resolve();
    if (selected.source === 'authored' || playlist?.id === 'builtin.authored.current') {
      dirty = true;
      pending = selected;
    }
    emit();
    return snapshot();
  }
  /** Code-owned release fallback only; never enters the saved track library. */
  function setPublishedTrack(value) {
    if (disposed) return snapshot();
    if (value !== null)
      required(
        value &&
          /^published\.[a-f0-9]{64}$/.test(value.id) &&
          typeof value.title === 'string' &&
          typeof value.readBlob === 'function' &&
          typeof value.allowed === 'function',
        t('interface:invalidPublishedMusicAdapter'),
      );
    if (!value && current?.kind === 'published') {
      cancel();
      clearMedia();
      soundscape.pauseMusic();
      current = null;
      status = 'paused';
    }
    published = value
      ? Object.freeze({
          ...value,
          title: value.title.slice(0, 160),
          artist: t('interface:publishedGameTheme'),
          kind: 'published',
        })
      : null;
    const selected = resolve();
    if (selected.source === 'published' || playlist?.id === 'builtin.published.current') {
      dirty = true;
      pending = selected;
    }
    emit();
    return snapshot();
  }
  function setLibrary(value, { publicStyles } = {}) {
    const next = resolveSoundtrackLibrary(value),
      styles = publicStyles == null ? null : soundtrackStyleSelection(publicStyles, 0).styles,
      changedStyles = canonicalJSON(styles) !== canonicalJSON(savedPublicStyles),
      changedPolicy = !sameSoundtrackListening(next, library),
      previousStored = library.selection.playlistId;
    if (changedStyles || (styles && changedPolicy)) {
      cancel();
      savedPublicStyles = styles;
      pendingPublicStyles = styles;
      // An obsolete prepared local track must not make Solo Start skip Play.
      clearMedia();
      soundscape.pauseMusic();
      current = null;
      remoteSelection = null;
      remoteTracks = [];
      playlist = null;
      queue = [];
      index = -1;
      status = 'paused';
    }
    cancelPreload();
    library = next;
    if (remoteSelection && next.listening?.recordingMode) {
      const allowed = remoteTracks.filter(onlineSoundtrackRecordingAllowed),
        remoteIds = new Set(remoteTracks.map((track) => track.id)),
        allowedIds = new Set(allowed.map((track) => track.id)),
        retainedTrackIds = remoteSelection.playlist.trackIds.filter(
          (id) => !remoteIds.has(id) || allowedIds.has(id),
        ),
        currentAllowed =
          current?.kind !== 'remote' || allowed.some((track) => track.id === current.id);
      if (!currentAllowed || !retainedTrackIds.length) {
        remoteSelection = null;
        remoteTracks = [];
        if (current?.kind === 'remote') {
          cancel();
          clearMedia();
          soundscape.pauseMusic();
          current = null;
          status = 'paused';
        }
      } else if (allowed.length !== remoteTracks.length) {
        remoteTracks = allowed;
        remoteSelection = {
          ...remoteSelection,
          playlist: {
            ...remoteSelection.playlist,
            trackIds: retainedTrackIds,
          },
        };
      }
    }
    if (override !== null && !soundtrackPlaylists(next).some((p) => p.id === override))
      override = null;
    if (!current || next.selection.playlistId !== previousStored) {
      override = next.selection.playlistId;
      failureFallback = null;
    }
    failed = new Set();
    fallbackUsed = false;
    dirty = true;
    pending = resolve();
    emit();
    return snapshot();
  }
  function setLocalRecordingIds(ids) {
    required(
      Array.isArray(ids) &&
        ids.length <= 256 &&
        new Set(ids).size === ids.length &&
        ids.every((id) => typeof id === 'string' && /^[a-z0-9][a-z0-9._-]{0,127}$/.test(id)),
      'Invalid local soundtrack identities.',
    );
    localRecordingIds = [...ids];
    if (!current) dirty = true;
    baseSelection = null;
    failed = new Set();
    return setContext(context);
  }
  function setContext(value) {
    const owned = boundedJSON(value, {
      maxBytes: 32768,
      maxNodes: 1000,
      maxDepth: 3,
      maxString: 512,
    });
    resolveSoundtrackSelection(
      { ...library, selection: { playlistId: override } },
      selectionContext(owned),
    );
    cancelPreload();
    const sceneChanged = (context.scene ?? 'gameplay') !== (owned.scene ?? 'gameplay');
    context = owned;
    const next = resolve();
    if (canonicalJSON(next.playlist) !== canonicalJSON(playlist)) pending = next;
    else if (!dirty) pending = null;
    if (
      !pendingPublicStyles &&
      sceneChanged &&
      current &&
      !next.playlist.trackIds.includes(current.id)
    ) {
      install(next);
      void startAt(0, { fading: true });
    }
    emit();
    return snapshot();
  }
  async function selectPlaylist(id, options = {}) {
    required(
      options !== null &&
        typeof options === 'object' &&
        !Array.isArray(options) &&
        Object.keys(options).every((key) => key === 'failureFallbackPlaylistId'),
      'Invalid soundtrack selection options.',
    );
    const failureFallbackPlaylistId = options.failureFallbackPlaylistId ?? null;
    resolveSoundtrackSelection({ ...library, selection: { playlistId: id } }, selectionContext());
    if (failureFallbackPlaylistId !== null) {
      required(
        failureFallbackPlaylistId !== id,
        'The soundtrack failure fallback must use a different playlist.',
      );
      resolveSoundtrackSelection(
        { ...library, selection: { playlistId: failureFallbackPlaylistId } },
        selectionContext(),
      );
    }
    pendingPublicStyles = null;
    cancelPublicStyleLoad();
    intentGeneration++;
    remoteSelection = null;
    remoteTracks = [];
    override = id;
    notice = null;
    failed = new Set();
    fallbackUsed = false;
    install(resolve());
    failureFallback =
      failureFallbackPlaylistId === null
        ? null
        : {
            fromPlaylistId: playlist.id,
            toPlaylistId: failureFallbackPlaylistId,
          };
    return startAt(0, { fading: true });
  }
  async function selectListening(listening) {
    const next = resolveSoundtrackLibrary({ ...upgradeSoundtrackLibrary(library), listening });
    remoteSelection = null;
    remoteTracks = [];
    setLibrary(next);
    return selectPlaylist(null);
  }
  async function playRemotePlaylist(
    value,
    {
      order = 'ordered',
      repeat = 'all',
      startTrackId = null,
      mixWithLibrary = false,
      allowLibraryFallback = true,
    } = {},
  ) {
    required(
      Array.isArray(value) && value.every(isResolvedOnlineSoundtrackTrack),
      t('interface:onlineSoundtracksMustComeFromTheResolvedProjectCatalogue'),
    );
    required(['ordered', 'shuffle'].includes(order), t('interface:invalidOnlineSoundtrackOrder'));
    required(
      ['all', 'one', 'off'].includes(repeat),
      t('interface:invalidOnlineSoundtrackRepeatMode'),
    );
    required(typeof mixWithLibrary === 'boolean', t('interface:invalidOnlineSoundtrackMixMode'));
    required(
      typeof allowLibraryFallback === 'boolean',
      'Invalid online soundtrack fallback policy.',
    );
    required(
      startTrackId === null || /^online\.[a-f0-9]{64}$/.test(startTrackId),
      t('interface:invalidOnlineSoundtrackStartRecording'),
    );
    const owned = boundedJSON(value, {
      maxBytes: 1024 * 1024,
      maxNodes: 65536,
      maxDepth: 5,
      maxArray: 512,
      maxString: 2048,
    });
    required(
      Array.isArray(owned) && owned.length >= 1,
      t('interface:chooseAtLeastOneOnlineSoundtrack'),
    );
    const ids = new Set();
    const validated = owned.map((track) => {
      required(
        track?.kind === 'remote' &&
          /^online\.[a-f0-9]{64}$/.test(track.id) &&
          track.sha256 === track.id.slice('online.'.length) &&
          typeof track.title === 'string' &&
          typeof track.artist === 'string' &&
          [true, false, null, 'unknown'].includes(track.contentId) &&
          typeof track.recordingModeEligible === 'boolean' &&
          (!track.recordingModeEligible || track.contentId === false) &&
          (track.delivery?.type === 'external-url' ||
            onlineSoundtrackRecordingURL(track.url, track.sha256)) &&
          !ids.has(track.id),
        t('interface:invalidOnlineSoundtrackRecording'),
      );
      ids.add(track.id);
      return Object.freeze({ ...track, websites: Object.freeze(track.websites ?? []) });
    });
    const eligibleTracks = library.listening?.recordingMode
      ? validated.filter(onlineSoundtrackRecordingAllowed)
      : validated;
    required(
      eligibleTracks.length > 0,
      t('interface:recordingModeExcludesTheseOnlineSoundtracksUntilGameplayVideoAnd'),
    );
    required(
      startTrackId === null || eligibleTracks.some((track) => track.id === startTrackId),
      t('interface:theChosenOnlineSoundtrackIsUnavailableInThisPlaybackMode'),
    );
    pendingPublicStyles = null;
    cancelPublicStyleLoad();
    intentGeneration++;
    const localSelection = mixWithLibrary ? resolveBase() : null;
    remoteTracks = eligibleTracks;
    const localTrackIds = localSelection
      ? localSelection.playlist.trackIds.filter(
          (id) => !ids.has(id) && tracks().some((track) => track.id === id),
        )
      : [];
    remoteSelection = {
      source: 'remote',
      allowLibraryFallback,
      playlist: {
        id: 'online.archive.current',
        title: mixWithLibrary
          ? t('interface:onlineArchiveAndGameMusic')
          : t('interface:onlineSoundtrackArchive'),
        trackIds: [...remoteTracks.map((track) => track.id), ...localTrackIds],
        order,
        repeat,
      },
      notice: mixWithLibrary
        ? t('interface:mixingPublicArchiveWithCurrentGameMusicSelection')
        : t('interface:streamingFromThePublicReveallineSoundtrackArchive'),
    };
    intentionallyPaused = false;
    desired = true;
    notice = null;
    failed = new Set();
    fallbackUsed = false;
    failureFallback = null;
    install(remoteSelection);
    if (startTrackId !== null) {
      const at = queue.indexOf(startTrackId);
      queue = [...queue.slice(at), ...queue.slice(0, at)];
    }
    return startAt(0, { fading: true, localOnly: false });
  }
  function playSavedPublicStyles() {
    if (publicStyleLoad) return publicStyleLoad.promise;
    const request = { controller: new AbortController(), promise: null },
      styles = pendingPublicStyles,
      intent = ++intentGeneration;
    publicStyleLoad = request;
    intentionallyPaused = false;
    desired = true;
    status = 'loading';
    error = null;
    preparation = {
      generation,
      stage: 'reading',
      message: t('interface:loadingThePublicSoundtrackCatalogue'),
    };
    // Keep the audio-context wake in the activation turn. A denied media start
    // retains the resolved queue so the next gesture can call play directly.
    emit();
    const active = () =>
      publicStyleLoad === request &&
      !disposed &&
      !suspended &&
      desired &&
      intentGeneration === intent &&
      !request.controller.signal.aborted;
    request.promise = (async () => {
      try {
        Promise.resolve(soundscape.enable()).catch(() => {});
        const catalogue = await fetchOnlineSoundtrackCatalogue({
          ...onlineCatalogueDownload,
          signal: request.controller.signal,
        });
        if (!active()) return false;
        const selected = publicSoundtrackSelection(catalogue, styles, {
          recordingMode: Boolean(library.listening?.recordingMode),
        });
        required(selected.tracks.length > 0, t('interface:soundtrack.chooseAtLeastOneStyle'));
        publicStyleLoad = null;
        preparation = null;
        return playRemotePlaylist(selected.tracks, {
          order: 'shuffle',
          repeat: 'all',
          mixWithLibrary: selected.mixWithLibrary,
          allowLibraryFallback: false,
        });
      } catch (failure) {
        if (!active()) return false;
        status = 'error';
        error = failure.message;
        return false;
      } finally {
        if (publicStyleLoad === request) {
          publicStyleLoad = null;
          preparation = null;
          emit();
        }
      }
    })();
    return request.promise;
  }
  async function play() {
    if (disposed || suspended) return false;
    if (pendingPublicStyles) return playSavedPublicStyles();
    intentGeneration++;
    intentionallyPaused = false;
    desired = true;
    notice = null;
    failed = new Set();
    fallbackUsed = false;
    if (
      current &&
      index >= 0 &&
      queue[index] === current.id &&
      status !== 'ended' &&
      status !== 'error' &&
      (current.kind === 'synth' || activeDeck.url !== null)
    ) {
      const token = generation;
      const preparing = {
        generation: token,
        stage: 'playing',
        message: t('interface:startingMusicPlayback'),
      };
      preparation = preparing;
      emit();
      try {
        if (token !== generation || disposed || !desired) return false;
        if (current.kind === 'synth') {
          const enabled = await soundscape.enable();
          if (token !== generation || disposed || !desired) return false;
          if (!enabled) {
            status = 'blocked';
            error = t('interface:enableAudioToPlayMusic');
            emit();
            return false;
          }
          if (token !== generation || !desired) return false;
          if (pendingSeek !== null) {
            soundscape.seekMusic(pendingSeek);
            pendingSeek = null;
          }
          soundscape.resumeMusic();
        } else {
          const enabled = soundscape.enable();
          if (
            current.kind === 'published' &&
            (!(await enabled) || token !== generation || disposed || !desired)
          )
            return false;
          await activeDeck.media.play();
          await enabled;
        }
        if (token !== generation || !desired) return false;
        status = 'playing';
        error = null;
        gains();
        watchCurrentRemote();
        emit();
        prepareNext();
        return true;
      } catch (failure) {
        if (token !== generation) return false;
        if (failure?.name === 'NotAllowedError') {
          status = 'blocked';
          error = t('interface:yourBrowserNeedsAnAudioPlayAction');
          emit();
          return false;
        }
        return failedTrack(failure?.message || t('interface:playbackFailed'), token);
      } finally {
        if (token === generation && preparation === preparing) {
          preparation = null;
          emit();
        }
      }
    }
    if (!playlist || dirty || status === 'ended' || status === 'error') install(resolve());
    return startAt(Math.max(0, index));
  }
  /**
   * Prepare the selected track without playing it. Hosts use this after local
   * storage is ready so a later tap can call HTMLMediaElement.play() directly.
   * Online acquisition needs a separate, explicit host opt-in; ordinary silent
   * preparation and intentionally paused selections use local originals only.
   */
  async function prepare({ allowNetwork = false } = {}) {
    required(typeof allowNetwork === 'boolean', t('interface:invalidSoundtrackPreparationPolicy'));
    if (
      pendingPublicStyles ||
      disposed ||
      suspended ||
      desired ||
      status === 'playing' ||
      status === 'loading'
    )
      return false;
    if (!playlist || dirty || status === 'ended' || status === 'error') install(resolve());
    return startAt(Math.max(0, index), {
      localOnly: !allowNetwork || intentionallyPaused || Boolean(audioMaster?.snapshot().muted),
    });
  }
  /**
   * Clear a lifecycle suspension in the same event turn as a user gesture.
   * Do not await this before play(): iOS Safari associates media permission
   * with the synchronous call stack that contains the gesture.
   */
  function wake() {
    if (disposed) return false;
    suspended = false;
    return soundscape.enable();
  }
  function setIntent(value) {
    required(typeof value === 'boolean', t('interface:listeningIntentMustBeABoolean'));
    if (disposed) return snapshot();
    required(
      status !== 'playing' && status !== 'loading',
      t('interface:restoreListeningIntentOnlyWhileMusicIsInactive'),
    );
    cancelPublicStyleLoad();
    intentGeneration++;
    desired = value;
    intentionallyPaused = !value;
    emit();
    return snapshot();
  }
  function pause() {
    if (disposed) return;
    intentGeneration++;
    desired = false;
    intentionallyPaused = true;
    cancel();
    soundscape.pauseMusic();
    clearTimeout(activeDeck.remoteWatchdog);
    activeDeck.remoteWatchdog = null;
    activeDeck.media.pause();
    fade = 1;
    gains();
    status = 'paused';
    emit();
  }
  function seek(seconds) {
    required(
      Number.isFinite(seconds) && seconds >= 0 && current && seconds <= position().durationSeconds,
      t('interface:invalidMusicSeekPosition'),
    );
    cancelPreload();
    gains();
    if (current.kind === 'synth') pendingSeek = soundscape.seekMusic(seconds) ? null : seconds;
    else if (activeDeck.media.readyState >= 1) activeDeck.media.currentTime = seconds;
    else pendingSeek = seconds;
    emit();
  }
  function setVolume(value) {
    required(
      Number.isFinite(value) && value >= 0 && value <= 1,
      t('interface:musicVolumeMustBe01'),
    );
    volume = value;
    gains();
    emit();
  }
  async function previous() {
    if (disposed || suspended) return false;
    if (pendingPublicStyles) return desired ? play() : false;
    intentGeneration++;
    failed = new Set();
    fallbackUsed = false;
    if (position().positionSeconds > 3) {
      seek(0);
      return desired ? play() : false;
    }
    return startAt(Math.max(0, index - 1), { fading: true });
  }
  function update(active, theme, state = {}) {
    if (disposed) return;
    gains();
    soundscape.update(active, theme, state);
    maybeTransition();
    if (current?.kind === 'synth' && status === 'playing') {
      const second = Math.floor(position().positionSeconds);
      if (second !== lastPositionSecond) {
        lastPositionSecond = second;
        emit();
      }
    }
  }
  function suspend() {
    if (disposed) return;
    intentGeneration++;
    cancel();
    suspended = true;
    clearTimeout(activeDeck.remoteWatchdog);
    activeDeck.remoteWatchdog = null;
    activeDeck.media.pause();
    soundscape.suspend();
    status = 'suspended';
    emit();
  }
  async function resume() {
    if (disposed) return false;
    const enabled = wake();
    if (!desired) {
      status = 'paused';
      emit();
      return false;
    }
    const playing = play();
    await enabled;
    return playing;
  }
  function dispose() {
    if (disposed) return;
    disposed = true;
    unsubscribeMaster?.();
    desired = false;
    cancel();
    soundscape.setSongEndHandler(null);
    soundscape.pauseMusic();
    clearMedia();
    fade = 1;
    gainLeases.clear();
    gains();
    status = 'disposed';
    for (const deck of decks) deck.masterMedia?.dispose();
    emit();
  }
  soundscape.pauseMusic();
  soundscape.setSongEndHandler(() => {
    if (!disposed && desired && !suspended && current?.kind === 'synth') void advance(true);
  });
  const unsubscribeMaster = audioMaster?.subscribe((state) => {
    if (state.muted) cancelPreload();
    else prepareNext();
  });
  return Object.freeze({
    setLibrary,
    intentRevision: () => intentGeneration,
    setLocalRecordingIds,
    setContext,
    setAuthoredTrack,
    setPublishedTrack,
    playRemotePlaylist,
    selectPlaylist,
    selectListening,
    prepare,
    wake,
    play,
    cancelPendingPlay: () => {
      if (publicStyleLoad) pause();
    },
    pause,
    setIntent,
    next: () => {
      if (disposed || suspended) return false;
      if (pendingPublicStyles) return desired ? play() : false;
      intentGeneration++;
      return advance(false);
    },
    previous,
    seek,
    setVolume,
    acquireGain,
    update,
    suspend,
    resume,
    dispose,
    snapshot,
  });
}
