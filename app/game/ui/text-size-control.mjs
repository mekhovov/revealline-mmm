import { resolveTextSize } from '../text-size.mjs';
import { localizedText, t } from '../i18n/index.mjs';

const notices = new WeakMap();
const hostNotices = new WeakMap();
let nextNotice = 0;

/** Read-only hosts acknowledge the fallback without creating another owner. */
export function renderTextSizeFallback(container, desired, { locale } = {}) {
  resolveTextSize(desired);
  if (!container) return;
  let notice = hostNotices.get(container);
  if (!notice && desired === 'extra-large') {
    notice = container.ownerDocument.createElement('p');
    notice.className = 'micro-note';
    notice.dataset.textSizeFallback = 'true';
    container.append(notice);
    hostNotices.set(container, notice);
  }
  if (notice) {
    localizedText(notice, () =>
      t('interface:textSizeCompatibility.readOnlyFallback', { lng: locale }),
    );
    notice.hidden = desired !== 'extra-large';
  }
}

/** Only an opted-in host offers the additional size; other hosts retain intent
 * as a disabled choice. Never save, dispatch or move keyboard focus. */
export function renderTextSizeControl(control, desired, { locale, extraLarge = false } = {}) {
  resolveTextSize(desired);
  if (!control) return;
  let retained = control.querySelector('[data-text-size-retained]');
  let notice = notices.get(control);
  if (extraLarge || desired === 'extra-large') {
    if (!retained) {
      retained = control.ownerDocument.createElement('option');
      retained.value = 'extra-large';
      retained.dataset.textSizeRetained = 'true';
      control.append(retained);
    }
    retained.disabled = !extraLarge;
    localizedText(retained, () =>
      t(
        extraLarge
          ? 'interface:textSizeCompatibility.extraLarge'
          : 'interface:textSizeCompatibility.retained',
        { lng: locale },
      ),
    );
    if (!notice && !extraLarge) {
      notice = control.ownerDocument.createElement('span');
      notice.id = `${control.id || `text-size-${++nextNotice}`}-fallback`;
      notice.className = 'micro-note';
      notice.dataset.textSizeFallback = 'true';
      control.after(notice);
      notices.set(control, notice);
    }
    if (notice) {
      localizedText(notice, () => t('interface:textSizeCompatibility.fallback', { lng: locale }));
      notice.hidden = extraLarge;
    }
    const descriptions = new Set(
      (control.getAttribute('aria-describedby') ?? '').split(/\s+/).filter(Boolean),
    );
    if (notice) {
      if (extraLarge) descriptions.delete(notice.id);
      else descriptions.add(notice.id);
    }
    if (descriptions.size) control.setAttribute('aria-describedby', [...descriptions].join(' '));
    else control.removeAttribute('aria-describedby');
  } else {
    retained?.remove();
    if (notice) {
      notice.hidden = true;
      const descriptions = (control.getAttribute('aria-describedby') ?? '')
        .split(/\s+/)
        .filter((value) => value && value !== notice.id);
      if (descriptions.length) control.setAttribute('aria-describedby', descriptions.join(' '));
      else control.removeAttribute('aria-describedby');
    }
  }
  control.value = desired;
}
