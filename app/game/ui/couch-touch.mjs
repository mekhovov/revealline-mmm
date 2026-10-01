import { t, localizedText } from '../i18n/index.mjs';
import { createTouchPreferences } from '../touch-preferences.mjs';

/** Both local seats use Solo's gesture engine and preference vocabulary. */
export function attachCouchTouch({
  document: doc = globalThis.document,
  controls,
  clear = () => {},
}) {
  const pads = [...doc.querySelectorAll('.race-pad')];
  let preferences;
  function paint() {
    const settings = preferences.snapshot();
    for (const pad of pads) {
      pad.dataset.touchMode = settings.mode;
      pad.dataset.touchSize = settings.size;
      pad.style.setProperty('--touch-opacity', settings.opacity);
      pad.querySelector('.race-cross').hidden = settings.mode !== 'dpad';
      pad.querySelector('.touch-surface').hidden = settings.mode === 'dpad';
      localizedText(pad.querySelector('.touch-instruction'), () =>
        settings.mode === 'swipe' ? t('interface:swipeToSteer') : t('interface:dragToSteer'),
      );
    }
    for (const field of controls.querySelectorAll('[data-touch-setting]'))
      field.value = String(settings[field.dataset.touchSetting]);
    const status = group.querySelector('[role="status"]');
    if (status) localizedText(status, () => preferences.warning());
  }
  preferences = createTouchPreferences({
    onChange: () => {
      clear();
      paint();
    },
  });
  for (const pad of pads) {
    const surface = doc.createElement('div');
    surface.className = 'touch-surface';
    surface.setAttribute('role', 'group');
    const compass = doc.createElement('span');
    localizedText(compass, () => '✥');
    compass.setAttribute('aria-hidden', 'true');
    const instruction = doc.createElement('span');
    instruction.className = 'touch-instruction';
    surface.append(compass, instruction);
    surface.setAttribute('aria-label', `Player ${Number(pad.dataset.player) + 1} steering area`);
    const indicator = doc.createElement('span');
    indicator.className = 'touch-indicator';
    indicator.hidden = true;
    indicator.setAttribute('aria-hidden', 'true');
    indicator.append(doc.createElement('i'));
    pad.append(surface, ...pad.children, indicator);
  }
  const group = doc.createElement('fieldset');
  const legend = doc.createElement('legend');
  localizedText(legend, () => t('interface:sharedTouchControls'));
  group.append(legend);
  for (const [key, title, choices] of [
    [
      'mode',
      t('interface:steering'),
      [
        ['stick', t('interface:floatingStick')],
        ['swipe', t('interface:swipe')],
        ['dpad', t('interface:directionPad')],
      ],
    ],
    [
      'size',
      t('interface:controlSize'),
      [
        ['regular', t('interface:regular')],
        ['large', t('interface:large')],
      ],
    ],
    [
      'opacity',
      t('interface:visibility'),
      [
        ['0.55', t('interface:soft')],
        ['1', t('interface:solid')],
      ],
    ],
  ]) {
    const label = doc.createElement('label'),
      select = doc.createElement(key === 'opacity' ? 'input' : 'select');
    if (key === 'opacity') {
      select.type = 'range';
      select.min = '0.2';
      select.max = '1';
      select.step = '0.05';
    }
    localizedText(label, () => title);
    select.dataset.touchSetting = key;
    for (const [value, text] of key === 'opacity' ? [] : choices) {
      const option = doc.createElement('option');
      option.value = value;
      localizedText(option, () => text);
      select.append(option);
    }
    select.onchange = () =>
      preferences.set({
        ...preferences.snapshot(),
        [key]: key === 'opacity' ? Number(select.value) : select.value,
      });
    label.append(select);
    group.append(label);
  }
  const status = doc.createElement('p');
  status.setAttribute('role', 'status');
  group.append(status);
  controls.append(group);
  paint();
  return {
    snapshot: preferences.snapshot,
    destroy: () => {
      preferences.destroy();
      group.remove();
    },
  };
}
