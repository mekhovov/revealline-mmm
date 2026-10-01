import { required } from '../data-json.mjs';
import { verifyEditionAssets } from '../editions/assets.mjs';
import { resolveRewardAsset } from '../rewards/media.mjs';
import { inspectRewardMediaBytes } from '../rewards/media-format.mjs';

/** One exact-image path for earned pictures, explicit teasers and local Studio
 * previews. The caller owns request lifetime and the returned object URL. */
export async function loadRewardImage({
  container,
  image,
  locale = 'en',
  provider,
  signal,
  isCurrent = () => true,
  urls = new Set(),
  URLImpl = globalThis.URL,
  readLocalAsset,
  downloadLabel = null,
  missingLabel,
  inspect = false,
}) {
  const doc = container.ownerDocument;
  let ownedURL = null;
  const active = () => !signal.aborted && isCurrent();
  const render = (asset, bytes) => {
    if (!active()) return;
    if (inspect || readLocalAsset) inspectRewardMediaBytes(asset, 'poster', bytes);
    const type = /\.webp$/i.test(asset.path)
      ? 'image/webp'
      : /\.jpe?g$/i.test(asset.path)
        ? 'image/jpeg'
        : 'image/png';
    ownedURL = URLImpl.createObjectURL(new Blob([bytes], { type }));
    urls.add(ownedURL);
    const picture = doc.createElement('img');
    picture.alt = (image.locales[locale] ?? image.locales.en).alt;
    picture.src = ownedURL;
    const nodes = [picture];
    if (downloadLabel) {
      const link = doc.createElement('a');
      link.textContent = downloadLabel;
      link.href = ownedURL;
      link.download = asset.path.split('/').at(-1);
      nodes.push(link);
    }
    container.replaceChildren(...nodes);
  };
  try {
    if (readLocalAsset) {
      const { asset, bytes } = await readLocalAsset(image.asset, { signal });
      if (!active()) return () => {};
      required(
        asset.id === image.asset.assetId && asset.sha256 === image.asset.sha256,
        'The preview image differs from its authored pin.',
      );
      const actual = Array.from(
        new Uint8Array(await crypto.subtle.digest('SHA-256', bytes)),
        (byte) => byte.toString(16).padStart(2, '0'),
      ).join('');
      required(actual === image.asset.sha256, 'The preview image differs from its exact SHA-256.');
      render(asset, bytes);
    } else {
      const { bootstrap, asset } = await resolveRewardAsset(provider, image.asset, { signal });
      await verifyEditionAssets(bootstrap, {
        baseURL: provider.rootURL,
        ids: [asset.id],
        signal,
        onVerifiedAsset({ asset: verified, bytes }) {
          if (verified.id === asset.id) render(asset, bytes);
        },
      });
    }
  } catch {
    if (active()) {
      const note = doc.createElement('p');
      note.textContent = missingLabel;
      container.replaceChildren(note);
    }
  }
  return () => {
    if (ownedURL && urls.delete(ownedURL)) URLImpl.revokeObjectURL(ownedURL);
  };
}
