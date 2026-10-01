import { t, localizedText } from '../i18n/index.mjs';
import { createEncounterDisplayPreferences } from '../encounter-display-preferences.mjs';

/** A cosmetic global choice; the host still owns pause, input and navigation. */
export function attachEncounterDisplayControls({
  document: doc = globalThis.document,
  window: win = globalThis.window,
  getStorage = () => globalThis.localStorage,
  writable = () => true,
  prefix = '',
} = {}) {
  const checkbox = doc.getElementById(`${prefix}enemy-remains`),
    status = doc.getElementById(`${prefix}enemy-remains-status`),
    retry = doc.getElementById(`${prefix}enemy-remains-retry`);
  const preferences = createEncounterDisplayPreferences({ window: win, getStorage, writable });
  const stop = preferences.subscribe((state) => {
    if (checkbox) checkbox.checked = state.showRemains;
    if (status) {
      localizedText(status, () => (state.warningKey ? t(state.warningKey) : ''));
      status.hidden = !state.warningKey;
    }
    if (retry) retry.hidden = state.warningKey !== 'common:preferences.encounterSaveFailed';
  });
  const change = () => preferences.set(checkbox.checked);
  const save = () => preferences.retry();
  checkbox?.addEventListener('change', change);
  retry?.addEventListener('click', save);
  let disposed = false;
  return Object.freeze({
    snapshot: preferences.snapshot,
    dispose() {
      if (disposed) return;
      disposed = true;
      checkbox?.removeEventListener('change', change);
      retry?.removeEventListener('click', save);
      stop();
      preferences.dispose();
    },
  });
}
