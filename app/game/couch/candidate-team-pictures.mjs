import { t } from '../i18n/index.mjs';
import { canonicalJSON, required, stableId } from '../data-json.mjs';
import { compileAssetRevision } from '../content-design/assets.mjs';
import { isCandidatePictureFor } from '../content-design/picture.mjs';
import { createCandidateCouchPictures } from './candidate-pictures.mjs';
import { journeyActorThemeMaterial } from '../presentation/journey-actor-materials.mjs';

const bindings = new WeakMap();
const cancelled = () =>
  new DOMException(t('interface:candidateTeamPictureCancelled'), 'AbortError');

/** Defensive renderer admission, not a substitute for the host's exact request
 * checks. Only a live authenticated candidate display owner can vary dimensions. */
export function candidateTeamPictureFrame(binding, level, snapshot) {
  const record = binding && bindings.get(binding);
  if (
    !record ||
    binding.snapshot !== snapshot ||
    record.row.level.id !== level.id ||
    record.row.level.revision !== level.revision ||
    !isCandidatePictureFor(record.asset, record.picture)
  )
    return null;
  return record.asset;
}

/** Read-only optional body selection. A serialized/copy binding, stale snapshot,
 * different level, disposed picture or old edition has no material authority.
 * This does not replace the prepared look lease or its exact FPV request. */
export function candidateTeamActorMaterial(binding, level, snapshot) {
  if (!candidateTeamPictureFrame(binding, level, snapshot)) return null;
  const record = bindings.get(binding),
    theme = snapshot?.resolved?.theme;
  if (
    !theme ||
    canonicalJSON([theme.id, theme.revision, snapshot.resolved.collection ?? null]) !==
      record.themeJSON
  )
    return null;
  return journeyActorThemeMaterial(record.row.presentation?.themeId)?.id ?? null;
}

/** Candidate-only adapter. Historical Team bindings and imported envelopes keep
 * their 1152×576 contract. Each host selection owns this lease independently,
 * so failed Next/preview preparation never retires the previous playing picture. */
export function createCandidateTeamPictures({ row, owns, getSnapshot, acquire } = {}) {
  required(typeof owns === 'function' && owns(row), t('interface:chooseAnOwnedTeamCandidateRow'));
  required(typeof getSnapshot === 'function', t('interface:aPreparedTeamSnapshotReaderIsRequired'));
  const asset = compileAssetRevision(row.background);
  required(asset.width === asset.height * 2, t('interface:teamCandidateOriginalsMustHaveA21Frame'));
  const packJSON = canonicalJSON(row.pack);
  const pictureRow = Object.freeze({ asset, defaultThemeId: 'fpv' });
  const pictures = createCandidateCouchPictures({ owns: (value) => value === pictureRow, acquire });
  let snapshot = null,
    themeJSON = null,
    attemptId = null,
    accepted = null,
    generation = 0,
    closed = false;
  const check = (request) => {
    if (closed || request?.signal?.aborted) throw cancelled();
    required(
      owns(row) &&
        request?.themeId === 'fpv' &&
        stableId(request.attemptId) &&
        request.levelId === row.level.id &&
        canonicalJSON(request.pack) === packJSON &&
        !request.artworkSource,
      t('interface:candidateTeamPictureRequiresItsExactOwnedPackLevelAnd'),
    );
    required(
      !attemptId || attemptId === request.attemptId,
      t('interface:keepTheExactCandidateTeamAttempt'),
    );
    const current = getSnapshot();
    const theme = current?.resolved?.theme;
    required(
      theme?.id === 'fpv' && Number.isSafeInteger(theme.revision) && theme.revision > 0,
      t('interface:prepareTheMatchingTeamThemeFirst'),
    );
    const identity = canonicalJSON([theme.id, theme.revision, current.resolved.collection ?? null]);
    required(
      !snapshot || snapshot === current,
      t('interface:teamPresentationChangedPrepareANewAttempt'),
    );
    required(
      !themeJSON || themeJSON === identity,
      t('interface:teamThemeIdentityChangedDuringPreparation'),
    );
    if (closed || request.signal?.aborted) throw cancelled();
    return current;
  };
  return Object.freeze({
    async select(request) {
      const currentSnapshot = check(request);
      snapshot ??= currentSnapshot;
      themeJSON ??= canonicalJSON([
        snapshot.resolved.theme.id,
        snapshot.resolved.theme.revision,
        snapshot.resolved.collection ?? null,
      ]);
      attemptId ??= request.attemptId;
      if (accepted) {
        required(
          candidateTeamPictureFrame(accepted, row.level, snapshot),
          t('interface:teamOriginalIsUnavailable'),
        );
        return accepted;
      }
      const ticket = ++generation;
      const current = () => {
        check(request);
        if (generation !== ticket) throw cancelled();
      };
      const staged = await pictures.stage(pictureRow, {
        themeId: 'fpv',
        raceId: ticket,
        signal: request.signal,
        onStatus(status) {
          current();
          request.onStatus?.({
            ...status,
            message: t('interface:verifyingThisTeamMissionSOriginalPicture'),
          });
          current();
        },
      });
      try {
        current();
        await staged.confirm();
        current();
        const binding = Object.freeze({
          snapshot,
          image: staged.picture.image,
          choice: Object.freeze({
            kind: 'image',
            sourceKind: 'candidate-original',
            levelId: row.level.id,
            levelRevision: row.level.revision,
            officialProgressEligible: false,
            picture: asset,
          }),
          fit: 'contain',
          sampling: 'nearest',
        });
        request.onStatus?.({
          status: 'ready',
          stage: 'ready',
          progress: null,
          message: t('interface:teamOriginalReadyStartRemainsASeparateAction'),
        });
        current();
        const retire = staged.commit();
        bindings.set(binding, { row, asset, picture: staged.picture, themeJSON });
        accepted = binding;
        retire();
        return binding;
      } finally {
        staged.cancel();
      }
    },
    confirm(request) {
      check(request);
      required(
        accepted && candidateTeamPictureFrame(accepted, row.level, snapshot),
        t('interface:theExactTeamCandidatePictureIsNotReady'),
      );
      return accepted;
    },
    current: () => accepted,
    cancel() {
      generation++;
      pictures.cancel();
    },
    dispose() {
      if (closed) return;
      closed = true;
      generation++;
      accepted = null;
      pictures.dispose();
    },
  });
}
