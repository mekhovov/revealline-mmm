import { offlineAvailability } from '../offline.mjs';
import { guardInstallOfflineBlur } from './install-offline-panel.mjs';

/** Tool links share the explicit package consent flow. Modified clicks, downloads,
 * external destinations and host-owned mode departure handlers keep their owners. */
export function attachOfflineToolNavigation(options) {
  return attachOfflineNavigation(options, 'tools');
}

/** Plain mode links prepare the receiving host without bypassing an existing
 * flight's explicit departure/replace handler. Those handlers gate themselves. */
export function attachOfflineModeNavigation(options) {
  return attachOfflineNavigation(options, 'modes');
}

function attachOfflineNavigation(
  {
    document: doc = globalThis.document,
    window: win = globalThis.window,
    access,
    availability = offlineAvailability(),
    onError = () => {},
  } = {},
  kind,
) {
  if (!availability.available || !availability.packageConsent) return () => {};
  const scope = new URL(availability.scope);
  let disposed = false,
    pending = null;
  const click = async (event) => {
    if (
      event.defaultPrevented ||
      event.button > 0 ||
      event.ctrlKey ||
      event.metaKey ||
      event.shiftKey ||
      event.altKey
    )
      return;
    const anchor = event.target?.closest?.('a[href]');
    if (!anchor || anchor.hasAttribute('download') || (anchor.target && anchor.target !== '_self'))
      return;
    const destination = new URL(anchor.href, win.location.href);
    if (destination.origin !== scope.origin || !destination.pathname.startsWith(scope.pathname))
      return;
    const path = destination.pathname.slice(scope.pathname.length);
    if (kind === 'tools') {
      if (!/^(?:authoring\/|docs\/|game\/playground\/)/.test(path)) return;
    } else {
      if (!/^game\/(?:index\.html|couch\/(?:index\.html|relay-rescue\.html)?)?$/.test(path)) return;
      const current = new URL(win.location.href);
      if (destination.pathname === current.pathname && destination.search === current.search)
        return;
    }
    event.preventDefault();
    if (pending) return;
    const controller = new AbortController();
    pending = controller;
    try {
      await access[kind === 'tools' ? 'ensureURL' : 'ensureDestination'](destination, {
        signal: controller.signal,
      });
      if (!disposed && !controller.signal.aborted && !doc.hidden && doc.hasFocus?.() !== false)
        win.location.assign(destination.href);
    } catch (error) {
      if (!disposed && error.name !== 'AbortError') onError(error);
    } finally {
      if (pending === controller) pending = null;
    }
  };
  doc.addEventListener('click', click);
  const cancel = () => pending?.abort();
  const hidden = () => {
    if (doc.hidden) cancel();
  };
  const blurred = guardInstallOfflineBlur(cancel, doc);
  win.addEventListener('pagehide', cancel);
  win.addEventListener('blur', blurred);
  doc.addEventListener('visibilitychange', hidden);
  return () => {
    disposed = true;
    cancel();
    doc.removeEventListener('click', click);
    doc.removeEventListener('visibilitychange', hidden);
    win.removeEventListener('pagehide', cancel);
    win.removeEventListener('blur', blurred);
  };
}
