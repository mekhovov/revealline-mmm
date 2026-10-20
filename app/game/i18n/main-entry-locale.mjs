/** Only an unambiguous, supported main-entry query is a session language intent. */
export function mainEntryLocale(search) {
  if (typeof search !== 'string' || !search.startsWith('?')) return null;
  const values = new URLSearchParams(search).getAll('lang');
  return values.length === 1 && (values[0] === 'en' || values[0] === 'uk') ? values[0] : null;
}

export function applyMainEntryLocale(search, setLocale) {
  const locale = mainEntryLocale(search);
  if (locale !== null) setLocale(locale, { persist: false });
  return locale;
}
