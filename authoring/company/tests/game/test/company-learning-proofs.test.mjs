import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createCompanyLearningProofStore } from '../company-campaigns/learning-proofs.mjs';
import { createLearningAttempt, reduceLearningAttempt } from '../company-campaigns/learning.mjs';
import { COMPANY_LESSONS } from '../company-campaigns/lessons.mjs';
import { createCompanyProject } from '../company-campaigns/content.mjs';
import { compileContentProject, resolveMission } from '../content-design/project.mjs';
import { applyGameplayTuning } from '../gameplay-tuning.mjs';
import { createRun, stepRun, FIXED_DT } from '../core/index.mjs';
import { createRecorder, recordInput, exportReplay } from '../replay.mjs';
import { companySimulationIdentity } from '../company-session.mjs';
import { completionLearningReference } from '../rewards/learning.mjs';
import { canonicalJSON } from '../data-json.mjs';
import { createHash } from 'node:crypto';

const lesson = COMPANY_LESSONS.find((entry) => entry.missionId === 'coupa-source-to-pay-01');
const row = JSON.parse(
  readFileSync(new URL('fixtures/company-campaign-routes.json', import.meta.url)),
).rows.find(
  (entry) =>
    entry.id === lesson.missionId &&
    entry.difficulty === 'standard' &&
    entry.turnPolicy === 'immediate',
);
function fixture() {
  const project = compileContentProject(
    createCompanyProject({ brandId: 'coupa', campaignId: lesson.campaignId }),
  );
  const manifest = resolveMission(project, lesson.missionId, { difficulty: row.difficulty });
  const level = applyGameplayTuning(manifest.level, row.gameplayTuning);
  const options = { seed: row.seed, classId: 'scout', turnPolicy: row.turnPolicy };
  const run = createRun(level, options),
    recorder = createRecorder(level, options);
  for (const segment of row.segments)
    for (let tick = 0; tick < segment.ticks; tick++) {
      const input = { direction: segment.direction };
      stepRun(run, input, FIXED_DT);
      recordInput(recorder, input);
    }
  assert.equal(run.status, 'won');
  let attempt = createLearningAttempt(lesson, {
    simulationIdentity: companySimulationIdentity(run),
    seed: run.seed,
  });
  const anchor = { tick: run.tick, kind: 'result' };
  for (const record of lesson.records)
    attempt = reduceLearningAttempt(lesson, attempt, {
      type: 'inspect',
      recordId: record.id,
      anchor,
    });
  for (const field of lesson.fields)
    attempt = reduceLearningAttempt(lesson, attempt, {
      type: 'configure',
      fieldId: field.id,
      value: field.expected,
      anchor,
    });
  attempt = reduceLearningAttempt(lesson, attempt, { type: 'commit', anchor });
  const data = new Map(),
    storage = {
      getItem: (key) => data.get(key) ?? null,
      setItem: (key, value) => data.set(key, value),
    };
  const config = {
    editionId: 'coupa-foundations',
    storage,
    lessons: [lesson],
    acceptSimulation: (missionId, identity) =>
      missionId === lesson.missionId && identity === companySimulationIdentity(run),
  };
  return { attempt, replay: exportReplay(recorder, run), config, data };
}

test('historical mastery retains independently replayed proof across retries, reload and backup', async () => {
  const f = fixture(),
    store = createCompanyLearningProofStore(f.config);
  assert.equal(store.load(lesson.missionId), null);
  const initial = store.rewardEvidence();
  let changes = 0;
  const stop = store.onRewardEvidenceChange(() => changes++);
  const proof = await store.prove(f);
  assert.equal(store.rewardEvidence(), initial, 'Verification alone does not adopt completion.');
  assert.equal(store.saveVerified(proof), true);
  assert.equal(store.key, 'revealline.company-learning-proofs.coupa-foundations.v1');
  assert.equal(store.recoveryKey, store.key + '.recovery');
  const originalBody = {
    format: 'revealline-learning-proof.v1',
    editionId: f.config.editionId,
    attempt: f.attempt,
    replay: f.replay,
  };
  const originalProof = {
    ...originalBody,
    proofId: createHash('sha256').update(canonicalJSON(originalBody)).digest('hex'),
  };
  assert.equal(
    f.data.get(store.key),
    JSON.stringify({
      format: 'revealline-learning-proof-store.v1',
      editionId: f.config.editionId,
      proofs: [originalProof],
    }),
    'The shared evidence lifecycle preserves the original learning wire bytes and keys.',
  );
  assert.equal(changes, 1);
  assert.deepEqual(store.rewardEvidence().learning, [
    { ...completionLearningReference(lesson), attemptId: f.attempt.id },
  ]);
  assert.deepEqual(store.rewardEvidence().durableLearning, store.rewardEvidence().learning);
  stop();
  const reopened = createCompanyLearningProofStore(f.config);
  assert.deepEqual(await reopened.hydrate(), { verified: 1, rejected: 0 });
  assert.equal(reopened.load(lesson.missionId).status, 'complete');
  assert.deepEqual(reopened.rewardEvidence().durableLearning, store.rewardEvidence().learning);
  const backup = JSON.parse(JSON.stringify(store.exportProofs()));
  assert.throws(() => reopened.saveVerified(backup[0]), /replay-verified/);
  assert.equal(reopened.importVerified(await reopened.inspectProofs(backup)), true);
  assert.deepEqual(reopened.exportProofs(), store.exportProofs());
  const importedValues = new Map();
  const anotherOrigin = createCompanyLearningProofStore({
    ...f.config,
    storage: {
      getItem: (key) => importedValues.get(key) ?? null,
      setItem: (key, value) => importedValues.set(key, value),
    },
  });
  assert.equal(anotherOrigin.load(lesson.missionId), null);
  assert.equal(anotherOrigin.importVerified(await anotherOrigin.inspectProofs(backup)), true);
  assert.equal(anotherOrigin.load(lesson.missionId).status, 'complete');
  assert.equal(importedValues.has(store.key), true);
});

test('tampered, foreign, duplicate and unselected learning proofs cannot alter progress', async () => {
  const f = fixture(),
    store = createCompanyLearningProofStore(f.config),
    proof = await store.prove(f);
  store.saveVerified(proof);
  const bad = structuredClone(proof);
  bad.replay.segments[0].input.direction =
    bad.replay.segments[0].input.direction === 'left' ? 'right' : 'left';
  await assert.rejects(store.inspectProofs([bad]), /identity.*bytes/);
  await assert.rejects(store.inspectProofs([proof, proof]), /Too many|Duplicate/);
  const other = createCompanyLearningProofStore({ ...f.config, editionId: 'other' });
  await assert.rejects(other.inspectProofs([proof]), /Wrong learning proof edition/);
  const missing = createCompanyLearningProofStore({ ...f.config, acceptSimulation: () => false });
  await assert.rejects(missing.inspectProofs([proof]), /selected simulation/);
  f.data.set(
    store.key,
    JSON.stringify({
      format: 'revealline-learning-proof-store.v1',
      editionId: f.config.editionId,
      proofs: [bad],
    }),
  );
  assert.deepEqual(await createCompanyLearningProofStore(f.config).hydrate(), {
    verified: 0,
    rejected: 1,
  });
  assert.equal(store.load(lesson.missionId).status, 'complete');
});

test('storage failure and read-only tabs preserve verified in-memory backup evidence', async () => {
  const f = fixture(),
    store = createCompanyLearningProofStore({
      ...f.config,
      storage: {
        getItem: () => null,
        setItem: () => {
          throw Error('full');
        },
      },
    });
  const proof = await store.prove(f);
  assert.equal(store.saveVerified(proof), false);
  assert.equal(store.load(lesson.missionId).status, 'complete');
  assert.equal(store.exportProofs()[0].proofId, proof.proofId);
  assert.equal(store.rewardEvidence().learning.length, 1);
  assert.deepEqual(store.rewardEvidence().durableLearning, []);
  const writable = createCompanyLearningProofStore(f.config);
  writable.saveVerified(await writable.prove(f));
  const reader = createCompanyLearningProofStore({
    ...f.config,
    storage: { getItem: f.config.storage.getItem },
  });
  assert.equal((await reader.hydrate()).verified, 1);
  assert.equal(reader.load(lesson.missionId).status, 'complete');
});

test('a changed lesson does not inherit reward evidence, while restoring the exact retained lesson re-verifies its original proof', async () => {
  const f = fixture(),
    store = createCompanyLearningProofStore(f.config);
  store.saveVerified(await store.prove(f));
  const original = f.data.get(store.key);
  const newer = createCompanyLearningProofStore({
    ...f.config,
    lessons: [{ ...lesson, fixtureRevision: '2' }],
  });
  assert.equal((await newer.hydrate()).rejected, 1);
  assert.deepEqual(newer.rewardEvidence().learning, []);
  assert.deepEqual(newer.rewardEvidence().durableLearning, []);
  assert(newer.exportRecovery().sources.includes(original));
  assert.equal(f.data.get(store.key), original);
  const retained = createCompanyLearningProofStore(f.config);
  assert.equal((await retained.hydrate()).verified, 1);
  assert.deepEqual(retained.rewardEvidence().learning, store.rewardEvidence().learning);
});

test('unrecognized historical proof bytes survive a later valid save in a recovery journal', async () => {
  const f = fixture(),
    store = createCompanyLearningProofStore(f.config),
    proof = await store.prove(f);
  const historical = JSON.stringify({
    format: 'retired-learning-format',
    editionId: f.config.editionId,
    note: 'Original historical proof must remain recoverable.',
  });
  f.data.set(store.key, historical);
  assert.equal((await store.hydrate()).rejected, 1);
  assert.deepEqual(store.exportRecovery().sources, [historical]);
  assert.equal(store.saveVerified(proof), true);
  assert.deepEqual(JSON.parse(f.data.get(store.recoveryKey)).sources, [historical]);
  const reopened = createCompanyLearningProofStore(f.config);
  await reopened.hydrate();
  assert.equal(reopened.load(lesson.missionId).status, 'complete');
  assert.deepEqual(reopened.exportRecovery().sources, [historical]);
  const checked = reopened.inspectRecovery(store.exportRecovery());
  assert.equal(reopened.importRecovery(checked), true);
});

test('an unreadable proof store cannot authorize overwriting unseen history on a later valid save', async () => {
  const f = fixture();
  let writes = 0;
  const store = createCompanyLearningProofStore({
    ...f.config,
    storage: {
      getItem() {
        throw new Error('storage access denied');
      },
      setItem() {
        writes++;
      },
    },
  });
  assert.equal((await store.hydrate()).rejected, 1);
  const proof = await store.prove(f);
  assert.equal(store.saveVerified(proof), false);
  assert.equal(writes, 0);
  assert.equal(store.exportProofs()[0].proofId, proof.proofId);
});

test('recovery import validates the merged journal budget before changing retained records', () => {
  const f = fixture(),
    store = createCompanyLearningProofStore(f.config);
  const first = {
    format: 'revealline-learning-proof-recovery.v1',
    editionId: f.config.editionId,
    sources: ['a'.repeat(5 * 1024 * 1024)],
  };
  assert.equal(store.importRecovery(store.inspectRecovery(first)), true);
  const before = store.exportRecovery();
  const second = { ...first, sources: ['b'.repeat(4 * 1024 * 1024)] };
  assert.throws(() => store.inspectRecovery(second), /large|budget|bytes|limit/i);
  assert.deepEqual(store.exportRecovery(), before);
  assert.equal(
    store.importRecovery(store.inspectRecovery(first)),
    true,
    'duplicate recovery bytes need no additional budget',
  );
});
