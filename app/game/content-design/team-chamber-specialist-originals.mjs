import { compileContentProject } from './project.mjs';
import { createTeamReturnSpecialistOriginalCandidates } from './team-return-specialist-originals.mjs';

export const TEAM_CHAMBER_PARTNER_PROFILE_KEY = 'team-chamber-partner-originals-1';
export const TEAM_CHAMBER_PARTNER_MISSIONS = Object.freeze(['divided-workshop', 'shared-detour']);

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

/** Fourth bounded partner-action successor. Both selected missions already own
 * a one-mission campaign in the prior revision, so each campaign can advance
 * atomically to V6. Twin landings intentionally remains the uncluttered Team
 * foundation tutorial on V5; historical projects remain independently usable. */
export function createTeamChamberSpecialistOriginalCandidates() {
  const source = createTeamReturnSpecialistOriginalCandidates();
  const revision = 'partner-actions-4';
  source.id = 'team-chamber-partner-originals-review';
  source.revision = revision;
  source.name = 'Team Journey · chamber partner specialists · balance review pending';

  const workshop = source.missions.find((mission) => mission.id === 'divided-workshop');
  const detour = source.missions.find((mission) => mission.id === 'shared-detour');
  if (!workshop || !detour) throw new Error('Both chamber partner missions must remain authored.');
  specializeMission(workshop, revision);
  specializeMission(detour, revision);

  workshop.design = {
    ...workshop.design,
    lesson:
      'Each specialist secures a different occupied chamber, then can redeploy around the shared perimeter to protect the partner’s remaining closure.',
    counterplay:
      'Use Disruptor Support to create the keeper window in the active chamber and Interceptor Support to protect its longer exposed cut. After banking, travel the perimeter rather than treating the divider as a return.',
    captureConsequence:
      'Clearing one chamber contributes shared coverage and frees that pilot to support the other chamber; it never silently clears the occupied field across the divider.',
  };
  detour.design = {
    ...detour.design,
    lesson:
      'The Disruptor creates the keeper window for a material enclosure while the Interceptor protects the exposed partner. Neutralized terrain becomes ordinary shared ground.',
    counterplay:
      'Enclose the lethal crossing before either pilot enters it. Use the west spine for shorter banks, then protect the partner’s longer approach through the newly reclaimed corridor.',
    captureConsequence:
      'One pilot’s enclosure removes a material penalty and opens a full-speed route that the partner can use for the next cut.',
  };

  const owners = TEAM_CHAMBER_PARTNER_MISSIONS.map((missionId) => {
    const owner = source.campaigns.find((campaign) => campaign.missionIds.includes(missionId));
    if (!owner || owner.missionIds.length !== 1)
      throw new Error(`${missionId} needs its one-mission homogeneous campaign boundary.`);
    owner.revision = revision;
    owner.name = missionId === workshop.id ? 'Divided chamber specialists' : 'Detour specialists';
    return owner;
  });
  for (const owner of owners) {
    const pack = source.packs.find((candidate) => candidate.campaignIds.includes(owner.id));
    if (!pack) throw new Error(`${owner.id} needs one pack owner.`);
    pack.revision = revision;
  }

  return structuredClone(compileContentProject(source).source);
}
