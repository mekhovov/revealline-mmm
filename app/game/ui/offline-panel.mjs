import { t, localizedText } from '../i18n/index.mjs';
import { offlineAvailability, prepareOffline, checkOffline } from '../offline.mjs';
import { createOperationStatus } from './operation-status.mjs';
import { offlineStatusText, offlineOptionalText, offlineErrorText } from './offline-copy.mjs';

/** Observes the release worker; leaving this screen never owns its installation. */
export function attachOfflinePanel({
  document: doc = globalThis.document,
  window: win = globalThis.window,
  availability = offlineAvailability,
  prepare = prepareOffline,
  check = checkOffline,
} = {}) {
  const $ = (id) => doc.getElementById(id);
  const button = $('offline-button');
  const stop = $('offline-stop');
  const dialog = $('settings-dialog');
  let observation = null;
  let disposed = false;
  let action = 'prepare';
  const feedback = createOperationStatus($('offline-status'), { isCurrent: () => !disposed });
  const available = availability();
  const legacyControls = $('offline-legacy-controls');
  if (legacyControls) legacyControls.hidden = available.packageConsent === true;
  const note = $('offline-optional-note');
  localizedText(note, () => offlineOptionalText(available));
  note.hidden = !available.note;
  button.hidden = !available.available;
  feedback.begin({ message: '' }).finish({
    message: () =>
      available.available
        ? t('interface:prepareSharedRuntimeUseDownloadsForCompleteOfflineGameplay')
        : offlineStatusText(available),
  });
  function controls() {
    button.disabled = !!observation;
    stop.hidden = !observation;
    localizedText(button, () =>
      action === 'verify'
        ? t('interface:verifyOfflineFiles')
        : action === 'check'
          ? t('interface:checkProgress')
          : t('interface:prepareSharedRuntime'),
    );
  }
  function detach({ focus = false } = {}) {
    if (!observation) return;
    const restoreFocus = focus && doc.activeElement === stop;
    const owned = observation;
    observation = null;
    owned.controller.abort();
    owned.status.finish({
      state: 'detached',
      message: () => t('interface:stoppedWaitingOfflinePreparationMayStillBeRunningCheckProgress'),
    });
    action = 'check';
    controls();
    if (restoreFocus && dialog.open && !doc.hidden && doc.hasFocus?.() !== false)
      button.focus({ preventScroll: true });
  }
  async function run() {
    if (disposed || observation || !available.available) return;
    const preparing = action === 'prepare';
    const owned = {
      controller: new AbortController(),
      status: feedback.begin({
        message: () =>
          preparing ? t('interface:offline.preparing') : t('interface:offline.checkingFiles'),
        stage: action === 'prepare' ? 'connecting' : 'verifying',
      }),
    };
    observation = owned;
    const current = () => !disposed && observation === owned;
    controls();
    try {
      const result = await (action === 'prepare' ? prepare : check)({
        signal: owned.controller.signal,
        onStatus(status) {
          if (!current() || !['preparing', 'checking'].includes(status.status)) return;
          owned.status.update({
            message: () => offlineStatusText(status),
            stage: status.stage,
            progress: status.progress ?? null,
          });
        },
      });
      if (!current()) return;
      const ready = ['ready', 'waiting'].includes(result.status);
      const pending = ['still-running', 'unconfirmed'].includes(result.status);
      action = ready ? 'verify' : pending ? 'check' : 'prepare';
      owned.status.finish({
        state: ready ? 'ready' : pending ? 'detached' : 'error',
        message: () => offlineStatusText(result),
      });
      localizedText($('offline-details'), () => JSON.stringify(result, null, 2));
    } catch (error) {
      if (!current()) return;
      action = 'prepare';
      owned.status.finish({ state: 'error', message: () => offlineErrorText(error) });
      localizedText($('offline-details'), () =>
        JSON.stringify(
          {
            message: error.message,
            code: error.offlineCode ?? null,
          },
          null,
          2,
        ),
      );
    } finally {
      if (current()) {
        const restoreFocus = doc.activeElement === stop;
        observation = null;
        controls();
        if (restoreFocus && dialog.open && !doc.hidden && doc.hasFocus?.() !== false)
          button.focus({ preventScroll: true });
      }
    }
  }
  button.onclick = run;
  stop.onclick = () => detach({ focus: true });
  const closed = () => {
    if (!dialog.open) detach();
  };
  const hidden = () => detach();
  dialog.addEventListener('close', closed);
  win.addEventListener('pagehide', hidden);
  controls();
  return {
    destroy() {
      detach();
      disposed = true;
      feedback.dispose();
      button.onclick = stop.onclick = null;
      dialog.removeEventListener('close', closed);
      win.removeEventListener('pagehide', hidden);
    },
  };
}
