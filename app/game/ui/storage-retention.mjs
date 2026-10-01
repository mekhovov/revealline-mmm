import { localizedText, t, localizedMessage } from '../i18n/index.mjs';
/** Browser-origin retention only. This does not install or verify downloads. */
export function attachStorageRetention({
  button,
  status,
  isOpen,
  navigator: browser = globalThis.navigator,
}) {
  let active = false,
    destroyed = false,
    generation = 0,
    pending = null;
  const current = (version) => !destroyed && active && isOpen() && generation === version;
  const show = (version, message, busy = false) => {
    if (!current(version)) return;
    localizedText(status, () => message);
    // Keep the focused action and ordinary Back available while the browser decides.
    button.setAttribute('aria-busy', String(busy));
  };
  const granted = localizedMessage('interface:retentionGrantedKeepBackupsYouCanStillClearSiteData');
  const unsupported = localizedMessage(
    'interface:thisBrowserCannotRequestDownloadRetentionKeepBackups',
  );
  const requesting = localizedMessage(
    'interface:askingTheBrowserYouCanCloseSettingsWhileItDecides',
  );
  async function refresh() {
    if (destroyed || !isOpen()) return;
    active = true;
    const version = ++generation;
    if (pending) {
      show(version, requesting, true);
      await pending.done;
      if (!current(version)) return;
    }
    show(version, localizedMessage('interface:checkingDownloadRetention'));
    try {
      const storage = browser?.storage;
      if (typeof storage?.persisted !== 'function') {
        show(
          version,
          typeof storage?.persist === 'function'
            ? localizedMessage('interface:retentionStatusIsUnavailableYouCanStillAskThisBrowser')
            : unsupported,
        );
        return;
      }
      const retained = await storage.persisted();
      if (typeof retained !== 'boolean') throw new Error(t('interface:invalidRetentionResult'));
      show(
        version,
        retained
          ? granted
          : typeof storage.persist === 'function'
            ? localizedMessage('interface:retentionIsNotEnabledDownloadsMayBeRemovedByThe')
            : unsupported,
      );
    } catch {
      show(version, localizedMessage('interface:couldNotCheckRetentionKeepBackups'));
    }
  }
  function request() {
    if (destroyed || !active || !isOpen() || pending) return;
    const version = ++generation;
    const token = {};
    pending = token;
    token.done = (async () => {
      try {
        const storage = browser?.storage;
        if (typeof storage?.persist !== 'function') {
          show(version, unsupported);
          return;
        }
        show(version, requesting, true);
        // Invoke before the first await, directly in the explicit button action.
        const retained = await storage.persist();
        if (typeof retained !== 'boolean') throw new Error(t('interface:invalidRetentionResult'));
        show(
          version,
          retained
            ? granted
            : localizedMessage('interface:notGrantedByThisBrowserDownloadsMayBeRemovedKeep'),
        );
      } catch {
        show(
          version,
          localizedMessage('interface:couldNotRequestRetentionYouCanTryAgainKeepBackups'),
        );
      } finally {
        if (pending === token) pending = null;
      }
    })();
    return token.done;
  }
  button.addEventListener('click', request);
  return {
    refresh,
    close() {
      active = false;
      generation++;
    },
    destroy() {
      destroyed = true;
      active = false;
      generation++;
      button.removeEventListener('click', request);
    },
  };
}
