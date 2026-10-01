import { contentText } from '../i18n/content.mjs';
import { localizedText, localizedMessage, render, t } from '../i18n/index.mjs';
/** Bind the finite first-party reading surfaces. The navigation adapter owns
 * scrolling/focus; this host layer owns visible controls and the pause boundary. */
export function attachControllerReading({
  document: doc = globalThis.document,
  getNavigation,
  getControlLabels,
  getReadingPrompt = null,
  getScope,
  pause = () => {},
  onTransition = () => {},
  additionalSurfaces = [],
  surfaceDefinitions = null,
  compactOverlay = false,
  revealOnResize = false,
} = {}) {
  // An explicit list owns only those surfaces; omitted keeps the Solo defaults
  // and additional surfaces. Entries remain [region, entry, label, unit] tuples.
  const definitions = surfaceDefinitions ?? [
    [
      'overlay-reading',
      'overlay-read',
      localizedMessage('interface:missionDetails'),
      'overlay-reading-unit',
    ],
    [
      'mission-brief-reading',
      'mission-brief-read',
      localizedMessage('interface:missionBrief'),
      'mission-brief-unit',
    ],
    ...additionalSurfaces,
  ];
  const surfaces = definitions.map(([id, entryId, label, unitId]) => {
    const surface = {
      id,
      label,
      region: doc.getElementById(id),
      entry: doc.getElementById(entryId),
      done: doc.getElementById(`${id}-done`),
      hint: doc.getElementById(`${id}-hint`),
      unit: doc.getElementById(unitId),
    };
    if (Object.values(surface).some((value) => !value))
      throw new Error(t('gameplay:missingFirstPartyReadingControls', { value1: id }));
    return surface;
  });
  let activeId = null,
    destroyed = false,
    readingRevision = 0,
    revealingResize = false,
    lastReveal = null;
  const listeners = [];
  const listen = (element, type, handler) => {
    element.addEventListener(type, handler);
    listeners.push(() => element.removeEventListener(type, handler));
  };
  const prompt = (region) => {
    if (getReadingPrompt) {
      const { clientHeight, scrollHeight } = region;
      const measured =
        Number.isFinite(clientHeight) && clientHeight > 0 && Number.isFinite(scrollHeight);
      return `${getReadingPrompt({ scrollable: !measured || scrollHeight > clientHeight })}.`;
    }
    const labels = getControlLabels();
    return t('gameplay:upDownScrollOrReturns', { value1: labels.confirm, value2: labels.back });
  };
  function refresh() {
    if (destroyed) return;
    for (const surface of surfaces) {
      const active = activeId === surface.id;
      surface.done.disabled = !active;
      surface.entry.setAttribute('aria-pressed', String(active));
      localizedText(surface.hint, () =>
        active
          ? t('gameplay:reading', { value1: render(surface.label), value2: prompt(surface.region) })
          : t('interface:readWithoutStartingOrResuming'),
      );
      if (surface.id === 'overlay-reading' && (compactOverlay || surface.region.hidden)) {
        const { clientHeight, scrollHeight } = surface.region;
        const measured =
          Number.isFinite(clientHeight) && clientHeight > 0 && Number.isFinite(scrollHeight);
        const eligible = !surface.region.hidden && !surface.region.closest('[hidden]');
        const needed = eligible && (active || !measured || scrollHeight > clientHeight + 1);
        surface.entry.hidden = !needed;
        surface.done.hidden = !active;
        surface.hint.hidden = !active;
        surface.region.tabIndex = needed ? 0 : -1;
        const toolbar = surface.entry.closest?.('.reading-toolbar');
        if (toolbar) toolbar.hidden = !needed;
        if (!needed && [surface.entry, surface.done].includes(doc.activeElement))
          getNavigation().engage();
      } else if (surface.id === 'overlay-reading') {
        surface.entry.hidden = false;
        surface.done.hidden = false;
        surface.hint.hidden = false;
        surface.region.tabIndex = 0;
        const toolbar = surface.entry.closest?.('.reading-toolbar');
        if (toolbar) toolbar.hidden = false;
      }
    }
  }
  function changed(state) {
    if (destroyed) return;
    readingRevision++;
    lastReveal = null;
    const previous = activeId;
    activeId = surfaces.some((surface) => surface.id === state?.regionId) ? state.regionId : null;
    refresh();
    if (previous && previous !== activeId) {
      localizedText(surfaces.find((surface) => surface.id === previous).hint, () =>
        t('interface:readingEndedChooseAnActionWhenReady'),
      );
    }
    onTransition();
  }
  function hint(message) {
    if (destroyed || !activeId) return;
    localizedText(surfaces.find((surface) => surface.id === activeId).hint, () => message);
  }
  const view = doc.defaultView;
  function revealResizedReading(event) {
    if (destroyed || revealingResize || event.target !== view || !activeId) return;
    revealingResize = true;
    try {
      const surface = surfaces.find((value) => value.id === activeId),
        navigation = getNavigation(),
        state = navigation.readingState(),
        scope = getScope(),
        revision = readingRevision;
      if (!surface || !state || scope === 'flight') return;
      const { region, unit } = surface;
      const text = region.textContent;
      const current = () => {
        let visible =
          unit.isConnected &&
          unit.contains(region) &&
          unit.contains(surface.done) &&
          !surface.done.disabled &&
          !region.closest('[hidden],[inert],[aria-hidden="true"]') &&
          !surface.done.closest('[hidden],[inert],[aria-hidden="true"]');
        for (let parent = region; visible && parent; parent = parent.parentElement) {
          const style = view.getComputedStyle?.(parent);
          if (
            (parent.tagName === 'DETAILS' && !parent.open) ||
            (parent.tagName === 'DIALOG' && !parent.open) ||
            style?.display === 'none' ||
            style?.visibility === 'hidden'
          )
            visible = false;
        }
        const currentNavigation = getNavigation(),
          currentScope = getScope(),
          currentState = navigation.readingState(),
          foreground = !doc.hidden && doc.hasFocus?.() !== false;
        return (
          currentNavigation === navigation &&
          currentScope === scope &&
          currentState?.regionId === state.regionId &&
          currentState?.label === state.label &&
          state.regionId === surface.id &&
          region.id === surface.id &&
          region.textContent === text &&
          visible &&
          doc.defaultView === view &&
          foreground &&
          !destroyed &&
          revision === readingRevision &&
          activeId === surface.id &&
          doc.activeElement === region
        );
      };
      // Refresh validates the navigation's exact scope, root and reading text.
      // Its prompt/hint callbacks may retire even a same-ID replacement reader.
      if (!current() || !navigation.refreshReadingHint() || !current()) return;
      const width = doc.documentElement.clientWidth || view.innerWidth,
        height = doc.documentElement.clientHeight || view.innerHeight,
        rect = unit.getBoundingClientRect(),
        geometry = [
          width,
          height,
          rect.left,
          rect.top,
          rect.right,
          rect.bottom,
          rect.width,
          rect.height,
        ];
      if (
        !geometry.every(Number.isFinite) ||
        width <= 0 ||
        height <= 0 ||
        rect.width <= 0 ||
        rect.height <= 0 ||
        rect.right <= rect.left ||
        rect.bottom <= rect.top ||
        !current()
      )
        return;
      // A reader can fit the window while a scrolled panel still clips it.
      // Intersect each overflow axis with that ancestor's native client box;
      // border widths and scrollbars are outside the usable reading area.
      const clip = { left: 0, top: 0, right: width, bottom: height };
      const clips = (overflow) => /^(auto|scroll|hidden|clip|overlay)$/.test(overflow);
      for (let parent = unit.parentElement; parent; parent = parent.parentElement) {
        const style = view.getComputedStyle?.(parent),
          clipsX = clips(style?.overflowX),
          clipsY = clips(style?.overflowY);
        if (!current()) return;
        if (!clipsX && !clipsY) continue;
        const bounds = parent.getBoundingClientRect(),
          { clientLeft, clientTop, clientWidth, clientHeight } = parent,
          metrics = [bounds.left, bounds.top, bounds.right, bounds.bottom];
        if (clipsX) metrics.push(clientLeft, clientWidth);
        if (clipsY) metrics.push(clientTop, clientHeight);
        if (
          !metrics.every(Number.isFinite) ||
          bounds.right <= bounds.left ||
          bounds.bottom <= bounds.top ||
          (clipsX && (clientLeft < 0 || clientWidth <= 0)) ||
          (clipsY && (clientTop < 0 || clientHeight <= 0)) ||
          !current()
        )
          return;
        if (clipsX) {
          clip.left = Math.max(clip.left, bounds.left + clientLeft);
          clip.right = Math.min(clip.right, bounds.left + clientLeft + clientWidth);
        }
        if (clipsY) {
          clip.top = Math.max(clip.top, bounds.top + clientTop);
          clip.bottom = Math.min(clip.bottom, bounds.top + clientTop + clientHeight);
        }
      }
      geometry.push(clip.left, clip.top, clip.right, clip.bottom);
      // A valid ancestor can itself be outside the viewport. Even an empty
      // intersection then needs nearest scrolling through that ancestor.
      if (!geometry.every(Number.isFinite) || !current()) return;
      if (
        rect.left >= clip.left &&
        rect.top >= clip.top &&
        rect.right <= clip.right &&
        rect.bottom <= clip.bottom
      ) {
        lastReveal = null;
        return;
      }
      // An oversized unit can remain partly outside after nearest scrolling.
      // An identical measurement does not warrant another no-op scroll.
      if (
        lastReveal?.navigation === navigation &&
        lastReveal.revision === revision &&
        geometry.every((value, index) => value === lastReveal.geometry[index])
      )
        return;
      if (!current() || !navigation.refreshReadingHint() || !current()) return;
      // The final currentness check follows all DOM reads and host callbacks.
      // Resize owns no future focus, entry, resumed play or deferred work.
      lastReveal = { navigation, revision, geometry };
      unit.scrollIntoView({ block: 'nearest', inline: 'nearest', behavior: 'instant' });
    } finally {
      revealingResize = false;
    }
  }
  if (revealOnResize && view?.addEventListener) listen(view, 'resize', revealResizedReading);
  for (const surface of surfaces) {
    listen(surface.entry, 'click', () => {
      if (destroyed || getNavigation().readingState()?.regionId === surface.id) return;
      if (surface.id === 'mission-brief-reading' && getScope() === 'flight') pause(true);
      if (getScope() === 'flight') return;
      // The navigation adapter validates the exit before entering. Compact
      // panels expose it for this synchronous transition, then refresh from
      // the accepted reading state (or hide it again if entry was rejected).
      if (compactOverlay && surface.id === 'overlay-reading') surface.done.hidden = false;
      const navigation = getNavigation(),
        scope = getScope(),
        accepted = navigation.beginReading({
          region: surface.region,
          origin: surface.entry,
          exit: surface.done,
          label: render(surface.label),
          getLabel: () => render(surface.label),
        }),
        revision = readingRevision;
      // Install the final hint before measuring/revealing the unit: its longer
      // active copy can wrap after beginReading publishes the navigation hint.
      refresh();
      if (
        accepted &&
        !destroyed &&
        readingRevision === revision &&
        activeId === surface.id &&
        getNavigation() === navigation &&
        getScope() === scope &&
        navigation.readingState()?.regionId === surface.id &&
        !doc.hidden &&
        doc.hasFocus?.() !== false &&
        doc.activeElement === surface.region &&
        surface.unit.isConnected &&
        surface.unit.contains(surface.region) &&
        !surface.region.closest('[hidden],[inert],[aria-hidden="true"]')
      ) {
        surface.unit.scrollIntoView({ block: 'nearest', inline: 'nearest', behavior: 'instant' });
      }
    });
    // End-only: a preceding pointerdown may already have relinquished reading.
    // The stable button never becomes a Start/Resume action or toggles back in.
    listen(surface.done, 'click', () => {
      if (!destroyed) getNavigation().endReading({ restoreFocus: true });
    });
  }
  const brief = doc.getElementById('mission-brief');
  if (brief)
    listen(brief, 'toggle', () => {
      if (!brief.open && getNavigation().readingState()?.regionId === 'mission-brief-reading')
        getNavigation().endReading({ restoreFocus: false });
    });
  const collectionProgress = doc.getElementById('collection-progress');
  if (collectionProgress)
    listen(collectionProgress, 'toggle', () => {
      if (collectionProgress.open) return;
      const summary = collectionProgress.querySelector('summary');
      const hiddenFocus =
        collectionProgress.contains(doc.activeElement) &&
        doc.activeElement !== summary &&
        !summary?.contains(doc.activeElement);
      if (getNavigation().readingState()?.regionId === 'collection-reading')
        getNavigation().endReading({ restoreFocus: false });
      // Native disclosure closure must not leave focus in its hidden content.
      // A later toggle cannot steal focus from another control or closed dialog.
      if (
        hiddenFocus &&
        collectionProgress.closest('dialog')?.open &&
        summary?.isConnected &&
        !summary.closest('[hidden],[inert],[aria-hidden="true"]')
      )
        summary.focus({ preventScroll: true });
    });
  const overlay = compactOverlay
    ? surfaces.find((surface) => surface.id === 'overlay-reading')
    : null;
  const Resize = doc.defaultView?.ResizeObserver ?? globalThis.ResizeObserver;
  const Mutation = doc.defaultView?.MutationObserver ?? globalThis.MutationObserver;
  const resize = overlay && typeof Resize === 'function' ? new Resize(refresh) : null;
  const mutation = overlay && typeof Mutation === 'function' ? new Mutation(refresh) : null;
  if (overlay) {
    resize?.observe(overlay.region);
    mutation?.observe(overlay.region, { subtree: true, childList: true, characterData: true });
  }
  refresh();
  return {
    changed,
    hint,
    refresh,
    destroy() {
      if (destroyed) return;
      getNavigation().endReading({ restoreFocus: false });
      destroyed = true;
      resize?.disconnect();
      mutation?.disconnect();
      for (const remove of listeners) remove();
    },
  };
}
