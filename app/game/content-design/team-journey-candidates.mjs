import { createTeamOpeningCandidates } from './team-candidates.mjs';
import { createTeamSignalCandidates } from './team-signal-candidates.mjs';
import { createTeamMaterialPracticeCandidates } from './team-material-candidates.mjs';
import { createTeamRoamerCandidates } from './team-roamer-candidates.mjs';
import { freezeDesign } from './catalogs.mjs';
import { TEAM_ART_CANDIDATES } from './team-art.mjs';
import { SIGNAL_TEAM_ART_CANDIDATES } from './signal-art.mjs';

// Separate cooperative decisions, not mirrored Solo maps. No new runtime rule
// or upgraded historical edition: these use qualified Team foundations only.
const layouts = [
  {
    id: 'stepping-exchange',
    name: 'Stepping exchange',
    band: 2,
    coverage: 0.66,
    foundations: [
      { x: 10, y: 8, w: 5, h: 5 },
      { x: 57, y: 23, w: 5, h: 5 },
      { x: 27, y: 8, w: 5, h: 5 },
      { x: 40, y: 23, w: 5, h: 5 },
    ],
    spawns: [
      [12.5, 10.5],
      [59.5, 25.5],
    ],
    walls: [],
    keepers: [
      [36.5, 4.5, 1, 0],
      [35.5, 31.5, -1, 0],
    ],
    routeDecision:
      'Take separate stepping stones, or connect across the centre before spreading out?',
    lesson: 'The return one partner builds is also a launch point for the other.',
    counterplay:
      'The upper and lower keepers leave different departure windows. Use the intermediate islands to shorten exposure; a wall is never a return.',
    captureConsequence:
      'A line-only link can still shorten both routes while occupied regions remain unclaimed.',
    memorableMoment: 'An offset chain of four islands becomes one shared route network.',
    mastery:
      'Connect both intermediate islands to the perimeter, with a closure from each craft and no knockdowns.',
    masteryFoundations: [2, 3],
  },
  {
    id: 'divided-workshop',
    name: 'Divided workshop',
    band: 3,
    coverage: 0.72,
    foundations: [
      { x: 14, y: 15, w: 5, h: 5 },
      { x: 53, y: 15, w: 5, h: 5 },
    ],
    spawns: [
      [16.5, 17.5],
      [55.5, 17.5],
    ],
    walls: [{ x: 35, y: 1, w: 2, h: 34 }],
    keepers: [
      [25.5, 8.5, 1, 0],
      [46.5, 27.5, -1, 0],
    ],
    routeDecision:
      'Work opposite chambers in parallel, or travel around the perimeter to help the pressured partner?',
    lesson:
      'Each occupied chamber needs its own useful capture; closing one side does not clear the other.',
    counterplay:
      'The divider blocks movement and never banks a trail. Return to an island or the perimeter; each chamber has a visible keeper.',
    captureConsequence:
      'Both chambers contribute to the same coverage quota. Neither half alone can supply the required clear.',
    memorableMoment: 'Two independent enclosures transform opposite halves of one board.',
    mastery:
      'Each craft closes in its starting chamber and connects its island to the perimeter without a knockdown.',
    masteryFoundations: [0, 1],
  },
  {
    id: 'switchback-partners',
    name: 'Switchback partners',
    band: 3,
    coverage: 0.72,
    foundations: [
      { x: 10, y: 6, w: 5, h: 5 },
      { x: 57, y: 25, w: 5, h: 5 },
      { x: 30, y: 14, w: 12, h: 5 },
    ],
    spawns: [
      [12.5, 8.5],
      [59.5, 27.5],
    ],
    walls: [
      { x: 23, y: 1, w: 2, h: 20 },
      { x: 47, y: 15, w: 2, h: 20 },
    ],
    keepers: [
      [16.5, 27.5, 1, 0],
      [55.5, 6.5, -1, 0],
      [35.5, 24.5, 1, 0],
    ],
    routeDecision:
      'Bank the outer pockets first, or approach the shared middle platform from opposite wall tips?',
    lesson:
      'Complementary approaches can turn a long winding return into a common launch platform.',
    counterplay:
      'Go around the ends of the staggered walls. The centre keeper makes a blind meeting risky; close onto the platform before changing sides.',
    captureConsequence:
      'Outer captures leave a contested middle instead of automatically filling it. Linking the platform creates a shorter second approach.',
    memorableMoment:
      'Both craft arrive at one middle platform from opposite ends of the switchback.',
    mastery:
      'Both craft visit the centre platform after it is connected to the perimeter and each closes a cut, without knockdowns.',
    masteryFoundations: [2],
  },
];

export const TEAM_FOUNDATION_CANDIDATES = freezeDesign(layouts);
export const TEAM_FOUNDATION_FIRST_RETURNS = freezeDesign({
  'stepping-exchange': ['down', 'up'],
  'divided-workshop': ['down', 'up'],
  'switchback-partners': ['up', 'down'],
});
export const TEAM_JOURNEY_LEARNING_ARCS = freezeDesign([
  {
    id: 'shared-return-network',
    missionIds: ['twin-landings', 'stepping-exchange', 'divided-workshop', 'switchback-partners'],
  },
  {
    id: 'shared-material-work',
    missionIds: ['shared-detour', 'crossed-gardens', 'split-orchards', 'weaver-crossing'],
  },
  {
    id: 'changing-common-ground',
    missionIds: ['shared-lookout', 'twin-depots', 'changing-courtyard', 'last-rendezvous'],
  },
]);

export function createTeamFoundationPracticeCandidates() {
  const source = createTeamOpeningCandidates();
  const base = source.missions[0];
  source.id = 'journey-team-foundation-practice';
  source.revision = 'greybox-1';
  source.name = 'Shared returns · greybox';
  source.maps = layouts.map((layout) => ({
    format: 'MapDesignV1',
    id: `${layout.id}-map`,
    revision: 'greybox-1',
    name: layout.name,
    width: 72,
    height: 36,
    terrain: [],
    walls: structuredClone(layout.walls),
    foundations: structuredClone(layout.foundations),
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
      practices: ['team-foundations', 'closure', 'enemy-retained-regions'],
      combines: ['complementary-routes', 'shared-return-network'],
      memorableMoment: layout.memorableMoment,
      mastery: layout.mastery,
      durationSeconds: [50, 140],
      difficulty: {
        band: layout.band,
        planning: layout.band,
        execution: 2,
        threatDensity: layout.keepers.length,
        timePressure: 0,
        mechanicLoad: 2,
        coordination: layout.band,
      },
    },
  }));
  source.campaigns = [
    {
      format: 'CampaignDesignV1',
      id: 'shared-returns',
      revision: 'greybox-1',
      name: 'Shared returns',
      band: 2,
      missionIds: layouts.map(({ id }) => id),
    },
  ];
  source.packs = [
    {
      format: 'PackDesignV1',
      id: source.id,
      revision: 'greybox-1',
      name: source.name,
      campaignIds: ['shared-returns'],
    },
  ];
  return source;
}

/** Local review sequence. Historical Team V1/V2 missions stay byte-for-byte
 * unchanged in separate campaigns; no public enrollment or award authority. */
export function createTeamJourneyCandidates({ artwork = false } = {}) {
  const chapters = [
    createTeamOpeningCandidates(),
    createTeamFoundationPracticeCandidates(),
    createTeamSignalCandidates(),
    createTeamMaterialPracticeCandidates(),
    createTeamRoamerCandidates(),
  ];
  const source = {
    ...chapters[0],
    id: 'team-journey-greybox-review',
    revision: 'greybox-3',
    actorCatalogId: 'journey-actors-v2',
    name: 'Team Journey · unvalidated greybox review',
  };
  for (const key of ['maps', 'missions', 'campaigns', 'packs', 'assets'])
    source[key] = chapters.flatMap((chapter) => chapter[key] ?? []);
  if (artwork) {
    // Presentation-only opt-in: retain each historical Team edition, theme and
    // recipe. Runtime delivery still requires the authenticated picture path.
    source.assets = structuredClone([...TEAM_ART_CANDIDATES, ...SIGNAL_TEAM_ART_CANDIDATES]);
    for (const mission of source.missions)
      mission.presentation.backgroundAssetId =
        mission.id === 'shared-detour'
          ? SIGNAL_TEAM_ART_CANDIDATES[0].id
          : 'team-partners-' + mission.id;
  }
  return source;
}
