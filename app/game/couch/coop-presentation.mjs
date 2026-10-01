import { t } from '../i18n/index.mjs';
import { boundedJSON, canonicalJSON, exactKeys, required, stableId } from '../data-json.mjs';
import { validateCoopPack, COOP_PACK_MAX_BYTES } from '../coop/recipes.mjs';
import { inspectImageDataUrl } from '../content.mjs';
import { hashPresentationBytes } from '../presentation/bundle.mjs';
import { freezePresentation, LIMITS, validateAssetRevision } from '../presentation/model.mjs';
import {
  exportCoopPresentationEnvelope,
  readCoopPresentationPicture,
} from '../coop/presentation-envelope.mjs';

const digest = (value) => typeof value === 'string' && /^[a-f0-9]{64}$/.test(value);
const revision = (value) => Number.isSafeInteger(value) && value > 0;
const identifier = (value) => typeof value === 'string' && value.length > 0 && value.length <= 100;
// Historical level revisions are opaque strings or positive integer Numbers.
// Asset/theme revisions remain their separate, stricter presentation contract.
const levelRevision = (value) => identifier(value) || (Number.isInteger(value) && value > 0);
const fields = (value, names, label) => {
  const keys = names.split(' ');
  exactKeys(value, keys, label);
  required(
    keys.every((key) => Object.hasOwn(value, key)),
    `${label} is incomplete.`,
  );
};
function identityFields(value, names, label) {
  const pinned = Object.hasOwn(value, 'manifestSha256');
  fields(value, names + (pinned ? ' manifestSha256' : ''), label);
  required(
    !pinned || digest(value.manifestSha256),
    'Invalid exact presentation manifest identity.',
  );
}
function matchesManifest(candidate, theme) {
  return (
    !Object.hasOwn(candidate, 'manifestSha256') || candidate.manifestSha256 === theme.manifestSha256
  );
}
function pictureIdentity(picture) {
  fields(
    picture,
    'slot assetId assetRevision sha256 bytes mime width height',
    t('interface:teamPicture'),
  );
  required(
    stableId(picture.slot) &&
      stableId(picture.assetId) &&
      revision(picture.assetRevision) &&
      digest(picture.sha256) &&
      revision(picture.bytes) &&
      picture.bytes <= LIMITS.assetBytes &&
      ['image/png', 'image/jpeg', 'image/webp'].includes(picture.mime) &&
      picture.width === 1152 &&
      picture.height === 576,
    t('interface:teamPictureRequiresABoundedComplete1152576PngJpeg'),
  );
}
function historicalPolicy(source) {
  if (source === null || source === undefined) return null;
  const policy = boundedJSON(source, { maxBytes: 4096, maxArray: 20 });
  identityFields(
    policy,
    'version themeId themeRevision collection picture',
    t('interface:teamHistoricalImportPolicy'),
  );
  required(
    policy.version === 'revealline-team-historical-import-picture.v1' &&
      stableId(policy.themeId) &&
      revision(policy.themeRevision) &&
      policy.collection === null,
    t('interface:invalidTeamHistoricalImportPicturePolicy'),
  );
  pictureIdentity(policy.picture);
  required(
    policy.picture.slot === 'scene.reveal.wide',
    t('interface:historicalTeamImportsRequireAnExplicitWideSceneAssociation'),
  );
  return freezePresentation(policy);
}
function historicalPolicies(source) {
  if (source === null || source === undefined) return [];
  const entries = Array.isArray(source)
    ? // Current canonical104 and45 retained identities, including manifest-pinned published101.
      // Another supported edition must deliberately revisit this finite bound.
      boundedJSON(source, { maxBytes: 43 * 1024, maxArray: 46 })
    : [source];
  const seen = new Set();
  return freezePresentation(
    entries.map((entry) => {
      const policy = historicalPolicy(entry);
      required(policy, t('interface:aTeamHistoricalPolicyEntryIsRequired'));
      const key = canonicalJSON({
        themeId: policy.themeId,
        themeRevision: policy.themeRevision,
        collection: policy.collection,
        ...(Object.hasOwn(policy, 'manifestSha256')
          ? { manifestSha256: policy.manifestSha256 }
          : {}),
      });
      required(!seen.has(key), t('interface:duplicateTeamHistoricalPictureIdentity'));
      seen.add(key);
      return policy;
    }),
  );
}
function bindingTable(source) {
  const rows = boundedJSON(source, { maxBytes: 256 * 1024, maxArray: 128 });
  required(Array.isArray(rows), t('interface:teamPictureBindingsMustBeAFiniteList'));
  const seen = new Set();
  for (const row of rows) {
    identityFields(
      row,
      'packId packRevision packSha256 levelId levelRevision levelSha256 themeId themeRevision collection picture',
      t('interface:teamBinding'),
    );
    required(
      identifier(row.packId) &&
        revision(row.packRevision) &&
        digest(row.packSha256) &&
        identifier(row.levelId) &&
        levelRevision(row.levelRevision) &&
        digest(row.levelSha256) &&
        stableId(row.themeId) &&
        revision(row.themeRevision),
      t('interface:teamBindingNeedsCompleteImmutableContentAndThemeIdentities'),
    );
    if (row.collection !== null) {
      fields(row.collection, 'id revision', t('interface:teamCollection'));
      required(
        stableId(row.collection.id) && revision(row.collection.revision),
        t('interface:invalidTeamCollectionIdentity'),
      );
    }
    if (row.picture !== null) pictureIdentity(row.picture);
    const { picture: _, ...identity } = row;
    const key = canonicalJSON(identity);
    required(!seen.has(key), t('interface:duplicateTeamPictureIdentity'));
    seen.add(key);
  }
  return freezePresentation(rows);
}
function requestIdentity(request) {
  required(request && typeof request === 'object', t('interface:aTeamPictureRequestIsRequired'));
  const { levelId, themeId, attemptId } = request;
  required(
    identifier(levelId) && stableId(themeId) && stableId(attemptId),
    t('interface:invalidTeamRequestIdentity'),
  );
  const pack = boundedJSON(request.pack, { maxBytes: COOP_PACK_MAX_BYTES, maxArray: 4096 });
  const validation = validateCoopPack(pack);
  required(validation.valid, `Invalid Team pack: ${validation.errors.join('; ')}`);
  const level = pack.levels.find((entry) => entry.id === levelId);
  required(level, t('interface:theRequestedTeamLevelIsAbsentFromThisExactPack'));
  const packJSON = canonicalJSON(pack),
    levelJSON = canonicalJSON(level);
  const artworkSource = request.artworkSource ?? null;
  let sourceReceipt = null;
  if (artworkSource !== null) {
    // Authenticate the opaque owner before trusting its public frozen metadata.
    exportCoopPresentationEnvelope(artworkSource);
    required(
      canonicalJSON(artworkSource.pack) === packJSON,
      t('interface:localTeamArtworkBelongsToADifferentExactPack'),
    );
    readCoopPresentationPicture(artworkSource, level);
    sourceReceipt = artworkSource.receipt;
  }
  return {
    pack,
    level,
    themeId,
    attemptId,
    packJSON,
    levelJSON,
    artworkSource,
    sourceReceipt,
    key: canonicalJSON(
      sourceReceipt
        ? [packJSON, levelId, themeId, attemptId, 'local-import', sourceReceipt]
        : [packJSON, levelId, themeId, attemptId],
    ),
  };
}
function snapshotIdentity(snapshot, themeId) {
  const theme = snapshot?.resolved?.theme,
    collection = snapshot?.resolved?.collection;
  required(
    theme?.id === themeId && revision(theme.revision),
    t('interface:noMatchingPreparedTeamThemeSnapshot'),
  );
  required(
    collection === null || (stableId(collection?.id) && revision(collection?.revision)),
    t('interface:invalidPreparedTeamCollection'),
  );
  return freezePresentation({
    themeId: theme.id,
    themeRevision: theme.revision,
    manifestSha256: digest(snapshot.manifestSha256) ? snapshot.manifestSha256 : null,
    collection: collection === null ? null : { id: collection.id, revision: collection.revision },
  });
}
function selectedAsset(snapshot, row) {
  if (row.picture === null) return null;
  const wanted = row.picture;
  const asset = validateAssetRevision(snapshot.resolved.assets?.[wanted.slot]);
  const file = asset.file,
    frame = asset.geometry?.frame;
  required(
    asset.kind === 'image' &&
      asset.id === wanted.assetId &&
      asset.revision === wanted.assetRevision &&
      asset.quality.stage === 'reviewed' &&
      file.sha256 === wanted.sha256 &&
      file.bytes === wanted.bytes &&
      file.mime === wanted.mime &&
      file.width === wanted.width &&
      file.height === wanted.height &&
      frame.x === 0 &&
      frame.y === 0 &&
      frame.width === file.width &&
      frame.height === file.height,
    t('interface:thePreparedTeamAssetDoesNotMatchItsExactReviewed'),
  );
  return asset;
}
function imageURL(bytes, mime) {
  let binary = '';
  for (let offset = 0; offset < bytes.length; offset += 32768)
    binary += String.fromCharCode(...bytes.subarray(offset, offset + 32768));
  return `data:${mime};base64,${btoa(binary)}`;
}
const aborted = () =>
  new DOMException(t('interface:teamPicturePreparationWasCancelled'), 'AbortError');
const releaseQuietly = (lease) => {
  try {
    lease?.release();
  } catch {
    /* Release owns no game state. */
  }
};

/** No production bindings, network defaults, storage, simulation or art adoption.
 * The host injects a prepared registry snapshot and readers for its exact assets.
 * A null picture is an explicit registered procedural choice, never error fallback.
 */
export function createCoopPresentation({
  bindings,
  historicalImportPolicy,
  getSnapshot,
  readPicture,
  decodeImage,
}) {
  const rows = bindingTable(bindings),
    policies = historicalPolicies(historicalImportPolicy),
    closedNamespaces = new Set(['relay-rescue-starter', ...rows.map((row) => row.packId)]);
  required(
    [getSnapshot, readPicture, decodeImage].every((fn) => typeof fn === 'function'),
    t('interface:teamPresentationRequiresInjectedSnapshotPictureAndDecoderReaders'),
  );
  let closed = false,
    captured = null,
    accepted = null,
    pending = null,
    selectionEpoch = 0;
  function contextCurrent(state) {
    const epoch = selectionEpoch;
    required(!closed && captured === state, t('interface:thisTeamPictureAttemptIsNoLongerCurrent'));
    required(
      getSnapshot() === state.snapshot,
      t('interface:teamPresentationChangedPrepareANewAttempt'),
    );
    required(
      canonicalJSON(snapshotIdentity(state.snapshot, state.request.themeId)) ===
        canonicalJSON(state.theme),
      t('interface:teamThemeIdentityChangedDuringPreparation'),
    );
    if (state.request.artworkSource !== null) {
      const original = readCoopPresentationPicture(
        state.request.artworkSource,
        state.request.level,
      );
      required(
        canonicalJSON(state.request.artworkSource.receipt) ===
          canonicalJSON(state.request.sourceReceipt),
        t('interface:localTeamArtworkIdentityChangedDuringPreparation'),
      );
      if (state.row)
        required(
          canonicalJSON(original.file) === canonicalJSON(state.row.picture),
          t('interface:localTeamArtworkChangedDuringPreparation'),
        );
    } else if (state.row)
      required(
        canonicalJSON(selectedAsset(state.snapshot, state.row)) === state.assetJSON,
        t('interface:teamPictureBindingChangedDuringPreparation'),
      );
    // Snapshot readers (and injected snapshot accessors) can synchronously
    // cancel/dispose/select. Identity equality alone does not retain ownership.
    if (closed || captured !== state || selectionEpoch !== epoch) throw aborted();
  }
  function operationCurrent(operation) {
    if (closed || pending !== operation || operation.controller.signal.aborted) throw aborted();
    contextCurrent(operation.state);
    if (closed || pending !== operation || operation.controller.signal.aborted) throw aborted();
  }
  function report(operation, stage, message, status = 'preparing') {
    if (closed || pending !== operation || operation.controller.signal.aborted) return;
    try {
      operation.onStatus({ stage, message, status, progress: null });
    } catch {
      /* A display callback cannot adopt content. */
    }
  }
  function capture(request) {
    const identity = requestIdentity(request);
    if (captured?.request.attemptId === identity.attemptId) {
      required(
        captured.request.key === identity.key &&
          captured.request.artworkSource === identity.artworkSource,
        t('interface:retryMustRetainTheExactTeamPackLevelThemeAnd'),
      );
      contextCurrent(captured);
      return captured;
    }
    const snapshot = getSnapshot(),
      theme = snapshotIdentity(snapshot, identity.themeId);
    return { request: identity, snapshot, theme, row: null, assetJSON: null };
  }
  async function choose(operation) {
    const state = operation.state;
    operationCurrent(operation);
    if (state.row) return;
    report(operation, 'verifying', t('interface:verifyingThisExactTeamArenaAndPictureIdentity'));
    operationCurrent(operation);
    const encoder = new TextEncoder();
    const [packSha256, levelSha256] = await Promise.all([
      hashPresentationBytes(encoder.encode(state.request.packJSON)),
      hashPresentationBytes(encoder.encode(state.request.levelJSON)),
    ]);
    operationCurrent(operation);
    let row = rows.find(
      (candidate) =>
        candidate.packId === state.request.pack.id &&
        candidate.packRevision === state.request.pack.revision &&
        candidate.packSha256 === packSha256 &&
        candidate.levelId === state.request.level.id &&
        candidate.levelRevision === state.request.level.revision &&
        candidate.levelSha256 === levelSha256 &&
        candidate.themeId === state.theme.themeId &&
        candidate.themeRevision === state.theme.themeRevision &&
        matchesManifest(candidate, state.theme) &&
        canonicalJSON(candidate.collection) === canonicalJSON(state.theme.collection),
    );
    const policy = policies.find(
      (candidate) =>
        state.theme.themeId === candidate.themeId &&
        state.theme.themeRevision === candidate.themeRevision &&
        matchesManifest(candidate, state.theme) &&
        canonicalJSON(state.theme.collection) === canonicalJSON(candidate.collection),
    );
    const policyMatches = Boolean(policy);
    if (state.request.artworkSource !== null) {
      const receipt = state.request.sourceReceipt;
      required(
        receipt.packSha256 === packSha256 &&
          receipt.theme.id === state.theme.themeId &&
          receipt.theme.revision === state.theme.themeRevision &&
          canonicalJSON(receipt.theme.collection) === canonicalJSON(state.theme.collection),
        t('interface:localTeamArtworkRequiresItsExactAcceptedPackAndPrepared'),
      );
      required(
        !closedNamespaces.has(state.request.pack.id) ||
          rows.some(
            (candidate) =>
              candidate.packId === state.request.pack.id &&
              candidate.packRevision === state.request.pack.revision &&
              candidate.packSha256 === packSha256,
          ),
        t('interface:localArtworkCannotReplaceGameplayUnderAReservedTeamPack'),
      );
      required(
        row || policyMatches,
        t('interface:localTeamArtworkIsNotSupportedByThisApprovedTheme'),
      );
      const original = readCoopPresentationPicture(
        state.request.artworkSource,
        state.request.level,
      );
      operationCurrent(operation);
      state.row = freezePresentation({
        packId: state.request.pack.id,
        packRevision: state.request.pack.revision,
        packSha256,
        levelId: state.request.level.id,
        levelRevision: state.request.level.revision,
        levelSha256,
        themeId: state.theme.themeId,
        themeRevision: state.theme.themeRevision,
        collection: state.theme.collection,
        sourceKind: 'local-import',
        presentationReceipt: receipt,
        picture: original.file,
      });
      return;
    }
    if (!row && !closedNamespaces.has(state.request.pack.id) && policyMatches) {
      row = freezePresentation({
        packId: state.request.pack.id,
        packRevision: state.request.pack.revision,
        packSha256,
        levelId: state.request.level.id,
        levelRevision: state.request.level.revision,
        levelSha256,
        themeId: policy.themeId,
        themeRevision: policy.themeRevision,
        collection: policy.collection,
        ...(Object.hasOwn(policy, 'manifestSha256')
          ? { manifestSha256: policy.manifestSha256 }
          : {}),
        picture: policy.picture,
      });
    }
    required(row, t('interface:noExactTeamPictureBindingThisArenaHasNotBeen'));
    const asset = selectedAsset(state.snapshot, row);
    state.assetJSON = canonicalJSON(asset);
    state.row = row;
  }
  async function prepare(operation) {
    let decoded = null;
    try {
      await choose(operation);
      operationCurrent(operation);
      const state = operation.state,
        row = state.row;
      if (row.picture) {
        report(operation, 'downloading', t('interface:readingTheSelectedTeamPicture'));
        operationCurrent(operation);
        const local = state.request.artworkSource !== null;
        const original = local
          ? readCoopPresentationPicture(state.request.artworkSource, state.request.level)
          : await readPicture(row.picture.slot, {
              snapshot: state.snapshot,
              signal: operation.controller.signal,
              onStatus: (status) => report(operation, status.stage, status.message),
            });
        operationCurrent(operation);
        if (local)
          required(
            canonicalJSON(original.file) === canonicalJSON(row.picture),
            t('interface:teamLocalPictureReaderReturnedADifferentOriginal'),
          );
        else
          required(
            canonicalJSON(validateAssetRevision(original?.asset)) === state.assetJSON,
            t('interface:teamPictureReaderReturnedADifferentAsset'),
          );
        let blob;
        try {
          const size = Object.getOwnPropertyDescriptor(Blob.prototype, 'size').get.call(
            original.blob,
          );
          const type = Object.getOwnPropertyDescriptor(Blob.prototype, 'type').get.call(
            original.blob,
          );
          required(
            size === row.picture.bytes && type === row.picture.mime,
            t('interface:teamPictureReaderReturnedInvalidOriginalBytes'),
          );
          blob = Blob.prototype.slice.call(original.blob, 0, size, type);
        } catch {
          throw new TypeError(t('interface:teamPictureReaderReturnedInvalidOriginalBytes'));
        }
        report(operation, 'verifying', t('interface:verifyingTheCompleteTeamPictureOriginal'));
        operationCurrent(operation);
        const bytes = new Uint8Array(await Blob.prototype.arrayBuffer.call(blob));
        operationCurrent(operation);
        required(
          bytes.length === row.picture.bytes &&
            (await hashPresentationBytes(bytes)) === row.picture.sha256,
          t('interface:teamPictureOriginalHashOrSizeMismatch'),
        );
        operationCurrent(operation);
        const header = inspectImageDataUrl(imageURL(bytes, row.picture.mime));
        required(
          header.valid && header.width === 1152 && header.height === 576,
          t('interface:teamPictureOriginalDimensionsDisagree'),
        );
        report(operation, 'decoding', t('interface:preparingTheCompleteTeamPicture'));
        operationCurrent(operation);
        const lease = await decodeImage(blob, { signal: operation.controller.signal });
        let released = false;
        decoded = {
          image: lease?.image,
          release() {
            if (released) return;
            released = true;
            if (typeof lease?.release === 'function') lease.release();
            else lease?.image?.close?.();
          },
        };
        required(
          lease && typeof lease.release === 'function',
          t('interface:teamPictureDecodingNeedsAnOwnedReleaseHandle'),
        );
        operationCurrent(operation);
        required(
          decoded.image &&
            (decoded.image.naturalWidth ?? decoded.image.width) === 1152 &&
            (decoded.image.naturalHeight ?? decoded.image.height) === 576,
          t('interface:decodedTeamPictureDimensionsDisagree'),
        );
      }
      operationCurrent(operation);
      const binding = Object.freeze({
        snapshot: state.snapshot,
        image: decoded?.image ?? null,
        choice: freezePresentation({ ...row, kind: row.picture ? 'image' : 'procedural' }),
        fit: 'contain',
        sampling: 'nearest',
      });
      // A display callback may cancel, select another attempt or dispose us.
      // Let it settle and recheck before replacing/releasing the accepted lease.
      report(
        operation,
        'ready',
        t('interface:theTeamPictureIsReadyStartRemainsASeparateAction'),
        'ready',
      );
      operationCurrent(operation);
      const previous = accepted;
      accepted = { state, binding, release: decoded?.release ?? (() => {}) };
      decoded = null;
      const adoptionEpoch = selectionEpoch;
      releaseQuietly(previous);
      // Cleanup may itself dispose/cancel/select. That is lifecycle invalidation
      // after adoption, not a validation rollback; never return a disposed lease.
      // Do not invoke another external reader after the ownership swap.
      if (
        closed ||
        pending !== operation ||
        operation.controller.signal.aborted ||
        captured !== state ||
        selectionEpoch !== adoptionEpoch
      )
        throw aborted();
      return binding;
    } catch (error) {
      report(operation, 'error', `Team picture unavailable: ${error.message}`, 'error');
      throw error;
    } finally {
      releaseQuietly(decoded);
      operation.signal?.removeEventListener('abort', operation.abort);
      if (pending === operation) pending = null;
    }
  }
  return {
    select(request) {
      let state;
      const epoch = ++selectionEpoch;
      try {
        required(!closed, t('interface:teamPresentationIsClosed'));
        state = capture(request);
        if (closed || selectionEpoch !== epoch || request.signal?.aborted) throw aborted();
      } catch (error) {
        return Promise.reject(error);
      }
      if (pending?.state === state && !pending.controller.signal.aborted) return pending.promise;
      pending?.controller.abort();
      captured = state;
      if (accepted?.state === state) return Promise.resolve(accepted.binding);
      const controller = new AbortController();
      const operation = {
        state,
        controller,
        signal: request.signal,
        onStatus: request.onStatus ?? (() => {}),
      };
      operation.abort = () => controller.abort();
      operation.signal?.addEventListener('abort', operation.abort, { once: true });
      if (operation.signal?.aborted) operation.abort();
      pending = operation;
      // Assign promise ownership before any injected reader/status can reenter.
      operation.promise = Promise.resolve().then(() => prepare(operation));
      return operation.promise;
    },
    confirm(request) {
      if (request?.signal?.aborted) throw aborted();
      const identity = requestIdentity(request);
      required(
        !pending &&
          accepted &&
          accepted.state === captured &&
          captured.request.key === identity.key &&
          captured.request.artworkSource === identity.artworkSource,
        t('interface:theExactTeamPictureIsNotReadyForThisRequest'),
      );
      contextCurrent(captured);
      if (request.signal?.aborted) throw aborted();
      return accepted.binding;
    },
    current: () => accepted?.binding ?? null,
    cancel() {
      selectionEpoch++;
      pending?.controller.abort();
    },
    dispose() {
      if (closed) return;
      closed = true;
      selectionEpoch++;
      pending?.controller.abort();
      releaseQuietly(accepted);
      accepted = null;
    },
  };
}
