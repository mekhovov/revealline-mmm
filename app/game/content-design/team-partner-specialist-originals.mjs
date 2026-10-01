import { compileContentProject } from './project.mjs';
import { createTeamSpecialistOriginalCandidates } from './team-specialist-originals.mjs';

export const TEAM_PARTNER_SPECIALIST_PROFILE_KEY = 'team-partner-specialist-originals-1';
export const TEAM_PARTNER_SPECIALIST_MISSIONS = Object.freeze([
  'crossed-gardens',
  'shared-lookout',
]);
export const TEAM_PARTNER_SPECIALIST_SUCCESSOR_ROWS = Object.freeze([
  ...TEAM_PARTNER_SPECIALIST_MISSIONS,
  'twin-depots',
]);
export const TEAM_MATERIAL_SPECIALIST_CAMPAIGN_ID = 'material-partner-specialists';

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
    combines: [...new Set([...mission.design.combines, 'complementary-support-roles'])],
  };
}

/** A bounded successor for two earlier Team decisions that already ask one
 * player to change the route for the other, but previously gave both seats the
 * same hybrid Support. Historical impact/specialist projects remain immutable.
 * Geometry and presentation stay pinned to their accepted revisions. */
export function createTeamPartnerSpecialistOriginalCandidates() {
  const source = createTeamSpecialistOriginalCandidates();
  const revision = 'partner-actions-1';
  source.id = 'team-partner-specialist-originals-review';
  source.revision = revision;
  source.name = 'Team Journey · complementary partner actions · balance review pending';

  const crossed = source.missions.find((mission) => mission.id === 'crossed-gardens');
  const lookout = source.missions.find((mission) => mission.id === 'shared-lookout');
  if (!crossed || !lookout) throw new Error('Both partner-action missions must remain authored.');
  specializeMission(crossed, revision);
  specializeMission(lookout, revision);

  crossed.design = {
    ...crossed.design,
    lesson:
      'Interceptor Support protects exposed Team lines while Disruptor Support slows the keeper guarding a material enclosure. A completed enclosure neutralizes its terrain for either partner.',
    counterplay:
      'Assign the Interceptor to the exposed bridge and the Disruptor to the keeper nearest the chosen garden. Enclose lethal terrain instead of crossing it; the resulting reclaimed approach is useful to both craft.',
    captureConsequence:
      'One closure can remove a garden and its slow approach, opening a full-speed route that the other craft can use for the next enclosure.',
    introduces: ['complementary-support-roles'],
  };
  lookout.design = {
    ...lookout.design,
    lesson:
      'The Interceptor protects the longer exposed connection while the Disruptor controls the keeper window. A return earned by either craft becomes shared ground for both.',
    counterplay:
      'Coordinate the Interceptor around the active cut and the Disruptor around moving field pressure. Build the middle connection before waking the outside roamer so the partner has another return.',
    captureConsequence:
      'A partner-built bridge creates a new bank and launch point; the quick outside closure instead wakes reclaimed-ground pressure along the shared route.',
    practices: [...new Set([...lookout.design.practices, 'complementary-support-roles'])],
  };

  // Crossed gardens is the first mission in a mixed V5 campaign. Move only its
  // successor into a homogeneous V6 campaign at the same journey position.
  const materialIndex = source.campaigns.findIndex((campaign) =>
    campaign.missionIds.includes(crossed.id),
  );
  if (materialIndex < 0) throw new Error('Crossed gardens needs one campaign owner.');
  const materialOwner = source.campaigns[materialIndex];
  if (materialOwner.missionIds[0] !== crossed.id)
    throw new Error('Crossed gardens must remain the opening material mission.');
  materialOwner.missionIds = materialOwner.missionIds.filter((id) => id !== crossed.id);
  materialOwner.revision = revision;
  const materialCampaign = {
    ...structuredClone(materialOwner),
    id: TEAM_MATERIAL_SPECIALIST_CAMPAIGN_ID,
    revision,
    name: 'Material partner specialists',
    missionIds: [crossed.id],
  };
  source.campaigns.splice(materialIndex, 0, materialCampaign);

  const materialPack = source.packs.find((pack) => pack.campaignIds.includes(materialOwner.id));
  if (!materialPack) throw new Error('The material specialist campaign needs a pack owner.');
  const materialCampaignIndex = materialPack.campaignIds.indexOf(materialOwner.id);
  materialPack.campaignIds.splice(materialCampaignIndex, 0, materialCampaign.id);
  materialPack.revision = revision;

  // The changing-ground hybrid campaign contains only Shared lookout after the
  // prior specialist split, so it can retain its ID and become homogeneous V6.
  const lookoutOwner = source.campaigns.find((campaign) =>
    campaign.missionIds.includes(lookout.id),
  );
  if (!lookoutOwner || lookoutOwner.missionIds.length !== 1)
    throw new Error('Shared lookout needs its one-mission campaign boundary.');
  lookoutOwner.revision = revision;
  lookoutOwner.name = 'Partner-built returns';
  const lookoutPack = source.packs.find((pack) => pack.campaignIds.includes(lookoutOwner.id));
  if (!lookoutPack) throw new Error('The return specialist campaign needs a pack owner.');
  lookoutPack.revision = revision;

  // This successor teaches the roles before Twin depots. Keep the later
  // specialist mission as practice instead of presenting the same rule twice.
  const twin = source.missions.find((mission) => mission.id === 'twin-depots');
  if (!twin) throw new Error('Twin depots must remain the specialist-ledger successor.');
  twin.revision = revision;
  twin.design = {
    ...twin.design,
    introduces: twin.design.introduces.filter((id) => id !== 'complementary-support-roles'),
    practices: [...new Set([...twin.design.practices, 'complementary-support-roles'])],
  };
  const twinOwner = source.campaigns.find((campaign) => campaign.missionIds.includes(twin.id));
  if (!twinOwner || twinOwner === lookoutOwner)
    throw new Error('Twin depots needs its distinct specialist campaign owner.');
  twinOwner.revision = revision;
  const twinPack = source.packs.find((pack) => pack.campaignIds.includes(twinOwner.id));
  if (!twinPack) throw new Error('Twin depots needs its specialist pack owner.');
  twinPack.revision = revision;

  return structuredClone(compileContentProject(source).source);
}
