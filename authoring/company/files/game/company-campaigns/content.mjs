import { createStarterProject } from '../content-design/starter.mjs';
import {
  freezeDesign,
  TRAIL_IMPACT_JOURNEY_POLICY,
  CURRENT_PRESSURE_ACTOR_CATALOG,
  PRESSURE_DIFFICULTY_CATALOG,
} from '../content-design/catalogs.mjs';
import { COMPANY_CAMPAIGNS, COMPANY_MISSIONS } from './catalog.mjs';
import { authorCompanyProgression, companyChallengeStage } from './progression.mjs';
import { selectCurrentCompanyArtwork } from './artwork.mjs';

// Each tuple is an authored layout: permanent walls, interior return surfaces,
// slow field, and an opening spawn. Coordinates describe actual engine geometry.
// Shared visual districts do not share a map or simulation identity.
const layouts = [
  [[], [[30, 14, 8, 5]], [], [34, 0]],
  [
    [[34, 10, 3, 15]],
    [
      [14, 13, 9, 4],
      [48, 18, 8, 4],
    ],
    [],
    [18, 0],
  ],
  [
    [
      [15, 8, 13, 2],
      [40, 24, 14, 2],
    ],
    [
      [31, 15, 8, 5],
      [9, 23, 7, 3],
    ],
    [],
    [35, 0],
  ],
  [
    [
      [14, 9, 19, 2],
      [45, 13, 2, 13],
    ],
    [
      [22, 19, 18, 3],
      [52, 7, 6, 4],
    ],
    [],
    [28, 0],
  ],
  [
    [
      [19, 7, 3, 10],
      [46, 20, 3, 9],
    ],
    [
      [30, 10, 9, 4],
      [29, 23, 9, 4],
    ],
    [[24, 16, 17, 3]],
    [35, 0],
  ],
  [
    [
      [13, 13, 9, 2],
      [48, 19, 9, 2],
    ],
    [
      [31, 13, 9, 8],
      [10, 25, 8, 3],
      [52, 6, 8, 3],
    ],
    [],
    [35, 0],
  ],
  [
    [[25, 9, 2, 8]],
    [
      [12, 16, 12, 4],
      [40, 15, 12, 4],
    ],
    [],
    [17, 0],
  ],
  [
    [
      [32, 8, 3, 7],
      [32, 22, 3, 7],
    ],
    [
      [17, 13, 8, 5],
      [43, 18, 8, 5],
    ],
    [],
    [20, 0],
  ],
  [
    [
      [22, 10, 3, 13],
      [47, 12, 3, 13],
    ],
    [
      [11, 9, 7, 4],
      [31, 15, 10, 5],
      [54, 23, 7, 4],
    ],
    [],
    [35, 0],
  ],
  [
    [
      [13, 9, 16, 2],
      [42, 25, 16, 2],
    ],
    [
      [31, 11, 6, 5],
      [33, 22, 6, 5],
    ],
    [],
    [34, 0],
  ],
  [
    [
      [19, 15, 8, 2],
      [45, 15, 8, 2],
    ],
    [
      [31, 7, 9, 4],
      [31, 24, 9, 4],
      [8, 23, 7, 3],
    ],
    [[30, 14, 11, 6]],
    [35, 0],
  ],
  [
    [
      [24, 9, 3, 7],
      [45, 21, 3, 7],
    ],
    [
      [10, 14, 8, 5],
      [30, 14, 11, 5],
      [54, 14, 8, 5],
    ],
    [],
    [35, 0],
  ],
  [[[42, 13, 2, 10]], [[17, 12, 10, 4]], [], [22, 0]],
  [
    [
      [17, 10, 2, 15],
      [49, 10, 2, 15],
    ],
    [
      [29, 10, 12, 4],
      [29, 23, 12, 4],
    ],
    [],
    [35, 0],
  ],
  [
    [
      [20, 8, 10, 2],
      [43, 25, 10, 2],
    ],
    [
      [30, 14, 15, 4],
      [11, 22, 7, 4],
    ],
    [],
    [35, 0],
  ],
  [
    [
      [22, 16, 3, 10],
      [48, 8, 3, 10],
    ],
    [
      [11, 11, 8, 4],
      [31, 17, 8, 4],
      [53, 22, 8, 4],
    ],
    [],
    [15, 0],
  ],
  [
    [
      [28, 8, 2, 10],
      [42, 19, 2, 10],
    ],
    [
      [13, 17, 10, 4],
      [49, 12, 10, 4],
    ],
    [[30, 23, 9, 3]],
    [18, 0],
  ],
  [
    [
      [17, 16, 8, 2],
      [46, 16, 8, 2],
    ],
    [
      [29, 8, 12, 4],
      [29, 24, 12, 4],
      [32, 16, 6, 3],
    ],
    [],
    [35, 0],
  ],
  [
    [[31, 18, 11, 2]],
    [
      [13, 11, 10, 5],
      [48, 20, 10, 5],
    ],
    [],
    [18, 0],
  ],
  [
    [
      [17, 8, 10, 2],
      [43, 8, 10, 2],
    ],
    [
      [30, 15, 10, 5],
      [14, 25, 9, 3],
    ],
    [],
    [35, 0],
  ],
  [
    [
      [24, 12, 3, 12],
      [44, 12, 3, 12],
    ],
    [
      [12, 17, 7, 4],
      [31, 10, 8, 4],
      [53, 17, 7, 4],
    ],
    [],
    [35, 0],
  ],
  [
    [
      [12, 13, 17, 2],
      [44, 21, 17, 2],
    ],
    [
      [32, 10, 8, 4],
      [32, 23, 8, 4],
    ],
    [],
    [35, 0],
  ],
  [
    [
      [21, 7, 3, 13],
      [46, 18, 3, 13],
    ],
    [
      [12, 24, 8, 4],
      [31, 14, 9, 6],
      [53, 8, 8, 4],
    ],
    [[27, 22, 15, 3]],
    [35, 0],
  ],
  [
    [
      [15, 11, 11, 2],
      [45, 23, 11, 2],
      [35, 15, 2, 6],
    ],
    [
      [13, 23, 9, 4],
      [47, 8, 9, 4],
    ],
    [],
    [18, 0],
  ],
  [
    [[30, 10, 2, 14]],
    [
      [12, 14, 10, 4],
      [44, 20, 10, 4],
    ],
    [],
    [16, 0],
  ],
  [
    [
      [17, 12, 12, 2],
      [43, 22, 12, 2],
    ],
    [
      [32, 8, 7, 5],
      [32, 23, 7, 5],
    ],
    [],
    [35, 0],
  ],
  [
    [
      [24, 8, 2, 8],
      [47, 20, 2, 8],
    ],
    [
      [10, 19, 9, 4],
      [31, 13, 9, 4],
      [54, 13, 8, 4],
    ],
    [],
    [35, 0],
  ],
  [
    [
      [17, 9, 3, 14],
      [51, 12, 3, 14],
    ],
    [
      [30, 8, 11, 4],
      [30, 24, 11, 4],
      [32, 16, 7, 3],
    ],
    [],
    [35, 0],
  ],
  [
    [
      [12, 12, 14, 2],
      [45, 12, 14, 2],
      [32, 24, 7, 2],
    ],
    [
      [30, 14, 11, 5],
      [13, 24, 7, 4],
    ],
    [[28, 7, 15, 3]],
    [35, 0],
  ],
  [
    [
      [20, 10, 3, 8],
      [48, 18, 3, 8],
    ],
    [
      [10, 23, 9, 4],
      [31, 12, 10, 4],
      [31, 23, 10, 4],
      [54, 7, 7, 4],
    ],
    [],
    [35, 0],
  ],
];

// Netherlands chapter layouts: bench rooms, component shelves, paired community
// rooms, quay docks, poster pavilions and connected canal courts. These are
// authored geometry, independent of imagery or simulation seed.

const rectangle = ([x, y, w, h]) => ({ x, y, w, h });
const inRect = (x, y, rectangles) =>
  rectangles.some((r) => x >= r.x && x < r.x + r.w && y >= r.y && y < r.y + r.h);
function fieldPoint(map, desired) {
  // Fixed authoring placement, independent of runtime seed. Keep objectives and
  // moving actors off permanent walls/returns; never infer geometry from art.
  for (let distance = 0; distance < 72; distance++)
    for (let y = 1; y < 35; y++)
      for (let x = 1; x < 71; x++)
        if (
          Math.abs(x - desired[0]) + Math.abs(y - desired[1]) === distance &&
          !inRect(x, y, map.walls) &&
          !inRect(x, y, map.foundations)
        )
          return { x: x + 0.5, y: y + 0.5 };
  throw new Error('Company map has no field placement.');
}

/** Existing ContentProjectV1, selectable as a brand or one isolated campaign.
 * Artwork must be explicit AssetRevisionV1 records; there are no guessed pins. */
export function createCompanyProject({
  brandId = 'coupa',
  campaignId = null,
  artwork = false,
} = {}) {
  const campaigns = COMPANY_CAMPAIGNS.filter(
    (c) => c.brandId === brandId && (!campaignId || c.id === campaignId),
  );
  if (!campaigns.length) throw new Error('Unknown company campaign selection.');
  if (artwork !== false && !Array.isArray(artwork))
    throw new Error('Supply explicit company artwork asset revisions.');
  const selected = COMPANY_MISSIONS.filter((m) => campaigns.some((c) => c.id === m.campaignId));
  const project = createStarterProject(campaignId ?? `${brandId}-company-journeys`);
  {
    project.policyId = TRAIL_IMPACT_JOURNEY_POLICY.id;
    project.actorCatalogId = CURRENT_PRESSURE_ACTOR_CATALOG.id;
    project.difficultyCatalogId = PRESSURE_DIFFICULTY_CATALOG.id;
  }
  project.revision = String(Math.max(...campaigns.map((campaign) => Number(campaign.revision))));
  project.name = campaignId ? campaigns[0].name : `${'Coupa'} journeys`;
  project.maps = [];
  project.assets = artwork
    ? structuredClone(
        selectCurrentCompanyArtwork(artwork).filter((asset) =>
          selected.some((m) => asset.id === `${m.id}-picture`),
        ),
      )
    : [];
  project.missions = selected.map((entry) => {
    const index = COMPANY_MISSIONS.findIndex((m) => m.id === entry.id);
    const layout = layouts[index];
    const [walls, foundations, terrain, spawn] = layout;
    const map = {
      format: 'MapDesignV1',
      id: `${entry.id}-map`,
      revision: '1',
      name: entry.name,
      width: 72,
      height: 36,
      walls: walls.map(rectangle),
      foundations: foundations.map(rectangle),
      terrain: terrain.map((r, i) => ({ id: `slow-${i + 1}`, kind: 'slow', ...rectangle(r) })),
      spawns: [{ id: 'home', x: spawn[0] + 0.5, y: spawn[1] + 0.5 }],
    };
    project.maps.push(map);
    const late = entry.ordinal >= 4;
    const actors = [
      {
        id: 'paper-drifter',
        role: 'field-keeper',
        tier: 'measured',
        ...fieldPoint(map, [61, 28]),
        heading: [-1, -1],
      },
    ];
    if (entry.ordinal === 3 || entry.ordinal === 6)
      actors.push({
        id: 'second-drifter',
        role: 'field-keeper',
        tier: 'measured',
        ...fieldPoint(map, [12, 27]),
        heading: [1, -1],
      });
    if (late)
      actors.push({
        id: 'outer-backlog',
        role: 'perimeter-patrol',
        tier: 'measured',
        x: 71.5,
        y: 18.5,
        clockwise: true,
      });
    const objectivePoint = fieldPoint(map, [12 + (index % 3) * 3, 8]);
    const template = createStarterProject().missions[0];
    const mission = {
      ...template,
      id: entry.id,
      revision: '2',
      name: entry.name,
      map: { id: map.id, revision: map.revision },
      modes: ['solo'],
      actors,
      objectives: [{ id: 'connection', ...objectivePoint, required: true, hidden: false }],
      coverage: [0.48, 0.53, 0.56, 0.58, 0.6, 0.64][entry.ordinal - 1],
      bonuses: late
        ? [
            {
              id: 'steady-return',
              kind: 'extra-life',
              x: map.foundations[0].x + 0.5,
              y: map.foundations[0].y + 0.5,
            },
          ]
        : [],
      presentation: {
        themeId: `${entry.campaignId}-theme`,
        backgroundAssetId: project.assets.some((a) => a.id === `${entry.id}-picture`)
          ? `${entry.id}-picture`
          : null,
      },
      design: {
        ...template.design,
        routeDecision: entry.routeDecision,
        lesson: entry.brief,
        counterplay: late
          ? 'Use the interior returns to avoid the outer patrol; read the field drifters before leaving a safe surface.'
          : 'Watch the visible field drifters and shorten a risky cut by returning to an island.',
        captureConsequence:
          'A completed cut reveals the picture and can connect a workstation; it never grants a real-world approval or changes a business record.',
        introduces:
          entry.ordinal === 1 ? ['foundations'] : entry.ordinal === 4 ? ['perimeter-patrol'] : [],
        practices: ['closure', 'enemy-seeded-closure'],
        combines: late ? ['foundations', 'perimeter-patrol'] : [],
        memorableMoment: entry.scene,
        mastery:
          'Connect the objective and finish without losing a life; learning assignments remain separate from arcade score.',
        durationSeconds: [40, 180],
        difficulty: {
          band: late ? 2 : 1,
          planning: late ? 2 : 1,
          execution: late ? 2 : 1,
          threatDensity: actors.length,
          timePressure: 0,
          mechanicLoad: late ? 2 : 1,
          coordination: 0,
        },
      },
    };
    const campaignIndex = COMPANY_CAMPAIGNS.filter(
      (campaign) => campaign.brandId === brandId,
    ).findIndex((campaign) => campaign.id === entry.campaignId);
    return authorCompanyProgression(
      mission,
      map,
      companyChallengeStage(brandId, campaignIndex),
      entry.ordinal,
    );
  });
  project.campaigns = campaigns.map((c) => ({
    format: 'CampaignDesignV1',
    id: c.id,
    revision: c.revision,
    name: c.name,
    band: companyChallengeStage(
      brandId,
      COMPANY_CAMPAIGNS.filter((campaign) => campaign.brandId === brandId).findIndex(
        (campaign) => campaign.id === c.id,
      ),
    ).band,
    missionIds: [...c.missionIds],
  }));
  project.packs = campaigns.map((c) => ({
    format: 'PackDesignV1',
    id: `${c.id}-pack`,
    revision: c.revision,
    name: c.name,
    campaignIds: [c.id],
  }));
  return project;
}
export function createCompanyJourneyRoute(options = {}) {
  const source = createCompanyProject(options),
    id = options.campaignId ?? `${options.brandId ?? 'coupa'}-company-journeys`;
  return freezeDesign({
    id,
    label: source.name,
    sessionKey: `revealline.suspended.company.${id}.v1`,
    profileKey: `company-${id}-v1`,
    source,
    corePackIds: source.packs.map((p) => p.id),
    optionalCampaignIds: [],
    preserveOriginalThemes: true,
  });
}
