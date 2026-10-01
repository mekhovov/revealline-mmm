import { compileContentProject } from './project.mjs';
import { createTeamPartnerSpecialistOriginalCandidates } from './team-partner-specialist-originals.mjs';

export const TEAM_MATERIAL_PARTNER_PROFILE_KEY = 'team-material-partner-originals-1';
export const TEAM_MATERIAL_PARTNER_MISSIONS = Object.freeze(['split-orchards', 'weaver-crossing']);

const roles = Object.freeze(['interceptor', 'disruptor']);

function specializeMission(mission, revision) {
  mission.revision = revision;
  mission.team = {
    ...mission.team,
    format: 'TeamMissionV6',
    supportRoles: [...roles],
  };
  mission.design = {
    ...mission.design,
    practices: [...new Set([...mission.design.practices, 'complementary-support-roles'])],
    combines: [...new Set([...mission.design.combines, 'complementary-support-roles'])],
  };
}

/** Second bounded partner-action successor. The remaining material campaign
 * already has a homogeneous two-mission boundary after Crossed gardens moves
 * to its specialist campaign. Promote that pair together without changing its
 * maps, pictures, quotas, actor placement or historical execution editions. */
export function createTeamMaterialSpecialistOriginalCandidates() {
  const source = createTeamPartnerSpecialistOriginalCandidates();
  const revision = 'partner-actions-2';
  source.id = 'team-material-partner-originals-review';
  source.revision = revision;
  source.name = 'Team Journey · material partner specialists · balance review pending';

  const split = source.missions.find((mission) => mission.id === 'split-orchards');
  const weaver = source.missions.find((mission) => mission.id === 'weaver-crossing');
  if (!split || !weaver) throw new Error('Both material partner missions must remain authored.');
  specializeMission(split, revision);
  specializeMission(weaver, revision);

  split.design = {
    ...split.design,
    lesson:
      'The Interceptor protects the exposed orchard enclosure while the Disruptor controls its keeper. Neutralizing either material problem gives both pilots an ordinary full-speed route on that side.',
    counterplay:
      'Let the Interceptor cover the longer lethal-orchard cut and the Disruptor create a keeper window around the slow orchard. Swap spatial jobs through the perimeter when the safer enclosure is on the other side.',
    captureConsequence:
      'A completed orchard enclosure removes its material penalty and opens that chamber as a staging route for the partner’s next cut.',
  };
  weaver.design = {
    ...weaver.design,
    lesson:
      'One pilot can neutralize a thread and establish the middle return while the other specialist protects the exposed crossing that follows.',
    counterplay:
      'Use Disruptor Support to control the central keeper while the first connection is exposed, then use Interceptor Support when the partner crosses on the new return. Walls remain blockers, never banks.',
    captureConsequence:
      'Neutralizing an outer thread changes the efficient approach for both pilots; connecting the middle platform turns that safer approach into a shared bank.',
  };

  const owner = source.campaigns.find((campaign) => campaign.missionIds.includes(split.id));
  if (
    !owner ||
    owner.missionIds.length !== TEAM_MATERIAL_PARTNER_MISSIONS.length ||
    owner.missionIds.some((id, index) => id !== TEAM_MATERIAL_PARTNER_MISSIONS[index])
  )
    throw new Error('The material partner missions need their homogeneous campaign boundary.');
  owner.revision = revision;
  owner.name = 'Material partner routes';

  const pack = source.packs.find((candidate) => candidate.campaignIds.includes(owner.id));
  if (!pack) throw new Error('The material partner campaign needs one pack owner.');
  pack.revision = revision;

  return structuredClone(compileContentProject(source).source);
}
