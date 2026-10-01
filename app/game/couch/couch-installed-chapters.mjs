import { t } from '../i18n/index.mjs';
import { campaignKey } from '../library.mjs';
import { createExternalChapterHost } from '../external-chapter-host.mjs';
import { SOURCE_EXTERNAL_CHAPTERS, SOURCE_EXTERNAL_EDITIONS } from "../editions/standalone/external-chapters.mjs";
import { createManagedMediaStore } from '../managed-media-store.mjs';
import { acquirePresentationImage } from '../ui/presentation-image.mjs';
import { inspectImageDataUrl } from '../content.mjs';
import { createCouchStaticPictures } from './couch-static-pictures.mjs';
import { createMediaIdentityCatalog } from '../media-library.mjs';
import { createPresentationPins } from '../presentation-pins.mjs';
import { canonicalJSON } from '../data-json.mjs';
import {
  matchesReleasePictureBaseline,
  releasePictureForIdentity,
} from '../presentation/release-pictures.mjs';
import { acquireCouchReleasePicture } from './couch-release-picture.mjs';

const cancelled = () =>
  new DOMException(t('interface:installedCouchChapterLoadingCancelled'), 'AbortError');
const requireValue = (value, message) => {
  if (!value) throw new Error(message);
};
const releaseImage = (image) => {
  image?.removeAttribute?.('src');
  image?.close?.();
};

/** A read-only consumer of the solo channel. One manager and one accepted image
 * belong to this couch page; neither player owns a separate media assignment.
 * No writer lease, installation, recovery, progress or backup mutation is exposed.
 */
export function createCouchInstalledChapters({
  channel,
  registeredEntries,
  presentationPage,
  indexedDB = globalThis.indexedDB,
  storage = globalThis.localStorage,
  lockManager = globalThis.navigator?.locks,
  ImageClass = globalThis.Image,
  URLImpl = globalThis.URL,
} = {}) {
  let manager = null,
    disposed = false,
    generation = 0,
    pending = null,
    executingSignal = null,
    executingStatus = null,
    snapshot = null,
    choices = new WeakMap(),
    binding = null,
    selection = null,
    staged = null,
    pictureRequest = null,
    externalRequest = null;
  const retirements = new Set(),
    pictureReaders = new Set();
  const check = (signal) => {
    if (disposed || signal?.aborted) throw cancelled();
  };
  function decode(source, signal) {
    check(signal);
    requireValue(
      typeof ImageClass === 'function',
      t('interface:browserPictureDecodingIsUnavailable'),
    );
    return new Promise((resolve, reject) => {
      const image = new ImageClass();
      let settled = false;
      const finish = (error) => {
        if (settled) return;
        settled = true;
        clearTimeout(timer);
        signal?.removeEventListener('abort', abort);
        image.onload = image.onerror = null;
        if (error) {
          releaseImage(image);
          reject(error);
        } else resolve(image);
      };
      const abort = () => finish(cancelled());
      const timer = setTimeout(
        () => finish(new Error(t('interface:installedCouchPictureDecodeTimedOut'))),
        15000,
      );
      signal?.addEventListener('abort', abort, { once: true });
      image.onerror = () =>
        finish(new Error(t('interface:theInstalledCouchPictureCouldNotDecode')));
      image.onload = async () => {
        try {
          requireValue(
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
      if (signal?.aborted) return abort();
      try {
        image.src = source;
      } catch (error) {
        finish(error);
      }
    });
  }
  // The host verifies original bytes and headers. Its preparation decoder is
  // deliberately bounded and cancellable even for older embedded image packs.
  async function verifyDecode(source, { signal = executingSignal } = {}) {
    let url = null,
      image = null;
    try {
      check(signal);
      executingStatus?.('decoding', t('interface:checkingInstalledPictureDecoding'));
      if (typeof source !== 'string') {
        url = URLImpl.createObjectURL(source);
        source = url;
      }
      image = await decode(source, signal);
      check(signal);
      return { naturalWidth: image.naturalWidth, naturalHeight: image.naturalHeight };
    } finally {
      releaseImage(image);
      if (url !== null) URLImpl.revokeObjectURL(url);
    }
  }
  const host = createExternalChapterHost({
    indexedDB,
    profileKey: `revealline-mmm.library.${channel}.v1`,
    packsKey: `revealline-mmm.packs.${channel}.v1`,
    storage,
    lockManager,
    writer: Object.freeze({ writable: false }),
    registeredEntries,
    knownDescriptors: SOURCE_EXTERNAL_CHAPTERS,
    // Current Couch shares the catalogue-aware authority used by solo play.
    getManagedStore: () =>
      (manager ??= createManagedMediaStore({
        indexedDB,
        storyMedia: true,
        soundtrackCatalogue: true,
      })),
    decodeImage: verifyDecode,
  });
  // Embedded installs have the same fresh-picture policy as shipped maps. Each
  // race owns its captured choice so a failed Next cannot invalidate Results,
  // and Retry cannot silently replace a choice captured before cancellation.
  function retirePictureReader(request) {
    if (!request || request === pictureRequest || request.leases) return;
    pictureReaders.delete(request);
    request.owner.dispose();
  }
  function forgetPictureRequest() {
    const previous = pictureRequest;
    pictureRequest = null;
    retirePictureReader(previous);
  }
  function pictureRequestFor(row, state, themeId, raceId) {
    if (pictureRequest?.raceId === raceId) {
      requireValue(
        pictureRequest.source === row && pictureRequest.themeId === themeId,
        t('interface:changedSetupRequiresANewRaceIdentity'),
      );
      return pictureRequest;
    }
    const previous = pictureRequest,
      backdrop = { image: null, fit: state.background?.fit || 'cover' };
    pictureRequest = {
      source: row,
      themeId,
      raceId,
      leases: 0,
      backdrop,
      row: Object.freeze({
        level: row.level,
        defaultThemeId: row.defaultThemeId,
        pictureEntry: state.entry,
        authoredBackground: state.background || null,
        backdrop,
      }),
      owner: createCouchStaticPictures({
        entries: [state.entry],
        presentationPage,
        indexedDB,
        ImageClass,
        URLImpl,
      }),
    };
    pictureReaders.add(pictureRequest);
    retirePictureReader(previous);
    return pictureRequest;
  }
  async function embeddedPicture(row, state, themeId, raceId, signal, report) {
    const request = pictureRequestFor(row, state, themeId, raceId);
    request.leases++;
    let original = null,
      lease = null,
      released = false;
    const release = () => {
      if (released) return;
      released = true;
      try {
        lease?.cancel();
        lease?.picture?.release();
      } finally {
        if (request.backdrop.image === original) request.backdrop.image = null;
        releaseImage(original);
        original = null;
        request.leases--;
        retirePictureReader(request);
      }
    };
    try {
      if (state.background) {
        const header = inspectImageDataUrl(state.background.dataUrl);
        requireValue(header.valid, t('interface:theInstalledEmbeddedOriginalIsInvalid'));
        report(
          'decoding',
          t('interface:checkingTheInstalledOriginalBeforeChoosingItsPresentation'),
        );
        original = await decode(state.background.dataUrl, signal);
        requireValue(
          original.naturalWidth === header.width && original.naturalHeight === header.height,
          t('interface:theInstalledOriginalDecodedToDifferentDimensions'),
        );
        request.backdrop.image = original;
      }
      lease = await request.owner.stage(request.row, {
        themeId,
        raceId,
        signal,
        onStatus: ({ stage, message, status }) => report(stage, message, status),
      });
      return {
        picture: Object.freeze({ ...lease.picture, release }),
        presentation: { request, lease, committed: false },
      };
    } catch (error) {
      release();
      throw error;
    }
  }
  // Descriptor originals establish chapter readiness. They do not override the
  // current media assignment. Capture that choice once per race, independently
  // of each preparation's fresh metadata/readiness proof.
  async function externalPicture(row, state, themeId, raceId, proof, signal, report) {
    let request = externalRequest;
    if (request?.raceId === raceId) {
      requireValue(
        request.row === row && request.state === state && request.themeId === themeId,
        t('interface:changedSetupRequiresANewRaceIdentity'),
      );
    } else {
      const identityCatalog = createMediaIdentityCatalog(state.snapshot.executionCatalog);
      const pin = createPresentationPins({
        library: proof.metadata.document.library,
        identityCatalog,
        executionKey: state.entry.executionKey,
        levelId: row.level.id,
        levelRevision: row.level.revision,
        themeIds: [themeId],
      }).choices[0];
      request = externalRequest = {
        row,
        state,
        themeId,
        raceId,
        pin,
        original: proof.pin,
        kind: pin.kind === 'still' ? 'still' : null,
        snapshot: null,
        release: null,
        notice: '',
      };
    }
    requireValue(
      canonicalJSON(request.original) === canonicalJSON(proof.pin),
      t('interface:theInstalledOriginalChangedChooseSetupAgain'),
    );
    if (!request.kind) {
      let page;
      try {
        page = await waitForPresentation(signal);
      } catch (error) {
        check(signal);
        if (error.name === 'AbortError') throw error;
        page = null;
      }
      check(signal);
      requireValue(
        (page ?? null) === (presentationPage?.current?.() ?? null),
        t('interface:theReleaseArtworkChangedChooseSetupAgain'),
      );
      request.snapshot = page ?? null;
      if (page && (await matchesReleasePictureBaseline(request.pin.identity, null, { signal }))) {
        check(signal);
        request.release = releasePictureForIdentity(page, request.pin.identity);
      }
      request.kind = request.release ? 'release' : 'authored';
      if (!page)
        request.notice = t('interface:releaseArtworkIsUnavailableTheAuthoredPictureIsKept');
    }
    check(signal);
    let picture;
    if (request.kind === 'release') {
      picture = await acquireCouchReleasePicture({
        choice: request.release,
        snapshot: request.snapshot,
        presentationPage,
        signal,
        check,
        decode,
        report,
        URLImpl,
      });
    } else {
      report('decoding', t('interface:openingTheSelectedPictureForBothBoards'));
      picture = await acquirePresentationImage(
        {
          pin: request.kind === 'still' ? request.pin : request.original,
          metadata: proof.metadata,
          store: proof.store,
        },
        { signal, ImageClass, URLImpl },
      );
    }
    requireValue(picture?.image, t('interface:theSelectedInstalledPictureIsUnavailable'));
    return {
      request,
      picture: Object.freeze({
        ...picture,
        choice: Object.freeze({
          kind: request.kind,
          identity: request.pin.identity,
          ...(request.kind === 'still' ? { pin: request.pin } : {}),
          ...(request.kind === 'authored' ? { pin: request.original } : {}),
          ...(request.release
            ? {
                slotId: request.release.slotId,
                sha256: request.release.asset.file.sha256,
              }
            : {}),
        }),
        notice: request.notice,
      }),
    };
  }
  function waitForPresentation(signal) {
    check(signal);
    return new Promise((resolve, reject) => {
      const abort = () => reject(cancelled());
      signal.addEventListener('abort', abort, { once: true });
      Promise.resolve(presentationPage?.ready ?? null)
        .then(resolve, reject)
        .finally(() => {
          signal.removeEventListener('abort', abort);
        });
      if (signal.aborted) abort();
    });
  }
  function clearBinding() {
    const prior = binding;
    binding = null;
    selection = null;
    prior?.release();
  }
  function cancel() {
    generation++;
    pending?.controller.abort();
    staged?.cancel();
  }
  function clear() {
    cancel();
    clearBinding();
  }
  function operation(
    signal,
    work,
    onStatus = () => {},
    message = t('interface:checkingInstalledChaptersAndPictures'),
  ) {
    check(signal);
    const ticket = ++generation,
      previous = pending,
      controller = new AbortController();
    previous?.controller.abort();
    const abort = () => controller.abort();
    signal?.addEventListener('abort', abort, { once: true });
    if (signal?.aborted) abort();
    const item = { controller, promise: null };
    pending = item;
    const report = (stage, message, status = 'preparing') => {
      if (disposed || controller.signal.aborted || ticket !== generation) return;
      try {
        onStatus({ status, stage, message, progress: null });
      } catch {}
    };
    item.promise = Promise.resolve()
      .then(async () => {
        // Join cancelled authority work before entering its single-operation lock.
        if (previous) await previous.promise.catch(() => {});
        check(controller.signal);
        requireValue(ticket === generation, t('interface:theSelectedCouchChapterChanged'));
        // Legacy pack preparation receives no signal argument from its decoder
        // caller. Bind that decoder to the work actually executing, never to a
        // newer queued operation that is still waiting for this one to unwind.
        executingSignal = controller.signal;
        executingStatus = report;
        try {
          const result = await work(
            controller.signal,
            () => {
              check(controller.signal);
              requireValue(ticket === generation, t('interface:theSelectedCouchChapterChanged'));
            },
            report,
          );
          report('ready', t('interface:installedContentIsReady'), 'ready');
          check(controller.signal);
          requireValue(ticket === generation, t('interface:theSelectedCouchChapterChanged'));
          return result;
        } catch (error) {
          if (error.name !== 'AbortError') report('error', error.message, 'error');
          throw error;
        } finally {
          if (executingSignal === controller.signal) {
            executingSignal = null;
            executingStatus = null;
          }
        }
      })
      .finally(() => {
        signal?.removeEventListener('abort', abort);
        if (pending === item) pending = null;
      });
    report('verifying', message);
    return item.promise;
  }
  async function refresh({ signal, onStatus, expectedPack = null } = {}) {
    staged?.cancel();
    clearBinding();
    forgetPictureRequest();
    externalRequest = null;
    snapshot = null;
    choices = new WeakMap();
    return operation(
      signal,
      async (s, current) => {
        const next = await host.inspect({ signal: s });
        current();
        requireValue(
          next.status === 'checked',
          t('interface:installedChaptersNeedRecoveryInSoloMoreWorldsBeforeRacing'),
        );
        if (expectedPack) {
          const actual = next.packs.packs.find((pack) => pack.id === expectedPack.id);
          requireValue(
            actual && canonicalJSON(actual) === canonicalJSON(expectedPack),
            t('interface:theSelectedChapterChangedRefreshChaptersBeforePlaying'),
          );
        }
        const rows = [];
        for (const entry of next.executionCatalog.entries) {
          if (!entry.sourcePackId || entry.difficulty !== 'standard') continue;
          const external = next.index.chapters.some((item) => item.id === entry.sourcePackId);
          for (const level of entry.campaign.levels) {
            const visuals = {
              ...entry.visualOverrides,
              ...entry.levelVisuals.find((item) => item.levelId === level.id)?.visualOverrides,
            };
            const row = Object.freeze({
              key: `installed/${entry.executionKey}/${level.id}`,
              sourcePackId: entry.sourcePackId,
              musicCampaignKey: entry.baseCampaignKey || campaignKey(entry.campaign),
              chapter: `${SOURCE_EXTERNAL_EDITIONS.find((edition) => edition.descriptor.id === entry.sourcePackId)?.name || entry.campaign.title} · Installed`,
              level,
              classes: entry.classRecipes,
              themes: entry.themes,
              defaultThemeId: level.themeId || entry.campaign.themeId,
              track:
                entry.music.find(
                  (track) => track.id === (level.musicId || entry.campaign.musicId),
                ) || null,
              visualOverrides: Object.freeze(
                Object.fromEntries(
                  Object.entries(visuals).filter(([role]) => role !== 'background'),
                ),
              ),
              external,
            });
            choices.set(row, { snapshot: next, entry, background: visuals.background, external });
            rows.push(row);
          }
        }
        current();
        snapshot = next;
        return Object.freeze(rows);
      },
      onStatus,
    );
  }
  function stateFor(row, themeId) {
    const state = choices.get(row);
    requireValue(
      state && state.snapshot === snapshot,
      t('interface:selectACurrentInstalledCouchChapter'),
    );
    requireValue(
      row.themes.some((theme) => theme.id === themeId),
      t('interface:thisWorldDoesNotBelongToTheSelectedChapter'),
    );
    return state;
  }
  async function verifyCurrent(state, proof, signal, presentation = null, external = null) {
    await host.withCurrent(
      state.snapshot,
      async () => {
        if (proof) {
          const latest = await proof.store.readPresentationMetadata({ signal });
          requireValue(
            latest.metadata.generation === proof.metadata.generation,
            t('interface:installedOriginalsChangedReloadThisChapterBeforeStarting'),
          );
        }
        if (presentation) {
          const { request, lease, committed } = presentation;
          if (committed)
            await request.owner.confirm(request.row, { raceId: request.raceId, signal });
          else await lease.confirm();
        }
        if (external && external.kind !== 'still')
          requireValue(
            external.snapshot === (presentationPage?.current?.() ?? null),
            t('interface:theReleaseArtworkChangedChooseSetupAgain'),
          );
        check(signal);
      },
      { signal },
    );
  }
  async function select(
    row,
    { themeId = row.defaultThemeId, raceId, signal, onStatus } = {},
    stage = null,
  ) {
    const state = stateFor(row, themeId);
    requireValue(
      Number.isSafeInteger(raceId) && raceId >= 0,
      t('interface:useANewInMemoryRaceIdentity'),
    );
    if (!stage) {
      staged?.cancel();
      // A cancelled successor may own the latest request while Results still
      // owns this race. Restore its choice before releasing the accepted lease.
      if (
        selection?.row === row &&
        selection.state === state &&
        selection.themeId === themeId &&
        selection.raceId === raceId
      ) {
        if (selection.external) externalRequest = selection.external;
        if (selection.presentation) {
          const displaced = pictureRequest;
          pictureRequest = selection.presentation.request;
          retirePictureReader(displaced);
        }
      }
      clearBinding();
    }
    return operation(
      signal,
      async (s, current, report) => {
        let candidate = null,
          proof = null,
          presentation = null,
          external = null;
        try {
          if (state.external) {
            proof = await host.authoredPicture(
              state.snapshot,
              {
                executionKey: state.entry.executionKey,
                levelId: row.level.id,
                levelRevision: row.level.revision,
                themeId,
              },
              { signal: s },
            );
            current();
            const prepared = await externalPicture(row, state, themeId, raceId, proof, s, report);
            candidate = prepared.picture;
            external = prepared.request;
          } else {
            const prepared = await embeddedPicture(row, state, themeId, raceId, s, report);
            candidate = prepared.picture;
            presentation = prepared.presentation;
          }
          current();
          report('verifying', t('interface:confirmingTheSelectedChapterAndPicture'));
          await verifyCurrent(state, proof, s, presentation, external);
          current();
          requireValue(
            state === stateFor(row, themeId),
            t('interface:theSelectedInstalledOwnerChanged'),
          );
          const selected = { row, themeId, raceId, state, proof, presentation, external };
          if (stage) {
            stage.current();
            stage.picture = candidate;
            stage.selection = selected;
            candidate = null;
            return stage.picture;
          }
          const retire = presentation?.lease.commit();
          if (presentation) presentation.committed = true;
          binding = candidate;
          candidate = null;
          selection = selected;
          retire?.();
          return binding;
        } finally {
          candidate?.release();
        }
      },
      onStatus,
      t('interface:checkingTheSelectedChapterSExactPicture'),
    );
  }
  // The accepted Results image remains live throughout candidate verification.
  async function stage(row, options = {}) {
    check(options.signal);
    staged?.cancel();
    const controller = new AbortController();
    let live = true;
    const item = {
      picture: null,
      selection: null,
      confirmed: false,
      current() {
        check(controller.signal);
        requireValue(live && staged === item, t('interface:theNextInstalledChapterChanged'));
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
          await operation(
            controller.signal,
            async (s, current) => {
              const selected = item.selection;
              await verifyCurrent(
                selected.state,
                selected.proof,
                s,
                selected.presentation,
                selected.external,
              );
              current();
              requireValue(
                selected.state === stateFor(row, selected.themeId),
                t('interface:theSelectedInstalledOwnerChanged'),
              );
              item.current();
              item.confirmed = true;
            },
            onStatus,
            t('interface:confirmingTheNextChapterBeforeAdoptingIt'),
          );
          item.current();
        },
        commit() {
          item.current();
          requireValue(
            item.confirmed && !pending,
            t('interface:confirmTheNextChapterBeforeAdoptingIt'),
          );
          const previous = binding,
            presentation = item.selection.presentation,
            retirePicture = presentation?.lease.commit();
          if (presentation) presentation.committed = true;
          binding = item.picture;
          selection = item.selection;
          live = false;
          staged = null;
          options.signal?.removeEventListener('abort', item.cancel);
          let retired = false;
          const retire = () => {
            if (retired) return;
            retired = true;
            retirements.delete(retire);
            try {
              previous?.release();
            } catch {}
            retirePicture?.();
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
  async function confirm(row, { raceId, signal, onStatus } = {}) {
    const selected = selection;
    requireValue(
      selected?.row === row && selected.raceId === raceId,
      t('interface:loadTheSelectedOriginalBeforeStarting'),
    );
    return operation(
      signal,
      async (s, current) => {
        await verifyCurrent(
          selected.state,
          selected.proof,
          s,
          selected.presentation,
          selected.external,
        );
        current();
        requireValue(selection === selected, t('interface:thePreparedRaceChanged'));
        return binding;
      },
      onStatus,
      t('interface:confirmingThePreparedPictureBeforeStarting'),
    );
  }
  function dispose() {
    if (disposed) return;
    disposed = true;
    clear();
    for (const retire of retirements) retire();
    forgetPictureRequest();
    externalRequest = null;
    for (const request of pictureReaders) request.owner.dispose();
    pictureReaders.clear();
    choices = new WeakMap();
    snapshot = null;
    host.close();
    manager?.close();
  }
  return Object.freeze({
    refresh,
    // Trusted host adapters can inspect the exact accepted owner. A copied row,
    // stale refresh or caller-supplied pack ID cannot acquire this authority.
    presentationOwner(row) {
      const state = stateFor(row, row?.defaultThemeId);
      return Object.freeze({
        entry: state.entry,
        pack: state.snapshot.packs.packs.find((pack) => pack.id === state.entry.sourcePackId),
      });
    },
    select,
    stage,
    confirm,
    current: () => binding,
    cancel,
    clear,
    dispose,
  });
}
