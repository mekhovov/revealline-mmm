import { actionForKey, keyCodeForEvent, resolveKeyBindings } from '../key-bindings.mjs';
import { attachTouchSteering } from './touch-steering.mjs';

const DIRECTIONS = ['up', 'right', 'down', 'left'];
const PLAY_ACTIONS = ['ability', 'pickup', 'boost', 'hangar'];
const UI_CONTROL = 'button,a,input,select,textarea,[role="button"],[data-demo-ui]';

// Shares the host's one controller sample. It never polls navigator.getGamepads.
export function attachDemoInput({
  root,
  canvas,
  active,
  watching,
  takeoverAvailable = watching,
  practice,
  busy = () => false,
  getBindings,
  getTouchSettings = () => ({ mode: 'swipe' }),
  tapMode = () => false,
  interrupt,
  takeover,
  back,
  steer,
  pause,
  menu,
  ownsUI = () => false,
  nativeConfirmOwned = () => false,
  onActivity = () => {},
  onHangar = () => {},
}) {
  const view = root.ownerDocument.defaultView;
  const win = typeof view?.addEventListener === 'function' ? view : globalThis.window;
  const held = new Set(),
    actions = new Map(),
    pointerActions = new Map(),
    impulses = new Set(),
    suppressedPointers = new Set(),
    suppressedExitKeys = new Set(),
    removers = [];
  let pad = {},
    blocked = false,
    boostLatched = false,
    lastDirection = null,
    previousPad = {},
    takeoverPending = false,
    canvasGesture = null,
    lastReleasedPointer = null,
    suppressExitKeyClick = false,
    padNeedsNeutral = false,
    uiHadFocus = false;
  const listen = (target, type, fn, capture = false) => {
    target.addEventListener(type, fn, capture);
    removers.push(() => target.removeEventListener(type, fn, capture));
  };
  const consume = (event) => {
    event.preventDefault();
    event.stopImmediatePropagation?.();
  };
  const takeControl = (intent = {}) => {
    if (!takeoverAvailable() || busy() || takeoverPending) return;
    // The host owns this immutable first command across its async fork and
    // input clear. Never leave it in the physical hold/impulse ledgers.
    takeoverPending = true;
    const result = takeover(Object.freeze({ ...intent }));
    Promise.resolve(result).then(
      () => (takeoverPending = false),
      () => (takeoverPending = false),
    );
  };
  const intentForAction = (action) =>
    DIRECTIONS.includes(action)
      ? { direction: action }
      : PLAY_ACTIONS.includes(action)
        ? { action }
        : null;
  listen(
    win,
    'keydown',
    (event) => {
      const code = keyCodeForEvent(event),
        fresh = !event.repeat && !held.has(code);
      held.add(code);
      if (suppressedExitKeys.has(code)) {
        consume(event);
        return;
      }
      if (fresh) suppressExitKeyClick = false;
      if (
        !active() ||
        root.ownerDocument.hidden ||
        root.ownerDocument.hasFocus?.() === false ||
        event.ctrlKey ||
        event.metaKey ||
        event.altKey
      )
        return;
      onActivity();
      if (code === 'Escape') {
        consume(event);
        if (fresh) back();
        return;
      }
      const activation = ['Enter', 'NumpadEnter', 'Space'].includes(code);
      // Back lives inside the same UI wrapper as ordinary controls. Own its
      // exit gesture before yielding so a held key cannot reactivate Home.
      if (activation && event.target?.closest?.('[data-demo-exit]')) {
        // Window capture precedes the document guard. Let its shared Confirm
        // owner consume controller echoes, including a press not yet seen by RAF.
        if (fresh && !event.shiftKey && nativeConfirmOwned(event)) return;
        consume(event);
        if (fresh) {
          suppressedExitKeys.add(code);
          suppressExitKeyClick = true;
          back();
        }
        return;
      }
      if (event.target?.closest?.('[data-demo-ui]')) {
        releaseForUI();
        return;
      }
      if (takeoverAvailable() || busy()) {
        // Native UI owns activation and editing. A fresh gameplay key still
        // means play when the spectator menu happens to have button focus.
        if (
          event.target?.closest?.('input,select,textarea') ||
          (activation && event.target?.closest?.(UI_CONTROL))
        )
          return;
        const action = actionForKey(resolveKeyBindings(getBindings()), event, {
          allowRepeat: true,
        });
        if (!action) return;
        consume(event);
        if (!fresh || blocked || busy()) return;
        const intent = intentForAction(action);
        if (intent) takeControl(intent);
        else if (action === 'pause' || action === 'stop') interrupt();
        return;
      }
      if (!practice() || event.target?.closest?.(UI_CONTROL)) return;
      const action = actionForKey(resolveKeyBindings(getBindings()), event, { allowRepeat: true });
      if (!action) return;
      consume(event);
      if (!fresh || blocked) return;
      if (DIRECTIONS.includes(action)) steer(action);
      else if (action === 'pause' || action === 'stop') pause();
      else if (action === 'hangar') onHangar();
      else {
        actions.set(code, action);
        if (['ability', 'pickup'].includes(action)) impulses.add(action);
      }
    },
    true,
  );
  listen(
    win,
    'keyup',
    (event) => {
      const code = keyCodeForEvent(event);
      held.delete(code);
      if (held.size === 0) blocked = false;
      actions.delete(code);
      if (suppressedExitKeys.delete(code)) {
        consume(event);
        // Space can target the restored Home control on release. Keep its
        // synchronous default click consumed, then retire the gesture.
        queueMicrotask(() => {
          if (suppressedExitKeys.size === 0) suppressExitKeyClick = false;
        });
      }
    },
    true,
  );
  listen(
    win,
    'pointerdown',
    (event) => {
      suppressedPointers.delete(event.pointerId ?? 'mouse');
      suppressExitKeyClick = false;
    },
    true,
  );
  listen(
    root,
    'pointerdown',
    (event) => {
      const pointerId = event.pointerId ?? 'mouse';
      if (!active()) return;
      onActivity();
      if (event.button > 0) return;
      if ((takeoverAvailable() || busy()) && event.target?.closest?.('[data-demo-exit]')) {
        if (nativeConfirmOwned(event)) return;
        suppressedPointers.add(pointerId);
        consume(event);
        back();
        return;
      }
      if (event.target?.closest?.('[data-demo-ui]')) {
        releaseForUI();
        return;
      }
      if (takeoverAvailable() && event.target === canvas && !canvasGesture)
        canvasGesture = { id: event.pointerId, x: event.clientX, y: event.clientY, moved: false };
      const button = event.target?.closest?.('[data-demo-move]');
      const action = event.target?.closest?.('[data-demo-action]');
      if ((takeoverAvailable() || busy()) && (button || action)) {
        const intent = intentForAction(button?.dataset.demoMove || action?.dataset.demoAction);
        consume(event);
        suppressedPointers.add(pointerId);
        if (intent) takeControl(intent);
        return;
      }
      // Canvas downs reach shared steering so a real swipe/stick direction can
      // be recognized. Buttons such as Next/fullscreen/menu retain their click.
      if (!practice()) return;
      if (button) {
        consume(event);
        steer(button.dataset.demoMove);
        return;
      }
      if (action) {
        consume(event);
        if (action.dataset.demoAction === 'boost' && tapMode()) {
          boostLatched = !boostLatched;
          pointerActions.set(event.pointerId, 'boost-toggle');
        } else pointerActions.set(event.pointerId, action.dataset.demoAction);
        if (['ability', 'pickup'].includes(action.dataset.demoAction))
          impulses.add(action.dataset.demoAction);
        return;
      }
    },
    true,
  );
  const touch = attachTouchSteering({
    arena: canvas,
    window: win,
    getSettings: getTouchSettings,
    active: () => !busy() && (takeoverAvailable() || practice()),
    onDirection: (direction, pointerId) => {
      if (takeoverAvailable()) {
        suppressedPointers.add(pointerId ?? 'mouse');
        takeControl({ direction });
      } else if (practice()) steer(direction);
    },
    onCancel: () => {
      canvasGesture = null;
      if (practice()) pause();
    },
  });
  function releaseForUI() {
    // UI focus retires the physical gameplay gesture, including another finger
    // still holding an action. Leaving UI requires fresh keyboard/pad input.
    uiHadFocus = true;
    blocked = held.size > 0;
    actions.clear();
    impulses.clear();
    pointerActions.clear();
    boostLatched = false;
    pad = {};
    lastDirection = null;
    canvasGesture = null;
    touch.clear();
  }
  listen(root, 'focusin', (event) => {
    if (active() && (ownsUI() || event.target?.closest?.('[data-demo-ui]'))) releaseForUI();
  });
  listen(
    win,
    'pointermove',
    (event) => {
      if (canvasGesture?.id !== event.pointerId) return;
      if (Math.hypot(event.clientX - canvasGesture.x, event.clientY - canvasGesture.y) >= 10)
        canvasGesture.moved = true;
    },
    true,
  );
  const loseForeground = () => {
    // A key released outside this document cannot deliver its keyup here.
    // Auto-repeat remains ineligible, and a new physical edge is still required.
    held.clear();
    suppressedExitKeys.clear();
    suppressExitKeyClick = false;
    actions.clear();
    impulses.clear();
    pointerActions.clear();
    blocked = false;
    boostLatched = false;
    pad = {};
    previousPad = {};
    padNeedsNeutral = true;
    lastDirection = null;
    canvasGesture = null;
    touch.clear();
  };
  listen(win, 'blur', loseForeground);
  listen(root.ownerDocument, 'visibilitychange', () => {
    if (root.ownerDocument.hidden) loseForeground();
  });
  for (const type of ['pointerup', 'pointercancel'])
    listen(
      win,
      type,
      (event) => {
        if (canvasGesture?.id === event.pointerId) {
          const tap = canvasGesture;
          canvasGesture = null;
          if (
            type === 'pointerup' &&
            !tap.moved &&
            event.target === canvas &&
            Math.hypot(event.clientX - tap.x, event.clientY - tap.y) < 10 &&
            takeoverAvailable()
          ) {
            suppressedPointers.add(event.pointerId ?? 'mouse');
            consume(event);
            takeControl();
          }
        }
        const ownedAction = pointerActions.has(event.pointerId);
        pointerActions.delete(event.pointerId);
        lastReleasedPointer = event.pointerId ?? 'mouse';
        if (type === 'pointercancel') {
          suppressedPointers.delete(lastReleasedPointer);
          if (ownedAction) {
            boostLatched = false;
            pause();
          }
        }
      },
      true,
    );
  listen(
    win,
    'click',
    (event) => {
      if (event.detail === 0 && suppressExitKeyClick) {
        suppressExitKeyClick = false;
        consume(event);
        return;
      }
      const pointerId = event.pointerId ?? lastReleasedPointer ?? 'mouse';
      if (event.detail !== 0 && suppressedPointers.has(pointerId)) {
        suppressedPointers.delete(pointerId);
        consume(event);
      }
    },
    true,
  );
  listen(
    root,
    'click',
    (event) => {
      const move = event.target?.closest?.('[data-demo-move]');
      const action = event.target?.closest?.('[data-demo-action]');
      if (
        (takeoverAvailable() || busy()) &&
        event.detail === 0 &&
        (move || action || event.target === canvas)
      ) {
        consume(event);
        const intent = intentForAction(move?.dataset.demoMove || action?.dataset.demoAction);
        takeControl(intent ?? {});
        return;
      }
      if (move && practice() && event.detail === 0) steer(move.dataset.demoMove);
      if (action && practice() && event.detail === 0) {
        if (action.dataset.demoAction === 'boost') boostLatched = !boostLatched;
        else impulses.add(action.dataset.demoAction);
      }
    },
    true,
  );
  return {
    clear() {
      blocked = held.size > 0;
      boostLatched = false;
      actions.clear();
      impulses.clear();
      pad = {};
      lastDirection = null;
      canvasGesture = null;
      pointerActions.clear();
      touch.clear();
    },
    controller(frame) {
      if (!active() || root.ownerDocument.hidden || root.ownerDocument.hasFocus?.() === false)
        return;
      const previous = previousPad;
      pad = frame.flight ?? {};
      previousPad = { ...pad };
      if (frame.disconnected) {
        pad = {};
        previousPad = {};
        if (practice()) pause();
        return;
      }
      if (ownsUI()) {
        releaseForUI();
        if (padNeedsNeutral) {
          if (
            Object.values(frame.flight ?? {}).some(Boolean) ||
            Object.values(frame.ui ?? {}).some(Boolean)
          )
            return;
          padNeedsNeutral = false;
        }
        if (!busy()) menu(frame.ui ?? {});
        return;
      }
      if (uiHadFocus) {
        uiHadFocus = false;
        padNeedsNeutral = true;
        previousPad = {};
      }
      if (padNeedsNeutral) {
        if (Object.values(pad).some(Boolean) || Object.values(frame.ui ?? {}).some(Boolean)) {
          pad = {};
          return;
        }
        padNeedsNeutral = false;
      }
      if (busy()) return;
      if (takeoverAvailable()) {
        // Joining/reconnection and held-neutral gates never mean "play".
        if (frame.status && frame.status.code !== 'connected') return;
        if (frame.ui?.back) back();
        else if (frame.ui?.menu || pad.pause || pad.stop) interrupt();
        else {
          const direction =
            pad.direction && pad.direction !== previous.direction ? pad.direction : null;
          const action = [
            ['action', 'ability'],
            ['pickup', 'pickup'],
            ['boost', 'boost'],
            ['hangar', 'hangar'],
          ].find(([field]) => pad[field] && !previous[field])?.[1];
          if (direction || action)
            takeControl({ ...(direction ? { direction } : {}), ...(action ? { action } : {}) });
          else if (frame.ui?.confirm) interrupt();
        }
      } else if (practice()) {
        if (pad.pause || pad.stop) {
          pause();
          return;
        }
        if (pad.action) impulses.add('ability');
        if (pad.pickup) impulses.add('pickup');
        if (pad.direction && pad.direction !== lastDirection) steer(pad.direction);
        if (pad.hangar) onHangar();
      } else menu(frame.ui ?? {});
      lastDirection = pad.direction;
    },
    controls() {
      if (ownsUI()) {
        releaseForUI();
        return { boost: false, action: false, pickup: false };
      }
      const result = {
        boost:
          boostLatched ||
          [...actions.values()].includes('boost') ||
          [...pointerActions.values()].includes('boost') ||
          pad.boost,
        action:
          [...actions.values()].includes('ability') ||
          [...pointerActions.values()].includes('ability') ||
          impulses.has('ability') ||
          pad.action,
        pickup:
          [...actions.values()].includes('pickup') ||
          [...pointerActions.values()].includes('pickup') ||
          impulses.has('pickup') ||
          pad.pickup,
      };
      impulses.clear();
      return result;
    },
    destroy() {
      touch.destroy();
      for (const remove of removers) remove();
    },
  };
}
