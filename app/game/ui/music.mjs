import { t } from '../i18n/index.mjs';
// Original deterministic composition rules. No imported melody, recording or sample.
export const MUSIC_STYLES = Object.freeze(
  [
    { id: 'synthwave', label: 'Synthwave' },
    { id: 'chiptune', label: 'Chiptune' },
    { id: 'rock', label: 'Arcade rock' },
    { id: 'metal', label: 'Metal' },
    { id: 'ambient', label: 'Ambient' },
  ].map(Object.freeze),
);
export const DEFAULT_TRACKS = Object.freeze(
  [
    {
      id: 'signal-afterglow',
      name: 'Signal Afterglow',
      genre: 'synthwave',
      tempo: 108,
      root: 48,
      scale: 'minor',
    },
    {
      id: 'pocket-constellation',
      name: 'Pocket Constellation',
      genre: 'chiptune',
      tempo: 132,
      root: 60,
      scale: 'major',
    },
    {
      id: 'copper-highway',
      name: 'Copper Highway',
      genre: 'rock',
      tempo: 124,
      root: 45,
      scale: 'dorian',
    },
    { id: 'iron-comet', name: 'Iron Comet', genre: 'metal', tempo: 156, root: 40, scale: 'minor' },
    {
      id: 'quiet-orchard',
      name: 'Quiet Orchard',
      genre: 'ambient',
      tempo: 72,
      root: 57,
      scale: 'dorian',
    },
  ].map(Object.freeze),
);
const scales = {
  minor: [0, 2, 3, 5, 7, 8, 10],
  major: [0, 2, 4, 5, 7, 9, 11],
  dorian: [0, 2, 3, 5, 7, 9, 10],
};
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
export function hashText(value) {
  let n = 2166136261;
  for (const c of String(value)) n = Math.imul(n ^ c.charCodeAt(0), 16777619) >>> 0;
  return n;
}
export function validateTrack(track) {
  const errors = [],
    allowed = ['id', 'name', 'genre', 'tempo', 'root', 'scale'];
  if (!track || typeof track !== 'object' || Array.isArray(track))
    return { valid: false, errors: [t('interface:trackMustBeADescriptor')] };
  for (const k of Object.keys(track))
    if (!allowed.includes(k)) errors.push(t('gameplay:unknownTrackField', { value1: k }));
  if (typeof track.id !== 'string' || !/^[a-zA-Z0-9][a-zA-Z0-9._-]{0,79}$/.test(track.id))
    errors.push(t('interface:trackIdMustBeStable'));
  if (typeof track.name !== 'string' || !track.name.trim() || track.name.length > 120)
    errors.push(t('interface:trackNameMustBe1120Characters'));
  if (!MUSIC_STYLES.some((s) => s.id === track.genre))
    errors.push(t('interface:unknownMusicGenre'));
  if (!Number.isFinite(track.tempo) || track.tempo < 60 || track.tempo > 180)
    errors.push(t('interface:tempoMustBe60180'));
  if (!Number.isInteger(track.root) || track.root < 36 || track.root > 84)
    errors.push(t('interface:rootMustBeMidi3684'));
  if (!Object.hasOwn(scales, track.scale)) errors.push(t('interface:unknownMusicalScale'));
  return { valid: !errors.length, errors };
}
export const midiFrequency = (n) => 440 * 2 ** ((n - 69) / 12);
const degree = (track, n) =>
  track.root + scales[track.scale][((n % 7) + 7) % 7] + 12 * Math.floor(n / 7);
/** Sixteenth-note score step. Tension changes orchestration, never game time. */
export function composeStep(track, index, tension = 0) {
  const g = track.genre,
    t = clamp(Number.isFinite(tension) ? tension : 0, 0, 1),
    step = ((index % 16) + 16) % 16,
    bar = Math.floor(index / 16),
    seed = hashText(track.id),
    notes = [];
  const chord = [0, 5, 3, 4][(bar + (seed % 4)) % 4],
    length = 60 / track.tempo / 4;
  const tone = (midi, voice, volume, duration = length * 0.85) =>
    notes.push({
      kind: 'tone',
      frequency: midiFrequency(clamp(midi, 24, 100)),
      voice,
      volume,
      duration,
    });
  const drum = (kind, volume) =>
    notes.push({
      kind,
      volume,
      duration: kind === 'kick' ? 0.16 : kind === 'snare' ? 0.13 : 0.045,
    });
  if (g === 'ambient') {
    if (step === 0)
      for (const d of [chord, chord + 2, chord + 4])
        tone(degree(track, d), 'pad', 0.025, length * 14);
    if (step === 6 || step === 14)
      tone(degree(track, chord + 7 + (step === 14 ? 2 : 0)), 'bell', 0.035, length * 3);
    if (t > 0.65 && step % 4 === 0) tone(degree(track, chord) - 12, 'bass', 0.045, length * 1.2);
  } else {
    const rock = g === 'rock' || g === 'metal';
    if (step % 4 === 0 || (g === 'metal' && step % 2 === 0) || (t > 0.7 && step === 10))
      drum('kick', rock ? 0.22 : 0.16);
    if (step === 4 || step === 12) drum('snare', rock ? 0.15 : 0.1);
    if (step % 2 === 0 || t > 0.55) drum('hat', g === 'metal' ? 0.035 : 0.025);
    if (rock) {
      const riff = [0, 0, 4, 0, 2, 0, 5, 4],
        d = (step % 2 === 0 ? riff[step / 2] : 0) + (bar % 4 === 3 ? chord : 0);
      if (step % 2 === 0 || (g === 'metal' && t > 0.4)) {
        tone(degree(track, d) - 12, 'bass', 0.1, length * 0.8);
        tone(
          degree(track, d),
          'guitar',
          g === 'metal' ? 0.052 : 0.047,
          length * (step % 4 === 0 ? 1.5 : 0.7),
        );
        tone(degree(track, d) + 7, 'guitar', 0.023, length * 0.7);
      }
      if (step === 14 && bar % 2 === 1) tone(degree(track, chord + 9), 'lead', 0.035, length * 2);
    } else {
      if (step % 4 === 0 || step === 10)
        tone(degree(track, chord) - 12, 'bass', 0.09, length * 2.4);
      if (g === 'synthwave' && step === 0)
        for (const d of [chord, chord + 2, chord + 4])
          tone(degree(track, d), 'pad', 0.02, length * 12);
      const pattern = g === 'chiptune' ? [0, 4, 2, 7, 2, 4, 9, 4] : [0, 2, 4, 2, 7, 4, 2, 4];
      if (step % 2 === 0) {
        const n = pattern[(step / 2 + (seed % 3)) % 8] + chord;
        tone(
          degree(track, n) + (g === 'chiptune' ? 0 : 12),
          g === 'chiptune' ? 'chip' : 'lead',
          0.036 + t * 0.01,
          length * (g === 'chiptune' ? 0.7 : 1.2),
        );
      }
    }
  }
  return notes;
}
/** Bounded look-ahead; after a stall start fresh instead of playing missed beats. */
export function scheduleWindow(cursor, now, tempo, { ahead = 0.12, maxSteps = 4 } = {}) {
  if (!Number.isFinite(now) || !Number.isFinite(tempo) || tempo < 60 || tempo > 180)
    throw new TypeError(t('interface:invalidSchedulingClockTempo'));
  if (
    !Number.isFinite(ahead) ||
    ahead <= 0 ||
    ahead > 0.5 ||
    !Number.isInteger(maxSteps) ||
    maxSteps < 1 ||
    maxSteps > 16
  )
    throw new TypeError(t('interface:invalidSchedulingBounds'));
  let index = cursor?.index ?? 0,
    time = cursor?.time ?? now + 0.025;
  if (!Number.isInteger(index) || index < 0 || !Number.isFinite(time))
    throw new TypeError(t('interface:invalidMusicCursor'));
  if (time < now - 0.05) time = now + 0.025;
  const steps = [];
  while (time < now + ahead && steps.length < maxSteps) {
    steps.push({ index, time: Math.max(time, now + 0.002) });
    index++;
    time += 60 / tempo / 4;
  }
  return { cursor: { index, time }, steps };
}
export function deriveTension(state = {}) {
  const cutting = state.player?.cutting ? 0.55 : 0,
    lowLife = state.lives === 1 ? 0.22 : 0;
  const danger =
    ['warning', 'active'].includes(state.encounter?.phase) ||
    state.enemies?.some((e) => e.bossPhase === 'warning' || e.bossPhase === 'active')
      ? 0.25
      : 0;
  const line = Math.min(0.2, (state.trail?.length || 0) / 120);
  return clamp(cutting + lowLife + danger + line, 0, 1);
}
