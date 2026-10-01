import { localizedText, t } from '../i18n/index.mjs';

/** A terminal child-preview state, not a boot failure or a gameplay rule.
 * Recovery belongs to a fresh parent launch; this instance cannot be resumed.
 * Only flight controls are disabled. Native child Return and parent Close remain
 * available, including after a page is restored from the back/forward cache. */
export function createPracticeRenderFailure({ enabled, document, stop, report = console.error }) {
  let failed = false;
  return Object.freeze({
    get failed() {
      return failed;
    },
    fail(error) {
      if (!enabled) return false;
      if (failed) return true;
      failed = true;
      // Latch first so even a reentrant input/locale/blur callback cannot resume.
      stop();
      document.documentElement.dataset.practiceRenderState = 'failed';
      for (const control of document.querySelectorAll(
        '[data-move],#stop-button,#boost-button,#action-button,#pickup-button,#pause-button,' +
          '#start-button,#retry-button,#overlay-restart,#restart-button,#hangar-button,#next-button',
      ))
        control.disabled = true;
      const alert = document.createElement('p');
      alert.id = 'practice-render-failure';
      // Ordinary run-message chrome truncates to two lines on narrow screens.
      // Recovery belongs to the existing scrollable overlay card instead.
      alert.className = 'practice-render-failure';
      alert.setAttribute('role', 'alert');
      alert.tabIndex = -1;
      const detail =
        typeof error?.message === 'string'
          ? error.message.slice(0, 500)
          : String(error).slice(0, 500);
      localizedText(alert, () => t('tools:studio.preview.loadFailed', { message: detail }));
      const reading = document.getElementById('overlay-reading');
      reading.prepend(alert);
      reading.hidden = false;
      reading.scrollTop = 0;
      document.getElementById('game-overlay').hidden = false;
      // Do not take focus back from a parent which has already moved away.
      if (!document.hidden && document.hasFocus()) alert.focus({ preventScroll: true });
      report(error);
      return true;
    },
  });
}
