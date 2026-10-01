import { compileContentProject } from './project.mjs';
import { createTeamImpactOriginalCandidates } from './team-impact-originals.mjs';

export const TEAM_SPECIALIST_PROFILE_KEY = 'team-specialist-originals-1';
export const TEAM_SPECIALIST_MISSIONS = Object.freeze([
  'twin-depots',
  'changing-courtyard',
  'last-rendezvous',
]);
export const TEAM_SPECIALIST_CAMPAIGN_ID = 'complementary-specialists';

/** A bounded successor for the end of the final Team learning arc. The first
 * nine missions retain hybrid Support. In the final three, seat one intercepts
 * travelling impacts and seat two disrupts moving enemies; rescue remains a
 * shared action for both. Historical impact editions and receipts stay intact. */
export function createTeamSpecialistOriginalCandidates() {
  const source = createTeamImpactOriginalCandidates();
  const changed = new Set(TEAM_SPECIALIST_MISSIONS);
  source.id = 'team-specialist-originals-review';
  source.revision = 'specialist-support-1';
  source.name = 'Team Journey · complementary specialists · balance review pending';
  for (const mission of source.missions) {
    if (!changed.has(mission.id)) continue;
    mission.revision = source.revision;
    mission.team = {
      ...mission.team,
      format: 'TeamMissionV6',
      supportRoles: ['interceptor', 'disruptor'],
    };
    const introduces = new Set(mission.design.introduces);
    const practices = new Set(mission.design.practices);
    if (mission.id === TEAM_SPECIALIST_MISSIONS[0]) introduces.add('complementary-support-roles');
    else practices.add('complementary-support-roles');
    mission.design = {
      ...mission.design,
      lesson:
        mission.id === TEAM_SPECIALIST_MISSIONS[0]
          ? 'Interceptor Support removes nearby travelling impacts while Disruptor Support slows nearby enemies. Rescue remains available to both players.'
          : mission.design.lesson,
      counterplay: `${mission.design.counterplay} Coordinate the Interceptor around exposed lines and the Disruptor around moving threats; neither pulse substitutes for the other.`,
      introduces: [...introduces],
      practices: [...practices],
      combines: [...new Set([...mission.design.combines, 'complementary-support-roles'])],
    };
  }
  const ownerIndex = source.campaigns.findIndex((campaign) =>
    campaign.missionIds.some((id) => changed.has(id)),
  );
  if (ownerIndex < 0) throw new Error('The specialist missions need one authored campaign owner.');
  const owner = source.campaigns[ownerIndex];
  const specialistMissionIds = owner.missionIds.filter((id) => changed.has(id));
  if (
    specialistMissionIds.length !== changed.size ||
    specialistMissionIds.some((id, index) => id !== TEAM_SPECIALIST_MISSIONS[index])
  )
    throw new Error('The specialist mission order must remain explicit and complete.');

  // Team campaigns are immutable runtime packs and therefore cannot mix V5
  // hybrid levels with V6 specialist levels. Keep the ninth hybrid lesson in
  // its original runtime edition and place the three successors in the next
  // authored campaign. Journey navigation still advances across this boundary.
  owner.missionIds = owner.missionIds.filter((id) => !changed.has(id));
  owner.revision = source.revision;
  const specialistCampaign = {
    ...structuredClone(owner),
    id: TEAM_SPECIALIST_CAMPAIGN_ID,
    revision: source.revision,
    name: 'Complementary specialists',
    missionIds: specialistMissionIds,
  };
  source.campaigns.splice(ownerIndex + 1, 0, specialistCampaign);

  const pack = source.packs.find((candidate) => candidate.campaignIds.includes(owner.id));
  if (!pack) throw new Error('The specialist campaign needs one authored pack owner.');
  const campaignIndex = pack.campaignIds.indexOf(owner.id);
  pack.campaignIds.splice(campaignIndex + 1, 0, specialistCampaign.id);
  pack.revision = source.revision;
  return structuredClone(compileContentProject(source).source);
}
