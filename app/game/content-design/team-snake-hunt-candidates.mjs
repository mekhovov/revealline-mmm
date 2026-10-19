import {
  createSnakeHuntCandidates,
  SNAKE_HUNT_STAGES,
  snakeStageCopy,
} from './snake-hunt-candidates.mjs';

export const TEAM_SNAKE_HUNT_PROFILE_KEY = 'team-snake-hunt-v1';

/** Explicitly authored cooperative edition: independent opposite rail starts,
 * shared finite targets, and chapter-qualified partner-tail collision rules. */
export function createTeamSnakeHuntCandidates({ artwork = true } = {}) {
  const source = createSnakeHuntCandidates({ artwork });
  source.id = 'team-snake-hunt-project';
  source.name = 'Team Snake Hunt';
  source.revision = 'team-snake-hunt-1';
  for (const [index, mission] of source.missions.entries()) {
    const map = source.maps.find((map) => map.id === mission.map.id);
    map.spawns.push({ id: 'partner', x: 63.5, y: 35.5 });
    mission.modes = ['team'];
    mission.team = { format: 'TeamMissionV8', spawnIds: ['home', 'partner'], lineImpact: false };
    const copy = snakeStageCopy(SNAKE_HUNT_STAGES[index], { team: true });
    Object.assign(
      mission.design,
      Object.fromEntries(Object.entries(copy).map(([key, value]) => [key, value.en])),
    );
    mission.design.difficulty.coordination = index < 36 ? 1 : 3;
  }
  source.packs[0].id = 'team-snake-hunt';
  source.packs[0].name = 'Team Snake Hunt · eight chapters';
  // Pack/execution identities include the Team project and full simulation;
  // keeping chapter IDs makes cross-mode navigation readable, not shared progress.
  return source;
}
