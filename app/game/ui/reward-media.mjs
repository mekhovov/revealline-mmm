import { required } from '../data-json.mjs';
import { t } from '../i18n/index.mjs';
import { validateCompletionRewardPayload } from '../rewards/model.mjs';
import { resolveRewardAsset } from '../rewards/media.mjs';
import { inspectRewardMediaBytes, REWARD_MEDIA_LIMITS } from '../rewards/media-format.mjs';
import { verifyEditionAssets } from '../editions/assets.mjs';
import { inspectVideoMetadata } from '../video-poster.mjs';
import { bindAudioMasterMedia } from './audio-master.mjs';

const foregroundOwners = new WeakMap();

/** Native, exact-local reward playback. The host supplies the existing audio
 * master and soundtrack gain leases; this viewer owns no listening preference,
 * progress store, external embed, or autoplay policy. */
export function mountRewardMedia({
  container,
  payload: input,
  provider,
  locale = 'en',
  audioMaster,
  musicDucker,
  document = container.ownerDocument,
  window = globalThis.window,
  signal,
  fetcher = globalThis.fetch,
  URLImpl = globalThis.URL,
  timeoutMs = 20000,
  createMedia = (type) => document.createElement(type),
  readLocalAsset,
  cinematic = false,
  reducedMotion = false,
  onEnded = () => {},
}) {
  const payload = validateCompletionRewardPayload(input);
  required(['audio', 'video'].includes(payload.type), 'Reward media requires audio or video.');
  required(['en', 'uk'].includes(locale), 'Reward media requires a supported locale.');
  required(
    Number.isFinite(timeoutMs) && timeoutMs > 0 && timeoutMs <= 20000,
    'Invalid reward media loading budget.',
  );
  const tr = (key) => t(`interface:rewardMedia.${key}`, { lng: locale }),
    node = (tag, text) => {
      const value = document.createElement(tag);
      if (text !== undefined) value.textContent = text;
      return value;
    },
    root = node('section'),
    status = node('p'),
    transcript = node('details'),
    transcriptText = node('p', tr('loadingTranscript')),
    controls = node('div'),
    play = node('button', tr('play')),
    pauseButton = node('button', tr('pause')),
    poster = payload.type === 'video' ? node('img') : null,
    controller = new AbortController(),
    urls = new Set(),
    listeners = [],
    mediaListeners = [],
    mediaURLs = new Set();
  root.setAttribute('data-reward-media', payload.type);
  if (cinematic) root.classList.add('reward-media-cinematic');
  status.setAttribute('role', 'status');
  transcript.append(node('summary', tr('transcript')), transcriptText);
  transcriptText.style.whiteSpace = 'pre-wrap';
  play.type = pauseButton.type = 'button';
  play.setAttribute('data-reward-media-action', 'play');
  pauseButton.setAttribute('data-reward-media-action', 'pause');
  controls.append(play, pauseButton);
  if (poster) {
    poster.alt = payload.locales[locale].title;
    poster.style.width = '100%';
    poster.style.maxHeight = cinematic ? '100%' : '50vh';
    poster.style.objectFit = 'contain';
    poster.hidden = true;
    root.append(poster);
  }
  root.append(controls, status, transcript);
  container.append(root);
  let disposed = false,
    desired = false,
    media = null,
    binding = null,
    releaseGain = null,
    preparation = null,
    prepared = false,
    sourceURL = null,
    captionsEnd = 0,
    blurred = false,
    posterReady = payload.type === 'audio',
    silentPlayback = false;
  const alive = () => !disposed && !controller.signal.aborted;
  const available = () =>
    alive() && !blurred && document.visibilityState !== 'hidden' && document.hidden !== true;
  const listen = (target, event, fn) => {
    target?.addEventListener(event, fn);
    listeners.push(() => target?.removeEventListener(event, fn));
  };
  const listenMedia = (target, event, fn) => {
    target.addEventListener(event, fn);
    mediaListeners.push(() => target.removeEventListener(event, fn));
  };
  const objectURL = (blob) => {
    const url = URLImpl.createObjectURL(blob);
    urls.add(url);
    return url;
  };
  const revoke = (url) => {
    if (urls.delete(url)) URLImpl.revokeObjectURL(url);
  };
  function clearMedia() {
    mediaListeners.splice(0).forEach((remove) => remove());
    binding?.dispose();
    binding = null;
    if (media) {
      media.pause();
      media.removeAttribute('src');
      media.replaceChildren();
      media.load();
      media.remove();
      media = null;
    }
    if (sourceURL) revoke(sourceURL);
    sourceURL = null;
    mediaURLs.forEach(revoke);
    mediaURLs.clear();
  }
  function pause() {
    desired = false;
    silentPlayback = false;
    binding?.setLocal({ muted: true });
    media?.pause();
    releaseGain?.();
    releaseGain = null;
    if (audioMaster && foregroundOwners.get(audioMaster) === owner)
      foregroundOwners.delete(audioMaster);
    if (alive()) status.textContent = tr('paused');
  }
  const owner = { pause };
  function claim({ muted = silentPlayback } = {}) {
    if (!available() || !desired) {
      pause();
      return false;
    }
    const previous = foregroundOwners.get(audioMaster);
    if (previous !== owner) previous?.pause();
    foregroundOwners.set(audioMaster, owner);
    if (muted) {
      releaseGain?.();
      releaseGain = null;
    } else releaseGain ??= musicDucker.acquire(0);
    binding.setLocal({ muted });
    return true;
  }
  async function acquire(reference, role) {
    const deadline = new AbortController();
    const abort = () => deadline.abort(controller.signal.reason);
    controller.signal.addEventListener('abort', abort, { once: true });
    if (controller.signal.aborted) abort();
    let timer;
    const stopped = new Promise((_, reject) => {
      deadline.signal.addEventListener(
        'abort',
        () => reject(new DOMException('Reward media loading cancelled.', 'AbortError')),
        { once: true },
      );
      if (deadline.signal.aborted)
        reject(new DOMException('Reward media loading cancelled.', 'AbortError'));
      timer = setTimeout(() => deadline.abort(), timeoutMs);
    });
    try {
      return await Promise.race([
        stopped,
        (async () => {
          if (readLocalAsset) {
            // Studio-only capability: exact authored hashes still bind user-selected
            // local originals. Production hosts use the selected edition reader.
            const { asset, bytes } = await readLocalAsset(reference, { signal: deadline.signal });
            deadline.signal.throwIfAborted();
            required(
              asset.id === reference.assetId && asset.sha256 === reference.sha256,
              'Local reward media differs from its authored reference.',
            );
            const digest = Array.from(
              new Uint8Array(await crypto.subtle.digest('SHA-256', bytes)),
              (byte) => byte.toString(16).padStart(2, '0'),
            ).join('');
            required(
              digest === reference.sha256,
              'Local reward media differs from its exact SHA-256.',
            );
            const facts = inspectRewardMediaBytes(asset, role, bytes);
            return { ...facts, blob: new Blob([bytes], { type: facts.mime }) };
          }
          const { bootstrap, asset } = await resolveRewardAsset(provider, reference, {
            fetcher,
            signal: deadline.signal,
            timeoutMs,
          });
          let result;
          await verifyEditionAssets(bootstrap, {
            baseURL: provider.rootURL,
            fetcher,
            signal: deadline.signal,
            ids: [asset.id],
            onVerifiedAsset({ asset: verified, bytes }) {
              if (verified.id !== asset.id) return;
              const facts = inspectRewardMediaBytes(verified, role, bytes);
              // Keep the verified bytes for the primary path, while retaining the
              // original same-origin URL for browsers whose native decoder cannot
              // attach an MP4 from an in-memory Blob (notably some iOS WebKit builds).
              result = {
                ...facts,
                blob: new Blob([bytes], { type: facts.mime }),
                directURL: new URL(asset.path, provider.rootURL).href,
              };
            },
          });
          deadline.signal.throwIfAborted();
          required(result, 'Reward media is unavailable.');
          return result;
        })(),
      ]);
    } finally {
      clearTimeout(timer);
      controller.signal.removeEventListener('abort', abort);
      deadline.abort();
    }
  }
  const transcriptReady = acquire(payload.transcript[locale], 'transcript')
    .then((value) => {
      if (alive()) transcriptText.textContent = value.text;
      return true;
    })
    .catch(() => {
      if (alive()) transcriptText.textContent = tr('transcriptUnavailable');
      return false;
    });
  const posterPromise = poster
    ? acquire(payload.poster, 'poster')
        .then((value) => {
          if (!alive()) return false;
          poster.src = objectURL(value.blob);
          poster.hidden = false;
          posterReady = true;
          return true;
        })
        .catch(() => {
          if (alive()) status.textContent = tr('posterUnavailable');
          return false;
        })
    : Promise.resolve(true);
  function fail() {
    prepared = false;
    pause();
    if (media) {
      media.controls = false;
      media.hidden = true;
    }
    if (poster) poster.hidden = !posterReady;
    if (alive()) status.textContent = tr('unavailable');
  }
  function metadata(element) {
    const duration =
      payload.type === 'video' ? inspectVideoMetadata(element).durationSeconds : element.duration;
    required(
      Number.isFinite(duration) && duration > 0 && duration <= REWARD_MEDIA_LIMITS.durationSeconds,
      'Reward media must have a finite duration of at most 120 seconds.',
    );
    required(captionsEnd <= duration + 0.05, 'Reward captions exceed the actual video duration.');
  }
  async function prepare() {
    required(
      audioMaster?.subscribe && audioMaster?.snapshot && typeof musicDucker?.acquire === 'function',
      'Reward playback requires the shared game audio owner.',
    );
    const [hasTranscript, hasPoster] = await Promise.all([transcriptReady, posterPromise]);
    required(
      hasTranscript && hasPoster,
      'Reward playback requires its transcript and local poster.',
    );
    const source = await acquire(payload.asset, payload.type);
    const captions =
      payload.type === 'video' ? await acquire(payload.captions[locale], 'captions') : null;
    if (!alive()) return;
    captionsEnd = captions?.endSeconds ?? 0;
    clearMedia();
    media = createMedia(payload.type);
    const currentMedia = media;
    let rejectMetadata = null,
      loadingMetadata = false;
    const failCurrent = () => {
      if (media !== currentMedia || loadingMetadata) return;
      fail();
      // A track error does not bubble to its video. Reject a pending decode
      // before clearing it so later metadata cannot revive failed captions.
      rejectMetadata?.();
      clearMedia();
    };
    media.autoplay = false;
    media.controls = false;
    media.loop = false;
    media.preload = 'metadata';
    media.muted = true;
    media.playsInline = true;
    media.setAttribute('playsinline', '');
    media.setAttribute('webkit-playsinline', '');
    media.setAttribute('aria-label', payload.locales[locale].title);
    media.style.width = '100%';
    media.style.maxHeight = cinematic ? '100%' : '60vh';
    // Keep the native element laid out behind its poster while metadata loads.
    // WebKit can refuse to decode a video kept at display:none, which made an
    // otherwise valid reward look unavailable on iPhone.
    media.hidden = false;
    binding = bindAudioMasterMedia({ audioMaster, element: media, muted: true });
    if (poster?.src) media.poster = poster.src;
    if (captions) {
      const track = node('track');
      track.kind = 'captions';
      track.srclang = locale;
      track.label = locale === 'uk' ? 'Українська' : 'English';
      track.default = true;
      track.src = objectURL(new Blob([captions.text], { type: 'text/vtt' }));
      mediaURLs.add(track.src);
      listenMedia(track, 'error', () => {
        if (!prepared) rejectMetadata?.(new Error('Reward captions are unavailable.'));
        else failCurrent();
      });
      media.append(track);
    }
    root.append(media);
    listenMedia(media, 'playing', () => {
      if (!cinematic || !desired || !available()) return;
      media.hidden = false;
      if (!reducedMotion)
        media.animate?.([{ opacity: 0 }, { opacity: 1 }], { duration: 650, easing: 'ease-out' });
    });
    listenMedia(media, 'play', () => {
      // Native controls are explicit gestures too; hidden/old owners cannot resume.
      if (!prepared || !available()) {
        pause();
        return;
      }
      desired = true;
      claim();
      status.textContent = tr(silentPlayback ? 'playingMuted' : 'playing');
    });
    listenMedia(media, 'pause', () => {
      if (desired) pause();
    });
    listenMedia(media, 'ended', () => {
      pause();
      onEnded();
    });
    listenMedia(media, 'error', failCurrent);
    listenMedia(media, 'durationchange', () => {
      if (prepared) {
        try {
          metadata(currentMedia);
        } catch {
          failCurrent();
        }
      }
    });
    const loadMetadata = (url) =>
      new Promise((resolve, reject) => {
        let timer, unavailable;
        const cleanup = () => {
          loadingMetadata = false;
          clearTimeout(timer);
          currentMedia.removeEventListener('loadedmetadata', ready);
          currentMedia.removeEventListener('error', unavailable);
          controller.signal.removeEventListener('abort', cancel);
          rejectMetadata = null;
        };
        const ready = () => {
          try {
            metadata(currentMedia);
            cleanup();
            resolve();
          } catch (reason) {
            cleanup();
            reject(reason);
          }
        };
        const error = (reason = new Error('Native media decoder is unavailable.')) => {
          cleanup();
          reject(reason);
        };
        const cancel = () => {
          cleanup();
          reject(new DOMException('Reward media cancelled.', 'AbortError'));
        };
        loadingMetadata = true;
        rejectMetadata = error;
        unavailable = () => error();
        currentMedia.addEventListener('loadedmetadata', ready);
        currentMedia.addEventListener('error', unavailable);
        controller.signal.addEventListener('abort', cancel, { once: true });
        timer = setTimeout(error, timeoutMs);
        sourceURL = url;
        media.src = sourceURL;
        media.load();
      });
    try {
      await loadMetadata(objectURL(source.blob));
    } catch (error) {
      // The exact bytes have already passed the asset verifier. Retry only videos
      // from their registered same-origin path so iPhone can use its own range
      // loader and hardware decoder without weakening the authored asset binding.
      if (
        payload.type !== 'video' ||
        !source.directURL ||
        !alive() ||
        error?.message !== 'Native media decoder is unavailable.'
      ) {
        if (media === currentMedia) clearMedia();
        throw error;
      }
      revoke(sourceURL);
      sourceURL = null;
      try {
        await loadMetadata(source.directURL);
      } catch (reason) {
        if (media === currentMedia) clearMedia();
        throw reason;
      }
    }
    if (!alive() || media !== currentMedia) return;
    prepared = true;
    media.controls = true;
    media.hidden = false;
  }
  async function start({ allowMutedFallback = false } = {}) {
    if (!available() || (desired && preparation)) return;
    desired = true;
    // Claim early so another pending reward cannot begin after this gesture.
    if (audioMaster) {
      const previous = foregroundOwners.get(audioMaster);
      if (previous !== owner) previous?.pause();
      foregroundOwners.set(audioMaster, owner);
    }
    status.textContent = tr('loading');
    try {
      if (!prepared) {
        preparation ??= prepare().finally(() => {
          preparation = null;
        });
        await preparation;
      }
      if (!desired || !available() || !prepared) return;
      silentPlayback = false;
      if (!claim()) return;
      try {
        await media.play();
      } catch (error) {
        if (!allowMutedFallback || !desired || !available() || !prepared) throw error;
        // iOS rejects audible autoplay after the asynchronous integrity and
        // decoder checks. Keep the earned recording moving, then let an
        // explicit Play gesture enable its audio through the shared master.
        silentPlayback = true;
        if (!claim({ muted: true })) return;
        await media.play();
      }
      if (!desired || !available()) {
        pause();
        return;
      }
      media.hidden = false;
      if (poster && !cinematic) poster.hidden = true;
      status.textContent = tr(silentPlayback ? 'playingMuted' : 'playing');
    } catch {
      // Browsers can require a second explicit gesture after asynchronous decode.
      pause();
      if (alive()) status.textContent = tr(prepared ? 'playAgain' : 'unavailable');
    }
  }
  listen(play, 'click', () => {
    void start();
  });
  listen(pauseButton, 'click', pause);
  listen(window, 'blur', () => {
    blurred = true;
    pause();
  });
  listen(window, 'focus', () => {
    blurred = false;
  });
  listen(document, 'visibilitychange', () => {
    if (!available()) pause();
  });
  listen(window, 'gamepaddisconnected', pause);
  listen(window, 'pagehide', dispose);
  listen(signal, 'abort', dispose);
  function dispose() {
    if (disposed) return;
    pause();
    disposed = true;
    controller.abort();
    listeners.splice(0).forEach((remove) => remove());
    clearMedia();
    urls.forEach((url) => URLImpl.revokeObjectURL(url));
    urls.clear();
    root.remove();
  }
  if (signal?.aborted) dispose();
  return Object.freeze({ start, pause, dispose });
}
