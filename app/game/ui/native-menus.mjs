import { t, localizedText, localizedAttribute } from '../i18n/index.mjs';
import { setMenuIcon } from './native-menu-icons.mjs';
import { attachMenuScene, getMenuAnimation, setMenuAnimation } from './menu-scenes.mjs';
import { attachFullscreen } from './fullscreen.mjs';
import { mountLandingBrand, GAME_BRAND_NAME } from './brand-identity.mjs';
import { attachMenuRetune } from './menu-retune.mjs';
import { communityDirectoryURL } from '../community-routes.mjs';
import { attachGameUpdates } from './game-updates.mjs';

export const NATIVE_MENU_CATEGORIES = Object.freeze([
  ['gameplay', 'play'],
  ['controls', 'controls'],
  ['audio', 'sound'],
  ['display', 'display'],
  ['accessibility', 'accessibility'],
  ['data', 'collection'],
  ['content', 'content'],
  ['extras', 'help'],
]);
const owners = new WeakMap();

/** Move the real controls, preserving their state, IDs and host-owned handlers. */
export function prepareNativeMenus({
  document: doc = globalThis.document,
  mode = 'solo',
  getSceneContext = () => ({}),
} = {}) {
  const $ = (id) => doc.getElementById(id);
  const root = $(mode === 'solo' ? 'shell-home' : mode === 'versus' ? 'race-main' : 'coop-menu');
  const settings = $(
    mode === 'solo' ? 'settings-dialog' : mode === 'versus' ? 'race-options-panel' : 'coop-options',
  );
  if (!root || !settings) return null;
  if (owners.has(root)) return owners.get(root);
  const tabs = settings.querySelector('.field-kit-settings-tabs');
  if (!tabs) return null;
  const prefix =
    mode === 'solo' ? 'settings' : mode === 'versus' ? 'race-settings' : 'coop-settings';
  const created = [],
    moves = [],
    listeners = [];
  const make = (tag, className = '') => {
    const node = doc.createElement(tag);
    node.className = className;
    created.push(node);
    return node;
  };
  const move = (node, parent) => {
    if (!node || !parent || node.parentNode === parent) return;
    moves.push({ node, parent: node.parentNode, next: node.nextSibling });
    parent.append(node);
  };
  const moveId = (id, parent, label = false) => {
    const node = $(id);
    if (!label) return move(node, parent);
    const wrapper = node?.closest('label');
    if (wrapper) return move(wrapper, parent);
    // Team's select captions use explicit for/id association rather than a
    // wrapping label. Preserve that pair when giving the field its new home.
    if (node) {
      move(doc.querySelector(`label[for="${id}"]`), parent);
      move(node, parent);
    }
  };
  const copy = (node, key) => {
    if (!node) return;
    node.removeAttribute('data-i18n');
    node.removeAttribute('data-field-kit-copy');
    localizedText(node, () => t(`interface:nativeMenu.${key}`));
  };
  root.classList.add('native-landing');
  root.dataset.nativeMode = mode;
  settings.classList.add('native-settings');
  settings.dataset.menuScope = 'settings';
  const back = settings.querySelector('.dialog-close, #race-options-back, #coop-settings-close');
  setMenuIcon(back, 'back');
  if (mode === 'solo' && back) {
    back.removeAttribute('data-i18n-aria-label');
    localizedText(back, () => t('common:actions.back'));
    localizedAttribute(back, 'aria-label', () => t('common:actions.back'));
  }
  tabs.dataset.menuLayout = 'vertical';
  tabs.setAttribute('aria-orientation', 'vertical');
  const panels = {};
  for (const [id, icon] of NATIVE_MENU_CATEGORIES) {
    let tab = $(`${prefix}-tab-${id}`),
      panel = $(`${prefix}-panel-${id}`);
    if (!panel) {
      panel = make('section', 'field-kit-settings-panel');
      panel.id = `${prefix}-panel-${id}`;
      panel.setAttribute('role', 'tabpanel');
      panel.setAttribute('aria-labelledby', `${prefix}-tab-${id}`);
      panel.hidden = true;
      settings.append(panel);
    }
    if (!tab) {
      tab = make('button');
      tab.id = `${prefix}-tab-${id}`;
      tab.type = 'button';
      tab.setAttribute('role', 'tab');
      tab.setAttribute('aria-controls', panel.id);
      tab.setAttribute('aria-selected', 'false');
      tab.tabIndex = -1;
    }
    tabs.append(tab);
    copy(tab, id);
    setMenuIcon(tab, icon);
    const heading = panel.querySelector(':scope > h2, :scope > h3');
    if (heading) copy(heading, id);
    else {
      const title = make('h3');
      copy(title, id);
      panel.prepend(title);
    }
    panel.dataset.menuLayout = 'vertical';
    panels[id] = panel;
  }
  // Language has one predictable home, including controls mounted at boot.
  for (const node of [
    ...settings.querySelectorAll(':scope > [data-language-control]'),
    ...root.querySelectorAll('[data-language-control]'),
  ]) {
    if (panels.display.querySelector('[data-language-control]')) node.hidden = true;
    move(node, panels.display);
  }
  const fieldPrefix = mode === 'solo' ? '' : mode === 'versus' ? 'race-' : 'coop-';
  for (const id of [
    `${fieldPrefix}text-face`,
    `${fieldPrefix}text-size`,
    mode === 'solo' ? 'settings-reduced-effects' : `${fieldPrefix}reduced`,
  ])
    moveId(id, panels.accessibility, true);
  for (const id of mode === 'solo'
    ? ['display-system-reduction', 'display-preferences-status']
    : [`${fieldPrefix}system-reduction`, `${fieldPrefix}display-status`])
    moveId(id, panels.accessibility);
  moveId(`${fieldPrefix}gameplay-tuning`, panels.gameplay);
  const animationLabel = make('label', 'settings-check');
  const animation = make('input');
  animation.type = 'checkbox';
  animation.id = `${prefix}-background-animation`;
  animation.checked = getMenuAnimation(doc.defaultView);
  const animationText = make('span');
  copy(animationText, 'backgroundAnimation');
  animationLabel.append(animation, animationText);
  panels.accessibility.append(animationLabel);
  const animationChange = () => setMenuAnimation(animation.checked, doc.defaultView);
  animation.addEventListener('change', animationChange);
  listeners.push(() => animation.removeEventListener('change', animationChange));
  let actions;
  if (mode === 'solo') {
    actions = root.querySelector('.home-actions');
    for (const id of ['shell-play-options', 'gameplay-tuning']) moveId(id, panels.gameplay);
    for (const id of [
      'shell-offline',
      'shell-offline-status',
      'shell-catalogue',
      'settings-packs',
      'offline-legacy-controls',
    ])
      moveId(id, panels.content);
    move($('storage-retention-button')?.closest('section'), panels.content);
    moveId('shell-controller-lab', panels.controls);
    moveId('shell-gallery', panels.data);
    moveId('shell-music', panels.audio);
    moveId('shell-worlds', panels.content);
    for (const id of [
      'shell-help',
      'shell-home-fpv',
      'shell-home-practice',
      'shell-demo',
      'demo-availability',
      'shell-workshop',
    ])
      moveId(id, panels.extras);
    move(settings.querySelector('.demo-settings'), panels.extras);
    move(doc.querySelector('.more-destinations a[href*="about.html"]'), panels.extras);
    copy($('shell-play'), 'missions');
    copy($('shell-workshop'), 'creatorTools');
    copy($('shell-workshop-title'), 'creatorTools');
    if ($('settings-offline')) $('settings-offline').hidden = true;
    for (const id of ['shell-title-edition', 'shell-destination'])
      if ($(id)) $(id).dataset.nativeQuiet = 'true';
    moveId('shell-now-playing', panels.audio);
    root.querySelector('.home-art-caption')?.setAttribute('data-native-quiet', 'true');
    if ($('shell-play-options')) $('shell-play-options').open = true;
  } else if (mode === 'versus') {
    actions = root.querySelector('.race-menu-actions');
    moveId('race-pad-status', panels.controls);
    moveId('race-menu-status', panels.controls);
    for (const id of ['race-optional-setup', 'race-format-note']) moveId(id, panels.gameplay);
    for (const id of ['race-offline', 'race-offline-status', 'race-library-switch'])
      moveId(id, panels.content);
    for (const id of ['race-help', 'race-more']) moveId(id, panels.extras);
    copy($('race-chapters'), 'missions');
    if ($('race-optional-setup')) $('race-optional-setup').open = true;
    moveId('race-journey-pictures', panels.data);
    moveId('race-music-menu-now-playing', panels.audio);
    const title = $('race-title');
    title?.removeAttribute('data-i18n-rich');
    if (title) root.insertBefore(title, root.firstChild);
  } else {
    actions = root.querySelector('.coop-launch-actions');
    for (const id of ['coop-optional-setup']) moveId(id, panels.gameplay);
    for (const id of ['coop-offline-main', 'coop-offline-status']) moveId(id, panels.content);
    moveId('coop-journey-pictures', panels.data);
    copy($('coop-discovery-open'), 'missions');
    if ($('coop-optional-setup')) $('coop-optional-setup').open = true;
    const title = $('coop-title');
    title?.removeAttribute('data-i18n-rich');
    if (title) {
      title.textContent = GAME_BRAND_NAME;
      title.parentNode.insertBefore(title, title.parentNode.firstChild);
    }
    moveId('coop-music-menu-now-playing', panels.audio);
    // placeTools() keeps pause ownership; its lobby branch uses these slots.
    const tools = $('coop-tools');
    for (const child of [...(tools?.children ?? [])]) {
      if (['coop-settings-open', 'coop-quick-sound'].includes(child.id)) continue;
      move(child, child.id === 'coop-offline' ? panels.content : panels.extras);
    }
  }
  const brandTitle = $(
    mode === 'solo' ? 'shell-title' : mode === 'versus' ? 'race-title' : 'coop-title',
  );
  const editionRequest =
    mode === 'solo' &&
    (doc.body?.dataset.editionId ||
      new URL(doc.defaultView?.location?.href || 'https://local.invalid/').searchParams.has(
        'edition',
      ) ||
      /\/editions\//.test(doc.defaultView?.location?.pathname || ''));
  let disposeBrandTitle = null,
    brandTitleDestroyed = false;
  const showBrandTitle = () => {
    if (editionRequest || brandTitleDestroyed || disposeBrandTitle || !brandTitle) return;
    disposeBrandTitle = mountLandingBrand(brandTitle);
  };
  const hideBrandTitle = () => {
    if (!disposeBrandTitle) return;
    disposeBrandTitle();
    disposeBrandTitle = null;
    // Retire the image and its fallback together before the host binds a status.
    // The running state can keep the same caption, so binding alone need not
    // replace children when the former brand text is already equal.
    brandTitle.textContent = GAME_BRAND_NAME;
  };
  showBrandTitle();
  listeners.push(() => {
    brandTitleDestroyed = true;
    hideBrandTitle();
  });
  const updates = attachGameUpdates({
    document: doc,
    window: doc.defaultView,
    container: panels.content,
  });
  listeners.push(() => updates.dispose());
  const communities = make('a', 'button secondary');
  communities.id = `${mode}-communities`;
  // A compiled company app contains only its own catalogue and has a narrow
  // manifest scope. The main app's community routes share its broad scope.
  const standaloneEdition = !!doc.documentElement?.dataset.editionId;
  communities.href = standaloneEdition
    ? 'https://mekhovov.github.io/revealline/game/communities/'
    : communityDirectoryURL(
        doc.defaultView?.location?.href || new URL('../index.html', import.meta.url),
        new URL('../community-routes.mjs', import.meta.url),
      ).href;
  localizedText(communities, () =>
    t(
      standaloneEdition
        ? 'interface:communityDirectory.onlineMenuLabel'
        : 'interface:communityDirectory.menuLabel',
    ),
  );
  setMenuIcon(communities, 'team');
  communities.hidden = new URL(
    doc.defaultView?.location?.href || 'https://local.invalid/',
  ).searchParams.has('course');
  panels.content.append(communities);
  if (actions) {
    actions.classList.add('native-menu-actions');
    actions.dataset.menuLayout = 'vertical';
    actions.dataset.menuEdgeExit = 'true';
    actions.dataset.menuScope = 'landing';
  }
  const utilities = make('div', 'native-menu-utilities');
  utilities.dataset.menuLayout = 'horizontal';
  utilities.dataset.menuEdgeExit = 'true';
  utilities.dataset.menuScope = 'landing';
  const landingFullscreen =
    mode === 'solo' ? $('shell-fullscreen') : make('button', 'native-menu-fullscreen');
  if (mode !== 'solo') {
    landingFullscreen.id = `${mode}-landing-fullscreen`;
    landingFullscreen.type = 'button';
    utilities.append(landingFullscreen);
  }
  if (actions) actions.parentNode.insertBefore(utilities, actions.nextSibling);
  else root.append(utilities);
  if (mode === 'solo') utilities.hidden = true;
  const settingsFullscreen = mode === 'solo' ? null : make('button');
  if (settingsFullscreen) {
    if (!settingsFullscreen.id) settingsFullscreen.id = `${prefix}-fullscreen`;
    settingsFullscreen.type = 'button';
    settingsFullscreen.removeAttribute('data-i18n-aria-label');
    if (mode !== 'solo') panels.display.append(settingsFullscreen);
  }
  for (const [button, parent] of [
    [landingFullscreen, utilities],
    [settingsFullscreen, panels.display],
  ]) {
    if (!button) continue;
    setMenuIcon(button, 'fullscreen');
    const feedback = make('p', 'native-fullscreen-status');
    feedback.id = `${button.id}-status`;
    feedback.setAttribute('role', 'status');
    feedback.hidden = true;
    const description = button.getAttribute('aria-describedby');
    button.setAttribute('aria-describedby', [description, feedback.id].filter(Boolean).join(' '));
    listeners.push(() => {
      if (description === null) button.removeAttribute('aria-describedby');
      else button.setAttribute('aria-describedby', description);
    });
    parent.append(feedback);
    listeners.push(
      attachFullscreen(button, doc, {
        allowInstallHelp: mode !== 'solo',
        escapeRoot: button === landingFullscreen ? root : null,
        onState: ({ label, message, hidden }) => {
          if (!button.hasAttribute('data-fullscreen-label')) button.textContent = label;
          feedback.textContent = message;
          feedback.hidden = !message;
          if (button === landingFullscreen && mode !== 'solo') utilities.hidden = hidden;
        },
      }),
    );
  }
  const icons =
    mode === 'solo'
      ? {
          'shell-featured': 'play',
          'shell-continue': 'play',
          'shell-play': 'missions',
          'shell-options': 'settings',
          'shell-sound': 'sound',
          'shell-gallery': 'collection',
          'shell-help': 'help',
          'shell-home-fpv': 'play',
          'shell-home-practice': 'controls',
          'shell-workshop': 'controls',
        }
      : mode === 'versus'
        ? {
            'race-start': 'play',
            'race-chapters': 'missions',
            'race-options': 'settings',
            'race-quick-sound': 'sound',
          }
        : {
            'coop-start': 'play',
            'coop-discovery-open': 'missions',
            'coop-settings-open': 'settings',
            'coop-quick-sound': 'sound',
          };
  for (const [id, icon] of Object.entries(icons)) setMenuIcon($(id), icon);
  const footer = make('footer', 'native-menu-footer');
  const song = make('span', 'native-menu-song');
  song.id = `${mode}-landing-song`;
  song.dataset.landingSong = mode;
  const version = mode === 'solo' && $('landing-version') ? $('landing-version') : make('span');
  if (!version.id) version.id = `${mode}-landing-version`;
  if (mode !== 'solo')
    version.textContent =
      doc.documentElement?.dataset.buildVersion?.replace('__REVEALLINE_VERSION__', 'DEV') || 'DEV';
  version.classList.add('native-menu-version');
  footer.append(song);
  move(version, footer);
  root.append(footer);
  const inputHints = () => {
    const hints = make('span', 'native-menu-input-hints');
    const keyboard = make('span', 'native-menu-input-keyboard');
    localizedText(
      keyboard,
      () => `Enter · ${t('common:controls.confirm')}   Esc · ${t('common:actions.back')}`,
    );
    const controller = make('span', 'native-menu-input-controller');
    controller.setAttribute('data-menu-controller-hint', '');
    hints.append(keyboard, controller);
    return hints;
  };
  footer.append(inputHints());
  settings.append(inputHints());
  const sound = $(
    mode === 'solo' ? 'shell-sound' : `${mode === 'versus' ? 'race' : 'coop'}-quick-sound`,
  );
  const refresh = () => {
    setMenuIcon(sound, sound?.getAttribute('aria-pressed') === 'true' ? 'sound' : 'mute');
  };
  const Observer = doc.defaultView?.MutationObserver ?? globalThis.MutationObserver;
  const observer = Observer && sound ? new Observer(refresh) : null;
  if (sound) observer?.observe(sound, { attributes: true, attributeFilter: ['aria-pressed'] });
  refresh();
  const scene = attachMenuScene({
    root,
    mode,
    getContext: () => ({
      themeId: doc.body?.dataset.editionId
        ? undefined
        : $('theme-select')?.value || doc.body?.dataset.menuTheme,
      editionId: doc.body?.dataset.editionId,
      reduced: doc.body?.dataset.reducedEffects === 'true',
      ...getSceneContext(),
    }),
  });
  const owner = {
    root,
    settings,
    panels,
    actions,
    refresh,
    showBrandTitle,
    hideBrandTitle,
    destroy() {
      retune.dispose();
      scene.dispose();
      observer?.disconnect();
      listeners.forEach((fn) => fn());
      for (const { node, parent, next } of moves.reverse()) {
        if (!parent) continue;
        if (next?.parentNode === parent) parent.insertBefore(node, next);
        else parent.append(node);
      }
      created.reverse().forEach((node) => node.remove());
      root.classList.remove('native-landing');
      settings.classList.remove('native-settings');
      owners.delete(root);
    },
  };
  const retune = attachMenuRetune({ root, getContext: getSceneContext });
  owners.set(root, owner);
  return owner;
}
