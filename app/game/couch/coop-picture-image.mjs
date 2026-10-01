import { t } from '../i18n/index.mjs';
// The Team lease verifies the original bytes before this browser-only decoder.
// One returned handle owns both the decoded image and its temporary Blob URL.
export function decodeCoopPicture(blob, { signal } = {}) {
  if (signal?.aborted)
    return Promise.reject(new DOMException(t('interface:cancelled'), 'AbortError'));
  return new Promise((resolve, reject) => {
    let image,
      source,
      timer,
      settled = false,
      released = false;
    const release = () => {
      if (released) return;
      released = true;
      if (image) {
        image.onload = image.onerror = null;
        image.removeAttribute?.('src');
      }
      if (source) URL.revokeObjectURL(source);
    };
    const finish = (error) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      signal?.removeEventListener('abort', abort);
      if (image) image.onload = image.onerror = null;
      if (error) {
        release();
        reject(error);
      } else resolve({ image, release });
    };
    const abort = () => finish(new DOMException(t('interface:teamPictureCancelled'), 'AbortError'));
    try {
      image = new Image();
      source = URL.createObjectURL(blob);
      timer = setTimeout(() => finish(new Error(t('interface:teamPictureDecodeTimedOut'))), 15000);
      signal?.addEventListener('abort', abort, { once: true });
      image.onerror = () => finish(new Error(t('interface:theTeamOriginalCouldNotDecode')));
      image.onload = async () => {
        try {
          if (typeof image.decode !== 'function')
            throw new Error(t('interface:completePictureDecodingIsUnavailable'));
          await image.decode();
          if (signal?.aborted) return abort();
          finish();
        } catch (error) {
          finish(error);
        }
      };
      if (signal?.aborted) return abort();
      image.src = source;
    } catch (error) {
      finish(error);
    }
  });
}
