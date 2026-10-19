import { prepareIndustrialEnvironmentSource } from '../presentation/industrial-environments.mjs';
import { createTeamExpansionCandidates, TEAM_EXPANSION_ROUTE } from './multiplayer-expansion.mjs';
import { createPursuitCampaignCandidates } from './pursuit-campaign-candidates.mjs';
import { createPursuitPilotCandidates } from './pursuit-pilot-candidates.mjs';
import {
  createTeamSnakeHuntCandidates,
  TEAM_SNAKE_HUNT_PROFILE_KEY,
} from './team-snake-hunt-candidates.mjs';
import { contentText } from '../i18n/content.mjs';
import {
  createTeamHuntTrainingCandidates,
  TEAM_HUNT_TRAINING_PROFILE_KEY,
} from './team-hunt-training-candidates.mjs';
import { huntText } from '../hunt/copy.mjs';
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
  expedition = false,
  artwork = false,
  huntTraining = false,
  pursuitPilots = false,
  pursuitCampaigns = false,
  snakeHunt = false,
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
  const source = expedition
    ? createTeamExpansionCandidates()
    : pursuitCampaigns
      ? createPursuitCampaignCandidates({ team: true })
      : pursuitPilots
        ? createPursuitPilotCandidates({ team: true })
        : snakeHunt
          ? createTeamSnakeHuntCandidates()
          : huntTraining
            ? createTeamHuntTrainingCandidates()
            : culturalSpecialistsV2
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
    expedition
      ? { profileKey: TEAM_EXPANSION_ROUTE }
      : pursuitCampaigns
        ? { profileKey: 'team-pursuit-campaigns-v1' }
        : pursuitPilots
          ? { profileKey: 'team-pursuit-pilots-v1' }
          : snakeHunt
            ? { profileKey: TEAM_SNAKE_HUNT_PROFILE_KEY }
            : huntTraining
              ? { profileKey: TEAM_HUNT_TRAINING_PROFILE_KEY }
              : culturalSpecialistsV2
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
  const navigationEdition = culturalSpecialistsV2
    ? 'culturalSpecialistsV2'
    : culturalSpecialists
      ? 'culturalSpecialists'
      : reviewedSpecialists
        ? 'reviewedSpecialists'
        : partnerSpecialist
          ? 'partnerSpecialist'
          : specialist
            ? 'specialist'
            : impact
              ? 'impact'
              : spatial
                ? 'spatial'
                : pressure
                  ? 'pressure'
                  : null;
  return Object.freeze({
    candidateJourney,
    prepareCandidateEnvironment(row, { signal } = {}) {
      if (!candidateJourney.owns(row)) return Promise.resolve(null);
      return prepareIndustrialEnvironmentSource({
        engine: 'capture',
        mode: 'team',
        source: row.level,
        origin: {
          kind: 'builtin',
          catalogueId: source.id,
          catalogueRevision: source.revision,
          sourceForm: `compiled-native-v1:${source.policyId}:${row.difficulty}`,
        },
        signal,
      });
    },
    candidateProgress,
    candidatePreferences: preferences,
    candidateCardPresenter: createTeamMissionCardPresenter(candidateJourney, candidateProgress, {
      reviewCopy,
    }),
    candidateCaptureTeaching: createTeamCaptureTeaching(
      candidateJourney,
      expedition || huntTraining || snakeHunt || pursuitPilots || pursuitCampaigns
        ? source.missions.map((mission) => mission.id)
        : TEAM_JOURNEY_LEARNING_ARCS[0].missionIds,
    ),
    candidateDifficulty: snapshot.difficulty,
    candidateNavigationLabel: navigationEdition
      ? localizedMessage(`interface:couch.teamNavigation_${navigationEdition}`)
      : expedition || pursuitPilots || pursuitCampaigns || snakeHunt
        ? () => contentText(source, 'name')
        : huntTraining
          ? () => huntText('lessons')
          : '',
    candidateEditionLabel:
      expedition || pursuitPilots || pursuitCampaigns
        ? () => contentText(source, 'name')
        : snakeHunt
          ? () => contentText(source, 'name')
          : huntTraining
            ? () => huntText('lessons')
            : pressure ||
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
