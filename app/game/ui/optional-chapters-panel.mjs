import {
  optionalChapterText as contentText,
  worldModeLabel,
  worldThemeLabel,
} from './optional-chapter-presentation.mjs';
import {
  localizedMessage,
  localizedText,
  t,
  localizedAttribute,
  render as renderMessage,
  formatNumber,
} from '../i18n/index.mjs';
import { chapterMessage } from './optional-chapter-copy.mjs';

function requireChapter(condition, key) {
  if (condition) return;
  const message = () => t(key);
  throw Object.assign(new Error(message()), { localizedMessage: message });
}
import {
  loadOptionalCatalog,
  prepareOptionalCatalog,
  verifyOptionalInstalled,
} from '../optional-chapters.mjs';
import { PACK_LIMITS } from '../packs.mjs';
import { EXTERNAL_CHAPTER_LIMITS } from '../external-chapter.mjs';
import { required } from '../data-json.mjs';
import { createOperationStatus } from './operation-status.mjs';
import { attachFocusClearance } from './focus-clearance.mjs';
import {
  browseWorlds,
  installedWorldMode,
  legacyWorldMode,
  WORLD_THEMES,
} from './worlds-browser.mjs';

/** Native optional content browser. The host alone owns installation and attempt selection. */
export function attachOptionalChaptersPanel({
  document: doc = globalThis.document,
  heading = null,
  backLabel = localizedMessage('interface:backToMainMenu'),
  attemptLabel = 'flight',
  showManage = true,
  getLibrary,
  getUsage = () => null,
  sourceChapter = null,
  sourceChapters = sourceChapter ? [sourceChapter] : [],
  loadCatalog = loadOptionalCatalog,
  refreshLibrary = null,
  install,
  choose,
  chooseInstalled,
  play,
  playInstalled,
  onPlayActivation = () => {},
  matchMedia = globalThis.matchMedia,
  onOpen = () => {},
  onClose = () => {},
  onChosen = () => {},
  onRead = ({ region }) => region.focus(),
  onManage = () => {},
} = {}) {
  required(
    Array.isArray(sourceChapters) &&
      sourceChapters.length <= EXTERNAL_CHAPTER_LIMITS.catalogChoices,
    t('interface:tooManyTrustedWorldChoices'),
  );
  let catalog = null,
    disposed = false,
    generation = 0,
    launchGeneration = 0,
    pending = null,
    pendingFocus = null,
    pendingStatus = null,
    busy = false,
    page = 0,
    pinned = null;
  const defaultHeading = heading === null;
  heading ??= localizedMessage('interface:moreWorlds');
  const copy = (key, values) => chapterMessage(key, attemptLabel, values);
  const size = (bytes) =>
    formatNumber(bytes / 1048576, { minimumFractionDigits: 1, maximumFractionDigits: 1 });
  const compact = matchMedia?.('(max-width: 900px), (max-aspect-ratio: 3/2)');
  const node = (tag, id, text = '') => {
    const el = doc.createElement(tag);
    if (id) el.id = `optional-worlds-${id}`;
    localizedText(el, () => text);
    return el;
  };
  const action = (id, label, fn) => {
    const el = node('button', id, label);
    el.type = 'button';
    el.className = 'button secondary';
    el.onclick = fn;
    return el;
  };
  const dialog = node('dialog', 'dialog');
  dialog.className = 'optional-worlds-dialog';
  dialog.setAttribute('aria-labelledby', 'optional-worlds-title');
  const title = node('h2', 'title', heading),
    summary = node(
      'p',
      'summary',
      localizedMessage('interface:browseOriginalPictureChaptersByThemeAndModeArcadeUses'),
    ),
    capacity = node('p', 'capacity'),
    cards = node('div', 'cards'),
    status = node('p', 'status');
  summary.tabIndex = 0;
  summary.setAttribute('data-game-reading', '');
  summary.setAttribute('role', 'region');
  localizedAttribute(summary, 'aria-label', () =>
    defaultHeading
      ? t('interface:aboutOptionalWorlds')
      : t('interface:chapters.aboutHeading', { heading: renderMessage(heading) }),
  );
  cards.className = 'optional-worlds-cards';
  status.setAttribute('role', 'status');
  status.setAttribute('aria-live', 'polite');
  const presentation = createOperationStatus(status, { isCurrent: () => !disposed && dialog.open });
  const reload = action('reload', localizedMessage('interface:refreshAvailableWorlds'), () =>
      reloadCatalog(),
    ),
    manage = action('manage', localizedMessage('interface:managePacksBackups'), () => {
      close(false);
      onManage();
    }),
    read = action(
      'read',
      () =>
        defaultHeading
          ? t('interface:readAboutWorlds')
          : t('interface:chapters.readHeading', { heading: renderMessage(heading) }),
      () => onRead({ region: summary, origin: read, label: renderMessage(heading) }),
    ),
    cancel = action('cancel', localizedMessage('interface:cancelOperation'), cancelPending),
    back = action('back', backLabel, () => close()),
    topBack = action('top-back', localizedMessage('common:actions.back'), () => close()),
    top = node('div'),
    actions = node('div');
  top.className = 'optional-worlds-top';
  localizedAttribute(topBack, 'aria-label', backLabel);
  top.append(title, topBack);
  actions.className = 'optional-worlds-actions';
  actions.append(read, reload, ...(showManage ? [manage] : []), back);
  const filters = node('div'),
    pager = node('div'),
    pageStatus = node('p', 'page'),
    operationStatus = node('p', 'operation'),
    taskStatus = node('div');
  filters.className = 'optional-worlds-filters';
  pager.className = 'optional-worlds-pager';
  operationStatus.setAttribute('role', 'status');
  taskStatus.className = 'optional-worlds-task';
  taskStatus.append(status, cancel);
  const select = (id, label, options) => {
    const wrapper = node('label', null, label),
      control = node('select', id);
    for (const [value, text] of options) {
      const option = node('option', null, text);
      option.value = value;
      control.append(option);
    }
    control.value = '';
    wrapper.append(control);
    filters.append(wrapper);
    return control;
  };
  const themeFilter = select('theme', localizedMessage('interface:theme'), [
      ['', localizedMessage('interface:allThemes')],
      ...WORLD_THEMES.map(([id]) => [id, () => worldThemeLabel(id)]),
      ['other', localizedMessage('interface:otherThemes')],
    ]),
    modeFilter = select('mode', localizedMessage('interface:mode'), [
      ['', localizedMessage('interface:allModes')],
      ['Arcade', localizedMessage('interface:arcade')],
      ['Tactical', localizedMessage('interface:tactical')],
      ['Other', localizedMessage('interface:otherMixed')],
    ]),
    previous = action('previous', localizedMessage('common:actions.previous'), () => movePage(-1)),
    nextPage = action('next', localizedMessage('common:actions.next'), () => movePage(1));
  localizedAttribute(previous, 'aria-label', () => t('interface:previousPage'));
  localizedAttribute(nextPage, 'aria-label', () => t('interface:nextPage'));
  pageStatus.setAttribute('role', 'status');
  pageStatus.setAttribute('aria-live', 'polite');
  pager.append(previous, pageStatus, nextPage);
  themeFilter.onchange = modeFilter.onchange = () => {
    ++launchGeneration;
    page = 0;
    if (!busy) pinned = null;
    refreshView();
  };
  dialog.append(
    top,
    summary,
    filters,
    pager,
    operationStatus,
    taskStatus,
    cards,
    capacity,
    actions,
  );
  doc.body.append(dialog);
  const focusClearance = attachFocusClearance({
    container: dialog,
    heading: top,
    document: doc,
  });
  const pageEvents =
    typeof doc.defaultView?.addEventListener === 'function'
      ? doc.defaultView
      : (globalThis.window ?? globalThis);
  const retireLaunch = () => {
    ++launchGeneration;
    if (pendingFocus) pendingFocus.moved = true;
  };
  const pageBlur = (event) => {
    if (!event.target || event.target === pageEvents) retireLaunch();
  };
  const pageVisibility = () => {
    if (doc.hidden) retireLaunch();
  };
  pageEvents.addEventListener?.('blur', pageBlur);
  pageEvents.addEventListener?.('pagehide', retireLaunch);
  doc.addEventListener('visibilitychange', pageVisibility);
  function choiceLaunch(opener, current, playing = false) {
    const epoch = ++launchGeneration;
    let selected = false;
    const isCurrent = () =>
      !selected &&
      current() &&
      epoch === launchGeneration &&
      !doc.hidden &&
      doc.hasFocus?.() !== false &&
      opener.isConnected &&
      (busy || !opener.disabled) &&
      !opener.closest('[hidden],[inert],[aria-hidden="true"]');
    const complete = () => {
      if (!isCurrent()) return false;
      selected = true;
      close(false);
      onChosen();
      return true;
    };
    return {
      opener,
      isCurrent,
      onCancelled({ dialog: decision }) {
        if (!isCurrent() || decision?.open) return false;
        const operation = generation;
        const ownsReturnFocus = (element) =>
          [doc.body, dialog, opener, cancel, decision].includes(element) ||
          decision?.contains(element);
        const restore = ownsReturnFocus(doc.activeElement);
        // Stay is a new, explicit return request. Release this outer operation
        // now, even if the aborted save callback has not settled yet. Its old
        // finally cannot restore focus or clear a subsequent operation.
        cancelPending({ restoreFocus: false });
        const returned = () =>
          !disposed &&
          dialog.open &&
          generation === operation + 1 &&
          epoch === launchGeneration &&
          !doc.hidden &&
          doc.hasFocus?.() !== false;
        if (playing && returned()) {
          const message = copy('keptPaused');
          presentation.begin({ message, stage: 'ready', isCurrent: returned }).finish({ message });
        }
        if (
          restore &&
          returned() &&
          ownsReturnFocus(doc.activeElement) &&
          opener.isConnected &&
          !opener.disabled &&
          !opener.closest('[hidden],[inert],[aria-hidden="true"]') &&
          (typeof opener.getClientRects !== 'function' || opener.getClientRects().length)
        )
          opener.focus();
        return true;
      },
      onSelected: () => !playing && complete(),
      onStarted: () => playing && complete(),
    };
  }
  function playLaunch(opener, current, signal) {
    const launch = choiceLaunch(opener, current, true);
    onPlayActivation({ launch, signal });
    return launch;
  }
  const rows = new Map(),
    installedRows = new Map(),
    matches = new WeakMap();
  const sourceRows = sourceChapters.map((chapter) => {
    const prefix =
      chapter.controlId || (chapter === sourceChapter ? 'source' : `source-${chapter.id}`);
    const card = node('section', prefix === 'source' ? 'source-pilot' : `${prefix}-card`);
    card.className = `optional-world-card world-${chapter.themeId || 'other'}`;
    const heading = node('h3', null, () => contentText(chapter, 'name'));
    const detail = node(
      'p',
      null,
      () =>
        contentText(chapter, 'description') || t('interface:threeMapsWithOriginalRewardPictures'),
    );
    const metadata = node('p', null, () =>
      t('gameplay:originalPictures', {
        value1: chapter.mode ? worldModeLabel(chapter.mode) : t('interface:optionalChapter'),
        value2: chapter.levels ?? 3,
      }),
    );
    const recovery = node('details', `${prefix}-recovery`),
      recoverySummary = node(
        'summary',
        `${prefix}-recovery-summary`,
        localizedMessage('interface:restoreFromFiles'),
      ),
      recoveryNote = node('p', `${prefix}-recovery-note`, () =>
        [
          t(
            chapter.sourceOnly === false
              ? 'interface:restoreThisChapterSMatchingGameplayAndOriginalPictureFiles'
              : 'interface:sourceCandidateChooseItsGeneratedPackJsonAndMediaRlmedia',
          ),
          t(
            chapter.backupSupported
              ? 'interface:gameDataBackupKeepsItsDescriptorKeepRlmediaOriginalsSeparately'
              : 'interface:backupsAndRemovalAreNotSupportedYet',
          ),
          renderMessage(copy(chapter.play ? 'recoveryPlay' : 'recoveryChoose')),
        ].join(' '),
      );
    recovery.className = 'optional-world-recovery';
    recovery.append(recoverySummary);
    recovery.addEventListener('toggle', () => {
      if (
        !disposed &&
        dialog.open &&
        !recovery.open &&
        doc.activeElement !== recoverySummary &&
        recovery.contains(doc.activeElement)
      )
        recoverySummary.focus();
    });
    const file = (id, label, accept) => {
      const wrapper = node('label', null, label),
        input = node('input', `${prefix}-${id}`);
      input.type = 'file';
      input.accept = accept;
      input.onchange = () => cancelPending();
      wrapper.append(input);
      recovery.append(wrapper);
      return input;
    };
    card.append(heading, metadata, detail);
    const pack = file(
      'pack',
      localizedMessage('interface:gameplayFileJson'),
      '.json,application/json',
    );
    const media = file(
      'media',
      localizedMessage('interface:exactPictureOriginalsRlmedia'),
      '.rlmedia,application/octet-stream',
    );
    const state = node('p', `${prefix}-state`);
    const row = {
      key: `source:${chapter.id}`,
      chapter,
      card,
      pack,
      media,
      state,
      result: { status: 'checking' },
    };
    row.install = action(
      `${prefix}-install`,
      localizedMessage('interface:installRecoverExactPair'),
      () =>
        run(
          async (signal, current, report) => {
            const packFile = pack.files?.[0],
              mediaFile = media.files?.[0];
            requireChapter(
              packFile && mediaFile,
              'interface:chooseBothExactChapterFilesBeforeInstalling',
            );
            report(() => t('interface:checkingGameplayAndOriginalPictures'), 'verifying');
            await chapter.install(
              { pack: packFile, media: mediaFile },
              { signal, onStatus: report },
            );
            if (!current()) return;
            report(() => t('interface:checkingTheInstalledOriginalPair'), 'verifying');
            const next = await chapter.inspect({ signal });
            if (current()) {
              row.result = next;
              report(copy(chapter.play ? 'restoredPlay' : 'restoredChoose'));
            }
          },
          { origin: row.install, next: row.choose, fallback: recoverySummary },
        ),
    );
    const canPlay = typeof chapter.play === 'function';
    if (canPlay && chapter.download) {
      row.download = row.choose = action(
        `${prefix}-download`,
        localizedMessage('interface:downloadPlay'),
        () => playSource(row, recoverySummary),
      );
      card.append(row.download);
    } else {
      row.choose = action(
        `${prefix}-choose`,
        () => (canPlay ? t('common:actions.play') : t('interface:chooseChapter')),
        () =>
          canPlay
            ? playSource(row, recoverySummary)
            : run(
                async (signal, current, report) => {
                  report(
                    () =>
                      t('interface:chapters.preparing', { chapter: contentText(chapter, 'name') }),
                    'preparing',
                  );
                  const launch = choiceLaunch(row.choose, current);
                  const selected = await chapter.choose({ signal, onStatus: report, launch });
                  if (selected !== false) launch.onSelected();
                },
                { origin: row.choose, fallback: recoverySummary },
              ),
      );
      if (chapter.download) {
        row.download = action(
          `${prefix}-download`,
          () => t('interface:chapters.downloadInstall', { size: size(chapter.bytes) }),
          () =>
            run(
              async (signal, current, report) => {
                report(
                  () =>
                    t('interface:chapters.downloading', { chapter: contentText(chapter, 'name') }),
                  'downloading',
                );
                await chapter.download({ signal, onStatus: report });
                if (!current()) return;
                report(() => t('interface:checkingTheInstalledOriginalPair'), 'verifying');
                const next = await chapter.inspect({ signal });
                if (current()) {
                  row.result = next;
                  report(copy('installedPair'));
                }
              },
              { origin: row.download, next: row.choose, fallback: recoverySummary },
            ),
        );
        card.append(row.download);
      }
      card.append(row.choose);
    }
    row.review = node('div', `${prefix}-picture-review`);
    row.review.hidden = true;
    row.review.setAttribute('role', 'group');
    localizedAttribute(row.review, 'aria-label', () => t('interface:keepExistingPictureChoices'));
    row.reviewText = node('p', `${prefix}-picture-review-text`);
    row.confirm = action(
      `${prefix}-picture-confirm`,
      localizedMessage('interface:installOriginalsKeepMyPictures'),
      () => {
        const choice = row.pictureReview;
        if (!choice || busy) return;
        return run(
          async (signal, current, report) => {
            report(
              () => t('interface:installingOriginalsWhileKeepingYourPictureChoices'),
              'saving',
            );
            if (choice.files)
              await chapter.install(choice.files, {
                signal,
                onStatus: report,
                pictureReview: choice.error,
              });
            else await chapter.download({ signal, onStatus: report, pictureReview: choice.error });
            if (!current()) return;
            report(() => t('interface:originalsInstalledCheckingChapterReadiness'), 'verifying');
            try {
              const next = await chapter.inspect({ signal });
              if (!current()) return;
              row.result = next;
            } catch (error) {
              const message = () =>
                t('interface:chapters.installedButUnavailable', { error: error.message });
              throw Object.assign(new Error(message()), { localizedMessage: message });
            }
            if (current()) report(copy(chapter.play ? 'picturesPlay' : 'picturesChoose'));
          },
          { origin: row.confirm, next: row.choose, fallback: recoverySummary },
        );
      },
    );
    row.dismiss = action(
      `${prefix}-picture-cancel`,
      localizedMessage('interface:cancelPictureReview'),
      () => {
        const origin = row.pictureReview?.origin;
        discardPictureReviews();
        refresh();
        const message = copy('picturesCancelled');
        presentation.begin({ message }).finish({ message, state: 'cancelled' });
        if (dialog.open) (origin && !origin.disabled ? origin : row.choose).focus();
      },
    );
    row.review.append(row.reviewText, row.confirm, row.dismiss);
    card.append(row.review);
    recovery.append(row.install, recoveryNote);
    card.append(state, recovery);
    return row;
  });
  async function inspectSource(signal, current, report) {
    if (!sourceRows.length) return;
    let completed = 0;
    report(() => t('interface:checkingInstalledPictures'), 'verifying', {
      completed,
      total: sourceRows.length,
      unit: 'chapters',
    });
    for (const row of sourceRows) {
      if (!current()) return;
      let next;
      try {
        next = await row.chapter.inspect({ signal });
      } catch (error) {
        if (error.name === 'AbortError') throw error;
        next = { status: 'unavailable', message: error.message };
      }
      if (current()) {
        row.result = next;
        report(() => t('interface:checkingInstalledPictures'), 'verifying', {
          completed: ++completed,
          total: sourceRows.length,
          unit: 'chapters',
        });
      }
    }
  }
  let measuredLibrary = null,
    measuredBytes = 0;
  function installed(item) {
    const pack = getLibrary().packs.find((candidate) => candidate.id === item.id);
    return !!pack && matches.get(pack)?.get(item.normalizedSha256) === true;
  }
  async function inspectInstalled(signal, candidate = catalog) {
    for (const item of candidate.packs) {
      const pack = getLibrary().packs.find((candidate) => candidate.id === item.id);
      if (!pack) continue;
      if (!matches.has(pack)) matches.set(pack, new Map());
      try {
        await verifyOptionalInstalled(pack, item, { signal });
        matches.get(pack).set(item.normalizedSha256, true);
      } catch (error) {
        if (error.name === 'AbortError') throw error;
        matches.get(pack).set(item.normalizedSha256, false);
      }
    }
  }
  function refresh() {
    const library = getLibrary();
    if (library !== measuredLibrary) {
      measuredLibrary = library;
      measuredBytes = new TextEncoder().encode(JSON.stringify(library)).length;
    }
    const usage = getUsage();
    const bytes = usage ? usage.packBytes + usage.indexBytes : measuredBytes;
    localizedText(capacity, () =>
      t('gameplay:installedPacksMibPacksSpaceIsSharedWithYourOther', {
        value1: size(bytes),
        value2: PACK_LIMITS.libraryBytes / 1048576,
        value3: library.packs.length,
        value4: PACK_LIMITS.installed,
      }),
    );
    for (const [id, row] of rows) {
      const item = catalog?.packs.find((entry) => entry.id === id),
        available = installed(item);
      const existing = library.packs.find((pack) => pack.id === id);
      const conflict = existing && matches.get(existing)?.get(item.normalizedSha256) === false;
      row.install.disabled = busy || (!!existing && !(play && available));
      localizedText(row.install, () =>
        play && available
          ? t('common:actions.play')
          : available
            ? t('interface:installedOnThisDevice')
            : conflict
              ? t('interface:differentEditionInstalled')
              : existing
                ? t('interface:checkingInstalledEdition')
                : t(play ? 'interface:chapters.downloadPlay' : 'interface:chapters.installSize', {
                    size: size(item.bytes),
                  }),
      );
      if (!play) row.choose.disabled = busy || !available;
      localizedText(row.state, () =>
        available
          ? t('interface:installedAvailableWithoutAnotherDownload')
          : conflict
            ? showManage
              ? t('interface:thisIdContainsDifferentArtworkContentUseManagePacksBackups')
              : t('interface:thisIdContainsDifferentArtworkContentKeepTheInstalledEdition')
            : t(play ? 'interface:chapters.optionalPlay' : 'interface:chapters.optionalInstall'),
      );
    }
    for (const row of sourceRows) {
      const sourceState = row.result;
      row.review.hidden = !row.pictureReview;
      row.confirm.disabled = row.dismiss.disabled = busy;
      row.install.disabled = busy || sourceState.status === 'installed';
      if (row.chapter.play) {
        row.choose.disabled = busy || (sourceState.status !== 'installed' && !row.download);
        localizedText(row.choose, () =>
          sourceState.status === 'installed'
            ? t('common:actions.play')
            : row.download
              ? t('interface:chapters.downloadPlay', { size: size(row.chapter.bytes) })
              : t('common:actions.play'),
        );
      } else {
        if (row.download) row.download.disabled = row.install.disabled;
        row.choose.disabled = busy || sourceState.status !== 'installed';
      }
      row.pack.disabled = row.media.disabled = busy;
      localizedText(row.state, () =>
        sourceState.status === 'installed'
          ? t(
              row.chapter.play
                ? 'interface:chapters.readyToPlay'
                : 'interface:chapters.readyToChoose',
            )
          : sourceState.status === 'absent'
            ? t('interface:notInstalled')
            : sourceState.message ||
              t('gameplay:storedStateRecoverTheExactFilesBeforeChoosing', {
                value1: sourceState.status,
              }),
      );
    }
    for (const row of installedRows.values())
      row.choose.disabled = busy || !library.packs.includes(row.pack);
    reload.disabled = busy;
    manage.disabled = busy;
    cancel.hidden = !busy;
    dialog.setAttribute('aria-busy', String(busy));
    refreshView();
  }
  const themeFor = (id) => (WORLD_THEMES.some(([value]) => value === id) ? id : 'other');
  function allRows() {
    return [
      ...[...rows.values()].map((row) => ({
        ...row,
        themeId: themeFor(row.item.themeId),
        mode: legacyWorldMode(row.item.id),
      })),
      ...sourceRows.map((row) => ({
        ...row,
        themeId: themeFor(row.chapter.themeId),
        mode: ['Arcade', 'Tactical'].includes(row.chapter.mode) ? row.chapter.mode : 'Other',
      })),
      ...[...installedRows.values()].map((row) => ({
        ...row,
        themeIds: row.pack.themes?.map((theme) => themeFor(theme.id)) ?? ['other'],
        mode: installedWorldMode(row.pack),
      })),
    ];
  }
  function refreshView() {
    const entries = allRows();
    const view = browseWorlds(entries, {
      theme: themeFilter.value,
      mode: modeFilter.value,
      page,
      size: compact?.matches ? 2 : 4,
      pinned,
    });
    page = view.page;
    for (const row of entries) {
      row.card.hidden = !view.visible.includes(row.key);
      row.card.classList.toggle('optional-world-current', row.key === view.pinned);
    }
    localizedText(pageStatus, () =>
      t('interface:chapters.page', { page: view.page + 1, pages: view.pages, count: view.total }),
    );
    previous.disabled = view.page === 0;
    nextPage.disabled = view.page === view.pages - 1;
    const held = entries.find((entry) => entry.key === view.pinned);
    operationStatus.hidden = !held;
    localizedText(operationStatus, () =>
      held
        ? t(busy ? 'interface:chapters.workingOn' : 'interface:chapters.keptInView', {
            chapter: contentText(held.chapter ?? held.item ?? held.pack, 'name'),
          })
        : '',
    );
  }
  function movePage(delta) {
    ++launchGeneration;
    const origin = doc.activeElement;
    if (!busy) pinned = null;
    page = Math.max(0, page + delta);
    refreshView();
    repairViewFocus(origin);
  }
  function repairViewFocus(active) {
    if (!dialog.open) return;
    const hiddenCard = cards.contains(active) && active.closest('[hidden]');
    const disabledPager = (active === previous || active === nextPage) && active.disabled;
    if (!hiddenCard && !disabledPager) return;
    const candidates = disabledPager
      ? [previous, nextPage, themeFilter, topBack]
      : [themeFilter, topBack];
    candidates.find((control) => !control.disabled && !control.closest('[hidden]'))?.focus();
  }
  function resized() {
    const active = doc.activeElement;
    refreshView();
    repairViewFocus(active);
  }
  compact?.addEventListener?.('change', resized);
  function render() {
    const items = catalog?.packs ?? [];
    for (const [id, row] of rows)
      if (!items.some((item) => item.id === id)) {
        row.card.remove();
        rows.delete(id);
      }
    for (const item of items) {
      let row = rows.get(item.id);
      if (!row) {
        const card = node('section');
        card.className = `optional-world-card world-${item.themeId}`;
        const heading = node('h3', null, () => contentText(item, 'name')),
          detail = node('p', null, () =>
            t('gameplay:originalPictures', {
              value1: worldModeLabel(legacyWorldMode(item.id)),
              value2: item.levels,
            }),
          ),
          description = node('p', `description-${item.id}`, () => contentText(item, 'description')),
          state = node('p');
        row = { key: `legacy:${item.id}`, item, card, heading, detail, description, state };
        row.install = action(
          `install-${item.id}`,
          () => (play ? t('interface:downloadPlay') : t('interface:install')),
          () => (play ? playItem(row.item, row.install) : installItem(row.item)),
        );
        row.choose = play
          ? row.install
          : action(`choose-${item.id}`, localizedMessage('interface:chooseChapter'), () =>
              chooseItem(row.item),
            );
        card.append(heading, detail, description, state, row.install);
        if (!play) card.append(row.choose);
        rows.set(item.id, row);
      }
      row.item = item;
      localizedText(row.heading, () => contentText(item, 'name'));
      localizedText(row.description, () => contentText(item, 'description'));
      cards.append(row.card);
    }
    for (const row of sourceRows) cards.append(row.card);
    const other =
      chooseInstalled || playInstalled
        ? getLibrary().packs.filter(
            (pack) => !rows.has(pack.id) && !sourceRows.some((row) => row.chapter.id === pack.id),
          )
        : [];
    for (const [id, row] of installedRows)
      if (!other.includes(row.pack)) {
        row.card.remove();
        installedRows.delete(id);
      }
    for (const pack of other) {
      let row = installedRows.get(pack.id);
      if (!row) {
        const card = node('section', `installed-${pack.id}`);
        card.className = 'optional-world-card';
        row = { key: `installed:${pack.id}`, pack, card };
        row.choose = action(
          `installed-choose-${pack.id}`,
          () => (playInstalled ? t('common:actions.play') : t('interface:chooseInstalledChapter')),
          () =>
            run(
              async (signal, current, report) => {
                report(
                  () => t('interface:chapters.preparing', { chapter: contentText(pack, 'name') }),
                  'preparing',
                );
                const launch = playInstalled
                  ? playLaunch(row.choose, current, signal)
                  : choiceLaunch(row.choose, current);
                if (!launch.isCurrent()) return;
                requireChapter(
                  getLibrary().packs.includes(pack),
                  'interface:thisInstalledChapterHasChangedRefreshBeforePlaying',
                );
                const selected = await (playInstalled || chooseInstalled)(pack, {
                  signal,
                  onStatus: report,
                  launch,
                });
                if (!playInstalled && selected !== false) launch.onSelected();
              },
              { origin: row.choose },
            ),
        );
        card.append(
          node('h3', null, () => contentText(pack, 'name')),
          node('p', null, () =>
            t('gameplay:installedOnThisDeviceOpenTheMissionBriefForIts', {
              value1: worldModeLabel(installedWorldMode(pack)),
            }),
          ),
          row.choose,
        );
        installedRows.set(pack.id, row);
      }
      cards.append(row.card);
    }
    refresh();
  }
  const movedFocus = (event) => {
    if (pendingFocus && ![pendingFocus.origin, cancel, doc.body, dialog].includes(event.target))
      pendingFocus.moved = true;
  };
  doc.addEventListener('focusin', movedFocus);
  function returnFocus(plan, succeeded = false, cancelled = false) {
    if (
      disposed ||
      !dialog.open ||
      doc.hidden ||
      doc.hasFocus?.() === false ||
      (!cancelled && (!plan || plan.moved))
    )
      return;
    if (![doc.body, dialog, plan?.origin, cancel].includes(doc.activeElement)) return;
    for (const candidate of [
      succeeded ? plan?.next : null,
      plan?.origin,
      plan?.fallback,
      reload,
      topBack,
    ]) {
      if (
        candidate?.isConnected &&
        !candidate.disabled &&
        !candidate.closest('[hidden],[inert],[aria-hidden="true"]') &&
        (typeof candidate.getClientRects !== 'function' || candidate.getClientRects().length)
      ) {
        candidate.focus();
        break;
      }
    }
  }
  function discardPictureReviews() {
    for (const row of sourceRows) row.pictureReview = null;
  }
  function cancelPending({ restoreFocus = true } = {}) {
    discardPictureReviews();
    const wasBusy = busy;
    const focusPlan = pendingFocus,
      fromCancel = doc.activeElement === cancel;
    pendingFocus = null;
    if (wasBusy)
      pendingStatus?.finish({
        state: 'cancelled',
        message: copy('cancellationRequested'),
      });
    pendingStatus = null;
    ++generation;
    pending?.abort();
    pending = null;
    busy = false;
    refresh();
    if (restoreFocus && wasBusy) returnFocus(focusPlan, false, fromCancel);
  }
  async function run(fn, { origin = doc.activeElement, next = null, fallback = null } = {}) {
    if (disposed || busy || !dialog.open) return;
    const reviewFiles = sourceRows.find((row) => row.confirm === origin)?.pictureReview?.files;
    discardPictureReviews();
    const ticket = ++generation,
      controller = new AbortController();
    const focusPlan =
      origin !== doc.body && doc.activeElement === origin && dialog.contains(origin)
        ? { origin, next, fallback, moved: false }
        : null;
    let succeeded = false,
      finalMessage = () => t('interface:checkingTheSelectedChapter'),
      outcome = 'ready';
    pendingFocus = focusPlan;
    pending = controller;
    busy = true;
    const held = allRows().find((row) => row.card.contains(origin));
    const sourceRow = sourceRows.find((row) => row.card.contains(origin));
    if (held) pinned = held.key;
    const current = () => !disposed && dialog.open && ticket === generation;
    refresh();
    // The initiating action becomes disabled. Keep its keyboard/controller
    // focus on the visible cancellation action without reclaiming moved focus.
    if (
      current() &&
      focusPlan &&
      !focusPlan.moved &&
      focusPlan.origin.disabled &&
      !doc.hidden &&
      doc.hasFocus?.() !== false &&
      [focusPlan.origin, doc.body, dialog].includes(doc.activeElement) &&
      cancel.isConnected &&
      !cancel.disabled &&
      !cancel.closest('[hidden],[inert],[aria-hidden="true"]') &&
      (typeof cancel.getClientRects !== 'function' || cancel.getClientRects().length)
    )
      cancel.focus();
    const display = presentation.begin({
      message: finalMessage,
      stage: 'checking',
      isCurrent: current,
    });
    pendingStatus = display;
    const report = (value, stage = 'checking', progress = null) => {
      if (!current()) return;
      const update =
        typeof value === 'string' || typeof value === 'function'
          ? { message: value, stage, progress }
          : { ...value };
      if (update.messageKey) update.message = () => t(update.messageKey, update.messageValues);
      finalMessage = update.message ?? finalMessage;
      display.update(update);
    };
    try {
      await fn(controller.signal, current, report);
      succeeded = true;
    } catch (error) {
      if (current()) {
        const reviewable =
          sourceRow &&
          error?.name === 'RetainedPictureAssignmentConflict' &&
          Array.isArray(error.conflicts) &&
          error.conflicts.length > 0;
        if (reviewable) {
          sourceRow.pictureReview = {
            error,
            origin:
              origin === sourceRow.confirm
                ? reviewFiles
                  ? sourceRow.install
                  : sourceRow.download
                : origin,
            files:
              origin === sourceRow.install
                ? { pack: sourceRow.pack.files?.[0], media: sourceRow.media.files?.[0] }
                : (reviewFiles ?? null),
          };
          localizedText(sourceRow.reviewText, () =>
            t('interface:chapters.pictureReview', {
              chapter: contentText(sourceRow.chapter, 'name'),
              count: error.conflicts.length,
              choices: error.conflicts
                .map((entry) =>
                  t(
                    entry.retained
                      ? 'interface:chapters.selectedPicture'
                      : 'interface:chapters.defaultPicture',
                    {
                      level:
                        entry.levelName ??
                        entry.identity.levelId
                          .replaceAll('-', ' ')
                          .replace(/^./, (letter) => letter.toUpperCase()),
                    },
                  ),
                )
                .join('; '),
            }),
          );
          if (focusPlan) focusPlan.next = sourceRow.dismiss;
          succeeded = true;
          report(() =>
            t('interface:reviewYourExistingPictureChoicesConfirmInstallationOrCancelYour'),
          );
        } else {
          outcome = error?.name === 'AbortError' ? 'cancelled' : 'error';
          report(
            error?.name === 'AbortError'
              ? copy('operationCancelled')
              : () =>
                  t(
                    play || playInstalled || sourceRows.some((row) => row.chapter.play)
                      ? 'interface:chapters.failedPlay'
                      : 'interface:chapters.failedInstall',
                    { error: renderMessage(error.localizedMessage ?? error.message ?? error) },
                  ),
          );
        }
      }
    } finally {
      if (current()) {
        display.finish({ message: finalMessage, state: outcome });
        pendingStatus = null;
        pending = null;
        pendingFocus = null;
        busy = false;
        refresh();
        returnFocus(focusPlan, succeeded);
      }
    }
  }
  async function reloadCatalog() {
    return run(async (signal, current, report) => {
      report(() => t('interface:checkingInstalledChapters'), 'verifying');
      if (refreshLibrary) {
        await refreshLibrary({ signal, onStatus: report });
        if (!current()) return;
      }
      if (catalog) await inspectInstalled(signal, catalog);
      await inspectSource(signal, current, report);
      if (!current()) return;
      refresh();
      report(() => t('interface:readingTheOptionalChapterList'), 'reading');
      let next = catalog,
        failure = null;
      try {
        next = prepareOptionalCatalog(await loadCatalog({ signal }));
      } catch (error) {
        if (signal.aborted) throw error;
        failure = error;
      }
      if (!current()) return;
      if (next) {
        report(() => t('interface:checkingInstalledChapters'), 'verifying');
        await inspectInstalled(signal, next);
      }
      if (!current()) return;
      catalog = next;
      render();
      report(
        failure
          ? () =>
              t('interface:chapters.onlineListUnavailable', { error: failure.message || failure })
          : play || playInstalled || sourceRows.some((row) => row.chapter.play)
            ? copy('playInstructions')
            : copy('installInstructions'),
      );
    });
  }
  async function playSource(row, fallback) {
    const { chapter } = row;
    await run(
      async (signal, current, report) => {
        const launch = playLaunch(row.choose, current, signal);
        if (!launch.isCurrent()) return;
        if (row.result.status !== 'installed') {
          requireChapter(
            typeof chapter.download === 'function',
            'interface:restoreTheExactChapterFilesBeforePlaying',
          );
          report(
            () => t('interface:chapters.downloading', { chapter: contentText(chapter, 'name') }),
            'downloading',
          );
          await chapter.download({ signal, onStatus: report });
          if (!current()) return;
        }
        report(() => t('interface:checkingTheInstalledOriginalPair'), 'verifying');
        const next = await chapter.inspect({ signal });
        if (!current()) return;
        row.result = next;
        if (next.status !== 'installed') {
          if (next.message) throw new Error(next.message);
          requireChapter(false, 'interface:theChapterNeedsRepairBeforePlaying');
        }
        if (!launch.isCurrent()) {
          report(copy('installedPlay', () => ({ chapter: contentText(chapter, 'name') })));
          return;
        }
        report(
          () => t('interface:chapters.preparing', { chapter: contentText(chapter, 'name') }),
          'preparing',
        );
        await chapter.play({ signal, onStatus: report, launch });
      },
      { origin: row.choose, fallback },
    );
  }
  async function playItem(item, opener) {
    await run(
      async (signal, current, report) => {
        const launch = playLaunch(opener, current, signal);
        if (!launch.isCurrent()) return;
        if (!installed(item)) {
          requireChapter(
            !getLibrary().packs.some((pack) => pack.id === item.id),
            showManage
              ? 'interface:aDifferentEditionIsInstalledManageItBeforeDownloadingThis'
              : 'interface:aDifferentEditionIsInstalledKeepItOrChooseAnother',
          );
          report(
            () => t('interface:chapters.downloading', { chapter: contentText(item, 'name') }),
            'downloading',
          );
          await install(item, { signal, onStatus: report });
          if (!current()) return;
        }
        report(() => t('interface:checkingTheInstalledChapter'), 'verifying');
        const pack = getLibrary().packs.find((candidate) => candidate.id === item.id);
        requireChapter(pack, 'interface:theChapterIsNotInstalledDownloadItBeforePlaying');
        await verifyOptionalInstalled(pack, item, { signal });
        if (!current()) return;
        requireChapter(
          getLibrary().packs.includes(pack),
          'interface:thisInstalledChapterHasChangedRefreshBeforePlaying',
        );
        if (!matches.has(pack)) matches.set(pack, new Map());
        matches.get(pack).set(item.normalizedSha256, true);
        if (!launch.isCurrent()) {
          report(copy('installedPlay', () => ({ chapter: contentText(item, 'name') })));
          return;
        }
        report(
          () => t('interface:chapters.preparing', { chapter: contentText(item, 'name') }),
          'preparing',
        );
        await play(item, { signal, onStatus: report, launch });
      },
      { origin: opener },
    );
  }
  async function installItem(item) {
    await run(
      async (signal, current, report) => {
        report(
          () => t('interface:chapters.downloading', { chapter: contentText(item, 'name') }),
          'downloading',
        );
        await install(item, { signal, onStatus: report });
        report(() => t('interface:checkingTheInstalledChapter'), 'verifying');
        await inspectInstalled(signal);
        if (current()) {
          refresh();
          report(copy('installedChoose', () => ({ chapter: contentText(item, 'name') })));
        }
      },
      { origin: rows.get(item.id)?.install, next: rows.get(item.id)?.choose },
    );
  }
  async function chooseItem(item) {
    if (busy || disposed || !installed(item)) return;
    await run(
      async (signal, current, report) => {
        report(
          () => t('interface:chapters.preparing', { chapter: contentText(item, 'name') }),
          'preparing',
        );
        const launch = choiceLaunch(rows.get(item.id).choose, current);
        const result = await choose(item, { signal, onStatus: report, launch });
        if (result !== false) launch.onSelected();
      },
      { origin: rows.get(item.id)?.choose },
    );
  }
  async function open() {
    if (disposed) return;
    onOpen();
    if (!dialog.open) dialog.showModal();
    render();
    topBack.focus();
    if (!catalog) await reloadCatalog();
    else
      await run(async (signal, current, report) => {
        report(() => t('interface:checkingInstalledChaptersAndPictures'), 'verifying');
        if (refreshLibrary) {
          await refreshLibrary({ signal, onStatus: report });
          if (!current()) return;
        }
        if (catalog) await inspectInstalled(signal);
        await inspectSource(signal, current, report);
        if (!current()) return;
        refresh();
        report(
          play || playInstalled || sourceRows.some((row) => row.chapter.play)
            ? copy('reopenPlay')
            : copy('reopenInstall'),
        );
      });
  }
  function close(notify = true) {
    if (!dialog.open) return;
    retireLaunch();
    cancelPending({ restoreFocus: false });
    dialog.close();
    if (notify) onClose();
  }
  const escape = (event) => {
    if (event.target !== dialog) return;
    event.preventDefault();
    close();
  };
  dialog.addEventListener('cancel', escape);
  dialog.addEventListener('close', () => {
    if (!dialog.open) {
      retireLaunch();
      cancelPending({ restoreFocus: false });
    }
  });
  function dispose() {
    if (disposed) return;
    disposed = true;
    focusClearance.destroy();
    discardPictureReviews();
    presentation.dispose();
    pendingStatus = null;
    ++generation;
    pending?.abort();
    pending = null;
    pendingFocus = null;
    retireLaunch();
    pageEvents.removeEventListener?.('blur', pageBlur);
    pageEvents.removeEventListener?.('pagehide', retireLaunch);
    doc.removeEventListener('visibilitychange', pageVisibility);
    doc.removeEventListener('focusin', movedFocus);
    compact?.removeEventListener?.('change', resized);
    if (dialog.open) dialog.close();
    dialog.remove();
  }
  render();
  return Object.freeze({
    open,
    close,
    cancel({ restoreFocus = false } = {}) {
      if (!disposed && busy) cancelPending({ restoreFocus });
    },
    refresh,
    dispose,
  });
}
