import { createManagedMediaStore } from './managed-media-store.mjs';
import { canonicalJSON, required } from './data-json.mjs';
import { inspectImageDataUrl } from './content.mjs';
import { prepareStillAsset } from './media-still.mjs';
import {
  hydrateStoredStillMedia,
  prepareStoredStillMedia,
  verifyStoredStillAssets,
} from './media-storage-record.mjs';

/** Standalone v3 default; an injected compatible v3/v4 manager is shared with
 * the host’s soundtrack/story adapters. Current solo/workshop hosts opt into v4.
 */
export function createStillMediaStore({ managedStore, decodeImage, ...options } = {}) {
  const manager = managedStore ?? createManagedMediaStore({ ...options, richStillMedia: true });
  if (manager.richStillMedia !== true)
    throw new TypeError('Still media requires a compatible rich still manager.');
  let closed = false;
  const snapshots = new WeakSet();
  const check = () => {
    if (closed) throw new Error('Still media store is closed.');
  };
  const snapshot = (saved) => {
    const result = Object.freeze({
      generation: saved.generation,
      document: hydrateStoredStillMedia(saved.library),
    });
    check();
    snapshots.add(result);
    return result;
  };
  return Object.freeze({
    async readMetadata({ signal } = {}) {
      check();
      const saved = await manager.readDomainMetadata('media', { signal });
      return snapshot(saved);
    },
    async readPresentationMetadata({ signal } = {}) {
      check();
      required(
        manager.storyMedia === true,
        'Combined presentation reads need the shared v4 manager.',
      );
      const saved = await manager.readPresentationMetadata({ signal });
      return Object.freeze({
        metadata: snapshot(saved.media),
        story: Object.freeze({ generation: saved.story.generation, document: saved.story.library }),
      });
    },
    async readAsset(snapshot, assetId, { signal, decodeImage: decoder = decodeImage } = {}) {
      check();
      required(snapshots.has(snapshot), 'Still acquisition needs this store’s metadata snapshot.');
      const asset = snapshot.document.library.assets.find((item) => item.id === assetId);
      required(asset, 'The selected still asset is absent from this metadata snapshot.');
      const blob = await manager.readSelectedBlob(asset.sha256, { signal, maxBytes: asset.bytes });
      check();
      required(blob, 'The saved picture original is missing. Restore its .rlmedia originals.');
      required(blob.size === asset.bytes, 'Saved picture byte length differs from its record.');
      // Authenticate bytes before allocating the decoder. prepareStillAsset
      // subsequently enforces the actual header and complete decoded dimensions.
      const bytes = new Uint8Array(await blob.arrayBuffer());
      const digest = new Uint8Array(await crypto.subtle.digest('SHA-256', bytes));
      if (signal?.aborted) throw new DOMException('Still acquisition cancelled.', 'AbortError');
      const hash = [...digest].map((byte) => byte.toString(16).padStart(2, '0')).join('');
      required(hash === asset.sha256, 'Saved picture SHA-256 differs from its original bytes.');
      let binary = '';
      for (let offset = 0; offset < bytes.length; offset += 16384)
        binary += String.fromCharCode(...bytes.subarray(offset, offset + 16384));
      const header = inspectImageDataUrl(`data:${asset.mime};base64,${btoa(binary)}`);
      required(
        header.valid &&
          header.width === asset.width &&
          header.height === asset.height &&
          header.mime === asset.mime,
        'Saved picture header differs from its record.',
      );
      check();
      const prepared = await prepareStillAsset(
        blob,
        { id: asset.id, provenance: asset.provenance },
        { signal, decodeImage: decoder },
      );
      check();
      required(
        canonicalJSON(prepared.asset) === canonicalJSON(asset),
        'Saved picture metadata differs from its decoded original.',
      );
      return prepared;
    },
    async read({ signal } = {}) {
      check();
      const saved = await manager.readDomain('media', { signal });
      const document = hydrateStoredStillMedia(saved.library);
      const assets = await verifyStoredStillAssets(document, saved.assets, { decodeImage, signal });
      check();
      return Object.freeze({ generation: saved.generation, document, assets });
    },
    async prepare(library, assets, options = {}) {
      check();
      const prepared = await prepareStoredStillMedia(library, assets, { decodeImage, ...options });
      check();
      return prepared;
    },
    async commit(prepared, options) {
      check();
      return manager.commitDomain('media', prepared, options);
    },
    async readBlob(hash, options) {
      check();
      return manager.readBlob(hash, options);
    },
    close() {
      closed = true;
      if (!managedStore) manager.close();
    },
  });
}
