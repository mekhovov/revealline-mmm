import '../vendor/i18next-26.4.2.min.js';
import './catalogs.mjs';
import './bootstrap.mjs';

export const {
  t,
  message,
  render,
  getLocale,
  setLocale,
  onLocaleChange,
  normalizeLocale,
  detectLocale,
  localizedText,
  localizedAttribute,
  localizedOption,
  translateDOM,
  attachLanguageControls,
  formatNumber,
  formatDate,
} = globalThis.RevealLineI18n;

export const localizedMessage = message;
