import { mapProfile, descriptorKey, deviceDescriptor } from '../couch/controller-profiles.mjs';
import { t } from '../i18n/index.mjs';
import {
  resolveControllerBindings,
  CONTROLLER_DIRECTION_PRIORITY,
  DEFAULT_CONTROLLER_BINDINGS,
} from '../controller-bindings.mjs';
import { DEFAULT_CONTROLLER_BOOST_MODE, resolveControllerBoostMode } from '../controller-boost.mjs';

const JOIN_BUTTONS = [0, 1, 2, 3, 9];
const CONTEXTS = ['flight', 'menu'];
const usesDefaultLayout = (config) =>
  CONTEXTS.every(
    (context) =>
      JSON.stringify(config[context]) === JSON.stringify(DEFAULT_CONTROLLER_BINDINGS[context]),
  );
export const neutralControllerFlight = () => ({
  direction: null,
  boost: false,
  action: false,
  pickup: false,
  pause: false,
  hangar: false,
  stop: false,
});
export const neutralControllerUI = () => ({
  direction: null,
  confirm: false,
  back: false,
  menu: false,
});
const axis = (value) => (Number.isFinite(value) ? Math.max(-1, Math.min(1, value)) : 0);
const pressed = (button) =>
  button?.pressed === true ||
  (Number.isFinite(button?.value) && button.value >= 0.5 && button.value <= 1);
const defaultRead = () => {
  if (typeof globalThis.navigator?.getGamepads !== 'function')
    throw new Error(t('interface:gamepadApiUnavailable'));
  return globalThis.navigator.getGamepads();
};

// Build once at adoption. Sampling only reads these owned maps and scalars.
function compileBindings(config) {
  return {
    usedButtons: [
      ...new Set([
        ...JOIN_BUTTONS,
        ...Object.values(config.flight.buttons),
        ...Object.values(config.menu.buttons),
      ]),
    ].sort((a, b) => a - b),
    press: config.deadZone.press,
    release: config.deadZone.release,
    ...Object.fromEntries(
      CONTEXTS.map((context) => [
        context,
        {
          buttons: config[context].buttons,
          stick: config[context].stick,
          directions: CONTROLLER_DIRECTION_PRIORITY.map((direction) => [
            direction,
            config[context].buttons[direction],
          ]),
        },
      ]),
    ),
  };
}

/** One hardware read per sample. Does not run a timer, move DOM focus, or invoke
 * game actions. The host chooses a stable UI scope; only "flight" emits flight.
 * clear() retains the pad but requires neutral. invalidate() requires rejoining.
 */
export function createControllerRouter({
  readPads = defaultRead,
  rawProfile = () => null,
  now = () => globalThis.performance?.now?.() ?? Date.now(),
  eventTarget = globalThis.window,
  bindings = null,
  boostMode = DEFAULT_CONTROLLER_BOOST_MODE,
  deadZone = 0.35,
  repeatDelayMs = 350,
  repeatIntervalMs = 120,
  autoJoin = false,
  navigationAliases = false,
  diagnostics = false,
} = {}) {
  if (typeof readPads !== 'function' || typeof now !== 'function')
    throw new TypeError(t('interface:controllerReadersMustBeFunctions'));
  if (
    !Number.isFinite(deadZone) ||
    deadZone < 0.1 ||
    deadZone > 0.6 ||
    !Number.isFinite(repeatDelayMs) ||
    repeatDelayMs < 100 ||
    repeatDelayMs > 2000 ||
    !Number.isFinite(repeatIntervalMs) ||
    repeatIntervalMs < 50 ||
    repeatIntervalMs > 1000
  )
    throw new RangeError(t('interface:controllerThresholdsOrRepeatTimingAreOutOfBounds'));
  const initial = resolveControllerBindings(bindings);
  // Constructor compatibility: an explicit document owns its thresholds.
  // Legacy callers without one retain their equal press/release deadZone.
  if (bindings == null) initial.deadZone = { press: deadZone, release: deadZone };
  let compiled = compileBindings(initial),
    defaultLayout = usesDefaultLayout(initial),
    mode = resolveControllerBoostMode(boostMode),
    boostLatched = false,
    boostArmed = false;
  const seen = new Map();
  let generation = 0,
    assigned = null,
    blocked = true,
    lastScope = null,
    previousButtons = new Set(),
    repeatDirection = null,
    repeatAt = 0,
    lastTime = 0,
    pendingDisconnect = false,
    menuConfirmActive = false,
    menuConfirmButtons = [],
    menuGamepadTimestamp = 0,
    sampledConfirmPad = null,
    sampledRawGamepads = undefined,
    destroyed = false;

  const confirmIndexes = (buttons) =>
    [
      ...new Set([
        compiled.menu.buttons.confirm,
        ...(navigationAliases && defaultLayout ? [2] : []),
      ]),
    ]
      .filter((index) => buttons.has(index))
      .sort((a, b) => a - b);
  const confirms = (buttons) => confirmIndexes(buttons).length > 0;
  const assignedIdentity = () =>
    assigned
      ? {
          index: assigned.index,
          id: assigned.id,
          mapping: assigned.mapping,
          generation: assigned.generation,
        }
      : null;
  const diagnosticsEnabled = () =>
    (typeof diagnostics === 'function' ? diagnostics() : diagnostics) === true;
  function describePads(pads) {
    const devices = [],
      count = Number.isInteger(pads?.length) ? Math.max(0, Math.min(32, pads.length)) : 0;
    for (let index = 0; index < count; index++) {
      const device = pads[index];
      if (!device) continue;
      const buttonCount = Number.isInteger(device.buttons?.length)
        ? Math.max(0, Math.min(1024, device.buttons.length))
        : 0;
      devices.push({
        index: Number.isInteger(device.index) && device.index >= 0 ? device.index : index,
        id: typeof device.id === 'string' ? device.id.slice(0, 512) : '',
        mapping: typeof device.mapping === 'string' ? device.mapping.slice(0, 32) : '',
        connected: device.connected === true,
        timestamp: Number.isFinite(device.timestamp) ? device.timestamp : 0,
        buttonCount,
        buttons: Array.from({ length: Math.min(64, buttonCount) }, (_, index) => index).filter(
          (index) => pressed(device.buttons[index]),
        ),
      });
    }
    return devices;
  }
  function confirmSnapshot(pad, scope, failure = null, rawGamepads) {
    const live = !!assigned && pad?.signature === assigned.signature,
      buttons = live ? confirmIndexes(pad.buttons) : [];
    const reason = destroyed
      ? 'disposed'
      : failure ||
        (!assigned
          ? 'unassigned'
          : !live
            ? 'assignment-lost'
            : scope !== lastScope
              ? 'scope-change'
              : scope === 'flight'
                ? 'flight'
                : blocked
                  ? 'waiting-neutral'
                  : 'ready');
    return {
      assigned: live ? assignedIdentity() : null,
      buttons,
      timestamp: live ? pad.timestamp : 0,
      held: buttons.length > 0,
      neutral: live ? pad.neutral : false,
      eligible: reason === 'ready',
      blocked,
      reason,
      scope,
      routerScope: lastScope,
      ...(rawGamepads ? { rawGamepads } : {}),
    };
  }
  function readMenuConfirm({ scope = lastScope } = {}) {
    // Native events may precede an animation frame. Observe only the current
    // assignment: adopting a pad or sampling the router here would consume
    // unrelated direction, Back, Menu, and flight edges before their host.
    const diagnostics = diagnosticsEnabled();
    if (destroyed || (!assigned && !diagnostics)) return confirmSnapshot(null, scope);
    try {
      const pads = readPads(),
        rawGamepads = diagnostics ? describePads(pads) : undefined,
        count = Number.isInteger(pads?.length) ? Math.max(0, Math.min(32, pads.length)) : 0;
      if (!assigned) return confirmSnapshot(null, scope, null, rawGamepads);
      for (let index = 0; index < count; index++) {
        if ((pads[index]?.index ?? index) !== assigned.index) continue;
        return confirmSnapshot(snapshot(pads[index], index), scope, null, rawGamepads);
      }
      return confirmSnapshot(null, scope, null, rawGamepads);
    } catch {
      return confirmSnapshot(null, scope, 'unavailable', diagnostics ? [] : undefined);
    }
  }
  function menuConfirmPressed(capturedPads = null) {
    if (destroyed || !assigned || (lastScope === 'flight' && !menuConfirmActive)) return false;
    // Native events may arrive before the next animation frame. This read-only
    // probe must not adopt a pad, consume an edge, or clear the release gate.
    try {
      const pads = capturedPads ?? readPads();
      const count = Math.min(32, pads?.length || 0);
      for (let index = 0; index < count; index++) {
        if ((pads[index]?.index ?? index) !== assigned.index) continue;
        const pad = snapshot(pads[index], index);
        return pad?.signature === assigned.signature && confirms(pad.buttons);
      }
    } catch {
      // Native controls remain usable when gamepad access is unavailable.
    }
    return false;
  }

  function clear() {
    boostLatched = false;
    boostArmed = false;
    blocked = true;
    previousButtons.clear();
    repeatDirection = null;
    repeatAt = 0;
    for (const candidate of seen.values()) {
      candidate.armed = false;
      candidate.previousJoin.clear();
      candidate.stickActive = { flight: false, menu: false };
      candidate.rawState = new Map();
    }
  }
  function setBindings(value) {
    if (destroyed) throw new Error(t('interface:controllerInputIsStopped'));
    const config = resolveControllerBindings(value);
    const next = compileBindings(config);
    // Validation and compilation must finish before any live state is cleared.
    compiled = next;
    defaultLayout = usesDefaultLayout(config);
    clear();
  }
  function setBoostMode(value) {
    if (destroyed) throw new Error(t('interface:controllerInputIsStopped'));
    const next = resolveControllerBoostMode(value);
    mode = next;
    clear();
  }
  // Input-local cancellation and recovery must not disrupt held directions,
  // menu repeat/join history, or another input source. Only Toggle is disarmed.
  function cancelToggleBoost() {
    if (mode !== 'toggle') return;
    boostLatched = false;
    boostArmed = false;
  }
  const boostState = () => ({ mode, latched: boostLatched });
  function invalidate() {
    menuConfirmActive = false;
    menuConfirmButtons = [];
    menuGamepadTimestamp = 0;
    pendingDisconnect = pendingDisconnect || assigned !== null;
    assigned = null;
    clear();
    seen.clear();
  }
  function disconnect(index) {
    if (!Number.isInteger(index) || index < 0) return;
    seen.delete(index);
    if (assigned?.index === index) {
      menuConfirmActive = false;
      menuConfirmButtons = [];
      menuGamepadTimestamp = 0;
      pendingDisconnect = true;
      assigned = null;
      clear();
    }
  }
  const disconnectedEvent = (event) => disconnect(event.gamepad?.index);
  eventTarget?.addEventListener?.('gamepaddisconnected', disconnectedEvent);

  function snapshot(pad, fallbackIndex) {
    if (!pad?.connected) return null;
    if (pad.mapping !== 'standard') {
      if (pad.mapping !== '') return null;
      const profile = rawProfile(pad.index);
      if (
        !profile ||
        Object.entries(deviceDescriptor(pad)).some(([key, value]) => profile.device[key] !== value)
      )
        return null;
      const signature = JSON.stringify([descriptorKey(pad), profile]);
      const old = seen.get(pad.index);
      const mapped = mapProfile(
        profile,
        pad,
        old?.signature === signature ? old.rawState : undefined,
      );
      if (!mapped.valid) return null;
      const context = lastScope === 'flight' ? 'flight' : 'menu';
      const buttons = new Set();
      for (const [action, value] of Object.entries(mapped[context])) {
        const key = action === 'action' ? 'ability' : action;
        if (
          value &&
          !['direction', 'up', 'down', 'left', 'right'].includes(key) &&
          compiled[context].buttons[key] !== undefined
        )
          buttons.add(compiled[context].buttons[key]);
      }
      return {
        index: pad.index,
        id: pad.id,
        mapping: '',
        signature,
        buttons,
        direction: { flight: mapped.flight.direction, menu: mapped.menu.direction },
        stickActive: {},
        rawState: mapped.state,
        neutral: mapped.neutral,
        timestamp: Number.isFinite(pad.timestamp) ? pad.timestamp : 0,
      };
    }
    const index = pad.index ?? fallbackIndex;
    // Shared-radio seats use internal virtual indexes beyond physical Gamepad slots.
    const sharedSeat = index <= 3071 && typeof pad.id === 'string' && pad.id.startsWith('couch:');
    if (!Number.isInteger(index) || index < 0 || (index > 1023 && !sharedSeat)) return null;
    const usedButtons =
      navigationAliases && defaultLayout ? [...Array(16).keys()] : compiled.usedButtons;
    const buttons = new Set(usedButtons.filter((i) => pressed(pad.buttons?.[i])));
    const id = typeof pad.id === 'string' ? pad.id.slice(0, 512) : '';
    const signature = JSON.stringify([
      id,
      pad.mapping,
      pad.buttons?.length ?? 0,
      pad.axes?.length ?? 0,
    ]);
    const old = seen.get(index),
      previous = old?.signature === signature ? old.stickActive : null;
    const axes = [0, 1, 2, 3].map((index) => axis(pad.axes?.[index]));
    const direction = {},
      stickActive = {};
    let neutral = buttons.size === 0;
    for (const context of CONTEXTS) {
      const mapping = compiled[context],
        { stick } = mapping;
      // The second stick is useful in a single-direction game without a camera.
      // Explicit remaps keep exactly the axes the player selected.
      const secondStick =
        navigationAliases &&
        defaultLayout &&
        Math.max(Math.abs(axes[0]), Math.abs(axes[1])) <= compiled.release;
      const x = axes[secondStick ? 2 : stick.xAxis] * (stick.invertX ? -1 : 1),
        y = axes[secondStick ? 3 : stick.yAxis] * (stick.invertY ? -1 : 1),
        magnitude = Math.max(Math.abs(x), Math.abs(y));
      const active =
        stick.enabled && magnitude > (previous?.[context] ? compiled.release : compiled.press);
      stickActive[context] = active;
      // A gate requires physical release even after hysteresis state is reset;
      // a stick between release and press must not count as a neutral sample.
      if (stick.enabled && magnitude > compiled.release) neutral = false;
      const analog = !active
        ? null
        : Math.abs(x) > Math.abs(y)
          ? x > 0
            ? 'right'
            : 'left'
          : y > 0
            ? 'down'
            : 'up';
      direction[context] =
        mapping.directions.find(([, index]) => buttons.has(index))?.[0] || analog;
    }
    return {
      index,
      id,
      mapping: 'standard',
      signature,
      buttons,
      direction,
      stickActive,
      neutral,
      timestamp: Number.isFinite(pad.timestamp) ? pad.timestamp : 0,
    };
  }
  const result = (
    code,
    message,
    flight = neutralControllerFlight(),
    ui = neutralControllerUI(),
    disconnected = false,
  ) => ({
    flight,
    ui,
    status: { code, message },
    assigned: assignedIdentity(),
    confirmHeld: menuConfirmActive,
    confirmButtons: [...menuConfirmButtons],
    gamepadTimestamp: menuGamepadTimestamp,
    confirmSnapshot: confirmSnapshot(
      sampledConfirmPad,
      lastScope,
      code === 'unavailable' ? 'unavailable' : null,
      sampledRawGamepads,
    ),
    disconnected,
  });

  function sample({ scope, timeMs, toggleBoostEligible = true, spectator = false } = {}) {
    sampledConfirmPad = null;
    sampledRawGamepads = undefined;
    if (destroyed) return result('disposed', t('interface:controllerInputIsStopped'));
    if (typeof scope !== 'string' || !scope || scope.length > 160)
      throw new TypeError(t('interface:controllerScopeMustBeAStableNonemptyString'));
    if (typeof toggleBoostEligible !== 'boolean')
      throw new TypeError(t('interface:controllerBoostEligibilityMustBeBoolean'));
    if (typeof spectator !== 'boolean') throw new TypeError('Spectator input must be boolean.');
    const clock = timeMs ?? now();
    const time = Number.isFinite(clock) ? Math.max(lastTime, clock) : lastTime;
    lastTime = time;
    if (scope !== lastScope) {
      clear();
      lastScope = scope;
    }
    if (scope !== 'flight' || spectator || !toggleBoostEligible) cancelToggleBoost();
    let raw;
    try {
      raw = readPads();
      if (diagnosticsEnabled()) sampledRawGamepads = describePads(raw);
    } catch {
      invalidate();
      const disconnected = pendingDisconnect;
      pendingDisconnect = false;
      return result(
        'unavailable',
        t('interface:controllerAccessIsUnavailableKeyboardAndTouchRemainAvailable'),
        undefined,
        undefined,
        disconnected,
      );
    }
    const pads = new Map();
    let connected = false;
    // Browser slots are array-like, sometimes sparse. Bound even injected input.
    const count = Number.isInteger(raw?.length) ? Math.max(0, Math.min(32, raw.length)) : 0;
    for (let i = 0; i < count; i++) {
      connected = connected || raw[i]?.connected === true;
      const pad = snapshot(raw[i], i);
      if (pad && !pads.has(pad.index)) pads.set(pad.index, pad);
    }
    for (const [index, old] of seen) {
      if (pads.get(index)?.signature === old.signature) continue;
      seen.delete(index);
      if (assigned?.index === index) {
        menuConfirmActive = false;
        assigned = null;
        pendingDisconnect = true;
        clear();
      }
    }
    for (const pad of pads.values()) {
      let candidate = seen.get(pad.index);
      if (!candidate) {
        candidate = { ...pad, generation: ++generation, armed: false, previousJoin: new Set() };
        seen.set(pad.index, candidate);
      }
      candidate.stickActive = pad.stickActive;
      candidate.rawState = pad.rawState;
      if (pad.neutral) candidate.armed = true;
    }
    if (pendingDisconnect) {
      pendingDisconnect = false;
      clear();
      return result(
        'disconnected',
        t('interface:controllerDisconnectedReleaseControlsThenPressAFaceButtonTo'),
        undefined,
        undefined,
        true,
      );
    }
    if (!assigned) {
      for (const pad of [...pads.values()].sort((a, b) => a.index - b.index)) {
        const candidate = seen.get(pad.index);
        const join = autoJoin
          ? pad.neutral
          : candidate.armed &&
            JOIN_BUTTONS.some((i) => pad.buttons.has(i) && !candidate.previousJoin.has(i));
        candidate.previousJoin = new Set(pad.buttons);
        if (join) {
          // Joining consumes the edge, but Steam Input can still emit its native
          // Enter/mouse echo after release. Expose held Confirm to the host guard
          // without turning this same press into a menu activation.
          menuConfirmActive = confirms(pad.buttons);
          menuConfirmButtons = confirmIndexes(pad.buttons);
          menuGamepadTimestamp = pad.timestamp;
          assigned = candidate;
          sampledConfirmPad = pad;
          clear();
          if (autoJoin) blocked = false;
          return result(
            'joined',
            autoJoin
              ? t('interface:controllerReady')
              : t('interface:controllerJoinedReleaseControlsToContinue'),
          );
        }
      }
      if (!pads.size)
        return connected
          ? result(
              'unsupported',
              t('interface:thisControllerHasNoStandardMappingKeyboardAndTouchRemain'),
            )
          : result('waiting-controller', t('interface:connectAControllerAndUseItWhileThisPageIs'));
      return [...seen.values()].some((candidate) => candidate.armed)
        ? result('ready-to-join', t('interface:pressAFaceButtonOrMenuToJoin'))
        : result('waiting-neutral', t('interface:releaseTheControllerButtonsAndMovementStick'));
    }
    const pad = pads.get(assigned.index);
    // An assigned pad always has a corresponding seen entry until loss handling.
    if (!pad) {
      invalidate();
      return sampleLoss();
    }
    sampledConfirmPad = pad;
    menuConfirmActive = confirms(pad.buttons) && (scope !== 'flight' || menuConfirmActive);
    menuConfirmButtons = menuConfirmActive ? confirmIndexes(pad.buttons) : [];
    menuGamepadTimestamp = pad.timestamp;
    // The same physical-neutral sample may lift both gates. A latched command
    // is not physical input and must not prevent a later ordinary release.
    if (mode === 'toggle' && scope === 'flight' && !spectator && toggleBoostEligible && pad.neutral)
      boostArmed = true;
    if (blocked) {
      if (pad.neutral) blocked = false;
      previousButtons = new Set(pad.buttons);
      return result(
        blocked ? 'waiting-neutral' : 'connected',
        blocked
          ? t('interface:releaseTheControllerButtonsAndMovementStick')
          : t('interface:controllerReady'),
      );
    }
    const edge = (i) => pad.buttons.has(i) && !previousButtons.has(i);
    const flight = neutralControllerFlight(),
      ui = neutralControllerUI();
    if (scope === 'flight') {
      const buttons = compiled.flight.buttons;
      // A spectator can use the actual configured flight controls to join in,
      // while the explicitly configured Back/Menu retain their visible meaning.
      // This opt-in does not reinterpret ordinary/practice flight bindings.
      if (spectator && edge(compiled.menu.buttons.back)) ui.back = true;
      else if (spectator && edge(compiled.menu.buttons.menu)) ui.menu = true;
      else if (edge(buttons.pause) || (navigationAliases && defaultLayout && edge(8)))
        flight.pause = true;
      else if (edge(buttons.hangar)) flight.hangar = true;
      else if (edge(buttons.stop)) flight.stop = true;
      else {
        if (!spectator && mode === 'toggle' && boostArmed && edge(buttons.boost))
          boostLatched = !boostLatched;
        Object.assign(flight, {
          direction: pad.direction.flight,
          // Joining practice is a physical edge, even when normal Toggle Boost
          // is ineligible. Watching must never arm or retain a flight latch.
          boost: spectator
            ? edge(buttons.boost)
            : mode === 'toggle'
              ? boostLatched
              : pad.buttons.has(buttons.boost),
          action: pad.buttons.has(buttons.ability),
          pickup: pad.buttons.has(buttons.pickup),
        });
      }
      if (flight.pause || flight.hangar || flight.stop || ui.back || ui.menu) clear();
    } else {
      const buttons = compiled.menu.buttons,
        aliases = navigationAliases && defaultLayout,
        direction =
          pad.direction.menu ||
          (aliases
            ? pad.buttons.has(4) || pad.buttons.has(6)
              ? 'up'
              : pad.buttons.has(5) || pad.buttons.has(7)
                ? 'down'
                : null
            : null);
      if (edge(buttons.menu)) ui.menu = true;
      else if (edge(buttons.back) || (aliases && (edge(3) || edge(8)))) ui.back = true;
      else if (
        confirms(pad.buttons) &&
        !confirms(previousButtons) &&
        (pad.buttons.has(buttons.confirm) || (aliases && pad.buttons.has(2)))
      )
        ui.confirm = true;
      if (!ui.menu && !ui.back && !ui.confirm && direction) {
        if (direction !== repeatDirection || time >= repeatAt) {
          ui.direction = direction;
          repeatAt = time + (direction !== repeatDirection ? repeatDelayMs : repeatIntervalMs);
        }
      }
      if (!direction || direction !== repeatDirection || ui.menu || ui.back || ui.confirm) {
        if (ui.menu || ui.back || ui.confirm) repeatAt = time + repeatDelayMs;
        else if (!direction) repeatAt = 0;
      }
      repeatDirection = direction;
    }
    previousButtons = new Set(pad.buttons);
    return result('connected', t('interface:controllerReady'), flight, ui);
  }
  function sampleLoss() {
    pendingDisconnect = false;
    return result(
      'disconnected',
      autoJoin
        ? t('interface:controllerDisconnectedReconnectAndReleaseControlsToContinue')
        : t('interface:controllerDisconnectedReleaseControlsThenPressAFaceButtonTo'),
      undefined,
      undefined,
      true,
    );
  }
  return {
    sample,
    readMenuConfirm,
    menuConfirmPressed,
    setBindings,
    setBoostMode,
    cancelToggleBoost,
    boostState,
    clear,
    invalidate,
    disconnect,
    destroy() {
      invalidate();
      destroyed = true;
      eventTarget?.removeEventListener?.('gamepaddisconnected', disconnectedEvent);
    },
  };
}
