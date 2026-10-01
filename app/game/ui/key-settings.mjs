import { localizedText, t, localizedAttribute, render as renderMessage } from '../i18n/index.mjs';
import {
  KEY_BINDING_ACTIONS,
  KEY_ACTION_LABELS,
  KEY_BINDING_PRESETS,
  KEY_BINDING_PRESET_LABELS,
  resolveKeyBindings,
  replaceKeyBinding,
  keyCodeForEvent,
  keyLabel,
  bindingLabels,
} from '../key-bindings.mjs';

/** Settings-only key capture. The host applies validated preferences and owns
 * persistence; a failed disk save may still apply the map to this session.
 */
export function attachKeySettings({
  getBindings,
  setBindings,
  onChanged = () => {},
  continuousSteering = false,
}) {
  const required = (id) => {
    const element = document.getElementById(id);
    if (!element) throw new Error(t('gameplay:keyboardSettingsNeed', { value1: id }));
    return element;
  };
  const list = required('key-binding-list'),
    preset = required('key-preset'),
    reset = required('reset-key-bindings'),
    status = required('key-capture-status'),
    cancelButton = required('cancel-key-capture'),
    dialog = required('settings-dialog'),
    buttons = new Map(),
    listeners = [];
  let capturing = null,
    destroyed = false;
  const listen = (target, type, fn, options) => {
    target.addEventListener(type, fn, options);
    listeners.push(() => target.removeEventListener(type, fn, options));
  };
  const announce = (message) => {
    localizedText(status, () => message);
  };
  status.setAttribute('role', 'status');
  status.setAttribute('aria-live', 'polite');
  status.setAttribute('aria-atomic', 'true');
  const sameBindings = (a, b) =>
    KEY_BINDING_ACTIONS.every(
      (action) =>
        a.bindings[action].length === b.bindings[action].length &&
        a.bindings[action].every((code) => b.bindings[action].includes(code)),
    );
  function render() {
    if (destroyed) return;
    const config = resolveKeyBindings(getBindings());
    for (const action of KEY_BINDING_ACTIONS) {
      const button = buttons.get(action),
        active = capturing === action;
      localizedText(button, () =>
        active
          ? t('interface:pressAKey')
          : t('gameplay:change', { value1: bindingLabels(config)[action] }),
      );
      button.setAttribute('aria-pressed', String(active));
      localizedAttribute(button, 'aria-label', () =>
        active
          ? t('gameplay:listeningForEscapeOrTabCancels', { value1: KEY_ACTION_LABELS[action] })
          : t('gameplay:changeKeyBindingCurrentKeys', {
              value1: KEY_ACTION_LABELS[action],
              value2: bindingLabels(config)[action],
            }),
      );
    }
    preset.value =
      Object.entries(KEY_BINDING_PRESETS).find(([, value]) => sameBindings(config, value))?.[0] ||
      'custom';
    const custom = [...preset.options].find((option) => option.value === 'custom');
    if (custom) custom.disabled = true;
    cancelButton.hidden = capturing === null;
    cancelButton.disabled = capturing === null;
  }
  function cancel({ focus = false, message = true } = {}) {
    if (capturing === null) return;
    const action = capturing;
    capturing = null;
    render();
    if (message)
      announce(() =>
        t('gameplay:unchangedKeyCaptureCancelled', { value1: KEY_ACTION_LABELS[action] }),
      );
    if (focus && dialog.open) buttons.get(action).focus({ preventScroll: true });
  }
  function apply(config, message) {
    // Resolve before calling the host: duplicate/reserved keys never reach it.
    const candidate = config === null ? null : resolveKeyBindings(config);
    const result = setBindings(candidate);
    capturing = null;
    render();
    onChanged();
    const sessionOnly = result?.ok === false,
      warning = result?.warning;
    announce(
      () =>
        `${renderMessage(message)}${sessionOnly ? ` ${warning || t('interface:thisKeyboardMapAppliesToThisSessionOnly')}` : ''}`,
    );
  }
  list.replaceChildren();
  for (const action of KEY_BINDING_ACTIONS) {
    const row = document.createElement('div'),
      label = document.createElement('span'),
      button = document.createElement('button');
    row.className = 'key-binding-row';
    row.hidden = continuousSteering && action === 'stop';
    label.className = 'key-binding-label';
    localizedText(label, () => KEY_ACTION_LABELS[action]);
    button.type = 'button';
    button.className = 'button secondary';
    button.dataset.keyAction = action;
    button.setAttribute('aria-describedby', 'key-capture-status');
    buttons.set(action, button);
    listen(button, 'click', () => {
      if (destroyed || !dialog.open) return;
      capturing = action;
      render();
      announce(() =>
        t('gameplay:chooseOnePhysicalKeyForEscapeOrTabCancelsExisting', {
          value1: KEY_ACTION_LABELS[action],
        }),
      );
    });
    row.append(label, button);
    list.append(row);
  }
  listen(
    dialog,
    'keydown',
    (event) => {
      if (capturing === null || destroyed || !dialog.open) return;
      const action = capturing,
        code = keyCodeForEvent(event);
      if (event.isComposing || event.keyCode === 229 || ['Dead', 'Process'].includes(event.key)) {
        announce(() =>
          t('gameplay:textCompositionCannotBeAGameKeyIsUnchangedFinish', {
            value1: KEY_ACTION_LABELS[action],
          }),
        );
        return; // Composition owns its own Escape/candidate keys.
      }
      if (code === 'Tab' || event.key === 'Tab') {
        cancel(); // Let the browser move focus normally.
        return;
      }
      if (
        event.ctrlKey ||
        event.metaKey ||
        event.altKey ||
        (event.shiftKey && !['ShiftLeft', 'ShiftRight'].includes(code))
      ) {
        announce(() =>
          t('gameplay:cannotBindAModifierCombinationIsUnchangedPressOneKey', {
            value1: KEY_ACTION_LABELS[action],
          }),
        );
        return; // Preserve browser and operating-system shortcuts.
      }
      if (code === 'Escape' || event.key === 'Escape') {
        event.preventDefault();
        event.stopPropagation();
        cancel({ focus: true });
        return;
      }
      event.preventDefault();
      event.stopPropagation();
      if (event.repeat) return;
      try {
        const candidate = replaceKeyBinding(getBindings(), action, code);
        apply(candidate, () =>
          t('gameplay:changedToEscapeAlwaysPausesTheGame', {
            value1: KEY_ACTION_LABELS[action],
            value2: bindingLabels(candidate)[action],
          }),
        );
        buttons.get(action).focus({ preventScroll: true });
      } catch (error) {
        const detail = error.message;
        announce(() =>
          t('gameplay:wasNotAssignedIsUnchangedChooseAnotherKeyOrPress', {
            value1: keyLabel(code) || t('interface:thisKey'),
            value2: detail,
            value3: KEY_ACTION_LABELS[action],
          }),
        );
      }
    },
    true,
  );
  listen(cancelButton, 'click', () => cancel({ focus: true }));
  listen(dialog, 'focusin', (event) => {
    if (
      capturing !== null &&
      event.target !== buttons.get(capturing) &&
      event.target !== cancelButton
    )
      cancel();
  });
  listen(dialog, 'cancel', (event) => {
    if (capturing !== null) {
      event.preventDefault();
      cancel({ focus: true });
    }
  });
  listen(dialog, 'close', () => cancel());
  listen(window, 'blur', () => cancel());
  listen(preset, 'change', () => {
    const id = preset.value;
    cancel({ message: false });
    if (!Object.hasOwn(KEY_BINDING_PRESETS, id)) {
      render();
      return;
    }
    try {
      apply(id === 'default' ? null : KEY_BINDING_PRESETS[id], () =>
        t('gameplay:keyboardPresetAppliedEscapeAlwaysPausesTheGame', {
          value1: KEY_BINDING_PRESET_LABELS[id],
        }),
      );
    } catch (error) {
      render();
      const detail = error.message;
      announce(() => t('gameplay:keyboardPresetWasNotApplied', { value1: detail }));
    }
  });
  listen(reset, 'click', () => {
    cancel({ message: false });
    try {
      apply(null, () => t('interface:defaultKeyboardBindingsRestoredEscapeAlwaysPausesTheGame'));
    } catch (error) {
      render();
      const detail = error.message;
      announce(() => t('gameplay:keyboardBindingsWereNotReset', { value1: detail }));
    }
  });
  function refresh() {
    if (destroyed) return;
    cancel();
    render();
  }
  render();
  announce(() => t('interface:chooseChangeToAssignOnePhysicalKeyEscapeAlwaysPauses'));
  return {
    refresh,
    destroy() {
      if (destroyed) return;
      cancel({ message: false });
      destroyed = true;
      for (const remove of listeners) remove();
      list.replaceChildren();
      cancelButton.hidden = true;
      cancelButton.disabled = true;
      announce('');
    },
  };
}
