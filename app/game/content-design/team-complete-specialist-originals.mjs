import { freezeDesign } from './catalogs.mjs';
import { compileContentProject } from './project.mjs';
import { createTeamChamberSpecialistOriginalCandidates } from './team-chamber-specialist-originals.mjs';

export const TEAM_COMPLETE_SPECIALIST_PROFILE_KEY = 'team-complete-specialist-originals-1';

/** Exact disposition ledger for the twelve authored Team missions. Revisions
 * name the successor that owns each runtime change; all earlier factories stay
 * independently callable for historical playback and review. */
export const TEAM_SPECIALIST_DISPOSITIONS = freezeDesign([
  {
    missionId: 'twin-landings',
    disposition: 'safe-exposure-successor',
    revision: 'partner-actions-5',
    reason: 'Keep Team foundations as the sole required lesson; specialist Support stays optional.',
  },
  {
    missionId: 'stepping-exchange',
    disposition: 'shared-return-successor',
    revision: 'partner-actions-3',
    reason: 'A partner-built island link shortens the next exposed route.',
  },
  {
    missionId: 'divided-workshop',
    disposition: 'chamber-successor',
    revision: 'partner-actions-4',
    reason: 'Independent chamber work frees one specialist to support the other.',
  },
  {
    missionId: 'switchback-partners',
    disposition: 'shared-return-successor',
    revision: 'partner-actions-3',
    reason: 'Opposite approaches establish a middle bank useful to either pilot.',
  },
  {
    missionId: 'shared-detour',
    disposition: 'material-successor',
    revision: 'partner-actions-4',
    reason: 'Neutralized terrain becomes an ordinary partner route.',
  },
  {
    missionId: 'crossed-gardens',
    disposition: 'formal-role-introduction',
    revision: 'partner-actions-1',
    reason: 'The first required comparison between Interceptor and Disruptor jobs.',
  },
  {
    missionId: 'split-orchards',
    disposition: 'material-successor',
    revision: 'partner-actions-2',
    reason: 'Different material enclosures create staging ground for the partner.',
  },
  {
    missionId: 'weaver-crossing',
    disposition: 'material-successor',
    revision: 'partner-actions-2',
    reason: 'One thread and middle-bank connection improve the partner crossing.',
  },
  {
    missionId: 'shared-lookout',
    disposition: 'partner-return-successor',
    revision: 'partner-actions-1',
    reason: 'Both pilots can bank on cells earned by the other.',
  },
  {
    missionId: 'twin-depots',
    disposition: 'advanced-specialist-retained',
    revision: 'partner-actions-1',
    reason: 'Retain the corrected two-chamber practice ledger and specialist execution unchanged.',
  },
  {
    missionId: 'changing-courtyard',
    disposition: 'advanced-specialist-retained',
    revision: 'specialist-support-1',
    reason: 'Retain the accepted terrain-and-roamer specialist execution unchanged.',
  },
  {
    missionId: 'last-rendezvous',
    disposition: 'advanced-specialist-retained',
    revision: 'specialist-support-1',
    reason: 'Retain the accepted capstone specialist execution unchanged.',
  },
]);

/** Final bounded specialist successor. Twin landings exposes the two roles but
 * never requires Support, preserving Team foundations as its sole mandatory
 * rule. The historical V5 edition and every intermediate successor remain
 * immutable and separately addressable through their original factories. */
export function createTeamCompleteSpecialistOriginalCandidates() {
  const source = createTeamChamberSpecialistOriginalCandidates();
  const revision = 'partner-actions-5';
  source.id = 'team-complete-specialist-originals-review';
  source.revision = revision;
  source.name = 'Team Journey · complete specialists · balance review pending';

  const mission = source.missions.find(({ id }) => id === 'twin-landings');
  if (!mission) throw new Error('Twin landings must remain the Team opening mission.');
  mission.revision = revision;
  mission.team = {
    ...mission.team,
    format: 'TeamMissionV6',
    supportRoles: ['interceptor', 'disruptor'],
  };
  mission.design = {
    ...mission.design,
    lesson:
      'Both craft build a shared route network from separate foundations. Specialist Support is available as an optional safety tool; no pulse is required to clear this mission.',
    counterplay:
      'Watch the two keepers and close onto reclaimed ground. The Interceptor may remove a nearby travelling impact and the Disruptor may slow a nearby keeper, but first learn the shared return itself.',
    captureConsequence:
      'A bridge may secure only its line while keepers occupy both sides. The new link still gives both craft a shorter return, even when neither specialist uses Support.',
    combines: [...new Set([...mission.design.combines, 'optional-specialist-support'])],
  };

  const owner = source.campaigns.find((campaign) => campaign.missionIds.includes(mission.id));
  if (!owner || owner.missionIds.length !== 1)
    throw new Error('Twin landings needs its one-mission tutorial campaign boundary.');
  owner.revision = revision;
  owner.name = 'Foundation specialists';
  const pack = source.packs.find((candidate) => candidate.campaignIds.includes(owner.id));
  if (!pack) throw new Error('The Team opening campaign needs one pack owner.');
  pack.revision = revision;

  return structuredClone(compileContentProject(source).source);
}
