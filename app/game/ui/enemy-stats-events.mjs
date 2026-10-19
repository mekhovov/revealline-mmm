import { pursuitRoster } from '../hunt/pursuit-goals.mjs';

/** Only authoritative removal events count; presentation reactions, projectiles,
 * relays and pickups never manufacture additional defeats. */
export function arcadeEnemyDefeats(run) {
  const accepted = (run.events ?? []).filter((event) =>
    ['combat.eliminated', 'encounter.defeated', 'enemy.defeated', 'core.defeated'].includes(
      event.type,
    ),
  );
  if (!accepted.length) return [];
  const roster = pursuitRoster(run.level),
    seen = new Set(),
    defeats = [];
  for (const event of accepted) {
    const id =
      event.id ??
      event.enemy ??
      event.stronghold ??
      run.level?.encounter?.enemyId ??
      'relay-sentinel';
    if (seen.has(id)) continue;
    seen.add(id);
    const actor = (
      run.runningEnemies?.combatPatrols?.actors ??
      run.classic?.combatPatrols?.actors ??
      run.combatPatrols?.actors ??
      []
    ).find((row) => row.id === id);
    const enemy = run.enemies?.find((row) => row.id === id);
    const family =
      roster.find((row) => row.id === id)?.family ??
      actor?.role ??
      (event.type === 'encounter.defeated' || event.type === 'core.defeated'
        ? 'relay-sentinel'
        : enemy?.type === 'hunter'
          ? 'bouncer'
          : (enemy?.type ?? 'lookout'));
    defeats.push({ family, ...(event.player !== undefined ? { playerId: event.player } : {}) });
  }
  return defeats;
}
