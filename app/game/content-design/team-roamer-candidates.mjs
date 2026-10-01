import { createTeamOpeningCandidates } from './team-candidates.mjs';
import { freezeDesign, ROVER_ACTOR_CATALOG } from './catalogs.mjs';

// Original cooperative greyboxes: the new rule changes the consequences of a
// capture, not either player's steering, keeper speed or completion quota rules.
const layouts = [
  {
    id: 'shared-lookout',
    name: 'Shared lookout',
    band: 5,
    coverage: 0.74,
    foundations: [
      { x: 8, y: 7, w: 7, h: 7 },
      { x: 57, y: 22, w: 7, h: 7 },
    ],
    spawns: [
      [11.5, 10.5],
      [60.5, 25.5],
    ],
    walls: [],
    terrain: [],
    keepers: [
      [36.5, 4.5, 1, 0],
      [35.5, 31.5, -1, 0],
    ],
    roamers: [[27.5, 10.5, 0, 1]],
    routeDecision:
      'Build separate outer returns before waking the middle roamer, or connect the islands and share an escape corridor?',
    lesson:
      'A dormant roamer does not keep territory unclaimed. Reclaim its full body and the one-second warning precedes danger on reclaimed ground.',
    counterplay:
      'Make a second exit before enclosing the tracked body. Move away during WAKING; an active roamer reflects rather than chasing either partner.',
    captureConsequence:
      'A large capture removes field danger but can start a new reclaimed-ground threat for both craft.',
    memorableMoment: 'The still tracked body wakes inside territory that both craft just earned.',
    mastery:
      'Activate the roamer before clearing, with a closure from each craft and no knockdowns.',
  },
  {
    id: 'twin-depots',
    name: 'Twin depots',
    band: 5,
    coverage: 0.76,
    foundations: [
      { x: 12, y: 14, w: 6, h: 8 },
      { x: 54, y: 14, w: 6, h: 8 },
    ],
    spawns: [
      [14.5, 17.5],
      [57.5, 17.5],
    ],
    walls: [{ x: 35, y: 1, w: 2, h: 34 }],
    terrain: [],
    keepers: [
      [8.5, 5.5, 1, 0],
      [63.5, 30.5, -1, 0],
    ],
    roamers: [
      [23.5, 12.5, 0, 1],
      [48.5, 23.5, 0, -1],
    ],
    routeDecision:
      'Wake the depot roamers together, or let one partner secure a return while the other changes their chamber?',
    lesson:
      'Each occupied chamber keeps its own field, while each reclaimed roamer changes the local return route.',
    counterplay:
      'Keep a perimeter connection in each chamber. The divider blocks movement and cannot close a cut; use Support if a roamer approaches a return.',
    captureConsequence:
      'A chamber clear can move its main danger onto the shared perimeter without completing the other chamber.',
    memorableMoment: 'Two independent wake-up decisions meet on a common perimeter.',
    mastery:
      'Activate both roamers, with each craft closing in its starting chamber and no knockdowns.',
  },
  {
    id: 'changing-courtyard',
    name: 'Changing courtyard',
    band: 6,
    coverage: 0.78,
    foundations: [
      { x: 10, y: 7, w: 5, h: 22 },
      { x: 57, y: 7, w: 5, h: 22 },
      { x: 32, y: 15, w: 8, h: 6 },
    ],
    spawns: [
      [12.5, 17.5],
      [59.5, 17.5],
    ],
    walls: [
      { x: 23, y: 8, w: 2, h: 8 },
      { x: 47, y: 20, w: 2, h: 8 },
    ],
    terrain: [
      { id: 'lower-slow', kind: 'slow', x: 28, y: 22, w: 5, h: 5 },
      { id: 'upper-crosses', kind: 'lethal', x: 40, y: 7, w: 5, h: 5 },
    ],
    keepers: [
      [18.5, 4.5, 1, 0],
      [53.5, 31.5, -1, 0],
    ],
    roamers: [
      [30.5, 10.5, 1, 0],
      [41.5, 25.5, -1, 0],
    ],
    routeDecision:
      'Neutralize the upper hazard before linking the courtyard, or establish the lower slow-field approach while the partner prepares a different exit?',
    lesson: 'Removing a terrain hazard does not make every reclaimed route free of enemies.',
    counterplay:
      'Use the side spines to change departure heights. Enclose crosses before entering them and leave space around the courtyard when a roamer wakes.',
    captureConsequence:
      'Material neutralization and roamer activation can occur in the same enclosure; both partners must read the changed board.',
    memorableMoment:
      'A dangerous garden becomes passable just as the tracked bodies make the surrounding ground busy.',
    mastery:
      'Activate both roamers and connect the courtyard to the perimeter, with a closure from each craft and no knockdowns.',
  },
  {
    id: 'last-rendezvous',
    name: 'Last rendezvous',
    band: 6,
    coverage: 0.78,
    foundations: [
      { x: 9, y: 7, w: 6, h: 6 },
      { x: 57, y: 23, w: 6, h: 6 },
      { x: 27, y: 20, w: 6, h: 6 },
      { x: 39, y: 8, w: 6, h: 6 },
    ],
    spawns: [
      [11.5, 9.5],
      [59.5, 25.5],
    ],
    walls: [{ x: 35, y: 13, w: 2, h: 10 }],
    terrain: [
      { id: 'west-crosses', kind: 'lethal', x: 30, y: 15, w: 4, h: 4 },
      { id: 'east-slow', kind: 'slow', x: 38, y: 16, w: 4, h: 5 },
    ],
    keepers: [
      [20.5, 3.5, 1, 0],
      [51.5, 32.5, -1, 0],
      [35.5, 6.5, 1, 0],
    ],
    roamers: [
      [31.5, 10.5, 0, 1],
      [40.5, 26.5, 0, -1],
    ],
    routeDecision:
      'Reach opposite stepping islands first, or connect along one flank and let a partner reopen the other approach?',
    lesson:
      'Combine known return networks, material decisions and wake-up timing without learning another rule.',
    counterplay:
      'The middle wall has two distinct bypasses. Keep the lethal pocket outside cuts until enclosed and avoid funneling both craft into the same active roamer.',
    captureConsequence:
      'Each added connection shortens both partners’ routes, but an enclosure can also introduce pressure on that connection.',
    memorableMoment:
      'Four separated islands become a shared network with two moving reclaimed-ground threats.',
    mastery:
      'Activate both roamers and connect both intermediate islands to the perimeter, with a closure from each craft and no knockdowns.',
  },
];

export const TEAM_ROAMER_CANDIDATES = freezeDesign(layouts);
export const TEAM_ROAMER_FIRST_RETURNS = freezeDesign(
  Object.fromEntries(layouts.map(({ id }) => [id, ['left', 'right']])),
);

export function createTeamRoamerCandidates() {
  const source = createTeamOpeningCandidates(),
    base = source.missions[0];
  source.id = 'journey-team-changing-ground';
  source.revision = 'greybox-1';
  source.name = 'Changing common ground · greybox';
  source.actorCatalogId = ROVER_ACTOR_CATALOG.id;
  source.maps = layouts.map((layout) => ({
    format: 'MapDesignV1',
    id: `${layout.id}-map`,
    revision: 'greybox-1',
    name: layout.name,
    width: 72,
    height: 36,
    walls: structuredClone(layout.walls),
    foundations: structuredClone(layout.foundations),
    terrain: structuredClone(layout.terrain),
    spawns: layout.spawns.map(([x, y], seat) => ({ id: seat ? 'east' : 'west', x, y })),
  }));
  source.missions = layouts.map((layout, index) => ({
    ...structuredClone(base),
    id: layout.id,
    revision: 'greybox-1',
    name: layout.name,
    map: { id: `${layout.id}-map`, revision: 'greybox-1' },
    coverage: layout.coverage,
    team: { format: 'TeamMissionV3', spawnIds: ['west', 'east'] },
    actors: [
      ['keeper', 'field-keeper', layout.keepers],
      ['roamer', 'reclaimed-roamer', layout.roamers],
    ].flatMap(([prefix, role, actors]) =>
      actors.map(([x, y, dx, dy], i) => ({
        id: `${prefix}-${i + 1}`,
        role,
        tier: 'measured',
        x,
        y,
        heading: [dx, dy],
      })),
    ),
    design: {
      routeDecision: layout.routeDecision,
      lesson: layout.lesson,
      counterplay: layout.counterplay,
      captureConsequence: layout.captureConsequence,
      introduces: index === 0 ? ['team-reclaimed-roamers'] : [],
      practices:
        index === 0
          ? ['team-foundations', 'enemy-retained-regions']
          : ['team-reclaimed-roamers', 'team-foundations', 'team-terrain'],
      combines: ['complementary-routes', 'changing-ground'],
      memorableMoment: layout.memorableMoment,
      mastery: layout.mastery,
      durationSeconds: [60, 150],
      difficulty: {
        band: layout.band,
        planning: layout.band,
        execution: 4,
        threatDensity: layout.keepers.length + layout.roamers.length,
        timePressure: 0,
        mechanicLoad: index < 2 ? 3 : 4,
        coordination: index < 2 ? 4 : 5,
      },
    },
    presentation: { themeId: 'rover', backgroundAssetId: null },
  }));
  source.campaigns = [
    {
      format: 'CampaignDesignV1',
      id: 'changing-common-ground',
      revision: 'greybox-1',
      name: 'Changing common ground',
      band: 5,
      missionIds: layouts.map(({ id }) => id),
    },
  ];
  source.packs = [
    {
      format: 'PackDesignV1',
      id: source.id,
      revision: 'greybox-1',
      name: source.name,
      campaignIds: ['changing-common-ground'],
    },
  ];
  return source;
}
