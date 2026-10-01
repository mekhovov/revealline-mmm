/** Called only by the course's explicit Start/Resume path, after its UI update.
 * This is a view adjustment: it never focuses a control or starts a simulation.
 */
export function revealFirstFlightBoard(arena, viewport = globalThis.window) {
  const width = viewport?.innerWidth,
    height = viewport?.innerHeight;
  if (
    typeof arena?.getBoundingClientRect !== 'function' ||
    typeof arena?.scrollIntoView !== 'function' ||
    !Number.isFinite(width) ||
    !Number.isFinite(height) ||
    width <= 0 ||
    height <= 0
  )
    return false;
  const rect = arena.getBoundingClientRect();
  if (
    ![rect.top, rect.bottom, rect.left, rect.right].every(Number.isFinite) ||
    rect.bottom <= rect.top ||
    rect.right <= rect.left ||
    (rect.top >= 0 && rect.left >= 0 && rect.bottom <= height && rect.right <= width)
  )
    return false;
  arena.scrollIntoView({ block: 'nearest', inline: 'nearest', behavior: 'instant' });
  return true;
}
