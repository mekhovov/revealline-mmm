import { journeyPictureCompletion } from '../journey/pictures.mjs';
import { t, localizedText, localizedAttribute, formatNumber } from '../i18n/index.mjs';
import { createJourneyArtworkView } from './journey-artwork.mjs';

/** Solo Journey pictures remain distinct from Legacy medals, recorded replays
 * and mission launches. The same exact ledger descriptors drive mission cards. */
export function attachJourneyCollection({
  document: doc = globalThis.document,
  getState,
  onPictureReady = () => null,
}) {
  const make = (tag, text, id) => {
    const node = doc.createElement(tag);
    if (text) node.textContent = text;
    if (id) node.id = id;
    return node;
  };
  const parent = doc.getElementById('collection-dialog');
  const section = make('section', '', 'journey-pictures');
  section.setAttribute('aria-labelledby', 'journey-pictures-title');
  const title = make('h3', '', 'journey-pictures-title');
  localizedText(title, () => t('interface:journeyPictures'));
  const status = make('p', '', 'journey-pictures-status');
  status.setAttribute('role', 'status');
  const grid = make('div', '', 'journey-picture-grid');
  grid.className = 'gallery-grid';
  const previous = make('button'),
    next = make('button');
  localizedText(previous, () => t('interface:journeyPictures.previous'));
  localizedText(next, () => t('interface:journeyPictures.more'));
  for (const button of [previous, next]) {
    button.type = 'button';
    button.className = 'button secondary';
  }
  const pager = make('nav');
  localizedAttribute(pager, 'aria-label', () => t('interface:journeyPictures.pages'));
  pager.append(previous, next);
  section.append(title, status, grid, pager);
  doc.getElementById('gallery-load-status').after(section);
  const classicTitle = make('h3');
  localizedText(classicTitle, () => t('interface:journeyPictures.classic'));
  section.after(classicTitle);
  const search = doc.getElementById('gallery-search');
  const viewer = make('dialog', '', 'journey-picture-viewer');
  viewer.className = 'wide-dialog';
  viewer.setAttribute('aria-labelledby', 'journey-picture-title');
  const viewTitle = make('h2', '', 'journey-picture-title'),
    canvas = make('canvas');
  canvas.width = 960;
  canvas.style.maxWidth = '100%';
  canvas.style.height = 'auto';
  canvas.setAttribute('role', 'img');
  const viewStatus = make('p', '', 'journey-picture-status');
  viewStatus.setAttribute('role', 'status');
  const retry = make('button', '', 'journey-picture-retry');
  const back = make('button', '', 'journey-picture-back');
  localizedText(retry, () => t('interface:journeyPictures.retryDownload'));
  localizedText(back, () => t('interface:backToCollection'));
  for (const button of [retry, back]) {
    button.type = 'button';
    button.className = 'button secondary';
  }
  const pictureActions = make('div');
  viewer.append(viewTitle, canvas, viewStatus, pictureActions, retry, back);
  doc.body.append(viewer);
  const artwork = createJourneyArtworkView({ canvas, status: viewStatus });
  let revision = 0,
    entries = [],
    page = 0,
    opener = null,
    selected = null;
  function closeViewer() {
    artwork.release();
    pictureActions.replaceChildren();
    selected = null;
    viewer.close();
    if (parent.open && opener?.isConnected && !doc.hidden && doc.hasFocus?.() !== false)
      opener.focus({ preventScroll: true });
  }
  back.onclick = closeViewer;
  viewer.addEventListener('close', () => artwork.release());
  viewer.addEventListener('cancel', (event) => {
    event.preventDefault();
    closeViewer();
  });
  async function show() {
    if (!selected || !viewer.open) return;
    // Retry is removed after a successful fetch. Move its focus to the
    // persistent Back action first so keyboard and controller users never
    // fall out of the modal when the transient control disappears.
    if (doc.activeElement === retry) back.focus({ preventScroll: true });
    retry.hidden = true;
    const record = selected;
    pictureActions.replaceChildren();
    const loaded = await artwork.show(record);
    if (viewer.open && selected === record) {
      retry.hidden = loaded;
      if (loaded) {
        const action = onPictureReady(record);
        if (action) pictureActions.append(action);
      }
      // The decoded image can increase the dialog height after Back received
      // focus. Keep that focus visible on short landscape screens.
      if (doc.activeElement === back)
        back.scrollIntoView?.({ block: 'nearest', inline: 'nearest' });
    }
  }
  retry.onclick = show;
  function render() {
    grid.replaceChildren();
    const query = (search.value || '').trim().toLocaleLowerCase();
    const matches = entries.filter((entry) =>
      `${entry.nameKey ? t(entry.nameKey) : entry.name} ${
        entry.campaignTitleKey ? t(entry.campaignTitleKey) : entry.campaignTitle
      }`
        .toLocaleLowerCase()
        .includes(query),
    );
    for (const entry of matches.slice(page * 12, page * 12 + 12)) {
      const card = make('article');
      card.className = 'gallery-card';
      card.dataset.missionId = entry.missionId;
      const entryTitle = make('h3'),
        entryCampaign = make('p');
      localizedText(entryTitle, () => (entry.nameKey ? t(entry.nameKey) : entry.name));
      localizedText(entryCampaign, () =>
        entry.campaignTitleKey ? t(entry.campaignTitleKey) : entry.campaignTitle,
      );
      card.append(entryTitle, entryCampaign);
      if (entry.record) {
        const button = make('button');
        localizedText(button, () => t('interface:journeyPictures.viewEarned'));
        button.type = 'button';
        button.className = 'button secondary';
        button.onclick = () => {
          opener = button;
          selected = entry.record;
          viewTitle.textContent = entry.name;
          canvas.setAttribute('aria-label', entry.record.asset.alt);
          viewer.showModal();
          back.focus();
          return show();
        };
        card.append(button);
      } else {
        const reason = make('p');
        localizedText(reason, () => (entry.reasonKey ? t(entry.reasonKey) : entry.reason));
        card.append(reason);
      }
      grid.append(card);
    }
    previous.disabled = page === 0;
    next.disabled = (page + 1) * 12 >= matches.length;
    pager.hidden = matches.length <= 12;
    localizedText(status, () => {
      const count = entries.filter((entry) => entry.record).length;
      return entries.length
        ? t('interface:journeyPictures.soloEarned', { count, formatted: formatNumber(count) })
        : t('interface:journeyPictures.completeSolo');
    });
  }
  search.addEventListener('input', () => {
    page = 0;
    render();
  });
  previous.onclick = () => {
    page--;
    render();
    next.focus();
  };
  next.onclick = () => {
    page++;
    render();
    previous.focus();
  };
  parent.addEventListener('close', () => {
    revision++;
    artwork.release();
  });
  return {
    async open() {
      const ticket = ++revision;
      localizedText(status, () => t('interface:journeyPictures.loading'));
      try {
        const { profile, catalog, editionId } = await getState();
        if (ticket !== revision || !parent.open) return;
        const state = profile.snapshot(),
          pictures = profile.pictures();
        entries = pictures.records
          .filter((record) => record.mode === 'solo')
          .map((record) => ({ ...record, record }));
        for (const mission of catalog.forMode('solo')) {
          const completion = journeyPictureCompletion({
            profile: state,
            pictures,
            mode: 'solo',
            editionId,
            missionId: mission.id,
          });
          if (completion.state === 'unavailable')
            entries.push({
              ...mission,
              missionId: mission.id,
              reason: completion.reason,
              reasonKey: completion.reasonKey,
            });
        }
        const known = new Set(catalog.forMode('solo').map((mission) => mission.id));
        for (const missionId of Object.keys(state.clears.solo))
          if (!known.has(missionId) && !entries.some((entry) => entry.missionId === missionId))
            entries.push({
              missionId,
              nameKey: 'interface:journeyPictures.earlierMission',
              campaignTitleKey: 'interface:journeyPictures.earlierEdition',
              reasonKey: 'interface:journeyPictures.reopenOriginalEdition',
            });
        page = Math.min(page, Math.max(0, Math.ceil(entries.length / 12) - 1));
        render();
      } catch (error) {
        if (ticket === revision && parent.open)
          localizedText(status, () =>
            t('interface:journeyPictures.collectionLoadFailed', { error: error.message }),
          );
      }
    },
  };
}
