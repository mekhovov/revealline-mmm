import { createTeamTimedCandidates } from './team-timed-candidates.mjs';
import { TEAM_TIMED_ART_CANDIDATES } from './team-timed-art.mjs';
import { compileContentProject } from './project.mjs';

/** Presentation-only successor. The old greybox remains immutable; importing
 * its ID never grants progress authority or silently applies this artwork. */
export function createTeamTimedOriginalCandidates() {
  const source = createTeamTimedCandidates();
  source.id = 'journey-team-timed-original-review';
  source.revision = 'originals-1';
  source.name = 'Shared windows · original-art Team test';
  source.assets = structuredClone(TEAM_TIMED_ART_CANDIDATES);
  source.packs[0].name = 'Shared windows · original-art test';
  for (const mission of source.missions)
    mission.presentation.backgroundAssetId = `team-windows-${mission.id}`;
  return structuredClone(compileContentProject(source).source);
}
