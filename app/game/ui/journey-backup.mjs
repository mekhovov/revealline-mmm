import { t, localizedText, localizedMessage, formatNumber } from '../i18n/index.mjs';
import { JOURNEY_MODES } from '../journey/catalog.mjs';
import { exportJSONFile } from '../platform.mjs';

/** Optional recovery surface. It never launches a mission or changes a live run. */
export function attachJourneyBackup({
  document: doc = globalThis.document,
  profile,
  onRestore = () => {},
  exportFile = exportJSONFile,
}) {
  const element = (tag, text, id) => {
    const node = doc.createElement(tag);
    if (text) localizedText(node, () => text);
    if (id) node.id = id;
    return node;
  };
  const dialog = element('dialog', '', 'journey-backup');
  dialog.className = 'journey-backup';
  dialog.setAttribute('aria-labelledby', 'journey-backup-title');
  const title = element(
    'h2',
    localizedMessage('interface:keepYourJourney'),
    'journey-backup-title',
  );
  const copy = element(
    'p',
    localizedMessage('interface:exportALocalBackupOrInspectOneBeforeRestoringRestore'),
  );
  const exportButton = element(
    'button',
    localizedMessage('interface:exportProgress'),
    'journey-backup-export',
  );
  const label = element('label', localizedMessage('interface:inspectJourneyBackup'));
  const input = element('input', '', 'journey-backup-file');
  input.type = 'file';
  input.accept = 'application/json,.json';
  label.append(input);
  const status = element(
    'p',
    localizedMessage('interface:chooseABackupToInspectNothingIsRestoredAutomatically'),
    'journey-backup-status',
  );
  status.setAttribute('role', 'status');
  const apply = element(
    'button',
    localizedMessage('interface:restoreInspectedProgress'),
    'journey-backup-apply',
  );
  const back = element(
    'button',
    localizedMessage('interface:backToMissions'),
    'journey-backup-back',
  );
  for (const button of [exportButton, apply, back]) {
    button.type = 'button';
    button.className = 'button secondary';
  }
  apply.disabled = true;
  const content = element('div');
  content.className = 'journey-backup-content';
  content.append(copy, exportButton, label, status);
  const actions = element('div');
  actions.className = 'journey-backup-actions';
  actions.append(apply, back);
  dialog.append(title, content, actions);
  doc.body.append(dialog);
  let revision = 0,
    inspected = null,
    opener = null,
    operation = null;
  function reset() {
    operation?.abort();
    operation = null;
    revision++;
    inspected = null;
    input.value = '';
    apply.disabled = true;
  }
  function close() {
    reset();
    dialog.close();
    opener?.focus({ preventScroll: true });
  }
  input.onchange = async () => {
    operation?.abort();
    const controller = new AbortController();
    operation = controller;
    const file = input.files?.[0],
      ticket = ++revision;
    inspected = null;
    apply.disabled = true;
    if (!file) {
      localizedText(status, () => t('interface:noBackupSelectedProgressIsUnchanged'));
      return;
    }
    try {
      if (file.size > 16 * 1024 * 1024)
        throw new Error(t('interface:backupExceedsThe16MibFileLimit'));
      localizedText(status, () => t('interface:inspectingTheLocalBackup'));
      const raw = await file.text();
      if (ticket !== revision || controller.signal.aborted) return;
      const { backup, merged, pictures } = profile.inspectBackupAsync
        ? await profile.inspectBackupAsync(raw, { signal: controller.signal })
        : profile.inspectBackup(raw);
      const addedPictures = pictures
        ? pictures.records.length - (profile.pictures?.().records.length ?? 0)
        : 0;
      if (ticket !== revision) return;
      const current = profile.snapshot();
      const counts = JOURNEY_MODES.map((mode) => {
        const added =
          Object.keys(merged.clears[mode]).length - Object.keys(current.clears[mode]).length;
        const skips = merged.skipped[mode].filter(
          (id) => !current.skipped[mode].includes(id),
        ).length;
        const conflicts = Object.entries(backup.profile.clears[mode]).filter(
          ([id, receipt]) =>
            Object.hasOwn(current.clears[mode], id) &&
            JSON.stringify(current.clears[mode][id]) !== JSON.stringify(receipt),
        ).length;
        return { mode, added, skips, conflicts };
      });
      inspected = backup;
      apply.disabled = false;
      localizedText(status, () =>
        t('interface:journeyBackup.inspectionSummary', {
          counts: counts
            .map(({ mode, added, skips, conflicts }) =>
              t('interface:journeyBackup.modeCounts', {
                mode: t(`interface:journeyBackup.mode.${mode}`),
                added: formatNumber(added),
                skips: formatNumber(skips),
                conflicts: formatNumber(conflicts),
              }),
            )
            .join(' '),
          count: addedPictures,
          pictures: formatNumber(addedPictures),
        }),
      );
    } catch (error) {
      if (ticket === revision)
        localizedText(status, () =>
          t('interface:journeyBackup.inspectFailed', { error: error.message }),
        );
    }
  };
  apply.onclick = async () => {
    if (!inspected) return;
    operation?.abort();
    const controller = new AbortController();
    operation = controller;
    const backup = inspected,
      ticket = revision;
    inspected = null;
    // Disabling the focused action drops native keyboard focus to the page.
    // Hand it off only during this deliberate activation, never after saving.
    if (dialog.open && doc.activeElement === apply) back.focus();
    apply.disabled = true;
    try {
      const restored = profile.restoreAsync
        ? await profile.restoreAsync(backup, { signal: controller.signal })
        : (profile.restore(backup), null);
      if (ticket !== revision || controller.signal.aborted) return;
      onRestore();
      const durable = await profile.flush();
      if (ticket !== revision) return;
      localizedText(status, () =>
        durable
          ? restored?.performance?.durable === false
            ? t(
                restored.performance.saveUnconfirmed
                  ? 'interface:journeyBest.backupUnconfirmed'
                  : 'interface:journeyBest.backupPartial',
              )
            : t('interface:mergedAndSavedLocallyCurrentAttemptAndExistingProgressAre')
          : t('interface:mergedInThisSessionOnlyStorageFailedExportNowOr'),
      );
    } catch (error) {
      if (ticket === revision)
        localizedText(status, () =>
          t('interface:journeyBackup.restoreFailed', { error: error.message }),
        );
    }
  };
  exportButton.onclick = async () => {
    const ticket = revision;
    try {
      const result = await exportFile(JSON.parse(profile.export()), profile.backupFilename);
      if (ticket === revision) localizedText(status, () => result.message);
    } catch (error) {
      if (ticket === revision)
        localizedText(status, () =>
          t('interface:journeyBackup.exportFailed', { error: error.message }),
        );
    }
  };
  back.onclick = close;
  dialog.addEventListener('close', reset);
  dialog.addEventListener('cancel', (event) => {
    if (event.target === dialog) {
      event.preventDefault();
      close();
    }
  });
  return {
    open(origin = doc.activeElement) {
      reset();
      opener = origin;
      localizedText(status, () =>
        t('interface:chooseABackupToInspectNothingIsRestoredAutomatically'),
      );
      dialog.showModal();
      exportButton.focus({ preventScroll: true });
    },
    close,
  };
}
