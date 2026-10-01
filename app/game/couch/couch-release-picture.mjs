import { t } from '../i18n/index.mjs';
import { canonicalJSON, required } from '../data-json.mjs';
import { hashPresentationBytes } from '../presentation/bundle.mjs';
import { inspectImageDataUrl } from '../content.mjs';

const same = (a, b) => canonicalJSON(a) === canonicalJSON(b);
const releaseImage = (image) => {
  image?.removeAttribute?.('src');
  image?.close?.();
};

/** Authenticate and decode an already chosen release original. Choice, chapter
 * readiness and lease publication remain with the caller; no media is written. */
export async function acquireCouchReleasePicture({
  choice,
  snapshot,
  presentationPage,
  signal,
  check,
  decode,
  report,
  URLImpl,
}) {
  let url = null,
    image = null;
  const release = () => {
    const oldImage = image,
      oldURL = url;
    image = url = null;
    try {
      releaseImage(oldImage);
    } finally {
      if (oldURL !== null) URLImpl.revokeObjectURL(oldURL);
    }
  };
  try {
    const { slotId, asset } = choice,
      file = asset.file;
    const original = await presentationPage.readPicture(slotId, {
      snapshot,
      signal,
      onStatus: ({ stage, message }) => report(stage, message),
    });
    check(signal);
    required(same(original?.asset, asset), t('interface:theSelectedReleasePictureIdentityChanged'));
    required(
      original.blob?.size === file.bytes,
      t('interface:theSelectedReleaseOriginalSizeDiffers'),
    );
    const bytes = new Uint8Array(await original.blob.arrayBuffer());
    required(
      (await hashPresentationBytes(bytes)) === file.sha256,
      t('interface:releasePictureSha256Differs'),
    );
    check(signal);
    let binary = '';
    for (let offset = 0; offset < bytes.length; offset += 16384)
      binary += String.fromCharCode(...bytes.subarray(offset, offset + 16384));
    const header = inspectImageDataUrl(`data:${file.mime};base64,${btoa(binary)}`);
    required(
      header.valid && header.width === file.width && header.height === file.height,
      t('interface:theReleasePictureHeaderDiffersFromItsSelectedOriginal'),
    );
    required(
      typeof URLImpl?.createObjectURL === 'function' &&
        typeof URLImpl?.revokeObjectURL === 'function',
      t('interface:pictureObjectUrlsAreUnavailable'),
    );
    report('decoding', t('interface:openingOneOriginalForBothBoards'));
    url = URLImpl.createObjectURL(original.blob);
    image = await decode(url, signal);
    check(signal);
    required(
      image.naturalWidth === file.width &&
        image.naturalHeight === file.height &&
        image.width === file.width &&
        image.height === file.height,
      t('interface:theDecodedReleasePictureDimensionsDiffer'),
    );
    return { image, fit: 'contain', sampling: 'nearest', release };
  } catch (error) {
    release();
    throw error;
  }
}
