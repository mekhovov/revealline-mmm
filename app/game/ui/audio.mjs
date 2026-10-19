import { createGameplayAudioOutput } from './gameplay-audio-output.mjs';
import { createMediaPreparation } from './media-preparation.mjs';
import { createHumanReactionPolicy } from './human-reaction-policy.mjs';
import { DEFAULT_DIALOGUE_VOLUME, DIALOGUE_MIX_GAIN } from '../audio/dialogue-mix.mjs';
import { encounterSoundRecipe } from './encounter-audio.mjs';
import { eventCue } from './feedback-cues.mjs';
import {
  createGameAudioContext,
  createGameAudioOutput,
  requestPlaybackAudioSession,
  releasePlaybackAudioSession,
} from './audio-output.mjs';
export { requestPlaybackAudioSession, releasePlaybackAudioSession } from './audio-output.mjs';
import { dialogueChannel } from './dialogue-channel.mjs';
import { campaignVictoryMotif } from '../journey/campaign-feedback.mjs';
import { readMovementAudio } from './movement-audio.mjs';
import { FeedbackDirector } from './feedback-director.mjs';
import { readRadioAudio } from './radio-audio.mjs';
import { readMenuAudio } from './menu-audio.mjs';
import { t } from '../i18n/index.mjs';
import { createPublishedCues, CUE_CACHE_BYTES } from './published-audio.mjs';
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
const defaultFactory = () => createGameAudioContext();

/** One shared context, independently controlled gain buses, original oscillator/noise instruments.
 * Only toggle/enable/resume create or resume audio; update never bypasses a gesture.
 */
export class Soundscape {
  constructor({
    contextFactory = defaultFactory,
    persistentMusic = false,
    audioMaster,
    window,
    getStorage,
  } = {}) {
    if (typeof persistentMusic !== 'boolean')
      throw new TypeError('persistentMusic must be a boolean');
    this.gameplayOutput = createGameplayAudioOutput({ window, getStorage });
    this.enabled = false;
    this.menuSettings = readMenuAudio();
    this.radioSettings = readRadioAudio();
    this.movementSettings = readMovementAudio();
    this.dialogueSettings = { enabled: false, volume: DEFAULT_DIALOGUE_VOLUME };
    this.mediaPreparation = createMediaPreparation();
    this.feedbackDirector = new FeedbackDirector(this);
    this.humanReactions = createHumanReactionPolicy();
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
    this.publishedOwnerState = 'never-created';
    this.audioMaster = { muted: false, volume: 1 };
    this.releaseAudioMaster = audioMaster?.subscribe((state) => {
      this.audioMaster = state;
      if (state.muted || state.volume === 0) {
        this.stopVoices('sfx');
        this.stopVoices('menu');
        this.stopVoices('dialogue');
      }
      this.applyVolumes();
      this.mediaPreparation.refresh();
    });
  }
  setPreparationPhase(phase) {
    this.mediaPreparation.setPhase(phase);
  }
  resourceSnapshot() {
    // Export-time reads only: never initialize a context or touch PCM sample data.
    const state = this.disposed
      ? 'disposed'
      : (this.publishedOwnerState === 'active' && !this.publishedAudio) ||
          (this.publishedOwnerState === 'never-created' && this.publishedAudio)
        ? 'unavailable'
        : this.publishedOwnerState;
    return {
      effects: this.feedbackDirector.resourceSnapshot(),
      publishedOwner: { format: 'SoloOptionalOwnerStateV1', state },
      published:
        this.publishedAudio?.resourceSnapshot() ??
        (state === 'never-created'
          ? { decodedBytes: 0, decodedBytesLimit: CUE_CACHE_BYTES, cacheEntries: 0, loading: 0 }
          : null),
      proceduralNoise: {
        buffers: Number(!!this.noise),
        decodedBytes: (this.noise?.length ?? 0) * (this.noise?.numberOfChannels ?? 0) * 4,
        durationLimitSeconds: 0.25,
      },
      accounting:
        'Retained cache PCM and the owned noise buffer only, at four bytes per sample. Active voices may share these buffers or retain evicted buffers. Native decoder/storage copies, streamed media, synthesizer nodes and browser overhead are excluded. Admission reservations are separate declared estimates and must not be added as measured native memory.',
    };
  }
  prepareGameplayAudio(names) {
    return this.feedbackDirector.prepare(names);
  }
  setPublishedAudio(readAudio) {
    if (this.publishedAudio) this.publishedOwnerState = 'retired';
    try {
      this.publishedAudio?.close();
      if (readAudio) {
        // Enter before construction: a thrown constructor must never imply zero ownership.
        this.publishedOwnerState = 'creating';
        this.publishedAudio = createPublishedCues({ sound: this, readAudio });
        this.publishedOwnerState = 'active';
      } else this.publishedAudio = null;
      if (this.disposed) this.publishedOwnerState = 'disposed';
    } catch (error) {
      this.publishedOwnerState = 'failed';
      throw error;
    }
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
  configureDialogue({
    enabled = this.dialogueSettings.enabled,
    volume = this.dialogueSettings.volume,
  } = {}) {
    if (typeof enabled !== 'boolean' || !Number.isFinite(volume) || volume < 0 || volume > 1)
      throw new TypeError('Dialogue requires an enabled boolean and volume from zero to one.');
    this.dialogueSettings = { enabled, volume };
    if (!enabled || volume === 0) this.stopVoices('dialogue');
    this.applyVolumes();
  }
  setDestructionPreferences(read) {
    if (typeof read !== 'function')
      throw new TypeError('A destruction preference reader is required.');
    this.readDestruction = read;
  }
  /** Ready buffers only: loading never replays an event after it has expired. */
  playDialogue(buffer, { onended = () => {}, ui = false } = {}) {
    const c = this.context;
    if (
      !buffer ||
      !this.enabled ||
      this.paused ||
      (this.gameplayPaused && ui !== true) ||
      this.disposed ||
      this.audioMaster.muted ||
      this.audioMaster.volume === 0 ||
      this.settings.master === 0 ||
      !this.dialogueSettings.enabled ||
      this.dialogueSettings.volume === 0 ||
      !c ||
      c.state !== 'running' ||
      !this.dialogueBus
    )
      return null;
    if (
      [...this.voices].some(
        (voice) => voice.feedback && voice.priority >= 5 && voice.name === 'warning',
      )
    )
      return null;
    this.stopVoices('dialogue');
    for (const voice of [...this.voices]) if (voice.radio) voice.stop();
    const source = c.createBufferSource(),
      gain = c.createGain();
    source.buffer = buffer;
    source.connect(gain);
    gain.connect(this.dialogueBus);
    let ended = false;
    const voice = {
      bus: 'dialogue',
      dialogue: true,
      priority: 1,
      source,
      stop: () => {
        if (ended) return;
        ended = true;
        try {
          source.stop();
        } catch {
          /* The source can already be ended. */
        }
        source.disconnect();
        gain.disconnect();
        this.voices.delete(voice);
        dialogueChannel.release(voice);
        try {
          onended();
        } catch {
          /* Presentation observers cannot retain a voice. */
        }
      },
      get ended() {
        return ended;
      },
    };
    source.onended = voice.stop;
    dialogueChannel.claim(voice);
    this.voices.add(voice);
    try {
      source.start();
    } catch {
      voice.stop();
      return null;
    }
    return voice;
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
    if (Object.keys(next).every((key) => next[key] === this.settings[key]))
      return this.getSettings();
    if (next.style !== this.settings.style) {
      this.track = { ...DEFAULT_TRACKS.find((t) => t.genre === next.style) };
      if (this.persistentMusic) this.resetMusic();
      else {
        this.stopVoices('music');
        this.cursor = null;
      }
    }
    this.settings = next;
    if (next.master === 0) this.stopVoices('dialogue');
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
    Object.assign(this, createGameAudioOutput(context));
    this.gameplayOutput.attach(this);
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
    this.dialogueBus?.gain.setTargetAtTime(
      this.dialogueSettings.enabled ? this.dialogueSettings.volume * DIALOGUE_MIX_GAIN : 0,
      time,
      0.015,
    );
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
  pause({ preserveDestruction = false } = {}) {
    this.stopVoices('dialogue');
    if (this.persistentMusic) {
      this.gameplayPaused = true;
      this.cancelPreview();
      for (const voice of [...this.voices])
        if (voice.bus === 'sfx' && !(preserveDestruction && voice.name?.startsWith('destroy-')))
          voice.stop();
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
    this.stopVoices('dialogue');
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
    this.gameplayOutput.dispose();
    this.feedbackDirector.close();
    this.mediaPreparation.close();
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
      this.gameplayBus,
      this.sfxBus,
      this.menuBus,
      this.radioBus,
      this.dialogueBus,
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
    if (bus === 'menu' && (!this.menuSettings.enabled || this.menuSettings.volume === 0))
      return false;
    if (note.encounter === true) {
      // Procedural event phrases obey the recorded-cue headroom for every
      // layer. They may replace quieter feedback, but never steal music.
      const owned = [...this.voices].filter((voice) => voice.feedback);
      if (owned.length >= 16 || this.voices.size >= voiceLimit) {
        const victim = owned
          .filter((voice) => voice.priority < (note.priority ?? 0))
          .sort((a, b) => a.priority - b.priority)[0];
        if (!victim) return false;
        victim.stop();
      }
    }
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
      filter.frequency.value = Number.isFinite(note.filterFrequency)
        ? clamp(note.filterFrequency, 80, 8000)
        : note.kind === 'hat'
          ? 6500
          : 1600;
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
              chime: 'sine',
              bloom: 'sine',
            }[note.voice] || 'triangle';
      const freq = clamp(note.frequency || 120, 30, 5000);
      source.frequency.setValueAtTime(note.kind === 'kick' ? 145 : freq, start);
      if (['sine', 'triangle', 'square'].includes(note.wave)) source.type = note.wave;
      if (Number.isFinite(note.endFrequency))
        source.frequency.exponentialRampToValueAtTime(
          clamp(note.endFrequency, 30, 5000),
          start + duration,
        );
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
    const destination =
        bus === 'music'
          ? this.musicBus
          : bus === 'menu'
            ? this.menuBus
            : note.movement
              ? this.movementBus
              : this.sfxBus,
      drive = bus === 'music' ? this.musicDrive : bus === 'menu' ? null : this.sfxDrive;
    const output = note.voice === 'guitar' && drive ? drive : destination;
    if (Number.isFinite(note.pan) && c.createStereoPanner) {
      const panner = c.createStereoPanner();
      panner.pan.setValueAtTime(clamp(note.pan, -1, 1), start);
      gain.connect(panner);
      panner.connect(output);
      nodes.push(panner);
    } else gain.connect(output);
    const attack = { pad: 0.07, chime: 0.012, bloom: 0.12 }[note.voice] ?? 0.005,
      volume = clamp(note.volume ?? 0.035, 0.001, 0.3);
    gain.gain.setValueAtTime(0.0001, start);
    gain.gain.linearRampToValueAtTime(volume, start + Math.min(attack, duration / 3));
    gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);
    let ended = false;
    const voice = {
      bus,
      source,
      feedback: note.encounter === true,
      ambience: note.ambience === true,
      movement: note.movement === true,
      name: note.cueName,
      cueFamily: note.cueName,
      board: note.board,
      priority: note.priority ?? 0,
      get ended() {
        return ended;
      },
      retire: () => voice.stop(),
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
  setActorPresentation(read) {
    if (typeof read !== 'function') throw new TypeError('Actor presentation reader required.');
    this.readActorPresentation = read;
  }
  feedback(active, theme, run, options = {}) {
    if (active && run?.status === 'running' && this.enabled && !this.paused)
      this.gameplayPaused = false;
    this.feedbackDirector.update(active, theme, run, {
      ...this.readActorPresentation?.(),
      ...options,
    });
  }
  /** Optional humanoid feedback, independent of visual gore. Missing bytes keep
   * the classic impact; never replay later. */
  humanReaction(details = {}) {
    const c = this.context;
    if (
      !this.enabled ||
      this.paused ||
      this.gameplayPaused ||
      this.disposed ||
      this.audioMaster.muted ||
      this.audioMaster.volume === 0 ||
      c?.state !== 'running' ||
      !this.settings.master ||
      !this.settings.sfx
    )
      return false;
    const voices = [...this.voices];
    if (voices.some((voice) => voice.radio || voice.dialogue || voice.priority >= 5)) return false;
    const name = this.humanReactions.request(
      c.currentTime,
      {
        ...details,
        // Either the player's opt-out or a host concealment rule may veto a
        // voice. Enabling the global preference must not undo jamming silence.
        vocals: details.vocals !== false && this.readDestruction?.()?.vocals !== false,
      },
      voices.filter((voice) => voice.humanReaction).length,
    );
    if (!name) return false;
    const options = {
      board: details.board ?? 'solo',
      pan: details.pan ?? 0,
      humanReaction: true,
      priority: 2,
      feedback: true,
      maxDuration: 0.7,
      gain: 0.45,
    };
    return (
      this.publishedAudio?.play(name, options) || Boolean(this.feedbackDirector.play(name, options))
    );
  }
  /** Shared enemy, machinery and tactical cues, including an offline fallback. */
  encounter(type, details = {}) {
    const recipe = encounterSoundRecipe(type, details),
      c = this.context;
    if (
      !recipe ||
      details.audible === false ||
      !this.enabled ||
      this.paused ||
      this.gameplayPaused ||
      this.disposed ||
      this.audioMaster.muted ||
      this.audioMaster.volume === 0 ||
      !c ||
      c.state !== 'running' ||
      this.settings.master === 0 ||
      this.settings.sfx === 0
    )
      return false;
    if (
      recipe.gain === 0 ||
      (recipe.ambience &&
        [...this.voices].some((voice) => voice.radio || voice.dialogue || voice.priority >= 5)) ||
      (recipe.movement &&
        (!this.movementSettings.enabled ||
          this.movementSettings.volume === 0 ||
          [...this.voices].some((voice) => voice.feedback && voice.priority >= 4)))
    )
      return false;
    const board = details.board ?? 'solo',
      // Friendly clearing must not reserve the player's damage cue on the next
      // frame. Keep exactly two bounded impact channels; arbitrary semantics
      // cannot create additional cooldown buckets.
      cooldownType =
        type === 'impact' && details.semantic === 'friendly-impact'
          ? 'friendly-impact'
          : (recipe.category ?? type),
      key = `encounter:${board}:${cooldownType}`;
    if (
      c.currentTime - (this.recentEvents.get(key) ?? -Infinity) <
      (recipe.cooldown ??
        (type === 'warning' ? 0.3 : ['notice', 'recover', 'blocked'].includes(type) ? 0.65 : 0.12))
    )
      return false;
    this.recentEvents.set(key, c.currentTime);
    if (recipe.priority >= 5 || details.semantic === 'armor-break') {
      this.humanReactions?.interrupt(c.currentTime);
      for (const voice of [...this.voices]) if (voice.humanReaction) voice.retire();
    }
    if (recipe.priority >= 5 || details.semantic === 'armor-break')
      for (const voice of [...this.voices]) if (voice.ambience) voice.stop();
    if (type === 'catch') this.humanReaction?.(details);
    if (this.recentEvents.size > 64)
      this.recentEvents.delete(this.recentEvents.keys().next().value);
    // A warning arriving later in the same transaction owns the foreground.
    // Only short movement accents are shed; continuous player rotors remain.
    if (recipe.priority >= 4)
      for (const voice of [...this.voices])
        if (voice.feedback && voice.movement && !voice.source?.loop) voice.stop();
    const ownership = { ...recipe, board, pan: details.pan ?? 0, feedback: true };
    // Published destruction replacements use the same bus, headroom and lifetime.
    if (recipe.category && this.publishedAudio?.play(recipe.name, ownership)) return true;
    if (!recipe.procedural && this.feedbackDirector.play(recipe.name, ownership)) return true;
    const reserveFallback = () => {
      const owned = [...this.voices].filter((voice) => voice.feedback);
      if (this.voices.size < 64 && owned.length < 16) return true;
      const victim = owned
        .filter((voice) => voice.priority < recipe.priority)
        .sort((a, b) => a.priority - b.priority)[0];
      if (!victim) return false;
      victim.stop();
      return true;
    };
    if (recipe.priority >= 5) dialogueChannel.interrupt();
    // Missing samples remain audible now; a late decode never replays a death.
    let played = false;
    for (const layer of [recipe.tone, ...(recipe.layers ?? [])]) {
      if (!reserveFallback()) break;
      played =
        this.play(
          {
            kind: layer.kind ?? 'tone',
            encounter: true,
            ambience: recipe.ambience,
            movement: recipe.movement,
            cueName: recipe.name,
            board,
            priority: recipe.priority,
            frequency: layer.from,
            filterFrequency: layer.filterFrequency,
            endFrequency: layer.to,
            duration: layer.duration,
            volume: layer.gain,
            voice: 'lead',
            wave: layer.type,
            pan: details.pan ?? 0,
          },
          c.currentTime + (layer.delay ?? 0),
        ) || played;
    }
    return played;
  }

  events(events, run, theme, options = {}) {
    this.feedbackDirector.events(events, run, theme, options);
  }
  event(value, details = {}, resultContext = null) {
    const event = typeof value === 'string' ? { ...details, type: value } : value;
    // A host-owned result can finish after gameplay has paused. Other events
    // cannot opt out of gameplay pause by passing an arbitrary UI flag.
    const ui = event?.type === 'run.completed' && event.ui === true;
    if (
      !event ||
      !this.enabled ||
      this.paused ||
      this.audioMaster.muted ||
      this.audioMaster.volume === 0 ||
      ((this.persistentMusic || event.feedback) && this.gameplayPaused && !ui) ||
      (ui && (!this.menuSettings.enabled || this.menuSettings.volume === 0)) ||
      !this.context
    )
      return;
    const semanticCue = eventCue(event),
      now = this.context.currentTime,
      eventKey =
        event.type === 'run.completed'
          ? `${event.type}:${event.levelId || ''}:${event.tick ?? ''}`
          : event.feedback && semanticCue
            ? `feedback:${semanticCue}`
            : event.type,
      key = event.board === undefined ? eventKey : `${event.board}:${eventKey}`;
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
    const ownership = {
      ui,
      board: event.board ?? 'solo',
      pan: event.pan ?? 0,
      feedback: event.feedback === true,
      priority: event.feedback === true ? 3 : 0,
    };
    if (publishedCue && this.publishedAudio?.play(publishedCue, ownership)) return;
    if (semanticCue === 'warning' && event.feedback === true) {
      // Use the same priority, dialogue interruption and bounded per-board
      // warning channel when the optional recording is unavailable.
      this.encounter('warning', { board: ownership.board, pan: 0 });
      return;
    }
    const noteOwnership = {
        pan: ownership.pan,
        encounter: ownership.feedback,
        board: ownership.board,
        priority: ownership.priority,
        cueName: publishedCue ?? semanticCue,
      },
      base = clamp(this.track.root + 12, 48, 76),
      cue = (steps, voice = 'bell', spacing = 0.09, duration = 0.25) =>
        steps.forEach((n, i) =>
          this.play(
            {
              kind: 'tone',
              frequency: midiFrequency(base + n),
              voice,
              volume: 0.08,
              duration,
              ...noteOwnership,
            },
            now + 0.015 + i * spacing,
            ui ? 'menu' : 'sfx',
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
        this.play(
          { kind: 'snare', volume: 0.07, duration: 0.22, ...noteOwnership },
          now + 0.02,
          ui ? 'menu' : 'sfx',
        );
      } else {
        const phrase =
          campaignVictoryMotif(resultContext) ??
          (this.themeFamily === 'atlas'
            ? [0, 5, 7, 12, 14, 12]
            : this.themeFamily === 'navi'
              ? [0, 4, 9, 7, 12, 16]
              : [0, 4, 7, 12, 7, 12]);
        // A small hand-played rise opens into the finished picture. Quiet octave
        // partials give the sine bells a glassy edge without a sharp square/saw
        // fanfare, percussion, downloaded assets or a second audio context.
        const timing = [0.025, 0.16, 0.31, 0.47, 0.65, 0.86];
        phrase.forEach((n, index) => {
          const last = index === phrase.length - 1;
          for (const [octave, volume, duration] of [
            [0, last ? 0.07 : 0.06, last ? 1.12 : 0.66],
            [12, 0.012, 0.24],
          ])
            this.play(
              {
                kind: 'tone',
                frequency: midiFrequency(base + n + octave),
                voice: 'chime',
                volume,
                duration,
                ...noteOwnership,
              },
              now + timing[index],
              ui ? 'menu' : 'sfx',
            );
        });
        for (const n of [-12, 4, 7])
          this.play(
            {
              kind: 'tone',
              frequency: midiFrequency(base + n),
              voice: 'bloom',
              volume: 0.03,
              duration: 1.4,
              ...noteOwnership,
            },
            now + 0.88,
            ui ? 'menu' : 'sfx',
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
    else {
      // Team's native support/recovery and expedition events need immediate
      // semantic feedback before samples decode, including fully offline play.
      // Distinct intervals/cadences survive stereo-to-mono downmix.
      const fallback = {
        respawn: [[-12, 0, 7, 12], 'bell', 0.09, 0.2],
        gate: [[0, 7, 12], 'bell', 0.12, 0.23],
        pickup: [[7, 12], 'bell', 0.05, 0.13],
        deploy: [[0, 7, 4], 'lead', 0.055, 0.13],
        cancel: [[4, 0], 'chip', 0.07, 0.1],
        erosion: [[7, 3, 0], 'chip', 0.07, 0.12],
        attack: [[0, -7], 'lead', 0.04, 0.13],
        neutralized: [[0, 4, 7], 'bell', 0.06, 0.15],
        closure: [[0, 7], 'bell', 0.04, 0.12],
      }[semanticCue];
      if (fallback) cue(...fallback);
    }
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
