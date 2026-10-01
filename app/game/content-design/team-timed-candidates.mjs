import { compileContentProject } from './project.mjs';
import { PRESSURE_DIFFICULTY_CATALOG } from './catalogs.mjs';
import { TIMED_BONUS_TRAIL_VERSION } from '../core/timed-bonuses.mjs';

const keeper = (id, x, y, heading) => ({
  id,
  role: 'field-keeper',
  tier: 'standard',
  x,
  y,
  heading,
});
const rover = (id, x, y, heading) => ({
  id,
  role: 'reclaimed-roamer',
  tier: 'measured',
  x,
  y,
  heading,
});
const window = (id, kind, anchors, initialDelayTicks = 240) => ({
  id,
  kind,
  anchors: anchors.map(([x, y]) => ({ x, y })),
  initialDelayTicks,
  announcementTicks: 120,
  availableTicks: 1200,
  cooldownTicks: 960,
  maxAppearances: 3,
  maxCollections: 1,
});

/** Original shared-board optional-route studies, not Solo conversions, automatic
 * replacements, published missions or human balance evidence. */
export function createTeamTimedCandidates() {
  const layouts = [
    {
      id: 'window-exchange',
      name: 'Window exchange',
      band: 4,
      walls: [
        { x: 35, y: 1, w: 2, h: 34 },
        { x: 23, y: 10, w: 12, h: 2 },
        { x: 37, y: 24, w: 12, h: 2 },
      ],
      terrain: [],
      foundations: [
        { x: 12, y: 14, w: 5, h: 8 },
        { x: 55, y: 14, w: 5, h: 8 },
      ],
      spawns: [
        [14.5, 17.5],
        [57.5, 17.5],
      ],
      actors: [
        keeper('west-upper', 26.5, 7.5, [-1, 1]),
        keeper('west-lower', 9.5, 28.5, [1, -1]),
        keeper('east-upper', 62.5, 7.5, [-1, 1]),
        keeper('east-lower', 45.5, 28.5, [1, -1]),
      ],
      schedules: [
        window('exchange-slow', 'enemy-slow', [
          [8.5, 8.5],
          [63.5, 27.5],
        ]),
      ],
      coverage: 0.74,
      routeDecision:
        'Spend a short detour on the shared slow window while your partner cuts the opposite chamber, or bank both islands first?',
      lesson:
        'A pickup collected in one chamber can help the other pilot, but neither chamber alone supplies the quota.',
      counterplay:
        'Watch both keepers before choosing a side to bank. The divider has opposite-facing shelves: go around their tips and use either end of the tall islands for a return. Walls are never landings.',
      captureConsequence:
        'Each occupied chamber retains independently; a capture cannot collect the shared pickup. Keep making useful cuts when a window is missed.',
      memorableMoment:
        'One pilot touches the slow symbol while the partner completes a long enclosure on the far side of the divider.',
      mastery:
        'Collect the shared slow while your partner is cutting, then clear with a return closure from each pilot and no knockdowns.',
      introduces: ['team-timed-pickups'],
      combines: ['shared-enemy-effects', 'independent-chambers'],
      themeId: 'border-bloom',
    },
    {
      id: 'coolant-crossing',
      name: 'Coolant crossing',
      band: 5,
      walls: [
        { x: 25, y: 8, w: 2, h: 16 },
        { x: 45, y: 12, w: 2, h: 16 },
      ],
      terrain: [
        { id: 'west-bed', kind: 'slow', x: 18, y: 9, w: 5, h: 15 },
        { id: 'east-bed', kind: 'slow', x: 49, y: 12, w: 5, h: 15 },
        { id: 'hot-sump', kind: 'lethal', x: 33, y: 25, w: 6, h: 3 },
      ],
      foundations: [
        { x: 8, y: 15, w: 8, h: 5 },
        { x: 56, y: 15, w: 8, h: 5 },
        { x: 33, y: 15, w: 6, h: 5 },
      ],
      spawns: [
        [11.5, 17.5],
        [60.5, 17.5],
      ],
      actors: [
        keeper('north-keeper', 35.5, 5.5, [1, 0]),
        keeper('west-keeper', 20.5, 29.5, [0, -1]),
        keeper('east-keeper', 51.5, 6.5, [0, 1]),
      ],
      schedules: [
        window(
          'coolant-freeze',
          'enemy-freeze',
          [
            [17.5, 6.5],
            [54.5, 29.5],
          ],
          360,
        ),
      ],
      coverage: 0.76,
      routeDecision:
        'Take a peripheral freeze window while the partner approaches the centre, or neutralize a slow bed before either makes the crossing?',
      lesson:
        'Shared freeze opens an enemy timing window, not permission to enter lethal field or cross your own unfinished line.',
      counterplay:
        'Go around the staggered wall tips. Enclose the sump from outside; use the central island as a return rather than overextending through both slow beds.',
      captureConsequence:
        'A neutralized bed gives both pilots a full-speed approach. The three keepers preserve contested pockets around the centre.',
      memorableMoment:
        'A peripheral pickup holds the keepers still while a partner banks onto the centre platform.',
      mastery:
        'Collect freeze with the partner cutting, neutralize all three beds, and clear with returns from both pilots and no knockdowns.',
      introduces: [],
      combines: ['shared-enemy-effects', 'material-neutralization', 'shared-return-network'],
      themeId: 'signal-gardens',
    },
    {
      id: 'depot-dash',
      name: 'Depot dash',
      band: 6,
      walls: [
        { x: 35, y: 7, w: 2, h: 22 },
        { x: 23, y: 12, w: 2, h: 10 },
        { x: 47, y: 14, w: 2, h: 10 },
        { x: 25, y: 12, w: 5, h: 2 },
        { x: 42, y: 22, w: 5, h: 2 },
      ],
      terrain: [],
      foundations: [
        { x: 9, y: 14, w: 6, h: 8 },
        { x: 57, y: 14, w: 6, h: 8 },
        { x: 30, y: 3, w: 12, h: 3 },
        { x: 30, y: 30, w: 12, h: 3 },
      ],
      spawns: [
        [11.5, 17.5],
        [60.5, 17.5],
      ],
      actors: [
        keeper('north-keeper', 28.5, 8.5, [1, 1]),
        keeper('south-keeper', 43.5, 27.5, [-1, -1]),
        rover('west-rover', 18.5, 10.5, [0, 1]),
        rover('east-rover', 53.5, 25.5, [0, -1]),
      ],
      schedules: [
        window(
          'depot-speed',
          'player-speed',
          [
            [19.5, 6.5],
            [52.5, 29.5],
          ],
          240,
        ),
        window(
          'depot-reserve',
          'extra-life',
          [
            [19.5, 28.5],
            [52.5, 7.5],
          ],
          840,
        ),
      ],
      coverage: 0.78,
      routeDecision:
        'Use a speed detour for an outside return while the partner shapes an escape from a waking rover, or keep normal handling and connect the bays first?',
      lesson:
        'Speed belongs to its collector; enemy pressure and reclaimed return routes remain a shared responsibility.',
      counterplay:
        'The optional speed anchors sit on broad straight approaches. Choose the upper or lower platform before waking a rover; the late reserve is expendable, never a completion key.',
      captureConsequence:
        'An enclosure can activate a rover on newly reclaimed ground. Preserve more than one exit instead of treating a large fill as permanent safety.',
      memorableMoment:
        'The fast pilot establishes a long outside connection while the partner keeps clear of the first tracked body waking inside the depot.',
      mastery:
        'Take a timed pickup while your partner is cutting, activate both roamers, and clear with returns from both pilots and no knockdowns.',
      introduces: [],
      combines: ['collector-speed', 'changing-ground', 'shared-return-network'],
      themeId: 'rover-yard',
    },
  ];
  const maps = layouts.map((l) => ({
    format: 'MapDesignV1',
    id: `${l.id}-map`,
    revision: 'greybox-1',
    name: l.name,
    width: 72,
    height: 36,
    walls: l.walls,
    terrain: l.terrain,
    foundations: l.foundations,
    spawns: l.spawns.map(([x, y], i) => ({ id: i ? 'east' : 'west', x, y })),
  }));
  const missions = layouts.map((l) => ({
    format: 'MissionDesignV1',
    id: l.id,
    revision: 'greybox-1',
    name: l.name,
    map: { id: `${l.id}-map`, revision: 'greybox-1' },
    spawnId: 'west',
    modes: ['team'],
    team: { format: 'TeamMissionV4', spawnIds: ['west', 'east'] },
    actors: l.actors,
    objectives: [],
    bonuses: [],
    coverage: l.coverage,
    timeLimitSeconds: 0,
    timedBonuses: { version: TIMED_BONUS_TRAIL_VERSION, schedules: l.schedules },
    design: {
      routeDecision: l.routeDecision,
      lesson: l.lesson,
      counterplay: l.counterplay,
      captureConsequence: l.captureConsequence,
      introduces: l.introduces,
      practices: ['closure', 'enemy-retained-regions', 'team-foundations'],
      combines: l.combines,
      memorableMoment: l.memorableMoment,
      mastery: l.mastery,
      durationSeconds: [60, 150],
      difficulty: {
        band: l.band,
        planning: l.band,
        execution: l.band - 1,
        threatDensity: l.actors.length,
        timePressure: 0,
        mechanicLoad: l.id === 'window-exchange' ? 3 : 4,
        coordination: l.band - 1,
      },
    },
    presentation: { themeId: l.themeId, backgroundAssetId: null },
  }));
  const source = {
    format: 'ContentProjectV1',
    id: 'journey-team-timed-review',
    revision: 'greybox-1',
    name: 'Shared windows · unvalidated Team studies',
    policyId: 'journey-arcade-v2',
    actorCatalogId: 'journey-actors-v2',
    difficultyCatalogId: PRESSURE_DIFFICULTY_CATALOG.id,
    maps,
    missions,
    campaigns: layouts.map((l) => ({
      format: 'CampaignDesignV1',
      id: `${l.id}-study`,
      revision: 'greybox-1',
      name: l.name,
      band: l.band,
      missionIds: [l.id],
    })),
    packs: [
      {
        format: 'PackDesignV1',
        id: 'shared-windows',
        revision: 'greybox-1',
        name: 'Shared windows · greybox',
        campaignIds: layouts.map((l) => `${l.id}-study`),
      },
    ],
  };
  return structuredClone(compileContentProject(source).source);
}
