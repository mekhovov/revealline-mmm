import { t } from '../i18n/index.mjs';
import { validateExplorationRecipe, DISCOVERY_DIAGRAM_RECIPE } from '../rewards/exploration.mjs';

/** Presentation only: labelled points select existing atlas cards. Coordinates
 * refer to the whole uncropped image, never to arcade or aircraft geometry. */
export function mountDiscoveryDiagram({
  container,
  recipe: input,
  locale = 'en',
  loadImage,
  onInspect,
}) {
  const recipe = validateExplorationRecipe(input);
  if (recipe.id !== DISCOVERY_DIAGRAM_RECIPE.id || !['en', 'uk'].includes(locale))
    throw new TypeError('Use a registered diagram and supported locale.');
  const document = container.ownerDocument,
    node = (tag, text) => {
      const value = document.createElement(tag);
      if (text !== undefined) value.textContent = text;
      return value;
    },
    tr = (key) => t('interface:exploration.diagram.' + key, { lng: locale }),
    root = node('figure'),
    frame = node('div'),
    media = node('div'),
    overlay = node('div'),
    status = node('p', tr('loading')),
    controller = new AbortController(),
    cleanups = [];
  root.className = 'discovery-diagram';
  frame.className = 'discovery-diagram-frame';
  media.className = 'discovery-diagram-media';
  overlay.className = 'discovery-diagram-points';
  overlay.hidden = true;
  status.setAttribute('role', 'status');
  const style = node(
    'style',
    '.discovery-diagram{margin:0;min-width:0}.discovery-diagram-frame{position:relative;max-width:100%}.discovery-diagram-media img{display:block;width:100%;height:auto;object-fit:contain}.discovery-diagram-media>a{display:none}.discovery-diagram-points{position:absolute;inset:0;pointer-events:none}.discovery-diagram-point{position:absolute;left:clamp(22px,var(--diagram-x),calc(100% - 22px));top:clamp(22px,var(--diagram-y),calc(100% - 22px));transform:translate(-50%,-50%)}.discovery-diagram-point button{pointer-events:auto;min-width:44px;min-height:44px;border:2px solid #102635;border-radius:50%;background:#fff;color:#102635;font-weight:bold}.discovery-diagram-point button[aria-pressed="true"]{background:#102635;color:#fff;border-color:#fff}.discovery-diagram-point button:focus-visible{outline:3px solid #1565c0;outline-offset:3px}.discovery-diagram-marker{display:none;background:#fff;color:#102635;border:2px solid #102635;border-radius:50%;padding:.2rem .5rem;font-weight:bold}@media(max-width:480px){.discovery-diagram-point button{display:none}.discovery-diagram-marker{display:block}}',
  );
  const buttons = new Map();
  let disposed = false,
    release = null;
  const listen = (element, type, callback) => {
    element.addEventListener(type, callback);
    cleanups.push(() => element.removeEventListener(type, callback));
  };
  const points = [...recipe.diagram.hotspots].sort(
    (a, b) =>
      recipe.cards.findIndex((c) => c.id === a.cardId) -
      recipe.cards.findIndex((c) => c.id === b.cardId),
  );
  for (const [index, point] of points.entries()) {
    const card = recipe.cards.find((card) => card.id === point.cardId),
      ordinal = recipe.cards.indexOf(card) + 1,
      location = node('span'),
      button = node('button', String(ordinal)),
      marker = node('span', String(ordinal));
    location.className = 'discovery-diagram-point';
    marker.className = 'discovery-diagram-marker';
    location.style.setProperty('--diagram-x', `${point.x * 100}%`);
    location.style.setProperty('--diagram-y', `${point.y * 100}%`);
    marker.setAttribute('aria-hidden', 'true');
    button.type = 'button';
    button.setAttribute('aria-label', `${ordinal}. ${card.locales[locale].title}`);
    button.setAttribute('data-diagram-card', card.id);
    button.setAttribute('aria-pressed', 'false');
    listen(button, 'click', () => {
      if (!disposed) onInspect(card.id);
    });
    listen(button, 'keydown', (event) => {
      const target = {
        ArrowRight: (index + 1) % points.length,
        ArrowDown: (index + 1) % points.length,
        ArrowLeft: (index - 1 + points.length) % points.length,
        ArrowUp: (index - 1 + points.length) % points.length,
        Home: 0,
        End: points.length - 1,
      }[event.key];
      if (target === undefined) return;
      event.preventDefault();
      event.stopPropagation();
      buttons.get(points[target].cardId).focus();
    });
    buttons.set(card.id, button);
    location.append(button, marker);
    overlay.append(location);
  }
  frame.append(media, overlay);
  root.append(style, frame, node('figcaption', recipe.diagram.locales[locale].caption), status);
  container.append(root);
  const missing = () => {
    if (!disposed) {
      overlay.hidden = true;
      status.textContent = tr('missing');
    }
  };
  Promise.resolve()
    .then(async () => {
      if (disposed || !loadImage) return;
      const cleanup = await loadImage(
        {
          id: 'atlas-diagram',
          type: 'image',
          asset: recipe.diagram.asset,
          locales: recipe.diagram.locales,
        },
        media,
        { signal: controller.signal },
      );
      if (disposed) {
        if (typeof cleanup === 'function') cleanup();
        return;
      }
      if (typeof cleanup === 'function') release = cleanup;
      const image = media.querySelector('img');
      if (!image) {
        missing();
        return;
      }
      const ready = () => {
        if (!disposed) {
          overlay.hidden = false;
          status.textContent = tr('ready');
        }
      };
      if (image.complete) {
        if (image.naturalWidth > 0) ready();
        else missing();
      } else {
        listen(image, 'load', ready);
        listen(image, 'error', missing);
      }
    })
    .then(() => {
      if (!loadImage) missing();
    })
    .catch(missing);
  return {
    update(selectedCardIds) {
      for (const [id, button] of buttons)
        button.setAttribute('aria-pressed', String(selectedCardIds.includes(id)));
    },
    dispose() {
      if (disposed) return;
      disposed = true;
      controller.abort();
      cleanups.forEach((fn) => fn());
      release?.();
      release = null;
      root.remove();
    },
  };
}
