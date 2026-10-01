const axis = (direction) =>
  direction === 'left' || direction === 'right' ? 'horizontal' : 'vertical';
const step = (direction) => (direction === 'down' || direction === 'right' ? 1 : -1);

/** Optional semantic navigation; null leaves the established host navigation unchanged.
 * Targets come only from the host's visible, accepted controls, never arbitrary DOM IDs.
 */
export function menuGroupNeighbor(items, current, direction) {
  const override = current.getAttribute(`data-menu-${direction}`);
  if (override) return items.find((item) => item.id === override) || current;
  const group = current.closest('[data-menu-layout]');
  if (!group) return null;
  const layout = group.getAttribute('data-menu-layout');
  if (!['horizontal', 'vertical', 'grid'].includes(layout)) return null;
  const members = items.filter((item) => group.contains(item));
  const index = members.indexOf(current),
    movement = step(direction);
  if (index < 0) return null;
  if (layout === axis(direction)) {
    const next = members[index + movement];
    if (next) return next;
    if (group.getAttribute('data-menu-wrap') === 'true')
      return members[(index + movement + members.length) % members.length];
    if (group.getAttribute('data-menu-edge-exit') !== 'true') return current;
  }
  const from = current.getBoundingClientRect(),
    horizontal = axis(direction) === 'horizontal';
  const candidates = (layout === 'grid' ? members : items.filter((item) => !group.contains(item)))
    .filter((item) => item !== current)
    .map((item) => {
      const rect = item.getBoundingClientRect(),
        dx = rect.x + rect.width / 2 - from.x - from.width / 2,
        dy = rect.y + rect.height / 2 - from.y - from.height / 2,
        forward = (horizontal ? dx : dy) * movement,
        centerOffset = Math.abs(horizontal ? dy : dx),
        // A wide action directly below a narrow mode still overlaps its path.
        // Penalizing its center can skip the entire action stack for a much
        // farther, narrow utility. Keep grids' existing center-based geometry.
        crossGap = horizontal
          ? Math.max(0, rect.y - from.y - from.height, from.y - rect.y - rect.height)
          : Math.max(0, rect.x - from.x - from.width, from.x - rect.x - rect.width);
      return {
        item,
        forward,
        centerOffset,
        score: forward + (layout === 'grid' ? centerOffset : crossGap) * 3,
      };
    })
    .filter(({ forward }) => forward > 1)
    .sort((a, b) => a.score - b.score || (layout === 'grid' ? 0 : a.centerOffset - b.centerOffset));
  if (candidates.length) return candidates[0].item;
  if (layout === 'grid') return current;
  // A stacked responsive layout may have no neighbor in the requested axis.
  // Orthogonal movement can still exit to the adjacent section in document order.
  const edge = movement < 0 ? members[0] : members.at(-1);
  return items[items.indexOf(edge) + movement] || current;
}
