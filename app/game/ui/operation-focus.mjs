/** One operation may return focus only while its actual initiating control owns it. */
export function captureOperationFocus(
  opener,
  {
    document: doc = opener?.ownerDocument,
    owned = [],
    restoreTo = opener,
    resolveTarget = null,
    reveal = false,
  } = {},
) {
  const root = opener?.closest('dialog'),
    win = doc?.defaultView ?? globalThis.window,
    targets = new Set([opener, restoreTo, ...owned]),
    removers = [];
  let active = !!(
    opener &&
    doc?.activeElement === opener &&
    root?.open &&
    restoreTo?.isConnected &&
    restoreTo.closest('dialog') === root &&
    !doc.hidden &&
    doc.hasFocus?.() !== false
  );
  let restoring = false;
  const empty = (target) => !target || target === doc.body || target === doc.documentElement;
  const cancel = () => {
    active = false;
    for (const remove of removers.splice(0)) remove();
  };
  const listen = (node, event, callback) => {
    node?.addEventListener?.(event, callback, true);
    removers.push(() => node?.removeEventListener?.(event, callback, true));
  };
  if (active) {
    listen(doc, 'focusin', (event) => {
      if (!empty(event.target) && !targets.has(event.target)) cancel();
    });
    for (const type of ['pointerdown', 'keydown'])
      listen(doc, type, (event) => {
        if (![...targets].some((target) => target?.contains(event.target))) cancel();
      });
    listen(win, 'blur', (event) => {
      // Element blur is captured here too; only losing the page retires intent.
      if (event.target === win) cancel();
    });
    listen(win, 'pagehide', cancel);
    listen(doc, 'visibilitychange', () => {
      if (doc.hidden) cancel();
    });
    // Native dialog events are captured, including non-bubbling beforetoggle.
    // Closing and reopening the same dialog never resurrects an old operation.
    listen(doc, 'close', (event) => {
      if (event.target === root) cancel();
    });
    listen(doc, 'beforetoggle', (event) => {
      if (
        event.target?.tagName === 'DIALOG' &&
        (event.target === root || event.newState === 'open')
      )
        cancel();
    });
  }
  return Object.freeze({
    cancel,
    restore() {
      if (restoring) return false;
      if (reveal) restoring = true;
      try {
        let target = restoreTo;
        if (resolveTarget) {
          const focus = doc?.activeElement;
          if (
            !active ||
            !root.open ||
            doc.hidden ||
            doc.hasFocus?.() === false ||
            (!empty(focus) && !targets.has(focus))
          ) {
            cancel();
            return false;
          }
          try {
            // Only the owning adapter may resolve a logical successor after its
            // controls are rebuilt. Recheck ownership after this external call.
            target = resolveTarget();
          } catch {
            cancel();
            return false;
          }
        }
        const focus = doc?.activeElement,
          allowed =
            active &&
            root.open &&
            target?.isConnected &&
            target.closest('dialog') === root &&
            !target.disabled &&
            !target.closest('[hidden],[inert],dialog:not([open]),details:not([open])') &&
            !doc.hidden &&
            doc.hasFocus?.() !== false &&
            (empty(focus) || targets.has(focus)) &&
            active;
        if (reveal && allowed) {
          // Consume restoration once, but retain veto listeners through focus.
          // The resolved fallback may now receive this operation's own focusin.
          targets.add(target);
          const moved = focus !== target;
          if (moved) target.focus({ preventScroll: true });
          const stillCurrent = () =>
            active &&
            doc.activeElement === target &&
            root.open &&
            target.isConnected &&
            target.closest('dialog') === root &&
            !target.disabled &&
            !target.closest('[hidden],[inert],dialog:not([open]),details:not([open])') &&
            !doc.hidden &&
            doc.hasFocus?.() !== false &&
            active;
          if (stillCurrent()) {
            let resolved = target;
            if (resolveTarget) {
              try {
                resolved = resolveTarget();
              } catch {
                resolved = null;
              }
            }
            if (resolved === target && stillCurrent()) {
              cancel();
              // Content may grow above a stable, already-focused pager too.
              target.scrollIntoView?.({ block: 'nearest', inline: 'nearest', behavior: 'auto' });
            }
          }
          return moved && doc.activeElement === target;
        }
        cancel(); // Retire before an external focus handler can reenter the owner.
        if (!allowed || focus === target) return false;
        target.focus({ preventScroll: true });
        return doc.activeElement === target;
      } finally {
        if (reveal) cancel();
      }
    },
  });
}
