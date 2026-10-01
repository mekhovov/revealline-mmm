import { canonicalJSON } from '../data-json.mjs';
import { campaignKey } from '../library.mjs';
import { createExecutionCatalog } from '../campaign-contexts.mjs';
import { createPresentationPins, snapshotPictureChoice } from '../presentation-pins.mjs';
import { createPictureIdentityCatalog } from './picture-identity.mjs';
import { resolveEarnedPicture } from './earned-picture.mjs';
import { acquirePresentationImage } from './presentation-image.mjs';
import { analogSignalSeed, applyAnalogSignalNoise } from './analog-signal.mjs';

const DEMO_NOISE_STRENGTH = 0.68;

const abort = (signal) => {
  if (signal?.aborted) throw new DOMException('Demo picture preparation cancelled.', 'AbortError');
};

/** Resolve the actually displayed picture against earned originals. A clear
 * level is not proof that a different world or a later art assignment is earned.
 * No profile, receipt, assignment or storage write is made here. */
export async function resolveDemoPicture({
  entry,
  level,
  theme,
  library,
  entries = [entry],
  readMedia,
  currentPin,
  signal,
  acquire,
} = {}) {
  let backdrop = null;
  const result = (pictureVisibility = 'blurred', artSeed = null, previewAvailable = false) => {
    let disposed = false;
    return Object.freeze({
      pictureVisibility,
      previewAvailable,
      backdrop,
      artSeed,
      dispose() {
        if (disposed) return;
        disposed = true;
        backdrop?.release?.();
      },
    });
  };
  try {
    abort(signal);
    const executionKey = campaignKey(entry.campaign);
    const baseKey = campaignKey(entry.baseCampaign ?? entry.campaign);
    const owner = entries.find(
      (item) => campaignKey(item.baseCampaign ?? item.campaign) === baseKey,
    );
    if (!owner) return result();
    const executionEntries = createExecutionCatalog([
      { ...owner, campaign: owner.baseCampaign ?? owner.campaign },
    ]).entries;
    const identityCatalog = createPictureIdentityCatalog({ entries: executionEntries });
    const request = {
      executionKey,
      levelId: level.id,
      levelRevision: level.revision,
      themeId: theme.id,
    };
    const identity = identityCatalog.resolve(request);
    if (!identity) return result();
    const media = readMedia ? await readMedia({ signal }) : null;
    abort(signal);
    let pin = currentPin
      ? snapshotPictureChoice(currentPin)
      : media
        ? createPresentationPins({
            library: media.metadata.document.library,
            identityCatalog,
            ...request,
            themeIds: [theme.id],
          }).choices[0]
        : snapshotPictureChoice({ kind: 'legacy', identity });
    if (canonicalJSON(pin.identity) !== canonicalJSON(identity)) return result();
    // Release defaults retain immutable originals without persisting a new
    // assignment. In that case the exact earned original can own this scene;
    // an explicit current choice still needs its own matching earned receipt.
    const useEarnedOriginal = !currentPin && pin.kind === 'legacy';
    let earnedPicture = false,
      artSeed = null;
    for (const item of library?.gallery ?? []) {
      if (item.levelId !== level.id || item.themeId !== theme.id) continue;
      try {
        const receipt = library.pictureReceipts?.find((value) => value.galleryKey === item.key);
        const earned = resolveEarnedPicture({
          item,
          receipt,
          entries: executionEntries,
          metadata: media?.metadata,
        });
        if (!earned) continue;
        const earnedIdentity = identityCatalog.resolve({
          executionKey: item.campaignKey,
          levelId: item.levelId,
          levelRevision: item.levelRevision,
          themeId: item.themeId,
        });
        if (!earnedIdentity || canonicalJSON(earnedIdentity) !== canonicalJSON(identity)) continue;
        const earnedPin = earned.receipt?.presentationPin ?? {
          kind: 'legacy',
          identity: earnedIdentity,
        };
        if (useEarnedOriginal || canonicalJSON(earnedPin) === canonicalJSON(pin)) {
          pin = snapshotPictureChoice(earnedPin);
          earnedPicture = true;
          artSeed = pin.kind === 'legacy' ? earned.item.seed : null;
          break;
        }
      } catch {
        // An invalid or unavailable receipt is no permission to reveal art.
      }
    }
    if (pin.kind === 'still') {
      if (!media) return result();
      const acquireOriginal = acquire ?? media.acquire ?? acquirePresentationImage;
      backdrop = await acquireOriginal(
        { pin, metadata: media.metadata, store: media.store },
        { signal },
      );
      abort(signal);
      // An injected or failed adapter must not claim that another image is clear.
      if (!backdrop?.image || canonicalJSON(backdrop.pin) !== canonicalJSON(pin)) {
        backdrop?.release?.();
        backdrop = null;
        return result();
      }
    }
    // Preview availability proves this scene's exact picture is valid, independently
    // of the earned-only default. Failed identity or acquisition paths never opt in.
    return result(earnedPicture ? 'clear' : 'blurred', artSeed, true);
  } catch (error) {
    backdrop?.release?.();
    backdrop = null;
    if (signal?.aborted || error?.name === 'AbortError') throw error;
    return result();
  }
}

function validateDemoPixels(data, width, height) {
  if (
    !(data instanceof Uint8ClampedArray) ||
    data.length !== width * height * 4 ||
    !Number.isInteger(width) ||
    !Number.isInteger(height) ||
    width < 1 ||
    height < 1 ||
    width > 512 ||
    height > 512
  )
    throw new TypeError('Demo picture needs bounded RGBA image pixels.');
}

/** Bounded low-pass preparation before signal distortion; blur alone is not concealment. */
export function blurDemoPixels(data, width, height, radius = 2, passes = 1) {
  validateDemoPixels(data, width, height);
  if (
    !Number.isInteger(radius) ||
    radius < 1 ||
    radius > 32 ||
    !Number.isInteger(passes) ||
    passes < 1 ||
    passes > 4
  )
    throw new TypeError('Demo blur needs bounded RGBA image pixels.');
  let current = new Uint8ClampedArray(data);
  const count = radius * 2 + 1;
  for (let pass = 0; pass < passes; pass++) {
    for (const horizontal of [true, false]) {
      const next = new Uint8ClampedArray(data.length);
      const length = horizontal ? width : height,
        lines = horizontal ? height : width,
        stride = horizontal ? 4 : width * 4;
      for (let line = 0; line < lines; line++)
        for (let channel = 0; channel < 4; channel++) {
          const origin = (horizontal ? line * width * 4 : line * 4) + channel;
          let sum = 0;
          for (let offset = -radius; offset <= radius; offset++)
            sum += current[origin + Math.max(0, Math.min(length - 1, offset)) * stride];
          for (let position = 0; position < length; position++) {
            next[origin + position * stride] = Math.round(sum / count);
            sum +=
              current[origin + Math.min(length - 1, position + radius + 1) * stride] -
              current[origin + Math.max(0, position - radius) * stride];
          }
        }
      current = next;
    }
  }
  return current;
}

/** Fixed picture degradation. Moving interference never samples the original,
 * changes this geometry, or offers a cleaner interval to recover reward details. */
function prepareDemoSignal(data, width, height) {
  validateDemoPixels(data, width, height);
  const paper = [16, 24, 32],
    flattened = new Uint8ClampedArray(data.length);
  let seed = 2166136261;
  for (let i = 0; i < data.length; i += 4) {
    for (let channel = 0; channel < 3; channel++) {
      flattened[i + channel] = Math.round(
        (data[i + channel] * data[i + 3] + paper[channel] * (255 - data[i + 3])) / 255,
      );
      seed = Math.imul(seed ^ flattened[i + channel], 16777619) >>> 0;
    }
    flattened[i + 3] = 255;
  }
  const random = () => {
    seed = (seed + 0x6d2b79f5) >>> 0;
    let value = Math.imul(seed ^ (seed >>> 15), seed | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
  const scale = Math.max(width, height),
    soft = blurDemoPixels(flattened, width, height, Math.max(2, Math.round(scale / 96)), 2),
    broad = blurDemoPixels(soft, width, height, Math.max(2, Math.round(scale / 32)), 2),
    output = new Uint8ClampedArray(data.length);
  const sample = (pixels, x, y, channel) =>
    pixels[(y * width + Math.max(0, Math.min(width - 1, Math.round(x)))) * 4 + channel];
  let bandEnd = 0,
    shift = 0,
    loss = 0,
    dropoutStart = 0,
    dropoutEnd = 0;
  for (let y = 0; y < height; y++) {
    if (y >= bandEnd) {
      bandEnd = y + Math.max(1, Math.round(scale * (0.007 + random() * 0.012)));
      shift = width * (0.05 + random() * 0.15) * (random() < 0.5 ? -1 : 1);
      loss = random() < 0.24 ? 0.22 : 0;
      dropoutStart = random() * width * 0.6;
      dropoutEnd = dropoutStart + width * (0.2 + random() * 0.35);
    }
    const lineShift = shift + Math.sin(y * 0.63) * scale * 0.002,
      scan = y % 3 === 0 ? 0.975 : 1;
    for (let x = 0; x < width; x++) {
      const index = (y * width + x) * 4;
      // A faint intact low-frequency image anchors the scene's atmosphere.
      // Most signal energy is horizontally torn, so reward details stay hidden.
      const color = paper.map(
        (_, channel) =>
          0.36 * sample(broad, x, y, channel) +
          0.48 * sample(soft, x + lineShift + (1 - channel) * scale * 0.008, y, channel) +
          0.16 * sample(broad, x + lineShift + width * 0.14, y, channel),
      );
      const luma = 0.2126 * color[0] + 0.7152 * color[1] + 0.0722 * color[2],
        // Only heavily blurred broad color survives. Fine picture detail never
        // supplies chroma, even when moving noise is absent or averaged away.
        broadColor = paper.map(
          (_, channel) =>
            0.65 * sample(broad, x, y, channel) + 0.35 * sample(broad, x + lineShift, y, channel),
        ),
        broadLuma = 0.2126 * broadColor[0] + 0.7152 * broadColor[1] + 0.0722 * broadColor[2],
        dropout = x >= dropoutStart && x < dropoutEnd ? loss : 0,
        edge =
          1 -
          0.12 *
            ((x / Math.max(1, width - 1) - 0.5) ** 2 + (y / Math.max(1, height - 1) - 0.5) ** 2);
      for (let channel = 0; channel < 3; channel++)
        output[index + channel] = Math.round(
          ((luma + (broadColor[channel] - broadLuma) * 0.42) * (0.86 - dropout) + 12) * scan * edge,
        );
      output[index + 3] = 255;
    }
  }
  return { base: output, seed: analogSignalSeed(flattened, width, height) };
}

/** Static/reduced-effects reference frame of the concealed analog preview. */
export function concealDemoPixels(data, width, height) {
  const { base, seed } = prepareDemoSignal(data, width, height);
  return applyAnalogSignalNoise(base, width, height, 0, new Uint8ClampedArray(base.length), {
    seed,
    strength: DEMO_NOISE_STRENGTH,
  });
}

/** One bounded bitmap and two pixel buffers per painter. Only receiver noise
 * updates at 12 Hz; expensive picture preparation runs once per decoded image.
 * Read/decode failures return null, never the raw original. */
export function createDemoPictureFilter({
  canvasFactory = () => document.createElement('canvas'),
} = {}) {
  let source = null,
    signature = '',
    blurred = null,
    context = null,
    base = null,
    noiseSeed = 0,
    pixels = null,
    lastFrame = -1;
  function clear() {
    if (blurred) {
      blurred.width = 0;
      blurred.height = 0;
    }
    source = null;
    signature = '';
    blurred = context = base = pixels = null;
    noiseSeed = 0;
    lastFrame = -1;
  }
  function fail() {
    const failedSource = source,
      failedSignature = signature;
    clear();
    source = failedSource;
    signature = failedSignature;
    return null;
  }
  function update(frame) {
    if (!blurred || frame === lastFrame) return blurred;
    try {
      applyAnalogSignalNoise(base, blurred.width, blurred.height, frame, pixels.data, {
        seed: noiseSeed,
        strength: DEMO_NOISE_STRENGTH,
      });
      context.putImageData(pixels, 0, 0);
      lastFrame = frame;
      return blurred;
    } catch {
      return fail();
    }
  }
  return Object.freeze({
    clear,
    select(image, policy = 'clear', { time = 0, animate = false } = {}) {
      if (!['clear', 'blurred'].includes(policy))
        throw new TypeError('Invalid demo picture policy.');
      if (policy === 'clear') return image;
      const next = `${image?.width}:${image?.height}:${image?.naturalWidth}:${image?.naturalHeight}:${image?.complete}`;
      const frame = animate && Number.isFinite(time) ? Math.max(0, Math.floor(time * 12)) : 0;
      if (image === source && signature === next) return update(frame);
      clear();
      source = image;
      signature = next;
      try {
        if (!image || image.complete === false || !(image.width > 0) || !(image.height > 0))
          return null;
        const canvas = canvasFactory();
        const ratio = Math.min(1, 512 / Math.max(image.width, image.height));
        canvas.width = Math.max(1, Math.round(image.width * ratio));
        canvas.height = Math.max(1, Math.round(image.height * ratio));
        const ctx = canvas.getContext('2d', { willReadFrequently: true });
        if (!ctx) return null;
        ctx.imageSmoothingEnabled = true;
        ctx.drawImage(image, 0, 0, canvas.width, canvas.height);
        pixels = ctx.getImageData(0, 0, canvas.width, canvas.height);
        ({ base, seed: noiseSeed } = prepareDemoSignal(pixels.data, canvas.width, canvas.height));
        blurred = canvas;
        context = ctx;
        return update(frame);
      } catch {
        return fail();
      }
    },
  });
}
