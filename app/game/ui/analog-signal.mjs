/** Shared bounded receiver interference for demo concealment and live jamming. */
function validatePixels(data, width, height) {
  if (
    !(data instanceof Uint8ClampedArray) ||
    !Number.isInteger(width) ||
    !Number.isInteger(height) ||
    width < 1 ||
    height < 1 ||
    width > 512 ||
    height > 512 ||
    data.length !== width * height * 4
  )
    throw new TypeError('Analog signal needs bounded RGBA image pixels.');
}

/** Stable spatial fingerprint. Compute once per prepared picture, never per frame. */
export function analogSignalSeed(data, width, height) {
  validatePixels(data, width, height);
  let seed = Math.imul(2166136261 ^ width, 16777619) >>> 0;
  seed = Math.imul(seed ^ height, 16777619) >>> 0;
  for (const value of data) seed = Math.imul(seed ^ value, 16777619) >>> 0;
  return seed;
}

/** Monochrome receiver snow plus clustered, one-line impulse streaks. The
 * spatial reference is real FPV residual / flight frames in AnalogDepth
 * (arxiv.org/abs/2609.24312, figures 1 and 3), not independent RGB digital noise.
 * This is procedural, not extracted receiver footage. The supplied base is
 * sampled without geometric changes; output is opaque. Strength scales only
 * interference amplitude, preserving the approved spatial noise character. */
export function applyAnalogSignalNoise(
  base,
  width,
  height,
  frame,
  output,
  { seed = 0, strength = 1 } = {},
) {
  validatePixels(base, width, height);
  validatePixels(output, width, height);
  if (
    !Number.isSafeInteger(frame) ||
    frame < 0 ||
    !Number.isInteger(seed) ||
    seed < 0 ||
    seed > 0xffffffff ||
    !Number.isFinite(strength) ||
    strength < 0 ||
    strength > 1
  )
    throw new TypeError('Analog signal needs a frame, uint32 seed and strength from 0 to 1.');
  let randomState = (0x9137bcad ^ seed ^ Math.imul(frame + 1, 0x45d9f3b)) >>> 0;
  randomState ||= 0x9e3779b9;
  const random = () => {
    randomState ^= randomState << 13;
    randomState ^= randomState >>> 17;
    randomState ^= randomState << 5;
    return (randomState >>> 0) / 4294967296;
  };
  const clusters = [random() * height, random() * height, random() * height];
  for (let y = 0; y < height; y++) {
    const envelope = Math.max(
      ...clusters.map((center) =>
        Math.max(0, 1 - Math.abs(y - center) / Math.max(2, height * 0.065)),
      ),
    );
    const rowBias = (random() - 0.5) * (3 + envelope * 10);
    let tail = 0,
      streak = 0,
      length = 0;
    for (let x = 0; x < width; x++) {
      const index = (y * width + x) * 4;
      tail = tail * 0.35 + (random() - 0.5) * 28;
      const grain = (random() + random() - 1) * (28 + envelope * 18) + tail;
      if (length <= 0 && random() < 0.0015 + envelope * 0.025) {
        length = 1 + Math.floor(random() * Math.max(2, width * 0.045));
        streak = (random() < 0.5 ? -1 : 1) * (32 + random() * 48);
      }
      const impulse = length-- > 0 ? streak : 0;
      for (let channel = 0; channel < 3; channel++)
        output[index + channel] = base[index + channel] + (grain + rowBias + impulse) * strength;
      output[index + 3] = 255;
    }
  }
  return output;
}
