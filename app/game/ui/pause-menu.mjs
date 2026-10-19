import { localizedText, t } from '../i18n/index.mjs';
import { setMenuIcon } from './native-menu-icons.mjs';

/** Arrange existing host actions without replacing their handlers or navigation ownership. */
export function createPauseMenu({
  document: doc = globalThis.document,
  root,
  resume,
  missions = [],
  audio = [],
  config = [],
  home,
  notices = [],
}) {
  if (!root) return null;
  const menu = doc.createElement('div');
  menu.className = 'shared-pause-menu';
  menu.hidden = true;
  const destinations = new Map();
  const homes = new Map();
  const refreshes = [];
  const action = (entry, parent, className) => {
    const element = entry && Object.hasOwn(entry, 'element') ? entry.element : entry;
    if (!element) return;
    destinations.set(element, parent);
    if (entry.refresh) refreshes.push(entry.refresh);
    if (className) element.classList.add(className);
    if (entry.icon) setMenuIcon(element, entry.icon);
    if (entry.key) {
      element.removeAttribute('data-i18n');
      localizedText(element, () => t(`interface:${entry.key}`));
    }
  };
  action({ element: resume, icon: 'play' }, menu, 'pause-command-primary');
  for (const [name, key, entries] of [
    ['missions', 'missions', missions],
    ['audio', 'sound', audio],
    ['config', 'config', config],
  ]) {
    if (
      !entries.some((entry) => entry && (Object.hasOwn(entry, 'element') ? entry.element : entry))
    )
      continue;
    const section = doc.createElement('section');
    section.className = 'pause-command-section';
    section.dataset.pauseGroup = name;
    const heading = doc.createElement('h3');
    localizedText(heading, () => t(`interface:${key}`));
    const grid = doc.createElement('div');
    grid.className = 'pause-command-grid';
    section.append(heading, grid);
    menu.append(section);
    for (const entry of entries) action(entry, grid);
  }
  action({ element: home, icon: 'home' }, menu, 'pause-command-home');
  for (const entry of notices) action(entry, menu, 'pause-command-notice');
  root.append(menu);
  function setActive(active) {
    menu.hidden = !active;
    root.classList.toggle('has-shared-pause-menu', active);
    if (active) {
      for (const refresh of refreshes) refresh();
      for (const [element, destination] of destinations) {
        if (element.parentNode === destination) continue;
        if (element.parentNode && !homes.has(element)) {
          const marker = doc.createElement('span');
          marker.hidden = true;
          element.after(marker);
          homes.set(element, marker);
        }
        if (element === resume) destination.insertBefore(element, destination.firstChild);
        else destination.append(element);
      }
    } else {
      for (const [element, marker] of homes) {
        marker.before(element);
        marker.remove();
      }
      homes.clear();
    }
  }
  return {
    root: menu,
    setActive,
    destroy() {
      setActive(false);
      menu.remove();
    },
  };
}

/** A pause shortcut delegates to the host's existing soundtrack transport. */
export function pauseMusicAction(doc, prefix) {
  const element = doc.createElement('button');
  element.id = `${prefix}-pause-next-song`;
  element.type = 'button';
  localizedText(element, () => t('interface:quickMusic.next'));
  element.onclick = () => doc.getElementById(`${prefix}-music-next`)?.click();
  return {
    element,
    icon: 'next',
    refresh() {
      const transport = doc.getElementById(`${prefix}-music-next`);
      element.hidden = !transport;
      element.disabled = !transport || transport.disabled;
    },
  };
}
