import { createReactionOptions } from '../journey/reaction-options.mjs';
import { claimJourneyReactionCaption, renderResultReactionCaption } from './reaction-caption.mjs';
import { getLocale, localizedText, onLocaleChange } from '../i18n/index.mjs';
import { journeyResultReaction } from '../journey/reactions.mjs';
import { createReactionPreferences } from '../journey/reaction-preferences.mjs';

/** Result-only, silent, static copy. It never edits critical captions, asks for
 * focus, adds an input boundary, plays audio, starts a timer or calls gameplay. */
export function attachJourneyReactions({
  document: doc = globalThis.document,
  window: eventTarget = globalThis.window,
  prefix = '',
  getStorage,
} = {}) {
  const $ = (suffix) => doc.getElementById(`${prefix}journey-reactions${suffix}`);
  const caption = $(''),
    control = $('-enabled'),
    status = $('-status'),
    retry = $('-retry');
  const preferences = createReactionPreferences({
    window: eventTarget,
    getLocale,
    ...(getStorage ? { getStorage } : {}),
  });
  const options = createReactionOptions({
    window: eventTarget,
    ...(getStorage ? { getStorage } : {}),
  });
  const releaseCaption = claimJourneyReactionCaption(caption);
  let current = null,
    disposed = false;
  const render = () => {
    if (disposed) return;
    const choice = preferences.snapshot();
    if (control.checked !== choice.enabled) control.checked = choice.enabled;
    if (status.textContent !== choice.error)
      localizedText(status, () => preferences.snapshot().error);
    status.hidden = choice.durable;
    retry.hidden = choice.durable;
    renderResultReactionCaption(
      caption,
      journeyResultReaction(current, getLocale()),
      options.snapshot(),
      choice.enabled,
      getLocale(),
    );
  };
  const choose = () => preferences.choose(control.checked);
  const save = () => preferences.retry();
  control.addEventListener('change', choose);
  retry.addEventListener('click', save);
  const unsubscribe = preferences.subscribe(render);
  const unoptions = options.subscribe(render);
  const unlocale = onLocaleChange(render);
  return Object.freeze({
    present(context) {
      if (!disposed) {
        current = context;
        render();
      }
    },
    dispose() {
      disposed = true;
      current = null;
      caption.hidden = true;
      caption.textContent = '';
      releaseCaption();
      unoptions();
      unlocale();
      options.dispose();
      control.removeEventListener('change', choose);
      retry.removeEventListener('click', save);
      unsubscribe();
      preferences.dispose();
    },
  });
}
