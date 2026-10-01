import { required } from '../data-json.mjs';
import { resolveRewardAsset } from './media.mjs';
import { validateRewardMediaAsset } from './media-format.mjs';
import { verifyEditionAssets } from '../editions/assets.mjs';
import { acquireAuthoredPicture } from '../ui/presentation-image.mjs';

/** Reuse the exact edition verifier and bounded picture decoder. No bare URL
 * lookup, remote asset, renderer substitution or permanently retained bitmap. */
export async function acquireRewardCosmeticImage(
  recipe,
  {
    provider,
    signal,
    fetcher = globalThis.fetch,
    readLocalAsset,
    decodeImage,
    ImageClass = globalThis.Image,
    timeoutMs = 20000,
  } = {},
) {
  if (!recipe.image) return null;
  required(
    Number.isFinite(timeoutMs) && timeoutMs > 0 && timeoutMs <= 20000,
    'Invalid appearance acquisition deadline.',
  );
  const controller = new AbortController();
  const abort = () => controller.abort(signal?.reason);
  signal?.addEventListener('abort', abort, { once: true });
  if (signal?.aborted) abort();
  let timer,
    binding = null;
  const stopped = new Promise((_, reject) => {
    const cancel = () =>
      reject(new DOMException('Appearance acquisition cancelled.', 'AbortError'));
    controller.signal.addEventListener('abort', cancel, { once: true });
    if (controller.signal.aborted) cancel();
    timer = setTimeout(() => controller.abort(), timeoutMs);
  });
  try {
    return await Promise.race([
      stopped,
      (async () => {
        let asset, bytes;
        if (readLocalAsset)
          ({ asset, bytes } = await readLocalAsset(recipe.image, { signal: controller.signal }));
        else {
          const selected = await resolveRewardAsset(provider, recipe.image, {
            signal: controller.signal,
            fetcher,
            timeoutMs,
          });
          asset = selected.asset;
          await verifyEditionAssets(selected.bootstrap, {
            baseURL: provider.rootURL,
            ids: [asset.id],
            signal: controller.signal,
            fetcher,
            onVerifiedAsset(value) {
              if (value.asset.id === asset.id) bytes = value.bytes;
            },
          });
        }
        controller.signal.throwIfAborted();
        required(
          asset?.id === recipe.image.assetId && asset.sha256 === recipe.image.sha256,
          'Appearance source differs from its exact recipe.',
        );
        const mime = validateRewardMediaAsset(asset, 'poster');
        required(
          bytes instanceof Uint8Array && bytes.length === asset.bytes,
          'Appearance bytes differ from their declared size.',
        );
        const hash = Array.from(
          new Uint8Array(await crypto.subtle.digest('SHA-256', bytes)),
          (value) => value.toString(16).padStart(2, '0'),
        ).join('');
        controller.signal.throwIfAborted();
        required(
          hash === recipe.image.sha256,
          'Appearance bytes differ from their exact revision.',
        );
        let binary = '';
        for (let index = 0; index < bytes.length; index += 8192)
          binary += String.fromCharCode(...bytes.subarray(index, index + 8192));
        binding = await acquireAuthoredPicture(
          {
            dataUrl: `data:${mime};base64,${btoa(binary)}`,
            name: recipe.body.label,
            fit: 'contain',
            metadata: {},
          },
          { signal: controller.signal, decodeImage, ImageClass },
        );
        if (controller.signal.aborted) {
          binding.dispose();
          controller.signal.throwIfAborted();
        }
        return binding;
      })(),
    ]);
  } catch (error) {
    binding?.dispose();
    throw error;
  } finally {
    clearTimeout(timer);
    signal?.removeEventListener('abort', abort);
  }
}
