import { t } from '../i18n/index.mjs';
import { DIRECTIONS } from '../core/registry.mjs';
import { EPS } from '../core/geometry.mjs';
import { cellIndex } from '../core/movement.mjs';

/** Accepted return ownership only. This is not a safety promise or a new award. */
export function foundationCaptionForCell(rectangles, index, width) {
  if (!Array.isArray(rectangles) || !Number.isSafeInteger(index) || index < 0) return '';
  const x = index % width,
    y = Math.floor(index / width);
  return rectangles.some((r) => x >= r.x && x < r.x + r.w && y >= r.y && y < r.y + r.h)
    ? t('interface:foundationReachedCloseFutureCutsHerePermanentReclaimedGroundAdds')
    : '';
}

/** Solo and each independent race board share the same stopped-return contract.
 * Use directional ownership at an exact edge, not raw point containment. Never
 * infer a return from boss release, a rejected cut, or a moving legacy closure.
 */
export function foundationReturnCaption(run, events = run.events) {
  if (
    !run.classic ||
    run.rules.stopOnCapture !== true ||
    run.status !== 'running' ||
    !events.some((e) => e.type === 'cut.closed') ||
    !events.some((e) => e.type === 'capture.stopped')
  )
    return '';
  const direction = DIRECTIONS[run.player.direction];
  if (!direction) return '';
  return foundationCaptionForCell(
    run.level.foundations,
    cellIndex(run.player.x + direction.x * EPS * 4, run.player.y + direction.y * EPS * 4, run),
    run.width,
  );
}
