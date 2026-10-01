import { boundedJSON, exactKeys, required, stableId } from '../data-json.mjs';
import { resolveEditionAssets, resolveEditionSelection } from '../editions/model.mjs';
import { loadRetainedPresentation } from '../editions/retained-presentation.mjs';

const exactAsset = (bootstrap, reference) =>
  resolveEditionAssets(bootstrap.catalog, {
    editionId: bootstrap.selection.edition.id,
  }).find(
    (asset) =>
      asset.id === reference.assetId &&
      asset.sha256 === reference.sha256 &&
      asset.approved === true &&
      (bootstrap.selection.edition.publication !== 'public' || asset.publication === 'public'),
  );

/** Locate a first-earned original only through the selected audience's current
 * closure or its registered, hash-checked snapshots. This reads no media bytes
 * and retains no cache; the ordinary asset verifier owns subsequent acquisition. */
export async function resolveRewardAsset(
  provider,
  input,
  { signal, fetcher = globalThis.fetch, timeoutMs = 20000 } = {},
) {
  const reference = boundedJSON(input, { maxBytes: 1024, maxNodes: 4 });
  exactKeys(reference, ['assetId', 'sha256'], 'reward media reference');
  required(
    stableId(reference.assetId) && /^[a-f0-9]{64}$/.test(reference.sha256),
    'Reward media requires an exact registered reference.',
  );
  required(
    Number.isFinite(timeoutMs) && timeoutMs > 0 && timeoutMs <= 20000,
    'Invalid reward media lookup budget.',
  );
  signal?.throwIfAborted();
  const current = provider.bootstrap;
  required(
    current?.selection.edition.id === provider.editionId,
    'Reward media belongs to another edition.',
  );
  const asset = exactAsset(current, reference);
  if (asset) return { bootstrap: current, asset };
  const { edition } = resolveEditionSelection(provider.currentCatalog ?? provider.catalog, {
    editionId: provider.editionId,
  });
  required(
    edition.brandId === current.selection.edition.brandId &&
      edition.audience === current.selection.edition.audience,
    'Reward media history belongs to another audience.',
  );
  const controller = new AbortController();
  const abort = () => controller.abort(signal?.reason);
  signal?.addEventListener('abort', abort, { once: true });
  if (signal?.aborted) abort();
  let timer;
  const stopped = new Promise((_, reject) => {
    const cancelled = () =>
      reject(new DOMException('Reward media lookup cancelled.', 'AbortError'));
    controller.signal.addEventListener('abort', cancelled, { once: true });
    if (controller.signal.aborted) cancelled();
    timer = setTimeout(() => {
      reject(new Error('The exact reward media lookup timed out. Your discovery is preserved.'));
      controller.abort();
    }, timeoutMs);
  });
  try {
    return await Promise.race([
      stopped,
      (async () => {
        for (const descriptor of edition.presentationHistory ?? []) {
          controller.signal.throwIfAborted();
          let retained;
          try {
            retained = await loadRetainedPresentation(descriptor, {
              edition,
              baseURL: provider.rootURL,
              fetcher,
              signal: controller.signal,
              timeoutMs,
            });
          } catch {
            controller.signal.throwIfAborted();
            // Another explicitly registered original may contain the exact pin.
            continue;
          }
          controller.signal.throwIfAborted();
          const asset = exactAsset(retained.bootstrap, reference);
          if (asset) return { bootstrap: retained.bootstrap, asset };
        }
        throw new Error('This exact reward media is unavailable. Your discovery is preserved.');
      })(),
    ]);
  } finally {
    clearTimeout(timer);
    signal?.removeEventListener('abort', abort);
    controller.abort();
  }
}
