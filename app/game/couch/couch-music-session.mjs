import { t } from '../i18n/index.mjs';
import { required } from '../data-json.mjs';

/** Page-session policy around borrowed owners. The host owns the one player,
 * library and persistent Soundscape, gestures, frame pump and modal/game state.
 * Route user transport through this policy, not directly through the player.
 */
export function createCouchMusicSession({
  player,
  library,
  soundscape,
  initialMusicVolume = 0.55,
} = {}) {
  required(
    player && library && soundscape,
    t('interface:couchMusicRequiresPlayerLibraryAndSoundscapeOwners'),
  );
  player.setVolume(initialMusicVolume);
  let disposed = false,
    suspended = false,
    preparing = false;
  let transportChoice = 'none',
    needsPlayGesture = false,
    intent = 0,
    preparation = 0;
  let pendingPlay = null;
  function snapshot() {
    const storage = library.snapshot(),
      playback = player.snapshot();
    return Object.freeze({
      disposed,
      suspended,
      preparing,
      transportChoice,
      needsPlayGesture,
      readyForStart:
        !disposed &&
        !preparing &&
        (['ready', 'error'].includes(storage.status) ||
          (Number.isSafeInteger(storage.generation) && Boolean(playback.track))) &&
        playback.status !== 'loading',
      library: storage,
      playback,
    });
  }
  async function adopt(work) {
    required(!disposed, t('interface:couchMusicSessionIsDisposed'));
    const token = ++preparation;
    try {
      const result = await work();
      if (!disposed && token === preparation && result.adopted && !suspended) {
        preparing = true;
        await player.prepare();
      }
      return result;
    } finally {
      if (token === preparation) preparing = false;
    }
  }
  function requestPlay() {
    if (disposed) return Promise.resolve(false);
    if (pendingPlay) return pendingPlay.promise ?? Promise.resolve(false);
    if (player.snapshot().playing) {
      needsPlayGesture = false;
      return Promise.resolve(true);
    }
    if (!snapshot().readyForStart) {
      needsPlayGesture = true;
      return Promise.resolve(false);
    }
    const token = ++intent;
    const attempt = { promise: null };
    pendingPlay = attempt;
    suspended = false;
    attempt.promise = (async () => {
      try {
        // Both calls occur in the activation task. Never await wake/storage before
        // the existing player's direct HTMLMediaElement.play path.
        const enabled = player.wake();
        const playing = player.play();
        const [, result] = await Promise.all([enabled, playing]);
        if (!disposed && token === intent) needsPlayGesture = !result && player.snapshot().desired;
        return !disposed && token === intent && result;
      } catch (cause) {
        if (!disposed && token === intent) needsPlayGesture = true;
        throw cause;
      } finally {
        if (pendingPlay === attempt) pendingPlay = null;
      }
    })();
    return attempt.promise;
  }
  function pause() {
    if (disposed) return;
    transportChoice = 'pause';
    needsPlayGesture = false;
    intent++;
    pendingPlay = null;
    player.pause();
  }
  return Object.freeze({
    snapshot,
    loadLibrary(options) {
      return adopt(() => library.load(options));
    },
    saveLibrary(value, options) {
      return adopt(() => library.commit(value, options));
    },
    start() {
      return transportChoice === 'pause' ? Promise.resolve(false) : requestPlay();
    },
    play() {
      if (disposed) return Promise.resolve(false);
      transportChoice = 'play';
      return requestPlay();
    },
    pause,
    setVolume(value) {
      required(!disposed, t('interface:couchMusicSessionIsDisposed'));
      player.setVolume(value);
    },
    setAcceptedContext(value) {
      required(!disposed, t('interface:couchMusicSessionIsDisposed'));
      return player.setContext(value);
    },
    pauseGameplay() {
      if (!disposed) soundscape.pause();
    },
    resetGameplay() {
      if (!disposed) soundscape.reset();
    },
    update(active, theme, state) {
      if (!disposed && !suspended) player.update(active, theme, state);
    },
    suspend() {
      if (disposed) return;
      suspended = true;
      intent++;
      pendingPlay = null;
      player.suspend();
    },
    async resume() {
      if (disposed) return false;
      suspended = false;
      if (player.snapshot().desired) return requestPlay();
      // Clear the transport's lifecycle gate without inventing listening intent.
      // An outstanding explicit Play request still needs its own gesture.
      await player.resume();
      return false;
    },
    dispose() {
      if (disposed) return;
      disposed = true;
      suspended = true;
      preparing = false;
      intent++;
      preparation++;
      pendingPlay = null;
      needsPlayGesture = false;
      // Stop owned intent, but leave borrowed player/store/context disposal to
      // the host in its defined order. A late library read cannot auto-Play.
      player.pause();
    },
  });
}
