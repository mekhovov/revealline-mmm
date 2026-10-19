/** Read-only Solo-core warning priority, shared by Solo, Versus boards and Replay.
 * Active hazards remain authoritative even when actor clocks are frozen or replay is slow. */
export function soloReactionDanger(run) {
  if (!run || run.status !== 'running') return true;
  const patrols = (run.classic ?? run.runningEnemies)?.combatPatrols;
  return Boolean(
    patrols?.actors.some((actor) => actor.alive && actor.phase === 'warning') ||
      patrols?.projectiles.length > 0 ||
      run.classic?.lineImpact?.fronts.length > 0 ||
      (!run.encounter?.defeated && ['warning', 'active'].includes(run.encounter?.phase)) ||
      run.enemies?.some(
        (enemy) =>
          enemy.active !== false &&
          enemy.alive !== false &&
          !enemy.defeated &&
          (enemy.classic?.mode === 'warning' ||
            ['warning', 'committed'].includes(enemy.classic?.pressure?.phase) ||
            ['warning', 'commit'].includes(enemy.phase) ||
            enemy.rover?.mode === 'warning'),
      ),
  );
}
