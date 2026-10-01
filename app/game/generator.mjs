import { validateLevel } from './core/index.mjs';

export const GENERATOR_VERSION = 'xonix-generator.v1';
// Stable, non-cryptographic seed mixing. Explicit level JSON is the durable artifact.
function mix(bytes, initial) {
  let state = initial >>> 0;
  for (const byte of bytes) state = Math.imul(state ^ byte, 0x01000193) >>> 0;
  return state;
}

/** Same deterministic candidate in the browser playground and Node CLI. No IO or rendering. */
export function generateLevel(seed) {
  if (typeof seed !== 'string' || !seed || seed.length > 256)
    throw new TypeError('Seed must be a nonempty string of at most 256 characters');
  const bytes = new TextEncoder().encode(seed),
    first = mix(bytes, 0x811c9dc5),
    second = mix(bytes, 0x9e3779b9);
  const fingerprint = first.toString(16).padStart(8, '0') + second.toString(16).padStart(8, '0');
  let state = first || 1;
  const random = () => {
    state ^= state << 13;
    state ^= state >>> 17;
    state ^= state << 5;
    return (state >>> 0) / 0x100000000;
  };
  const integer = (min, max) => min + Math.floor(random() * (max - min + 1));
  const level = {
    version: 'xonix-level.v1',
    id: `generated-${fingerprint}`,
    revision: '1',
    name: `Seed ${seed}`,
    width: 48,
    height: 36,
    spawn: { x: 24.5, y: 0.5 },
    walls: [
      { x: integer(8, 12), y: integer(8, 11), w: integer(2, 4), h: integer(3, 5) },
      { x: integer(29, 33), y: integer(18, 21), w: integer(3, 5), h: integer(2, 4) },
    ],
    enemies: [
      {
        id: 'field-a',
        type: 'bouncer',
        x: integer(20, 25) + 0.5,
        y: integer(25, 29) + 0.5,
        vx: 3,
        vy: 2,
        radius: 0.3,
      },
      {
        id: 'field-b',
        type: 'bouncer',
        x: integer(38, 41) + 0.5,
        y: integer(8, 12) + 0.5,
        vx: -2,
        vy: 3,
        radius: 0.3,
      },
    ],
    objectives: [{ id: 'fragment-a', x: 7.5, y: 26.5, required: true, hidden: false }],
    supplies: [{ id: 'home-supply', x: 24.5, y: 0.5, radius: 2 }],
    goal: { coverage: 0.65 },
  };
  const result = validateLevel(level);
  if (!result.valid)
    throw new Error(`Generated candidate failed core validation: ${JSON.stringify(result.errors)}`);
  return level;
}
