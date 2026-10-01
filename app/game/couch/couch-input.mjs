import { t } from '../i18n/index.mjs';
import { attachTouchSteering } from '../ui/touch-steering.mjs';
import { attachPlayfieldContextMenu } from '../ui/playfield-context-menu.mjs';
import { gamepadCommand } from '../ui/input.mjs';
import { neutralCommand } from '../multiplayer.mjs';

const directions = ['up', 'down', 'left', 'right'];
const bindings = {
  KeyW: [0, 'up'],
  KeyA: [0, 'left'],
  KeyS: [0, 'down'],
  KeyD: [0, 'right'],
  KeyQ: [0, 'action'],
  KeyE: [0, 'pickup'],
  ShiftLeft: [0, 'boost'],
  ArrowUp: [1, 'up'],
  ArrowLeft: [1, 'left'],
  ArrowDown: [1, 'down'],
  ArrowRight: [1, 'right'],
  Enter: [1, 'action'],
  Slash: [1, 'pickup'],
  ShiftRight: [1, 'boost'],
};
const neutralPad = () => ({ ...neutralCommand(), pause: false });
const emptyPad = (command) =>
  !command.direction && !command.boost && !command.action && !command.pickup && !command.pause;

/** Two independent local controllers. Poll once per paint; consume once per fixed tick.
 * Keyboard/touch actions are bounded one-shot requests; controller buttons remain
 * held for the core's edge detector. No input callback changes either ruleset.
 */
export function attachCouchInput({
  window: win = globalThis.window,
  document: doc = globalThis.document,
  getGamepads = () => globalThis.navigator.getGamepads?.() || [],
  arena = doc.getElementById('race-canvas-0'),
  active = () => true,
  tapMode = () => false,
  getTouchSettings = null,
  continuousSteering = () => false,
  heldActions = [],
  steeringEdges = false,
  initialSlots = [null, null],
  controllerSession = null,
  onPause = () => {},
  onStop = () => {},
  onPads = () => {},
  onAcceptedInput = () => {},
} = {}) {
  if (typeof continuousSteering !== 'function')
    throw new TypeError('continuousSteering must be a function.');
  if (
    !Array.isArray(heldActions) ||
    heldActions.some((kind) => !['action', 'pickup'].includes(kind))
  )
    throw new TypeError(t('interface:heldActionsMustNameSupportedEquipmentActions'));
  const heldEquipment = new Set(heldActions);
  if (typeof steeringEdges !== 'boolean')
    throw new TypeError(t('interface:steeringEdgesMustBeBoolean'));
  if (typeof onAcceptedInput !== 'function')
    throw new TypeError('onAcceptedInput must be a function.');
  if (
    !Array.isArray(initialSlots) ||
    initialSlots.length !== 2 ||
    initialSlots.some(
      (slot) =>
        slot !== null &&
        (!Number.isInteger(slot) || slot < 0 || (slot > 255 && slot < 1024) || slot > 3071),
    ) ||
    new Set(initialSlots.filter((slot) => slot !== null)).size !==
      initialSlots.filter((slot) => slot !== null).length
  )
    throw new TypeError(t('interface:initialControllerSeatsNeedTwoUniqueBoundedIndexesOrNull'));
  let pendingInitialSlots = [...initialSlots];
  const accepted = (player, source) => {
    // Optional display notification: a broken observer cannot reject an input.
    try {
      onAcceptedInput(player, source);
    } catch {}
  };
  const held = new Map(),
    captures = new Map(),
    keyDown = new Set(),
    physicalKeys = new Set(),
    physicalPointers = new Set(),
    freshGestures = new WeakSet(),
    listeners = [],
    touchInputs = [];
  const players = Array.from({ length: 2 }, () => ({
    direction: null,
    boost: false,
    pending: { action: false, pickup: false },
    last: neutralCommand(),
    blocked: true,
    pad: neutralPad(),
    slot: null,
    lastPadDirection: null,
    localDirectionPending: false,
    pendingSteer: false,
  }));
  const buttons = [...doc.querySelectorAll('.race-pad')].flatMap((pad) =>
    [...pad.querySelectorAll('button')].map((element) => ({
      element,
      player: Number(pad.dataset.player),
      kind: element.dataset.direction || element.dataset.action,
      keyGuard: false,
      keyTimer: null,
      keys: new Set(),
    })),
  );
  let order = 0,
    destroyed = false;
  const detachPlayfieldContextMenu = attachPlayfieldContextMenu({
    // Versus owns two boards; Team supplies its one explicit coop-canvas.
    // Do not include artwork/discovery previews elsewhere in either document.
    roots: [arena, arena?.id === 'race-canvas-0' ? doc.getElementById('race-canvas-1') : null],
    active,
  });
  const continuous = () => continuousSteering() === true;
  const listen = (target, type, fn, options) => {
    target.addEventListener(type, fn, options);
    listeners.push(() => target.removeEventListener(type, fn, options));
  };
  const editing = (target) =>
    !!target?.closest?.('input,select,textarea,[contenteditable]:not([contenteditable="false"])');
  const activation = (e) => e.key === 'Enter' || e.key === ' ';
  const freshKey = (e) => (continuous() ? freshGestures.has(e) : !e.repeat);
  listen(
    win,
    'keydown',
    (e) => {
      if (!continuous()) return;
      if (!e.repeat && !physicalKeys.has(e.code)) freshGestures.add(e);
      physicalKeys.add(e.code);
    },
    true,
  );
  listen(win, 'keyup', (e) => physicalKeys.delete(e.code), true);
  listen(
    win,
    'pointerdown',
    (e) => {
      if (!continuous()) return;
      if (!physicalPointers.has(e.pointerId)) freshGestures.add(e);
      physicalPointers.add(e.pointerId);
    },
    true,
  );
  listen(win, 'pointerup', (e) => physicalPointers.delete(e.pointerId), true);
  listen(win, 'pointercancel', (e) => physicalPointers.delete(e.pointerId), true);
  const commandFor = (player) => {
    const state = players[player],
      values = [...held.values()].filter((v) => v.player === player);
    const direction = values
      .filter((v) => directions.includes(v.kind))
      .sort((a, b) => b.order - a.order)[0]?.kind;
    return {
      direction: continuous()
        ? state.direction
        : direction || state.direction || state.pad.direction,
      boost: state.boost || state.pad.boost || values.some((v) => v.kind === 'boost'),
      action:
        state.pending.action ||
        state.pad.action ||
        (heldEquipment.has('action') && values.some((v) => v.kind === 'action')),
      pickup:
        state.pending.pickup ||
        state.pad.pickup ||
        (heldEquipment.has('pickup') && values.some((v) => v.kind === 'pickup')),
      ...(steeringEdges ? { steer: state.pendingSteer } : {}),
    };
  };
  const sync = () => {
    const commands = players.map((_, i) => commandFor(i));
    for (const { element, player, kind } of buttons) {
      const command = commands[player],
        on = directions.includes(kind)
          ? command.direction === kind
          : kind === 'stop'
            ? false
            : !!command[kind];
      element.classList.toggle('pressed', on);
      if (element.hasAttribute('aria-pressed')) element.setAttribute('aria-pressed', String(on));
    }
  };
  const releaseCapture = (id) => {
    const capture = captures.get(id);
    captures.delete(id);
    held.delete(`pointer:${id}`);
    if (capture)
      try {
        if (capture.element.hasPointerCapture?.(id)) capture.element.releasePointerCapture(id);
      } catch {}
  };
  const endGuard = (button) => {
    clearTimeout(button.keyTimer);
    button.keyTimer = setTimeout(() => {
      button.keyGuard = false;
      button.keyTimer = null;
    }, 0);
  };
  function resetPlayer(player, preserveDirection = false) {
    const state = players[player];
    touchInputs[player]?.clear();
    for (const [key, value] of held) if (value.player === player) held.delete(key);
    for (const code of keyDown) if (bindings[code]?.[0] === player) keyDown.delete(code);
    if (!preserveDirection) state.direction = null;
    state.boost = false;
    state.pending = { action: false, pickup: false };
    state.last = neutralCommand();
    state.pad = neutralPad();
    state.blocked = true;
    state.lastPadDirection = null;
    state.localDirectionPending = false;
    state.pendingSteer = false;
    for (const [id, capture] of [...captures]) if (capture.player === player) releaseCapture(id);
    for (const button of buttons)
      if (button.player === player) {
        button.keys.clear();
        if (button.keyGuard) endGuard(button);
      }
  }
  function requirePlayer(player) {
    if (player !== 0 && player !== 1) throw new TypeError(t('interface:playerMustBe0Or1'));
  }
  function clearPlayer(player) {
    requirePlayer(player);
    resetPlayer(player);
    sync();
  }
  function clearPhysical(player) {
    if (player === undefined) players.forEach((_, i) => resetPlayer(i, true));
    else {
      requirePlayer(player);
      resetPlayer(player, true);
    }
    sync();
  }
  function restoreDirection(player, direction) {
    requirePlayer(player);
    if (direction !== null && !directions.includes(direction))
      throw new TypeError(t('interface:savedDirectionMustBeACardinalDirectionOrNull'));
    if (destroyed || !continuous())
      throw new Error(t('interface:restoringDirectionRequiresActiveContinuousSteering'));
    resetPlayer(player, true);
    players[player].direction = direction;
    sync();
  }
  function clear() {
    players.forEach((_, i) => resetPlayer(i));
    keyDown.clear();
    sync();
  }
  function stop(player) {
    if (destroyed || continuous() || ![0, 1].includes(player)) return;
    clearPlayer(player);
    onStop(player);
    sync();
  }
  function pause() {
    if (continuous()) clearPhysical();
    else clear();
    onPause();
  }
  const begin = (
    player,
    kind,
    key,
    { toggle = false, element = null, code = null, source = 'keyboard' } = {},
  ) => {
    if (destroyed || !active()) return;
    if (kind === 'stop') {
      stop(player);
      return;
    }
    const state = players[player];
    if (steeringEdges && directions.includes(kind)) state.pendingSteer = true;
    if (continuous() && directions.includes(kind)) {
      state.direction = kind;
      state.localDirectionPending = true;
      held.set(key, { player, kind, element, code, order: ++order });
    } else if (kind === 'action' || kind === 'pickup') {
      state.pending[kind] = true;
      if (heldEquipment.has(kind)) {
        const actionKey = key === 'assist' ? `assist:${player}:${kind}` : key;
        if (key === 'assist' && held.has(actionKey)) {
          held.delete(actionKey);
          state.pending[kind] = false;
        } else held.set(actionKey, { player, kind, element, code, order: ++order });
      }
    } else if (toggle) {
      if (kind === 'boost') state.boost = !state.boost;
      else state.direction = state.direction === kind ? null : kind;
    } else {
      if (directions.includes(kind)) state.direction = null;
      held.set(key, { player, kind, element, code, order: ++order });
    }
    sync();
    accepted(player, source);
  };
  listen(win, 'keydown', (e) => {
    if (e.defaultPrevented || e.ctrlKey || e.metaKey || e.altKey) return;
    if (e.key === 'Escape') {
      // Native dialogs own cancellable Escape; the flight hook must not suppress
      // their cancel event or replace the host's guarded Back/focus lifecycle.
      if (e.target?.closest?.('dialog[open]')) return;
      e.preventDefault();
      if (freshKey(e)) pause();
      return;
    }
    if (e.code === 'KeyP' && !editing(e.target) && active() && !destroyed) {
      e.preventDefault();
      if (freshKey(e)) pause();
      return;
    }
    if (editing(e.target) || !active() || destroyed) return;
    // Clicking Music must not strand the other keyboard player. Buttons/links
    // retain their native activation, while ordinary movement keys keep working.
    if (activation(e) && e.target?.closest?.('button,a')) return;
    const binding = bindings[e.code];
    if (!binding) return;
    e.preventDefault();
    if (!freshKey(e) || keyDown.has(e.code)) return;
    keyDown.add(e.code);
    begin(...binding, `key:${e.code}`, { code: e.code });
  });
  listen(win, 'keyup', (e) => {
    keyDown.delete(e.code);
    for (const [key, value] of held) if (value.code === e.code) held.delete(key);
    for (const button of buttons) if (button.keys.delete(e.code)) endGuard(button);
    sync();
  });
  listen(win, 'blur', () => {
    physicalKeys.clear();
    physicalPointers.clear();
    pause();
  });
  // Capture may be unavailable on an older browser; an outside release must
  // still release a held direction/boost instead of leaving it stuck.
  listen(win, 'pointerup', (e) => {
    if (captures.has(e.pointerId)) {
      releaseCapture(e.pointerId);
      sync();
    }
  });
  listen(win, 'pointercancel', (e) => {
    if (captures.has(e.pointerId)) pause();
  });
  listen(doc, 'visibilitychange', () => {
    if (doc.hidden) pause();
  });
  for (const button of buttons) {
    const { element, player, kind } = button;
    listen(element, 'pointerdown', (e) => {
      if (getTouchSettings && directions.includes(kind)) return;
      if (destroyed || !active() || (e.button !== undefined && e.button !== 0)) return;
      if (continuous() && !freshGestures.has(e)) return;
      e.preventDefault();
      begin(player, kind, `pointer:${e.pointerId}`, {
        toggle: tapMode(),
        element,
        source: e.pointerType === 'touch' ? 'touch' : 'pointer',
      });
      if (kind === 'stop') return;
      captures.set(e.pointerId, { element, player });
      try {
        element.setPointerCapture(e.pointerId);
      } catch {}
    });
    listen(element, 'pointerup', (e) => {
      releaseCapture(e.pointerId);
      sync();
    });
    listen(element, 'pointercancel', (e) => {
      // Shared steering owns its finger at the pad, not at a child button.
      // An ignored extra finger must not interrupt either couch seat.
      if (captures.get(e.pointerId)?.element === element) pause();
    });
    listen(element, 'lostpointercapture', (e) => {
      if (captures.has(e.pointerId)) pause();
    });
    listen(element, 'keydown', (e) => {
      if (!activation(e) || e.ctrlKey || e.metaKey || e.altKey) return;
      e.preventDefault();
      if (destroyed || !active() || !freshKey(e) || button.keys.has(e.code)) return;
      clearTimeout(button.keyTimer);
      button.keyTimer = null;
      button.keyGuard = true;
      button.keys.add(e.code);
      begin(player, kind, `button:${player}:${kind}:${e.code}`, {
        toggle: tapMode(),
        element,
        code: e.code,
      });
    });
    listen(element, 'keyup', (e) => {
      if (activation(e)) e.preventDefault();
    });
    listen(element, 'blur', () => {
      for (const [key, value] of held)
        if (value.element === element && value.code) held.delete(key);
      button.keys.clear();
      if (button.keyGuard) endGuard(button);
      sync();
    });
    listen(element, 'click', (e) => {
      if (e.detail !== 0 || button.keyGuard || destroyed || !active()) return;
      // An assistive click selects a persistent direction in continuous mode;
      // legacy tap steering and Boost retain their separate toggle behavior.
      begin(player, kind, 'assist', { toggle: true, element, source: 'pointer' });
    });
  }
  if (getTouchSettings) {
    for (const pad of doc.querySelectorAll('.race-pad')) {
      const player = Number(pad.dataset.player);
      touchInputs[player] = attachTouchSteering({
        window: win,
        pad: pad.querySelector('.race-cross'),
        surface: pad.querySelector('.touch-surface'),
        indicator: pad.querySelector('.touch-indicator'),
        getSettings: () => getTouchSettings(player),
        active: () => !destroyed && active() && !pad.hidden,
        onDirection: (direction, id) =>
          begin(player, direction, `touch:${player}:${id}`, { source: 'touch' }),
        onCancel: pause,
        onRelease: (id) => {
          held.delete(`touch:${player}:${id}`);
          sync();
        },
      });
    }
    listen(win, 'resize', () => touchInputs.forEach((touch) => touch.cancel()));
  }
  function poll() {
    if (destroyed) return players.map(neutralCommand);
    let pads = [];
    const controllerFrame = controllerSession?.frame();
    try {
      pads = [...(controllerFrame?.pads || getGamepads())]
        .filter((p) => p?.connected && p.mapping === 'standard')
        .sort((a, b) => a.index - b.index);
    } catch {}
    const indexes = new Set(pads.map((p) => p.index));
    if (controllerFrame) {
      players.forEach((player, i) => {
        if (player.slot !== controllerFrame.slots[i]) player.blocked = true;
        player.slot = controllerFrame.slots[i];
      });
      pendingInitialSlots = null;
    }
    if (pendingInitialSlots) {
      for (const [seat, slot] of pendingInitialSlots.entries())
        if (slot !== null && indexes.has(slot)) players[seat].slot = slot;
      pendingInitialSlots = null;
    }
    let disconnected = false;
    for (const player of players)
      if (player.slot !== null && !indexes.has(player.slot)) {
        player.slot = null;
        disconnected = true;
      }
    for (const pad of controllerFrame ? [] : pads)
      if (!players.some((p) => p.slot === pad.index)) {
        const available = players.find((p) => p.slot === null);
        if (!available) break;
        available.slot = pad.index;
        available.blocked = true;
      }
    onPads(
      players.filter((p) => p.slot !== null).length,
      players.map((p) => p.slot),
    );
    if (disconnected) {
      pause();
      return players.map(neutralCommand);
    }
    if (!active()) {
      if (continuous()) clearPhysical();
      else clear();
      return players.map(neutralCommand);
    }
    const priorPads = players.map((player) => player.pad);
    const freshButtons = [false, false];
    for (const [i, player] of players.entries()) {
      const next = gamepadCommand(pads.find((p) => p.index === player.slot));
      if (player.blocked) {
        if (emptyPad(next)) player.blocked = false;
        player.pad = neutralPad();
      } else {
        freshButtons[i] = ['action', 'pickup', 'boost', 'pause'].some(
          (key) => next[key] && !priorPads[i][key],
        );
        player.pad = next;
      }
    }
    if (players.some((player) => player.pad.pause)) {
      const pausing = players.map((player, i) => player.pad.pause && !priorPads[i].pause);
      pause();
      for (const [i, fresh] of pausing.entries()) if (fresh) accepted(i, 'controller');
      return players.map(neutralCommand);
    }
    const freshDirections = [false, false];
    if (continuous())
      for (const [i, player] of players.entries()) {
        if (
          player.pad.direction &&
          player.pad.direction !== player.lastPadDirection &&
          !player.localDirectionPending
        ) {
          player.direction = player.pad.direction;
          freshDirections[i] = true;
          if (steeringEdges) player.pendingSteer = true;
        }
        player.lastPadDirection = player.pad.direction;
        player.localDirectionPending = false;
      }
    else
      for (const [i, player] of players.entries())
        freshDirections[i] =
          !!player.pad.direction &&
          player.pad.direction !== priorPads[i].direction &&
          commandFor(i).direction === player.pad.direction;
    sync();
    const commands = players.map((_, i) => commandFor(i));
    for (let i = 0; i < 2; i++)
      if (freshDirections[i] || freshButtons[i]) accepted(i, 'controller');
    return commands;
  }
  function consume() {
    if (destroyed || !active()) return players.map(neutralCommand);
    const commands = players.map((player, i) => {
      const command = commandFor(i);
      for (const kind of ['action', 'pickup']) {
        // Two quick distinct clicks still get a release tick between their pulses.
        const continuouslyHeld =
          heldEquipment.has(kind) &&
          [...held.values()].some((entry) => entry.player === i && entry.kind === kind);
        if (player.pending[kind] && player.last[kind] && !player.pad[kind] && !continuouslyHeld)
          command[kind] = false;
        else player.pending[kind] = false;
      }
      player.last = { ...command };
      player.pendingSteer = false;
      return command;
    });
    sync();
    return commands;
  }
  function destroy() {
    if (destroyed) return;
    clear();
    destroyed = true;
    touchInputs.forEach((touch) => touch.destroy());
    detachPlayfieldContextMenu();
    for (const remove of listeners) remove();
    for (const button of buttons) {
      clearTimeout(button.keyTimer);
      button.keyTimer = null;
      button.keyGuard = false;
    }
  }
  return {
    poll,
    consume,
    clear,
    clearPlayer,
    clearPhysical,
    snapshotDirection: (player) => {
      requirePlayer(player);
      return continuous() && !destroyed ? players[player].direction : null;
    },
    restoreDirection,
    stop,
    destroy,
    focus: () => {
      if (!destroyed) arena?.focus({ preventScroll: true });
    },
  };
}
