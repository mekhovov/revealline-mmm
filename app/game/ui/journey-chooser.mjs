import { t, localizedText } from '../i18n/index.mjs';
import { attachJourneyBackup } from './journey-backup.mjs';
import { paintMissionThumbnail } from '../content-design/mission-card.mjs';
import { attachMissionLibraryChooser } from './mission-library-chooser.mjs';

/** One optional surface: global search and campaign filters, never a chapter drill-down. */
export function attachJourneyChooser({
  document: doc = globalThis.document,
  catalog,
  profile,
  mode = 'solo',
  onChoose,
  onPause,
  onReturn,
  getCard,
  library,
  readState,
  writeState,
  launchContext,
  getCurrentId,
  supportedModes,
  availableCollectionsOnly,
  goalPreferenceOptions,
  description,
}) {
  if (library) {
    const chooser = attachMissionLibraryChooser({
      document: doc,
      library,
      mode,
      onPause,
      onReturn,
      readState,
      writeState,
      launchContext,
      getCurrentId,
      supportedModes,
      availableCollectionsOnly,
      goalPreferenceOptions,
      description,
    });
    if (profile) {
      const button = doc.createElement('button');
      button.id = 'journey-backup-open';
      button.type = 'button';
      button.className = 'button secondary';
      localizedText(button, () => t('interface:progressBackup'));
      const backup = attachJourneyBackup({
        document: doc,
        profile,
        onRestore: () => chooser.refresh(),
      });
      button.onclick = () => backup.open(button);
      doc.getElementById('journey-chooser').querySelector('.journey-footer').append(button);
      return {
        ...chooser,
        destroy() {
          backup.close();
          chooser.destroy();
          doc.getElementById('journey-backup')?.remove();
        },
      };
    }
    return chooser;
  }
  const dialog = doc.createElement('dialog');
  dialog.id = 'journey-chooser';
  dialog.className = 'journey-chooser';
  dialog.setAttribute('aria-labelledby', 'journey-chooser-title');
  const heading = doc.createElement('h2');
  heading.id = 'journey-chooser-title';
  localizedText(heading, () => t('interface:findYourNextLine'));
  const copy = doc.createElement('p');
  localizedText(copy, () => t('interface:everyMissionInThisTestRouteIsSelectableChooseOne'));
  if (getCard)
    localizedText(copy, () =>
      t('interface:chooseAnyMissionStartingMapsLightGroundClosesCutsCross'),
    );
  const label = doc.createElement('label');
  localizedText(label, () => t('interface:searchAllMissions'));
  const search = doc.createElement('input');
  search.id = 'journey-search';
  search.type = 'search';
  search.placeholder = t('interface:missionOrCampaign');
  label.append(search);
  const filterLabel = doc.createElement('label');
  localizedText(filterLabel, () => t('interface:campaign'));
  const filter = doc.createElement('select');
  filter.id = 'journey-campaign';
  const option = (text, value) => {
    const node = doc.createElement('option');
    localizedText(node, () => text);
    node.value = value;
    return node;
  };
  // Composite ownership prevents identically named imported campaigns colliding.
  const campaigns = new Map();
  for (const mission of catalog.forMode(mode))
    campaigns.set(
      `${mission.source}/${mission.packId ?? '_base'}/${mission.campaignId}`,
      mission.campaignTitle,
    );
  filter.append(option(t('interface:allCampaigns'), ''));
  filter.append(...[...campaigns].map(([key, title]) => option(title, key)));
  filter.value = '';
  filterLabel.append(filter);
  const filters = doc.createElement('div');
  filters.className = 'journey-filters';
  filters.append(label, filterLabel);
  const status = doc.createElement('p');
  status.id = 'journey-chooser-status';
  status.setAttribute('role', 'status');
  const list = doc.createElement('div');
  list.className = 'journey-cards';
  list.id = 'journey-cards';
  const back = doc.createElement('button');
  back.type = 'button';
  back.id = 'journey-back';
  back.className = 'button secondary';
  localizedText(back, () => t('common:navigation.backToGame'));
  const footer = doc.createElement('div');
  footer.className = 'journey-footer';
  const backupButton = doc.createElement('button');
  backupButton.id = 'journey-backup-open';
  backupButton.type = 'button';
  backupButton.className = 'button secondary';
  localizedText(backupButton, () => t('interface:progressBackup'));
  footer.append(back, backupButton);
  dialog.append(heading, copy, filters, status, list, footer);
  doc.body.append(dialog);
  const backup = attachJourneyBackup({ document: doc, profile, onRestore: render });
  backupButton.onclick = () => backup.open(backupButton);
  let opener = null,
    selectedId = '';
  function primary() {
    const buttons = [...list.children].filter((button) => !button.disabled);
    const currentId = getCurrentId?.() ?? profile.snapshot().cursors?.[mode];
    return (
      buttons.find((button) => button.dataset.missionId === selectedId) ??
      buttons.find((button) => button.dataset.missionId === currentId) ??
      buttons[0] ??
      search
    );
  }
  function render() {
    const state = profile.snapshot();
    const matches = catalog
      .search(search.value || '', { mode })
      .filter(
        (mission) =>
          !filter.value ||
          `${mission.source}/${mission.packId ?? '_base'}/${mission.campaignId}` === filter.value,
      );
    localizedText(
      status,
      () =>
        `${matches.length} mission${matches.length === 1 ? '' : 's'} · ${mode === 'solo' ? t('interface:solo2') : mode}`,
    );
    list.replaceChildren(
      ...matches.map((mission) => {
        const button = doc.createElement('button');
        button.type = 'button';
        button.className = 'journey-card';
        button.dataset.missionId = mission.id;
        button.addEventListener('focusin', () => {
          selectedId = mission.id;
        });
        const number = doc.createElement('span');
        number.className = 'journey-card-number';
        localizedText(number, () => String(mission.levelIndex + 1).padStart(2, '0'));
        const name = doc.createElement('strong');
        localizedText(name, () => mission.name);
        const campaign = doc.createElement('span');
        localizedText(campaign, () => mission.campaignTitle);
        const progress = doc.createElement('span');
        progress.className = 'journey-card-progress';
        localizedText(progress, () =>
          Object.hasOwn(state.clears[mode], mission.id)
            ? t('interface:cleared')
            : state.skipped[mode].includes(mission.id)
              ? t('interface:skippedTryAgain')
              : t('interface:readyToPlay'),
        );
        button.append(number, name, campaign, progress);
        const card = getCard?.(mission);
        if (card) {
          button.classList.add('journey-card-illustrated');
          const preview = doc.createElement('canvas');
          preview.className = 'journey-card-map';
          preview.width = 288;
          preview.height = (288 * card.height) / card.width;
          preview.setAttribute('aria-hidden', 'true');
          try {
            const ctx = preview.getContext('2d');
            if (typeof ctx?.save === 'function') paintMissionThumbnail(ctx, card, preview.width);
            else preview.hidden = true;
          } catch {
            // An optional diagram cannot block mission selection or progress.
            preview.hidden = true;
          }
          const challenge = doc.createElement('span');
          challenge.className = 'journey-card-challenge';
          localizedText(
            challenge,
            () => `Band ${card.band}/12 · ${card.preset[0].toUpperCase()}${card.preset.slice(1)}`,
          );
          const route = doc.createElement('span');
          route.className = 'journey-card-route';
          localizedText(route, () => card.route);
          const mastery = doc.createElement('span');
          mastery.className = 'journey-card-mastery';
          localizedText(mastery, () => `Optional challenge: ${card.mastery}`);
          button.append(preview, challenge, route, mastery);
        }
        button.onclick = () => {
          selectedId = mission.id;
          dialog.close();
          void onChoose(mission);
        };
        return button;
      }),
    );
  }
  function close() {
    dialog.close();
    if (onReturn) onReturn(opener);
    else if (opener?.isConnected) opener.focus({ preventScroll: true });
  }
  search.addEventListener('input', render);
  filter.addEventListener('change', render);
  back.onclick = close;
  dialog.addEventListener('cancel', (event) => {
    if (event.target !== dialog) return;
    event.preventDefault();
    close();
  });
  return {
    primary,
    refresh() {
      if (!dialog.open) return;
      const missionId = doc.activeElement?.closest('.journey-card')?.dataset.missionId;
      render();
      if (missionId) primary().focus({ preventScroll: true });
    },
    open(origin = doc.activeElement, { returnLabel = t('common:navigation.backToGame') } = {}) {
      opener = origin;
      localizedText(back, () => returnLabel);
      onPause?.();
      render();
      dialog.showModal();
      const target = primary();
      target.focus({ preventScroll: true });
      if (target !== search) target.scrollIntoView?.({ block: 'nearest' });
    },
    close,
    destroy() {
      backup.close();
      dialog.close();
      doc.getElementById('journey-backup')?.remove();
      dialog.remove();
    },
  };
}
