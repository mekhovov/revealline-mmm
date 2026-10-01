import { EXECUTION_CATALOG_LIMITS } from '../campaign-contexts.mjs';
import { boundedJSON, canonicalJSON, exactKeys, required } from '../data-json.mjs';
import {
  MEDIA_LIMITS,
  validateMediaLibrary,
  createMediaIdentityCatalog,
} from '../media-library.mjs';
import {
  emptyGenericMediaLibrary,
  hydrateStoredStillMedia,
  prepareStoredStillMedia,
} from '../media-storage-record.mjs';
import { prepareStillAsset } from '../media-still.mjs';
import { exportMediaBundle } from '../media-bundle.mjs';
import { snapshotPictureChoice } from '../presentation-pins.mjs';
import { acquirePresentationImage } from '../ui/presentation-image.mjs';
import { releasePictureForIdentity } from './release-pictures.mjs';
import { hashPresentationBytes } from './bundle.mjs';

export const SESSION_RELEASE_PICTURE_BYTES = 32 * 1024 * 1024;
const nativeSize = Object.getOwnPropertyDescriptor(Blob.prototype, 'size').get;
const equal = (a, b) => canonicalJSON(a) === canonicalJSON(b);
const cancelled = () => new DOMException('Session picture preparation cancelled.', 'AbortError');
const checkSignal = (signal) => {
  if (signal?.aborted) throw cancelled();
};
const owns = (document, pin) =>
  pin.kind === 'still' &&
  document.library.presentations.some(
    (row) => row.id === pin.presentationId && row.revision === pin.presentationRevision,
  );

function ownOriginals(source, maximum) {
  required(
    Array.isArray(source) && source.length <= MEDIA_LIMITS.assets,
    'Invalid session originals.',
  );
  const rows = [],
    seen = new Set();
  let total = 0;
  for (let index = 0; index < source.length; index++) {
    const field = Object.getOwnPropertyDescriptor(source, index);
    required(field && Object.hasOwn(field, 'value'), 'Session originals need own values.');
    const fields = Object.getOwnPropertyDescriptors(field.value);
    required(
      Reflect.ownKeys(fields).length === 2 &&
        ['sha256', 'blob'].every((key) => fields[key] && Object.hasOwn(fields[key], 'value')),
      'Session originals need only an own hash and Blob.',
    );
    const hash = fields.sha256.value,
      blob = fields.blob.value;
    const bytes = nativeSize.call(blob);
    required(
      typeof hash === 'string' &&
        /^[a-f0-9]{64}$/.test(hash) &&
        !seen.has(hash) &&
        bytes > 0 &&
        bytes <= MEDIA_LIMITS.assetBytes,
      'Invalid, duplicate or oversized session original.',
    );
    total += bytes;
    required(
      total <= maximum,
      'Session picture originals exceed 32 MiB. Export retained originals before leaving this tab.',
    );
    seen.add(hash);
    rows.push(Object.freeze({ sha256: hash, blob: Blob.prototype.slice.call(blob, 0, bytes) }));
  }
  return rows;
}

/** Page-owned immutable originals, never a persistent store or durable generation.
 * The caller chooses this path before writes and retains responsibility for current
 * attempt ownership. All staged originals are verified and decoded before a stage
 * is returned. Acceptance need not acquire the FPV drawable when another world is
 * selected; the caller first ensures its requested world and rechecks ownership.
 */
export function createSessionReleasePictures({ decodeImage, ImageClass, URLImpl } = {}) {
  let document = hydrateStoredStillMedia(emptyGenericMediaLibrary()),
    originals = new Map(),
    revision = 0,
    closed = false,
    reservedBytes = 0;
  const stages = new Set(),
    leases = new Set(),
    reads = new Set();
  const check = () => required(!closed, 'Session picture history is closed.');
  const bytes = () =>
    [...originals.values()].reduce((sum, row) => sum + nativeSize.call(row.blob), 0);
  function linked(signal) {
    const controller = new AbortController(),
      abort = () => controller.abort();
    signal?.addEventListener('abort', abort, { once: true });
    if (signal?.aborted) abort();
    return { controller, unlink: () => signal?.removeEventListener('abort', abort) };
  }
  async function acquireFrom(source, sourceOriginals, pinSource, options = {}, stage = null) {
    check();
    const pin = snapshotPictureChoice(pinSource);
    required(owns(source, pin), 'This session does not own the selected picture revision.');
    if (stage) stage.check();
    const { controller, unlink } = linked(options.signal);
    reads.add(controller);
    stage?.reads.add(controller);
    let handle = null;
    try {
      const metadata = Object.freeze({ document: source });
      const store = {
        async readAsset(snapshot, id, { signal, decodeImage: decoder }) {
          required(snapshot === metadata, 'Session acquisition needs its own metadata snapshot.');
          const asset = source.library.assets.find((row) => row.id === id);
          const original = asset && sourceOriginals.get(asset.sha256);
          required(original, 'The exact session original is missing.');
          const prepared = await prepareStillAsset(
            original.blob,
            { id: asset.id, provenance: asset.provenance },
            { signal, decodeImage: decoder },
          );
          required(
            equal(prepared.asset, asset),
            'Session picture bytes differ from their exact record.',
          );
          return prepared;
        },
      };
      handle = await acquirePresentationImage(
        { pin, metadata, store },
        {
          ...(ImageClass ? { ImageClass } : {}),
          ...(URLImpl ? { URLImpl } : {}),
          ...options,
          signal: controller.signal,
        },
      );
      check();
      checkSignal(controller.signal);
      if (stage) stage.check();
      const accepted = handle;
      handle = null;
      const lease = Object.freeze({
        ...accepted,
        release() {
          if (!leases.delete(lease)) return;
          stage?.leases.delete(lease);
          accepted.release();
        },
      });
      leases.add(lease);
      stage?.leases.add(lease);
      return lease;
    } finally {
      unlink();
      reads.delete(controller);
      stage?.reads.delete(controller);
      handle?.release();
    }
  }
  async function stage(additionSource, originalSource, { executionCatalog, signal } = {}) {
    check();
    checkSignal(signal);
    required(stages.size < 2, 'Finish or discard a pending session picture stage.');
    const additions = boundedJSON(additionSource, {
      maxBytes: MEDIA_LIMITS.metadataBytes,
      maxNodes: 100000,
      maxDepth: 24,
      maxArray: 4096,
      maxString: 65536,
    });
    required(
      Array.isArray(additions) &&
        additions.length > 0 &&
        additions.length <= MEDIA_LIMITS.presentations,
      'Session picture stage needs bounded additions.',
    );
    const incoming = ownOriginals(
      originalSource,
      SESSION_RELEASE_PICTURE_BYTES - bytes() - reservedBytes,
    );
    const reservation = incoming.reduce((sum, row) => sum + nativeSize.call(row.blob), 0);
    required(
      bytes() + reservedBytes + reservation <= SESSION_RELEASE_PICTURE_BYTES,
      'Session picture originals exceed 32 MiB. Export retained originals before leaving this tab.',
    );
    createMediaIdentityCatalog(executionCatalog);
    const catalog = {
      entries: executionCatalog.entries.map((entry) =>
        boundedJSON(entry, {
          maxBytes: EXECUTION_CATALOG_LIMITS.entryBytes,
          maxNodes: EXECUTION_CATALOG_LIMITS.entryNodes,
          maxDepth: 24,
          maxArray: 4096,
          maxString: 6 * 1024 * 1024,
        }),
      ),
    };
    const before = revision,
      priorDocument = document,
      priorOriginals = originals;
    const { controller, unlink } = linked(signal);
    const state = {
      status: 'pending',
      preparing: true,
      released: false,
      reads: new Set(),
      leases: new Set(),
      document: null,
      originals: null,
      retire() {
        if (state.released || state.preparing) return;
        state.released = true;
        stages.delete(state);
        reservedBytes -= reservation;
        unlink();
      },
      check() {
        check();
        checkSignal(controller.signal);
        required(
          state.status === 'pending' && before === revision,
          'Session picture stage is stale or settled.',
        );
      },
      discard() {
        if (state.status !== 'pending') return false;
        state.status = 'discarded';
        state.retire();
        state.originals = null;
        controller.abort();
        for (const read of state.reads) read.abort();
        for (const lease of [...state.leases]) lease.release();
        return true;
      },
    };
    stages.add(state);
    reservedBytes += reservation;
    controller.signal.addEventListener('abort', () => state.discard(), { once: true });
    try {
      const library = {
        ...priorDocument.library,
        assets: [...priorDocument.library.assets],
        presentations: [...priorDocument.library.presentations],
        assignments: [],
      };
      const assignments = [],
        wanted = new Set();
      for (const row of additions) {
        exactKeys(
          row,
          ['choice', 'asset', 'presentation', 'assignment'],
          'Session picture addition',
        );
        exactKeys(row.choice, ['slotId', 'label', 'identity', 'asset'], 'Session release choice');
        const choice = releasePictureForIdentity(
          { resolved: { assets: { [row.choice.slotId]: row.choice.asset } } },
          row.choice.identity,
        );
        required(
          choice && equal(choice, row.choice),
          'Session picture needs an exact code-owned release choice.',
        );
        const file = choice.asset.file;
        const presentationId = `fk-picture-${await hashPresentationBytes(new TextEncoder().encode(canonicalJSON({ identity: choice.identity, sha256: file.sha256, fit: 'contain', sampling: 'nearest' })))}`;
        state.check();
        required(
          row.asset.id === `fk-art-${file.sha256}` &&
            ['sha256', 'bytes', 'mime', 'width', 'height'].every(
              (key) => row.asset[key] === file[key],
            ) &&
            row.presentation.id === presentationId &&
            row.presentation.revision === 1 &&
            equal(row.presentation.identity, choice.identity) &&
            equal(row.presentation.poster, {
              assetId: row.asset.id,
              fit: 'contain',
              sampling: 'nearest',
            }) &&
            row.presentation.story === null &&
            equal(row.assignment, { identity: choice.identity, presentationId, revision: 1 }),
          'Session picture records differ from the exact release choice.',
        );
        for (const [items, value, matches] of [
          [library.assets, row.asset, (item) => item.id === row.asset.id],
          [
            library.presentations,
            row.presentation,
            (item) =>
              item.id === row.presentation.id && item.revision === row.presentation.revision,
          ],
          [assignments, row.assignment, (item) => equal(item.identity, row.assignment.identity)],
        ]) {
          const old = items.find(matches);
          required(!old || equal(old, value), 'Conflicting immutable session picture record.');
          if (!old) items.push(value);
        }
        wanted.add(file.sha256);
      }
      required(
        incoming.every((row) => wanted.has(row.sha256)),
        'Session originals contain an unrequested payload.',
      );
      const nextOriginals = new Map(priorOriginals);
      for (const row of incoming) nextOriginals.set(row.sha256, row);
      const prepared = await prepareStoredStillMedia(library, [...nextOriginals.values()], {
        executionCatalog: catalog,
        previous: priorDocument,
        decodeImage,
        signal: controller.signal,
      });
      state.check();
      // Validation above owns all new Blobs; keep accepted copies on exact repeats.
      const owned = new Map(
        prepared.assets.map((row) => [row.sha256, priorOriginals.get(row.sha256) ?? row]),
      );
      const selection = validateMediaLibrary(
        { ...prepared.library.library, assignments },
        {
          identityCatalog: createMediaIdentityCatalog(catalog),
          previous: priorDocument.library,
        },
      );
      state.check();
      state.document = prepared.library;
      state.originals = owned;
      state.preparing = false;
      const staged = Object.freeze({
        scope: 'session',
        library: selection,
        document: prepared.library,
        has(pin) {
          state.check();
          return owns(state.document, snapshotPictureChoice(pin));
        },
        acquire(pin, options) {
          state.check();
          return acquireFrom(state.document, state.originals, pin, options, state);
        },
        accept() {
          state.check();
          document = state.document;
          originals = state.originals;
          revision++;
          state.status = 'accepted';
          state.retire();
          state.originals = null;
          return Object.freeze({ scope: 'session', revision, document });
        },
        discard: () => state.discard(),
      });
      return staged;
    } catch (error) {
      state.preparing = false;
      state.discard();
      state.retire();
      throw error;
    }
  }
  return Object.freeze({
    stage,
    has(pin) {
      check();
      return owns(document, snapshotPictureChoice(pin));
    },
    acquire: (pin, options) => acquireFrom(document, originals, pin, options),
    metadata() {
      check();
      return Object.freeze({ scope: 'session', revision, document });
    },
    status() {
      return Object.freeze({
        scope: 'session',
        disposed: closed,
        revision,
        originals: originals.size,
        bytes: bytes(),
        reservedBytes,
        pendingStages: stages.size,
      });
    },
    async exportBundle(options = {}) {
      check();
      const expected = revision,
        source = document,
        assets = [...originals.values()];
      const { controller, unlink } = linked(options.signal);
      reads.add(controller);
      try {
        const blob = await exportMediaBundle(source, assets, {
          decodeImage,
          ...options,
          signal: controller.signal,
        });
        check();
        checkSignal(controller.signal);
        required(
          revision === expected,
          'Session picture history changed during export. Prepare it again.',
        );
        return blob;
      } finally {
        reads.delete(controller);
        unlink();
      }
    },
    dispose() {
      if (closed) return;
      closed = true;
      for (const stage of [...stages]) stage.discard();
      for (const read of reads) read.abort();
      for (const lease of [...leases]) lease.release();
      originals = new Map();
      document = hydrateStoredStillMedia(emptyGenericMediaLibrary());
    },
  });
}
