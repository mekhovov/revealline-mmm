import { localizedMessage } from '../i18n/index.mjs';
import {
  createTeamJourneyCandidates,
  TEAM_JOURNEY_LEARNING_ARCS,
} from './team-journey-candidates.mjs';
import { createCandidateTeamHost } from './team-host.mjs';
import { createJourneyPreferences } from '../journey/preferences.mjs';
import { createTeamJourneyProgress } from './team-progress.mjs';
import { createTeamMissionCardPresenter } from './team-mission-card.mjs';
import { createTeamCaptureTeaching } from './team-capture-teaching.mjs';
import {
  createTeamPressureOriginalCandidates,
  TEAM_PRESSURE_PROFILE_KEY,
} from './team-pressure-originals.mjs';
import {
  createTeamSpatialOriginalCandidates,
  TEAM_SPATIAL_PROFILE_KEY,
} from './team-spatial-originals.mjs';
import {
  createTeamImpactOriginalCandidates,
  TEAM_IMPACT_PROFILE_KEY,
} from './team-impact-originals.mjs';
import {
  createTeamSpecialistOriginalCandidates,
  TEAM_SPECIALIST_PROFILE_KEY,
} from './team-specialist-originals.mjs';
import {
  createTeamPartnerSpecialistOriginalCandidates,
  TEAM_PARTNER_SPECIALIST_PROFILE_KEY,
} from './team-partner-specialist-originals.mjs';
import {
  createTeamCompleteSpecialistOriginalCandidates,
  TEAM_COMPLETE_SPECIALIST_PROFILE_KEY,
} from './team-complete-specialist-originals.mjs';
import {
  createTeamCulturalSpecialistOriginalCandidates,
  TEAM_CULTURAL_SPECIALIST_PROFILE_KEY,
} from './team-cultural-specialist-originals.mjs';
import {
  createTeamCulturalSpecialistV2OriginalCandidates,
  TEAM_CULTURAL_SPECIALIST_V2_PROFILE_KEY,
} from './team-cultural-specialist-v2-originals.mjs';

/** Prepare the exact Team edition selected by the host's entry policy.
 * Player-facing copy does not grant official awards, artwork qualification
 * or change legacy Team arena preferences.
 * Pressure has a separate progress scope; only admitted play records events. */
export async function createTeamGreyboxEntry({
  artwork = false,
  pressure = false,
  spatial = false,
  impact = false,
  specialist = false,
  partnerSpecialist = false,
  reviewedSpecialists = false,
  culturalSpecialists = false,
  culturalSpecialistsV2 = false,
  reviewCopy = true,
} = {}) {
  const source = culturalSpecialistsV2
    ? createTeamCulturalSpecialistV2OriginalCandidates()
    : culturalSpecialists
      ? createTeamCulturalSpecialistOriginalCandidates()
      : reviewedSpecialists
        ? createTeamCompleteSpecialistOriginalCandidates()
        : partnerSpecialist
          ? createTeamPartnerSpecialistOriginalCandidates()
          : specialist
            ? createTeamSpecialistOriginalCandidates()
            : impact
              ? createTeamImpactOriginalCandidates()
              : spatial
                ? createTeamSpatialOriginalCandidates()
                : pressure
                  ? createTeamPressureOriginalCandidates()
                  : createTeamJourneyCandidates({ artwork });
  const preferences = createJourneyPreferences({ window: globalThis.window ?? globalThis });
  const snapshot = preferences.snapshot();
  const candidateJourney = createCandidateTeamHost(source, {
    corePackIds: source.packs.map((pack) => pack.id),
  });
  const candidateProgress = createTeamJourneyProgress(
    candidateJourney,
    culturalSpecialistsV2
      ? { profileKey: TEAM_CULTURAL_SPECIALIST_V2_PROFILE_KEY }
      : culturalSpecialists
        ? { profileKey: TEAM_CULTURAL_SPECIALIST_PROFILE_KEY }
        : reviewedSpecialists
          ? { profileKey: TEAM_COMPLETE_SPECIALIST_PROFILE_KEY }
          : partnerSpecialist
            ? { profileKey: TEAM_PARTNER_SPECIALIST_PROFILE_KEY }
            : specialist
              ? { profileKey: TEAM_SPECIALIST_PROFILE_KEY }
              : impact
                ? { profileKey: TEAM_IMPACT_PROFILE_KEY }
                : spatial
                  ? { profileKey: TEAM_SPATIAL_PROFILE_KEY }
                  : pressure
                    ? { profileKey: TEAM_PRESSURE_PROFILE_KEY }
                    : {},
  );
  await candidateProgress.load();
  return Object.freeze({
    candidateJourney,
    candidateProgress,
    candidatePreferences: preferences,
    candidateCardPresenter: createTeamMissionCardPresenter(candidateJourney, candidateProgress, {
      reviewCopy,
    }),
    candidateCaptureTeaching: createTeamCaptureTeaching(
      candidateJourney,
      TEAM_JOURNEY_LEARNING_ARCS[0].missionIds,
    ),
    candidateDifficulty: snapshot.difficulty,
    candidateEditionLabel:
      pressure ||
      spatial ||
      impact ||
      specialist ||
      partnerSpecialist ||
      reviewedSpecialists ||
      culturalSpecialists ||
      culturalSpecialistsV2
        ? localizedMessage(
            culturalSpecialistsV2
              ? 'interface:couch.teamEdition_culturalSpecialistsV2'
              : culturalSpecialists
                ? 'interface:couch.teamEdition_culturalSpecialists'
                : reviewedSpecialists
                  ? 'interface:couch.teamEdition_reviewedSpecialists'
                  : partnerSpecialist
                    ? 'interface:couch.teamEdition_partnerSpecialist'
                    : specialist
                      ? 'interface:couch.teamEdition_specialist'
                      : impact
                        ? 'interface:couch.teamEdition_impact'
                        : spatial
                          ? 'interface:couch.teamEdition_spatial'
                          : 'interface:couch.teamEdition_pressure',
          )
        : '',
    candidateNotice: snapshot.durable ? '' : snapshot.error,
  });
}
