import { contentText } from '../i18n/content.mjs';
import { localizedText, onLocaleChange, t } from '../i18n/index.mjs';
import { menuGroupNeighbor } from './menu-navigation-groups.mjs';
import {
  createControllerFieldEditor,
  supportsControllerField,
} from './controller-field-editor.mjs';
import { settingsPanelBack } from './settings-panels.mjs';
const CONTROLS =
  'button,a[href],select,input:not([type="hidden"]),textarea,summary,[data-controller-editor]';
const DIRECTIONS = new Set(['up', 'right', 'down', 'left']);

/** Controller edges operate existing DOM controls; this adapter never polls a
 * device, changes game state, or bypasses a host's guarded Back operation. */
export function attachControllerNavigation({
  document: doc = globalThis.document,
  getScope = () => 'ui',
  getRoot = () => doc,
  getDefaultFocus = () => null,
  getControlLabels = () => ({
    directions: 'D-pad',
    confirm: t('common:controls.south'),
    back: t('common:controls.east'),
  }),
  getReadingPrompt = null,
  accept = () => true,
  onBack = () => {},
  onMenu = () => {},
  onHint = () => {},
  onReadingChange = () => {},
  onNativeInput = () => {},
  activateControl = (element) => element.click(),
  keyboard = false,
  ownsKeyboardEvent = () => false,
  onTabBoundary = () => false,
  nativeReadingScroll = false,
  resolveEditor = () => null,
  activateFileInput = null,
} = {}) {
  let scope = null,
    root = null,
    engaged = false,
    focused = null,
    editing = null,
    surfaceEditor = null,
    reading = null,
    localeReading = null,
    nativeScroll = null,
    readingInvalidated = false,
    confirmTransaction = null,
    destroyed = false,
    focusing = false;
  const listeners = [];
  let inputMode = null;
  const inputRoots = new Map(),
    inputHints = new WeakSet(),
    inputAttributes = ['data-menu-input', 'data-menu-confirm', 'data-menu-back'];
  function setMenuInput(mode, target = getRoot()) {
    if (destroyed || doc.hidden || doc.hasFocus?.() === false || !target?.setAttribute) return;
    inputMode = mode;
    if (!inputRoots.has(target))
      inputRoots.set(
        target,
        inputAttributes.map((attribute) => target.getAttribute(attribute)),
      );
    const labels = getControlLabels();
    // Input modality belongs to this navigator, including nested scopes. Keep
    // ancestors current so inherited caption selectors cannot show two devices.
    for (const ownedRoot of inputRoots.keys()) {
      ownedRoot.setAttribute('data-menu-input', mode);
      ownedRoot.setAttribute('data-menu-confirm', labels.confirm);
      ownedRoot.setAttribute('data-menu-back', labels.back);
    }
    for (const hint of target.querySelectorAll('[data-menu-controller-hint]')) {
      const render = () => {
        const current = getControlLabels();
        return `${current.confirm} · ${t('common:controls.confirm')} / ${current.back} · ${t('common:actions.back')}`;
      };
      if (!inputHints.has(hint)) {
        inputHints.add(hint);
        localizedText(hint, render);
      } else if (hint.textContent !== render()) localizedText(hint, render);
    }
  }
  const readingContent = new WeakMap();
  const listen = (type, fn) => {
    doc.addEventListener(type, fn, true);
    listeners.push(() => doc.removeEventListener(type, fn, true));
  };
  const hint = (message, metadata) => (metadata ? onHint(message, metadata) : onHint(message));
  const readingMessage = (message, owner) =>
    hint(message, { kind: 'reading', regionId: owner.regionId });
  function visible(element) {
    return visibleInScope(element, false);
  }
  function visibleInScope(element, allowDisabled) {
    if (
      !element ||
      !element.isConnected ||
      // :disabled includes inherited fieldset disabling (and its legend exception).
      (!allowDisabled && (element.disabled || element.matches(':disabled'))) ||
      !root?.contains(element)
    )
      return false;
    if (element.closest('[hidden],[inert],[aria-hidden="true"]')) return false;
    for (let parent = element; parent && parent !== doc; parent = parent.parentElement) {
      if (parent.tagName === 'DETAILS' && !parent.open) {
        const summary = parent.querySelector('summary');
        if (element !== summary && !summary?.contains(element)) return false;
      }
      const style = doc.defaultView?.getComputedStyle(parent);
      if (style && (style.display === 'none' || style.visibility === 'hidden')) return false;
    }
    return element.getClientRects().length > 0 && accept(element);
  }
  const controls = () => [...(root?.querySelectorAll(CONTROLS) || [])].filter(visible);
  function mark(element) {
    if (focused !== element) focused?.classList.remove('controller-focus');
    focused = element;
    focused?.classList.add('controller-focus');
  }
  function focus(element) {
    if (!visible(element)) return false;
    focusing = true;
    try {
      element.focus({ preventScroll: true });
      element.scrollIntoView({ block: 'nearest', inline: 'nearest', behavior: 'auto' });
    } finally {
      focusing = false;
    }
    mark(element);
    return true;
  }
  function cancelEdit(message = '') {
    if (!editing) return;
    editing.element.removeAttribute('data-controller-editing');
    editing.preview.remove();
    editing = null;
    if (message) hint(message);
  }
  function endSurfaceEditor({ commit = false, restoreFocus = false } = {}) {
    const owner = surfaceEditor;
    if (!owner) return;
    surfaceEditor = null;
    cancelConfirm();
    owner.element.removeAttribute('data-controller-editing');
    owner.adapter.exit({ commit });
    if (
      restoreFocus &&
      !destroyed &&
      getScope() === owner.scope &&
      getRoot() === owner.root &&
      !doc.hidden &&
      doc.hasFocus?.() !== false
    ) {
      if (!focus(owner.element)) ensureFocus();
    }
  }
  function beginSurfaceEditor(element, adapter = null) {
    const owner = { element, scope, root, adapter: null };
    owner.adapter =
      adapter ||
      createControllerFieldEditor({
        element,
        root,
        document: doc,
        label: label(element),
        activateControl,
        onFinish: (commit) => {
          if (surfaceEditor === owner) endSurfaceEditor({ commit, restoreFocus: true });
        },
      });
    if (
      !['enter', 'handle', 'isCurrent', 'exit'].every(
        (method) => typeof owner.adapter[method] === 'function',
      )
    )
      throw new TypeError('A controller editor needs enter, handle, isCurrent and exit methods.');
    cancelEdit();
    cancelReading();
    endSurfaceEditor();
    surfaceEditor = owner;
    element.setAttribute('data-controller-editing', 'true');
    if (owner.adapter.enter() === false && surfaceEditor === owner) endSurfaceEditor();
  }
  function handleSurfaceEditor(command) {
    const owner = surfaceEditor;
    if (!owner) return;
    const result = owner.adapter.handle(command);
    if (surfaceEditor === owner && (result === 'done' || result === 'cancel'))
      endSurfaceEditor({ commit: result === 'done', restoreFocus: true });
  }
  function cancelConfirm() {
    if (!confirmTransaction) return false;
    confirmTransaction.element?.removeAttribute?.('data-controller-pressed');
    confirmTransaction = null;
    return true;
  }
  const readingState = () =>
    reading ? { regionId: reading.regionId, label: reading.label } : null;
  function readingMetrics(region) {
    const { clientHeight, scrollHeight, scrollTop } = region;
    if (
      ![clientHeight, scrollHeight, scrollTop].every(Number.isFinite) ||
      clientHeight <= 0 ||
      scrollHeight < 0
    )
      return null;
    return {
      max: Math.max(0, scrollHeight - clientHeight),
      step: Math.min(48, Math.max(1, Math.floor(clientHeight / 2))),
    };
  }
  function cancelReading({ restoreFocus = false, message = '', invalidated = false } = {}) {
    nativeScroll = null;
    if (!reading) return false;
    const previous = reading;
    reading = null;
    previous.region.removeAttribute('data-controller-reading');
    if (focused === previous.region || focused === previous.exit) mark(null);
    readingInvalidated ||= invalidated;
    onReadingChange(null);
    if (message) readingMessage(message, previous);
    if (
      restoreFocus &&
      !destroyed &&
      getScope() === previous.scope &&
      getRoot() === previous.root
    ) {
      if (!focus(previous.origin)) ensureFocus();
    }
    return true;
  }
  function endReading({ restoreFocus = true } = {}) {
    return cancelReading({
      restoreFocus,
      message: t('interface:readingEndedChooseAnActionWhenReady'),
    });
  }
  function readingHint() {
    const scrollable = !!readingMetrics(reading.region)?.max;
    if (getReadingPrompt) return `${reading.label}: ${getReadingPrompt({ scrollable })}`;
    const labels = getControlLabels();
    return t('gameplay:orReturns', {
      value1: reading.label,
      value2: scrollable ? t('interface:upDownScroll') : t('interface:allTextIsVisible'),
      value3: labels.confirm,
      value4: labels.back,
    });
  }
  function readingCurrent(owner = reading) {
    return (
      owner &&
      visible(owner.region) &&
      owner.region.id === owner.regionId &&
      visible(owner.origin) &&
      (doc.activeElement === owner.region ||
        (keyboard && owner.exit && doc.activeElement === owner.exit && visible(owner.exit))) &&
      (owner.region.textContent === owner.text || localeReading === owner) &&
      owner.region.hasAttribute('data-game-reading') &&
      (owner.region.getAttribute('aria-label') || owner.region.getAttribute('aria-labelledby')) &&
      !(owner.region.tabIndex < 0) &&
      readingMetrics(owner.region) &&
      reading === owner
    );
  }
  function refreshReadingHint() {
    // A modality change can follow the current key's reading action. Republish
    // only its still-current text; do not sync, refocus or enter another reader.
    if (
      destroyed ||
      doc.hidden ||
      doc.hasFocus?.() === false ||
      scope !== getScope() ||
      root !== getRoot() ||
      !readingCurrent()
    )
      return false;
    const owner = reading;
    readingMessage(readingHint(), owner);
    return true;
  }
  listeners.push(
    onLocaleChange(
      () => {
        if (
          destroyed ||
          doc.hidden ||
          doc.hasFocus?.() === false ||
          scope !== getScope() ||
          root !== getRoot() ||
          !readingCurrent()
        )
          return void cancelReading({ invalidated: true });
        const owner = reading;
        localeReading = owner;
        return () => {
          try {
            if (
              destroyed ||
              doc.hidden ||
              doc.hasFocus?.() === false ||
              scope !== getScope() ||
              root !== getRoot() ||
              !readingCurrent(owner)
            )
              return;
            owner.text = owner.region.textContent;
            readingContent.set(owner.region, owner.text);
            if (owner.labelSource) owner.label = owner.labelSource();
            refreshReadingHint();
          } finally {
            localeReading = null;
          }
        };
      },
      { before: true },
    ),
  );
  function beginReading({ region, origin, label: name, getLabel = null, exit = null } = {}) {
    if (destroyed) return false;
    const labelSource = typeof getLabel === 'function' ? getLabel : null;
    sync();
    if (
      scope === 'flight' ||
      !visible(region) ||
      !region.id ||
      !region.hasAttribute('data-game-reading') ||
      !(region.getAttribute('aria-label') || region.getAttribute('aria-labelledby')) ||
      region.tabIndex < 0 ||
      !readingMetrics(region) ||
      !controls().includes(origin) ||
      origin === region ||
      (exit !== null &&
        (exit.tagName !== 'BUTTON' ||
          !visibleInScope(exit, true) ||
          exit === origin ||
          region.contains(exit))) ||
      typeof name !== 'string' ||
      !name.trim() ||
      name.length > 160
    )
      return false;
    if (
      reading?.region === region &&
      reading.origin === origin &&
      reading.label === name.trim() &&
      reading.exit === exit
    )
      return true;
    cancelEdit();
    if (reading) {
      reading.region.removeAttribute('data-controller-reading');
      mark(null);
    }
    if (readingContent.has(region) && readingContent.get(region) !== region.textContent)
      region.scrollTop = 0;
    readingContent.set(region, region.textContent);
    nativeScroll = null;
    reading = {
      region,
      regionId: region.id,
      origin,
      exit,
      label: name.trim(),
      labelSource,
      text: region.textContent,
      scope,
      root,
      boundary: null,
    };
    readingInvalidated = false;
    engaged = true;
    region.setAttribute('data-controller-reading', 'true');
    focus(region);
    onReadingChange(readingState());
    // A host may deliberately clear navigation during the callback.
    if (reading) {
      const owner = reading;
      readingMessage(readingHint(), owner);
    }
    return !!reading;
  }
  function relinquish() {
    cancelConfirm();
    endSurfaceEditor();
    cancelEdit(t('interface:controllerEditCancelled'));
    cancelReading({ invalidated: true });
    engaged = false;
    mark(null);
  }
  function nativeReaderCurrent(owner, event) {
    if (
      !nativeReadingScroll ||
      !owner ||
      reading !== owner ||
      destroyed ||
      doc.hidden ||
      doc.hasFocus?.() === false ||
      getScope() !== owner.scope ||
      getRoot() !== owner.root ||
      !owner.region.contains(event.target) ||
      !readingCurrent(owner)
    )
      return false;
    // Visibility/acceptance reads can synchronously retire this exact owner.
    return (
      getScope() === owner.scope &&
      getRoot() === owner.root &&
      !doc.hidden &&
      doc.hasFocus?.() !== false &&
      !destroyed &&
      reading === owner &&
      doc.activeElement === owner.region
    );
  }
  listen('pointerdown', (event) => {
    if (!event.defaultPrevented && event.isPrimary !== false && getRoot()?.contains(event.target))
      setMenuInput(event.pointerType === 'touch' ? 'touch' : 'pointer');
    if (surfaceEditor?.adapter.contains?.(event.target)) {
      onNativeInput(event);
      return;
    }
    nativeScroll = null;
    const owner = reading;
    if (
      (event.button === undefined || event.button === 0) &&
      event.isPrimary !== false &&
      event.cancelable !== false &&
      !event.defaultPrevented &&
      nativeReaderCurrent(owner, event)
    ) {
      // Preserve the browser's native pan/selection default and the stable Done
      // action. Only this pointer and exact reader can survive scroll adoption.
      nativeScroll = { owner, pointerId: event.pointerId };
      onNativeInput(event);
      if (!nativeReaderCurrent(owner, event)) {
        nativeScroll = null;
        if (reading === owner) relinquish();
      }
      return;
    }
    const exit = reading?.exit;
    if (
      exit &&
      visible(exit) &&
      (event.target === exit || exit.contains(event.target)) &&
      (event.button === undefined || event.button === 0) &&
      event.isPrimary !== false &&
      event.cancelable !== false &&
      !event.defaultPrevented
    ) {
      // Keep focus/reader alive for this button's ordinary click. Cancelling it
      // now would disable Done before its click can restore the reading origin.
      // No action runs on pointerdown, so dragging away may still cancel a click.
      event.preventDefault();
      onNativeInput(event);
      return;
    }
    relinquish();
    onNativeInput(event);
  });
  if (nativeReadingScroll)
    listen('pointerup', (event) => {
      if (nativeScroll?.pointerId === event.pointerId) nativeScroll = null;
    });
  listen('pointercancel', (event) => {
    const gesture = nativeScroll;
    nativeScroll = null;
    if (
      gesture &&
      gesture.pointerId === event.pointerId &&
      event.isPrimary !== false &&
      !event.defaultPrevented &&
      nativeReaderCurrent(gesture.owner, event)
    )
      return;
    if (reading) relinquish();
  });
  listen('keydown', (event) => {
    if (!event.defaultPrevented && getRoot()?.contains(event.target)) setMenuInput('keyboard');
    if (surfaceEditor) {
      if (sync()) {
        event.preventDefault();
        onNativeInput(event);
        return;
      }
      if (surfaceEditor?.adapter.keydown?.(event) === true) {
        onNativeInput(event);
        return;
      }
      if (
        surfaceEditor &&
        keyboard &&
        !event.defaultPrevented &&
        !event.ctrlKey &&
        !event.altKey &&
        !event.metaKey
      ) {
        const direction = {
          ArrowUp: 'up',
          ArrowDown: 'down',
          ArrowLeft: 'left',
          ArrowRight: 'right',
        }[event.key];
        if (direction || ['Enter', ' ', 'Escape'].includes(event.key)) {
          event.preventDefault();
          if (!event.repeat || direction)
            handleSurfaceEditor(
              direction
                ? { direction }
                : event.key === 'Escape'
                  ? { back: true }
                  : { confirm: true },
            );
          onNativeInput(event);
          return;
        }
      }
    }
    // Explicit host capture owns these keys before document-level menu navigation.
    // Relinquish stale previews without consuming the event or moving focus.
    if (keyboard && ownsKeyboardEvent(event)) {
      relinquish();
      onNativeInput(event);
      return;
    }
    // Shift arrives before a real Shift+Tab. Preserve only its current reader;
    // it is not itself a navigation action and must keep native modifier behavior.
    const reader = reading;
    if (
      keyboard &&
      event.key === 'Shift' &&
      !event.defaultPrevented &&
      !event.ctrlKey &&
      !event.altKey &&
      !event.metaKey &&
      readingCurrent(reader) &&
      !destroyed &&
      !doc.hidden &&
      doc.hasFocus?.() !== false &&
      getScope() === reader.scope &&
      getRoot() === reader.root &&
      reading === reader
    ) {
      onNativeInput(event);
      return;
    }
    if (keyboard && keyboardNavigation(event)) {
      onNativeInput(event);
      return;
    }
    if ((reading || editing) && event.key === 'Escape' && !event.defaultPrevented) {
      event.preventDefault();
      if (reading) endReading();
      else cancelEdit(t('interface:choiceCancelled'));
    } else relinquish();
    onNativeInput(event);
  });
  listen('focusin', (event) => {
    if (focusing) return;
    if (surfaceEditor) {
      if (surfaceEditor.adapter.contains?.(event.target) || event.target === surfaceEditor.element)
        return;
      endSurfaceEditor();
    }
    if (
      reading &&
      event.target !== reading.region &&
      !(event.target === reading.exit && readingCurrent())
    )
      cancelReading({ invalidated: true, message: t('interface:readingEnded') });
    if (editing && event.target !== editing.element)
      cancelEdit(t('interface:controllerEditCancelled'));
    if (engaged) mark(visible(event.target) ? event.target : null);
  });
  const selectOptions = (element) =>
    [...element.options].filter((option) => !option.disabled && !option.parentElement?.disabled);
  const signature = (element) =>
    element.tagName === 'SELECT'
      ? JSON.stringify(selectOptions(element).map((option) => [option.value, option.label]))
      : JSON.stringify([element.min, element.max, element.step]);
  function ensureFocus() {
    const items = controls();
    const current = items.includes(doc.activeElement) ? doc.activeElement : null;
    const preferred = getDefaultFocus();
    const target = current || (items.includes(preferred) ? preferred : null) || items[0];
    if (target) focus(target);
    return target || null;
  }
  function sync() {
    if (destroyed) return;
    let invalidated = readingInvalidated;
    readingInvalidated = false;
    const nextScope = getScope(),
      nextRoot = getRoot();
    if (scope !== nextScope || root !== nextRoot) {
      invalidated = scope !== null;
      cancelConfirm();
      cancelEdit();
      endSurfaceEditor();
      cancelReading();
      scope = nextScope;
      root = nextRoot;
      if (inputMode && scope !== 'flight') setMenuInput(inputMode, root);
      mark(null);
      if (engaged && scope !== 'flight') ensureFocus();
    }
    if (
      surfaceEditor &&
      (!visible(surfaceEditor.element) ||
        !surfaceEditor.adapter.isCurrent() ||
        doc.hidden ||
        doc.hasFocus?.() === false)
    ) {
      invalidated = true;
      endSurfaceEditor();
    }
    if (reading && !readingCurrent()) {
      invalidated = true;
      cancelReading({ message: t('interface:theReadingRegionChangedChooseItAgainToRead') });
    }
    if (reading) {
      const max = readingMetrics(reading.region).max;
      if (reading.region.scrollTop < 0 || reading.region.scrollTop > max)
        reading.region.scrollTop = Math.max(0, Math.min(max, reading.region.scrollTop));
    }
    if (
      editing &&
      (!visible(editing.element) ||
        doc.activeElement !== editing.element ||
        editing.element.value !== editing.original ||
        signature(editing.element) !== editing.signature)
    ) {
      invalidated = true;
      cancelEdit(t('interface:theControlChangedChooseItAgainToEdit'));
    }
    if (scope === 'flight') {
      cancelEdit();
      endSurfaceEditor();
      cancelReading();
      mark(null);
    } else if (
      engaged &&
      !surfaceEditor &&
      !reading &&
      (!visible(doc.activeElement) || !controls().includes(doc.activeElement))
    ) {
      invalidated = true;
      ensureFocus();
    }
    return invalidated;
  }
  function labelText(node, referenced = false) {
    if (!node) return '';
    if (node.nodeType === 3) return node.textContent;
    if (
      node.nodeType !== 1 ||
      (!referenced && (node.hidden || node.getAttribute('aria-hidden') === 'true')) ||
      /^(INPUT|SELECT|TEXTAREA|BUTTON|OPTION|OPTGROUP|SCRIPT|STYLE|TEMPLATE|SVG)$/.test(
        node.tagName.toUpperCase(),
      )
    )
      return '';
    // Localized captions live in nested spans. Read those text nodes without
    // allowing embedded controls, option lists or decorative icons into the name.
    return [...(node.childNodes || [])].map((child) => labelText(child)).join('');
  }
  function label(element) {
    const normalize = (text) => text.replace(/\s+/gu, ' ').trim();
    const references = (element.getAttribute('aria-labelledby') || '')
      .split(/\s+/u)
      .filter(Boolean);
    return (
      // An explicit accessible-name reference may intentionally name a hidden caption.
      normalize(references.map((id) => labelText(doc.getElementById(id), true)).join(' ')) ||
      normalize(element.getAttribute('aria-label') || '') ||
      normalize([...(element.labels || [])].map((caption) => labelText(caption)).join(' ')) ||
      element.id ||
      t('interface:value')
    );
  }
  function paintEdit() {
    if (!editing) return;
    const value =
      editing.kind === 'select' ? editing.options[editing.index].label : String(editing.draft);
    const controls = getControlLabels();
    localizedText(editing.preview, () =>
      t('gameplay:changesConfirmsCancels', {
        value1: contentText(editing, 'label'),
        value2: value,
        value3: controls.directions,
        value4: controls.confirm,
        value5: controls.back,
      }),
    );
    hint(editing.preview.textContent);
  }
  function beginEdit(element) {
    const kind = element.tagName === 'SELECT' ? 'select' : 'range';
    let state;
    if (kind === 'select') {
      const options = selectOptions(element);
      if (!options.length) return hint(t('interface:noEnabledChoicesAreAvailable'));
      state = {
        options,
        index: Math.max(
          0,
          options.findIndex((option) => option.value === element.value),
        ),
      };
    } else {
      const min = Number(element.min || 0),
        max = Number(element.max || 100),
        step = Number(element.step || 1),
        draft = Number(element.value);
      if (![min, max, step, draft].every(Number.isFinite) || max < min || step <= 0)
        return hint(t('interface:useKeyboardOrTouchForThisValue'));
      state = { min, max, step, draft: Math.max(min, Math.min(max, draft)) };
    }
    const preview = doc.createElement('div');
    preview.className = 'controller-editor';
    preview.setAttribute('role', 'status');
    (element.closest('label') || element).insertAdjacentElement('afterend', preview);
    element.setAttribute('data-controller-editing', 'true');
    editing = {
      ...state,
      kind,
      element,
      original: element.value,
      signature: signature(element),
      label: label(element),
      preview,
    };
    paintEdit();
  }
  function editDirection(direction) {
    const delta = direction === 'right' || direction === 'down' ? 1 : -1;
    if (editing.kind === 'select')
      editing.index = Math.max(0, Math.min(editing.options.length - 1, editing.index + delta));
    else
      editing.draft = Number(
        Math.max(editing.min, Math.min(editing.max, editing.draft + delta * editing.step)).toFixed(
          8,
        ),
      );
    paintEdit();
  }
  function commitEdit() {
    const edit = editing;
    const next = edit.kind === 'select' ? edit.options[edit.index].value : String(edit.draft);
    cancelEdit();
    if (next !== edit.original) {
      edit.element.value = next;
      const EventType = doc.defaultView?.Event || Event;
      if (edit.kind === 'range')
        edit.element.dispatchEvent(new EventType('input', { bubbles: true }));
      edit.element.dispatchEvent(new EventType('change', { bubbles: true }));
    }
    hint(t('interface:choiceApplied'));
  }
  function move(direction) {
    const items = controls(),
      current = ensureFocus();
    if (!current || items.length < 2) return;
    const grouped = menuGroupNeighbor(items, current, direction);
    if (grouped) return focus(grouped);
    const journeyGrid = current.closest('#journey-cards');
    if (journeyGrid) {
      // Read the rendered rows on every edge: filtering, zoom and rotation may
      // change columns without replacing the focused mission. Card heights are
      // not reliable row markers because their authored text can differ.
      const entries = items
        .filter((element) => journeyGrid.contains(element))
        .map((element) => ({ element, rect: element.getBoundingClientRect() }))
        .sort((a, b) => a.rect.y - b.rect.y || a.rect.x - b.rect.x);
      const rows = [];
      for (const entry of entries) {
        const row = rows.at(-1);
        if (row && Math.abs(row[0].rect.y - entry.rect.y) <= 1) row.push(entry);
        else rows.push([entry]);
      }
      const rowIndex = rows.findIndex((row) => row.some(({ element }) => element === current)),
        row = rows[rowIndex],
        from = row.find(({ element }) => element === current).rect,
        cx = from.x + from.width / 2;
      const horizontal = direction === 'left' || direction === 'right',
        step = direction === 'down' || direction === 'right' ? 1 : -1,
        candidates = horizontal ? row : rows[rowIndex + step];
      if (candidates) {
        const next = candidates
          .map(({ element, rect }) => ({ element, dx: rect.x + rect.width / 2 - cx }))
          .filter(({ element, dx }) => element !== current && (!horizontal || dx * step > 1))
          .sort((a, b) => Math.abs(a.dx) - Math.abs(b.dx))[0];
        if (next) focus(next.element);
      } else if (!horizontal) {
        // Top/bottom exits reach adjacent menu controls without wrapping to a
        // different mission. Left/right row edges always retain the selection.
        const gridItems = items.filter((element) => journeyGrid.contains(element)),
          edge = step < 0 ? gridItems[0] : gridItems.at(-1),
          next = items[items.indexOf(edge) + step];
        if (next && !journeyGrid.contains(next)) focus(next);
      }
      return;
    }
    const grid = current.closest('#gallery-grid,#missions');
    if (grid) {
      const from = current.getBoundingClientRect();
      const cx = from.x + from.width / 2,
        cy = from.y + from.height / 2;
      const candidates = items
        .filter((element) => element !== current && grid.contains(element))
        .map((element) => {
          const rect = element.getBoundingClientRect(),
            dx = rect.x + rect.width / 2 - cx,
            dy = rect.y + rect.height / 2 - cy,
            horizontal = direction === 'left' || direction === 'right';
          const forward =
            direction === 'left' ? -dx : direction === 'right' ? dx : direction === 'up' ? -dy : dy;
          return { element, forward, score: forward + Math.abs(horizontal ? dy : dx) * 3 };
        })
        .filter((item) => item.forward > 1)
        .sort((a, b) => a.score - b.score);
      if (candidates.length) return focus(candidates[0].element);
    }
    const step = direction === 'down' || direction === 'right' ? 1 : -1;
    focus(items[(items.indexOf(current) + step + items.length) % items.length]);
  }
  function activate(element) {
    if (!visible(element)) return;
    const adapter = resolveEditor(element);
    if (adapter) return beginSurfaceEditor(element, adapter);
    if (element.tagName === 'SELECT' || (element.tagName === 'INPUT' && element.type === 'range'))
      return beginEdit(element);
    if (supportsControllerField(element)) return beginSurfaceEditor(element);
    if (element.tagName === 'INPUT' && element.type === 'file' && activateFileInput)
      return activateFileInput(element);
    if (
      element.tagName === 'TEXTAREA' ||
      (element.tagName === 'INPUT' &&
        !['checkbox', 'radio', 'button', 'submit'].includes(element.type))
    )
      return hint(t('interface:useKeyboardOrTouchForTextDatesAndFilePickers'));
    activateControl(element);
  }
  function beginConfirm(capturedTarget = null) {
    sync();
    if (scope === 'flight') return null;
    setMenuInput('controller');
    engaged = true;
    const element =
      capturedTarget ||
      (surfaceEditor ? doc.activeElement : reading?.region || editing?.element || ensureFocus());
    if (!element || (!surfaceEditor && !visible(element))) return null;
    cancelConfirm();
    confirmTransaction = { element, scope, root, reading, editing, surfaceEditor };
    element.setAttribute('data-controller-pressed', 'true');
    return element;
  }
  function confirmCurrent() {
    return (
      !!confirmTransaction &&
      scope === getScope() &&
      root === getRoot() &&
      confirmTransaction.scope === scope &&
      confirmTransaction.root === root &&
      (confirmTransaction.surfaceEditor
        ? surfaceEditor === confirmTransaction.surfaceEditor && surfaceEditor.adapter.isCurrent()
        : visible(confirmTransaction.element)) &&
      (doc.activeElement === confirmTransaction.element ||
        confirmTransaction.element.contains?.(doc.activeElement))
    );
  }
  function commitConfirm() {
    const transaction = confirmTransaction;
    if (!transaction) return null;
    transaction.element?.removeAttribute?.('data-controller-pressed');
    confirmTransaction = null;
    if (
      scope !== getScope() ||
      root !== getRoot() ||
      transaction.scope !== scope ||
      transaction.root !== root ||
      (!transaction.surfaceEditor && !visible(transaction.element))
    )
      return null;
    if (transaction.surfaceEditor) {
      if (
        surfaceEditor !== transaction.surfaceEditor ||
        !surfaceEditor.adapter.isCurrent() ||
        doc.activeElement !== transaction.element
      )
        return null;
      handleSurfaceEditor({ confirm: true });
    } else if (transaction.reading) {
      if (reading !== transaction.reading || !readingCurrent(transaction.reading)) return null;
      endReading();
    } else if (transaction.editing) {
      if (editing !== transaction.editing) return null;
      commitEdit();
    } else activate(transaction.element);
    return transaction.element;
  }
  function readDirection(direction) {
    const owner = reading;
    if (direction !== 'up' && direction !== 'down') {
      readingMessage(readingHint(), owner);
      return;
    }
    const { region } = reading;
    const { max, step } = readingMetrics(region);
    const top = Math.max(
      0,
      Math.min(max, region.scrollTop + (direction === 'down' ? step : -step)),
    );
    if (typeof region.scrollTo === 'function')
      region.scrollTo({ top, left: 0, behavior: 'instant' });
    else {
      region.scrollTop = top;
      region.scrollLeft = 0;
    }
    const boundary = max === 0 ? 'all' : top === 0 ? 'start' : top === max ? 'end' : null;
    if (boundary && reading.boundary !== boundary)
      readingMessage(
        `${boundary === 'all' ? t('interface:allTextIsVisible2') : boundary === 'start' ? t('interface:startOfDetails') : t('interface:endOfDetails')} ${readingHint()}`,
        owner,
      );
    reading.boundary = boundary;
  }
  function keyboardNavigation(event) {
    if (
      event.defaultPrevented ||
      event.ctrlKey ||
      event.metaKey ||
      event.altKey ||
      ![
        'ArrowUp',
        'ArrowDown',
        'ArrowLeft',
        'ArrowRight',
        'Tab',
        'Escape',
        'Enter',
        ' ',
        'PageUp',
        'PageDown',
        'Home',
        'End',
      ].includes(event.key)
    )
      return false;
    sync();
    if (scope === 'flight' || root === doc || !root) return false;
    // Holding the key that opened a panel must not activate its new primary
    // action (or immediately resume a flight just paused by Escape).
    if (
      event.repeat &&
      (event.key === 'Escape' ||
        (['Enter', ' '].includes(event.key) &&
          !event.target?.closest?.(
            'input,select,textarea,[contenteditable]:not([contenteditable="false"])',
          )))
    ) {
      event.preventDefault();
      return true;
    }
    const leavingReader = !!reading && event.key === 'Tab';
    if (reading) {
      if (['ArrowUp', 'ArrowDown'].includes(event.key)) {
        event.preventDefault();
        readDirection(event.key === 'ArrowUp' ? 'up' : 'down');
        return true;
      }
      if (['Home', 'End', 'PageUp', 'PageDown'].includes(event.key)) {
        event.preventDefault();
        const metrics = readingMetrics(reading.region);
        const target =
          event.key === 'Home'
            ? 0
            : event.key === 'End'
              ? metrics.max
              : reading.region.scrollTop +
                (event.key === 'PageUp' ? -1 : 1) * reading.region.clientHeight;
        reading.region.scrollTop = Math.max(0, Math.min(metrics.max, target));
        return true;
      }
      // A focused Done keeps native button activation; its host click is end-only.
      if (doc.activeElement === reading.exit && ['Enter', ' '].includes(event.key)) return true;
      if (['Enter', ' ', 'Escape'].includes(event.key)) {
        event.preventDefault();
        endReading();
        return true;
      }
      if (event.key === 'Tab') {
        const owner = reading;
        if (owner.exit && visible(owner.exit)) {
          const stops = [...root.querySelectorAll(`${CONTROLS},[tabindex]`)]
            .filter((element) => element.tabIndex >= 0 && visible(element))
            .sort((a, b) => (a.tabIndex || Infinity) - (b.tabIndex || Infinity));
          const current = stops.indexOf(doc.activeElement),
            next = stops[current + (event.shiftKey ? -1 : 1)],
            paired = doc.activeElement === owner.region ? owner.exit : owner.region;
          // Preserve only adjacent text/Done traversal. Other controls retain
          // native order and leave reading; this is neither a trap nor a launch.
          if (
            current >= 0 &&
            next === paired &&
            !destroyed &&
            !doc.hidden &&
            doc.hasFocus?.() !== false &&
            getScope() === owner.scope &&
            getRoot() === owner.root &&
            readingCurrent(owner)
          ) {
            event.preventDefault();
            focus(next);
            return true;
          }
          if (reading !== owner) {
            event.preventDefault();
            return true;
          }
          if (doc.activeElement === owner.exit && current >= 0 && next) {
            // Ending disables Done. Capture its real neighbor first so this
            // Tab cannot skip a control after the native focus owner disappears.
            event.preventDefault();
            endReading({ restoreFocus: false });
            if (
              !reading &&
              !destroyed &&
              !doc.hidden &&
              doc.hasFocus?.() !== false &&
              getScope() === owner.scope &&
              getRoot() === owner.root &&
              (doc.activeElement === owner.exit || doc.activeElement === doc.body)
            )
              focus(next);
            return true;
          }
        }
        endReading({ restoreFocus: false });
      } else return false;
    }
    if (editing && event.key === 'Escape') {
      event.preventDefault();
      cancelEdit(t('interface:choiceCancelled'));
      return true;
    }
    if (event.key === 'Escape') {
      if (settingsPanelBack(root)) {
        event.preventDefault();
        return true;
      }
      // Native dialogs keep their cancellable Escape lifecycle.
      if (root.tagName === 'DIALOG') return false;
      event.preventDefault();
      relinquish();
      onBack();
      return true;
    }
    const items = controls(),
      current = items.indexOf(doc.activeElement);
    if (event.key === 'Tab') {
      if (root.tagName === 'DIALOG') {
        // Keep native traversal inside the current modal. Intercept only its
        // first/last boundary; native inputs still own all interior Tab keys.
        const tabStops = [...root.querySelectorAll(`${CONTROLS},[tabindex]`)]
          .filter((element) => element.tabIndex >= 0 && visible(element))
          .sort((a, b) => (a.tabIndex || Infinity) - (b.tabIndex || Infinity));
        if (!root.open || !tabStops.length) return false;
        const boundary = event.shiftKey ? tabStops[0] : tabStops.at(-1);
        if (doc.activeElement !== boundary) return false;
        event.preventDefault();
        relinquish();
        focus(event.shiftKey ? tabStops.at(-1) : tabStops[0]);
        return true;
      }
      // Roving tab lists expose only their selected item to sequential keys.
      // Spatial and controller traversal still uses every visible control.
      const tabStops = items.filter((element) => element.tabIndex >= 0),
        currentTab = tabStops.indexOf(doc.activeElement);
      if (!tabStops.length) return false;
      // Only a registered embedded host may transfer focus at a nonmodal edge.
      // Interior traversal, native modal containment and ordinary games retain
      // their existing behavior. A reader exits through its own path above.
      const boundary = event.shiftKey ? 0 : tabStops.length - 1;
      if (!leavingReader && currentTab === boundary) {
        const exit = onTabBoundary({ backward: !!event.shiftKey });
        if (exit === true || exit === 'native') {
          if (exit === true) event.preventDefault();
          relinquish();
          // A registered Playground frame uses browser sequential traversal.
          // Controller practice retains its synchronous, consumed handoff.
          return exit === true;
        }
      }
      event.preventDefault();
      relinquish();
      // An arrow/controller may have focused a tabindex=-1 item. Continue from
      // its actual position before wrapping to an eligible sequential stop.
      const remaining = event.shiftKey
        ? items.slice(0, current < 0 ? items.length : current).reverse()
        : items.slice(current + 1);
      const next =
        remaining.find((element) => element.tabIndex >= 0) ||
        (event.shiftKey ? tabStops.at(-1) : tabStops[0]);
      focus(next);
      return true;
    }
    if (['Enter', ' '].includes(event.key)) {
      if (current >= 0) return false; // Native activation owns actual controls.
      event.preventDefault();
      ensureFocus(); // A first key from outside the panel only restores focus.
      return true;
    }
    if (!event.key.startsWith('Arrow')) return false;
    const nativeEditor = event.target?.closest?.(
      'input,select,textarea,[contenteditable]:not([contenteditable="false"])',
    );
    if (nativeEditor && visible(nativeEditor)) return false;
    event.preventDefault();
    relinquish();
    if (current < 0) ensureFocus();
    else
      move({ ArrowUp: 'up', ArrowDown: 'down', ArrowLeft: 'left', ArrowRight: 'right' }[event.key]);
    return true;
  }
  function handle(command = {}) {
    if (destroyed) return;
    if (command.confirmCancel) {
      cancelConfirm();
      return;
    }
    if (command.confirmStart) return beginConfirm();
    if (command.confirmCommit) return commitConfirm();
    if (sync()) return;
    if (scope === 'flight') return;
    if (!command.confirm && !command.back && !command.menu && !DIRECTIONS.has(command.direction))
      return;
    setMenuInput('controller');
    engaged = true;
    if (surfaceEditor) {
      handleSurfaceEditor(command);
      return;
    }
    if (reading) {
      if (command.back || command.menu || command.confirm) endReading();
      else readDirection(command.direction);
      return;
    }
    const element = ensureFocus();
    if (command.back) {
      if (editing) cancelEdit(t('interface:choiceCancelled'));
      else if (settingsPanelBack(root)) return;
      else onBack();
    } else if (command.menu) {
      if (editing) cancelEdit(t('interface:choiceCancelled'));
      else onMenu();
    } else if (command.confirm) {
      if (editing) commitEdit();
      else if (element) activate(element);
    } else if (editing) editDirection(command.direction);
    else move(command.direction);
  }
  return {
    handle,
    beginConfirm,
    confirmCurrent,
    commitConfirm,
    cancelConfirm,
    sync,
    beginReading,
    endReading,
    readingState,
    editorState: () => (surfaceEditor ? { element: surfaceEditor.element } : null),
    refreshReadingHint,
    // One focus handoff; callers own readiness/foreground/intent checks.
    // Unlike engage(), this does not enable later controller scope refocusing.
    focusAvailable() {
      if (destroyed) return null;
      sync();
      if (surfaceEditor) {
        surfaceEditor.adapter.focus?.();
        return surfaceEditor.element;
      }
      return scope === 'flight' ? null : ensureFocus();
    },
    engage() {
      if (destroyed) return;
      sync();
      if (scope === 'flight') return;
      setMenuInput('controller');
      engaged = true;
      if (surfaceEditor) surfaceEditor.adapter.focus?.();
      else if (reading) focus(reading.region);
      else ensureFocus();
    },
    clear: relinquish,
    destroy() {
      if (destroyed) return;
      relinquish();
      destroyed = true;
      listeners.forEach((remove) => remove());
      for (const [target, previous] of inputRoots) {
        inputAttributes.forEach((attribute, index) => {
          if (previous[index] === null) target.removeAttribute(attribute);
          else target.setAttribute(attribute, previous[index]);
        });
      }
      inputRoots.clear();
    },
  };
}
