import { localizedText, t } from '../i18n/index.mjs';
import { resolveEditionAssets } from '../editions/model.mjs';
import { mountEditionNavigation } from './edition-navigation.mjs';
import { mountEditionLessons } from './edition-lessons.mjs';
import { mountEditionMastery } from './edition-mastery.mjs';
import { mountEditionRewards } from './edition-rewards.mjs';
import { mountEditionExpedition } from './edition-expedition.mjs';
import { mountEditionPlayLayout } from './edition-play-layout.mjs';
import { editionDisplayName, mountLandingBrand } from './brand-identity.mjs';
import {
  prepareEditionOffline,
  verifyEditionOffline,
  selectPreparedEdition,
} from '../editions/offline-client.mjs';

/** Optional chrome around the ordinary Solo host. No simulation or mission
 * progression methods are exposed to this presentation owner. */
export async function mountEditionSoloUI({
  provider,
  document: doc,
  window: win,
  writer,
  version,
  pause,
  getRun,
  getRunId,
  getRecorder,
  getPictureVisible,
  getJourneyProfile,
  getJourneyRevision,
  getJourneyDurable,
  getReducedMotion,
  audioMaster,
  musicDucker,
  motionPreferences,
  onCosmeticBodiesChange,
  onChooseCosmetic,
  onRecoverCosmetic,
  report,
  onMissions,
  onEditionChange,
  getSavedPresentation = () => null,
  onPresentationChange,
  previewSession = null,
}) {
  const { selection, theme } = provider;
  let disposed = false;
  mountEditionNavigation({ provider, document: doc, href: win.location.href });
  const node = (tag, text) => {
    const value = doc.createElement(tag);
    if (text !== undefined) value.textContent = text;
    return value;
  };
  const copy = (tag, key, values) => {
    const element = node(tag);
    localizedText(element, () => t('interface:editionShell.' + key, values));
    return element;
  };
  const root = doc.documentElement;
  doc.body.dataset.brandId = selection.brand.id;
  doc.body.dataset.editionId = provider.editionId;
  for (const [key, value] of Object.entries(theme.palette))
    root.style.setProperty(`--brand-${key}`, value);
  if (selection.brand.fontAssetId && typeof win.FontFace === 'function') {
    const font = new win.FontFace(
      'Company Brand',
      `url("${provider.assetURL(selection.brand.fontAssetId)}")`,
    );
    doc.fonts.add(await font.load());
    root.style.setProperty('--brand-font', '"Company Brand", system-ui, sans-serif');
  }
  const currentEdition = (provider.currentCatalog ?? provider.catalog)?.editions?.find(
    (edition) => edition.id === provider.editionId,
  );
  const currentBrand = (provider.currentCatalog ?? provider.catalog)?.brands?.find(
    (brand) => brand.id === selection.brand.id,
  );
  const brandName = currentBrand?.name ?? selection.brand.name;
  // Current chrome may use a renamed mark around retained gameplay, but only
  // artwork admitted by that selected edition's receipt can be requested.
  const logoAsset = resolveEditionAssets(provider.catalog, { editionId: provider.editionId }).some(
    (asset) => asset.id === currentBrand?.logoAssetId,
  )
    ? currentBrand.logoAssetId
    : selection.brand.logoAssetId;
  const displayName = editionDisplayName(
    currentEdition?.name ?? selection.edition.name,
    provider.editionId,
  );
  doc.title = displayName;
  const color = doc.querySelector('meta[name="theme-color"]');
  if (color) color.content = theme.palette.ink;
  for (const id of ['shell-title', 'landing-title'])
    if (doc.getElementById(id))
      mountLandingBrand(doc.getElementById(id), { name: displayName, edition: true });
  for (const id of ['shell-title-edition', 'shell-edition'])
    if (doc.getElementById(id)) localizedText(doc.getElementById(id), () => brandName);
  const home = doc.getElementById('shell-home');
  const homeContent = home.querySelector('.home-content') ?? home;
  const editionMenu = doc.getElementById('shell-workshop-dialog') ?? homeContent;
  const titleEdition = doc.getElementById('shell-title-edition');
  if (titleEdition && selection.edition.name === selection.brand.name) titleEdition.hidden = true;
  const previewNotice = previewSession ? node('p') : null;
  if (previewNotice) {
    previewNotice.id = 'edition-studio-preview';
    previewNotice.className = 'completion-reward-save-note';
    previewNotice.setAttribute('role', 'status');
    localizedText(previewNotice, () => t('interface:studioPreview.sessionOnly'));
    (home.querySelector('.home-content') ?? home).prepend(previewNotice);
  }
  const droneAidLanding =
    provider.editionId === 'droneaid-nl-community' && home.classList.contains('native-landing');
  let disposeLandingWordmark = () => {};
  const iconAsset = selection.brand.iconAssetId ?? selection.brand.logoAssetId;
  if (iconAsset) {
    for (const rel of ['icon', 'apple-touch-icon']) {
      let icon = doc.querySelector(`link[rel="${rel}"]`);
      if (!icon && doc.head) {
        icon = node('link');
        icon.rel = rel;
        doc.head.append(icon);
      }
      if (icon) {
        icon.href = provider.assetURL(iconAsset);
        icon.removeAttribute('sizes');
      }
    }
  }
  const propeller = logoAsset === 'droneaid-nl-propeller';
  if (selection.brand.heroAssetId && !home.classList.contains('native-landing')) {
    const hero = node('img');
    hero.id = 'edition-home-art';
    hero.className = 'edition-home-art';
    hero.src = provider.assetURL(selection.brand.heroAssetId);
    hero.alt = '';
    home.prepend(hero);
  }
  if (logoAsset)
    for (const mark of doc.querySelectorAll('.brand-mark, #shell-menu .fpv-line-brand')) {
      const logo = node('img');
      logo.className = 'edition-brand-logo';
      // Compact in-game marks stay still; the landing owns the ambient motion.
      logo.src = provider.assetURL(logoAsset);
      logo.alt = brandName;
      if (mark.classList.contains('fpv-line-brand')) {
        mark.classList.remove('fpv-line-brand', 'fpv-line-brand--compact');
        mark.classList.add('edition-compact-logo');
      }
      mark.replaceChildren(logo);
    }
  if (droneAidLanding) {
    home.dataset.landingIdentity = 'droneaid';
    const title = doc.getElementById('shell-title');
    if (title) {
      const wordmark = node('img');
      wordmark.className = 'droneaid-landing-wordmark';
      wordmark.alt = '';
      wordmark.draggable = false;
      wordmark.decoding = 'async';
      wordmark.setAttribute('aria-hidden', 'true');
      title.dataset.wordmarkLoaded = 'false';
      const loaded = () => {
        if (!disposed) title.dataset.wordmarkLoaded = 'true';
      };
      const failed = () => {
        if (!disposed) title.dataset.wordmarkLoaded = 'false';
      };
      wordmark.addEventListener('load', loaded);
      wordmark.addEventListener('error', failed);
      wordmark.src = new URL('./art/menu-scenes/droneaid-wordmark-light.svg', import.meta.url).href;
      title.insertBefore(wordmark, title.firstChild);
      if (wordmark.complete && wordmark.naturalWidth > 0) loaded();
      disposeLandingWordmark = () => {
        wordmark.removeEventListener('load', loaded);
        wordmark.removeEventListener('error', failed);
        wordmark.remove();
        delete title.dataset.wordmarkLoaded;
        delete home.dataset.landingIdentity;
      };
    }
  } else if (logoAsset) {
    const logo = node('img');
    logo.className = 'edition-home-logo coupa-landing-logo';
    if (propeller) logo.classList.add('edition-propeller');
    logo.src = provider.assetURL(logoAsset);
    logo.alt = brandName;
    (home.querySelector('.home-content') ?? home).prepend(logo);
  }
  const picker = node('label'),
    pickerTitle = copy('span', 'chooseEdition'),
    select = node('select');
  picker.className = 'field edition-switcher';
  select.id = 'edition-select';
  const availableEditions = (provider.currentCatalog ?? provider.catalog).editions.filter(
    (edition) => edition.brandId === selection.brand.id,
  );
  for (const edition of availableEditions) {
    const option = node('option', edition.name);
    option.value = edition.id;
    select.append(option);
  }
  select.value = provider.editionId;
  select.disabled = availableEditions.length === 1;
  picker.append(pickerTitle, select);
  picker.hidden = availableEditions.length === 1;
  (doc.getElementById('settings-panel-content') ?? editionMenu).append(picker);
  select.onchange = () => {
    const requested = select.value;
    // This remains the active edition until the shared host has retained the
    // attempt and the player explicitly leaves. Stay/cancel needs no rollback.
    select.value = provider.editionId;
    if (
      requested === provider.editionId ||
      !availableEditions.some((edition) => edition.id === requested)
    )
      return false;
    return onEditionChange(requested, select);
  };
  let retainedPanel;
  if (provider.presentationHistory?.length) {
    const retained = node('details'),
      title = copy('summary', 'originalArt'),
      choice = node('select'),
      label = node('label');
    label.append(copy('span', 'snapshot'));
    retained.className = 'edition-about';
    retainedPanel = retained;
    choice.id = 'edition-presentation-select';
    const current = copy('option', 'currentArt');
    current.value = '';
    choice.append(current);
    for (const record of provider.presentationHistory) {
      const option = copy('option', 'retainedOriginal', { revision: record.id.slice(0, 12) });
      option.value = record.id;
      choice.append(option);
    }
    choice.value = provider.retainedPresentationId ?? '';
    choice.onchange = () => {
      const requested = choice.value || null;
      choice.value = provider.retainedPresentationId ?? '';
      return onPresentationChange(requested, choice);
    };
    label.append(choice);
    retained.append(title, copy('p', 'recoveryExplanation'), label);
    const saved = getSavedPresentation();
    if (
      saved !== provider.authoredPresentationSha256 &&
      provider.presentationHistory.some((item) => item.id === saved)
    ) {
      const recover = copy('button', 'recoverSaved');
      recover.type = 'button';
      recover.id = 'edition-recover-presentation';
      recover.className = 'button secondary';
      recover.onclick = () => onPresentationChange(saved, recover);
      retained.append(recover);
      retained.open = true;
    }
    if (provider.retainedPresentationId)
      retained.append(
        copy('p', 'retainedExplanation', {
          revision: provider.retainedPresentationId.slice(0, 12),
        }),
      );
    // A known saved-flight mismatch remains immediately reachable at home.
    (retained.open
      ? homeContent
      : (doc.getElementById('settings-panel-data') ?? editionMenu)
    ).append(retained);
  }
  const about = node('details'),
    aboutTitle = copy('summary', 'about');
  about.className = 'edition-about';
  about.append(aboutTitle, node('p', selection.brand.description), copy('p', 'learningContext'));
  for (const source of new Map(
    [
      ...(selection.brand.sources ?? []),
      ...provider.lessons.flatMap((lesson) => lesson.sources),
    ].map((item) => [item.url, item]),
  ).values()) {
    const link = node('a', source.title);
    link.href = source.url;
    link.target = '_blank';
    link.rel = 'noopener noreferrer';
    const p = node('p');
    p.append(link);
    about.append(p);
  }
  (doc.getElementById('settings-panel-extras') ?? editionMenu).append(about);
  // Mode controls stay on the common template, but this delivery contains only
  // Solo. The mission library itself derives availability from selected sources.
  for (const id of [
    'shell-mode-choice',
    'shell-team',
    'shell-versus',
    'shell-title-team',
    'shell-title-versus',
  ])
    if (doc.getElementById(id)) doc.getElementById(id).hidden = true;
  const actorStyle = doc.getElementById('menu-actor-style');
  if (actorStyle) {
    actorStyle.value = 'campaign';
    for (const option of actorStyle.options) option.disabled = option.value !== 'campaign';
  }
  if (doc.getElementById('menu-actor-note'))
    localizedText(doc.getElementById('menu-actor-note'), () =>
      t('interface:editionShell.sharedRules'),
    );
  const worlds = doc.getElementById('shell-worlds');
  if (worlds) {
    worlds.hidden = false;
    worlds.onclick = () => {
      pause();
      onMissions(worlds);
    };
  }
  // Keep the ordinary Solo actions reachable in the brief/pause/result area.
  // Move their existing nodes so their confirmation state and host handlers
  // remain canonical, without crowding the full-viewport flight HUD.
  if (!doc.body.classList.contains('first-flight-session')) {
    const flightActions = doc.getElementById('game-overlay').querySelector('.overlay-actions');
    for (const id of ['journey-skip', 'demo-button']) {
      const action = doc.getElementById(id);
      action.classList.add('button', 'secondary');
      flightActions.append(action);
    }
  }
  const layout = mountEditionPlayLayout({ document: doc, window: win });
  const lessons = await mountEditionLessons({
    provider,
    document: doc,
    window: win,
    writer,
    getRun,
    getRecorder,
    getPictureVisible,
    report,
    previewSession,
  });
  const mastery = await mountEditionMastery({
    provider,
    document: doc,
    window: win,
    writer,
    getRun,
    getRunId,
    getRecorder,
    getJourneyProfile,
    getJourneyRevision,
    getJourneyDurable,
    previewSession,
    report,
  });
  const rewards = await mountEditionRewards({
    provider,
    document: doc,
    window: win,
    writer,
    pause,
    getRun,
    getJourneyProfile,
    getJourneyRevision,
    getJourneyDurable,
    getLearningEvidence: lessons.rewardEvidence,
    getMasteryEvidence: mastery.rewardEvidence,
    motionPreferences,
    onCosmeticBodiesChange,
    onChooseCosmetic,
    onRecoverCosmetic,
    getReducedMotion,
    audioMaster,
    musicDucker,
    previewSession,
  });
  const stopLearningRewards = lessons.onRewardEvidenceChange(() => rewards.refresh());
  const stopMasteryRewards = mastery.onRewardEvidenceChange(() => rewards.refresh());
  const expedition = mountEditionExpedition({
    provider,
    document: doc,
    window: win,
    getJourneyProfile,
    getJourneyRevision,
    getRewards: () => rewards.snapshot?.(),
  });
  const legacy = node('section');
  try {
    const raw = (previewSession?.storage ?? win.localStorage ?? globalThis.localStorage).getItem(
      provider.legacySessionKey,
    );
    if (raw) {
      const legacyHeading = node('h3'),
        legacyExplanation = node('p');
      localizedText(legacyHeading, () => t('interface:editionSolo.legacyHeading'));
      localizedText(legacyExplanation, () => t('interface:editionSolo.legacyExplanation'));
      legacy.append(legacyHeading, legacyExplanation);
      const exportOld = node('button');
      localizedText(exportOld, () => t('interface:editionSolo.exportLegacy'));
      exportOld.type = 'button';
      exportOld.className = 'button secondary';
      exportOld.onclick = () => {
        const url = URL.createObjectURL(new Blob([raw], { type: 'application/json' }));
        const link = node('a');
        link.href = url;
        link.download = `${provider.editionId}-earlier-preview.json`;
        link.click();
        win.setTimeout(() => URL.revokeObjectURL(url), 1000);
      };
      legacy.append(exportOld);
      doc.getElementById('settings-panel-data').append(legacy);
    }
  } catch {
    report(t('errors:editionSolo.legacyStorageUnreadable'));
  }
  const offline = node('section');
  offline.className = 'edition-offline';
  if (false) { // Dedicated web app does not publish the upstream edition launcher.
    const prepare = node('button'),
      install = node('button'),
      status = node('p');
    localizedText(prepare, () => t('interface:editionSolo.prepareOffline'));
    localizedText(install, () => t('interface:downloads.useEdition'));
    prepare.type = install.type = 'button';
    prepare.className = install.className = 'button secondary';
    install.disabled = true;
    status.setAttribute('role', 'status');
    prepare.onclick = async () => {
      pause();
      prepare.disabled = true;
      install.disabled = true;
      try {
        const checked = await prepareEditionOffline({
          editionId: provider.editionId,
          version,
          onStatus: (value) => {
            if (!disposed)
              localizedText(status, () =>
                value.status === 'downloading'
                  ? t('interface:editionSolo.downloading')
                  : t('interface:editionSolo.verifying'),
              );
          },
        });
        if (disposed) return;
        if (checked.status === 'waiting') {
          localizedText(status, () => t('interface:editionSolo.activateCheckedUpdate'));
          return;
        }
        await verifyEditionOffline({ editionId: provider.editionId, version });
        if (disposed) return;
        localizedText(status, () => t('interface:editionSolo.offlineVerified'));
        install.disabled = false;
      } catch (error) {
        if (!disposed) localizedText(status, error.message);
      } finally {
        if (!disposed) prepare.disabled = false;
      }
    };
    install.onclick = async () => {
      install.disabled = true;
      try {
        await selectPreparedEdition({ editionId: provider.editionId, version });
        if (!disposed) localizedText(status, () => t('interface:downloads.activationReady'));
      } catch (error) {
        if (!disposed) localizedText(status, error.message);
      } finally {
        if (!disposed) install.disabled = false;
      }
    };
    offline.append(prepare, install, status);
    (
      doc.getElementById('settings-panel-content') ?? doc.getElementById('settings-panel-data')
    ).append(offline);
  }
  return {
    refresh() {
      lessons.refresh();
      mastery.refresh();
      rewards.refresh();
      expedition.refresh();
    },
    pictureReady: lessons.pictureReady,
    cosmeticBodies: rewards.cosmeticBodies,
    closeResultDetails: rewards.closeResultDetails,
    dispose() {
      if (disposed) return;
      disposed = true;
      stopLearningRewards();
      stopMasteryRewards();
      disposeLandingWordmark();
      lessons.dispose();
      mastery.dispose();
      rewards.dispose();
      expedition.dispose();
      typeof layout === 'function' ? layout() : layout.disconnect?.();
      picker.remove();
      about.remove();
      retainedPanel?.remove();
      offline.remove();
      legacy.remove();
      previewNotice?.remove();
    },
  };
}
