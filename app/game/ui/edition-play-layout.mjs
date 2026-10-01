/** Presentation coordinates only. World cells, camera, input and replay remain
 * owned by the shared Solo player. Fit every edge inside the unobstructed area. */
export function fitEditionBoard({
  width,
  height,
  aspect,
  top = 0,
  bottom = 0,
  left = 0,
  right = 0,
}) {
  if (![width, height, aspect, top, bottom, left, right].every(Number.isFinite) || aspect <= 0)
    throw new TypeError('Invalid edition viewport.');
  const availableWidth = Math.max(0, width - left - right);
  const availableHeight = Math.max(0, height - top - bottom);
  const boardWidth = Math.min(availableWidth, availableHeight * aspect);
  const boardHeight = boardWidth / aspect;
  return {
    x: left + (availableWidth - boardWidth) / 2,
    y: top + (availableHeight - boardHeight) / 2,
    width: boardWidth,
    height: boardHeight,
  };
}

export function mountEditionPlayLayout({
  document = globalThis.document,
  window = globalThis.window,
} = {}) {
  const body = document.body;
  if (
    !body.dataset.editionId ||
    typeof window?.requestAnimationFrame !== 'function' ||
    typeof window?.MutationObserver !== 'function' ||
    typeof body.getBoundingClientRect !== 'function'
  )
    return () => {};
  const $ = (selector) => document.querySelector(selector);
  const shell = $('.shell-bar'),
    telemetry = $('.telemetry'),
    controls = $('.play-controls');
  const notices = [
    'encounter-status',
    'run-message',
    'save-warning',
    'asset-warning',
    'appearance-unlock',
  ]
    .map((id) => document.getElementById(id))
    .filter(Boolean);
  const safe = document.createElement('div');
  safe.className = 'edition-safe-probe';
  safe.setAttribute('aria-hidden', 'true');
  body.append(safe);
  let frame = null,
    stopped = false;
  const set = (key, value) => {
    const next = `${Math.round(value * 100) / 100}px`;
    if (body.style.getPropertyValue(key) !== next) body.style.setProperty(key, next);
  };
  const visibleHeight = (element) =>
    !element || element.hidden || window.getComputedStyle(element).display === 'none'
      ? 0
      : element.getBoundingClientRect().height;
  function measure() {
    frame = null;
    if (stopped) return;
    if (body.classList.contains('first-flight-session')) {
      delete body.dataset.editionLayout;
      return;
    }
    body.dataset.editionLayout = 'active';
    const box = safe.getBoundingClientRect(),
      style = window.getComputedStyle(safe);
    const inset = (side) => parseFloat(style[`padding${side}`]) || 0;
    const narrow = box.width < 720,
      landscape = box.width > box.height;
    const screenControls =
      body.dataset.screenControls === 'shown' && body.dataset.flightState === 'running';
    const controlHeight = screenControls ? visibleHeight(controls) : 0;
    const controlWidth = controlHeight ? controls.getBoundingClientRect().width : 0;
    const controlSide = landscape && box.width >= 640 && controlHeight > 0;
    const top =
      inset('Top') +
      (narrow
        ? visibleHeight(shell) + visibleHeight(telemetry)
        : Math.max(visibleHeight(shell), visibleHeight(telemetry))) +
      8;
    let bottom = inset('Bottom') + 8;
    for (const notice of notices) {
      notice.style.setProperty('--edition-notice-bottom', `${bottom}px`);
      if (notice.textContent.trim())
        bottom += visibleHeight(notice) + (visibleHeight(notice) ? 4 : 0);
    }
    set('--edition-controls-bottom', bottom);
    const left =
      inset('Left') +
      4 +
      (controlSide && body.dataset.touchSide !== 'right' ? controlWidth + 12 : 0);
    const right =
      inset('Right') +
      4 +
      (controlSide && body.dataset.touchSide === 'right' ? controlWidth + 12 : 0);
    const aspect =
      parseFloat(
        window.getComputedStyle(document.documentElement).getPropertyValue('--board-aspect'),
      ) || 2;
    const fit = fitEditionBoard({
      width: box.width,
      height: box.height,
      aspect,
      top,
      bottom: bottom + (!controlSide ? controlHeight + (controlHeight ? 8 : 0) : 0),
      left,
      right,
    });
    set('--edition-board-x', fit.x);
    set('--edition-board-y', fit.y);
    set('--edition-board-width', fit.width);
    set('--edition-board-height', fit.height);
  }
  function schedule() {
    if (!stopped && frame === null) frame = window.requestAnimationFrame(measure);
  }
  const resize =
    typeof window.ResizeObserver === 'function' ? new window.ResizeObserver(schedule) : null;
  for (const element of [safe, shell, telemetry, controls, ...notices].filter(Boolean))
    resize?.observe(element);
  const mutation = new window.MutationObserver(schedule);
  mutation.observe(body, {
    attributes: true,
    attributeFilter: [
      'data-screen-controls',
      'data-touch-mode',
      'data-touch-side',
      'data-flight-state',
      'data-text-size',
      'class',
    ],
  });
  mutation.observe(document.documentElement, { attributes: true, attributeFilter: ['style'] });
  for (const element of notices)
    mutation.observe(element, {
      attributes: true,
      attributeFilter: ['hidden', 'data-kind', 'data-phase', 'data-cue'],
      childList: true,
      subtree: true,
      characterData: true,
    });
  window.addEventListener('resize', schedule);
  window.visualViewport?.addEventListener('resize', schedule);
  schedule();
  return () => {
    stopped = true;
    if (frame !== null) window.cancelAnimationFrame(frame);
    resize?.disconnect();
    mutation.disconnect();
    safe.remove();
    window.removeEventListener('resize', schedule);
    window.visualViewport?.removeEventListener('resize', schedule);
    delete body.dataset.editionLayout;
  };
}
