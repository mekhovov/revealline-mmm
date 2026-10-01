import { editionIdFromLocation } from './edition-context.mjs';
import { profileWriterOwns } from './profile-writer.mjs';
import { importLibrary, LIBRARY_LIMITS } from './library.mjs';
import { PACK_LIMITS } from './packs.mjs';
import { SESSION_STORAGE_BYTES } from './sessions.mjs';
import { canonicalJSON } from './data-json.mjs';
import { channelFromStorageKey, targetVersion, recoveryChannel } from './profile-channel.mjs';
import { createProfileSharedMediaReader } from './profile-shared-media.mjs';
import { createExternalRecoveryCatalog } from './external-recovery-catalog.mjs';
import { createProfileChannelAssets } from './profile-channel-assets.mjs';
import { ownProfileJSON, freezeProfileData } from './profile-channel-json.mjs';
import { t } from './i18n/index.mjs';
import {
  originalRecoveryOptions,
  reviewOriginalMetadata,
  verifyOriginalBytes,
  originalRecoveryComponent,
} from './profile-original-recovery.mjs';

export const PROFILE_READER_LIMITS = Object.freeze({
  keys: 4096,
  channels: 96,
  snapshotBytes: 64 * 1024 * 1024,
  journalBytes: 8 * 1024 * 1024,
  indexBytes: 256 * 1024,
  timeoutMs: 120000,
  maxTimeoutMs: 300000,
});
const check = (signal) => {
  if (signal.aborted)
    throw signal.reason ?? new DOMException(t('errors:profileReader.cancelled'), 'AbortError');
};
// Web Locks forbids signal together with ifAvailable. Stop awaiting on cancellation,
// and keep the eventual callback guarded so it releases any late lease without reads.
function untilCancelled(signal, begin) {
  check(signal);
  return new Promise((resolve, reject) => {
    const stop = () => {
      signal.removeEventListener('abort', stop);
      reject(signal.reason);
    };
    signal.addEventListener('abort', stop, { once: true });
    Promise.resolve()
      .then(() => {
        check(signal);
        return begin();
      })
      .then(
        (value) => {
          signal.removeEventListener('abort', stop);
          resolve(value);
        },
        (error) => {
          signal.removeEventListener('abort', stop);
          reject(error);
        },
      );
  });
}
const problem = (component, message) => ({ component, message });
const bytes = (value) => new TextEncoder().encode(value).byteLength;
const clearJournal = (entry) =>
  entry.state === 'absent' || (entry.state === 'present' && entry.value === null);

/** Read-only exact-channel snapshots. No media manager, writer, import or migration capability. */
export function createProfileChannelReader({
  storage = globalThis.localStorage,
  indexedDB = globalThis.indexedDB,
  lockManager = globalThis.navigator?.locks,
  currentVersion,
  editionId = editionIdFromLocation(),
  origin = globalThis.location?.origin ?? 'unknown origin',
  timeoutMs = PROFILE_READER_LIMITS.timeoutMs,
  recoveryCatalogs = [],
  heldWriter,
  decodeStillImage,
} = {}) {
  targetVersion(currentVersion);
  if (decodeStillImage !== undefined && typeof decodeStillImage !== 'function')
    throw new TypeError(t('errors:profileReader.trustedDecoder'));
  if (
    !Number.isInteger(timeoutMs) ||
    timeoutMs < 1 ||
    timeoutMs > PROFILE_READER_LIMITS.maxTimeoutMs
  )
    throw new TypeError(t('errors:profileReader.invalidDeadline'));
  const assets = createProfileChannelAssets({ indexedDB, timeoutMs: Math.min(timeoutMs, 15000) });
  const reviews = new WeakMap(),
    catalogs = new Map();
  let recoverySnapshots = new WeakMap(),
    originalChoices = new WeakMap(),
    verifiedOriginals = new WeakMap();
  function clearOriginals() {
    originalChoices = new WeakMap();
    verifiedOriginals = new WeakMap();
  }
  if (!Array.isArray(recoveryCatalogs) || recoveryCatalogs.length > PROFILE_READER_LIMITS.channels)
    throw new TypeError(t('errors:profileReader.trustedRegistry'));
  for (const entry of recoveryCatalogs) {
    const channel = recoveryChannel(entry?.channelId, currentVersion, { editionId });
    if (!channel || channel.support === 'protected-unknown' || catalogs.has(channel.id))
      throw new TypeError(t('errors:profileReader.unsupportedRegistryChannel'));
    if (!Array.isArray(entry.registeredEntries) || !Array.isArray(entry.knownDescriptors))
      throw new TypeError(t('errors:profileReader.explicitHistoricalDescriptors'));
    catalogs.set(
      channel.id,
      createExternalRecoveryCatalog({
        registeredEntries: entry.registeredEntries,
        knownDescriptors: entry.knownDescriptors,
        decodeImage: entry.decodeImage,
      }),
    );
  }
  let sharedMedia = null;
  let known = new WeakSet(),
    closed = false,
    active = null;
  function task(signal, body) {
    if (closed) return Promise.reject(new Error(t('errors:profileReader.closed')));
    if (active) return Promise.reject(new Error(t('errors:profileReader.finishCurrentCheck')));
    const controller = new AbortController();
    const cancel = () =>
      controller.abort(new DOMException(t('errors:profileReader.reviewCancelled'), 'AbortError'));
    signal?.addEventListener('abort', cancel, { once: true });
    const timer = setTimeout(
      () =>
        controller.abort(
          new DOMException(t('errors:profileReader.reviewTimedOut'), 'TimeoutError'),
        ),
      timeoutMs,
    );
    if (signal?.aborted) cancel();
    const operation = { controller };
    active = operation;
    operation.promise = Promise.resolve()
      .then(async () => {
        check(controller.signal);
        const result = await body(controller.signal);
        check(controller.signal);
        return result;
      })
      .finally(() => {
        clearTimeout(timer);
        signal?.removeEventListener('abort', cancel);
        if (active === operation) active = null;
      });
    return operation.promise;
  }
  async function locked(channel, signal, body) {
    if (!known.has(channel)) throw new TypeError(t('errors:profileReader.chooseProfile'));
    if (typeof lockManager?.request !== 'function')
      throw new Error(t('errors:profileReader.webLocksRequired'));
    const hold = (key, next) =>
      untilCancelled(signal, () =>
        key === channel.writerKey && profileWriterOwns(heldWriter, key)
          ? (async () => {
              const result = await next();
              check(signal);
              if (!profileWriterOwns(heldWriter, key))
                throw new Error(t('errors:profileReader.profileBusy'));
              return result;
            })()
          : lockManager.request(key, { mode: 'exclusive', ifAvailable: true }, async (lock) => {
              check(signal);
              if (!lock) throw new Error(t('errors:profileReader.profileBusy'));
              return next();
            }),
      );
    return hold(channel.writerKey, () => hold(channel.lockKey, body));
  }
  function local(key, limit) {
    try {
      if (typeof storage?.getItem !== 'function')
        throw new Error(t('errors:profileReader.storageUnavailable'));
      const value = storage.getItem(key);
      if (value === null) return { state: 'absent' };
      if (typeof value !== 'string') throw new Error(t('errors:profileReader.unreadableValue'));
      if (value.length > limit || bytes(value) > limit)
        throw new Error(t('errors:profileReader.valueByteBound'));
      return { state: 'present', value };
    } catch (error) {
      return { state: 'unreadable', message: error.message };
    }
  }
  async function snapshot(channel, signal) {
    check(signal);
    const raw = {
      profile: local(channel.profileKey, LIBRARY_LIMITS.maxBytes + 4096),
      session: local(channel.sessionKey, SESSION_STORAGE_BYTES),
      backupLock: local(channel.lockKey, 4096),
    };
    let remaining = PROFILE_READER_LIMITS.snapshotBytes - bytes(JSON.stringify(raw));
    let source;
    try {
      source = await assets.snapshot(channel, { signal });
    } catch (error) {
      check(signal);
      source = { state: 'unreadable', message: error.message };
    }
    raw.assetDatabase = source.state;
    raw.assets = {};
    for (const [name, limit] of Object.entries({
      packs: PACK_LIMITS.libraryBytes,
      index: PROFILE_READER_LIMITS.indexBytes,
      backup: PROFILE_READER_LIMITS.journalBytes,
      external: PROFILE_READER_LIMITS.journalBytes,
    })) {
      let entry;
      if (source.state === 'absent') entry = { state: 'absent' };
      else if (source.state !== 'present') entry = { state: 'unreadable', message: source.message };
      else if (!source.value[name].present) entry = { state: 'absent' };
      else {
        try {
          const value = ownProfileJSON(
            source.value[name].value,
            Math.max(1, Math.min(limit, remaining - 8192)),
          );
          entry = { state: 'present', value };
          remaining -= bytes(JSON.stringify(entry));
        } catch (error) {
          entry = { state: 'unsupported', message: error.message };
        }
      }
      raw.assets[name] = entry;
    }
    check(signal);
    return freezeProfileData(raw);
  }
  async function fingerprint(raw) {
    const text = canonicalJSON(raw);
    if (bytes(text) > PROFILE_READER_LIMITS.snapshotBytes)
      throw new Error(t('errors:profileReader.snapshotExportBound'));
    if (!globalThis.crypto?.subtle)
      throw new Error(t('errors:profileReader.secureHashingUnavailable'));
    const hash = new Uint8Array(
      await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text)),
    );
    return [...hash].map((n) => n.toString(16).padStart(2, '0')).join('');
  }
  function summarize(raw) {
    const diagnostics = [];
    for (const [name, entry] of Object.entries({ ...raw, ...raw.assets })) {
      if (entry?.state === 'unreadable' || entry?.state === 'unsupported')
        diagnostics.push(problem(name, entry.message));
    }
    let profile = { status: raw.profile.state };
    if (raw.profile.state === 'present') {
      try {
        const library = importLibrary(raw.profile.value);
        profile = {
          status: 'valid-structure',
          campaigns: Object.keys(library.campaigns).length,
          completedLevels: Object.values(library.campaigns).reduce(
            (n, value) => n + Object.keys(value.clears).length,
            0,
          ),
          pictures: library.gallery.length,
          scores: library.scores.length,
          pictureReceipts: library.pictureReceipts?.length ?? 0,
        };
      } catch (error) {
        profile = { status: 'malformed-or-unsupported' };
        diagnostics.push(problem('profile', error.message));
      }
    }
    let saved = { status: raw.session.state, inspected: false };
    if (raw.session.state === 'present') {
      try {
        const parsed = JSON.parse(raw.session.value);
        if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed))
          throw new Error(t('errors:profileReader.savedFlightObject'));
        saved = { status: 'stored-unverified', inspected: false };
      } catch (error) {
        saved = { status: 'malformed-or-unsupported', inspected: false };
        diagnostics.push(problem('session', error.message));
      }
    }
    const recoveryPending =
      raw.backupLock.state !== 'absent' ||
      !clearJournal(raw.assets.backup) ||
      !clearJournal(raw.assets.external);
    if (recoveryPending)
      diagnostics.push(problem('recovery', t('errors:profileReader.pendingRecoveryPreserved')));
    const complete = [...Object.values(raw.assets), raw.profile, raw.session, raw.backupLock].every(
      (entry) => entry.state === 'present' || entry.state === 'absent',
    );
    return freezeProfileData({
      profile,
      saved,
      recoveryPending,
      completeStoredSnapshot: complete,
      diagnostics,
      sharedMedia: 'not-inspected',
      originalAvailability: 'not-inspected',
      savedFlightInspection: 'unavailable',
      limits: t('errors:profileReader.structureOnlyLimit'),
    });
  }
  async function readStable(channel, signal) {
    const before = await snapshot(channel, signal);
    const overview = summarize(before);
    const digest = await untilCancelled(signal, () => fingerprint(before));
    check(signal);
    const after = await snapshot(channel, signal);
    if (canonicalJSON(before) !== canonicalJSON(after))
      throw new Error(t('errors:profileReader.changedDuringReview'));
    return { raw: before, overview, fingerprint: digest };
  }
  function priorReview(review) {
    const prior = reviews.get(review);
    if (!prior) throw new TypeError(t('errors:profileReader.reviewBeforeRecovery'));
    return prior;
  }
  async function unchangedReview(prior, signal) {
    const fresh = await readStable(prior.channel, signal);
    if (fresh.fingerprint !== prior.fingerprint)
      throw new Error(t('errors:profileReader.changedAfterReview'));
    if (!fresh.overview.completeStoredSnapshot || fresh.overview.recoveryPending)
      throw new Error(t('errors:profileReader.pendingRecordsPreventSnapshot'));
    return fresh;
  }
  async function sharedSnapshot(signal, selected = false) {
    sharedMedia ??= createProfileSharedMediaReader({
      indexedDB,
      timeoutMs: Math.min(timeoutMs, 15000),
    });
    const captured = await untilCancelled(signal, () =>
      selected ? sharedMedia.originalSnapshot({ signal }) : sharedMedia.snapshot({ signal }),
    );
    check(signal);
    if (captured.state !== 'present') throw new Error(t('errors:profileReader.sharedMediaAbsent'));
    return captured.value;
  }
  async function revalidateShared(prior, captured, signal) {
    const current = await sharedSnapshot(signal);
    await unchangedReview(prior, signal);
    if (canonicalJSON(current.marker) !== canonicalJSON(captured.marker))
      throw new Error(t('errors:profileReader.sharedMediaChangedDuringReview'));
    check(signal);
  }
  const generations = (captured) => ({
    audio: captured.marker.audio.generation,
    media: captured.marker.media.generation,
    ...(captured.marker.story ? { story: captured.marker.story.generation } : {}),
  });
  async function currentOriginals(owned, signal) {
    await unchangedReview(owned.prior, signal);
    const captured = await sharedSnapshot(signal, true);
    if (canonicalJSON(captured.marker) !== canonicalJSON(owned.captured.marker))
      throw new Error(t('errors:profileReader.sharedMediaChangedAfterReview'));
    await unchangedReview(owned.prior, signal);
    check(signal);
    return captured;
  }
  async function checkedOriginal(owned, signal) {
    const captured = await currentOriginals(owned, signal);
    const prepared = await untilCancelled(signal, () =>
      verifyOriginalBytes(owned.choice, captured, { decodeImage: decodeStillImage, signal }),
    );
    await currentOriginals(owned, signal);
    check(signal);
    return prepared;
  }
  function originalIdentity(owned) {
    return {
      channel: owned.prior.channel,
      asset: owned.choice.asset,
      references: owned.choice.references,
      profileFingerprint: owned.prior.fingerprint,
      sharedFingerprint: owned.sharedFingerprint,
      verified: true,
      scope: 'selected-original',
      fullBackup: false,
      earnedReceiptAuthority: false,
      restoreAuthority: false,
    };
  }
  return Object.freeze({
    discover({ signal } = {}) {
      return task(signal, async (inner) => {
        clearOriginals();
        const byId = new Map(),
          diagnostics = [];
        const add = (key) => {
          if (typeof key !== 'string' || key.length > 1024) {
            diagnostics.push(problem('discovery', t('errors:profileReader.unsupportedStorageKey')));
            return;
          }
          const channel = channelFromStorageKey(key, currentVersion, { editionId });
          if (channel) {
            byId.set(channel.id, channel);
            if (byId.size > PROFILE_READER_LIMITS.channels)
              throw new Error(t('errors:profileReader.tooManyChannels'));
          } else if (key.startsWith('revealline-mmm.'))
            diagnostics.push(
              problem(
                'discovery',
                t('errors:profileReader.unrecognizedNamespace', { key: key.slice(0, 160) }),
              ),
            );
        };
        try {
          const length = storage?.length;
          if (!Number.isInteger(length) || length < 0 || length > PROFILE_READER_LIMITS.keys)
            throw new Error(t('errors:profileReader.keysUnavailable'));
          for (let i = 0; i < length; i++) {
            check(inner);
            const key = storage.key(i);
            if (key !== null) add(key);
          }
          if (storage.length !== length) throw new Error(t('errors:profileReader.keysChanged'));
        } catch (error) {
          check(inner);
          if (byId.size > PROFILE_READER_LIMITS.channels) throw error;
          diagnostics.push(problem('discovery', error.message));
        }
        try {
          const keys = await assets.keys({ signal: inner, limit: PROFILE_READER_LIMITS.keys });
          if (keys.state === 'present') for (const key of keys.value) add(key);
        } catch (error) {
          check(inner);
          if (byId.size > PROFILE_READER_LIMITS.channels) throw error;
          diagnostics.push(problem('assets', error.message));
        }
        check(inner);
        known = new WeakSet();
        const channels = [...byId.values()].sort((a, b) => a.id.localeCompare(b.id));
        for (const channel of channels) known.add(channel);
        return freezeProfileData({
          channels,
          diagnostics,
          sharedMedia: 'not-inspected',
          migrationAuthority: false,
        });
      });
    },
    review(channel, { signal } = {}) {
      return task(signal, (inner) =>
        locked(channel, inner, async () => {
          clearOriginals();
          const snapshot = await readStable(channel, inner);
          const result = freezeProfileData({
            channel,
            origin,
            fingerprint: snapshot.fingerprint,
            ...snapshot.overview,
          });
          reviews.set(result, { channel, ...snapshot });
          return result;
        }),
      );
    },
    captureRecoverySnapshot(review, { signal } = {}) {
      return task(signal, (inner) => {
        const prior = priorReview(review),
          catalog = catalogs.get(prior.channel.id);
        if (!catalog) throw new Error(t('errors:profileReader.recoveryCatalogMissing'));
        return locked(prior.channel, inner, async () => {
          const fresh = await unchangedReview(prior, inner);
          const captured = await sharedSnapshot(inner);
          const value = (name) =>
            fresh.raw.assets[name].state === 'absent' ? null : fresh.raw.assets[name].value;
          const content = await untilCancelled(inner, () =>
            catalog.catalog(value('packs'), value('index'), inner),
          );
          check(inner);
          if (content.index.chapters.length)
            catalog.closure(content, { document: captured.marker.media.library });
          const sharedFingerprint = await untilCancelled(inner, () => fingerprint(captured.marker));
          await revalidateShared(prior, captured, inner);
          const result = freezeProfileData({
            channel: prior.channel,
            profileFingerprint: fresh.fingerprint,
            sharedFingerprint,
            schemaVersion: captured.marker.version,
            revision: captured.marker.ledger?.revision ?? null,
            generations: {
              audio: captured.marker.audio.generation,
              media: captured.marker.media.generation,
              ...(captured.marker.story ? { story: captured.marker.story.generation } : {}),
            },
            executionEntries: content.executions.entries.length,
            externalChapters: content.index.chapters.length,
            originals: {
              files: captured.files.length,
              bytes: captured.files.reduce((n, file) => n + file.bytes, 0),
              verified: false,
            },
            scope: 'snapshot-metadata-only',
            savedFlightInspection: 'unavailable',
            fullBackup: false,
          });
          recoverySnapshots.set(result, { prior, captured, content });
          return result;
        });
      });
    },
    revalidateRecoverySnapshot(snapshot, { signal } = {}) {
      return task(signal, (inner) => {
        const owned = recoverySnapshots.get(snapshot);
        if (!owned) throw new TypeError(t('errors:profileReader.ownedSnapshot'));
        return locked(owned.prior.channel, inner, async () => {
          await revalidateShared(owned.prior, owned.captured, inner);
          return snapshot;
        });
      });
    },
    async reviewOriginals(review, options = {}) {
      const { signal } = originalRecoveryOptions(options);
      return task(signal, (inner) => {
        clearOriginals();
        const prior = priorReview(review),
          catalog = catalogs.get(prior.channel.id);
        if (!catalog) throw new Error(t('errors:profileReader.recoveryCatalogMissing'));
        return locked(prior.channel, inner, async () => {
          const fresh = await unchangedReview(prior, inner);
          const captured = await sharedSnapshot(inner, true);
          const value = (name) =>
            fresh.raw.assets[name].state === 'absent' ? null : fresh.raw.assets[name].value;
          const content = await untilCancelled(inner, () =>
            catalog.catalog(value('packs'), value('index'), inner),
          );
          check(inner);
          if (content.index.chapters.length)
            catalog.closure(content, { document: captured.marker.media.library });
          const originals = reviewOriginalMetadata(captured, content.entries);
          const sharedFingerprint = await untilCancelled(inner, () => fingerprint(captured.marker));
          const owned = { prior, captured, sharedFingerprint };
          await currentOriginals(owned, inner);
          const result = freezeProfileData({
            channel: prior.channel,
            profileFingerprint: fresh.fingerprint,
            sharedFingerprint,
            schemaVersion: captured.marker.version,
            revision: captured.marker.ledger?.revision ?? null,
            generations: generations(captured),
            executionEntries: content.executions.entries.length,
            externalChapters: content.index.chapters.length,
            originals,
            diagnostics: captured.diagnostics,
            scope: 'selected-originals-metadata',
            fullBackup: false,
            earnedReceiptAuthority: false,
          });
          for (const choice of originals) originalChoices.set(choice, { ...owned, choice });
          return result;
        });
      });
    },
    async verifyOriginal(choice, options = {}) {
      const { signal } = originalRecoveryOptions(options);
      return task(signal, (inner) => {
        verifiedOriginals = new WeakMap();
        const owned = originalChoices.get(choice);
        if (!owned) throw new TypeError(t('errors:profileReader.ownedOriginal'));
        return locked(owned.prior.channel, inner, async () => {
          await checkedOriginal(owned, inner);
          const result = freezeProfileData(originalIdentity(owned));
          verifiedOriginals.set(result, owned);
          return result;
        });
      });
    },
    async exportOriginalComponent(verified, options = {}) {
      const { signal, component } = originalRecoveryOptions(options, true);
      return task(signal, (inner) => {
        const owned = verifiedOriginals.get(verified);
        if (!owned) throw new TypeError(t('errors:profileReader.verifiedOriginal'));
        return locked(owned.prior.channel, inner, async () => {
          // A generation marker is not byte integrity: hash a fresh selected handle again.
          const prepared = await checkedOriginal(owned, inner);
          const identity = {
            ...originalIdentity(owned),
            origin,
            schemaVersion: owned.captured.marker.version,
            revision: owned.captured.marker.ledger?.revision ?? null,
            generations: generations(owned.captured),
          };
          check(inner);
          return originalRecoveryComponent(prepared, identity, component);
        });
      });
    },
    exportStoredData(review, { signal } = {}) {
      return task(signal, async (inner) => {
        const prior = reviews.get(review);
        if (!prior) throw new TypeError(t('errors:profileReader.reviewBeforeExport'));
        return locked(prior.channel, inner, async () => {
          const fresh = await readStable(prior.channel, inner);
          if (fresh.fingerprint !== prior.fingerprint)
            throw new Error(t('errors:profileReader.changedBeforeExport'));
          const document = {
            format: 'revealline-stored-profile-snapshot.v1',
            channel: prior.channel,
            origin,
            fingerprint: fresh.fingerprint,
            completeStoredSnapshot: fresh.overview.completeStoredSnapshot,
            raw: fresh.raw,
            diagnostics: fresh.overview.diagnostics,
            sharedMedia: 'not-inspected',
            limits: t('errors:profileReader.diagnosticExportLimit'),
          };
          const text = JSON.stringify(document, null, 2);
          if (bytes(text) > PROFILE_READER_LIMITS.snapshotBytes)
            throw new Error(t('errors:profileReader.storedExportByteBound'));
          check(inner);
          return Object.freeze({
            blob: new Blob([text], { type: 'application/json' }),
            completeStoredSnapshot: document.completeStoredSnapshot,
            filename: `revealline-${prior.channel.id}-${document.completeStoredSnapshot ? 'stored-profile' : 'incomplete-diagnostic'}.json`,
          });
        });
      });
    },
    async close() {
      closed = true;
      active?.controller.abort(
        new DOMException(t('errors:profileReader.recoveryClosed'), 'AbortError'),
      );
      assets.close();
      sharedMedia?.close();
      recoverySnapshots = new WeakMap();
      clearOriginals();
      await active?.promise.catch(() => {});
    },
  });
}
