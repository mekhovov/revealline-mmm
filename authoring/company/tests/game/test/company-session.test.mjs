import test from 'node:test';
import assert from 'node:assert/strict';
import { createCompanyProject } from '../company-campaigns/content.mjs';
import { createCompanyThemes } from '../company-campaigns/brands.mjs';
import { createCandidateSoloHost } from '../content-design/solo-host.mjs';
import { stepRun, releaseInputs, FIXED_DT } from '../core/index.mjs';
import {
  authoritativeCheckpoint,
  recordInput,
  recordRelease,
  exportReplay,
  verifyReplay,
} from '../replay.mjs';
import {
  captureCompanySession,
  restoreCompanySession,
  companySimulationIdentity,
} from '../company-session.mjs';
import { COMPANY_LESSONS } from '../company-campaigns/lessons.mjs';
import { createLearningAttempt, reduceLearningAttempt } from '../company-campaigns/learning.mjs';

const editionId = 'coupa-adventure';
const presentationIdentity = 'ab'.repeat(32);
function host() {
  return createCandidateSoloHost(
    createCompanyProject({ brandId: 'coupa', campaignId: 'coupa-spend-in-motion' }),
    {
      themes: createCompanyThemes('coupa'),
      buildVersion: 'test',
      corePackIds: ['coupa-spend-in-motion-pack'],
    },
  );
}
async function fixture(t) {
  const owner = host();
  t.after(() => owner.preparer.dispose());
  const mission = owner.catalog.missions[0];
  const prepared = await owner.preparer.prepare({
    missionId: mission.id,
    difficulty: 'standard',
    seed: 1,
    turnPolicy: 'immediate',
  });
  owner.preparer.take(prepared);
  const run = prepared.run,
    recorder = prepared.recorder;
  for (const [direction, ticks] of [
    ['right', 48],
    ['down', 120],
  ])
    for (let tick = 0; tick < ticks; tick++) {
      const input = { direction };
      recordInput(recorder, input);
      stepRun(run, input, FIXED_DT);
    }
  releaseInputs(run);
  recordRelease(recorder);
  const saved = captureCompanySession({
    editionId,
    presentationIdentity,
    missionId: mission.id,
    difficulty: 'standard',
    runId: 'company-test-attempt',
    run,
    recorder,
  });
  return { owner, mission, run, recorder, saved };
}

test('company session restores the exact active cut and extends its public replay', async (t) => {
  const { owner, run, saved } = await fixture(t);
  assert.equal(run.player.cutting, true);
  const checkpoint = authoritativeCheckpoint(run).hash;
  const restored = await restoreCompanySession(JSON.stringify(saved), {
    editionId,
    presentationIdentity,
    prepare: owner.preparer.prepare,
  });
  assert.equal(authoritativeCheckpoint(restored.run).hash, checkpoint);
  assert.notEqual(restored.run, run);
  assert.equal(restored.recorder.releaseAfter, true);
  assert(owner.preparer.current(restored.prepared));
  owner.preparer.take(restored.prepared);
  for (let tick = 0; tick < 30; tick++) {
    const input = { direction: 'down' };
    recordInput(restored.recorder, input);
    stepRun(restored.run, input, FIXED_DT);
  }
  assert.equal(verifyReplay(exportReplay(restored.recorder, restored.run)).match, true);
  assert.equal(
    authoritativeCheckpoint(run).hash,
    checkpoint,
    'restoration must not retire or mutate the running host state',
  );
});

test('edition and artwork identity mismatch fail before preparing or replacing the current run', async (t) => {
  const { run, saved } = await fixture(t);
  const before = authoritativeCheckpoint(run).hash;
  let prepared = 0;
  const prepare = () => {
    prepared++;
    throw Error('must not prepare');
  };
  await assert.rejects(
    restoreCompanySession(saved, { editionId: 'coupa-developers', presentationIdentity, prepare }),
    /different edition/,
  );
  await assert.rejects(
    restoreCompanySession(saved, { editionId, presentationIdentity: 'cd'.repeat(32), prepare }),
    /exact earlier content/,
  );
  assert.equal(prepared, 0);
  assert.equal(authoritativeCheckpoint(run).hash, before);
});

test('learning session restore requires the exact lesson, simulation, seed and bounded anchor ticks', async (t) => {
  const lesson = COMPANY_LESSONS.find((entry) => entry.missionId === 'coupa-source-to-pay-01');
  const owner = createCandidateSoloHost(
    createCompanyProject({ brandId: 'coupa', campaignId: lesson.campaignId }),
    {
      themes: createCompanyThemes('coupa'),
      buildVersion: 'test',
      corePackIds: [`${lesson.campaignId}-pack`],
    },
  );
  t.after(() => owner.preparer.dispose());
  const mission = owner.catalog.missions[0];
  const prepared = await owner.preparer.prepare({
    missionId: mission.id,
    difficulty: 'standard',
    seed: 0xffffffff,
    turnPolicy: 'immediate',
  });
  owner.preparer.take(prepared);
  const learning = createLearningAttempt(lesson, {
    simulationIdentity: companySimulationIdentity(prepared.run),
    seed: prepared.run.seed,
  });
  const saved = captureCompanySession({
    editionId: 'coupa-foundations',
    presentationIdentity,
    missionId: mission.id,
    difficulty: 'standard',
    runId: 'learning-test',
    run: prepared.run,
    recorder: prepared.recorder,
    learning,
    lesson,
  });
  const options = {
    editionId: 'coupa-foundations',
    presentationIdentity,
    prepare: owner.preparer.prepare,
    lessonFor: () => lesson,
  };
  const restored = await restoreCompanySession(saved, options);
  assert.deepEqual(restored.saved.learning, learning);
  for (const bad of [
    createLearningAttempt(lesson, {
      simulationIdentity: companySimulationIdentity(prepared.run),
      seed: 1,
    }),
    createLearningAttempt(lesson, {
      simulationIdentity: '0000000000000000',
      seed: prepared.run.seed,
    }),
  ])
    await assert.rejects(
      restoreCompanySession({ ...saved, learning: bad }, options),
      /different simulation or seed/,
    );
  const future = reduceLearningAttempt(lesson, learning, {
    type: 'inspect',
    recordId: lesson.records[0].id,
    anchor: { kind: 'checkpoint', tick: 1 },
  });
  await assert.rejects(
    restoreCompanySession({ ...saved, learning: future }, options),
    /extends beyond/,
  );
  await assert.rejects(
    restoreCompanySession(saved, {
      ...options,
      lessonFor: () => ({ ...lesson, fixtureRevision: '2' }),
    }),
    /lesson revision/,
  );
  await assert.rejects(
    restoreCompanySession({ ...saved, learning: null }, options),
    /lesson revision/,
  );
  await assert.rejects(
    restoreCompanySession(saved, { ...options, lessonFor: () => null }),
    /no learning transcript/,
  );
});

test('a valid replay for a different authored mission cannot masquerade as the selected mission', async (t) => {
  const { owner, run, saved } = await fixture(t);
  const before = authoritativeCheckpoint(run).hash;
  const changed = structuredClone(saved);
  changed.missionId = owner.catalog.missions[1].id;
  let released = 0;
  const prepare = async (...args) => ({
    ...(await owner.preparer.prepare(...args)),
    picture: {
      release() {
        released++;
      },
    },
  });
  await assert.rejects(
    restoreCompanySession(changed, { editionId, presentationIdentity, prepare }),
    /differs from this authored mission/,
  );
  assert.equal(released, 1);
  assert.equal(authoritativeCheckpoint(run).hash, before);
});

test('tampered replay input is rejected and prepared presentation is released', async (t) => {
  const { owner, saved } = await fixture(t);
  const changed = structuredClone(saved);
  changed.replay.segments[0].input.direction = 'left';
  let released = 0;
  const prepare = async (...args) => ({
    ...(await owner.preparer.prepare(...args)),
    picture: {
      release() {
        released++;
      },
    },
  });
  await assert.rejects(
    restoreCompanySession(changed, { editionId, presentationIdentity, prepare }),
    /could not be verified/,
  );
  assert.equal(released, 1);
});

test('cancellation before or during replay verification retains current gameplay and releases the candidate', async (t) => {
  const { owner, run, saved } = await fixture(t);
  const before = authoritativeCheckpoint(run).hash;
  const early = new AbortController();
  early.abort();
  await assert.rejects(
    restoreCompanySession(saved, {
      editionId,
      presentationIdentity,
      prepare: owner.preparer.prepare,
      signal: early.signal,
    }),
    { name: 'AbortError' },
  );
  const during = new AbortController();
  let released = 0;
  const prepare = async (...args) => {
    const candidate = await owner.preparer.prepare(...args);
    during.abort();
    return {
      ...candidate,
      picture: {
        release() {
          released++;
        },
      },
    };
  };
  await assert.rejects(
    restoreCompanySession(saved, {
      editionId,
      presentationIdentity,
      prepare,
      signal: during.signal,
    }),
    { name: 'AbortError' },
  );
  assert.equal(released, 1);
  assert.equal(authoritativeCheckpoint(run).hash, before);
});
