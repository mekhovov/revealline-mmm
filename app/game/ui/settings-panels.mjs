// Browser key identities must not depend on the language used at module startup.
const TAB_KEYS = new Set(['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Home', 'End']);
const panelOwners = new WeakMap();

/** First Back from a compact settings section returns to its category list. */
export function settingsPanelBack(root) {
  const settings = root?.classList?.contains('native-settings')
    ? root
    : root?.querySelector?.('.native-settings');
  if (
    !settings ||
    settings.closest('[hidden],[inert],[aria-hidden="true"]') ||
    !settings.getClientRects().length
  )
    return false;
  return panelOwners.get(settings)?.back() === true;
}

/** A nested tool may close after its Settings parent changed responsive layout. */
export function restoreSettingsPanelFocus(root, opener) {
  const settings = root?.classList?.contains('native-settings')
    ? root
    : root?.querySelector?.('.native-settings');
  if (
    !settings ||
    settings.closest('[hidden],[inert],[aria-hidden="true"]') ||
    !settings.getClientRects().length
  )
    return false;
  return panelOwners.get(settings)?.restoreFocus(opener) === true;
}
const owns = (root, doc, list, { tab, panel }) =>
  root?.ownerDocument === doc &&
  doc?.contains(root) &&
  root.contains(list) &&
  list.contains(tab) &&
  tab.closest('.field-kit-settings-tabs') === list &&
  tab.ownerDocument === doc &&
  !!tab.id &&
  panel?.ownerDocument === doc &&
  panel !== root &&
  root.contains(panel) &&
  !panel.contains(list) &&
  doc.getElementById(tab.getAttribute('aria-controls')) === panel;
const enabled = ({ tab }) =>
  !tab.disabled && !tab.hidden && tab.getAttribute('aria-disabled') !== 'true';

/** Document-level menu adapters yield these keys to the tab's native listener. */
export function settingsTabOwnsKey(event, root) {
  if (
    !TAB_KEYS.has(event?.key) ||
    event.defaultPrevented ||
    event.ctrlKey ||
    event.metaKey ||
    event.altKey ||
    event.shiftKey
  )
    return false;
  const tab = event.target?.closest?.('[role="tab"]'),
    doc = root?.ownerDocument,
    list = root?.querySelector?.('.field-kit-settings-tabs'),
    panel = tab && doc?.getElementById(tab.getAttribute('aria-controls')),
    record = { tab, panel };
  const vertical = list?.getAttribute('aria-orientation') === 'vertical';
  if (
    (vertical && ['ArrowLeft', 'ArrowRight'].includes(event.key)) ||
    (!vertical && ['ArrowUp', 'ArrowDown'].includes(event.key))
  )
    return false;
  return !!(
    tab &&
    list &&
    owns(root, doc, list, record) &&
    enabled(record) &&
    !tab.closest('[hidden],[inert],[aria-hidden="true"]') &&
    tab.getClientRects().length &&
    doc.defaultView?.getComputedStyle(tab)?.visibility !== 'hidden'
  );
}

/** Category presentation only. Hosts retain all preference, input and save ownership. */
export function attachSettingsPanels({
  root,
  document: doc = globalThis.document,
  beforeSelect = () => false,
  onPresentationChange = () => {},
} = {}) {
  const list = root?.querySelector?.('.field-kit-settings-tabs'),
    records = [...(list?.querySelectorAll('[role="tab"]') ?? [])].map((tab) => ({
      tab,
      panel: doc?.getElementById(tab.getAttribute('aria-controls')),
    })),
    removers = [];
  let destroyed = false,
    current = null,
    generation = 0;
  const compact = () =>
    root?.classList?.contains('native-settings') &&
    (doc.defaultView?.innerWidth ?? doc.documentElement?.clientWidth ?? Infinity) <= 700;
  let previousCompact = compact();
  function view(name) {
    if (
      !root?.classList?.contains('native-settings') ||
      root.getAttribute('data-settings-view') === name
    )
      return false;
    root.setAttribute('data-settings-view', name);
    return true;
  }
  const owned = (record) => !destroyed && owns(root, doc, list, record);
  const available = () => records.filter((record) => owned(record) && enabled(record));
  function paint(next) {
    for (const record of records.filter(owned)) {
      const selected = record === next;
      record.tab.setAttribute('aria-selected', String(selected));
      record.tab.setAttribute('tabindex', selected ? '0' : '-1');
      record.panel.hidden = !selected;
      record.panel.inert = !selected;
    }
    current = next;
  }
  function select(id, { focus = false, drill = false } = {}) {
    const next = available().find(({ tab }) => tab.id === id);
    if (!next) return false;
    const ticket = ++generation,
      returnFocus = beforeSelect(next.tab) === true;
    // A host hook may retire this surface, disable the target or start a newer selection.
    if (ticket !== generation || !owned(next) || !enabled(next)) return false;
    const selectionChanged = current !== next;
    paint(next);
    if (drill && compact()) {
      const viewChanged = view('panel');
      if (selectionChanged || viewChanged) onPresentationChange();
      if (ticket !== generation || !owned(next) || !enabled(next) || current !== next) return false;
      if (!focusPanel()) next.panel.focus?.();
      return true;
    }
    if (selectionChanged) onPresentationChange();
    if (ticket !== generation || !owned(next) || !enabled(next) || current !== next) return false;
    if (focus || returnFocus) next.tab.focus();
    return true;
  }
  const initial = available();
  if (initial.length)
    paint(initial.find(({ tab }) => tab.getAttribute('aria-selected') === 'true') || initial[0]);
  view('categories');
  const back = () => {
    if (!destroyed && compact() && root.getAttribute('data-settings-view') === 'panel') {
      const ticket = ++generation;
      view('categories');
      onPresentationChange();
      if (ticket === generation && !destroyed) current?.tab.focus();
      return true;
    }
    return false;
  };
  const focusable = (element) =>
    element?.isConnected &&
    !element.disabled &&
    element.getAttribute('aria-disabled') !== 'true' &&
    element.tabIndex >= 0 &&
    !element.closest('[hidden],[inert],[aria-hidden="true"]') &&
    element.getClientRects().length &&
    doc.defaultView?.getComputedStyle(element)?.visibility !== 'hidden';
  const restoreFocus = (opener) => {
    if (!current || !owned(current) || !enabled(current)) return false;
    const ticket = ++generation;
    // Reveal only the still-selected category. A retired/hidden control must
    // not change categories or be made available by closing a child tool.
    if (
      current.panel.contains(opener) &&
      !opener.disabled &&
      !opener.closest('[hidden],[inert],[aria-hidden="true"]')
    ) {
      if (compact() && view('panel')) onPresentationChange();
      if (ticket !== generation || destroyed || !current || !owned(current) || !enabled(current))
        return false;
      if (focusable(opener)) {
        opener.focus({ preventScroll: true });
        if (compact()) opener.scrollIntoView?.({ block: 'nearest', inline: 'nearest' });
        return true;
      }
    }
    if (view('categories')) onPresentationChange();
    if (ticket !== generation || destroyed || !current || !owned(current) || !enabled(current))
      return false;
    if (!focusable(current.tab)) return false;
    current.tab.focus({ preventScroll: true });
    if (compact()) current.tab.scrollIntoView?.({ block: 'nearest', inline: 'nearest' });
    return true;
  };
  if (root) panelOwners.set(root, { back, restoreFocus });
  const cancel = (event) => {
    if (back()) {
      event.preventDefault();
      event.stopPropagation();
      // Hosts may close this same dialog from their own cancel listener.
      // The category Back consumes the event before that sibling lifecycle.
      event.stopImmediatePropagation?.();
    }
  };
  root?.addEventListener('cancel', cancel);
  const backClick = (event) => {
    const button = event.target?.closest?.(
      '#race-options-back,#coop-settings-close,[data-close="settings-dialog"],[data-settings-back]',
    );
    if (button && root.contains(button) && back()) {
      event.preventDefault();
      event.stopPropagation();
      event.stopImmediatePropagation?.();
    }
  };
  root?.addEventListener('click', backClick, true);
  const resize = () => {
    if (destroyed) return;
    // CSS can hide Data at the breakpoint without changing the selected panel
    // or view attribute. That owner change does not depend on current focus.
    const nextCompact = compact(),
      breakpointChanged = nextCompact !== previousCompact;
    previousCompact = nextCompact;
    const viewChanged = !root?.contains(doc.activeElement)
      ? false
      : current?.panel.contains(doc.activeElement)
        ? view('panel')
        : list?.contains(doc.activeElement)
          ? view('categories')
          : false;
    if (breakpointChanged || (nextCompact && viewChanged)) {
      generation++;
      onPresentationChange();
    }
  };
  doc.defaultView?.addEventListener?.('resize', resize);
  function focusPanel() {
    if (!current || !owned(current) || !enabled(current)) return false;
    const target = [
      ...current.panel.querySelectorAll(
        'button,a[href],select,input:not([type="hidden"]),textarea,summary,[tabindex]',
      ),
    ].find(
      (element) =>
        !element.disabled &&
        element.tabIndex >= 0 &&
        !element.closest('[hidden],[inert],[aria-hidden="true"]') &&
        element.getClientRects().length,
    );
    if (!target) return false;
    target.focus();
    target.scrollIntoView?.({ block: 'nearest', inline: 'nearest' });
    return true;
  }
  for (const record of records) {
    const { tab } = record;
    const click = () => select(tab.id, { drill: true });
    const keydown = (event) => {
      if (!owned(record) || !settingsTabOwnsKey(event, root)) return;
      const tabs = available(),
        index = tabs.indexOf(record),
        direction = ['ArrowRight', 'ArrowDown'].includes(event.key)
          ? 1
          : ['ArrowLeft', 'ArrowUp'].includes(event.key)
            ? -1
            : 0,
        next =
          event.key === 'Home'
            ? tabs[0]
            : event.key === 'End'
              ? tabs.at(-1)
              : direction
                ? tabs[(index + direction + tabs.length) % tabs.length]
                : null;
      if (!next) return;
      event.preventDefault();
      event.stopPropagation();
      select(next.tab.id, { focus: true });
    };
    tab.addEventListener('click', click);
    tab.addEventListener('keydown', keydown);
    removers.push(() => {
      tab.removeEventListener('click', click);
      tab.removeEventListener('keydown', keydown);
    });
  }
  return Object.freeze({
    select,
    selected: () => (current && owned(current) ? current.tab.id : null),
    primary: () => (current && owned(current) ? current.tab : null),
    panel: () => (current && owned(current) ? current.panel : null),
    focusCategories() {
      if (!current || !owned(current) || !enabled(current)) return false;
      const ticket = ++generation;
      if (view('categories')) onPresentationChange();
      if (ticket !== generation || destroyed || !current || !owned(current) || !enabled(current))
        return false;
      current.tab.focus();
      return true;
    },
    focusPanel() {
      const ticket = ++generation;
      if (view('panel')) onPresentationChange();
      return ticket === generation && !destroyed && focusPanel();
    },
    back,
    destroy() {
      if (destroyed) return;
      destroyed = true;
      generation++;
      if (root) panelOwners.delete(root);
      root?.removeEventListener('cancel', cancel);
      root?.removeEventListener('click', backClick, true);
      doc.defaultView?.removeEventListener?.('resize', resize);
      removers.forEach((remove) => remove());
      onPresentationChange();
    },
  });
}
