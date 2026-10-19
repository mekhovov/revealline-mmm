import { dataIdentity, required } from '../data-json.mjs';
import { matchRecordedGameplayTuning, recoverGameplayTuning } from '../gameplay-tuning.mjs';
import {
  matchTeamRunningEnemyLevel,
  teamRunningEnemyBaseLevel,
} from '../hunt/team-running-enemies.mjs';
import {
  isTeamRunningLevel,
  TEAM_RUNNING_LEVEL_VERSION,
  TEAM_RUNNING_RULESET,
  TEAM_PURSUIT_LEVEL_VERSION,
  TEAM_PURSUIT_RULESET,
  TEAM_SNAKE_PURSUIT_LEVEL_VERSION,
  TEAM_SNAKE_PURSUIT_RULESET,
  TEAM_PURSUIT_V2_LEVEL_VERSION,
  TEAM_PURSUIT_V2_RULESET,
  TEAM_SNAKE_PURSUIT_V2_LEVEL_VERSION,
  TEAM_SNAKE_PURSUIT_V2_RULESET,
} from './running-enemies.mjs';

const accepted = new WeakMap();
const pursuitRulesets = new Map([
  [TEAM_RUNNING_LEVEL_VERSION, TEAM_RUNNING_RULESET],
  [TEAM_PURSUIT_LEVEL_VERSION, TEAM_PURSUIT_RULESET],
  [TEAM_SNAKE_PURSUIT_LEVEL_VERSION, TEAM_SNAKE_PURSUIT_RULESET],
  [TEAM_PURSUIT_V2_LEVEL_VERSION, TEAM_PURSUIT_V2_RULESET],
  [TEAM_SNAKE_PURSUIT_V2_LEVEL_VERSION, TEAM_SNAKE_PURSUIT_V2_RULESET],
]);

/** The host retains immutable preparation data because Team's live level also
 * owns moving inherited enemies. Authenticate the projection once, preserving
 * an authored pursuit edition or exposing the base of a supplemental overlay
 * to the existing picture lease guard. */
export function teamPictureArenaLevel(run, { runtimeLevel, sourceLevel }) {
  if (!run.level.runningEnemies) return run.level;
  required(
    isTeamRunningLevel(runtimeLevel) &&
      run.level.version === runtimeLevel.version &&
      pursuitRulesets.get(runtimeLevel.version) === run.ruleset &&
      run.level.id === runtimeLevel.id &&
      run.level.revision === runtimeLevel.revision &&
      run.width === runtimeLevel.width &&
      run.height === runtimeLevel.height,
    'Team running-enemy picture needs its exact prepared arena.',
  );
  let binding = accepted.get(run);
  if (binding?.runtimeLevel !== runtimeLevel || binding?.sourceLevel !== sourceLevel) {
    required(
      dataIdentity(run.level.runningEnemies) === dataIdentity(runtimeLevel.runningEnemies),
      'Team running-enemy picture inheritance changed.',
    );
    const matches = recoverGameplayTuning(runtimeLevel)
      ? matchRecordedGameplayTuning(sourceLevel, runtimeLevel)
      : matchTeamRunningEnemyLevel(sourceLevel, runtimeLevel, {
          style: runtimeLevel.pursuit ? 'varied' : 'original',
        });
    required(matches, 'Team running-enemy picture source differs from its exact recipe.');
    binding = {
      runtimeLevel,
      sourceLevel,
      // Authored pursuit owns its own picture edition. Only a supplemental
      // Running enemies overlay borrows the unchanged inherited picture source.
      arena: isTeamRunningLevel(sourceLevel)
        ? runtimeLevel
        : teamRunningEnemyBaseLevel(runtimeLevel),
    };
    accepted.set(run, binding);
  }
  return binding.arena;
}
