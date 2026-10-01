import { loadCompanyStartup } from './company-startup.mjs';
import { mountEditionNavigation } from './edition-navigation.mjs';
import { t, localizedText } from '../i18n/index.mjs';

/** Tools are one directory beneath game/. Resolve edition data through the
 * same validated canonical provider, including the compiled audience boundary. */
export async function loadEditionToolProvider({
  locationRef = globalThis.location,
  documentRef = globalThis.document,
  ...options
} = {}) {
  if (!locationRef?.href) return null;
  const tool = new URL(locationRef.href),
    game = new URL('../index.html', tool);
  game.search = tool.search;
  const provider = await loadCompanyStartup({
    ...options,
    locationRef: { href: game.href },
    documentRef,
  });
  if (!provider) return null;
  mountEditionNavigation({ provider, document: documentRef, href: tool.href });
  documentRef.body.dataset.editionId = provider.editionId;
  documentRef.body.dataset.brandId = provider.selection.brand.id;
  const palette = provider.theme.palette,
    root = documentRef.documentElement;
  for (const [key, value] of Object.entries(palette))
    root.style.setProperty(`--brand-${key}`, value);
  for (const [key, value] of Object.entries({
    accent: palette.accent,
    bg: palette.ink,
    panel: palette.field,
    text: palette.paper,
    muted: palette.muted,
  }))
    if (value) root.style.setProperty(`--fk-${key}`, value);
  const win = documentRef.defaultView ?? globalThis.window;
  if (provider.selection.brand.fontAssetId && typeof win?.FontFace === 'function') {
    const font = new win.FontFace(
      'Company Brand',
      `url("${provider.assetURL(provider.selection.brand.fontAssetId)}")`,
    );
    documentRef.fonts.add(await font.load());
    root.style.setProperty('--brand-font', '"Company Brand", system-ui, sans-serif');
  }
  for (const name of ['pixel', 'display', 'ui'])
    documentRef.body.style.setProperty(
      `--fk-font-${name}`,
      'var(--brand-font, system-ui, sans-serif)',
    );
  const toolKey = tool.pathname.includes('/controller-lab')
    ? 'interface:controllerPractice'
    : 'interface:replayTheater';
  const title = documentRef.querySelector('title'),
    heading = documentRef.querySelector('h1');
  if (title) localizedText(title, () => `${t(toolKey)} · ${provider.selection.brand.name}`);
  if (heading) localizedText(heading, () => t(toolKey));
  for (const link of documentRef.querySelectorAll('[data-workshop-tool="playground"]')) {
    link.hidden = true;
    link.style.display = 'none';
  }
  const eyebrow = documentRef.querySelector('.intro .eyebrow');
  if (eyebrow) localizedText(eyebrow, () => provider.selection.edition.name);
  if (tool.pathname.includes('/controller-lab')) {
    const explanation = documentRef.querySelector(
      '[data-i18n="interface:thisVirtualPadControlsTheActualGameBelowPracticeAwards"]',
    );
    if (explanation)
      localizedText(explanation, () => t('interface:editionTools.controllerPracticeExplanation'));
  }
  return provider;
}

export function editionToolPresentation() {
  return Object.freeze({ current: () => null, bindPainter: () => () => {}, close() {} });
}

export function hasEditionToolRequest({
  document: doc = globalThis.document,
  window: win = globalThis.window,
} = {}) {
  if (doc?.documentElement?.dataset?.editionId) return true;
  const href = win?.location?.href ?? globalThis.location?.href;
  return !!href && !!new URL(href).searchParams.get('edition');
}
