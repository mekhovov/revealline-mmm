import { attachMissionLibraryGoal } from './mission-library-goal.mjs';
import { createJourneyArtworkView } from './journey-artwork.mjs';
import {
  t,
  localizedText,
  localizedMessage,
  localizedAttribute,
  formatNumber,
  render as renderMessage,
} from '../i18n/index.mjs';
import {
  LIBRARY_COLLECTIONS,
  LIBRARY_MODES,
  LIBRARY_LIFECYCLES,
} from '../mission-library/library.mjs';
import { paintMissionThumbnail } from '../content-design/mission-card.mjs';
import { trackMissionLibraryOpening } from '../mission-library/opening-intent.mjs';
import {
  applyLevelCardPresentation,
  createLevelCardView,
  levelCardPresentation,
} from './level-card.mjs';
import { commitMenuRetune, menuRetuneOrigin } from './menu-retune.mjs';

const LIBRARY_TAG_KEYS = Object.freeze({
  Journey: 'common:collections.journey',
  Classic: 'common:collections.classic',
  Custom: 'common:collections.custom',
  Remix: 'interface:missionLibrary.tag.Remix',
  Ukrainian: 'interface:missionLibrary.tag.Ukrainian',
  FPV: 'interface:missionLibrary.tag.FPV',
  Arcade: 'interface:missionLibrary.tag.Arcade',
  Tactical: 'interface:missionLibrary.tag.Tactical',
  Practice: 'interface:missionLibrary.tag.Practice',
});

const modeLabel = (mode) =>
  ({ solo: t('interface:solo2'), versus: t('interface:versus2'), team: t('interface:team') })[mode];
const sizeLabel = (bytes) =>
  bytes < 1024 * 1024
    ? `${formatNumber(Math.ceil(bytes / 1024))} KiB`
    : `${formatNumber(bytes / (1024 * 1024), { minimumFractionDigits: 1, maximumFractionDigits: 1 })} MiB`;

/** Same flat mission surface across hosts. Owner adapters, not this UI, validate
 * launches, prepare pictures, award progress and decide the next mission. */
export function attachMissionLibraryChooser({
  document: doc = globalThis.document,
  library,
  mode = 'solo',
  onPause,
  onReturn,
  readState = () => null,
  writeState = () => {},
  launchContext = () => ({}),
  getCurrentId = () => null,
  supportedModes = LIBRARY_MODES,
  availableCollectionsOnly = false,
  goalPreferenceOptions = {},
  description = localizedMessage('interface:allMissionsOneLibraryJourneyClassicAndCustomKeepTheir'),
}) {
  if (
    !Array.isArray(supportedModes) ||
    !supportedModes.includes(mode) ||
    supportedModes.some((value) => !LIBRARY_MODES.includes(value))
  )
    throw new TypeError(t('interface:unknownMissionLibraryMode'));
  const modes = [...new Set(supportedModes)];
  const collections = () =>
    availableCollectionsOnly
      ? LIBRARY_COLLECTIONS.filter((value) =>
          library.missions.some(
            (row) => row.collection === value && row.modes.some((item) => modes.includes(item)),
          ),
        )
      : LIBRARY_COLLECTIONS;
  const node = (tag, id, text) => {
    const result = doc.createElement(tag);
    if (id) result.id = id;
    if (text !== undefined) localizedText(result, () => text);
    return result;
  };
  const dialog = node('dialog', 'journey-chooser');
  let retuneOrigin = null;
  dialog.className = 'journey-chooser mission-library-chooser';
  dialog.setAttribute('aria-labelledby', 'journey-chooser-title');
  const heading = node(
    'h2',
    'journey-chooser-title',
    localizedMessage('interface:findYourNextLine'),
  );
  const copy = node('p', null, description);
  copy.className = 'journey-library-copy';
  const filters = node('div');
  filters.className = 'journey-filters';
  function field(title, id, type = 'select', parent = filters) {
    const label = node('label'),
      caption = node('span', null, title),
      control = node(type, id);
    caption.className = 'journey-filter-label';
    label.append(caption, control);
    parent.append(label);
    return control;
  }
  const search = field(localizedMessage('interface:searchAllMissions'), 'journey-search', 'input');
  search.parentElement.className = 'journey-search-field';
  search.type = 'search';
  localizedAttribute(search, 'placeholder', () => t('interface:missionCampaignEditionOrTag'));
  const searchControls = node('div');
  searchControls.className = 'journey-search-controls';
  const clearSearch = node(
    'button',
    'journey-search-clear',
    localizedMessage('interface:clearSearch'),
  );
  clearSearch.type = 'button';
  clearSearch.className = 'button secondary';
  clearSearch.setAttribute('aria-controls', 'journey-cards');
  search.parentElement.after(searchControls);
  searchControls.append(search.parentElement, clearSearch);
  const filterDetails = node('details', 'journey-filter-details');
  filterDetails.className = 'journey-filter-details';
  const filterSummary = node(
    'summary',
    'journey-filter-summary',
    localizedMessage('interface:filters'),
  );
  const filterOptions = node('div');
  filterOptions.className = 'journey-filter-options';
  filterDetails.append(filterSummary, filterOptions);
  filters.append(filterDetails);
  const collection = field(
    localizedMessage('interface:collection'),
    'journey-collection',
    'select',
    filterOptions,
  );
  const lifecycle = field(
    localizedMessage('interface:missionLibrary.lifecycle.filter'),
    'journey-lifecycle',
    'select',
    filterOptions,
  );
  const campaign = field(
    localizedMessage('interface:campaign'),
    'journey-campaign',
    'select',
    filterOptions,
  );
  const modeFilter = field(
    localizedMessage('interface:mode'),
    'journey-mode',
    'select',
    filterOptions,
  );
  const detailLabel = node('label');
  detailLabel.className = 'journey-card-detail-control';
  const detailedCards = node('input', 'journey-detailed-cards');
  detailedCards.type = 'checkbox';
  detailLabel.append(
    detailedCards,
    node('span', null, localizedMessage('interface:detailedMissionCards')),
  );
  filterOptions.append(detailLabel);
  const view = doc.defaultView ?? globalThis;
  const media = view.matchMedia?.('(max-width: 600px), (max-height: 720px)');
  let compact = media?.matches === true;
  filterDetails.open = !compact;
  const option = (title, value) => {
    const result = node('option', null, title);
    result.value = value;
    return result;
  };
  collection.append(
    option(localizedMessage('interface:all'), ''),
    ...collections().map((value) => option(() => t(LIBRARY_TAG_KEYS[value]), value)),
  );
  collection.value = '';
  lifecycle.append(
    option(localizedMessage('interface:current'), 'current'),
    option(localizedMessage('interface:missionLibrary.lifecycle.archive'), 'archive'),
    option(localizedMessage('interface:missionLibrary.lifecycle.all'), ''),
  );
  lifecycle.value = 'current';
  modeFilter.append(...modes.map((value) => option(() => modeLabel(value), value)));
  modeFilter.value = mode;
  const status = node('p', 'journey-chooser-status');
  status.setAttribute('role', 'status');
  const campaignRail = node('nav', 'journey-campaign-rail');
  campaignRail.className = 'journey-campaign-rail';
  localizedAttribute(campaignRail, 'aria-label', () => t('interface:campaign'));
  const list = node('div', 'journey-cards');
  list.className = 'journey-cards';
  const footer = node('div');
  footer.className = 'journey-footer';
  const back = node('button', 'journey-back', localizedMessage('common:navigation.backToGame'));
  back.type = 'button';
  back.className = 'button secondary';
  footer.append(back);
  dialog.append(heading, copy, filters, status, campaignRail, list, footer);
  doc.body.append(dialog);
  const cards = new Map(),
    preparations = new Map();
  let opener = null,
    nativeReturnFocus = null,
    selectedId = '',
    savedScroll = 0,
    pendingCampaign = '',
    pendingSelection = null,
    visit = 0,
    destroyed = false,
    restoringCardFocus = false,
    resizeFrame = null,
    resizeAnchor = null,
    viewportAnchor = null,
    message = '';
  let goal = null;
  let initialOpen = true;
  let saved = null;
  try {
    saved = readState();
  } catch {
    /* Session-only browsing still works. */
  }
  if (saved && typeof saved === 'object') {
    if (typeof saved.search === 'string') search.value = saved.search.slice(0, 512);
    if (collections().includes(saved.collection)) collection.value = saved.collection;
    if (saved.lifecycle === '' || LIBRARY_LIFECYCLES.includes(saved.lifecycle))
      lifecycle.value = saved.lifecycle;
    // The caller scopes state by hosting mode. Its browsing filter can point at
    // another mode and must survive a round trip back to this same host.
    if (modes.includes(saved.mode)) {
      modeFilter.value = saved.mode;
      selectedId = typeof saved.selectedId === 'string' ? saved.selectedId : '';
      savedScroll = Number.isFinite(saved.scroll) ? Math.max(0, saved.scroll) : 0;
      pendingCampaign = typeof saved.campaign === 'string' ? saved.campaign : '';
    }
  }
  function state() {
    return {
      search: search.value || '',
      collection: collection.value || '',
      lifecycle: lifecycle.value,
      campaign: campaign.value || pendingCampaign,
      mode: modeFilter.value,
      selectedId,
      scroll: dialog.open ? list.scrollTop || 0 : savedScroll,
    };
  }
  function remember({ captureFocus = true } = {}) {
    const focusedId = doc.activeElement?.closest('.journey-card')?.dataset.missionId;
    if (captureFocus && focusedId && list.contains(doc.activeElement)) selectedId = focusedId;
    if (dialog.open) savedScroll = list.scrollTop || 0;
    try {
      writeState(state());
    } catch {
      /* Do not block play on browser storage. */
    }
  }
  function retirePreparations({ except = null } = {}) {
    for (const [id, preparation] of preparations)
      if (id !== except) {
        preparation.controller.abort();
        preparations.delete(id);
      }
  }
  function rebuildCampaigns(requested = campaign.value || pendingCampaign) {
    if (!modes.includes(modeFilter.value)) modeFilter.value = mode;
    if (availableCollectionsOnly) {
      const selected = collection.value,
        choices = collections();
      collection.replaceChildren(
        option(localizedMessage('interface:all'), ''),
        ...choices.map((value) => option(() => t(LIBRARY_TAG_KEYS[value]), value)),
      );
      collection.value = choices.includes(selected) ? selected : '';
    }
    const choices = new Map();
    for (const row of library.forMode(modeFilter.value))
      if (
        (!collection.value || row.collection === collection.value) &&
        (!lifecycle.value || row.lifecycle === lifecycle.value)
      )
        choices.set(row.campaignKey, () => {
          const display = library.presentation?.(row) ?? row;
          return `${display.campaignTitle} · ${display.edition}`;
        });
    campaign.replaceChildren(
      option(localizedMessage('interface:allCampaigns'), ''),
      ...[...choices].map(([key, title]) => option(title, key)),
    );
    campaign.value = choices.has(requested) ? requested : '';
    // Remote metadata arrives only after the deliberate open. Keep a saved
    // campaign pending until that exact option exists, not as a hidden filter.
    if (campaign.value) pendingCampaign = '';
  }
  rebuildCampaigns();
  function retirePendingSelection() {
    const pending = pendingSelection;
    pendingSelection = null;
    pending?.opening.dispose();
  }
  function currentSelectionButton(id) {
    const card = cards.get(id);
    return card?.button.isConnected &&
      !card.button.disabled &&
      list.contains(card.button) &&
      library.find(id) === card.row
      ? card.button
      : null;
  }
  function updateCampaignRailSelection(id = selectedId || getCurrentId()) {
    const key = library.find(id)?.campaignKey ?? '';
    for (const shortcut of campaignRail.children)
      shortcut.setAttribute('aria-pressed', String(shortcut.dataset.campaignKey === key));
  }
  function primary() {
    const selected = currentSelectionButton(selectedId);
    if (selected) return selected;
    // A saved remote selection may arrive after the first render. Keep its
    // opening lease on Search instead of silently selecting another mission.
    if (selectedId && !library.find(selectedId)) return search;
    const current =
      !selectedId && modeFilter.value === mode ? currentSelectionButton(getCurrentId()) : null;
    return (
      current ??
      [...list.querySelectorAll('.journey-card')].find((button) => !button.disabled) ??
      search
    );
  }
  function restoreSelection() {
    const target = primary();
    target.focus({ preventScroll: true });
    list.scrollTop = savedScroll;
    if (target !== search) target.scrollIntoView?.({ block: 'nearest' });
    if (selectedId && !library.find(selectedId) && !doc.hidden && doc.hasFocus?.() !== false) {
      const opening = trackMissionLibraryOpening({
        document: doc,
        onRetire() {
          if (pendingSelection?.opening === opening) pendingSelection = null;
        },
      });
      pendingSelection = {
        opening,
        visit,
        id: selectedId,
        scroll: savedScroll,
      };
    }
  }
  function restorePendingSelection() {
    const pending = pendingSelection;
    if (!pending) return;
    if (
      pending.visit !== visit ||
      !dialog.open ||
      doc.hidden ||
      doc.hasFocus?.() === false ||
      !pending.opening.current()
    ) {
      retirePendingSelection();
      return;
    }
    const button = currentSelectionButton(pending.id);
    if (!button && !library.find(pending.id)) return;
    retirePendingSelection();
    const target = button ?? primary();
    target.focus({ preventScroll: true });
    list.scrollTop = pending.scroll;
    if (target !== search) target.scrollIntoView?.({ block: 'nearest' });
  }
  function selectExact(id, { focus = false } = {}) {
    const row = library.find(id);
    if (!row || !row.modes.includes(mode)) return false;
    retirePendingSelection();
    // Exact incoming selections belong to this host, even when its last
    // browsing session was looking at a different mode.
    const modeChanged = modeFilter.value !== mode;
    modeFilter.value = mode;
    lifecycle.value = row.lifecycle;
    pendingCampaign = '';
    if (modeChanged || !list.contains(cards.get(id)?.button)) {
      search.value = '';
      collection.value = '';
      campaign.value = '';
      rebuildCampaigns();
      if (modeChanged) invalidateDiagrams();
      render();
    }
    selectedId = id;
    if (focus) {
      cards.get(id)?.button.focus({ preventScroll: true });
      cards.get(id)?.button.scrollIntoView?.({ block: 'nearest' });
    }
    remember();
    return true;
  }
  function selectionVisibilityChanged() {
    if (doc.hidden) {
      retirePendingSelection();
      cancelResizeScroll();
    }
  }
  const displayName = (row) =>
    library.find(row.id) === row ? library.presentation(row).name : row.name;
  doc.addEventListener('visibilitychange', selectionVisibilityChanged);
  view.addEventListener?.('blur', retirePendingSelection);
  view.addEventListener?.('blur', cancelResizeScroll);
  async function activate(row, button) {
    // Detached cards retain their event handlers. A past view (or a closed
    // chooser) must not launch or prepare content after its intent has ended.
    if (
      destroyed ||
      !dialog.open ||
      doc.hidden ||
      doc.hasFocus?.() === false ||
      cards.get(row.id)?.button !== button ||
      !list.contains(button) ||
      library.find(row.id) !== row ||
      !row.modes.includes(modeFilter.value)
    )
      return;
    if (preparations.has(row.id)) return;
    retirePendingSelection();
    retirePreparations({ except: row.id });
    selectedId = row.id;
    updateCampaignRailSelection(row.id);
    // Touch activation need not move keyboard focus off a different card.
    remember({ captureFocus: false });
    const activeMode = modeFilter.value;
    let availability;
    try {
      availability = library.availability(row, activeMode);
    } catch (error) {
      message = error.message;
      render();
      return;
    }
    if (availability.state === 'preparing') return;
    if (availability.state === 'download' || availability.retry) {
      const ticket = visit;
      const controller = new AbortController();
      const preparation = { controller, mode: activeMode, row, ticket };
      preparations.set(row.id, preparation);
      message = '';
      try {
        const result = await library.prepare(row, {
          mode: activeMode,
          signal: controller.signal,
        });
        const current =
          preparations.get(row.id) === preparation &&
          ticket === visit &&
          dialog.open &&
          !destroyed &&
          !doc.hidden &&
          doc.hasFocus?.() !== false &&
          modeFilter.value === activeMode &&
          cards.get(row.id)?.button === button &&
          list.contains(button) &&
          library.find(row.id)?.id === row.id;
        if (current)
          message =
            result.state === 'cancelled'
              ? localizedMessage('interface:downloadCancelledYourCurrentGameIsKept')
              : result.state === 'ready'
                ? () => t('interface:missionLibrary.prepared', { name: displayName(row) })
                : '';
        if (current && result.state === 'ready') {
          preparations.delete(row.id);
          render();
          const readyRow = library.find(row.id),
            readyButton = cards.get(row.id)?.button;
          if (readyRow && readyButton) return activate(readyRow, readyButton);
        }
      } catch (error) {
        if (ticket === visit)
          message = () =>
            t('interface:missionLibrary.prepareFailed', {
              name: displayName(row),
              error: error.message,
            });
      } finally {
        if (preparations.get(row.id) === preparation) preparations.delete(row.id);
        if (dialog.open && ticket === visit) render();
      }
      return;
    }
    if (availability.state !== 'ready') return;
    // Existing hosts must leave the picker before taking their atomic attempt
    // ticket. Keep filters/focus for an unsuccessful or cancelled handoff.
    const ticket = ++visit;
    remember({ captureFocus: false });
    let context = null,
      closeRetired = false;
    // close() restores native focus and may run reentrant host listeners before
    // the owner's launch lease exists. Admit only this input turn and the
    // browser's expected return targets; a newer action must keep its focus.
    const closingFocus = new Set([
      doc.activeElement,
      nativeReturnFocus,
      doc.body,
      doc.documentElement,
      dialog,
    ]);
    const retireClose = () => {
      closeRetired = true;
    };
    const closingFocusChanged = () => {
      if (!closingFocus.has(doc.activeElement)) retireClose();
    };
    const closingInputs = ['keydown', 'pointerdown', 'click'];
    const mayRestore = () =>
      !closeRetired &&
      ticket === visit &&
      !destroyed &&
      !doc.hidden &&
      doc.hasFocus?.() !== false &&
      context?.isCurrent?.() !== false;
    const mayLaunch = () =>
      mayRestore() &&
      closingFocus.has(doc.activeElement) &&
      modeFilter.value === activeMode &&
      cards.get(row.id)?.button === button &&
      list.contains(button) &&
      library.find(row.id) === row;
    try {
      doc.addEventListener('focusin', closingFocusChanged, true);
      for (const type of closingInputs) doc.addEventListener(type, retireClose, true);
      try {
        context = launchContext(row, { mode: activeMode });
        if (!mayLaunch()) {
          context?.retire?.();
          return;
        }
        dialog.close();
        if (!mayLaunch() || dialog.open) {
          context?.retire?.();
          return;
        }
      } finally {
        doc.removeEventListener('focusin', closingFocusChanged, true);
        for (const type of closingInputs) doc.removeEventListener(type, retireClose, true);
      }
      const accepted = await library.launch(row, {
        ...context,
        mode: activeMode,
      });
      if (accepted === false && mayRestore()) {
        message = localizedMessage('interface:missionNotOpenedYourCurrentGameIsKept');
        open(opener, { returnLabel: back.textContent, retune: false });
      }
    } catch (error) {
      if (mayRestore()) {
        message = () =>
          t('interface:missionLibrary.launchFailed', {
            name: displayName(row),
            error: error.message,
          });
        open(opener, { returnLabel: back.textContent, retune: false });
      }
    }
  }
  function makeCard(row) {
    const view = createLevelCardView({
      document: doc,
      className: 'journey-card journey-card-illustrated',
      classes: {
        campaignHeading: 'journey-campaign-heading',
        meta: 'journey-card-meta',
        number: 'journey-card-number',
        position: 'journey-card-position',
        title: 'journey-card-title',
        campaign: 'journey-card-campaign',
        progressGroup: 'journey-card-progress-group',
        progress: 'journey-card-progress',
        stars: 'journey-card-stars',
        status: 'journey-card-action',
        preview: 'journey-card-preview',
        check: 'journey-card-check',
      },
    });
    const {
      button,
      campaignHeading,
      number,
      position: campaignPosition,
      title: name,
      campaign: campaignName,
      progress,
      stars,
      status: action,
      preview,
      check,
    } = view;
    button.dataset.missionId = row.id;
    const display = () => library.presentation?.(row) ?? row;
    localizedText(campaignHeading, () => display().campaignTitle);
    localizedText(name, () => display().name);
    localizedText(campaignName, () => display().campaignTitle);
    localizedAttribute(button, 'data-campaign-title', () => display().campaignTitle);
    const edition = node('span', null, () => display().edition);
    edition.className = 'journey-card-edition';
    const tags = node('span', null, () =>
      row.tags.map((tag) => t(LIBRARY_TAG_KEYS[tag])).join(' · '),
    );
    tags.className = 'journey-card-tags';
    const rules = node('span', null, row.rules);
    rules.className = 'journey-card-challenge';
    rules.hidden = !row.rules;
    const route = node('span');
    route.className = 'journey-card-route';
    const mastery = node('span');
    mastery.className = 'journey-card-mastery';
    button.append(edition, tags, rules, route, mastery);
    button.onclick = () => activate(row, button);
    button.addEventListener('focusin', () => {
      selectedId = row.id;
      updateCampaignRailSelection(row.id);
      goal?.refresh();
    });
    return {
      row,
      button,
      campaignHeading,
      number,
      campaignPosition,
      progress,
      stars,
      rules,
      route,
      mastery,
      action,
      preview,
      check,
      diagram: null,
      artwork: null,
      completion: null,
    };
  }
  function render() {
    if (destroyed) return;
    clearSearch.hidden = !search.value;
    const focused = doc.activeElement;
    const focusedId = list.contains(focused) ? focused?.dataset.missionId : null;
    const focusedCampaignKey = campaignRail.contains(focused) ? focused?.dataset.campaignKey : null;
    const scroll = list.scrollTop || 0;
    const campaignScroll = campaignRail.scrollLeft || 0;
    const railRows = library.search(search.value || '', {
      mode: modeFilter.value,
      collection: collection.value,
      lifecycle: lifecycle.value,
    });
    // Campaigns are navigation anchors, never a hidden second filter. Every
    // matching campaign remains in this one scroll surface.
    const matches = railRows;
    localizedText(
      status,
      () =>
        `${t('common:counts.missions', { count: matches.length })} · ${modeLabel(modeFilter.value)}${message ? ` · ${renderMessage(message)}` : ''}`,
    );
    const filtersActive =
      !!collection.value || modeFilter.value !== mode || lifecycle.value !== 'current';
    localizedText(filterSummary, () =>
      filtersActive ? t('interface:filtersActive') : t('interface:filters'),
    );
    const campaignChoices = new Map();
    for (const row of railRows)
      if (!campaignChoices.has(row.campaignKey))
        campaignChoices.set(row.campaignKey, {
          row,
          count: 0,
        });
    for (const row of railRows) campaignChoices.get(row.campaignKey).count++;
    const shortcuts = [...campaignChoices].map(([key, info]) => {
      const shortcut = node('button');
      localizedText(shortcut, () => {
        const display = library.presentation?.(info.row) ?? info.row;
        return `${display.campaignTitle} · ${t('common:counts.missions', { count: info.count })}`;
      });
      shortcut.type = 'button';
      shortcut.className = 'journey-campaign-shortcut';
      shortcut.dataset.campaignKey = key;
      shortcut.setAttribute('aria-pressed', 'false');
      localizedAttribute(shortcut, 'title', () => {
        const display = library.presentation?.(info.row) ?? info.row;
        return display.edition;
      });
      shortcut.onclick = () => {
        if (destroyed || !dialog.open || doc.hidden || doc.hasFocus?.() === false) return;
        retirePendingSelection();
        retirePreparations();
        campaign.value = key;
        pendingCampaign = '';
        const target = [...list.querySelectorAll('.journey-card')].find(
          (card) => card.dataset.campaignKey === key,
        );
        if (!target || target.disabled) return;
        selectedId = target.dataset.missionId;
        target.focus({ preventScroll: true });
        target.scrollIntoView?.({ block: 'start', inline: 'nearest' });
        remember({ captureFocus: false });
      };
      return shortcut;
    });
    campaignRail.replaceChildren(...shortcuts);
    campaignRail.hidden = shortcuts.length < 2;
    let previousCampaign = null;
    const buttons = matches.map((row) => {
      const display = () => library.presentation?.(row) ?? row;
      let card = cards.get(row.id);
      if (card?.row !== row) {
        card = makeCard(row);
        cards.set(row.id, card);
      }
      const availability = library.availability(row, modeFilter.value);
      const progressState = library.progressState(row, modeFilter.value);
      const cardPresentation = levelCardPresentation({ ...row, progressState });
      applyLevelCardPresentation(card, cardPresentation);
      localizedText(card.number, () =>
        row.globalLevelNumber === null
          ? t('interface:missionLibrary.customLevel')
          : t('interface:missionLibrary.levelNumber', { number: row.globalLevelNumber }),
      );
      localizedText(card.campaignPosition, () =>
        t('interface:missionLibrary.campaignPosition', {
          position: row.campaignLevelNumber,
          total: row.campaignLevelCount,
        }),
      );
      localizedText(card.stars, () => cardPresentation.stars);
      localizedAttribute(card.stars, 'aria-label', () =>
        progressState.state === 'completed'
          ? progressState.bestStars === null
            ? t('interface:missionLibrary.completedStarsUnknown')
            : t('interface:missionLibrary.completedStars', { stars: progressState.bestStars })
          : t('interface:missionLibrary.notCompleted'),
      );
      const details = library.details(row, modeFilter.value);
      localizedText(card.rules, () => library.details(row, modeFilter.value).challenge);
      card.rules.hidden = !details.challenge;
      localizedText(card.route, () => library.details(row, modeFilter.value).route);
      card.route.hidden = !details.route;
      localizedText(card.mastery, () => {
        const mastery = library.details(row, modeFilter.value).mastery;
        return mastery
          ? t('interface:missionLibrary.optionalChallenge', { challenge: mastery })
          : '';
      });
      card.mastery.hidden = !details.mastery;
      card.completion = library.completion(row, modeFilter.value);
      card.button.dataset.campaignKey = row.campaignKey;
      card.button.dataset.campaignStart = String(previousCampaign !== row.campaignKey);
      card.button.dataset.availabilityState = availability.included
        ? 'included'
        : availability.state;
      card.button.dataset.pictureState = card.completion?.state ?? 'unfinished';
      card.button.dataset.current = String(row.id === getCurrentId());
      card.campaignHeading.hidden = previousCampaign === row.campaignKey;
      localizedText(card.progress, () =>
        card.completion?.state === 'unavailable'
          ? card.completion.reason
          : library.progress(row, modeFilter.value) ||
            (progressState.state === 'completed' && progressState.bestStars === null
              ? t('interface:missionLibrary.completedStarsUnknown')
              : ''),
      );
      card.progress.hidden = !card.progress.textContent;
      localizedText(card.action, () =>
        availability.state === 'ready' || availability.included
          ? ''
          : availability.state === 'download'
            ? `${t('interface:downloadPlay')} · ${sizeLabel(availability.bytes)}`
            : availability.state === 'preparing'
              ? `${t('interface:preparing')}…`
              : t(
                  availability.retry
                    ? 'interface:missionLibrary.unavailableRetry'
                    : 'interface:missionLibrary.unavailableReason',
                  { reason: availability.reason },
                ),
      );
      card.action.hidden = availability.state === 'ready' || availability.included;
      localizedAttribute(card.button, 'aria-label', () => {
        const progressLabel =
          progressState.state === 'completed'
            ? progressState.bestStars === null
              ? t('interface:missionLibrary.completedStarsUnknown')
              : t('interface:missionLibrary.completedStars', { stars: progressState.bestStars })
            : progressState.state === 'skipped'
              ? t('interface:skippedTryAgain')
              : t('interface:missionLibrary.notCompleted');
        const ownerProgress =
          progressState.state === 'completed' && progressState.bestStars === null
            ? library.progress(row, modeFilter.value)
            : '';
        return `${card.number.textContent} · ${displayName(row)} · ${display().campaignTitle} · ${card.campaignPosition.textContent} · ${progressLabel}${ownerProgress ? ` · ${ownerProgress}` : ''}`;
      });
      card.button.disabled = availability.state === 'unavailable' && !availability.retry;
      card.button.setAttribute('aria-busy', String(availability.state === 'preparing'));
      previousCampaign = row.campaignKey;
      return card.button;
    });
    // Reuse buttons across status changes instead of throwing away keyboard focus.
    if (
      buttons.length !== list.children.length ||
      buttons.some((button, index) => list.children[index] !== button)
    )
      list.replaceChildren(...buttons);
    if (focusedCampaignKey && !doc.hidden && doc.hasFocus?.() !== false) {
      const replacement = shortcuts.find(
        (shortcut) => shortcut.dataset.campaignKey === focusedCampaignKey,
      );
      if (replacement?.isConnected && !campaignRail.hidden) {
        if (doc.activeElement !== replacement) replacement.focus({ preventScroll: true });
      } else primary().focus({ preventScroll: true });
    }
    campaignRail.scrollLeft = campaignScroll;
    if (focusedId && !doc.hidden && doc.hasFocus?.() !== false) {
      const replacement = cards.get(focusedId)?.button;
      if (replacement?.isConnected && list.contains(replacement) && !replacement.disabled) {
        if (doc.activeElement !== replacement) {
          restoringCardFocus = true;
          try {
            replacement.focus({ preventScroll: true });
          } finally {
            restoringCardFocus = false;
          }
        }
      } else primary().focus({ preventScroll: true });
    }
    list.scrollTop = scroll;
    for (const [id, card] of cards)
      if (!library.find(id)) {
        card.button.remove();
        cards.delete(id);
      }
    restorePendingSelection();
    updateCampaignRailSelection();
    goal?.refresh();
    observeDiagrams();
  }
  // Decode only near the viewport. An earned picture owns the same exact
  // descriptor as Collection; release its decoded bytes when it leaves view.
  function hidePreview(card) {
    const changed =
      !!card.artwork ||
      !!card.diagram ||
      !!card.preview.querySelector('.journey-card-map') ||
      !!card.preview.querySelector('.journey-card-picture-status');
    card.artwork?.release();
    card.artwork = null;
    card.diagram = null;
    if (changed) card.preview.replaceChildren();
  }
  function showPreview(card) {
    if (card.diagram || !dialog.open || !list.contains(card.button)) return;
    card.diagram = true;
    try {
      const canvas = node('canvas');
      canvas.className = 'journey-card-map';
      canvas.width = 288;
      canvas.setAttribute('aria-hidden', 'true');
      if (card.completion?.state === 'earned') {
        const pictureStatus = node('span');
        pictureStatus.className = 'journey-card-picture-status';
        card.preview.append(canvas, pictureStatus);
        card.artwork = createJourneyArtworkView({
          canvas,
          status: pictureStatus,
        });
        void card.artwork.show(card.completion.record);
      } else {
        const diagram = library.card(card.row, modeFilter.value);
        if (!diagram) return;
        canvas.height = (288 * diagram.height) / diagram.width;
        paintMissionThumbnail(canvas.getContext('2d'), diagram, canvas.width);
        card.preview.append(canvas);
      }
    } catch {
      /* Optional previews cannot prevent a mission launch. */
    }
  }
  const Observer = doc.defaultView?.IntersectionObserver ?? globalThis.IntersectionObserver;
  const observer =
    typeof Observer === 'function'
      ? new Observer(
          (entries) => {
            for (const entry of entries) {
              const card = cards.get(entry.target.dataset.missionId);
              if (!card || library.find(card.row.id) !== card.row) continue;
              if (entry.isIntersecting) showPreview(card);
              else hidePreview(card);
            }
          },
          { root: list, rootMargin: '120px' },
        )
      : null;
  function fallbackPreviews() {
    if (observer || !dialog.open) return;
    const bounds = list.getBoundingClientRect();
    let shown = 0;
    for (const button of list.querySelectorAll('.journey-card')) {
      const card = cards.get(button.dataset.missionId),
        rect = button.getBoundingClientRect();
      const near = rect.bottom >= bounds.top - 120 && rect.top <= bounds.bottom + 120;
      // A bounded fallback also works in hosts without layout observation.
      if (near && shown < 12) {
        showPreview(card);
        shown++;
      } else hidePreview(card);
    }
  }
  function observeDiagrams() {
    for (const card of cards.values())
      if (!list.contains(card.button)) {
        observer?.unobserve?.(card.button);
        hidePreview(card);
      }
    for (const button of list.querySelectorAll('.journey-card')) observer?.observe?.(button);
    fallbackPreviews();
  }
  function captureViewportAnchor() {
    if (!dialog.open) return;
    const bounds = list.getBoundingClientRect();
    for (const button of list.querySelectorAll('.journey-card')) {
      const rect = button.getBoundingClientRect();
      if (rect.bottom >= bounds.top) {
        viewportAnchor = {
          id: button.dataset.missionId,
          offset: rect.top - bounds.top,
        };
        return;
      }
    }
  }
  list.addEventListener('scroll', fallbackPreviews);
  list.addEventListener('scroll', captureViewportAnchor);
  function invalidateDiagrams() {
    observer?.disconnect();
    for (const card of cards.values()) hidePreview(card);
  }
  function cancelResizeScroll({ retainAnchor = false } = {}) {
    if (resizeFrame !== null) view.cancelAnimationFrame?.(resizeFrame);
    resizeFrame = null;
    if (!retainAnchor) resizeAnchor = null;
  }
  function preserveViewportAnchor() {
    const eligible = !destroyed && dialog.open && !doc.hidden && doc.hasFocus?.() !== false;
    cancelResizeScroll({ retainAnchor: eligible });
    if (!eligible) return;
    if (!resizeAnchor) {
      if (!viewportAnchor) captureViewportAnchor();
      resizeAnchor = viewportAnchor && { ...viewportAnchor };
    }
    const anchor = resizeAnchor && { ...resizeAnchor };
    if (!anchor) return;
    const ticket = visit;
    const restore = () => {
      resizeFrame = null;
      if (
        destroyed ||
        ticket !== visit ||
        !dialog.open ||
        doc.hidden ||
        doc.hasFocus?.() === false
      ) {
        resizeAnchor = null;
        return;
      }
      const target = currentSelectionButton(anchor.id);
      if (!target) {
        resizeAnchor = null;
        return;
      }
      const bounds = list.getBoundingClientRect();
      const delta = target.getBoundingClientRect().top - bounds.top - anchor.offset;
      if (Number.isFinite(delta) && Math.abs(delta) >= 1) list.scrollTop += delta;
      viewportAnchor = anchor;
      resizeAnchor = null;
    };
    if (view.requestAnimationFrame) resizeFrame = view.requestAnimationFrame(restore);
    else restore();
  }
  view.addEventListener?.('resize', preserveViewportAnchor);
  function resizeFilters(event) {
    compact = event.matches === true;
    // Keep the exact focused control and selection across rotation. If a
    // compact transition catches focus inside the filter panel, leave that
    // panel open until the player moves onward instead of relocating focus.
    const focused = doc.activeElement;
    filterDetails.open = !compact || filterOptions.contains(focused);
    if (dialog.open) observeDiagrams();
    preserveViewportAnchor();
  }
  media?.addEventListener?.('change', resizeFilters);
  detailedCards.addEventListener('change', () => {
    dialog.classList.toggle('mission-library-detailed', detailedCards.checked);
    if (dialog.open) observeDiagrams();
  });
  dialog.addEventListener('focusin', (event) => {
    // A touch activation can deliberately leave keyboard focus on a different
    // control. Retire its preparation only after a later focus transition;
    // refocusing the preparing card keeps the owned one-action launch alive.
    if (!restoringCardFocus) {
      const focusedCard = event.target.closest?.('.journey-card');
      retirePreparations({
        except: focusedCard && list.contains(focusedCard) ? focusedCard.dataset.missionId : null,
      });
    }
    // The compact filters float above cards. Once keyboard/controller focus
    // reaches an action below them, remove that cover without moving focus or
    // changing a filter. Focus and select previews inside the popover stay put.
    if (
      compact &&
      filterDetails.open &&
      (list.contains(event.target) || footer.contains(event.target))
    )
      filterDetails.open = false;
  });
  function close({ retune = true } = {}) {
    retirePendingSelection();
    cancelResizeScroll();
    ++visit;
    const wasOpen = dialog.open;
    // Play already saved the visible position before closing. Native hidden
    // layout reports zero; later disposal must not overwrite that position or
    // return focus away from the action that now owns this page.
    if (wasOpen) remember();
    retirePreparations();
    if (!wasOpen) return;
    dialog.close();
    if (onReturn) onReturn(opener);
    else if (opener?.isConnected) opener.focus({ preventScroll: true });
    if (retune && !dialog.open) commitMenuRetune(dialog, retuneOrigin);
  }
  function open(
    origin = doc.activeElement,
    { returnLabel = t('common:navigation.backToGame'), retune = true } = {},
  ) {
    if (destroyed) return;
    const changed = !dialog.open;
    const landing = retune && changed ? menuRetuneOrigin(origin) : null;
    retirePendingSelection();
    cancelResizeScroll();
    ++visit;
    opener = origin;
    if (initialOpen && !saved && library.find(getCurrentId())?.lifecycle === 'archive')
      lifecycle.value = 'archive';
    initialOpen = false;
    localizedText(back, () => returnLabel);
    onPause?.();
    invalidateDiagrams();
    rebuildCampaigns();
    render();
    if (!dialog.open) nativeReturnFocus = doc.activeElement;
    dialog.showModal();
    observeDiagrams();
    restoreSelection();
    if (landing) {
      retuneOrigin = landing;
      commitMenuRetune(landing, dialog);
    } else if (changed) retuneOrigin = null;
  }
  search.addEventListener('input', () => {
    retirePendingSelection();
    retirePreparations();
    pendingCampaign = '';
    ++visit; // Late preparation feedback belongs to the view that requested it.
    message = '';
    selectedId = '';
    savedScroll = 0;
    list.scrollTop = 0;
    render();
    remember();
  });
  clearSearch.onclick = () => {
    if (destroyed || !dialog.open || doc.hidden || doc.hasFocus?.() === false || !search.value)
      return;
    const ticket = visit,
      focused = doc.activeElement;
    search.value = '';
    // Use the same bubbling input path as typing, including host-owned lazy
    // loading invalidation. Clearing never changes the other visible filters.
    const EventType = doc.defaultView?.Event || Event;
    search.dispatchEvent(new EventType('input', { bubbles: true }));
    if (
      destroyed ||
      !dialog.open ||
      doc.hidden ||
      doc.hasFocus?.() === false ||
      visit !== ticket + 1 ||
      (doc.activeElement !== focused &&
        !(focused === clearSearch && doc.activeElement === doc.body))
    )
      return;
    const first = [...list.querySelectorAll('.journey-card')].find((button) => !button.disabled);
    (first ?? (compact ? filterSummary : collection)).focus({
      preventScroll: true,
    });
    remember();
  };
  campaign.addEventListener('change', () => {
    retirePendingSelection();
    retirePreparations();
    pendingCampaign = '';
    const key = campaign.value;
    if (!key) return;
    const target = [...list.querySelectorAll('.journey-card')].find(
      (card) => card.dataset.campaignKey === key && !card.disabled,
    );
    if (!target) return;
    selectedId = target.dataset.missionId;
    target.focus({ preventScroll: true });
    target.scrollIntoView?.({ block: 'start', inline: 'nearest' });
    updateCampaignRailSelection(selectedId);
    remember({ captureFocus: false });
  });
  for (const control of [collection, modeFilter, lifecycle])
    control.addEventListener('change', () => {
      retirePendingSelection();
      retirePreparations();
      ++visit;
      message = '';
      selectedId = '';
      savedScroll = 0;
      list.scrollTop = 0;
      pendingCampaign = '';
      rebuildCampaigns();
      if (control === modeFilter) invalidateDiagrams();
      render();
      remember();
    });
  back.onclick = close;
  dialog.addEventListener('close', () => {
    retirePendingSelection();
    invalidateDiagrams();
  });
  dialog.addEventListener('cancel', (event) => {
    if (event.target === dialog) {
      event.preventDefault();
      close();
    }
  });
  const unsubscribe = library.subscribe(() => {
    if (dialog.open) {
      rebuildCampaigns();
      render();
    }
  });
  function revealExisting(id, targetMode = mode, { focus = true } = {}) {
    const row = library.find(id);
    if (!row || !modes.includes(targetMode) || !row.modes.includes(targetMode)) return false;
    retirePendingSelection();
    const modeChanged = modeFilter.value !== targetMode;
    modeFilter.value = targetMode;
    lifecycle.value = row.lifecycle;
    pendingCampaign = '';
    if (modeChanged || !list.contains(cards.get(id)?.button)) {
      search.value = '';
      collection.value = '';
      campaign.value = '';
      rebuildCampaigns();
      if (modeChanged) invalidateDiagrams();
      render();
    }
    selectedId = id;
    if (focus) {
      cards.get(id)?.button.focus({ preventScroll: true });
      cards.get(id)?.button.scrollIntoView?.({ block: 'nearest' });
    }
    goal?.refresh();
    remember();
    return true;
  }
  goal = attachMissionLibraryGoal({
    container: footer,
    library,
    modes,
    getMode: () => modeFilter.value,
    getSelectedId: () => (currentSelectionButton(selectedId) ? selectedId : null),
    isActive: () => !destroyed && dialog.open && !doc.hidden && doc.hasFocus?.() !== false,
    reveal: revealExisting,
    onIntent() {
      retirePendingSelection();
      retirePreparations();
      ++visit;
    },
    ...goalPreferenceOptions,
    window: view,
  });
  return {
    open,
    primary,
    restore() {
      open(opener, { returnLabel: back.textContent, retune: false });
    },
    close,
    state,
    select(id) {
      return revealExisting(id, mode, { focus: false });
    },
    // Incoming launch intent keeps its existing host-mode ownership rule.
    reveal: (id) => revealExisting(id, mode),
    refresh() {
      if (dialog.open) {
        invalidateDiagrams();
        rebuildCampaigns();
        render();
      }
    },
    destroy() {
      close({ retune: false });
      destroyed = true;
      goal.dispose();
      unsubscribe();
      observer?.disconnect();
      media?.removeEventListener?.('change', resizeFilters);
      doc.removeEventListener('visibilitychange', selectionVisibilityChanged);
      view.removeEventListener?.('blur', retirePendingSelection);
      view.removeEventListener?.('blur', cancelResizeScroll);
      view.removeEventListener?.('resize', preserveViewportAnchor);
      dialog.remove();
    },
  };
}
