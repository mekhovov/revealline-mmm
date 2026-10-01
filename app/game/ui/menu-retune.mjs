import { getMenuAnimation, MENU_ANIMATION_KEY } from './menu-scenes.mjs';

export const MENU_RETUNE_MS = 220;
export const MENU_RETUNE_COOLDOWN_MS = 800;
const owners = new WeakMap();
const chooser = (root) =>
  root?.dataset.view !== 'brief' &&
  (root?.classList.contains('mission-library-chooser') ||
    ['shell-missions', 'race-setup'].includes(root?.id));

function visible(root, doc, win) {
  if (!root?.isConnected || doc.hidden) return false;
  for (let node = root; node; node = node.parentElement) {
    if (
      node.hidden ||
      node.inert ||
      node.getAttribute('aria-hidden') === 'true' ||
      (node.tagName === 'DIALOG' && !node.open)
    )
      return false;
    const style = win.getComputedStyle?.(node);
    if (style?.display === 'none' || style?.visibility === 'hidden') return false;
  }
  return true;
}

/** Explicit navigation commits only; never observes input or changes focus. */
export function commitMenuRetune(from, to) {
  return owners.get(to?.ownerDocument)?.commit(from, to) ?? false;
}

export function menuRetuneOrigin(opener) {
  const owner = owners.get(opener?.ownerDocument);
  return owner?.origin(opener) ?? null;
}

/** One bounded, disposable presentation owner per native landing document. */
export function attachMenuRetune({
  root,
  getContext = () => ({}),
  now = () => performance.now(),
  schedule = (callback, delay) => setTimeout(callback, delay),
  unschedule = (timer) => clearTimeout(timer),
} = {}) {
  const doc = root.ownerDocument,
    win = doc.defaultView;
  owners.get(doc)?.dispose();
  const motion = win.matchMedia?.('(prefers-reduced-motion: reduce)');
  const layers = new Map();
  let disposed = false,
    suspended = false,
    active = null,
    timer = null,
    last = -Infinity;
  const eligible = (target) => {
    const context = getContext() ?? {};
    return (
      !disposed &&
      !suspended &&
      context.active !== false &&
      !context.reduced &&
      !motion?.matches &&
      doc.body?.dataset.effects !== 'reduced' &&
      doc.body?.dataset.reducedEffects !== 'true' &&
      doc.documentElement?.dataset.reducedMotion !== 'true' &&
      getMenuAnimation(win) &&
      visible(target, doc, win)
    );
  };
  const covered = (from, to) =>
    [...doc.querySelectorAll('dialog[open]')].some(
      (dialog) => dialog !== from && dialog !== to && !dialog.contains(to),
    );
  function cancel() {
    if (timer !== null) unschedule(timer);
    timer = null;
    active?.layer.removeAttribute('data-active');
    active = null;
    observer?.disconnect();
  }
  function refresh() {
    if (active && (!eligible(active.target) || covered(active.from, active.target))) cancel();
    for (const [target, layer] of layers)
      if (!target.isConnected) {
        layer.remove();
        target.classList.remove('menu-retune-surface');
        layers.delete(target);
      }
  }
  const pageHide = () => {
    suspended = true;
    cancel();
  };
  const pageShow = () => {
    suspended = false;
  };
  const storage = (event) => {
    if (event.key === MENU_ANIMATION_KEY || event.key === null) refresh();
  };
  doc.addEventListener('visibilitychange', refresh);
  doc.addEventListener('change', refresh);
  win.addEventListener('pagehide', pageHide);
  win.addEventListener('pageshow', pageShow);
  win.addEventListener('revealline-menu-animation', refresh);
  win.addEventListener('storage', storage);
  motion?.addEventListener('change', refresh);
  const observer = win.MutationObserver ? new win.MutationObserver(refresh) : null;
  const owner = {
    origin(opener) {
      return opener && root.contains(opener) && eligible(root) ? root : null;
    },
    commit(from, to) {
      cancel();
      if (from === to || !((from === root && chooser(to)) || (to === root && chooser(from))))
        return false;
      const time = now();
      if (!eligible(to) || !Number.isFinite(time) || time - last < MENU_RETUNE_COOLDOWN_MS)
        return false;
      if (covered(from, to)) return false;
      // Keep only the landing and current picker. Replacing a dynamic chooser
      // must not retain old menu subtrees for the lifetime of the page.
      for (const [target, cached] of layers) {
        if (target !== root && target !== to) {
          cached.remove();
          target.classList.remove('menu-retune-surface');
          layers.delete(target);
        }
      }
      let layer = layers.get(to);
      if (!layer) {
        layer = doc.createElement('div');
        layer.className = 'menu-retune-layer';
        layer.setAttribute('aria-hidden', 'true');
        layer.setAttribute('inert', '');
        const scene = to.querySelector('.menu-scene');
        if (scene) scene.append(layer);
        else {
          to.classList.add('menu-retune-surface');
          to.prepend(layer);
        }
        layers.set(to, layer);
      }
      last = time;
      active = { from, target: to, layer };
      const pulse = active;
      layer.setAttribute('data-active', 'true');
      observer?.observe(doc.documentElement, {
        subtree: true,
        attributes: true,
        childList: true,
        attributeFilter: [
          'hidden',
          'open',
          'inert',
          'class',
          'style',
          'aria-hidden',
          'data-effects',
          'data-reduced-effects',
          'data-reduced-motion',
        ],
      });
      timer = schedule(() => {
        if (active === pulse) cancel();
      }, MENU_RETUNE_MS);
      return true;
    },
    cancel,
    dispose() {
      if (disposed) return;
      disposed = true;
      cancel();
      observer?.disconnect();
      doc.removeEventListener('visibilitychange', refresh);
      doc.removeEventListener('change', refresh);
      win.removeEventListener('pagehide', pageHide);
      win.removeEventListener('pageshow', pageShow);
      win.removeEventListener('revealline-menu-animation', refresh);
      win.removeEventListener('storage', storage);
      motion?.removeEventListener('change', refresh);
      for (const [target, layer] of layers) {
        layer.remove();
        target.classList.remove('menu-retune-surface');
      }
      layers.clear();
      if (owners.get(doc) === owner) owners.delete(doc);
    },
  };
  owners.set(doc, owner);
  return owner;
}
