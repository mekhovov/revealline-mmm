import { t } from '../i18n/index.mjs';
import { menuStyleVariables, resolveMenuStyle } from '../presentation/menu-styles.mjs';
import { stableId } from '../data-json.mjs';

const owners = new WeakMap();
const ornamentRoots = [
  'shell-home',
  'shell-missions',
  'settings-dialog',
  'library-dialog',
  'collection-dialog',
  'race-main',
  'race-setup',
  'race-options-panel',
  'race-help-panel',
  'race-confirm',
  'race-leave-panel',
  'coop-menu',
  'coop-overlay',
  'coop-discard-dialog',
  'restart-dialog',
  'mission-replace-dialog',
  'mode-leave-dialog',
];

/** A document's menu decoration only: no painter, media, progress or navigation
 * ownership. Presentation snapshots are validated but never choose the UI skin. */
export function createMenuAppearance({ document: doc = globalThis.document } = {}) {
  const body = doc?.body;
  if (!body?.style || !doc.createElement)
    throw new TypeError(t('interface:menuAppearanceNeedsADocument'));
  owners.get(body)?.dispose();
  let disposed = false,
    choice = { palette: 'auto', ornaments: 'subtle' };
  const before = new Map(),
    values = menuStyleVariables(),
    decorations = new Map(),
    attributes = new Map();
  let observer;
  const readStyle = (name) => body.style.getPropertyValue?.(name) ?? body.style[name] ?? '';
  const beforeAttributes = new Map(
    ['menuPalette', 'menuOrnaments'].map((name) => [
      name,
      { present: Object.hasOwn(body.dataset, name), value: body.dataset[name] },
    ]),
  );
  function apply() {
    if (disposed) return;
    const resolved = resolveMenuStyle(choice);
    for (const [name, value] of [
      ['menuPalette', resolved.palette],
      ['menuOrnaments', resolved.ornaments],
    ]) {
      body.dataset[name] = value;
      attributes.set(name, value);
    }
  }
  const owner = {
    set(state) {
      if (disposed) return;
      // Validate both values before touching either DOM attribute.
      resolveMenuStyle(state);
      choice = { palette: state.palette, ornaments: state.ornaments };
      apply();
    },
    setPresentation(snapshot) {
      if (disposed) return;
      const id = snapshot?.resolved?.theme?.id;
      if (snapshot !== null && !stableId(id))
        throw new TypeError(t('interface:menuAppearanceNeedsAnAcceptedThemeIdentity'));
      // Null is the existing declared fallback. UI skin intent stays separate
      // from accepted campaign/canvas presentation.
      apply();
    },
    dispose() {
      if (disposed) return;
      disposed = true;
      observer?.disconnect();
      for (const decoration of decorations.values()) decoration.remove();
      decorations.clear();
      if (owners.get(body) !== owner) return;
      owners.delete(body);
      for (const [name, value] of attributes) {
        if (body.dataset[name] !== value) continue;
        const prior = beforeAttributes.get(name);
        if (prior.present) body.dataset[name] = prior.value;
        else delete body.dataset[name];
      }
      for (const [name, prior] of before) {
        if (readStyle(name) !== values[name]) continue;
        if (prior.value) body.style.setProperty(name, prior.value, prior.priority);
        else if (body.style.removeProperty) body.style.removeProperty(name);
        else delete body.style[name];
      }
    },
  };
  owners.set(body, owner);
  try {
    for (const [name, value] of Object.entries(values)) {
      before.set(name, {
        value: readStyle(name),
        priority: body.style.getPropertyPriority?.(name) ?? '',
      });
      body.style.setProperty(name, value);
    }
    const decorate = (root) => {
      if (disposed || !root?.isConnected || decorations.get(root)?.parentNode === root) return;
      decorations.get(root)?.remove();
      const decoration = doc.createElement('div');
      decoration.className = 'menu-ornament';
      decoration.setAttribute('aria-hidden', 'true');
      root.append(decoration);
      decorations.set(root, decoration);
    };
    for (const root of new Set([
      ...ornamentRoots.map((id) => doc.getElementById(id)).filter(Boolean),
      ...doc.querySelectorAll('dialog'),
    ]))
      decorate(root);
    // Player panels such as Music Library create their own dialog after boot.
    // Observe dialog attachment/replacement only; never decorate general content,
    // canvas, HUD, input descendants or separate authoring documents.
    const Observer = doc.defaultView?.MutationObserver ?? globalThis.MutationObserver;
    if (typeof Observer === 'function') {
      observer = new Observer((records) => {
        if (disposed) return;
        for (const [root, decoration] of decorations) {
          if (root.isConnected) continue;
          decoration.remove();
          decorations.delete(root);
        }
        for (const record of records) {
          if (record.target?.tagName === 'DIALOG') decorate(record.target);
          for (const node of record.addedNodes ?? []) {
            if (node.tagName === 'DIALOG') decorate(node);
            for (const dialog of node.querySelectorAll?.('dialog') ?? []) decorate(dialog);
          }
        }
      });
      observer.observe(body, { childList: true, subtree: true });
    }
    apply();
  } catch (error) {
    owner.dispose();
    throw error;
  }
  return Object.freeze(owner);
}
