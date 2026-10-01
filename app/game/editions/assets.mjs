import { required } from '../data-json.mjs';
import { resolveEditionAssets } from './model.mjs';

/** Verify selected dependency bytes before activating a presentation. Sequential
 * streaming bounds peak memory and never loads another edition's artwork. */
export async function verifyEditionAssets(
  bootstrap,
  { baseURL, fetcher = globalThis.fetch, signal, ids = null, onVerifiedAsset = null } = {},
) {
  const { catalog, selection } = bootstrap;
  const selected = resolveEditionAssets(catalog, { editionId: selection.edition.id });
  const assets = new Map(selected.map((asset) => [asset.id, asset]));
  const requested = new Set(ids ?? assets.keys());
  for (const id of requested) {
    const asset = assets.get(id);
    required(asset?.approved === true, `Presentation asset is unavailable in this edition: ${id}.`);
    required(
      selection.edition.publication !== 'public' || asset.publication === 'public',
      `Presentation asset is not public: ${id}.`,
    );
    for (const dependency of asset.dependencies) requested.add(dependency);
  }
  required(
    [...requested].reduce((sum, id) => sum + assets.get(id).bytes, 0) <= 64 * 1024 * 1024,
    'Presentation exceeds its offline budget.',
  );
  const verified = [];
  for (const id of requested) {
    const asset = assets.get(id);
    signal?.throwIfAborted();
    const response = await fetcher(new URL(asset.path, baseURL), { signal, redirect: 'error' });
    required(
      response.ok && response.body?.getReader,
      `Presentation asset could not be loaded: ${id}.`,
    );
    const announced = response.headers?.get('content-length');
    if (
      !response.headers?.get('content-encoding') &&
      announced != null &&
      (!/^\d+$/.test(announced) || Number(announced) > asset.bytes)
    ) {
      response.body.cancel().catch(() => {});
      throw new Error(`Presentation asset exceeds its pinned size: ${id}.`);
    }
    const reader = response.body.getReader(),
      bytes = new Uint8Array(asset.bytes);
    // A tee branch's cancellation promise can wait on a different consumer.
    // Reject promptly while still requesting cancellation and releasing our lock.
    const cancel = () => {
      reader.cancel().catch(() => {});
    };
    signal?.addEventListener('abort', cancel, { once: true });
    let length = 0;
    try {
      for (;;) {
        signal?.throwIfAborted();
        const { value, done } = await reader.read();
        signal?.throwIfAborted();
        if (done) break;
        required(
          length + value.byteLength <= asset.bytes,
          `Presentation asset exceeds its pinned size: ${id}.`,
        );
        bytes.set(value, length);
        length += value.byteLength;
      }
    } catch (error) {
      cancel();
      throw error;
    } finally {
      signal?.removeEventListener('abort', cancel);
      reader.releaseLock();
    }
    required(length === asset.bytes, `Presentation asset is incomplete: ${id}.`);
    const hash = Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256', bytes)), (byte) =>
      byte.toString(16).padStart(2, '0'),
    ).join('');
    signal?.throwIfAborted();
    required(hash === asset.sha256, `Presentation asset differs from its pinned revision: ${id}.`);
    if (onVerifiedAsset) await onVerifiedAsset({ asset, bytes });
    signal?.throwIfAborted();
    verified.push(id);
  }
  return Object.freeze(verified);
}
