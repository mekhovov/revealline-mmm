import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { COMPANY_CAMPAIGNS } from '../company-campaigns/catalog.mjs';
import { createCompanyLearningRewards } from '../company-campaigns/learning-rewards.mjs';
import { createCompanyLearningProofStore } from '../company-campaigns/learning-proofs.mjs';
import { createLearningAttempt, reduceLearningAttempt } from '../company-campaigns/learning.mjs';
import { completionLearningReference } from '../rewards/learning.mjs';
import { createRewardMissionBindings } from '../rewards/bindings.mjs';
import { projectRewardProgress, reconcileEarnedRewards } from '../rewards/model.mjs';
import { loadEditionBootstrap } from '../editions/bootstrap.mjs';
import { validateRetainedPresentation } from '../editions/retained-presentation.mjs';
import { compileContentProject, resolveMission } from '../content-design/project.mjs';
import { applyGameplayTuning } from '../gameplay-tuning.mjs';
import { createRun, stepRun, FIXED_DT } from '../core/index.mjs';
import { createRecorder, recordInput, exportReplay } from '../replay.mjs';
import { companySimulationIdentity } from '../company-session.mjs';

const root = new URL('../../', import.meta.url);
const json = async (file) => JSON.parse(await readFile(new URL(file, root), 'utf8'));
const campaignId = 'coupa-source-to-pay';
const missionId = `${campaignId}-01`;
const catalog = await json('game/editions/catalog.json');
const descriptor = catalog.campaigns.find((entry) => entry.id === campaignId);
const source = await json(descriptor.sourcePath);
const lessons = await json(descriptor.lessonPath);
const lesson = lessons.find((entry) => entry.missionId === missionId);
const rewards = await json(descriptor.rewardPath);
const definition = COMPANY_CAMPAIGNS.find((entry) => entry.id === campaignId);
const missionBindings = createRewardMissionBindings(source);
const context = (learning = []) => ({
  editionId: 'coupa-foundations',
  brandId: 'coupa',
  campaignIds: [campaignId],
  clears: {
    [missionId]: {
      runId: 'accepted-find-need',
      ...missionBindings[0].bindings.find((entry) => entry.difficulty === 'standard'),
    },
  },
  learning,
  mastery: [],
});

test('optional Find the Need discovery pins the existing lesson and leaves game records intact', () => {
  assert.deepEqual(createCompanyLearningRewards({ definition, missionBindings, lessons }), rewards);
  assert.equal(rewards.length, 1);
  assert.deepEqual(rewards[0].requirements.learning, [completionLearningReference(lesson)]);
  assert.deepEqual(
    rewards[0].requirements.missions.map((entry) => entry.missionId),
    [missionId],
  );
  assert.equal(rewards[0].scope.kind, 'mission');
  assert.equal(rewards[0].payloads[0].type, 'knowledge');
  assert.notEqual(rewards[0].locales.en.teaser, rewards[0].locales.uk.teaser);
  assert.throws(
    () => createCompanyLearningRewards({ definition, missionBindings, lessons: [] }),
    /exact selected/,
  );
  const original = JSON.stringify(source);
  assert.equal(projectRewardProgress(rewards[0], context()).eligible, false);
  assert.equal(JSON.stringify(source), original);
});

test('real accepted replay and correct workbench commit grant the optional reward once', async () => {
  const route = (await json('game/test/fixtures/company-campaign-routes.json')).rows.find(
    (entry) =>
      entry.id === missionId && entry.difficulty === 'standard' && entry.turnPolicy === 'immediate',
  );
  const project = compileContentProject(source);
  const manifest = resolveMission(project, missionId, { difficulty: route.difficulty });
  const level = applyGameplayTuning(manifest.level, route.gameplayTuning);
  const options = { seed: route.seed, classId: 'scout', turnPolicy: route.turnPolicy };
  const run = createRun(level, options),
    recorder = createRecorder(level, options);
  for (const segment of route.segments)
    for (let tick = 0; tick < segment.ticks; tick++) {
      const input = { direction: segment.direction };
      stepRun(run, input, FIXED_DT);
      recordInput(recorder, input);
    }
  assert.equal(run.status, 'won');
  const simulationIdentity = companySimulationIdentity(run);
  const replay = exportReplay(recorder, run);
  const values = new Map();
  const store = createCompanyLearningProofStore({
    editionId: 'coupa-foundations',
    lessons,
    storage: {
      getItem: (key) => values.get(key) ?? null,
      setItem: (key, value) => values.set(key, value),
    },
    acceptSimulation: (id, identity) => id === missionId && identity === simulationIdentity,
  });
  let attempt = createLearningAttempt(lesson, { simulationIdentity, seed: run.seed });
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
      value: field.options.find((option) => option.value !== field.expected).value,
      anchor,
    });
  attempt = reduceLearningAttempt(lesson, attempt, { type: 'commit', anchor });
  assert.notEqual(attempt.status, 'complete');
  await assert.rejects(store.prove({ attempt, replay }));
  assert.deepEqual(store.rewardEvidence().learning, []);
  assert.equal(reconcileEarnedRewards(rewards, context()).granted.length, 0);
  for (const field of lesson.fields)
    attempt = reduceLearningAttempt(lesson, attempt, {
      type: 'configure',
      fieldId: field.id,
      value: field.expected,
      anchor,
    });
  attempt = reduceLearningAttempt(lesson, attempt, { type: 'commit', anchor });
  assert.equal(store.saveVerified(await store.prove({ attempt, replay })), true);
  const accepted = context(store.rewardEvidence().durableLearning);
  const granted = reconcileEarnedRewards(rewards, accepted);
  assert.equal(granted.granted.length, 1);
  assert.equal(granted.granted[0].evidence.learning[0].attemptId, attempt.id);
  assert.equal(reconcileEarnedRewards(rewards, accepted, granted.state).granted.length, 0);
  assert.equal(projectRewardProgress(rewards[0], { ...accepted, clears: {} }).eligible, false);
  const wrongFixture = structuredClone(accepted);
  wrongFixture.learning[0].fixtureRevision = 'other';
  assert.equal(projectRewardProgress(rewards[0], wrongFixture).eligible, false);
});

test('only the two permitted editions request the new sidecar', async () => {
  const requested = [];
  const fetcher = async (url) => {
    const file = new URL(url).pathname.slice(1);
    requested.push(file);
    return new Response(await readFile(new URL(file, root)));
  };
  for (const editionId of ['coupa-foundations', 'coupa-all', 'coupa-adventure']) {
    requested.length = 0;
    const bootstrap = await loadEditionBootstrap({
      editionId,
      fetcher,
      catalogURL: 'https://edition.invalid/game/editions/catalog.json',
      contentBaseURL: 'https://edition.invalid/',
    });
    const permitted = editionId !== 'coupa-adventure';
    assert.equal(requested.includes(descriptor.rewardPath), permitted);
    assert.equal(Boolean(bootstrap.rewards?.[campaignId]), permitted);
  }
});

test('both pre-bonus presentations retain exact data, original lessons and previous promises', async () => {
  for (const [id, expectedHash, revision] of [
    ['coupa-foundations', 'bb5393ff4a73f30346496334ac6004d84766dfbd958dbdfb62d2b3554e20d429', 7],
    ['coupa-all', '13e5c4ff2313ebd3714e6d6461e2468857be6e4997fede8da24542880951df13', 8],
  ]) {
    const edition = catalog.editions.find((entry) => entry.id === id);
    const history = edition.presentationHistory.find((entry) => entry.id === expectedHash);
    assert.ok(history);
    assert.equal(edition.revision, revision);
    const bytes = await readFile(new URL(history.path, root));
    assert.equal(bytes.length, history.bytes);
    assert.equal(createHash('sha256').update(bytes).digest('hex'), history.sha256);
    const { snapshot, bootstrap } = await validateRetainedPresentation(bytes.toString('utf8'), {
      edition,
    });
    assert.equal(snapshot.authoredPresentationSha256, expectedHash);
    assert.equal(bootstrap.rewards?.[campaignId], undefined);
    assert.deepEqual(bootstrap.lessons[campaignId], lessons);
    assert.deepEqual(
      snapshot.files.find((entry) => entry.path === descriptor.sourcePath).data,
      source,
    );
    for (const previous of snapshot.catalog.campaigns.filter((entry) => entry.rewardPath)) {
      assert.deepEqual(
        snapshot.files.find((entry) => entry.path === previous.rewardPath).data,
        await json(previous.rewardPath),
      );
    }
  }
});
