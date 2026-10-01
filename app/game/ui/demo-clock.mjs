const MAX_DEBT_SECONDS = 2;
const MAX_SLICE_SECONDS = 0.25;
const MAX_BURST_SLICES = 8;
const FRAME_DEADLINE_MS = 250;
const advancing = (phase) => phase === 'playing' || phase === 'complete';

/**
 * Presentation scheduling only: the host retains playback and input authority.
 * playing/complete admit simulation/recap time; all other phases still pump
 * audio and visible paint. reset rebases time without changing playback intent.
 */
export function attachDemoClock({
  document: doc = globalThis.document,
  window: win = globalThis.window,
  getPlaybackState,
  advance,
  paint = () => {},
  updateAudio = () => {},
  now = () => (win?.performance ?? globalThis.performance).now(),
  requestFrame = win?.requestAnimationFrame?.bind(win) ??
    globalThis.requestAnimationFrame?.bind(globalThis),
  cancelFrame = win?.cancelAnimationFrame?.bind(win) ??
    globalThis.cancelAnimationFrame?.bind(globalThis),
  setTimer = globalThis.setTimeout,
  clearTimer = globalThis.clearTimeout,
  MessageChannelClass = win?.MessageChannel,
}) {
  let running = false,
    frozen = false,
    disposed = false,
    generation = 0,
    serial = 0,
    scheduled = null,
    lastTime = null,
    lastPhase = null,
    debt = 0,
    burstSlices = 0,
    channel = null;

  function cancelTicket(ticket) {
    if (ticket?.kind === 'frame') {
      cancelFrame?.(ticket.handle);
      clearTimer(ticket.watchdog);
    } else if (ticket?.kind === 'timer') clearTimer(ticket.handle);
  }
  function cancel() {
    generation++;
    cancelTicket(scheduled);
    scheduled = null;
  }
  function rebase() {
    debt = 0;
    burstSlices = 0;
    lastTime = now();
    lastPhase = getPlaybackState().phase;
  }
  function schedule(catchUp = false) {
    if (!running || frozen || disposed || scheduled) return;
    const ticket = { generation, id: ++serial, kind: null, handle: null, catchUp };
    scheduled = ticket;
    if (catchUp && typeof MessageChannelClass === 'function') {
      channel ??= new MessageChannelClass();
      channel.port1.onmessage = ({ data }) => {
        if (scheduled?.id === data.id && scheduled.generation === data.generation) wake(scheduled);
      };
      ticket.kind = 'message';
      channel.port2.postMessage({ id: ticket.id, generation: ticket.generation });
    } else if (!catchUp && !doc?.hidden && requestFrame) {
      ticket.kind = 'frame';
      ticket.handle = requestFrame(() => wake(ticket));
      // A visible, unfocused document can stop receiving RAF without becoming
      // hidden. Race one bounded fallback against this same wake, not a second
      // clock: whichever callback arrives first retires both handles.
      ticket.watchdog = setTimer(() => wake(ticket, true), FRAME_DEADLINE_MS);
    } else {
      ticket.kind = 'timer';
      ticket.handle = setTimer(() => wake(ticket), catchUp ? 0 : doc?.hidden ? 50 : 16);
    }
  }
  function wake(ticket, recovered = false) {
    if (disposed || !running || frozen || scheduled !== ticket || generation !== ticket.generation)
      return;
    cancelTicket(ticket);
    scheduled = null;
    const sampled = now();
    const stamp = Number.isFinite(sampled)
      ? Math.max(Number.isFinite(lastTime) ? lastTime : sampled, sampled)
      : lastTime;
    const elapsed =
      Number.isFinite(stamp) && Number.isFinite(lastTime)
        ? Math.max(0, (stamp - lastTime) / 1000)
        : 0;
    lastTime = Number.isFinite(stamp) ? stamp : lastTime;
    const state = getPlaybackState();
    if (!ticket.catchUp) burstSlices = 0;
    // Catch-up drains only this wake's admitted budget. Its own work cannot
    // create an endless chain of new catch-up tasks.
    if (!advancing(state.phase) || !advancing(lastPhase)) debt = 0;
    else if (!ticket.catchUp) debt = Math.min(MAX_DEBT_SECONDS, debt + elapsed);
    lastPhase = state.phase;
    updateAudio();
    if (generation !== ticket.generation || !running || frozen || disposed) return;
    const budget =
      state.maxAdvanceSeconds === undefined
        ? MAX_SLICE_SECONDS
        : Number.isFinite(state.maxAdvanceSeconds)
          ? Math.max(0, state.maxAdvanceSeconds)
          : 0;
    const seconds = Math.min(MAX_SLICE_SECONDS, debt, budget);
    let advanced = false;
    if (advancing(state.phase) && seconds > 0) {
      const fresh =
        !recovered && !ticket.catchUp && elapsed <= MAX_SLICE_SECONDS && debt <= MAX_SLICE_SECONDS;
      debt = Math.max(0, debt - seconds);
      burstSlices++;
      advance(seconds, { fresh });
      advanced = true;
    }
    if (generation !== ticket.generation || !running || frozen || disposed) return;
    if (!doc?.hidden && !ticket.catchUp) paint(Math.min(elapsed, MAX_SLICE_SECONDS));
    if (generation !== ticket.generation || !running || frozen || disposed) return;
    const after = getPlaybackState();
    if (!advancing(after.phase) || burstSlices >= MAX_BURST_SLICES) debt = 0;
    lastPhase = after.phase;
    const canCatchUp =
      advanced &&
      debt > 1e-9 &&
      advancing(after.phase) &&
      (after.maxAdvanceSeconds === undefined || after.maxAdvanceSeconds > 0);
    schedule(canCatchUp);
  }
  function reset() {
    if (disposed) return;
    cancel();
    rebase();
    schedule();
  }
  function start() {
    if (disposed || running) return;
    running = true;
    reset();
  }
  function stop() {
    running = false;
    cancel();
    debt = 0;
    lastTime = null;
  }
  function freeze() {
    if (disposed || frozen) return;
    frozen = true;
    cancel();
    debt = 0;
    lastTime = null;
  }
  function resume() {
    if (disposed || !frozen) return;
    frozen = false;
    reset();
  }
  doc?.addEventListener('visibilitychange', reset);
  doc?.addEventListener('freeze', freeze);
  doc?.addEventListener('resume', resume);
  return {
    start,
    stop,
    reset,
    freeze,
    resume,
    destroy() {
      if (disposed) return;
      stop();
      disposed = true;
      doc?.removeEventListener('visibilitychange', reset);
      doc?.removeEventListener('freeze', freeze);
      doc?.removeEventListener('resume', resume);
      if (channel) {
        channel.port1.onmessage = null;
        channel.port1.close();
        channel.port2.close();
        channel = null;
      }
    },
  };
}
