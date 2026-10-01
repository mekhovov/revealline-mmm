import { exactKeys, required, stableId, dataIdentity } from '../data-json.mjs';
import { validateCoopLevel, createCoop } from '../coop/core.mjs';
import {
  COOP_FOUNDATION_LEVEL_VERSION,
  COOP_TERRAIN_LEVEL_VERSION,
  COOP_ROVER_LEVEL_VERSION,
  COOP_BONUS_LEVEL_VERSION,
  COOP_IMPACT_LEVEL_VERSION,
  COOP_SPECIALIST_LEVEL_VERSION,
  journeyTeamPackEdition,
} from '../coop/foundations.mjs';
import { compileActor, freezeDesign } from './catalogs.mjs';
import { inspectRuntimeTopology } from './diagnostics.mjs';
import { TEAM_MISSION_FORMATS, teamRoleQualified } from './team-qualification.mjs';

/** Explicit Team qualification, not an automatic Solo-to-Team conversion.
 * Unsupported mechanics fail closed until their Team semantics are implemented. */
export function resolveTeamMission(project, mission, map, difficulty) {
  exactKeys(mission.team, ['format', 'spawnIds', 'supportRoles'], 'Team mission');
  required(
    TEAM_MISSION_FORMATS.includes(mission.team.format) &&
      Array.isArray(mission.team.spawnIds) &&
      mission.team.spawnIds.length === 2 &&
      new Set(mission.team.spawnIds).size === 2 &&
      mission.team.spawnIds.every(stableId),
    'Team missions require two explicit named spawns.',
  );
  required(
    mission.team.format === 'TeamMissionV6'
      ? Array.isArray(mission.team.supportRoles) &&
          mission.team.supportRoles.length === 2 &&
          new Set(mission.team.supportRoles).size === 2 &&
          mission.team.supportRoles.every((role) => ['interceptor', 'disruptor'].includes(role))
      : mission.team.supportRoles === undefined,
    'Team specialist missions require one Interceptor and one Disruptor in seat order.',
  );
  required(mission.spawnId === mission.team.spawnIds[0], 'Primary spawn must match Team seat one.');
  required(
    mission.design.difficulty.coordination > 0,
    'Team missions require a coordination rating.',
  );
  required(
    mission.actors.every((actor) => teamRoleQualified(mission.team.format, actor.role)) &&
      mission.objectives.length === 0 &&
      mission.bonuses.length === 0 &&
      (!Object.hasOwn(mission, 'timedBonuses') ||
        ['TeamMissionV4', 'TeamMissionV5', 'TeamMissionV6'].includes(mission.team.format)) &&
      mission.timeLimitSeconds === 0 &&
      (mission.team.format !== 'TeamMissionV1' || (map.source.terrain ?? []).length === 0),
    'Team candidates support only qualified actor roles and coverage, not unqualified terrain, bonuses, objectives or timers.',
  );
  required(
    !['TeamMissionV4', 'TeamMissionV5', 'TeamMissionV6'].includes(mission.team.format) ||
      (map.source.format === 'MapDesignV1' &&
        !Object.hasOwn(mission, 'encounter') &&
        !Object.hasOwn(mission, 'relayLinks')),
    'Team timed bonuses currently qualify foundation/terrain maps, not relay, directional or encounter mechanics.',
  );
  required(
    !['TeamMissionV5', 'TeamMissionV6'].includes(mission.team.format) ||
      (project.policy.lineImpact?.version === 'line-impact.v1' &&
        Number.isFinite(project.policy.lineImpact.speed)),
    'Team impact missions require the registered global Journey impact policy.',
  );
  const spawns = mission.team.spawnIds.map((id) => {
    const spawn = map.geometry.spawns.find((item) => item.id === id);
    required(spawn, 'Team spawn is missing from its map revision.');
    return { x: spawn.x, y: spawn.y };
  });
  required(
    Math.hypot(spawns[0].x - spawns[1].x, spawns[0].y - spawns[1].y) >= 1,
    'Team spawn bodies must have independent clearance.',
  );
  const level = {
    version:
      mission.team.format === 'TeamMissionV6'
        ? COOP_SPECIALIST_LEVEL_VERSION
        : mission.team.format === 'TeamMissionV5'
          ? COOP_IMPACT_LEVEL_VERSION
          : mission.team.format === 'TeamMissionV4'
            ? COOP_BONUS_LEVEL_VERSION
            : mission.team.format === 'TeamMissionV3'
              ? COOP_ROVER_LEVEL_VERSION
              : mission.team.format === 'TeamMissionV2'
                ? COOP_TERRAIN_LEVEL_VERSION
                : COOP_FOUNDATION_LEVEL_VERSION,
    ...(mission.team.format !== 'TeamMissionV1' ? { terrain: map.source.terrain ?? [] } : {}),
    ...(Object.hasOwn(mission, 'timedBonuses') ? { timedBonuses: mission.timedBonuses } : {}),
    ...(['TeamMissionV5', 'TeamMissionV6'].includes(mission.team.format)
      ? {
          lineImpact: {
            version: 'team-line-impact.v2',
            speed: project.policy.lineImpact.speed,
          },
        }
      : {}),
    ...(mission.team.format === 'TeamMissionV6'
      ? { supportRoles: structuredClone(mission.team.supportRoles) }
      : {}),
    id: mission.id,
    revision: mission.revision,
    name: mission.name,
    width: map.geometry.width,
    height: map.geometry.height,
    journeyDifficulty: difficulty,
    spawns,
    walls: map.source.walls ?? [],
    safeRects: map.source.foundations ?? [],
    enemies: mission.actors.map((source) => {
      const actor = compileActor(source, difficulty, project.actors.id, project.difficulty.id);
      return {
        ...actor,
        type: source.role === 'reclaimed-roamer' ? 'claimed-rover' : 'drifter',
        radius: 0.25,
      };
    }),
    goal: { coverage: mission.coverage },
    rules: { moveSpeed: project.policy.rules.moveSpeed, boostMultiplier: 1 },
  };
  const result = validateCoopLevel(level);
  required(result.valid, result.errors.join(' '));
  const topology = inspectRuntimeTopology(
    createCoop(level, { seed: 1 }),
    level,
    map.geometry,
    spawns,
  );
  const { id: _id, name: _name, revision: _revision, ...simulation } = level;
  return freezeDesign({
    format: 'ResolvedTeamMissionV1',
    missionId: mission.id,
    mode: 'team',
    difficulty,
    policyId: project.policy.id,
    simulationIdentity: dataIdentity({
      ruleset: journeyTeamPackEdition(level).ruleset,
      policy: project.policy.id,
      difficulty,
      level: simulation,
    }),
    level,
    presentation: mission.presentation,
    background:
      project.assets.find((asset) => asset.id === mission.presentation.backgroundAssetId) ?? null,
    design: mission.design,
    officialProgressEligible: false,
    validation: 'compiled-candidate-not-playtested',
    topology,
    diagnostics: [
      ...map.geometry.diagnostics,
      ...topology.diagnostics,
      { severity: 'warning', code: 'team-candidate-not-playtested' },
    ],
  });
}
