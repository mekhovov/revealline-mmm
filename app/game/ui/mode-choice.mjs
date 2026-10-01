import { t, localizedText, localizedAttribute } from '../i18n/index.mjs';
import { setMenuIcon } from './native-menu-icons.mjs';
const MODES = Object.freeze([['solo'], ['versus'], ['team']]);

/** Shared presentation only. Existing anchors keep their hrefs and listeners. */
export function mountModeChoices({ root, current, actions, separateTeam = false }) {
  if (!root || !MODES.some(([id]) => id === current))
    throw new Error(t('interface:aGameModeAndItsVisibleNavigationContainerAreRequired'));
  const document = root.ownerDocument;
  for (const [id] of MODES) {
    if (id !== current && actions?.[id]?.tagName !== 'A')
      throw new Error(`The existing ${id} mode link is required.`);
  }
  const choices = MODES.map(([id]) => {
    const selected = id === current;
    const element = selected ? document.createElement('button') : actions[id];
    if (selected) {
      element.type = 'button';
      element.id = `${current}-current-mode`;
    }
    element.removeAttribute('data-i18n');
    const label = document.createElement('strong');
    localizedText(label, () => t(`interface:nativeMenu.${id}`));
    element.replaceChildren(label);
    setMenuIcon(element, id);
    element.dataset.gameMode = id;
    if (selected) element.setAttribute('aria-current', 'page');
    return element;
  });
  root.classList.add('game-mode-choice');
  root.dataset.menuLayout = 'horizontal';
  root.dataset.menuScope = 'modes';
  localizedAttribute(root, 'aria-label', () => t('common:game.mode'));
  root.replaceChildren(...choices);
}
