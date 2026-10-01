import { boundedJSON, canonicalJSON, required } from './data-json.mjs';
import {
  EXTERNAL_CHAPTER_LIMITS,
  abortExternalChapter,
  emptyExternalChapterIndex,
  externalChapterHash,
  isPreparedExternalChapter,
  validateExternalChapter,
  validateExternalChapterIndex,
} from './external-chapter.mjs';
import { createExternalChapterPointerStore } from './external-chapter-pointer.mjs';
import { createExternalChapterInstaller } from './external-chapter-install.mjs';
import { createExecutionCatalog } from './campaign-contexts.mjs';
import { createPictureIdentityCatalog } from './ui/picture-identity.mjs';
import { createStillMediaStore } from './media-store.mjs';
import { snapshotPictureChoice } from './presentation-pins.mjs';
import {
  PACK_LIMITS,
  emptyPackLibrary,
  exportPackLibrary,
  packLibrarySnapshot,
  importPackLibrary,
  resolvePackCampaign,
} from './packs.mjs';

const own = (value) =>
  boundedJSON(value, {
    maxBytes: PACK_LIMITS.libraryBytes + 1024 * 1024,
    maxString: PACK_LIMITS.libraryBytes,
    maxNodes: 900000,
    maxArray: 4096,
    maxDepth: 28,
  });
// Snapshot pack strings are already serialized. Do not JSON-encode their
// embedded originals a second time just to compare immutable string values.
const sameValue = (left, right) =>
  typeof left === 'string' || typeof right === 'string'
    ? left === right
    : canonicalJSON(left) === canonicalJSON(right);
const sameSnapshot = (left, right) =>
  left.backup === right.backup &&
  left.external === right.external &&
  left.locked === right.locked &&
  sameValue(left.packs, right.packs) &&
  sameValue(left.index, right.index);
const bytes = (value) =>
  new TextEncoder().encode(typeof value === 'string' ? value : JSON.stringify(value)).length;

/** Optional authority around the existing pilot. No host/catalog registration,
 * profile writes, backup interpretation, media ownership or eager DB4 opening.
 * Checked snapshots authenticate metadata; readiness separately verifies bytes.
 */
export function createExternalChapterHost({
  indexedDB = globalThis.indexedDB,
  profileKey,
  packsKey,
  storage = globalThis.localStorage,
  lockManager = globalThis.navigator?.locks,
  writer,
  getManagedStore,
  registeredEntries,
  knownDescriptors = [],
  decodeImage,
  timeoutMs = 15000,
} = {}) {
  required(typeof getManagedStore === 'function', 'Borrow the current shared DB4 manager lazily.');
  required(
    writer && typeof storage?.getItem === 'function' && typeof lockManager?.request === 'function',
    'Chapter authority needs the current writer, storage and Web Locks.',
  );
  required(
    Number.isSafeInteger(timeoutMs) && timeoutMs > 0 && timeoutMs <= 15000,
    'Invalid chapter authority timeout.',
  );
  required(Array.isArray(registeredEntries), 'Provide exact registered authored entries.');
  const bases = createExecutionCatalog(registeredEntries).entries.filter(
    (entry) => entry.difficulty === 'standard',
  );
  required(
    Array.isArray(knownDescriptors) &&
      knownDescriptors.length <= EXTERNAL_CHAPTER_LIMITS.catalogChoices,
    'Expected bounded trusted descriptors.',
  );
  const known = new Map();
  for (const candidate of knownDescriptors) {
    const descriptor = validateExternalChapter(candidate);
    required(!known.has(descriptor.id), 'Duplicate trusted external edition.');
    known.set(descriptor.id, descriptor);
  }
  const pointer = createExternalChapterPointerStore({ indexedDB, profileKey, packsKey }),
    keys = pointer.keys,
    snapshots = new WeakMap(),
    reviews = new WeakMap();
  let closed = false,
    active = null,
    media = null,
    mediaPending = null,
    catalogCache = null;
  function check(signal, writing = false) {
    abortExternalChapter(signal);
    required(!closed, 'Chapter host is closed.');
    if (writing) required(writer.writable === true, 'The profile writer lease is not held.');
  }
  function marker() {
    return storage.getItem(keys.lockKey) !== null;
  }
  async function operation(signal, writing, action, lock = true) {
    check(signal, writing);
    required(!active, 'Another chapter authority operation is running.');
    const controller = new AbortController();
    active = controller;
    const cancel = () => controller.abort();
    signal?.addEventListener('abort', cancel, { once: true });
    if (signal?.aborted) cancel();
    try {
      const work = () => {
        check(controller.signal, writing);
        return action(controller.signal);
      };
      return await (lock
        ? lockManager.request(keys.lockKey, { mode: 'exclusive', ifAvailable: true }, (held) => {
            required(held, 'Another backup or chapter operation owns the profile lock.');
            return work();
          })
        : work());
    } finally {
      signal?.removeEventListener('abort', cancel);
      if (active === controller) active = null;
    }
  }
  function waitForManager(signal) {
    return new Promise((resolve, reject) => {
      let settled = false;
      const finish = (error, value) => {
        if (settled) return;
        settled = true;
        clearTimeout(timer);
        signal?.removeEventListener('abort', cancel);
        if (error) reject(error);
        else resolve(value);
      };
      const cancel = () =>
        finish(new DOMException('Chapter manager acquisition cancelled.', 'AbortError'));
      const timer = setTimeout(
        () => finish(new Error('Chapter manager acquisition timed out.')),
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
  }
  async function borrowed(signal) {
    check(signal);
    if (!mediaPending)
      mediaPending = (async () => {
        const manager = await waitForManager(signal);
        check(signal);
        required(
          manager?.storyMedia === true && manager.richStillMedia === true,
          'Use the same current DB4 manager for audio, stills and stories.',
        );
        const store = createStillMediaStore({ managedStore: manager, decodeImage });
        media = { manager, store };
        return media;
      })().catch((error) => {
        mediaPending = null;
        throw error;
      });
    const result = await mediaPending;
    check(signal);
    return result;
  }
  async function open(signal) {
    check(signal);
    return new Promise((resolve, reject) => {
      let done = false;
      const finish = (error, db) => {
        if (done) {
          db?.close();
          return;
        }
        done = true;
        clearTimeout(timer);
        signal?.removeEventListener('abort', cancel);
        if (error) reject(error);
        else resolve(db);
      };
      const cancel = () => finish(new DOMException('Chapter authority cancelled.', 'AbortError'));
      const timer = setTimeout(
        () => finish(new Error('Chapter database open timed out.')),
        timeoutMs,
      );
      signal?.addEventListener('abort', cancel, { once: true });
      let request;
      try {
        request = indexedDB.open('revealline-mmm-assets-v1', 1);
      } catch (error) {
        finish(error);
        return;
      }
      request.onupgradeneeded = () => {
        if (done || closed || signal?.aborted) request.transaction.abort();
        else request.result.createObjectStore('assets');
      };
      request.onsuccess = () => {
        if (closed || signal?.aborted) {
          request.result.close();
          cancel();
        } else finish(null, request.result);
      };
      request.onerror = () => finish(request.error ?? new Error('Chapter database open failed.'));
      request.onblocked = () => finish(new Error('Close older asset database connections.'));
      if (signal?.aborted) cancel();
    });
  }
  // Read both journals and the exact pointer/index in ONE existing-assets transaction.
  // An ordinary mutation may change only the pack pointer, never either journal/index.
  async function raw(signal, mutation = null) {
    const db = await open(signal);
    try {
      check(signal, !!mutation);
      return await new Promise((resolve, reject) => {
        const tx = db.transaction('assets', mutation ? 'readwrite' : 'readonly'),
          store = tx.objectStore('assets');
        const values = {};
        let left = 4,
          result,
          failure;
        const fail = (error) => {
          failure = error;
          try {
            tx.abort();
          } catch {}
        };
        const cancel = () => fail(new DOMException('Chapter transaction cancelled.', 'AbortError'));
        const timer = setTimeout(
          () => fail(new Error('Chapter transaction timed out.')),
          timeoutMs,
        );
        const clean = () => {
          clearTimeout(timer);
          signal?.removeEventListener('abort', cancel);
        };
        signal?.addEventListener('abort', cancel, { once: true });
        tx.onabort = () => {
          clean();
          reject(failure ?? tx.error ?? new Error('Chapter transaction failed.'));
        };
        tx.onerror = () => {
          failure ??= tx.error;
        };
        tx.oncomplete = () => {
          clean();
          resolve(result);
        };
        for (const [name, key] of Object.entries({
          packs: keys.packsKey,
          index: keys.indexKey,
          journal: keys.journalKey,
          backup: keys.backupJournalKey,
        })) {
          const request = store.get(key);
          request.onsuccess = () => {
            try {
              values[name] = request.result ?? null;
              if (--left) return;
              check(signal, !!mutation);
              const backup = values.backup !== null,
                external = values.journal !== null,
                locked = marker();
              result = { packs: values.packs, index: values.index, backup, external, locked };
              if (mutation) {
                required(
                  !backup && !external && !locked,
                  'Recover pending backup/external state before changing packs.',
                );
                required(
                  sameSnapshot(result, mutation.before),
                  'Chapter snapshot changed; review again.',
                );
                if (values.packs !== mutation.after) store.put(mutation.after, keys.packsKey);
                result = { ...result, packs: mutation.after };
              }
            } catch (error) {
              fail(error);
            }
          };
        }
        if (signal?.aborted) cancel();
      });
    } finally {
      db.close();
    }
  }
  function clearState(state) {
    required(
      !state.backup && !state.external && !state.locked,
      'Recover pending backup/external state before adopting chapters.',
    );
  }
  async function current(snapshot, signal) {
    const state = snapshots.get(snapshot);
    required(state && snapshot.status === 'checked', 'Use this host’s checked chapter snapshot.');
    const now = await raw(signal);
    clearState(now);
    required(sameSnapshot(now, state.raw), 'Chapter snapshot changed; review again.');
    return state;
  }
  async function catalog(rawPacks, rawIndex, signal) {
    check(signal);
    const indexKey = rawIndex === null ? null : canonicalJSON(rawIndex);
    if (
      catalogCache &&
      typeof rawPacks === 'string' &&
      rawPacks === catalogCache.packText &&
      indexKey === catalogCache.indexKey
    )
      return catalogCache.content;
    const packs =
      rawPacks === null ? emptyPackLibrary() : await importPackLibrary(rawPacks, { decodeImage });
    check(signal);
    const index =
      rawIndex === null ? emptyExternalChapterIndex() : validateExternalChapterIndex(rawIndex);
    required(
      bytes(exportPackLibrary(packs)) + (rawIndex === null ? 0 : bytes(index)) <=
        PACK_LIMITS.libraryBytes + 1024 * 1024,
      'Imported packs and the separate official descriptor index exceed their storage budgets.',
    );
    for (const descriptor of known.values()) {
      if (packs.packs.some((pack) => pack.id === descriptor.id))
        required(
          index.chapters.some((entry) => entry.id === descriptor.id),
          'The known external edition needs its descriptor index; compact JSON alone is not install authority.',
        );
    }
    for (const descriptor of index.chapters) {
      const expected = known.get(descriptor.id);
      required(
        expected && canonicalJSON(expected) === canonicalJSON(descriptor),
        'Installed descriptor differs from the trusted external edition.',
      );
      const pack = packs.packs.find((entry) => entry.id === descriptor.id);
      required(
        pack &&
          bytes(JSON.stringify(pack)) === descriptor.pack.bytes &&
          (await externalChapterHash(JSON.stringify(pack))) === descriptor.pack.sha256,
        'External descriptor gameplay differs from the installed pack.',
      );
      check(signal);
      required(
        pack.format === 'xonix-pack.v5' &&
          pack.version === '1.0.0' &&
          pack.campaigns.length === 1 &&
          pack.campaigns[0].levels.length === 3 &&
          pack.themes.length === 1 &&
          pack.themes[0].id === descriptor.themeId &&
          pack.levelVisuals.length === 0 &&
          Object.keys(pack.visualOverrides).length === 0 &&
          pack.dependencies.length === 0,
        'External gameplay differs from the supported fresh-edition contract.',
      );
    }
    const entries = [
      ...bases,
      ...packs.packs.flatMap((pack) =>
        pack.campaigns.map((campaign) => resolvePackCampaign(pack, campaign.id)),
      ),
    ];
    const executions = createExecutionCatalog(entries);
    for (const descriptor of index.chapters)
      required(
        executions.select(descriptor.campaignKey, 'standard')?.sourcePackId === descriptor.id,
        'External authored owner differs from its descriptor.',
      );
    const usage = Object.freeze({
      packBytes: bytes(exportPackLibrary(packs)),
      indexBytes: rawIndex === null ? 0 : bytes(index),
      limit: PACK_LIMITS.libraryBytes,
    });
    const content = { packs, index, entries, executions, usage };
    catalogCache = { packText: exportPackLibrary(packs), indexKey, content };
    return content;
  }
  function closure(content, metadata) {
    const identityCatalog = createPictureIdentityCatalog({ entries: content.entries, metadata });
    const pins = new Map();
    for (const descriptor of content.index.chapters) {
      const chapterPins = descriptor.originals.map((original) => {
        const identity = {
          baseCampaignKey: descriptor.campaignKey,
          levelId: original.levelId,
          levelRevision: original.levelRevision,
          themeId: descriptor.themeId,
        };
        required(
          identityCatalog.has(identity),
          'External poster owner differs from the retained authored map.',
        );
        const presentation = metadata.document.library.presentations.find(
          (item) => item.id === original.presentationId && item.revision === 1,
        );
        const asset = metadata.document.library.assets.find((item) => item.id === original.assetId);
        required(
          presentation &&
            canonicalJSON(presentation.identity) === canonicalJSON(identity) &&
            presentation.poster.assetId === original.assetId &&
            presentation.poster.fit === 'contain' &&
            presentation.poster.sampling === 'nearest' &&
            presentation.story === null,
          'External authored presentation is missing or differs. Restore its exact originals.',
        );
        required(
          asset &&
            ['sha256', 'bytes', 'mime', 'width', 'height'].every(
              (key) => asset[key] === original[key],
            ),
          'External original metadata is missing or differs.',
        );
        return snapshotPictureChoice({
          kind: 'still',
          identity,
          presentationId: original.presentationId,
          presentationRevision: 1,
          assetId: original.assetId,
          sha256: original.sha256,
        });
      });
      pins.set(descriptor.id, chapterPins);
    }
    return { identityCatalog, pins };
  }
  async function inspectInside(signal) {
    const before = await raw(signal);
    if (before.backup || before.external || before.locked)
      return Object.freeze({
        status: 'recovery-required',
        reason:
          before.backup && before.external
            ? 'mixed-journals'
            : before.backup || before.locked
              ? 'backup-recovery'
              : 'external-recovery',
      });
    const content = await catalog(before.packs, before.index, signal);
    if (content.index.chapters.length) {
      const { store } = await borrowed(signal);
      const { metadata } = await store.readPresentationMetadata({ signal });
      closure(content, metadata);
    }
    check(signal);
    const after = await raw(signal);
    required(sameSnapshot(before, after), 'Chapter snapshot changed during inspection.');
    const result = Object.freeze({
      status: 'checked',
      packs: content.packs,
      index: content.index,
      executionCatalog: content.executions,
      usage: content.usage,
    });
    snapshots.set(result, { raw: own(before), content });
    return result;
  }
  async function readyInside(snapshot, id, signal) {
    const state = await current(snapshot, signal);
    required(
      state.content.index.chapters.some((entry) => entry.id === id),
      'This installed edition has no external descriptor.',
    );
    const { store } = await borrowed(signal),
      { metadata } = await store.readPresentationMetadata({ signal });
    const proof = closure(state.content, metadata);
    for (const pin of proof.pins.get(id))
      await store.readAsset(metadata, pin.assetId, { signal, decodeImage });
    check(signal);
    await current(snapshot, signal);
    const next = await store.readPresentationMetadata({ signal });
    required(
      next.metadata.generation === metadata.generation,
      'Media changed during chapter readiness; retry.',
    );
    await current(snapshot, signal);
    return { ...proof, metadata, store };
  }
  async function installOrRecover(prepared, signal, recover, pictureReview) {
    required(isPreparedExternalChapter(prepared), 'Prepare exact descriptor and payloads first.');
    const expected = known.get(prepared.descriptor.id);
    required(
      expected && canonicalJSON(expected) === canonicalJSON(prepared.descriptor),
      'Prepare an explicitly registered trusted external edition.',
    );
    return operation(
      signal,
      true,
      async (activeSignal) => {
        // Deliberately outside our lock: the pilot acquires that same lock itself.
        const state = await raw(activeSignal);
        required(
          !state.backup && !state.locked,
          state.external
            ? 'Mixed backup/external recovery must be resolved explicitly.'
            : 'Recover the backup before installing chapters.',
        );
        required(
          recover ? state.external : !state.external,
          recover
            ? 'No external installation needs recovery.'
            : 'Recover the pending external installation first.',
        );
        const { manager } = await borrowed(activeSignal);
        const installer = createExternalChapterInstaller({
          pointerStore: pointer,
          managedStore: manager,
          writer,
          lockManager,
          storage,
          registeredEntries: bases,
          decodeImage,
        });
        try {
          return await installer[recover ? 'recover' : 'install'](prepared, {
            signal: activeSignal,
            ...(recover ? {} : { pictureReview }),
          });
        } finally {
          installer.close();
        }
      },
      false,
    );
  }
  return Object.freeze({
    keys,
    inspect: ({ signal } = {}) => operation(signal, false, inspectInside),
    withCurrent(snapshot, work, { signal } = {}) {
      required(typeof work === 'function', 'A guarded catalog operation is required.');
      return operation(signal, false, async (s) => {
        await current(snapshot, s);
        // The caller holds its writer lease; this operation owns the backup lock.
        // A completed callback may already have committed: never label a later
        // cancellation as rollback by checking again after durable completion.
        return work(snapshot);
      });
    },
    readiness: (snapshot, id, { signal } = {}) =>
      operation(signal, false, async (s) => {
        const result = await readyInside(snapshot, id, s);
        return Object.freeze({
          status: 'ready',
          pins: Object.freeze(result.pins.get(id)),
          metadata: result.metadata,
          store: result.store,
        });
      }),
    // Fresh authored default only. This never accepts/rebinds a saved/earned pin.
    authoredPicture(snapshot, request, { signal } = {}) {
      const owned = boundedJSON(request, { maxBytes: 2048, maxNodes: 16 });
      return operation(signal, false, async (s) => {
        const state = await current(snapshot, s);
        const descriptor = state.content.index.chapters.find(
          (entry) =>
            state.content.executions.select(entry.campaignKey, 'standard') &&
            state.content.executions.entries.some(
              (execution) =>
                execution.executionKey === owned.executionKey &&
                execution.baseCampaignKey === entry.campaignKey,
            ),
        );
        required(descriptor, 'This execution has no installed external authored original.');
        const proof = await readyInside(snapshot, descriptor.id, s);
        const identity = proof.identityCatalog.resolve(owned);
        const pin = proof.pins
          .get(descriptor.id)
          .find((item) => canonicalJSON(item.identity) === canonicalJSON(identity));
        required(pin, 'The authored original does not match this exact execution/map/world.');
        return Object.freeze({ pin, metadata: proof.metadata, store: proof.store });
      });
    },
    prepareMutation(snapshot, nextPacks, { signal } = {}) {
      const owned = own(packLibrarySnapshot(nextPacks));
      return operation(signal, true, async (s) => {
        const before = await current(snapshot, s);
        const proposed = await catalog(owned, before.raw.index, s);
        // This first host adapter does not remove/change the immutable active index.
        await current(snapshot, s);
        const review = Object.freeze({ packs: proposed.packs, index: proposed.index });
        reviews.set(review, {
          snapshot,
          before: before.raw,
          after: exportPackLibrary(proposed.packs),
        });
        return review;
      });
    },
    commitMutation(review, { signal } = {}) {
      const proposal = reviews.get(review);
      required(proposal, 'Use a fresh single-use chapter mutation review.');
      reviews.delete(review);
      return operation(signal, true, async (s) => {
        await current(proposal.snapshot, s);
        // Recheck retained metadata before publication without opening media for ordinary packs.
        const content = await catalog(proposal.after, proposal.before.index, s);
        if (content.index.chapters.length) {
          const { store } = await borrowed(s);
          closure(content, (await store.readPresentationMetadata({ signal: s })).metadata);
        }
        const committed = await raw(s, { before: proposal.before, after: proposal.after });
        return Object.freeze({
          status: 'committed',
          packs: content.packs,
          index: content.index,
          packLibrary: committed.packs,
        });
      });
    },
    install: (prepared, { signal, pictureReview } = {}) =>
      installOrRecover(prepared, signal, false, pictureReview),
    recover: (prepared, { signal } = {}) => installOrRecover(prepared, signal, true),
    close() {
      if (closed) return;
      closed = true;
      catalogCache = null;
      active?.abort();
      media?.store.close();
      pointer.close();
    },
  });
}
