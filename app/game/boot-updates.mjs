import {
  installedAppURL,
  installedPresentation,
  validateInstalledEdition,
} from './installed-app.mjs';
import { gameUpdatesURL } from './game-updates.mjs';
import { editionIdFromLocation } from './edition-context.mjs';
import { localizedText, t } from './i18n/index.mjs';

/** Metadata is advisory only: selection, migration and downloads belong to the explicit updater. */
export function startupUpdateCandidate(
  marker,
  current,
  locationRef,
  metadataURL,
  compiled = false,
) {
  if (
    !/^[a-f0-9]{64}$/.test(current?.buildId) ||
    (!compiled && !/^[a-f0-9]{64}$/.test(marker?.buildId)) ||
    (!compiled && marker.format !== 'revealline-app-update.v1')
  )
    throw new Error('Invalid startup update identity.');
  const candidate = validateInstalledEdition(
    {
      ...marker,
      version: compiled ? marker.version : current.version,
      scope: new URL(marker.scope, metadataURL).href,
    },
    locationRef,
  );
  return {
    candidate,
    available: compiled
      ? candidate.scope !== new URL(current.scope, locationRef.href).href ||
        Boolean(candidate.buildId && candidate.buildId !== current.buildId)
      : candidate.buildId !== current.buildId,
  };
}

/** A single bounded metadata request; never part of the game readiness promise. */
export function attachBootUpdates({ document: doc = document, window: win = window } = {}) {
  const section = doc.getElementById('boot-updates');
  const action = doc.getElementById('boot-update-action');
  const status = doc.getElementById('boot-update-status');
  if (
    !section ||
    !action ||
    !status ||
    !/^https?:$/.test(win.location.protocol) ||
    !installedPresentation(win, win.navigator)
  )
    return { dispose() {} };
  const app = installedAppURL(win.location);
  const compiled = editionIdFromLocation(win.location) !== undefined;
  action.href = compiled ? new URL('?manage', app).href : gameUpdatesURL(win.location).href;
  section.hidden = false;
  localizedText(action, () => t('interface:updates.check'));
  let current;
  try {
    current = JSON.parse(doc.querySelector('meta[name="revealline-offline"]')?.content || 'null');
  } catch {
    /* A recovery link still works when the local marker is damaged. */
  }
  if (!current?.buildId) return { dispose() {} };
  const controller = new AbortController();
  let disposed = false;
  const timer = win.setTimeout(() => controller.abort(), 4000);
  const metadataURL = new URL(compiled ? 'current.json' : 'update.html', app);
  const message = (key) => localizedText(status, () => t(key));
  message('interface:updates.startupChecking');
  void (async () => {
    try {
      const response = await win.fetch(metadataURL.href, {
        cache: 'no-store',
        redirect: 'error',
        credentials: 'same-origin',
        signal: controller.signal,
      });
      if (!response.ok || response.redirected) throw new Error('Update metadata unavailable.');
      const text = await response.text();
      if (text.length > 128 * 1024) throw new Error('Update metadata exceeds its budget.');
      const marker = compiled
        ? JSON.parse(text)
        : JSON.parse(
            new win.DOMParser()
              .parseFromString(text, 'text/html')
              .querySelector('meta[name="revealline-update"]')?.content || 'null',
          );
      const result = startupUpdateCandidate(marker, current, win.location, metadataURL, compiled);
      if (disposed || controller.signal.aborted) return;
      if (result.available) {
        localizedText(action, () => t('interface:updates.startupDownload'));
        message('interface:updates.startupAvailable');
      } else message('interface:updates.startupCurrent');
    } catch {
      if (!disposed) message('interface:updates.startupUnavailable');
    } finally {
      win.clearTimeout(timer);
    }
  })();
  const dispose = () => {
    disposed = true;
    win.clearTimeout(timer);
    controller.abort();
    win.removeEventListener('pagehide', dispose);
  };
  win.addEventListener('pagehide', dispose, { once: true });
  return { dispose };
}
