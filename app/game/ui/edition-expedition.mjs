import { loadRewardImage } from './reward-image.mjs';
import { getLocale, onLocaleChange, t } from '../i18n/index.mjs';
import { contentText } from '../i18n/content.mjs';
import { journeyMissionId } from '../journey/catalog.mjs';
import { libraryMissionId } from '../mission-library/library.mjs';
import {
  DISCOVERY_PACING_BEATS,
  DISCOVERY_EXHIBIT_LAYOUTS,
} from '../content-design/discovery-schema.mjs';

/** Presentation aliases for the existing Journey library. These IDs never
 * authorize a launch: the original library cards retain that responsibility. */
export function createExpeditionEntries(provider) {
  const source = provider.route.source;
  const editionId = provider.route.id ?? provider.editionId;
  const permitted = new Set(provider.selection.edition.campaignIds);
  const missions = new Map(source.missions.map((mission) => [mission.id, mission]));
  return source.campaigns
    .filter((campaign) => permitted.has(campaign.id))
    .map((campaign) => ({
      campaign,
      missions: campaign.missionIds.map((id, index) => {
        const mission = missions.get(id);
        const aliases = source.packs
          .filter((pack) => pack.campaignIds.includes(campaign.id))
          .map((pack) => {
            const journeyId = journeyMissionId({
              source: 'candidate',
              packId: pack.id,
              campaignId: campaign.id,
              levelId: id,
            });
            return {
              journeyId,
              libraryId: libraryMissionId({
                owner: `journey:${editionId}`,
                edition: editionId,
                campaign: JSON.stringify(['candidate', pack.id, campaign.id]),
                mission: journeyId,
              }),
            };
          });
        return { mission, campaign, index, aliases };
      }),
    }));
}

/** Map/list are two presentations of the exact same native mission buttons.
 * Search, focus, disabled states, preparation and guarded launches stay owned
 * by the shared chooser. No new progress or navigation authority is introduced. */
export function mountEditionExpedition({
  provider,
  document: doc,
  window: win = globalThis,
  getJourneyProfile = () => null,
  getJourneyRevision = () => 0,
  getRewards = () => null,
}) {
  const entries = createExpeditionEntries(provider);
  const aliases = new Map(
    entries.flatMap((entry) =>
      entry.missions.flatMap((mission) =>
        mission.aliases.map(({ libraryId }) => [libraryId, mission]),
      ),
    ),
  );
  const decorations = new Map();
  const exhibitLayout = (campaign) =>
    DISCOVERY_EXHIBIT_LAYOUTS.includes(campaign.discovery?.exhibitLayout)
      ? campaign.discovery.exhibitLayout
      : 'route';
  const tr = (key, options) => t(`interface:editionExpedition.${key}`, options);
  const local = (definition) => definition.locales[getLocale()] ?? definition.locales.en;
  const element = (tag, className, text) => {
    const node = doc.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined) node.textContent = text;
    return node;
  };
  const toolbar = element('section', 'edition-expedition-toolbar');
  toolbar.id = 'edition-expedition-toolbar';
  const title = element('h3'),
    note = element('p', 'edition-expedition-note');
  const controls = element('div', 'edition-expedition-controls');
  controls.setAttribute('role', 'group');
  const map = element('button', 'button secondary'),
    list = element('button', 'button secondary'),
    next = element('button', 'button secondary');
  map.id = 'edition-expedition-map';
  list.id = 'edition-expedition-list';
  next.id = 'edition-expedition-next';
  for (const button of [map, list, next]) button.type = 'button';
  controls.append(map, list, next);
  const overview = element('div', 'edition-expedition-overview');
  overview.id = 'edition-expedition-overview';
  toolbar.append(title, note, controls, overview);
  let dialog = null,
    cards = null,
    filterState = null,
    disposed = false,
    queued = false,
    layout = 'map';
  let last = null,
    revision = null,
    snapshot = null,
    locale = null,
    nextTarget = null;

  let teaserRequest = null,
    teaserVisit = 0,
    teaserTarget = null;
  const teaserURLs = new Set();
  function releaseTeaser() {
    teaserVisit++;
    teaserRequest?.abort();
    teaserRequest = null;
    for (const url of teaserURLs) win.URL.revokeObjectURL(url);
    teaserURLs.clear();
    teaserTarget?.replaceChildren();
    teaserTarget = null;
  }
  function bind() {
    const found = doc.getElementById('journey-chooser');
    const foundCards = doc.getElementById('journey-cards');
    if (!found || !foundCards || !found.contains(foundCards)) return false;
    if (dialog !== found || cards !== foundCards) {
      releaseTeaser();
      dialog?.removeEventListener('close', releaseTeaser);
      dialog?.classList.remove(
        'edition-expedition',
        'edition-expedition-map',
        'edition-expedition-list',
      );
      dialog = found;
      dialog.addEventListener('close', releaseTeaser);
      cards = foundCards;
      dialog.classList.add('edition-expedition');
      const filters = doc.getElementById('journey-filter-details');
      if (filters) {
        filterState = { element: filters, open: filters.open };
        filters.open = false;
      }
      const hero = provider.selection.brand?.heroAssetId;
      if (hero && provider.assetURL)
        cards.style.setProperty(
          '--expedition-scene',
          `url(${JSON.stringify(provider.assetURL(hero))})`,
        );
      cards.before(toolbar);
      chooserObserver?.disconnect();
      chooserObserver?.observe(dialog, { attributes: true, attributeFilter: ['open'] });
      chooserObserver?.observe(cards, { childList: true });
      last = null;
    }
    return true;
  }
  function definitionsFor(rewardSnapshot) {
    const byId = new Map((provider.rewards ?? []).map((definition) => [definition.id, definition]));
    for (const definition of rewardSnapshot?.state?.promises ?? [])
      byId.set(definition.id, definition);
    return [...byId.values()];
  }
  const matchesRef = (definition, ref, pinned) =>
    !ref ||
    (definition.id === ref.id && (definition.revision === ref.revision || pinned.has(definition)));
  function missionReward(mission, definitions, pinned) {
    const ref = mission.mission.design?.rewardRef;
    return definitions.find(
      (definition) =>
        definition.campaignId === mission.campaign.id &&
        definition.scope.kind === 'mission' &&
        definition.scope.id === mission.mission.id &&
        matchesRef(definition, ref, pinned),
    );
  }
  function cleared(mission, profile, definition) {
    const requirement = definition?.requirements.missions.find(
      (item) => item.missionId === mission.mission.id,
    );
    return mission.aliases.some(({ journeyId }) => {
      const clear = profile?.clears?.solo?.[journeyId];
      return (
        clear &&
        (!requirement ||
          requirement.bindings.some(
            (binding) =>
              binding.gameplayId === clear.gameplayId && binding.difficulty === clear.difficulty,
          ))
      );
    });
  }
  function refresh(force = false) {
    if (disposed || !bind()) return;
    if (!dialog.open) {
      releaseTeaser();
      return;
    }
    const currentCards = [...cards.children];
    const currentRevision = getJourneyRevision(),
      currentSnapshot = getRewards(),
      currentLocale = getLocale();
    const signature = currentCards
      .map((card) => `${card.dataset.missionId}:${card.disabled}:${card.dataset.availabilityState}`)
      .join('|');
    if (
      !force &&
      last?.signature === signature &&
      last.nodes.every((card, index) => card === currentCards[index]) &&
      revision === currentRevision &&
      snapshot === currentSnapshot?.state &&
      locale === currentLocale
    )
      return;
    releaseTeaser();
    last = { signature, nodes: currentCards };
    revision = currentRevision;
    snapshot = currentSnapshot?.state;
    locale = currentLocale;
    const profile = getJourneyProfile();
    const definitions = definitionsFor(currentSnapshot);
    const pinned = new Set(currentSnapshot?.state?.promises ?? []);
    const earned = new Set(
      (currentSnapshot?.state?.receipts ?? []).map((receipt) => receipt.definition.id),
    );
    const progress = new Map(
      (currentSnapshot?.progress ?? []).map((item) => [item.rewardId, item]),
    );
    const known = currentCards.filter((card) => aliases.has(card.dataset.missionId));
    const visibleCampaigns = new Set(
      known.map((card) => aliases.get(card.dataset.missionId).campaign.id),
    );
    toolbar.hidden = known.length === 0;
    map.disabled = known.length !== currentCards.length || known.length === 0;
    const effectiveLayout = map.disabled ? 'list' : layout;
    dialog.classList.toggle('edition-expedition-map', effectiveLayout === 'map');
    dialog.classList.toggle('edition-expedition-list', effectiveLayout === 'list');
    controls.setAttribute('aria-label', tr('viewLabel'));
    title.textContent = tr('title');
    note.textContent = tr('note');
    map.textContent = tr('map');
    list.textContent = tr('list');
    next.textContent = tr('next');
    map.setAttribute('aria-pressed', String(effectiveLayout === 'map'));
    list.setAttribute('aria-pressed', String(effectiveLayout === 'list'));
    map.setAttribute('aria-controls', 'journey-cards');
    list.setAttribute('aria-controls', 'journey-cards');
    nextTarget = null;
    for (const [card, decoration] of decorations) {
      if (!currentCards.includes(card)) {
        decoration.remove();
        for (const key of [
          'expeditionCleared',
          'expeditionCollected',
          'expeditionConnect',
          'expeditionLayout',
        ])
          delete card.dataset[key];
        decorations.delete(card);
      }
    }
    for (const [index, card] of currentCards.entries()) {
      const descriptor = aliases.get(card.dataset.missionId);
      if (!descriptor) continue;
      const definition = missionReward(descriptor, definitions, pinned);
      const complete = cleared(descriptor, profile, definition);
      const collected = definition && earned.has(definition.id);
      const nextDescriptor = aliases.get(currentCards[index + 1]?.dataset.missionId);
      card.dataset.expeditionCleared = String(!!complete);
      card.dataset.expeditionCollected = String(!!collected);
      card.dataset.expeditionConnect = String(
        descriptor.campaign.id === nextDescriptor?.campaign.id,
      );
      card.dataset.expeditionLayout = exhibitLayout(descriptor.campaign);
      let decoration = decorations.get(card);
      if (!decoration) {
        decoration = element('span', 'edition-expedition-discovery');
        decorations.set(card, decoration);
        card.append(decoration);
      }
      const lines = [];
      if (DISCOVERY_PACING_BEATS.includes(descriptor.mission.design?.pacingBeat))
        lines.push(tr(`beats.${descriptor.mission.design.pacingBeat}`));
      if (definition)
        lines.push(tr(collected ? 'collected' : 'discovery', { title: local(definition).title }));
      else lines.push(tr(complete ? 'completed' : 'unexplored'));
      decoration.textContent = lines.join(' · ');
      if (!complete && !card.disabled && !nextTarget) nextTarget = card;
    }
    next.disabled = !nextTarget;
    overview.replaceChildren(
      ...entries
        .filter((entry) => visibleCampaigns.has(entry.campaign.id))
        .map((entry) => {
          const section = element('article', 'edition-expedition-campaign');
          section.dataset.campaignId = entry.campaign.id;
          section.dataset.exhibitLayout = exhibitLayout(entry.campaign);
          const descriptor = provider.selection.campaigns?.find(
            (item) => item.id === entry.campaign.id,
          );
          const hero = descriptor?.heroAssetId;
          if (
            hero &&
            descriptor.assetIds.includes(hero) &&
            typeof provider.assetURL === 'function'
          ) {
            const image = element('img', 'edition-expedition-campaign-art');
            image.src = provider.assetURL(hero);
            image.alt = tr('campaignArtwork', {
              name: contentText(entry.campaign, 'name'),
              defaultValue: contentText(entry.campaign, 'name'),
            });
            image.loading = 'lazy';
            image.decoding = 'async';
            image.setAttribute('data-campaign-hero', hero);
            image.onerror = () => {
              image.hidden = true;
            };
            section.append(image);
          }
          const count = entry.missions.filter((mission) =>
            cleared(mission, profile, missionReward(mission, definitions, pinned)),
          ).length;
          section.append(
            element('h4', null, contentText(entry.campaign, 'name')),
            element('p', null, tr('missions', { completed: count, total: entry.missions.length })),
          );
          const ref = entry.campaign.discovery?.finaleRewardRef;
          const finale = definitions.find(
            (definition) =>
              definition.campaignId === entry.campaign.id &&
              definition.scope.kind === 'campaign' &&
              matchesRef(definition, ref, pinned),
          );
          if (finale) {
            const received = earned.has(finale.id),
              status = progress.get(finale.id),
              copy = local(finale);
            section.dataset.finaleEarned = String(received);
            section.append(
              element(
                'p',
                'edition-expedition-finale',
                tr(received ? 'finaleCollected' : 'finale', { title: copy.title }),
              ),
              element('p', 'edition-expedition-teaser', copy.teaser),
            );
            if (!received && finale.teaserImage) {
              const preview = element(
                'button',
                'button secondary',
                t('interface:completionRewards.previewTeaser'),
              );
              const target = element('div', 'completion-reward-exhibit-picture');
              preview.type = 'button';
              preview.setAttribute('data-expedition-teaser', finale.id);
              preview.onclick = () => {
                if (disposed || !dialog?.open) return;
                releaseTeaser();
                teaserTarget = target;
                const controller = new AbortController(),
                  visit = teaserVisit;
                teaserRequest = controller;
                void loadRewardImage({
                  container: target,
                  image: finale.teaserImage,
                  locale: getLocale(),
                  provider,
                  signal: controller.signal,
                  isCurrent: () => !disposed && dialog.open && visit === teaserVisit,
                  urls: teaserURLs,
                  URLImpl: win.URL,
                  inspect: true,
                  missingLabel: t('interface:completionRewards.missingTeaser'),
                });
              };
              section.append(preview, target);
            }
            if (!received && status)
              section.append(
                element(
                  'p',
                  'edition-expedition-requirements',
                  tr('requirements', { completed: status.completed, total: status.total }),
                ),
              );
          }
          return section;
        }),
    );
  }
  map.onclick = () => {
    if (!disposed && dialog?.open && !map.disabled) {
      layout = 'map';
      refresh(true);
    }
  };
  list.onclick = () => {
    if (!disposed && dialog?.open) {
      layout = 'list';
      refresh(true);
    }
  };
  next.onclick = () => {
    if (disposed || !dialog?.open) return;
    refresh();
    if (nextTarget?.isConnected && !nextTarget.disabled && cards.contains(nextTarget)) {
      nextTarget.focus({ preventScroll: true });
      nextTarget.scrollIntoView?.({ block: 'nearest', behavior: 'auto' });
    }
  };
  function requestRefresh(event) {
    if (disposed || queued || (event && !event.target?.closest?.('#journey-chooser'))) return;
    queued = true;
    queueMicrotask(() => {
      queued = false;
      refresh();
    });
  }
  for (const type of ['input', 'change', 'click']) doc.addEventListener(type, requestRefresh);
  const Observer = win.MutationObserver;
  const observer = typeof Observer === 'function' ? new Observer(() => requestRefresh()) : null;
  const chooserObserver =
    typeof Observer === 'function' ? new Observer(() => requestRefresh()) : null;
  observer?.observe(doc.body, { childList: true });
  const stopLocale = onLocaleChange(() => refresh(true));
  refresh();
  return {
    refresh,
    dispose() {
      disposed = true;
      releaseTeaser();
      dialog?.removeEventListener('close', releaseTeaser);
      observer?.disconnect();
      chooserObserver?.disconnect();
      stopLocale();
      for (const type of ['input', 'change', 'click'])
        doc.removeEventListener(type, requestRefresh);
      for (const [card, decoration] of decorations) {
        decoration.remove();
        for (const key of [
          'expeditionCleared',
          'expeditionCollected',
          'expeditionConnect',
          'expeditionLayout',
        ])
          delete card.dataset[key];
      }
      decorations.clear();
      if (filterState) filterState.element.open = filterState.open;
      cards?.style.setProperty('--expedition-scene', '');
      dialog?.classList.remove(
        'edition-expedition',
        'edition-expedition-map',
        'edition-expedition-list',
      );
      toolbar.remove();
    },
  };
}
