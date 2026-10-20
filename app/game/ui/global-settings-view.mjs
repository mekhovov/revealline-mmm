import { continuousPlayBindings } from './continuous-play.mjs';
import { renderTextSizeControl } from './text-size-control.mjs';
// One logical settings inventory. Shared flow preferences have one lightweight
// owner; hosts retain audio, simulation and profile lifecycle ownership.
export const GLOBAL_SETTINGS = Object.freeze(
  [
    { key: 'autoNext', category: 'gameplay', type: 'checkbox', required: true },
    { key: 'autoRetry', category: 'gameplay', type: 'checkbox', required: true },
    { key: 'autoReplay', category: 'gameplay', type: 'checkbox', required: true },
    { key: 'textFace', category: 'accessibility', type: 'select', required: true },
    { key: 'textSize', category: 'accessibility', type: 'select', required: true },
    { key: 'reducedEffects', category: 'accessibility', type: 'checkbox', required: true },
    { key: 'menuAnimation', category: 'accessibility', type: 'checkbox', required: true },
    { key: 'masterMuted', category: 'audio', type: 'checkbox', required: true },
    { key: 'masterVolume', category: 'audio', type: 'range', required: true },
    { key: 'musicVolume', category: 'audio', type: 'range' },
    { key: 'effectsVolume', category: 'audio', type: 'range' },
    { key: 'audioCues', category: 'audio' },
    { key: 'musicLibrary', category: 'audio' },
    { key: 'touchPresentation', category: 'controls' },
    { key: 'profileRecovery', category: 'data' },
    { key: 'updates', category: 'extras' },
  ].map(Object.freeze),
);

const GLOBAL_SETTINGS_COPY = {
  en: {
    shared: 'All games',
    autoNext: 'Play next level automatically',
    autoRetry: 'Retry automatically after defeat',
    autoReplay: 'Snake: show failure replay automatically',
    language: 'Language / Мова',
    textFace: 'Text style',
    textSize: 'Text size',
    reducedEffects: 'Reduced effects',
    menuAnimation: 'Animated menu background',
    masterMuted: 'Mute sound',
    masterVolume: 'Master volume',
    musicVolume: 'Music volume',
    effectsVolume: 'Effects volume',
    failed: 'This setting could not be changed.',
    options: {
      language: [
        ['en', 'English'],
        ['uk', 'Українська'],
      ],
      textFace: [
        ['pixel', 'Theme font'],
        ['plain', 'Plain'],
      ],
      textSize: [
        ['standard', 'Standard'],
        ['large', 'Large'],
      ],
    },
  },
  uk: {
    shared: 'Для всіх ігор',
    autoNext: 'Починати наступний рівень автоматично',
    autoRetry: 'Автоматично повторювати після поразки',
    autoReplay: 'Змійка: автоматично показувати повтор поразки',
    language: 'Language / Мова',
    textFace: 'Стиль тексту',
    textSize: 'Розмір тексту',
    reducedEffects: 'Менше ефектів',
    menuAnimation: 'Анімоване тло меню',
    masterMuted: 'Вимкнути звук',
    masterVolume: 'Загальна гучність',
    musicVolume: 'Гучність музики',
    effectsVolume: 'Гучність ефектів',
    failed: 'Не вдалося змінити це налаштування.',
    options: {
      language: [
        ['en', 'English'],
        ['uk', 'Українська'],
      ],
      textFace: [
        ['pixel', 'Шрифт теми'],
        ['plain', 'Звичайний'],
      ],
      textSize: [
        ['standard', 'Стандартний'],
        ['large', 'Великий'],
      ],
    },
  },
};
const globalSettingsOwners = new WeakMap();

/** Adopt real controls, or render missing fields through injected services.
 * Repeated calls add lazy providers without replacing focused controls.
 * `duplicates` retires aliases by logical setting while retaining their handlers.
 */
export function mountGlobalSettings({
  document: doc = globalThis.document,
  root,
  panels,
  prefix = 'global-settings',
  locale = 'en',
  controls = {},
  bindings = {},
  duplicates = {},
} = {}) {
  if (!root || !panels || !doc) return null;
  bindings = { ...continuousPlayBindings(), ...bindings };
  const previous = globalSettingsOwners.get(root);
  if (previous) return previous.update({ controls, bindings, duplicates, locale });
  const rows = new Map(),
    groups = new Map(),
    hiddenAliases = new Map(),
    moves = [];
  let disposed = false;
  const labels = () =>
    GLOBAL_SETTINGS_COPY[String(locale).split('-')[0]] ?? GLOBAL_SETTINGS_COPY.en;
  function groupFor(category) {
    if (groups.has(category)) return groups.get(category);
    const panel = panels[category];
    if (!panel) return null;
    const group = doc.createElement('section'),
      heading = doc.createElement('h4');
    group.className = 'global-settings-group';
    group.dataset.globalSettings = category;
    heading.className = 'global-settings-heading';
    group.append(heading);
    const title = panel.querySelector(':scope > h2, :scope > h3');
    panel.insertBefore(group, title ? title.nextSibling : panel.firstChild);
    groups.set(category, { group, heading });
    return groups.get(category);
  }
  function remember(node) {
    moves.push({ node, parent: node.parentNode, next: node.nextSibling });
  }
  function retireField(row) {
    row.stop?.();
    row.input?.removeEventListener('change', row.change);
    row.retry?.removeEventListener('click', row.retrySave);
    row.field?.remove();
    row.status?.remove();
    row.retry?.remove();
    Object.assign(row, {
      input: null,
      field: null,
      status: null,
      output: null,
      retry: null,
      stop: null,
    });
  }
  function render(row) {
    if (!row.input || !row.binding) return;
    const value = row.binding.get();
    if (row.spec.type === 'checkbox') row.input.checked = !!value;
    else if (row.spec.key === 'textSize') renderTextSizeControl(row.input, value, { locale });
    else row.input.value = String(value);
    if (row.output) row.output.textContent = `${Math.round(Number(value) * 100)}%`;
    const feedback = row.binding.feedback?.(locale),
      message = row.binding.warning?.() || feedback?.text || '';
    if (row.status.textContent !== message) row.status.textContent = message;
    row.status.hidden = !row.status.textContent;
    const ownedFocus = doc.activeElement === row.retry;
    row.retry.textContent = feedback?.retryLabel || '';
    row.retry.hidden = !(feedback?.retry && row.binding.retry);
    if (ownedFocus && row.retry.hidden && [row.retry, doc.body, null].includes(doc.activeElement))
      row.input.focus({ preventScroll: true });
  }
  function makeField(row) {
    const { spec, wrapper } = row;
    const label = doc.createElement('label'),
      text = doc.createElement('span');
    const input = doc.createElement(spec.type === 'select' ? 'select' : 'input');
    input.id = `${prefix}-${spec.key}`;
    label.className = 'global-settings-field';
    if (spec.type !== 'select') input.type = spec.type;
    if (spec.type === 'range') {
      input.min = '0';
      input.max = '1';
      input.step = '0.01';
      row.output = doc.createElement('output');
      row.output.setAttribute('for', input.id);
    }
    label.append(text, input);
    if (row.output) label.append(row.output);
    const status = doc.createElement('p');
    status.id = `${input.id}-status`;
    status.className = 'micro-note';
    status.setAttribute('role', 'status');
    status.hidden = true;
    input.setAttribute('aria-describedby', status.id);
    const retry = doc.createElement('button');
    retry.type = 'button';
    retry.className = 'button secondary global-settings-save-retry';
    retry.hidden = true;
    retry.setAttribute('aria-describedby', status.id);
    wrapper.append(label, status, retry);
    Object.assign(row, { field: label, label: text, input, status, retry });
    const invoke = (operation) => {
      const failed = (error) => {
        render(row);
        status.textContent = error?.message || labels().failed;
        status.hidden = false;
      };
      try {
        const pending = operation();
        render(row);
        if (pending?.then)
          pending.then(
            () => {
              if (!disposed) render(row);
            },
            (error) => {
              if (!disposed) failed(error);
            },
          );
      } catch (error) {
        failed(error);
      }
    };
    row.change = () => {
      const value =
        spec.type === 'checkbox'
          ? input.checked
          : spec.type === 'range'
            ? Number(input.value)
            : input.value;
      invoke(() => row.binding.set(value));
    };
    row.retrySave = () => invoke(() => row.binding.retry?.());
    input.addEventListener('change', row.change);
    retry.addEventListener('click', row.retrySave);
  }
  function refresh(nextLocale = locale) {
    if (disposed) return;
    locale = nextLocale;
    const copy = labels();
    for (const { heading } of groups.values()) heading.textContent = copy.shared;
    for (const row of rows.values()) {
      if (!row.input) continue;
      row.label.textContent = copy[row.spec.key];
      if (row.spec.type === 'select') {
        const entries = row.binding.options?.(locale) ?? copy.options[row.spec.key];
        const signature = JSON.stringify(entries);
        if (row.options !== signature) {
          row.input.replaceChildren(
            ...entries.map(([value, label]) => {
              const option = doc.createElement('option');
              option.value = value;
              option.textContent = label;
              return option;
            }),
          );
          row.options = signature;
        }
      }
      render(row);
    }
  }
  const api = {
    refresh,
    keys: () => [...rows.keys()],
    missing: () =>
      GLOBAL_SETTINGS.filter(({ required, key }) => required && !rows.has(key)).map(
        ({ key }) => key,
      ),
    update(next = {}) {
      if (disposed) return api;
      controls = { ...controls, ...next.controls };
      bindings = { ...bindings, ...next.bindings };
      duplicates = { ...duplicates, ...next.duplicates };
      for (const spec of GLOBAL_SETTINGS) {
        const supplied = controls[spec.key],
          binding = bindings[spec.key];
        const nodes = (Array.isArray(supplied) ? supplied : [supplied]).filter(Boolean);
        if (!nodes.length && !(spec.type && binding?.get && binding?.set)) continue;
        const destination = groupFor(spec.category);
        if (!destination) continue;
        let row = rows.get(spec.key);
        if (!row) {
          const wrapper = doc.createElement('div');
          wrapper.className = 'global-settings-option';
          wrapper.dataset.globalSetting = spec.key;
          destination.group.append(wrapper);
          row = { spec, wrapper, nodes: new Set() };
          rows.set(spec.key, row);
          if (!nodes.length) makeField(row);
        }
        if (nodes.length && row.input) retireField(row);
        for (const node of nodes) {
          if (row.nodes.has(node)) continue;
          remember(node);
          row.nodes.add(node);
          row.wrapper.append(node);
        }
        if (row.input && row.binding !== binding) {
          row.stop?.();
          row.binding = binding;
          row.stop = binding.subscribe?.(() => {
            if (!disposed) render(row);
          });
        }
        for (const node of duplicates[spec.key] ?? []) {
          if (!node || row.wrapper.contains(node)) continue;
          if (!hiddenAliases.has(node)) hiddenAliases.set(node, node.hidden);
          node.hidden = true;
        }
      }
      // Lazy providers occupy the same position as eagerly mounted controls.
      // Leave already ordered nodes in place so keyboard focus is not disturbed.
      for (const [category, { group, heading }] of groups) {
        let prior = heading;
        for (const { key } of GLOBAL_SETTINGS.filter((spec) => spec.category === category)) {
          const row = rows.get(key);
          if (!row) continue;
          if (prior.nextSibling !== row.wrapper) group.insertBefore(row.wrapper, prior.nextSibling);
          prior = row.wrapper;
        }
      }
      refresh(next.locale ?? locale);
      return api;
    },
    destroy() {
      if (disposed) return;
      disposed = true;
      for (const row of rows.values()) {
        row.stop?.();
        row.input?.removeEventListener('change', row.change);
        row.retry?.removeEventListener('click', row.retrySave);
      }
      for (const { node, parent, next } of moves.reverse()) {
        // A host may already have retired its own provider during teardown.
        if (!node.parentNode) continue;
        if (parent) parent.insertBefore(node, next?.parentNode === parent ? next : null);
        else node.remove();
      }
      for (const [node, hidden] of hiddenAliases) node.hidden = hidden;
      for (const { group } of groups.values()) group.remove();
      globalSettingsOwners.delete(root);
    },
  };
  globalSettingsOwners.set(root, api);
  return api.update({ locale });
}
