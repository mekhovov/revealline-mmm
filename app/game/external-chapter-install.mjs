import { localOfficialChapter } from './official-chapter-source.mjs';
import { boundedJSON, canonicalJSON, exactKeys, required } from './data-json.mjs';
import {
  emptyPackLibrary,
  importPackLibrary,
  installPack,
  exportPackLibrary,
  resolvePackCampaign,
  PACK_LIMITS,
} from './packs.mjs';
import { createExecutionCatalog } from './campaign-contexts.mjs';
import { createStillMediaStore } from './media-store.mjs';
import { prepareMediaBundleRestore } from './media-bundle.mjs';
import {
  validateExternalChapter,
  validateExternalChapterIndex,
  emptyExternalChapterIndex,
  isPreparedExternalChapter,
  abortExternalChapter,
  externalChapterHash,
} from './external-chapter.mjs';

export const EXTERNAL_INSTALL_JOURNAL_FORMAT = 'revealline-external-chapter-install.v1';
export const RETAINED_PICTURE_JOURNAL_FORMAT = 'revealline-external-chapter-install.v2';
const pictureReviews = new WeakMap();
export const isRetainedPictureReview = (value) => pictureReviews.has(value);
const hash = (v) => typeof v === 'string' && /^[a-f0-9]{64}$/.test(v);
const digest = (v) => externalChapterHash(canonicalJSON(v));
const exact = (v, keys, label) => {
  exactKeys(v, keys, label);
  required(
    keys.every((k) => Object.hasOwn(v, k)),
    `${label} has missing fields.`,
  );
};
function journal(candidate, keys) {
  const j = boundedJSON(candidate, {
    maxBytes: PACK_LIMITS.libraryBytes * 2 + 1024 * 1024,
    maxString: PACK_LIMITS.libraryBytes,
    maxNodes: 900000,
    maxArray: 4096,
    maxDepth: 28,
  });
  exact(
    j,
    [
      'format',
      'token',
      'profileKey',
      'packsKey',
      'phase',
      'descriptor',
      'before',
      'after',
      'beforeIndex',
      'afterIndex',
      'media',
      ...(j.format === RETAINED_PICTURE_JOURNAL_FORMAT ? ['assignmentPolicy'] : []),
    ],
    'Chapter install journal',
  );
  required(
    (j.format === EXTERNAL_INSTALL_JOURNAL_FORMAT ||
      (j.format === RETAINED_PICTURE_JOURNAL_FORMAT &&
        j.assignmentPolicy === 'preserve-retained')) &&
      typeof j.token === 'string' &&
      /^[a-f0-9-]{36}$/.test(j.token) &&
      j.profileKey === keys.profileKey &&
      j.packsKey === keys.packsKey &&
      ['prepared', 'media-committed', 'published'].includes(j.phase),
    'Foreign or invalid chapter journal.',
  );
  validateExternalChapter(j.descriptor);
  if (j.beforeIndex !== null) validateExternalChapterIndex(j.beforeIndex);
  validateExternalChapterIndex(j.afterIndex);
  exact(j.media, ['generation', 'beforeSha256', 'afterSha256'], 'Journal media');
  required(
    Number.isSafeInteger(j.media.generation) &&
      j.media.generation >= 0 &&
      j.media.generation < Number.MAX_SAFE_INTEGER &&
      hash(j.media.beforeSha256) &&
      hash(j.media.afterSha256),
    'Invalid journal media authority.',
  );
  required(
    (j.before === null || typeof j.before === 'string' || typeof j.before === 'object') &&
      typeof j.after === 'string',
    'Invalid journal pack pointers.',
  );
  return j;
}
/** Cooperative, recoverable publication across two existing DBs, not one global
 * transaction. A future host MUST gate startup/reconcile/launch/backup on this
 * journal. This core never adopts a catalog, resumes a run or migrates old packs.
 */
export function createExternalChapterInstaller({
  pointerStore,
  managedStore,
  writer,
  lockManager,
  storage,
  registeredEntries,
  decodeImage,
} = {}) {
  required(
    pointerStore?.keys &&
      typeof pointerStore.snapshot === 'function' &&
      typeof pointerStore.compareAndSwap === 'function',
    'Use a chapter pointer CAS store.',
  );
  required(
    managedStore?.richStillMedia === true &&
      typeof managedStore.reserve === 'function' &&
      typeof managedStore.release === 'function',
    'Borrow the same compatible managed still manager.',
  );
  required(
    writer && typeof lockManager?.request === 'function' && typeof storage?.getItem === 'function',
    'Installation needs the actual writer lease and Web Locks.',
  );
  required(
    Array.isArray(registeredEntries),
    'Provide the exact registered base catalog, including an explicit empty fixture catalog.',
  );
  const bases = createExecutionCatalog(registeredEntries).entries.filter(
    (e) => e.difficulty === 'standard',
  );
  const store = createStillMediaStore({ managedStore, decodeImage }),
    keys = pointerStore.keys;
  let closed = false,
    busy = false;
  const guard = (signal) => {
    abortExternalChapter(signal);
    required(!closed && writer.writable === true, 'The profile writer lease is not held.');
    required(storage.getItem(keys.lockKey) === null, 'A backup lock requires recovery first.');
  };
  async function locked(signal, action) {
    guard(signal);
    required(!busy, 'Another chapter operation is already running.');
    busy = true;
    try {
      return await lockManager.request(
        keys.lockKey,
        { mode: 'exclusive', ifAvailable: true },
        async (lock) => {
          required(lock, 'Another backup or chapter operation owns the profile lock.');
          guard(signal);
          return action();
        },
      );
    } finally {
      busy = false;
    }
  }
  async function nextLibrary(before, item, signal) {
    const current =
      before === null ? emptyPackLibrary() : await importPackLibrary(before, { decodeImage });
    guard(signal);
    const incoming = item.pack.campaigns[0];
    required(
      !current.packs.some(
        (p) => p.id === item.pack.id || p.campaigns.some((c) => c.id === incoming.id),
      ) && !bases.some((e) => e.campaign.id === incoming.id),
      'Existing edition replacement or embedded-pack migration is not implemented.',
    );
    const official = await localOfficialChapter(item.pack.id, { decodeImage });
    const next = installPack(current, official || item.pack);
    const catalog = createExecutionCatalog([
      ...bases,
      ...next.packs.flatMap((p) => p.campaigns.map((c) => resolvePackCampaign(p, c.id))),
    ]);
    required(
      catalog.select(item.descriptor.campaignKey, 'standard'),
      'New chapter is absent from the exact prospective catalog.',
    );
    return exportPackLibrary(next);
  }
  async function nextIndex(before, item, packLibrary) {
    const current =
      before === null ? emptyExternalChapterIndex() : validateExternalChapterIndex(before);
    const next = validateExternalChapterIndex({
      ...current,
      chapters: [...current.chapters, item.descriptor],
    });
    const packs = (await importPackLibrary(packLibrary, { decodeImage })).packs;
    for (const d of next.chapters) {
      const p = packs.find((p) => p.id === d.id);
      required(
        p,
        'External index contains an absent gameplay edition; explicit recovery is required.',
      );
      const text = JSON.stringify(p);
      required(
        new TextEncoder().encode(text).length === d.pack.bytes &&
          (await externalChapterHash(text)) === d.pack.sha256,
        'External index gameplay bytes differ from the installed edition.',
      );
    }
    required(
      new TextEncoder().encode(packLibrary).length +
        new TextEncoder().encode(JSON.stringify(next)).length <=
        PACK_LIMITS.libraryBytes + 1024 * 1024,
      'Imported packs and the separate official descriptor index exceed their storage budgets.',
    );
    return next;
  }
  function matchesRequired(document, item, preserveAssignments = false) {
    const conflicts = [];
    for (const p of item.imported.document.library.presentations) {
      const actual = document.library.presentations.find(
        (x) => x.id === p.id && x.revision === p.revision,
      );
      const assignment = document.library.assignments.find(
        (x) => canonicalJSON(x.identity) === canonicalJSON(p.identity),
      );
      required(
        canonicalJSON(actual) === canonicalJSON(p),
        'A retained picture revision conflicts with the external chapter.',
      );
      if (assignment?.presentationId !== p.id || assignment?.revision !== p.revision)
        conflicts.push(
          Object.freeze({
            identity: p.identity,
            levelName:
              item.pack.campaigns
                .flatMap((campaign) => campaign.levels)
                .find((level) => level.id === p.identity.levelId)?.name ?? p.identity.levelId,
            original: Object.freeze({ presentationId: p.id, revision: p.revision }),
            retained: assignment
              ? Object.freeze({
                  presentationId: assignment.presentationId,
                  revision: assignment.revision,
                })
              : null,
          }),
        );
    }
    if (!preserveAssignments)
      required(
        !conflicts.length,
        'A retained picture binding conflicts with the external chapter.',
      );
    return Object.freeze(conflicts);
  }
  async function mediaReview(item, signal, { pictureReview, preserveAssignments = false } = {}) {
    const review = await prepareMediaBundleRestore(item.imported, {
      store,
      assignmentMode: 'preserve',
      signal,
      decodeImage,
    });
    guard(signal);
    // Required immutable originals must always match, regardless of assignment policy.
    const conflicts = matchesRequired(review.document, item, true);
    const before = await store.read({ signal });
    guard(signal);
    required(
      before.generation === review.expectedGeneration,
      'Media changed during chapter preparation.',
    );
    if (pictureReview !== undefined) {
      const saved = pictureReviews.get(pictureReview);
      pictureReviews.delete(pictureReview);
      required(
        saved &&
          saved.manager === managedStore &&
          saved.profileKey === keys.profileKey &&
          saved.packsKey === keys.packsKey &&
          saved.descriptor === canonicalJSON(item.descriptor) &&
          saved.generation === before.generation &&
          saved.beforeSha256 === (await digest(before.document)),
        'Picture review expired or changed. Review this chapter again before installing.',
      );
      preserveAssignments = true;
    }
    if (conflicts.length && !preserveAssignments) {
      const conflict = new Error('A retained picture binding conflicts with the external chapter.');
      conflict.name = 'RetainedPictureAssignmentConflict';
      conflict.conflicts = conflicts;
      pictureReviews.set(conflict, {
        manager: managedStore,
        profileKey: keys.profileKey,
        packsKey: keys.packsKey,
        descriptor: canonicalJSON(item.descriptor),
        generation: before.generation,
        beforeSha256: await digest(before.document),
      });
      throw Object.freeze(conflict);
    }
    const assets = new Map(before.assets.map((a) => [a.sha256, a]));
    for (const a of item.imported.assets) if (!assets.has(a.sha256)) assets.set(a.sha256, a);
    const prepared = await store.prepare(review.document.library, [...assets.values()], {
      previous: review.document,
      executionCatalog: createExecutionCatalog([]),
      signal,
    });
    guard(signal);
    return { before, prepared, preserveAssignments };
  }
  async function verifyMedia(j, item, signal) {
    const actual = await store.read({ signal });
    guard(signal); // Verifies actual bytes/header/decode, not only row hashes.
    required(
      actual.generation === j.media.generation + 1 &&
        (await digest(actual.document)) === j.media.afterSha256,
      'Media changed after chapter staging; retain the journal and review recovery.',
    );
    guard(signal);
    matchesRequired(actual.document, item, j.format === RETAINED_PICTURE_JOURNAL_FORMAT);
  }
  async function write(snapshot, next, signal) {
    return pointerStore.compareAndSwap(snapshot, next, { signal, guard: () => guard(signal) });
  }
  async function advance(snapshot, item, signal, staged = null) {
    let j = journal(snapshot.journal, keys);
    required(
      canonicalJSON(j.descriptor) === canonicalJSON(item.descriptor),
      'Recovery requires the exact originally reviewed descriptor and payloads.',
    );
    required(
      j.after === (await nextLibrary(j.before, item, signal)),
      'Journal after-pointer differs from the validated original library plus this edition.',
    );
    required(
      canonicalJSON(await nextIndex(j.beforeIndex, item, j.after)) === canonicalJSON(j.afterIndex),
      'Journal index differs from the validated external edition.',
    );
    const atBefore =
      canonicalJSON(snapshot.packs) === canonicalJSON(j.before) &&
      canonicalJSON(snapshot.index) === canonicalJSON(j.beforeIndex);
    const atAfter =
      snapshot.packs === j.after && canonicalJSON(snapshot.index) === canonicalJSON(j.afterIndex);
    required(atBefore || atAfter, 'A foreign pack writer changed the installation target.');
    if (!atAfter) {
      const actual = await store.read({ signal });
      guard(signal);
      if (
        actual.generation === j.media.generation &&
        (await digest(actual.document)) === j.media.beforeSha256
      ) {
        required(j.phase === 'prepared', 'Journal phase conflicts with media state.');
        const candidate =
          staged ??
          (await mediaReview(item, signal, {
            preserveAssignments: j.format === RETAINED_PICTURE_JOURNAL_FORMAT,
          }));
        required(
          candidate.before.generation === j.media.generation &&
            (await digest(candidate.before.document)) === j.media.beforeSha256 &&
            (await digest(candidate.prepared.library)) === j.media.afterSha256,
          'Recovery media proposal differs from its journal.',
        );
        guard(signal);
        let lease;
        try {
          lease = await managedStore.reserve({
            domain: 'media',
            expectedGeneration: j.media.generation,
            maxNewBytes: candidate.prepared.assets.reduce((n, a) => n + a.blob.size, 0),
            maxMetadataBytes: new TextEncoder().encode(
              JSON.stringify({
                generation: j.media.generation + 1,
                library: candidate.prepared.library,
              }),
            ).length,
            signal,
          });
          guard(signal);
          // Recheck exact pointer/journal immediately before the media commit.
          const current = await pointerStore.snapshot({ signal, guard: () => guard(signal) });
          required(
            canonicalJSON(current) === canonicalJSON(snapshot),
            'Chapter pointer changed before media commit.',
          );
          await store.commit(candidate.prepared, {
            expectedGeneration: j.media.generation,
            reservation: lease,
            signal,
          });
        } finally {
          if (lease)
            try {
              await managedStore.release(lease);
            } catch {
              /* Its bounded lease expires. */
            }
        }
      }
      await verifyMedia(j, item, signal);
      if (j.phase === 'prepared') {
        j = { ...j, phase: 'media-committed' };
        snapshot = await write(
          snapshot,
          { packs: snapshot.packs, journal: j, index: snapshot.index },
          signal,
        );
      }
      await verifyMedia(j, item, signal);
      j = { ...j, phase: 'published' };
      snapshot = await write(snapshot, { packs: j.after, journal: j, index: j.afterIndex }, signal);
    } else
      required(j.phase === 'published', 'A pointer changed without its atomic publication marker.');
    await verifyMedia(j, item, signal);
    // A crash after publication leaves an exact after/after pair. Clear only
    // after full verification; never roll back or delete another writer's media.
    await write(snapshot, { packs: j.after, journal: null, index: j.afterIndex }, signal);
    return Object.freeze({
      status: 'installed',
      packLibrary: j.after,
      descriptor: item.descriptor,
      mediaGeneration: j.media.generation + 1,
    });
  }
  return Object.freeze({
    async install(item, { signal, pictureReview } = {}) {
      required(isPreparedExternalChapter(item), 'Prepare exact external chapter payloads first.');
      return locked(signal, async () => {
        const before = await pointerStore.snapshot({ signal, guard: () => guard(signal) });
        required(before.journal === null, 'Recover the pending chapter installation first.');
        const after = await nextLibrary(before.packs, item, signal),
          candidate = await mediaReview(item, signal, { pictureReview });
        const j = {
          format: candidate.preserveAssignments
            ? RETAINED_PICTURE_JOURNAL_FORMAT
            : EXTERNAL_INSTALL_JOURNAL_FORMAT,
          ...(candidate.preserveAssignments ? { assignmentPolicy: 'preserve-retained' } : {}),
          token: crypto.randomUUID(),
          profileKey: keys.profileKey,
          packsKey: keys.packsKey,
          phase: 'prepared',
          descriptor: item.descriptor,
          before: before.packs,
          after,
          beforeIndex: before.index,
          afterIndex: await nextIndex(before.index, item, after),
          media: {
            generation: candidate.before.generation,
            beforeSha256: await digest(candidate.before.document),
            afterSha256: await digest(candidate.prepared.library),
          },
        };
        guard(signal);
        const snapshot = await write(
          before,
          { packs: before.packs, journal: j, index: before.index },
          signal,
        );
        return advance(snapshot, item, signal, candidate);
      });
    },
    async recover(item, { signal } = {}) {
      required(
        isPreparedExternalChapter(item),
        'Recovery needs the exact prepared external chapter.',
      );
      return locked(signal, async () => {
        const snapshot = await pointerStore.snapshot({ signal, guard: () => guard(signal) });
        required(snapshot.journal !== null, 'No pending external chapter installation.');
        return advance(snapshot, item, signal);
      });
    },
    close() {
      closed = true;
      store.close();
    },
  });
}
