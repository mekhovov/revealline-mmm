/** Reveal a focused chapter in its own horizontal rail without selecting it.
 * Native Tab and controller focus share this owner; deliberate scrolling does not. */
export function attachChapterFocusClearance({ document: doc, rails }) {
  const view = doc.defaultView ?? globalThis,
    removers = [];
  let destroyed = false,
    suspended = false,
    generation = 0,
    frame = null;
  const cancel = () => {
    generation++;
    if (frame !== null) view.cancelAnimationFrame?.(frame);
    frame = null;
  };
  const owner = () => {
    if (destroyed || suspended || doc.hidden || doc.hasFocus?.() === false) return null;
    const card = doc.activeElement,
      rail = rails.find((item) => card?.parentElement === item);
    if (
      !rail ||
      !card.isConnected ||
      card.disabled ||
      !card.classList.contains('mission-picker-card') ||
      card.closest('[hidden],[inert],[aria-hidden="true"]') ||
      !card.getClientRects().length ||
      !rail.getClientRects().length
    )
      return null;
    // Closed details/dialog descendants stay connected but do not own a visit.
    for (let node = card.parentElement; node; node = node.parentElement)
      if ((node.tagName === 'DIALOG' || node.tagName === 'DETAILS') && !node.open) return null;
    return { card, rail };
  };
  const update = (expected) => {
    const current = owner();
    if (!current || current.card !== expected.card || current.rail !== expected.rail) return;
    const { card, rail } = current,
      box = rail.getBoundingClientRect(),
      target = card.getBoundingClientRect(),
      values = [
        box.left,
        rail.clientLeft,
        rail.clientWidth,
        rail.scrollWidth,
        rail.scrollLeft,
        target.left,
        target.right,
      ];
    if (
      !values.every(Number.isFinite) ||
      rail.clientWidth <= 0 ||
      rail.scrollWidth <= rail.clientWidth ||
      target.right <= target.left
    )
      return;
    const left = box.left + rail.clientLeft + 8,
      right = box.left + rail.clientLeft + rail.clientWidth - 8;
    if (right <= left) return;
    // When zoom makes a card wider than the rail, show its beginning stably.
    // Do not alternate between its two clipped edges on repeated resize events.
    const delta =
      target.right - target.left > right - left || target.left < left
        ? target.left - left
        : target.right > right
          ? target.right - right
          : 0;
    if (delta) rail.scrollLeft += delta;
  };
  const schedule = () => {
    cancel();
    const expected = owner();
    if (!expected || typeof view.requestAnimationFrame !== 'function') return;
    const request = generation;
    frame = view.requestAnimationFrame(() => {
      if (destroyed || request !== generation) return;
      frame = null;
      update(expected);
    });
  };
  const listen = (node, event, callback) => {
    node.addEventListener?.(event, callback);
    removers.push(() => node.removeEventListener?.(event, callback));
  };
  const suspend = () => {
    suspended = true;
    cancel();
  };
  const resume = () => {
    suspended = false;
    schedule();
  };
  const Observer = view.ResizeObserver ?? globalThis.ResizeObserver,
    observer = typeof Observer === 'function' ? new Observer(schedule) : null;
  for (const rail of rails) {
    listen(rail, 'focusin', schedule);
    listen(rail, 'focusout', cancel);
    observer?.observe(rail);
  }
  listen(view, 'resize', schedule);
  listen(view, 'blur', suspend);
  listen(view, 'focus', resume);
  listen(doc, 'visibilitychange', () => (doc.hidden ? suspend() : resume()));
  listen(view, 'pageshow', resume);
  const destroy = () => {
    if (destroyed) return;
    destroyed = true;
    cancel();
    observer?.disconnect();
    for (const remove of removers.splice(0)) remove();
  };
  listen(view, 'pagehide', (event) => (event.persisted ? suspend() : destroy()));
  return { destroy };
}

/** Clear the known chapter section before its outer dialog measures focus.
 * This synchronous preparation has no listeners, RAF or focus/selection writes. */
export function prepareChapterFocus(
  focused,
  { container, document: doc = focused?.ownerDocument } = {},
) {
  if (
    !container?.open ||
    !doc ||
    doc.hidden ||
    doc.hasFocus?.() === false ||
    doc.activeElement !== focused ||
    !focused?.isConnected ||
    focused.disabled ||
    !container.contains(focused) ||
    focused.closest('[hidden],[inert],[aria-hidden="true"]') ||
    !focused.getClientRects().length
  )
    return false;
  const section = focused.closest('.mission-picker-chapter-section'),
    details = focused.closest('details'),
    summary = details?.querySelector('summary');
  if (
    !section ||
    section.closest('dialog') !== container ||
    !section.getClientRects().length ||
    (details && !details.open && focused !== summary && !summary?.contains(focused))
  )
    return false;
  const style = doc.defaultView?.getComputedStyle(section);
  if (style?.overflowY !== 'auto' && style?.overflowY !== 'scroll') return false;
  const box = section.getBoundingClientRect(),
    target = focused.getBoundingClientRect(),
    values = [
      box.top,
      section.clientTop,
      section.clientHeight,
      section.scrollHeight,
      section.scrollTop,
      target.top,
      target.bottom,
    ];
  if (
    !values.every(Number.isFinite) ||
    section.clientHeight <= 0 ||
    section.scrollHeight <= section.clientHeight ||
    target.bottom <= target.top
  )
    return false;
  const top = box.top + section.clientTop + 8,
    bottom = box.top + section.clientTop + section.clientHeight - 8;
  if (bottom <= top) return false;
  const delta =
      target.bottom - target.top > bottom - top || target.top < top
        ? target.top - top
        : target.bottom > bottom
          ? target.bottom - bottom
          : 0,
    next = Math.max(
      0,
      Math.min(section.scrollHeight - section.clientHeight, section.scrollTop + delta),
    );
  if (next === section.scrollTop) return false;
  section.scrollTop = next;
  return true;
}
