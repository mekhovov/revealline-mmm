import { applyFieldKitCopy } from './field-kit-copy.mjs';
import { attachSettingsPanels } from './settings-panels.mjs';
import { createMenuStylePreferences } from '../menu-style-preferences.mjs';
import { createMenuAppearance } from './menu-appearance.mjs';
import { hasEditionToolRequest } from './edition-tool-provider.mjs';
import { prepareNativeMenus } from './native-menus.mjs';

/** Presentation navigation only. Original host controls own preferences and saves. */
export function attachFieldKitSurfaces({
  document: doc = globalThis.document,
  window: win = globalThis.window,
  getStorage = () => globalThis.localStorage,
} = {}) {
  applyFieldKitCopy(doc);
  const nativeMenu = prepareNativeMenus({ document: doc });
  const removers = [];
  const listen = (node, type, handler) => {
    if (!node) return;
    node.addEventListener(type, handler);
    removers.push(() => node.removeEventListener(type, handler));
  };
  const settings = attachSettingsPanels({
    root: doc.getElementById('settings-dialog'),
    document: doc,
    beforeSelect(tab) {
      const capture = doc.getElementById('cancel-key-capture');
      const cancelling =
        tab.id !== 'settings-tab-controls' && capture && !capture.hidden && !capture.disabled;
      if (cancelling) capture.click();
      return !!cancelling;
    },
  });
  removers.push(() => settings.destroy());
  if (nativeMenu) removers.push(() => nativeMenu.destroy());
  const hasNativeSkinOwner = ['menu-palette', 'race-menu-palette', 'coop-menu-palette'].some((id) =>
    doc.getElementById(id),
  );
  if (
    doc.body?.dataset.fieldKitPage &&
    !hasNativeSkinOwner &&
    !hasEditionToolRequest({ document: doc, window: win })
  ) {
    const appearance = createMenuAppearance({ document: doc }),
      preferences = createMenuStylePreferences({ window: win, getStorage }),
      stopAppearance = preferences.subscribe((state) => appearance.set(state));
    removers.push(() => {
      stopAppearance();
      preferences.dispose();
      appearance.dispose();
    });
  }
  const openLibrary = (panel) => {
    // Use the real library entry and section handlers, including its pause and
    // modal return-focus bookkeeping. No library state is recreated here.
    doc.getElementById('library-button')?.click();
    doc.querySelector(`[data-library-panel="${panel}"]`)?.click();
  };
  listen(doc.getElementById('settings-saves'), 'click', () => openLibrary('saves'));
  listen(doc.getElementById('settings-packs'), 'click', () => openLibrary('packs'));
  listen(doc.getElementById('collection-records'), 'click', () => openLibrary('scores'));
  for (const control of doc.querySelectorAll('[data-field-kit-text-size]')) {
    listen(control, 'change', () => {
      doc.body.dataset.textSize = control.value === 'large' ? 'large' : 'standard';
    });
  }
  return { destroy: () => removers.forEach((remove) => remove()) };
}

// Supporting tools opt in explicitly. The game calls this from its shell so
// teardown remains part of the existing host lifecycle.
if (globalThis.document?.body?.dataset.fieldKitPage) {
  const win = globalThis.window;
  const owner = attachFieldKitSurfaces();
  const pagehide = (event) => {
    // A cached document keeps its page-owned chrome and shared preferences.
    // Terminal departure releases this auto-mount just as game shells do.
    if (event.persisted) return;
    win?.removeEventListener('pagehide', pagehide);
    owner.destroy();
  };
  win?.addEventListener('pagehide', pagehide);
}
