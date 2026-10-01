import { t } from '../i18n/index.mjs';
import { flightPictureFailure } from './flight-picture-copy.mjs';
import {
  createPresentationPins,
  snapshotPresentationPins,
  PRESENTATION_PINS_FORMAT,
} from '../presentation-pins.mjs';
import {
  createFlightPresentationPins,
  presentationPicturePins,
  validateFlightPresentationPinsForRun,
} from '../flight-media-pins.mjs';
import { createPresentationImageSlot } from './presentation-image.mjs';

/** One attempt's immutable choices and one currently displayed decoded original.
 * acquireLegacy({pin,themeId},{signal}) owns authored legacy-pin decoding, when
 * supplied; legacy:true practice still uses its original no-acquisition path.
 * The caller owns pause/resume intent. No simulation, profile or award writes. */
export function createFlightPictures({
  context,
  level,
  themeIds,
  identityCatalog,
  readMedia,
  pins: savedPins,
  legacy = false,
  explicitLegacy = false,
  acquire,
  acquireLegacy,
  selectPins,
  prepareSelection,
}) {
  const ownContext = Object.freeze({ ...context });
  const worlds = Object.freeze([...themeIds]);
  let pins =
    savedPins === undefined
      ? undefined
      : validateFlightPresentationPinsForRun(savedPins, {
          identityCatalog,
          campaignKey: context.executionKey,
          level,
          themeId: context.themeId,
        });
  if (explicitLegacy && !selectPins)
    pins = snapshotPresentationPins({
      format: PRESENTATION_PINS_FORMAT,
      executionKey: context.executionKey,
      levelId: level.id,
      levelRevision: level.revision,
      choices: worlds.map((themeId) => ({
        kind: 'legacy',
        identity: identityCatalog.resolve({
          executionKey: context.executionKey,
          levelId: level.id,
          levelRevision: level.revision,
          themeId,
        }),
      })),
    });
  let slot = null,
    readyTheme = legacy ? context.themeId : null,
    pending = null,
    generation = 0,
    disposed = false,
    pendingSelection = null;
  function discardSelection(stage = pendingSelection) {
    if (!stage) return;
    if (pendingSelection === stage) {
      pendingSelection = null;
      // An unaccepted session selection is not yet an attempt pin.
      pins = undefined;
    }
    stage.discard();
  }
  function cancel() {
    generation++;
    pending?.abort();
    pending = null;
    discardSelection();
  }
  async function ensure(themeId = ownContext.themeId, { signal, onStatus = () => {} } = {}) {
    if (disposed) throw new Error(t('interface:thisPictureAttemptIsClosed'));
    if (signal?.aborted)
      throw new DOMException(t('interface:picturePreparationCancelled'), 'AbortError');
    cancel();
    if (readyTheme === themeId) return true;
    const ticket = generation,
      controller = new AbortController();
    pending = controller;
    const abort = () => controller.abort();
    signal?.addEventListener('abort', abort, { once: true });
    if (signal?.aborted) abort();
    let candidate = null,
      selectionStage = null;
    const check = () => {
      if (disposed || controller.signal.aborted || ticket !== generation)
        throw new DOMException(t('interface:picturePreparationCancelled'), 'AbortError');
    };
    const report = (value) => {
      if (disposed || controller.signal.aborted || ticket !== generation) return;
      try {
        onStatus({ status: 'preparing', progress: null, ...value });
      } catch {}
    };
    try {
      check();
      if (legacy) {
        readyTheme = themeId;
        return true;
      }
      let media;
      if (!pins) {
        report({
          stage: 'reading',
          message: t('interface:readingThisFlightSPictureChoices'),
          messageKey: 'interface:readingThisFlightSPictureChoices',
        });
        media = await readMedia({ signal: controller.signal });
        check();
        let selection = {
          library: media.metadata.document.library,
          identityCatalog,
          executionKey: context.executionKey,
          levelId: level.id,
          levelRevision: level.revision,
          themeIds: worlds,
        };
        if (prepareSelection && !explicitLegacy) {
          report({
            stage: 'preparing',
            message: t('interface:preparingThisFlightSOriginalPicture'),
            messageKey: 'interface:preparingThisFlightSOriginalPicture',
          });
          const prepared = await prepareSelection({
            media,
            selection,
            signal: controller.signal,
            onStatus: report,
          });
          try {
            check();
          } catch (error) {
            prepared.stage?.discard();
            throw error;
          }
          if (prepared.stage) pendingSelection = selectionStage = prepared.stage;
          media = prepared.media;
          selection = { ...selection, library: prepared.library };
        }
        report({
          stage: 'verifying',
          message: t('interface:checkingThisFlightSExactPictureBinding'),
          messageKey: 'interface:checkingThisFlightSExactPictureBinding',
        });
        const selected = selectPins
          ? await selectPins({ media, selection, explicitLegacy, signal: controller.signal })
          : media.story
            ? await createFlightPresentationPins(
                {
                  ...selection,
                  stillDocument: media.metadata.document,
                  storyDocument: media.story.document,
                },
                { signal: controller.signal },
              )
            : createPresentationPins(selection);
        check();
        pins = selectPins
          ? validateFlightPresentationPinsForRun(selected, {
              identityCatalog,
              campaignKey: context.executionKey,
              level,
              themeId: context.themeId,
            })
          : selected;
      }
      const pin = presentationPicturePins(pins).choices.find(
        (choice) => choice.identity.themeId === themeId,
      );
      if (!pin) throw new Error(t('interface:thisSavedAttemptHasNoPictureChoiceForThatWorld'));
      if (pin.kind === 'still') {
        report({
          stage: 'reading',
          message: t('interface:readingTheSavedPictureOriginal'),
          messageKey: 'interface:readingTheSavedPictureOriginal',
        });
        media ??= await readMedia({ signal: controller.signal });
        check();
        const acquireSelected = selectionStage?.has(pin)
          ? ({ pin }, options) => selectionStage.acquire(pin, options)
          : acquire;
        candidate = createPresentationImageSlot(
          acquireSelected ? { acquire: acquireSelected } : {},
        );
        const next = { ...ownContext, themeId };
        candidate.setContext(next);
        report({
          stage: 'decoding',
          message: t('interface:openingThisFlightSOriginalPicture'),
          messageKey: 'interface:openingThisFlightSOriginalPicture',
        });
        await candidate.load(
          { pin, metadata: media.metadata, store: media.store },
          { context: next, signal: controller.signal },
        );
      } else if (acquireLegacy) {
        report({
          stage: 'decoding',
          message: t('interface:openingThisFlightSAuthoredPicture'),
          messageKey: 'interface:openingThisFlightSAuthoredPicture',
        });
        check();
        const handle = await acquireLegacy({ pin, themeId }, { signal: controller.signal });
        // Install the disposal owner before checking cancellation: an injected
        // acquisition may ignore abort and return its drawable late.
        candidate = handle
          ? Object.freeze({ current: () => handle, dispose: () => handle.dispose() })
          : null;
      }
      check();
      // The original is verified and the requested display is ready. Accept
      // session history synchronously only while this attempt still owns it.
      selectionStage?.accept();
      if (pendingSelection === selectionStage) pendingSelection = null;
      const prior = slot;
      slot = candidate;
      candidate = null;
      readyTheme = themeId;
      prior?.dispose();
      report({
        status: 'ready',
        stage: 'ready',
        message: t('interface:thisFlightSPictureIsReady'),
        messageKey: 'interface:thisFlightSPictureIsReady',
      });
      return true;
    } catch (error) {
      discardSelection(selectionStage);
      if (error.name !== 'AbortError')
        report({
          status: 'error',
          stage: 'error',
          message: flightPictureFailure(error),
          messageKey:
            error?.name === 'ReleasePictureWriteRequiredError'
              ? 'errors:picture.writeRequired'
              : 'errors:picture.unavailable',
          diagnostic: error.message,
        });
      throw error;
    } finally {
      signal?.removeEventListener('abort', abort);
      candidate?.dispose();
      if (pending === controller) pending = null;
    }
  }
  function dispose() {
    if (!disposed) {
      disposed = true;
      cancel();
      slot?.dispose();
      slot = null;
    }
  }
  return Object.freeze({
    ensure,
    cancel,
    dispose,
    pins: () => pins,
    ready: (themeId) => readyTheme === themeId,
    current: () => slot?.current() ?? null,
    identityCatalog,
    legacy,
    context: ownContext,
  });
}
