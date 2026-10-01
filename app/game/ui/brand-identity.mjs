import { localizedText } from '../i18n/index.mjs';

export const GAME_BRAND_NAME = "Coupa Village";
export const GAME_WORDMARK_URL = new URL("../editions/assets/coupa/flower-blue.png", import.meta.url)
  .href;
const titleOwners = new WeakMap();

/** Display naming only: never changes edition IDs, saved content or receipts. */
export function editionDisplayName(name, editionId) {
  const base =
    editionId === 'droneaid-nl-community' || editionId === 'droneaid'
      ? 'DroneAid'
      : String(name || GAME_BRAND_NAME)
          .replace(/\s*\/\s*LINE\s*$/i, '')
          .trim();
  return `${base} / LINE`;
}

/** Keep a real accessible title and a text fallback if artwork cannot load. */
export function mountLandingBrand(title, { name = GAME_BRAND_NAME, edition = false } = {}) {
  if (!title?.ownerDocument) return () => {};
  titleOwners.get(title)?.();
  const doc = title.ownerDocument;
  title.removeAttribute('data-i18n');
  title.removeAttribute('data-i18n-rich');
  // Replaces any earlier rich-translation owner before adding brand artwork.
  localizedText(title, () => name);
  const fallback = doc.createElement('span');
  fallback.className = 'native-brand-fallback';
  fallback.textContent = name;
  title.replaceChildren(fallback);
  let art;
  const loaded = () => {
    title.dataset.logoLoaded = 'true';
  };
  const failed = () => {
    title.dataset.logoLoaded = 'false';
  };
  if (edition) {
    title.classList.add('native-edition-title');
    const separator = name.lastIndexOf(' / LINE');
    if (separator >= 0) {
      fallback.textContent = name.slice(0, separator);
      const line = doc.createElement('span');
      line.className = 'native-edition-line';
      line.textContent = ' / LINE';
      title.append(line);
    }
  } else {
    title.classList.add('native-game-title');
    art = doc.createElement('img');
    art.className = 'fpv-line-wordmark';
    art.alt = '';
    art.setAttribute('aria-hidden', 'true');
    art.draggable = false;
    art.decoding = 'async';
    art.addEventListener('load', loaded);
    art.addEventListener('error', failed);
    art.src = GAME_WORDMARK_URL;
    title.append(art);
    if (art.complete && art.naturalWidth > 0) loaded();
  }
  const dispose = () => {
    if (titleOwners.get(title) !== dispose) return;
    art?.removeEventListener('load', loaded);
    art?.removeEventListener('error', failed);
    title.classList.remove('native-game-title', 'native-edition-title');
    delete title.dataset.logoLoaded;
    titleOwners.delete(title);
  };
  titleOwners.set(title, dispose);
  return dispose;
}
