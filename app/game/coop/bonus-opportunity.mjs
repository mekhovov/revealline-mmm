import { hasBonusOpportunity } from '../core/bonus-opportunity.mjs';
import { FIXED_DT } from '../core/registry.mjs';

/** Qualification primitive only: does not register a Team edition, create an
 * item or grant an effect. Call with validated schedules and runtime-owned data. */
export function hasTeamBonusOpportunity(run, definition, anchor, items = []) {
  return hasBonusOpportunity(run, {
    anchor,
    trail: new Set(run.players.flatMap((player) => player.trail.map((cell) => cell.index))),
    bodies: [...run.players, ...run.enemies.filter((enemy) => enemy.active !== false)],
    items,
    starts: run.players
      .filter((player) => player.status === 'active')
      .map((player) => Math.floor(player.y) * run.width + Math.floor(player.x)),
    maxDistance: Math.floor((definition.availableTicks * FIXED_DT * run.rules.moveSpeed) / 2),
    terrain: run.terrain ?? new Uint8Array(run.cells.length),
  });
}
