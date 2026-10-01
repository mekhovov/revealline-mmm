import { boundedJSON, exactKeys, required } from './data-json.mjs';
import {
  AUDIO_TRACK_FORMAT,
  SOUNDTRACK_LIMITS,
  resolveAudioTrack,
  freezeSoundtrack,
} from './soundtrack.mjs';

const sizeGetter = Object.getOwnPropertyDescriptor(Blob.prototype, 'size').get;
export function throwIfSoundtrackAborted(signal) {
  if (signal?.aborted) throw new DOMException('Soundtrack operation cancelled.', 'AbortError');
}
/** Native Blob/File brand check and immutable ownership, without caller getters. */
export function ownSoundtrackBlob(source, maxBytes = SOUNDTRACK_LIMITS.trackBytes) {
  let size;
  try {
    size = sizeGetter.call(source);
  } catch {
    throw new TypeError('Audio import requires a Blob or File.');
  }
  required(
    Number.isSafeInteger(size) && size > 0 && size <= maxBytes,
    'Binary media exceeds its byte budget.',
  );
  return Blob.prototype.slice.call(source, 0, size, 'audio/mpeg');
}
const begins = (bytes, at, word) => [...word].every((c, i) => bytes[at + i] === c.charCodeAt(0));
function inspectFrames(bytes) {
  let offset = 0,
    end = bytes.length;
  if (begins(bytes, 0, 'ID3')) {
    required(
      bytes.length >= 10 && [2, 3, 4].includes(bytes[3]) && bytes[4] !== 255,
      'Unsupported ID3 header.',
    );
    const allowed = bytes[3] === 2 ? 0xc0 : bytes[3] === 3 ? 0xe0 : 0xf0;
    required((bytes[5] & ~allowed) === 0, 'Invalid ID3 flags.');
    required(
      (bytes[5] & 0x10) === 0,
      'ID3 footer-tagged files need a supported MP3 delivery copy.',
    );
    let size = 0;
    for (let i = 6; i < 10; i++) {
      required(bytes[i] < 128, 'Invalid ID3 synchsafe size.');
      size = size * 128 + bytes[i];
    }
    required(
      size <= 1024 * 1024 && size + 10 <= end,
      'ID3 tag exceeds its 1 MiB budget or is truncated.',
    );
    offset = size + 10;
  }
  if (end - offset >= 128 && begins(bytes, end - 128, 'TAG')) end -= 128;
  const bitrate1 = [0, 32, 40, 48, 56, 64, 80, 96, 112, 128, 160, 192, 224, 256, 320];
  const bitrateLow = [0, 8, 16, 24, 32, 40, 48, 56, 64, 80, 96, 112, 128, 144, 160];
  let frames = 0,
    first = null;
  while (offset < end) {
    required(offset + 4 <= end, 'Truncated MP3 frame header.');
    const b = bytes[offset + 1],
      c = bytes[offset + 2],
      d = bytes[offset + 3];
    const version = (b >> 3) & 3,
      layer = (b >> 1) & 3,
      rateIndex = (c >> 2) & 3,
      bitrateIndex = c >> 4;
    required(
      bytes[offset] === 255 &&
        (b & 0xe0) === 0xe0 &&
        version !== 1 &&
        layer === 1 &&
        rateIndex !== 3 &&
        bitrateIndex > 0 &&
        bitrateIndex < 15 &&
        (d & 3) !== 2,
      'Unsupported or malformed MPEG Layer III frame.',
    );
    const mpegVersion = version === 3 ? '1' : version === 2 ? '2' : '2.5';
    const sampleRate =
        [44100, 48000, 32000][rateIndex] / (version === 3 ? 1 : version === 2 ? 2 : 4),
      channels = d >> 6 === 3 ? 1 : 2;
    const bitrate = (version === 3 ? bitrate1 : bitrateLow)[bitrateIndex];
    const frameBytes =
      Math.floor(((version === 3 ? 144000 : 72000) * bitrate) / sampleRate) + ((c >> 1) & 1);
    const minimum =
      4 + (b & 1 ? 0 : 2) + (version === 3 ? (channels === 1 ? 17 : 32) : channels === 1 ? 9 : 17);
    required(frameBytes >= minimum && offset + frameBytes <= end, 'Truncated MP3 frame.');
    if (first)
      required(
        first.mpegVersion === mpegVersion &&
          first.sampleRate === sampleRate &&
          first.channels === channels,
        'Changing MP3 sample format is unsupported.',
      );
    else first = { mpegVersion, sampleRate, channels };
    frames++;
    required(
      frames <= 60000 &&
        (frames * (version === 3 ? 1152 : 576)) / sampleRate <= SOUNDTRACK_LIMITS.durationSeconds,
      'MP3 exceeds 12 minutes.',
    );
    offset += frameBytes;
  }
  required(
    first && frames >= 2 && offset === end,
    'MP3 requires at least two complete audio frames.',
  );
  return {
    ...first,
    frames,
    durationSeconds: (frames * (first.mpegVersion === '1' ? 1152 : 576)) / first.sampleRate,
  };
}
/** Structural media check only; payload decodability is a separate browser probe. */
export async function inspectMP3(source, { signal } = {}) {
  throwIfSoundtrackAborted(signal);
  const blob = ownSoundtrackBlob(source);
  const bytes = new Uint8Array(await blob.arrayBuffer());
  throwIfSoundtrackAborted(signal);
  const facts = inspectFrames(bytes);
  required(globalThis.crypto?.subtle, 'MP3 validation requires SHA-256 support.');
  const hash = new Uint8Array(await crypto.subtle.digest('SHA-256', bytes));
  throwIfSoundtrackAborted(signal);
  return freezeSoundtrack({
    sha256: [...hash].map((n) => n.toString(16).padStart(2, '0')).join(''),
    bytes: bytes.length,
    mime: 'audio/mpeg',
    ...facts,
  });
}
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
