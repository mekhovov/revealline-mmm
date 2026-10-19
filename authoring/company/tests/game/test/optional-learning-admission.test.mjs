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
import { canonicalJSON } from '../data-json.mjs';

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

import { createMediaPreparation } from '../ui/media-preparation.mjs';
import { verifyLearningEvidence } from '../company-campaigns/evidence.mjs';
const delay = () => new Promise((resolve) => setTimeout(resolve, 1));
async function until(fn) {
  const end = Date.now() + 2000;
  while (!fn() && Date.now() < end) await delay();
  assert(fn(), 'bounded learning admission state missing');
}
function admission(t) {
  const media = createMediaPreparation();
  let chunks = 0;
  t.after(() => media.close());
  return {
    media,
    get chunks() {
      return chunks;
    },
    scheduleChunk: (work, { signal }) =>
      media.run(
        'main',
        () => {
          chunks++;
          work();
          if (chunks === 1) media.setPhase('playing');
        },
        { signal },
      ),
  };
}
for (const mode of ['prove', 'hydrate', 'abort'])
  test(`optional learning ${mode} preserves anchored proof across active play and Pause`, async (t) => {
    const f = fixture(),
      expectedStore = createCompanyLearningProofStore(f.config),
      expected = await expectedStore.prove(f);
    if (mode === 'hydrate') assert.equal(expectedStore.saveVerified(expected), true);
    const input = structuredClone({ attempt: f.attempt, replay: f.replay }),
      before = new Map(f.data),
      owner = admission(t),
      store = createCompanyLearningProofStore({ ...f.config, scheduleChunk: owner.scheduleChunk }),
      controller = new AbortController();
    let done = false;
    const pending = (
      mode === 'hydrate'
        ? store.hydrate({ signal: controller.signal })
        : store.prove({ ...input, signal: controller.signal })
    ).then((value) => {
      done = true;
      return value;
    });
    const caught = pending.catch((error) => error);
    await until(() => owner.media.snapshot().queued === 1);
    input.attempt.actions[0].anchor.tick = 0;
    input.replay.level.name = 'late mutation';
    for (let i = 0; i < 4; i++) await delay();
    assert.equal(done, false);
    assert.equal(owner.chunks, 1);
    assert.deepEqual(f.data, before);
    assert.equal(store.rewardEvidence().learning.length, 0);
    if (mode === 'abort') {
      controller.abort();
      assert.equal((await caught).name, 'AbortError');
      owner.media.setPhase('paused');
      await delay();
      assert.deepEqual(f.data, before);
      assert.equal(store.rewardEvidence().learning.length, 0);
    } else {
      owner.media.setPhase('paused');
      const result = await pending;
      if (mode === 'prove') {
        assert.deepEqual(result, expected);
        assert.equal(store.saveVerified(result), true);
      }
      assert.equal(store.rewardEvidence().learning.length, 1);
      assert.deepEqual(store.exportProofs(), [expected]);
      assert.deepEqual(store.rewardEvidence().durableLearning, store.rewardEvidence().learning);
    }
    assert.equal(owner.media.snapshot().queued, 0);
  });
test('learning snapshot, result and observer remain exact with admitted chunks; required defaults stay available during play', async (t) => {
  const f = fixture(),
    before = canonicalJSON(f.attempt),
    expected = await verifyLearningEvidence({ lesson, attempt: f.attempt, replay: f.replay });
  const owner = admission(t),
    source = structuredClone({ attempt: f.attempt, replay: f.replay });
  const pending = verifyLearningEvidence({ lesson, ...source, scheduleChunk: owner.scheduleChunk });
  source.attempt.actions[0].anchor.tick = 0;
  source.replay.segments[0].input.direction = 'up';
  await until(() => owner.media.snapshot().queued === 1);
  const defaults = await verifyLearningEvidence({ lesson, attempt: f.attempt, replay: f.replay });
  assert.deepEqual(defaults.state, expected.state);
  assert.equal(owner.chunks, 1);
  owner.media.setPhase('paused');
  const result = await pending;
  assert.deepEqual(result.state, expected.state);
  assert.deepEqual(result.evidence, expected.evidence);
  assert.equal(canonicalJSON(result.attempt), before);
  assert.deepEqual(result.observer.observe(result.state), result.evidence);
});
test('learning admission rejects omitted, duplicated and retired work without granting proof', async () => {
  const f = fixture(),
    source = { lesson, attempt: f.attempt, replay: f.replay };
  let late;
  await assert.rejects(
    verifyLearningEvidence({
      ...source,
      scheduleChunk: (work) => {
        late = work;
      },
    }),
    /did not run/,
  );
  assert.throws(() => late(), /exactly once/);
  await assert.rejects(
    verifyLearningEvidence({
      ...source,
      scheduleChunk: (work) => {
        work();
        try {
          work();
        } catch {}
      },
    }),
    /exactly once/,
  );
  await assert.rejects(verifyLearningEvidence({ ...source, scheduleChunk: 1 }), /function/);
});
