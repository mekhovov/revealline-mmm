import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRun, stepRun, FIXED_DT } from '../core/index.mjs';
import { createRecorder, recordInput, exportReplay } from '../replay.mjs';
import { dataIdentity, canonicalJSON } from '../data-json.mjs';
import { createCompanyProject } from '../company-campaigns/content.mjs';
import { compileContentProject, resolveMission } from '../content-design/project.mjs';
import { applyGameplayTuning } from '../gameplay-tuning.mjs';
import { createRewardMissionBindings } from '../rewards/bindings.mjs';
import {
  resolveJourneyMasteryRequirement,
  verifyJourneyMasteryRun,
  verifiedJourneyMasteryEvidence,
} from '../mastery-journey.mjs';
import { createJourneyMasteryProofStore } from '../mastery-journey-proofs.mjs';

const requirementFor = (missionId) => ({ id: 'journey-no-loss-win', revision: '1', missionId });
function flight(level, options = { seed: 1, classId: 'scout', turnPolicy: 'immediate' }) {
  const run = createRun(level, options),
    recorder = createRecorder(level, options);
  function advance(direction, ticks) {
    for (let tick = 0; tick < ticks; tick++) {
      assert.ok(['running', 'respawning'].includes(run.status));
      const input = { direction };
      stepRun(run, input, FIXED_DT);
      recordInput(recorder, input);
    }
  }
  return { run, recorder, advance };
}
function snapshot(f, runId = 'accepted-no-loss', difficulty = 'standard') {
  const clear = {
    missionId: f.run.levelId,
    runId,
    difficulty,
    gameplayId: dataIdentity({
      ruleset: f.run.ruleset,
      level: f.run.level,
      classes: f.run.classRecipes,
    }),
  };
  return {
    clear,
    requirement: requirementFor(f.run.levelId),
    replay: exportReplay(f.recorder, f.run),
    bindings: [
      { missionId: f.run.levelId, bindings: [{ difficulty, gameplayId: clear.gameplayId }] },
    ],
  };
}
function fixture({ lostLife = false } = {}) {
  // Real legal life recovery followed by an extra-life pickup. Current lives
  // return to the starting count, which must never hide a lost life.
  const f = flight({
    version: 'xonix-level.v4',
    id: 'mastery-classic-fixture',
    name: 'Proof fixture',
    revision: '1',
    width: 72,
    height: 36,
    encounter: null,
    classic: {
      version: 'classic.v1',
      terrain: [],
      powerups: [{ id: 'life', kind: 'extra-life', x: 60.5, y: 15.5 }],
    },
    spawn: { x: 60.5, y: 0.5 },
    goal: { coverage: 0.1 },
    enemies: [{ id: 'seed', type: 'bouncer', x: 20.5, y: 18.5, vx: 0, vy: 0 }],
    rules: { lives: 3, respawnSeconds: 0.1, graceSeconds: 0 },
  });
  if (lostLife) {
    f.advance('down', 35);
    for (let tick = 0; tick < 35 && f.run.status === 'running'; tick++) f.advance('up', 1);
    while (f.run.status === 'respawning') f.advance(null, 1);
  }
  for (let tick = 0; tick < 700 && f.run.status === 'running'; tick++) f.advance('down', 1);
  assert.equal(f.run.status, 'won');
  return { ...snapshot(f), run: f.run };
}
function storeFixture(f, { values = new Map(), storage, acceptClear } = {}) {
  const config = {
    editionId: 'mastery-fixture',
    requirements: [f.requirement],
    bindings: f.bindings,
    storage: storage ?? {
      getItem: (key) => values.get(key) ?? null,
      setItem: (key, value) => values.set(key, value),
    },
    acceptClear: acceptClear ?? ((clear) => canonicalJSON(clear) === canonicalJSON(f.clear)),
  };
  return { config, values, store: createJourneyMasteryProofStore(config) };
}

test('current tuned Solo gameplay verifies through its exact selected binding without changing replay bytes', async () => {
  const source = createCompanyProject({ brandId: 'coupa', campaignId: 'coupa-source-to-pay' });
  const missionId = 'coupa-source-to-pay-01';
  const route = JSON.parse(
    readFileSync(new URL('fixtures/company-campaign-routes.json', import.meta.url)),
  ).rows.find(
    (row) =>
      row.id === missionId && row.difficulty === 'standard' && row.turnPolicy === 'immediate',
  );
  const manifest = resolveMission(compileContentProject(source), missionId, {
    difficulty: route.difficulty,
  });
  const f = flight(applyGameplayTuning(manifest.level, route.gameplayTuning), {
    seed: route.seed,
    classId: 'scout',
    turnPolicy: route.turnPolicy,
  });
  for (const segment of route.segments) f.advance(segment.direction, segment.ticks);
  const input = { ...snapshot(f), bindings: createRewardMissionBindings(source) };
  const before = canonicalJSON(input);
  const result = await verifyJourneyMasteryRun(input);
  assert.equal(result.qualified, true);
  assert.equal(result.livesLost, 0);
  assert.deepEqual(verifiedJourneyMasteryEvidence(result), {
    ...input.requirement,
    runId: input.clear.runId,
  });
  assert.equal(canonicalJSON(input), before);
  assert.throws(
    () => verifiedJourneyMasteryEvidence(structuredClone(result)),
    /completed Journey mastery/,
  );
});

test('a replaced lost life cannot qualify and forged revisions, runs, bindings or replays fail closed', async () => {
  const lost = fixture({ lostLife: true });
  assert.equal(lost.run.lives, lost.run.rules.lives);
  const result = await verifyJourneyMasteryRun(lost);
  assert.equal(result.qualified, false);
  assert.equal(verifiedJourneyMasteryEvidence(result), null);
  await assert.rejects(storeFixture(lost).store.prove(lost), /lost a life/);
  const f = fixture(),
    { store } = storeFixture(f);
  assert.throws(
    () => resolveJourneyMasteryRequirement({ ...f.requirement, revision: '2' }),
    /Unsupported exact/,
  );
  await assert.rejects(
    store.prove({ ...f, clear: { ...f.clear, runId: 'unaccepted' } }),
    /accepted winning run/,
  );
  await assert.rejects(
    verifyJourneyMasteryRun({ ...f, clear: { ...f.clear, gameplayId: 'not-selected' } }),
    /selected gameplay binding/,
  );
  const replay = structuredClone(f.replay);
  replay.segments[0].input.direction = 'left';
  await assert.rejects(verifyJourneyMasteryRun({ ...f, replay }), /verification failed/);
  const cancelled = new AbortController();
  await assert.rejects(
    verifyJourneyMasteryRun(f, { signal: cancelled.signal, onProgress: () => cancelled.abort() }),
    /cancel/i,
  );
});

test('proof imports reverify exact accepted runs and preserve durable evidence separately from a failed replacement', async () => {
  const f = fixture(),
    h = storeFixture(f);
  const initial = h.store.rewardEvidence();
  const proof = await h.store.prove(f);
  assert.equal(h.store.rewardEvidence(), initial);
  assert.equal(h.store.saveVerified(proof), true);
  assert.deepEqual(h.store.rewardEvidence().durableMastery, [
    { ...f.requirement, runId: f.clear.runId },
  ]);
  const oldBytes = h.values.get(h.store.key);
  const reopened = createJourneyMasteryProofStore(h.config);
  assert.deepEqual(await reopened.hydrate(), { verified: 1, rejected: 0 });
  assert.equal(h.values.get(h.store.key), oldBytes);
  assert.throws(() => reopened.saveVerified(JSON.parse(JSON.stringify(proof))), /replay-verified/);
  assert.equal(reopened.importVerified(await reopened.inspectProofs(h.store.exportProofs())), true);
  const bad = structuredClone(proof);
  bad.replay.segments[0].input.direction = 'left';
  await assert.rejects(reopened.inspectProofs([bad]), /identity.*bytes/);
  const foreign = createJourneyMasteryProofStore({ ...h.config, editionId: 'foreign' });
  await assert.rejects(foreign.inspectProofs([proof]), /Wrong mastery proof edition/);
  let accepted = f.clear,
    writable = true;
  const guarded = storeFixture(f, {
    values: h.values,
    acceptClear: (clear) => canonicalJSON(clear) === canonicalJSON(accepted),
    storage: {
      getItem: h.config.storage.getItem,
      setItem(key, value) {
        if (!writable) throw Error('read-only or full');
        h.values.set(key, value);
      },
    },
  }).store;
  await guarded.hydrate();
  accepted = { ...f.clear, runId: 'later-accepted-run' };
  writable = false;
  const later = await guarded.prove({ ...f, clear: accepted });
  assert.equal(guarded.saveVerified(later), false);
  assert.equal(guarded.rewardEvidence().mastery[0].runId, accepted.runId);
  assert.equal(guarded.rewardEvidence().durableMastery[0].runId, f.clear.runId);
  assert.equal(h.values.get(h.store.key), oldBytes);
  accepted = { ...accepted, runId: 'profile-replaced' };
  assert.throws(() => guarded.saveVerified(later), /accepted winning run/);
});

test('unavailable retained gameplay remains recoverable and cancelled proof imports never adopt evidence', async () => {
  const f = fixture(),
    h = storeFixture(f);
  h.store.saveVerified(await h.store.prove(f));
  const oldBytes = h.values.get(h.store.key);
  const newer = createJourneyMasteryProofStore({ ...h.config, bindings: [] });
  assert.equal((await newer.hydrate()).rejected, 1);
  assert.deepEqual(newer.rewardEvidence().mastery, []);
  assert.ok(newer.exportRecovery().sources.includes(oldBytes));
  assert.equal(h.values.get(h.store.key), oldBytes);
  const retained = createJourneyMasteryProofStore(h.config);
  assert.equal((await retained.hydrate()).verified, 1);
  const cancelled = new AbortController();
  cancelled.abort();
  const imported = createJourneyMasteryProofStore(h.config);
  await assert.rejects(
    imported.inspectProofs(h.store.exportProofs(), { signal: cancelled.signal }),
  );
  assert.deepEqual(imported.rewardEvidence().mastery, []);
  const unaccepted = createJourneyMasteryProofStore({ ...h.config, acceptClear: () => false });
  await assert.rejects(unaccepted.inspectProofs(h.store.exportProofs()), /accepted winning run/);
});

test('verified historical attempts survive later wins but cannot create or import unowned mission progress', async () => {
  const f = fixture(),
    lost = fixture({ lostLife: true }),
    values = new Map();
  let accepted = f.clear,
    writable = true;
  const config = {
    editionId: 'mastery-fixture',
    requirements: [f.requirement],
    bindings: f.bindings,
    acceptClear: (clear) => canonicalJSON(clear) === canonicalJSON(accepted),
    acceptOwnedClear: () =>
      accepted?.missionId === f.clear.missionId &&
      f.bindings[0].bindings.some(
        (binding) =>
          binding.gameplayId === accepted.gameplayId && binding.difficulty === accepted.difficulty,
      ),
    storage: {
      getItem: (key) => values.get(key) ?? null,
      setItem(key, value) {
        if (!writable) throw Error('full');
        values.set(key, value);
      },
    },
  };
  const store = createJourneyMasteryProofStore(config);
  const proof = await store.prove(f);
  store.saveVerified(proof);
  const bytes = values.get(store.key);
  accepted = { ...f.clear, runId: 'later-win-with-life-lost' };
  await assert.rejects(store.prove({ ...lost, clear: accepted }), /lost a life/);
  await assert.rejects(store.prove(f), /exact accepted winning run/);
  assert.equal(
    store.saveVerified(proof),
    true,
    'Previously verified accepted attempts retain their ownership.',
  );
  assert.equal(values.get(store.key), bytes, 'Historical proof and envelope bytes do not migrate.');
  const restored = createJourneyMasteryProofStore(config);
  assert.deepEqual(await restored.hydrate(), { verified: 1, rejected: 0 });
  assert.deepEqual(restored.rewardEvidence().historicalClears, [f.clear]);
  assert.deepEqual(restored.rewardEvidence().durableHistoricalClears, [f.clear]);
  assert.equal(restored.importVerified(await restored.inspectProofs([proof])), true);
  accepted = { ...accepted, runId: 'new-no-loss-win' };
  const newer = await restored.prove({ ...f, clear: accepted });
  writable = false;
  assert.equal(restored.saveVerified(newer), false);
  assert.equal(restored.rewardEvidence().historicalClears[0].runId, accepted.runId);
  assert.equal(restored.rewardEvidence().durableHistoricalClears[0].runId, f.clear.runId);
  assert.equal(values.get(store.key), bytes);
  accepted = null;
  await assert.rejects(restored.inspectProofs([proof]), /owned accepted winning run/);
  assert.throws(() => restored.saveVerified(newer), /owned accepted winning run/);
  const unowned = createJourneyMasteryProofStore(config);
  assert.equal((await unowned.hydrate()).rejected, 1);
  assert.deepEqual(unowned.rewardEvidence().historicalClears, []);
  assert.ok(unowned.exportRecovery().sources.includes(bytes));
  assert.equal(values.get(store.key), bytes);
  accepted = { ...f.clear, gameplayId: 'foreign-gameplay' };
  await assert.rejects(restored.inspectProofs([proof]), /owned accepted winning run/);
  accepted = f.clear;
  const checked = await restored.inspectProofs([proof]);
  accepted = { ...f.clear, missionId: 'unrelated-mission' };
  assert.throws(
    () => restored.importVerified(checked),
    /owned accepted winning run/,
    'Adoption rechecks ownership after asynchronous replay verification.',
  );
});
