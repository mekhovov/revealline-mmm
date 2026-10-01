import {
  activateInstalledEdition,
  installedPresentation,
  readInstalledState,
  validateInstalledEdition,
} from '../installed-app.mjs';
import { readAssetStore } from '../storage.mjs';
import { ownsProfileWriter } from '../profile-writer.mjs';
import { captureInstallPrompt } from './pwa-install.mjs';
import { createOfficialDownloads } from '../official-downloads.mjs';
import { localizedAttribute, localizedText, onLocaleChange, t } from '../i18n/index.mjs';

const protocol = 'revealline-mmm.offline-panel.v1';
const ownedFrames = new WeakMap();

export function installOfflineOwnsElement(element, doc = globalThis.document) {
  const owned = doc && ownedFrames.get(doc);
  return Boolean(owned?.dialog.open && element && owned.dialog.contains(element) && !doc.hidden);
}

/** Child focus is still within this foreground game; arbitrary iframes are not trusted. */
export function installOfflineFrameFocused(doc = globalThis.document) {
  const owned = doc && ownedFrames.get(doc);
  return Boolean(
    owned?.dialog.open &&
      owned.frame.isConnected &&
      doc.activeElement === owned.frame &&
      !doc.hidden &&
      doc.hasFocus?.() === true,
  );
}

/** Browsers may emit the parent blur before activeElement becomes the child frame. */
export function guardInstallOfflineBlur(callback, doc = globalThis.document) {
  return (...args) => {
    if (!ownedFrames.get(doc)?.dialog.open) return callback(...args);
    if (installOfflineFrameFocused(doc)) return;
    queueMicrotask(() => {
      if (!installOfflineFrameFocused(doc)) callback(...args);
    });
  };
}

/** One lazy download surface for all game hosts. Closing it never resumes a flight. */
export function attachInstallOfflinePanel({
  document: doc = globalThis.document,
  window: win = globalThis.window,
  downloadsURL = new URL('../downloads.html', import.meta.url),
  getWriter = () => null,
  canActivate = () => false,
  onOpen = () => {},
  onClose = () => {},
  onStatus = () => {},
  mountRoot = doc?.body,
} = {}) {
  const url = new URL(downloadsURL, win?.location?.href);
  url.searchParams.set('embedded', '1');
  const origin = url.origin,
    editionScope = new URL('../', url).href;
  const install = captureInstallPrompt(win);
  let dialog,
    frame,
    closeButton,
    installButton,
    downloadsButton,
    opener,
    unsubscribe,
    pendingPackage,
    disposed = false,
    statusReported = false,
    localStatus = null;
  const reportStatus = (text, producer = null) => {
    if (disposed) return;
    statusReported = true;
    localStatus = producer;
    onStatus(text);
  };
  const label = () =>
    installedPresentation(win, win?.navigator)
      ? t('interface:offlinePlay')
      : t('interface:installAppGameAndSoundtrackDownloads');
  const tellFrame = (action, fields = {}) =>
    frame?.contentWindow?.postMessage({ format: protocol, action, ...fields }, origin);
  const close = () => {
    if (dialog?.open) dialog.close();
  };
  const message = async (event) => {
    if (
      !frame ||
      event.origin !== origin ||
      event.source !== frame.contentWindow ||
      event.data?.format !== protocol
    )
      return;
    if (event.data.action === 'status') {
      if (typeof event.data.text === 'string' && event.data.text.length <= 400)
        reportStatus(event.data.text);
      return;
    }
    if (
      event.data.action === 'packages-ready' &&
      pendingPackage &&
      Array.isArray(event.data.groups) &&
      event.data.groups.includes(pendingPackage.groupId)
    ) {
      const pending = pendingPackage;
      pendingPackage = null;
      pending.cleanup();
      pending.resolve();
      close();
      return;
    }
    if (event.data.action === 'close') {
      close();
      return;
    }
    if (event.data.action !== 'activate' || !event.ports?.[0]) return;
    const reply = event.ports[0];
    try {
      const candidate = validateInstalledEdition(event.data.candidate, win.location);
      if (candidate.scope !== editionScope)
        throw new Error(t('interface:downloads.preparedEditionMismatch'));
      if (!canActivate()) {
        reply.postMessage({
          activated: false,
          deferred: true,
          message: t('interface:downloads.activationDeferred'),
        });
        return;
      }
      const owned = getWriter();
      const result = await activateInstalledEdition(candidate, {
        storage: win.localStorage,
        locationRef: win.location,
        locks: win.navigator?.locks,
        readAsset: readAssetStore,
        ownsWriter: (key) =>
          canActivate() && owned?.key === key && ownsProfileWriter(owned.lease, key),
      });
      reply.postMessage(result);
    } catch (error) {
      reply.postMessage({ activated: false, message: error.message });
    } finally {
      reply.close();
    }
  };
  win?.addEventListener?.('message', message);
  function create() {
    const style = doc.createElement('link');
    style.rel = 'stylesheet';
    style.href = new URL('install-offline-panel.css', import.meta.url).href;
    doc.head.append(style);
    dialog = doc.createElement('dialog');
    dialog.id = 'install-offline-dialog';
    dialog.className = 'install-offline-dialog';
    localizedAttribute(dialog, 'aria-label', label);
    const header = doc.createElement('div'),
      title = doc.createElement('h2');
    header.className = 'install-offline-header';
    localizedText(title, label);
    installButton = doc.createElement('button');
    installButton.id = 'install-offline-install';
    localizedText(installButton, () => t('interface:launcher.install'));
    installButton.onclick = () => {
      void install?.request().catch((error) => reportStatus(error.message));
    };
    const refreshInstall = () => {
      installButton.hidden = !install?.available() || install?.installed();
    };
    refreshInstall();
    closeButton = doc.createElement('button');
    closeButton.id = 'install-offline-close';
    localizedText(closeButton, () => t('common:navigation.backToGame'));
    closeButton.onclick = close;
    frame = doc.createElement('iframe');
    frame.tabIndex = 0;
    localizedAttribute(frame, 'title', () => t('interface:downloads.frameTitle'));
    frame.src = url.href;
    frame.onload = () => {
      tellFrame('host-ready', { installed: install?.installed() || false });
      if (pendingPackage) tellFrame('select-package', { groupId: pendingPackage.groupId });
    };
    downloadsButton = doc.createElement('button');
    downloadsButton.id = 'install-offline-downloads';
    localizedText(downloadsButton, () => t('interface:downloads.chooseDownloads'));
    downloadsButton.onclick = () => {
      frame.contentWindow?.focus();
      frame.contentDocument?.getElementById('download-game')?.focus({ preventScroll: true });
    };
    header.append(title, installButton, downloadsButton, closeButton);
    dialog.append(header, frame);
    mountRoot.append(dialog);
    ownedFrames.set(doc, { dialog, frame });
    dialog.addEventListener('close', () => {
      if (pendingPackage) {
        const pending = pendingPackage;
        pendingPackage = null;
        pending.cleanup();
        pending.reject(
          new DOMException(t('interface:downloads.packageSelectionClosed'), 'AbortError'),
        );
      }
      tellFrame('panel-closed');
      onClose();
      if (!doc.hidden && opener?.isConnected) opener.focus({ preventScroll: true });
    });
  }
  const panel = {
    label,
    open() {
      if (!doc?.body || !mountRoot?.isConnected || !win?.location || origin !== win.location.origin)
        return false;
      if (dialog?.open) return true;
      opener = doc.activeElement;
      onOpen();
      if (!dialog) create();
      dialog.showModal();
      tellFrame('panel-opened');
      downloadsButton.focus({ preventScroll: true });
      return true;
    },
    close,
    root: () => (dialog?.open ? dialog : null),
    isOpen: () => Boolean(dialog?.open),
    frameFocused: () => Boolean(dialog?.open && frame && doc.activeElement === frame),
    requestPackage({ groupId, signal } = {}) {
      if (typeof groupId !== 'string' || groupId.length > 200)
        return Promise.reject(new Error(t('interface:downloads.invalidPackageSelection')));
      if (signal?.aborted)
        return Promise.reject(
          signal.reason ||
            new DOMException(t('interface:downloads.packageRequestCancelled'), 'AbortError'),
        );
      if (pendingPackage)
        return Promise.reject(new Error(t('interface:downloads.packageRequestAlreadyOpen')));
      return new Promise((resolve, reject) => {
        const abort = () => {
          pendingPackage = null;
          signal?.removeEventListener('abort', abort);
          reject(new DOMException(t('interface:downloads.packageRequestCancelled'), 'AbortError'));
          close();
        };
        pendingPackage = {
          groupId,
          resolve,
          reject,
          cleanup: () => signal?.removeEventListener('abort', abort),
        };
        signal?.addEventListener('abort', abort, { once: true });
        if (!panel.open()) {
          abort();
          return;
        }
        tellFrame('select-package', { groupId });
      });
    },
    suggest() {
      if (!install?.available() || install.installed()) return false;
      try {
        if (win.localStorage.getItem('revealline-mmm.install-suggestion.v1')) return false;
        win.localStorage.setItem('revealline-mmm.install-suggestion.v1', 'shown');
      } catch {
        return false;
      }
      const producer = () => t('interface:downloads.installSuggestion');
      reportStatus(producer(), producer);
      return true;
    },
    dispose() {
      disposed = true;
      stopLocaleStatus();
      if (ownedFrames.get(doc)?.frame === frame) ownedFrames.delete(doc);
      unsubscribe?.();
      win?.removeEventListener?.('message', message);
      dialog?.remove();
    },
  };
  unsubscribe = install?.subscribe(() => {
    if (installButton) installButton.hidden = !install.available() || install.installed();
    if (canActivate()) panel.suggest();
  });
  // Only inspect small local checkpoint metadata here. Verified readiness still
  // belongs to the download surface, which checks every selected file and shell.
  void (async () => {
    try {
      const active = readInstalledState(win?.localStorage).active;
      const states = win?.caches
        ? await createOfficialDownloads({ caches: win.caches, origin }).states()
        : [];
      const saved = states.some(
        (state) => state.edition === editionScope && state.group === 'gameplay',
      );
      if (!statusReported && (saved || active?.scope === editionScope)) {
        const producer = () => t('interface:downloads.savedSelection');
        reportStatus(producer(), producer);
      }
    } catch {
      // Unavailable metadata cannot establish offline readiness.
    }
  })();
  const stopLocaleStatus = onLocaleChange(() => {
    if (localStatus) onStatus(localStatus());
  });
  return Object.freeze(panel);
}
