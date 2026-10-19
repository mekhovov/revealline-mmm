/** Remember native dialog opening order. DOM order is not top-layer order. */
export function attachModalNavigation({
  document: doc = globalThis.document,
  getFallbackFocus = () => null,
} = {}) {
  let stack = [],
    closing = new WeakMap(),
    openingSequence = 0,
    destroyed = false,
    emptyKnown = false,
    previousFocus = doc.activeElement;
  const isDialog = (node) => node?.tagName === 'DIALOG';
  const isOpen = (node) => isDialog(node) && node.isConnected && node.open;
  const containsDialog = (nodes) => {
    for (const node of nodes) if (isDialog(node) || node.querySelector?.('dialog')) return true;
    return false;
  };
  const focusedDialog = () => doc.activeElement?.closest?.('dialog[open]') ?? null;
  const remove = (dialog) => {
    const entry = stack.find((item) => item.dialog === dialog);
    stack = stack.filter((item) => item !== entry);
    return entry;
  };
  const opened = (dialog, origin = previousFocus, keepOrigin = false) => {
    emptyKnown = false;
    closing.delete(dialog);
    const old = remove(dialog);
    stack.push({
      dialog,
      opening: ++openingSequence,
      origin: keepOrigin && old ? old.origin : dialog.contains(origin) ? null : origin,
    });
  };
  const records = (changes) => {
    if (destroyed) return;
    for (const change of changes) {
      if (change.type === 'childList') {
        // An already-open dialog can arrive inside an inserted subtree without
        // an observed open attribute change. Removal can also leave one of
        // several pre-existing dialogs as the only unambiguous fallback.
        if (
          emptyKnown &&
          (containsDialog(change.addedNodes) || containsDialog(change.removedNodes))
        )
          emptyKnown = false;
        continue;
      }
      if (!isDialog(change.target) || change.attributeName !== 'open') continue;
      emptyKnown = false;
      // takeRecords preserves mutation order even if several dialogs opened in one task.
      if (change.oldValue === null && isOpen(change.target)) {
        opened(change.target, previousFocus, true);
      }
    }
  };
  const Observer = doc.defaultView?.MutationObserver ?? globalThis.MutationObserver;
  const observer = typeof Observer === 'function' ? new Observer(records) : null;
  observer?.observe(doc, {
    subtree: true,
    childList: true,
    attributes: true,
    attributeFilter: ['open'],
    attributeOldValue: true,
  });
  function topDialog() {
    if (destroyed) return null;
    if (observer) records(observer.takeRecords());
    stack = stack.filter((entry) => {
      if (isOpen(entry.dialog)) return true;
      // Native close events are queued. Scope can change before that event,
      // but its opener must survive until focus restoration gets a turn.
      if (entry.dialog.isConnected) closing.set(entry.dialog, entry);
      return false;
    });
    const focused = focusedDialog();
    if (isOpen(focused) && !stack.some((entry) => entry.dialog === focused)) opened(focused, null);
    if (!stack.length && (!emptyKnown || !observer)) {
      const open = [...doc.querySelectorAll('dialog[open]')].filter(isOpen);
      // Only cache absence when observation can invalidate it synchronously
      // through takeRecords. Unsupported hosts retain the polling fallback.
      emptyKnown = open.length === 0;
      // Only a single pre-existing dialog is unambiguous without an observed open.
      if (open.length === 1) opened(open[0], null);
    }
    return stack.at(-1)?.dialog ?? null;
  }
  function hasOpenDialog() {
    if (destroyed) return false;
    const top = topDialog();
    // Multiple pre-existing dialogs have no known top-layer order. Their
    // presence still blocks gameplay even when topDialog deliberately returns null.
    return Boolean(top) || !emptyKnown;
  }
  const beforeToggle = (event) => {
    if (isDialog(event.target) && event.newState === 'open' && !event.defaultPrevented)
      opened(event.target, doc.activeElement);
  };
  const focus = (event) => {
    const dialog = event.target?.closest?.('dialog[open]');
    if (isOpen(dialog) && !stack.some((entry) => entry.dialog === dialog)) opened(dialog);
    previousFocus = event.target;
  };
  const available = (element) => {
    if (
      !element?.isConnected ||
      element.disabled ||
      element.closest('[hidden],[inert],[aria-hidden="true"]')
    )
      return false;
    for (let node = element; node && node !== doc; node = node.parentElement) {
      if (isDialog(node) && !node.open) return false;
      const style = doc.defaultView?.getComputedStyle?.(node);
      if (style?.display === 'none' || style?.visibility === 'hidden') return false;
    }
    return typeof element.getClientRects !== 'function' || element.getClientRects().length > 0;
  };
  const close = (event) => {
    if (!isDialog(event.target) || event.target.open) return;
    emptyKnown = false;
    const entry = remove(event.target) ?? closing.get(event.target);
    closing.delete(event.target);
    const wasTop =
      entry && !stack.some((item) => isOpen(item.dialog) && item.opening > entry.opening);
    if (!wasTop || !entry?.origin || doc.hidden || doc.hasFocus?.() === false) return;
    queueMicrotask(() => {
      if (destroyed || event.target.open || doc.hidden || doc.hasFocus?.() === false) return;
      const top = topDialog();
      const eligible = (element) =>
        available(element) && (top ? top.contains(element) : !element.closest('dialog'));
      // Respect an explicit replacement focus installed by another close handler.
      if (
        doc.activeElement !== doc.body &&
        doc.activeElement !== event.target &&
        eligible(doc.activeElement)
      )
        return;
      let origin = entry.origin;
      const focusBeforeFallback = doc.activeElement;
      if (!eligible(origin)) {
        try {
          origin = getFallbackFocus({ dialog: event.target, origin, top });
        } catch {
          return;
        }
      }
      if (
        destroyed ||
        event.target.open ||
        doc.hidden ||
        doc.hasFocus?.() === false ||
        topDialog() !== top ||
        (doc.activeElement !== focusBeforeFallback && eligible(doc.activeElement)) ||
        !eligible(origin)
      )
        return;
      origin.focus({ preventScroll: true });
    });
  };
  doc.addEventListener('beforetoggle', beforeToggle, true);
  doc.addEventListener('focusin', focus, true);
  doc.addEventListener('close', close, true);
  return {
    topDialog,
    hasOpenDialog,
    destroy() {
      if (destroyed) return;
      destroyed = true;
      observer?.disconnect();
      doc.removeEventListener('beforetoggle', beforeToggle, true);
      doc.removeEventListener('focusin', focus, true);
      doc.removeEventListener('close', close, true);
      stack = [];
      closing = new WeakMap();
    },
  };
}
