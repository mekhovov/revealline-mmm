// Presentation only. Hosts own simulation, prepared attempts, sound and navigation.
// Services are injected so optional modes can project this exact source without
// adding another copy of the game runtime or a second controller/audio owner.
const COPY = {
  en: {
    home: 'Main menu',
    missions: 'Select Mission',
    missionsGroup: 'Missions',
    homeAction: 'Home',
    briefing: 'Mission briefing',
    settings: 'Settings',
    expert: 'Expert options',
    help: 'How to play',
    workshop: 'Workshop',
    results: 'Results',
    start: 'Start',
    continue: 'Continue',
    retry: 'Retry',
    review: 'Review mission',
    back: 'Back',
    menu: 'Menu',
    pause: 'Pause',
    restart: 'Restart',
    skip: 'Skip',
    random: 'Random',
    choose: 'Choose',
    audio: 'Sound',
    config: 'Settings',
    nextSong: 'Next song',
    resume: 'Resume',
    fullscreen: 'Full screen',
    sound: 'Sound',
    on: 'on',
    off: 'off',
    modes: 'Choose game mode',
  },
  uk: {
    home: 'Головне меню',
    missions: 'Вибрати місію',
    missionsGroup: 'Місії',
    homeAction: 'Головне меню',
    briefing: 'Перед польотом',
    settings: 'Налаштування',
    expert: 'Розширені налаштування',
    help: 'Як грати',
    workshop: 'Майстерня',
    results: 'Результати',
    start: 'Почати',
    continue: 'Продовжити',
    retry: 'Повторити',
    review: 'Переглянути місію',
    back: 'Назад',
    menu: 'Меню',
    pause: 'Пауза',
    restart: 'Заново',
    skip: 'Далі',
    random: 'Навмання',
    choose: 'Обрати',
    audio: 'Звук',
    config: 'Налаштування',
    nextSong: 'Наступна пісня',
    resume: 'Продовжити',
    fullscreen: 'На весь екран',
    sound: 'Звук',
    on: 'увімкнено',
    off: 'вимкнено',
    modes: 'Вибрати режим гри',
  },
};
const SURFACES = [
  'home',
  'pause',
  'missions',
  'briefing',
  'settings',
  'expert',
  'help',
  'workshop',
  'results',
];

/** Give every landing page one deterministic vertical cycle. A step may contain
 * several mutually exclusive controls (for example Start and Continue); the
 * controller navigator selects the first currently visible target. */
export function wireLandingMenuNavigation({
  modesRoot = null,
  current = null,
  steps = [],
  links = [],
  scopeRoot = modesRoot?.closest?.('[id]') ?? null,
} = {}) {
  const groups = steps
    .map((step) => (Array.isArray(step) ? step : [step]).filter((node) => node?.id))
    .filter((group) => group.length);
  const originals = new Map();
  const set = (nodes, direction, targets) => {
    nodes = nodes.filter((node) => node?.id);
    targets = targets.filter((node) => node?.id);
    const value = targets
      .map((node) => node?.id)
      .filter(Boolean)
      .join(' ');
    for (const node of nodes) {
      if (!originals.has(node))
        originals.set(node, {
          ...Object.fromEntries(
            ['up', 'right', 'down', 'left'].map((name) => [
              name,
              node.getAttribute(`data-menu-${name}`),
            ]),
          ),
          scope: node.getAttribute('data-menu-navigation-scope'),
        });
      if (scopeRoot?.id) node.setAttribute('data-menu-navigation-scope', scopeRoot.id);
      if (value) node.setAttribute(`data-menu-${direction}`, value);
      else node.removeAttribute(`data-menu-${direction}`);
    }
  };
  const refresh = () => {
    const modes = [...(modesRoot?.querySelectorAll('[data-game-mode]') ?? [])].filter(
      (node) => node.id && !node.hidden,
    );
    const more = modesRoot?.querySelector('[data-mode-more]');
    const selected =
      (current && !current.hidden ? current : null) ??
      modes.find((node) => node.getAttribute('aria-current') === 'page') ??
      more ??
      null;
    if (groups.length) {
      set([...modes, more].filter(Boolean), 'down', groups.flat());
      set([...modes, more].filter(Boolean), 'up', groups.toReversed().flat());
      groups.forEach((group, index) => {
        set(group, 'up', [
          ...groups.slice(0, index).toReversed().flat(),
          ...(selected ? [selected] : []),
        ]);
        set(group, 'down', [...groups.slice(index + 1).flat(), ...(selected ? [selected] : [])]);
      });
      for (const { nodes, direction, targets } of links)
        if (['up', 'right', 'down', 'left'].includes(direction))
          set(
            Array.isArray(nodes) ? nodes : [nodes],
            direction,
            Array.isArray(targets) ? targets : [targets],
          );
    }
    if (more?.getAttribute('aria-expanded') === 'true') {
      const extras = modes.filter((node) =>
        ['snake', 'overflight', 'simulator'].includes(node.dataset.gameMode),
      );
      // Less sits below the extra row: Up returns there; Down enters the main actions.
      set([more], 'up', [
        ...extras.filter((node) => node === selected),
        ...extras,
        ...groups.toReversed().flat(),
      ]);
    }
  };
  refresh();
  modesRoot?.addEventListener('game-mode-visibility-changed', refresh);
  modesRoot?.addEventListener('game-mode-choices-ready', refresh);

  return {
    dispose() {
      modesRoot?.removeEventListener('game-mode-visibility-changed', refresh);
      modesRoot?.removeEventListener('game-mode-choices-ready', refresh);
      for (const [node, values] of originals)
        for (const [direction, value] of Object.entries(values).filter(
          ([direction]) => direction !== 'scope',
        )) {
          if (value === null) node.removeAttribute(`data-menu-${direction}`);
          else node.setAttribute(`data-menu-${direction}`, value);
        }
      for (const [node, values] of originals) {
        if (values.scope === null) node.removeAttribute('data-menu-navigation-scope');
        else node.setAttribute('data-menu-navigation-scope', values.scope);
      }
      originals.clear();
    },
  };
}

/** Move live slots, preserving IDs/listeners. No close path starts or resumes play.
 * actions.open(surface) may return false to delegate to an existing host dialog.
 * start/resume/continue/retry run through activate(), after closing owned dialogs.
 * Hosts may activate an already-authorized continuous-play transition; ordinary
 * menu close/back/focus paths never start gameplay. Hosts update accepted phase.
 */
export function mountModePlayShell({
  document: doc = globalThis.document,
  mount = doc.body,
  idPrefix = 'mode',
  modeName = '',
  locale = doc.documentElement.lang,
  slots = {},
  actions = {},
  services = {},
  homeLabels = {},
  homeAction = null,
  wordmarkURL = '',
  artworkURL = '',
  version = '',
  initial = 'home',
  focusPlay = () => {},
  onSurfaceChange = () => {},
} = {}) {
  let language = locale === 'uk' ? 'uk' : 'en',
    alive = true,
    closing = false,
    opening = 0;
  let state = { phase: 'ready', missionName: '', summary: '', muted: false };
  const moved = [],
    cleanups = [],
    stack = [],
    dialogs = {},
    content = {},
    buttons = {};
  const labels = [];
  const text = (value) => {
    if (typeof value === 'function') return text(value(language));
    return typeof value === 'object' ? (value?.[language] ?? value?.en ?? '') : (value ?? '');
  };
  const el = (tag, className = '') => {
    const node = doc.createElement(tag);
    node.className = className;
    return node;
  };
  const listen = (node, type, fn) => {
    node.addEventListener(type, fn);
    cleanups.push(() => node.removeEventListener(type, fn));
  };
  const label = (node, key) => {
    labels.push([node, key]);
    return node;
  };
  const button = (key, handler, primary = false, name = key) => {
    const node = label(el('button', `button ${primary ? 'primary' : 'secondary'}`), key);
    node.type = 'button';
    node.id = `${idPrefix}-action-${name}`;
    node.dataset.modeAction = name;
    services.setMenuIcon?.(
      node,
      {
        review: 'missions',
        start: 'play',
        continue: 'play',
        retry: 'restart',
        resume: 'play',
        choose: 'missions',
        nextSong: 'next',
        home: 'home',
        homeAction: 'home',
        results: 'collection',
        menu: 'back',
        pause: 'pause',
        expert: 'settings',
        workshop: 'content',
      }[key] ?? key,
    );
    listen(node, 'click', handler);
    buttons[name] = node;
    return node;
  };
  const move = (name, target) => {
    const value = slots[name];
    for (const node of value ? (Array.isArray(value) ? value : [value]) : []) {
      moved.push({ node, parent: node.parentNode, next: node.nextSibling });
      target.append(node);
    }
  };
  const root = el('section', 'mode-play-shell');
  root.dataset.modePlayShell = idPrefix;
  const hadPage = doc.body.classList.contains('mode-play-page');
  doc.body.classList.add('mode-play-page');
  const header = el('header', 'mode-play-bar');
  header.append(button('menu', () => open('home')));
  const modeLabel = el('span', 'mode-play-name');
  let pausePress = null;
  header.append(
    modeLabel,
    button('pause', (event) => {
      // Pointer focus can make the host pause before click. Honour the action
      // that was visible at press, never turn that same Pause press into Resume.
      const phase = event.detail > 0 && pausePress ? pausePress.phase : state.phase;
      pausePress = null;
      if (state.phase === 'results' && state.transitionActive) {
        actions.pause?.();
        open('results');
        return;
      }
      if (state.pauseOpensMenu && ['playing', 'paused', 'disarmed'].includes(state.phase)) {
        open('pause');
        return;
      }
      if (!['playing', 'paused'].includes(state.phase)) return;
      if (phase === 'playing') open('pause');
      else if (phase === 'paused' && state.phase === 'paused') activate('resume');
    }),
  );
  listen(buttons.pause, 'pointerdown', (event) => {
    if ((event.button ?? 0) !== 0 || event.isPrimary === false) return;
    pausePress = { phase: state.phase, pointerId: event.pointerId };
  });
  listen(buttons.pause, 'pointercancel', (event) => {
    if (pausePress?.pointerId === event.pointerId) pausePress = null;
  });
  if (wordmarkURL) {
    const logo = el('img');
    logo.src = wordmarkURL;
    logo.alt = '';
    buttons.menu.replaceChildren(logo);
    buttons.menu.classList.add('mode-play-brand-button');
  }
  const stage = el('div', 'mode-play-stage');
  move('play', stage);
  root.append(header, stage);
  mount.append(root);
  for (const name of SURFACES) {
    const dialog = el('dialog', `mode-play-dialog${name === 'home' ? ' mode-play-home' : ''}`);
    dialog.id = `${idPrefix}-${name}-dialog`;
    dialog.dataset.modeSurface = name;
    const heading = label(el('h1'), name);
    heading.id = `${idPrefix}-${name}-title`;
    heading.tabIndex = -1;
    dialog.setAttribute('aria-labelledby', heading.id);
    const head = el('header', 'mode-play-dialog-head');
    head.append(heading);
    const body = el('div', 'mode-play-content');
    const footer = el('footer', 'mode-play-actions');
    dialogs[name] = dialog;
    content[name] = body;
    dialog.append(head, body, footer);
    root.append(dialog);
    if (name !== 'home') {
      move(name, body);
      footer.append(button('back', back, false, `${name}-back`));
    }
    listen(dialog, 'cancel', (event) => {
      if (event.defaultPrevented) return;
      event.preventDefault();
      back();
    });
    listen(dialog, 'close', () => {
      if (dialog.open || closing || !alive) return;
      removeFromStack(dialog);
      onSurfaceChange(topDialog()?.dataset.modeSurface ?? 'play');
    });
  }
  if (services.attachMenuScene) {
    const scene = services.attachMenuScene({ root: dialogs.home, mode: 'solo' });
    cleanups.push(() => scene.dispose());
  } else if (artworkURL) {
    const scene = el('div', 'mode-play-artwork');
    scene.setAttribute('aria-hidden', 'true');
    const image = el('img');
    image.src = artworkURL;
    image.alt = '';
    scene.append(image);
    dialogs.home.prepend(scene);
  }
  const home = content.home;
  const title = dialogs.home.querySelector('h1');
  title.className = 'mode-play-wordmark';
  // The host supplies the same accepted wordmark used by the main title.
  labels.splice(
    labels.findIndex(([node]) => node === title),
    1,
  );
  title.textContent = 'FPV / LINE';
  if (slots.brand) {
    title.textContent = '';
    move('brand', title);
  } else if (wordmarkURL) {
    const logo = el('img');
    logo.src = wordmarkURL;
    logo.alt = 'FPV / LINE';
    title.replaceChildren(logo);
  }
  const edition = el('p', 'mode-play-edition');
  edition.id = `${idPrefix}-navigation-context`;
  const modes = el('nav', 'mode-play-modes');
  move('modes', modes);
  const mission = el('p', 'mode-play-mission');
  const menu = el('nav', 'mode-play-main-menu native-menu-actions');
  menu.dataset.menuScope = 'main';
  menu.append(
    button(
      'start',
      () =>
        state.phase === 'results'
          ? activate('retry')
          : resumable()
            ? activate(state.phase === 'paused' ? 'resume' : 'continue')
            : activate('start'),
      true,
      'primary',
    ),
    button('results', () => open('results'), false, 'home-results'),
    button('missions', () => open('missions')),
    button('settings', () => open('settings')),
  );
  let extraHomeAction = null;
  if (homeAction?.activate && homeAction?.label) {
    extraHomeAction = button('help', () => homeAction.activate(), false, 'home-extra');
    buttons.missions.before(extraHomeAction);
  }
  const utilities = el('div', 'mode-play-utilities native-menu-utilities');
  utilities.setAttribute('role', 'group');
  utilities.append(
    button('sound', () => actions.toggleSound?.()),
    button('fullscreen', () => actions.fullscreen?.()),
  );
  const homeChoices = el('div', 'mode-play-home-choices');
  move('homeChoices', homeChoices);
  homeChoices.hidden = !slots.homeChoices;
  const choices = [...homeChoices.querySelectorAll('[data-home-choice]')];
  const selectedChoices = [
    ...choices.filter((node) => node.hasAttribute('aria-current')),
    ...choices.filter((node) => !node.hasAttribute('aria-current')),
  ];
  const layout = el('div', 'landing-layout');
  const identity = el('div', 'landing-identity');
  const commands = el('div', 'landing-commands');
  identity.append(dialogs.home.querySelector('.mode-play-dialog-head'), edition, modes);
  commands.append(homeChoices, mission, menu, utilities);
  layout.append(identity, commands);
  home.append(layout);
  const landingNavigation = wireLandingMenuNavigation({
    modesRoot: modes,
    scopeRoot: dialogs.home,
    steps: [
      selectedChoices,
      buttons.primary,
      buttons['home-results'],
      extraHomeAction,
      buttons.missions,
      buttons.settings,
      buttons.sound,
      buttons.fullscreen,
    ].filter(Boolean),
  });
  cleanups.push(() => landingNavigation.dispose());
  const pauseMenu = content.pause;
  pauseMenu.classList.add('shared-pause-menu');
  const resumeNotice = el('p', 'pause-resume-notice');
  resumeNotice.id = `${idPrefix}-resume-notice`;
  resumeNotice.setAttribute('role', 'status');
  resumeNotice.hidden = true;
  const resume = button('resume', () => activate('resume'), true, 'pause-resume');
  resume.classList.add('pause-command-primary');
  pauseMenu.append(resumeNotice, resume);
  const pauseGroup = (name, key, controls) => {
    const section = el('section', 'pause-command-section');
    section.dataset.pauseGroup = name;
    section.append(label(el('h3'), key));
    const grid = el('div', 'pause-command-grid');
    grid.append(...controls);
    section.append(grid);
    section.hidden = !controls.length;
    pauseMenu.append(section);
  };
  pauseGroup('missions', 'missionsGroup', [
    ...(actions.retry ? [button('restart', () => activate('retry'), false, 'pause-restart')] : []),
    ...(actions.skip ? [button('skip', () => activate('skip'), false, 'pause-skip')] : []),
    ...(actions.random ? [button('random', () => activate('random'), false, 'pause-random')] : []),
    button('choose', () => open('missions'), false, 'pause-choose'),
  ]);
  pauseGroup('audio', 'audio', [
    ...(actions.toggleSound
      ? [button('sound', () => actions.toggleSound?.(), false, 'pause-sound')]
      : []),
    ...(actions.nextSong
      ? [button('nextSong', () => actions.nextSong(), false, 'pause-next-song')]
      : []),
  ]);
  pauseGroup('config', 'config', [
    button('settings', () => open('settings'), false, 'pause-settings'),
    button('fullscreen', () => actions.fullscreen?.(), false, 'pause-fullscreen'),
  ]);
  const homeButton = button('homeAction', () => open('home'), false, 'pause-home');
  homeButton.classList.add('pause-command-home');
  pauseMenu.append(homeButton);
  dialogs.pause.querySelector('footer').hidden = true;
  if (version) {
    const build = el('p', 'mode-play-version');
    build.textContent = version;
    dialogs.home.querySelector('footer').append(build);
  }
  const briefingSummary = el('p', 'mode-play-summary');
  content.briefing.prepend(briefingSummary);
  dialogs.missions
    .querySelector('footer')
    .append(button('start', () => activate('start'), true, 'mission-start'));
  if (slots.expert || actions.open)
    dialogs.missions
      .querySelector('footer')
      .append(button('expert', () => open('expert'), false, 'missions-expert'));
  dialogs.briefing
    .querySelector('footer')
    .append(button('start', () => activate(state.phase === 'paused' ? 'resume' : 'start'), true));
  if (slots.help || actions.open)
    dialogs.briefing
      .querySelector('footer')
      .append(button('help', () => open('help'), false, 'briefing-help'));
  dialogs.results.querySelector('footer').append(button('retry', () => activate('retry'), true));
  for (const name of ['expert', 'help', 'workshop']) {
    if (slots[name] || actions.open) content.settings.append(button(name, () => open(name)));
  }
  buttons['settings-back'].dataset.settingsBack = '';
  const retryHome = button('retry', () => activate('retry'), false, 'home-retry');
  content.settings.append(retryHome);
  const navigation = services.attachModalNavigation?.({
    document: doc,
    getFallbackFocus: () => buttons.menu,
  });
  if (navigation) cleanups.push(() => navigation.destroy());
  for (const [name, escapeRoot] of [
    ['fullscreen', dialogs.home],
    ['pause-fullscreen', dialogs.pause],
  ]) {
    const control = buttons[name];
    if (services.attachFullscreen) {
      control.setAttribute('data-fullscreen-label', '');
      cleanups.push(services.attachFullscreen(control, doc, { escapeRoot }));
    } else
      control.hidden =
        !actions.fullscreen ||
        !doc.fullscreenEnabled ||
        typeof doc.documentElement?.requestFullscreen !== 'function';
  }
  buttons.sound.hidden = !actions.toggleSound;
  function resumable() {
    return state.canResume ?? !!actions.canResume?.();
  }
  function removeFromStack(dialog) {
    const index = stack.indexOf(dialog);
    if (index >= 0) stack.splice(index, 1);
  }
  function topDialog() {
    return navigation?.topDialog() ?? [...stack].reverse().find((dialog) => dialog.open) ?? null;
  }
  const put = (node, key, value) => {
    if (node[key] !== value) node[key] = value;
  };
  const attribute = (node, key, value) => {
    if (node.getAttribute(key) !== value) node.setAttribute(key, value);
  };
  function update(patch = {}) {
    if (!alive) return;
    state = { ...state, ...patch };
    put(root.dataset, 'phase', state.phase);
    const briefingTitle = dialogs.briefing.querySelector('h1');
    // HUD refreshes run during pointer activation. Unchanged text must keep its
    // native Text node; writing a default then a dynamic label also replaces it.
    for (const [node, key] of labels) {
      if ((key === 'fullscreen' && services.attachFullscreen) || (key === 'menu' && wordmarkURL))
        continue;
      let value = COPY[language][key];
      if (node === buttons.primary)
        value =
          COPY[language][state.phase === 'results' ? 'retry' : resumable() ? 'continue' : 'start'];
      if (node === buttons.primary && state.phase !== 'results' && !resumable())
        value = text(homeLabels.start) || value;
      else if (node === buttons.missions) value = text(homeLabels.missions) || value;
      else if (node === extraHomeAction) value = text(homeAction.label);
      else if (node === buttons.start)
        value = COPY[language][state.phase === 'paused' ? 'resume' : 'start'];
      else if (node === buttons.pause)
        value =
          COPY[language][
            state.pauseOpensMenu && state.phase !== 'playing'
              ? 'menu'
              : state.phase === 'paused'
                ? 'resume'
                : 'pause'
          ];
      else if (node === buttons.sound || node === buttons['pause-sound'])
        value = `${COPY[language].sound}: ${COPY[language][state.muted ? 'off' : 'on']}`;
      else if (node === briefingTitle) value = text(state.missionName) || value;
      put(node, 'textContent', value);
    }
    attribute(buttons.menu, 'aria-label', COPY[language].menu);
    put(modeLabel, 'textContent', text(modeName));
    put(edition, 'textContent', text(state.navigationContext));
    put(edition, 'hidden', !edition.textContent);
    if (edition.hidden) modes.removeAttribute('aria-describedby');
    else attribute(modes, 'aria-describedby', edition.id);
    attribute(modes, 'aria-label', COPY[language].modes);
    attribute(menu, 'aria-label', COPY[language].home);
    attribute(utilities, 'aria-label', COPY[language].settings);
    put(mission, 'textContent', text(state.missionName));
    put(mission, 'hidden', !mission.textContent);
    put(briefingSummary, 'textContent', text(state.summary) || text(state.missionName));
    put(briefingSummary, 'hidden', !briefingSummary.textContent);
    // Home's canResume also describes saved progress, so it may be false for a
    // valid tick-zero pause. Blocking an open attempt is an explicit capability.
    put(resume, 'disabled', state.pauseResumeDisabled === true);
    put(
      resumeNotice,
      'textContent',
      state.pauseResumeDisabled === true ? text(state.resumeUnavailableReason) : '',
    );
    put(resumeNotice, 'hidden', !resumeNotice.textContent);
    if (resumeNotice.hidden) resume.removeAttribute('aria-describedby');
    else attribute(resume, 'aria-describedby', resumeNotice.id);
    put(
      buttons.pause,
      'disabled',
      !['playing', 'paused'].includes(state.phase) &&
        !(state.pauseOpensMenu && state.phase === 'disarmed') &&
        !(state.phase === 'results' && state.transitionActive),
    );
    attribute(buttons.sound, 'aria-pressed', String(!state.muted));
    if (buttons['pause-sound'])
      attribute(buttons['pause-sound'], 'aria-pressed', String(!state.muted));
    put(retryHome, 'hidden', state.phase !== 'paused');
    put(buttons['home-results'], 'hidden', state.phase !== 'results');
  }
  function enterPlay() {
    if (!alive) return;
    opening++;
    closing = true;
    for (const dialog of [...stack].reverse()) if (dialog.open) dialog.close();
    stack.length = 0;
    closing = false;
    onSurfaceChange('play');
    // Closing a menu is presentation only; explicit Resume remains required.
    focusPlay();
  }
  function activate(action) {
    if (state.pauseResumeDisabled === true && ['resume', 'continue'].includes(action)) return false;
    if (typeof actions[action] !== 'function' && !(action === 'continue' && actions.resume))
      return false;
    enterPlay();
    if (!alive) return;
    return (actions[action] ?? (action === 'continue' ? actions.resume : null))?.();
  }
  function initialFocus(name, dialog) {
    if (name === 'home') return buttons.primary;
    if (name === 'pause') {
      if (!resume.disabled) return resume;
      const usable = (node) => {
        if (
          !node ||
          node.disabled ||
          !dialog.contains(node) ||
          node.closest('[hidden],[inert],[aria-hidden="true"]')
        )
          return false;
        for (
          let ancestor = node;
          ancestor && ancestor !== dialog;
          ancestor = ancestor.parentElement
        ) {
          const style = doc.defaultView?.getComputedStyle?.(ancestor);
          if (style?.display === 'none' || style?.visibility === 'hidden') return false;
        }
        return true;
      };
      return (
        [actions.pauseFocus?.(), buttons['pause-restart'], buttons['pause-choose']].find(usable) ??
        dialog.querySelector('h1')
      );
    }
    if (name === 'results') {
      const preferred = actions.resultFocus?.();
      const usable = (node) =>
        node && !node.disabled && !node.closest('[hidden],[inert],[aria-hidden="true"]');
      if (usable(preferred)) return preferred;
      const primary = [...content.results.querySelectorAll('button.primary')].find(usable);
      return primary ?? buttons.retry;
    }
    return dialog.querySelector('h1');
  }
  function open(name = 'home') {
    if (!alive) return false;

    const request = ++opening;
    if (name === 'play') {
      enterPlay();
      return true;
    }
    const dialog = dialogs[name];
    if (!dialog) throw new Error(`Unknown play surface: ${name}`);
    if (state.phase === 'playing') {
      update({ phase: 'paused' });
      actions.pause?.();
      if (!alive || request !== opening) return false;
    } else update();
    if (actions.open?.(name) === false || !alive || request !== opening) return false;
    if (name === 'home') {
      closing = true;
      for (const prior of [...stack].reverse()) if (prior !== dialog && prior.open) prior.close();
      stack.length = 0;
      if (dialog.open) stack.push(dialog);
      closing = false;
    }
    if (dialog.open) {
      if (name === 'home') onSurfaceChange(name);
      initialFocus(name, dialog).focus({
        preventScroll: true,
      });
      return true;
    }
    dialog.showModal();
    removeFromStack(dialog);
    stack.push(dialog);
    onSurfaceChange(name);
    initialFocus(name, dialog).focus({ preventScroll: true });
    return true;
  }
  function back() {
    const dialog = topDialog();
    if (!dialog || !Object.values(dialogs).includes(dialog)) return false;
    if (dialog === dialogs.home && modes.contains(doc.activeElement)) {
      const more = modes.querySelector('[data-mode-more][aria-expanded="true"]');
      if (more) {
        more.click();
        return true;
      }
    }
    if (services.settingsPanelBack?.(dialog)) return true;
    if (dialog === dialogs.home || dialog === dialogs.pause) {
      if (state.phase === 'results') return open('results');
      if (!resumable()) return false;
      enterPlay();
      return true;
    }
    dialog.close();
    removeFromStack(dialog);
    if (!topDialog()) open(dialog === dialogs.briefing ? 'missions' : 'home');
    return true;
  }
  const elements = {
    root,
    header,
    stage,
    home: dialogs.home,
    title,
    dialogs,
    content,
    buttons,
    modes,
    utilities,
  };
  function setLocale(next) {
    language = next === 'uk' ? 'uk' : 'en';
    update();
  }
  update();
  // Reveal before focusing: hidden boot content cannot receive native focus.
  delete doc.documentElement.dataset.modeShellPending;
  if (initial !== 'play') open(initial);
  return {
    open,
    openHome: () => open('home'),
    enterPlay,
    activate,
    back,
    update,
    topDialog,
    elements,
    setLocale,
    localize: setLocale,
    blocksPlay: () => !!topDialog(),
    dispose() {
      if (!alive) return;
      alive = false;
      closing = true;
      for (const dialog of Object.values(dialogs)) if (dialog.open) dialog.close();
      for (const cleanup of cleanups.reverse()) cleanup?.();
      for (const { node, parent, next } of moved.reverse()) {
        if (parent) parent.insertBefore(node, next?.parentNode === parent ? next : null);
        else node.remove();
      }
      root.remove();
      if (!hadPage) doc.body.classList.remove('mode-play-page');
    },
  };
}
