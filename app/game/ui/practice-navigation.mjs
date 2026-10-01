import { t } from '../i18n/index.mjs';
/** Keep ordinary link activation inside a controller practice session. This is
 * a UI guard, not a sandbox for same-origin scripts or browser navigation. The
 * host separately enforces practice before acquiring any profile writer. */
export function attachPracticeNavigation({
  enabled = false,
  document: doc = globalThis.document,
  onBlocked = () => {},
} = {}) {
  if (!enabled) return { destroy() {} };
  if (
    typeof doc?.addEventListener !== 'function' ||
    typeof doc?.removeEventListener !== 'function' ||
    typeof onBlocked !== 'function'
  )
    throw new TypeError(t('interface:practiceNavigationNeedsADocumentAndNoticeCallback'));
  let destroyed = false;
  function sameDocumentFragment(href) {
    if (typeof href !== 'string' || !href.includes('#')) return false;
    try {
      const current = new URL(doc.location?.href || doc.URL || doc.baseURI),
        destination = new URL(href, doc.baseURI || current.href);
      return destination.href.split('#')[0] === current.href.split('#')[0];
    } catch {
      return false;
    }
  }
  function guard(event) {
    if (destroyed) return;
    const anchor =
      event.target?.closest?.('a[href]') || event.target?.parentElement?.closest?.('a[href]');
    if (!anchor || anchor.hasAttribute('download')) return;
    const href = anchor.getAttribute('href');
    if (sameDocumentFragment(href)) return;
    event.preventDefault();
    event.stopPropagation();
    onBlocked({ href });
  }
  doc.addEventListener('click', guard, true);
  doc.addEventListener('auxclick', guard, true);
  return {
    destroy() {
      if (destroyed) return;
      destroyed = true;
      doc.removeEventListener('click', guard, true);
      doc.removeEventListener('auxclick', guard, true);
    },
  };
}
