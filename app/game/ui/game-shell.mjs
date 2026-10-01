
import { localizedText, t } from '../i18n/index.mjs';
import { attachModalNavigation } from './modal-navigation.mjs';
import { attachFieldKitSurfaces } from './field-kit-surfaces.mjs';
import { fieldKitCopy } from './field-kit-copy.mjs';
import { attachFocusClearance } from './focus-clearance.mjs';
import { prepareChapterFocus } from './chapter-focus-clearance.mjs';
import { mountModeChoices } from './mode-choice.mjs';
import { WORKSHOP_TOOLS } from './workshop-return.mjs';

import { guardInstallOfflineBlur } from './install-offline-panel.mjs';

import { commitMenuRetune } from './menu-retune.mjs';

/** Game navigation owns presentation only; the host owns pause, save and start. */
export function attachGameShell({
  document: doc = globalThis.document,
  pause,
  canContinue,
  initial = true,
  initialFocus = true,
  keyboardNavigation = true,
  training = false,
  practiceReturn = null,
  onFeatured,
  onTitleStart,
  onTitleContinue,
  onTitleCancel,
  onModeDeparture,
  separateTeam = false,
  titleDestination,
  titleContinueDestination,
  onWorlds,
  onMissions,
  getTopDialog,
  focusMissions,
  focusBriefing,
  focusGame = () => doc.getElementById('start-button')?.focus(),
} = {}) {
  // A registered embedded lesson already owns a token-checked return action.
  // Its shell must not expose campaign destinations inside the practice frame.
  const isolated = training || !!practiceReturn;
  const $ = (id) => doc.getElementById(id);
  const copy = (key, values) => fieldKitCopy(key, doc.documentElement?.lang || 'en', values);
  const home = $('shell-home'),
    missions = $('shell-missions'),
    workshop = $('shell-workshop-dialog');
  if (!home || !missions) return null;
  let destroyed = false,
    missionsVisit = null,
    missionsRevision = 0,
    homeVisit = 0,
    titleModeIntent = null;
  const modalNavigation = getTopDialog ? null : attachModalNavigation({ document: doc });
  const topDialog = getTopDialog ?? modalNavigation.topDialog;
  const surfaces = attachFieldKitSurfaces({ document: doc });
  const optionalPractice = null;
  const homeFPV = $('shell-home-fpv');
  const homePractice = $('shell-home-practice');
  const deck = doc.querySelector('.flight-deck');
  if (deck) $('shell-mission-content').append(deck);
  doc.body.classList.add('game-shell');
  const focusClearance = attachFocusClearance({
    document: doc,
    container: missions,
    heading: missions.querySelector('.shell-dialog-heading'),
    footer: $('shell-deploy-bar'),
    prepareTarget: (focused) =>
      prepareChapterFocus(focused, { container: missions, document: doc }),
  });
  // Keep the renderer's one live status in the same top layer as its selectors.
  // Moving the node changes neither its presenter nor the current load owner.
  let craftFeedbackMarker = null;
  const showCraftFeedback = () => {
    const status = $('craft-preparation-status'),
      slot = $('shell-craft-feedback');
    if (!status || !slot || craftFeedbackMarker) return;
    craftFeedbackMarker = doc.createElement('span');
    craftFeedbackMarker.hidden = true;
    status.after(craftFeedbackMarker);
    slot.append(status);
  };
  const restoreCraftFeedback = () => {
    if (!craftFeedbackMarker) return;
    craftFeedbackMarker.after($('craft-preparation-status'));
    craftFeedbackMarker.remove();
    craftFeedbackMarker = null;
  };
  const closeHome = () => {
    titleModeIntent = null;
    cancelTitle();
    homeVisit++;
    if (workshop?.open) workshop.close();
    if (home.open) home.close();
  };
  const syncPreparation = () => {
    const selected = $('missions')?.querySelector('.selected');
    const available = !!selected && !selected.disabled && !$('pack-select')?.disabled;
    const start = $('start-button');
    if ($('shell-deploy'))
      $('shell-deploy').disabled = !available || start.hidden || start.disabled;
    if ($('shell-prepared-mission'))
      localizedText(
        $('shell-prepared-mission'),
        () => selected?.querySelector('.name')?.textContent || copy('missions.chooseAvailable'),
      );
  };
  let briefing = null;
  const restoreMissionView = () => {
    if (!briefing) return;
    const { brief, unit, marker, open, title, context } = briefing;
    briefing = null;
    marker.after(unit);
    marker.remove();
    brief.open = open;
    $('shell-brief-content').hidden = true;
    $('shell-mission-content').hidden = false;
    $('shell-briefing').hidden = false;
    if ($('shell-deploy-bar')) $('shell-deploy-bar').hidden = false;
    if ($('shell-mode-choice')) $('shell-mode-choice').hidden = isolated;
    if ($('shell-worlds')) $('shell-worlds').hidden = isolated || !onWorlds;
    localizedText($('shell-missions-title'), () => title);
    if ($('shell-missions-context')) localizedText($('shell-missions-context'), () => context);
    delete missions.dataset.view;
  };
  const closedMissions = () => {
    // Native close events may arrive after a new showModal. Do not dismantle
    // the current reading view because a previous close was queued.
    if (!missions.open) {
      restoreMissionView();
      restoreCraftFeedback();
    }
  };
  missions.addEventListener('close', closedMissions);
  const retireMissionsVisit = () => {
    if (missionsVisit) {
      missionsVisit = null;
      missionsRevision++;
    }
  };
  const beginMissionsVisit = (opener = null) => {
    // Re-entering an open picker from Collection keeps the original parent.
    if (!missions.open) {
      missionsRevision++;
      missionsVisit = {
        home: home.open,
        opener,
        originFocus: doc.activeElement,
      };
    }
  };
  const availableReturn = (element, parent) => {
    if (
      !element?.isConnected ||
      element.disabled ||
      element.closest('[hidden],[inert],[aria-hidden="true"]') ||
      (parent ? !parent.contains(element) : element.closest('dialog'))
    )
      return false;
    for (let node = element; node && node !== doc; node = node.parentElement) {
      if (node.tagName === 'DIALOG' && !node.open) return false;
      if (
        node.tagName === 'DETAILS' &&
        !node.open &&
        !node.querySelector('summary')?.contains(element)
      )
        return false;
      const style = doc.defaultView?.getComputedStyle?.(node);
      if (style?.display === 'none' || style?.visibility === 'hidden') return false;
    }
    return typeof element.getClientRects !== 'function' || element.getClientRects().length > 0;
  };
  const openMissions = ({ opener = null } = {}) => {
    if (destroyed) return;
    const fromHome = home.open;
    if (practiceReturn) {
      if (!practiceReturn.disabled) openBrief(opener);
      return;
    }
    if (onMissions) {
      pause(true);
      if (destroyed) return;
      // The host chooser is a child of its actual entry screen. Keep Home
      // mounted for Back; an explicit mission selection retires that parent.
      titleModeIntent = null;
      cancelTitle();
      if (destroyed) return;
      return onMissions(opener);
    }
    beginMissionsVisit(opener);
    const visit = missionsVisit;
    pause(true);
    if (destroyed || missionsVisit !== visit) return;
    restoreMissionView();
    closeHome();
    if (destroyed || missionsVisit !== visit) return;
    showCraftFeedback();
    if (!missions.open) {
      missionsVisit.closeOrigin = doc.activeElement;
      missions.showModal();
    }
    syncPreparation();
    focusClearance.refresh();
    if (!focusMissions?.()) $('pack-select').focus();
    if (fromHome && visit.home && missions.open) commitMenuRetune(home, missions);
  };
  const primary = () => {
    const preferred = isolated
      ? $('shell-course-return')
      : canContinue()
        ? $('shell-continue')
        : $('shell-featured') || $('shell-play');
    return [
      preferred,
      $('shell-play'),
      ...home.querySelectorAll('button,a,select,input,summary'),
    ].find((element) => availableReturn(element, home));
  };
  const refreshHomeCopy = () => {
    const continued = !isolated && canContinue();
    $('shell-continue').hidden = !continued;
    if ($('shell-featured')) $('shell-featured').hidden = isolated || continued;
    if ($('shell-destination'))
      localizedText($('shell-destination'), () =>
        isolated
          ? copy('title.trainingDestination')
          : continued
            ? copy('title.continueDestination', {
                destination: !$('continue-saved').hidden
                  ? $('continue-saved').title
                  : titleContinueDestination?.() || $('mission-brief-title').textContent,
              })
            : titleDestination?.() || copy('title.deployDestination'),
      );
  };
  const openHome = ({ focus = true, returnGuard = null } = {}) => {
    if (destroyed) return;
    if (practiceReturn) {
      practiceReturn.click();
      return;
    }
    titleModeIntent = null;
    retireMissionsVisit();
    const revision = missionsRevision;
    pause(true);
    if (destroyed || missionsRevision !== revision || returnGuard?.() === false) return;
    if (missions.open) missions.close();
    if (destroyed || missionsRevision !== revision || returnGuard?.() === false) return;
    restoreMissionView();
    refreshHomeCopy();
    if (!home.open) {
      // A prior successful chapter selection is not the next title action.
      // Keep errors visible; fresh operation feedback still arrives normally.
      const status = $('shell-featured-status');
      if (status && status.dataset.kind !== 'error' && status.dataset.state !== 'busy')
        status.hidden = true;
      home.showModal();
    }
    if (focus) primary()?.focus();
  };
  const forward = (source, target, { keepHome = false } = {}) => {
    $(source).onclick = () => {
      // Child screens retain their actual entry screen and opener. Explicit
      // selection actions leave those parents when choosing a flight.
      if (!keepHome) closeHome();
      $(target).click();
    };
  };
  $('shell-menu').onclick = openHome;
  const openWorkshop = ({
    assetStudio = false,
    tool = assetStudio ? 'asset-studio' : null,
  } = {}) => {
    if (destroyed || isolated || !workshop) return false;
    const entry = tool ? WORKSHOP_TOOLS.find((item) => item.id === tool) : null;
    if (tool && (!entry || !$(entry.opener)?.isConnected)) return false;
    const previousFocus = doc.activeElement;
    const parent = topDialog();
    pause(true);
    // A pause callback or boot handoff may have established a newer screen.
    if (
      destroyed ||
      !parent?.open ||
      ![home, $('settings-dialog')].includes(parent) ||
      topDialog() !== parent ||
      doc.activeElement !== previousFocus ||
      doc.hidden ||
      doc.hasFocus?.() === false
    )
      return false;
    $('shell-workshop').focus();
    workshop.showModal();
    if (destroyed || !workshop.open || topDialog() !== workshop) return false;
    const entryOpener = entry ? $(entry.opener) : null;
    const entrySection = entryOpener?.closest('details');
    if (entrySection) entrySection.open = true;
    const target =
      entry && availableReturn(entryOpener, workshop)
        ? entryOpener
        : (workshop.querySelector('.more-destinations a, .more-destinations button') ??
          workshop.querySelector('button,a'));
    target?.focus();
    return true;
  };
  if ($('shell-workshop')) $('shell-workshop').onclick = () => openWorkshop();
  const cancelWorkshop = (event) => {
    if (destroyed || !workshop.open || topDialog() !== workshop) return;
    // Boot can open Home and Workshop in one native close-watcher group.
    // Consume Back here so a single Escape cannot also close its parent.
    event.preventDefault();
    workshop.close();
  };
  workshop?.addEventListener('cancel', cancelWorkshop);
  const backFromMissions = () => {
    if (destroyed || !missions.open) return;
    const reading = missions.dataset.view === 'brief';
    const visit = missionsVisit,
      previousFocus = doc.activeElement;
    retireMissionsVisit();
    const revision = missionsRevision;
    const canReturn = () =>
      !destroyed &&
      missionsRevision === revision &&
      !missions.open &&
      !topDialog() &&
      !doc.hidden &&
      doc.hasFocus?.() !== false &&
      (doc.activeElement === previousFocus ||
        doc.activeElement === doc.body ||
        doc.activeElement === visit?.opener ||
        doc.activeElement === visit?.originFocus ||
        doc.activeElement === visit?.closeOrigin ||
        !availableReturn(doc.activeElement, null));
    missions.close();
    // Close/pause callbacks may establish a newer dialog or deliberate focus.
    // Check before reopening Home so its native autofocus cannot cover them.
    if (!canReturn()) return;
    if (visit?.home) openHome({ focus: false, returnGuard: canReturn });
    const parent = visit?.home ? home : null;
    if (
      destroyed ||
      missionsRevision !== revision ||
      missions.open ||
      topDialog() !== parent ||
      doc.hidden ||
      doc.hasFocus?.() === false
    )
      return;
    const nativeHomeFocus = parent
      ? [...parent.querySelectorAll('button,a,select,input,summary')].find((node) =>
          availableReturn(node, parent),
        )
      : null;
    const primary = parent
      ? [isolated ? $('shell-course-return') : $('shell-continue'), $('shell-featured')].find(
          (node) => availableReturn(node, parent),
        )
      : ['show-result', 'skip-celebration', 'next-button', 'retry-button', 'start-button']
          .map($)
          .find((node) => availableReturn(node, null));
    // Native showModal autofocus is expected. A deliberate newer target wins.
    if (
      doc.activeElement !== previousFocus &&
      doc.activeElement !== doc.body &&
      doc.activeElement !== visit?.opener &&
      doc.activeElement !== nativeHomeFocus &&
      doc.activeElement !== primary &&
      availableReturn(doc.activeElement, parent)
    )
      return;
    // No explicit same-document opener exists for legacy/programmatic field entry.
    if (!parent && !visit?.opener) {
      focusGame();
      return;
    }
    const target = [visit?.opener, $(parent ? 'shell-play' : 'shell-packs'), primary].find((node) =>
      availableReturn(node, parent),
    );
    target?.focus({ preventScroll: true });
    if (!reading && visit?.home && !missions.open && home.open) commitMenuRetune(missions, home);
  };
  if ($('shell-missions-back')) $('shell-missions-back').onclick = backFromMissions;
  const cancelMissions = (event) => {
    // Both native Escape and controller Back use this cancellable boundary.
    // Intentional closes (Deploy / Back to flight) keep their own destinations.
    event.preventDefault();
    backFromMissions();
  };
  missions.addEventListener('cancel', cancelMissions);
  const overlayMenu = $('overlay-menu');
  if (overlayMenu) {
    overlayMenu.onclick = () => $('shell-menu').click();
    if (practiceReturn) overlayMenu.hidden = true;
  }
  if (practiceReturn) $('shell-menu').setAttribute('aria-label', practiceReturn.textContent);
  const worlds = $('shell-worlds');
  if (worlds) {
    worlds.hidden = isolated || !onWorlds;
    worlds.onclick = () => {
      pause(true);
      closeHome();
      if (missions.open) missions.close();
      onWorlds?.();
    };
  }
  const overlayBrief = $('overlay-brief');
  function openBrief(opener = overlayBrief) {
    if (destroyed || !overlayBrief) return;
    beginMissionsVisit(opener || overlayBrief);
    const visit = missionsVisit;
    pause(true);
    if (destroyed || missionsVisit !== visit) return;
    closeHome();
    if (destroyed || missionsVisit !== visit) return;
    const brief = $('mission-brief'),
      unit = $('mission-brief-unit'),
      slot = $('shell-brief-content');
    if (brief && unit && slot && !briefing) {
      const marker = doc.createElement('span');
      marker.hidden = true;
      briefing = {
        brief,
        unit,
        marker,
        open: brief.open,
        title: $('shell-missions-title').textContent,
        context: $('shell-missions-context')?.textContent,
      };
      unit.after(marker);
      slot.append(unit);
      slot.hidden = false;
      $('shell-mission-content').hidden = true;
      $('shell-briefing').hidden = true;
      if ($('shell-deploy-bar')) $('shell-deploy-bar').hidden = true;
      if ($('shell-mode-choice')) $('shell-mode-choice').hidden = true;
      if ($('shell-worlds')) $('shell-worlds').hidden = true;
      missions.dataset.view = 'brief';
      localizedText(
        $('shell-missions-title'),
        () => $('mission-brief-title').textContent || copy('missions.brief'),
      );
      if ($('shell-missions-context'))
        localizedText($('shell-missions-context'), () =>
          copy('missions.briefContext', {
            edition: $('shell-edition')?.textContent || copy('missions.currentFlight'),
          }),
        );
      missions.scrollTop = 0;
      $('mission-brief-reading').scrollTop = 0;
    }
    if (brief) brief.open = true;
    showCraftFeedback();
    if (!missions.open) {
      missionsVisit.closeOrigin = doc.activeElement;
      missions.showModal();
    }
    focusClearance.refresh();
    if (!focusBriefing?.()) $('mission-brief-read')?.focus({ preventScroll: true });
  }
  if (overlayBrief) overlayBrief.onclick = () => openBrief();
  const overlayMissions = $('overlay-missions');
  if (overlayMissions) overlayMissions.onclick = () => openMissions({ opener: overlayMissions });
  const overlaySettings = $('overlay-settings');
  if (overlaySettings) overlaySettings.onclick = () => $('settings-button').click();
  const pauseMissionInfo = $('pause-mission-info');
  const pauseMissionInfoToggle = $('pause-mission-info-toggle');
  if (pauseMissionInfo && pauseMissionInfoToggle)
    pauseMissionInfoToggle.onclick = (event) => {
      event.preventDefault();
      pauseMissionInfo.open = !pauseMissionInfo.open;
    };
  $('shell-packs').onclick = () => openMissions({ opener: $('shell-packs') });
  $('shell-play').onclick = () => openMissions({ opener: $('shell-play') });
  const featured = $('shell-featured');
  let titleAction = null;
  const liveLabel = (labelNode) => {
    const key = labelNode.getAttribute('data-field-kit-copy');
    return key ? () => copy(key) : () => labelNode.textContent;
  };
  const cancelTitle = () => {
    if (!titleAction) return;
    const { button, labelNode, label } = titleAction;
    titleAction = null;
    onTitleCancel?.();
    button.removeAttribute('aria-disabled');
    button.removeAttribute('aria-busy');
    delete button.dataset.busy;
    localizedText(labelNode, label);
  };
  const titleCancel = $('shell-flight-cancel');
  const cancelTitleAndRestore = (operation) => {
    if (!operation || titleAction !== operation) return;
    const visit = homeVisit;
    const ownedFocus =
      doc.activeElement === doc.body ||
      doc.activeElement === titleCancel ||
      doc.activeElement === operation.button;
    cancelTitle();
    // Hiding Cancel can synchronously move focus or open another screen. Check
    // ownership again after that callback; keep an already-returned primary.
    if (
      ownedFocus &&
      !destroyed &&
      !titleAction &&
      homeVisit === visit &&
      topDialog() === home &&
      !doc.hidden &&
      doc.hasFocus?.() !== false &&
      (doc.activeElement === doc.body ||
        doc.activeElement === titleCancel ||
        doc.activeElement === operation.button)
    )
      operation.button.focus({ preventScroll: true });
  };
  if (titleCancel) titleCancel.onclick = () => cancelTitleAndRestore(titleAction);
  const launchTitle = async (button, callback) => {
    // The activating control remains the stable owner while preparation runs.
    // Keeping it focusable prevents a held keyboard/controller Confirm from
    // falling through to the newly-visible cancellation action.
    if (button.disabled || titleAction || destroyed || topDialog() !== home) return;
    const visit = homeVisit;
    const labelNode = button.querySelector('[data-field-kit-copy]') ?? button;
    const operation = { button, labelNode, label: liveLabel(labelNode) };
    titleAction = operation;
    button.setAttribute('aria-disabled', 'true');
    button.setAttribute('aria-busy', 'true');
    button.dataset.busy = 'true';
    localizedText(labelNode, () => copy('title.preparing'));
    try {
      const pending = callback({
        isCurrent: () =>
          !destroyed &&
          titleAction === operation &&
          homeVisit === visit &&
          topDialog() === home &&
          !doc.hidden &&
          doc.hasFocus?.() !== false,
        leave: closeHome,
      });
      await pending;
    } finally {
      cancelTitleAndRestore(operation);
    }
  };
  const leaveFeatured = (event) => {
    titleModeIntent = null;
    const target = event.target?.closest?.('button,a,summary');
    if (target !== titleAction?.button && target !== titleCancel) cancelTitle();
    if (target !== featured) homeVisit++;
  };
  home.addEventListener('click', leaveFeatured, true);
  const titleModes = $('shell-title-modes');
  if (titleModes) {
    mountModeChoices({
      root: titleModes,
      current: 'solo',
      separateTeam,
      actions: { versus: $('shell-title-versus'), team: $('shell-title-team') },
    });
    titleModes.hidden = isolated || !onModeDeparture;
    for (const kind of ['versus', 'team']) {
      const opener = $(`shell-title-${kind}`);
      opener.onclick = (event) => {
        if (
          event.defaultPrevented ||
          event.ctrlKey ||
          event.metaKey ||
          event.altKey ||
          event.shiftKey ||
          (event.button !== undefined && event.button !== 0)
        )
          return;
        if (destroyed || isolated || !onModeDeparture || topDialog() !== home) {
          event.preventDefault();
          return;
        }
        // Native click capture has already retired any previous Title action.
        // Keep this explicit too for callers invoking the owned handler directly.
        cancelTitle();
        const intent = { visit: homeVisit };
        titleModeIntent = intent;
        return onModeDeparture(kind, event, opener, {
          origin: 'solo-title',
          isCurrent: () => {
            const top = topDialog();
            return (
              !destroyed &&
              titleModeIntent === intent &&
              homeVisit === intent.visit &&
              home.open &&
              !doc.hidden &&
              doc.hasFocus?.() !== false &&
              (top === home || top === $('mode-leave-dialog'))
            );
          },
        });
      };
    }
  }
  if (featured && onFeatured)
    featured.onclick = async () => {
      if (featured.disabled || destroyed) return;
      const visit = homeVisit;
      const labelNode = featured.querySelector('[data-field-kit-copy]') ?? featured;
      const label = liveLabel(labelNode);
      pause(true);
      featured.disabled = true;
      localizedText(labelNode, () => copy('title.preparing'));
      try {
        if ((await onFeatured()) && !destroyed && homeVisit === visit && topDialog() === home) {
          openMissions();
        }
      } finally {
        if (!destroyed) {
          featured.disabled = false;
          localizedText(labelNode, label);
        }
      }
    };
  if (featured && onTitleStart) featured.onclick = () => launchTitle(featured, onTitleStart);
  $('shell-briefing').onclick = () => {
    retireMissionsVisit();
    missions.close();
    focusGame();
  };
  if ($('shell-prepare'))
    $('shell-prepare').onclick = () => {
      const setup = $('mission-picker-setup');
      if (!setup) return;
      setup.open = true;
      setup.scrollIntoView({ block: 'start', behavior: 'instant' });
      (setup.querySelector('select:not(:disabled)') || setup.querySelector('summary'))?.focus({
        preventScroll: true,
      });
    };
  if ($('shell-deploy'))
    $('shell-deploy').onclick = () => {
      syncPreparation();
      if ($('shell-deploy').disabled) return;
      retireMissionsVisit();
      missions.close();
      $('start-button').click();
      focusGame();
    };
  const Observer = doc.defaultView?.MutationObserver ?? globalThis.MutationObserver;
  const preparationObserver = typeof Observer === 'function' ? new Observer(syncPreparation) : null;
  for (const source of [$('missions'), $('pack-select'), $('start-button')])
    if (source) preparationObserver?.observe(source, { childList: true, attributes: true });
  $('shell-continue').onclick = () => {
    closeHome();
    // Loading is explicit and verified by the existing host. An in-memory
    // paused flight returns to its briefing; choosing Resume remains deliberate.
    if (!$('continue-saved').hidden) $('continue-saved').click();
    else focusGame();
  };
  if (onTitleContinue)
    $('shell-continue').onclick = () => launchTitle($('shell-continue'), onTitleContinue);
  forward('shell-collection', 'collection-button', { keepHome: true });
  forward('shell-gallery', 'collection-button', { keepHome: true });
  forward('shell-settings', 'settings-button', { keepHome: true });
  forward('shell-library', 'library-button', { keepHome: true });
  forward('shell-options', 'settings-button', { keepHome: true });
  // Toggle music without leaving the title; browser activation remains local.
  $('shell-music').onclick = () => $('sound-button').click();
  forward('shell-help', 'help-button', { keepHome: true });
  // Keep Workshop beneath its Guide so native modal return restores the visible opener.
  const courseReturn = $('shell-course-return');
  if (courseReturn) {
    courseReturn.hidden = !isolated;
    courseReturn.onclick = () => {
      closeHome();
      focusGame();
    };
  }
  if (isolated) {
    // Course sessions keep their usable sound/help shortcuts in the lesson menu.
    home.querySelector('.home-actions')?.append($('shell-music'), $('shell-help'));
    // These destinations cannot operate on the course's isolated, non-awarding
    // session. Show only usable settings and the explicit lesson return.
    for (const id of [
      'shell-featured',
      'shell-play',
      'shell-library',
      'shell-gallery',
      'shell-guide',
      'shell-workshop',
      'shell-catalogue',
      'shell-release-explorer',
    ])
      $(id).hidden = true;
    for (const element of doc.querySelectorAll('.home-actions a, .shell-tools'))
      element.hidden = true;
  }
  const cancelHome = (event) => {
    titleModeIntent = null;
    if (titleAction) {
      // Back during preparation cancels that operation and keeps its opener.
      // Closing the title too would strand focus on the underlying ready field.
      event.preventDefault();
      cancelTitleAndRestore(titleAction);
      return;
    }
    cancelTitle();
    homeVisit++;
    queueMicrotask(() => {
      if (!destroyed && !home.open && !topDialog()) focusGame();
    });
  };
  home.addEventListener('cancel', cancelHome);
  const suspendedTitle = () => {
    titleModeIntent = null;
    cancelTitle();
  };
  const hiddenTitle = () => {
    if (doc.hidden) suspendedTitle();
  };
  const titleClosed = () => {
    if (!home.open) suspendedTitle();
  };
  const titleWindow =
    typeof doc.defaultView?.addEventListener === 'function' ? doc.defaultView : globalThis.window;
  const titleWindowBlur = guardInstallOfflineBlur(suspendedTitle, doc);
  titleWindow?.addEventListener('blur', titleWindowBlur);
  titleWindow?.addEventListener('pagehide', suspendedTitle);
  doc.addEventListener('visibilitychange', hiddenTitle);
  home.addEventListener('close', titleClosed);
  // Native controls retain their arrow editing semantics. Arrows on game menu
  // actions move focus; Enter/Space and Tab remain browser-standard activation.
  const keydown = (event) => {
    if (event.defaultPrevented || event.ctrlKey || event.metaKey || event.altKey) return;
    if (event.key === 'Escape' && workshop?.open && topDialog() === workshop) {
      // A boot-opened dialog may have a non-cancellable native close watcher.
      // Claim the key before that default action reaches the parent group.
      cancelWorkshop(event);
      return;
    }
    if (
      !keyboardNavigation ||
      !['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(event.key)
    )
      return;
    const dialog = topDialog();
    if (!dialog || !event.target?.closest?.('button,a')) return;
    const controls = [...dialog.querySelectorAll('button,a,select,input,summary')].filter(
      (element) =>
        !element.disabled &&
        !element.hidden &&
        !element.closest('[hidden]') &&
        (typeof element.getClientRects !== 'function' || element.getClientRects().length > 0),
    );
    if (!controls.length) return;
    const index = controls.indexOf(doc.activeElement);
    const delta = ['ArrowUp', 'ArrowLeft'].includes(event.key) ? -1 : 1;
    controls[(index + delta + controls.length) % controls.length].focus();
    event.preventDefault();
  };
  doc.addEventListener('keydown', keydown);
  if (initial) openHome({ focus: initialFocus });
  return {
    primary,
    openHome,
    openMissions,
    openWorkshop,
    refreshHome() {
      if (!destroyed) refreshHomeCopy();
    },
    refreshLocale() {
      if (!destroyed && home.open) refreshHomeCopy();
    },
    destroy() {
      destroyed = true;
      retireMissionsVisit();
      titleModeIntent = null;
      cancelTitle();
      for (const kind of ['versus', 'team']) {
        const opener = $(`shell-title-${kind}`);
        if (opener) opener.onclick = null;
      }
      titleWindow?.removeEventListener('blur', titleWindowBlur);
      titleWindow?.removeEventListener('pagehide', suspendedTitle);
      doc.removeEventListener('visibilitychange', hiddenTitle);
      home.removeEventListener('close', titleClosed);
      restoreMissionView();
      restoreCraftFeedback();
      focusClearance.destroy();
      missions.removeEventListener('close', closedMissions);
      missions.removeEventListener('cancel', cancelMissions);
      if (overlayMenu) overlayMenu.onclick = null;
      if (overlayBrief) overlayBrief.onclick = null;
      home.removeEventListener('cancel', cancelHome);
      workshop?.removeEventListener('cancel', cancelWorkshop);
      home.removeEventListener('click', leaveFeatured, true);
      doc.removeEventListener('keydown', keydown);
      modalNavigation?.destroy();
      surfaces.destroy();
      optionalPractice?.dispose();
      if (homeFPV) {
        homeFPV.onclick = null;
        homeFPV.hidden = true;
      }
      if (homePractice) {
        homePractice.onclick = null;
        homePractice.hidden = true;
      }
      preparationObserver?.disconnect();
    },
  };
}
