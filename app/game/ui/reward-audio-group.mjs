import { t } from '../i18n/index.mjs';
import { required } from '../data-json.mjs';
import { validateCompletionRewardPayload } from '../rewards/model.mjs';
import { validateRewardAudioGroups } from '../rewards/audio-groups.mjs';
import { mountRewardMedia } from './reward-media.mjs';

/** Selecting a track never plays it. Only the existing media adapter's explicit
 * Play action acquires foreground audio, honors master volume and loads audio. */
export function mountRewardAudioGroup({
  container,
  group: input,
  payloads: inputs,
  locale = 'en',
  mountMedia = mountRewardMedia,
  ...mediaOptions
}) {
  const payloads = inputs.map(validateCompletionRewardPayload),
    [group] = validateRewardAudioGroups([input], payloads);
  required(['en', 'uk'].includes(locale), 'Unsupported playlist language.');
  const document = container.ownerDocument,
    node = (tag, text) => {
      const element = document.createElement(tag);
      if (text !== undefined) element.textContent = text;
      return element;
    },
    tr = (key, values = {}) => t(`interface:rewardPlaylist.${key}`, { lng: locale, ...values }),
    root = node('section'),
    list = node('ol'),
    target = node('div'),
    status = node('p'),
    previous = node('button', tr('previous')),
    next = node('button', tr('next')),
    choices = [],
    listeners = [];
  root.setAttribute('data-reward-audio-group', group.id);
  list.setAttribute('aria-label', group.locales[locale].title);
  status.setAttribute('role', 'status');
  const listen = (element, name, callback) => {
    element.addEventListener(name, callback);
    listeners.push(() => element.removeEventListener(name, callback));
  };
  let selected = -1,
    viewer = null,
    disposed = false;
  function select(index) {
    if (disposed || selected === index || index < 0 || index >= group.payloadIds.length) return;
    viewer?.dispose();
    viewer = null;
    target.replaceChildren();
    selected = index;
    choices.forEach((choice, ordinal) =>
      choice.setAttribute('aria-pressed', String(ordinal === index)),
    );
    previous.disabled = index === 0;
    next.disabled = index === choices.length - 1;
    const payload = payloads.find((p) => p.id === group.payloadIds[index]);
    status.textContent = tr('selected', {
      index: index + 1,
      count: choices.length,
      title: payload.locales[locale].title,
    });
    viewer = mountMedia({ ...mediaOptions, container: target, payload, locale });
  }
  for (const [index, id] of group.payloadIds.entries()) {
    const payload = payloads.find((p) => p.id === id),
      row = node('li'),
      choice = node('button', payload.locales[locale].title);
    choice.type = 'button';
    choice.setAttribute('data-playlist-track', id);
    listen(choice, 'click', () => select(index));
    listen(choice, 'keydown', (event) => {
      const target = {
        ArrowDown: Math.min(choices.length - 1, index + 1),
        ArrowUp: Math.max(0, index - 1),
        Home: 0,
        End: choices.length - 1,
      }[event.key];
      if (target === undefined) return;
      event.preventDefault();
      event.stopPropagation();
      choices[target].focus();
    });
    choices.push(choice);
    row.append(choice);
    list.append(row);
  }
  previous.type = next.type = 'button';
  previous.setAttribute('data-playlist-action', 'previous');
  next.setAttribute('data-playlist-action', 'next');
  listen(previous, 'click', () => select(selected - 1));
  listen(next, 'click', () => select(selected + 1));
  root.append(node('p', tr('help')), list, previous, next, status, target);
  container.append(root);
  function dispose() {
    if (disposed) return;
    disposed = true;
    viewer?.dispose();
    viewer = null;
    listeners.splice(0).forEach((fn) => fn());
    root.remove();
  }
  if (mediaOptions.signal) listen(mediaOptions.signal, 'abort', dispose);
  if (mediaOptions.signal?.aborted) dispose();
  else select(0);
  return { dispose };
}
