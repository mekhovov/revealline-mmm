import { boundedJSON, exactKeys, required, dataIdentity } from '../data-json.mjs';
import { createJourneyCatalog } from '../journey/catalog.mjs';
import { compileContentProject, resolveMission } from './project.mjs';
import { freezeDesign, journeyPreset } from './catalogs.mjs';
import { journeyTeamPackEdition } from '../coop/foundations.mjs';
import { validateCoopPack } from '../coop/recipes.mjs';

/** Candidate navigation and execution share the authored order and resolver.
 * This is not a publishing boundary: no imported project can award official
 * progress, and callers must still load/verify each mission's artwork. */
export function resolveContentJourney(source, options = {}) {
  const selected = boundedJSON(options, { maxBytes: 8192, maxNodes: 100, maxDepth: 3 });
  exactKeys(selected, ['packIds', 'mode', 'difficulty'], 'Journey selection');
  const { mode = 'solo', difficulty = 'standard' } = selected;
  required(['solo', 'versus', 'team'].includes(mode), 'Unsupported candidate mode.');
  const project = compileContentProject(source);
  journeyPreset(difficulty, project.difficulty.id);
  const packIds = selected.packIds ?? project.packs.map((pack) => pack.id);
  required(
    Array.isArray(packIds) &&
      packIds.length > 0 &&
      new Set(packIds).size === packIds.length &&
      packIds.every((id) => project.packs.some((pack) => pack.id === id)),
    'Choose unique existing pack IDs.',
  );
  const campaigns = [];
  for (const pack of project.packs.filter(
    (candidate) => packIds.includes(candidate.id) && !candidate.archived,
  )) {
    for (const id of pack.campaignIds) {
      const design = project.campaigns.find((candidate) => candidate.id === id);
      if (design.archived) continue;
      const missionIds = design.missionIds.filter((missionId) =>
        project.missions.some(
          (mission) =>
            mission.id === missionId && !mission.archived && mission.modes.includes(mode),
        ),
      );
      if (!missionIds.length) continue;
      const manifests = missionIds.map((missionId) =>
        resolveMission(project, missionId, { mode, difficulty }),
      );
      if (mode === 'team')
        required(
          manifests.every((manifest) => manifest.level.version === manifests[0].level.version),
          'A Team campaign must use one explicitly authored runtime edition; old editions are not silently upgraded.',
        );
      campaigns.push({
        packId: pack.id,
        campaignId: design.id,
        // Execution recovery pins authored presentation as well as physics.
        // A changed original must not impersonate a saved edition. Navigation
        // and Journey progress IDs remain independent of these revisions.
        runtime: {
          ...(mode === 'team'
            ? journeyTeamPackEdition(manifests[0].level)
            : { version: 'xonix-campaign.v1' }),
          id: design.id,
          revision: `candidate-${dataIdentity({
            campaign: design,
            difficulty,
            simulations: manifests.map((manifest) => manifest.simulationIdentity),
            presentation: manifests.map((manifest) => ({
              levelId: manifest.level.id,
              levelRevision: manifest.level.revision,
              name: manifest.level.name,
              presentation: manifest.presentation,
              background: manifest.background,
            })),
          })}`,
          ...(mode === 'team' ? { name: design.name } : { title: design.name }),
          levels: manifests.map((manifest) => manifest.level),
        },
        manifests,
      });
    }
  }
  required(campaigns.length > 0, 'Selected packs have no missions for this mode.');
  if (mode === 'team')
    for (const { runtime } of campaigns) {
      const result = validateCoopPack(runtime);
      required(result.valid, result.errors.join(' '));
    }
  const catalog = createJourneyCatalog(
    campaigns.map(({ packId, runtime, manifests }) => ({
      source: 'candidate',
      packId,
      id: runtime.id,
      title: runtime.title ?? runtime.name,
      modes: [mode],
      levels: runtime.levels.map((level, index) => ({
        id: level.id,
        name: level.name,
        hook: manifests[index].design.routeDecision,
      })),
    })),
  );
  return freezeDesign({
    format: 'ResolvedCandidateJourneyV1',
    projectId: project.source.id,
    mode,
    difficulty,
    policyId: project.policy.id,
    campaigns,
    // A serializable snapshot lets CLI, Studio and a host rebuild the same
    // navigation without serializing functions or opening another registry.
    missions: catalog.missions,
    officialProgressEligible: false,
    validation: 'compiled-candidate-not-playtested',
  });
}
