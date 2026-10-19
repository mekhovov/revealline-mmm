/** Verification is a fixed same-build destination, never an imported launch URL. */
export function recordingVerificationHref(couchHref, locale = 'en') {
  const target = new URL('../playground/', couchHref);
  target.searchParams.set('lang', locale === 'uk' ? 'uk' : 'en');
  target.hash = 'recording-verification';
  return target.href;
}

/** A navigation hint opens the existing tool; it never reads or imports a file. */
export function openRecordingVerificationSection({ document: doc, location, focus = false }) {
  if (location?.hash !== '#recording-verification') return false;
  const section = doc.getElementById('recording-verification');
  if (!section) return false;
  section.open = true;
  if (focus && !doc.hidden && doc.hasFocus?.() !== false) {
    const heading = section.querySelector('summary');
    heading?.focus({ preventScroll: true });
    heading?.scrollIntoView({ block: 'start', inline: 'nearest', behavior: 'instant' });
  }
  return true;
}
