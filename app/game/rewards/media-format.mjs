import { required } from '../data-json.mjs';
import { inspectAudioBytes } from '../media-audio.mjs';
import { inspectVideoContainerBytes } from '../video-poster.mjs';
import { inspectImageDataUrl } from '../content.mjs';

export const REWARD_MEDIA_LIMITS = Object.freeze({
  sourceBytes: 32 * 1024 * 1024,
  imageBytes: 4 * 1024 * 1024,
  textBytes: 64 * 1024,
  durationSeconds: 120,
  cues: 256,
});
const types = Object.freeze({
  audio: { mp3: 'audio/mpeg', ogg: 'audio/ogg', wav: 'audio/wav' },
  video: { mp4: 'video/mp4', webm: 'video/webm' },
  poster: { png: 'image/png', jpg: 'image/jpeg', jpeg: 'image/jpeg', webp: 'image/webp' },
  transcript: { txt: 'text/plain' },
  captions: { vtt: 'text/vtt' },
});
export function rewardMediaReferences(payload) {
  if (payload.type === 'exploration' && payload.recipe?.diagram)
    return [{ role: 'poster', reference: payload.recipe.diagram.asset }];
  if (!['audio', 'video'].includes(payload.type)) return [];
  return [
    { role: payload.type, reference: payload.asset },
    ...['en', 'uk'].map((locale) => ({
      role: 'transcript',
      locale,
      reference: payload.transcript[locale],
    })),
    ...(payload.type === 'video'
      ? [
          { role: 'poster', reference: payload.poster },
          ...['en', 'uk'].map((locale) => ({
            role: 'captions',
            locale,
            reference: payload.captions[locale],
          })),
        ]
      : []),
  ];
}
export function validateRewardMediaAsset(asset, role) {
  const mime = types[role]?.[asset?.path?.split('.').at(-1).toLowerCase()];
  required(mime, `Reward ${role} needs a supported local file extension.`);
  const limit = ['transcript', 'captions'].includes(role)
    ? REWARD_MEDIA_LIMITS.textBytes
    : role === 'poster'
      ? REWARD_MEDIA_LIMITS.imageBytes
      : REWARD_MEDIA_LIMITS.sourceBytes;
  required(
    Number.isInteger(asset.bytes) && asset.bytes > 0 && asset.bytes <= limit,
    `Reward ${role} exceeds its ${limit}-byte admission limit.`,
  );
  return mime;
}
function text(bytes) {
  const result = new TextDecoder('utf-8', { fatal: true }).decode(bytes).replace(/\r\n?/g, '\n');
  required(
    result.trim() && !/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/.test(result),
    'Reward text must be nonempty UTF-8 without control characters.',
  );
  return result;
}
function timestamp(value) {
  const match = /^(?:(\d{2}):)?([0-5]\d):([0-5]\d)\.(\d{3})$/.exec(value);
  required(match, 'Reward captions require WebVTT timestamps.');
  return (
    Number(match[1] ?? 0) * 3600 +
    Number(match[2]) * 60 +
    Number(match[3]) +
    Number(match[4]) / 1000
  );
}
/** Deliberately bounded plain-text WebVTT. CSS, regions, cue markup and arbitrary
 * settings are not admitted; all text is also available in an untimed transcript. */
export function validateRewardCaptions(input) {
  const value = input.replace(/^\uFEFF/, '');
  const blocks = value.trim().split(/\n[ \t]*\n/);
  required(
    blocks.shift() === 'WEBVTT' && blocks.length > 0 && blocks.length <= REWARD_MEDIA_LIMITS.cues,
    'Reward captions require a WEBVTT header and 1–256 plain cues.',
  );
  let previous = -1,
    endSeconds = 0;
  for (const block of blocks) {
    const lines = block.split('\n');
    if (!lines[0].includes('-->'))
      required(/^[A-Za-z0-9_-]{1,64}$/.test(lines.shift()), 'Invalid caption cue ID.');
    const range = /^(\S+) --> (\S+)$/.exec(lines.shift() ?? '');
    required(
      range &&
        lines.length > 0 &&
        lines.length <= 8 &&
        lines.every((line) => line.trim() && line.length <= 512 && !/[<>]/.test(line)),
      'Reward captions require plain cue text without markup or positioning.',
    );
    const start = timestamp(range[1]),
      end = timestamp(range[2]);
    required(
      start >= previous && end > start && end <= REWARD_MEDIA_LIMITS.durationSeconds,
      'Reward caption timing exceeds the finite media range.',
    );
    previous = start;
    endSeconds = Math.max(endSeconds, end);
  }
  return { text: value, endSeconds };
}
/** Called by the compiler and the exact-byte runtime loader. Hash/rights are
 * verified by their existing edition owners before these role checks. */
export function inspectRewardMediaBytes(asset, role, bytes) {
  const mime = validateRewardMediaAsset(asset, role);
  required(
    bytes instanceof Uint8Array && bytes.length === asset.bytes,
    'Reward media byte count differs from its pin.',
  );
  if (role === 'transcript') return { mime, text: text(bytes) };
  if (role === 'captions') return { mime, ...validateRewardCaptions(text(bytes)) };
  if (role === 'audio') inspectAudioBytes(bytes, mime);
  else if (role === 'video')
    required(
      inspectVideoContainerBytes(bytes.subarray(0, 65536)) === mime,
      'Reward video MIME differs from its container.',
    );
  else {
    let binary = '';
    for (let index = 0; index < bytes.length; index += 8192)
      binary += String.fromCharCode(...bytes.subarray(index, index + 8192));
    const image = inspectImageDataUrl(`data:${mime};base64,${btoa(binary)}`);
    required(image.valid, 'Reward poster needs a valid, bounded static raster image.');
  }
  return { mime };
}
