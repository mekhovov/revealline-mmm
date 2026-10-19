import { createOpeningCandidates } from './horizon-candidates.mjs';
import { compileContentProject } from './project.mjs';

export const PURSUIT_PILOT_ROUTE_ID = 'pursuit-pilots-v1';
export const PURSUIT_PILOT_PROFILE_KEY = 'journey-pursuit-pilots-v1';
const goal = (x, y) => ({ x: x + 0.5, y: y + 0.5 });
const prey = (id, behavior, x, y, waypoints, partnerId) => ({
  id,
  behavior,
  x: x + 0.5,
  y: y + 0.5,
  waypoints: waypoints.map(([gx, gy]) => goal(gx, gy)),
  ...(partnerId ? { partnerId } : {}),
});

/** Three individually authored prototypes. Structural admission is not a claim
 * of human play qualification. All prey remain ordinary one-contact catches. */
const stages = [
  {
    id: 'crossing-post',
    name: 'Crossing Post',
    team: false,
    walls: [
      { x: 34, y: 7, w: 3, h: 10 },
      { x: 34, y: 22, w: 3, h: 7 },
    ],
    foundations: [
      { x: 12, y: 15, w: 5, h: 5 },
      { x: 53, y: 15, w: 5, h: 5 },
    ],
    spawns: [{ id: 'home', x: 16.5, y: 0.5 }],
    targets: [
      prey('post-patrol', 'patroller', 22, 8, [
        [30, 8],
        [30, 24],
        [22, 24],
        [22, 8],
      ]),
      prey('yard-courier', 'courier', 44, 12, [
        [45, 7],
        [56, 12],
        [44, 26],
      ]),
    ],
    route:
      'Use either side island as a return. Intercept the patrol beside the central gap, or intercept the optional courier between delivery stops.',
    lesson:
      'The cap marks a circuit patroller; the parcel marks an optional courier. Both disappear on one touch. Capture remains the only required objective.',
    mastery:
      'Catch both targets by contact while keeping the ordinary keeper away from your exposed line.',
  },
  {
    id: 'pincer-yard',
    name: 'Pincer Yard',
    team: true,
    walls: [{ x: 34, y: 11, w: 3, h: 14 }],
    foundations: [
      { x: 16, y: 15, w: 5, h: 5 },
      { x: 50, y: 15, w: 5, h: 5 },
    ],
    spawns: [
      { id: 'home', x: 0.5, y: 17.5 },
      { id: 'partner', x: 71.5, y: 17.5 },
    ],
    targets: [
      prey('west-refuge', 'refuge', 23, 8, [
        [23, 8],
        [26, 26],
        [9, 24],
      ]),
      prey('east-switchback', 'switchback', 44, 25, [
        [43, 8],
        [54, 25],
        [30, 28],
      ]),
    ],
    route:
      'Approach from opposite rails. One pilot closes an escape around the divider while the partner intercepts; trade sides through the permanent upper and lower bypasses.',
    lesson:
      'Both pilots share Hunt points. Refuge seekers choose a distant goal; switchbacks commit to their next route. Neither body damages a pilot.',
    mastery: 'Each pilot contributes a contact catch and a safe territory closure.',
  },
  {
    id: 'relay-rendezvous',
    name: 'Relay Rendezvous',
    team: true,
    walls: [
      { x: 28, y: 8, w: 2, h: 8 },
      { x: 42, y: 20, w: 2, h: 8 },
    ],
    foundations: [
      { x: 16, y: 8, w: 5, h: 5 },
      { x: 50, y: 23, w: 5, h: 5 },
    ],
    spawns: [
      { id: 'home', x: 24.5, y: 0.5 },
      { id: 'partner', x: 47.5, y: 35.5 },
    ],
    targets: [
      prey(
        'rendezvous-west',
        'pair',
        24,
        17,
        [
          [32, 17],
          [42, 12],
          [24, 17],
        ],
        'rendezvous-east',
      ),
      prey(
        'rendezvous-east',
        'pair',
        48,
        17,
        [
          [34, 17],
          [44, 12],
          [48, 17],
        ],
        'rendezvous-west',
      ),
    ],
    route:
      'Capture the two marked anchors from opposite island approaches, then enclose the exposed core. Intercept the optional pair at their meeting corridor.',
    lesson:
      'The matching pennants identify a rendezvous pair. The survivor flees after its partner is caught. Capture both anchors to lower the core shield, then capture the exposed core.',
    mastery:
      'Capture one anchor each, then split the two contact catches and capture the core without a knockdown.',
  },
];

export function createPursuitPilotCandidates({ team = false } = {}) {
  const opening = createOpeningCandidates({ artwork: false }),
    template = opening.missions[0];
  const selected = stages.filter((stage) => stage.team === team);
  const campaignId = team ? 'pursuit-team-pilots' : 'pursuit-solo-pilot',
    packId = team ? 'journey-pursuit-team' : 'journey-pursuit-solo';
  const source = {
    ...opening,
    id: team ? 'pursuit-team-pilots-project' : 'pursuit-solo-pilots-project',
    revision: 'pursuit-pilots-2',
    name: team ? 'Pursuit partners · prototypes' : 'Pursuit routes · prototype',
    maps: [],
    missions: [],
    campaigns: [],
    packs: [],
  };
  for (const stage of selected) {
    const map = {
      format: 'MapDesignV1',
      id: `${stage.id}-map`,
      revision: '1',
      name: stage.name,
      width: 72,
      height: 36,
      walls: stage.walls,
      foundations: stage.foundations,
      terrain: [],
      spawns: stage.spawns,
    };
    source.maps.push(map);
    source.missions.push({
      ...structuredClone(template),
      format: 'MissionDesignV5',
      id: stage.id,
      revision: 'pursuit-2',
      name: stage.name,
      map: { id: map.id, revision: map.revision },
      modes: team ? ['team'] : ['solo', 'versus'],
      ...(team
        ? {
            team:
              stage.id === 'relay-rendezvous'
                ? {
                    format: 'TeamMissionV9',
                    spawnIds: ['home', 'partner'],
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
                  }
                : { format: 'TeamMissionV1', spawnIds: ['home', 'partner'] },
          }
        : {}),
      coverage: 0.55,
      pursuit: { version: 'mission-pursuit.v1', actors: stage.targets },
      actors: [
        {
          id: 'keeper',
          role: 'field-keeper',
          tier: 'measured',
          x: 60.5,
          y: 29.5,
          heading: [-1, 1],
        },
      ],
      design: {
        ...structuredClone(template.design),
        routeDecision: stage.route,
        lesson: stage.lesson,
        counterplay:
          'Choose a short return before pursuing. The round keeper still threatens the pilot and exposed line.',
        captureConsequence:
          stage.id === 'relay-rendezvous'
            ? 'Both anchors and the exposed core are required. Humanoid catches remain optional and do not replace the objectives.'
            : 'Capturing a target removes it once for 50 Hunt points; contact earns 100. Neither changes the territory objective.',
        memorableMoment: stage.mastery,
        mastery: stage.mastery,
        introduces: ['humanoid-contact'],
        practices: ['enemy-seeded-closure'],
        combines: team ? ['complementary-routes'] : [],
        durationSeconds: [30, 150],
        difficulty: {
          band: 2,
          planning: 2,
          execution: 2,
          threatDensity: 2,
          timePressure: 0,
          mechanicLoad: 2,
          coordination: team ? 2 : 0,
        },
      },
    });
  }
  source.campaigns = [
    {
      format: 'CampaignDesignV1',
      id: campaignId,
      revision: '1',
      name: source.name,
      band: 2,
      missionIds: source.missions.map((mission) => mission.id),
    },
  ];
  source.packs = [
    {
      format: 'PackDesignV1',
      id: packId,
      revision: '1',
      name: source.name,
      campaignIds: [campaignId],
    },
  ];
  return structuredClone(compileContentProject(source).source);
}
