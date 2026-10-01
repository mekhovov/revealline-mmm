import { boundedJSON, canonicalJSON, exactKeys, required } from './data-json.mjs';
import { abortExternalChapter } from './external-chapter.mjs';
import { createExternalRecoveryCatalog } from './external-recovery-catalog.mjs';
import { createStillMediaStore } from './media-store.mjs';
import { PACK_LIMITS } from './packs.mjs';
import { createExternalBackupAssets } from './external-backup-assets.mjs';
import { LIBRARY_LIMITS } from './library.mjs';
import { SESSION_IMPORT_BYTES } from './sessions.mjs';

const own = (value) =>
  boundedJSON(value, {
    maxBytes: PACK_LIMITS.libraryBytes + LIBRARY_LIMITS.maxBytes + SESSION_IMPORT_BYTES + 16384,
    maxString: 64 * 1024 * 1024,
    maxNodes: 3400000,
    maxDepth: 32,
    maxArray: 500000,
  });
const equal = (a, b) => canonicalJSON(a) === canonicalJSON(b);
const companions = new WeakSet();
export const isExternalChapterBackup = (value) => companions.has(value);

/** Optional descriptor-preserving backup capability. No media writes, pack install,
 * new store/schema, default selection or runtime/profile adoption. */
export function createExternalChapterBackup({
  indexedDB = globalThis.indexedDB,
  storage = globalThis.localStorage,
  profileKey,
  packsKey,
  writer,
  lockManager = globalThis.navigator?.locks,
  getManagedStore,
  registeredEntries = [],
  knownDescriptors = [],
  decodeImage,
  timeoutMs = 15000,
} = {}) {
  required(typeof getManagedStore === 'function', 'Borrow the same current DB4 media manager.');
  required(
    typeof lockManager?.request === 'function',
    'External backup snapshots require Web Locks.',
  );
  const { catalog, closure } = createExternalRecoveryCatalog({
    registeredEntries,
    knownDescriptors,
    decodeImage,
    check: (signal) => check(signal),
  });
  const assets = createExternalBackupAssets({
    indexedDB,
    storage,
    profileKey,
    packsKey,
    writer,
    timeoutMs,
  });
  const keys = assets.keys;
  let closed = false,
    store = null;
  const check = (signal) => {
    abortExternalChapter(signal);
    required(!closed, 'External backup companion is closed.');
  };
  const clear = (state, lockKey = keys.lockKey) =>
    required(
      state.backup === null && state.external === null && storage.getItem(lockKey) === null,
      'Recover pending backup/external state before preparing game data.',
    );
  async function borrowed(signal) {
    check(signal);
    if (store) return store;
    const manager = await new Promise((resolve, reject) => {
      let done = false;
      const finish = (error, value) => {
        if (done) return;
        done = true;
        clearTimeout(timer);
        signal?.removeEventListener('abort', cancel);
        if (error) reject(error);
        else resolve(value);
      };
      const cancel = () =>
        finish(new DOMException('Backup media acquisition cancelled.', 'AbortError'));
      const timer = setTimeout(
        () => finish(new Error('Backup media acquisition timed out.')),
        timeoutMs,
      );
      signal?.addEventListener('abort', cancel, { once: true });
      Promise.resolve()
        .then(() => {
          check(signal);
          return getManagedStore();
        })
        .then(
          (value) => finish(null, value),
          (error) => finish(error),
        );
      if (signal?.aborted) cancel();
    });
    check(signal);
    required(
      manager?.storyMedia === true && manager.richStillMedia === true,
      'Use the shared DB4 manager.',
    );
    store ??= createStillMediaStore({ managedStore: manager, decodeImage });
    return store;
  }

  async function verify(prepared, { signal } = {}) {
    check(signal);
    required(
      writer?.writable === true,
      'Hold the current profile writer lease before backup verification.',
    );
    const before = await assets.snapshot({ signal });
    clear(before);
    required(
      Object.hasOwn(prepared, 'externalChapters') || before.index === null,
      'Replacing indexed chapters requires explicit backup.v2, including an explicit empty index.',
    );
    const content = await catalog(prepared.packs, prepared.externalChapters ?? null, signal);
    let metadata = null,
      media = null;
    if (content.index.chapters.length) {
      media = await borrowed(signal);
      ({ metadata } = await media.readPresentationMetadata({ signal }));
      const proof = closure(content, metadata);
      for (const pins of proof.pins.values())
        for (const pin of pins)
          await media.readAsset(metadata, pin.assetId, { signal, decodeImage });
    }
    const assertCurrent = async ({ ownedToken = null } = {}) => {
      check(signal);
      if (metadata)
        required(
          (await media.readPresentationMetadata({ signal })).metadata.generation ===
            metadata.generation,
          'Original media changed during backup preparation; review again.',
        );
      const after = await assets.snapshot({ signal });
      required(
        after.external === null &&
          (ownedToken === null ? after.backup === null : after.backup?.token === ownedToken),
        'Backup recovery state changed.',
      );
      required(
        equal(after.packs, before.packs) && equal(after.index, before.index),
        'Backup target assets changed during verification.',
      );
      required(storage.getItem(keys.lockKey) === ownedToken, 'Backup lock ownership changed.');
    };
    await assertCurrent();
    return { before, index: prepared.externalChapters ?? null, assertCurrent };
  }
  const api = Object.freeze({
    assets,
    async assertSupported({ kind = 'backup', signal } = {}) {
      required(['backup', 'packs'].includes(kind), 'Choose a supported backup action.');
      const state = await assets.snapshot({ signal });
      clear(state);
      const content = await catalog(state.packs, state.index, signal);
      required(
        kind !== 'packs' || content.index.chapters.length === 0,
        'External chapters need game-data backup with their descriptor index and separate .rlmedia originals. Pack-only export would omit required data.',
      );
    },
    prepareExternalChapters: async (packs, index, { signal } = {}) => {
      await catalog(packs, index, signal);
    },
    verify,
    async snapshot(getContents, { signal } = {}) {
      required(
        typeof getContents === 'function',
        'Snapshot the paused current host state under its backup lock.',
      );
      return lockManager.request(
        keys.lockKey,
        { mode: 'exclusive', ifAvailable: true },
        async (held) => {
          required(held, 'Another operation owns the backup snapshot lock.');
          check(signal);
          const before = await assets.snapshot({ signal });
          clear(before);
          const contents = own(getContents());
          exactKeys(contents, ['library', 'packs', 'session'], 'current backup contents');
          const content = await catalog(before.packs, before.index, signal);
          required(
            equal(contents.packs, content.packs),
            'Current and persisted installed packs differ.',
          );
          check(signal);
          const after = await assets.snapshot({ signal });
          clear(after);
          required(
            equal(before, after) && equal(contents, getContents()),
            'Current backup snapshot changed.',
          );
          // Explicit empty index makes later Undo a deliberate v2 replacement,
          // without guessing whether an old v1 file intended to remove chapters.
          return { ...contents, externalChapters: content.index };
        },
      );
    },
    async readExternalSnapshot(source, { signal } = {}) {
      check(signal);
      const reader = createExternalBackupAssets({
        indexedDB,
        storage,
        profileKey: source.profileKey,
        packsKey: source.packsKey,
        timeoutMs,
      });
      try {
        const before = await reader.snapshot({ signal });
        clear(before, source.lockKey);
        await catalog(before.packs, before.index, signal);
        const after = await reader.snapshot({ signal });
        clear(after, source.lockKey);
        required(equal(before, after), 'Earlier chapter assets changed during transfer.');
        return own(before);
      } finally {
        reader.close();
      }
    },
    close() {
      closed = true;
      store?.close();
      assets.close();
    },
  });
  companions.add(api);
  return api;
}
