import { CELL } from '../core/registry.mjs';
import { CLASSIC_MATERIAL } from '../core/classic-state.mjs';

/** Caption accepted transitions only, never predict a moving capture or promise safety.
 * This projection does not alter cells, effects, score, controls or replay identity.
 */
export function terrainTransitionCaption(run, event) {
  const reclaimed = event?.type === 'cells.claimed';
  if (!reclaimed && event?.type !== 'cells.eroded') return '';
  const terrain = run.classic?.terrain ?? run.terrain;
  if (!terrain || !Array.isArray(event.indices)) return '';
  const counts = { slow: 0, lethal: 0 };
  for (const index of new Set(event.indices)) {
    if (!Number.isSafeInteger(index) || index < 0 || index >= run.cells.length) continue;
    if (run.cells[index] !== (reclaimed ? CELL.SAFE : CELL.FIELD)) continue;
    if (terrain[index] === CLASSIC_MATERIAL.slow) counts.slow++;
    if (terrain[index] === CLASSIC_MATERIAL.lethal) counts.lethal++;
  }
  return Object.entries(counts)
    .filter(([, count]) => count)
    .map(([kind, count]) => {
      const cells = `${count} ${kind}-field cell${count === 1 ? '' : 's'}`;
      return reclaimed
        ? `${cells} neutralized by this capture.`
        : `${cells} active again: ${kind === 'slow' ? 'slows your craft' : 'harms your craft'}.`;
    })
    .join(' ');
}
