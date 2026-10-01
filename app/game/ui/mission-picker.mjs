import { contentText } from '../i18n/content.mjs';
import { t, localizedText, localizedAttribute, localizedMessage } from '../i18n/index.mjs';
import { captureOperationFocus } from './operation-focus.mjs';
import { attachMissionGallery } from './mission-gallery.mjs';
import { attachChapterFocusClearance } from './chapter-focus-clearance.mjs';

const attached = new WeakMap();

/** Reorganize the existing mission controls. Native selects remain the host boundary. */
export function attachMissionPicker({
  document: doc = globalThis.document,
  archivedIds = [],
} = {}) {
  if (attached.has(doc)) return attached.get(doc);
  const deck = doc.querySelector('.flight-deck'),
    pack = doc.getElementById('pack-select'),
    levels = doc.getElementById('level-select'),
    missions = doc.getElementById('missions'),
    status = doc.getElementById('content-select-status');
  if (!deck || !pack || !levels || !missions || !status) return null;
  // The host supplies IDs from its validated archive catalog. Names and
  // installed/custom pack identities never infer an archive classification.
  const olderIds = new Set(archivedIds);
  const original = [...deck.children];
  const heading = original.find((node) => node.classList.contains('deck-heading')),
    campaignHeading = original.find((node) => node.classList.contains('section-line')),
    continued = doc.getElementById('continue-saved-note'),
    brief = doc.getElementById('mission-brief');
  const node = (tag, id, className, text) => {
    const element = doc.createElement(tag);
    if (id) element.id = id;
    if (className) element.className = className;
    if (text !== undefined) localizedText(element, () => text);
    return element;
  };
  const stage = node('div', 'mission-picker-stage', 'mission-picker-stage'),
    chapters = node('section', 'mission-picker-chapters', 'mission-picker-chapter-section'),
    title = node('h3', 'mission-picker-title', '', localizedMessage('interface:chooseAChapter')),
    cards = node('div', 'mission-picker-cards', 'mission-picker-cards'),
    older = node('details', 'mission-picker-older', 'mission-picker-older'),
    olderSummary = node(
      'summary',
      'mission-picker-older-summary',
      '',
      localizedMessage('interface:olderChapters'),
    ),
    olderNote = node(
      'p',
      null,
      'mission-picker-older-note',
      localizedMessage('interface:earlierFirstLightEditionsKeepTheirOriginalRulesAndProgress'),
    ),
    olderCards = node('div', 'mission-picker-older-cards', 'mission-picker-cards'),
    missionArea = node('section', 'mission-picker-missions', 'mission-picker-missions'),
    setup = node('details', 'mission-picker-setup', 'mission-picker-setup'),
    summary = node('summary', null, '', localizedMessage('interface:flightSetup')),
    fields = node('div', null, 'mission-picker-setup-fields');
  stage.setAttribute('data-course-hide', '');
  chapters.setAttribute('aria-labelledby', title.id);
  cards.setAttribute('role', 'group');
  cards.setAttribute('aria-labelledby', title.id);
  olderSummary.setAttribute('aria-controls', olderCards.id);
  olderCards.setAttribute('role', 'group');
  olderCards.setAttribute('aria-labelledby', olderSummary.id);
  localizedAttribute(missionArea, 'aria-label', () => t('interface:missionsInThisChapter'));
  older.append(olderSummary, olderNote, olderCards);
  chapters.append(title, cards, older);
  missionArea.append(status);
  if (campaignHeading) missionArea.append(campaignHeading);
  missionArea.append(missions);
  stage.append(chapters, missionArea);
  setup.append(summary, fields);
  const keep = new Set([heading, continued, campaignHeading, brief, status, missions]);
  for (const child of original) if (!keep.has(child)) fields.append(child);
  deck.append(...[heading, continued, stage, brief, setup].filter(Boolean));
  deck.classList.add('mission-picker');
  const gallery = attachMissionGallery({ document: doc, missions }),
    chapterFocus = attachChapterFocusClearance({ document: doc, rails: [cards, olderCards] });

  const rows = new Map(),
    removers = [];
  let destroyed = false,
    dispatching = false,
    requested = null,
    focusOwner = null,
    scheduled = false;
  const listen = (element, type, callback) => {
    element.addEventListener(type, callback);
    removers.push(() => element.removeEventListener(type, callback));
  };
  const setAttribute = (element, key, value) => {
    if (element.getAttribute(key) !== value) element.setAttribute(key, value);
  };
  const focusMission = () => {
    const target =
      [...missions.querySelectorAll('button')].find(
        (button) => button.classList.contains('selected') && !button.disabled,
      ) || missions.querySelector('button:not(:disabled)');
    target?.focus();
    target?.scrollIntoView({ block: 'nearest', inline: 'nearest' });
  };
  function choose(value, button) {
    if (destroyed || dispatching || pack.disabled || pack.hidden || !button.isConnected) return;
    const option = [...pack.options].find((item) => item.value === value);
    if (
      !option ||
      option.disabled ||
      option.parentElement?.disabled ||
      value.startsWith('campaign:')
    )
      return;
    if (pack.value === value) return focusMission();
    focusOwner?.lease.cancel();
    focusOwner = {
      button,
      value,
      busy: false,
      lease: captureOperationFocus(button, { document: doc }),
    };
    requested = value;
    dispatching = true;
    try {
      pack.value = value;
      const EventType = doc.defaultView?.Event || Event;
      pack.dispatchEvent(new EventType('change', { bubbles: true }));
    } finally {
      dispatching = false;
      sync();
    }
  }
  function sync() {
    if (destroyed) return;
    gallery?.sync();
    const disabled = pack.disabled || pack.hidden;
    if (focusOwner && pack.disabled) focusOwner.busy = true;
    if (!disabled) requested = null;
    setAttribute(chapters, 'aria-busy', String(pack.disabled && !pack.hidden));
    chapters.hidden = pack.hidden || !!pack.closest('[hidden]');
    setAttribute(stage, 'data-status', status.dataset.kind === 'error' ? 'error' : 'normal');
    const options = [...pack.options],
      wanted = new Set(options.map((option) => option.value));
    const order = [],
      archivedOrder = [];
    for (const option of options) {
      let row = rows.get(option.value);
      if (!row) {
        const button = node('button', null, 'mission-picker-card'),
          label = node('span', null, 'mission-picker-card-label'),
          state = node('span', null, 'mission-picker-card-state');
        button.type = 'button';
        button.setAttribute('data-pack', option.value);
        button.setAttribute('aria-describedby', status.id);
        button.append(label, state);
        const activate = () => choose(option.value, button);
        button.addEventListener('click', activate);
        row = { button, label, state, remove: () => button.removeEventListener('click', activate) };
        rows.set(option.value, row);
      }
      const selected = option.value === pack.value,
        currentActivity = option.value.startsWith('campaign:'),
        label = (option.label || option.textContent || option.value || 'Base game').replace(
          new RegExp(
            ' · (?:' +
              t('common:status.installed') +
              '|' +
              t('common:status.installOnSelect') +
              ')$',
            'u',
          ),
          '',
        ),
        message =
          disabled && requested === option.value
            ? t('interface:openingChapter')
            : selected
              ? t('interface:currentChapter')
              : t('interface:chooseChapter');
      if (row.label.textContent !== label) localizedText(contentText(row, 'label'), () => label);
      if (row.state.textContent !== message) localizedText(row.state, () => message);
      row.button.disabled =
        disabled || option.disabled || !!option.parentElement?.disabled || currentActivity;
      setAttribute(row.button, 'aria-pressed', String(selected));
      (olderIds.has(option.value) ? archivedOrder : order).push(row.button);
    }
    for (const [value, row] of rows)
      if (!wanted.has(value)) {
        row.remove();
        row.button.remove();
        rows.delete(value);
      }
    // Keep native button identity and focus when options are rebuilt in place.
    for (const [container, buttons] of [
      [cards, order],
      [olderCards, archivedOrder],
    ]) {
      if (
        buttons.length !== container.children.length ||
        buttons.some((button, index) => container.children[index] !== button)
      ) {
        const focused = container.contains(doc.activeElement) ? doc.activeElement : null;
        container.append(...buttons);
        if (focused?.isConnected && !focused.disabled && (container !== olderCards || older.open))
          focused.focus({ preventScroll: true });
      }
    }
    older.hidden = archivedOrder.length === 0;
    const olderLabel = `Older chapters (${archivedOrder.length})`;
    if (olderSummary.textContent !== olderLabel) localizedText(olderSummary, () => olderLabel);
    if (focusOwner && !disabled) {
      const owner = focusOwner;
      focusOwner = null;
      if (owner.busy && rows.get(owner.value)?.button === owner.button) owner.lease.restore();
      else owner.lease.cancel();
    }
  }
  function schedule() {
    if (destroyed || scheduled) return;
    scheduled = true;
    queueMicrotask(() => {
      scheduled = false;
      sync();
    });
  }
  const Observer = doc.defaultView?.MutationObserver ?? globalThis.MutationObserver;
  const observer = typeof Observer === 'function' ? new Observer(schedule) : null;
  // Observe host-owned source nodes only, never the mirrored card attributes.
  for (const element of [pack, levels, status])
    observer?.observe(element, {
      subtree: true,
      childList: true,
      characterData: true,
      attributes: true,
    });
  const selectionChanged = () => {
    if (!dispatching) {
      focusOwner?.lease.cancel();
      focusOwner = null;
    }
    schedule();
  };
  listen(pack, 'change', selectionChanged);
  listen(levels, 'change', selectionChanged);
  listen(older, 'toggle', () => {
    // A native summary click already owns focus. Also handle deliberate
    // programmatic collapse without leaving focus on a now-hidden card.
    if (!destroyed && !older.open && olderCards.contains(doc.activeElement)) olderSummary.focus();
  });
  sync();
  const api = Object.freeze({
    sync,
    focusSelectedChapter() {
      sync();
      if (destroyed) return false;
      const target = rows.get(pack.value)?.button;
      const available =
        target && !target.disabled
          ? target
          : [...rows.values()].find((row) => !row.button.disabled)?.button;
      if (!available) return false;
      if (olderCards.contains(available)) older.open = true;
      available.focus();
      available.scrollIntoView({ block: 'nearest', inline: 'nearest' });
      return true;
    },
    revealSetup() {
      if (!destroyed) setup.open = true;
    },
    destroy() {
      if (destroyed) return;
      destroyed = true;
      focusOwner?.lease.cancel();
      focusOwner = null;
      observer?.disconnect();
      for (const remove of removers) remove();
      for (const row of rows.values()) row.remove();
      chapterFocus.destroy();
      gallery?.destroy();
      deck.append(...original);
      stage.remove();
      setup.remove();
      deck.classList.remove('mission-picker');
      attached.delete(doc);
    },
  });
  attached.set(doc, api);
  return api;
}
