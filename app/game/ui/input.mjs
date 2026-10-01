import { t } from '../i18n/index.mjs';
import { actionForKey, keyCodeForEvent, resolveKeyBindings } from '../key-bindings.mjs';
import { attachTouchSteering } from './touch-steering.mjs';
import { attachPlayfieldContextMenu } from './playfield-context-menu.mjs';
const neutral = () => ({ direction: null, boost: false, action: false, pickup: false });
export function gamepadCommand(pad) {
  if (!pad?.connected) return { ...neutral(), pause: false };
  const b = (i) => !!pad.buttons?.[i]?.pressed,
    x = pad.axes?.[0] || 0,
    y = pad.axes?.[1] || 0;
  let direction = b(12) ? 'up' : b(15) ? 'right' : b(13) ? 'down' : b(14) ? 'left' : null;
  if (!direction && Math.max(Math.abs(x), Math.abs(y)) > 0.35)
    direction = Math.abs(x) > Math.abs(y) ? (x > 0 ? 'right' : 'left') : y > 0 ? 'down' : 'up';
  return { direction, boost: b(5), action: b(0), pickup: b(2), pause: b(9) };
}
export function attachInput({
  arena,
  onPause = () => {},
  onActivity = () => {},
  onClear = () => {},
  tapMode = () => false,
  continuousSteering = () => false,
  active = () => true,
  onGamepad = () => {},
  getBindings = () => null,
  readControllerCommand = null,
  getTouchSettings = null,
  touchEnabled = () => true,
}) {
  if (readControllerCommand !== null && typeof readControllerCommand !== 'function')
    throw new TypeError('readControllerCommand must be a function.');
  if (typeof onClear !== 'function') throw new TypeError('onClear must be a function.');
  if (typeof continuousSteering !== 'function')
    throw new TypeError('continuousSteering must be a function.');
  const held = new Map(),
    buttons = new Map(),
    captures = new Map(),
    keysDown = new Set(),
    pointersDown = new Set(),
    freshGestures = new WeakSet(),
    listeners = [];
  const padButtons = [...document.querySelectorAll('[data-move]')],
    boostButton = document.querySelector('#boost-button');
  let touchSteering = null;
  let order = 0,
    latched = null,
    boostLatched = false,
    boostClickGuard = false,
    boostClickTimer = null,
    padBoost = false,
    action = false,
    pickup = false,
    selectedPad = null,
    padDisconnected = false,
    lastPause = false,
    blockedPad = false,
    intentDirection = null,
    localDirectionPending = false,
    lastPadDirection = null,
    destroyed = false;
  const detachPlayfieldContextMenu = attachPlayfieldContextMenu({ roots: [arena], active });
  const continuous = () => continuousSteering() === true;
  const listen = (target, type, fn, options) => {
    if (target) {
      target.addEventListener(type, fn, options);
      listeners.push(() => target.removeEventListener(type, fn, options));
    }
  };
  const editing = (el) =>
    !!el?.closest?.(
      'input,select,textarea,[contenteditable]:not([contenteditable="false"]),[data-game-reading]',
    );
  const shortcut = (e) => e.ctrlKey || e.metaKey || e.altKey;
  const activation = (e) => e.key === ' ' || e.key === 'Enter';
  const freshKey = (e) => (continuous() ? freshGestures.has(e) : !e.repeat);
  // Observe physical edges even while menus/readers own the event. A held key
  // cannot become a new flight command after a pause, reset or focus transfer.
  listen(
    window,
    'keydown',
    (e) => {
      if (!continuous()) return;
      const code = keyCodeForEvent(e);
      if (!code) return;
      if (!e.repeat && !keysDown.has(code)) freshGestures.add(e);
      keysDown.add(code);
    },
    true,
  );
  listen(window, 'keyup', (e) => keysDown.delete(keyCodeForEvent(e)), true);
  listen(
    window,
    'pointerdown',
    (e) => {
      if (!continuous()) return;
      if (!pointersDown.has(e.pointerId)) freshGestures.add(e);
      pointersDown.add(e.pointerId);
    },
    true,
  );
  const releasePointer = (e) => pointersDown.delete(e.pointerId);
  listen(window, 'pointerup', releasePointer, true);
  listen(window, 'pointercancel', releasePointer, true);
  const localBoost = () =>
    boostLatched || [...held.values(), ...buttons.values()].some((value) => value.boost);
  // Native keyboard clicks run in the activation event's task. Release the
  // duplicate guard afterward so a later assistive click remains usable.
  const finishBoostKeyGesture = () => {
    if (!boostClickGuard) return;
    clearTimeout(boostClickTimer);
    boostClickTimer = setTimeout(() => {
      boostClickGuard = false;
      boostClickTimer = null;
    }, 0);
  };
  const syncPressed = () => {
    padButtons.forEach((b) =>
      b.classList.toggle(
        'pressed',
        continuous()
          ? intentDirection === b.dataset.move
          : latched === b.dataset.move ||
              [...held.values(), ...buttons.values()].some((v) => v.element === b),
      ),
    );
    if (boostButton) {
      const pressed = localBoost() || padBoost;
      boostButton.classList.toggle('pressed', pressed);
      boostButton.setAttribute('aria-pressed', String(pressed));
    }
  };
  // A sampled controller gesture may take ownership without being neutralized
  // by cleanup of the local pointer/keyboard controls it replaces.
  const releaseLocalControls = () => {
    touchSteering?.clear();
    const captured = [...captures];
    held.clear();
    buttons.clear();
    captures.clear();
    latched = null;
    boostLatched = false;
    action = false;
    pickup = false;
    finishBoostKeyGesture();
    syncPressed();
    for (const [id, element] of captured)
      try {
        if (element.hasPointerCapture?.(id)) element.releasePointerCapture(id);
      } catch {}
  };
  // Neither reset touches simulation state. Hosts retain intent for UI/lifecycle
  // transitions, and use clear() for a new attempt or recovery instead.
  const clearPhysical = () => {
    releaseLocalControls();
    padBoost = false;
    blockedPad = true;
    lastPadDirection = null;
    localDirectionPending = false;
    syncPressed();
    // The host may cancel a controller-owned toggle, but must not recursively
    // call clear(). Inactive polling also reaches this path; preserve pad/menu
    // ownership rather than invoking the router's full clear/neutral gate.
    onClear();
  };
  const clear = () => {
    intentDirection = null;
    clearPhysical();
  };
  const lifecycleClear = () => (continuous() ? clearPhysical() : clear());
  const restoreDirection = (direction) => {
    if (direction !== null && !['up', 'right', 'down', 'left'].includes(direction))
      throw new TypeError(t('interface:savedDirectionMustBeACardinalDirectionOrNull'));
    if (destroyed || !continuous())
      throw new Error(t('interface:restoringDirectionRequiresActiveContinuousSteering'));
    clearPhysical();
    intentDirection = direction;
    syncPressed();
  };
  // Resuming may synchronously clear input. Record the fresh command only afterward.
  const startDirection = (direction, key, element = null, pointer = false) => {
    onActivity();
    if (!active()) return;
    if (continuous()) {
      intentDirection = direction;
      localDirectionPending = true;
      (pointer ? buttons : held).set(key, { direction, order: ++order, element });
    } else if (element && tapMode()) latched = latched === direction ? null : direction;
    else {
      latched = null;
      (pointer ? buttons : held).set(key, { direction, order: ++order, element });
    }
    syncPressed();
  };
  const startBoost = (key, pointer = false, toggle = tapMode()) => {
    onActivity();
    if (!active()) return;
    if (toggle) boostLatched = !boostLatched;
    else (pointer ? buttons : held).set(key, { boost: true, element: boostButton });
    syncPressed();
  };
  const down = (e) => {
    if (e.defaultPrevented || shortcut(e) || editing(e.target) || !active()) return;
    const command = actionForKey(resolveKeyBindings(getBindings()), e, { allowRepeat: true }),
      code = keyCodeForEvent(e);
    if (command === 'pause') {
      e.preventDefault();
      if (freshKey(e)) {
        lifecycleClear();
        onPause();
      }
      return;
    }
    if (['up', 'right', 'down', 'left'].includes(command)) {
      e.preventDefault();
      if (freshKey(e)) startDirection(command, code);
      return;
    }
    if (command === 'boost') {
      e.preventDefault();
      if (freshKey(e)) startBoost(code, false, false);
      syncPressed();
      return;
    }
    if (command === 'stop') {
      if (continuous()) return;
      e.preventDefault();
      if (!e.repeat) clear();
      return;
    }
    if (command === 'ability' || command === 'pickup') {
      e.preventDefault();
      if (freshKey(e)) {
        if (command === 'ability') action = true;
        else pickup = true;
      }
    }
  };
  const up = (e) => {
    if (activation(e)) finishBoostKeyGesture();
    const code = keyCodeForEvent(e);
    keysDown.delete(code);
    held.delete(code);
    syncPressed();
  };
  listen(window, 'keydown', down);
  listen(window, 'keyup', up);
  const loseForeground = () => {
    // Releases outside the document may be unobservable. A returning held key
    // still produces repeat events, which never count as a fresh command.
    keysDown.clear();
    pointersDown.clear();
    lifecycleClear();
  };
  listen(window, 'blur', loseForeground);
  // Embedded views can become hidden without a window blur. Capture the
  // document event too: releases while hidden may never reach this adapter.
  listen(
    window,
    'visibilitychange',
    () => {
      if (document.hidden) loseForeground();
    },
    true,
  );
  if (!readControllerCommand)
    listen(window, 'gamepaddisconnected', (event) => {
      if (selectedPad && selectedPad.index === event.gamepad?.index) padDisconnected = true;
    });
  for (const b of padButtons) {
    listen(b, 'pointerdown', (e) => {
      if (touchSteering) return;
      if (!active() || (e.button !== undefined && e.button !== 0)) return;
      if (continuous() && !freshGestures.has(e)) return;
      e.preventDefault();
      startDirection(b.dataset.move, e.pointerId, b, true);
      // Tap steering persists without a held pointer; capture still provides cancellation.
      try {
        b.setPointerCapture(e.pointerId);
        captures.set(e.pointerId, b);
      } catch {}
    });
    const release = (e) => {
      buttons.delete(e.pointerId);
      captures.delete(e.pointerId);
      syncPressed();
      try {
        if (b.hasPointerCapture?.(e.pointerId)) b.releasePointerCapture(e.pointerId);
      } catch {}
    };
    listen(b, 'pointerup', release);
    listen(b, 'pointercancel', () => {
      // Shared steering owns cancellation at the pad, including extra fingers.
      // A child button must not retire its still-active steering gesture.
      if (!touchSteering) lifecycleClear();
    });
    listen(b, 'lostpointercapture', release);
    listen(b, 'click', (e) => {
      if (e.detail === 0 && active()) startDirection(b.dataset.move, 'assistive', b);
    });
    listen(b, 'keydown', (e) => {
      if (!activation(e) || shortcut(e) || !active()) return;
      e.preventDefault();
      if (freshKey(e)) startDirection(b.dataset.move, keyCodeForEvent(e), b);
    });
    listen(b, 'keyup', (e) => {
      if (activation(e)) {
        e.preventDefault();
        up(e);
      }
    });
    listen(b, 'blur', () => {
      for (const [key, value] of held) if (value.element === b) held.delete(key);
      syncPressed();
    });
  }
  if (boostButton) {
    listen(boostButton, 'pointerdown', (e) => {
      if (!active() || (e.button !== undefined && e.button !== 0)) return;
      if (continuous() && !freshGestures.has(e)) return;
      e.preventDefault();
      startBoost(e.pointerId, true);
      try {
        boostButton.setPointerCapture(e.pointerId);
        captures.set(e.pointerId, boostButton);
      } catch {}
    });
    const releaseBoost = (e) => {
      buttons.delete(e.pointerId);
      captures.delete(e.pointerId);
      syncPressed();
      try {
        if (boostButton.hasPointerCapture?.(e.pointerId))
          boostButton.releasePointerCapture(e.pointerId);
      } catch {}
    };
    listen(boostButton, 'pointerup', releaseBoost);
    listen(boostButton, 'pointercancel', lifecycleClear);
    listen(boostButton, 'lostpointercapture', (e) => {
      // Explicit pointerup removes the capture first and preserves a tap latch.
      // Unexpected capture loss cancels it, so a cancelled gesture cannot stick.
      if (captures.get(e.pointerId) === boostButton) lifecycleClear();
      else releaseBoost(e);
    });
    listen(boostButton, 'keydown', (e) => {
      if (!activation(e) || shortcut(e) || !active()) return;
      e.preventDefault();
      if (freshKey(e)) startBoost(keyCodeForEvent(e));
      clearTimeout(boostClickTimer);
      boostClickTimer = null;
      boostClickGuard = true;
    });
    listen(boostButton, 'keyup', (e) => {
      if (activation(e)) {
        e.preventDefault();
        up(e);
      }
    });
    listen(boostButton, 'blur', () => {
      finishBoostKeyGesture();
      for (const [key, value] of held) if (value.element === boostButton) held.delete(key);
      syncPressed();
    });
    listen(boostButton, 'click', (e) => {
      e.preventDefault();
      // Pointer clicks have a positive detail; their down/up are handled above.
      // A click-only assistive activation has no release event, so it toggles
      // even in hold steering mode. The next activation or Stop clears it.
      if (e.detail !== 0 || boostClickGuard || shortcut(e) || !active()) return;
      startBoost(null, false, true);
    });
  }
  for (const [id, kind] of [
    ['action-button', 'action'],
    ['pickup-button', 'pickup'],
    ['stop-button', 'stop'],
  ]) {
    const b = document.querySelector(`#${id}`);
    const activate = () => {
      if (kind === 'stop' && continuous()) return;
      if (kind === 'stop') clear();
      else if (active()) {
        if (kind === 'action') action = true;
        else pickup = true;
      }
      arena.focus({ preventScroll: true });
    };
    listen(b, 'click', activate);
    // Prevent native Enter repeat / Space click from turning one press into many actions.
    listen(b, 'keydown', (e) => {
      if (!activation(e) || shortcut(e)) return;
      e.preventDefault();
      if (freshKey(e)) activate();
    });
    listen(b, 'keyup', (e) => {
      if (activation(e)) e.preventDefault();
    });
  }
  if (getTouchSettings) {
    touchSteering = attachTouchSteering({
      window,
      arena,
      pad: document.querySelector('.direction-controls'),
      surface: document.querySelector('#touch-surface'),
      indicator: document.querySelector('#touch-indicator'),
      getSettings: getTouchSettings,
      active: () => active() && touchEnabled(),
      onDirection: (direction, id) => startDirection(direction, id, null, true),
      onCancel: () => {
        lifecycleClear();
        onPause(true);
      },
      onRelease: (id) => {
        buttons.delete(id);
        syncPressed();
      },
    });
    listen(window, 'resize', () => touchSteering.cancel());
  }
  const poll = () => {
    if (destroyed) return neutral();
    let cmd;
    if (readControllerCommand) {
      let supplied;
      try {
        supplied = readControllerCommand();
      } catch {}
      cmd = {
        direction: ['up', 'right', 'down', 'left'].includes(supplied?.direction)
          ? supplied.direction
          : null,
        boost: supplied?.boost === true,
        action: supplied?.action === true,
        pickup: supplied?.pickup === true,
        pause: supplied?.pause === true,
        stop: supplied?.stop === true,
        hangar: supplied?.hangar === true,
      };
    } else {
      let pads = [];
      try {
        pads = [...(navigator.getGamepads?.() || [])]
          .map((pad, index) => ({
            pad,
            index: pad?.index ?? index,
            signature: JSON.stringify([
              pad?.id ?? '',
              pad?.mapping,
              pad?.buttons?.length,
              pad?.axes?.length,
            ]),
          }))
          .filter(({ pad }) => pad?.connected && pad.mapping === 'standard');
      } catch {}
      const found = selectedPad
        ? pads.find(
            (candidate) =>
              candidate.index === selectedPad.index &&
              candidate.signature === selectedPad.signature,
          )
        : pads[0];
      if (selectedPad && (!found || padDisconnected)) {
        selectedPad = null;
        padDisconnected = false;
        lifecycleClear();
        onPause(true);
        onGamepad(t('interface:controllerDisconnectedReleaseControlsBeforeContinuing'));
        return neutral();
      }
      if (found && !selectedPad) {
        selectedPad = { index: found.index, signature: found.signature };
        onGamepad(t('interface:standardControllerConnected'));
      }
      cmd = gamepadCommand(found?.pad);
    }
    if (!active()) {
      lifecycleClear();
      lastPause = false;
      return neutral();
    }
    if (blockedPad) {
      if (
        !cmd.direction &&
        !cmd.boost &&
        !cmd.action &&
        !cmd.pickup &&
        !cmd.pause &&
        !cmd.stop &&
        !cmd.hangar
      )
        blockedPad = false;
      cmd = gamepadCommand(null);
    }
    if (cmd.pause && !lastPause) {
      lastPause = true;
      lifecycleClear();
      onPause();
      return neutral();
    }
    if (cmd.stop && !continuous()) {
      clear();
      return neutral();
    }
    lastPause = cmd.pause;
    padBoost = cmd.boost;
    if (continuous()) {
      // Local events since the previous sample win an unobservable same-sample
      // tie. Consume the pad transition either way: an old hold never reclaims
      // the heading on a later poll. Physical release only rearms that source.
      if (cmd.direction && cmd.direction !== lastPadDirection && !localDirectionPending)
        intentDirection = cmd.direction;
      lastPadDirection = cmd.direction;
      localDirectionPending = false;
    }
    syncPressed();
    const newest = [...held.values(), ...buttons.values()]
      .filter((x) => x.direction)
      .sort((a, b) => b.order - a.order)[0];
    const result = {
      direction: continuous()
        ? intentDirection
        : newest?.direction || latched || cmd.direction || null,
      boost: localBoost() || cmd.boost,
      action: action || cmd.action,
      pickup: pickup || cmd.pickup,
    };
    action = false;
    pickup = false;
    return result;
  };
  syncPressed();
  return {
    poll,
    clear,
    releaseLocalControls,
    clearPhysical,
    snapshotDirection: () => (continuous() && !destroyed ? intentDirection : null),
    restoreDirection,
    localBoostActive: localBoost,
    destroy() {
      clear();
      destroyed = true;
      clearTimeout(boostClickTimer);
      touchSteering?.destroy();
      detachPlayfieldContextMenu();
      for (const remove of listeners) remove();
    },
  };
}
