// Multiplayer recipes are deliberately separate from solo bindings and RadioProfile.v1.
import { boundedJSON, exactKeys, required } from '../data-json.mjs';
export const PROFILE_FORMAT = 'CouchControllerProfiles.v1';
export const PROFILE_KEY = 'revealline-mmm.couch-controller-profiles.v1';
export const ACTIONS = Object.freeze({
  flight: ['up', 'right', 'down', 'left', 'action', 'pickup', 'boost', 'pause'],
  menu: ['up', 'right', 'down', 'left', 'confirm', 'back', 'menu'],
});
const finite = (v, lo, hi) => Number.isFinite(v) && v >= lo && v <= hi;
const index = (v, max) => Number.isInteger(v) && v >= 0 && v < max;
export const deviceDescriptor = (pad) => ({
  id: String(pad.id || '').slice(0, 512),
  mapping: pad.mapping || '',
  axes: pad.axes?.length || 0,
  buttons: pad.buttons?.length || 0,
});
export const descriptorKey = (pad) => JSON.stringify(deviceDescriptor(pad));
export const buttonValue = (button) =>
  typeof button === 'number' ? button : button?.pressed === true ? 1 : (button?.value ?? 0);
export function validateProfile(value) {
  const p = boundedJSON(value, {
    maxBytes: 32768,
    maxNodes: 4096,
    maxArray: 256,
    maxDepth: 8,
    maxString: 512,
  });
  exactKeys(p, ['id', 'name', 'device', 'flight', 'menu'], 'controller profile');
  required(typeof p.id === 'string' && /^[a-z0-9-]{1,80}$/.test(p.id), 'Invalid profile ID');
  required(
    typeof p.name === 'string' && p.name.trim().length > 0 && p.name.length <= 120,
    'Invalid profile name',
  );
  exactKeys(p.device, ['id', 'mapping', 'axes', 'buttons'], 'controller device');
  required(
    typeof p.device.id === 'string' &&
      p.device.id.length <= 512 &&
      ['', 'standard'].includes(p.device.mapping) &&
      index(p.device.axes, 65) &&
      index(p.device.buttons, 257),
    'Unsupported controller channels',
  );
  for (const [context, actions] of Object.entries(ACTIONS)) {
    exactKeys(p[context], actions, context);
    const assigned = [];
    for (const action of actions) {
      const sources = p[context][action];
      required(Array.isArray(sources) && sources.length <= 8, 'Invalid action sources');
      for (const s of sources) {
        required(s && ['button', 'axis', 'hat'].includes(s.kind), 'Invalid input source');
        if (s.kind === 'button') {
          exactKeys(s, ['kind', 'index', 'threshold', 'invert'], action);
          required(
            index(s.index, p.device.buttons) &&
              finite(s.threshold, 0.1, 0.9) &&
              typeof s.invert === 'boolean',
            'Invalid button',
          );
        } else if (s.kind === 'axis') {
          exactKeys(s, ['kind', 'index', 'center', 'end', 'press', 'release'], action);
          required(
            index(s.index, p.device.axes) &&
              finite(s.center, -1, 1) &&
              finite(s.end, -1, 1) &&
              Math.abs(s.end - s.center) >= 0.2 &&
              finite(s.press, 0.1, 0.9) &&
              finite(s.release, 0.02, s.press),
            'Invalid measured axis',
          );
        } else {
          exactKeys(s, ['kind', 'index', 'values', 'tolerance'], action);
          required(
            index(s.index, p.device.axes) &&
              Array.isArray(s.values) &&
              s.values.length > 0 &&
              s.values.length <= 8 &&
              s.values.every((v) => finite(v, -4, 4)) &&
              finite(s.tolerance, 0.001, 0.08),
            'Invalid hat positions',
          );
        }
        const range = (source) => {
          if (source.kind === 'button')
            return source.invert ? [0, source.threshold] : [source.threshold, 1];
          const edge = source.center + (source.end - source.center) * source.release;
          return source.end > source.center ? [edge, 4] : [-4, edge];
        };
        const overlaps = (a, b) => {
          if (a.index !== b.index || (a.kind === 'button') !== (b.kind === 'button')) return false;
          if (a.kind === 'hat' && b.kind === 'hat')
            return a.values.some((v) =>
              b.values.some((w) => Math.abs(v - w) <= a.tolerance + b.tolerance),
            );
          if (a.kind === 'hat' || b.kind === 'hat') return true;
          const [lo, hi] = range(a),
            [otherLo, otherHi] = range(b);
          return Math.max(lo, otherLo) < Math.min(hi, otherHi);
        };
        for (const [prior, source] of assigned) {
          const cardinalA = actions.indexOf(prior),
            cardinalB = actions.indexOf(action);
          // One diagonal hat position may contribute adjacent cardinal directions.
          const diagonal =
            s.kind === 'hat' &&
            source.kind === 'hat' &&
            cardinalA < 4 &&
            cardinalB < 4 &&
            Math.abs(cardinalA - cardinalB) % 2 === 1;
          required(
            prior === action || !overlaps(s, source) || diagonal,
            'Duplicate action binding',
          );
        }
        assigned.push([action, s]);
      }
    }
  }
  return p;
}
export function emptyProfile(pad, id, name) {
  return {
    id,
    name,
    device: deviceDescriptor(pad),
    ...Object.fromEntries(
      Object.entries(ACTIONS).map(([context, actions]) => [
        context,
        Object.fromEntries(actions.map((action) => [action, []])),
      ]),
    ),
  };
}
export function standardProfile(pad) {
  const p = emptyProfile(pad, 'standard', 'Standard');
  const maps = {
    flight: { up: 12, right: 15, down: 13, left: 14, action: 0, pickup: 2, boost: 5, pause: 9 },
    menu: { up: 12, right: 15, down: 13, left: 14, confirm: 0, back: 1, menu: 9 },
  };
  for (const context of Object.keys(ACTIONS)) {
    for (const [action, i] of Object.entries(maps[context]))
      if (i < p.device.buttons)
        p[context][action] = [{ kind: 'button', index: i, threshold: 0.5, invert: false }];
    for (const [action, i, end] of [
      ['up', 1, -1],
      ['down', 1, 1],
      ['left', 0, -1],
      ['right', 0, 1],
    ])
      if (i < p.device.axes)
        p[context][action].push({
          kind: 'axis',
          index: i,
          center: 0,
          end,
          press: 0.35,
          release: 0.35,
        });
  }
  return p;
}
export function mapProfile(profile, pad, previous = new Map()) {
  const state = new Map(),
    result = {};
  let neutral = true,
    valid = true;
  for (const [context, actions] of Object.entries(ACTIONS)) {
    result[context] = {};
    for (const action of actions) {
      result[context][action] = profile[context][action]
        .map((s, n) => {
          const key = `${context}:${action}:${n}`;
          let active = false,
            released = true;
          if (s.kind === 'button') {
            const v = buttonValue(pad.buttons?.[s.index]);
            if (!finite(v, 0, 1)) valid = false;
            active = s.invert ? v < s.threshold : v >= s.threshold;
            released = !active;
          } else {
            const v = pad.axes?.[s.index];
            if (!finite(v, s.kind === 'hat' ? -4 : -1, s.kind === 'hat' ? 4 : 1)) valid = false;
            if (s.kind === 'hat') active = s.values.some((x) => Math.abs(x - v) <= s.tolerance);
            else {
              const magnitude = (v - s.center) / (s.end - s.center);
              active = magnitude > (previous.get(key) ? s.release : s.press);
              released = magnitude <= s.release;
            }
            if (s.kind === 'hat') released = !active;
          }
          state.set(key, active);
          if (!released) neutral = false;
          return active;
        })
        .some(Boolean);
    }
    // Match existing digital priority and analog dominant-axis/tie behavior.
    const digital = actions
      .slice(0, 4)
      .find((action) =>
        profile[context][action].some(
          (s) =>
            s.kind !== 'axis' &&
            (s.kind === 'button'
              ? s.invert
                ? buttonValue(pad.buttons?.[s.index]) < s.threshold
                : buttonValue(pad.buttons?.[s.index]) >= s.threshold
              : s.values.some((x) => Math.abs(x - pad.axes?.[s.index]) <= s.tolerance)),
        ),
      );
    const analog = actions
      .slice(0, 4)
      .filter((a) => result[context][a])
      .sort((a, b) => {
        const strength = (name) =>
          Math.max(
            0,
            ...profile[context][name]
              .filter((s) => s.kind === 'axis')
              .map((s) => (pad.axes[s.index] - s.center) / (s.end - s.center)),
          );
        return (
          strength(b) - strength(a) ||
          Number(['up', 'down'].includes(b)) - Number(['up', 'down'].includes(a))
        );
      })[0];
    result[context].direction = digital || analog || null;
  }
  return { ...result, state, neutral: valid && neutral, valid };
}
export function validateCollection(value) {
  const data = boundedJSON(value, {
    maxBytes: 262144,
    maxNodes: 32768,
    maxArray: 256,
    maxDepth: 10,
    maxString: 512,
  });
  exactKeys(data, ['format', 'profiles'], 'controller profiles');
  required(
    data.format === PROFILE_FORMAT && Array.isArray(data.profiles) && data.profiles.length <= 16,
    'Unsupported controller profile collection',
  );
  const profiles = data.profiles.map(validateProfile);
  required(new Set(profiles.map((p) => p.id)).size === profiles.length, 'Duplicate profile IDs');
  return { format: PROFILE_FORMAT, profiles };
}
export function createProfileStore(storage, key = PROFILE_KEY) {
  let raw = null,
    data = { format: PROFILE_FORMAT, profiles: [] },
    problem = '',
    undo = null,
    revision = 0,
    unreadable = false;
  try {
    raw = storage?.getItem(key) ?? null;
    if (raw !== null) data = validateCollection(JSON.parse(raw));
  } catch (e) {
    problem = e.message;
    unreadable = raw !== null;
  }
  function save(candidate) {
    const next = validateCollection(candidate),
      bytes = JSON.stringify(next);
    try {
      if (!storage) throw new Error('Storage unavailable');
      if (unreadable)
        throw new Error(
          'Stored profiles are invalid or from a newer version. Original data is preserved; use this profile for this session or export it.',
        );
      if ((storage.getItem(key) ?? null) !== raw)
        throw new Error('Profiles changed in another tab. Export this draft and reload.');
      storage.setItem(key, bytes);
      if (storage.getItem(key) !== bytes) throw new Error('Profile save could not be verified');
      raw = bytes;
      problem = '';
    } catch (e) {
      problem = e.message;
    }
    if (bytes !== JSON.stringify(data)) undo = data;
    data = next;
    revision++;
    return !problem;
  }
  return {
    revision: () => revision,
    snapshot: () => structuredClone(data),
    error: () => problem,
    export: () => JSON.stringify(data, null, 2),
    save,
    retry: () => save(data),
    import: (text) => save(validateCollection(JSON.parse(text))),
    undo: () => {
      if (undo) {
        const prior = undo;
        save(prior);
        undo = null;
      }
    },
    put: (profile) =>
      save({
        format: PROFILE_FORMAT,
        profiles: [...data.profiles.filter((p) => p.id !== profile.id), validateProfile(profile)],
      }),
    remove: (id) =>
      save({ format: PROFILE_FORMAT, profiles: data.profiles.filter((p) => p.id !== id) }),
  };
}
