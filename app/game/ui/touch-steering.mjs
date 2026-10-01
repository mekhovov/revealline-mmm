import { touchDirection } from '../touch-controls.mjs';

/** One captured steering finger; other fingers remain available for actions.
 * Pointer moves turn immediately without requiring another accurately aimed tap. */
export function attachTouchSteering({
  arena,
  pad,
  surface,
  indicator,
  window: win = globalThis.window,
  getSettings,
  active,
  onDirection,
  onRelease = () => {},
  onCancel = () => {},
}) {
  let gesture = null;
  const listeners = [];
  const listen = (target, type, fn, options) => {
    target?.addEventListener(type, fn, options);
    listeners.push(() => target?.removeEventListener(type, fn, options));
  };
  const paint = (x = 0, y = 0) => {
    if (!indicator) return;
    indicator.hidden = !gesture || gesture.mode === 'dpad';
    if (indicator.hidden) return;
    indicator.style.left = `${gesture.x}px`;
    indicator.style.top = `${gesture.y}px`;
    const distance = Math.hypot(x, y),
      scale = distance > 42 ? 42 / distance : 1;
    indicator.style.setProperty('--stick-x', `${x * scale}px`);
    indicator.style.setProperty('--stick-y', `${y * scale}px`);
    indicator.dataset.direction = gesture.direction || '';
  };
  const clear = () => {
    const old = gesture;
    gesture = null;
    paint();
    if (!old) return;
    onRelease(old.id);
    try {
      if (old.element.hasPointerCapture(old.id)) old.element.releasePointerCapture(old.id);
    } catch {}
  };
  // Layout changes can retire a captured finger before a native pointercancel.
  // Notify the host only when there was an actual gesture to interrupt.
  const cancel = () => {
    if (!gesture) return;
    clear();
    onCancel();
  };
  const move = (event) => {
    if (!gesture || gesture.id !== event.pointerId) return;
    if (!active()) {
      clear();
      return;
    }
    event.preventDefault();
    const x = event.clientX - gesture.x,
      y = event.clientY - gesture.y;
    const direction = touchDirection(x, y, gesture.direction, gesture.mode === 'dpad' ? 6 : 10);
    if (direction && direction !== gesture.direction) {
      // onDirection may synchronously clear input when resuming/changing modality.
      const current = gesture;
      onDirection(direction, gesture.id);
      if (gesture !== current) return;
      gesture.direction = direction;
    }
    paint(x, y);
    if (gesture.mode === 'swipe' && direction) {
      gesture.x = event.clientX;
      gesture.y = event.clientY;
    } else if (gesture.mode === 'stick') {
      const distance = Math.hypot(x, y);
      if (distance > 56) {
        gesture.x = event.clientX - (x * 56) / distance;
        gesture.y = event.clientY - (y * 56) / distance;
      }
    }
  };
  const end = (event) => {
    // A deliberate clear retires ownership before releasing capture. Late
    // notifications and another finger's release cannot interrupt a new owner.
    if (!gesture || gesture.id !== event.pointerId) return;
    if (event.type === 'pointerup') clear();
    else cancel();
  };
  // Capture can be unavailable. Observe matching releases outside the surface,
  // including when another control stops propagation, so the next finger works.
  for (const type of ['pointerup', 'pointercancel']) listen(win, type, end, true);
  for (const element of [arena, pad, surface].filter(Boolean)) {
    listen(element, 'pointerdown', (event) => {
      if (gesture || !active() || (event.button !== undefined && event.button !== 0)) return;
      const mode = getSettings().mode;
      if (element === arena && (mode === 'dpad' || !['touch', 'pen'].includes(event.pointerType)))
        return;
      if (element === pad && mode !== 'dpad') return;
      event.preventDefault();
      const rect = element.getBoundingClientRect();
      gesture = {
        id: event.pointerId,
        element,
        mode,
        direction: null,
        x: mode === 'dpad' ? rect.left + rect.width / 2 : event.clientX,
        y: mode === 'dpad' ? rect.top + rect.height / 2 : event.clientY,
      };
      try {
        element.setPointerCapture(event.pointerId);
      } catch {}
      paint();
      if (mode === 'dpad') move(event);
    });
    listen(element, 'pointermove', move);
    for (const type of ['pointerup', 'pointercancel', 'lostpointercapture'])
      listen(element, type, end);
  }
  return {
    clear,
    cancel,
    destroy() {
      clear();
      listeners.forEach((remove) => remove());
    },
  };
}
