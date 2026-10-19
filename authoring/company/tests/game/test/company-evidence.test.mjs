import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { COMPANY_LESSONS } from '../company-campaigns/lessons.mjs';
import { createCompanyProject } from '../company-campaigns/content.mjs';
import {
  createLearningAttempt,
  reduceLearningAttempt,
  verifyLearningAttempt,
} from '../company-campaigns/learning.mjs';
import {
  createLearningEvidenceObserver,
  verifyLearningEvidence,
} from '../company-campaigns/evidence.mjs';
import { mountCompanyWorkbench } from '../company-campaigns/workbench.mjs';
import { compileContentProject, resolveMission } from '../content-design/project.mjs';
import { applyGameplayTuning } from '../gameplay-tuning.mjs';
import { createRun, stepRun, FIXED_DT } from '../core/index.mjs';
import { authoritativeCheckpoint, createRecorder, recordInput, exportReplay } from '../replay.mjs';
import { dataIdentity } from '../data-json.mjs';
import { Document } from './helpers/couch-dom.mjs';

const lesson = COMPANY_LESSONS.find((entry) => entry.missionId === 'coupa-source-to-pay-03');
const project = compileContentProject(createCompanyProject({ campaignId: lesson.campaignId }));
const row = JSON.parse(
  readFileSync(new URL('fixtures/company-campaign-routes.json', import.meta.url), 'utf8'),
).rows.find(
  (entry) =>
    entry.id === lesson.missionId &&
    entry.difficulty === 'standard' &&
    entry.turnPolicy === 'immediate',
);
const authoredManifest = resolveMission(project, row.id);
const manifest = {
  ...authoredManifest,
  level: applyGameplayTuning(authoredManifest.level, row.gameplayTuning),
};
function fixture({ source = lesson, until = Infinity } = {}) {
  const options = { seed: row.seed, classId: 'scout', turnPolicy: row.turnPolicy };
  const run = createRun(manifest.level, options);
  const recorder = createRecorder(manifest.level, options);
  const observer = createLearningEvidenceObserver({ lesson: source, run });
  const snapshots = [],
    unsafeTicks = [];
  for (const segment of row.segments) {
    for (let tick = 0; tick < segment.ticks && run.tick < until; tick++) {
      const input = { direction: segment.direction };
      recordInput(recorder, input);
      stepRun(run, input, FIXED_DT);
      const evidence = observer.observe(run);
      if (!evidence.boundary) unsafeTicks.push(run.tick);
      if (run.events.some((event) => ['cut.closed', 'objective.captured'].includes(event.type)))
        snapshots.push(evidence);
    }
    if (run.tick >= until) break;
  }
  return { run, recorder, observer, snapshots, unsafeTicks, replay: exportReplay(recorder, run) };
}
const identity = (run) =>
  dataIdentity({ level: run.level, classes: run.classRecipes, ruleset: run.ruleset });
function finish(source, run, initial = null) {
  let attempt =
    initial ?? createLearningAttempt(source, { simulationIdentity: identity(run), seed: run.seed });
  const anchor = { tick: run.tick, kind: 'result' };
  for (const record of source.records)
    attempt = reduceLearningAttempt(source, attempt, {
      type: 'inspect',
      recordId: record.id,
      anchor,
    });
  for (const field of source.fields)
    attempt = reduceLearningAttempt(source, attempt, {
      type: 'configure',
      fieldId: field.id,
      value: field.expected ?? field.options[0].value,
      anchor,
    });
  return reduceLearningAttempt(source, attempt, { type: 'commit', anchor });
}

test('evidence is released by real captures, remains immutable and cannot be recreated from a late snapshot', () => {
  const source = {
    ...lesson,
    records: [
      ...lesson.records,
      { id: 'extra-evidence', title: 'Extra fixture record', lines: ['A third fixture record.'] },
    ],
  };
  const initial = createRun(manifest.level, { seed: row.seed });
  const fresh = createLearningEvidenceObserver({ lesson: source, run: initial });
  assert.deepEqual(fresh.snapshot().availableRecordIds, []);
  assert.deepEqual(fresh.snapshot().boundary, { tick: 0, kind: 'checkpoint' });
  const result = fixture({ source });
  assert.equal(result.run.status, 'won');
  assert.equal(result.snapshots[0].availableRecordIds.length, 2);
  assert.deepEqual(result.snapshots[0].firstAvailableTicks, {
    [source.records[0].id]: row.events[0][0],
    [source.records[1].id]: row.events[0][0],
  });
  assert.equal(result.snapshots[1].availableRecordIds.length, 3);
  assert.equal(result.observer.snapshot().availableRecordIds.length, 3);
  assert(Object.isFrozen(result.snapshots[0].firstAvailableTicks));
  const before = authoritativeCheckpoint(result.run);
  const repeated = result.observer.observe(result.run);
  assert.deepEqual(repeated, result.observer.snapshot());
  assert.deepEqual(before, authoritativeCheckpoint(result.run));
  assert.throws(
    () => createLearningEvidenceObserver({ lesson: source, run: result.run }),
    /tick zero/,
  );
  stepRun(initial, {}, FIXED_DT);
  stepRun(initial, {}, FIXED_DT);
  assert.throws(() => fresh.observe(initial), /every simulation tick/);
});

test('a completed learning transcript verifies against both the real input replay and released evidence', async () => {
  const { run, replay, observer } = fixture();
  const attempt = finish(lesson, run);
  const verified = await verifyLearningEvidence({ lesson, attempt, replay });
  assert.deepEqual(verified.attempt, attempt);
  assert.deepEqual(verified.evidence, observer.snapshot());
  assert.equal(authoritativeCheckpoint(verified.state).hash, authoritativeCheckpoint(run).hash);
  assert.deepEqual(verified.observer.observe(verified.state), verified.evidence);
  const partial = fixture({ until: row.events[0][0] });
  const draft = reduceLearningAttempt(
    lesson,
    createLearningAttempt(lesson, {
      simulationIdentity: identity(partial.run),
      seed: partial.run.seed,
    }),
    {
      type: 'inspect',
      recordId: lesson.records[0].id,
      anchor: { tick: partial.run.tick, kind: 'capture' },
    },
  );
  const restored = await verifyLearningEvidence({ lesson, attempt: draft, replay: partial.replay });
  assert.deepEqual(restored.evidence, partial.observer.snapshot());
  stepRun(restored.state, {}, FIXED_DT);
  assert.doesNotThrow(() => restored.observer.observe(restored.state));
});

test('locally consistent early Inspect and unsafe Configure transcripts fail authoritative evidence checks', async () => {
  const { run, replay, unsafeTicks } = fixture();
  const fresh = () =>
    createLearningAttempt(lesson, { simulationIdentity: identity(run), seed: run.seed });
  const early = finish(
    lesson,
    run,
    reduceLearningAttempt(lesson, fresh(), {
      type: 'inspect',
      recordId: lesson.records[0].id,
      anchor: { tick: 0, kind: 'checkpoint' },
    }),
  );
  assert.equal(verifyLearningAttempt(lesson, early).valid, true);
  await assert.rejects(
    verifyLearningEvidence({ lesson, attempt: early, replay }),
    /before the game released/,
  );
  const field = lesson.fields[0];
  const unsafe = finish(
    lesson,
    run,
    reduceLearningAttempt(lesson, fresh(), {
      type: 'configure',
      fieldId: field.id,
      value: field.expected,
      anchor: { tick: unsafeTicks[0], kind: 'checkpoint' },
    }),
  );
  assert.equal(verifyLearningAttempt(lesson, unsafe).valid, true);
  await assert.rejects(
    verifyLearningEvidence({ lesson, attempt: unsafe, replay }),
    /outside a safe/,
  );
  const missing = finish(
    lesson,
    run,
    reduceLearningAttempt(lesson, fresh(), {
      type: 'configure',
      fieldId: field.id,
      value: field.expected,
    }),
  );
  await assert.rejects(
    verifyLearningEvidence({ lesson, attempt: missing, replay }),
    /boundary for every action/,
  );
});

test('evidence verifier rejects changed simulation, checkpoint, summary and cancellation', async () => {
  const { run, replay } = fixture();
  const attempt = finish(lesson, run);
  const wrongSeed = finish(
    lesson,
    run,
    createLearningAttempt(lesson, { simulationIdentity: identity(run), seed: 99 }),
  );
  await assert.rejects(
    verifyLearningEvidence({ lesson, attempt: wrongSeed, replay }),
    /different simulation or seed/,
  );
  const changed = structuredClone(replay);
  changed.checkpoint.hash = '0000000000000000';
  await assert.rejects(
    verifyLearningEvidence({ lesson, attempt, replay: changed }),
    /Checkpoint root|could not be verified/,
  );
  const summary = structuredClone(replay);
  summary.summary.score += 1;
  await assert.rejects(
    verifyLearningEvidence({ lesson, attempt, replay: summary }),
    /could not be verified/,
  );
  const abort = new AbortController();
  const pending = verifyLearningEvidence({ lesson, attempt, replay, signal: abort.signal });
  abort.abort();
  await assert.rejects(pending, { name: 'AbortError' });
});

test('pinned workbench hides unrecovered records and guards stale event handlers at unsafe boundaries', () => {
  const source = {
    ...lesson,
    records: [
      ...lesson.records,
      {
        id: 'locked-extra',
        title: 'Later record',
        lines: ['This record requires another capture.'],
      },
    ],
  };
  const { run, observer } = fixture({ source, until: row.events[0][0] });
  const document = new Document(),
    container = document.createElement('div');
  document.body.append(container);
  let evidence = observer.snapshot();
  const workbench = mountCompanyWorkbench(container, {
    lesson: source,
    attempt: createLearningAttempt(source, { simulationIdentity: identity(run), seed: run.seed }),
    evidence: () => evidence,
  });
  const control = (id) => container.querySelector(`[data-control="${id}"]`);
  const first = source.records[0],
    second = source.records[2];
  assert.equal(control(`inspect-${first.id}`).disabled, false);
  assert.equal(control(`inspect-${second.id}`).disabled, true);
  control(`inspect-${second.id}`).emit('click');
  assert.equal(workbench.getAttempt().actions.length, 0);
  control(`inspect-${first.id}`).click();
  assert(container.textContent.includes(first.lines[0]));
  assert(!container.textContent.includes(second.lines[0]));
  assert.deepEqual(workbench.getAttempt().actions[0].anchor, evidence.boundary);
  const stale = control('commit');
  evidence = { ...evidence, boundary: null };
  stale.emit('click');
  assert.equal(workbench.getAttempt().actions.length, 1);
  workbench.destroy();
  const locked = mountCompanyWorkbench(container, {
    lesson: source,
    attempt: createLearningAttempt(source, { simulationIdentity: identity(run), seed: run.seed }),
  });
  assert.equal(control(`inspect-${first.id}`).disabled, true);
  assert.equal(control('commit').disabled, true);
  locked.destroy();
});
