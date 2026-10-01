import { createTeamWindowSpatialCandidates } from './team-window-spatial-candidates.mjs';
import { compileContentProject } from './project.mjs';

/** Explicit successor: hold the inner depot lanes without changing shared physics. */
export function createTeamDepotSpatialCandidates({ artwork = false } = {}) {
  const source = createTeamWindowSpatialCandidates({ artwork });
  source.id = 'team-depot-spatial-review';
  source.revision = 'depot-spatial-1';
  source.name = 'Shared windows · contested depot lanes review';
  const mission = source.missions.find((m) => m.id === 'depot-dash');
  mission.revision = source.revision;
  mission.actors.find((a) => a.id === 'north-keeper').heading = [0, 1];
  mission.actors.find((a) => a.id === 'south-keeper').heading = [0, -1];
  Object.assign(mission.design, {
    routeDecision:
      'Bank a corner approach, connect an upper or lower platform across a keeper lane, or take an optional speed window for the next connection?',
    counterplay:
      'The two field keepers travel vertically beside the inner shelves. Watch the crossing before extending toward a platform; the outer bays remain useful return approaches. Reclaiming a rover bay can threaten those approaches, so preserve a second exit.',
    captureConsequence:
      'Corner enclosures establish approaches without automatically emptying the central depot. Inner field keepers retain that territory; reclaimed roamers do not retain field. A timed pickup remains optional and must be touched.',
    memorableMoment:
      'Both pilots establish opposite platform connections, then choose different crossings as the inner keepers and reclaimed-ground roamers change the useful return routes.',
  });
  for (const item of [...source.campaigns, ...source.packs]) item.revision = source.revision;
  return structuredClone(compileContentProject(source).source);
}
