import { localizedText, t } from '../i18n/index.mjs';
import { boundedJSON, canonicalJSON, exactKeys, required } from '../data-json.mjs';
import { createRewardMissionBindings } from '../rewards/bindings.mjs';
import { createJourneyMasteryProofStore } from '../mastery-journey-proofs.mjs';
import { createCompanyStorage } from '../company-storage.mjs';
import { exportReplay } from '../replay.mjs';

export const EMPTY_MASTERY_EVIDENCE = Object.freeze({
  revision: 0,
  mastery: Object.freeze([]),
  durableMastery: Object.freeze([]),
  historicalClears: Object.freeze([]),
  durableHistoricalClears: Object.freeze([]),
});

/** A bounded optional replay check after the shared host has accepted a win.
 * This surface cannot record a clear, select a mission or gate Next/Retry. */
export async function mountEditionMastery({
  provider,
  document: doc,
  window: win,
  writer,
  getRun,
  getRunId,
  getRecorder,
  getJourneyProfile,
  getJourneyDurable,
  getJourneyRevision,
  previewSession = null,
  report = () => {},
}) {
  const requirements = [
    ...new Map(
      (provider.rewards ?? [])
        .flatMap((reward) => reward.requirements.mastery)
        .map((item) => [`${item.missionId}/${item.id}/${item.revision}`, item]),
    ).values(),
  ];
  if (!requirements.length)
    return {
      rewardEvidence: () => EMPTY_MASTERY_EVIDENCE,
      onRewardEvidenceChange: () => () => {},
      refresh() {},
      dispose() {},
    };
  required(typeof getRunId === 'function', 'Optional mastery needs the shared host run identity.');
  const requiredByMission = new Map();
  for (const requirement of requirements) {
    const items = requiredByMission.get(requirement.missionId) ?? [];
    items.push(requirement);
    requiredByMission.set(requirement.missionId, items);
  }
  const bindings = createRewardMissionBindings(provider.route.source);
  const byMission = new Map(bindings.map((entry) => [entry.missionId, entry]));
  const acceptClear = (clear) =>
    byMission.get(clear.missionId)?.journeyMissionIds.some((id) => {
      const accepted = getJourneyProfile()?.clears?.solo?.[id];
      return (
        accepted &&
        accepted.runId === clear.runId &&
        accepted.gameplayId === clear.gameplayId &&
        accepted.difficulty === clear.difficulty
      );
    }) === true;
  const acceptOwnedClear = (clear) => {
    const mission = byMission.get(clear.missionId);
    return (
      mission?.journeyMissionIds.some((id) => {
        const accepted = getJourneyProfile()?.clears?.solo?.[id];
        return (
          accepted &&
          mission.bindings.some(
            (binding) =>
              binding.gameplayId === accepted.gameplayId &&
              binding.difficulty === accepted.difficulty,
          )
        );
      }) === true
    );
  };
  const tr = (key) => t('interface:journeyMastery.' + key);
  const node = (tag, key) => {
    const element = doc.createElement(tag);
    if (key) localizedText(element, () => tr(key));
    return element;
  };
  const notice = node('p'),
    section = node('section'),
    status = node('p');
  notice.id = 'edition-mastery-notice';
  notice.hidden = true;
  notice.setAttribute('role', 'status');
  status.id = 'edition-mastery-status';
  status.setAttribute('role', 'status');
  status.setAttribute('aria-live', 'polite');
  section.className = 'edition-learning-data';
  const download = node('button', 'export'),
    retry = node('button', 'retry'),
    upload = node('input'),
    label = node('label', 'import');
  for (const button of [download, retry]) {
    button.type = 'button';
    button.className = 'button secondary';
  }
  download.id = 'edition-mastery-export';
  retry.id = 'edition-mastery-retry';
  upload.id = 'edition-mastery-import';
  upload.type = 'file';
  upload.accept = 'application/json,.json';
  label.append(upload);
  section.append(node('h3', 'title'), node('p', 'note'), download, retry, label, status);
  doc.getElementById('overlay-reading').append(notice);
  doc.getElementById('settings-panel-data').append(section);
  if (previewSession) {
    download.hidden = true;
    retry.hidden = true;
    label.hidden = true;
  }
  const lifetime = new AbortController(),
    objectURLs = new Set(),
    pending = new Set(),
    checkedRuns = new WeakSet(),
    outcomes = new WeakMap();
  let disposed = false,
    importRequest = null,
    lastDurable = false,
    lastNoticeRun,
    lastNoticePhase,
    lastConsidered;
  const reportStatus = (key, error = null) => {
    if (disposed) return;
    localizedText(status, () => `${tr(key)}${error ? ' ' + error.message : ''}`);
    if (error) report(error.message);
  };
  const storage = createCompanyStorage({
    getStorage: () => previewSession?.storage ?? win.localStorage ?? globalThis.localStorage,
    onError: (error) => reportStatus('session', error),
  });
  const proofs = createJourneyMasteryProofStore({
    editionId: provider.editionId,
    requirements,
    bindings,
    acceptClear,
    acceptOwnedClear,
    storage: {
      getItem: storage.getItem,
      setItem(key, value) {
        required(writer.writable && getJourneyDurable() && !previewSession, tr('session'));
        storage.setItem(key, value);
      },
    },
  });
  const hydrated = await proofs.hydrate({ signal: lifetime.signal });
  if (hydrated.rejected) reportStatus('recovery');
  function renderNotice() {
    const run = getRun(),
      requiredHere = requiredByMission.has(run?.levelId);
    const phase = requiredHere ? (outcomes.get(run) ?? 'challenge') : null;
    if (run === lastNoticeRun && phase === lastNoticePhase) return;
    lastNoticeRun = run;
    lastNoticePhase = phase;
    notice.hidden = !requiredHere;
    if (requiredHere) localizedText(notice, () => tr(phase));
  }
  function retrySave() {
    if (disposed) return;
    try {
      const stillAccepted = proofs.exportProofs().filter((entry) => acceptOwnedClear(entry.clear));
      const saved = proofs.importVerified(stillAccepted);
      reportStatus(saved ? 'saved' : 'session');
    } catch (error) {
      reportStatus('unavailable', error);
    }
  }
  retry.onclick = retrySave;
  download.onclick = () => {
    if (disposed || previewSession) return;
    const url = win.URL.createObjectURL(
      new Blob(
        [
          JSON.stringify({
            format: 'revealline-edition-mastery-backup.v1',
            editionId: provider.editionId,
            proofs: proofs.exportProofs(),
            recovery: proofs.exportRecovery(),
          }),
        ],
        { type: 'application/json' },
      ),
    );
    objectURLs.add(url);
    const link = node('a');
    link.href = url;
    link.download = `${provider.editionId}-mastery.json`;
    link.click();
    win.setTimeout(() => {
      if (objectURLs.delete(url)) win.URL.revokeObjectURL(url);
    }, 1000);
  };
  upload.onchange = async () => {
    if (disposed || previewSession) return;
    importRequest?.abort();
    const request = new AbortController();
    importRequest = request;
    const current = () => !disposed && importRequest === request && !request.signal.aborted;
    try {
      const file = upload.files?.[0];
      if (!file) return;
      reportStatus('checking');
      required(file.size <= 48 * 1024 * 1024, tr('tooLarge'));
      const text = await file.text();
      if (!current()) return;
      const backup = boundedJSON(text, {
        maxBytes: 48 * 1024 * 1024,
        maxString: 8 * 1024 * 1024,
        maxNodes: 4000000,
        maxArray: 216000,
        maxDepth: 40,
      });
      exactKeys(backup, ['format', 'editionId', 'proofs', 'recovery'], 'Journey mastery backup');
      required(
        backup.format === 'revealline-edition-mastery-backup.v1' &&
          backup.editionId === provider.editionId,
        tr('wrongEdition'),
      );
      const recovery = proofs.inspectRecovery(backup.recovery);
      const checked = await proofs.inspectProofs(backup.proofs, { signal: request.signal });
      if (!current()) return;
      proofs.importRecovery(recovery);
      const saved = proofs.importVerified(checked);
      reportStatus(saved ? 'imported' : 'session');
    } catch (error) {
      if (current()) reportStatus('unavailable', error);
    } finally {
      if (current()) {
        upload.value = '';
        importRequest = null;
      }
    }
  };
  function refresh() {
    if (disposed) return;
    const durable = getJourneyDurable();
    if (
      !lastDurable &&
      durable &&
      proofs.rewardEvidence().mastery.length &&
      canonicalJSON(proofs.rewardEvidence().mastery) !==
        canonicalJSON(proofs.rewardEvidence().durableMastery)
    )
      retrySave();
    lastDurable = durable;
    const run = getRun(),
      runId = getRunId();
    renderNotice();
    if (!run || run.status !== 'won' || !runId || checkedRuns.has(run)) return;
    const considered = `${runId}/${getJourneyRevision()}`;
    if (considered === lastConsidered) return;
    lastConsidered = considered;
    const selected = requiredByMission.get(run.levelId) ?? [];
    if (!selected.length) return;
    const mission = byMission.get(run.levelId);
    const clear = mission?.journeyMissionIds
      .map((id) => getJourneyProfile()?.clears?.solo?.[id])
      .find((entry) => entry?.runId === runId);
    // Practice and unaccepted terminal runs cannot borrow an earlier clear.
    if (!clear) return;
    const recorder = getRecorder();
    if (!recorder || pending.size >= 4) return;
    let replay;
    try {
      replay = exportReplay(recorder, run);
    } catch (error) {
      outcomes.set(run, 'unavailable');
      checkedRuns.add(run);
      reportStatus('unavailable', error);
      renderNotice();
      return;
    }
    checkedRuns.add(run);
    pending.add(runId);
    outcomes.set(run, 'checking');
    renderNotice();
    void (async () => {
      try {
        let saved = true;
        for (const requirement of selected) {
          const proof = await proofs.prove({
            requirement,
            clear: { missionId: run.levelId, ...clear },
            replay,
            signal: lifetime.signal,
          });
          if (disposed) return;
          saved = proofs.saveVerified(proof) && saved;
        }
        outcomes.set(run, saved ? 'saved' : 'session');
        reportStatus(saved ? 'saved' : 'session');
      } catch (error) {
        if (!disposed && !lifetime.signal.aborted) {
          const unqualified = error.code === 'mastery-unqualified';
          outcomes.set(run, unqualified ? 'tryAgain' : 'unavailable');
          if (!unqualified) reportStatus('unavailable', error);
        }
      } finally {
        pending.delete(runId);
        if (!disposed) renderNotice();
      }
    })();
  }
  return {
    rewardEvidence: proofs.rewardEvidence,
    onRewardEvidenceChange: proofs.onRewardEvidenceChange,
    refresh,
    dispose() {
      if (disposed) return;
      disposed = true;
      lifetime.abort();
      importRequest?.abort();
      for (const url of objectURLs) win.URL.revokeObjectURL(url);
      objectURLs.clear();
      notice.remove();
      section.remove();
      pending.clear();
    },
  };
}
