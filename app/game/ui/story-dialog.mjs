import { t, localizedText, localizedAttribute } from '../i18n/index.mjs';
import { createOperationStatus } from './operation-status.mjs';
import { canonicalJSON, required } from '../data-json.mjs';
import { snapshotStoryPin, resolveAuthoredStoryPin } from '../story-bindings.mjs';
import { requirePreparedVictoryStory } from '../victory-story.mjs';
import { createVictoryStoryPresentation } from './victory-story.mjs';

/** Caller proves execution/earned ownership before offering the pin. This boundary
 * verifies its exact retained descriptor and original; today's binding is irrelevant. */
export async function acquirePinnedStory({ pin: source, media }, { signal, ...inspection } = {}) {
  const pin = snapshotStoryPin(source);
  required(
    pin && media?.storyStore && media.story,
    t('interface:theCompatibleStoryStoreIsUnavailable'),
  );
  const selected = await resolveAuthoredStoryPin(
    pin,
    {
      document: media.story.document,
      still: media.metadata.document,
      picturePin: pin.picturePin,
    },
    { signal },
  );
  required(selected.kind === 'available', t('interface:restoreThisStorySExactRlstoryOriginal'));
  const prepared = await media.storyStore.acquire(
    { id: pin.id, revision: pin.revision, picturePin: pin.picturePin },
    { signal, ...inspection },
  );
  const checked = requirePreparedVictoryStory(prepared, pin.picturePin);
  required(
    canonicalJSON(checked.descriptor) === canonicalJSON(selected.descriptor),
    t('interface:theAcquiredMovieDoesNotMatchTheFrozenStoryRevision'),
  );
  if (signal?.aborted) throw new DOMException(t('interface:storyOpeningCancelled'), 'AbortError');
  return prepared;
}

/** One native dialog reuses the host's existing modal navigation. A staged poster
 * is present before asynchronous metadata/codec work; no gameplay or award API. */
export function createStoryDialog({
  document: doc = document,
  window: win = window,
  readMedia,
  settings,
  saveVolume = () => {},
  neutralize = () => {},
  musicDucker = null,
  audioMaster = null,
  acquire = acquirePinnedStory,
  createPresentation = createVictoryStoryPresentation,
} = {}) {
  const dialog = doc.createElement('dialog'),
    title = doc.createElement('h2'),
    close = doc.createElement('button'),
    notice = doc.createElement('p'),
    stage = doc.createElement('div');
  dialog.id = 'victory-story-dialog';
  dialog.className = 'wide-dialog story-dialog';
  title.id = 'victory-story-title';
  dialog.setAttribute('aria-labelledby', title.id);
  close.type = 'button';
  close.className = 'dialog-close';
  localizedText(close, () => '×');
  close.setAttribute('aria-label', t('interface:closeStory'));
  const feedback = createOperationStatus(notice);
  stage.className = 'story-stage';
  dialog.append(close, title, notice, stage);
  doc.body.append(dialog);
  let controller = null,
    presentation = null,
    generation = 0,
    disposed = false,
    previousSettings = null,
    externalCleanup = null;
  const failure = (error) =>
    t('gameplay:storyUnavailableYourExactPictureStaysVisibleRestoreItsOriginal', {
      value1: error instanceof Error ? error.message : String(error),
    });
  function cancel() {
    feedback.clear();
    generation++;
    externalCleanup?.();
    externalCleanup = null;
    controller?.abort();
    controller = null;
    presentation?.dispose();
    presentation = null;
    previousSettings = null;
    neutralize();
  }
  function closeDialog() {
    cancel();
    if (dialog.open) dialog.close();
  }
  function syncSettings() {
    if (!presentation) return;
    const next = settings();
    if (canonicalJSON(next) !== canonicalJSON(previousSettings)) {
      previousSettings = { ...next };
      presentation.setPreferences(next);
    }
  }
  async function open({ pin: source, title: label, drawPoster }, { signal } = {}) {
    required(!disposed, t('interface:theStoryViewIsClosed'));
    const pin = snapshotStoryPin(source);
    required(
      pin && typeof drawPoster === 'function',
      t('interface:anExactStoryAndDecodedPosterAreRequired'),
    );
    if (signal?.aborted) return false;
    // Draw offscreen first: a failed caller draw cannot replace an open prior picture.
    const canvas = doc.createElement('canvas');
    canvas.setAttribute('role', 'img');
    localizedAttribute(canvas, 'aria-label', () => t('interface:exactUnlockedPicture'));
    drawPoster(canvas);
    cancel();
    const ticket = generation,
      own = new AbortController();
    controller = own;
    const abort = () => {
      if (controller === own) closeDialog();
    };
    signal?.addEventListener('abort', abort, { once: true });
    externalCleanup = () => signal?.removeEventListener('abort', abort);
    localizedText(title, () => label);
    stage.replaceChildren(canvas);
    const lease = feedback.begin({
      message: t('interface:yourPictureIsReadyReadingOptionalStoryMetadata'),
      stage: 'reading',
      isCurrent: () => !disposed && generation === ticket && controller === own,
    });
    dialog.dataset.storyState = 'preparing';
    stage.setAttribute('aria-busy', 'true');
    if (!dialog.open) dialog.showModal();
    close.focus({ preventScroll: true });
    const current = () =>
      !disposed &&
      dialog.open &&
      controller === own &&
      generation === ticket &&
      !own.signal.aborted;
    try {
      if (signal?.aborted) {
        abort();
        return false;
      }
      const media = await readMedia({ signal: own.signal });
      if (!current()) return false;
      lease.update({
        message: t('interface:checkingAndOpeningTheExactStoryOriginal'),
        stage: 'verifying',
      });
      const prepared = await acquire({ pin, media }, { signal: own.signal });
      if (!current()) return false;
      const initial = settings();
      previousSettings = { ...initial };
      let volume = initial.volume;
      const created = createPresentation({
        container: stage,
        posterElement: canvas,
        picturePin: pin.picturePin,
        prepared,
        document: doc,
        window: win,
        signal: own.signal,
        musicDucker,
        ...initial,
        audioMaster,
        onChange(snapshot) {
          if (!current()) return;
          neutralize();
          dialog.dataset.storyState = snapshot.state;
          stage.setAttribute('aria-busy', 'false');
          if (snapshot.volume !== volume) {
            volume = snapshot.volume;
            try {
              saveVolume(volume);
            } catch (error) {
              lease.finish({
                message: `Cinematic preference could not be saved. ${error.message}`,
                state: 'error',
              });
            }
            previousSettings = { ...settings() };
          }
        },
      });
      if (!current()) {
        created.dispose();
        return false;
      }
      presentation = created;
      stage.setAttribute('aria-busy', 'false');
      lease.finish();
      return true;
    } catch (error) {
      if (current()) {
        lease.finish({ message: failure(error), state: 'error' });
        dialog.dataset.storyState = 'unavailable';
        stage.setAttribute('aria-busy', 'false');
      }
      return false;
    } finally {
      if (controller !== own) signal?.removeEventListener('abort', abort);
    }
  }
  close.onclick = closeDialog;
  const closed = () => {
    if (!dialog.open) cancel();
  };
  const cancelled = () => cancel();
  dialog.addEventListener('close', closed);
  dialog.addEventListener('cancel', cancelled);
  const hidden = () => {
    if (doc.hidden) {
      if (presentation) presentation.pause();
      else closeDialog();
    }
  };
  const blurred = () => {
    if (presentation) presentation.pause();
    else if (dialog.open) closeDialog();
  };
  doc.addEventListener('visibilitychange', hidden);
  win.addEventListener('blur', blurred);
  const pageHidden = (event) => {
    if (event.persisted) closeDialog();
    else dispose();
  };
  function dispose() {
    if (disposed) return;
    disposed = true;
    closeDialog();
    feedback.dispose();
    doc.removeEventListener('visibilitychange', hidden);
    win.removeEventListener('blur', blurred);
    win.removeEventListener('pagehide', pageHidden);
    dialog.removeEventListener('close', closed);
    dialog.removeEventListener('cancel', cancelled);
    dialog.remove();
  }
  win.addEventListener('pagehide', pageHidden);
  return Object.freeze({ dialog, open, close: closeDialog, syncSettings, dispose });
}
