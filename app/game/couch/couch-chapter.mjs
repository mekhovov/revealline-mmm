import { t } from '../i18n/index.mjs';
import { preparePack, resolvePackCampaign } from '../packs.mjs';
import { arcadeActionCapabilities } from '../core/arcade-actions.mjs';

const cancelled = () => new DOMException(t('interface:couchArtworkLoadingCancelled'), 'AbortError');
const release = (image) => {
  image.removeAttribute?.('src');
  image.close?.();
};

/** One page owns the three shipped originals; both boards borrow one binding.
 * Preparation validates the unchanged pack and fully decodes its exact data URLs.
 * There is no profile registration, media import, conversion or fallback artwork.
 */
export async function prepareCouchChapter(
  candidate,
  { ImageClass = globalThis.Image, signal } = {},
) {
  const images = new Map();
  let disposed = false;
  const dispose = () => {
    if (disposed) return;
    disposed = true;
    signal?.removeEventListener('abort', dispose);
    for (const image of images.values()) release(image);
    images.clear();
  };
  signal?.addEventListener('abort', dispose, { once: true });
  const check = () => {
    if (disposed || signal?.aborted) throw cancelled();
  };
  async function decodeImage(source) {
    check();
    if (images.has(source)) return images.get(source);
    if (typeof ImageClass !== 'function')
      throw new Error(t('interface:browserPictureDecodingIsUnavailable'));
    const image = await new Promise((resolve, reject) => {
      const image = new ImageClass();
      let settled = false;
      const finish = (error) => {
        if (settled) return;
        settled = true;
        clearTimeout(timer);
        signal?.removeEventListener('abort', abort);
        image.onload = image.onerror = null;
        if (error) {
          release(image);
          reject(error);
        } else resolve(image);
      };
      const abort = () => finish(cancelled());
      const timer = setTimeout(
        () => finish(new Error(t('interface:couchPictureDecodingTimedOut'))),
        15000,
      );
      signal?.addEventListener('abort', abort, { once: true });
      image.onerror = () => finish(new Error(t('interface:theShippedCouchPictureCouldNotDecode')));
      image.onload = async () => {
        try {
          if (typeof image.decode !== 'function')
            throw new Error(t('interface:completePictureDecodingIsUnavailable'));
          await image.decode();
          check();
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
    if (disposed || signal?.aborted) {
      release(image);
      throw cancelled();
    }
    images.set(source, image);
    return image;
  }
  try {
    check();
    const { pack } = await preparePack(candidate, { decodeImage });
    check();
    if (pack.id !== 'fpv-arcade-r5' || pack.campaigns.length !== 1)
      throw new Error(t('interface:theShippedPressureLinesChapterDoesNotMatch'));
    const resolved = resolvePackCampaign(pack, 'fpv-pressure-lines');
    if (
      resolved.campaign.levels.length !== 3 ||
      resolved.campaign.levels.some(
        (level) =>
          level.width !== 72 ||
          level.height !== 36 ||
          arcadeActionCapabilities(level).manualAbility,
      )
    )
      throw new Error(t('interface:pressureLinesRequiresItsAuthoredWideArcadeMaps'));
    const backdrops = new Map();
    for (const level of resolved.campaign.levels) {
      const background = resolved.levelVisuals.find((item) => item.levelId === level.id)
        ?.visualOverrides.background;
      const image = images.get(background?.dataUrl);
      if (!image)
        throw new Error(t('gameplay:theOriginalPictureForIsUnavailable', { value1: level.id }));
      if (background.fit !== 'contain')
        throw new Error(
          t('gameplay:theOriginalPictureForRequiresItsAuthoredContainFit', { value1: level.id }),
        );
      backdrops.set(level.id, Object.freeze({ image, fit: background.fit, sampling: 'nearest' }));
    }
    return Object.freeze({
      pack,
      resolved,
      backdrop: (levelId) => (disposed ? null : backdrops.get(levelId)),
      dispose,
    });
  } catch (error) {
    dispose();
    throw error;
  }
}
