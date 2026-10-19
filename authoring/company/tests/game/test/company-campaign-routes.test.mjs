import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { canonicalJSON } from '../data-json.mjs';
import { COMPANY_CAMPAIGNS, COMPANY_MISSIONS } from '../company-campaigns/catalog.mjs';
import { COMPANY_LESSONS } from '../company-campaigns/lessons.mjs';
import { createCompanyProject, createCompanyJourneyRoute } from '../company-campaigns/content.mjs';
import { compileContentProject, resolveMission } from '../content-design/project.mjs';
import { createContentExecutionCatalog } from '../content-design/execution.mjs';
import { applyGameplayTuning, resolveGameplayTuning } from '../gameplay-tuning.mjs';
import { createRun, stepRun, FIXED_DT } from '../core/index.mjs';
import {
  authoritativeCheckpoint,
  createRecorder,
  recordInput,
  exportReplay,
  verifyReplay,
} from '../replay.mjs';

import {
  COMPANY_ROUTE_EVIDENCE_FORMAT,
  COMPANY_ROUTE_EVENT_TYPES,
  companyCheckpointRuntime,
  companyRouteWitness,
} from '../../scripts/lib/company-route-evidence.mjs';

const projects = new Map(
  ['coupa'].map((brandId) => [
    brandId,
    compileContentProject(createCompanyProject({ brandId })),
  ]),
);
const evidence = JSON.parse(
  readFileSync(new URL('fixtures/company-campaign-routes.json', import.meta.url), 'utf8'),
);

test('30 owned company missions have distinct authored topologies', () => {
  assert.equal(COMPANY_MISSIONS.length, 30);
  assert.deepEqual(
    COMPANY_CAMPAIGNS.map((campaign) => campaign.missionIds.length),
    [6, 6, 6, 6, 6],
  );
  const topologies = new Set();
  const simulations = new Set();
  for (const campaign of COMPANY_CAMPAIGNS) {
    const source = createCompanyProject({ brandId: campaign.brandId, campaignId: campaign.id });
    assert.equal(source.campaigns.length, 1);
    assert.deepEqual(source.campaigns[0].missionIds, campaign.missionIds);
    assert(source.missions.every((mission) => mission.id.startsWith(campaign.id)));
    const route = createCompanyJourneyRoute({ brandId: campaign.brandId, campaignId: campaign.id });
    assert.deepEqual(route.optionalCampaignIds, []);
    for (const map of source.maps)
      topologies.add(
        JSON.stringify({ walls: map.walls, foundations: map.foundations, terrain: map.terrain }),
      );
    for (const mission of source.missions) {
      assert.deepEqual(mission.modes, ['solo']);
      simulations.add(
        resolveMission(projects.get(campaign.brandId), mission.id).simulationIdentity,
      );
    }
  }
  assert.equal(topologies.size, 30);
  assert.equal(simulations.size, 30);
  for (const mission of COMPANY_MISSIONS)
    assert.equal(
      COMPANY_LESSONS.find((lesson) => lesson.missionId === mission.id)?.id ?? null,
      mission.lessonId,
    );
});

test('180 pinned routes win with actual default Journey tuning, objectives and no life loss across both steering policies', () => {
  assert.equal(evidence.format, COMPANY_ROUTE_EVIDENCE_FORMAT);
  assert.equal(evidence.rows.length, 180);
  assert.deepEqual(Object.keys(evidence.checkpointRuntime).sort(), [
    'arch',
    'node',
    'platform',
    'v8',
  ]);
  for (const value of Object.values(evidence.checkpointRuntime))
    assert.equal(typeof value === 'string' && value.length > 0, true);
  const combinations = new Set();
  for (const row of evidence.rows) {
    const mission = COMPANY_MISSIONS.find((entry) => entry.id === row.id);
    assert(mission);
    combinations.add(`${row.id}/${row.difficulty}/${row.turnPolicy}`);
    const manifest = resolveMission(projects.get(mission.brandId), row.id, {
      difficulty: row.difficulty,
    });
    assert.equal(manifest.simulationIdentity, row.simulationIdentity, row.id);
    const options = { seed: row.seed, classId: 'scout', turnPolicy: row.turnPolicy };
    const tuning = resolveGameplayTuning(row.difficulty);
    assert.deepEqual(row.gameplayTuning ?? null, tuning, `${row.id}: exact default tuning recipe`);
    const level = tuning ? applyGameplayTuning(manifest.level, tuning) : manifest.level;
    const run = createRun(level, options);
    const recorder = createRecorder(level, options);
    const observedEvents = [];
    const closures = [];
    for (const segment of row.segments)
      for (let tick = 0; tick < segment.ticks; tick++) {
        assert.equal(run.status, 'running', `${row.id}: input after finish`);
        const input = { direction: segment.direction };
        recordInput(recorder, input);
        stepRun(run, input, FIXED_DT);
        for (const event of run.events)
          if (COMPANY_ROUTE_EVENT_TYPES.has(event.type))
            observedEvents.push([run.tick, event.type, event.id ?? null]);
        if (run.events.some((event) => event.type === 'cut.closed'))
          closures.push([run.tick, run.coverage]);
      }
    assert.equal(run.status, 'won', `${row.id}/${row.difficulty}/${row.turnPolicy}`);
    assert.equal(run.classic.livesLost, 0, row.id);
    for (const link of manifest.level.relayGates?.gates ?? [])
      assert(
        observedEvents.some((event) => event[1] === 'relay.opened' && event[2] === link.id),
        `${row.id}: required connector actually opened`,
      );
    if (manifest.level.encounter)
      assert(
        observedEvents.some((event) => event[1] === 'encounter.defeated'),
        `${row.id}: shield-core encounter actually released`,
      );
    assert(
      run.objectives
        .filter((objective) => objective.required)
        .every((objective) => objective.captured),
    );
    const label = `${row.id}/${row.difficulty}/${row.turnPolicy}`;
    assert.match(row.checkpoint, /^[a-f0-9]{16}$/, `${label}: diagnostic raw reference`);
    assert.equal(run.tick, row.ticks, label);
    assert.equal(run.lives, row.lives, label);
    assert.equal(run.coverage, row.coverage, label);
    assert.equal(closures.length, row.cuts, label);
    assert.deepEqual(observedEvents, row.events, `${label}: exact discrete event history`);
    assert.deepEqual(closures, row.closures, `${label}: exact capture history`);
    assert.deepEqual(companyRouteWitness(run), row.witness, `${label}: portable outcome and grid`);
    const checkpoint = authoritativeCheckpoint(run);
    if (canonicalJSON(evidence.checkpointRuntime) === canonicalJSON(companyCheckpointRuntime()))
      assert.equal(checkpoint.hash, row.checkpoint, `${label}: recorded runtime reference`);
    const replay = verifyReplay(exportReplay(recorder, run));
    assert.equal(replay.match, true, label);
    assert.deepEqual(replay.actual.checkpoint, checkpoint, `${label}: exact independent replay`);
  }
  assert.equal(combinations.size, 180);
});

test('current company campaigns progress through real main Journey mechanics and their stated challenge bands', () => {
  const expected = { coupa: [1, 4, 6, 8, 11] };
  for (const [brandId, bands] of Object.entries(expected)) {
    const project = projects.get(brandId);
    const executions = createContentExecutionCatalog(project.source);
    assert.equal(executions.entries.length, bands.length * 3);
    assert(
      executions.entries.every(
        (entry) => new Set(entry.campaign.levels.map((level) => level.version)).size === 1,
      ),
    );
    assert.deepEqual(
      project.campaigns.map((campaign) => campaign.band),
      bands,
    );
    const roles = new Set(
      project.missions.flatMap((mission) => mission.actors.map((actor) => actor.role)),
    );
    for (const role of [
      'field-keeper',
      'frontier-patrol',
      'reclaimed-roamer',
      'territory-eroder',
      'trail-pursuer',
      'heading-interceptor',
      'lane-emitter',
      'relay-sentinel',
    ])
      assert(roles.has(role), `${brandId}: ${role} has a real engine actor`);
    for (const campaign of project.campaigns) {
      const missions = campaign.missionIds.map((id) =>
        project.missions.find((mission) => mission.id === id),
      );
      assert(missions.every((mission) => mission.design.introduces.length <= 1));
      assert(
        missions.slice(0, 3).every((mission) => mission.design.difficulty.band === campaign.band),
      );
      assert(
        missions.slice(3).every((mission) => mission.design.difficulty.band === campaign.band + 1),
      );
    }
    const last = project.missions.at(-1);
    assert.equal(last.format, 'MissionDesignV4');
    assert.equal(last.encounter.recipeId, 'shield-relays-v1');
    assert.equal(last.encounter.shieldObjectiveIds.length, 2);
    assert.equal(last.relayLinks.length, 2);
    const map = project.maps.find((item) => item.source.id === last.map.id).source;
    assert.equal(map.speedZones.length, 2);
    assert(map.gates.every((gate) => Math.max(gate.w, gate.h) >= 3));
    assert.match(last.design.routeDecision, /shield relays/);
    assert.match(last.design.counterplay, /CORE OPEN/);
    assert.match(last.design.counterplay, /connector/);
    assert.match(last.design.counterplay, /Arrows/);
  }
});

test('owned missions pin the canonical Journey catalogs', () => {
  for (const brandId of ['coupa']) {
    const source = createCompanyProject({ brandId });
    assert.equal(source.policyId, 'journey-trail-impact-v3');
    assert.equal(source.actorCatalogId, 'journey-actors-v9');
    assert.equal(source.difficultyCatalogId, 'journey-difficulty-v2');
    assert(
      source.missions.every(
        (mission) =>
          mission.presentation.themeId ===
          `${COMPANY_MISSIONS.find((m) => m.id === mission.id).campaignId}-theme`,
      ),
    );
  }
});


test('portable company witnesses preserve discrete changes while exact replays retain continuous state', () => {
  const manifest = resolveMission(projects.get('coupa'), COMPANY_MISSIONS[0].id);
  const run = createRun(manifest.level, { seed: 1, classId: 'scout', turnPolicy: 'immediate' });
  const original = companyRouteWitness(run);
  const checkpoint = authoritativeCheckpoint(run);
  const moved = structuredClone(run);
  moved.enemies[0].vx += 1e-12;
  assert.deepEqual(companyRouteWitness(moved), original);
  assert.notDeepEqual(authoritativeCheckpoint(moved), checkpoint);
  const recorder = createRecorder(manifest.level, {
    seed: 1,
    classId: 'scout',
    turnPolicy: 'immediate',
  });
  assert.equal(
    verifyReplay(exportReplay(recorder, moved)).match,
    false,
    'A portable witness cannot authorize changed continuous replay state',
  );
  const changedClock = structuredClone(run);
  changedClock.time += 1e-12;
  assert.deepEqual(companyRouteWitness(changedClock), original);
  assert.notDeepEqual(authoritativeCheckpoint(changedClock), checkpoint);
  assert.equal(verifyReplay(exportReplay(recorder, changedClock)).match, false);
  const changedBoard = structuredClone(run);
  changedBoard.cells[0] = changedBoard.cells[0] === 0 ? 1 : 0;
  assert.notDeepEqual(companyRouteWitness(changedBoard), original);
  const changedObjective = structuredClone(run);
  changedObjective.objectives[0].captured = !changedObjective.objectives[0].captured;
  assert.notDeepEqual(companyRouteWitness(changedObjective), original);
  const changedTick = structuredClone(run);
  changedTick.tick += 1;
  assert.notDeepEqual(companyRouteWitness(changedTick), original);
  const changedResult = structuredClone(run);
  changedResult.score += 1;
  assert.notDeepEqual(companyRouteWitness(changedResult), original);
});
