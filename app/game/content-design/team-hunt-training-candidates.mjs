import { createHuntTrainingCandidates, HUNT_TRAINING_STAGES } from './hunt-training-candidates.mjs';
import { compileContentProject } from './project.mjs';

export const TEAM_HUNT_TRAINING_PROFILE_KEY = 'team-humanoid-hunt-training-v1';
// These explicit partner starts support different approaches on each familiar
// board. They are checked as complete Team geometry, never mirrored at runtime.
const partnerStarts = [
  [47.5, 0.5],
  [32.5, 35.5],
  [35.5, 30.5],
  [45.5, 17.5],
  [55.5, 9.5],
  [57.5, 17.5],
];
const partnerRoutes = [
  'Either pilot can touch a runner. Take separate short cuts and share the hunt score while completing the capture goal.',
  'Approach the island from opposite shores. One pilot can turn a runner toward the other while keeping a return nearby.',
  'Leave the central strip from different heights. Enclose two runners together or divide contact and enclosure between pilots.',
  'Let one pilot draw the fixed warning while the partner approaches. Support can intercept a nearby shot; a safe partner can still rescue.',
  'One pilot links the next island while the other intercepts a runner. Both seats contribute to the same three-target quota.',
  'Choose opposite circuits through the landings. Remove the shared six-target population and keep a return available for your partner.',
];

/** A separate cooperative chapter, with explicit second starts and team goals.
 * Solo source, previous Team campaigns and their progress remain separate. */
export function createTeamHuntTrainingCandidates() {
  const source = createHuntTrainingCandidates({ artwork: true });
  source.id = 'team-humanoid-hunt-training-project';
  source.revision = 'team-hunt-training-1';
  source.name = 'Team hunt lessons';
  for (const [index, mission] of source.missions.entries()) {
    const map = source.maps.find((entry) => entry.id === mission.map.id);
    const [x, y] = partnerStarts[index];
    map.spawns.push({ id: 'partner', x, y });
    mission.modes = ['team'];
    mission.team = {
      format: 'TeamMissionV7',
      spawnIds: [mission.spawnId, 'partner'],
      lineImpact: false,
    };
    mission.design.routeDecision = partnerRoutes[index];
    mission.design.difficulty.coordination = 1;
    mission.design.mastery =
      index === 5
        ? 'Clear all six targets with a contribution from both pilots and no knockdowns.'
        : `${HUNT_TRAINING_STAGES[index].mastery} Both pilots contribute a capture or hunt elimination.`;
  }
  source.campaigns[0].id = 'team-humanoid-hunt-training';
  source.campaigns[0].name = 'Team hunt lessons · six shared boards';
  source.packs[0].id = 'team-humanoid-hunt-lessons';
  source.packs[0].name = 'Team hunt lessons';
  source.packs[0].campaignIds = [source.campaigns[0].id];
  return structuredClone(compileContentProject(source).source);
}
