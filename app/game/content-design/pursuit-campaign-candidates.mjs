import { createOpeningCandidates } from './horizon-candidates.mjs';
import { PURSUIT_LAYOUTS } from './pursuit-layouts.mjs';
import { COMBAT_ACTOR_CATALOG } from './catalogs.mjs';
import { compileContentProject } from './project.mjs';
import { createPursuitPilotCandidates } from './pursuit-pilot-candidates.mjs';

export const PURSUIT_CAMPAIGN_ROUTE_ID = 'pursuit-campaigns-v1';
export const PURSUIT_CAMPAIGN_REVISION = 'pursuit-chapters-1';
// Each row names a routing problem. Layouts are authored bounded geometry;
// accepted recipes are prototypes until their human qualification is recorded.
const soloChapters = [
  [
    'patrol-district',
    'Patrol District',
    [
      ['crossing-post', 'Crossing Post', 'Intercept at the break in the central divider.'],
      [
        'signal-square',
        'Signal Square',
        'Choose the inner turn or the outer return around a square island.',
      ],
      [
        'passing-bay',
        'Passing Bay',
        'Use a refuge bay to pass the circuit instead of following it.',
      ],
      [
        'island-clock',
        'Island Clock',
        'Match a four-corner patrol from either of two island approaches.',
      ],
      [
        'inner-shortcut',
        'Inner Shortcut',
        'Take a narrow inner cut while the target follows the outer lane.',
      ],
      [
        'loop-exchange',
        'Loop Exchange',
        'Change circuits through the center before the next patrol crossing.',
      ],
    ],
  ],
  [
    'escape-lines',
    'Escape Lines',
    [
      ['open-intercept', 'Open Intercept', 'Approach the refuge target from its distant goal.'],
      [
        'shelter-fork',
        'Shelter Fork',
        'Choose which of two corners to cut off before leaving safety.',
      ],
      [
        'zigzag-exit',
        'Zigzag Exit',
        'Cross a staggered passage instead of matching every target turn.',
      ],
      [
        'broken-ring',
        'Broken Ring',
        'Use the shorter gap while the target commits to its next corner.',
      ],
      ['far-corner', 'Far Corner', 'Turn the refuge seeker away from a long exposed chase.'],
      [
        'three-way-escape',
        'Three-way Escape',
        'Connect a middle return to cover three possible goal routes.',
      ],
    ],
  ],
  [
    'guarded-crossings',
    'Guarded Crossings',
    [
      [
        'warning-yard',
        'Warning Yard',
        'Let the guard lock its aim before committing to the nearest return.',
      ],
      [
        'covered-detour',
        'Covered Detour',
        'Choose cover or a shorter interception across the warning lane.',
      ],
      [
        'two-watchpoints',
        'Two Watchpoints',
        'Approach a patrol from a protected island while avoiding guard fire.',
      ],
      [
        'crossing-warning',
        'Crossing Warning',
        'Separate the patroller crossing from the guard firing window.',
      ],
      [
        'last-safe-turn',
        'Last Safe Turn',
        'Keep a return behind the craft while following the committed branch.',
      ],
      [
        'courtyard-approach',
        'Courtyard Approach',
        'Use two courtyard entrances to approach the guard and refuge target.',
      ],
    ],
  ],
  [
    'specialist-circuit',
    'Specialist Circuit',
    [
      ['shield-turn', 'Shield Turn', 'Read the shield facing and approach its exposed rear.'],
      [
        'shield-flank',
        'Shield Flank',
        'Use the central wall to reach the shield flank after its turn warning.',
      ],
      ['first-brace', 'First Brace', 'Wait out the brace warning and intercept its recovery.'],
      [
        'brace-bypass',
        'Brace Bypass',
        'Take the bypass instead of entering the committed burst lane.',
      ],
      ['mixed-post', 'Mixed Post', 'Separate a shield approach from a brace recovery window.'],
      [
        'specialist-airfield',
        'Specialist Airfield',
        'Combine flanking, burst evasion and an enclosure escape.',
      ],
    ],
  ],
];
const teamChapters = [
  [
    'shared-bearings',
    'Shared Bearings',
    [
      [
        'pincer-yard',
        'Pincer Yard',
        'Approach from opposite rails and split the two interception routes.',
      ],
      [
        'partner-bay',
        'Partner Bay',
        'One pilot closes the narrow bay while the other keeps the outside return.',
      ],
      [
        'opposite-shores',
        'Opposite Shores',
        'Build different approaches toward the same patrol crossing.',
      ],
      [
        'transfer-islands',
        'Transfer Islands',
        'Connect opposite islands before exchanging interception roles.',
      ],
      [
        'crossed-bearings',
        'Crossed Bearings',
        'Avoid converging on the same exposed lane while targets cross it.',
      ],
      [
        'shared-compass',
        'Shared Compass',
        'Choose a common return that supports two separate target approaches.',
      ],
    ],
  ],
  [
    'pincer-grounds',
    'Pincer Grounds',
    [
      [
        'refuge-pincer',
        'Refuge Pincer',
        'One pilot approaches while the partner waits near the refuge goal.',
      ],
      [
        'split-refuge',
        'Split Refuge',
        'Divide two refuges and communicate the changed escape direction.',
      ],
      [
        'return-triangle',
        'Return Triangle',
        'Use a triangular return network to exchange pursuit and capture.',
      ],
      [
        'meeting-cutoff',
        'Meeting Cutoff',
        'Split a rendezvous pair, then cover the surviving runner.',
      ],
      [
        'outer-partner',
        'Outer Partner',
        'Keep one pilot outside the walls while the partner crosses the inner lane.',
      ],
      [
        'double-enclosure',
        'Double Enclosure',
        'Arrange two closures without competing for the same target.',
      ],
    ],
  ],
  [
    'return-workshop',
    'Return Workshop',
    [
      [
        'relay-rendezvous',
        'Relay Rendezvous',
        'Relay the pursuit between two island approaches and paired meeting routes.',
      ],
      [
        'return-bench',
        'Return Bench',
        'Construct a shared return before pursuing the long patrol.',
      ],
      [
        'paired-workshop',
        'Paired Workshop',
        'One pilot reclaims the central strip while the other intercepts.',
      ],
      [
        'side-door-partners',
        'Side-door Partners',
        'Leave separate doors open until both craft have returned.',
      ],
      [
        'shared-overpass',
        'Shared Overpass',
        'Use an island chain to pass the pursuit between players.',
      ],
      [
        'workshop-exchange',
        'Workshop Exchange',
        'Exchange sides through the new reclaimed connection.',
      ],
    ],
  ],
  [
    'material-exchange',
    'Material Exchange',
    [
      [
        'slow-bay-partners',
        'Slow Bay Partners',
        'Use the slow-material bay to make a safer partner interception.',
      ],
      [
        'lethal-pocket',
        'Lethal Pocket',
        'Enclose the isolated lethal material instead of crossing it.',
      ],
      [
        'unequal-orchards',
        'Unequal Orchards',
        'Give the longer route to one pilot while the other connects the nearer island.',
      ],
      [
        'changing-return',
        'Changing Return',
        'Reclaim a material pocket to open the partner route.',
      ],
      [
        'material-pincer',
        'Material Pincer',
        'Choose whether to neutralize the slow bay before herding the target.',
      ],
      [
        'garden-exchange',
        'Garden Exchange',
        'Combine two return networks while keeping lethal ground outside the cut.',
      ],
    ],
  ],
  [
    'window-partners',
    'Window Partners',
    [
      [
        'draw-the-aim',
        'Draw the Aim',
        'One pilot draws a fixed warning while the partner approaches the guard.',
      ],
      [
        'support-crossing',
        'Support Crossing',
        'Use Interceptor support to protect a partner crossing.',
      ],
      [
        'slow-the-pursuit',
        'Slow the Pursuit',
        'Disruptor support creates a shorter interception window.',
      ],
      [
        'cover-and-return',
        'Cover and Return',
        'Separate target pursuit from the guard warning lane.',
      ],
      [
        'opposite-openings',
        'Opposite Openings',
        'Take different openings and share the once-only catches.',
      ],
      ['warning-exchange', 'Warning Exchange', 'Swap support roles at the next safe return.'],
    ],
  ],
  [
    'two-pilot-finale',
    'Two-Pilot Finale',
    [
      [
        'paired-routes',
        'Paired Routes',
        'Each pilot follows a different member of a rendezvous pair.',
      ],
      [
        'shared-cutoff',
        'Shared Cutoff',
        'Herd toward the partner instead of following the whole route.',
      ],
      [
        'courtyard-partners',
        'Courtyard Partners',
        'Use the side courts to alternate capture and pursuit.',
      ],
      [
        'final-warning',
        'Final Warning',
        'Keep a safe partner route through the guard recovery window.',
      ],
      [
        'rendezvous-relay',
        'Rendezvous Relay',
        'Relay the chase after the first partner target is removed.',
      ],
      [
        'two-pilot-airfield',
        'Two-Pilot Airfield',
        'Combine support, interception, shared returns and optional enclosure.',
      ],
    ],
  ],
];
const point = (x, y) => ({ x: x + 0.5, y: y + 0.5 });
const target = (id, behavior, x, y, waypoints, partnerId) => ({
  id,
  behavior,
  ...point(x, y),
  waypoints: waypoints.map(([gx, gy]) => point(gx, gy)),
  ...(partnerId ? { partnerId } : {}),
});

const workshopObjectives = (spawnIds) => ({
  format: 'TeamMissionV9',
  spawnIds,
  strongholds: [
    {
      id: 'workshop-core',
      core: { x: 25.5, y: 17.5 },
      anchors: [
        { x: 11.5, y: 7.5 },
        { x: 59.5, y: 27.5 },
      ],
    },
  ],
  requiredCores: ['workshop-core'],
});

export function createPursuitCampaignCandidates({ team = false } = {}) {
  const opening = createOpeningCandidates({ artwork: false }),
    template = opening.missions[0],
    chapters = team ? teamChapters : soloChapters;
  const source = {
    ...opening,
    id: team ? 'pursuit-team-campaigns-project' : 'pursuit-solo-campaigns-project',
    revision: PURSUIT_CAMPAIGN_REVISION,
    name: team
      ? 'Pursuit partners · six prototype chapters'
      : 'Pursuit routes · four prototype chapters',
    actorCatalogId: COMBAT_ACTOR_CATALOG.id,
    maps: [],
    missions: [],
    campaigns: [],
    packs: [],
  };
  const pilots = createPursuitPilotCandidates({ team });
  for (const [chapterIndex, [chapterId, chapterName, rows]] of chapters.entries()) {
    const missionIds = [];
    for (const [lesson, [shortId, name, route]] of rows.entries()) {
      const pilot = pilots.missions.find((mission) => mission.id === shortId);
      if (pilot) {
        const acceptedPilot = structuredClone(pilot);
        acceptedPilot.design.difficulty.band = chapterIndex + 2;
        if (team && chapterIndex === 2) {
          acceptedPilot.revision = PURSUIT_CAMPAIGN_REVISION;
          acceptedPilot.team = workshopObjectives(acceptedPilot.team.spawnIds);
          acceptedPilot.design.lesson =
            'Capture both marked anchors to lower the core shield, then capture the exposed core. The rendezvous pair remains an optional interception challenge.';
          acceptedPilot.design.captureConsequence =
            'Both anchors and the exposed core are required. Capturing territory builds the route to them.';
        }
        source.missions.push(acceptedPilot);
        source.maps.push(structuredClone(pilots.maps.find((map) => map.id === pilot.map.id)));
        missionIds.push(pilot.id);
        continue;
      }
      const id = `pursuit-${team ? 'team-' : ''}${shortId}`,
        layout = structuredClone(PURSUIT_LAYOUTS[shortId]);
      const material = team && chapterIndex === 3;
      const terrain = material
        ? [{ id: 'material-pocket', kind: lesson % 2 ? 'lethal' : 'slow', x: 3, y: 15, w: 5, h: 5 }]
        : [];
      const map = {
        format: 'MapDesignV1',
        id: `${id}-map`,
        revision: '1',
        name,
        width: 72,
        height: 36,
        walls: layout.walls,
        foundations: layout.foundations,
        terrain,
        spawns: team
          ? [
              { id: 'home', x: 0.5, y: 9.5 },
              { id: 'partner', x: 71.5, y: 26.5 },
            ]
          : [{ id: 'home', x: 24.5, y: 0.5 }],
      };
      const pair = team && ((chapterIndex === 5 && lesson < 3) || shortId === 'meeting-cutoff');
      const specialist = !team && chapterIndex === 3;
      const targets = layout.routes.map((waypoints, index) => {
        const id = index ? 'east-target' : 'west-target';
        const behavior = specialist
          ? lesson < 2
            ? 'shield'
            : lesson < 4
              ? 'brace'
              : index
                ? 'brace'
                : 'shield'
          : pair
            ? 'pair'
            : chapterIndex === 0
              ? 'patroller'
              : index
                ? 'switchback'
                : 'refuge';
        return target(
          id,
          behavior,
          ...waypoints[0],
          waypoints,
          pair ? (index ? 'west-target' : 'east-target') : undefined,
        );
      });
      const guarded = team ? chapterIndex >= 4 : chapterIndex === 2;
      const actors = [
        {
          id: 'keeper',
          role: 'field-keeper',
          tier: 'measured',
          x: 66.5,
          y: 18.5,
          heading: [-1, 1],
        },
      ];
      if (guarded)
        actors.push(
          ...targets.map((actor) => ({
            id: actor.id,
            role: 'optional-scout',
            tier: 'measured',
            x: actor.x,
            y: actor.y,
            heading: [1, 0],
          })),
          {
            id: 'crossing-guard',
            role: 'optional-sentry',
            tier: 'measured',
            x: 35.5,
            y: 3.5,
            heading: [1, 0],
          },
        );
      const mission = {
        ...structuredClone(template),
        format: 'MissionDesignV5',
        id,
        revision: PURSUIT_CAMPAIGN_REVISION,
        name,
        map: { id: map.id, revision: map.revision },
        modes: team ? ['team'] : ['solo', 'versus'],
        actors,
        pursuit: { version: 'mission-pursuit.v1', actors: targets },
        coverage: 0.4 + 0.04 * lesson,
        ...(team
          ? {
              team:
                chapterIndex === 2
                  ? workshopObjectives(['home', 'partner'])
                  : guarded
                    ? {
                        format: 'TeamMissionV7',
                        spawnIds: ['home', 'partner'],
                        lineImpact: false,
                        supportRoles: ['interceptor', 'disruptor'],
                      }
                    : {
                        format: material ? 'TeamMissionV2' : 'TeamMissionV1',
                        spawnIds: ['home', 'partner'],
                      },
            }
          : {}),
        ...(guarded
          ? {
              combat: { version: 'mission-combat.v1', enabled: true },
              hunt: {
                version: 'humanoid-hunt.v1',
                mode: 'bonus',
                quota: 0,
                targets: [
                  ...targets.map((actor) => ({ id: actor.id, kind: 'runner' })),
                  { id: 'crossing-guard', kind: 'guard' },
                ],
              },
            }
          : {}),
        design: {
          ...structuredClone(template.design),
          routeDecision: route,
          lesson: specialist
            ? 'These explicitly marked specialists have dangerous facing or burst phases. Read their warning, approach the exposed side, or eliminate them by enclosure.'
            : guarded
              ? 'The guard warns before firing; its body and every humanoid target remain one-contact catches. Hunt points are optional.'
              : pair
                ? 'Matching pennants identify partners following paired routes. The survivor flees after the first catch.'
                : 'Caps follow patrol circuits; hoods seek distant refuges; scarves follow committed switchback routes.',
          counterplay: material
            ? 'Enclose lethal material from outside it. Keep both partner returns available.'
            : 'Read the ordinary keeper before leaving safe ground. Prefer interception over a long chase.',
          captureConsequence:
            team && chapterIndex === 2
              ? 'Both marked anchors and the exposed core are required. Humanoid catches remain optional.'
              : 'Territory capture remains the objective. Touch earns 100 Hunt points; enclosure earns 50 per accepted target.',
          memorableMoment: route,
          mastery: team
            ? 'Both pilots contribute a catch or a closure, with no knockdowns.'
            : 'Catch every optional target by contact and complete the capture objective without damage.',
          introduces: lesson === 0 ? ['humanoid-contact'] : [],
          practices: ['enemy-seeded-closure'],
          combines: team ? ['complementary-routes', 'humanoid-contact'] : ['humanoid-contact'],
          durationSeconds: [35, 180],
          difficulty: {
            band: 2 + chapterIndex,
            planning: 2 + Math.min(chapterIndex, 3),
            execution: 2 + Math.min(lesson, 3),
            threatDensity: guarded ? 3 : 2,
            timePressure: 0,
            mechanicLoad: guarded ? 3 : 2,
            coordination: team ? 2 + Math.min(chapterIndex, 3) : 0,
          },
        },
      };
      source.maps.push(map);
      source.missions.push(mission);
      missionIds.push(id);
    }
    const campaignId = `pursuit-${team ? 'team-' : ''}${chapterId}`;
    source.campaigns.push({
      format: 'CampaignDesignV1',
      id: campaignId,
      revision: '1',
      name: chapterName,
      band: chapterIndex + 2,
      missionIds,
    });
  }
  source.packs = [
    {
      format: 'PackDesignV1',
      id: team ? 'journey-pursuit-team-campaigns' : 'journey-pursuit-solo-campaigns',
      revision: '1',
      name: source.name,
      campaignIds: source.campaigns.map((campaign) => campaign.id),
    },
  ];
  return structuredClone(compileContentProject(source).source);
}
