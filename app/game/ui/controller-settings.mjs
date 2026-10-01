import {
  t,
  localizedText,
  localizedAttribute,
  localizedMessage,
  formatNumber,
} from '../i18n/index.mjs';
import { createOperationStatus } from './operation-status.mjs';
import {
  CONTROLLER_BINDING_ACTIONS,
  CONTROLLER_ACTION_LABELS,
  CONTROLLER_GLYPH_FAMILIES,
  controllerButtonLabel,
  controllerStickLabel,
  resolveControllerBindings,
  validateControllerBindings,
} from '../controller-bindings.mjs';

const FAMILY_LABELS = {
  get generic() {
    return t('interface:automaticPositionLabels');
  },
  get xbox() {
    return t('interface:xboxLabels');
  },
  get playstation() {
    return t('interface:playstationLabels');
  },
};
const CONTEXT_LABELS = {
  get flight() {
    return t('interface:flight');
  },
  get menu() {
    return t('interface:menus');
  },
};

/** A complete draft editor. The host owns adoption/persistence and input reset.
 * Async hosts must check signal/isCurrent before committing side effects.
 * {ok:false,warning} means session adoption succeeded but persistence did not.
 */
export function attachControllerSettings({
  container,
  document: doc = globalThis.document,
  getBindings,
  onApply,
  onBeforeEdit = () => {},
  continuousSteering = false,
} = {}) {
  if (
    !container ||
    !doc?.createElement ||
    typeof getBindings !== 'function' ||
    typeof onApply !== 'function' ||
    typeof onBeforeEdit !== 'function'
  )
    throw new TypeError(
      t('interface:controllerSettingsRequireAContainerDocumentAndBindingCallbacks'),
    );
  const listeners = [],
    controls = new Map(),
    buttonSelects = [],
    outputs = new Map();
  let draft = null,
    baseline = '',
    generation = 0,
    destroyed = false,
    busy = false,
    sourceValid = true,
    pending = null;
  const prefix = container.id || 'controller-settings';
  const node = (tag, text, className) => {
    const element = doc.createElement(tag);
    if (text !== undefined) localizedText(element, () => text);
    if (className) element.className = className;
    return element;
  };
  const listen = (target, type, callback) => {
    target.addEventListener(type, callback);
    listeners.push(() => target.removeEventListener(type, callback));
  };
  const button = (text, action) => {
    const element = node('button', text, 'button secondary');
    element.type = 'button';
    element.dataset.controllerSettingsAction = action;
    return element;
  };
  const heading = node(
      'h3',
      localizedMessage('interface:controllerControls'),
      'controller-settings-heading',
    ),
    summary = node('p', '', 'controller-settings-summary'),
    note = node(
      'p',
      localizedMessage('interface:useACompleteDraftToSwapButtonsYourCurrentController'),
      'controller-settings-note',
    ),
    edit = button(localizedMessage('interface:editControllerSettings'), 'edit'),
    editor = node('div', undefined, 'controller-settings-editor'),
    status = node('p', undefined, 'controller-settings-status'),
    errors = node('ul', undefined, 'controller-settings-errors'),
    actions = node('div', undefined, 'controller-settings-actions'),
    apply = button(localizedMessage('interface:applyControllerSettings'), 'apply'),
    cancel = button(localizedMessage('interface:cancelDraft'), 'cancel'),
    defaults = button(localizedMessage('interface:restoreDefaultsInDraft'), 'defaults');
  editor.hidden = true;
  status.id = `${prefix}-status`;
  status.setAttribute('role', 'status');
  status.setAttribute('aria-live', 'polite');
  status.setAttribute('aria-atomic', 'true');
  errors.hidden = true;
  editor.setAttribute('aria-describedby', status.id);
  actions.append(apply, cancel, defaults);
  const presenter = createOperationStatus(status);
  const announce = (message, state = 'ready') => {
    const lease = presenter.begin({ message });
    if (state !== 'busy') lease.finish({ message, state });
  };
  function clearErrors() {
    errors.replaceChildren();
    errors.hidden = true;
  }
  function showErrors(messages) {
    errors.replaceChildren(...messages.map((message) => node('li', message)));
    errors.hidden = messages.length === 0;
  }
  const signature = (value) => JSON.stringify(resolveControllerBindings(value));
  const thresholdText = (value) =>
    formatNumber(value, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const currentSource = () => resolveControllerBindings(getBindings());
  function syncSummary() {
    try {
      const value = currentSource();
      sourceValid = true;
      localizedText(summary, () =>
        t('gameplay:flightMenusDeadZone', {
          value1: FAMILY_LABELS[value.glyphFamily],
          value2: controllerStickLabel(value, 'flight'),
          value3: controllerStickLabel(value, 'menu'),
          value4: thresholdText(value.deadZone.press),
          value5: thresholdText(value.deadZone.release),
        }),
      );
    } catch (error) {
      sourceValid = false;
      localizedText(summary, () => t('interface:currentControllerSettingsCouldNotBeRead'));
      announce(error.message);
    }
  }
  function syncBusy() {
    edit.disabled = destroyed || busy || !sourceValid;
    apply.disabled = busy || !draft;
    cancel.disabled = busy || !draft;
    defaults.disabled = busy || !draft;
    for (const control of controls.values()) control.disabled = busy || !draft;
    editor.setAttribute('aria-busy', String(busy));
  }
  function invalidate(message) {
    generation++;
    pending?.abort();
    draft = null;
    baseline = '';
    editor.hidden = true;
    edit.hidden = false;
    clearErrors();
    syncSummary();
    syncBusy();
    if (sourceValid) announce(message);
  }
  function checkSource() {
    if (!draft || destroyed || busy) return false;
    try {
      if (signature(getBindings()) === baseline) return true;
      invalidate(
        localizedMessage(
          'interface:controllerSettingsChangedElsewhereYourOldDraftWasDiscardedChoose',
        ),
      );
    } catch (error) {
      invalidate(localizedMessage('gameplay:draftDiscarded', { value1: error.message }));
    }
    return false;
  }
  const read = (path) => path.split('.').reduce((value, key) => value[key], draft);
  function write(path, value) {
    if (!checkSource()) return;
    const keys = path.split('.'),
      last = keys.pop();
    keys.reduce((object, key) => object[key], draft)[last] = value;
    clearErrors();
    announce(localizedMessage('interface:draftChangedCurrentControlsAreUnchangedUntilApply'));
    if (path === 'glyphFamily') updateButtonLabels();
    if (outputs.has(path)) localizedText(outputs.get(path), () => thresholdText(Number(value)));
  }
  function field(parent, path, labelText, { type = 'select', choices = [], min, max, step } = {}) {
    const label = node('label', undefined, 'controller-settings-field'),
      caption = node('span', labelText),
      control = node(type === 'select' ? 'select' : 'input');
    control.id = `${prefix}-${path.replaceAll('.', '-')}`;
    localizedAttribute(control, 'aria-label', () => labelText);
    control.dataset.controllerSetting = path;
    if (type !== 'select') control.type = type;
    if (min !== undefined) control.min = String(min);
    if (max !== undefined) control.max = String(max);
    if (step !== undefined) control.step = String(step);
    for (const [value, text] of choices) {
      const option = node('option', text);
      option.value = String(value);
      control.append(option);
    }
    controls.set(path, control);
    label.append(caption, control);
    if (type === 'range') {
      const output = node('output');
      output.setAttribute('for', control.id);
      outputs.set(path, output);
      label.append(output);
    }
    parent.append(label);
    const changed = () =>
      write(
        path,
        type === 'checkbox'
          ? control.checked
          : path === 'glyphFamily'
            ? control.value
            : Number(control.value),
      );
    listen(control, 'change', changed);
    if (type === 'range') listen(control, 'input', changed);
    return control;
  }
  function section(title, description, open = false) {
    const details = node('details', undefined, 'controller-settings-section'),
      body = node('div', undefined, 'controller-settings-section-body');
    details.open = open;
    details.append(node('summary', title));
    body.append(node('p', description, 'controller-settings-note'));
    details.append(body);
    editor.append(details);
    return body;
  }
  field(editor, 'glyphFamily', localizedMessage('interface:buttonLabelFamily'), {
    choices: CONTROLLER_GLYPH_FAMILIES.map((family) => [family, () => FAMILY_LABELS[family]]),
  });
  editor.append(
    node(
      'p',
      localizedMessage(
        'interface:automaticUsesDetectedXboxOrPlaystationNamesOtherwiseButtonPositions',
      ),
      'controller-settings-note',
    ),
  );
  for (const context of ['flight', 'menu']) {
    const body = section(
      () => t('gameplay:buttonMap', { value1: CONTEXT_LABELS[context] }),
      localizedMessage('interface:chooseOneButtonPerActionAButtonMayBeReused'),
    );
    for (const action of CONTROLLER_BINDING_ACTIONS[context]) {
      const select = field(
        body,
        `${context}.buttons.${action}`,
        () =>
          t('gameplay:button', {
            value1:
              continuousSteering && context === 'flight' && action === 'stop'
                ? t('interface:pauseBack')
                : CONTROLLER_ACTION_LABELS[context][action],
          }),
        {
          choices: Array.from({ length: 16 }, (_, index) => [
            index,
            () => `${controllerButtonLabel(index)} · ${index}`,
          ]),
        },
      );
      buttonSelects.push(select);
    }
  }
  const sticks = section(
    localizedMessage('interface:stickControls'),
    localizedMessage('interface:flightAndMenusCanUseDifferentAxisPairsOrButtons'),
  );
  for (const context of ['flight', 'menu']) {
    const group = node('fieldset');
    group.append(node('legend', () => t('gameplay:stick', { value1: CONTEXT_LABELS[context] })));
    field(group, `${context}.stick.enabled`, localizedMessage('interface:enableStickInput'), {
      type: 'checkbox',
    });
    for (const [key, label] of [
      ['xAxis', localizedMessage('interface:horizontalAxis')],
      ['yAxis', localizedMessage('interface:verticalAxis')],
    ])
      field(group, `${context}.stick.${key}`, label, {
        choices: Array.from({ length: 4 }, (_, i) => [
          i,
          localizedMessage('gameplay:axis', { value1: i }),
        ]),
      });
    field(
      group,
      `${context}.stick.invertX`,
      localizedMessage('interface:invertHorizontalDirection'),
      { type: 'checkbox' },
    );
    field(
      group,
      `${context}.stick.invertY`,
      localizedMessage('interface:invertVerticalDirection'),
      { type: 'checkbox' },
    );
    sticks.append(group);
  }
  const thresholds = section(
    localizedMessage('interface:deadZoneAndRelease'),
    localizedMessage('interface:pressStartsStickMovementReleaseKeepsItActiveAboveThis'),
  );
  field(thresholds, 'deadZone.press', localizedMessage('interface:pressThreshold'), {
    type: 'range',
    min: 0.1,
    max: 0.6,
    step: 0.01,
  });
  field(thresholds, 'deadZone.release', localizedMessage('interface:releaseThreshold'), {
    type: 'range',
    min: 0.02,
    max: 0.6,
    step: 0.01,
  });
  editor.append(errors, actions);
  container.replaceChildren(heading, summary, note, edit, editor, status);
  function updateButtonLabels() {
    // A closed editor stays mounted after Apply/Cancel. Retain its accepted
    // label family without dereferencing a subsequently discarded draft.
    const family = draft.glyphFamily;
    for (const select of buttonSelects)
      [...select.options].forEach((option, index) => {
        localizedText(option, () => `${controllerButtonLabel(index, family)} · ${index}`);
      });
  }
  function renderDraft() {
    for (const [path, control] of controls) {
      const value = read(path);
      if (control.type === 'checkbox') control.checked = value;
      else control.value = String(value);
      if (outputs.has(path)) localizedText(outputs.get(path), () => thresholdText(value));
    }
    updateButtonLabels();
    syncBusy();
  }
  listen(edit, 'click', () => {
    if (destroyed || busy || draft) return;
    try {
      onBeforeEdit();
      draft = currentSource();
      baseline = signature(draft);
      generation++;
      clearErrors();
      editor.hidden = false;
      edit.hidden = true;
      renderDraft();
      announce(
        localizedMessage('interface:editingADraftApplyValidatesAllControlsTogetherCancelKeeps'),
      );
      controls.get('glyphFamily').focus({ preventScroll: true });
    } catch (error) {
      invalidate(
        localizedMessage('gameplay:controllerSettingsCouldNotBeEdited', { value1: error.message }),
      );
    }
  });
  listen(cancel, 'click', () => {
    if (destroyed || busy || !draft) return;
    invalidate(localizedMessage('interface:draftCancelledCurrentControllerSettingsAreUnchanged'));
    edit.focus({ preventScroll: true });
  });
  listen(defaults, 'click', () => {
    if (!checkSource()) return;
    draft = resolveControllerBindings(null);
    renderDraft();
    clearErrors();
    announce(localizedMessage('interface:defaultsAreInTheDraftApplyToUseThemOr'));
  });
  listen(apply, 'click', async () => {
    if (!checkSource()) return;
    const validation = validateControllerBindings(draft);
    if (!validation.valid) {
      showErrors(validation.errors);
      announce(
        localizedMessage('gameplay:controllerSettingsWereNotAppliedReviewTheDraftAndApply', {
          value1: validation.errors[0],
        }),
      );
      return;
    }
    const candidate = resolveControllerBindings(draft),
      expected = signature(candidate),
      ticket = generation,
      abort = new AbortController();
    let focusAfterApply = false,
      restoreApplyFocus = container.contains(doc.activeElement);
    // Disabling the initiating control can natively blur to body. Remember that
    // ownership, but relinquish it after any later focus or input choice.
    const relinquishFocus = () => {
      restoreApplyFocus = false;
    };
    const focusChanged = (event) => {
      if (event.target !== doc.body) relinquishFocus();
    };
    const focusListeners = [
      ['focusin', focusChanged],
      ['pointerdown', relinquishFocus],
      ['keydown', relinquishFocus],
      ['visibilitychange', relinquishFocus],
    ];
    const stopObservingFocus = () => {
      for (const [type, callback] of focusListeners) doc.removeEventListener(type, callback);
      doc.defaultView?.removeEventListener('blur', relinquishFocus);
      abort.signal.removeEventListener('abort', stopObservingFocus);
    };
    for (const [type, callback] of focusListeners) doc.addEventListener(type, callback);
    doc.defaultView?.addEventListener('blur', relinquishFocus);
    abort.signal.addEventListener('abort', stopObservingFocus, { once: true });
    pending = abort;
    busy = true;
    syncBusy();
    announce(localizedMessage('interface:applyingControllerSettings'), 'busy');
    const isCurrent = () => {
      if (destroyed || abort.signal.aborted || generation !== ticket) return false;
      try {
        const actual = signature(getBindings());
        return actual === baseline || actual === expected;
      } catch {
        return false;
      }
    };
    try {
      const result = await onApply(candidate, { signal: abort.signal, isCurrent });
      if (destroyed || generation !== ticket || abort.signal.aborted) return;
      if (signature(getBindings()) !== expected) {
        invalidate(
          localizedMessage(
            'interface:theCurrentControllerSettingsChangedBeforeThisDraftWasAdopted',
          ),
        );
        return;
      }
      draft = null;
      baseline = '';
      editor.hidden = true;
      edit.hidden = false;
      clearErrors();
      syncSummary();
      announce(() =>
        t('gameplay:controllerSettingsApplied', {
          value1:
            result?.ok === false
              ? ` ${result.warning || t('interface:theNewMapAppliesToThisSessionOnlyItCould')}`
              : '',
        }),
      );
      focusAfterApply = true;
    } catch (error) {
      if (!destroyed && generation === ticket && !abort.signal.aborted) {
        let unchanged = false;
        try {
          unchanged = signature(getBindings()) === baseline;
        } catch {}
        if (!unchanged)
          invalidate(
            localizedMessage(
              'interface:controllerSettingsChangedDuringThisOperationReviewTheCurrentSettings',
            ),
          );
        else
          announce(
            localizedMessage('gameplay:controllerSettingsWereNotApplied', {
              value1: error.message,
            }),
            'error',
          );
      }
    } finally {
      stopObservingFocus();
      if (pending === abort) {
        pending = null;
        busy = false;
        if (!destroyed) {
          syncBusy();
          if (
            focusAfterApply &&
            restoreApplyFocus &&
            generation === ticket &&
            !doc.hidden &&
            doc.hasFocus?.() !== false &&
            container.isConnected !== false &&
            (container.contains(doc.activeElement) || doc.activeElement === doc.body)
          )
            edit.focus({ preventScroll: true });
        }
      }
    }
  });
  function refresh() {
    if (destroyed) return;
    invalidate(localizedMessage('interface:currentControllerSettingsLoadedChooseEditToMakeADraft'));
  }
  refresh();
  return {
    refresh,
    destroy() {
      if (destroyed) return;
      destroyed = true;
      generation++;
      pending?.abort();
      for (const remove of listeners) remove();
      presenter.dispose();
      container.replaceChildren();
    },
  };
}
