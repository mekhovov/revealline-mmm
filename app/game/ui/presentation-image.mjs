import { t } from '../i18n/index.mjs';
import { boundedJSON, canonicalJSON, exactKeys, required, stableId } from '../data-json.mjs';
import { isMediaLibrary } from '../media-library.mjs';
import { CONTENT_LIMITS, inspectImageDataUrl } from '../content.mjs';
import { snapshotPictureChoice } from '../presentation-pins.mjs';

const cancelled = () => new DOMException(t('interface:pictureAcquisitionCancelled'), 'AbortError');
const check = (signal) => {
  if (signal?.aborted) throw cancelled();
};
const disposeImage = (image) => {
  image?.removeAttribute?.('src');
  image?.close?.();
};

function browserDecode(source, { signal, ImageClass }) {
  required(typeof ImageClass === 'function', t('interface:browserPictureDecodingIsUnavailable'));
  check(signal);
  return new Promise((resolve, reject) => {
    const image = new ImageClass();
    let settled = false;
    const finish = (error) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      signal?.removeEventListener('abort', abort);
      image.onload = image.onerror = null;
      if (error) {
        disposeImage(image);
        reject(error);
      } else resolve(image);
    };
    const abort = () => finish(cancelled());
    const timer = setTimeout(
      () => finish(new Error(t('interface:savedPictureDecodeTimedOut'))),
      15000,
    );
    signal?.addEventListener('abort', abort, { once: true });
    image.onerror = () =>
      finish(new Error(t('interface:theSavedPictureCouldNotDecodeRestoreItsOriginal')));
    image.onload = async () => {
      try {
        required(
          typeof image.decode === 'function',
          t('interface:completePictureDecodingIsUnavailable'),
        );
        await image.decode();
        finish();
      } catch (error) {
        finish(error);
      }
    };
    if (signal?.aborted) return abort();
    try {
      image.src = source;
    } catch (error) {
      finish(error);
    }
  });
}

// A slow/injected decoder cannot delay cancellation or leak its later image.
function decodeOwned(decode, source, signal) {
  check(signal);
  return new Promise((resolve, reject) => {
    let settled = false;
    const abort = () => {
      if (settled) return;
      settled = true;
      signal?.removeEventListener('abort', abort);
      reject(cancelled());
    };
    signal?.addEventListener('abort', abort, { once: true });
    Promise.resolve()
      .then(() => {
        check(signal);
        return decode(source, { signal });
      })
      .then(
        (image) => {
          signal?.removeEventListener('abort', abort);
          if (settled) return disposeImage(image);
          settled = true;
          resolve(image);
        },
        (error) => {
          signal?.removeEventListener('abort', abort);
          if (settled) return;
          settled = true;
          reject(error);
        },
      );
    if (signal?.aborted) abort();
  });
}

/** Decode an already selected authored background before accepting a flight.
 * Only bounded embedded static artwork is accepted; no remote fetch or new pin.
 * The returned drawable belongs to this handle until its idempotent disposal.
 */
export async function acquireAuthoredPicture(
  source,
  { signal, decodeImage, ImageClass = globalThis.Image } = {},
) {
  check(signal);
  const background = boundedJSON(source, {
    maxBytes: CONTENT_LIMITS.maxEncodedImageChars + CONTENT_LIMITS.maxMetadataChars,
    maxString: CONTENT_LIMITS.maxEncodedImageChars,
  });
  exactKeys(background, ['dataUrl', 'name', 'fit', 'metadata'], t('interface:authoredBackground'));
  const header = inspectImageDataUrl(background.dataUrl);
  required(header.valid, `The authored background image is invalid: ${header.errors.join('; ')}`);
  const fit = background.fit ?? 'cover';
  required(
    ['contain', 'cover'].includes(fit),
    t('interface:theAuthoredBackgroundFitIsUnsupported'),
  );
  const decode = decodeImage ?? ((src, options) => browserDecode(src, { ...options, ImageClass }));
  required(typeof decode === 'function', t('interface:aPictureDecoderIsRequired'));
  let image = null;
  const dispose = () => {
    const prior = image;
    image = null;
    disposeImage(prior);
  };
  try {
    image = await decodeOwned(decode, background.dataUrl, signal);
    check(signal);
    required(
      image &&
        image.width === header.width &&
        image.height === header.height &&
        (image.naturalWidth ?? image.width) === header.width &&
        (image.naturalHeight ?? image.height) === header.height,
      t('interface:decodedAuthoredPictureDimensionsDifferFromItsOriginal'),
    );
    check(signal);
    return Object.freeze({ image, fit, dispose });
  } catch (error) {
    try {
      dispose();
    } catch {
      // A cleanup callback cannot conceal the preparation failure.
    }
    throw error;
  }
}

/** Shared browser decoder for already-verified originals. This is not asset
 * verification: callers still own byte/digest/dimension and identity checks.
 * The deadline also bounds injected decoders; late results are released. */
export async function decodeOwnedPicture(
  source,
  { signal, decodeImage, ImageClass = globalThis.Image, timeoutMs = 15000 } = {},
) {
  check(signal);
  required(
    typeof source === 'string' && source.length > 0,
    t('interface:aVerifiedPictureSourceIsRequired'),
  );
  required(
    Number.isFinite(timeoutMs) && timeoutMs > 0 && timeoutMs <= 15000,
    t('interface:invalidPictureDecodeTimeout'),
  );
  const decode = decodeImage ?? ((src, options) => browserDecode(src, { ...options, ImageClass }));
  required(typeof decode === 'function', t('interface:aPictureDecoderIsRequired'));
  const controller = new AbortController();
  let timer,
    abort,
    succeeded = false;
  const stopped = new Promise((_, reject) => {
    abort = () => {
      reject(cancelled());
      controller.abort();
    };
    signal?.addEventListener('abort', abort, { once: true });
    timer = setTimeout(() => {
      reject(new Error(t('interface:savedPictureDecodeTimedOut')));
      controller.abort();
    }, timeoutMs);
  });
  let image = null;
  try {
    image = await Promise.race([stopped, decodeOwned(decode, source, controller.signal)]);
    check(signal);
    succeeded = true;
    return image;
  } finally {
    clearTimeout(timer);
    signal?.removeEventListener('abort', abort);
    if (!succeeded) {
      controller.abort();
      disposeImage(image);
    }
  }
}

/** Acquire one historical choice, never today's replacement assignment.
 * The host validates execution→authored ownership through pins/receipts first.
 * metadata is the exact branded snapshot from this store's readMetadata().
 * A legacy choice returns null: keep that context's existing authored path.
 * decodeImage(sourceURL,{signal}) returns an owned, fully decoded drawable.
 */
export async function acquirePresentationImage(
  { pin: source, metadata, store },
  { signal, decodeImage, URLImpl = globalThis.URL, ImageClass = globalThis.Image } = {},
) {
  check(signal);
  const pin = snapshotPictureChoice(source);
  if (pin.kind === 'legacy') return null;
  required(
    isMediaLibrary(metadata?.document?.library),
    t('interface:pictureAcquisitionNeedsValidatedMetadata'),
  );
  const library = metadata.document.library,
    asset = library.assets.find((item) => item.id === pin.assetId),
    presentation = library.presentations.find(
      (item) => item.id === pin.presentationId && item.revision === pin.presentationRevision,
    );
  required(
    asset &&
      presentation &&
      asset.sha256 === pin.sha256 &&
      presentation.poster.assetId === pin.assetId &&
      canonicalJSON(presentation.identity) === canonicalJSON(pin.identity),
    t('interface:theSavedPictureRevisionIsMissingRestoreItsRlmediaOriginals'),
  );
  required(
    typeof store?.readAsset === 'function',
    t('interface:pictureAcquisitionNeedsAStillMediaStore'),
  );
  required(
    typeof URLImpl?.createObjectURL === 'function' &&
      typeof URLImpl?.revokeObjectURL === 'function',
    t('interface:localPictureObjectUrlsAreUnavailable'),
  );
  required(
    decodeImage === undefined || typeof decodeImage === 'function',
    t('interface:aPictureDecoderIsRequired'),
  );
  let url = null,
    image = null;
  const release = () => {
    const oldImage = image,
      oldURL = url;
    image = null;
    url = null;
    try {
      disposeImage(oldImage);
    } finally {
      if (oldURL !== null) URLImpl.revokeObjectURL(oldURL);
    }
  };
  try {
    await store.readAsset(metadata, asset.id, {
      signal,
      decodeImage: async (blob, { signal }) => {
        check(signal);
        url = URLImpl.createObjectURL(blob);
        check(signal);
        image = await decodeOwnedPicture(url, { signal, decodeImage, ImageClass });
        check(signal);
        required(
          image &&
            image.width === asset.width &&
            image.height === asset.height &&
            (image.naturalWidth ?? image.width) === asset.width &&
            (image.naturalHeight ?? image.height) === asset.height,
          t('interface:decodedSavedPictureDimensionsDifferFromItsOriginal'),
        );
        return { naturalWidth: asset.width, naturalHeight: asset.height };
      },
    });
    check(signal);
    required(image, t('interface:pictureAcquisitionDidNotProduceADecodedImage'));
    return Object.freeze({
      image,
      fit: presentation.poster.fit,
      sampling: presentation.poster.sampling,
      pin,
      release,
    });
  } catch (error) {
    release();
    throw error;
  }
}

export function pictureDisplayContext(source) {
  const value = boundedJSON(source, { maxBytes: 4096, maxString: 512, maxNodes: 16 });
  exactKeys(
    value,
    ['runId', 'executionKey', 'levelId', 'levelRevision', 'themeId'],
    'picture display context',
  );
  required(
    ((typeof value.runId === 'string' && value.runId.length > 0 && value.runId.length <= 512) ||
      (Number.isSafeInteger(value.runId) && value.runId >= 0)) &&
      typeof value.executionKey === 'string' &&
      value.executionKey.length > 0 &&
      stableId(value.levelId) &&
      typeof value.levelRevision === 'string' &&
      value.levelRevision.length > 0 &&
      value.levelRevision.length <= 80 &&
      stableId(value.themeId),
    t('interface:invalidPictureDisplayContext'),
  );
  return Object.freeze(value);
}

/** One consumer owns one slot. Change context before any new frame; it clears
 * the old map/world image immediately. Failed same-context loads retain the
 * active binding. No painting, setLook, run mutation or storage writes occur.
 */
export function createPresentationImageSlot({ acquire = acquirePresentationImage } = {}) {
  required(typeof acquire === 'function', 'Picture slot needs an acquisition function.');
  let context = null,
    binding = null,
    pending = null,
    generation = 0,
    disposed = false;
  const invalidate = () => {
    ++generation;
    pending?.abort();
    pending = null;
  };
  function setContext(source) {
    required(!disposed, t('interface:pictureSlotIsDisposed'));
    const next = pictureDisplayContext(source);
    if (context && canonicalJSON(next) === canonicalJSON(context)) return false;
    invalidate();
    const prior = binding;
    context = next;
    binding = null;
    prior?.release();
    return true;
  }
  async function load(request, { context: expectedContext, signal, ...options } = {}) {
    required(!disposed && context, t('interface:setThePictureDisplayContextBeforeLoading'));
    required(
      canonicalJSON(pictureDisplayContext(expectedContext)) === canonicalJSON(context),
      t('interface:pictureRequestBelongsToAnEarlierDisplayContext'),
    );
    const pin = snapshotPictureChoice(request.pin);
    required(
      pin.identity.levelId === context.levelId && pin.identity.themeId === context.themeId,
      t('interface:pictureRequestDiffersFromTheActiveMapWorld'),
    );
    invalidate();
    const ticket = generation,
      own = new AbortController();
    pending = own;
    const abort = () => own.abort();
    signal?.addEventListener('abort', abort, { once: true });
    if (signal?.aborted) own.abort();
    let candidate = null;
    try {
      check(own.signal);
      candidate = await acquire({ ...request, pin }, { ...options, signal: own.signal });
      check(own.signal);
      if (disposed || ticket !== generation) return false;
      const prior = binding;
      binding = candidate;
      candidate = null;
      prior?.release();
      return true;
    } catch (error) {
      if (disposed || ticket !== generation) return false;
      throw error;
    } finally {
      signal?.removeEventListener('abort', abort);
      candidate?.release();
      if (pending === own) pending = null;
    }
  }
  function clear() {
    invalidate();
    const prior = binding;
    binding = null;
    context = null;
    prior?.release();
  }
  function dispose() {
    if (!disposed) {
      disposed = true;
      clear();
    }
  }
  return Object.freeze({ setContext, load, current: () => binding, clear, dispose });
}
