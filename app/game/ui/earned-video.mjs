import { mountRewardMedia } from './reward-media.mjs';
import { getLocale, t } from '../i18n/index.mjs';

/** Called only after the shared board/picture celebration, with an earned receipt.
 * Replays use the receipt's exact media; neither this view nor playback grants progress. */
export function createEarnedVideo({
  document: doc,
  window,
  provider,
  audioMaster,
  musicDucker,
  getReducedMotion,
  mountMedia = mountRewardMedia,
}) {
  let active = null;
  const presented = new WeakSet();
  function close() {
    if (!active) return;
    const { dialog, media, opener } = active;
    active = null;
    media.dispose();
    if (dialog.open) dialog.close();
    dialog.remove();
    if (opener?.isConnected) opener.focus({ preventScroll: true });
  }
  return {
    present(run, receipts, opener) {
      if (!run || run.status !== 'won' || presented.has(run)) return false;
      const receipt = receipts.find(
        ({ definition }) =>
          definition.scope.kind === 'mission' && definition.scope.id === run.levelId,
      );
      const payload = receipt?.definition.payloads.find((item) => item.type === 'video');
      if (!payload) return false;
      presented.add(run);
      close();
      const dialog = doc.createElement('dialog');
      dialog.className = 'earned-video-dialog';
      dialog.setAttribute(
        'aria-label',
        payload.locales[getLocale()]?.title ?? payload.locales.en.title,
      );
      const exit = doc.createElement('button');
      exit.type = 'button';
      exit.textContent = t('interface:completionRewards.back');
      exit.className = 'earned-video-close';
      exit.onclick = close;
      dialog.append(exit);
      doc.body.append(dialog);
      const media = mountMedia({
        container: dialog,
        payload,
        provider,
        locale: getLocale(),
        audioMaster,
        musicDucker,
        document: doc,
        window,
        cinematic: true,
        reducedMotion: getReducedMotion(),
        onEnded: close,
      });
      active = { dialog, media, opener };
      dialog.addEventListener('close', close);
      dialog.showModal();
      exit.focus({ preventScroll: true });
      void media.start({ allowMutedFallback: true });
      return true;
    },
    dispose: close,
  };
}
