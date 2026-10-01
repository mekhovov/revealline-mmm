import { canonicalJSON, required } from '../data-json.mjs';
import { compileContentProject, resolveMission } from '../content-design/project.mjs';
import { freezeDesign } from '../content-design/catalogs.mjs';
import { authoritativeCheckpoint } from '../replay.mjs';
import {
  createDuel,
  releaseDuel,
  resumeDuel,
  stepDuel,
  UNTIMED_DUEL_PROTOCOL,
} from '../multiplayer.mjs';
import {
  CREATOR_GAMEPLAY_POLICY,
  CREATOR_ROUTE_FORMAT,
  CREATOR_TEMPLATE_REGISTRY_VERSION,
  CREATOR_TEMPLATES,
  validateCreatorProvenance,
  verifyCreatorRoutes,
} from './templates.mjs';

export const CREATOR_VERSUS_QUALIFICATION_FORMAT = 'revealline-creator-versus-qualification.v1';

/** This is an explicit allowlist. Older v1/v2 recipes retain their historical
 * Solo contract; a matching name or compatible-looking map cannot opt in. */
export const CREATOR_VERSUS_QUALIFICATIONS = freezeDesign(
  CREATOR_TEMPLATES.flatMap((template) =>
    template.variants.map((variantId) => ({
      templateId: template.id,
      templateVersion: CREATOR_TEMPLATE_REGISTRY_VERSION,
      variantId,
      modes: ['versus'],
      protocol: UNTIMED_DUEL_PROTOCOL,
    })),
  ),
);

const abort = (signal) => {
  if (signal?.aborted) throw new DOMException('Versus qualification cancelled.', 'AbortError');
};

export function creatorVersusCompatibility(source) {
  const provenance = validateCreatorProvenance(source);
  return Object.freeze(
    provenance.templateVersion === CREATOR_TEMPLATE_REGISTRY_VERSION ? ['versus'] : [],
  );
}

function qualifiedVariant(provenance) {
  return CREATOR_VERSUS_QUALIFICATIONS.find(
    (row) =>
      row.templateId === provenance.templateId &&
      row.templateVersion === provenance.templateVersion &&
      row.variantId === provenance.variantId,
  );
}

/** Cheap package/import gate. Full paired-board route qualification is a
 * release acceptance check; every individual package still proves its actual
 * seed through the existing Solo replay verifier. */
export function validateCreatorVersusProject(source, provenanceSource) {
  const provenance = validateCreatorProvenance(provenanceSource);
  const qualification = qualifiedVariant(provenance);
  required(qualification, 'This creator template version is not qualified for Versus.');
  const project = compileContentProject(source);
  const mission = project.source.missions.find((item) => item.id === provenance.missionId);
  required(
    mission?.modes.length === 2 && mission.modes[0] === 'solo' && mission.modes[1] === 'versus',
    'A qualified creator mission must explicitly declare Solo and Versus.',
  );
  for (const difficulty of ['gentle', 'standard', 'expert']) {
    const solo = resolveMission(project, provenance.missionId, { mode: 'solo', difficulty });
    const versus = resolveMission(project, provenance.missionId, { mode: 'versus', difficulty });
    required(
      versus.simulationIdentity === solo.simulationIdentity &&
        canonicalJSON(versus.level) === canonicalJSON(solo.level),
      'Versus must compile the exact same rules and board as Solo.',
    );
  }
  return freezeDesign({ project, provenance, qualification });
}

/** Replays the accepted Solo route on two independent boards with the exact
 * compiled Versus manifest. Equal legal input must produce an equal draw and
 * the same authoritative checkpoint on both boards. */
export async function verifyCreatorVersusRoutes(
  source,
  provenanceSource,
  { signal, buildVersion = 'creator-versus-v1', verifiedSoloRoutes } = {},
) {
  abort(signal);
  const { project, provenance, qualification } = validateCreatorVersusProject(
    source,
    provenanceSource,
  );
  const soloRoutes =
    verifiedSoloRoutes ??
    (await verifyCreatorRoutes(project.source, provenance, {
      signal,
      buildVersion,
    }));
  required(
    Array.isArray(soloRoutes) &&
      soloRoutes.length === 6 &&
      soloRoutes.every(
        (route) =>
          route?.format === CREATOR_ROUTE_FORMAT &&
          route.missionId === provenance.missionId &&
          route.mode === 'solo' &&
          route.simulationIdentity &&
          route.replay,
      ),
    'Versus qualification needs freshly verified Solo route evidence.',
  );
  required(
    new Set(soloRoutes.map((route) => `${route.difficulty}/${route.turnPolicy}`)).size === 6,
    'Versus qualification needs every difficulty and steering configuration once.',
  );
  const results = [];
  for (const route of soloRoutes) {
    abort(signal);
    const versus = resolveMission(project, provenance.missionId, {
      mode: 'versus',
      difficulty: route.difficulty,
    });
    const duel = createDuel(versus.level, route.replay.options, {
      protocol: UNTIMED_DUEL_PROTOCOL,
      seconds: 0,
    });
    required(
      duel.runs[0].cells !== duel.runs[1].cells &&
        canonicalJSON(authoritativeCheckpoint(duel.runs[0])) ===
          canonicalJSON(authoritativeCheckpoint(duel.runs[1])),
      'Versus needs two independent boards with equal starting conditions.',
    );
    resumeDuel(duel);
    let processed = 0;
    for (const segment of route.replay.segments) {
      if (segment.releaseBefore) releaseDuel(duel);
      const { switchClass: _switchClass, ...command } = segment.input;
      for (let tick = 0; tick < segment.ticks; tick++) {
        stepDuel(duel, [command, command]);
        processed++;
        if (processed % 120 === 0) {
          await new Promise((resolve) => setTimeout(resolve, 0));
          abort(signal);
        }
      }
    }
    const checkpoints = duel.runs.map((run) => authoritativeCheckpoint(run));
    required(
      duel.status === 'finished' &&
        duel.winner === null &&
        duel.reason === 'First clear' &&
        duel.runs.every((run) => run.status === 'won' && run.classic.livesLost === 0) &&
        canonicalJSON(checkpoints[0]) === canonicalJSON(checkpoints[1]) &&
        checkpoints[0].hash === route.replay.checkpoint.hash,
      'The qualified route did not produce an equal legal Versus result.',
    );
    results.push({
      format: CREATOR_VERSUS_QUALIFICATION_FORMAT,
      kind: 'automated',
      check: 'equal-board-feasibility',
      missionId: provenance.missionId,
      mode: 'versus',
      difficulty: route.difficulty,
      turnPolicy: route.turnPolicy,
      simulationIdentity: versus.simulationIdentity,
      gameplayPolicy: CREATOR_GAMEPLAY_POLICY,
      seed: provenance.runtimeSeed,
      templateId: provenance.templateId,
      templateVersion: provenance.templateVersion,
      variantId: provenance.variantId,
      protocol: qualification.protocol,
      outcome: 'draw',
      ticks: duel.tick,
      checkpoint: checkpoints[0],
    });
  }
  abort(signal);
  return freezeDesign(results);
}
