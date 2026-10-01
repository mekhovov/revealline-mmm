/** Original two-seat greybox. No artwork or human qualification is implied. */
export function createTeamOpeningCandidates() {
  return {
    format: 'ContentProjectV1',
    id: 'journey-team-opening',
    revision: 'draft-1',
    name: 'Horizon partners',
    policyId: 'journey-v1',
    actorCatalogId: 'journey-actors-v1',
    difficultyCatalogId: 'journey-difficulty-v1',
    maps: [
      {
        format: 'MapDesignV1',
        id: 'twin-landings-map',
        revision: '1',
        name: 'Two islands, one field',
        width: 72,
        height: 36,
        walls: [],
        terrain: [],
        foundations: [
          { x: 18, y: 15, w: 5, h: 5 },
          { x: 49, y: 15, w: 5, h: 5 },
        ],
        spawns: [
          { id: 'west', x: 20.5, y: 17.5 },
          { id: 'east', x: 51.5, y: 17.5 },
        ],
      },
    ],
    missions: [
      {
        format: 'MissionDesignV1',
        id: 'twin-landings',
        revision: '1',
        name: 'Twin landings',
        map: { id: 'twin-landings-map', revision: '1' },
        spawnId: 'west',
        modes: ['team'],
        team: { format: 'TeamMissionV1', spawnIds: ['west', 'east'] },
        actors: [
          {
            id: 'north-keeper',
            role: 'field-keeper',
            tier: 'measured',
            x: 35.5,
            y: 8.5,
            heading: [1, 0],
          },
          {
            id: 'south-keeper',
            role: 'field-keeper',
            tier: 'measured',
            x: 35.5,
            y: 27.5,
            heading: [-1, 0],
          },
        ],
        objectives: [],
        bonuses: [],
        coverage: 0.6,
        timeLimitSeconds: 0,
        design: {
          routeDecision: 'Connect the islands together, or establish opposite return routes first?',
          lesson: 'Both craft can build a shared route network from separate foundations.',
          counterplay:
            'Watch the two keepers; cover different approaches and close onto reclaimed ground or meet both moving heads.',
          captureConsequence:
            'A bridge may secure only its line while keepers occupy both sides. The new link still gives both craft a shorter return.',
          introduces: ['team-foundations'],
          practices: ['closure', 'enemy-retained-regions'],
          combines: ['foundations', 'complementary-routes'],
          memorableMoment: 'Two isolated starting islands become a shared launch corridor.',
          mastery: 'Both craft contribute a closure before the shared clear, without a knockdown.',
          durationSeconds: [45, 120],
          difficulty: {
            band: 2,
            planning: 2,
            execution: 2,
            threatDensity: 2,
            timePressure: 0,
            mechanicLoad: 2,
            coordination: 2,
          },
        },
        presentation: { themeId: 'horizon', backgroundAssetId: null },
      },
    ],
    campaigns: [
      {
        format: 'CampaignDesignV1',
        id: 'horizon-partners',
        revision: '1',
        name: 'Horizon partners',
        band: 2,
        missionIds: ['twin-landings'],
      },
    ],
    packs: [
      {
        format: 'PackDesignV1',
        id: 'journey-team-opening',
        revision: '1',
        name: 'Horizon partners',
        campaignIds: ['horizon-partners'],
      },
    ],
  };
}
