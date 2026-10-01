import { JOURNEY_POLICY } from './catalogs.mjs';
/** An original greybox, not a released or playtest-qualified Journey mission. */
export function createStarterProject(id = 'my-journey') {
  return {
    format: 'ContentProjectV1',
    id,
    revision: 'draft-1',
    name: 'My Journey',
    policyId: JOURNEY_POLICY.id,
    actorCatalogId: 'journey-actors-v1',
    difficultyCatalogId: 'journey-difficulty-v1',
    maps: [
      {
        format: 'MapDesignV1',
        id: 'island-map',
        revision: '1',
        name: 'An island within reach',
        width: 72,
        height: 36,
        walls: [],
        foundations: [{ x: 30, y: 15, w: 5, h: 5 }],
        terrain: [],
        spawns: [{ id: 'home', x: 32.5, y: 0.5 }],
      },
    ],
    missions: [
      {
        format: 'MissionDesignV1',
        id: 'nearby-shore',
        revision: '1',
        name: 'Nearby shore',
        map: { id: 'island-map', revision: '1' },
        spawnId: 'home',
        modes: ['solo', 'versus'],
        actors: [
          {
            id: 'keeper',
            role: 'field-keeper',
            tier: 'measured',
            x: 60.5,
            y: 18.5,
            heading: [1, 1],
          },
        ],
        objectives: [],
        bonuses: [],
        coverage: 0.6,
        timeLimitSeconds: 0,
        design: {
          routeDecision: 'Return to the island or continue to the far boundary?',
          lesson: 'A foundation can close a cut inside the board.',
          counterplay: 'Watch the keeper before choosing a route.',
          captureConsequence:
            'Connecting the island creates a shorter return route, but may secure only the line.',
          introduces: ['foundations'],
          practices: ['closure'],
          combines: [],
          memorableMoment: 'The first return lands inside the board.',
          mastery: 'Connect the island in one cut.',
          durationSeconds: [45, 90],
          difficulty: {
            band: 1,
            planning: 1,
            execution: 1,
            threatDensity: 1,
            timePressure: 0,
            mechanicLoad: 1,
            coordination: 0,
          },
        },
        presentation: { themeId: 'horizon', backgroundAssetId: null },
      },
    ],
    campaigns: [
      {
        format: 'CampaignDesignV1',
        id: 'horizon-school',
        revision: '1',
        name: 'Horizon School',
        band: 1,
        missionIds: ['nearby-shore'],
      },
    ],
    packs: [
      {
        format: 'PackDesignV1',
        id: 'opening',
        revision: '1',
        name: 'Opening',
        campaignIds: ['horizon-school'],
      },
    ],
  };
}
