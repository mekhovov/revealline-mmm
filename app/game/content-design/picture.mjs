import { dataIdentity, required } from '../data-json.mjs';
import { decodeOwnedPicture } from '../ui/presentation-image.mjs';
import { compileAssetRevision, loadPreviewArtwork, verifiedPreviewBackground } from './assets.mjs';

const check = (signal) => {
  if (signal?.aborted) throw new DOMException('Candidate picture cancelled.', 'AbortError');
};
const verifiedPictures = new WeakMap();

export function isCandidatePictureFor(asset, picture) {
  const record = picture && verifiedPictures.get(picture);
  if (!record || record.released) return false;
  if (record.matches.has(asset)) return true;
  const matches = record.identity === dataIdentity(compileAssetRevision(asset));
  // Assets are flat validated records. Frozen matches are safe to cache for
  // per-frame readiness reads without repeatedly cloning/hashing their pins.
  if (matches && asset && typeof asset === 'object' && Object.isFrozen(asset))
    record.matches.add(asset);
  return matches;
}

export function claimCandidatePicture(asset, picture) {
  required(
    isCandidatePictureFor(asset, picture),
    'Candidate picture is unavailable or mismatched.',
  );
  const record = verifiedPictures.get(picture);
  required(!record.claimed, 'Candidate picture already belongs to another display owner.');
  record.claimed = true;
  return picture;
}

/** Discard an acquisition that failed before ownership transfer, never a
 * binding already belonging to another display. Unknown objects are ignored. */
export function discardUnclaimedCandidatePicture(picture) {
  const record = picture && verifiedPictures.get(picture);
  if (!record || record.claimed || record.released) return false;
  picture.release();
  return true;
}

/** Candidate pixels never mint a managed-media pin, award receipt or storage
 * assignment. The caller owns the returned decoded image until release().
 * Exact bytes and a complete decode are both required before it can be drawn. */
export async function acquireCandidatePicture(
  source,
  { signal, loadArtwork = loadPreviewArtwork, decodeImage, ImageClass, decodeTimeoutMs } = {},
) {
  check(signal);
  const asset = compileAssetRevision(source);
  required(typeof loadArtwork === 'function', 'Candidate artwork loader is required.');
  const media = await loadArtwork(asset, { signal });
  check(signal);
  const background = verifiedPreviewBackground(asset, media);
  const ownership = {
    identity: dataIdentity(asset),
    released: false,
    claimed: false,
    matches: new WeakSet([asset]),
  };
  let ownedImage = null;
  const release = () => {
    ownership.released = true;
    const old = ownedImage;
    ownedImage = null;
    try {
      old?.removeAttribute?.('src');
    } finally {
      old?.close?.();
    }
  };
  try {
    ownedImage = await decodeOwnedPicture(background.dataUrl, {
      signal,
      decodeImage,
      ImageClass,
      ...(decodeTimeoutMs === undefined ? {} : { timeoutMs: decodeTimeoutMs }),
    });
    check(signal);
    required(
      ownedImage &&
        ownedImage.width === asset.width &&
        ownedImage.height === asset.height &&
        (ownedImage.naturalWidth ?? ownedImage.width) === asset.width &&
        (ownedImage.naturalHeight ?? ownedImage.height) === asset.height,
      'Decoded candidate picture dimensions differ from its pinned revision.',
    );
    const binding = Object.freeze({
      kind: 'candidate-picture',
      image: ownedImage,
      fit: background.fit,
      name: background.name,
      assetRevision: asset,
      officialProgressEligible: false,
      release,
    });
    verifiedPictures.set(binding, ownership);
    return binding;
  } catch (error) {
    release();
    throw error;
  }
}
