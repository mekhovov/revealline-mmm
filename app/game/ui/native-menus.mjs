import { t, localizedText, localizedAttribute, getLocale, onLocaleChange } from '../i18n/index.mjs';
import { setMenuIcon } from './native-menu-icons.mjs';
import { attachMenuScene, getMenuAnimation, setMenuAnimation } from './menu-scenes.mjs';
import { attachMenuAnimationFeedback } from './menu-animation-feedback.mjs';
import { attachFullscreen } from './fullscreen.mjs';
import { mountLandingBrand, GAME_BRAND_NAME } from './brand-identity.mjs';
import { attachMenuRetune } from './menu-retune.mjs';
import { communityDirectoryURL } from '../community-routes.mjs';
import { attachGameUpdates } from './game-updates.mjs';
import { mountModeGuides } from './mode-choice.mjs';
import { MODE_SETTINGS_CATEGORIES as NATIVE_MENU_CATEGORIES } from './mode-settings-view.mjs';
import { mountGlobalSettings } from './global-settings-view.mjs';
import { wireLandingMenuNavigation } from './mode-play-shell.mjs';
import { mountComfortPresets } from './comfort-presets.mjs';

export { NATIVE_MENU_CATEGORIES };
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
    panel.dataset.menuEdgeExit = 'true';
    panels[id] = panel;
  }
  const guides = mountModeGuides({ container: panels.extras, pause: () => {} });
  listeners.push(() => guides.dispose());
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
  const animationFeedback = attachMenuAnimationFeedback(animation, doc.defaultView);
  listeners.push(() => animationFeedback.destroy());
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
    moveId('race-journey-save', panels.data);
    move(root.querySelector('.enemy-stats'), panels.data);
    moveId('race-presentation-status', panels.content);
    moveId('race-music-menu-now-playing', panels.audio);
    const title = $('race-title');
    title?.removeAttribute('data-i18n-rich');
    if (title) root.insertBefore(title, root.firstChild);
  } else {
    actions = root.querySelector('.coop-launch-actions');
    for (const id of ['coop-optional-setup']) moveId(id, panels.gameplay);
    for (const id of ['coop-offline-main', 'coop-offline-status']) moveId(id, panels.content);
    moveId('coop-journey-pictures', panels.data);
    moveId('coop-hunt-save', panels.data);
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
  const landingSound = $(
    mode === 'solo' ? 'shell-sound' : mode === 'versus' ? 'race-quick-sound' : 'coop-quick-sound',
  );
  move(landingSound, utilities);
  if (landingFullscreen) {
    move(landingFullscreen, utilities);
    utilities.append(landingFullscreen);
    landingFullscreen.classList.add('native-menu-fullscreen');
    landingFullscreen.setAttribute('data-fullscreen-label', '');
    landingFullscreen.removeAttribute('data-i18n');
  }
  // Give every host the same real boxes. In particular, avoid display:contents
  // inside a painted dialog: WebKit can drop its descendants from compositing.
  const layout = make('div', 'landing-layout');
  const identity = make('div', 'landing-identity');
  const commands = make('div', 'landing-commands');
  layout.append(identity, commands);
  root.prepend(layout);
  move(brandTitle, identity);
  moveId(
    mode === 'solo'
      ? 'shell-title-modes'
      : mode === 'versus'
        ? 'race-mode-choices'
        : 'coop-lobby-modes',
    identity,
  );
  if (mode === 'versus') moveId('race-summary', commands);
  if (mode === 'team') moveId('coop-navigation-context', commands);
  move(actions, commands);
  move(utilities, commands);
  if (mode === 'versus') moveId('race-preparation', commands);
  for (const id of mode === 'solo'
    ? ['shell-featured-status', 'shell-flight-status', 'shell-flight-cancel']
    : mode === 'team'
      ? ['coop-selection-status', 'coop-boot-slot']
      : [])
    moveId(id, commands);
  const settingsFullscreen = make('button');
  if (settingsFullscreen) {
    if (!settingsFullscreen.id) settingsFullscreen.id = `${prefix}-fullscreen`;
    settingsFullscreen.type = 'button';
    settingsFullscreen.removeAttribute('data-i18n-aria-label');
    panels.display.append(settingsFullscreen);
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
        allowInstallHelp: true,
        escapeRoot: button === landingFullscreen ? root : null,
        onState: ({ label, message }) => {
          if (!button.hasAttribute('data-fullscreen-label')) button.textContent = label;
          feedback.textContent = message;
          feedback.hidden = !message;
          // The utility row still owns Sound when fullscreen is unavailable.
        },
      }),
    );
  }
  const landingSteps =
    mode === 'solo'
      ? [
          [$('shell-course-return'), $('shell-featured'), $('shell-continue')],
          $('shell-play'),
          $('shell-options'),
          landingSound,
          landingFullscreen,
        ]
      : mode === 'versus'
        ? [
            [$('race-start'), $('race-retry')],
            // Finished rounds keep their recording actions in the same
            // vertical controller path. Hidden actions are skipped at Ready.
            $('race-export-recording'),
            $('race-verify-recording'),
            $('race-chapters'),
            $('race-options'),
            landingSound,
            landingFullscreen,
          ]
        : [
            $('coop-start'),
            $('coop-discovery-open'),
            $('coop-settings-open'),
            landingSound,
            landingFullscreen,
          ];
  let landingNavigation = null;
  const refreshLandingNavigation = () => {
    landingNavigation?.dispose();
    const modesRoot = doc
      .querySelector(`[data-menu-scope="modes"] [data-game-mode="${mode}"][aria-current="page"]`)
      ?.closest('[data-menu-scope="modes"]');
    landingNavigation = wireLandingMenuNavigation({
      modesRoot,
      scopeRoot: root,
      steps: landingSteps,
      links:
        mode === 'versus'
          ? [
              {
                nodes: [$('race-start'), $('race-retry')],
                direction: 'right',
                targets: [$('race-journey-next'), $('race-picture-cancel')],
              },
              {
                nodes: [$('race-journey-next'), $('race-picture-cancel')],
                direction: 'left',
                targets: [$('race-start'), $('race-retry')],
              },
            ]
          : [],
    });
    return landingNavigation;
  };
  const modeChoicesReady = () => refreshLandingNavigation();
  doc.addEventListener('game-mode-choices-ready', modeChoicesReady);
  refreshLandingNavigation();
  listeners.push(() => {
    doc.removeEventListener('game-mode-choices-ready', modeChoicesReady);
    landingNavigation?.dispose();
  });
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
  let globalSettings = null;
  const extraGlobalControls = {};
  let comfortPresets;
  // Providers mount at different points in the host lifecycle. Adopt their real
  // rows after they are ready; subsequent calls register late tools in place.
  const refreshGlobalSettings = ({ controls = {}, comfort } = {}) => {
    Object.assign(extraGlobalControls, controls);
    const row = (id) => {
      const node = $(id);
      if (!node || !settings.contains(node)) return null;
      const wrapper = node.closest('label');
      return wrapper ?? [settings.querySelector(`label[for="${id}"]`), node].filter(Boolean);
    };
    const node = (id) => {
      const element = $(id);
      return element && settings.contains(element) ? element : null;
    };
    const touchRows =
      mode === 'solo'
        ? [
            ...['touch-mode', 'touch-side', 'touch-size', 'touch-opacity'].flatMap(
              (id) => row(id) ?? [],
            ),
            node('screen-steering-status'),
            node('screen-steering-help'),
          ].filter(Boolean)
        : settings.querySelector('[data-touch-setting]')?.closest('fieldset');
    const adopted = {
      language: [...settings.querySelectorAll('[data-language-control]')].find(
        (element) => !element.hidden,
      ),
      appearance: settings.querySelector('.theme-family-controls'),
      textFace: row(`${fieldPrefix}text-face`),
      textSize: row(`${fieldPrefix}text-size`),
      reducedEffects: row(mode === 'solo' ? 'settings-reduced-effects' : `${fieldPrefix}reduced`),
      menuAnimation: animationFeedback.element,
      masterMuted: node(mode === 'solo' ? 'settings-master-mute' : `${fieldPrefix}audio`),
      masterVolume: row(`${fieldPrefix}master-volume`),
      audioCues: [
        ...settings.querySelectorAll(
          '[data-menu-audio], [data-radio-audio], [data-movement-audio], [data-gameplay-audio]',
        ),
      ],
      touchPresentation: touchRows,
      musicLibrary:
        mode === 'solo'
          ? [node('soundtrack-open'), node('soundtrack-summary')].filter(Boolean)
          : node(`${fieldPrefix}music-library`),
      offlineTools: [
        node(
          mode === 'solo'
            ? 'shell-offline'
            : mode === 'team'
              ? 'coop-offline-main'
              : 'race-offline',
        ),
        node(mode === 'solo' ? 'shell-offline-status' : `${fieldPrefix}offline-status`),
      ].filter(Boolean),
      updates: node('game-check-updates')?.parentElement,
    };
    if (mode === 'solo') {
      Object.assign(adopted, {
        controllerTools: node('shell-controller-lab'),
        profileRecovery: [
          node('profile-recovery-open'),
          node('profile-recovery-entry-status'),
        ].filter(Boolean),
        storageRetention: node('storage-retention-button')?.closest('section'),
        creatorTools: node('shell-workshop'),
        about: panels.extras.querySelector('a[href*="about.html"]'),
      });
    }
    Object.assign(adopted, extraGlobalControls);
    // Music/effects mix faders retain their host/session owner below the shared
    // group. Only master sound and the existing library preference are global.
    globalSettings = mountGlobalSettings({
      document: doc,
      root: settings,
      panels,
      prefix,
      locale: getLocale(),
      controls: adopted,
      duplicates: {
        masterMuted: [mode === 'solo' ? node('shell-music') : null],
        offlineTools: [mode === 'team' ? node('coop-offline') : node('settings-offline')],
      },
    });
    if (comfort && !comfortPresets)
      comfortPresets = mountComfortPresets({
        document: doc,
        window: doc.defaultView,
        root: panels.accessibility,
        ...comfort,
      });
    return globalSettings;
  };
  listeners.push(onLocaleChange(() => globalSettings?.refresh(getLocale())));
  if (mode === 'team') {
    const duplicate = $('coop-more-catalogue'),
      canonical = $('coop-catalogue');
    if (
      duplicate &&
      canonical &&
      duplicate.getAttribute('href') === canonical.getAttribute('href')
    ) {
      const wasHidden = duplicate.hidden;
      duplicate.hidden = true;
      listeners.push(() => {
        duplicate.hidden = wasHidden;
      });
    }
  }
  const owner = {
    get qualityObservationOwner() {
      return scene.qualityObservationOwner;
    },
    setQuality: (tier) => scene.setQuality(tier),
    root,
    settings,
    panels,
    actions,
    refresh,
    refreshLandingNavigation,
    refreshGlobalSettings,
    showBrandTitle,
    hideBrandTitle,
    destroy() {
      comfortPresets?.destroy();
      globalSettings?.destroy();
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
