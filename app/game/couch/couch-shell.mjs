import { gameplayStatsLabel } from '../ui/gameplay-copy.mjs';
import { contentText } from '../i18n/content.mjs';
import { t, localizedText } from '../i18n/index.mjs';
import { mountModeChoices } from '../ui/mode-choice.mjs';
import { authoredModeDestinations } from '../ui/authored-mode-routes.mjs';
import { DEFAULT_JOURNEY_ROUTES } from '../content-design/default-entry.mjs';
import { arcadeActionCapabilities } from '../core/arcade-actions.mjs';
import { attachSettingsPanels } from '../ui/settings-panels.mjs';
import { prepareNativeMenus } from '../ui/native-menus.mjs';
import { commitMenuRetune } from '../ui/menu-retune.mjs';
import { authoredJourneyModeHref, isAuthoredJourneyRouteId } from '../content-design/mode-href.mjs';
import { isMissionLibrarySourceJourney } from '../mission-library/handoff.mjs';

const ABILITY = Object.freeze({
  get scan() {
    return t('interface:scan');
  },
  get shield() {
    return t('interface:shield');
  },
  get 'stun-field'() {
    return t('interface:stunField');
  },
  get 'slow-field'() {
    return t('interface:slowField');
  },
  get 'impact-pulse'() {
    return t('interface:impactPulse');
  },
});
const SCREENS = Object.freeze({
  main: ['race-main', 'race-start'],
  setup: ['race-setup', 'race-level'],
  options: ['race-options-panel', 'race-settings-tab-display'],
  help: ['race-help-panel', 'race-help-read'],
  confirm: ['race-confirm', 'race-confirm-back'],
  leave: ['race-leave-panel', 'race-leave-back'],
});
const DESTINATIONS = Object.freeze({ solo: '../', team: 'relay-rescue.html?return=versus' });
/** Display capabilities come from the actual authored level and equipped recipe. */
export function couchEquipment(run) {
  const actions = arcadeActionCapabilities(run.level),
    recipe = run.classRecipe;
  return Object.freeze({
    action: actions.manualAbility,
    pickup: actions.manualPickup && recipe.capacity > 0 && run.supplies.length > 0,
    boost: actions.manualBoost,
    get label() {
      return ABILITY[recipe.primitive] || t('interface:ability');
    },
    get description() {
      return actions.manualAbility
        ? contentText(recipe, 'description')
        : t('interface:directionsOnlyPickupsActivateOnContact');
    },
  });
}

/** Presentation only: never steps, resumes, resets or replaces a duel itself. */
export function createCouchShell({
  document: doc = globalThis.document,
  coarse = false,
  onTransition = () => {},
  onNewMatch = () => {},
  onRetry = () => {},
  getDepartureState = () => null,
  onLeaveRequest = () => {},
  getSoloReturnToken = () => null,
  authoredRoute = 'legacy',
  getSoloJourneyRoute = () => null,
  getTeamJourneyRoute = () => null,
  onMissions = null,
  controllerNeedsTouch = () => false,
  getSceneContext = () => ({}),
} = {}) {
  const nativeMenu = prepareNativeMenus({ document: doc, mode: 'versus', getSceneContext });
  const $ = (id) => doc.getElementById(id),
    view = doc.defaultView,
    pads = [...doc.querySelectorAll('.race-pad')],
    preferences = ['auto', 'auto'],
    modality = [coarse ? 'touch' : 'keyboard', coarse ? 'touch' : 'keyboard'],
    shown = [false, false],
    removers = [],
    settings = attachSettingsPanels({ root: $('race-options-panel'), document: doc });
  const authoredDestinations = authoredModeDestinations('versus', authoredRoute);
  const secondaryDestinations = Object.freeze({
    about: $('race-more-about').getAttribute('href'),
    releases: $('race-release-explorer').href || $('race-release-explorer').getAttribute('href'),
  });
  const isJourney = isAuthoredJourneyRouteId(authoredRoute);
  const libraryHref = isJourney ? '?journey=legacy' : `?journey=${DEFAULT_JOURNEY_ROUTES.versus}`;
  const libraryLabel = () => (isJourney ? t('interface:legacyLibrary') : t('interface:newJourney'));
  $('race-library-switch').setAttribute('href', libraryHref);
  localizedText($('race-library-switch'), () =>
    onMissions ? t('interface:allMissions') : libraryLabel(),
  );
  doc.body.classList.toggle('unified-missions', Boolean(onMissions));
  if (authoredDestinations) {
    $('race-solo-return').setAttribute('href', authoredDestinations.solo);
    $('race-coop').setAttribute('href', authoredDestinations.team);
  }
  mountModeChoices({
    root: $('race-mode-choices'),
    current: 'versus',
    separateTeam: isJourney,
    actions: { solo: $('race-solo-return'), team: $('race-coop') },
  });
  let screen = 'main',
    status = null,
    opener = null,
    departure = null,
    destroyed = false,
    revealingResize = false,
    equipment = [];
  const returnScreens = new Map();
  const setText = (id, text) => {
    localizedText($(id), text);
  };
  const listen = (element, type, fn) => {
    element.addEventListener(type, fn);
    removers.push(() => element.removeEventListener(type, fn));
  };
  function primary() {
    if (screen === 'options' && settings.primary()) return settings.primary();
    if (screen === 'main' && $('race-start').disabled) {
      const retry = $('race-chapter-retry');
      return retry && !retry.hidden && !retry.disabled ? retry : $('race-focus');
    }
    return screen === 'review' ? $('race-pause') : $(SCREENS[screen][1]);
  }
  function root() {
    return status === 'running' || screen === 'review' ? $('race-hud') : $(SCREENS[screen][0]);
  }
  function actionCurrent(element) {
    const owner = root(),
      previousScreen = screen,
      previousStatus = status;
    return () =>
      !destroyed &&
      foreground() &&
      screen === previousScreen &&
      status === previousStatus &&
      root() === owner &&
      element?.isConnected &&
      owner.contains(element) &&
      !element.disabled &&
      !element.closest('[hidden],[inert],[aria-hidden="true"]') &&
      element.getClientRects().length > 0 &&
      doc.defaultView?.getComputedStyle(element)?.visibility !== 'hidden';
  }
  function focus(element = primary()) {
    const eligible = actionCurrent(element);
    if (!eligible()) return;
    element.focus({ preventScroll: true });
    // The screen is installed first. Reveal its actual focused action without
    // letting a synchronous focus callback scroll a replacement/background view.
    if (eligible() && doc.activeElement === element) {
      // Keep the adjacent save-recovery shortcut in view with primary play.
      // This only changes a deliberate menu transition's scroll, never flight
      // geometry or focus in response to a background storage status change.
      const warning = $('race-journey-save-options');
      const block =
        screen === 'main' &&
        (status === 'paused' || status === 'finished') &&
        element === $('race-start') &&
        warning &&
        !warning.hidden
          ? 'center'
          : 'nearest';
      element.scrollIntoView({ block, inline: 'nearest', behavior: 'auto' });
    }
  }
  function revealResizedAction(event) {
    if (revealingResize || event.target !== view) return;
    revealingResize = true;
    try {
      // Resize owns no opener or future focus. Measure only this current action.
      const element = doc.activeElement,
        owner = root(),
        previousScreen = screen,
        previousStatus = status,
        current = actionCurrent(element),
        eligible = () => current() && doc.activeElement === element;
      if (!eligible()) return;
      const width = doc.documentElement.clientWidth || view.innerWidth,
        height = doc.documentElement.clientHeight || view.innerHeight,
        rect = element.getBoundingClientRect();
      if (
        ![
          width,
          height,
          rect.left,
          rect.top,
          rect.right,
          rect.bottom,
          rect.width,
          rect.height,
        ].every(Number.isFinite) ||
        width <= 0 ||
        height <= 0 ||
        rect.width <= 0 ||
        rect.height <= 0
      )
        return;
      if (
        (rect.left < 0 || rect.top < 0 || rect.right > width || rect.bottom > height) &&
        eligible() &&
        // DOM reads can synchronously retire this resize's current owner.
        foreground() &&
        !destroyed &&
        screen === previousScreen &&
        status === previousStatus &&
        root() === owner &&
        doc.activeElement === element
      )
        element.scrollIntoView({ block: 'nearest', inline: 'nearest', behavior: 'instant' });
    } finally {
      revealingResize = false;
    }
  }
  function renderScreens() {
    const running = status === 'running' || screen === 'review';
    $('race-shell').hidden = running;
    $('race-shell').inert = running;
    $('race-hud').hidden = !running;
    $('race-pause').disabled = !running;
    setText('race-pause', () =>
      screen === 'review' ? t('interface:results2') : t('common:actions.pause'),
    );
    $('race-boards').hidden = !running;
    $('race-boards').inert = !running;
    doc.body.classList.toggle('race-focus', running);
    doc.body.dataset.couchScreen = running ? 'flight' : screen;
    for (const [name, [id]] of Object.entries(SCREENS)) {
      $(id).hidden = running || name !== screen;
      $(id).inert = running || name !== screen;
    }
  }
  function renderPads() {
    for (let i = 0; i < 2; i++) {
      const wanted =
        preferences[i] === 'always' ||
        (preferences[i] === 'auto' &&
          (modality[i] === 'touch' || (coarse && controllerNeedsTouch(i))));
      // A held physical control may not vanish mid-round. Collapse at pause,
      // after the host has called its existing clearPhysical lifecycle guard.
      shown[i] = status === 'running' && (wanted || shown[i]);
      pads[i].hidden = !shown[i];
      pads[i].inert = !shown[i];
      pads[i].closest('.racer').dataset.touch = String(shown[i]);
      const device = () =>
        modality[i] === 'controller'
          ? t('interface:controller')
          : modality[i] === 'pointer'
            ? t('interface:onScreenControls')
            : modality[i] === 'touch'
              ? t('interface:touch')
              : i === 0
                ? t('interface:wASD')
                : t('interface:arrowKeys');
      setText(`race-seat-${i}`, () => device());
      setText(
        `racer-input-${i}`,
        () =>
          `${device()} · ${status === 'running' && shown[i] && !wanted ? t('interface:touchStaysVisibleUntilPause') : status === 'finished' ? t('interface:resultsForSettings') : t('interface:pauseForSettings')}`,
      );
      for (const button of pads[i].querySelectorAll('button')) {
        const kind = button.dataset.action;
        button.hidden = !!kind && !equipment[i]?.[kind];
        button.disabled = status !== 'running' || button.hidden;
        if (kind === 'action')
          localizedText(button, () => contentText(equipment[i], 'label') || t('interface:ability'));
      }
    }
  }
  function show(next, { restore = null, remember = false, restoreFocus = true } = {}) {
    if (destroyed || status === 'running' || (!Object.hasOwn(SCREENS, next) && next !== 'review'))
      return;
    if (remember) {
      opener = remember === true ? doc.activeElement : remember;
      returnScreens.set(next, { screen, opener });
    }
    const previous = screen;
    onTransition({ from: screen, to: next });
    screen = next;
    renderScreens();
    renderPads();
    if (restoreFocus) focus(restore || primary());
    if (
      status === 'ready' &&
      ((previous === 'main' && next === 'setup') || (previous === 'setup' && next === 'main'))
    )
      commitMenuRetune($(SCREENS[previous][0]), $(SCREENS[next][0]));
  }
  function back() {
    departure = null;
    const more = $('race-more');
    if (more.open && actionCurrent($('race-more-toggle'))()) {
      more.open = false;
      $('race-more-toggle').focus({ preventScroll: true });
      return;
    }
    if (screen === 'main') {
      onTransition({ from: screen, to: screen, back: true });
      return focus();
    }
    const previous = returnScreens.get(screen);
    returnScreens.delete(screen);
    const target = previous?.opener ?? opener;
    opener = null;
    const returnScreen = previous?.screen ?? 'main';
    show(returnScreen, { restore: target });
  }
  function setup() {
    show(status === 'ready' ? 'setup' : 'confirm', { remember: $('race-focus') });
  }
  function retry() {
    if (status !== 'paused') return;
    onRetry();
  }
  const foreground = () => !doc.hidden && doc.hasFocus?.() !== false;
  function soloReturnToken() {
    try {
      const token = getSoloReturnToken();
      return typeof token === 'string' && /^[0-9a-f]{32}$/.test(token) ? token : null;
    } catch {
      return null;
    }
  }
  function soloJourneyRoute() {
    try {
      const id = getSoloJourneyRoute();
      return id === 'legacy' || isAuthoredJourneyRouteId(id) ? id : null;
    } catch {
      return null;
    }
  }
  function teamJourneyRoute() {
    try {
      const id = getTeamJourneyRoute();
      return isMissionLibrarySourceJourney(id, 'team') ? id : null;
    } catch {
      return null;
    }
  }
  const destinationHref = (kind, token, routeId, teamRouteId = teamJourneyRoute()) =>
    (kind === 'library' && libraryHref) ||
    (kind === 'solo' && token && `../?mode-return-v2=${token}`) ||
    (kind === 'solo' && routeId === 'legacy' && '../?journey=legacy') ||
    (kind === 'solo' && authoredJourneyModeHref(routeId, 'solo')) ||
    (kind === 'team' && teamRouteId && `relay-rescue.html?journey=${teamRouteId}&return=versus`) ||
    secondaryDestinations[kind] ||
    (isJourney && authoredDestinations?.[kind]) ||
    authoredDestinations?.[kind] ||
    DESTINATIONS[kind];
  function departureCurrent(ticket) {
    const current = getDepartureState();
    return (
      !destroyed &&
      departure === ticket &&
      current?.match === ticket.match &&
      current.generation === ticket.generation &&
      soloJourneyRoute() === ticket.journeyRouteId &&
      teamJourneyRoute() === ticket.teamJourneyRouteId &&
      current.match.status === 'paused'
    );
  }
  function cancelDeparture({ restore = false } = {}) {
    if (!departure) return;
    const target = departure.opener;
    departure = null;
    opener = null;
    if (screen === 'leave') {
      const previous = returnScreens.get('leave');
      returnScreens.delete('leave');
      show(previous?.screen ?? 'main', { restore: target, restoreFocus: restore && foreground() });
    }
  }
  function requestLeave(kind, element, event) {
    if (
      event.defaultPrevented ||
      event.ctrlKey ||
      event.metaKey ||
      event.altKey ||
      event.shiftKey ||
      (event.button !== undefined && event.button !== 0)
    )
      return;
    if (kind === 'library' && onMissions) {
      event.preventDefault();
      if (['main', 'options'].includes(screen) && actionCurrent(element)())
        return onMissions(element);
      return;
    }
    // Fixed routes are owned here; no target is accepted from a URL or control.
    const returnToken = kind === 'solo' ? soloReturnToken() : null;
    const journeyRouteId = soloJourneyRoute();
    const teamJourneyRouteId = teamJourneyRoute();
    element.setAttribute(
      'href',
      destinationHref(kind, returnToken, journeyRouteId, teamJourneyRouteId),
    );
    const before = getDepartureState();
    if (
      destroyed ||
      departure ||
      !['main', 'options'].includes(screen) ||
      !actionCurrent(element)() ||
      !before?.match
    ) {
      event.preventDefault();
      return;
    }
    if (['ready', 'finished'].includes(before.match.status)) return;
    event.preventDefault();
    if (!['running', 'paused'].includes(before.match.status)) return;
    onLeaveRequest(); // The host owns pause and normal physical-input release.
    const current = getDepartureState();
    if (
      destroyed ||
      !foreground() ||
      current?.match !== before.match ||
      current.generation !== before.generation ||
      current.match.status !== 'paused'
    )
      return;
    const ticket = {
      kind,
      returnToken,
      journeyRouteId,
      teamJourneyRouteId,
      opener: element,
      match: current.match,
      generation: current.generation,
    };
    departure = ticket;
    setText('race-leave-title', () =>
      kind === 'library'
        ? t('interface:couch.openLibrary', { library: libraryLabel() })
        : kind === 'team'
          ? t('interface:goToCouchTeam')
          : kind === 'about'
            ? t('common:navigation.aboutCredits')
            : kind === 'releases'
              ? t('common:navigation.releases')
              : t('interface:returnToSolo4'),
    );
    setText('race-leave-copy', () =>
      isJourney && kind === 'team'
        ? t('interface:couch.leaveAttemptForTeam')
        : isJourney && kind === 'solo'
          ? t('interface:couch.leaveAttemptForSolo')
          : t('interface:couch.leaveAttempt'),
    );
    setText('race-leave', () =>
      kind === 'library'
        ? t('interface:couch.discardOpenLibrary', { library: libraryLabel() })
        : kind === 'team'
          ? t('interface:discardAndGoToTeam')
          : ['about', 'releases'].includes(kind)
            ? t('interface:discardAndLeave')
            : t('interface:discardAndReturnToSolo'),
    );
    $('race-leave').setAttribute(
      'href',
      destinationHref(kind, returnToken, journeyRouteId, teamJourneyRouteId),
    );
    show('leave', { remember: element });
    if (!departureCurrent(ticket)) cancelDeparture();
  }
  listen($('race-focus'), 'click', setup);
  listen($('race-retry'), 'click', retry);
  listen($('race-review'), 'click', () => {
    if (status === 'finished') show('review', { remember: $('race-review') });
  });
  listen($('race-options'), 'click', () => show('options', { remember: $('race-options') }));
  listen($('race-help'), 'click', () => show('help', { remember: $('race-help') }));
  for (const id of [
    'race-setup-back',
    'race-options-back',
    'race-help-back',
    'race-confirm-back',
    'race-leave-back',
  ])
    listen($(id), 'click', back);
  listen($('race-confirm-reset'), 'click', () => {
    if (status === 'running' || destroyed) return;
    onNewMatch();
    opener = $('race-focus');
    show('setup');
  });
  for (const [id, kind] of [
    ['race-solo-return', 'solo'],
    ['race-home', 'solo'],
    ['race-more-home', 'solo'],
    ['race-more-about', 'about'],
    ['race-release-explorer', 'releases'],
    ['race-coop', 'team'],
    ['race-library-switch', 'library'],
  ])
    listen($(id), 'click', (event) => requestLeave(kind, $(id), event));
  listen($('race-leave'), 'click', (event) => {
    const ticket = departure;
    if (!ticket || screen !== 'leave' || !foreground() || !departureCurrent(ticket)) {
      event.preventDefault();
      cancelDeparture();
      return;
    }
    $('race-leave').setAttribute(
      'href',
      destinationHref(
        ticket.kind,
        ticket.returnToken,
        ticket.journeyRouteId,
        ticket.teamJourneyRouteId,
      ),
    );
    // Preserve native anchor activation. If the browser cannot leave, the
    // original paused attempt stays intact and another decision remains explicit.
  });
  for (let i = 0; i < 2; i++)
    listen($(`race-touch-${i}`), 'change', () => {
      if (status === 'running' || destroyed) return;
      const value = $(`race-touch-${i}`).value;
      if (!['auto', 'always', 'off'].includes(value)) return;
      onTransition();
      preferences[i] = value;
      renderPads();
    });
  function observe(player, source) {
    if (
      destroyed ||
      ![0, 1].includes(player) ||
      !['touch', 'keyboard', 'controller', 'pointer'].includes(source)
    )
      return;
    modality[player] = source;
    renderPads();
  }
  listen(doc, 'pointerdown', (event) => {
    // Touching the canvas is an explicit request to reveal Auto controls. Pad
    // gestures themselves are reported only after the input adapter accepts them.
    if (
      status !== 'running' ||
      event.pointerType !== 'touch' ||
      (event.button !== undefined && event.button !== 0)
    )
      return;
    const arena = event.target?.closest('.race-arena');
    const seat = arena?.closest('.racer');
    if (seat) observe(Number(seat.dataset.player), 'touch');
  });
  function update({
    match,
    summary,
    won,
    format = 'single',
    contentBusy = false,
    focusTransition = true,
  }) {
    if (destroyed) return;
    // Authored native/modified links need the edition before activation. Legacy
    // return tokens remain read only by an explicit Solo departure request.
    const soloHref = destinationHref('solo', null, soloJourneyRoute());
    if ($('race-solo-return').getAttribute('href') !== soloHref)
      $('race-solo-return').setAttribute('href', soloHref);
    const previous = status;
    status = match.status;
    doc.body.dataset.couchStatus = status;
    if (departure && !departureCurrent(departure)) cancelDeparture();
    equipment = match.runs.map(couchEquipment);
    if (status !== previous) {
      if (status !== 'ready' || previous === null) screen = 'main';
      opener = null;
      renderScreens();
    }
    const series = format === 'first-to-two';
    setText('race-summary', summary);
    setText('race-format-note', () =>
      series ? t('interface:couch.seriesNote') : t('interface:couch.singleRaceNote'),
    );
    setText(
      'race-format-help',
      () =>
        `${series ? t('interface:couch.firstClearRound') : t('interface:couch.firstClearRace')} ${match.limitTicks === null ? t('interface:noRaceCountdownIfBothFlightsEndCoverageThenLives') : t('interface:atTheTimeLimitCoverageThenLivesThenScoreDecide')} ${series ? t('interface:firstToTwoRoundWinsTakesTheMatchDrawsAward') : t('interface:oneRaceEndsAfterThisResultRematchPlaysTheSame')}`,
    );
    if (status === 'ready' && !contentBusy && nativeMenu) nativeMenu.showBrandTitle();
    else {
      nativeMenu?.hideBrandTitle();
      setText('race-title', () =>
        contentBusy
          ? t('interface:loadingTheSharedPicture')
          : status === 'paused'
            ? t('interface:bothBoardsPaused')
            : status === 'finished'
              ? !series
                ? t('interface:raceComplete')
                : won.some((n) => n >= 2)
                  ? t('interface:matchComplete')
                  : t('interface:roundComplete')
              : 'FPV / LINE',
      );
    }
    $('race-review').hidden = status !== 'finished';
    const paused = status === 'paused';
    $('race-retry').hidden = !paused;
    $('race-retry').disabled = !paused || contentBusy;
    $('race-home').hidden = !paused;
    $('race-optional-setup').hidden = paused;
    setText('race-chapters', () => t('interface:nativeMenu.missions'));
    $('race-pause').disabled = status !== 'running' && screen !== 'review';
    // Do not replace the native click target's content on every flight frame.
    setText('race-pause', () =>
      screen === 'review' ? t('interface:results2') : t('common:actions.pause'),
    );
    localizedText($('race-focus'), () =>
      status === 'ready'
        ? t('interface:couch.advancedSetup')
        : t('interface:couch.newMatchOptions'),
    );
    $('race-class-field').hidden = !equipment[0].action;
    $('race-class').disabled = !equipment[0].action || status !== 'ready';
    for (const id of ['race-level', 'race-theme', 'race-turn', 'race-time', 'race-format'])
      $(id).disabled = status !== 'ready';
    $('race-tap-field').hidden = !equipment.some((e) => e.boost);
    $('race-tap').disabled = !equipment.some((e) => e.boost);
    setText('race-loadout', () => equipment[0].description);
    const controllerHelp = () => {
      const controller = [t('interface:dPadOrLeftStickMove')];
      if (equipment[0].action) controller.push(t('gameplay:south', { value1: equipment[0].label }));
      if (equipment[0].pickup) controller.push(t('interface:westSupply'));
      if (equipment[0].boost) controller.push(t('interface:couch.controllerBoost'));
      controller.push(t('interface:menuPause'));
      return t('gameplay:controllers', { value1: controller.join(' · ') });
    };
    setText('race-controller-help', () => controllerHelp());
    for (let i = 0; i < 2; i++) {
      const run = match.runs[i],
        e = equipment[i];
      const keyboardHelp = () => {
        const hints = [i === 0 ? t('interface:wASDMove') : t('interface:arrowKeysMove')];
        if (e.action) hints.push(`${i === 0 ? 'Q' : t('interface:enter')}: ${e.label}`);
        if (e.pickup) hints.push(t('gameplay:supply', { value1: i === 0 ? 'E' : '/' }));
        if (e.boost)
          hints.push(
            i === 0 ? t('interface:couch.leftShiftBoost') : t('interface:couch.rightShiftBoost'),
          );
        return `${hints.join(' · ')}.`;
      };
      setText(`race-help-${i}`, () => keyboardHelp());
      $(`race-result-${i}`).hidden = status !== 'finished';
      setText(`race-result-${i}`, () =>
        [
          gameplayStatsLabel(run),
          ...(series ? [t('gameplay:result.roundWins', { count: won[i] })] : []),
        ].join(' · '),
      );
    }
    renderPads();
    // Result rows and their copy precede the primary action in the layout.
    // Install them before the one transition-owned focus/reveal, never later.
    if (focusTransition && status !== previous && previous !== null && status !== 'running')
      focus();
  }
  renderScreens();
  if (view?.addEventListener) listen(view, 'resize', revealResizedAction);
  return {
    update,
    back,
    setup,
    observe,
    root,
    primary,
    focus,
    scope: () => screen,
    controllerHint: () => $('race-controller-help').textContent,
    cancelDeparture,
    destroy() {
      departure = null;
      destroyed = true;
      settings.destroy();
      nativeMenu?.destroy();
      for (const remove of removers) remove();
    },
  };
}
