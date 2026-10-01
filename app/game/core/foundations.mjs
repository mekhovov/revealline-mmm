import {
  compileMapGeometry,
  compileRelayMapGeometry,
  compileDirectionalMapGeometry,
} from '../content-design/map.mjs';
import { required } from '../data-json.mjs';
import { CELL } from './registry.mjs';
import { relayGeometryDefinition } from './relay-gates.mjs';
import { directionalGeometryDefinition } from './directional-fields.mjs';

/** Shared geometry boundary for new editions only. Legacy maps retain their compiler. */
export function foundationGeometry(level) {
  required(Array.isArray(level.foundations), 'Foundation editions require explicit foundations.');
  const directional = ['xonix-level.v7', 'xonix-level.v8'].includes(level.version);
  const relays = level.version === 'xonix-level.v6' || directional;
  return (
    directional
      ? compileDirectionalMapGeometry
      : relays
        ? compileRelayMapGeometry
        : compileMapGeometry
  )({
    width: level.width,
    height: level.height,
    walls: level.walls ?? [],
    foundations: level.foundations,
    terrain: level.classic?.terrain ?? [],
    spawns: [{ id: 'player', ...level.spawn }],
    ...(relays ? { gates: relayGeometryDefinition(level) } : {}),
    ...(directional ? { speedZones: directionalGeometryDefinition(level) } : {}),
  });
}

export function validateFoundationOccupants(level, geometry) {
  if (['xonix-level.v6', 'xonix-level.v7', 'xonix-level.v8'].includes(level.version))
    for (const item of [
      ...(level.classic?.powerups ?? []),
      ...(level.supplies ?? []),
      ...(level.hangars ?? []),
    ])
      required(
        geometry.cells[Math.floor(item.y) * level.width + Math.floor(item.x)] !== CELL.WALL,
        'Gate cells cannot contain pickups or return facilities.',
      );
  for (const objective of level.objectives ?? [])
    required(
      geometry.eligible[Math.floor(objective.y) * level.width + Math.floor(objective.x)],
      'Objectives must occupy earned-coverage field, not foundations.',
    );
  for (const enemy of level.enemies ?? []) {
    // New editions reserve two cells around the initial craft. For a frontier
    // patrol check the whole authored edge, not a guessed outer-border position.
    let x = enemy.x,
      y = enemy.y;
    if (enemy.type === 'contour-patrol') {
      const edge = enemy.edge;
      x = ['east', 'west'].includes(edge.side)
        ? edge.x + Number(edge.side === 'east')
        : Math.max(edge.x, Math.min(edge.x + 1, level.spawn.x));
      y = ['north', 'south'].includes(edge.side)
        ? edge.y + Number(edge.side === 'south')
        : Math.max(edge.y, Math.min(edge.y + 1, level.spawn.y));
    }
    required(
      Math.hypot(x - level.spawn.x, y - level.spawn.y) >= 2,
      `${enemy.id} needs two cells of spawn clearance.`,
    );
    if (['border-patrol', 'contour-patrol'].includes(enemy.type)) continue;
    const radius = enemy.radius ?? 0.25;
    const kind = geometry.cells[Math.floor(enemy.y) * level.width + Math.floor(enemy.x)];
    required(
      kind === CELL.FIELD || (enemy.type === 'claimed-rover' && kind === CELL.SAFE),
      `${enemy.id} must start in its movement domain.`,
    );
    for (let y = Math.floor(enemy.y - radius + 1e-9); y <= Math.floor(enemy.y + radius - 1e-9); y++)
      for (
        let x = Math.floor(enemy.x - radius + 1e-9);
        x <= Math.floor(enemy.x + radius - 1e-9);
        x++
      )
        required(
          geometry.cells[y * level.width + x] === kind,
          `${enemy.id} must fit its movement domain.`,
        );
  }
}
