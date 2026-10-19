import { inspectMP3, ownSoundtrackBlob, throwIfSoundtrackAborted } from './mp3-inspection.mjs';
export { inspectMP3, ownSoundtrackBlob, throwIfSoundtrackAborted } from './mp3-inspection.mjs';
import { boundedJSON, exactKeys, required } from './data-json.mjs';
import {
  AUDIO_TRACK_FORMAT,
  SOUNDTRACK_LIMITS,
  resolveAudioTrack,
  freezeSoundtrack,
} from './soundtrack.mjs';

/** Loads metadata and first decoded audio data without playing or allocating a PCM album. */
export function probeMP3Media(
  source,
  {
    signal,
    createMedia = () => globalThis.document?.createElement('audio'),
    URLImpl = globalThis.URL,
    timeoutMs = 30000,
  } = {},
) {
  throwIfSoundtrackAborted(signal);
  const blob = ownSoundtrackBlob(source);
  required(
    Number.isInteger(timeoutMs) && timeoutMs >= 1 && timeoutMs <= 60000,
    'Invalid audio probe timeout.',
  );
  const media = createMedia();
  required(
    media &&
      typeof media.addEventListener === 'function' &&
      typeof media.load === 'function' &&
      typeof media.canPlayType === 'function',
    'This environment needs an audio media probe.',
  );
  required(media.canPlayType('audio/mpeg') !== '', 'This browser does not support MPEG audio.');
  return new Promise((resolve, reject) => {
    let url = null,
      timer = null,
      settled = false;
    const listeners = [];
    const on = (type, fn) => {
      media.addEventListener(type, fn);
      listeners.push([type, fn]);
    };
    const finish = (error, value) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      signal?.removeEventListener('abort', cancel);
      for (const [type, fn] of listeners) media.removeEventListener(type, fn);
      try {
        media.pause();
        media.removeAttribute('src');
        media.load();
      } catch {}
      try {
        if (url !== null) URLImpl.revokeObjectURL(url);
      } catch {}
      if (error) reject(error);
      else resolve(value);
    };
    const cancel = () => finish(new DOMException('Audio probe cancelled.', 'AbortError'));
    const check = () => {
      if (media.readyState < 2) return;
      if (
        !Number.isFinite(media.duration) ||
        media.duration <= 0 ||
        media.duration > SOUNDTRACK_LIMITS.durationSeconds
      )
        finish(new TypeError('Decoded MP3 duration must be finite and at most 12 minutes.'));
      else finish(null, Object.freeze({ durationSeconds: media.duration }));
    };
    on('loadedmetadata', check);
    on('loadeddata', check);
    on('error', () => finish(new TypeError('This browser could not decode the MP3.')));
    signal?.addEventListener('abort', cancel, { once: true });
    timer = setTimeout(() => finish(new Error('Audio validation timed out.')), timeoutMs);
    try {
      url = URLImpl.createObjectURL(blob);
      media.preload = 'auto';
      media.src = url;
      media.load();
      if (signal?.aborted) cancel();
      else check();
    } catch (error) {
      finish(error);
    }
  });
}
export async function verifyMP3Media(source, asset, { probeMedia = probeMP3Media, signal } = {}) {
  required(typeof probeMedia === 'function', 'An actual-import media probe is required.');
  throwIfSoundtrackAborted(signal);
  const result = await probeMedia(ownSoundtrackBlob(source), { signal });
  throwIfSoundtrackAborted(signal);
  const info = boundedJSON(result, { maxBytes: 1024, maxNodes: 8, maxDepth: 2, maxString: 80 });
  exactKeys(info, ['durationSeconds'], 'media probe');
  required(
    Number.isFinite(info.durationSeconds) &&
      info.durationSeconds > 0 &&
      info.durationSeconds <= 720 &&
      Math.abs(info.durationSeconds - asset.durationSeconds) <=
        Math.max(0.5, asset.durationSeconds * 0.01),
    'Media probe duration does not match the MP3 frames.',
  );
  return Object.freeze(info);
}
export async function prepareMP3Import(
  source,
  metadata,
  { probeMedia = probeMP3Media, signal } = {},
) {
  const fields = boundedJSON(metadata, {
    maxBytes: 4096,
    maxNodes: 30,
    maxDepth: 3,
    maxString: 1024,
  });
  exactKeys(
    fields,
    ['id', 'title', 'artist', 'rights', ...(Object.hasOwn(fields, 'fileName') ? ['fileName'] : [])],
    'MP3 metadata',
  );
  const blob = ownSoundtrackBlob(source),
    asset = await inspectMP3(blob, { signal });
  const track = resolveAudioTrack({ format: AUDIO_TRACK_FORMAT, kind: 'mp3', ...fields, asset });
  const media = await verifyMP3Media(blob, asset, { probeMedia, signal });
  return Object.freeze({ track, blob, media });
}
