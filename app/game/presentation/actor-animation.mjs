import { boundedJSON, exactKeys, required, stableId } from '../data-json.mjs';

export const ACTOR_ANIMATION_FORMAT = 'revealline-actor-animation.v1';
export const ACTOR_CLIPS = Object.freeze([
  'idle',
  'notice',
  'anticipation',
  'move',
  'blocked',
  'recovery',
  'caught',
  'aim',
  'fire',
]);
export const ACTOR_PARTS = Object.freeze([
  'helmet',
  'cap',
  'hood',
  'torso',
  'arms',
  'boots',
  'pack',
  'satchel',
  'radio',
  'shield',
  'armor',
  'weapon',
  'scarf',
  'binoculars',
]);
const accepted = new WeakSet();
function freeze(value) {
  if (value && typeof value === 'object') {
    Object.values(value).forEach(freeze);
    Object.freeze(value);
  }
  return value;
}
function fields(value, names, label) {
  const keys = names.split(' ');
  exactKeys(value, keys, label);
  required(
    keys.every((key) => Object.hasOwn(value, key)),
    `${label} is missing fields.`,
  );
}
const integer = (n, min, max) => Number.isSafeInteger(n) && n >= min && n <= max;

/** Imported animation describes decoration only. No URLs, scripts, sounds,
 * collision shapes, AI transitions or vulnerability timings are accepted. */
export function validateActorAnimation(source, { width = null, height = null } = {}) {
  const value = boundedJSON(source, { maxBytes: 32768, maxNodes: 2500, maxArray: 128 });
  fields(
    value,
    'format id revision rig material parts anchors frames clips fallback',
    'actor animation',
  );
  required(
    value.format === ACTOR_ANIMATION_FORMAT &&
      stableId(value.id) &&
      integer(value.revision, 1, 1000000),
    'Invalid animation identity.',
  );
  required(['overhead-soldier.v1', 'sprite.v1'].includes(value.rig), 'Unsupported actor rig.');
  required(['cloth', 'armor', 'machine'].includes(value.material), 'Unsupported actor material.');
  required(
    Array.isArray(value.parts) &&
      value.parts.length <= ACTOR_PARTS.length &&
      new Set(value.parts).size === value.parts.length &&
      value.parts.every((p) => ACTOR_PARTS.includes(p)),
    'Invalid actor parts.',
  );
  fields(value.anchors, 'pivot equipment', 'actor anchors');
  for (const anchor of Object.values(value.anchors)) {
    fields(anchor, 'x y', 'actor anchor');
    required(
      [anchor.x, anchor.y].every((n) => Number.isFinite(n) && n >= 0 && n <= 1),
      'Invalid actor anchor.',
    );
  }
  required(
    Array.isArray(value.frames) && value.frames.length > 0 && value.frames.length <= 64,
    'Invalid animation frames.',
  );
  const ids = new Set();
  for (const frame of value.frames) {
    fields(frame, 'id durationMs stride breath accessory region', 'actor frame');
    required(stableId(frame.id) && !ids.has(frame.id), 'Duplicate actor frame.');
    ids.add(frame.id);
    required(
      integer(frame.durationMs, 16, 2000) &&
        integer(frame.stride, -3, 3) &&
        integer(frame.breath, 0, 2) &&
        integer(frame.accessory, -2, 2),
      'Unbounded actor motion.',
    );
    if (value.rig === 'sprite.v1') {
      fields(frame.region, 'x y width height', 'atlas region');
      const r = frame.region;
      required(
        integer(width, 1, 1920) &&
          integer(height, 1, 1920) &&
          integer(r.x, 0, width - 1) &&
          integer(r.y, 0, height - 1) &&
          integer(r.width, 1, width) &&
          integer(r.height, 1, height) &&
          r.x + r.width <= width &&
          r.y + r.height <= height,
        'Actor atlas frame escaped its image.',
      );
    } else required(frame.region === null, 'Procedural parts cannot load image regions.');
  }
  exactKeys(value.clips, ACTOR_CLIPS, 'actor clips');
  required(
    ACTOR_CLIPS.slice(0, 7).every((key) => Object.hasOwn(value.clips, key)),
    'Missing required actor clip.',
  );
  for (const clip of Object.values(value.clips)) {
    fields(clip, 'frames loop', 'actor clip');
    required(
      typeof clip.loop === 'boolean' &&
        Array.isArray(clip.frames) &&
        clip.frames.length > 0 &&
        clip.frames.length <= 32 &&
        clip.frames.every((id) => ids.has(id)),
      'Invalid actor clip frames.',
    );
  }
  required(value.fallback === 'compact-overhead.v1', 'Missing registered compact fallback.');
  freeze(value);
  accepted.add(value);
  return value;
}

/** Host supplies elapsed presentation time within the authoritative state. This
 * function cannot advance that state, turn armor or emit gameplay/audio events. */
export function sampleActorAnimation(
  descriptor,
  { clip = 'idle', timeMs = 0, reducedEffects = false } = {},
) {
  required(accepted.has(descriptor), 'Use an admitted actor animation.');
  const sequence = descriptor.clips[clip] ?? descriptor.clips.idle;
  const frames = sequence.frames.map((id) => descriptor.frames.find((f) => f.id === id));
  const duration = frames.reduce((sum, frame) => sum + frame.durationMs, 0);
  let t = reducedEffects || !Number.isFinite(timeMs) ? 0 : Math.max(0, timeMs);
  t = sequence.loop ? t % duration : Math.min(t, duration - 1);
  for (const frame of frames) {
    if (t < frame.durationMs) return frame;
    t -= frame.durationMs;
  }
  return frames[0];
}

export function createSoldierAnimation(id, parts, material = 'cloth') {
  const frames = [0, 1, 2, 0, -1, -2].map((stride, i) => ({
    id: `stride-${i}`,
    durationMs: 100,
    stride,
    breath: 0,
    accessory: i % 2,
    region: null,
  }));
  frames.push(
    { id: 'rest', durationMs: 300, stride: 0, breath: 0, accessory: 0, region: null },
    { id: 'breath', durationMs: 300, stride: 0, breath: 1, accessory: 0, region: null },
  );
  const clips = Object.fromEntries(
    ACTOR_CLIPS.map((name) => [
      name,
      {
        frames:
          name === 'move'
            ? frames.slice(0, 6).map((f) => f.id)
            : ['idle', 'recovery'].includes(name)
              ? ['rest', 'breath']
              : ['rest'],
        loop: !['caught', 'notice', 'fire'].includes(name),
      },
    ]),
  );
  return validateActorAnimation({
    format: ACTOR_ANIMATION_FORMAT,
    id,
    revision: 1,
    rig: 'overhead-soldier.v1',
    material,
    parts,
    anchors: { pivot: { x: 0.5, y: 0.5 }, equipment: { x: 0.75, y: 0.625 } },
    frames,
    clips,
    fallback: 'compact-overhead.v1',
  });
}
