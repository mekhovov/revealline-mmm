import { canonicalJSON, exactKeys, required } from './data-json.mjs';
import { ownProfileJSON, freezeProfileData } from './profile-channel-json.mjs';
import {
  emptySoundtrackLibrary,
  resolveSoundtrackLibrary,
  SOUNDTRACK_LIMITS,
} from './soundtrack.mjs';
import {
  emptyGenericMediaLibrary,
  validateGenericMediaLibrary,
  isStoredStillMedia,
  validateStoredStillMedia,
  storedStillHashes,
} from './media-storage-record.mjs';
import {
  emptyStoredStories,
  validateStoredStories,
  storedStoryMetadataBytes,
  storedStoryHashes,
} from './story-storage-record.mjs';
import { MANAGED_MEDIA_LIMITS, MANAGED_MEDIA_DATABASE } from './managed-media-store.mjs';

const DATABASE = MANAGED_MEDIA_DATABASE;
const BASE_STORES = [
  'metadata',
  'audio',
  'mediaRecords',
  'mediaBlobs',
  'managedState',
  'reservations',
];
const storesFor = (version) =>
  [2, 3, 4].includes(version) ? [...BASE_STORES, ...(version === 4 ? ['storyRecords'] : [])] : null;
const nativeSize = Object.getOwnPropertyDescriptor(Blob.prototype, 'size').get;
const integer = (n) => Number.isSafeInteger(n) && n >= 0 && n < Number.MAX_SAFE_INTEGER;
const encoded = (value) => new TextEncoder().encode(canonicalJSON(value)).byteLength;
const hash = (value) => typeof value === 'string' && /^[a-f0-9]{64}$/.test(value);

function domain(entry, kind, version, still) {
  const empty =
    kind === 'audio'
      ? emptySoundtrackLibrary
      : kind === 'media'
        ? emptyGenericMediaLibrary
        : emptyStoredStories;
  if (!entry.present) return { generation: 0, library: empty() };
  const value = ownProfileJSON(
    entry.value,
    (kind === 'audio' ? SOUNDTRACK_LIMITS.metadataBytes : MANAGED_MEDIA_LIMITS.metadataBytes) +
      1024,
  );
  exactKeys(value, ['generation', 'library'], 'recovery media domain');
  required(integer(value.generation), 'Invalid recovery media generation.');
  const library =
    kind === 'audio'
      ? resolveSoundtrackLibrary(value.library)
      : kind === 'story'
        ? validateStoredStories(value.library, still)
        : version >= 3 && isStoredStillMedia(value.library)
          ? validateStoredStillMedia(value.library)
          : validateGenericMediaLibrary(value.library);
  return { generation: value.generation, library };
}

function ownedSnapshot({ version, rows }, allowUnavailable = false) {
  const audio = domain(rows.metadata, 'audio', version);
  const media = domain(rows.mediaRecords, 'media', version);
  const story = version === 4 ? domain(rows.storyRecords, 'story', version, media.library) : null;
  if (story)
    required(
      encoded(media.library) + storedStoryMetadataBytes(story.library) <=
        MANAGED_MEDIA_LIMITS.metadataBytes,
      'Still/story metadata exceeds its existing shared bound.',
    );
  let ledger = null;
  if (rows.managedState.present) {
    ledger = ownProfileJSON(rows.managedState.value, 1024);
    exactKeys(ledger, ['format', 'revision', 'usedBytes'], 'recovery managed ledger');
    required(
      ledger.format === 'revealline-managed-state.v1' &&
        integer(ledger.revision) &&
        integer(ledger.usedBytes) &&
        ledger.usedBytes <= MANAGED_MEDIA_LIMITS.bytes,
      'Unsupported recovery managed ledger.',
    );
  }
  required(
    rows.reservations.length === 0,
    'Pending shared-media reservations prevent a stable recovery snapshot; no cleanup was attempted.',
  );
  const seen = new Set(),
    files = [];
  let blobBytes = 0;
  for (const store of ['audio', 'mediaBlobs']) {
    const { keys, blobs } = rows[store];
    required(
      keys.length === blobs.length && keys.length <= MANAGED_MEDIA_LIMITS.assets,
      'Recovery media keys and bodies differ.',
    );
    for (let i = 0; i < keys.length; i++) {
      const sha256 = keys[i];
      required(hash(sha256) && !seen.has(sha256), 'Invalid or duplicate physical media hash.');
      const bytes = nativeSize.call(blobs[i]);
      required(
        integer(bytes) && bytes <= MANAGED_MEDIA_LIMITS.sourceBytes,
        'Recovery original exceeds its existing source bound.',
      );
      blobBytes += bytes;
      required(
        blobBytes <= MANAGED_MEDIA_LIMITS.bytes && seen.size < MANAGED_MEDIA_LIMITS.assets,
        'Recovery media exceeds the shared budget.',
      );
      seen.add(sha256);
      files.push(
        Object.freeze({
          store,
          sha256,
          bytes,
          blob: Blob.prototype.slice.call(blobs[i], 0, bytes),
        }),
      );
    }
  }
  const sizes = new Map(files.map((file) => [file.sha256, file.bytes]));
  const declaredAssets = [
    ...audio.library.tracks.map((track) => track.asset),
    ...(isStoredStillMedia(media.library) ? media.library.library.assets : []),
    ...(story
      ? story.library.stories
          .map((item) => item.source)
          .filter((item) => story.library.originals.includes(item.sha256))
      : []),
  ];
  const diagnostics = [],
    declaredSizes = new Map();
  for (const asset of declaredAssets) {
    if (allowUnavailable) {
      required(
        !declaredSizes.has(asset.sha256) || declaredSizes.get(asset.sha256) === asset.bytes,
        'Referenced metadata disagrees about an original byte length.',
      );
      declaredSizes.set(asset.sha256, asset.bytes);
    }
    if (sizes.get(asset.sha256) !== asset.bytes) {
      required(allowUnavailable, 'A referenced original is absent or its byte length differs.');
      if (sizes.has(asset.sha256))
        diagnostics.push({
          sha256: asset.sha256,
          availability: 'length-mismatch',
          expectedBytes: asset.bytes,
          actualBytes: sizes.get(asset.sha256),
        });
    }
  }
  const requiredHashes = new Set([
    ...audio.library.tracks.map((track) => track.asset.sha256),
    ...(isStoredStillMedia(media.library)
      ? storedStillHashes(media.library)
      : media.library.items.map((item) => item.sha256)),
    ...(story ? storedStoryHashes(story.library) : []),
  ]);
  for (const sha256 of requiredHashes)
    if (!seen.has(sha256)) {
      required(
        allowUnavailable,
        'A referenced original is absent; raw profile diagnostics remain available.',
      );
      diagnostics.push({ sha256, availability: 'missing' });
    }
  const usedBytes =
    blobBytes + encoded(audio) + encoded(media) + (story ? encoded(story) : 0) + 4096;
  required(
    usedBytes <= MANAGED_MEDIA_LIMITS.bytes,
    'Recovery snapshot exceeds the shared managed budget.',
  );
  const marker = freezeProfileData({
    version,
    ledger,
    audio,
    media,
    story,
    presence: Object.fromEntries(
      ['metadata', 'mediaRecords', 'managedState', ...(version === 4 ? ['storyRecords'] : [])].map(
        (key) => [key, rows[key].present],
      ),
    ),
    files: files.map(({ store, sha256, bytes }) => ({ store, sha256, bytes })),
    usedBytes,
  });
  return Object.freeze({
    marker,
    files: Object.freeze(files),
    originalBytesVerified: false,
    ...(allowUnavailable ? { diagnostics: freezeProfileData(diagnostics) } : {}),
  });
}

const abort = (signal) => {
  if (signal?.aborted) throw signal.reason ?? new DOMException('Cancelled.', 'AbortError');
};

/** Open only an existing understood shared store; never create, upgrade, reserve or write. */
export function createProfileSharedMediaReader({
  indexedDB = globalThis.indexedDB,
  timeoutMs = 15000,
} = {}) {
  if (!Number.isInteger(timeoutMs) || timeoutMs < 1 || timeoutMs > 15000)
    throw new TypeError('Invalid recovery media deadline.');
  let closed = false;
  const pending = new Set();
  const check = (signal) => {
    abort(signal);
    if (closed) throw new Error('Recovery media reader is closed.');
  };
  function open(signal) {
    check(signal);
    if (typeof indexedDB?.open !== 'function')
      throw new Error('Recovery media storage is unavailable.');
    return new Promise((resolve, reject) => {
      let settled = false,
        absent = false,
        request;
      const finish = (error, db = null) => {
        if (settled) {
          db?.close();
          return;
        }
        settled = true;
        clearTimeout(timer);
        signal?.removeEventListener('abort', cancel);
        pending.delete(cancel);
        if (error) reject(error);
        else resolve(db);
      };
      const cancel = () => {
        try {
          request?.transaction?.abort();
        } catch {}
        finish(new DOMException('Recovery media open cancelled.', 'AbortError'));
      };
      const timer = setTimeout(
        () => finish(new Error('Recovery media open timed out.')),
        timeoutMs,
      );
      signal?.addEventListener('abort', cancel, { once: true });
      pending.add(cancel);
      try {
        // No requested version: any creation upgrade is explicitly aborted below.
        request = indexedDB.open(DATABASE);
        request.onupgradeneeded = (event) => {
          absent = event.oldVersion === 0;
          request.transaction.abort();
        };
        request.onerror = () =>
          finish(absent ? null : (request.error ?? new Error('Recovery media could not open.')));
        request.onblocked = () => finish(new Error('Recovery media are busy in another tab.'));
        request.onsuccess = () => {
          const db = request.result;
          if (settled || closed || signal?.aborted) {
            db.close();
            cancel();
            return;
          }
          const expected = storesFor(db.version);
          if (
            !expected ||
            JSON.stringify([...db.objectStoreNames].sort()) !== JSON.stringify([...expected].sort())
          ) {
            db.close();
            finish(new Error('This recovery media database version is unsupported.'));
          } else finish(null, db);
        };
      } catch (error) {
        finish(error);
      }
      if (signal?.aborted) cancel();
    });
  }
  async function read(signal, schedule) {
    check(signal);
    const db = await open(signal);
    try {
      check(signal);
      if (!db) return Object.freeze({ state: 'absent' });
      return await new Promise((resolve, reject) => {
        const tx = db.transaction(storesFor(db.version), 'readonly');
        let failure, result;
        const fail = (error) => {
          failure ??= error;
          try {
            tx.abort();
          } catch {}
        };
        const cancel = () => fail(new DOMException('Recovery media read cancelled.', 'AbortError'));
        const timer = setTimeout(
          () => fail(new Error('Recovery media read timed out.')),
          timeoutMs,
        );
        const clean = () => {
          clearTimeout(timer);
          signal?.removeEventListener('abort', cancel);
          pending.delete(cancel);
        };
        pending.add(cancel);
        signal?.addEventListener('abort', cancel, { once: true });
        db.onversionchange = () => {
          cancel();
          db.close();
        };
        tx.onabort = () => {
          clean();
          reject(failure ?? tx.error ?? new Error('Recovery media read aborted.'));
        };
        tx.onerror = () => {
          failure ??= tx.error;
        };
        tx.oncomplete = () => {
          clean();
          if (failure || closed || signal?.aborted)
            reject(failure ?? new DOMException('Cancelled.', 'AbortError'));
          else resolve(Object.freeze({ state: 'present', value: result }));
        };
        try {
          schedule(
            tx,
            db.version,
            (value) => {
              result = { version: db.version, rows: value };
            },
            fail,
          );
        } catch (error) {
          fail(error);
        }
        if (signal?.aborted) cancel();
      });
    } finally {
      db?.close();
    }
  }
  async function capture(signal, allowUnavailable) {
    const captured = await read(signal, (tx, version, done, fail) => {
      const values = {},
        work = [];
      for (const name of [
        'metadata',
        'mediaRecords',
        'managedState',
        ...(version === 4 ? ['storyRecords'] : []),
      ]) {
        work.push([name, 'row']);
      }
      for (const name of ['audio', 'mediaBlobs']) work.push([name, 'files']);
      work.push(['reservations', 'reservations']);
      let pending = work.length;
      const ready = () => {
        if (--pending === 0) done(values);
      };
      for (const [name, kind] of work) {
        const store = tx.objectStore(name);
        if (kind === 'row') {
          const keys = store.getAllKeys(undefined, 2),
            value = store.get(name === 'managedState' ? 'ledger' : 'library');
          let remaining = 2,
            found,
            data;
          const finish = () => {
            if (--remaining) return;
            values[name] = { present: found.length === 1, value: data };
            ready();
          };
          keys.onsuccess = () => {
            found = keys.result;
            if (
              !Array.isArray(found) ||
              found.length > 1 ||
              (found.length === 1 && found[0] !== (name === 'managedState' ? 'ledger' : 'library'))
            ) {
              fail(new Error('Unknown recovery metadata keys.'));
              return;
            }
            finish();
          };
          value.onsuccess = () => {
            data = value.result;
            finish();
          };
        } else if (kind === 'files') {
          const keys = store.getAllKeys(undefined, MANAGED_MEDIA_LIMITS.assets + 1),
            blobs = store.getAll(undefined, MANAGED_MEDIA_LIMITS.assets + 1);
          let remaining = 2,
            names,
            data;
          const finish = () => {
            if (--remaining) return;
            values[name] = { keys: names, blobs: data };
            ready();
          };
          keys.onsuccess = () => {
            names = keys.result;
            if (!Array.isArray(names) || names.length > MANAGED_MEDIA_LIMITS.assets) {
              fail(new Error('Too many recovery media keys.'));
              return;
            }
            finish();
          };
          blobs.onsuccess = () => {
            data = blobs.result;
            if (!Array.isArray(data) || data.length > MANAGED_MEDIA_LIMITS.assets) {
              fail(new Error('Too many recovery media bodies.'));
              return;
            }
            finish();
          };
        } else {
          const request = store.getAll(undefined, MANAGED_MEDIA_LIMITS.reservations + 1);
          request.onsuccess = () => {
            values[name] = request.result;
            if (
              !Array.isArray(request.result) ||
              request.result.length > MANAGED_MEDIA_LIMITS.reservations
            ) {
              fail(new Error('Invalid recovery reservations.'));
              return;
            }
            ready();
          };
        }
      }
    });
    check(signal);
    if (captured.state === 'absent') return captured;
    return Object.freeze({
      state: 'present',
      value: ownedSnapshot(captured.value, allowUnavailable),
    });
  }
  return Object.freeze({
    snapshot({ signal } = {}) {
      return capture(signal, false);
    },
    // Metadata remains strict; only referenced body availability becomes diagnostic.
    originalSnapshot({ signal } = {}) {
      return capture(signal, true);
    },
    close() {
      closed = true;
      for (const cancel of [...pending]) cancel();
    },
  });
}
