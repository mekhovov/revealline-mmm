import { createTeamTimedCandidates } from './team-timed-candidates.mjs';
import { compileContentProject } from './project.mjs';
import { TEAM_TIMED_ART_CANDIDATES } from './team-timed-art.mjs';

/** Explicit placement candidate: preserve geometry, schedules, tiers and earlier editions. */
export function createTeamWindowSpatialCandidates({ artwork = false } = {}) {
  const source = createTeamTimedCandidates();
  source.id = 'team-window-spatial-review';
  source.revision = 'window-spatial-1';
  source.name = 'Shared windows · contested outer pockets review';
  const mission = source.missions.find((m) => m.id === 'window-exchange');
  mission.revision = 'window-spatial-1';
  Object.assign(
    mission.actors.find((a) => a.id === 'west-lower'),
    { x: 8.5, y: 28.5, heading: [0, -1] },
  );
  Object.assign(
    mission.actors.find((a) => a.id === 'east-upper'),
    { x: 63.5, y: 7.5, heading: [0, 1] },
  );
  Object.assign(mission.design, {
    routeDecision:
      'Bank an inner approach beside the shelf, work the contested outer pocket, or shape the other chamber while your partner takes the bonus detour?',
    counterplay:
      'Outer keepers move along readable vertical lanes; inner keepers cross diagonally around the shelves. Time the outer crossing and use either end of the tall islands for a return. Walls never close cuts.',
    captureConsequence:
      'A small return establishes an approach around a shelf without necessarily reclaiming its far pocket. Keep earning ground if a pickup expires; another eligible anchor may offer a later window.',
    memorableMoment:
      'One craft reaches a contested outer slow window while the other commits to an enclosure beside the opposite shelf.',
  });
  mission.design.difficulty.planning = 5;
  for (const item of [...source.campaigns, ...source.packs]) item.revision = source.revision;
  if (artwork) {
    source.assets = structuredClone(TEAM_TIMED_ART_CANDIDATES);
    for (const item of source.missions)
      item.presentation.backgroundAssetId = `team-windows-${item.id}`;
  }
  return structuredClone(compileContentProject(source).source);
}
