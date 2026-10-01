import { freezeDesign } from './catalogs.mjs';
import { compileContentProject } from './project.mjs';
import { createTeamCompleteSpecialistOriginalCandidates } from './team-complete-specialist-originals.mjs';

export const TEAM_CULTURAL_SPECIALIST_PROFILE_KEY = 'team-cultural-specialist-originals-1';
export const TEAM_CULTURAL_SPECIALIST_REVISION = 'team-cultural-routes-1';
const rect = (x, y, w, h) => ({ x, y, w, h });

export const TEAM_CULTURAL_SPECIALIST_SOURCES = freezeDesign({
  krolevetsTowel: {
    institution: 'Museum Fund of Ukraine',
    record: 'Krolevets woven towel, collection record 108366',
    url: 'https://museum.mincult.gov.ua/collections/rushnik-kroleveckiy-108366',
    observedVocabulary: [
      'vertical side bands organized from triangular forms',
      'small rhomboid forms distributed through the central field',
      'a composition repeated symmetrically from both ends',
    ],
    adaptationBoundary:
      'Stepping exchange borrows alternating side cadence and end symmetry only. No towel, motif, weave draft, palette, meaning or source coordinates are copied.',
  },
  wovenRunner: {
    institution: 'Museum Fund of Ukraine',
    record: 'Hand-woven runner, collection record 235942',
    url: 'https://museum.mincult.gov.ua/collections/235942',
    observedVocabulary: [
      'five zones separated by narrow bands',
      'a concentric rhomboid focus in the central zone',
      'mirrored organization toward the outer zones',
    ],
    adaptationBoundary:
      'Divided workshop borrows zoned, mirrored and central-focus organization only. No runner, motif, weave draft, palette, meaning or source coordinates are copied.',
  },
  openworkPanels: {
    institution: 'National Museum of Ukrainian Pottery',
    record: 'Openwork tactile ornament panels beside the museum staircase',
    url: 'https://opishne-museum.gov.ua/ornamenty-yaki-mozhna-vidchuty/',
    observedVocabulary: [
      'five unequal openwork panels arranged beside a route',
      'alternation between solid material and traversable openings',
      'a composition intended to be understood through movement and touch',
    ],
    adaptationBoundary:
      'Shared detour borrows unequal openwork spacing and alternating passages only. No panel, Krychevsky artwork, carving plan, palette, meaning or source coordinates are copied.',
  },
});

export const TEAM_CULTURAL_SPECIALIST_SELECTIONS = freezeDesign([
  {
    id: 'stepping-exchange',
    disposition: 'alternating-band-partner-returns',
    sourceIds: ['krolevetsTowel'],
    approaches: ['near-step-link', 'central-partner-link'],
    partnerBenefit: 'The first secured step becomes a shorter departure for the opposite pilot.',
  },
  {
    id: 'divided-workshop',
    disposition: 'five-zone-shared-centre',
    sourceIds: ['wovenRunner'],
    approaches: ['separate-chambers', 'central-partner-bank'],
    partnerBenefit:
      'A contested central bank lets either specialist cross over and protect the other chamber.',
  },
  {
    id: 'shared-detour',
    disposition: 'openwork-material-exchange',
    sourceIds: ['openworkPanels'],
    approaches: ['neutralize-slow-first', 'neutralize-lethal-first'],
    partnerBenefit:
      'Neutralizing either material passage opens an ordinary shared approach to the centre.',
  },
]);

const revisions = Object.freeze({
  'stepping-exchange': {
    walls: [
      rect(19, 5, 2, 4),
      rect(22, 9, 2, 3),
      rect(25, 13, 2, 3),
      rect(45, 20, 2, 3),
      rect(48, 23, 2, 3),
      rect(51, 27, 2, 4),
    ],
    foundations: [
      rect(10, 8, 5, 5),
      rect(27, 8, 5, 5),
      rect(33, 15, 6, 6),
      rect(40, 23, 5, 5),
      rect(57, 23, 5, 5),
    ],
    terrain: [],
    spawns: [
      { id: 'west', x: 12.5, y: 10.5 },
      { id: 'east', x: 59.5, y: 25.5 },
    ],
    design: {
      routeDecision:
        'Secure the nearer offset step first, or expose a longer line to the central bank so the opposite pilot gains the stronger next departure?',
      lesson:
        'Alternating-band organization informs the obstacle rhythm only. The stepped marks are walls; only reclaimed islands and completed cuts are returns.',
      counterplay:
        'Use Disruptor Support around the keeper nearest the receiving island and Interceptor Support on the longer central connection. Approach the centre from opposite diagonals rather than duplicating one route.',
      captureConsequence:
        'Even a line-only closure adds a shared bank. Reaching the centre first shortens the partner’s exposure through the opposite half of the band.',
      memorableMoment:
        'Two offset island chains meet at one bank, changing which specialist owns the safest next cut.',
      mastery: 'Let each pilot close onto a return earned by the other before the final clear.',
    },
  },
  'divided-workshop': {
    walls: [
      rect(35, 1, 2, 11),
      rect(35, 24, 2, 11),
      rect(23, 7, 2, 7),
      rect(23, 22, 2, 7),
      rect(47, 7, 2, 7),
      rect(47, 22, 2, 7),
      rect(29, 12, 2, 4),
      rect(41, 20, 2, 4),
    ],
    foundations: [rect(14, 15, 5, 5), rect(33, 15, 6, 6), rect(53, 15, 5, 5)],
    terrain: [],
    spawns: [
      { id: 'west', x: 16.5, y: 17.5 },
      { id: 'east', x: 55.5, y: 17.5 },
    ],
    design: {
      routeDecision:
        'Work the mirrored outer chambers independently, or contest the open central zone first so either specialist can cross over and support the partner?',
      lesson:
        'Zoned runner organization informs the mirrored baffles and central focus only. The gaps remain deliberate passages; walls never become closure surfaces.',
      counterplay:
        'Independent chamber cuts are shorter. The central route is more exposed, but creates a shared bank from which Interceptor and Disruptor can exchange sides.',
      captureConsequence:
        'A central closure gives both pilots a new return and support position. An outer closure contributes coverage but leaves the partner’s approach unchanged.',
      memorableMoment:
        'The apparent divider opens into a shared centre, turning two parallel jobs into a deliberate specialist exchange.',
      mastery:
        'Establish the central bank, cross specialists, then clear both outer chambers without a down.',
    },
  },
  'shared-detour': {
    walls: [
      rect(31, 5, 2, 6),
      rect(31, 25, 2, 6),
      rect(39, 8, 2, 7),
      rect(39, 21, 2, 7),
      rect(34, 8, 3, 2),
      rect(35, 26, 3, 2),
    ],
    foundations: [rect(12, 10, 5, 18), rect(34, 15, 5, 6), rect(51, 15, 9, 5)],
    terrain: [
      { id: 'soft-approach', kind: 'slow', ...rect(21, 11, 8, 15) },
      { id: 'marked-crossing', kind: 'lethal', ...rect(43, 10, 5, 16) },
    ],
    spawns: [
      { id: 'west', x: 14.5, y: 18.5 },
      { id: 'east', x: 55.5, y: 17.5 },
    ],
    design: {
      routeDecision:
        'Neutralize the slow west passage for a controlled centre approach, or close around the lethal east passage first and give the partner the faster shared route?',
      lesson:
        'Unequal openwork spacing informs the staggered passages only. Capturing a material bed neutralizes it; touching a wall still cannot finish a cut.',
      counterplay:
        'The Disruptor controls the keeper beside the chosen material enclosure while the Interceptor protects the longer openwork crossing. Preserve the unclaimed passage as an escape until the partner banks.',
      captureConsequence:
        'Either neutralized passage becomes ordinary shared ground leading to the centre. The opposite specialist can then replace an outer detour with a shorter return.',
      memorableMoment:
        'A dangerous asymmetrical detour becomes a two-way exchange after one specialist opens the first passage.',
      mastery:
        'Neutralize both material passages and have each pilot use the central bank before clearing.',
    },
  },
});

/** Copy-on-write Team successor. Gameplay policy, actors, objectives, Support
 * ownership and original pictures stay exact; only three maps and their route
 * guidance advance. Every prior Team factory remains independently callable. */
export function createTeamCulturalSpecialistOriginalCandidates() {
  const before = createTeamCompleteSpecialistOriginalCandidates();
  const project = structuredClone(before);
  project.id = 'team-cultural-specialist-originals-review';
  project.revision = TEAM_CULTURAL_SPECIALIST_REVISION;
  project.name = 'Team Journey · Ukrainian spatial specialists · balance review pending';

  for (const selection of TEAM_CULTURAL_SPECIALIST_SELECTIONS) {
    const mission = project.missions.find(({ id }) => id === selection.id);
    if (!mission) throw new Error(`${selection.id} must remain in the complete Team journey.`);
    const priorMap = project.maps.find(
      (map) => map.id === mission.map.id && map.revision === mission.map.revision,
    );
    if (!priorMap) throw new Error(`${selection.id} needs its exact prior map.`);
    const revision = revisions[selection.id];
    const nextMap = structuredClone(priorMap);
    Object.assign(nextMap, {
      revision: TEAM_CULTURAL_SPECIALIST_REVISION,
      walls: structuredClone(revision.walls),
      foundations: structuredClone(revision.foundations),
      terrain: structuredClone(revision.terrain),
      spawns: structuredClone(revision.spawns),
    });
    project.maps = project.maps.filter(
      (map) => map.id !== priorMap.id || map.revision !== priorMap.revision,
    );
    project.maps.push(nextMap);
    Object.assign(mission, {
      revision: TEAM_CULTURAL_SPECIALIST_REVISION,
      map: { id: nextMap.id, revision: nextMap.revision },
      design: {
        ...mission.design,
        ...revision.design,
        practices: [...new Set([...mission.design.practices, 'walls', 'foundations'])],
        combines: [
          ...new Set([...mission.design.combines, 'walls', 'foundations', 'complementary-routes']),
        ],
      },
    });
  }

  const ownerIds = new Set(
    project.campaigns
      .filter((campaign) =>
        campaign.missionIds.some((missionId) => revisions[missionId] !== undefined),
      )
      .map(({ id }) => id),
  );
  for (const campaign of project.campaigns)
    if (ownerIds.has(campaign.id)) campaign.revision = TEAM_CULTURAL_SPECIALIST_REVISION;
  for (const pack of project.packs)
    if (pack.campaignIds.some((campaignId) => ownerIds.has(campaignId)))
      pack.revision = TEAM_CULTURAL_SPECIALIST_REVISION;

  return structuredClone(compileContentProject(project).source);
}
