import { t } from '../i18n/index.mjs';
import {
  restoreSession,
  saveSession,
  snapshotSession,
  suspendSession,
  SESSION_STORAGE_BYTES,
} from '../sessions.mjs';
import { authoritativeCheckpoint, exportReplay } from '../replay.mjs';
import { canonicalJSON } from '../data-json.mjs';

const abort = (signal) => {
  if (signal?.aborted) throw new DOMException(t('interface:courseEntryWasCancelled'), 'AbortError');
};

/** Retain a paused real flight before navigating away. The host freezes input
 * without autosaving before calling this function. It owns the writer/context
 * checks and the existing backup lock; this helper never navigates or adopts
 * the reconstructed run. Ready/terminal callers need no checkpoint handoff.
 */
export async function retainFlightForFirstFlight({
  run,
  recorder,
  campaign,
  campaignKey,
  themeId,
  bodyId,
  runId,
  continuation,
  presentationPins,
  presentationLevel,
  visualThemePin,
  actorAppearancePin,
  mediaIdentityCatalog,
  storage,
  sessionKey,
  withStorageLock,
  assertCurrent,
  assertWritable,
  signal,
  onProgress,
}) {
  if (
    !run ||
    !['running', 'respawning'].includes(run.status) ||
    typeof storage?.getItem !== 'function' ||
    typeof storage?.setItem !== 'function' ||
    typeof sessionKey !== 'string' ||
    !sessionKey ||
    typeof withStorageLock !== 'function' ||
    typeof assertCurrent !== 'function' ||
    typeof assertWritable !== 'function'
  )
    throw new TypeError(t('interface:courseEntryNeedsAnUnfinishedFlightAndCheckedStorageAdapters'));

  function current() {
    abort(signal);
    assertCurrent();
  }
  let previous;
  await withStorageLock(async () => {
    current();
    await assertWritable();
    current();
    previous = storage.getItem(sessionKey);
    if (previous !== null) {
      if (
        typeof previous !== 'string' ||
        new TextEncoder().encode(previous).length > SESSION_STORAGE_BYTES
      )
        throw new Error(t('interface:theExistingSavedFlightCannotBeReadSafelyItsBytes'));
      try {
        snapshotSession(JSON.parse(previous));
      } catch {
        throw new Error(t('interface:theExistingSavedFlightIsUnreadableOrUnsupportedItsBytes'));
      }
    }
  });
  current();
  const session = suspendSession({
    run,
    recorder,
    campaignKey,
    themeId,
    bodyId,
    runId,
    continuation,
    presentationPins,
    presentationLevel,
    ...(visualThemePin !== undefined ? { visualThemePin } : {}),
    ...(actorAppearancePin !== undefined ? { actorAppearancePin } : {}),
  });
  const checkpoint = canonicalJSON(authoritativeCheckpoint(run));
  const recording = canonicalJSON(session.replay);
  const restored = await restoreSession(session, {
    campaign,
    campaignKey,
    signal,
    onProgress,
    mediaIdentityCatalog,
  });
  current();
  if (canonicalJSON(authoritativeCheckpoint(restored.run)) !== checkpoint)
    throw new Error(t('interface:theSavedFlightDidNotReconstructTheCurrentCheckpoint'));

  await withStorageLock(async () => {
    current();
    await assertWritable();
    current();
    if (
      canonicalJSON(authoritativeCheckpoint(run)) !== checkpoint ||
      canonicalJSON(exportReplay(recorder, run)) !== recording
    )
      throw new Error(t('interface:theFlightChangedWhilePreparingTheCourseItRemainsOpen'));
    if (storage.getItem(sessionKey) !== previous)
      throw new Error(t('interface:theSavedFlightChangedElsewhereCourseEntryWasCancelled'));
    const saved = saveSession(storage, sessionKey, session);
    if (!saved.ok) throw new Error(saved.warning);
    current();
    let readback;
    try {
      readback = snapshotSession(JSON.parse(storage.getItem(sessionKey)));
    } catch {
      throw new Error(t('interface:theNewSavedFlightCouldNotBeReadBackThis'));
    }
    if (canonicalJSON(readback) !== canonicalJSON(session))
      throw new Error(t('interface:theSavedFlightReadbackDidNotMatchThisFlightIs'));
  });
  current();
  return { session, checkpoint: authoritativeCheckpoint(restored.run) };
}
