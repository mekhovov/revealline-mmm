import { createTeamTimedOriginalCandidates } from './team-timed-originals.mjs';
import { createTeamWindowSpatialCandidates } from './team-window-spatial-candidates.mjs';
import { createTeamDepotSpatialCandidates } from './team-depot-spatial-candidates.mjs';
import { createCandidateTeamHost } from './team-host.mjs';
import { createJourneyPreferences } from '../journey/preferences.mjs';
import { createTeamJourneyProgress } from './team-progress.mjs';
import { createTeamMissionCardPresenter } from './team-mission-card.mjs';
import { createTeamCaptureTeaching } from './team-capture-teaching.mjs';

export const TEAM_TIMED_PROFILE_KEY = 'team-shared-windows-originals';
export const TEAM_WINDOW_SPATIAL_PROFILE_KEY = 'team-window-spatial-1';
export const TEAM_DEPOT_SPATIAL_PROFILE_KEY = 'team-depot-spatial-1';

/** Lazy, explicitly selected three-mission test. Shared input preferences, but
 * isolated bookmarks/results; not a checkpoint save or official award source. */
export async function createTeamTimedEntry({ spatial = false, depot = false } = {}) {
  const source = depot
    ? createTeamDepotSpatialCandidates({ artwork: true })
    : spatial
      ? createTeamWindowSpatialCandidates({ artwork: true })
      : createTeamTimedOriginalCandidates();
  const preferences = createJourneyPreferences({ window: globalThis.window ?? globalThis });
  const snapshot = preferences.snapshot();
  const candidateJourney = createCandidateTeamHost(source, {
    corePackIds: source.packs.map((p) => p.id),
  });
  const candidateProgress = createTeamJourneyProgress(candidateJourney, {
    profileKey: depot
      ? TEAM_DEPOT_SPATIAL_PROFILE_KEY
      : spatial
        ? TEAM_WINDOW_SPATIAL_PROFILE_KEY
        : TEAM_TIMED_PROFILE_KEY,
  });
  await candidateProgress.load();
  return Object.freeze({
    candidateJourney,
    candidateProgress,
    candidatePreferences: preferences,
    candidateCardPresenter: createTeamMissionCardPresenter(candidateJourney, candidateProgress),
    candidateCaptureTeaching: createTeamCaptureTeaching(candidateJourney, ['window-exchange']),
    candidateDifficulty: snapshot.difficulty,
    candidateNotice: snapshot.durable ? '' : snapshot.error,
  });
}
