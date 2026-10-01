import { t } from '../i18n/index.mjs';
import { required } from '../data-json.mjs';
import { compileAssetRevision } from '../content-design/assets.mjs';
import {
  acquireCandidatePicture,
  isCandidatePictureFor,
  claimCandidatePicture,
  discardUnclaimedCandidatePicture,
} from '../content-design/picture.mjs';
import { pictureDisplayContext } from './presentation-image.mjs';

const cancelled = () =>
  new DOMException(t('interface:candidatePicturePreparationCancelled'), 'AbortError');

/** One candidate attempt, one authored theme and one immutable original. Uses
 * the same readiness/display interface as flight-pictures without pretending to
 * be an official managed-media choice. Prepared pixels may transfer here once
 * the caller has taken the candidate attempt and checked its host ownership. */
export function createCandidateFlightPictures({
  context,
  asset: source,
  picture = null,
  acquire = acquireCandidatePicture,
  timeoutMs = 20000,
}) {
  const ownContext = pictureDisplayContext(context),
    asset = compileAssetRevision(source);
  required(typeof acquire === 'function', t('interface:candidatePictureAcquisitionIsRequired'));
  required(
    Number.isFinite(timeoutMs) && timeoutMs > 0 && timeoutMs <= 20000,
    t('interface:invalidCandidatePictureDeadline'),
  );
  required(
    picture === null || isCandidatePictureFor(asset, picture),
    t('interface:preparedPictureDoesNotMatchThisExactOriginal'),
  );
  let binding = picture ? claimCandidatePicture(asset, picture) : null,
    pending = null,
    generation = 0,
    disposed = false;
  const cancel = () => {
    generation++;
    const old = pending;
    pending = null;
    old?.abort();
  };
  async function ensure(themeId = ownContext.themeId, { signal, onStatus = () => {} } = {}) {
    required(!disposed, t('interface:candidatePictureAttemptIsDisposed'));
    required(themeId === ownContext.themeId, t('interface:thisCandidateKeepsItsAuthoredTheme'));
    if (signal?.aborted) throw cancelled();
    const ticket = generation + 1;
    cancel();
    if (disposed || generation !== ticket || pending) throw cancelled();
    if (binding && isCandidatePictureFor(asset, binding)) return true;
    binding = null;
    const controller = new AbortController();
    pending = controller;
    const current = () => !disposed && generation === ticket && !controller.signal.aborted;
    const check = () => {
      if (!current()) throw cancelled();
    };
    const report = (status, messageKey) => {
      check();
      try {
        onStatus({
          status,
          stage: status === 'ready' ? 'ready' : 'preparing',
          progress: null,
          message: t(messageKey),
          messageKey,
        });
      } catch {}
      check();
    };
    let timer,
      abort,
      candidate = null;
    const stopped = new Promise((_, reject) => {
      const stop = (error) => {
        reject(error);
        controller.abort();
      };
      abort = () => stop(cancelled());
      controller.signal.addEventListener('abort', () => reject(cancelled()), { once: true });
      signal?.addEventListener('abort', abort, { once: true });
      timer = setTimeout(
        () => stop(new Error(t('interface:theCandidatePictureDidNotBecomeReadyInTimeKeep'))),
        timeoutMs,
      );
    });
    try {
      candidate = await Promise.race([
        stopped,
        Promise.resolve().then(async () => {
          report('preparing', 'interface:verifyingAndOpeningThisMissionSOriginalPicture');
          const result = await acquire(asset, { signal: controller.signal });
          try {
            claimCandidatePicture(asset, result);
          } catch (error) {
            discardUnclaimedCandidatePicture(result);
            throw error;
          }
          if (!current()) {
            result.release();
            throw cancelled();
          }
          return result;
        }),
      ]);
      check();
      required(
        isCandidatePictureFor(asset, candidate),
        t('interface:candidatePictureWasNotVerifiedForThisOriginal'),
      );
      // Observers may close the host or start newer work. Do not publish first.
      report('ready', 'interface:thisMissionSOriginalPictureIsReady');
      binding = candidate;
      candidate = null;
      return true;
    } finally {
      clearTimeout(timer);
      signal?.removeEventListener('abort', abort);
      if (pending === controller) pending = null;
      controller.abort();
      candidate?.release?.();
    }
  }
  return Object.freeze({
    kind: 'candidate',
    officialProgressEligible: false,
    legacy: false,
    identityCatalog: null,
    context: ownContext,
    assetRevision: asset,
    pins: () => undefined,
    ready: (themeId) =>
      !disposed &&
      themeId === ownContext.themeId &&
      !!binding &&
      isCandidatePictureFor(asset, binding),
    current: () => (binding && isCandidatePictureFor(asset, binding) ? binding : null),
    ensure,
    cancel,
    dispose() {
      if (disposed) return;
      disposed = true;
      const old = binding;
      binding = null;
      cancel();
      old?.release();
    },
  });
}
