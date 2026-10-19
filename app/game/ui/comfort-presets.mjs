import { getLocale, onLocaleChange, t } from '../i18n/index.mjs';
import { DISPLAY_PREFERENCES_KEY } from '../display-preferences.mjs';
import { MENU_ANIMATION_KEY, menuAnimationBinding } from './menu-animation-preferences.mjs';

const presets = {
  clear: { textFace: 'plain', textSize: 'large' },
  motion: { reducedEffects: true, menuAnimation: false },
  comfort: { textFace: 'plain', textSize: 'large', reducedEffects: true, menuAnimation: false },
};
const copy = {
  en: {
    title: 'Comfort presets',
    choose: 'Preview a preset',
    clear: 'Clear text',
    motion: 'Less motion',
    comfort: 'Clear text and less motion',
    preview: 'Preview only. Your settings change when you select Apply.',
    sample: 'Ready when you are. Continue playing.',
    changes: 'Changes on Apply',
    same: 'These settings already match this preset.',
    system: 'Your device’s reduced-motion preference stays active.',
    apply: 'Apply preset',
    retry: 'Retry saving preset',
    undo: 'Undo last preset',
    applied: 'Preset applied. You can adjust individual settings below.',
    partial: 'Newer choices were kept. Undo affects only preset settings that remain unchanged.',
    undone: 'The preset’s unchanged settings were restored. Newer choices were kept.',
    superseded: 'Newer choices were kept. Undo is no longer available for this preset.',
    restored: 'This page was restored. The earlier preset can no longer be undone.',
    failed: 'Some settings could not be changed. Review the settings below.',
    textFace: 'Text style',
    textSize: 'Text size',
    reducedEffects: 'Reduced effects',
    menuAnimation: 'Animated menu background',
    pixel: 'Theme font',
    plain: 'Plain',
    standard: 'Standard',
    large: 'Large',
    true: 'On',
    false: 'Off',
  },
  uk: {
    title: 'Набори для зручності',
    choose: 'Переглянути набір',
    clear: 'Чіткий текст',
    motion: 'Менше руху',
    comfort: 'Чіткий текст і менше руху',
    preview: 'Це лише перегляд. Налаштування зміняться після натискання «Застосувати».',
    sample: 'Готові, коли ви готові. Продовжуйте гру.',
    changes: 'Зміни після застосування',
    same: 'Ці налаштування вже відповідають набору.',
    system: 'Налаштування зменшення руху на вашому пристрої залишається чинним.',
    apply: 'Застосувати набір',
    retry: 'Повторити збереження набору',
    undo: 'Скасувати останній набір',
    applied: 'Набір застосовано. Окремі налаштування можна змінити нижче.',
    partial: 'Новіший вибір залишено без змін. Скасування стосується лише незмінених налаштувань набору.',
    undone: 'Незмінені налаштування набору відновлено. Новіші зміни збережено.',
    superseded: 'Новіші зміни збережено. Скасування цього набору більше недоступне.',
    restored: 'Сторінку відновлено. Попередній набір більше не можна скасувати.',
    failed: 'Деякі налаштування не вдалося змінити. Перевірте налаштування нижче.',
    textFace: 'Стиль тексту',
    textSize: 'Розмір тексту',
    reducedEffects: 'Менше ефектів',
    menuAnimation: 'Анімоване тло меню',
    pixel: 'Шрифт теми',
    plain: 'Звичайний',
    standard: 'Стандартний',
    large: 'Великий',
    true: 'Увімкнено',
    false: 'Вимкнено',
  },
};

/** A contained preview. Only Apply/Undo call the host's explicit preference writer. */
export function mountComfortPresets({
  document: doc,
  window: win = doc.defaultView,
  root,
  display,
  setDisplay = (patch) => display.set(patch),
  displayWarning = () =>
    display.getWarningKey() ? t(display.getWarningKey()) : display.getWarning(),
}) {
  const menu = menuAnimationBinding(win),
    element = doc.createElement('section'),
    heading = doc.createElement('h4'),
    label = doc.createElement('label'),
    labelText = doc.createElement('span'),
    choice = doc.createElement('select'),
    hint = doc.createElement('p'),
    sample = doc.createElement('p'),
    changesHeading = doc.createElement('h5'),
    changes = doc.createElement('ul'),
    system = doc.createElement('p'),
    actions = doc.createElement('div'),
    apply = doc.createElement('button'),
    undo = doc.createElement('button'),
    status = doc.createElement('p');
  const prefix = `${root.id}-comfort`;
  element.className = 'comfort-presets';
  element.setAttribute('aria-labelledby', `${prefix}-heading`);
  heading.id = `${prefix}-heading`;
  choice.id = `${prefix}-choice`;
  for (const value of Object.keys(presets)) {
    const option = doc.createElement('option');
    option.value = value;
    choice.append(option);
  }
  choice.value = 'comfort';
  hint.id = `${prefix}-hint`;
  hint.className = system.className = status.className = 'micro-note';
  choice.setAttribute('aria-describedby', hint.id);
  sample.className = 'comfort-preset-sample';
  actions.className = 'comfort-preset-actions';
  apply.type = undo.type = 'button';
  apply.id = `${prefix}-apply`;
  undo.id = `${prefix}-undo`;
  apply.className = 'button';
  undo.className = 'button secondary';
  status.id = `${prefix}-status`;
  status.setAttribute('role', 'status');
  label.append(labelText, choice);
  actions.append(apply, undo);
  element.append(heading, label, hint, sample, changesHeading, changes, system, actions, status);
  root.insertBefore(element, root.querySelector('.global-settings-group'));
  let disposed = false,
    acting = false,
    last = null,
    reported = { display: false, menu: false },
    message = '';
  const snapshot = () => ({ ...display.snapshot(), menuAnimation: menu.get() });
  const warning = (scope = reported) =>
    [
      scope.display ? displayWarning() : '',
      scope.menu && menu.persistence().status === 'session' ? menu.feedback(getLocale()).text : '',
    ]
      .filter(Boolean)
      .join(' ');
  function revoke(part) {
    if (!last?.[part]) return;
    last.superseded = true;
    last[part] = null;
    reported[part] = false;
  }
  const resultMessage = () =>
    last?.superseded ? (last.display || last.menu ? 'partial' : 'superseded') : 'applied';
  function reconcile() {
    if (!last || acting) return;
    if (last.display && display.snapshot().revision !== last.display.revision) revoke('display');
    if (last.menu && (menu.get() !== last.menu.value || menu.revision() !== last.menu.revision))
      revoke('menu');
    if (message === 'applied' || message === 'partial') message = resultMessage();
  }
  function retryScope(previous, current, menuRevision, target) {
    return {
      display:
        Object.keys(target).some((key) => key !== 'menuAnimation') &&
        !!previous?.display &&
        previous.display.revision === current.revision &&
        !!displayWarning(),
      menu:
        Object.hasOwn(target, 'menuAnimation') &&
        !!previous?.menu &&
        previous.menu.value === current.menuAnimation &&
        previous.menu.revision === menuRevision &&
        menu.persistence().status === 'session',
    };
  }
  function render() {
    if (disposed) return;
    reconcile();
    const labels = copy[String(getLocale()).split('-')[0]] ?? copy.en,
      current = snapshot(),
      target = presets[choice.value],
      preview = { ...current, ...target };
    heading.textContent = labels.title;
    labelText.textContent = labels.choose;
    for (const option of choice.children) option.textContent = labels[option.value];
    hint.textContent = labels.preview;
    sample.textContent = labels.sample;
    sample.dataset.textFace = preview.textFace;
    sample.dataset.textSize = preview.textSize;
    changesHeading.textContent = labels.changes;
    changes.replaceChildren();
    for (const [key, value] of Object.entries(target)) {
      if (value === current[key]) continue;
      const row = doc.createElement('li');
      row.textContent = `${labels[key]}: ${labels[String(current[key])]} → ${labels[String(value)]}`;
      changes.append(row);
    }
    if (!changes.children.length) {
      const row = doc.createElement('li');
      row.textContent = labels.same;
      changes.append(row);
    }
    system.textContent = labels.system;
    system.hidden = !current.effectiveReducedEffects || current.reducedEffects;
    const pending = retryScope(last?.preset === choice.value ? last : null, current, menu.revision(), target);
    apply.textContent = pending.display || pending.menu ? labels.retry : labels.apply;
    undo.textContent = labels.undo;
    undo.disabled = !last?.display && !last?.menu;
    const text = [labels[message], message ? warning() : ''].filter(Boolean).join(' ');
    if (status.textContent !== text) status.textContent = text;
    status.hidden = !text;
  }
  function applyPreset() {
    reconcile();
    const before = snapshot(),
      menuRevision = menu.revision(),
      target = presets[choice.value],
      previous = last?.preset === choice.value ? last : null,
      scope = {
        display: Object.keys(target).some((key) => key !== 'menuAnimation'),
        menu: Object.hasOwn(target, 'menuAnimation'),
      },
      pending = retryScope(previous, before, menuRevision, target),
      retry = pending.display || pending.menu,
      displayPatch = Object.fromEntries(
        Object.entries(target).filter(
          ([key, value]) => key !== 'menuAnimation' && (retry ? pending.display : before[key] !== value),
        ),
      ),
      menuChanged = !retry && scope.menu && before.menuAnimation !== target.menuAnimation;
    reported = retry ? pending : scope;
    if (!Object.keys(displayPatch).length && !menuChanged && !retry) {
      message = 'same';
      render();
      return;
    }
    acting = true;
    let failed = false,
      menuSkipped = false,
      menuAttempted = false;
    try {
      if (Object.keys(displayPatch).length) setDisplay(displayPatch);
    } catch {
      failed = true;
    }
    try {
      if (menuChanged || pending.menu) {
        const menuStillCurrent =
          menu.get() === before.menuAnimation && menu.revision() === menuRevision;
        if (!menuStillCurrent) menuSkipped = true;
        else if (menuChanged) {
          menuAttempted = true;
          menu.set(target.menuAnimation);
        } else menu.retry();
      }
    } catch {
      failed = true;
    }
    const after = snapshot(),
      menuValueAfter = menu.get(),
      menuRevisionAfter = menu.revision(),
      menuOwned = menuAttempted && menuValueAfter === target.menuAnimation && menuRevisionAfter === menuRevision + 1,
      displayOwned =
        Object.keys(displayPatch).length &&
        after.revision === before.revision + 1 &&
        Object.entries(displayPatch).every(([key, value]) => after[key] === value),
      nextDisplay = displayOwned
        ? {
            revision: after.revision,
            before:
              previous?.display?.before ??
              Object.fromEntries(Object.keys(displayPatch).map((key) => [key, before[key]])),
          }
        : previous?.display?.revision === after.revision ? previous.display : null,
      nextMenu =
        menuOwned
          ? { before: before.menuAnimation, value: target.menuAnimation, revision: menuRevisionAfter }
          : previous?.menu && menuValueAfter === previous.menu.value && menuRevisionAfter === previous.menu.revision
            ? previous.menu
            : null;
    last = {
      preset: choice.value,
      display: nextDisplay,
      menu: nextMenu,
      superseded: !!(
        (retry && previous?.superseded) || menuSkipped ||
        (previous?.display && !nextDisplay) || (previous?.menu && !nextMenu) ||
        (Object.keys(displayPatch).length > 0 && after.revision > before.revision && !displayOwned) ||
        (menuAttempted && menuRevisionAfter > menuRevision && !menuOwned)
      ),
    };
    reported.display = reported.display && !!nextDisplay;
    reported.menu = reported.menu && !!nextMenu;
    acting = false;
    message = failed ? 'failed' : resultMessage();
    render();
  }
  function undoPreset() {
    reconcile();
    if (!last) return;
    const owned = last,
      hadFocus = doc.activeElement === undo;
    reported = { display: !!owned.display, menu: !!owned.menu };
    last = null;
    acting = true;
    let failed = false;
    try {
      if (owned.display) setDisplay(owned.display.before);
    } catch {
      failed = true;
    }
    try {
      if (owned.menu && menu.revision() === owned.menu.revision && menu.get() === owned.menu.value)
        menu.set(owned.menu.before);
    } catch {
      failed = true;
    }
    acting = false;
    message = failed ? 'failed' : 'undone';
    render();
    if (hadFocus && [undo, doc.body, null].includes(doc.activeElement))
      apply.focus({ preventScroll: true });
  }
  const storageChanged = (event) => {
    if (!last || acting || ![DISPLAY_PREFERENCES_KEY, MENU_ANIMATION_KEY].includes(event.key))
      return;
    try {
      if (
        event.storageArea !== win.localStorage ||
        event.newValue !== win.localStorage.getItem(event.key)
      )
        return;
    } catch {
      return;
    }
    if (event.key === DISPLAY_PREFERENCES_KEY && !displayWarning()) revoke('display');
    if (event.key === MENU_ANIMATION_KEY && menu.persistence().status !== 'session')
      revoke('menu');
    render();
  };
  const restored = (event) => {
    if (!event.persisted || !last) return;
    // A frozen page can miss another tab changing away and back to the same
    // values. Matching values alone no longer prove this Undo still owns them.
    last = null;
    reported = { display: false, menu: false };
    message = 'restored';
    render();
  };
  choice.addEventListener('change', render);
  // Host change handlers finish persistence before the event reaches this panel.
  // Refresh their final warning without rerunning every display subscriber.
  root.addEventListener('change', render);
  apply.addEventListener('click', applyPreset);
  undo.addEventListener('click', undoPreset);
  win.addEventListener('storage', storageChanged);
  win.addEventListener('pageshow', restored);
  const stopDisplay = display.subscribe(render),
    stopMenu = menu.subscribe(render),
    stopLocale = onLocaleChange(render);
  render();
  return {
    element,
    destroy() {
      disposed = true;
      stopDisplay();
      stopMenu();
      stopLocale();
      choice.removeEventListener('change', render);
      root.removeEventListener('change', render);
      apply.removeEventListener('click', applyPreset);
      undo.removeEventListener('click', undoPreset);
      win.removeEventListener('storage', storageChanged);
      win.removeEventListener('pageshow', restored);
      element.remove();
    },
  };
}
