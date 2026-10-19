import { createHuntTrainingCandidates } from '../content-design/hunt-training-candidates.mjs';
import { createTeamHuntTrainingCandidates } from '../content-design/team-hunt-training-candidates.mjs';
import { createCandidateTeamHost } from '../content-design/team-host.mjs';
import { createCandidateVersusHost } from '../content-design/versus-host.mjs';
import { teamJourneyLibrarySource } from './team-source.mjs';
import { journeyLibrarySource } from './journey-source.mjs';
import { journeyMissionDetails, authoredJourneyMissionTags } from './journey-presentation.mjs';
import { huntText } from '../hunt/copy.mjs';

// Deliberate admission of the six existing lessons. Pursuit prototypes and
// Snake Hunt remain in their dedicated directory until their own qualification.
export const SUPPLEMENTAL_HUNT_ROUTE = 'humanoid-hunt-v1';

export function supplementalTeamSources({ launch, difficulty = () => 'standard', activeRouteId }) {
  if (activeRouteId === SUPPLEMENTAL_HUNT_ROUTE) return [];
  const source = createTeamHuntTrainingCandidates();
  const journey = createCandidateTeamHost(source, { corePackIds: source.packs.map((p) => p.id) });
  const result = teamJourneyLibrarySource({
    journey,
    editionId: SUPPLEMENTAL_HUNT_ROUTE,
    edition: huntText('lessons'),
    difficulty,
    launch: (_row, context) => launch(context),
  });
  return [
    {
      ...result,
      presentation: (mission) => ({
        ...result.presentation(mission),
        edition: huntText('lessons'),
      }),
      automaticContinuation: false,
    },
  ];
}

export function supplementalDuelSources({
  launch,
  themes,
  difficulty = () => 'standard',
  activeRouteId,
}) {
  if (activeRouteId === SUPPLEMENTAL_HUNT_ROUTE) return [];
  const source = createHuntTrainingCandidates({ artwork: true });
  const host = createCandidateVersusHost(source, {
    themes,
    corePackIds: source.packs.map((p) => p.id),
  });
  return [
    {
      ...journeyLibrarySource({
        editionId: SUPPLEMENTAL_HUNT_ROUTE,
        edition: huntText('lessons'),
        editionLabel: () => huntText('lessons'),
        catalog: host.catalog,
        details: (mission) => journeyMissionDetails(host.manifest(mission, difficulty())),
        tags: (mission) =>
          authoredJourneyMissionTags(mission, host.manifest(mission, difficulty())),
        card: (mission) => host.card(mission, difficulty()),
        launch: (_mission, context) => launch(context),
      }),
      automaticContinuation: false,
    },
  ];
}
