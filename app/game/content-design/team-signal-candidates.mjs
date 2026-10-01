import { createTeamOpeningCandidates } from './team-candidates.mjs';
import { SIGNAL_TEAM_ART_CANDIDATES } from './signal-art.mjs';

/** Purpose-built cooperative greybox, not an automatic Solo adaptation.
 * Optional artwork remains a candidate; geometry-only Team export does not
 * automatically carry the picture into gameplay or grant visual approval. */
export function createTeamSignalCandidates({ artwork = false, campaignTheme = artwork } = {}) {
  const source = createTeamOpeningCandidates();
  source.id = 'journey-team-signal';
  source.name = 'Signal partners · greybox';
  source.revision = campaignTheme ? 'greybox-2' : 'greybox-1';
  if (artwork) source.assets = structuredClone(SIGNAL_TEAM_ART_CANDIDATES);
  const map = source.maps[0];
  Object.assign(map, {
    id: 'shared-detour-map',
    revision: 'greybox-1',
    name: 'Spine and refuge',
    foundations: [
      { x: 12, y: 10, w: 5, h: 18 },
      { x: 51, y: 15, w: 9, h: 5 },
    ],
    spawns: [
      { id: 'west', x: 14.5, y: 18.5 },
      { id: 'east', x: 55.5, y: 17.5 },
    ],
    terrain: [
      { id: 'soft-approach', kind: 'slow', x: 22, y: 11, w: 9, h: 15 },
      { id: 'marked-crossing', kind: 'lethal', x: 43, y: 10, w: 5, h: 16 },
    ],
  });
  const mission = source.missions[0];
  Object.assign(mission, {
    id: 'shared-detour',
    revision: campaignTheme ? 'greybox-2' : 'greybox-1',
    name: 'Shared detour',
    presentation: {
      themeId: campaignTheme ? 'signal-gardens' : 'horizon',
      backgroundAssetId: artwork ? SIGNAL_TEAM_ART_CANDIDATES[0].id : null,
    },
    map: { id: map.id, revision: map.revision },
    team: { format: 'TeamMissionV2', spawnIds: ['west', 'east'] },
    coverage: 0.7,
    actors: [
      {
        id: 'north-keeper',
        role: 'field-keeper',
        tier: 'measured',
        x: 35.5,
        y: 4.5,
        heading: [1, 0],
      },
      {
        id: 'south-keeper',
        role: 'field-keeper',
        tier: 'measured',
        x: 35.5,
        y: 31.5,
        heading: [-1, 0],
      },
    ],
    design: {
      routeDecision:
        'Split the outer bypasses to enclose both material beds, or first link a shared return through the slow approach?',
      lesson:
        'A partner can neutralize material for both craft; the lethal bed must be enclosed before either craft crosses it.',
      counterplay:
        'The west spine offers several returns; the east refuge has clear upper and lower bypasses. Watch both keepers before a long vertical cut.',
      captureConsequence:
        'Opposite captures can build a shared central corridor. A line-only closure still supplies a return route while occupied regions stay unclaimed.',
      introduces: ['team-terrain'],
      practices: ['foundations', 'enemy-retained-regions', 'slow-field', 'lethal-field'],
      combines: ['complementary-routes', 'material-neutralization'],
      memorableMoment:
        'One partner opens the marked crossing while the other turns a slow approach into ordinary shared ground.',
      mastery: 'Neutralize both material beds with a closure from each craft and no knockdowns.',
      durationSeconds: [65, 145],
      difficulty: {
        band: 3,
        planning: 3,
        execution: 3,
        threatDensity: 2,
        timePressure: 0,
        mechanicLoad: 3,
        coordination: 3,
      },
    },
  });
  source.campaigns = [
    {
      format: 'CampaignDesignV1',
      id: 'signal-partners',
      revision: 'greybox-1',
      name: 'Signal partners',
      band: 3,
      missionIds: [mission.id],
    },
  ];
  source.packs = [
    {
      format: 'PackDesignV1',
      id: source.id,
      revision: 'greybox-1',
      name: source.name,
      campaignIds: ['signal-partners'],
    },
  ];
  return source;
}
