import { resolveMenuScene, menuSceneMode } from './menu-scene-catalog.mjs';
import { attachArtworkMotion, artworkMotionMode } from './menu-scene-motion.mjs';
import { attachMenuSignalLoss } from './menu-signal-loss.mjs';

export const MENU_ANIMATION_KEY = 'revealline-mmm.menu-animation.v1';
const PREFERENCE_EVENT = 'revealline-menu-animation';
const memoryPreferences = new WeakMap();

export function getMenuAnimation(win = globalThis.window) {
  try {
    return win.localStorage.getItem(MENU_ANIMATION_KEY) !== 'off';
  } catch {
    return memoryPreferences.get(win) ?? true;
  }
}

export function setMenuAnimation(enabled, win = globalThis.window) {
  try {
    win.localStorage.setItem(MENU_ANIMATION_KEY, enabled ? 'on' : 'off');
  } catch {
    memoryPreferences.set(win, Boolean(enabled));
  }
  win.dispatchEvent(
    new win.CustomEvent(PREFERENCE_EVENT, { detail: { enabled: Boolean(enabled) } }),
  );
}

/** Animate the artwork independently of gameplay and stationary menu controls. */
export function attachMenuScene({
  root,
  mode = 'solo',
  getContext = () => ({}),
  createMotion = attachArtworkMotion,
  createSignalLoss = attachMenuSignalLoss,
}) {
  if (!root?.ownerDocument) throw new TypeError('A menu scene needs its landing root.');
  const doc = root.ownerDocument,
    win = doc.defaultView;
  const motion = win.matchMedia?.('(prefers-reduced-motion: reduce)');
  const portrait = win.matchMedia?.('(orientation: portrait)');
  let disposed = false,
    manuallyPaused = false,
    pageSuspended = false,
    enabled = getMenuAnimation(win),
    currentKey = '',
    artworkMotion = null,
    signalLoss = null;
  const previous = {
    id: root.getAttribute('data-menu-scene'),
    mode: root.getAttribute('data-menu-mode'),
  };
  const scene = doc.createElement('div');
  scene.className = 'menu-scene';
  scene.setAttribute('aria-hidden', 'true');
  scene.setAttribute('inert', '');
  const plane = doc.createElement('div');
  plane.className = 'menu-scene-art-plane';
  const art = doc.createElement('img');
  art.className = 'menu-scene-art';
  art.alt = '';
  art.decoding = 'async';
  art.draggable = false;
  const canvas = doc.createElement('canvas');
  canvas.className = 'menu-scene-art-motion';
  canvas.hidden = true;
  const reception = doc.createElement('canvas');
  reception.className = 'menu-scene-reception';
  reception.hidden = true;
  plane.append(art, canvas, reception);
  const signal = doc.createElement('div');
  signal.className = 'menu-scene-signal';
  scene.append(plane, signal);
  scene.dataset.renderer = 'css';
  root.prepend(scene);
  root.classList.add('menu-scene-host');
  const sceneContext = () => {
    const context = getContext() ?? {};
    return { ...context, mode: context.mode ?? mode };
  };

  function visible() {
    // A visible split pane can lack keyboard focus. Decoration follows visibility;
    // gameplay and controller ownership retain their own, stricter focus gates.
    if (doc.hidden || pageSuspended || !root.isConnected) return false;
    for (let el = root; el; el = el.parentElement) {
      if (
        el.hidden ||
        el.getAttribute('aria-hidden') === 'true' ||
        (el.tagName === 'DIALOG' && !el.open)
      )
        return false;
      const style = win.getComputedStyle?.(el);
      if (style?.display === 'none' || style?.visibility === 'hidden') return false;
    }
    // Native Settings/reading dialogs can cover home without closing it.
    return ![...doc.querySelectorAll('dialog[open]')].some(
      (dialog) => dialog !== root && !dialog.contains(root) && !dialog.hidden,
    );
  }

  function fitArtwork() {
    if (disposed || !art.naturalWidth || !art.naturalHeight) return;
    const bounds = scene.getBoundingClientRect();
    if (!bounds.width || !bounds.height) return;
    const profile = resolveMenuScene(sceneContext());
    const focal = (portrait?.matches ? profile.portraitPosition : profile.landscapePosition)
      .split(' ')
      .map((value) => parseFloat(value) / 100);
    const scale = Math.max(bounds.width / art.naturalWidth, bounds.height / art.naturalHeight);
    const width = art.naturalWidth * scale;
    const height = art.naturalHeight * scale;
    for (const [name, value] of Object.entries({
      width,
      height,
      left: (bounds.width - width) * focal[0],
      top: (bounds.height - height) * focal[1],
    }))
      plane.style.setProperty(name, `${value}px`);
  }

  function update() {
    if (disposed) return;
    const context = sceneContext();
    const profile = resolveMenuScene(context);
    const selectedMode = menuSceneMode(context.mode ?? mode);
    const vertical = portrait?.matches ?? false;
    const key = `${profile.id}:${profile.composition ?? 'solo'}:${selectedMode}:${vertical}`;
    if (key !== currentKey) {
      currentKey = key;
      root.dataset.menuScene = profile.id;
      root.dataset.menuMode = selectedMode;
      scene.dataset.atmosphere = profile.atmosphere;
      scene.dataset.composition = profile.composition ?? 'solo';
      scene.style.setProperty('--scene-ink', profile.ink);
      scene.style.setProperty('--scene-light', profile.light);
      scene.style.setProperty('--scene-accent', profile.accent);
      scene.style.setProperty('--scene-signal-opacity', String(profile.signalOpacity));
      scene.style.setProperty('--scene-signal-peak', String(profile.signalPeakOpacity));
      scene.style.setProperty(
        '--scene-focal',
        vertical ? profile.portraitPosition : profile.landscapePosition,
      );
      scene.dataset.loaded = 'false';
      const src = new URL(vertical ? profile.portrait : profile.landscape, import.meta.url).href;
      if (art.src !== src) {
        signalLoss?.reset();
        art.src = src;
      } else if (art.complete && art.naturalWidth > 0) scene.dataset.loaded = 'true';
      artworkMotion?.update({ profile, vertical });
      fitArtwork();
    }
    const reduced =
      motion?.matches ||
      context.reduced === true ||
      doc.body?.dataset.effects === 'reduced' ||
      doc.body?.dataset.reducedEffects === 'true' ||
      doc.documentElement?.dataset.reducedMotion === 'true';
    scene.dataset.motion = reduced || !enabled ? 'off' : 'on';
    scene.dataset.running = String(!manuallyPaused && context.active !== false && visible());
    syncMotion();
  }
  function syncMotion() {
    const running =
      scene.dataset.loaded === 'true' &&
      scene.dataset.motion === 'on' &&
      scene.dataset.running === 'true';
    if (running && !artworkMotion) {
      artworkMotion = createMotion({
        canvas,
        image: art,
        profile: resolveMenuScene(sceneContext()),
        vertical: portrait?.matches ?? false,
        onReady(ready) {
          if (!disposed) scene.dataset.renderer = ready ? 'webgl' : 'css';
        },
      });
    }
    artworkMotion?.setRunning(running);
    if (running && !signalLoss) {
      signalLoss = createSignalLoss({
        canvas: reception,
        drawSource(ctx, width, height) {
          if (
            disposed ||
            scene.dataset.loaded !== 'true' ||
            !art.naturalWidth ||
            !art.naturalHeight
          )
            return false;
          // Read the original still, not a WebGL buffer which the browser may discard.
          // Match the renderer's fixed safety crop, then share its CSS cover/arrival transform.
          const regional = artworkMotionMode(resolveMenuScene(sceneContext()), portrait?.matches);
          const zoom = scene.dataset.renderer === 'webgl' && regional === 'regions' ? 1.025 : 1;
          const sw = art.naturalWidth / zoom;
          const sh = art.naturalHeight / zoom;
          ctx.drawImage(
            art,
            (art.naturalWidth - sw) / 2,
            (art.naturalHeight - sh) / 2,
            sw,
            sh,
            0,
            0,
            width,
            height,
          );
          return true;
        },
      });
    }
    signalLoss?.setRunning(running);
  }
  const loaded = () => {
    if (!disposed) {
      scene.dataset.loaded = 'true';
      fitArtwork();
      syncMotion();
    }
  };
  const failed = () => {
    if (!disposed) {
      scene.dataset.loaded = 'false';
      artworkMotion?.setRunning(false);
      signalLoss?.setRunning(false);
    }
  };
  const preference = (event) => {
    enabled = event.detail?.enabled ?? getMenuAnimation(win);
    update();
  };
  const storage = (event) => {
    if (event.key === MENU_ANIMATION_KEY || event.key === null) {
      enabled = getMenuAnimation(win);
      update();
    }
  };
  art.addEventListener('load', loaded);
  art.addEventListener('error', failed);
  doc.addEventListener('visibilitychange', update);
  doc.addEventListener('change', update);
  const pageHide = () => {
    pageSuspended = true;
    update();
  };
  const pageShow = () => {
    pageSuspended = false;
    update();
    fitArtwork();
  };
  win.addEventListener('pagehide', pageHide);
  win.addEventListener('pageshow', pageShow);
  win.addEventListener('resize', fitArtwork);
  win.addEventListener(PREFERENCE_EVENT, preference);
  win.addEventListener('storage', storage);
  motion?.addEventListener('change', update);
  portrait?.addEventListener('change', update);
  const resize = win.ResizeObserver ? new win.ResizeObserver(fitArtwork) : null;
  resize?.observe(scene);
  const observer = win.MutationObserver ? new win.MutationObserver(update) : null;
  for (let el = root; el; el = el.parentElement)
    observer?.observe(el, {
      attributes: true,
      attributeFilter: [
        'hidden',
        'open',
        'class',
        'style',
        'aria-hidden',
        'data-effects',
        'data-theme',
        'data-menu-theme',
        'data-reduced-effects',
        'data-reduced-motion',
        'data-edition-id',
        'data-screen',
      ],
    });
  // Observe only open here: canvas/style mutations from rendering must not feed back into update.
  const dialogs = win.MutationObserver ? new win.MutationObserver(update) : null;
  if (doc.body)
    dialogs?.observe(doc.body, { subtree: true, attributes: true, attributeFilter: ['open'] });
  update();
  return {
    update,
    pause() {
      manuallyPaused = true;
      update();
    },
    resume() {
      manuallyPaused = false;
      update();
    },
    dispose() {
      if (disposed) return;
      disposed = true;
      artworkMotion?.dispose();
      signalLoss?.dispose();
      observer?.disconnect();
      dialogs?.disconnect();
      resize?.disconnect();
      art.removeEventListener('load', loaded);
      art.removeEventListener('error', failed);
      doc.removeEventListener('visibilitychange', update);
      doc.removeEventListener('change', update);
      win.removeEventListener('pagehide', pageHide);
      win.removeEventListener('pageshow', pageShow);
      win.removeEventListener('resize', fitArtwork);
      win.removeEventListener(PREFERENCE_EVENT, preference);
      win.removeEventListener('storage', storage);
      motion?.removeEventListener('change', update);
      portrait?.removeEventListener('change', update);
      scene.remove();
      root.classList.remove('menu-scene-host');
      for (const [attribute, value] of [
        ['data-menu-scene', previous.id],
        ['data-menu-mode', previous.mode],
      ])
        if (value === null) root.removeAttribute(attribute);
        else root.setAttribute(attribute, value);
    },
  };
}
