import { t } from '../i18n/index.mjs';
import { canonicalJSON, required } from '../data-json.mjs';
import { createManagedMediaStore } from '../managed-media-store.mjs';
import { ownSoundtrackBlob, throwIfSoundtrackAborted } from '../mp3.mjs';
import {
  resolveSoundtrackLibrary,
  soundtrackStoredTracks,
  setCatalogueTracks,
  SOUNDTRACK_LIMITS,
} from '../soundtrack.mjs';
import { createSoundtrackStore } from '../soundtrack-store.mjs';

/** Shared audio-domain owner; no profile, gameplay or transport-intent writes.
 * Construct the player with readAsset: (hash) => owner.readAsset(hash), then
 * construct this owner before loading or requesting playback. Dispose the
 * player before closing the owner. A supplied catalogue-aware DB5 manager remains borrowed.
 */
export function createCouchMusicLibrary({
  player,
  managedStore,
  indexedDB = globalThis.indexedDB,
  estimate,
  catalogue,
} = {}) {
  required(
    typeof player?.setLibrary === 'function',
    t('interface:couchMusicRequiresASoundtrackPlayer'),
  );
  required(
    !managedStore || managedStore.soundtrackCatalogue === true,
    t('interface:couchMusicRequiresTheSharedCatalogueDb5MediaStore'),
  );
  const ownsManager = !managedStore;
  const manager =
    managedStore ?? createManagedMediaStore({ indexedDB, estimate, soundtrackCatalogue: true });
  const store = createSoundtrackStore({ managedStore: manager });
  const operations = new Set();
  let accepted = null,
    assets = new Map(),
    status = 'idle',
    error = null;
  let closed = false,
    saving = false,
    request = 0;
  const check = () => required(!closed, t('interface:couchMusicLibraryIsClosed'));
  const snapshot = () =>
    Object.freeze({
      status,
      error,
      generation: accepted?.generation ?? null,
      library: accepted?.library ?? null,
    });
  function operation(signal) {
    check();
    throwIfSoundtrackAborted(signal);
    const controller = new AbortController();
    const cancel = () => controller.abort();
    signal?.addEventListener('abort', cancel, { once: true });
    operations.add(controller);
    return {
      signal: controller.signal,
      finish() {
        signal?.removeEventListener('abort', cancel);
        operations.delete(controller);
      },
    };
  }
  function adopt(value) {
    required(
      Number.isSafeInteger(value?.generation) &&
        value.generation >= 0 &&
        value.generation < Number.MAX_SAFE_INTEGER,
      t('interface:invalidCouchMusicGeneration'),
    );
    if (accepted && value.generation < accepted.generation) return false;
    const library = resolveSoundtrackLibrary(value.library);
    if (accepted && value.generation === accepted.generation) {
      required(
        canonicalJSON(library) === canonicalJSON(accepted.library),
        t('interface:couchMusicGenerationConflictReloadTheSavedLibrary'),
      );
      // Do not reset an explicit session playlist on a same-generation refresh.
      return false;
    }
    const expected = new Map(
      soundtrackStoredTracks(library).map((track) => [track.asset.sha256, track.asset.bytes]),
    );
    required(
      Array.isArray(value.assets) && value.assets.length === expected.size,
      t('interface:couchMusicOriginalsAreMissingOrDuplicatedRestoreTheLibrary'),
    );
    const next = new Map();
    let bytes = 0;
    for (const asset of value.assets) {
      required(
        expected.has(asset?.sha256) && !next.has(asset.sha256),
        t('interface:unexpectedOrDuplicateCouchMusicOriginal'),
      );
      const blob = ownSoundtrackBlob(asset.blob);
      required(
        blob.size === expected.get(asset.sha256),
        t('interface:couchMusicOriginalHasTheWrongSizeRestoreTheLibrary'),
      );
      bytes += blob.size;
      required(
        bytes <= SOUNDTRACK_LIMITS.managedBytes,
        t('interface:couchMusicOriginalsExceedTheSharedMediaBudget'),
      );
      next.set(asset.sha256, blob);
    }
    // Store reads/prepared commits are the validation boundary. The player also
    // verifies MP3 hash/frames before playback; adoption does not decode an album.
    const previous = assets;
    assets = next;
    try {
      player.setLibrary(catalogue ? setCatalogueTracks(library, catalogue.tracks) : library, {
        publicStyles: value.publicStyles,
      });
      if (closed)
        throw new DOMException(t('interface:couchMusicLibraryClosedDuringAdoption'), 'AbortError');
    } catch (cause) {
      if (!closed) assets = previous;
      throw cause;
    }
    accepted = Object.freeze({ generation: value.generation, library });
    return true;
  }
  function result(adopted) {
    return Object.freeze({ adopted, saved: accepted });
  }
  async function load({ signal } = {}) {
    check();
    required(!saving, t('interface:aMusicLibrarySaveIsInProgress'));
    const op = operation(signal),
      ticket = ++request;
    status = 'loading';
    error = null;
    try {
      const value = await store.read({ signal: op.signal });
      throwIfSoundtrackAborted(op.signal);
      if (ticket !== request) return result(false);
      const adopted = adopt(value);
      status = 'ready';
      return result(adopted);
    } catch (cause) {
      if (!closed && ticket === request) {
        status = 'error';
        error = cause.message;
      }
      throw cause;
    } finally {
      op.finish();
    }
  }
  async function commit(
    prepared,
    { expectedGeneration = accepted?.generation, signal, ...options } = {},
  ) {
    check();
    required(!saving, t('interface:aMusicLibrarySaveIsInProgress'));
    required(
      accepted && expectedGeneration === accepted.generation,
      t('interface:theMusicLibraryChangedOrHasNotLoadedReloadBefore'),
    );
    const op = operation(signal),
      ticket = ++request;
    saving = true;
    status = 'saving';
    error = null;
    try {
      const value = await store.commit(prepared, {
        ...options,
        expectedGeneration,
        signal: op.signal,
      });
      throwIfSoundtrackAborted(op.signal);
      const adopted = adopt({ ...value, assets: prepared.assets });
      status = 'ready';
      return result(adopted);
    } catch (cause) {
      if (!closed && ticket === request) {
        status = 'error';
        error = cause.message;
      }
      // A durable store commit cannot be rolled back if the host is then closed
      // or refuses adoption. Reload on recovery; never retry a write silently.
      throw cause;
    } finally {
      saving = false;
      op.finish();
    }
  }
  /** Only for a validated store read or completed prepared-library commit.
   * This synchronous boundary replaces panel metadata adoption, never import
   * validation. Reject older snapshots so the panel also retains its draft.
   */
  function adoptVerifiedSnapshot(value) {
    check();
    required(!saving, t('interface:aMusicLibrarySaveIsInProgress'));
    required(
      !accepted || value?.generation >= accepted.generation,
      t('interface:anOlderMusicLibraryCannotReplaceTheAcceptedSelectionReload'),
    );
    request++;
    try {
      const adopted = adopt(value);
      status = 'ready';
      error = null;
      return result(adopted);
    } catch (cause) {
      if (!closed) {
        status = 'error';
        error = cause.message;
      }
      throw cause;
    }
  }
  return Object.freeze({
    load,
    commit,
    adoptVerifiedSnapshot,
    snapshot,
    readAsset(hash, { allowMissing = false, signal } = {}) {
      check();
      throwIfSoundtrackAborted(signal);
      const blob = assets.get(hash);
      if (!blob && allowMissing) return null;
      required(blob, t('interface:thisMusicOriginalIsUnavailableReloadOrRestoreTheLibrary'));
      return blob;
    },
    close() {
      if (closed) return;
      closed = true;
      request++;
      status = 'closed';
      error = null;
      for (const controller of operations) controller.abort();
      assets = new Map();
      accepted = null;
      store.close();
      if (ownsManager) manager.close();
    },
  });
}
