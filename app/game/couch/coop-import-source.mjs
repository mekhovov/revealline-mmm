import { t } from '../i18n/index.mjs';
import {
  readCoopPresentationEnvelope,
  exportCoopPresentationEnvelope,
  disposeCoopPresentationEnvelope,
} from '../coop/presentation-envelope.mjs';
import { decodeCoopPicture } from './coop-picture-image.mjs';

const cancelled = () => new DOMException(t('interface:teamArtworkImportCancelled'), 'AbortError');

/** An in-memory staging boundary. The host still checks theme/content identity
 * and prepares its drawable image before deliberately committing a candidate.
 * No player storage, registry or simulation object is changed here.
 */
export function createCoopPresentationImport({ decodeImage = decodeCoopPicture } = {}) {
  if (typeof decodeImage !== 'function')
    throw new TypeError(t('interface:anImageDecoderIsRequired'));
  let accepted = null,
    candidate = null,
    operation = null,
    closed = false;
  const requireOpen = () => {
    if (closed) throw new Error(t('interface:thisTeamArtworkImporterHasBeenClosed'));
  };
  const releaseCandidate = () => {
    if (candidate) disposeCoopPresentationEnvelope(candidate.owner);
    candidate = null;
  };
  async function prepare(source, { signal, onProgress } = {}) {
    requireOpen();
    if (operation)
      throw new Error(t('interface:thePreviousTeamArtworkImportIsStillFinishingTryAgain'));
    if (signal?.aborted) throw cancelled();
    releaseCandidate();
    const request = { controller: new AbortController(), signal };
    // Own the slot before invoking any code-owned decoder or status callback.
    operation = request;
    const abort = () => request.controller.abort();
    let owner;
    try {
      signal?.addEventListener('abort', abort, { once: true });
      if (signal?.aborted) abort();
      owner = await readCoopPresentationEnvelope(source, {
        decodeImage,
        signal: request.controller.signal,
        onProgress,
      });
      if (closed || operation !== request || request.controller.signal.aborted || signal?.aborted)
        throw cancelled();
      candidate = { owner, signal };
      return owner;
    } catch (error) {
      if (owner) disposeCoopPresentationEnvelope(owner);
      throw error;
    } finally {
      signal?.removeEventListener('abort', abort);
      if (operation === request) operation = null;
    }
  }
  function commit(owner) {
    requireOpen();
    if (operation || !candidate || candidate.owner !== owner)
      throw new Error(t('interface:chooseTheCurrentFullyPreparedTeamArtworkCandidate'));
    if (candidate.signal?.aborted) {
      releaseCandidate();
      throw cancelled();
    }
    // Verify that a host has not already disposed the opaque source.
    exportCoopPresentationEnvelope(owner);
    const previous = accepted;
    accepted = owner;
    candidate = null;
    if (previous) disposeCoopPresentationEnvelope(previous);
    return accepted;
  }
  function cancel() {
    const changed = Boolean(candidate || (operation && !operation.controller.signal.aborted));
    operation?.controller.abort();
    releaseCandidate();
    return changed;
  }
  function retire(owner) {
    // A host may switch back to built-in/JSON content without replacing this
    // manager or abandoning an uncancellable pending validation operation.
    if (!owner || accepted !== owner) return false;
    accepted = null;
    disposeCoopPresentationEnvelope(owner);
    return true;
  }
  function dispose() {
    if (closed) return false;
    closed = true;
    cancel();
    if (accepted) disposeCoopPresentationEnvelope(accepted);
    accepted = null;
    return true;
  }
  return Object.freeze({
    prepare,
    commit,
    cancel,
    retire,
    dispose,
    current: () => accepted,
    pending: () => Boolean(operation),
    exportCurrent: () => exportCoopPresentationEnvelope(accepted),
  });
}
