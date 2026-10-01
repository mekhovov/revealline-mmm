import { t, localizedText } from '../i18n/index.mjs';
/** Presentation only. The Journey store and existing recovery handlers keep
 * ownership of saving/export; a warning never pauses, focuses or starts play. */
export function attachJourneySaveNotice({ document: doc = globalThis.document } = {}) {
  const $ = (id) => doc.getElementById(id);
  const menu = $('shell-menu'),
    recovery = $('journey-save-status'),
    message = $('journey-save-message'),
    action = $('journey-save-options'),
    badge = $('journey-save-badge'),
    announcement = $('journey-save-announcement');
  const menuLabel = menu.getAttribute('aria-label');
  let unsaved = false;
  const text = (node, value) => {
    if (node.textContent !== value) localizedText(node, () => value);
  };
  action.addEventListener('blur', () => {
    if (!unsaved) action.hidden = true;
  });
  action.onclick = () => {
    // Use the shell's existing explicit pause/input path, not another modal.
    menu.click();
    if ($('shell-home').open && !recovery.hidden) {
      $('journey-save-retry').focus();
    }
  };
  return {
    update({ ready, durable, error }) {
      unsaved = !!(ready && !durable && error);
      badge.hidden = !unsaved;
      // An online retry may succeed while this action owns keyboard/controller
      // focus. Keep that focus target until the player deliberately leaves it.
      action.hidden = !unsaved && doc.activeElement !== action;
      text(
        action,
        unsaved
          ? t('interface:progressNotSavedSaveOptions')
          : ready && durable
            ? t('interface:progressSavedGameMenu')
            : t('interface:saveOptionsGameMenu'),
      );
      menu.dataset.journeyUnsaved = String(unsaved);
      menu.setAttribute(
        'aria-label',
        unsaved ? `${menuLabel} — Journey progress not saved. Save options.` : menuLabel,
      );
      text(
        announcement,
        unsaved ? t('interface:journeyProgressIsNotSavedSaveOptionsAreInGame') : '',
      );
      // Do not remove the currently focused Retry/Export controls on success.
      // The panel can disappear on the next status update after focus leaves it.
      recovery.hidden = !unsaved && !recovery.contains(doc.activeElement);
      text(
        message,
        unsaved
          ? `Journey progress is session-only. Keep playing, retry saving, or export before closing. ${error}`
          : ready && durable
            ? t('interface:journeyProgressSavedLocallyYouCanContinuePlaying')
            : '',
      );
    },
  };
}
