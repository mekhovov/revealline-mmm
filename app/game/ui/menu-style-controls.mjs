import { t, localizedText } from '../i18n/index.mjs';
import { createMenuStylePreferences } from '../menu-style-preferences.mjs';
import { createMenuAppearance } from './menu-appearance.mjs';
import { attachPreferenceRestoration } from './preference-restoration.mjs';

/** Existing Options owns navigation. These native selectors own only the separate
 * menu-style record, and never call a flight's preferences, prepare or Resume. */
export function attachMenuStyleControls({
  document: doc = globalThis.document,
  window: win = globalThis.window,
  getStorage = () => globalThis.localStorage,
  writable = () => true,
  prefix = '',
} = {}) {
  const palette = doc.getElementById(`${prefix}menu-palette`),
    ornaments = doc.getElementById(`${prefix}menu-ornaments`),
    status = doc.getElementById(`${prefix}menu-style-status`);
  if (!palette || !ornaments || !status)
    throw new TypeError(t('interface:menuStyleControlsAreMissing'));
  const appearance = createMenuAppearance({ document: doc });
  const preferences = createMenuStylePreferences({
    window: win,
    getStorage,
    writable,
    onWarning: (message) => {
      localizedText(status, () => message);
    },
  });
  const render = (state) => {
    palette.value = state.palette;
    ornaments.value = state.ornaments;
    appearance.set(state);
  };
  const stopView = preferences.subscribe(render);
  const restoration = attachPreferenceRestoration({
    window: win,
    getSnapshot: preferences.snapshot,
    render,
  });
  const choosePalette = () => preferences.set({ palette: palette.value }),
    chooseOrnaments = () => preferences.set({ ornaments: ornaments.value });
  palette.addEventListener('change', choosePalette);
  ornaments.addEventListener('change', chooseOrnaments);
  let disposed = false;
  return Object.freeze({
    setPresentation: (snapshot) => appearance.setPresentation(snapshot),
    dispose() {
      if (disposed) return;
      disposed = true;
      palette.removeEventListener('change', choosePalette);
      ornaments.removeEventListener('change', chooseOrnaments);
      restoration.dispose();
      stopView();
      preferences.dispose();
      appearance.dispose();
    },
  });
}
