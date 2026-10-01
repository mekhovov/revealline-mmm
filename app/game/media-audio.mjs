import { required } from './data-json.mjs';
const starts = (bytes, text) =>
  [...text].every((char, index) => bytes[index] === char.charCodeAt(0));
/** Shared bounded container inspection; native decoding is a separate capability check. */
export function inspectAudioBytes(bytes, mime) {
  if (mime === 'audio/wav') {
    required(
      bytes.length >= 44 && starts(bytes, 'RIFF') && starts(bytes.subarray(8), 'WAVE'),
      'Invalid WAV header.',
    );
    required(
      new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength).getUint32(4, true) + 8 ===
        bytes.length,
      'WAV size mismatch.',
    );
  } else if (mime === 'audio/ogg')
    required(bytes.length >= 27 && starts(bytes, 'OggS') && bytes[4] === 0, 'Invalid Ogg header.');
  else
    required(
      bytes.length >= 10 &&
        (starts(bytes, 'ID3') || (bytes[0] === 255 && (bytes[1] & 224) === 224)),
      'Invalid MPEG audio header.',
    );
}
