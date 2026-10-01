import { createCandidateTeamHost } from '../../content-design/team-host.mjs';
import { createJourneyPreferences } from '../../journey/preferences.mjs';
import { loadAuthoredJourneyRoute } from './route-loader.mjs';
export async function createStandaloneTeamEntry(id) {
  const route = await loadAuthoredJourneyRoute(id);
  if (!route) throw new TypeError('The Coupa Team campaign is unavailable.');
  const candidateJourney = createCandidateTeamHost(route.source, { corePackIds: route.corePackIds });
  const candidatePreferences = createJourneyPreferences({ window: globalThis.window ?? globalThis });
  return Object.freeze({
    candidateJourney,
    candidatePreferences,
    candidateDifficulty: candidatePreferences.snapshot().difficulty,
    candidateEditionLabel: route.label,
  });
}
