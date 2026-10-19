import { getLocale, onLocaleChange } from '../i18n/index.mjs';
import { menuAnimationBinding } from './menu-animation-preferences.mjs';

/** Add recovery beside an existing host-owned checkbox without replacing its handler. */
export function attachMenuAnimationFeedback(input, win = input.ownerDocument.defaultView) {
  const doc = input.ownerDocument,
    binding = menuAnimationBinding(win),
    label = input.closest('label') ?? input,
    element = doc.createElement('div'),
    status = doc.createElement('p'),
    retry = doc.createElement('button');
  element.className = 'menu-animation-save-feedback';
  label.parentNode.insertBefore(element, label);
  element.append(label, status, retry);
  status.id = `${input.id}-save-status`;
  status.className = 'micro-note';
  status.setAttribute('role', 'status');
  input.setAttribute(
    'aria-describedby',
    [input.getAttribute('aria-describedby'), status.id].filter(Boolean).join(' '),
  );
  retry.id = `${input.id}-save-retry`;
  retry.type = 'button';
  retry.className = 'button secondary global-settings-save-retry';
  retry.setAttribute('aria-describedby', status.id);
  let disposed = false;
  const refresh = () => {
    if (disposed) return;
    input.checked = binding.get();
    const feedback = binding.feedback(getLocale()),
      ownedFocus = doc.activeElement === retry;
    if (status.textContent !== feedback.text) status.textContent = feedback.text;
    status.hidden = !feedback.text;
    retry.textContent = feedback.retryLabel;
    retry.hidden = !feedback.retry;
    if (ownedFocus && retry.hidden && [retry, doc.body, null].includes(doc.activeElement))
      input.focus({ preventScroll: true });
  };
  const save = () => binding.retry();
  retry.addEventListener('click', save);
  const stop = binding.subscribe(refresh),
    stopLocale = onLocaleChange(refresh);
  return {
    element,
    destroy() {
      if (disposed) return;
      disposed = true;
      stop();
      stopLocale();
      retry.removeEventListener('click', save);
      const descriptions = (input.getAttribute('aria-describedby') || '')
        .split(/\s+/)
        .filter((value) => value && value !== status.id);
      if (descriptions.length) input.setAttribute('aria-describedby', descriptions.join(' '));
      else input.removeAttribute('aria-describedby');
      element.parentNode?.insertBefore(label, element);
      element.remove();
    },
  };
}
