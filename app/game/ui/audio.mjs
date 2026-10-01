import { campaignVictoryMotif } from '../journey/campaign-feedback.mjs';
import { readMovementAudio } from './movement-audio.mjs';
import { FeedbackDirector } from './feedback-director.mjs';
import { readRadioAudio } from './radio-audio.mjs';
import { readMenuAudio } from './menu-audio.mjs';
import { t } from '../i18n/index.mjs';
import { createPublishedCues } from './published-audio.mjs';
import {
  MUSIC_STYLES,
  DEFAULT_TRACKS,
  validateTrack,
  composeStep,
  scheduleWindow,
  deriveTension,
  midiFrequency,
} from './music.mjs';
export { MUSIC_STYLES, DEFAULT_TRACKS };
// Existing procedural recipes have no file duration. A persistent rendition
// uses 32 four-beat bars before accepting an automatic authored track change.
export const SYNTH_SONG_STEPS = 32 * 16;
const trackFields = ['id', 'name', 'genre', 'tempo', 'root', 'scale'];
const sameTrack = (a, b) => trackFields.every((key) => a[key] === b[key]);
const clamp = (n, a, b) => Math.min(b, Math.max(a, n));
const voiceLimit = 64;
const playbackAudioSession = 'playback';
const defaultFactory = () => {
  const Audio = globalThis.AudioContext || globalThis.webkitAudioContext;
  if (!Audio) return null;
  return new Audio({ latencyHint: 'interactive' });
};

/**
 * iOS treats Web Audio as ambient unless the page requests a playback session.
 * Ambient audio obeys the iPhone Silent switch even while AudioContext reports
 * `running`, which leaves a progressing but inaudible game soundtrack.
 */
export function requestPlaybackAudioSession(audioSession = globalThis.navigator?.audioSession) {
  if (!audioSession || typeof audioSession !== 'object') return false;
  try {
    if (audioSession.type !== playbackAudioSession) audioSession.type = playbackAudioSession;
    return audioSession.type === playbackAudioSession;
  } catch {
    return false;
  }
}

export function releasePlaybackAudioSession(audioSession = globalThis.navigator?.audioSession) {
  if (!audioSession || typeof audioSession !== 'object') return false;
  try {
    if (audioSession.type === playbackAudioSession) audioSession.type = 'auto';
    return audioSession.type !== playbackAudioSession;
  } catch {
    return false;
  }
}

/** One shared context, independently controlled gain buses, original oscillator/noise instruments.
 * Only toggle/enable/resume create or resume audio; update never bypasses a gesture.
 */
export class Soundscape {
  constructor({ contextFactory = defaultFactory, persistentMusic = false, audioMaster } = {}) {
    if (typeof persistentMusic !== 'boolean')
      throw new TypeError('persistentMusic must be a boolean');
    this.enabled = false;
    this.menuSettings = readMenuAudio();
    this.radioSettings = readRadioAudio();
    this.movementSettings = readMovementAudio();
    this.feedbackDirector = new FeedbackDirector(this);
    this.persistentMusic = persistentMusic;
    this.context = null;
    this.contextFactory = contextFactory;
    this.track = { ...DEFAULT_TRACKS[0] };
    this.settings = { style: 'synthwave', master: 0.65, music: 0.55, sfx: 0.7 };
    this.paused = false;
    this.disposed = false;
    this.voices = new Set();
    this.cursor = null;
    this.musicActive = false;
    this.tension = 0;
    this.recentEvents = new Map();
    this.transition = 0;
    this.previewTransition = 0;
    this.previewUntil = null;
    this.pendingTrack = null;
    this.gameplayPaused = false;
    this.musicSuspendedAt = null;
    this.musicTransportPaused = false;
    this.songEndHandler = null;
    this.songEnded = null;
    this.publishedAudio = null;
    this.audioMaster = { muted: false, volume: 1 };
    this.releaseAudioMaster = audioMaster?.subscribe((state) => {
      this.audioMaster = state;
      if (state.muted) {
        this.stopVoices('sfx');
        this.stopVoices('menu');
      }
      this.applyVolumes();
    });
  }
  setPublishedAudio(readAudio) {
    this.publishedAudio?.close();
    this.publishedAudio = readAudio ? createPublishedCues({ sound: this, readAudio }) : null;
  }
  publishedCue(name) {
    if (!this.menuSettings.enabled || this.menuSettings.volume === 0) return false;
    return (
      this.publishedAudio?.play(name, { ui: true }) ||
      !!this.feedbackDirector.play(name, { ui: true, gain: 0.5, priority: 1 })
    );
  }
  getSettings() {
    return { ...this.settings, trackId: this.track.id };
  }
  musicState() {
    return {
      persistent: this.persistentMusic,
      active: this.enabled && !this.paused && this.musicActive && this.context?.state === 'running',
      suspended: this.paused,
      gameplayPaused: this.gameplayPaused,
      track: { ...this.track },
      pendingTrack: this.pendingTrack ? { ...this.pendingTrack } : null,
      step: this.cursor?.index ?? 0,
      songSteps: SYNTH_SONG_STEPS,
    };
  }
  /** Optional external playlist owner. Null preserves the original looping scheduler. */
  setSongEndHandler(handler) {
    if (handler !== null && typeof handler !== 'function')
      throw new TypeError('Song end handler must be a function or null');
    if (handler !== null && !this.persistentMusic)
      throw new TypeError(t('interface:aPlaylistRequiresPersistentMusic'));
    this.songEndHandler = handler;
  }
  pauseMusic() {
    this.musicTransportPaused = true;
    this.holdMusicClock();
    this.stopVoices('music');
    this.musicActive = false;
  }
  resumeMusic() {
    this.musicTransportPaused = false;
    if (this.persistentMusic && this.cursor && this.musicSuspendedAt !== null) {
      // Transport seeks may sit within a sixteenth. Keep their signed remainder;
      // the legacy lifecycle restore still uses its original backlog clamp.
      this.cursor = {
        index: this.cursor.index,
        time: this.context.currentTime + this.cursor.time - this.musicSuspendedAt,
      };
      this.musicSuspendedAt = null;
    } else this.restoreMusicClock();
  }
  musicPosition() {
    const step = 60 / this.track.tempo / 4,
      durationSeconds = SYNTH_SONG_STEPS * step;
    const now = this.musicSuspendedAt ?? this.context?.currentTime ?? 0;
    const positionSeconds = this.cursor
      ? clamp(this.cursor.index * step - (this.cursor.time - now), 0, durationSeconds)
      : 0;
    return { positionSeconds, durationSeconds };
  }
  seekMusic(seconds) {
    const step = 60 / this.track.tempo / 4,
      duration = SYNTH_SONG_STEPS * step;
    if (!Number.isFinite(seconds) || seconds < 0 || seconds > duration)
      throw new TypeError(t('interface:invalidSynthSeekPosition'));
    if (!this.context) return false;
    this.stopVoices('music');
    const now = this.context.currentTime,
      index = Math.floor(seconds / step);
    this.cursor = { index, time: now + index * step - seconds };
    this.musicSuspendedAt = this.musicTransportPaused || this.paused ? now : null;
    this.songEnded = null;
    return true;
  }
  get previewActive() {
    return !!(
      this.enabled &&
      !this.paused &&
      this.context &&
      this.previewUntil !== null &&
      this.context.currentTime < this.previewUntil
    );
  }
  cancelPreview() {
    ++this.previewTransition;
    this.previewUntil = null;
  }
  /** Explicit gesture audition, also while the game is paused or terminal.
   * Keep calling update() from the presentation loop; no timer creates a second scheduler.
   */
  async preview({ seconds = 4 } = {}) {
    if (!Number.isFinite(seconds) || seconds < 1 || seconds > 8)
      throw new TypeError(t('interface:previewDurationMustBe18Seconds'));
    const token = ++this.previewTransition;
    const enabled = await this.enable();
    if (
      token !== this.previewTransition ||
      !enabled ||
      this.paused ||
      this.disposed ||
      this.context?.state !== 'running'
    )
      return false;
    if (!this.persistentMusic) this.stopVoices('music');
    this.previewUntil = this.context.currentTime + seconds;
    if (!this.persistentMusic) this.cursor = null;
    this.update(false, { family: this.themeFamily });
    return true;
  }
  configure(options = {}) {
    for (const key of Object.keys(options))
      if (!['style', 'master', 'music', 'sfx'].includes(key))
        throw new TypeError(t('gameplay:unknownAudioSetting', { value1: key }));
    const next = { ...this.settings };
    for (const key of ['master', 'music', 'sfx'])
      if (options[key] !== undefined) {
        if (!Number.isFinite(options[key]) || options[key] < 0 || options[key] > 1)
          throw new TypeError(t('gameplay:volumeMustBe01', { value1: key }));
        next[key] = options[key];
      }
    if (options.style !== undefined) {
      const style = options.style === 'arcade-rock' ? 'rock' : options.style;
      if (!MUSIC_STYLES.some((s) => s.id === style))
        throw new TypeError(t('interface:unknownMusicStyle'));
      next.style = style;
    }
    if (next.style !== this.settings.style) {
      this.track = { ...DEFAULT_TRACKS.find((t) => t.genre === next.style) };
      if (this.persistentMusic) this.resetMusic();
      else {
        this.stopVoices('music');
        this.cursor = null;
      }
    }
    this.settings = next;
    this.applyVolumes();
    return this.getSettings();
  }
  setTrack(descriptor, { atBoundary = false } = {}) {
    if (typeof atBoundary !== 'boolean') throw new TypeError('atBoundary must be a boolean');
    const checked = validateTrack(descriptor);
    if (!checked.valid) throw new TypeError(checked.errors.join('; '));
    if (this.persistentMusic && sameTrack(this.track, descriptor)) {
      this.pendingTrack = null;
      return { ...this.track };
    }
    if (this.persistentMusic && atBoundary && this.cursor) {
      this.pendingTrack = { ...descriptor };
      return { ...this.pendingTrack };
    }
    this.track = { ...descriptor };
    this.settings.style = descriptor.genre;
    if (this.persistentMusic) this.resetMusic();
    else {
      this.stopVoices('music');
      this.cursor = null;
    }
    return { ...this.track };
  }
  resetMusic() {
    this.stopVoices('music');
    this.cursor = null;
    this.pendingTrack = null;
    this.musicSuspendedAt = null;
    this.musicActive = false;
    this.songEnded = null;
  }
  holdMusicClock() {
    if (this.persistentMusic && this.cursor && this.musicSuspendedAt === null)
      this.musicSuspendedAt = this.context.currentTime;
  }
  restoreMusicClock() {
    if (this.musicTransportPaused) return;
    if (this.persistentMusic && this.cursor && this.musicSuspendedAt !== null)
      this.cursor = {
        index: this.cursor.index,
        time: this.context.currentTime + Math.max(0, this.cursor.time - this.musicSuspendedAt),
      };
    this.musicSuspendedAt = null;
  }
  setup() {
    if (this.context) return true;
    const context = this.contextFactory();
    if (!context) return false;
    this.context = context;
    this.master = context.createGain();
    this.musicBus = context.createGain();
    this.sfxBus = context.createGain();
    this.menuBus = context.createGain();
    this.movementBus = context.createGain();
    this.movementBus.connect(this.sfxBus);
    this.radioBus = context.createGain();
    this.radioBus.connect(this.sfxBus);
    this.menuBus.connect(this.master);
    this.musicBus.connect(this.master);
    this.sfxBus.connect(this.master);
    if (context.createWaveShaper) {
      const curve = Float32Array.from({ length: 256 }, (_, i) =>
        Math.tanh(((i / 255) * 2 - 1) * 3),
      );
      this.musicDrive = context.createWaveShaper();
      this.sfxDrive = context.createWaveShaper();
      for (const [node, bus] of [
        [this.musicDrive, this.musicBus],
        [this.sfxDrive, this.sfxBus],
      ]) {
        node.curve = curve;
        node.oversample = 'none';
        node.connect(bus);
      }
    }
    this.compressor = context.createDynamicsCompressor?.();
    if (this.compressor) {
      this.compressor.threshold.value = -12;
      this.compressor.knee.value = 12;
      this.compressor.ratio.value = 5;
      this.master.connect(this.compressor);
      this.compressor.connect(context.destination);
    } else this.master.connect(context.destination);
    const length = Math.ceil(context.sampleRate * 0.25);
    this.noise = context.createBuffer(1, length, context.sampleRate);
    const data = this.noise.getChannelData(0);
    let seed = 0x17a2;
    for (let i = 0; i < length; i++) {
      seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
      data[i] = seed / 0x80000000 - 1;
    }
    this.applyVolumes();
    return true;
  }
  applyVolumes() {
    if (!this.context) return;
    const time = this.context.currentTime;
    this.movementBus?.gain.setTargetAtTime(
      this.movementSettings.enabled ? this.movementSettings.volume : 0,
      time,
      0.027,
    );
    if (!this.movementSettings.enabled || this.movementSettings.volume === 0)
      for (const voice of [...this.voices]) if (voice.movement) voice.stop();
    this.radioBus?.gain.setTargetAtTime(
      this.radioSettings.enabled ? this.radioSettings.volume : 0,
      time,
      0.015,
    );
    if (!this.radioSettings.enabled || this.radioSettings.volume === 0)
      for (const voice of [...this.voices]) if (voice.radio) voice.stop();
    this.menuBus?.gain.setTargetAtTime(
      this.menuSettings.enabled ? this.menuSettings.volume : 0,
      time,
      0.015,
    );
    for (const [node, key] of [
      [this.master, 'master'],
      [this.musicBus, 'music'],
      [this.sfxBus, 'sfx'],
    ]) {
      node.gain.cancelScheduledValues(time);
      const masterGain = this.audioMaster.muted ? 0 : this.audioMaster.volume;
      const value = this.enabled ? this.settings[key] * (key === 'master' ? masterGain : 1) : 0;
      if (key === 'master' && masterGain === 0) node.gain.setValueAtTime(0, time);
      else node.gain.setTargetAtTime(value, time, 0.015);
    }
  }
  async enable() {
    if (this.disposed) return false;
    const token = ++this.transition;
    // Must happen before context creation/resume in the same user activation.
    requestPlaybackAudioSession();
    if (!this.setup()) return false;
    this.feedbackDirector.prepare();
    if (this.persistentMusic && this.enabled && !this.paused && this.context.state === 'running') {
      this.gameplayPaused = false;
      return true;
    }
    try {
      await this.context.resume();
      if (token !== this.transition || this.disposed) return this.enabled;
      this.enabled = this.context.state === 'running';
      this.paused = false;
      this.gameplayPaused = false;
      if (this.persistentMusic) this.restoreMusicClock();
      else this.cursor = null;
      this.applyVolumes();
      return this.enabled;
    } catch {
      if (token === this.transition) {
        this.enabled = false;
        this.applyVolumes();
      }
      return false;
    }
  }
  async toggle() {
    if (this.disposed) return false;
    if (!this.enabled) return this.enable();
    return this.disable();
  }
  /** Apply a stored mute preference synchronously. This never creates a context
   * and invalidates pending enable/preview actions; resume cannot undo it.
   */
  disable() {
    this.publishedAudio?.cancelPending();
    ++this.transition;
    this.enabled = false;
    this.paused = true;
    this.gameplayPaused = true;
    this.musicActive = false;
    this.cancelPreview();
    this.holdMusicClock();
    this.stopVoices();
    if (!this.persistentMusic) this.cursor = null;
    this.applyVolumes();
    try {
      void Promise.resolve(this.context?.suspend()).catch(() => {});
    } catch {}
    releasePlaybackAudioSession();
    return false;
  }
  pause() {
    if (this.persistentMusic) {
      this.gameplayPaused = true;
      this.cancelPreview();
      this.stopVoices('sfx');
      this.tension = 0;
      return;
    }
    this.suspend();
  }
  /** Full lifecycle interruption; ordinary persistent-mode pause is gameplay only. */
  suspend() {
    this.publishedAudio?.cancelPending();
    ++this.transition;
    this.cancelPreview();
    this.paused = true;
    this.gameplayPaused = true;
    this.musicActive = false;
    this.holdMusicClock();
    if (!this.persistentMusic) this.cursor = null;
    this.stopVoices();
    if (this.context?.state === 'running') void this.context.suspend().catch(() => {});
  }
  async resume() {
    if (!this.enabled || this.disposed) return false;
    const token = ++this.transition;
    requestPlaybackAudioSession();
    if (this.persistentMusic && !this.paused && this.context.state === 'running') {
      this.gameplayPaused = false;
      return true;
    }
    try {
      await this.context.resume();
      if (token !== this.transition || this.disposed) return false;
      this.paused = false;
      this.gameplayPaused = false;
      if (this.persistentMusic) this.restoreMusicClock();
      else this.cursor = null;
      return this.context.state === 'running';
    } catch {
      return false;
    }
  }
  reset() {
    this.feedbackDirector.reset();
    this.cancelPreview();
    this.stopVoices(this.persistentMusic ? 'sfx' : null);
    if (!this.persistentMusic) this.cursor = null;
    this.tension = 0;
    this.recentEvents.clear();
  }
  stopVoices(bus = null) {
    for (const voice of [...this.voices]) if (!bus || voice.bus === bus) voice.stop();
  }
  async dispose() {
    if (this.disposed) return;
    this.disposed = true;
    this.releaseAudioMaster?.();
    this.feedbackDirector.close();
    this.setPublishedAudio(null);
    this.cancelPreview();
    ++this.transition;
    this.enabled = false;
    this.stopVoices();
    this.cursor = null;
    this.pendingTrack = null;
    this.musicSuspendedAt = null;
    for (const node of [
      this.musicDrive,
      this.sfxDrive,
      this.musicBus,
      this.sfxBus,
      this.menuBus,
      this.radioBus,
      this.movementBus,
      this.master,
      this.compressor,
    ])
      try {
        node?.disconnect();
      } catch {}
    try {
      await this.context?.close();
    } catch {}
    releasePlaybackAudioSession();
    this.context = null;
    this.noise = null;
  }
  play(note, time, bus = 'sfx') {
    const c = this.context;
    if (!this.enabled || this.paused || this.disposed || !c || c.state !== 'running') return false;
    if (this.persistentMusic && this.gameplayPaused && bus === 'sfx') return false;
    if (this.voices.size >= voiceLimit) {
      const music = [...this.voices].find((v) => v.bus === 'music');
      if (music) music.stop();
      else return false;
    }
    if (this.settings[bus] === 0 || this.settings.master === 0) return false;
    if (note.volume === 0) return false;
    const duration = clamp(note.duration || 0.12, 0.02, 2.5),
      start = Math.max(c.currentTime + 0.001, time),
      nodes = [],
      gain = c.createGain();
    nodes.push(gain);
    let source,
      filter = null;
    if (['hat', 'snare'].includes(note.kind)) {
      source = c.createBufferSource();
      source.buffer = this.noise;
      filter = c.createBiquadFilter();
      filter.type = note.kind === 'hat' ? 'highpass' : 'bandpass';
      filter.frequency.value = note.kind === 'hat' ? 6500 : 1600;
      filter.Q.value = note.kind === 'hat' ? 0.5 : 0.7;
    } else {
      source = c.createOscillator();
      source.type =
        note.kind === 'kick'
          ? 'sine'
          : {
              bass: 'triangle',
              pad: 'sawtooth',
              lead: 'triangle',
              chip: 'square',
              guitar: 'sawtooth',
              bell: 'sine',
            }[note.voice] || 'triangle';
      const freq = clamp(note.frequency || 120, 30, 5000);
      source.frequency.setValueAtTime(note.kind === 'kick' ? 145 : freq, start);
      if (note.kind === 'kick') source.frequency.exponentialRampToValueAtTime(44, start + duration);
      if (note.voice === 'guitar' || note.voice === 'pad') {
        filter = c.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(note.voice === 'guitar' ? 2400 : 1200, start);
        filter.frequency.exponentialRampToValueAtTime(
          note.voice === 'guitar' ? 500 : 750,
          start + duration,
        );
        filter.Q.value = 0.7;
      }
    }
    nodes.push(source);
    if (filter) {
      nodes.push(filter);
      source.connect(filter);
      filter.connect(gain);
    } else source.connect(gain);
    const destination = bus === 'music' ? this.musicBus : this.sfxBus,
      drive = bus === 'music' ? this.musicDrive : this.sfxDrive;
    gain.connect(note.voice === 'guitar' && drive ? drive : destination);
    const attack = note.voice === 'pad' ? 0.07 : 0.005,
      volume = clamp(note.volume ?? 0.035, 0.001, 0.3);
    gain.gain.setValueAtTime(0.0001, start);
    gain.gain.linearRampToValueAtTime(volume, start + Math.min(attack, duration / 3));
    gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);
    let ended = false;
    const voice = {
      bus,
      stop: () => {
        if (ended) return;
        ended = true;
        try {
          source.stop();
        } catch {}
        for (const n of nodes)
          try {
            n.disconnect();
          } catch {}
        this.voices.delete(voice);
      },
    };
    source.onended = voice.stop;
    this.voices.add(voice);
    source.start(start);
    source.stop(start + duration + 0.015);
    return true;
  }
  tone(frequency, duration = 0.1, volume = 0.025, type = 'triangle', offset = 0) {
    return this.play(
      {
        kind: 'tone',
        frequency,
        duration,
        volume,
        voice: type === 'square' ? 'chip' : type === 'sawtooth' ? 'guitar' : 'lead',
      },
      (this.context?.currentTime || 0) + offset,
    );
  }
  feedback(active, theme, run, options = {}) {
    if (active && run?.status === 'running' && this.enabled && !this.paused)
      this.gameplayPaused = false;
    this.feedbackDirector.update(active, theme, run, options);
  }
  events(events, run, theme, options = {}) {
    this.feedbackDirector.events(events, run, theme, options);
  }
  event(value, details = {}, resultContext = null) {
    const event = typeof value === 'string' ? { ...details, type: value } : value;
    if (
      !event ||
      !this.enabled ||
      this.paused ||
      (this.persistentMusic && this.gameplayPaused) ||
      !this.context
    )
      return;
    const now = this.context.currentTime,
      key =
        event.type === 'run.completed'
          ? `${event.type}:${event.levelId || ''}:${event.tick ?? ''}`
          : event.type;
    if (
      this.recentEvents.has(key) &&
      now - this.recentEvents.get(key) < (event.type === 'run.completed' ? 5 : 0.09)
    )
      return;
    this.recentEvents.set(key, now);
    if (this.recentEvents.size > 64)
      this.recentEvents.delete(this.recentEvents.keys().next().value);
    const publishedCue =
      event.type === 'run.completed'
        ? event.won === false || event.status === 'lost'
          ? 'failure'
          : 'victory'
        : {
            'player.failed': 'failure',
            'cells.claimed': 'capture',
            'pickup.collected': 'pickup',
            'powerup.collected': 'pickup',
          }[event.type];
    if (publishedCue && this.publishedAudio?.play(publishedCue)) return;
    const base = clamp(this.track.root + 12, 48, 76),
      cue = (steps, voice = 'bell', spacing = 0.09, duration = 0.25) =>
        steps.forEach((n, i) =>
          this.play(
            { kind: 'tone', frequency: midiFrequency(base + n), voice, volume: 0.08, duration },
            now + 0.015 + i * spacing,
          ),
        );
    if (event.type === 'run.completed') {
      if (!this.persistentMusic) {
        this.stopVoices('music');
        this.musicActive = false;
        this.cursor = null;
      }
      if (event.won === false || event.status === 'lost') {
        cue([0, -3, -7, -12], 'lead', 0.16, 0.38);
        this.play({ kind: 'snare', volume: 0.07, duration: 0.22 }, now + 0.02);
      } else {
        const phrase =
          campaignVictoryMotif(resultContext) ??
          (this.themeFamily === 'atlas'
            ? [0, 5, 7, 12, 14, 12]
            : this.themeFamily === 'navi'
              ? [0, 4, 9, 7, 12, 16]
              : [0, 4, 7, 12, 7, 12]);
        cue(phrase, this.themeFamily === 'retro' ? 'chip' : 'bell', 0.13, 0.4);
        for (const n of [0, 4, 7])
          this.play(
            {
              kind: 'tone',
              frequency: midiFrequency(base + n),
              voice: 'pad',
              volume: 0.045,
              duration: 1.1,
            },
            now + 0.68,
          );
      }
    } else if (event.type === 'player.failed') cue([0, -5, -12], 'lead', 0.065, 0.17);
    else if (event.type === 'cells.claimed') cue([0, 4, 7], 'bell', 0.04, 0.2);
    else if (event.type === 'cells.eroded') cue([7, 3, 0], 'chip', 0.07, 0.12);
    else if (event.type === 'powerup.collected') {
      const notes = {
        'extra-life': [0, 4, 7, 12],
        'player-speed': [0, 7, 14],
        'enemy-slow': [12, 7, 4],
        'enemy-freeze': [12, 0, 12],
      }[event.kind];
      if (notes) cue(notes, 'bell', 0.055, 0.18);
    } else if (event.type === 'cut.started') cue([0, 7], 'chip', 0.035, 0.05);
    else if (event.type === 'encounter.phaseChanged' && event.phase === 'open')
      cue([0, 7, 12], 'bell', 0.08, 0.16);
    else if (event.type === 'encounter.stageChanged' && event.stage === 'transition')
      cue([0, 4, 9], 'pad', 0.1, 0.16);
    else if (
      event.type === 'boss.warning' ||
      event.type === 'signal.warning' ||
      event.type === 'rover.warning' ||
      event.type === 'erosion.warning' ||
      (event.type === 'encounter.phaseChanged' && event.phase === 'warning')
    )
      cue([1, 1], 'chip', 0.16, 0.1);
    else if (event.type === 'shield.absorbed') cue([7, 0, 12], 'bell', 0.045, 0.18);
    else if (
      event.type === 'ability.used' ||
      event.type === 'pickup.collected' ||
      event.type === 'class.switched'
    )
      cue([7, 12], 'lead', 0.05, 0.13);
    else if (event.type === 'craft.redeployed') cue([0, -5, 7], 'guitar', 0.04, 0.15);
  }
  update(active, theme, state = {}) {
    this.themeFamily = theme?.family || theme?.id || 'fpv';
    if (
      !this.enabled ||
      this.paused ||
      this.disposed ||
      !this.context ||
      this.context.state !== 'running'
    )
      return;
    const terminal = state.status === 'won' || state.status === 'lost';
    if (this.persistentMusic) this.gameplayPaused = !active || terminal;
    if (this.musicTransportPaused) return;
    const preview = this.previewActive;
    if (!preview) this.previewUntil = null;
    if ((!active || terminal) && !preview && !this.persistentMusic) {
      if (this.musicActive) {
        this.stopVoices('music');
        this.cursor = null;
      }
      this.musicActive = false;
      return;
    }
    this.musicActive = true;
    this.tension = preview || !active || terminal ? 0 : deriveTension(state);
    const planned = this.persistentMusic
      ? this.persistentWindow(this.context.currentTime)
      : scheduleWindow(this.cursor, this.context.currentTime, this.track.tempo);
    this.cursor = planned.cursor;
    for (const step of planned.steps) {
      // A preview cannot leave a sustained note behind when a tab stops painting.
      const remaining =
        preview && !this.persistentMusic
          ? this.previewUntil - step.time - 0.015
          : (step.remaining ?? Infinity);
      if (remaining < 0.02) continue;
      for (const note of composeStep(step.track ?? this.track, step.index, this.tension))
        this.play({ ...note, duration: Math.min(note.duration, remaining) }, step.time, 'music');
    }
    const ended = this.songEnded;
    this.songEnded = null;
    if (ended) this.songEndHandler?.(ended);
  }
  persistentWindow(now) {
    let cursor = this.cursor;
    const steps = [];
    // One step at a time permits a tempo change exactly at the authored boundary,
    // while retaining the shared scheduler's four-step look-ahead/backlog bounds.
    for (let n = 0; n < 4; n++) {
      if (cursor?.index === SYNTH_SONG_STEPS && this.songEndHandler) {
        // External queues wait for the audible boundary, not the look-ahead window.
        if (cursor.time <= now) {
          this.musicTransportPaused = true;
          this.musicSuspendedAt = cursor.time;
          this.musicActive = false;
          this.songEnded = Object.freeze({ trackId: this.track.id });
        }
        break;
      }
      if (cursor?.index === SYNTH_SONG_STEPS && cursor.time < now + 0.12) {
        if (this.pendingTrack) {
          this.track = this.pendingTrack;
          this.settings.style = this.track.genre;
          this.pendingTrack = null;
        }
        cursor = { index: 0, time: cursor.time };
      }
      const next = scheduleWindow(cursor, now, this.track.tempo, { maxSteps: 1 });
      if (!next.steps.length) break;
      const step = next.steps[0];
      steps.push({
        ...step,
        track: this.track,
        remaining: (SYNTH_SONG_STEPS - step.index) * (60 / this.track.tempo / 4) - 0.015,
      });
      cursor = next.cursor;
    }
    return { cursor, steps };
  }
}
