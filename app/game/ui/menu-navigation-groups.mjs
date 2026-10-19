const axis = (direction) =>
  direction === 'left' || direction === 'right' ? 'horizontal' : 'vertical';
const step = (direction) => (direction === 'down' || direction === 'right' ? 1 : -1);

/** Optional semantic navigation; null leaves the established host navigation unchanged.
 * Targets come only from the host's visible, accepted controls, never arbitrary DOM IDs.
 */
export function menuGroupNeighbor(items, current, direction) {
  const overrideScope = current.getAttribute('data-menu-navigation-scope');
  const overrideOwner = overrideScope ? current.ownerDocument?.getElementById(overrideScope) : null;
  const overrideOwnerActive =
    !overrideScope ||
    (overrideOwner &&
      !overrideOwner.hidden &&
      !overrideOwner.closest('[hidden],[inert],[aria-hidden="true"]') &&
      (overrideOwner.tagName !== 'DIALOG' || overrideOwner.open) &&
      !current.closest('.shared-pause-menu'));
  const override = overrideOwnerActive && current.getAttribute(`data-menu-${direction}`);
  if (override)
    return (
      override
        .trim()
        .split(/\s+/)
        .map((id) => items.find((item) => item.id === id))
        .find(Boolean) || current
    );
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
  const adjacent = items[items.indexOf(edge) + movement];
  if (adjacent) return adjacent;
  // Settings may put Back in a header above the panel. At its far edge,
  // wrap to an outside control instead of trapping focus on the last field.
  if (group.getAttribute('data-menu-edge-exit') === 'true') {
    const outside = items.filter((item) => !group.contains(item));
    return (movement > 0 ? outside[0] : outside.at(-1)) || current;
  }
  return current;
}
