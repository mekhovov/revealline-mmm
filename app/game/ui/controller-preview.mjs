export const CONTROLLER_PREVIEW_FORMAT = 'revealline.controller-preview.v2';
export const CONTROLLER_PREVIEW_STATUS_FORMAT = 'revealline.controller-preview-status.v2';
export const CONTROLLER_PREVIEW_LEASE_MS = 1200;

// Inspect descriptors before reading values: exported parsers also accept local
// callers, where getters and prototype properties have not passed postMessage.
function fields(value, keys) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  const prototype = Object.getPrototypeOf(value);
  if (prototype !== Object.prototype && prototype !== null) return null;
  const names = Reflect.ownKeys(value);
  if (names.length !== keys.length || names.some((key) => !keys.includes(key))) return null;
  const result = {};
  for (const key of keys) {
    const descriptor = Object.getOwnPropertyDescriptor(value, key);
    if (!descriptor?.enumerable || !Object.hasOwn(descriptor, 'value')) return null;
    result[key] = descriptor.value;
  }
  return result;
}
function array(value, minimum, maximum, valid) {
  if (!Array.isArray(value) || Object.getPrototypeOf(value) !== Array.prototype) return null;
  const length = Object.getOwnPropertyDescriptor(value, 'length')?.value;
  if (!Number.isInteger(length) || length < minimum || length > maximum) return null;
  if (Reflect.ownKeys(value).length !== length + 1) return null;
  const result = [];
  for (let i = 0; i < length; i++) {
    const descriptor = Object.getOwnPropertyDescriptor(value, String(i));
    if (!descriptor?.enumerable || !Object.hasOwn(descriptor, 'value') || !valid(descriptor.value))
      return null;
    result.push(descriptor.value);
  }
  return result;
}
const sequence = (value) => Number.isSafeInteger(value) && value >= 0;
const sessionToken = (value) => typeof value === 'string' && /^[a-f0-9]{32}$/.test(value);
const neutral = (pad) => pad.axes.every((value) => value === 0) && pad.buttons.every((v) => !v);
const emptyPad = (connected = false) => ({
  index: 0,
  connected,
  axes: [0, 0, 0, 0],
  buttons: Array(16).fill(false),
});

export function parseControllerPreviewSnapshot(value) {
  try {
    const data = fields(value, ['format', 'session', 'sequence', 'pad']);
    if (!data || data.format !== CONTROLLER_PREVIEW_FORMAT || !sequence(data.sequence)) return null;
    if (!sessionToken(data.session)) return null;
    const pad = fields(data.pad, ['index', 'connected', 'axes', 'buttons']);
    if (!pad || pad.index !== 0 || typeof pad.connected !== 'boolean') return null;
    const axes = array(pad.axes, 4, 4, (v) => Number.isFinite(v) && v >= -1 && v <= 1);
    const buttons = array(pad.buttons, 0, 16, (v) => typeof v === 'boolean');
    if (!axes || !buttons) return null;
    const parsed = {
      format: data.format,
      session: data.session,
      sequence: data.sequence,
      pad: { ...pad, axes, buttons },
    };
    if (!pad.connected && !neutral(parsed.pad)) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function parseControllerPreviewStatus(value) {
  try {
    const data = fields(value, [
      'format',
      'session',
      'sequence',
      'readSequence',
      'scope',
      'focusedId',
      'focusedLabel',
      'assigned',
      'message',
    ]);
    if (!data || data.format !== CONTROLLER_PREVIEW_STATUS_FORMAT || !sequence(data.sequence))
      return null;
    if (!sessionToken(data.session)) return null;
    if (data.readSequence !== -1 && !sequence(data.readSequence)) return null;
    if (typeof data.assigned !== 'boolean') return null;
    for (const [key, limit] of [
      ['scope', 160],
      ['focusedId', 160],
      ['focusedLabel', 160],
      ['message', 240],
    ])
      if (typeof data[key] !== 'string' || data[key].length > limit) return null;
    return data;
  } catch {
    return null;
  }
}

/** Practice-only transport. The host must separately validate its scenario and
 * explicit preview flag before enabling. Never grants rewards or changes state.
 */
export function attachControllerPreview({
  enabled = false,
  window: host = globalThis.window,
} = {}) {
  if (!enabled || !host) return null;
  let parent, origin, session;
  try {
    parent = host.parent;
    origin = host.location.origin;
    session = new URLSearchParams(host.location.search || '').get('controller-session');
    if (
      !parent ||
      parent === host ||
      !origin ||
      origin === 'null' ||
      parent.location.origin !== origin
    )
      return null;
    if (!sessionToken(session)) return null;
  } catch {
    return null;
  }
  let pad = emptyPad(),
    lastSequence = -1,
    acceptedSequence = -1,
    readSequence = -1,
    receivedAt = -Infinity,
    awaitNeutral = true,
    disposed = false,
    clock = 0,
    reportSequence = 0,
    lastReport = '',
    reportAt = -Infinity;
  function now() {
    const value = host.performance?.now?.() ?? Date.now();
    if (Number.isFinite(value)) clock = Math.max(clock, value);
    return clock;
  }
  function receive(event) {
    if (disposed || event.source !== parent || event.origin !== origin) return;
    const value = parseControllerPreviewSnapshot(event.data);
    if (!value || value.session !== session || value.sequence <= lastSequence) return;
    lastSequence = value.sequence;
    if (now() - receivedAt > CONTROLLER_PREVIEW_LEASE_MS) {
      pad = emptyPad();
      awaitNeutral = true;
      acceptedSequence = -1;
      readSequence = -1;
    }
    if (awaitNeutral && !neutral(value.pad)) return;
    awaitNeutral = !value.pad.connected;
    pad = value.pad;
    acceptedSequence = value.sequence;
    receivedAt = now();
  }
  function clear() {
    pad = emptyPad(pad.connected);
    awaitNeutral = true;
    acceptedSequence = -1;
    readSequence = -1;
  }
  function readPads() {
    if (disposed) return [];
    const time = now();
    if (time - receivedAt > CONTROLLER_PREVIEW_LEASE_MS) {
      pad = emptyPad();
      awaitNeutral = true;
      acceptedSequence = -1;
      readSequence = -1;
    }
    if (!pad.connected) {
      readSequence = -1;
      return [];
    }
    readSequence = acceptedSequence;
    return [
      {
        id: 'Virtual controller preview (simulated)',
        index: 0,
        connected: true,
        mapping: 'standard',
        timestamp: receivedAt,
        axes: [...pad.axes],
        // Fixed physical descriptor prevents a valid shorter packet rejoining a
        // different virtual device; absent buttons are neutral.
        buttons: Array.from({ length: 16 }, (_, i) => ({
          pressed: pad.buttons[i] === true,
          value: pad.buttons[i] ? 1 : 0,
        })),
      },
    ];
  }
  function report(value) {
    if (disposed) return false;
    const input = fields(value, ['scope', 'focusedId', 'focusedLabel', 'assigned', 'message']);
    if (!input) return false;
    const data = parseControllerPreviewStatus({
      format: CONTROLLER_PREVIEW_STATUS_FORMAT,
      session,
      sequence: reportSequence,
      readSequence,
      ...input,
    });
    if (!data) return false;
    const fingerprint = JSON.stringify({ ...input, readSequence }),
      time = now();
    if (fingerprint === lastReport || time - reportAt < 100) return false;
    try {
      parent.postMessage(data, origin);
      reportSequence++;
      lastReport = fingerprint;
      reportAt = time;
      return true;
    } catch {
      return false;
    }
  }
  host.addEventListener('message', receive);
  return {
    readPads,
    clear,
    report,
    destroy() {
      disposed = true;
      pad = emptyPad();
      host.removeEventListener('message', receive);
    },
  };
}
