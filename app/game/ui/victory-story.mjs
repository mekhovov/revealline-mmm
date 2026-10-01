import { contentText } from '../i18n/content.mjs';
import {
  t,
  localizedText,
  localizedAttribute,
  localizedMessage,
  render as renderMessage,
} from '../i18n/index.mjs';
import { createOperationStatus } from './operation-status.mjs';
import { bindAudioMasterMedia } from './audio-master.mjs';
import { required } from '../data-json.mjs';
import { requirePreparedVictoryStory, VICTORY_STORY_LIMITS } from '../victory-story.mjs';

/** Temporary multiplicative gain leases; never owns base volume, song or listening intent.
 * applyGain must target a dedicated session-mixer factor, not a saved preference.
 */
export function createStoryMusicDucker(applyGain) {
  required(typeof applyGain === 'function', t('interface:aTemporaryMusicGainAdapterIsRequired'));
  const leases = new Map();
  const apply = () => applyGain(Math.min(1, ...leases.values()));
  return Object.freeze({
    acquire(gain = 0.2) {
      required(
        Number.isFinite(gain) && gain >= 0 && gain <= 1,
        t('interface:invalidMusicDuckFactor'),
      );
      const token = {};
      leases.set(token, gain);
      try {
        apply();
      } catch (error) {
        leases.delete(token);
        try {
          apply();
        } catch {
          /* The caller reports an unavailable mixer. */
        }
        throw error;
      }
      let released = false;
      return () => {
        if (!released) {
          released = true;
          leases.delete(token);
          apply();
        }
      };
    },
  });
}

/** Standalone optional presentation. Caller supplies an already decoded exact poster
 * element and its verified pin. No simulation, award, storage or assignment callback exists.
 */
export function createVictoryStoryPresentation({
  container,
  posterElement,
  picturePin,
  prepared,
  document = container?.ownerDocument,
  window = document?.defaultView,
  createVideo = () => document.createElement('video'),
  URLImpl = globalThis.URL,
  timers = globalThis,
  musicDucker = null,
  audioMaster = null,
  volume = 0.7,
  masterVolume = 1,
  muted = false,
  reducedMotion = false,
  timeoutMs = VICTORY_STORY_LIMITS.timeoutMs,
  onChange = () => {},
  signal,
} = {}) {
  const story = requirePreparedVictoryStory(prepared, picturePin).descriptor;
  required(
    container?.append && posterElement && document?.createElement,
    t('interface:aNativePosterPresentationContainerIsRequired'),
  );
  required(
    container.contains(posterElement),
    t('interface:theExactPosterMustAlreadyBelongToThisContainer'),
  );
  required(
    typeof onChange === 'function' &&
      typeof createVideo === 'function' &&
      typeof URLImpl?.createObjectURL === 'function' &&
      typeof URLImpl?.revokeObjectURL === 'function',
    t('interface:storyPresentationAdaptersAreUnavailable'),
  );
  required(
    !musicDucker || typeof musicDucker.acquire === 'function',
    t('interface:invalidTemporaryMusicDuckAdapter'),
  );
  required(
    Number.isFinite(timeoutMs) && timeoutMs > 0 && timeoutMs <= 60000,
    t('interface:invalidStoryTimeout'),
  );
  const preferences = (v, reduced) =>
    required(
      Number.isFinite(v) && v >= 0 && v <= 1 && typeof reduced === 'boolean',
      t('interface:invalidCinematicVolumeOrReducedMotionPreference'),
    );
  const masterPreferences = (value, silent) =>
    required(
      Number.isFinite(value) && value >= 0 && value <= 1 && typeof silent === 'boolean',
      t('interface:invalidCinematicMasterVolumeOrMute'),
    );
  masterPreferences(masterVolume, muted);
  preferences(volume, reducedMotion);
  const element = document.createElement('section');
  element.className = 'victory-story';
  localizedAttribute(element, 'aria-label', () => t('interface:optionalVictoryStory'));
  const description = document.createElement('p');
  localizedText(description, () => contentText(story, 'description'));
  const notice = document.createElement('p');
  const feedback = createOperationStatus(notice);
  let activity = null;
  notice.tabIndex = -1;
  const controls = document.createElement('div');
  const buttons = {};
  for (const [id, key] of [
    ['play', 'common:actions.playback'],
    ['pause', 'common:actions.pause'],
    ['skip', 'interface:skip'],
    ['replay', 'interface:replay'],
  ]) {
    const button = document.createElement('button');
    button.type = 'button';
    localizedText(button, () => t(key));
    controls.append(button);
    buttons[id] = button;
  }
  const volumeLabel = document.createElement('label');
  localizedText(volumeLabel, () => t('interface:cinematicVolume'));
  const volumeInput = document.createElement('input');
  volumeInput.type = 'range';
  volumeInput.min = '0';
  volumeInput.max = '1';
  volumeInput.step = '0.05';
  volumeInput.value = String(volume);
  localizedAttribute(volumeInput, 'aria-label', () => t('interface:cinematicVolume'));
  volumeLabel.append(volumeInput);
  controls.append(volumeLabel);
  element.append(description, notice, controls);
  container.append(element);
  const posterHidden = posterElement.hidden;
  let media = null,
    url = null,
    disposed = false,
    state = 'preparing',
    reason = null;
  let desired = false,
    ready = false,
    hasPlayed = false,
    generation = 0,
    playEpoch = 0;
  let metadataSeen = false,
    seekingStart = false,
    keepPoster = false;
  let deadline = null,
    pulse = null,
    frame = null,
    releaseDuck = null,
    cancelPlay = null;
  let audioWarning = null;
  let masterBinding = null,
    releaseMasterStatus = null;
  const applyAudio = () => {
    if (!media) return;
    if (masterBinding) masterBinding.setLocal({ volume, muted: !desired || volume === 0 });
    else {
      media.volume = volume * masterVolume;
      media.muted = !desired || muted || volume === 0 || masterVolume === 0;
    }
  };
  const listeners = [];
  const listen = (target, name, fn) => {
    target?.addEventListener(name, fn);
    listeners.push(() => target?.removeEventListener(name, fn));
  };
  const activePage = () => !document.hidden && (!document.hasFocus || document.hasFocus());
  const snapshot = () =>
    Object.freeze({
      state,
      reason: reason === null ? null : renderMessage(reason),
      audioWarning: audioWarning === null ? null : renderMessage(audioWarning),
      volume,
      reducedMotion,
      startSeconds: story.segment.startSeconds,
      endSeconds: story.segment.endSeconds,
      positionSeconds: Number.isFinite(media?.currentTime) ? media.currentTime : null,
    });
  const emit = () => {
    if (!disposed) onChange(snapshot());
  };
  const render = () => {
    if (disposed) return;
    // Native browsers can blur an active control immediately when it is hidden
    // or disabled. Remember ownership before updating its availability.
    const focused = document.activeElement;
    const showing = state === 'playing' || state === 'paused' || state === 'starting';
    posterElement.hidden = showing;
    if (media) media.hidden = !showing;
    buttons.play.hidden = hasPlayed && state === 'poster';
    localizedText(buttons.play, () =>
      state === 'paused' ? t('interface:resumeStory') : t('common:actions.playback'),
    );
    buttons.play.disabled = !ready || ['playing', 'starting', 'preparing', 'error'].includes(state);
    buttons.pause.hidden = !['playing', 'starting'].includes(state);
    buttons.skip.hidden = state === 'poster' || state === 'error';
    buttons.replay.hidden = !hasPlayed || !['poster', 'blocked', 'paused'].includes(state);
    const message = () => {
      let message =
        renderMessage(reason) ||
        (state === 'preparing'
          ? t('interface:preparingOptionalStoryYourPictureIsUnchanged')
          : state === 'starting'
            ? t('interface:startingStoryPlayback')
            : state === 'playing'
              ? t('interface:storyPlaying')
              : state === 'paused'
                ? t('interface:storyPausedResumeExplicitly')
                : reducedMotion
                  ? t('interface:reducedMotionTheEarnedPictureStaysAvailablePlayIsOptional')
                  : t('interface:yourPictureStoryPlaybackIsOptional'));
      const master = audioMaster?.snapshot();
      if (master ? master.muted || master.volume === 0 : muted || masterVolume === 0)
        message += ' ' + t('interface:masterSoundIsMutedCinematicVolumeDoesNotUnmuteIt') + '';
      if (audioWarning) message += ` ${renderMessage(audioWarning)}`;
      return message;
    };
    if (state === 'preparing' || state === 'starting') {
      activity ??= feedback.begin({ message, isCurrent: () => !disposed });
      activity.update({ message, stage: state === 'starting' ? 'playing' : 'decoding' });
    } else {
      (activity ?? feedback.begin({ message })).finish({
        message,
        state: state === 'error' || state === 'blocked' ? 'error' : 'ready',
      });
      activity = null;
    }
    if (
      !disposed &&
      activePage() &&
      Object.values(buttons).includes(focused) &&
      (focused.hidden || focused.disabled) &&
      (document.activeElement === focused || document.activeElement === document.body)
    ) {
      (
        Object.values(buttons).find((button) => !button.hidden && !button.disabled) ?? notice
      ).focus();
    }
    emit();
  };
  const stopDeadline = () => {
    if (deadline !== null) timers.clearTimeout(deadline);
    deadline = null;
  };
  const stopPulses = () => {
    if (pulse !== null) timers.clearInterval(pulse);
    pulse = null;
    if (frame !== null) media?.cancelVideoFrameCallback?.(frame);
    frame = null;
  };
  const releaseLease = (release) => {
    try {
      release?.();
    } catch {
      audioWarning = localizedMessage('interface:musicGainCouldNotBeRestoredCheckTheMusicControls');
    }
  };
  const unduck = () => {
    const release = releaseDuck;
    releaseDuck = null;
    releaseLease(release);
  };
  const halt = () => {
    desired = false;
    playEpoch++;
    stopDeadline();
    stopPulses();
    const cancel = cancelPlay;
    cancelPlay = null;
    cancel?.(false);
    if (media) {
      applyAudio();
      media.pause();
    }
    unduck();
  };
  const fail = (message) => {
    if (disposed) return;
    halt();
    if (disposed) return;
    state = 'error';
    reason = message;
    render();
  };
  const armDeadline = (message) => {
    if (disposed) return;
    stopDeadline();
    deadline = timers.setTimeout(() => fail(message), timeoutMs);
  };
  const finish = (why) => {
    halt();
    if (disposed) return;
    state = 'poster';
    reason = why;
    render();
  };
  function pause() {
    if (disposed) return false;
    const inFlight = ['playing', 'starting', 'preparing'].includes(state);
    halt();
    if (disposed) return false;
    if (inFlight) {
      keepPoster = !ready;
      state = ready && hasPlayed ? 'paused' : 'poster';
      reason = localizedMessage('interface:storyPausedPlayAgainExplicitly');
      if (!ready)
        armDeadline(localizedMessage('interface:storyPreparationTimedOutYourPictureIsUnchanged'));
      render();
    }
    return inFlight;
  }
  function skip() {
    if (disposed) return false;
    keepPoster = true;
    finish(localizedMessage('interface:storySkippedYourExactPictureIsUnchanged'));
    if (disposed) return false;
    if (!ready)
      armDeadline(localizedMessage('interface:storyPreparationTimedOutYourPictureIsUnchanged'));
    return true;
  }
  function observe() {
    if (disposed || !desired || !['playing', 'starting'].includes(state)) return;
    if (!activePage()) {
      pause();
      return;
    }
    const time = media.currentTime;
    if (
      media.videoWidth !== story.source.width ||
      media.videoHeight !== story.source.height ||
      media.duration !== story.source.durationSeconds
    ) {
      fail(localizedMessage('interface:playbackMetadataChangedYourPictureIsUnchanged'));
      return;
    }
    if (!Number.isFinite(time) || time < story.segment.startSeconds - 0.001) {
      fail(localizedMessage('interface:storyLeftItsSelectedSegment'));
      return;
    }
    if (time >= story.segment.endSeconds)
      finish(localizedMessage('interface:storyEndedYourExactPictureIsUnchanged'));
    else if (media.ended)
      fail(localizedMessage('interface:theVideoEndedBeforeTheSelectedSegmentFinishedYourPicture'));
  }
  function scheduleFrames(token) {
    if (typeof media?.requestVideoFrameCallback !== 'function') return;
    const video = media;
    const handle = video.requestVideoFrameCallback(() => {
      if (disposed || video !== media || token !== playEpoch || !desired) return;
      if (frame === handle) frame = null;
      observe();
      if (desired) scheduleFrames(token);
    });
    frame = handle;
  }
  function play() {
    if (
      disposed ||
      !ready ||
      !activePage() ||
      ['playing', 'starting', 'error', 'preparing'].includes(state)
    )
      return Promise.resolve(false);
    if (media.currentTime >= story.segment.endSeconds) return replay();
    const video = media,
      token = ++playEpoch;
    const cancelled = new Promise((resolve) => {
      cancelPlay = resolve;
    });
    desired = true;
    state = 'starting';
    reason = null;
    try {
      const allocatedDuck = musicDucker?.acquire(0.2) ?? null;
      if (disposed || token !== playEpoch || !desired) {
        releaseLease(allocatedDuck);
        return Promise.resolve(false);
      }
      releaseDuck = allocatedDuck;
      applyAudio();
      armDeadline(localizedMessage('interface:storyPlaybackDidNotBeginSkipOrCloseTheStory'));
      // Invoke play within this call, before any await, preserving native user activation.
      const started = video.play();
      render();
      const completion = Promise.resolve(started).then(
        () => {
          if (disposed || token !== playEpoch || video !== media || !desired) {
            if (video !== media || !desired) video.pause();
            return false;
          }
          stopDeadline();
          cancelPlay = null;
          state = 'playing';
          hasPlayed = true;
          pulse = timers.setInterval(observe, 25);
          scheduleFrames(token);
          render();
          observe();
          return state === 'playing';
        },
        (error) => {
          if (disposed || token !== playEpoch || video !== media) return false;
          halt();
          if (disposed) return false;
          state = error?.name === 'NotAllowedError' ? 'blocked' : 'error';
          reason =
            state === 'blocked'
              ? localizedMessage('interface:yourBrowserBlockedPlaybackUsePlayAgainOrKeepThe')
              : localizedMessage('interface:thisVideoCouldNotPlayYourPictureRemainsAvailable');
          render();
          return false;
        },
      );
      return Promise.race([completion, cancelled]);
    } catch (error) {
      halt();
      if (disposed) return Promise.resolve(false);
      state = error?.name === 'NotAllowedError' ? 'blocked' : 'error';
      reason =
        state === 'blocked'
          ? localizedMessage('interface:yourBrowserNeedsAnExplicitPlayAction')
          : localizedMessage('interface:storyPlaybackIsUnavailableYourPictureRemainsAvailable');
      render();
      return Promise.resolve(false);
    }
  }
  function seekStart(autoplay = false) {
    halt();
    if (disposed) return;
    ready = false;
    seekingStart = true;
    desired = autoplay;
    state = keepPoster ? 'poster' : 'preparing';
    if (!keepPoster) reason = null;
    armDeadline(localizedMessage('interface:theSelectedStoryStartCouldNotBeReachedYourPicture'));
    try {
      media.currentTime = story.segment.startSeconds;
      render();
      if (disposed) return;
      if (!media.seeking && Math.abs(media.currentTime - story.segment.startSeconds) <= 0.001)
        finishSeek();
    } catch {
      fail(localizedMessage('interface:theSelectedStoryStartCouldNotBeReached'));
    }
  }
  function finishSeek() {
    if (
      disposed ||
      ready ||
      !seekingStart ||
      !['preparing', 'poster'].includes(state) ||
      media.seeking ||
      media.readyState < 2
    )
      return;
    if (Math.abs(media.currentTime - story.segment.startSeconds) > 0.001) {
      fail(localizedMessage('interface:theRequestedStorySeekWasNotHonored'));
      return;
    }
    const autoplay = desired;
    stopDeadline();
    seekingStart = false;
    ready = true;
    desired = false;
    state = 'poster';
    if (!keepPoster) reason = null;
    render();
    if (autoplay && activePage()) void play();
  }
  function replay() {
    if (disposed || !activePage() || !ready || state === 'error') return Promise.resolve(false);
    keepPoster = false;
    seekStart(true);
    return Promise.resolve(true);
  }
  function setPreferences(next) {
    if (disposed) return;
    const v = next.volume ?? volume,
      reduced = next.reducedMotion ?? reducedMotion;
    const master = next.masterVolume ?? masterVolume,
      silent = next.muted ?? muted;
    masterPreferences(master, silent);
    preferences(v, reduced);
    masterVolume = master;
    muted = silent;
    volume = v;
    volumeInput.value = String(v);
    const changed = !reducedMotion && reduced;
    reducedMotion = reduced;
    applyAudio();
    if (changed) skip();
    else render();
  }
  function dispose() {
    if (disposed) return;
    disposed = true;
    feedback.dispose();
    halt();
    releaseMasterStatus?.();
    releaseMasterStatus = null;
    masterBinding?.dispose();
    masterBinding = null;
    generation++;
    for (const remove of listeners.splice(0)) remove();
    if (media) {
      media.muted = true;
      media.removeAttribute('src');
      media.load();
      media.remove();
      media = null;
    }
    if (url) URLImpl.revokeObjectURL(url);
    url = null;
    posterElement.hidden = posterHidden;
    element.remove();
    state = 'disposed';
  }
  listen(buttons.play, 'click', () => void play());
  listen(buttons.pause, 'click', pause);
  listen(buttons.skip, 'click', skip);
  listen(buttons.replay, 'click', () => void replay());
  listen(volumeInput, 'input', () => setPreferences({ volume: Number(volumeInput.value) }));
  listen(window, 'blur', pause);
  listen(document, 'visibilitychange', () => {
    if (document.hidden) pause();
  });
  listen(window, 'pagehide', dispose);
  listen(signal, 'abort', dispose);
  const api = Object.freeze({
    element,
    play,
    pause,
    skip,
    replay,
    setPreferences,
    dispose,
    snapshot,
  });
  try {
    const allocatedVideo = createVideo();
    if (disposed || signal?.aborted) {
      // A trusted adapter can synchronously cancel before returning its allocation.
      if (allocatedVideo) {
        allocatedVideo.muted = true;
        allocatedVideo.pause?.();
        allocatedVideo.removeAttribute?.('src');
        allocatedVideo.load?.();
        allocatedVideo.remove?.();
      }
      dispose();
      return api;
    }
    required(
      allocatedVideo?.addEventListener && allocatedVideo?.play && allocatedVideo?.pause,
      t('interface:nativeVideoPlaybackIsUnavailable'),
    );
    media = allocatedVideo;
    media.controls = false;
    media.autoplay = false;
    media.loop = false;
    media.muted = true;
    media.playsInline = true;
    media.preload = 'auto';
    if (audioMaster)
      masterBinding = bindAudioMasterMedia({
        audioMaster,
        element: media,
        volume,
        muted: true,
      });
    else media.volume = volume * masterVolume;
    media.style.maxWidth = '100%';
    media.style.maxHeight = '100%';
    media.style.objectFit = 'contain';
    element.insertBefore(media, description);
    const video = media,
      token = ++generation;
    const current = (fn) => () => {
      if (!disposed && video === media && token === generation) fn();
    };
    listen(
      video,
      'loadedmetadata',
      current(() => {
        if (metadataSeen || state === 'error') return;
        metadataSeen = true;
        const expected = story.source;
        if (
          video.videoWidth !== expected.width ||
          video.videoHeight !== expected.height ||
          video.duration !== expected.durationSeconds
        ) {
          fail(localizedMessage('interface:playbackMetadataDiffersFromTheVerifiedOriginal'));
          return;
        }
        seekStart(false);
      }),
    );
    listen(video, 'loadeddata', current(finishSeek));
    listen(video, 'seeked', current(finishSeek));
    listen(video, 'timeupdate', current(observe));
    listen(
      video,
      'pause',
      current(() => {
        if (!desired || !video.paused) return;
        if (video.ended) observe();
        else pause();
      }),
    );
    listen(
      video,
      'ended',
      current(() => {
        if (!desired) return;
        if (video.currentTime >= story.segment.endSeconds)
          finish(localizedMessage('interface:storyEndedYourExactPictureIsUnchanged'));
        else
          fail(
            localizedMessage('interface:theVideoEndedBeforeTheSelectedSegmentFinishedYourPicture'),
          );
      }),
    );
    listen(
      video,
      'error',
      current(() =>
        fail(localizedMessage('interface:videoDecodingFailedYourPictureRemainsAvailable')),
      ),
    );
    const allocatedURL = URLImpl.createObjectURL(prepared.original);
    if (disposed || signal?.aborted) {
      URLImpl.revokeObjectURL(allocatedURL);
      dispose();
      return api;
    }
    url = allocatedURL;
    media.src = url;
    armDeadline(localizedMessage('interface:videoLoadingTimedOutYourPictureRemainsAvailable'));
    media.load();
    render();
    if (audioMaster && !disposed) {
      const unsubscribe = audioMaster.subscribe(() => render());
      if (disposed) unsubscribe();
      else releaseMasterStatus = unsubscribe;
    }
    if (signal?.aborted) dispose();
  } catch {
    if (!disposed)
      fail(
        localizedMessage('interface:nativeVideoPlaybackIsUnavailableYourPictureRemainsAvailable'),
      );
  }
  return api;
}
