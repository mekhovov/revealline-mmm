import { t } from '../i18n/index.mjs';
import { acquireCouchReleasePicture } from './couch-release-picture.mjs';
import { canonicalJSON, required } from '../data-json.mjs';
import { createExecutionCatalog } from '../campaign-contexts.mjs';
import { createDifficultyContext } from '../campaign-difficulty.mjs';
import { createMediaIdentityCatalog } from '../media-library.mjs';
import { createPresentationPins } from '../presentation-pins.mjs';
import { createManagedMediaStore } from '../managed-media-store.mjs';
import { createStillMediaStore } from '../media-store.mjs';
import { acquirePresentationImage } from '../ui/presentation-image.mjs';
import {
  matchesReleasePictureBaseline,
  releasePictureForIdentity,
} from '../presentation/release-pictures.mjs';
import { hashPresentationBytes } from '../presentation/bundle.mjs';
import { inspectImageDataUrl } from '../content.mjs';

const cancelled = () =>
  new DOMException(t('interface:couchPicturePreparationCancelled'), 'AbortError');
const releaseImage = (image) => {
  image?.removeAttribute?.('src');
  image?.close?.();
};
const absentStoreNotice = t('interface:savedPictureChoicesAreUnavailableInThisBrowser');

/** One read-only picture choice and decoded lease for both static Versus boards.
 * The established manager may initialize/upgrade its schema, as other readers do;
 * this consumer never prepares or commits media, assignments, history or progress.
 * Existing authored backdrops are borrowed from the chapter owner, never released here.
 */
export function createCouchStaticPictures({
  entries,
  presentationPage,
  indexedDB = globalThis.indexedDB,
  ImageClass = globalThis.Image,
  URLImpl = globalThis.URL,
} = {}) {
  const catalog = createExecutionCatalog(entries),
    identityCatalog = createMediaIdentityCatalog(catalog),
    sources = new Set(entries);
  let manager = null,
    store = null,
    disposed = false,
    generation = 0,
    pending = null,
    requested = null,
    accepted = null,
    binding = null,
    staged = null;
  const retirements = new Set();
  const check = (signal) => {
    if (disposed || signal?.aborted) throw cancelled();
  };
  const same = (a, b) => canonicalJSON(a) === canonicalJSON(b);
  const currentPage = () => presentationPage?.current?.() ?? null;
  const mediaStore = () => {
    if (!store) {
      manager = createManagedMediaStore({ indexedDB, soundtrackCatalogue: true });
      store = createStillMediaStore({ managedStore: manager });
    }
    return store;
  };
  function waitFor(promise, signal) {
    check(signal);
    return new Promise((resolve, reject) => {
      const abort = () => reject(cancelled());
      signal.addEventListener('abort', abort, { once: true });
      Promise.resolve(promise)
        .then(resolve, reject)
        .finally(() => {
          signal.removeEventListener('abort', abort);
        });
      if (signal.aborted) abort();
    });
  }
  function contextFor(row, themeId, raceId) {
    required(sources.has(row?.pictureEntry), t('interface:selectARegisteredStaticCouchChapter'));
    required(Number.isSafeInteger(raceId) && raceId >= 0, t('interface:useAnInMemoryRaceIdentity'));
    const context = createDifficultyContext(row.pictureEntry.campaign),
      entry = catalog.find(context.campaignKey),
      level = entry?.campaign.levels.find((level) => level.id === row.level?.id);
    required(
      level && same(level, row.level),
      t('interface:theCouchMapDiffersFromItsExactCatalogOwner'),
    );
    const request = {
      executionKey: entry.executionKey,
      levelId: level.id,
      levelRevision: level.revision,
      themeId,
    };
    const identity = identityCatalog.resolve(request);
    required(identity, t('interface:thisWorldDoesNotBelongToTheExactCouchMap'));
    return {
      row,
      raceId,
      themeId,
      request,
      identity,
      background: row.authoredBackground ? Object.freeze({ ...row.authoredBackground }) : null,
      backdrop: row.backdrop ?? null,
    };
  }
  function operation(signal, onStatus, work) {
    check(signal);
    const ticket = ++generation,
      previous = pending,
      controller = new AbortController(),
      abort = () => controller.abort();
    previous?.controller.abort();
    signal?.addEventListener('abort', abort, { once: true });
    if (signal?.aborted) abort();
    const item = { controller, promise: null };
    pending = item;
    const current = () => {
      check(controller.signal);
      if (ticket !== generation) throw cancelled();
    };
    const report = (stage, message, status = 'preparing') => {
      if (disposed || controller.signal.aborted || ticket !== generation) return;
      try {
        onStatus?.({ stage, message, status, progress: null });
      } catch {}
    };
    // Publish the promise before any status callback can synchronously select again.
    item.promise = Promise.resolve()
      .then(async () => {
        // A cancelled manager open belongs to its first signal. Join it before reuse.
        if (previous) await previous.promise.catch(() => {});
        current();
        try {
          return await work(controller.signal, current, report);
        } catch (error) {
          if (error.name !== 'AbortError') report('error', error.message, 'error');
          throw error;
        }
      })
      .finally(() => {
        signal?.removeEventListener('abort', abort);
        if (pending === item) pending = null;
      });
    return item.promise;
  }
  function decode(source, signal) {
    check(signal);
    required(typeof ImageClass === 'function', t('interface:browserPictureDecodingIsUnavailable'));
    return new Promise((resolve, reject) => {
      const image = new ImageClass();
      let settled = false;
      const finish = (error) => {
        if (settled) return;
        settled = true;
        clearTimeout(timer);
        signal.removeEventListener('abort', abort);
        image.onload = image.onerror = null;
        if (error) {
          releaseImage(image);
          reject(error);
        } else resolve(image);
      };
      const abort = () => finish(cancelled());
      const timer = setTimeout(
        () => finish(new Error(t('interface:couchPictureDecodeTimedOut'))),
        15000,
      );
      signal.addEventListener('abort', abort, { once: true });
      image.onerror = () =>
        finish(new Error(t('interface:theSelectedCouchOriginalCouldNotDecode')));
      image.onload = async () => {
        try {
          required(
            typeof image.decode === 'function',
            t('interface:completePictureDecodingIsUnavailable'),
          );
          await image.decode();
          check(signal);
          finish();
        } catch (error) {
          finish(error);
        }
      };
      if (signal.aborted) return abort();
      try {
        image.src = source;
      } catch (error) {
        finish(error);
      }
    });
  }
  async function choose(state, signal, current, report) {
    if (state.chosen) return;
    report('verifying', t('interface:checkingTheExactMapAndSavedPictureChoice'));
    if (!state.mediaCaptured && indexedDB) {
      state.metadata = await mediaStore().readMetadata({ signal });
      current();
      const pins = createPresentationPins({
        library: state.metadata.document.library,
        identityCatalog,
        ...state.request,
        themeIds: [state.themeId],
      });
      state.pin = pins.choices[0];
    } else if (!indexedDB) state.notice = absentStoreNotice;
    // Even an unassigned/legacy result is a captured choice. Cancelling while the
    // optional release is loading must not turn Retry into a new assignment lookup.
    state.mediaCaptured = true;
    if (state.pin?.kind === 'still') {
      state.kind = 'still';
      state.chosen = true;
      return;
    }
    let snapshot;
    try {
      snapshot = await waitFor(presentationPage?.ready ?? null, signal);
    } catch (error) {
      current();
      if (error.name === 'AbortError') throw error;
      snapshot = null;
    }
    current();
    required(
      (snapshot ?? null) === currentPage(),
      t('interface:theReleaseArtworkChangedChooseSetupAgain'),
    );
    state.snapshot = snapshot ?? null;
    if (
      snapshot &&
      (await matchesReleasePictureBaseline(state.identity, state.background, {
        signal,
      }))
    ) {
      current();
      state.release = releasePictureForIdentity(snapshot, state.identity);
    }
    if (state.release) state.kind = 'release';
    else {
      state.kind = 'authored';
      if (!snapshot)
        state.notice = [
          state.notice,
          t('interface:releaseArtworkIsUnavailableTheAuthoredPictureIsKept'),
        ]
          .filter(Boolean)
          .join(' ');
      state.original = null;
      if (state.background) {
        required(state.backdrop?.image, t('interface:theSelectedAuthoredOriginalIsUnavailable'));
        const header = inspectImageDataUrl(state.background.dataUrl);
        required(header.valid, t('interface:theSelectedAuthoredPictureDescriptorIsInvalid'));
        const image = state.backdrop.image,
          fit = state.background.fit ?? 'cover';
        required(
          (image.naturalWidth ?? image.width) === header.width &&
            (image.naturalHeight ?? image.height) === header.height &&
            (state.backdrop.fit ?? 'cover') === fit,
          t('interface:theBorrowedAuthoredPictureDiffersFromItsOriginalDimensionsOr'),
        );
        const binary = atob(state.background.dataUrl.split(',')[1]);
        const sha256 = await hashPresentationBytes(Uint8Array.from(binary, (c) => c.charCodeAt(0)));
        current();
        state.original = Object.freeze({
          sha256,
          bytes: binary.length,
          mime: header.mime,
          width: header.width,
          height: header.height,
          fit,
        });
      } else
        required(
          !state.backdrop?.image,
          t('interface:aBorrowedPictureNeedsItsExactAuthoredDescriptor'),
        );
    }
    current();
    state.chosen = true;
  }
  function verifyContext(state, signal) {
    check(signal);
    required(requested === state, t('interface:theSelectedCouchPictureChanged'));
    const latest = contextFor(state.row, state.themeId, state.raceId);
    required(same(latest.request, state.request), t('interface:theSelectedCouchOwnerChanged'));
    required(
      same(latest.background, state.background) && latest.backdrop === state.backdrop,
      t('interface:theSelectedAuthoredPictureChangedChooseSetupAgain'),
    );
    if (state.kind !== 'still')
      required(
        state.snapshot === currentPage(),
        t('interface:theReleaseArtworkChangedChooseSetupAgain'),
      );
  }
  async function verifyMedia(state, signal) {
    if (!state.metadata) return;
    const latest = await mediaStore().readMetadata({ signal });
    check(signal);
    required(
      latest.generation === state.metadata.generation,
      t('interface:savedPictureChoicesChangedChooseTheMapAgainBeforeStarting'),
    );
  }
  async function acquireRelease(state, signal, report) {
    return acquireCouchReleasePicture({
      choice: state.release,
      snapshot: state.snapshot,
      presentationPage,
      signal,
      check,
      decode,
      report,
      URLImpl,
    });
  }
  async function select(
    row,
    { themeId = row.defaultThemeId, raceId, signal, onStatus } = {},
    stage = null,
  ) {
    check(signal);
    if (!stage) staged?.cancel();
    const context = contextFor(row, themeId, raceId);
    if (requested?.raceId === raceId)
      required(
        requested.row === row && same(requested.request, context.request),
        t('interface:changedSetupRequiresANewRaceIdentity'),
      );
    else requested = { ...context, chosen: false, notice: '' };
    const state = requested;
    return operation(signal, onStatus, async (s, current, report) => {
      let candidate = null;
      try {
        await choose(state, s, current, report);
        current();
        if (state.kind === 'still') {
          report('decoding', t('interface:openingTheSavedOriginalForBothBoards'));
          candidate = await acquirePresentationImage(
            { pin: state.pin, metadata: state.metadata, store: mediaStore() },
            { signal: s, ImageClass, URLImpl },
          );
        } else if (state.kind === 'release') candidate = await acquireRelease(state, s, report);
        else candidate = { ...(state.backdrop ?? {}), release() {} };
        current();
        await verifyMedia(state, s);
        current();
        verifyContext(state, s);
        const next = Object.freeze({
          image: candidate.image ?? null,
          fit: candidate.fit ?? 'cover',
          sampling: candidate.sampling ?? 'nearest',
          choice: Object.freeze({
            kind: state.kind,
            identity: state.identity,
            ...(state.kind === 'authored' ? { original: state.original } : {}),
            ...(state.pin?.kind === 'still' ? { pin: state.pin } : {}),
            ...(state.release
              ? { slotId: state.release.slotId, sha256: state.release.asset.file.sha256 }
              : {}),
          }),
          notice: state.notice,
          release: candidate.release,
        });
        if (stage) {
          stage.current();
          stage.picture = next;
          stage.state = state;
          candidate = null;
        } else {
          const previous = binding;
          binding = next;
          accepted = state;
          candidate = null;
          previous?.release();
        }
        report(
          'ready',
          state.notice || t('interface:theExactPictureIsReadyForBothBoards'),
          'ready',
        );
        current();
        return next;
      } finally {
        candidate?.release();
      }
    });
  }
  // Next may prepare a new original while Results still owns the accepted one.
  // Publication is explicit; even final confirmation cannot retire that original.
  async function stage(row, options = {}) {
    check(options.signal);
    staged?.cancel();
    const controller = new AbortController();
    let live = true;
    const item = {
      picture: null,
      state: null,
      confirmed: false,
      current() {
        check(controller.signal);
        required(live && staged === item, t('interface:theNextCouchPictureChanged'));
      },
      cancel() {
        if (!live) return;
        live = false;
        if (staged === item) staged = null;
        options.signal?.removeEventListener('abort', item.cancel);
        controller.abort();
        try {
          item.picture?.release();
        } catch {}
        item.picture = null;
      },
    };
    staged = item;
    options.signal?.addEventListener('abort', item.cancel, { once: true });
    if (options.signal?.aborted) item.cancel();
    try {
      await select(row, { ...options, signal: controller.signal }, item);
      item.current();
      return Object.freeze({
        picture: item.picture,
        cancel: item.cancel,
        async confirm({ onStatus } = {}) {
          item.current();
          item.confirmed = false;
          await operation(controller.signal, onStatus, async (s, current) => {
            await verifyMedia(item.state, s);
            current();
            verifyContext(item.state, s);
            current();
            item.current();
            item.confirmed = true;
          });
          item.current();
        },
        commit() {
          item.current();
          required(
            item.confirmed && !pending,
            t('interface:confirmTheNextPictureBeforeAdoptingIt'),
          );
          const previous = binding;
          binding = item.picture;
          accepted = item.state;
          live = false;
          staged = null;
          options.signal?.removeEventListener('abort', item.cancel);
          // No cleanup or injected reader runs between owner and host publication.
          // Disposal also owns this retirement if the host cannot complete its handoff.
          let retired = false;
          const retire = () => {
            if (retired) return;
            retired = true;
            retirements.delete(retire);
            try {
              previous?.release();
            } catch {}
          };
          retirements.add(retire);
          return retire;
        },
      });
    } catch (error) {
      item.cancel();
      throw error;
    }
  }
  function confirm(row, { raceId, signal, onStatus } = {}) {
    check(signal);
    const state = accepted;
    required(
      state?.row === row && state.raceId === raceId && state === requested && !pending,
      t('interface:loadTheSelectedOriginalBeforeStarting'),
    );
    verifyContext(state, signal);
    if (!state.metadata) return binding;
    return operation(signal, onStatus, async (s, current) => {
      await verifyMedia(state, s);
      current();
      verifyContext(state, s);
      required(accepted === state, t('interface:thePreparedRaceChanged'));
      return binding;
    });
  }
  function cancel() {
    generation++;
    pending?.controller.abort();
    staged?.cancel();
  }
  function dispose() {
    if (disposed) return;
    disposed = true;
    cancel();
    for (const retire of retirements) retire();
    binding?.release();
    binding = accepted = requested = null;
    store?.close();
    manager?.close();
  }
  return Object.freeze({ select, stage, confirm, current: () => binding, cancel, dispose });
}
