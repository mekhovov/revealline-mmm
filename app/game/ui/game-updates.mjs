import { gameUpdatesURL } from '../game-updates.mjs';
import { installedAppURL } from '../installed-app.mjs';
import { localizedText, t } from '../i18n/index.mjs';

/** A deliberate navigation action, with no startup polling or download consent. */
export function attachGameUpdates({ document: doc, window: win, container }) {
  const section = doc.createElement('section');
  const button = doc.createElement('a');
  button.className = 'button secondary';
  button.id = 'game-check-updates';
  const compiled = Boolean(doc.documentElement?.dataset?.editionId);
  const supported = /^https?:$/.test(win?.location?.protocol || '');
  button.hidden = section.hidden = !supported;
  button.href =
    supported && win?.location?.href
      ? compiled
        ? new URL('?manage', installedAppURL(win.location)).href
        : gameUpdatesURL(win.location).href
      : '#';
  localizedText(button, () => t('interface:updates.check'));
  const help = doc.createElement('p');
  localizedText(help, () => t('interface:updates.help'));
  section.append(button, help);
  container.append(section);
  return { button, dispose: () => section.remove() };
}
