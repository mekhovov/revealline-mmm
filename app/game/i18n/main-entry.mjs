import { setLocale } from './index.mjs';
import { applyMainEntryLocale } from './main-entry-locale.mjs';

// Main-app entry only: preserve an explicit return-link language in this tab,
// without changing the saved preference used by other tabs and future visits.
applyMainEntryLocale(globalThis.location?.search, setLocale);
