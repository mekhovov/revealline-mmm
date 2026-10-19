import { HUMAN_REACTION_CUES } from './destruction-audio.mjs';
/** Match imported destruction recordings to the admitted bank without changing
 * their original samples. Summed channel magnitudes bound stereo/downmix peaks
 * even when channels cancel in a mono audition. This runs once after decoding. */
const targets = Object.freeze({
  ...Object.fromEntries(HUMAN_REACTION_CUES.map((name) => [name, -30])),
  'destroy-soft': -30,
  'destroy-armored': -30,
  'destroy-light': -29,
  'destroy-heavy': -28,
  'destroy-electronic': -31,
});

export function destructionBufferGain(name, buffer) {
  if (!Object.hasOwn(targets, name)) return 1;
  const { length, numberOfChannels, sampleRate, duration } = buffer ?? {};
  if (
    !Number.isSafeInteger(length) ||
    length <= 0 ||
    !Number.isSafeInteger(numberOfChannels) ||
    numberOfChannels <= 0 ||
    numberOfChannels > 32 ||
    length * numberOfChannels > 4 * 1024 * 1024 ||
    !Number.isFinite(sampleRate) ||
    sampleRate <= 0 ||
    !Number.isFinite(duration) ||
    duration <= 0 ||
    duration > 1 ||
    typeof buffer.getChannelData !== 'function'
  )
    throw new TypeError('Invalid destruction audio buffer.');
  const envelope = new Float64Array(length);
  for (let channel = 0; channel < numberOfChannels; channel++) {
    const data = buffer.getChannelData(channel);
    if (data.length !== length) throw new TypeError('Incomplete destruction audio channel.');
    for (let index = 0; index < length; index++) {
      const value = data[index];
      if (!Number.isFinite(value)) throw new TypeError('Nonfinite destruction audio sample.');
      envelope[index] += Math.abs(value);
    }
  }
  const window = Math.max(1, Math.min(length, Math.round(sampleRate * 0.05)));
  let peak = 0,
    energy = 0,
    maximumEnergy = 0;
  for (let index = 0; index < length; index++) {
    const value = envelope[index];
    peak = Math.max(peak, value);
    energy += value * value;
    if (index >= window) energy -= envelope[index - window] ** 2;
    maximumEnergy = Math.max(maximumEnergy, energy);
  }
  const rms = Math.sqrt(maximumEnergy / window);
  return Math.min(1, peak > 0 ? 0.1 / peak : 1, rms > 0 ? 10 ** (targets[name] / 20) / rms : 1);
}
