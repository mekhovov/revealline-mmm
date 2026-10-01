import { createRadioRestoreStore, radioIdentity } from './controller-restore.mjs';
import {
  descriptorKey,
  deviceDescriptor,
  buttonValue,
  standardProfile,
  validateProfile,
  mapProfile,
} from './controller-profiles.mjs';
// Native Gamepad fields are prototype getters, not enumerable own properties.
const withIndex = (pad, index) => ({
  index,
  id: pad.id,
  mapping: pad.mapping,
  connected: pad.connected,
  axes: pad.axes,
  buttons: pad.buttons,
  timestamp: pad.timestamp,
});
const blank = () => Array.from({ length: 16 }, () => ({ pressed: false, value: 0 }));
const positions = {
  up: 12,
  right: 15,
  down: 13,
  left: 14,
  action: 0,
  pickup: 2,
  boost: 5,
  pause: 9,
  confirm: 0,
  back: 1,
  menu: 9,
};
/** Physical connection ownership is separate from mappings and the single menu owner.
 * The host supplies one browser snapshot; no timers or additional hardware reads. */
export function createControllerSession({
  eventTarget = globalThis.window,
  onLoss = () => {},
  restoreKey = null,
  restoreInFlight = false,
  storage,
} = {}) {
  if (storage === undefined && restoreKey) {
    try {
      storage = eventTarget?.localStorage ?? globalThis.localStorage;
    } catch {
      storage = null;
    }
  }
  const saved = restoreKey ? createRadioRestoreStore(storage, restoreKey) : null;
  let restoring = false;
  const splits = new Map();
  const devices = new Map(),
    seats = [null, null],
    lostEvents = new Set();
  let generation = 0,
    menuSeat = null,
    scope = null,
    available = 'available',
    disposed = false,
    editable = true,
    capturing = false;
  let frame = { pads: [], menuPads: [], slots: [null, null] };
  function releaseState(d) {
    d.blocked = true;
    d.previous = new Map();
  }
  function clear() {
    for (const d of devices.values()) releaseState(d);
  }
  function lose(index) {
    const split = splits.get(index);
    if (split) {
      splits.delete(index);
      for (const child of split.indexes) lose(child);
    }
    const seat = seats.indexOf(index);
    devices.delete(index);
    if (seat !== -1) {
      seats[seat] = null;
      if (menuSeat === seat) menuSeat = null;
      clear();
      onLoss(seat);
    }
  }
  const disconnect = (e) => {
    const index = e.gamepad?.index;
    lostEvents.add(index);
    lose(index);
  };
  eventTarget?.addEventListener?.('gamepaddisconnected', disconnect);
  function remember() {
    if (!saved || restoring) return;
    const entries = [];
    for (const d of devices.values()) {
      if (d.index >= 1024) continue;
      const split = splits.get(d.index);
      const profiles = split
        ? split.indexes.map((i) => devices.get(i)?.profile)
        : d.profile && !d.standard
          ? [d.profile]
          : [];
      if (!profiles.length || profiles.some((p) => !p)) continue;
      entries.push({
        profiles,
        seats: (split?.indexes ?? [d.index]).map((index) => {
          const seat = seats.indexOf(index);
          return seat < 0 ? null : seat;
        }),
      });
    }
    const configured = new Set(entries.map((entry) => radioIdentity(entry.profiles[0].device)));
    const occupied = new Set(entries.flatMap((e) => e.seats).filter((seat) => seat !== null));
    for (const prior of saved.entries()) {
      if (configured.has(radioIdentity(prior.profiles[0].device))) continue;
      entries.push({
        profiles: prior.profiles,
        seats: prior.seats.map((seat) => (occupied.has(seat) ? null : seat)),
      });
    }
    saved.save(entries);
  }
  function restore() {
    if (!saved || capturing || (!editable && !restoreInFlight)) return;
    const entries = saved.entries();
    const physical = [...devices.values()].filter((d) => d.index < 1024);
    const wasEditable = editable;
    restoring = true;
    editable = true;
    try {
      for (const entry of entries) {
        const key = radioIdentity(entry.profiles[0].device);
        const matches = physical.filter((d) => radioIdentity(deviceDescriptor(d.pad)) === key);
        if (
          matches.length !== 1 ||
          entries.filter((e) => radioIdentity(e.profiles[0].device) === key).length !== 1
        )
          continue;
        const d = matches[0];
        if (d.restoreDone) continue;
        if (entry.profiles.length === 2) {
          if (seats.some((seat) => seat !== null)) continue;
          if (!api.split(d.index, entry.profiles)) continue;
          const indexes = splits.get(d.index).indexes;
          seats.fill(null);
          entry.seats.forEach((seat, i) => {
            if (seat !== null) seats[seat] = indexes[i];
          });
          menuSeat = seats.findIndex((seat) => seat !== null);
          if (menuSeat < 0) menuSeat = null;
        } else {
          api.apply(d.index, entry.profiles[0]);
          const seat = entry.seats[0];
          if (seat !== null && seats[seat] === null) select(d.index, seat);
        }
        d.restoreDone = true;
      }
    } finally {
      restoring = false;
      editable = wasEditable;
    }
  }
  function select(index, seat) {
    if (!editable || !Number.isInteger(seat) || seat < 0 || seat > 1) return false;
    const d = devices.get(index);
    if (!d?.profile || seats.includes(index) || splits.has(index)) return false;
    if (seats[seat] !== null) releaseState(devices.get(seats[seat]));
    seats[seat] = index;
    releaseState(d);
    if (menuSeat === null) menuSeat = seat;
    remember();
    return true;
  }
  function virtual(d, command, blocked = false) {
    const buttons = blank();
    if (!blocked) {
      for (const [action, value] of Object.entries(command))
        if (
          action !== 'direction' &&
          !['up', 'right', 'down', 'left'].includes(action) &&
          positions[action] !== undefined &&
          value
        )
          buttons[positions[action]] = { pressed: true, value: 1 };
      if (command.direction) buttons[positions[command.direction]] = { pressed: true, value: 1 };
    }
    return {
      index: d.index,
      id: `couch:${d.generation}:${d.revision}`,
      mapping: 'standard',
      connected: true,
      axes: [0, 0, 0, 0],
      buttons,
      timestamp: d.pad.timestamp || 0,
    };
  }
  function sample(raw, { active = false, error = null } = {}) {
    if (disposed) return frame;
    editable = !active;
    if (scope !== active) {
      clear();
      scope = active;
    }
    available = error ? 'unavailable' : 'available';
    const incoming = new Map();
    if (!error)
      for (const pad of Array.from(raw || []).slice(0, 32)) {
        if (
          !pad?.connected ||
          !Number.isInteger(pad.index) ||
          pad.index < 0 ||
          pad.index > 1023 ||
          lostEvents.has(pad.index)
        )
          continue;
        const descriptor = deviceDescriptor(pad);
        if (
          descriptor.axes > 64 ||
          descriptor.buttons > 256 ||
          !['', 'standard'].includes(descriptor.mapping)
        )
          continue;
        incoming.set(pad.index, pad);
      }
    for (const [source, split] of [...splits]) {
      const pad = incoming.get(source);
      if (!pad || descriptorKey(pad) !== split.key) {
        splits.delete(source);
        for (const index of split.indexes) lose(index);
      } else {
        for (const index of split.indexes) incoming.set(index, withIndex(pad, index));
      }
    }
    for (const [index, d] of devices)
      if (!incoming.has(index) || descriptorKey(incoming.get(index)) !== d.key) lose(index);
    lostEvents.clear();
    for (const [index, pad] of incoming) {
      if (!devices.has(index))
        devices.set(index, {
          index,
          generation: ++generation,
          revision: 0,
          key: descriptorKey(pad),
          profile: pad.mapping === 'standard' ? standardProfile(pad) : null,
          standard: pad.mapping === 'standard',
          blocked: true,
          previous: new Map(),
          joinWas: false,
        });
      devices.get(index).pad = pad;
    }
    restore();
    let confirmHeld = false;
    const pads = [],
      menuPads = [],
      paused = [];
    for (const d of [...devices.values()].sort((a, b) => a.index - b.index)) {
      if (!d.profile || splits.has(d.index)) continue;
      const mapped = mapProfile(d.profile, d.pad, d.previous);
      d.previous = mapped.state;
      if (!mapped.valid) {
        if (seats.includes(d.index)) {
          lose(d.index);
        }
        continue;
      }
      const join = d.standard
        ? [0, 1, 2, 3, 9].some((i) => buttonValue(d.pad.buttons?.[i]) >= 0.5)
        : mapped.menu.confirm || mapped.menu.menu;
      const neutral = mapped.neutral && !join;
      let seat = seats.indexOf(d.index);
      if (d.blocked) {
        if (neutral) d.blocked = false;
        d.joinWas = join;
      } else if (seat === -1 && !capturing && !active && join && !d.joinWas) {
        seat = seats.indexOf(null);
        if (seat !== -1) select(d.index, seat);
      } else if (seat !== -1 && active && mapped.flight.pause && !d.pauseWas) paused.push(seat);
      else if (seat !== -1 && !capturing && !active && menuSeat === null && join && !d.joinWas) {
        menuSeat = seat;
        releaseState(d);
      }
      d.joinWas = join;
      d.pauseWas = mapped.flight.pause;
      if (seat !== -1) {
        pads[d.index] = virtual(d, mapped.flight, d.blocked || capturing);
        if (menuSeat === seat && !capturing) {
          menuPads.push(virtual(d, mapped.menu, d.blocked));
          confirmHeld = mapped.menu.confirm;
        }
      }
    }
    if (paused.length) menuSeat = Math.min(...paused);
    frame = { pads, menuPads, slots: [...seats], confirmHeld };
    return frame;
  }
  const api = {
    sample,
    clear,
    capture(value) {
      capturing = !!value;
      clear();
    },
    frame: () => frame,
    state: () => ({
      available,
      editable,
      restoreError: saved?.error() ?? null,
      menuSeat,
      seats: [...seats],
      devices: [...devices.values()].map((d) => ({
        index: d.index,
        generation: d.generation,
        device: deviceDescriptor(d.pad),
        profile: d.profile ? structuredClone(d.profile) : null,
        waiting: d.blocked,
        standard: d.standard,
      })),
    }),
    completeFlight: (seat) => {
      const profile = devices.get(seats[seat])?.profile;
      return !!profile && Object.values(profile.flight).every((sources) => sources.length > 0);
    },
    raw: (index) => devices.get(index)?.pad || null,
    assign: select,
    split(index, profiles) {
      if (!editable || capturing || splits.has(index) || index >= 1024) return false;
      const source = devices.get(index);
      if (!source || profiles.length !== 2) return false;
      const checked = profiles.map(validateProfile);
      if (
        checked.some((p) =>
          Object.keys(p.device).some((key) => p.device[key] !== deviceDescriptor(source.pad)[key]),
        )
      )
        throw new Error('Profile does not match this device.');
      // A physical channel belongs to exactly one player, including menu actions.
      const used = checked.map(
        (p) =>
          new Set(
            [...Object.values(p.flight), ...Object.values(p.menu)]
              .flat()
              .map((s) => `${s.kind === 'button' ? 'button' : 'axis'}:${s.index}`),
          ),
      );
      if ([...used[0]].some((key) => used[1].has(key)))
        throw new Error('Shared radio players need separate channels.');
      const indexes = [1024 + index * 2, 1025 + index * 2];
      splits.set(index, { key: source.key, indexes });
      source.restoreDone = true;
      for (let seat = 0; seat < 2; seat++) {
        const child = indexes[seat];
        devices.set(child, {
          ...source,
          index: child,
          generation: ++generation,
          pad: withIndex(source.pad, child),
          profile: checked[seat],
          standard: false,
          previous: new Map(),
          blocked: true,
          joinWas: false,
          pauseWas: false,
        });
        if (seats[seat] !== null) releaseState(devices.get(seats[seat]));
        seats[seat] = child;
      }
      menuSeat = 0;
      clear();
      remember();
      return true;
    },
    apply(index, profile) {
      if (!editable) return false;
      const d = devices.get(index);
      if (!d) return false;
      const p = validateProfile(profile);
      const descriptor = deviceDescriptor(d.pad);
      if (Object.keys(descriptor).some((key) => p.device[key] !== descriptor[key]))
        throw new Error('Profile does not match this device. Configure it again.');
      for (const shared of splits.values()) {
        if (!shared.indexes.includes(index)) continue;
        const sibling = devices.get(shared.indexes.find((i) => i !== index));
        const channels = (profile) =>
          new Set(
            [...Object.values(profile.flight), ...Object.values(profile.menu)]
              .flat()
              .map((s) => `${s.kind === 'button' ? 'button' : 'axis'}:${s.index}`),
          );
        if (!sibling?.profile) return false;
        const other = channels(sibling.profile);
        if ([...channels(p)].some((key) => other.has(key)))
          throw new Error('Shared radio players need separate channels.');
      }
      const split = splits.get(index);
      if (split) {
        splits.delete(index);
        for (const child of split.indexes) lose(child);
      }
      d.restoreDone = true;
      d.profile = p;
      d.standard = false;
      d.revision++;
      releaseState(d);
      remember();
      return true;
    },
    release(seat) {
      if (!editable) return;
      const d = devices.get(seats[seat]);
      if (d) releaseState(d);
      seats[seat] = null;
      if (menuSeat === seat) menuSeat = null;
      remember();
    },
    swap() {
      if (!editable) return;
      seats.reverse();
      if (menuSeat !== null) menuSeat = 1 - menuSeat;
      clear();
      remember();
    },
    menu(seat) {
      if (!editable || (seat !== null && seats[seat] === null)) return;
      menuSeat = seat;
      clear();
    },
    forgetSaved() {
      const result = saved?.forget() ?? false;
      for (const d of devices.values()) d.restoreDone = true;
      return result;
    },
    dispose() {
      disposed = true;
      eventTarget?.removeEventListener?.('gamepaddisconnected', disconnect);
      splits.clear();
      devices.clear();
      seats.fill(null);
      frame = { pads: [], menuPads: [], slots: [null, null] };
    },
  };
  return api;
}
