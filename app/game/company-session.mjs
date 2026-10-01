import { boundedJSON, canonicalJSON, dataIdentity, exactKeys, required } from './data-json.mjs';
import { createRecorder, exportReplay, snapshotReplay, verifyReplayAsync } from './replay.mjs';
import { verifyLearningAttempt } from './company-campaigns/learning.mjs';
import { verifyLearningEvidence } from './company-campaigns/evidence.mjs';
import { resolveEditionAssets } from './editions/model.mjs';
import { matchRecordedGameplayTuning, recoverGameplayTuning } from './gameplay-tuning.mjs';

export const COMPANY_SESSION_FORMAT = 'revealline-company-session.v1';
export function companySimulationIdentity(run) {
  return dataIdentity({ level: run.level, classes: run.classRecipes, ruleset: run.ruleset });
}

/** Current-run learning is separate from a historical best-progress record. */
export function validateCompanyRunLearning(learning, { lesson = null, run }) {
  if (!lesson) {
    required(learning === null, 'This adventure mission has no learning transcript.');
    return null;
  }
  required(lesson.missionId === run.levelId, 'The lesson belongs to another mission.');
  const checked = verifyLearningAttempt(lesson, learning);
  required(checked.valid, 'The saved learning transcript does not match this lesson revision.');
  required(
    checked.attempt.simulationIdentity === companySimulationIdentity(run) &&
      checked.attempt.seed === run.seed,
    'The learning transcript belongs to a different simulation or seed.',
  );
  required(
    checked.attempt.actions.every((action) => !action.anchor || action.anchor.tick <= run.tick),
    'The learning transcript extends beyond the saved game.',
  );
  return checked.attempt;
}
export async function companyPresentationIdentity(bootstrap) {
  const { selection, source, boot, catalog } = bootstrap;
  const payload = canonicalJSON({
    edition: selection.edition,
    brand: selection.brand,
    source,
    themes: boot.themes,
    presets: boot.presets,
    assets: resolveEditionAssets(catalog, { editionId: selection.edition.id }),
  });
  const hash = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(payload));
  return Array.from(new Uint8Array(hash), (b) => b.toString(16).padStart(2, '0')).join('');
}

export function captureCompanySession({
  editionId,
  presentationIdentity,
  missionId,
  difficulty,
  runId,
  recorder,
  run,
  learning = null,
  lesson = null,
}) {
  required(
    /^[a-f0-9]{64}$/.test(presentationIdentity),
    'Exact company presentation identity is required.',
  );
  return {
    format: COMPANY_SESSION_FORMAT,
    editionId,
    presentationIdentity,
    missionId,
    difficulty,
    runId,
    replay: exportReplay(recorder, run),
    learning: validateCompanyRunLearning(learning, { lesson, run }),
  };
}

/** Verify content and replay before allowing the host to retire its current run. */
export async function restoreCompanySession(
  source,
  { editionId, presentationIdentity, prepare, lessonFor = () => null, signal } = {},
) {
  const saved = boundedJSON(source, {
    maxBytes: 32 * 1024 * 1024,
    maxNodes: 3000000,
    maxArray: 216000,
    maxDepth: 30,
  });
  exactKeys(
    saved,
    [
      'format',
      'editionId',
      'presentationIdentity',
      'missionId',
      'difficulty',
      'runId',
      'replay',
      'learning',
    ],
    'company session',
  );
  required(
    saved?.format === COMPANY_SESSION_FORMAT && saved.editionId === editionId,
    'This saved game belongs to a different edition.',
  );
  required(
    saved.presentationIdentity === presentationIdentity,
    'This saved game needs its exact earlier content and artwork. Open its matching release; the saved game has been kept.',
  );
  required(
    typeof saved.runId === 'string' && saved.runId.length > 0 && saved.runId.length <= 160,
    'Invalid saved attempt identity.',
  );
  const replay = snapshotReplay(saved.replay);
  const prepared = await prepare(
    {
      missionId: saved.missionId,
      difficulty: saved.difficulty,
      seed: replay.options.seed,
      turnPolicy: replay.options.turnPolicy,
    },
    { signal },
  );
  try {
    const preparedTuning = recoverGameplayTuning(prepared.run.level);
    const sameLevel =
      canonicalJSON(prepared.run.level) === canonicalJSON(replay.level) ||
      (preparedTuning !== null &&
        prepared.manifest?.level &&
        canonicalJSON(preparedTuning) === canonicalJSON(recoverGameplayTuning(replay.level)) &&
        matchRecordedGameplayTuning(prepared.manifest.level, replay.level) !== null);
    required(
      sameLevel && canonicalJSON(prepared.recorder.options) === canonicalJSON(replay.options),
      'The saved simulation differs from this authored mission.',
    );
    const lesson = lessonFor(prepared.run.levelId);
    // Check inexpensive pins before replaying the core and every learning anchor.
    saved.learning = validateCompanyRunLearning(saved.learning, {
      lesson,
      run: { ...prepared.run, level: replay.level, tick: replay.ticks },
    });
    const verified = lesson
      ? await verifyLearningEvidence({ lesson, attempt: saved.learning, replay, signal })
      : await verifyReplayAsync(replay, { signal });
    if (!lesson) required(verified.match, 'The saved game replay could not be verified.');
    const recorder = createRecorder(replay.level, replay.options, replay.build);
    recorder.segments = structuredClone(replay.segments);
    recorder.ticks = replay.ticks;
    recorder.releaseAfter = replay.releaseAfter;
    return {
      saved,
      prepared,
      run: verified.state,
      recorder,
      evidenceObserver: verified.observer ?? null,
    };
  } catch (error) {
    prepared.picture?.release();
    throw error;
  }
}
