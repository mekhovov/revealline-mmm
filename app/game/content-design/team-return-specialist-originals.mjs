import { compileContentProject } from './project.mjs';
import { createTeamMaterialSpecialistOriginalCandidates } from './team-material-specialist-originals.mjs';

export const TEAM_RETURN_PARTNER_PROFILE_KEY = 'team-return-partner-originals-1';
export const TEAM_RETURN_PARTNER_MISSIONS = Object.freeze([
  'stepping-exchange',
  'switchback-partners',
]);
export const TEAM_STEPPING_SPECIALIST_CAMPAIGN_ID = 'stepping-partner-specialists';
export const TEAM_SWITCHBACK_SPECIALIST_CAMPAIGN_ID = 'switchback-partner-specialists';

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

/** Third bounded partner-action successor. It specializes the two missions in
 * the shared-return arc whose defining decision is to establish a launch point
 * for the other pilot. Divided workshop remains on its historical V5 runtime;
 * separate campaign boundaries keep every exported pack homogeneous. */
export function createTeamReturnSpecialistOriginalCandidates() {
  const source = createTeamMaterialSpecialistOriginalCandidates();
  const revision = 'partner-actions-3';
  source.id = 'team-return-partner-originals-review';
  source.revision = revision;
  source.name = 'Team Journey · shared-return specialists · balance review pending';

  const stepping = source.missions.find((mission) => mission.id === 'stepping-exchange');
  const switchback = source.missions.find((mission) => mission.id === 'switchback-partners');
  if (!stepping || !switchback)
    throw new Error('Both shared-return partner missions must remain authored.');
  specializeMission(stepping, revision);
  specializeMission(switchback, revision);

  stepping.design = {
    ...stepping.design,
    lesson:
      'The Interceptor protects the exposed island connection while the Disruptor controls its keeper window. Either completed link becomes a shorter launch point for the partner.',
    counterplay:
      'Assign the Interceptor to the longer bridge and the Disruptor to the keeper nearest the receiving island. Bank on reclaimed ground only; walls never become returns.',
    captureConsequence:
      'A line-only connection can leave both occupied regions in play while still adding a shared bank that shortens the partner’s next exposure.',
  };
  switchback.design = {
    ...switchback.design,
    lesson:
      'One specialist establishes the winding approach while the other protects the crossing that turns the middle platform into shared ground.',
    counterplay:
      'Use Disruptor Support before committing around a wall tip, then Interceptor Support for the partner’s longer exposed crossing. Approach the platform from opposite ends instead of duplicating one route.',
    captureConsequence:
      'Connecting either side of the middle platform creates a new bank; the partner can use it to replace the long outer return with a shorter second approach.',
  };

  const ownerIndex = source.campaigns.findIndex((campaign) =>
    campaign.missionIds.includes(stepping.id),
  );
  if (ownerIndex < 0) throw new Error('The shared-return missions need one campaign owner.');
  const owner = source.campaigns[ownerIndex];
  if (
    owner.missionIds.length !== 3 ||
    owner.missionIds[0] !== stepping.id ||
    owner.missionIds[2] !== switchback.id
  )
    throw new Error('The shared-return campaign order must remain explicit.');
  owner.missionIds = [owner.missionIds[1]];
  owner.revision = revision;

  const steppingCampaign = {
    ...structuredClone(owner),
    id: TEAM_STEPPING_SPECIALIST_CAMPAIGN_ID,
    revision,
    name: 'Stepping partner specialists',
    missionIds: [stepping.id],
  };
  const switchbackCampaign = {
    ...structuredClone(owner),
    id: TEAM_SWITCHBACK_SPECIALIST_CAMPAIGN_ID,
    revision,
    name: 'Switchback partner specialists',
    missionIds: [switchback.id],
  };
  source.campaigns.splice(ownerIndex, 0, steppingCampaign);
  source.campaigns.splice(ownerIndex + 2, 0, switchbackCampaign);

  const pack = source.packs.find((candidate) => candidate.campaignIds.includes(owner.id));
  if (!pack) throw new Error('The shared-return specialist campaigns need one pack owner.');
  const packIndex = pack.campaignIds.indexOf(owner.id);
  pack.campaignIds.splice(packIndex, 0, steppingCampaign.id);
  pack.campaignIds.splice(packIndex + 2, 0, switchbackCampaign.id);
  pack.revision = revision;

  return structuredClone(compileContentProject(source).source);
}
