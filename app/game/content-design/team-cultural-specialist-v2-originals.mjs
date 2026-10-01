import { freezeDesign } from './catalogs.mjs';
import { compileContentProject } from './project.mjs';
import { createTeamCulturalSpecialistOriginalCandidates } from './team-cultural-specialist-originals.mjs';

export const TEAM_CULTURAL_SPECIALIST_V2_PROFILE_KEY = 'team-cultural-specialist-originals-2';
export const TEAM_CULTURAL_SPECIALIST_V2_REVISION = 'team-cultural-routes-2';
const rect = (x, y, w, h) => ({ x, y, w, h });

export const TEAM_CULTURAL_SPECIALIST_V2_SOURCES = freezeDesign({
  vesniankyTowel: {
    institution: 'Museum Fund of Ukraine',
    record: 'Vesnianky embroidered towel, collection record 73059',
    url: 'https://museum.mincult.gov.ua/collections/rushnik-vesnyanki-73059',
    observedVocabulary: [
      'a widest central band anchors the composition',
      'rhomboid and cross-like forms recur in surrounding bands',
      'smaller forms build a larger central focus',
    ],
    adaptationBoundary:
      'Crossed gardens borrows central emphasis, nested scale and cross-band rhythm only. No towel, stitch chart, motif, palette, meaning, element count or source coordinates are copied.',
  },
  symmetricCarpet: {
    institution: 'Museum Fund of Ukraine',
    record: 'Hand-woven carpet, collection record 62650',
    url: 'https://museum.mincult.gov.ua/collections/kilim-62650',
    observedVocabulary: [
      'vertical symmetry organized around a central axis',
      'plain and ornamented horizontal bands alternate',
      'band edges bend away from a straight baseline',
    ],
    adaptationBoundary:
      'Split orchards borrows mirrored organization, alternating density and offset band edges only. No carpet, plant form, motif, weave draft, palette, meaning or source coordinates are copied.',
  },
  hutsulBandCarpet: {
    institution: 'Museum Fund of Ukraine',
    record: 'Hutsul-style hand-woven carpet, collection record 157967',
    url: 'https://museum.mincult.gov.ua/collections/kilim-157967',
    observedVocabulary: [
      'horizontal bands alternate at different widths',
      'elongated rhomboid forms sit inside the broad bands',
      'thin separators keep adjacent bands legible',
    ],
    adaptationBoundary:
      'Weaver crossing borrows variable-width lanes, elongated central openings and thin separators only. No carpet, rhomboid motif, weave draft, palette, meaning or source coordinates are copied.',
  },
});

export const TEAM_CULTURAL_SPECIALIST_V2_SELECTIONS = freezeDesign([
  {
    id: 'crossed-gardens',
    disposition: 'nested-cross-band-exchange',
    sourceIds: ['vesniankyTowel'],
    approaches: ['outer-garden-neutralization', 'central-cross-bank'],
    partnerBenefit:
      'Securing the nested central bank gives both specialists a short launch into the opposite material garden.',
  },
  {
    id: 'split-orchards',
    disposition: 'mirrored-band-orchards',
    sourceIds: ['symmetricCarpet'],
    approaches: ['plain-band-transfer', 'orchard-neutralization'],
    partnerBenefit:
      'Closing either offset band creates a full-speed partner route around the still-dangerous opposite orchard.',
  },
  {
    id: 'weaver-crossing',
    disposition: 'variable-thread-exchange',
    sourceIds: ['hutsulBandCarpet'],
    approaches: ['thin-thread-link', 'broad-lane-neutralization'],
    partnerBenefit:
      'A linked middle opening lets the partner exchange lanes instead of repeating the first specialist’s exposed crossing.',
  },
]);

const revisions = Object.freeze({
  'crossed-gardens': {
    walls: [
      rect(25, 6, 2, 7),
      rect(21, 11, 4, 2),
      rect(27, 11, 4, 2),
      rect(45, 23, 2, 7),
      rect(41, 23, 4, 2),
      rect(47, 23, 4, 2),
    ],
    foundations: [rect(10, 15, 5, 6), rect(33, 14, 6, 8), rect(57, 15, 5, 6)],
    terrain: [
      { id: 'west-slow-garden', kind: 'slow', ...rect(15, 16, 8, 13) },
      { id: 'west-lethal-garden', kind: 'lethal', ...rect(16, 6, 6, 5) },
      { id: 'east-slow-garden', kind: 'slow', ...rect(49, 7, 8, 13) },
      { id: 'east-lethal-garden', kind: 'lethal', ...rect(51, 25, 6, 5) },
    ],
    spawns: [
      { id: 'west', x: 12.5, y: 17.5 },
      { id: 'east', x: 59.5, y: 17.5 },
    ],
    design: {
      routeDecision:
        'Neutralize an outer garden for the safer transfer, or expose a longer cut to the nested central bank so both specialists gain the stronger next launch?',
      lesson:
        'Nested and cross-band organization informs the route rhythm only. Walls block movement, while only foundations and completed cuts close a trail.',
      counterplay:
        'The Interceptor protects the long central cut while the Disruptor controls the keeper in the chosen garden. Approach opposite bands so one closure changes the other pilot’s route.',
      captureConsequence:
        'An outer enclosure removes one material penalty. A central-bank connection instead gives both pilots a short launch toward the opposite garden.',
      memorableMoment:
        'Two offset cross bands become one shared exchange after the first specialist reaches the nested centre.',
      mastery:
        'Connect the central bank, then let each pilot neutralize a different garden without a down.',
    },
  },
  'split-orchards': {
    walls: [
      rect(25, 5, 2, 8),
      rect(22, 13, 5, 2),
      rect(25, 23, 2, 8),
      rect(22, 21, 5, 2),
      rect(45, 5, 2, 8),
      rect(45, 13, 5, 2),
      rect(45, 23, 2, 8),
      rect(45, 21, 5, 2),
    ],
    foundations: [rect(10, 15, 6, 6), rect(33, 14, 6, 8), rect(56, 15, 6, 6)],
    terrain: [
      { id: 'west-orchard-north', kind: 'lethal', ...rect(16, 8, 6, 8) },
      { id: 'west-orchard-south', kind: 'lethal', ...rect(16, 20, 6, 8) },
      { id: 'east-orchard-north', kind: 'slow', ...rect(50, 8, 6, 8) },
      { id: 'east-orchard-south', kind: 'slow', ...rect(50, 20, 6, 8) },
    ],
    spawns: [
      { id: 'west', x: 13.5, y: 17.5 },
      { id: 'east', x: 58.5, y: 17.5 },
    ],
    design: {
      routeDecision:
        'Take the plain offset band toward the middle, or enclose one orchard first so the partner can route around the still-dangerous opposite side?',
      lesson:
        'Alternating band density informs the mirrored baffles only. Captured material becomes ordinary ground, but the bent wall ends remain blockers.',
      counterplay:
        'Use opposite outer bands to divide keeper pressure. The Disruptor creates the orchard window; the Interceptor protects the exposed return toward the middle bank.',
      captureConsequence:
        'Neutralizing one orchard creates a full-speed shared flank. Connecting its offset band to the middle lets the partner avoid repeating that enclosure.',
      memorableMoment:
        'A mirrored board becomes deliberately asymmetric when one orchard turns into the team’s preferred transfer route.',
      mastery:
        'Neutralize both orchards from opposite sides and exchange pilots through the middle bank.',
    },
  },
  'weaver-crossing': {
    walls: [
      rect(28, 6, 2, 7),
      rect(25, 13, 3, 2),
      rect(28, 23, 2, 7),
      rect(25, 21, 3, 2),
      rect(42, 6, 2, 7),
      rect(44, 13, 3, 2),
      rect(42, 23, 2, 7),
      rect(44, 21, 3, 2),
    ],
    foundations: [rect(10, 8, 5, 6), rect(33, 14, 6, 8), rect(57, 22, 5, 6)],
    terrain: [
      { id: 'north-west-thread', kind: 'slow', ...rect(17, 7, 10, 5) },
      { id: 'south-west-thread', kind: 'lethal', ...rect(17, 24, 10, 5) },
      { id: 'north-east-thread', kind: 'lethal', ...rect(45, 7, 10, 5) },
      { id: 'south-east-thread', kind: 'slow', ...rect(45, 24, 10, 5) },
    ],
    spawns: [
      { id: 'west', x: 12.5, y: 10.5 },
      { id: 'east', x: 59.5, y: 24.5 },
    ],
    design: {
      routeDecision:
        'Link a thin separator to the middle opening, or neutralize a broad material lane before the partner exchanges sides?',
      lesson:
        'Variable-width band organization informs the thread spacing only. The elongated opening is a route decision, not a copied textile motif.',
      counterplay:
        'The Interceptor covers the longer middle connection while the Disruptor opens a keeper window beside the chosen material lane. Start on different bands to preserve two exits.',
      captureConsequence:
        'A neutralized broad lane becomes a full-speed approach. A middle connection lets the partner exchange lanes and use that approach without repeating the exposed cut.',
      memorableMoment:
        'The team turns separate thin and broad threads into one shared crossing with two viable exits.',
      mastery:
        'Have each pilot neutralize one broad lane, then exchange sides through the middle opening.',
    },
  },
});

/** Second copy-on-write Ukrainian Team successor. Every prior edition remains
 * independently callable; only three additional maps and their guidance move. */
export function createTeamCulturalSpecialistV2OriginalCandidates() {
  const before = createTeamCulturalSpecialistOriginalCandidates();
  const project = structuredClone(before);
  project.id = 'team-cultural-specialist-originals-v2-review';
  project.revision = TEAM_CULTURAL_SPECIALIST_V2_REVISION;
  project.name = 'Team Journey · Ukrainian spatial specialists II · balance review pending';

  for (const selection of TEAM_CULTURAL_SPECIALIST_V2_SELECTIONS) {
    const mission = project.missions.find(({ id }) => id === selection.id);
    if (!mission) throw new Error(`${selection.id} must remain in the Ukrainian Team journey.`);
    const priorMap = project.maps.find(
      (map) => map.id === mission.map.id && map.revision === mission.map.revision,
    );
    if (!priorMap) throw new Error(`${selection.id} needs its exact prior map.`);
    const revision = revisions[selection.id];
    const nextMap = structuredClone(priorMap);
    Object.assign(nextMap, {
      revision: TEAM_CULTURAL_SPECIALIST_V2_REVISION,
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
      revision: TEAM_CULTURAL_SPECIALIST_V2_REVISION,
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
    if (ownerIds.has(campaign.id)) campaign.revision = TEAM_CULTURAL_SPECIALIST_V2_REVISION;
  for (const pack of project.packs)
    if (pack.campaignIds.some((campaignId) => ownerIds.has(campaignId)))
      pack.revision = TEAM_CULTURAL_SPECIALIST_V2_REVISION;

  return structuredClone(compileContentProject(project).source);
}
