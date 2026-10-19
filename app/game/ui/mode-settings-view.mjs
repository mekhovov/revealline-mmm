// Presentation only: the host owns every preference, modal and input handler.
// Keep this module dependency-free so optional games project the same organizer.
export const MODE_SETTINGS_CATEGORIES = Object.freeze([
  ['gameplay', 'play'],
  ['controls', 'controls'],
  ['audio', 'sound'],
  ['display', 'display'],
  ['accessibility', 'accessibility'],
  ['data', 'collection'],
  ['content', 'content'],
  ['extras', 'help'],
]);
const MODE_SETTINGS_COPY = Object.freeze({
  en: {
    categories: 'Settings categories',
    gameplay: 'Gameplay',
    controls: 'Controls',
    audio: 'Audio',
    display: 'Display',
    accessibility: 'Accessibility',
    data: 'Progress & Collection',
    content: 'Content & Offline',
    extras: 'Help & Extras',
  },
  uk: {
    categories: 'Розділи налаштувань',
    gameplay: 'Гра',
    controls: 'Керування',
    audio: 'Звук',
    display: 'Екран і мова',
    accessibility: 'Доступність',
    data: 'Прогрес і колекція',
    content: 'Вміст і офлайн',
    extras: 'Довідка й додаткове',
  },
});
const modeSettingsOwners = new WeakMap();

/** Reparent real host controls into the native settings categories. */
export function mountModeSettings({
  root,
  content = root,
  prefix = 'mode-settings',
  groups = {},
  locale = 'en',
  setMenuIcon = () => {},
  attachPanels,
  beforeSelect,
} = {}) {
  const doc = root?.ownerDocument;
  if (!doc || !content || !root.contains(content) || typeof attachPanels !== 'function')
    return null;
  if (modeSettingsOwners.has(root)) return modeSettingsOwners.get(root);
  const layout = doc.createElement('div'),
    list = doc.createElement('nav'),
    tabs = {},
    panels = {},
    headings = {},
    moves = [],
    moved = new Set(),
    rootClasses = ['native-settings', 'mode-settings-view'].filter(
      (name) => !root.classList.contains(name),
    ),
    contentClass = !content.classList.contains('mode-settings-content'),
    originalView = root.getAttribute('data-settings-view');
  layout.className = 'mode-settings-layout';
  list.className = 'field-kit-settings-tabs';
  list.setAttribute('role', 'tablist');
  list.setAttribute('aria-orientation', 'vertical');
  list.dataset.menuLayout = 'vertical';
  layout.append(list);
  for (const [category, icon] of MODE_SETTINGS_CATEGORIES) {
    const nodes = (groups[category] ?? []).filter(
      (node) =>
        node?.ownerDocument === doc && node !== root && node !== content && !moved.has(node),
    );
    if (!nodes.length) continue;
    const tab = doc.createElement('button'),
      panel = doc.createElement('section'),
      heading = doc.createElement('h3');
    tab.type = 'button';
    tab.id = `${prefix}-tab-${category}`;
    tab.setAttribute('role', 'tab');
    tab.setAttribute('aria-controls', `${prefix}-panel-${category}`);
    tab.setAttribute('aria-selected', String(!Object.keys(tabs).length));
    tab.tabIndex = Object.keys(tabs).length ? -1 : 0;
    setMenuIcon(tab, icon);
    panel.id = `${prefix}-panel-${category}`;
    panel.className = 'field-kit-settings-panel';
    panel.setAttribute('role', 'tabpanel');
    panel.setAttribute('aria-labelledby', tab.id);
    panel.tabIndex = -1;
    panel.dataset.menuLayout = 'vertical';
    panel.dataset.menuEdgeExit = 'true';
    panel.append(heading);
    for (const node of nodes) {
      moves.push({ node, parent: node.parentNode, next: node.nextSibling });
      moved.add(node);
      panel.append(node);
    }
    tabs[category] = tab;
    panels[category] = panel;
    headings[category] = heading;
    list.append(tab);
    layout.append(panel);
  }
  rootClasses.forEach((name) => root.classList.add(name));
  if (contentClass) content.classList.add('mode-settings-content');
  content.append(layout);
  const navigation = attachPanels({ root, document: doc, beforeSelect });
  let destroyed = false;
  const api = Object.freeze({
    navigation,
    tabs,
    panels,
    refresh(nextLocale = locale) {
      if (destroyed) return;
      locale = nextLocale;
      const labels = MODE_SETTINGS_COPY[String(locale).split('-')[0]] ?? MODE_SETTINGS_COPY.en;
      list.setAttribute('aria-label', labels.categories);
      for (const category of Object.keys(tabs)) {
        tabs[category].textContent = labels[category];
        headings[category].textContent = labels[category];
      }
    },
    destroy() {
      if (destroyed) return;
      destroyed = true;
      navigation?.destroy();
      for (const { node, parent, next } of moves.reverse()) {
        if (parent) parent.insertBefore(node, next?.parentNode === parent ? next : null);
        else node.remove();
      }
      layout.remove();
      rootClasses.forEach((name) => root.classList.remove(name));
      if (contentClass) content.classList.remove('mode-settings-content');
      if (originalView === null) root.removeAttribute('data-settings-view');
      else root.setAttribute('data-settings-view', originalView);
      modeSettingsOwners.delete(root);
    },
  });
  modeSettingsOwners.set(root, api);
  api.refresh(locale);
  return api;
}
