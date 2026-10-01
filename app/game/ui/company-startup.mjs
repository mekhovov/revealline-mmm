import { loadRuntimeContentProvider } from '../runtime-content-provider.mjs';
import { createOfflineDownloadAccess } from '../offline-download-access.mjs';
import { offlineAvailability } from '../offline.mjs';

/** Company play uses its verified online loaders; offline preparation is optional. */
export async function loadCompanyStartup({
  documentRef = globalThis.document,
  locationRef = globalThis.location,
  windowRef = globalThis.window,
  navigatorRef = globalThis.navigator,
  offlineLocationRef = documentRef?.defaultView?.location ?? windowRef?.location ?? locationRef,
  availability = offlineAvailability({
    documentRef,
    locationRef: offlineLocationRef,
    navigatorRef,
  }),
  loadProvider = loadRuntimeContentProvider,
  createAccess = createOfflineDownloadAccess,
  ...options
} = {}) {
  const controller = new AbortController();
  const abort = () =>
    controller.abort(new DOMException('Company startup cancelled.', 'AbortError'));
  const hidden = () => {
    if (documentRef?.hidden) abort();
  };
  windowRef?.addEventListener?.('pagehide', abort);
  documentRef?.addEventListener?.('visibilitychange', hidden);
  const access = createAccess({ availability });
  try {
    return await loadProvider({
      ...options,
      documentRef,
      locationRef,
      signal: controller.signal,
      ensurePackage: async (groupId) => {
        await access.ensure(groupId, { signal: controller.signal, retain: true });
        controller.signal.throwIfAborted();
      },
    });
  } finally {
    abort();
    windowRef?.removeEventListener?.('pagehide', abort);
    documentRef?.removeEventListener?.('visibilitychange', hidden);
  }
}
