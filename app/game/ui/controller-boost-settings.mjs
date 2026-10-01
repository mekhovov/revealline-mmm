import { localizedText, t } from '../i18n/index.mjs';
import { resolveControllerBoostMode } from '../controller-boost.mjs';

/** This select is an independent preference, outside the button-map draft.
 * applyMode adopts synchronously and returns its actual persistence result. */
export function attachControllerBoostSettings({ select, status, getMode, applyMode }) {
  let destroyed = false;
  const refresh = () => {
    if (destroyed) return;
    const mode = resolveControllerBoostMode(getMode());
    select.value = mode;
    localizedText(status, () =>
      t('gameplay:controllerBoost', {
        value1: mode === 'hold' ? t('interface:hold') : t('interface:toggle'),
      }),
    );
  };
  const changed = () => {
    if (destroyed) return;
    try {
      const result = applyMode(resolveControllerBoostMode(select.value));
      refresh();
      status.textContent += result?.ok
        ? ' ' + t('interface:savedOnThisDevice') + ''
        : t('gameplay:sessionOnly', {
            value1: result?.warning || t('interface:exportYourPlayerLibraryToKeepThisPreference'),
          });
    } catch (error) {
      refresh();
      localizedText(status, () =>
        t('gameplay:controllerBoostUnchanged', { value1: error.message }),
      );
    }
  };
  select.addEventListener('change', changed);
  refresh();
  return {
    refresh,
    destroy() {
      destroyed = true;
      select.removeEventListener('change', changed);
    },
  };
}

/** Update only changed text, so the live region does not announce every frame. */
export function renderControllerBoostCue(element, state, buttonLabel, canToggle = false) {
  const hidden = state.mode !== 'toggle';
  const text = hidden
    ? ''
    : t('gameplay:controllerBoost2', {
        value1: state.latched ? 'on' : 'off',
        value2: canToggle
          ? t('gameplay:toTurn', { value1: buttonLabel, value2: state.latched ? 'off' : 'on' })
          : '',
      });
  if (element.hidden !== hidden) element.hidden = hidden;
  if (element.textContent !== text) localizedText(element, () => text);
}
