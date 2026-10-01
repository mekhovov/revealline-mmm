import { boundedJSON, canonicalJSON, exactKeys, required } from './data-json.mjs';
import {
  SOUNDTRACK_LIMITS,
  SOUNDTRACK_FORMAT,
  emptySoundtrackLibrary,
  resolveSoundtrackLibrary,
} from './soundtrack.mjs';
import { isPreparedSoundtrackLibrary, ownSoundtrackAssets } from './soundtrack-bundle.mjs';
import { inspectMP3, throwIfSoundtrackAborted } from './mp3.mjs';

export const SOUNDTRACK_DATABASE = 'revealline-mmm-soundtrack-v1';
const encodedBytes = (value) => new TextEncoder().encode(canonicalJSON(value)).byteLength;
const integer = (value) => Number.isSafeInteger(value) && value >= 0;
function metadata(value) {
  if (value === undefined) return { generation: 0, library: emptySoundtrackLibrary() };
  const copy = boundedJSON(value, {
    maxBytes: SOUNDTRACK_LIMITS.metadataBytes + 1024,
    maxNodes: 32000,
    maxDepth: 10,
    maxArray: 256,
    maxString: 1024,
  });
  exactKeys(copy, ['generation', 'library'], 'stored soundtrack');
  required(
    integer(copy.generation) && copy.generation < Number.MAX_SAFE_INTEGER,
    'Invalid soundtrack generation.',
  );
  required(
    copy.library?.format === SOUNDTRACK_FORMAT,
    'Legacy audio storage cannot read catalogue libraries.',
  );
  return { generation: copy.generation, library: resolveSoundtrackLibrary(copy.library) };
}
/** A separate database; legacy profile, pack, save and JSON backup stores are untouched. */
export function createSoundtrackStore({
  indexedDB = globalThis.indexedDB,
  estimate = () => globalThis.navigator?.storage?.estimate?.(),
} = {}) {
  let opening = null,
    closed = false;
  function open() {
    if (closed) return Promise.reject(new Error('Soundtrack store is closed.'));
    if (!indexedDB)
      return Promise.reject(new Error('This browser does not provide soundtrack storage.'));
    opening ??= new Promise((resolve, reject) => {
      let failed = false;
      const request = indexedDB.open(SOUNDTRACK_DATABASE, 1);
      request.onupgradeneeded = () => {
        request.result.createObjectStore('metadata');
        request.result.createObjectStore('audio');
      };
      request.onerror = () => {
        failed = true;
        opening = null;
        reject(request.error || new Error('Soundtrack storage could not open.'));
      };
      request.onblocked = () => {
        failed = true;
        opening = null;
        reject(new Error('Close older game tabs to open soundtrack storage.'));
      };
      request.onsuccess = () => {
        const db = request.result;
        if (failed || closed) {
          db.close();
          reject(new Error('Soundtrack store is closed.'));
          return;
        }
        db.onversionchange = () => {
          db.close();
          opening = null;
        };
        resolve(db);
      };
    });
    return opening;
  }
  async function transact(mode, body, signal) {
    throwIfSoundtrackAborted(signal);
    const db = await open();
    throwIfSoundtrackAborted(signal);
    if (closed) throw new Error('Soundtrack store is closed.');
    return new Promise((resolve, reject) => {
      const tx = db.transaction(['metadata', 'audio'], mode);
      let result,
        error = null,
        settled = false;
      const finish = (failure) => {
        if (settled) return;
        settled = true;
        signal?.removeEventListener('abort', cancel);
        if (failure) reject(failure);
        else resolve(result);
      };
      const fail = (e) => {
        error = e;
        try {
          tx.abort();
        } catch {
          finish(e);
        }
      };
      const cancel = () => {
        const previous = error;
        error = new DOMException('Soundtrack storage cancelled.', 'AbortError');
        try {
          tx.abort();
        } catch (abortError) {
          // A committed transaction cannot be cancelled. Its queued complete event
          // remains authoritative; never report a rollback that did not happen.
          if (abortError?.name === 'InvalidStateError') error = previous;
          else finish(abortError);
        }
      };
      tx.oncomplete = () => finish(error);
      tx.onerror = () => {
        error ??= tx.error;
      };
      tx.onabort = () => finish(error || tx.error || new Error('Soundtrack transaction failed.'));
      signal?.addEventListener('abort', cancel, { once: true });
      const meta = tx.objectStore('metadata'),
        audio = tx.objectStore('audio');
      let left = 3;
      const values = {};
      const read = (key, request) => {
        request.onsuccess = () => {
          values[key] = request.result;
          if (--left === 0) {
            try {
              throwIfSoundtrackAborted(signal);
              const current = metadata(values.meta),
                assets = ownSoundtrackAssets(
                  values.keys.map((sha256, i) => ({ sha256, blob: values.blobs[i] })),
                );
              result = body({ current, assets, meta, audio });
            } catch (e) {
              fail(e);
            }
          }
        };
      };
      try {
        read('meta', meta.get('library'));
        read('keys', audio.getAllKeys());
        read('blobs', audio.getAll());
        if (signal?.aborted) cancel();
      } catch (e) {
        fail(e);
      }
    });
  }
  async function read({ signal } = {}) {
    return transact(
      'readonly',
      ({ current, assets }) => Object.freeze({ ...current, assets }),
      signal,
    );
  }
  /** Commit only a completely verified/probed import, guarded against competing writers. */
  async function commit(prepared, { expectedGeneration, signal, otherManagedBytes = 0 } = {}) {
    required(
      isPreparedSoundtrackLibrary(prepared),
      'Commit requires a verified soundtrack import.',
    );
    required(
      integer(expectedGeneration) &&
        expectedGeneration < Number.MAX_SAFE_INTEGER &&
        integer(otherManagedBytes) &&
        otherManagedBytes <= SOUNDTRACK_LIMITS.managedBytes,
      'Invalid soundtrack generation or managed usage.',
    );
    required(
      prepared.library.format === SOUNDTRACK_FORMAT,
      'Catalogue audio requires the explicit DB5 capability.',
    );
    // Prepared metadata is frozen; Blob wrappers can still have shadow properties.
    // Re-own native payloads before any await or size accounting.
    const stagedAssets = ownSoundtrackAssets(prepared.assets);
    throwIfSoundtrackAborted(signal);
    const before = await read({ signal });
    required(
      before.generation === expectedGeneration,
      'Soundtrack changed in another operation. Reload it before saving.',
    );
    const reusable = new Set(),
      incoming = new Set(stagedAssets.map((a) => a.sha256));
    // Verify reusable stored originals sequentially, retaining Blobs instead of an album-sized buffer.
    for (const asset of before.assets) {
      if (!incoming.has(asset.sha256)) continue;
      try {
        const facts = await inspectMP3(asset.blob, { signal });
        if (facts.sha256 === asset.sha256) reusable.add(asset.sha256);
      } catch {
        throwIfSoundtrackAborted(signal);
      }
    }
    // An estimate is advisory. The transaction remains the authority for quota failures.
    let quota = null;
    try {
      const value = await estimate();
      if (
        Number.isFinite(value?.quota) &&
        Number.isFinite(value?.usage) &&
        value.quota >= 0 &&
        value.usage >= 0
      )
        quota = Math.max(0, value.quota - value.usage);
    } catch {}
    throwIfSoundtrackAborted(signal);
    return transact(
      'readwrite',
      ({ current, assets, meta, audio }) => {
        required(
          current.generation === expectedGeneration,
          'Soundtrack changed in another operation. Reload it before saving.',
        );
        required(
          canonicalJSON(assets.map((a) => [a.sha256, a.blob.size])) ===
            canonicalJSON(before.assets.map((a) => [a.sha256, a.blob.size])),
          'Soundtrack assets changed during staging.',
        );
        const next = new Map(stagedAssets.map((a) => [a.sha256, a.blob]));
        const newAssets = stagedAssets.filter((a) => !reusable.has(a.sha256));
        const newBytes = newAssets.reduce((n, a) => n + a.blob.size, 0),
          oldBytes = assets.reduce((n, a) => n + a.blob.size, 0);
        const row = { generation: current.generation + 1, library: prepared.library },
          stageMetadata = encodedBytes(row);
        required(
          otherManagedBytes + oldBytes + newBytes + stageMetadata + encodedBytes(current) <=
            SOUNDTRACK_LIMITS.managedBytes,
          'Committed media plus staging exceeds the 256 MiB managed budget.',
        );
        required(
          quota === null || newBytes + stageMetadata <= quota,
          'There is not enough reported storage space to stage this soundtrack.',
        );
        // Only new or corrupt originals are staged; verified same-hash payloads remain in place.
        for (const { sha256, blob } of newAssets) audio.put(blob, sha256);
        for (const { sha256 } of assets) if (!next.has(sha256)) audio.delete(sha256);
        meta.put(row, 'library');
        return Object.freeze(row);
      },
      signal,
    );
  }
  function close() {
    closed = true;
    opening?.then(
      (db) => db.close(),
      () => {},
    );
  }
  return Object.freeze({ read, commit, close });
}
