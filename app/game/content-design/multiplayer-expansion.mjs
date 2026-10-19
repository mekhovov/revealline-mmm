import { compileContentProject } from './project.mjs';
import {
  MULTIPLAYER_EXPANSION_CHAPTERS,
  MULTIPLAYER_EXPANSION_LAYOUTS,
} from './multiplayer-expansion-layouts.mjs';
import { HORIZON_ART_CANDIDATES } from './horizon-art.mjs';
import { SIGNAL_ILLUSTRATED_ART_CANDIDATES } from './signal-art.mjs';
import { NEON_ART_CANDIDATES } from './neon-art.mjs';
import { ROVER_ART_CANDIDATES } from './rover-art.mjs';
import { PHASE_ART_CANDIDATES } from './phase-art.mjs';
import { LIVEWIRE_ART_CANDIDATES } from './livewire-art.mjs';
import { RELAY_ART_CANDIDATES } from './relay-art.mjs';
import { CROSSWIND_ART_CANDIDATES } from './crosswind-art.mjs';
import { BORDER_ART_CANDIDATES } from './border-art.mjs';
import { FRACTURE_ART_CANDIDATES } from './fracture-art.mjs';
import { SENTINEL_ART_CANDIDATES } from './sentinel-art.mjs';
import { APEX_ART_CANDIDATES } from './apex-art.mjs';
import { SENTINEL_RECIPE } from './catalogs.mjs';

export const TEAM_EXPANSION_ROUTE = 'team-expedition-v1';
export const DUEL_EXPANSION_ROUTE = 'duel-expedition-v1';
const candidateCache = new Map();
const art = {
  horizon: HORIZON_ART_CANDIDATES,
  signal: SIGNAL_ILLUSTRATED_ART_CANDIDATES,
  neon: NEON_ART_CANDIDATES,
  rover: ROVER_ART_CANDIDATES,
  phase: PHASE_ART_CANDIDATES,
  livewire: LIVEWIRE_ART_CANDIDATES,
  relay: RELAY_ART_CANDIDATES,
  crosswind: CROSSWIND_ART_CANDIDATES,
  border: BORDER_ART_CANDIDATES,
  fracture: FRACTURE_ART_CANDIDATES,
  sentinel: SENTINEL_ART_CANDIDATES,
  apex: APEX_ART_CANDIDATES,
};
const rect = ([x, y, w, h]) => ({ x, y, w, h });
const themeIds = {
  horizon: 'horizon',
  signal: 'signal-gardens',
  neon: 'neon-contours',
  rover: 'rover-yard',
  phase: 'phaseworks',
  livewire: 'livewire-foundry',
  relay: 'relay-labyrinth',
  crosswind: 'crosswind-array',
  border: 'border-bloom',
  fracture: 'fractured-grid',
  sentinel: 'sentinel-crown',
  apex: 'apex-aurora',
};
const mechanicCopy = {
  phaseworks: [
    'An impact follows its original live cut. Close that cut, or use Interceptor Support near the travelling front.',
    'Keep a second return in reserve; a partner’s new bank can shorten your exposed trail.',
  ],
  livewire: [
    'A numbered pilot and dashed lane mark the locked warning. Close the original cut before the lane fires.',
    'Wait on permanent ground during a warning, or take a short return. Capturing a Team emitter disables its future warnings.',
  ],
  relay: [
    'Capture the numbered relay to turn its matching gate into a permanent shared landing. Every relay is required.',
    'Choose which new return is most useful before choosing which relay to capture first.',
  ],
  crosswind: [
    'Arrows make exposed movement faster with the arrow and slower against it; sideways movement is unchanged. They never push a stopped pilot.',
    'Read the far landing before departure. Capturing an arrow field removes its speed effect.',
  ],
  border: [
    'Perimeter patrols follow the outside rail. Permanent interior landings give you an alternative return.',
    'Watch the next corner and return behind the patrol, or connect an interior refuge before committing to the shore.',
  ],
  fracture: [
    'Erosion reopens reclaimed field; permanent foundations remain safe. Team sources mark one nearby edge tile before removing it.',
    'Build routes between permanent landings. Capturing a Team source stops its future erosion; pilot and recovery anchors are protected.',
  ],
  sentinel: [
    'Team targets open in numbered order and require separate captures. In Duel, capture the shield relays, then release the exposed sentinel core during its open phase.',
    'Prepare the next return while completing the current objective. Dashed crossed targets are still protected; a warning never requires a synchronized button press.',
  ],
  aurora: [
    'Combine the chapter’s visible mechanics. Numbered objectives and coverage are both required; ordinary foundations stay permanent.',
    'Choose the next useful return before committing. A new bridge, a neutralized arrow field or a captured hazard can simplify the partner’s next crossing.',
  ],
};

const duelMechanicCopy = {
  phaseworks: [
    'Travelling impacts follow a live cut. Close onto a prepared return before the impact catches you.',
    'Keep two possible returns and watch the keeper before choosing the longer enclosure.',
  ],
  livewire: [
    'A dashed warning marks the emitter’s locked lane. Close your cut before it fires or leave from another safe landing.',
    'Use the rest window for a longer crossing. Capturing an emitter removes that source of pressure.',
  ],
  relay: [
    'Capture each required relay to open its matching permanent bridge. Choose an order that shortens later cuts.',
    mechanicCopy.relay[1],
  ],
  fracture: [
    'Moving eroders reopen reclaimed field. Permanent foundations remain safe.',
    'Connect permanent landings and watch the eroder before relying on a newly captured return.',
  ],
  sentinel: [
    'Capture both shield relays in either order, then release the exposed sentinel core with a fresh cut during its open phase.',
    'Prepare the core approach before the last shield. If the open window closes, wait for the next readable attack cycle.',
  ],
  aurora: [
    mechanicCopy.aurora[0],
    'Plan the next return before committing. A bridge, cleared arrow band or captured hazard can simplify your final crossing.',
  ],
};

function teamEnvironment(row) {
  return {
    version: 'team-environment.v1',
    emitters: (row.emitters ?? []).map(([x, y, axis], i) => ({
      id: `lane-${i + 1}`,
      x,
      y,
      axis,
      warningTicks: 240,
      restTicks: 720 + i * 120,
    })),
    relays: (row.relays ?? []).map(([x, y, w, h, ox, oy], i) => ({
      id: `relay-${i + 1}`,
      gate: { x, y, w, h },
      objective: { x: ox, y: oy },
    })),
    currents: (row.currents ?? []).map(([direction, x, y, w, h], i) => ({
      id: `arrows-${i + 1}`,
      direction,
      x,
      y,
      w,
      h,
    })),
    patrols: (row.patrols ?? []).map(([offset, clockwise], i) => ({
      id: `patrol-${i + 1}`,
      offset,
      clockwise,
      speed: 1.8,
    })),
    erosion: (row.erosion ?? []).map(([x, y], i) => ({
      id: `erosion-${i + 1}`,
      x,
      y,
      radius: 10,
      warningTicks: 240,
      restTicks: 960 + i * 120,
    })),
    stages: (row.stages ?? []).map(([x, y], i) => ({ id: `stage-${i + 1}`, x, y })),
  };
}

function perimeterPoint(offset) {
  return offset < 71
    ? { x: offset + 0.5, y: 0.5 }
    : offset < 106
      ? { x: 71.5, y: offset - 71 + 0.5 }
      : offset < 177
        ? { x: 71.5 - (offset - 106), y: 35.5 }
        : { x: 0.5, y: 35.5 - (offset - 177) };
}

/** Separate authored sources for the two modes. Existing pictures are deliberately
 * reused and keep their original identity/review status. No asset approval is minted. */
export function createMultiplayerExpansionCandidates({ mode = 'team', chapterId } = {}) {
  if (!['team', 'versus'].includes(mode)) throw new TypeError('Choose Team or Duel.');
  const cacheKey = `${mode}:${chapterId ?? 'all'}`;
  if (candidateCache.has(cacheKey)) return structuredClone(candidateCache.get(cacheKey));
  const chapters = MULTIPLAYER_EXPANSION_CHAPTERS.filter((c) => !chapterId || c.id === chapterId);
  if (!chapters.length) throw new TypeError('Unknown multiplayer chapter.');
  const source = {
    format: 'ContentProjectV1',
    id: `${mode}-expedition${chapterId ? `-${chapterId}` : ''}`,
    revision: '1',
    name: mode === 'team' ? 'Team Expeditions' : 'Duel Expeditions',
    policyId: 'journey-trail-impact-v3',
    actorCatalogId: 'journey-actors-v9',
    difficultyCatalogId: 'journey-difficulty-v2',
    maps: [],
    missions: [],
    campaigns: [],
    packs: [],
    assets: [],
  };
  for (const chapter of chapters) {
    const rows = MULTIPLAYER_EXPANSION_LAYOUTS.filter(
      (row) => row.mode === mode && row.chapter === chapter.id,
    );
    if (!rows.length) continue;
    const campaignId = `${mode}-expedition-${chapter.id}`;
    for (const [index, row] of rows.entries()) {
      const instructions =
        mode === 'versus'
          ? (duelMechanicCopy[chapter.id] ?? mechanicCopy[chapter.id])
          : mechanicCopy[chapter.id];
      const id = `${mode}-${row.id}`,
        mapId = `${id}-map`;
      const env = teamEnvironment(row),
        hasEnvironment = Object.values(env).some((v) => Array.isArray(v) && v.length);
      const sentinel = mode === 'versus' && env.stages.length > 0;
      const directional = mode === 'versus' && (env.currents.length > 0 || sentinel);
      const relay = mode === 'versus' && (env.relays.length > 0 || directional);
      const asset = art[chapter.theme][index % art[chapter.theme].length];
      if (!source.assets.some((item) => item.id === asset.id))
        source.assets.push(structuredClone(asset));
      const actors = (points, role, prefix) =>
        (points ?? []).map(([x, y, dx, dy], i) => ({
          id: `${prefix}-${i + 1}`,
          role,
          tier: 'measured',
          x,
          y,
          heading: [dx, dy],
        }));
      source.maps.push({
        format: directional ? 'MapDesignV3' : relay ? 'MapDesignV2' : 'MapDesignV1',
        id: mapId,
        revision: '1',
        name: row.name,
        width: 72,
        height: 36,
        walls: [
          ...(row.walls ?? []).map(rect),
          ...(mode === 'team' ? env.relays.map((r) => r.gate) : []),
        ],
        ...(relay ? { gates: env.relays.map((r) => ({ id: r.id, ...r.gate })) } : {}),
        ...(directional ? { speedZones: env.currents } : {}),
        foundations: row.foundations.map(rect),
        terrain: (row.terrain ?? []).map(([kind, ...bounds], i) => ({
          id: `material-${i + 1}`,
          kind,
          ...rect(bounds),
        })),
        spawns: row.spawns.map(([x, y], i) => ({ id: `pilot-${i + 1}`, x, y })),
      });
      source.missions.push({
        format: sentinel
          ? 'MissionDesignV4'
          : directional
            ? 'MissionDesignV3'
            : relay
              ? 'MissionDesignV2'
              : 'MissionDesignV1',
        id,
        revision: '1',
        name: row.name,
        map: { id: mapId, revision: '1' },
        spawnId: 'pilot-1',
        modes: [mode],
        ...(mode === 'team'
          ? {
              team: {
                format: hasEnvironment ? 'TeamMissionV10' : 'TeamMissionV6',
                spawnIds: ['pilot-1', 'pilot-2'],
                supportRoles: ['interceptor', 'disruptor'],
                ...(hasEnvironment ? { environment: env } : {}),
              },
            }
          : {}),
        actors: [
          ...actors(row.keepers, sentinel ? 'reclaimed-roamer' : 'field-keeper', 'keeper'),
          ...actors(row.rovers, 'reclaimed-roamer', 'rover'),
          ...(mode === 'versus'
            ? [
                ...env.emitters.map(({ id, x, y, axis }) => ({
                  id,
                  role: 'lane-emitter',
                  tier: 'measured',
                  x,
                  y,
                  axis,
                })),
                ...env.patrols.map(({ id, offset, clockwise }) => ({
                  id,
                  role: 'perimeter-patrol',
                  tier: 'measured',
                  ...perimeterPoint(offset),
                  clockwise,
                })),
                ...actors(row.erosion, 'territory-eroder', 'erosion').map((a) => ({
                  ...a,
                  heading: [1, 0],
                })),
                ...(sentinel
                  ? [
                      {
                        id: 'sentinel',
                        role: 'relay-sentinel',
                        tier: 'measured',
                        x: env.stages.at(-1).x,
                        y: env.stages.at(-1).y,
                      },
                    ]
                  : []),
              ]
            : []),
        ],
        objectives:
          mode === 'versus'
            ? [
                ...env.relays.map((r) => ({
                  id: r.id,
                  ...r.objective,
                  required: true,
                  hidden: false,
                })),
                ...env.stages.map((r) => ({ ...r, required: true, hidden: false })),
              ]
            : [],
        ...(relay
          ? { relayLinks: env.relays.map((r) => ({ gateId: r.id, objectiveId: r.id })) }
          : {}),
        ...(sentinel
          ? {
              encounter: {
                recipeId: SENTINEL_RECIPE.id,
                enemyId: 'sentinel',
                shieldObjectiveIds: env.stages.slice(0, -1).map((r) => r.id),
                coreObjectiveId: env.stages.at(-1).id,
              },
            }
          : {}),
        bonuses: [],
        coverage: row.coverage,
        timeLimitSeconds: 0,
        design: {
          routeDecision: row.decision,
          captureConsequence: row.consequence,
          memorableMoment: row.moment,
          mastery: row.mastery,
          lesson:
            (mode === 'team' && chapter.id === 'sentinel'
              ? 'Team targets open in numbered order and require separate captures. Prepare a return for the next active target.'
              : instructions?.[0]) ??
            'Close onto foundations or reclaimed ground. Walls stop movement and never close a live trail.',
          counterplay:
            instructions?.[1] ??
            (mode === 'team'
              ? 'Keep a short return available for both pilots. Interceptor Support clears nearby travelling impacts; Disruptor Support slows a keeper. Support is optional.'
              : 'Watch the keeper before leaving safe ground. Both rivals have identical boards and settings; choose a shorter return when the long route is threatened.'),
          introduces: index === 0 && chapter.id !== 'aurora' ? [chapter.mechanic] : [],
          practices: ['closure', 'foundations'],
          combines: [chapter.mechanic, mode === 'team' ? 'complementary-routes' : 'route-choice'],
          durationSeconds: mode === 'team' ? [60, 240] : [45, 150],
          difficulty: {
            band: chapter.band,
            planning: chapter.band,
            execution: chapter.band - 1,
            threatDensity: row.keepers.length,
            timePressure: 0,
            mechanicLoad: chapter.band - 1,
            coordination: mode === 'team' ? 2 : 0,
          },
        },
        presentation: { themeId: themeIds[chapter.theme], backgroundAssetId: asset.id },
      });
    }
    // A campaign owns exactly one simulation edition. Keep the authored order
    // in consecutive parts when a finale moves into a newer native core.
    const groups = [];
    for (const row of rows) {
      const mission = source.missions.find((m) => m.id === `${mode}-${row.id}`);
      const edition = mode === 'team' ? mission.team.format : mission.format;
      if (groups.at(-1)?.edition !== edition) groups.push({ edition, ids: [] });
      groups.at(-1).ids.push(mission.id);
    }
    const chapterCampaigns = groups.map((group, index) => ({
      format: 'CampaignDesignV1',
      id: groups.length === 1 ? campaignId : `${campaignId}-part-${index + 1}`,
      revision: '1',
      name: groups.length === 1 ? chapter.name : `${chapter.name} · ${index + 1}`,
      band: chapter.band,
      missionIds: group.ids,
    }));
    source.campaigns.push(...chapterCampaigns);
    source.packs.push({
      format: 'PackDesignV1',
      id: `${campaignId}-pack`,
      revision: '1',
      name: chapter.name,
      campaignIds: chapterCampaigns.map((c) => c.id),
    });
  }
  const normalized = compileContentProject(source).source;
  candidateCache.set(cacheKey, normalized);
  return structuredClone(normalized);
}

export const createTeamExpansionCandidates = () =>
  createMultiplayerExpansionCandidates({ mode: 'team' });
export const createDuelExpansionCandidates = () =>
  createMultiplayerExpansionCandidates({ mode: 'versus' });
