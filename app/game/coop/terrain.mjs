import { boxTime, EPS } from '../core/geometry.mjs';
import { positionAt } from './geometry.mjs';

// Team v5 shares the Solo material contract: only the player is slowed; capture
// neutralizes the underlying material. Downed recovery movement is unchanged.
export function coopTerrainSpeed(run, player) {
  return player.status === 'active' &&
    run.cells[player.cellIndex] === 0 &&
    run.terrain?.[player.cellIndex] === 1
    ? 0.5
    : 1;
}

/** Same expanded-box contact rule as Solo. Hazard/closure ties harm first.
 * A protected/reclaimed tile has no material contact. This is not an enemy
 * attack: Support and enemy grace cannot neutralize an unclaimed lethal tile.
 */
export function coopTerrainContact(run, player, velocity, horizon) {
  if (!run.terrain || player.status !== 'active') return null;
  const end = positionAt(player, velocity, horizon),
    radius = player.radius;
  let best = null;
  for (
    let y = Math.max(1, Math.floor(Math.min(player.y, end.y) - radius));
    y <= Math.min(run.height - 2, Math.floor(Math.max(player.y, end.y) + radius));
    y++
  )
    for (
      let x = Math.max(1, Math.floor(Math.min(player.x, end.x) - radius));
      x <= Math.min(run.width - 2, Math.floor(Math.max(player.x, end.x) + radius));
      x++
    ) {
      const index = y * run.width + x;
      if (run.cells[index] !== 0 || run.terrain[index] !== 2) continue;
      const fraction = boxTime(player, end, {
        x: x - radius,
        y: y - radius,
        w: 1 + 2 * radius,
        h: 1 + 2 * radius,
      });
      if (fraction === null) continue;
      const time = fraction * horizon;
      if (
        !best ||
        time < best.time - EPS ||
        (Math.abs(time - best.time) <= EPS && index < best.index)
      )
        best = { time, index, player: player.id, enemy: '', cause: 'lethal-terrain' };
    }
  return best;
}
