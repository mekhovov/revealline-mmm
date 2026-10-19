import { t } from '../i18n/index.mjs';
import { boundedJSON, canonicalJSON, required } from '../data-json.mjs';
import {
  exportCoopPresentationEnvelope,
  readCoopPresentationPicture,
} from '../coop/presentation-envelope.mjs';
import { COOP_PACK_MAX_BYTES } from '../coop/recipes.mjs';
import { createPresentationHost } from '../presentation/host.mjs';
import { createCoopPresentation } from './coop-presentation.mjs';
import { COOP_RETAINED_PRESENTATIONS } from './coop-retained-presentation.mjs';

const same = (a, b) => canonicalJSON(a) === canonicalJSON(b);
const abort = () =>
  new DOMException(t('interface:teamPicturePreparationWasCancelled'), 'AbortError');
const quiet = (callback) => {
  try {
    callback?.();
  } catch {
    // Retiring a staged resource cannot adopt or replace the previous attempt.
  }
};

/** Own one historical theme and picture together. Current artwork, historical
 * JSON and unsupported envelope identities still use the ordinary strict resolver.
 * This neither applies a global skin nor grants imported content release approval.
 */
export function createOwnedCoopPresentation({
  artworkSource = null,
  createHost = (association) =>
    createPresentationHost({ retainedManifestSha256: association.sha256, skipTitleArtwork: true }),
  ...options
}) {
  if (artworkSource !== null) exportCoopPresentationEnvelope(artworkSource);
  const association = COOP_RETAINED_PRESENTATIONS.find(
    (entry) =>
      artworkSource &&
      same(artworkSource.receipt.theme, { ...entry.theme, collection: entry.collection }),
  );
  if (!association) return createCoopPresentation(options);
  let closed = false,
    accepted = null,
    pending = null;
  const ownRequest = (request) => {
    required(!closed, t('interface:teamPresentationIsClosed'));
    required(request && typeof request === 'object', t('interface:aTeamPictureRequestIsRequired'));
    required(
      request.artworkSource === artworkSource,
      t('interface:localTeamArtworkRequiresItsExactAcceptedPackAndPrepared'),
    );
    exportCoopPresentationEnvelope(artworkSource);
    const pack = boundedJSON(request.pack, { maxBytes: COOP_PACK_MAX_BYTES, maxArray: 4096 });
    required(
      same(pack, artworkSource.pack),
      t('interface:localTeamArtworkBelongsToADifferentExactPack'),
    );
    const level = pack.levels.find((entry) => entry.id === request.levelId);
    readCoopPresentationPicture(artworkSource, level);
    required(
      request.themeId === association.theme.id,
      t('interface:localTeamArtworkRequiresItsExactAcceptedPackAndPrepared'),
    );
    if (request.signal?.aborted) throw abort();
    return { ...request, pack };
  };
  const retire = (state) => {
    if (!state) return;
    if (!state.retired) {
      state.retired = true;
      state.controller.abort();
      state.request.signal?.removeEventListener('abort', state.abort);
    }
    // Also collect a host returned after synchronous constructor reentry.
    const picture = state.picture;
    const host = state.host;
    state.picture = null;
    state.host = null;
    quiet(() => picture?.dispose());
    quiet(() => host?.close());
  };
  const current = (state) => {
    if (closed || pending !== state || state.retired || state.controller.signal.aborted)
      throw abort();
    exportCoopPresentationEnvelope(artworkSource);
  };
  async function prepare(state) {
    try {
      current(state);
      state.host = createHost(association);
      current(state);
      const snapshot = await state.host.load({
        signal: state.controller.signal,
        expectedManifestSha256: association.sha256,
        onStatus(status) {
          if (
            closed ||
            pending !== state ||
            state.controller.signal.aborted ||
            status.status === 'ready'
          )
            return;
          try {
            state.request.onStatus?.(status);
          } catch {
            // Status observers do not own resources or admission.
          }
        },
      });
      current(state);
      required(
        snapshot?.manifestSha256 === association.sha256 &&
          same(snapshot.source, association.source) &&
          same(
            { id: snapshot.resolved.theme.id, revision: snapshot.resolved.theme.revision },
            association.theme,
          ) &&
          same(snapshot.resolved.collection, association.collection),
        t('interface:noMatchingPreparedTeamThemeSnapshot'),
      );
      state.snapshot = snapshot;
      state.picture = createCoopPresentation({
        ...options,
        bindings: association.bindings,
        historicalImportPolicy: association.policy,
        getSnapshot: () => (closed || state.retired ? null : snapshot),
        readPicture: (...args) => state.host.readPicture(...args),
      });
      const binding = await state.picture.select({
        ...state.request,
        signal: state.controller.signal,
      });
      current(state);
      state.picture.confirm(state.request);
      current(state);
      const previous = accepted;
      accepted = state;
      retire(previous);
      current(state);
      return binding;
    } finally {
      state.request.signal?.removeEventListener('abort', state.abort);
      if (accepted !== state) retire(state);
      if (pending === state) pending = null;
    }
  }
  return Object.freeze({
    select(request) {
      let owned;
      try {
        owned = ownRequest(request);
      } catch (error) {
        return Promise.reject(error);
      }
      const key = canonicalJSON([owned.pack, owned.levelId, owned.themeId, owned.attemptId]);
      if (accepted?.key === key) {
        retire(pending);
        pending = null;
        return accepted.picture.select(owned);
      }
      if (pending?.key === key && !pending.controller.signal.aborted) return pending.promise;
      retire(pending);
      const state = {
        key,
        request: owned,
        controller: new AbortController(),
        host: null,
        picture: null,
        snapshot: null,
        retired: false,
      };
      state.abort = () => state.controller.abort();
      owned.signal?.addEventListener('abort', state.abort, { once: true });
      if (owned.signal?.aborted) state.abort();
      pending = state;
      state.promise = Promise.resolve().then(() => prepare(state));
      return state.promise;
    },
    confirm(request) {
      const owned = ownRequest(request);
      required(accepted, t('interface:theExactTeamPictureIsNotReadyForThisRequest'));
      return accepted.picture.confirm(owned);
    },
    current: () => accepted?.picture.current() ?? null,
    readAudio(slot, options = {}) {
      required(
        !closed && accepted && !accepted.retired,
        t('interface:thisTeamPictureAttemptIsNoLongerCurrent'),
      );
      exportCoopPresentationEnvelope(artworkSource);
      required(
        options.snapshot === accepted.snapshot,
        t('interface:teamPresentationChangedPrepareANewAttempt'),
      );
      return accepted.host.readAudio(slot, options);
    },
    cancel() {
      pending?.controller.abort();
      accepted?.picture.cancel();
    },
    dispose() {
      if (closed) return;
      closed = true;
      retire(pending);
      retire(accepted);
      accepted = null;
    },
  });
}
