import { localizedText, t } from '../i18n/index.mjs';
import { createMissionGoalPreferences } from '../mission-library/goal-preferences.mjs';

/** The host owns content and launch. This view can only remember or reveal an
 * existing row; unavailable saved IDs never create a preparation request. */
export function attachMissionLibraryGoal({
  container,
  library,
  modes,
  getMode,
  getSelectedId,
  isActive,
  reveal,
  onIntent = () => {},
  editionId = 'default',
  getStorage,
  window = globalThis,
}) {
  const doc = container.ownerDocument,
    node = (tag, id) => {
      const item = doc.createElement(tag);
      if (id) item.id = id;
      return item;
    };
  const root = node('section', 'journey-goal'),
    status = node('p', 'journey-goal-status'),
    actionGroup = node('div');
  root.className = 'journey-goal';
  actionGroup.className = 'journey-goal-actions';
  status.setAttribute('role', 'status');
  status.setAttribute('aria-live', 'polite');
  const controls = {},
    stores = new Map(),
    subscriptions = [];
  let disposed = false;
  const active = () => !disposed && isActive();
  const selected = () => {
    const row = library.find(getSelectedId());
    return row?.modes.includes(getMode()) ? row : null;
  };
  root.append(status, actionGroup);
  for (const key of ['pin', 'find', 'clear', 'retry']) {
    const button = node('button', `journey-goal-${key}`);
    button.type = 'button';
    button.className = 'button secondary';
    localizedText(button, () => t('interface:missionGoal.' + key));
    controls[key] = button;
    actionGroup.append(button);
  }
  container.append(root);
  const current = () => stores.get(getMode());
  function refresh() {
    if (disposed) return;
    const state = current()?.snapshot(),
      row = state?.missionId && library.find(state.missionId),
      available = row?.modes.includes(getMode());
    controls.pin.disabled = !selected();
    controls.find.disabled = !available;
    controls.clear.disabled = !state?.missionId;
    controls.retry.hidden = state?.durable !== false;
    localizedText(status, () => {
      const name = available ? (library.presentation?.(row) ?? row).name : '';
      return (
        (state?.missionId
          ? available
            ? t('interface:missionGoal.pinned', { name })
            : t('interface:missionGoal.unavailable')
          : t('interface:missionGoal.empty')) +
        (state?.durable === false ? ' ' + t('interface:missionGoal.session') : '')
      );
    });
  }
  controls.pin.onclick = () => {
    const row = selected();
    if (active() && row) {
      onIntent();
      current().choose(row.id);
    }
  };
  controls.find.onclick = () => {
    if (!active()) return;
    const id = current()?.snapshot().missionId,
      row = library.find(id);
    if (row?.modes.includes(getMode())) {
      onIntent();
      reveal(id, getMode());
    }
  };
  controls.clear.onclick = () => {
    if (active()) {
      onIntent();
      current().choose(null);
    }
  };
  controls.retry.onclick = () => {
    if (active()) {
      onIntent();
      current().retry();
    }
  };
  for (const mode of modes) {
    const store = createMissionGoalPreferences({ editionId, mode, getStorage, window });
    stores.set(mode, store);
    subscriptions.push(store.subscribe(refresh));
  }
  refresh();
  return {
    refresh,
    dispose() {
      if (disposed) return;
      disposed = true;
      subscriptions.forEach((stop) => stop());
      stores.forEach((store) => store.dispose());
      Object.values(controls).forEach((button) => (button.onclick = null));
      root.remove();
    },
  };
}
