/** Keep the current form control clear of a modal's measured sticky regions. */
export function attachFocusClearance({
  container,
  heading,
  footer,
  includeControlLabel = false,
  prepareTarget = null,
  document: doc = globalThis.document,
}) {
  const view = doc.defaultView ?? globalThis;
  let disposed = false,
    queued = false;
  const visible = (node) => node && !node.hidden && node.getClientRects().length > 0;
  const update = () => {
    if (disposed || !container.open || doc.hidden || doc.hasFocus?.() === false) return;
    let preparedTarget = null;
    if (typeof prepareTarget === 'function') {
      const candidate = doc.activeElement;
      if (
        candidate &&
        container.contains(candidate) &&
        !heading?.contains(candidate) &&
        !footer?.contains(candidate) &&
        !candidate.disabled &&
        visible(candidate)
      ) {
        preparedTarget = candidate;
        // A host may reveal a known inner scrollport before these outer bounds.
        // Other consumers retain the original padding and label-fit sequence.
        prepareTarget(candidate);
        if (disposed || !container.open || doc.hidden || doc.hasFocus?.() === false) return;
      }
    }
    const box = container.getBoundingClientRect(),
      // Overflow clips inside the border, not at the bounding rectangle.
      // Minimal non-native surfaces may not expose client geometry.
      hasClientBox =
        Number.isFinite(container.clientTop) && Number.isFinite(container.clientHeight),
      viewportTop = hasClientBox ? box.top + container.clientTop : box.top,
      viewportBottom = hasClientBox ? viewportTop + container.clientHeight : box.bottom,
      top =
        Math.max(
          viewportTop,
          visible(heading) ? heading.getBoundingClientRect().bottom : viewportTop,
        ) + 8,
      bottom =
        Math.min(
          viewportBottom,
          visible(footer) ? footer.getBoundingClientRect().top : viewportBottom,
        ) - 8;
    container.style.scrollPaddingBlockStart = `${Math.max(0, top - viewportTop)}px`;
    container.style.scrollPaddingBlockEnd = `${Math.max(0, viewportBottom - bottom)}px`;
    const focused = doc.activeElement;
    if (
      bottom <= top ||
      (preparedTarget !== null && focused !== preparedTarget) ||
      !focused ||
      !container.contains(focused) ||
      heading?.contains(focused) ||
      footer?.contains(focused) ||
      focused.disabled ||
      !visible(focused)
    )
      return;
    const label = includeControlLabel ? focused.closest?.('label') : null;
    const labelBox =
      label && container.contains(label) && visible(label) ? label.getBoundingClientRect() : null;
    const target =
      labelBox && labelBox.bottom - labelBox.top <= bottom - top
        ? labelBox
        : focused.getBoundingClientRect();
    if (target.top < top) container.scrollTop += target.top - top;
    else if (target.bottom > bottom)
      container.scrollTop += Math.min(target.bottom - bottom, target.top - top);
  };
  const schedule = () => {
    if (disposed || queued || typeof view.requestAnimationFrame !== 'function') return;
    queued = true;
    view.requestAnimationFrame(() => {
      queued = false;
      update();
    });
  };
  const Observer = view.ResizeObserver ?? globalThis.ResizeObserver,
    observer = typeof Observer === 'function' ? new Observer(schedule) : null;
  for (const node of [heading, footer]) if (node) observer?.observe(node);
  container.addEventListener('focusin', schedule);
  view.addEventListener?.('resize', schedule);
  return {
    refresh: schedule,
    destroy() {
      disposed = true;
      observer?.disconnect();
      container.removeEventListener('focusin', schedule);
      view.removeEventListener?.('resize', schedule);
      container.style.scrollPaddingBlockStart = '0px';
      container.style.scrollPaddingBlockEnd = '0px';
    },
  };
}
