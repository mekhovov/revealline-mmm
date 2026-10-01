import { t, localizedText } from '../i18n/index.mjs';
import { createOperationStatus } from './operation-status.mjs';

// The ordinary host keeps its existing modal stack and controller/input loop.
const loadRuntime = async () => {
  const [reader, view] = await Promise.all([
    import('../profile-channel-reader.mjs'),
    import('./profile-recovery.mjs'),
  ]);
  return {
    createReader: reader.createProfileChannelReader,
    attachView: view.attachProfileRecoveryView,
    loadCatalogs: async (...args) => {
      const catalogs = await import('../profile-recovery-catalogs.mjs');
      return catalogs.loadProfileRecoveryCatalogs(...args);
    },
  };
};

function untilCancelled(signal, begin) {
  signal.throwIfAborted();
  return new Promise((resolve, reject) => {
    const cancel = () => reject(signal.reason);
    signal.addEventListener('abort', cancel, { once: true });
    Promise.resolve()
      .then(() => {
        signal.throwIfAborted();
        return begin();
      })
      .then(resolve, reject)
      .finally(() => signal.removeEventListener('abort', cancel));
  });
}

export function attachProfileRecoveryDialog({
  document: doc = globalThis.document,
  window: win = globalThis.window,
  currentVersion,
  editionId,
  heldWriter,
  packaged,
  resolveSourceVersion = () => currentVersion,
  unavailable = () => '',
  onOpen = () => {},
  load = loadRuntime,
} = {}) {
  const dialog = doc.getElementById('profile-recovery-dialog'),
    opener = doc.getElementById('profile-recovery-open'),
    back = doc.getElementById('profile-recovery-back'),
    status = doc.getElementById('profile-recovery-status'),
    entryStatus = doc.getElementById('profile-recovery-entry-status');
  const presenter = createOperationStatus(status);
  let operation = null,
    closing = null;
  const current = (value) => operation === value && !value.controller.signal.aborted;
  function refresh() {
    const reason = unavailable();
    opener.disabled = !!operation || !!closing || !!reason;
    localizedText(entryStatus, () => reason);
  }
  function close() {
    if (closing) return closing;
    const active = operation;
    if (!active) return Promise.resolve(true);
    active.controller.abort(new DOMException(t('interface:profileRecoveryClosed'), 'AbortError'));
    active.view?.cancel();
    const closingLease = presenter.begin({
      message: t('interface:closingRecoveryAndReleasingItsReads'),
    });
    closing = (async () => {
      await active.ready;
      try {
        if (active.view) await active.view.close();
        else await active.reader?.close();
      } catch (error) {
        closingLease.finish({
          message: `Recovery cleanup did not finish: ${error.message}`,
          state: 'error',
        });
        return false;
      }
      if (operation !== active) return false;
      operation = null;
      closing = null;
      refresh();
      dialog.close();
      if (
        !doc.hidden &&
        doc.hasFocus?.() !== false &&
        doc.getElementById('settings-dialog').open &&
        !opener.disabled
      )
        opener.focus({ preventScroll: true });
      return true;
    })().finally(() => {
      closing = null;
      refresh();
    });
    return closing;
  }
  function open() {
    refresh();
    if (opener.disabled || !doc.getElementById('settings-dialog').open)
      return Promise.resolve(false);
    onOpen();
    const active = { controller: new AbortController(), view: null, reader: null, ready: null };
    operation = active;
    // Prior view handlers remain closed until a fresh reader is ready.
    back.onclick = close;
    active.lease = presenter.begin({
      message: t('interface:loadingStoredProfileRecovery'),
      isCurrent: () => operation === active && !closing,
    });
    dialog.showModal();
    back.focus({ preventScroll: true });
    refresh();
    active.ready = (async () => {
      const { signal } = active.controller;
      const timer = setTimeout(
        () =>
          active.controller.abort(
            new DOMException(t('interface:recoveryLoadingTimedOut'), 'TimeoutError'),
          ),
        10000,
      );
      try {
        const version = packaged
          ? currentVersion
          : await untilCancelled(signal, resolveSourceVersion);
        active.lease.update({ message: t('interface:loadingRecoveryTools') });
        const runtime = await untilCancelled(signal, load);
        if (!current(active)) return;
        let recoveryCatalogs = [],
          catalogIssue = t('interface:openAPackagedReleaseToVerifyHistoricalOriginals');
        if (packaged && !editionId) {
          const catalogController = new AbortController();
          const cancelCatalog = () => catalogController.abort(signal.reason);
          signal.addEventListener('abort', cancelCatalog, { once: true });
          const catalogTimer = setTimeout(
            () =>
              catalogController.abort(
                new DOMException(t('interface:historicalCatalogLoadingTimedOut'), 'TimeoutError'),
              ),
            10000,
          );
          // The module deadline ends here; catalog failure still permits raw diagnostics.
          clearTimeout(timer);
          try {
            active.lease.update({
              message: t('interface:loadingTrustedHistoricalCatalogs'),
              stage: 'verifying',
            });
            recoveryCatalogs = await untilCancelled(catalogController.signal, () =>
              runtime.loadCatalogs(version, { signal: catalogController.signal }),
            );
            catalogIssue = '';
          } catch (error) {
            catalogIssue = error.message;
          } finally {
            clearTimeout(catalogTimer);
            signal.removeEventListener('abort', cancelCatalog);
          }
        }
        if (!current(active)) return;
        active.reader = runtime.createReader({
          currentVersion: version,
          recoveryCatalogs,
          ...(editionId ? { editionId, heldWriter } : {}),
        });
        active.view = runtime.attachView({
          document: doc,
          presenter,
          reader: active.reader,
          supportedChannels: recoveryCatalogs.map((entry) => entry.channelId),
          catalogIssue,
          onBack: close,
        });
      } catch (error) {
        if (operation === active && dialog.open)
          active.lease.finish({
            message: `${error.message} Use Back to return to Settings.`,
            state: signal.aborted && signal.reason?.name === 'AbortError' ? 'cancelled' : 'error',
          });
      } finally {
        clearTimeout(timer);
      }
    })();
    return active.ready.then(() => current(active));
  }
  const cancel = () => {
    if (!operation) return;
    if (operation.view) operation.view.cancel();
    else
      operation.controller.abort(
        new DOMException(t('interface:recoveryLoadingCancelled'), 'AbortError'),
      );
  };
  const escape = (event) => {
    event.preventDefault();
    void close();
  };
  opener.onclick = open;
  back.onclick = close;
  dialog.addEventListener('cancel', escape);
  win.addEventListener('blur', cancel);
  win.addEventListener('pagehide', close);
  refresh();
  return { open, close, cancel, refresh };
}
