import { createTeamSignalCandidates } from './team-signal-candidates.mjs';
import { freezeDesign } from './catalogs.mjs';

const layouts = [
  {
    id: 'crossed-gardens',
    name: 'Crossed gardens',
    band: 4,
    coverage: 0.72,
    foundations: [
      { x: 10, y: 15, w: 5, h: 5 },
      { x: 57, y: 15, w: 5, h: 5 },
      { x: 33, y: 15, w: 6, h: 5 },
    ],
    spawns: [
      [12.5, 17.5],
      [59.5, 17.5],
    ],
    walls: [],
    terrain: [
      { id: 'west-approach', kind: 'slow', x: 21, y: 12, w: 5, h: 12 },
      { id: 'east-approach', kind: 'slow', x: 46, y: 12, w: 5, h: 12 },
      { id: 'north-garden', kind: 'lethal', x: 29, y: 5, w: 14, h: 5 },
      { id: 'south-garden', kind: 'lethal', x: 29, y: 26, w: 14, h: 5 },
    ],
    keepers: [
      [18.5, 5.5, 1, 0],
      [53.5, 30.5, -1, 0],
      [35.5, 22.5, 1, 0],
    ],
    routeDecision:
      'Link through a slow approach to reach the middle island, or split the outer routes and clear the gardens first?',
    lesson:
      'A short route through slow field can keep a trail exposed longer than an outer bypass.',
    counterplay:
      'Keep the lethal gardens outside your route until they are reclaimed. Time the central keeper before attempting a shared bridge.',
    captureConsequence:
      'An outer enclosure can remove a garden and an approach together, giving the other craft a full-speed return.',
    memorableMoment:
      'Two dangerous gardens become ordinary shared ground around a contested middle island.',
    mastery:
      'Neutralize every slow and lethal patch with a closure from each craft and no knockdowns.',
  },
  {
    id: 'split-orchards',
    name: 'Split orchards',
    band: 4,
    coverage: 0.76,
    foundations: [
      { x: 11, y: 14, w: 7, h: 7 },
      { x: 54, y: 14, w: 7, h: 7 },
    ],
    spawns: [
      [14.5, 17.5],
      [57.5, 17.5],
    ],
    walls: [{ x: 35, y: 1, w: 2, h: 34 }],
    terrain: [
      { id: 'west-orchard', kind: 'lethal', x: 23, y: 9, w: 7, h: 18 },
      { id: 'east-orchard', kind: 'slow', x: 42, y: 9, w: 7, h: 18 },
    ],
    keepers: [
      [8.5, 5.5, 1, 0],
      [63.5, 30.5, -1, 0],
    ],
    routeDecision:
      'Enclose the lethal orchard from outside while the other craft crosses the slow bay, or swap roles around the perimeter?',
    lesson:
      'Equal controls do not mean identical jobs: lethal and slow field call for different approaches.',
    counterplay:
      'The west orchard must be enclosed, never crossed unclaimed. The east orchard is crossable but prolongs exposure; the divider is a wall, not a return.',
    captureConsequence:
      'The two occupied chambers retain independently. One partner can finish a material job while the other builds the shared coverage.',
    memorableMoment:
      'Different material problems resolve into two connected, ordinary movement areas.',
    mastery:
      'Neutralize both orchards, with each craft closing in its starting chamber and no knockdowns.',
  },
  {
    id: 'weaver-crossing',
    name: 'Weaver crossing',
    band: 5,
    coverage: 0.76,
    foundations: [
      { x: 10, y: 9, w: 5, h: 18 },
      { x: 54, y: 9, w: 5, h: 18 },
      { x: 32, y: 14, w: 8, h: 7 },
    ],
    spawns: [
      [12.5, 17.5],
      [56.5, 17.5],
    ],
    walls: [
      { x: 22, y: 8, w: 2, h: 18 },
      { x: 48, y: 8, w: 2, h: 18 },
    ],
    terrain: [
      { id: 'north-thread', kind: 'slow', x: 27, y: 7, w: 18, h: 5 },
      { id: 'south-thread', kind: 'slow', x: 27, y: 25, w: 18, h: 4 },
      { id: 'west-notch', kind: 'lethal', x: 28, y: 15, w: 3, h: 5 },
      { id: 'east-notch', kind: 'lethal', x: 41, y: 15, w: 3, h: 5 },
    ],
    keepers: [
      [18.5, 4.5, 1, 0],
      [53.5, 31.5, -1, 0],
      [35.5, 23.5, 1, 0],
    ],
    routeDecision:
      'Weave around opposite wall tips to bank the middle, or clear one material lane and share that approach?',
    lesson:
      'A partner can turn a slow approach into a fast shared return before the second cut begins.',
    counterplay:
      'The long side spines offer many departures. Go above or below the walls, never into the lethal notches; the central keeper preserves the middle until isolated.',
    captureConsequence:
      'Neutralizing either outer thread changes the best route to the middle platform; the remaining occupied field still requires a deliberate closure.',
    memorableMoment: 'Two winding approaches become one short route through the reclaimed middle.',
    mastery:
      'Neutralize every material patch and connect the middle platform to the perimeter, with closures from both craft and no knockdowns.',
  },
];

export const TEAM_MATERIAL_CANDIDATES = freezeDesign(layouts);
export const TEAM_MATERIAL_FIRST_RETURNS = freezeDesign(
  Object.fromEntries(layouts.map(({ id }) => [id, ['left', 'right']])),
);

export function createTeamMaterialPracticeCandidates() {
  const source = createTeamSignalCandidates(),
    base = source.missions[0];
  source.id = 'journey-team-material-practice';
  source.revision = 'greybox-1';
  source.name = 'Shared material routes · greybox';
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
    spawns: layout.spawns.map(([x, y], i) => ({ id: i ? 'east' : 'west', x, y })),
  }));
  source.missions = layouts.map((layout) => ({
    ...structuredClone(base),
    id: layout.id,
    revision: 'greybox-1',
    name: layout.name,
    map: { id: `${layout.id}-map`, revision: 'greybox-1' },
    coverage: layout.coverage,
    actors: layout.keepers.map(([x, y, dx, dy], i) => ({
      id: `keeper-${i + 1}`,
      role: 'field-keeper',
      tier: 'measured',
      x,
      y,
      heading: [dx, dy],
    })),
    design: {
      routeDecision: layout.routeDecision,
      lesson: layout.lesson,
      counterplay: layout.counterplay,
      captureConsequence: layout.captureConsequence,
      introduces: [],
      practices: ['team-terrain', 'enemy-retained-regions', 'foundations'],
      combines: ['complementary-routes', 'material-neutralization'],
      memorableMoment: layout.memorableMoment,
      mastery: layout.mastery,
      durationSeconds: [60, 150],
      difficulty: {
        band: layout.band,
        planning: layout.band,
        execution: 3,
        threatDensity: layout.keepers.length + 1,
        timePressure: 0,
        mechanicLoad: 3,
        coordination: 4,
      },
    },
  }));
  source.campaigns = [
    {
      format: 'CampaignDesignV1',
      id: 'shared-material-routes',
      revision: 'greybox-1',
      name: 'Shared material routes',
      band: 4,
      missionIds: layouts.map(({ id }) => id),
    },
  ];
  source.packs = [
    {
      format: 'PackDesignV1',
      id: source.id,
      revision: 'greybox-1',
      name: source.name,
      campaignIds: ['shared-material-routes'],
    },
  ];
  return source;
}
