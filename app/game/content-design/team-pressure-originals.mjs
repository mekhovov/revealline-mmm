import { createTeamJourneyCandidates } from './team-journey-candidates.mjs';
import { withPressureDifficulty } from './pressure-candidates.mjs';

export const TEAM_PRESSURE_PROFILE_KEY = 'team-pressure-originals-1';

/** Explicit pressure-only successor. Transform the qualified greybox first:
 * adding pictures before the pressure transform would change mission revisions.
 * Presentation changes campaign execution identity, never the tested physics.
 * Spatial/bonus studies remain separate until their own integration gates pass. */
export function createTeamPressureOriginalCandidates() {
  const source = withPressureDifficulty(createTeamJourneyCandidates());
  const pictured = createTeamJourneyCandidates({ artwork: true });
  source.id = 'team-pressure-originals-review';
  source.name = 'Team Journey · pressure edition · human validation pending';
  source.assets = structuredClone(pictured.assets);
  for (const mission of source.missions)
    mission.presentation = structuredClone(
      pictured.missions.find((row) => row.id === mission.id).presentation,
    );
  return source;
}
