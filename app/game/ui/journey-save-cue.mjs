import { t, localizedText } from '../i18n/index.mjs';
/** Presentation only: never owns saving, pausing, progression or input. */
export function attachJourneySaveCue({ target, action, announcement, onOpen, document: doc }) {
  let unsaved = false;
  const description = target.getAttribute('aria-describedby') ?? '';
  action.onclick = onOpen;
  action.addEventListener('blur', () => {
    if (!unsaved) action.hidden = true;
  });
  return {
    update({ ready = true, durable, error }) {
      unsaved = !!(ready && !durable && error);
      target.dataset.journeyUnsaved = String(unsaved);
      if (unsaved) {
        target.setAttribute('aria-describedby', `${description} ${announcement.id}`.trim());
      } else if (description) target.setAttribute('aria-describedby', description);
      else target.removeAttribute('aria-describedby');
      action.hidden = !unsaved && doc.activeElement !== action;
      localizedText(action, () =>
        unsaved
          ? t('interface:progressNotSavedSaveOptions')
          : ready && durable
            ? t('interface:progressSavedReturnToControls')
            : t('interface:saveOptions'),
      );
      const message = unsaved ? t('interface:journeyProgressIsNotSavedPauseForSaveOptions') : '';
      if (announcement.textContent !== message) localizedText(announcement, () => message);
      return unsaved;
    },
  };
}
