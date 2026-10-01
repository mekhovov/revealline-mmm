import { t } from '../i18n/index.mjs';
/** Text only: callers own input modality, bindings and reading behavior. */
export function readingInputPrompt({
  modality,
  scrollable,
  controls = { confirm: t('common:controls.south'), back: t('common:controls.east') },
} = {}) {
  const scroll = !scrollable
    ? t('interface:allTextIsVisible')
    : modality === 'controller' || modality === 'keyboard'
      ? t('interface:upDownScroll')
      : t('interface:scrollToRead');
  const exit =
    modality === 'controller'
      ? t('common:controls.either', { confirm: controls.confirm, back: controls.back })
      : modality === 'keyboard'
        ? t('interface:enterSpaceOrEscape')
        : t('interface:doneReading');
  return t('common:reading.prompt', { scroll, exit });
}
