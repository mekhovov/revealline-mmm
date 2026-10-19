import { inspectMP3, ownSoundtrackBlob, throwIfSoundtrackAborted } from './mp3-inspection.mjs';

const required = (condition, message) => {
  if (!condition) throw new TypeError(message);
};
const begins = (bytes, offset, text) =>
  [...text].every((char, i) => bytes[offset + i] === char.charCodeAt(0));

/** PCM/float WAVE only: compressed or ambiguous containers use the cue fallback. */
function inspectWAVE(bytes) {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  required(
    bytes.length >= 44 && begins(bytes, 0, 'RIFF') && begins(bytes, 8, 'WAVE'),
    'Invalid cue WAVE header.',
  );
  required(view.getUint32(4, true) + 8 === bytes.length, 'Cue WAVE size mismatch.');
  let format = null,
    dataBytes = null,
    factFrames = null,
    chunks = 0;
  for (let offset = 12; offset < bytes.length; ) {
    required(++chunks <= 1024 && offset + 8 <= bytes.length, 'Invalid cue WAVE chunks.');
    const size = view.getUint32(offset + 4, true),
      start = offset + 8,
      end = start + size,
      next = end + (size % 2);
    required(next <= bytes.length, 'Truncated cue WAVE chunk.');
    if (begins(bytes, offset, 'fmt ')) {
      required(!format && [16, 18, 40].includes(size), 'Ambiguous cue WAVE format.');
      let encoding = view.getUint16(start, true);
      const channels = view.getUint16(start + 2, true),
        sampleRate = view.getUint32(start + 4, true),
        byteRate = view.getUint32(start + 8, true),
        alignment = view.getUint16(start + 12, true),
        bits = view.getUint16(start + 14, true);
      if (encoding === 0xfffe) {
        required(
          size === 40 && view.getUint16(start + 16, true) === 22,
          'Invalid cue WAVE extension.',
        );
        const validBits = view.getUint16(start + 18, true),
          guid = bytes.subarray(start + 24, start + 40);
        required(
          validBits > 0 &&
            validBits <= bits &&
            [0, 0, 0, 0, 0, 16, 0, 128, 0, 0, 170, 0, 56, 155, 113].every(
              (n, i) => guid[i + 1] === n,
            ),
          'Unsupported cue WAVE subformat.',
        );
        encoding = guid[0];
      } else
        required(
          size === 16 || (size === 18 && view.getUint16(start + 16, true) === 0),
          'Unsupported cue WAVE extension.',
        );
      required(
        (encoding === 1 && [8, 16, 24, 32].includes(bits)) ||
          (encoding === 3 && [32, 64].includes(bits)),
        'Compressed cue WAVE requires a bounded delivery copy.',
      );
      required(
        channels > 0 &&
          channels <= 32 &&
          sampleRate > 0 &&
          sampleRate <= 384000 &&
          alignment === channels * (bits / 8) &&
          byteRate === sampleRate * alignment,
        'Invalid cue WAVE sample format.',
      );
      format = { channels, sampleRate, alignment };
    } else if (begins(bytes, offset, 'data')) {
      required(dataBytes === null && size > 0, 'Ambiguous cue WAVE data.');
      dataBytes = size;
    } else if (begins(bytes, offset, 'fact')) {
      required(factFrames === null && size === 4, 'Ambiguous cue WAVE sample count.');
      factFrames = view.getUint32(start, true);
    } else {
      // Do not accept alternate audio layouts (e.g. LIST/wavl with silence
      // segments) whose decoded duration is not the single data chunk's size.
      required(
        begins(bytes, offset, 'JUNK') || begins(bytes, offset, 'PAD '),
        'Unsupported cue WAVE chunk.',
      );
    }
    offset = next;
  }
  required(
    format && dataBytes !== null && dataBytes % format.alignment === 0,
    'Invalid cue WAVE frames.',
  );
  const frames = dataBytes / format.alignment;
  required(factFrames === null || factFrames === frames, 'Cue WAVE sample count mismatch.');
  return {
    frames,
    channels: format.channels,
    sampleRate: format.sampleRate,
    durationSeconds: frames / format.sampleRate,
  };
}

/** Validate immutable encoded bytes before the noncancelable native PCM allocation.
 * scheduleScan must use the owner's safe-phase main queue, including after awaits.
 */
export async function inspectPublishedCue(
  source,
  { sampleRate, maxDuration, signal, scheduleScan },
) {
  throwIfSoundtrackAborted(signal);
  const blob = ownSoundtrackBlob(source, 4 * 1024 * 1024),
    mime = Object.getOwnPropertyDescriptor(Blob.prototype, 'type').get.call(source);
  required(['audio/wav', 'audio/mpeg'].includes(mime), 'Cue format has no bounded PCM inspector.');
  required(
    Number.isFinite(sampleRate) && sampleRate > 0 && sampleRate <= 384000,
    'Invalid cue output sample rate.',
  );
  required(Number.isFinite(maxDuration) && maxDuration > 0, 'Invalid cue duration limit.');
  required(typeof scheduleScan === 'function', 'Cue inspection requires safe-phase admission.');
  let facts;
  if (mime === 'audio/mpeg') {
    const mp3 = await inspectMP3(blob, { signal, scheduleScan });
    facts = { ...mp3, frames: mp3.frames * (mp3.mpegVersion === '1' ? 1152 : 576) };
  } else {
    const bytes = new Uint8Array(await scheduleScan(() => blob.arrayBuffer()));
    throwIfSoundtrackAborted(signal);
    facts = await scheduleScan(() => inspectWAVE(bytes));
  }
  throwIfSoundtrackAborted(signal);
  required(facts.durationSeconds <= maxDuration, 'Cue exceeds its duration budget.');
  const outputFrames = Math.ceil((facts.frames * sampleRate) / facts.sampleRate),
    outputBytes = outputFrames * facts.channels * 4,
    // A resampler can temporarily retain source and output PCM together.
    reservedBytes =
      outputBytes + (sampleRate === facts.sampleRate ? 0 : facts.frames * facts.channels * 4);
  required(
    Number.isSafeInteger(reservedBytes) && reservedBytes > 0 && reservedBytes <= 16 * 1024 * 1024,
    'Cue exceeds its PCM budget.',
  );
  return Object.freeze({ blob, channels: facts.channels, outputFrames, reservedBytes });
}
