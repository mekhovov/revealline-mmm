import { t } from '../i18n/index.mjs';
import { validateCompletionRewardPayload } from '../rewards/model.mjs';
import { LEARNING_PROFILE_IDS, LEARNING_PROFILE_LABELS } from '../rewards/learning-profiles.mjs';

/** Shared native reader used by player, Studio and exact-revision previews. */
export function mountRewardKnowledge({
  container,
  payload: input,
  locale = 'en',
  initialProfile = 'beginners',
  onProfile = () => {},
}) {
  const payload = validateCompletionRewardPayload(input);
  if (payload.type !== 'knowledge' || !LEARNING_PROFILE_LABELS[locale])
    throw new TypeError('Knowledge reader needs a supported payload and locale.');
  const document = container.ownerDocument,
    root = document.createElement('div');
  const node = (tag, text) => {
    const value = document.createElement(tag);
    if (text !== undefined) value.textContent = text;
    return value;
  };
  for (const paragraph of payload.locales[locale].paragraphs) root.append(node('p', paragraph));
  let select = null;
  if (payload.profiles) {
    const label = node('label', t('interface:learningProfiles.choose', { lng: locale })),
      extra = node('section');
    select = node('select');
    select.setAttribute('data-learning-profile', 'true');
    for (const id of LEARNING_PROFILE_IDS) {
      const option = node('option', LEARNING_PROFILE_LABELS[locale][id]);
      option.value = id;
      select.append(option);
    }
    select.value = LEARNING_PROFILE_IDS.includes(initialProfile) ? initialProfile : 'beginners';
    const render = () => {
      const copy = payload.profiles[select.value][locale];
      extra.replaceChildren(node('h4', copy.title), ...copy.paragraphs.map((p) => node('p', p)));
    };
    select.onchange = () => {
      render();
      onProfile(select.value);
    };
    label.append(select);
    root.append(label, extra);
    render();
  }
  for (const source of payload.locales[locale].sources ?? []) {
    const p = node('p'),
      a = node('a', source.title);
    a.href = source.url;
    a.target = '_blank';
    a.rel = 'noopener noreferrer';
    p.append(a);
    root.append(p);
  }
  container.append(root);
  return {
    dispose() {
      if (select) select.onchange = null;
      root.remove();
    },
  };
}
