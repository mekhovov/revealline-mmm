import { getLocale, localizedText, t } from '../i18n/index.mjs';
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

const cueText = new WeakMap();

/** Keep polling independent of unchanged caption translation and live-region writes. */
export function renderControllerBoostCue(element, state, buttonLabel, canToggle = false) {
  const hidden = state.mode !== 'toggle',
    locale = getLocale(),
    latched = !!state.latched;
  let cached = cueText.get(element);
  const previous = cached;
  if (
    !cached ||
    cached.hidden !== hidden ||
    cached.locale !== locale ||
    cached.latched !== latched ||
    cached.buttonLabel !== buttonLabel ||
    cached.canToggle !== canToggle
  ) {
    const translate = () =>
      hidden
        ? ''
        : t('gameplay:controllerBoost2', {
            value1: latched ? 'on' : 'off',
            value2: canToggle
              ? t('gameplay:toTurn', { value1: buttonLabel, value2: latched ? 'off' : 'on' })
              : '',
          });
    const entry = { hidden, locale, latched, buttonLabel, canToggle, text: translate() };
    entry.resolve = () => {
      const nextLocale = getLocale();
      if (entry.locale !== nextLocale) {
        entry.locale = nextLocale;
        entry.text = translate();
      }
      return entry.text;
    };
    cached = entry;
    cueText.set(element, cached);
  }
  const { text } = cached;
  if (element.hidden !== hidden) element.hidden = hidden;
  if (previous !== cached || element.textContent !== text) localizedText(element, cached.resolve);
}
