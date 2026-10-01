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
  function view(name) {
    if (root?.classList?.contains('native-settings')) root.setAttribute('data-settings-view', name);
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
    paint(next);
    if (drill && compact()) {
      view('panel');
      if (!focusPanel()) next.panel.focus?.();
      return true;
    }
    if (focus || returnFocus) next.tab.focus();
    return true;
  }
  const initial = available();
  if (initial.length)
    paint(initial.find(({ tab }) => tab.getAttribute('aria-selected') === 'true') || initial[0]);
  view('categories');
  const back = () => {
    if (!destroyed && compact() && root.getAttribute('data-settings-view') === 'panel') {
      view('categories');
      current?.tab.focus();
      return true;
    }
    return false;
  };
  if (root) panelOwners.set(root, { back });
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
    if (destroyed || !root?.contains(doc.activeElement)) return;
    if (current?.panel.contains(doc.activeElement)) view('panel');
    else if (list?.contains(doc.activeElement)) view('categories');
  };
  doc.defaultView?.addEventListener?.('resize', resize);
  function focusPanel() {
    if (!current || !owned(current)) return false;
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
      view('categories');
      current.tab.focus();
      return true;
    },
    focusPanel() {
      view('panel');
      return focusPanel();
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
    },
  });
}
