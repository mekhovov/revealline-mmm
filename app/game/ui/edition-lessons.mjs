import { createLearningAttempt } from '../company-campaigns/learning.mjs';
import { mountCompanyWorkbench } from '../company-campaigns/workbench.mjs';
import { createCompanyLearningProofStore } from '../company-campaigns/learning-proofs.mjs';
import { createCompanyLearningDraftStore } from '../company-campaigns/learning-drafts.mjs';
import { createCompanyStorage } from '../company-storage.mjs';
import { companySimulationIdentity } from '../company-session.mjs';
import { compileContentProject, resolveMission } from '../content-design/project.mjs';
import { journeyDifficultyCatalog } from '../content-design/catalogs.mjs';
import { applyGameplayTuning, resolveGameplayTuning } from '../gameplay-tuning.mjs';
import { createRun } from '../core/index.mjs';
import { exportReplay } from '../replay.mjs';
import { boundedJSON, exactKeys } from '../data-json.mjs';
import { journeyMissionId } from '../journey/catalog.mjs';
import { getLocale, localizedText, render, t } from '../i18n/index.mjs';
import { localizeCompanyLesson } from '../company-campaigns/lesson-localization.mjs';

const localizedIssue = (key) =>
  Object.assign(new TypeError(t(key)), { localizedMessage: () => t(key) });
const requireLocalized = (condition, key) => {
  if (!condition) throw localizedIssue(key);
};

/** A result-only bonus. This module cannot select a mission, award an arcade
 * clear, change a run, or control the availability of Next. */
export async function mountEditionLessons({
  provider,
  document: doc,
  window: win,
  writer,
  previewSession = null,
  getRun,
  getRecorder,
  getPictureVisible,
  report,
}) {
  if (!provider.lessons.length)
    return {
      rewardEvidence: () => EMPTY_REWARD_EVIDENCE,
      onRewardEvidenceChange: () => () => {},
      refresh() {},
      pictureReady() {
        return null;
      },
      dispose() {},
    };
  const node = (tag, text) => {
    const value = doc.createElement(tag);
    if (text !== undefined) value.textContent = text;
    return value;
  };
  const liveStatus = (id) => {
    const status = node('p');
    status.id = id;
    status.setAttribute('role', 'status');
    status.setAttribute('aria-live', 'polite');
    status.setAttribute('aria-atomic', 'true');
    return status;
  };
  const dataStatus = liveStatus('edition-learning-status'),
    lessonStatus = liveStatus('edition-lesson-status'),
    lifetime = new AbortController();
  let disposed = false,
    lessonVisit = 0,
    importRequest = null;
  const reportData = (message) => {
    if (disposed) return;
    const rendered = localizedText(dataStatus, message);
    report(rendered);
  };
  // Storage operations are synchronous, but their owning replay/import may
  // finish later. Keep storage failures on that operation's live surface.
  let storageReport = reportData;
  const persistWithReport = (notify, commit) => {
    const previous = storageReport;
    storageReport = notify;
    try {
      return commit();
    } finally {
      storageReport = previous;
    }
  };
  const simulations = new Map(),
    pictureBindings = new Map(),
    compiled = compileContentProject(provider.route.source);
  for (const lesson of provider.lessons) {
    const identities = new Set(),
      acceptedPictures = new Set();
    for (const difficulty of Object.keys(
      journeyDifficultyCatalog(compiled.source.difficultyCatalogId).presets,
    )) {
      const manifest = resolveMission(compiled, lesson.missionId, { difficulty });
      const run = createRun(applyGameplayTuning(manifest.level, resolveGameplayTuning(difficulty)));
      const identity = companySimulationIdentity(run);
      identities.add(identity);
      acceptedPictures.add(`${difficulty}:${identity}`);
    }
    simulations.set(lesson.missionId, identities);
    for (const pack of compiled.source.packs.filter((item) =>
      item.campaignIds.includes(lesson.campaignId),
    ))
      pictureBindings.set(
        journeyMissionId({
          source: 'candidate',
          packId: pack.id,
          campaignId: lesson.campaignId,
          levelId: lesson.missionId,
        }),
        { lesson, acceptedPictures },
      );
  }
  const storage = createCompanyStorage({
    getStorage: () => previewSession?.storage ?? win.localStorage ?? globalThis.localStorage,
    onError: (error) => storageReport(error.message),
  });
  const proofs = createCompanyLearningProofStore({
    editionId: provider.editionId,
    lessons: provider.lessons,
    acceptSimulation: (id, identity) => simulations.get(id)?.has(identity) === true,
    storage: {
      getItem: storage.getItem,
      setItem(key, value) {
        if (!writer.writable) {
          if (writer.reason) throw new TypeError(writer.reason);
          throw localizedIssue('errors:editionLearning.keptInTab');
        }
        storage.setItem(key, value);
      },
    },
  });
  const hydration = await proofs.hydrate({ signal: lifetime.signal });
  if (hydration.rejected) reportData(() => t('interface:editionLessons.revisionMismatch'));
  const drafts = createCompanyLearningDraftStore({
    editionId: provider.editionId,
    lessons: provider.lessons,
    simulations,
    storage: {
      getItem: storage.getItem,
      setItem(key, value) {
        if (!writer.writable) throw localizedIssue('errors:editionLearning.keptInTab');
        storage.setItem(key, value);
      },
    },
  });
  if (drafts.hydrate().rejected) reportData(() => t('interface:editionLessons.draftMismatch'));
  const button = node('button');
  localizedText(button, () => t('interface:editionLessons.exploreConnection'));
  button.id = 'edition-lesson-open';
  button.type = 'button';
  button.className = 'button secondary';
  button.hidden = true;
  doc.getElementById('view-picture').after(button);
  const dialog = node('dialog');
  dialog.id = 'edition-lesson-dialog';
  dialog.className = 'edition-lesson-dialog';
  const content = node('div');
  content.setAttribute('data-game-reading', '');
  const draftNotice = node('p'),
    freshAttempt = node('button');
  draftNotice.id = 'edition-lesson-draft-notice';
  freshAttempt.id = 'edition-lesson-fresh';
  freshAttempt.type = 'button';
  freshAttempt.className = 'button secondary';
  localizedText(freshAttempt, () => t('interface:editionLessons.draftFresh'));
  freshAttempt.hidden = true;
  dialog.append(draftNotice, content, freshAttempt, lessonStatus);
  doc.body.append(dialog);
  const seen = new WeakSet(),
    attempts = new WeakMap();
  let workbench = null;
  const close = () => {
    lessonVisit++;
    workbench?.destroy();
    workbench = null;
    if (lessonOpener?.isConnected && !lessonOpener.hidden)
      lessonOpener.focus({ preventScroll: true });
  };
  dialog.addEventListener('close', close);
  let lessonOpener = button;
  function openLesson(lesson, run = null, pictureIdentity = null, fresh = false) {
    if (disposed) return;
    const visit = ++lessonVisit;
    localizedText(lessonStatus, '');
    const current = () => !disposed && lessonVisit === visit && dialog.open;
    const reportLesson = (message) => {
      if (disposed) return;
      const visible = current(),
        rendered = render(message);
      if (visible) localizedText(lessonStatus, message);
      // The proof still owns a real saved result after its dialog closes. Keep
      // recovery warnings, naming that lesson without replacing a newer modal.
      report(
        visible
          ? rendered
          : t('interface:editionLessons.namedReport', {
              title: localizeCompanyLesson(lesson, getLocale()).title,
              message: rendered,
            }),
      );
    };
    const recorder = run ? getRecorder() : null;
    const identity = run ? companySimulationIdentity(run) : pictureIdentity;
    const pinned = recorder && simulations.get(lesson.missionId)?.has(identity);
    const cached = !fresh && run ? attempts.get(run) : null;
    const recovered = !fresh && !cached ? drafts.load(lesson, identity) : null;
    const resumed = recovered?.actions.length ? recovered : null;
    const replayEligible = cached ? cached.replayEligible : !!pinned && !resumed;
    const attempt =
      cached?.attempt ??
      resumed ??
      createLearningAttempt(
        lesson,
        replayEligible
          ? {
              attemptId: `bonus-${crypto.randomUUID()}`,
              simulationIdentity: identity,
              seed: run.seed,
            }
          : {},
      );
    if (run) attempts.set(run, { attempt, replayEligible });
    localizedText(
      draftNotice,
      replayEligible
        ? ''
        : () =>
            resumed || cached
              ? t('interface:editionLessons.draftRecovered')
              : t('interface:editionLessons.draftPractice'),
    );
    draftNotice.hidden = replayEligible;
    const refreshDraftAction = (next) => {
      freshAttempt.hidden = replayEligible || (!pinned && next.status !== 'complete');
    };
    refreshDraftAction(attempt);
    localizedText(freshAttempt, () =>
      pinned
        ? t('interface:editionLessons.draftFresh')
        : t('interface:editionLessons.draftRestartPractice'),
    );
    freshAttempt.onclick = () => {
      if (run && (getRun() !== run || run.status !== 'won' || !seen.has(run))) return;
      openLesson(lesson, run, identity, true);
    };
    if (fresh && !persistWithReport(reportLesson, () => drafts.save(lesson, identity, attempt)))
      reportLesson(() => t('interface:editionLessons.draftInTab'));
    // Snapshot the accepted terminal replay before any asynchronous proof work.
    const replay = replayEligible ? exportReplay(recorder, run) : null;
    const boundary = replayEligible ? { tick: run.tick, kind: 'result' } : null;
    workbench?.destroy();
    workbench = mountCompanyWorkbench(content, {
      lesson,
      attempt,
      evidence: { availableRecordIds: lesson.records.map((record) => record.id), boundary },
      onChange: (next) => {
        if (run) attempts.set(run, { attempt: next, replayEligible });
        refreshDraftAction(next);
        try {
          if (!persistWithReport(reportLesson, () => drafts.save(lesson, identity, next)))
            reportLesson(() => t('interface:editionLessons.draftInTab'));
        } catch (error) {
          reportLesson(error.localizedMessage || error.message);
        }
        if (next.status !== 'complete' || !replay) return;
        if (current())
          localizedText(lessonStatus, () => t('interface:editionLessons.checkingCompletedBonus'));
        // Each completed lesson owns its captured replay. Opening or finishing
        // another bonus cannot revoke an earlier independently verified result.
        void proofs
          .prove({ attempt: next, replay, signal: lifetime.signal })
          .then((proof) => {
            if (disposed) return;
            const durable = persistWithReport(reportLesson, () => proofs.saveVerified(proof));
            if (!durable) reportLesson(() => t('interface:editionLessons.completedInTab'));
            else if (current())
              localizedText(lessonStatus, () => t('interface:editionLessons.recordSaved'));
          })
          .catch((error) => {
            reportLesson(error.localizedMessage || error.message);
          });
      },
      onClose: () => dialog.close(),
    });
    const title = content.querySelector('h2');
    dialog.setAttribute('aria-labelledby', title.id);
    if (!dialog.open) dialog.showModal();
    if (fresh) content.querySelector('[data-control]')?.focus({ preventScroll: true });
    if (!replayEligible && attempt.actions.length && !drafts.isDurable(lesson, identity))
      reportLesson(() => t('interface:editionLessons.draftInTab'));
  }
  button.onclick = () => {
    const run = getRun();
    if (disposed || run?.status !== 'won' || !seen.has(run)) return;
    const lesson = provider.lessons.find((item) => item.missionId === run.levelId);
    if (!lesson) return;
    lessonOpener = button;
    openLesson(lesson, run);
  };
  const section = node('section');
  section.className = 'edition-learning-data';
  const heading = node('h3'),
    explanation = node('p');
  localizedText(heading, () => t('interface:editionLessons.recordsHeading'));
  localizedText(explanation, () => t('interface:editionLessons.separateBonus'));
  section.append(heading, explanation);
  const download = node('button'),
    upload = node('input');
  localizedText(download, () => t('interface:editionLessons.exportRecords'));
  download.type = 'button';
  download.className = 'button secondary';
  const label = node('label'),
    labelText = node('span');
  localizedText(labelText, () => t('interface:editionLessons.importMatchingRecords'));
  upload.type = 'file';
  upload.accept = 'application/json,.json';
  label.append(labelText, upload);
  section.append(download, label, dataStatus);
  doc.getElementById('settings-panel-data').append(section);
  download.onclick = () => {
    const url = URL.createObjectURL(
      new Blob(
        [
          JSON.stringify({
            format: 'revealline-edition-learning-backup.v2',
            editionId: provider.editionId,
            proofs: proofs.exportProofs(),
            recovery: proofs.exportRecovery(),
            drafts: drafts.exportDrafts(),
          }),
        ],
        { type: 'application/json' },
      ),
    );
    const link = node('a');
    link.href = url;
    link.download = `${provider.editionId}-learning.json`;
    link.click();
    win.setTimeout(() => URL.revokeObjectURL(url), 1000);
  };
  upload.onchange = async () => {
    if (disposed) return;
    importRequest?.abort();
    const request = new AbortController();
    importRequest = request;
    const current = () => !disposed && importRequest === request && !request.signal.aborted;
    try {
      localizedText(dataStatus, '');
      const file = upload.files?.[0];
      if (!file) return;
      localizedText(dataStatus, () => t('interface:editionLessons.checkingRecords'));
      requireLocalized(file.size <= 48 * 1024 * 1024, 'errors:editionLearning.backupTooLarge');
      const text = await file.text();
      if (!current()) return;
      const backup = boundedJSON(text, {
        maxBytes: 48 * 1024 * 1024,
        maxString: 8 * 1024 * 1024,
        maxNodes: 4000000,
        maxArray: 216000,
        maxDepth: 40,
      });
      requireLocalized(
        ['revealline-edition-learning-backup.v1', 'revealline-edition-learning-backup.v2'].includes(
          backup.format,
        ) && backup.editionId === provider.editionId,
        'errors:editionLearning.otherEdition',
      );
      exactKeys(
        backup,
        backup.format === 'revealline-edition-learning-backup.v2'
          ? ['format', 'editionId', 'proofs', 'recovery', 'drafts']
          : ['format', 'editionId', 'proofs', 'recovery'],
        'optional learning backup',
      );
      // Drafts are checked before any completion proof is imported. They never
      // enter the proof verifier or reward-evidence projection.
      const checkedDrafts = drafts.inspect(
        backup.format === 'revealline-edition-learning-backup.v2' ? backup.drafts : [],
      );
      const recovery = proofs.inspectRecovery(backup.recovery);
      const checked = await proofs.inspectProofs(backup.proofs, { signal: request.signal });
      if (!current()) return;
      if (!writer.writable) {
        if (writer.reason) throw new TypeError(writer.reason);
        throw localizedIssue('errors:editionLearning.cannotWriteRecords');
      }
      const durable = persistWithReport(reportData, () => {
        const draftDurable = drafts.import(checkedDrafts);
        proofs.importRecovery(recovery);
        return proofs.importVerified(checked) && draftDurable;
      });
      reportData(
        durable
          ? () =>
              checkedDrafts.length
                ? t('interface:editionLessons.recordsImportedWithDrafts')
                : t('interface:editionLessons.recordsImported')
          : () => t('interface:editionLessons.importedInTab'),
      );
    } catch (error) {
      if (current()) reportData(error.localizedMessage || error.message);
    } finally {
      if (current()) {
        upload.value = '';
        importRequest = null;
      }
    }
  };
  return {
    rewardEvidence: proofs.rewardEvidence,
    onRewardEvidenceChange: proofs.onRewardEvidenceChange,
    pictureReady(record) {
      if (disposed || record.editionId !== provider.editionId || record.mode !== 'solo')
        return null;
      // Journey pictures retain their composite catalog identity. Resolve that
      // exact owned binding rather than trusting a display name or bare level ID.
      // Retained presentations mount their own source and therefore their own pins.
      const binding = pictureBindings.get(record.missionId);
      if (
        !binding ||
        binding.lesson.missionId !== record.levelId ||
        !binding.acceptedPictures.has(`${record.difficulty}:${record.gameplayId}`)
      )
        return null;
      const { lesson } = binding;
      const revisit = node('button');
      localizedText(revisit, () => t('interface:editionLessons.revisitConnection'));
      revisit.type = 'button';
      revisit.className = 'button secondary';
      revisit.onclick = () => {
        lessonOpener = revisit;
        openLesson(lesson, null, record.gameplayId);
      };
      return revisit;
    },
    refresh() {
      const run = getRun();
      if (run?.status === 'won' && !seen.has(run) && getPictureVisible()) {
        try {
          if (simulations.get(run.levelId)?.has(companySimulationIdentity(run))) seen.add(run);
        } catch {
          // A foreign or incomplete run cannot expose this edition's activity.
        }
      }
      const visible =
        !!run &&
        run.status === 'won' &&
        seen.has(run) &&
        provider.lessons.some((lesson) => lesson.missionId === run.levelId);
      if (button.hidden === visible) button.hidden = !visible;
    },
    dispose() {
      disposed = true;
      lifetime.abort();
      importRequest?.abort();
      workbench?.destroy();
      dialog.removeEventListener('close', close);
      button.remove();
      dialog.remove();
      section.remove();
    },
  };
}

const EMPTY_REWARD_EVIDENCE = Object.freeze({
  revision: 0,
  learning: Object.freeze([]),
  durableLearning: Object.freeze([]),
});
