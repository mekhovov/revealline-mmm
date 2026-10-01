/** Fit a complete board inside its available content box, in CSS pixels. */
export function fitBoardRect(boxWidth, boxHeight, boardWidth, boardHeight) {
  if (![boxWidth, boxHeight, boardWidth, boardHeight].every((n) => Number.isFinite(n) && n > 0))
    return { width: 0, height: 0 };
  const scale = Math.min(boxWidth / boardWidth, boxHeight / boardHeight),
    width = boardWidth * scale,
    height = boardHeight * scale;
  return Number.isFinite(width) && Number.isFinite(height)
    ? { width, height }
    : { width: 0, height: 0 };
}

/** Own only the CSS footprint. Bitmap geometry, match state and artwork stay with the host. */
export function createBoardFootprints(
  canvases,
  { window = globalThis.window, ResizeObserver = globalThis.ResizeObserver } = {},
) {
  const seats = canvases.map((canvas) => ({
    canvas,
    arena: canvas.parentElement ?? canvas.parentNode,
    width: 0,
    height: 0,
    initialized: false,
  }));
  let observer = null,
    generation = 0,
    suspended = false,
    disposed = false;

  function apply(seat, boxWidth, boxHeight) {
    if (disposed || suspended) return;
    const fit = fitBoardRect(boxWidth, boxHeight, seat.canvas.width, seat.canvas.height);
    if (seat.initialized && seat.width === fit.width && seat.height === fit.height) return;
    seat.width = fit.width;
    seat.height = fit.height;
    seat.initialized = true;
    // The absolutely positioned canvas contributes no intrinsic size to the
    // observed grid slot. Equal deliveries must not cause resize/write loops.
    for (const key of ['width', 'height']) {
      seat.canvas.style[key] = `${fit[key]}px`;
    }
  }

  function refresh() {
    if (disposed || suspended) return;
    // Targeted bootstrap/geometry/fallback reconciliation, never a frame-loop read.
    // .race-arena has no padding; client dimensions exclude its decorative border.
    for (const seat of seats) apply(seat, seat.arena?.clientWidth, seat.arena?.clientHeight);
  }

  function observe() {
    observer?.disconnect();
    observer = null;
    const ticket = ++generation;
    if (typeof ResizeObserver !== 'function') return;
    observer = new ResizeObserver((entries) => {
      if (disposed || suspended || ticket !== generation) return;
      for (const entry of entries) {
        const seat = seats.find((candidate) => candidate.arena === entry.target);
        if (seat) apply(seat, entry.contentRect.width, entry.contentRect.height);
      }
    });
    for (const seat of seats) if (seat.arena) observer.observe(seat.arena);
  }

  function hide(event) {
    if (!event.persisted) return dispose();
    suspended = true;
    generation++;
    observer?.disconnect();
    observer = null;
  }

  function show() {
    if (disposed) return;
    suspended = false;
    observe();
    refresh();
  }

  function dispose() {
    if (disposed) return;
    disposed = true;
    generation++;
    observer?.disconnect();
    observer = null;
    window?.removeEventListener('resize', refresh);
    window?.removeEventListener('pagehide', hide);
    window?.removeEventListener('pageshow', show);
  }

  window?.addEventListener('resize', refresh);
  window?.addEventListener('pagehide', hide);
  window?.addEventListener('pageshow', show);
  observe();
  refresh();
  return {
    refresh,
    get observesResize() {
      return observer !== null;
    },
    // Zero/hidden bounds are unavailable, not a valid renderer scale.
    width: (index) => (seats[index]?.width > 0 ? seats[index].width : undefined),
    dispose,
  };
}
