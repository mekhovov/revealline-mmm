import { isTestedTX15, tx15StickProfile } from './tx15-presets.mjs';
import { t, onLocaleChange } from '../i18n/index.mjs';
import {
  ACTIONS,
  createProfileStore,
  emptyProfile,
  buttonValue,
  mapProfile,
  validateProfile,
  deviceDescriptor,
} from './controller-profiles.mjs';
const tr = (key, values = {}) => t(`interface:multiplayerControllers.${key}`, values);
export function mountControllerSetup({
  root,
  session,
  solo = false,
  storageKey,
  document: doc = globalThis.document,
  window: win = globalThis.window,
}) {
  if (!root) return { refresh() {}, dispose() {} };
  let storage;
  try {
    storage = win.localStorage;
  } catch {
    /* Session-only profiles remain usable. */
  }
  const store = createProfileStore(storage, storageKey);
  let storedRevision = -1,
    storedProfiles = [];
  let draft = null,
    baseline = null,
    signature = '',
    message = '',
    selectedGeneration = null;
  const area = doc.createElement('section');
  area.className = 'multiplayer-controllers';
  root.appendChild(area);
  const node = (tag, parent = area) => {
    const el = doc.createElement(tag);
    parent.appendChild(el);
    return el;
  };
  const heading = node('h3'),
    intro = node('p'),
    status = node('p');
  status.setAttribute('role', 'status');
  const deviceLabel = node('label'),
    deviceText = node('span', deviceLabel),
    devices = node('select', deviceLabel);
  const profileLabel = node('label'),
    profileText = node('span', profileLabel),
    profiles = node('select', profileLabel);
  const controls = [];
  function button(key, fn, parent = area) {
    const el = node('button', parent);
    el.type = 'button';
    el.setAttribute('data-controller-action', key);
    el.onclick = () => {
      try {
        fn();
      } catch (e) {
        message = e.message;
      }
      refresh();
    };
    controls.push([el, key]);
    return el;
  }
  const assignment = node('div');
  assignment.className = 'race-fields';
  assignment.hidden = solo;
  const join1 = button('join1', () => session.assign(Number(devices.value), 0), assignment);
  const join2 = button('join2', () => session.assign(Number(devices.value), 1), assignment);
  button(
    'swap',
    () => {
      session.swap();
      message = '';
    },
    assignment,
  );
  button('release1', () => session.release(0), assignment);
  button('release2', () => session.release(1), assignment);
  button('menu1', () => session.menu(0), assignment);
  button('menu2', () => session.menu(1), assignment);
  const tx15Solo = button('tx15Right', () => {
    const index = Number(devices.value),
      pad = session.raw(index);
    session.apply(index, tx15StickProfile(pad));
    message = tr('tx15Applied');
  });
  const tx15Shared = button('tx15Shared', () => {
    const index = Number(devices.value),
      pad = session.raw(index);
    if (session.split(index, [tx15StickProfile(pad, 'left'), tx15StickProfile(pad)]))
      message = tr('tx15SplitApplied');
  });
  tx15Shared.hidden = solo;
  button('forgetRestore', () => {
    message = tr(session.forgetSaved() ? 'restoreForgotten' : 'restoreFailed');
  });
  const restorationNote = node('p');
  const profileActions = node('div');
  profileActions.className = 'race-fields';
  function begin(profile) {
    const pad = session.raw(Number(devices.value));
    if (!pad) throw new Error(tr('chooseDevice'));
    draft = profile
      ? structuredClone(profile)
      : emptyProfile(pad, `pad-${Date.now().toString(36)}`, tr('profileName'));
    draft.device = deviceDescriptor(pad);
    baseline = null;
    message = '';
    name.value = draft.name;
    editor.hidden = false;
    selectedGeneration = session.state().devices.find((d) => d.index === pad.index)?.generation;
    session.capture(true);
  }
  const actionGuide = button(
    'actionGuide',
    () => {
      const d = session.state().devices.find((d) => d.index === Number(devices.value));
      if (!d?.profile) throw new Error(tr('chooseDevice'));
      begin(d.profile);
      action.value = 'flight:action';
      message = tr('actionGuideHelp');
    },
    profileActions,
  );
  button(
    'configure',
    () => {
      const d = session.state().devices.find((d) => d.index === Number(devices.value));
      begin(d?.profile);
      if (d?.standard) {
        draft.id = `pad-${Date.now().toString(36)}`;
        draft.name = name.value = tr('profileName');
      }
    },
    profileActions,
  );
  button(
    'load',
    () => {
      const p = store.snapshot().profiles.find((p) => p.id === profiles.value);
      if (p) begin(p);
    },
    profileActions,
  );
  button(
    'delete',
    () => {
      store.remove(profiles.value);
      signature = '';
    },
    profileActions,
  );
  const editor = node('fieldset');
  editor.hidden = true;
  const legend = node('legend', editor),
    name = node('input', editor);
  name.maxLength = 120;
  const action = node('select', editor);
  for (const [context, actions] of Object.entries(ACTIONS))
    for (const key of actions) {
      const o = node('option', action);
      o.value = `${context}:${key}`;
      o.textContent = `${tr(context === 'flight' ? 'flightLabel' : 'menuLabel')} — ${tr(`${context}.${key}`)}`;
    }
  action.value = 'flight:up';
  const type = node('select', editor);
  for (const kind of ['button', 'axis', 'hat']) {
    const o = node('option', type);
    o.value = kind;
    o.textContent = tr(kind);
  }
  type.value = 'button';
  const captureHelp = node('p', editor),
    rawOutput = node('output', editor),
    preview = node('p', editor);
  button(
    'released',
    () => {
      const pad = session.raw(Number(devices.value));
      if (!pad) return;
      baseline = {
        buttons: Array.from(pad.buttons || [], buttonValue),
        axes: Array.from(pad.axes || []),
      };
      message = tr('moveControl');
    },
    editor,
  );
  button(
    'capture',
    () => {
      const pad = session.raw(Number(devices.value));
      if (!draft || !baseline || !pad) throw new Error(tr('recordFirst'));
      const [context, key] = action.value.split(':');
      let source;
      if (type.value === 'button') {
        const changed = Array.from(pad.buttons || [], (b, index) => ({
          index,
          value: buttonValue(b),
          before: baseline.buttons[index] || 0,
        })).filter((x) => Math.abs(x.value - x.before) > 0.4);
        if (changed.length !== 1) throw new Error(tr('oneControl'));
        const c = changed[0];
        source = { kind: 'button', index: c.index, threshold: 0.5, invert: c.value < c.before };
      } else {
        const changed = Array.from(pad.axes || [], (value, index) => ({
          index,
          value,
          before: baseline.axes[index],
        })).filter((x) => Number.isFinite(x.before) && Math.abs(x.value - x.before) > 0.2);
        if (changed.length !== 1) throw new Error(tr('oneControl'));
        const c = changed[0];
        source =
          type.value === 'hat'
            ? { kind: 'hat', index: c.index, values: [c.value], tolerance: 0.03 }
            : {
                kind: 'axis',
                index: c.index,
                center: c.before,
                end: c.value,
                press: 0.35,
                release: 0.25,
              };
      }
      draft[context][key] = [source];
      baseline = null;
      check.checked = false;
      message = tr('captured');
    },
    editor,
  );
  button(
    'addHat',
    () => {
      const pad = session.raw(Number(devices.value)),
        [context, key] = action.value.split(':'),
        s = draft?.[context]?.[key]?.[0];
      if (s?.kind !== 'hat' || !pad) throw new Error(tr('hatFirst'));
      const value = pad.axes[s.index];
      if (!s.values.some((v) => Math.abs(v - value) <= s.tolerance)) s.values.push(value);
      check.checked = false;
      message = tr('captured');
    },
    editor,
  );
  button(
    'unmap',
    () => {
      const [context, key] = action.value.split(':');
      draft[context][key] = [];
      check.checked = false;
    },
    editor,
  );
  const thresholdLabel = node('label', editor),
    pressThreshold = node('input', thresholdLabel),
    releaseLabel = node('label', editor),
    releaseThreshold = node('input', releaseLabel);
  for (const field of [pressThreshold, releaseThreshold]) {
    field.type = 'number';
    field.min = '0.02';
    field.max = '0.9';
    field.step = '0.01';
  }
  const thresholdText = node('span', thresholdLabel),
    releaseText = node('span', releaseLabel);
  pressThreshold.min = '0.1';
  pressThreshold.value = '0.35';
  releaseThreshold.value = '0.25';
  button(
    'thresholds',
    () => {
      const [context, key] = action.value.split(':');
      const source = draft?.[context]?.[key]?.[0];
      if (source?.kind !== 'axis') throw new Error(tr('axisFirst'));
      const candidate = structuredClone(draft),
        target = candidate[context][key][0];
      target.press = Number(pressThreshold.value);
      target.release = Number(releaseThreshold.value);
      draft = validateProfile(candidate);
      check.checked = false;
    },
    editor,
  );
  button(
    'nextAction',
    () => {
      const steps = [
        'flight:action',
        'flight:pickup',
        'flight:boost',
        'flight:pause',
        'menu:confirm',
        'menu:back',
        'menu:menu',
      ];
      action.value = steps[(steps.indexOf(action.value) + 1) % steps.length];
      baseline = null;
      message = tr('actionGuideHelp');
    },
    editor,
  );
  const verified = node('label', editor),
    check = node('input', verified);
  check.type = 'checkbox';
  const verifyText = node('span', verified);
  button(
    'apply',
    () => {
      if (!check.checked) throw new Error(tr('verify'));
      draft.name = name.value;
      const p = validateProfile(draft);
      if (!session.apply(Number(devices.value), p)) throw new Error(tr('chooseDevice'));
      store.put(p);
      cancel();
      signature = '';
    },
    editor,
  );
  button('cancel', () => cancel(), editor);
  function cancel() {
    draft = null;
    baseline = null;
    editor.hidden = true;
    check.checked = false;
    session.capture(false);
  }
  const transfers = node('details'),
    summary = node('summary', transfers),
    transfer = node('textarea', transfers);
  transfer.rows = 5;
  transfer.maxLength = 262144;
  button(
    'export',
    () => {
      transfer.value = store.export();
    },
    transfers,
  );
  button(
    'import',
    () => {
      store.import(transfer.value);
      signature = '';
    },
    transfers,
  );
  button(
    'undo',
    () => {
      store.undo();
      signature = '';
    },
    transfers,
  );
  button('retry', () => store.retry(), transfers);
  const persistence = node('p', transfers);
  function labels() {
    deviceText.textContent = tr('device');
    profileText.textContent = tr(solo ? 'soloSaved' : 'saved');
    thresholdText.textContent = tr('pressThreshold');
    releaseText.textContent = tr('releaseThreshold');
    heading.textContent = tr(solo ? 'soloTitle' : 'title');
    intro.textContent = tr(solo ? 'soloIntro' : 'intro');
    devices.setAttribute('aria-label', tr('device'));
    profiles.setAttribute('aria-label', tr(solo ? 'soloSaved' : 'saved'));
    legend.textContent = tr('setup');
    name.setAttribute('aria-label', tr('profileName'));
    pressThreshold.setAttribute('aria-label', tr('pressThreshold'));
    releaseThreshold.setAttribute('aria-label', tr('releaseThreshold'));
    action.setAttribute('aria-label', tr('action'));
    type.setAttribute('aria-label', tr('type'));
    captureHelp.textContent = tr('captureHelp');
    summary.textContent = tr('transfer');
    transfer.setAttribute('aria-label', tr('transfer'));
    verifyText.textContent = tr('verify');
    controls.forEach(([el, key]) => {
      el.textContent = tr(key);
    });
    for (const o of action.options || []) {
      const [context, key] = o.value.split(':');
      o.textContent = `${tr(context === 'flight' ? 'flightLabel' : 'menuLabel')} — ${tr(`${context}.${key}`)}`;
    }
    for (const o of type.options || []) o.textContent = tr(o.value);
  }
  function refresh() {
    if (root.closest('[hidden], [inert], dialog:not([open])')) {
      if (draft) {
        cancel();
        message = tr('interrupted');
      }
      return;
    }
    if (storedRevision !== store.revision()) {
      storedRevision = store.revision();
      storedProfiles = store.snapshot().profiles;
    }
    const state = session.state(),
      list = state.devices,
      key = JSON.stringify([
        list.map((d) => [d.index, d.generation]),
        storedProfiles.map((p) => [p.id, p.name]),
      ]);
    if (key !== signature) {
      signature = key;
      const selected = devices.value;
      devices.replaceChildren();
      for (const d of list) {
        const o = node('option', devices);
        o.value = String(d.index);
        o.textContent =
          d.index >= 1024 ? d.profile.name : `${d.index + 1}: ${d.device.id || tr('device')}`;
      }
      if (list.some((d) => String(d.index) === selected)) devices.value = selected;
      else if (list.length) devices.value = String(list[0].index);
      const saved = profiles.value;
      profiles.replaceChildren();
      for (const p of storedProfiles) {
        const o = node('option', profiles);
        o.value = p.id;
        o.textContent = p.name;
      }
      if (storedProfiles.some((p) => p.id === saved)) profiles.value = saved;
      else if (storedProfiles.length) profiles.value = storedProfiles[0].id;
    }
    if (
      draft &&
      (!state.editable ||
        root.closest('[hidden], [inert], dialog:not([open])') ||
        list.find((d) => d.index === Number(devices.value))?.generation !== selectedGeneration)
    ) {
      cancel();
      message = tr('interrupted');
    }
    controls.forEach(([el, key]) => {
      el.disabled =
        !state.editable ||
        (['configure', 'join1', 'join2'].includes(key) && !list.length) ||
        (['load', 'delete'].includes(key) && !storedProfiles.length) ||
        (['swap', 'release1', 'menu1'].includes(key) && state.seats[0] === null) ||
        (['swap', 'release2', 'menu2'].includes(key) && state.seats[1] === null) ||
        (draft && !editor.contains(el));
    });
    join1.disabled = join2.disabled =
      !!draft || !state.editable || !list.find((d) => d.index === Number(devices.value))?.profile;
    const selectedPad = session.raw(Number(devices.value));
    tx15Solo.disabled = tx15Shared.disabled =
      !!draft || !state.editable || !isTestedTX15(selectedPad) || Number(devices.value) >= 1024;
    actionGuide.disabled =
      !!draft || !state.editable || !list.find((d) => d.index === Number(devices.value))?.profile;
    restorationNote.textContent = tr(state.restoreError ? 'restoreFailed' : 'restoreHelp');
    devices.disabled = !list.length || !!draft;
    profiles.disabled = !storedProfiles.length || !!draft;
    const text =
      state.available === 'unavailable'
        ? tr('unavailable')
        : solo
          ? list
              .map((d) => `${d.device.id}: ${tr(d.profile ? 'soloApplied' : 'soloUnmapped')}`)
              .join(' · ')
          : state.seats
              .map(
                (index, i) =>
                  `${tr('player', { number: i + 1 })}: ${index === null ? tr('notJoined') : list.find((d) => d.index === index)?.profile?.name || list.find((d) => d.index === index)?.device.id || tr('device')}`,
              )
              .join(' · ');
    const content = `${text}${message ? ` · ${message}` : ''}`;
    if (status.textContent !== content) status.textContent = content;
    const persistenceText = store.error()
      ? `${tr('sessionOnly')} ${store.error()}`
      : tr(solo ? 'soloSeparateProfiles' : 'separateProfiles');
    if (persistence.textContent !== persistenceText) persistence.textContent = persistenceText;
    if (draft) {
      const pad = session.raw(Number(devices.value));
      if (pad) {
        rawOutput.textContent = `${tr('axes')}: ${Array.from(pad.axes || [], (v, i) => `${i}:${Number(v).toFixed(2)}`).join(' ')} · ${tr('buttons')}: ${Array.from(
          pad.buttons || [],
          (b, i) => (buttonValue(b) > 0 ? `${i}:${buttonValue(b).toFixed(2)}` : ''),
        )
          .filter(Boolean)
          .join(' ')}`;
        const mapped = mapProfile(draft, pad);
        preview.textContent = Object.entries(ACTIONS)
          .map(
            ([context, actions]) =>
              `${tr(context === 'flight' ? 'flightLabel' : 'menuLabel')}: ${actions
                .filter((a) => mapped[context][a])
                .map((a) => tr(`${context}.${a}`))
                .join(', ')} · ${tr('unmapped')}: ${actions
                .filter((a) => !draft[context][a].length)
                .map((a) => tr(`${context}.${a}`))
                .join(', ')}`,
          )
          .join(' | ');
      }
    }
  }
  const interrupt = () => {
    if (draft) {
      cancel();
      message = tr('interrupted');
    }
  };
  win.addEventListener('blur', interrupt);
  doc.addEventListener('visibilitychange', interrupt);
  devices.onchange = interrupt;
  action.onchange = type.onchange = () => {
    baseline = null;
    check.checked = false;
  };
  labels();
  const unsubscribe = onLocaleChange(labels);
  refresh();
  return {
    refresh,
    dispose() {
      unsubscribe?.();
      win.removeEventListener('blur', interrupt);
      doc.removeEventListener('visibilitychange', interrupt);
      area.remove();
    },
  };
}
