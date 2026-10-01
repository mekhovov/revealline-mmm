import { rewardPresentationItems } from '../rewards/audio-groups.mjs';
import { mountRewardAudioGroup } from './reward-audio-group.mjs';
import { loadRewardImage } from './reward-image.mjs';
import { mountRewardCosmetic } from './reward-cosmetic.mjs';
import {
  createRewardCosmeticRegistry,
  projectEarnedRewardCosmetics,
} from '../rewards/cosmetics.mjs';
import { resolveEditionAssets } from '../editions/model.mjs';
import { mountRewardKnowledge } from './reward-knowledge.mjs';
import { getLocale, onLocaleChange, t } from '../i18n/index.mjs';
import { required } from '../data-json.mjs';
import { createRewardMissionBindings } from '../rewards/bindings.mjs';
import { rewardContext } from '../rewards/context.mjs';
import { createRewardBackend, createRewardStore } from '../rewards/store.mjs';
import { verifyEditionAssets } from '../editions/assets.mjs';
import { resolveRewardAsset } from '../rewards/media.mjs';
import { createPrintableReward } from '../rewards/printable.mjs';
import { mountDiscoveryExploration } from './discovery-exploration.mjs';
import { mountRewardMedia } from './reward-media.mjs';
import { mountRewardQr } from './reward-qr.mjs';
import { projectRewardExhibits } from '../rewards/exhibit.mjs';
import { contentText } from '../i18n/content.mjs';
import { EMPTY_MASTERY_EVIDENCE } from './edition-mastery.mjs';
import { createEarnedResultLayout } from './earned-result-layout.mjs';

const EMPTY_LEARNING = Object.freeze({
  revision: 0,
  learning: Object.freeze([]),
  durableLearning: Object.freeze([]),
});

/** A presentation of accepted Journey evidence. No simulation, completion,
 * mission launch or scoring authority is passed into this view. */
export async function mountEditionRewards({
  provider,
  document: doc,
  window: win,
  writer,
  previewSession = null,
  pause,
  getRun,
  getJourneyProfile,
  getJourneyRevision,
  getJourneyDurable,
  getLearningEvidence = () => EMPTY_LEARNING,
  getMasteryEvidence = () => EMPTY_MASTERY_EVIDENCE,
  getReducedMotion = () => false,
  audioMaster,
  musicDucker,
  motionPreferences,
  onCosmeticBodiesChange = () => {},
  onChooseCosmetic = null,
  onRecoverCosmetic = null,
}) {
  if (!provider.rewards?.length)
    return {
      refresh() {},
      snapshot: () => ({ state: null, progress: [] }),
      cosmeticBodies: () => [],
      dispose() {},
    };
  const tr = (key, values) => t(`interface:completionRewards.${key}`, values);
  const localized = (value) => value.locales[getLocale()] ?? value.locales.en;
  const node = (tag, text, className) => {
    const element = doc.createElement(tag);
    if (text !== undefined) element.textContent = text;
    if (className) element.className = className;
    return element;
  };
  const button = (text, action) => {
    const value = node('button', text, 'button secondary');
    value.type = 'button';
    value.onclick = action;
    return value;
  };
  const link = (title, url) => {
    const value = node('a', title);
    value.href = url;
    value.target = '_blank';
    value.rel = 'noopener noreferrer';
    return value;
  };
  const bindings = createRewardMissionBindings(provider.route.source);
  const cosmeticRegistry = createRewardCosmeticRegistry({
    presets: provider.bootstrap?.boot?.presets,
    themes: provider.bootstrap?.boot?.themes?.themes ?? [],
    assets: provider.bootstrap
      ? resolveEditionAssets(provider.bootstrap.catalog, { editionId: provider.editionId })
      : [],
    publication: provider.selection.edition.publication,
  });
  let cosmeticState = null,
    cosmeticProjection = { available: [], unavailable: [] },
    cosmeticKey = '';
  const updateCosmetics = () => {
    if (cosmeticState === state) return;
    cosmeticState = state;
    cosmeticProjection = projectEarnedRewardCosmetics(state, {
      registry: cosmeticRegistry,
      editionId: provider.editionId,
      brandId: provider.selection.brand.id,
      campaignIds: provider.selection.edition.campaignIds,
    });
    const key = cosmeticProjection.available
      .map((item) => item.recipeId + '@' + item.recipeRevision)
      .join('/');
    if (key !== cosmeticKey) {
      cosmeticKey = key;
      onCosmeticBodiesChange();
    }
  };
  let disposed = false,
    dirty = true,
    revision,
    learningRevision,
    masteryRevision,
    durable,
    lastRun,
    lastKind,
    lastMotion;
  let context,
    progress = [],
    state,
    viewing = null,
    opener = null,
    mediaVisit = 0;
  let mediaRequest = null;
  const objectURLs = new Set(),
    explorations = new Set(),
    played = new WeakSet(),
    celebrated = new WeakSet();
  const result = node('section', undefined, 'completion-reward-result');
  result.id = 'completion-reward-result';
  result.hidden = true;
  const resultReading = doc.getElementById('overlay-reading');
  const resultDetails = node('section', undefined, 'completion-reward-result-details');
  resultDetails.id = 'completion-reward-result-details';
  resultDetails.hidden = true;
  resultReading.append(result, resultDetails);
  const resultLayout = createEarnedResultLayout({ document: doc, reading: resultReading, result });
  const shelf = node('section', undefined, 'completion-reward-shelf');
  shelf.id = 'completion-reward-shelf';
  const pictureCollection = doc.getElementById('journey-pictures');
  if (pictureCollection) pictureCollection.before(shelf);
  else doc.getElementById('collection-dialog').append(shelf);
  const dialog = node('dialog', undefined, 'completion-reward-dialog');
  dialog.id = 'completion-reward-dialog';
  dialog.setAttribute('aria-labelledby', 'completion-reward-title');
  const reading = node('div');
  reading.setAttribute('data-game-reading', '');
  reading.tabIndex = 0;
  const closeButton = button('', () => dialog.close());
  dialog.append(reading, closeButton);
  doc.body.append(dialog);
  const data = node('section', undefined, 'completion-reward-data');
  const status = node('p');
  status.id = 'completion-reward-save-status';
  status.setAttribute('role', 'status');
  status.setAttribute('aria-live', 'polite');
  status.setAttribute('aria-atomic', 'true');
  const importStatus = node('p');
  importStatus.id = 'completion-reward-import-status';
  importStatus.setAttribute('role', 'status');
  importStatus.hidden = true;
  const dataTitle = node('h3'),
    dataNote = node('p'),
    exportButton = button('', download);
  const retrySave = button('', async () => {
    retrySave.disabled = true;
    await store.flush();
    if (!disposed) {
      dirty = true;
      refresh();
    }
  });
  retrySave.id = 'completion-reward-retry-save';
  const importLabel = node('label'),
    upload = node('input'),
    labelText = node('span');
  upload.type = 'file';
  upload.accept = 'application/json,.json';
  importLabel.append(labelText, upload);
  data.append(dataTitle, dataNote, exportButton, retrySave, importLabel, status, importStatus);
  if (previewSession) {
    exportButton.hidden = true;
    retrySave.hidden = true;
    importLabel.hidden = true;
  }
  doc.getElementById('settings-panel-data').append(data);
  const store = createRewardStore({
    editionId: provider.editionId,
    backend: createRewardBackend({
      editionId: provider.editionId,
      indexedDB: previewSession ? null : win.indexedDB,
      canWrite: () => writer.writable,
    }),
    onStatus: () => {
      dirty = true;
    },
  });
  await store.load();

  function releaseMedia() {
    mediaVisit++;
    mediaRequest?.abort();
    mediaRequest = null;
    for (const exploration of explorations) exploration.dispose();
    explorations.clear();
    for (const url of objectURLs) win.URL.revokeObjectURL(url);
    objectURLs.clear();
  }
  function saveStatus() {
    const saved = store.status();
    status.textContent = tr(
      saved.deferred
        ? saved.deferred.importSaved
          ? 'capacityImported'
          : 'capacityLocal'
        : saved.pending
          ? 'saving'
          : saved.durable
            ? 'saved'
            : 'sessionOnly',
    );
    status.dataset.durable = String(saved.durable);
    status.dataset.pending = String(saved.pending === true);
    retrySave.textContent = t('interface:retrySave');
    retrySave.disabled = saved.durable || saved.pending;
    renderImportStatus();
  }
  function download() {
    if (previewSession) return;
    const url = win.URL.createObjectURL(new Blob([store.export()], { type: 'application/json' }));
    const anchor = node('a');
    anchor.href = url;
    anchor.download = `${provider.editionId}-discoveries.v1.json`;
    anchor.click();
    win.setTimeout(() => win.URL.revokeObjectURL(url), 1000);
  }
  let importVisit = 0,
    importIssue = null;
  function renderImportStatus() {
    importStatus.hidden = !importIssue;
    importStatus.textContent = !importIssue
      ? ''
      : importIssue.kind === 'conflict'
        ? tr('importConflict')
        : `${tr('importFailed')} ${importIssue.message}`;
  }
  upload.onchange = async () => {
    if (previewSession) return;
    const visit = ++importVisit;
    importIssue = null;
    renderImportStatus();
    try {
      const file = upload.files?.[0];
      if (!file) return;
      required(file.size <= 16 * 1024 * 1024, tr('tooLarge'));
      const text = await file.text();
      if (disposed || visit !== importVisit) return;
      await store.restore(JSON.parse(text));
      if (!disposed && visit === importVisit) {
        revision = undefined;
        dirty = true;
        refresh();
      }
    } catch (error) {
      if (!disposed && visit === importVisit) {
        importIssue =
          error.code === 'REWARD_IMPORT_CONFLICT'
            ? { kind: 'conflict' }
            : { kind: 'failure', message: error.message };
        renderImportStatus();
      }
    } finally {
      if (!disposed && visit === importVisit) upload.value = '';
    }
  };
  function count(definition) {
    const item = progress.find((entry) => entry.rewardId === definition.id);
    return tr('progress', {
      completed: item?.completed ?? 0,
      total: item?.total ?? definition.requirements.missions.length,
    });
  }
  function earned(id) {
    return state.receipts.find((receipt) => receipt.definition.id === id);
  }
  function exploreButton(receipt, surface, label = 'explore') {
    const open = button(tr(label), () => openReward(receipt, open));
    open.dataset.rewardId = receipt.definition.id;
    open.dataset.rewardSurface = surface;
    return open;
  }
  function restoreFocus(previous) {
    if (
      ['completion-reward-exhibit-select', 'completion-reward-exhibit-pictures'].includes(
        previous?.id,
      )
    ) {
      doc.getElementById(previous.id)?.focus({ preventScroll: true });
      return;
    }
    if (!previous?.dataset.rewardId) return;
    const replacement = doc.querySelector(
      `[data-reward-id="${previous.dataset.rewardId}"][data-reward-surface="${previous.dataset.rewardSurface}"]`,
    );
    replacement?.focus({ preventScroll: true });
  }
  function availableDefinitions() {
    return state.promises.filter((definition) =>
      context.campaignIds.includes(definition.campaignId),
    );
  }
  function saveNotice() {
    const deferred = store.status().deferred;
    const note = node(
      'p',
      tr(deferred ? (deferred.importSaved ? 'capacityImported' : 'capacityLocal') : 'sessionOnly'),
      'completion-reward-save-note',
    );
    note.setAttribute('role', 'status');
    note.setAttribute('aria-live', 'polite');
    note.setAttribute('aria-atomic', 'true');
    return note;
  }
  let shelfContentKey = null;
  let shelfCampaign = null,
    showPictures = false,
    shelfVisit = 0,
    shelfRequest = null;
  const shelfURLs = new Set();
  function releaseShelfPictures() {
    shelfVisit++;
    shelfRequest?.abort();
    shelfRequest = null;
    for (const url of shelfURLs) win.URL.revokeObjectURL(url);
    shelfURLs.clear();
  }
  function renderShelf() {
    const focused = shelf.contains(doc.activeElement) ? doc.activeElement : null;
    const title = node('h3', tr('collection'));
    const exhibits = projectRewardExhibits({
      campaigns: provider.route.source.campaigns.filter((campaign) =>
        context.campaignIds.includes(campaign.id),
      ),
      definitions: availableDefinitions(),
      receipts: state.receipts,
      progress,
    });
    if (!exhibits.some((item) => item.campaign.id === shelfCampaign))
      shelfCampaign = exhibits[0]?.campaign.id ?? null;
    const exhibit = exhibits.find((item) => item.campaign.id === shelfCampaign);
    const contentKey = JSON.stringify([
      shelfCampaign,
      showPictures,
      getLocale(),
      state.promises.map(({ id, revision }) => [id, revision]),
      state.receipts.map(({ definition }) => [definition.id, definition.revision]),
      progress.map(({ rewardId, completed, total }) => [rewardId, completed, total]),
    ]);
    if (shelfContentKey === contentKey) {
      syncShelfSaveNote();
      return;
    }
    shelfContentKey = contentKey;
    releaseShelfPictures();
    const controls = node('div', undefined, 'completion-reward-exhibit-controls');
    const label = node('label', tr('chooseExhibit'));
    const select = node('select');
    select.id = 'completion-reward-exhibit-select';
    for (const item of exhibits) {
      const option = node('option', contentText(item.campaign, 'name'));
      option.value = item.campaign.id;
      select.append(option);
    }
    select.value = shelfCampaign ?? '';
    select.onchange = () => {
      shelfCampaign = select.value;
      renderShelf();
      selectExhibitFocus();
    };
    label.append(select);
    controls.append(label);
    const pictures = button(
      tr(showPictures ? 'hideDiscoveryPictures' : 'showDiscoveryPictures'),
      () => {
        showPictures = !showPictures;
        renderShelf();
        doc.getElementById('completion-reward-exhibit-pictures')?.focus({ preventScroll: true });
      },
    );
    pictures.id = 'completion-reward-exhibit-pictures';
    pictures.setAttribute('aria-pressed', String(showPictures));
    controls.append(pictures);
    const grid = node('div', undefined, 'completion-reward-grid completion-reward-exhibit');
    grid.dataset.layout = exhibit?.layout ?? 'route';
    const imageJobs = [];
    for (const row of exhibit?.rows ?? []) {
      const receipt = row.receipt,
        copy = localized(row);
      const card = node('article', undefined, 'completion-reward-card');
      card.dataset.earned = String(!!receipt);
      card.dataset.rewardId = row.id;
      card.dataset.scope = row.scope.kind;
      const number = node(
        'span',
        row.scope.kind === 'mission' ? String(row.order + 1).padStart(2, '0') : '✦',
        'completion-reward-piece',
      );
      number.setAttribute('aria-hidden', 'true');
      card.append(
        number,
        node(
          'p',
          tr(row.scope.kind === 'campaign' ? 'campaignFinale' : receipt ? 'collected' : 'promise'),
          'completion-reward-eyebrow',
        ),
        node('h4', copy.title),
      );
      // Locked cards can request only separately authored teaser art. The
      // explicit toggle bounds work to twelve pictures in the selected exhibit.
      const picture = receipt ? row.image : row.teaserImage;
      if (showPictures && picture && imageJobs.length < 12) {
        const image = node('div', undefined, 'completion-reward-exhibit-picture');
        card.append(image);
        imageJobs.push({ payload: picture, container: image, teaser: !receipt });
      }
      card.append(
        node('p', copy.teaser),
        node(
          'p',
          receipt
            ? tr('collected')
            : tr('progress', {
                completed: row.progress?.completed ?? 0,
                total: row.progress?.total ?? 1,
              }),
        ),
      );
      if (receipt) card.append(exploreButton(receipt, 'collection'));
      grid.append(card);
    }
    shelf.replaceChildren(title, controls);
    if (exhibit)
      shelf.append(
        node(
          'p',
          tr('exhibitCollected', {
            collected: exhibit.collected,
            total: exhibit.total,
          }),
        ),
      );
    shelf.append(grid);
    syncShelfSaveNote();
    restoreFocus(focused);
    if (imageJobs.length) {
      const visit = shelfVisit,
        controller = new AbortController();
      shelfRequest = controller;
      const owner = { urls: shelfURLs, current: () => shelfVisit };
      // Two requests at a time keep decoding away from a burst of full-size art.
      const work = async () => {
        while (imageJobs.length && !controller.signal.aborted) {
          const job = imageJobs.shift();
          await loadImage(
            job.payload,
            job.container,
            controller.signal,
            visit,
            owner,
            false,
            job.teaser,
          );
        }
      };
      void Promise.all([work(), work()]);
    }
  }
  function syncShelfSaveNote() {
    doc.getElementById('completion-reward-exhibit-save-note')?.remove();
    if (
      (state.receipts.length || store.status().deferred) &&
      !store.status().durable &&
      !store.status().pending
    ) {
      const notice = saveNotice();
      notice.id = 'completion-reward-exhibit-save-note';
      shelf.append(notice);
    }
  }
  function selectExhibitFocus() {
    doc.getElementById('completion-reward-exhibit-select')?.focus({ preventScroll: true });
  }
  let resultImageRequest = null,
    resultImageVisit = 0;
  const resultImageURLs = new Set();
  function releaseResultImage() {
    resultImageVisit++;
    resultImageRequest?.abort();
    resultImageRequest = null;
    for (const url of resultImageURLs) win.URL.revokeObjectURL(url);
    resultImageURLs.clear();
  }
  function renderResult(animate = false) {
    releaseResultImage();
    const focused = result.contains(doc.activeElement) ? doc.activeElement : null;
    const run = getRun(),
      kind = doc.getElementById('game-overlay').dataset.kind;
    const definition = availableDefinitions().find(
      (item) => item.scope.kind === 'mission' && item.scope.id === run?.levelId,
    );
    result.hidden = !definition || !['ready', 'won', 'campaign-complete'].includes(kind);
    resultDetails.hidden = true;
    resultDetails.replaceChildren();
    if (result.hidden) {
      result.replaceChildren();
      return;
    }
    const receipt = earned(definition.id),
      copy = localized(definition);
    const won = run?.status === 'won' && !!receipt;
    result.dataset.placement = won ? 'summary' : 'reading';
    // Earned actions stay outside variable-length result prose. Ready promises
    // retain the existing reading surface and optional teaser-image controls.
    const resultParent = won ? resultReading.parentElement : resultReading;
    if (result.parentElement !== resultParent) {
      if (won) resultReading.after(result);
      else resultReading.append(result);
    }
    if (animate && won && !getReducedMotion()) result.classList.add('completion-reward-arrive');
    else if (!won || getReducedMotion() || lastRun !== run)
      result.classList.remove('completion-reward-arrive');
    result.dataset.reducedMotion = String(getReducedMotion());
    const firstWin = won && celebrated.has(run);
    const title = node('h3', won ? tr(firstWin ? 'discovery' : 'collected') : tr('promise'));
    const content = node('p', copy.title);
    const discovery = won
      ? receipt.definition.payloads.find((item) => item.type === 'knowledge')
      : null;
    const summary = node('div', undefined, 'completion-reward-result-copy');
    const actions = node('div', undefined, 'completion-reward-result-actions');
    if (won) {
      summary.append(title, content);
      result.replaceChildren(summary, actions);
    } else result.replaceChildren(title, content);
    if (!won || firstWin)
      (won ? resultDetails : result).append(
        node('p', discovery ? localized(discovery).paragraphs[0] : copy.teaser),
      );
    if (!won && kind === 'ready' && definition.teaserImage) {
      const target = node('div', undefined, 'completion-reward-exhibit-picture');
      const preview = button(tr('previewTeaser'), () => {
        if (disposed || resultImageRequest) return;
        preview.disabled = true;
        const controller = new AbortController(),
          visit = resultImageVisit;
        resultImageRequest = controller;
        void loadImage(
          definition.teaserImage,
          target,
          controller.signal,
          visit,
          { urls: resultImageURLs, current: () => resultImageVisit },
          false,
          true,
        );
      });
      preview.id = 'completion-reward-preview-teaser';
      result.append(preview, target);
    }
    if (won) {
      actions.append(exploreButton(receipt, 'result'));
      const saved = store.status();
      if (!saved.durable) {
        const compact = node(
          'p',
          tr(saved.deferred ? 'capacityShort' : saved.pending ? 'saving' : 'sessionOnlyShort'),
          'completion-reward-session-status',
        );
        compact.setAttribute('role', 'status');
        compact.dataset.pending = String(saved.pending === true);
        summary.append(compact);
        if (!saved.pending) result.append(saveNotice());
      }
    }
    const finale = availableDefinitions().find(
      (item) => item.campaignId === definition.campaignId && item.scope.kind === 'campaign',
    );
    if (finale) {
      const finaleReceipt = earned(finale.id);
      (won ? resultDetails : result).append(
        node(
          'p',
          `${localized(finale).title} · ${finaleReceipt ? tr('collected') : count(finale)}`,
          'completion-reward-finale',
        ),
      );
      if (finaleReceipt && won) {
        actions.append(exploreButton(finaleReceipt, 'result-finale', 'exhibit'));
      }
    }
    resultDetails.hidden = resultDetails.children.length === 0;
    restoreFocus(focused);
  }
  async function loadImage(
    payload,
    container,
    signal,
    visit,
    owner = { urls: objectURLs, current: () => mediaVisit },
    downloadable = true,
    teaser = false,
  ) {
    return loadRewardImage({
      container,
      image: payload,
      locale: getLocale(),
      provider,
      signal,
      isCurrent: () => !disposed && visit === owner.current(),
      urls: owner.urls,
      URLImpl: win.URL,
      downloadLabel: downloadable ? tr('saveImage') : null,
      missingLabel: tr(teaser ? 'missingTeaser' : 'missingMedia'),
      inspect: teaser,
    });
  }

  let readingProfile = 'beginners';
  function retainReadingFocus() {
    const previous = doc.activeElement;
    if (!dialog.open || !reading.contains(previous)) return () => {};
    const item = previous.closest('[data-reward-item]')?.getAttribute('data-reward-item');
    const keys = [
      'data-learning-profile',
      'data-card-id',
      'data-prediction-id',
      'data-choice-id',
      'data-diagram-card',
      'data-exploration-action',
      'data-reward-media-action',
      'data-cosmetic-action',
      'data-playlist-track',
      'data-playlist-action',
    ].filter((key) => previous.hasAttribute(key));
    const attributes = keys.map((key) => [key, previous.getAttribute(key)]);
    const href = previous.tagName === 'A' ? previous.href : null;
    return () => {
      // Locale rendering replaces controls. Match their semantic identity within
      // the same payload, never translated text or a changing child position.
      const target = [...reading.querySelectorAll('button,select,a,summary')].find((candidate) => {
        if (
          candidate.disabled ||
          candidate.closest('[hidden],[inert]') ||
          !candidate.getClientRects().length ||
          candidate.tagName !== previous.tagName
        )
          return false;
        if (previous.id) return candidate.id === previous.id;
        if (
          !item ||
          candidate.closest('[data-reward-item]')?.getAttribute('data-reward-item') !== item
        )
          return false;
        // Diagram hotspots await their raster. The equivalent list remains
        // available immediately, so asynchronous media never strands focus.
        if (previous.hasAttribute('data-diagram-card'))
          return (
            candidate.getAttribute('data-card-id') === previous.getAttribute('data-diagram-card')
          );
        return attributes.length
          ? attributes.every(([key, value]) => candidate.getAttribute(key) === value)
          : href
            ? candidate.href === href
            : previous.tagName === 'SUMMARY';
      });
      (target ?? reading).focus({ preventScroll: true });
    };
  }
  function renderViewer() {
    if (!viewing) return;
    releaseMedia();
    const visit = mediaVisit;
    mediaRequest = new AbortController();
    const definition = viewing.definition,
      copy = localized(definition);
    const title = node('h2', copy.title);
    title.id = 'completion-reward-title';
    reading.replaceChildren(node('p', tr('collected'), 'completion-reward-eyebrow'), title);
    const printableStatus = node('p');
    printableStatus.setAttribute('role', 'status');
    const printable = button(tr('savePrintable'), async () => {
      printable.disabled = true;
      printableStatus.textContent = tr('preparingPrintable');
      const signal = mediaRequest.signal;
      try {
        const document = await createPrintableReward(definition, {
          locale: getLocale(),
          signal,
          preview: Boolean(previewSession),
          async getTranscript(reference) {
            const { bootstrap, asset } = await resolveRewardAsset(provider, reference, { signal });
            let textBytes;
            await verifyEditionAssets(bootstrap, {
              baseURL: provider.rootURL,
              ids: [asset.id],
              signal,
              onVerifiedAsset({ bytes }) {
                textBytes = bytes;
              },
            });
            return textBytes;
          },
          async getImage(reference) {
            const { bootstrap, asset } = await resolveRewardAsset(provider, reference, { signal });
            let media;
            await verifyEditionAssets(bootstrap, {
              baseURL: provider.rootURL,
              ids: [asset.id],
              signal,
              onVerifiedAsset({ bytes }) {
                media = {
                  bytes,
                  mimeType: /\.webp$/i.test(asset.path)
                    ? 'image/webp'
                    : /\.jpe?g$/i.test(asset.path)
                      ? 'image/jpeg'
                      : 'image/png',
                };
              },
            });
            return media;
          },
        });
        if (disposed || visit !== mediaVisit || signal.aborted) return;
        const url = win.URL.createObjectURL(
          new Blob([document.html], { type: 'text/html;charset=utf-8' }),
        );
        objectURLs.add(url);
        const anchor = node('a');
        anchor.href = url;
        anchor.download = `${definition.id}-${getLocale()}.html`;
        anchor.click();
        win.setTimeout(() => {
          if (objectURLs.delete(url)) win.URL.revokeObjectURL(url);
        }, 1000);
        printableStatus.textContent = tr(
          document.missingAssetIds.length ? 'printableMissing' : 'printableSaved',
        );
      } catch {
        if (!disposed && visit === mediaVisit && !signal.aborted)
          printableStatus.textContent = tr('printableFailed');
      } finally {
        if (!disposed && visit === mediaVisit) printable.disabled = false;
      }
    });
    printable.id = 'completion-reward-printable';
    reading.append(printable, printableStatus);
    closeButton.textContent = tr('back');
    for (const item of rewardPresentationItems(definition)) {
      const payload = item.kind === 'audio-group' ? item.group : item.payload;
      const text = localized(payload),
        section = node('section');
      section.setAttribute('data-reward-item', `${item.kind}:${payload.id}`);
      section.append(node('h3', text.title));
      if (item.kind === 'audio-group') {
        explorations.add(
          mountRewardAudioGroup({
            container: section,
            group: item.group,
            payloads: item.payloads,
            provider,
            locale: getLocale(),
            audioMaster,
            musicDucker,
            document: doc,
            window: win,
            signal: mediaRequest.signal,
          }),
        );
      } else if (payload.type === 'knowledge') {
        explorations.add(
          mountRewardKnowledge({
            container: section,
            payload,
            locale: getLocale(),
            initialProfile: readingProfile,
            onProfile: (profile) => {
              readingProfile = profile;
            },
          }),
        );
      } else if (payload.type === 'image') {
        const media = node('figure');
        media.append(node('p', tr('loadingMedia')));
        section.append(media);
        void loadImage(payload, media, mediaRequest.signal, visit);
      } else if (payload.type === 'exploration') {
        explorations.add(
          mountDiscoveryExploration({
            container: section,
            payload,
            locale: getLocale(),
            loadImage: (imagePayload, figure, { signal }) =>
              loadImage(imagePayload, figure, signal, visit),
          }),
        );
      } else if (payload.type === 'cosmetic') {
        explorations.add(
          mountRewardCosmetic({
            container: section,
            payload,
            registry: cosmeticRegistry,
            provider,
            locale: getLocale(),
            window: win,
            signal: mediaRequest.signal,
            motionPreferences,
            onChoose: onChooseCosmetic
              ? () => {
                  dialog.close();
                  onChooseCosmetic(payload);
                }
              : null,
            onRecover: onRecoverCosmetic
              ? () => {
                  dialog.close();
                  onRecoverCosmetic(payload);
                }
              : null,
          }),
        );
      } else if (payload.type === 'audio' || payload.type === 'video') {
        explorations.add(
          mountRewardMedia({
            container: section,
            payload,
            provider,
            locale: getLocale(),
            audioMaster,
            musicDucker,
            document: doc,
            window: win,
            signal: mediaRequest.signal,
          }),
        );
      } else if (payload.type === 'url') {
        section.append(node('p', payload.url), link(tr('openResource'), payload.url));
        if (payload.qr)
          explorations.add(
            mountRewardQr({
              container: section,
              payload,
              locale: getLocale(),
              signal: mediaRequest.signal,
            }),
          );
      } else if (payload.type === 'public-code') {
        section.append(
          node('p', payload.issuer),
          node('code', payload.code),
          node('p', text.terms),
        );
        if (payload.expiresOn)
          section.append(node('p', tr('expires', { date: payload.expiresOn })));
        if (payload.termsUrl) section.append(link(tr('terms'), payload.termsUrl));
        section.append(node('p', tr('publicCode')));
      } else section.append(node('p', tr('missingMedia')));
      reading.append(section);
    }
  }
  function openReward(receipt, from) {
    if (disposed) return;
    pause();
    opener = from;
    viewing = receipt;
    renderViewer();
    dialog.showModal();
    closeButton.focus({ preventScroll: true });
  }
  const collectionDialog = doc.getElementById('collection-dialog');
  const closeShelf = () => {
    if (disposed || !showPictures) return;
    showPictures = false;
    releaseShelfPictures();
    renderShelf();
  };
  collectionDialog.addEventListener('close', closeShelf);
  const shelfObserver =
    typeof win.MutationObserver === 'function'
      ? new win.MutationObserver(() => {
          if (!collectionDialog.open) closeShelf();
        })
      : null;
  shelfObserver?.observe(collectionDialog, { attributes: true, attributeFilter: ['open'] });
  const onClose = () => {
    viewing = null;
    releaseMedia();
    reading.replaceChildren();
    if (opener?.isConnected) opener.focus({ preventScroll: true });
    else restoreFocus(opener);
  };
  dialog.addEventListener('close', onClose);
  const stopReveal = () => result.classList.remove('completion-reward-arrive');
  result.addEventListener('animationend', stopReveal);
  result.addEventListener('click', stopReveal);
  function refresh() {
    if (disposed) return;
    const nextRevision = getJourneyRevision(),
      nextDurable = getJourneyDurable(),
      learning = getLearningEvidence(),
      mastery = getMasteryEvidence();
    const run = getRun(),
      kind = doc.getElementById('game-overlay').dataset.kind;
    if (run?.status === 'running') played.add(run);
    let animate = false;
    if (
      revision !== nextRevision ||
      learningRevision !== learning.revision ||
      masteryRevision !== mastery.revision ||
      durable !== nextDurable ||
      !state
    ) {
      const profile = getJourneyProfile();
      context = rewardContext(
        provider,
        bindings,
        profile,
        learning.learning,
        mastery.mastery,
        mastery.historicalClears,
      );
      const persistenceContext = rewardContext(
        provider,
        bindings,
        profile,
        learning.durableLearning,
        mastery.durableMastery,
        mastery.durableHistoricalClears,
      );
      const update = store.reconcile(provider.rewards, context, {
        persist: nextDurable,
        persistenceContext,
      });
      state = update.state;
      progress = update.progress;
      animate =
        !!run &&
        run.status === 'won' &&
        played.has(run) &&
        !celebrated.has(run) &&
        update.granted.some(
          (receipt) =>
            receipt.definition.scope.kind === 'mission' &&
            receipt.definition.scope.id === run.levelId,
        );
      if (animate) celebrated.add(run);
      revision = nextRevision;
      learningRevision = learning.revision;
      masteryRevision = mastery.revision;
      durable = nextDurable;
      dirty = true;
    }
    if (dirty) {
      state = store.current();
      updateCosmetics();
      dataTitle.textContent = tr('backupTitle');
      dataNote.textContent = tr('backupNote');
      exportButton.textContent = tr('export');
      labelText.textContent = tr('import');
      saveStatus();
      renderShelf();
    }
    if (dirty || lastRun !== run || lastKind !== kind || lastMotion !== getReducedMotion())
      renderResult(animate);
    resultLayout.sync(!result.hidden && result.dataset.placement === 'summary', run);
    lastRun = run;
    lastKind = kind;
    lastMotion = getReducedMotion();
    dirty = false;
  }
  const stopLocale = onLocaleChange(() => {
    const restoreReadingFocus = retainReadingFocus();
    dirty = true;
    refresh();
    if (viewing) renderViewer();
    restoreReadingFocus();
  });
  refresh();
  return {
    refresh,
    // Read-only projection for the expedition selector. Retained promises, rather
    // than newly published conditions, remain the player's finish line.
    snapshot: () => ({ state, progress }),
    cosmeticBodies: () => cosmeticProjection.available.map((item) => item.recipeId),
    closeResultDetails: () => resultLayout.close(),
    dispose() {
      disposed = true;
      importVisit++;
      releaseMedia();
      releaseShelfPictures();
      releaseResultImage();
      shelfObserver?.disconnect();
      collectionDialog.removeEventListener('close', closeShelf);
      stopLocale();
      resultLayout.dispose();
      result.removeEventListener('animationend', stopReveal);
      result.removeEventListener('click', stopReveal);
      dialog.removeEventListener('close', onClose);
      dialog.remove();
      result.remove();
      resultDetails.remove();
      shelf.remove();
      data.remove();
      void store.close();
    },
  };
}
