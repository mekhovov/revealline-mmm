import { t } from '../i18n/index.mjs';
import { required } from '../data-json.mjs';
import {
  acquireCandidatePicture,
  claimCandidatePicture,
  discardUnclaimedCandidatePicture,
  isCandidatePictureFor,
} from '../content-design/picture.mjs';

/** One verified display owner shared by both boards. Stage/confirm/commit keeps
 * the previous picture alive until the real race host publishes its next duel. */
export function createCandidateCouchPictures({ owns, acquire = acquireCandidatePicture } = {}) {
  let disposed = false,
    staged = null,
    accepted = null,
    generation = 0;
  const retirements = new Set();
  const cancelled = () =>
    new DOMException(t('interface:candidateRacePictureCancelled'), 'AbortError');
  const check = (row, { themeId, raceId, signal } = {}) => {
    if (disposed || signal?.aborted) throw cancelled();
    required(
      owns(row) && themeId === row.defaultThemeId && Number.isSafeInteger(raceId) && raceId >= 0,
      t('interface:chooseAnExactAuthoredRaceMapThemeAndRaceIdentity'),
    );
  };
  async function stage(row, options = {}) {
    check(row, options);
    const ticket = ++generation,
      previousStage = staged;
    staged = null;
    previousStage?.cancel();
    check(row, options);
    if (generation !== ticket) throw cancelled();
    const controller = new AbortController();
    let live = true,
      picture = null,
      confirmed = false;
    const current = () => {
      check(row, options);
      if (!live || staged !== item || generation !== ticket || controller.signal.aborted)
        throw cancelled();
    };
    const item = {
      cancel() {
        if (!live) return;
        live = false;
        if (staged === item) staged = null;
        options.signal?.removeEventListener('abort', item.cancel);
        controller.abort();
        const old = picture;
        picture = null;
        old?.release();
      },
    };
    staged = item;
    options.signal?.addEventListener('abort', item.cancel, { once: true });
    try {
      options.onStatus?.({
        status: 'preparing',
        stage: 'verifying',
        message: t('interface:checkingTheAuthoredOriginalForBothBoards'),
        progress: null,
      });
      current();
      const loaded = await acquire(row.asset, { signal: controller.signal });
      try {
        current();
        picture = claimCandidatePicture(row.asset, loaded);
      } catch (error) {
        discardUnclaimedCandidatePicture(loaded);
        throw error;
      }
      return Object.freeze({
        picture,
        cancel: item.cancel,
        async confirm() {
          current();
          required(
            isCandidatePictureFor(row.asset, picture),
            t('interface:authoredRacePictureIsUnavailable'),
          );
          confirmed = true;
        },
        commit() {
          current();
          required(
            confirmed && isCandidatePictureFor(row.asset, picture),
            t('interface:confirmTheAuthoredRacePictureBeforeAdoption'),
          );
          const previous = accepted;
          accepted = { row, raceId: options.raceId, picture };
          live = false;
          staged = null;
          options.signal?.removeEventListener('abort', item.cancel);
          const retire = () => {
            if (!retirements.delete(retire)) return;
            previous?.picture.release();
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
  return Object.freeze({
    stage,
    async select(row, options) {
      const lease = await stage(row, options);
      try {
        await lease.confirm();
        const retire = lease.commit();
        retire();
        return lease.picture;
      } finally {
        lease.cancel();
      }
    },
    confirm(row, options) {
      check(row, { ...options, themeId: row.defaultThemeId });
      required(
        accepted?.row === row &&
          accepted.raceId === options.raceId &&
          isCandidatePictureFor(row.asset, accepted.picture),
        t('interface:thisRaceDoesNotOwnThePreparedAuthoredPicture'),
      );
    },
    cancel() {
      generation++;
      staged?.cancel();
    },
    dispose() {
      disposed = true;
      staged?.cancel();
      for (const retire of [...retirements]) retire();
      const old = accepted;
      accepted = null;
      old?.picture.release();
    },
  });
}
