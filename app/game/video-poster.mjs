import { boundedJSON, exactKeys, required } from './data-json.mjs';
import { prepareStillAsset } from './media-still.mjs';
import { freezeMedia, STILL_ASSET_FORMAT, validateStillAsset } from './media-library.mjs';

// Acquisition limits, not new storage/schema limits or a promise to decode all frames.
export const VIDEO_POSTER_LIMITS = Object.freeze({
  sourceBytes: 64 * 1024 * 1024,
  durationSeconds: 120,
  width: 1920,
  height: 1080,
  timeoutMs: 15000,
});
const blobSize = Object.getOwnPropertyDescriptor(Blob.prototype, 'size').get;
const cancelError = () => new DOMException('Video poster operation cancelled.', 'AbortError');
const fail = (message) => new TypeError(message);
const sha = async (bytes) =>
  Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256', bytes)), (n) =>
    n.toString(16).padStart(2, '0'),
  ).join('');

function ownVideo(source) {
  let size;
  try {
    size = blobSize.call(source);
  } catch {
    throw fail('Video inspection requires a local Blob or File.');
  }
  required(
    size > 0 && size <= VIDEO_POSTER_LIMITS.sourceBytes,
    'Video exceeds the 64 MiB source budget.',
  );
  return Blob.prototype.slice.call(source, 0, size);
}

function vint(bytes, offset, keepMarker = false) {
  let length = 1,
    mask = 128;
  while (length <= 8 && !(bytes[offset] & mask)) {
    length++;
    mask >>= 1;
  }
  required(length <= 8 && offset + length <= bytes.length, 'Invalid WebM header.');
  let value = keepMarker ? bytes[offset] : bytes[offset] & (mask - 1);
  for (let i = 1; i < length; i++) value = value * 256 + bytes[offset + i];
  required(Number.isSafeInteger(value), 'WebM header length exceeds its bounded parser.');
  return { value, next: offset + length };
}

// Recognize a bounded local container header. The browser still has to decode it.
export function inspectVideoContainerBytes(bytes) {
  const ascii = (a, b) => String.fromCharCode(...bytes.subarray(a, b));
  if (bytes.length >= 16 && ascii(4, 8) === 'ftyp') {
    const size = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength).getUint32(0);
    required(
      size >= 16 && size <= bytes.length && size % 4 === 0,
      'Unsupported or truncated MP4 ftyp header.',
    );
    const brands = [ascii(8, 12)];
    for (let i = 16; i < size; i += 4) brands.push(ascii(i, i + 4));
    required(
      brands.some((v) => ['isom', 'iso2', 'mp41', 'mp42', 'avc1', 'M4V '].includes(v)),
      'Unsupported MP4 video brand.',
    );
    return 'video/mp4';
  }
  if (bytes[0] === 0x1a && bytes[1] === 0x45 && bytes[2] === 0xdf && bytes[3] === 0xa3) {
    const header = vint(bytes, 4),
      end = header.next + header.value;
    required(end <= bytes.length, 'Truncated or oversized WebM header.');
    let offset = header.next,
      webm = false;
    while (offset < end) {
      const id = vint(bytes, offset, true),
        size = vint(bytes, id.next);
      offset = size.next + size.value;
      required(offset <= end, 'Invalid WebM header field.');
      if (id.value === 0x4282) {
        required(
          !webm && ascii(size.next, offset) === 'webm',
          'Only WebM video is supported in EBML.',
        );
        webm = true;
      }
    }
    required(webm, 'WebM DocType is missing.');
    return 'video/webm';
  }
  throw fail('Unsupported video container. Select a browser-decodable MP4 or WebM file.');
}

export function inspectVideoMetadata(video) {
  const width = video.videoWidth,
    height = video.videoHeight,
    durationSeconds = video.duration;
  required(
    Number.isInteger(width) &&
      width > 0 &&
      width <= VIDEO_POSTER_LIMITS.width &&
      Number.isInteger(height) &&
      height > 0 &&
      height <= VIDEO_POSTER_LIMITS.height,
    'Video must have a picture no larger than 1920 × 1080; audio-only sources are unsupported.',
  );
  required(
    Number.isFinite(durationSeconds) &&
      durationSeconds > 0 &&
      durationSeconds <= VIDEO_POSTER_LIMITS.durationSeconds,
    'Video needs a finite duration of at most 120 seconds; select a shorter source deliberately.',
  );
  return { width, height, durationSeconds };
}

function seekRanges(video, duration) {
  const ranges = video.seekable,
    result = [];
  required(
    ranges && Number.isInteger(ranges.length) && ranges.length <= 64,
    'Invalid video seek ranges.',
  );
  for (let i = 0; i < ranges.length; i++) {
    const start = ranges.start(i),
      end = ranges.end(i);
    required(
      Number.isFinite(start) &&
        Number.isFinite(end) &&
        start >= 0 &&
        end >= start &&
        end <= duration,
      'Invalid video seek range.',
    );
    result.push({ start, end });
  }
  return result;
}

function operation(signal, timeoutMs, timers, work) {
  const controller = new AbortController(),
    cleanups = [];
  let ended = false,
    failure,
    rejectCancelled;
  const cancelled = new Promise((_, reject) => {
    rejectCancelled = reject;
  });
  const cancel = (error = cancelError()) => {
    if (ended || failure) return;
    failure = error;
    controller.abort();
    rejectCancelled(error);
  };
  const external = () => cancel();
  const scope = {
    signal: controller.signal,
    guard() {
      if (failure || ended) throw failure || cancelError();
    },
    use(fn) {
      cleanups.push(fn);
    },
    fail: cancel,
    listen(target, name, fn) {
      const guarded = (...args) => {
        if (!ended && !failure) {
          try {
            fn(...args);
          } catch (error) {
            cancel(error);
          }
        }
      };
      target.addEventListener(name, guarded);
      cleanups.push(() => target.removeEventListener(name, guarded));
    },
  };
  const timer = timers.setTimeout(
    () => cancel(new DOMException('Video inspection or poster capture timed out.', 'TimeoutError')),
    timeoutMs,
  );
  signal?.addEventListener('abort', external, { once: true });
  if (signal?.aborted) cancel();
  const promise = Promise.race([
    Promise.resolve().then(() => {
      scope.guard();
      return work(scope);
    }),
    cancelled,
  ]).finally(() => {
    ended = true;
    controller.abort();
    timers.clearTimeout(timer);
    signal?.removeEventListener('abort', external);
    for (const cleanup of cleanups.reverse()) {
      try {
        cleanup();
      } catch {
        /* Release all remaining owned resources. */
      }
    }
  });
  return { promise, cancel };
}

function waitFor(scope, video, events, ready) {
  return new Promise((resolve) => {
    let done = false;
    const check = () => {
      if (!done) {
        const value = ready();
        if (value) {
          done = true;
          resolve(value);
        }
      }
    };
    events.forEach((event) => scope.listen(video, event, check));
    check();
  });
}

function createMedia(scope, blob, env, beforeLoad = () => {}) {
  scope.guard();
  const video = env.createVideo();
  required(
    video && typeof video.addEventListener === 'function',
    'Browser video decoding is unavailable.',
  );
  // No play() call is permitted anywhere in this acquisition adapter.
  video.muted = true;
  video.defaultMuted = true;
  video.volume = 0;
  video.autoplay = false;
  video.loop = false;
  video.controls = false;
  video.playsInline = true;
  video.preload = 'auto';
  video.pause();
  scope.use(() => video.load());
  scope.use(() => video.removeAttribute('src'));
  scope.use(() => video.pause());
  const url = env.URLImpl.createObjectURL(blob);
  scope.use(() => env.URLImpl.revokeObjectURL(url));
  scope.listen(video, 'error', () =>
    scope.fail(fail('Browser could not decode this video container or codec.')),
  );
  const ready = waitFor(scope, video, ['loadedmetadata', 'loadeddata', 'durationchange'], () =>
    video.readyState >= 1 ? inspectVideoMetadata(video) : null,
  );
  beforeLoad(video);
  scope.guard();
  video.src = url;
  video.load();
  return { video, ready };
}

function canvasFrame(scope, video, env, inspected) {
  const facts = inspectVideoMetadata(video);
  required(
    Object.keys(facts).every((key) => facts[key] === inspected[key]),
    'Video metadata changed before poster capture.',
  );
  const { width, height } = facts,
    canvas = env.createCanvas();
  required(canvas && typeof canvas.getContext === 'function', 'Canvas capture is unavailable.');
  scope.use(() => {
    canvas.width = 0;
    canvas.height = 0;
  });
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext('2d');
  required(context, 'Canvas 2D capture is unavailable.');
  context.imageSmoothingEnabled = false;
  context.drawImage(video, 0, 0, width, height);
  return canvas;
}

function observeFrame(scope, video, requestedTime, env, inspected) {
  let targetSet = false,
    finished = false,
    handle,
    fallbackHandle,
    epoch = 0;
  let resolve;
  const promise = new Promise((r) => {
    resolve = r;
  });
  const hasFrameCallback =
    typeof video.requestVideoFrameCallback === 'function' &&
    typeof video.cancelVideoFrameCallback === 'function';
  const capture = (metadata) => {
    if (
      finished ||
      video.seeking ||
      video.readyState < 2 ||
      (!targetSet && video.currentTime !== requestedTime)
    )
      return false;
    scope.guard();
    const playheadTime = video.currentTime;
    required(
      Number.isFinite(playheadTime) && playheadTime >= 0 && playheadTime <= video.duration,
      'Invalid decoded video playhead.',
    );
    let observedMediaTime = null,
      decodedFrame = null;
    const hasPresentedFrame = hasFrameCallback && metadata != null;
    if (hasPresentedFrame) {
      observedMediaTime = metadata?.mediaTime;
      required(
        Number.isFinite(observedMediaTime) &&
          observedMediaTime >= 0 &&
          observedMediaTime <= video.duration,
        'Video callback did not report a valid presented-frame timestamp.',
      );
      required(
        Number.isInteger(metadata.width) &&
          metadata.width > 0 &&
          Number.isInteger(metadata.height) &&
          metadata.height > 0,
        'Video callback did not report decoded frame dimensions.',
      );
      decodedFrame = { width: metadata.width, height: metadata.height };
    }
    // Snapshot pixels during the frame callback, not later when toBlob resolves.
    const canvas = canvasFrame(scope, video, env, inspected);
    finished = true;
    resolve({
      canvas,
      playheadTime,
      observedMediaTime,
      decodedFrame,
      timingEvidence: hasPresentedFrame ? 'presented-frame' : 'playhead-estimate',
    });
    return true;
  };
  const requestFrame = () => {
    const requestedEpoch = epoch;
    const frame = (_now, metadata) => {
      if (requestedEpoch !== epoch || finished) return;
      try {
        scope.guard();
        if (!capture(metadata)) requestFrame();
      } catch (error) {
        scope.fail(error);
      }
    };
    handle = video.requestVideoFrameCallback(frame);
  };
  if (hasFrameCallback) {
    requestFrame();
    scope.use(() => video.cancelVideoFrameCallback(handle));
    const fallback = () => {
      const firedHandle = fallbackHandle;
      fallbackHandle = undefined;
      if (firedHandle !== undefined) env.timers.clearTimeout(firedHandle);
      try {
        if (!capture(null) && !finished) scheduleFallback();
      } catch (error) {
        scope.fail(error);
      }
    };
    const scheduleFallback = () => {
      if (finished || fallbackHandle !== undefined) return;
      fallbackHandle = env.timers.setTimeout(fallback, 250);
    };
    for (const name of ['loadeddata', 'seeked', 'canplay'])
      scope.listen(video, name, scheduleFallback);
    scope.use(() => {
      if (fallbackHandle !== undefined) env.timers.clearTimeout(fallbackHandle);
    });
  } else {
    for (const name of ['loadeddata', 'seeked', 'canplay'])
      scope.listen(video, name, () => capture(null));
  }
  return {
    promise,
    beginSeek() {
      targetSet = true;
      if (hasFrameCallback) {
        // A compositor callback queued for the initial frame can outlive cancel.
        // Bind the requested seek to a new registration as well as a new epoch.
        epoch++;
        video.cancelVideoFrameCallback(handle);
        requestFrame();
      }
    },
    selectTarget() {
      targetSet = true;
      if (!hasFrameCallback) capture(null);
    },
  };
}

async function encode(scope, canvas, metadata, decodeImage) {
  const png = await new Promise((resolve, reject) => {
    try {
      canvas.toBlob(
        (blob) => (blob ? resolve(blob) : reject(fail('Canvas could not export a PNG poster.'))),
        'image/png',
      );
    } catch (error) {
      reject(error);
    }
  });
  scope.guard();
  const prepared = await prepareStillAsset(png, metadata, {
    signal: scope.signal,
    ...(decodeImage ? { decodeImage } : {}),
  });
  scope.guard();
  required(
    prepared.asset.mime === 'image/png' &&
      prepared.asset.width === canvas.width &&
      prepared.asset.height === canvas.height,
    'Canvas PNG does not match the complete captured video picture.',
  );
  return prepared;
}

/** Local acquisition only. No storage, presentation assignment, reward or story schema.
 * Browser factories are trusted host capabilities, never uploaded JSON.
 */
export async function openVideoPosterSource(
  source,
  {
    signal,
    createVideo = () => globalThis.document?.createElement('video'),
    createCanvas = () => globalThis.document?.createElement('canvas'),
    URLImpl = globalThis.URL,
    decodeImage,
    timeoutMs = VIDEO_POSTER_LIMITS.timeoutMs,
    timers = globalThis,
  } = {},
) {
  required(
    Number.isFinite(timeoutMs) && timeoutMs > 0 && timeoutMs <= 60000,
    'Invalid video operation timeout.',
  );
  required(
    typeof createVideo === 'function' &&
      typeof createCanvas === 'function' &&
      typeof URLImpl?.createObjectURL === 'function' &&
      typeof URLImpl?.revokeObjectURL === 'function',
    'Browser video capture is unavailable.',
  );
  const raw = ownVideo(source),
    env = { createVideo, createCanvas, URLImpl, timers };
  const result = await operation(signal, timeoutMs, timers, async (scope) => {
    const prefix = new Uint8Array(await Blob.prototype.slice.call(raw, 0, 65536).arrayBuffer());
    scope.guard();
    const mime = inspectVideoContainerBytes(prefix),
      original = Blob.prototype.slice.call(raw, 0, raw.size, mime);
    const { ready } = createMedia(scope, original, env);
    const facts = await ready;
    scope.guard();
    const sha256 = await sha(await original.arrayBuffer());
    scope.guard();
    return { original, info: freezeMedia({ ...facts, mime, bytes: original.size, sha256 }) };
  }).promise;
  let disposed = false,
    active = null;
  return Object.freeze({
    original: result.original,
    info: result.info,
    async capture(requestedTime, metadata, { signal: captureSignal } = {}) {
      required(!disposed, 'Video poster source has been disposed.');
      required(
        typeof requestedTime === 'number' &&
          Number.isFinite(requestedTime) &&
          requestedTime >= 0 &&
          requestedTime <= result.info.durationSeconds,
        'Poster time must be within the inspected video duration; it is never truncated.',
      );
      const ownedMetadata = boundedJSON(metadata, { maxBytes: 8192, maxString: 2048 });
      exactKeys(ownedMetadata, ['id', 'provenance'], 'poster metadata');
      validateStillAsset({
        ...ownedMetadata,
        format: STILL_ASSET_FORMAT,
        sha256: '0'.repeat(64),
        bytes: 1,
        mime: 'image/png',
        width: 1,
        height: 1,
      });
      active?.cancel();
      const current = operation(captureSignal, timeoutMs, timers, async (scope) => {
        let frames;
        const { video, ready } = createMedia(scope, result.original, env, (v) => {
          frames = observeFrame(scope, v, requestedTime, env, result.info);
        });
        const facts = await ready;
        scope.guard();
        required(
          Object.keys(facts).every((key) => facts[key] === result.info[key]),
          'Video metadata changed since inspection.',
        );
        const ranges = await waitFor(
          scope,
          video,
          ['loadeddata', 'canplay', 'progress', 'durationchange'],
          () => {
            const values = seekRanges(video, facts.durationSeconds);
            return values.length ? values : null;
          },
        );
        scope.guard();
        required(
          ranges.some(({ start, end }) => requestedTime >= start && requestedTime <= end),
          'Requested poster time is outside the available seek ranges.',
        );
        if (video.currentTime !== requestedTime) {
          let commanded = false;
          const seeked = waitFor(scope, video, ['seeked'], () => commanded && !video.seeking);
          frames.beginSeek();
          commanded = true;
          video.currentTime = requestedTime;
          await seeked;
          scope.guard();
        }
        frames.selectTarget();
        const frame = await frames.promise;
        scope.guard();
        const prepared = await encode(scope, frame.canvas, ownedMetadata, decodeImage);
        scope.guard();
        return Object.freeze({
          ...prepared,
          capture: freezeMedia({
            sourceSha256: result.info.sha256,
            requestedTime,
            observedMediaTime: frame.observedMediaTime,
            playheadTime: frame.playheadTime,
            timingEvidence: frame.timingEvidence,
            decodedFrame: frame.decodedFrame,
            width: prepared.asset.width,
            height: prepared.asset.height,
            mime: 'image/png',
            sha256: prepared.asset.sha256,
          }),
        });
      });
      active = current;
      try {
        return await current.promise;
      } finally {
        if (active === current) active = null;
      }
    },
    dispose() {
      if (disposed) return;
      disposed = true;
      active?.cancel();
      active = null;
    },
  });
}
