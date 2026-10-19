import { createMediaPreparation } from './media-preparation.mjs';
import { actorPhaseSound } from './encounter-audio.mjs';
import { dialogueChannel } from './dialogue-channel.mjs';
import { playerMovementBody } from './movement-profiles.mjs';
import { getLocale } from '../i18n/index.mjs';
import { CELL, DIRECTIONS } from '../core/registry.mjs';
import { EFFECT_BANK } from '../audio/effects/bank.mjs';
import {
  captureRecipe,
  distanceGain,
  screenPan,
  materialProfile,
  movementFor,
  movementRate,
  eventCue,
} from './feedback-cues.mjs';
import { directionalSpeedFactor } from '../core/directional-fields.mjs';
import { terrainTransitionCaption } from './terrain-feedback.mjs';

export const GAMEPLAY_EFFECTS = Object.freeze([
  'start',
  'retry',
  'warning',
  'loss',
  'respawn',
  'win',
  'closure',
  'reveal-small',
  'reveal-medium',
  'reveal-large',
]);
const EFFECT_CACHE_BYTES = 32 * 1024 * 1024;

function effectDecodeReservation(bytes, sampleRate = 48000) {
  const header = new DataView(bytes);
  if (
    bytes.byteLength >= 44 &&
    header.getUint32(0) === 0x52494646 &&
    header.getUint32(8) === 0x57415645 &&
    header.getUint32(12) === 0x666d7420 &&
    header.getUint32(16, true) === 16 &&
    header.getUint32(36) === 0x64617461
  ) {
    const channels = header.getUint16(22, true),
      rate = header.getUint32(24, true),
      alignment = header.getUint16(32, true),
      bits = header.getUint16(34, true),
      length = header.getUint32(40, true);
    if (
      header.getUint16(20, true) === 1 &&
      [1, 2].includes(channels) &&
      rate >= 8000 &&
      [8, 16, 24, 32].includes(bits) &&
      alignment === (channels * bits) / 8 &&
      length === bytes.byteLength - 44
    )
      return Math.ceil(((length / alignment) * sampleRate) / rate) * channels * 4;
  }
  // The bank is fixed and byte-bounded. Non-canonical WAVs still go through
  // the native decoder, with a conservative minimum source-rate reservation.
  return Math.ceil(bytes.byteLength * 2 * Math.max(1, sampleRate / 8000));
}

async function readEffectOriginal(response, expected, signal) {
  if (!response.body?.getReader) {
    const bytes = await response.arrayBuffer();
    return bytes.byteLength === expected ? bytes : null;
  }
  const reader = response.body.getReader(),
    bytes = new Uint8Array(expected);
  let offset = 0;
  try {
    for (;;) {
      signal.throwIfAborted();
      const { done, value } = await reader.read();
      if (done) break;
      if (offset + value.byteLength > expected)
        throw new RangeError('Effect original exceeds its byte budget.');
      bytes.set(value, offset);
      offset += value.byteLength;
    }
    return offset === expected ? bytes.buffer : null;
  } catch (error) {
    await reader.cancel().catch(() => {});
    throw error;
  } finally {
    reader.releaseLock();
  }
}

/** Owns only presentation objects. Decoding never schedules an old event. */
export class FeedbackDirector {
  constructor(sound, { now = () => performance.now() } = {}) {
    this.sound = sound;
    this.preparation = sound.mediaPreparation ?? createMediaPreparation();
    this.ownsPreparation = !sound.mediaPreparation;
    this.controllers = new Set();
    this.decodedBytes = 0;
    this.buffers = new Map();
    this.pending = new Map();
    this.pendingRequests = new Map();
    this.retryAfter = new Map();
    this.now = now;
    this.boards = new Map();
    this.seen = new WeakMap();
    this.serial = 0;
    this.destructionVariants = new Map();
    this.lastLevels = new Map();
    this.recent = new Map();
    this.generation = 0;
    this.closed = false;
  }
  prepare(names = GAMEPLAY_EFFECTS) {
    if (
      !this.sound.context ||
      this.closed ||
      this.sound.audioMaster?.muted ||
      this.sound.audioMaster?.volume === 0 ||
      this.sound.settings?.master === 0 ||
      this.sound.settings?.sfx === 0 ||
      typeof globalThis.fetch !== 'function'
    )
      return Promise.resolve();
    this.retryAfter.clear();
    return Promise.allSettled(
      [...new Set(names)].map((name) => this.load(name, { priority: 'background' })),
    );
  }
  load(name, { priority = 'demand' } = {}) {
    if (this.closed || this.buffers.has(name)) return;
    if (this.pending.has(name)) {
      const request = this.pendingRequests.get(name);
      if (request?.priority === 'background' && priority === 'demand') {
        request.priority = 'demand';
        this.preparation.promote?.(request.controller.signal, 'demand');
      }
      return this.pending.get(name);
    }
    if (this.now() < (this.retryAfter.get(name) ?? -Infinity)) return;
    const entry = EFFECT_BANK[name];
    if (!entry) return;
    const controller = new AbortController(),
      context = this.sound.context;
    const eligible = () =>
      !this.closed &&
      context === this.sound.context &&
      !this.sound.audioMaster?.muted &&
      this.sound.audioMaster?.volume !== 0 &&
      this.sound.settings?.master !== 0;
    const request = { priority, controller };
    const options = { priority, signal: controller.signal, eligible };
    this.pendingRequests.set(name, request);
    this.controllers.add(controller);
    const timer = setTimeout(() => controller.abort(), 10000);
    let cancelled = false;
    const promise = (async () => {
      const bytes = await this.preparation.run(
        'fetch',
        async () => {
          const response = await fetch(new URL(`../audio/effects/${entry.file}`, import.meta.url), {
            signal: controller.signal,
          });
          if (!response.ok) return null;
          return readEffectOriginal(response, entry.bytes, controller.signal);
        },
        options,
      );
      if (!bytes || !eligible() || !context?.decodeAudioData) return;
      // Originals are short 16-bit WAVs. Reserve conservatively for resampling;
      // the native decoder owns this reservation until its promise settles.
      const reservation = effectDecodeReservation(bytes, context.sampleRate);
      const buffer = await this.preparation.run('decode', () => context.decodeAudioData(bytes), {
        ...options,
        priority: request.priority,
        bytes: reservation,
      });
      if (!eligible() || controller.signal.aborted) return;
      const size = (buffer.length ?? 0) * (buffer.numberOfChannels ?? 0) * 4;
      if (size > EFFECT_CACHE_BYTES) return;
      while (this.buffers.size && this.decodedBytes + size > EFFECT_CACHE_BYTES) {
        const oldest = this.buffers.keys().next().value;
        const previous = this.buffers.get(oldest);
        this.decodedBytes -= (previous.length ?? 0) * (previous.numberOfChannels ?? 0) * 4;
        this.buffers.delete(oldest);
      }
      this.buffers.set(name, buffer);
      this.decodedBytes += size;
    })()
      .catch((error) => {
        cancelled = error?.name === 'AbortError';
      })
      .finally(() => {
        clearTimeout(timer);
        this.controllers.delete(controller);
        this.pending.delete(name);
        this.pendingRequests.delete(name);
        if (!this.closed && !cancelled && !this.buffers.has(name))
          this.retryAfter.set(name, this.now() + 5000);
        else this.retryAfter.delete(name);
      });
    this.pending.set(name, promise);
    return promise;
  }
  resourceSnapshot() {
    return {
      decodedBytes: this.decodedBytes,
      decodedBytesLimit: EFFECT_CACHE_BYTES,
      buffers: this.buffers.size,
      loading: this.pending.size,
    };
  }
  play(
    name,
    {
      gain = 0.55,
      pan = 0,
      priority = 2,
      loop = false,
      ui = false,
      board = 'solo',
      rate = 1,
      delay = 0,
      radio = false,
      movement = false,
      maxDuration = null,
      humanReaction = false,
    } = {},
  ) {
    const cueFamily = name.replace(/-[12]$/, '');
    const routine = /^(focus|confirm|cancel|paper|pickup|closure|switch|reveal-)/.test(cueFamily);
    if (['confirm', 'paper', 'pickup'].includes(name)) {
      const variant = this.serial++ % 3;
      if (variant) name += `-${variant}`;
    }
    if (name.startsWith('contact-') && !/[-][12]$/.test(name)) {
      const variant = this.serial++ % 3;
      if (variant) name += `-${variant}`;
    }
    if (name.startsWith('destroy-') && !/[-][12]$/.test(name)) {
      const variant = this.destructionVariants.get(name) ?? 0;
      this.destructionVariants.set(name, (variant + 1) % 3);
      if (variant) name += `-${variant}`;
      // Small per-recording variation, independent of the simulation seed.
      rate *= [1, 1.025, 0.98][variant];
    }
    const s = this.sound,
      c = s.context;
    if (
      this.closed ||
      !s.enabled ||
      s.paused ||
      s.audioMaster.muted ||
      s.audioMaster.volume === 0 ||
      s.settings?.master === 0 ||
      (!ui && !radio && !movement && s.settings?.sfx === 0) ||
      !c ||
      c.state !== 'running' ||
      (!ui && s.gameplayPaused)
    )
      return null;
    if (
      movement &&
      s.movementSettings &&
      (!s.movementSettings.enabled || s.movementSettings.volume === 0)
    )
      return null;
    if (ui && (!s.menuSettings.enabled || s.menuSettings.volume === 0)) return null;
    if (
      radio &&
      (!s.radioSettings?.enabled || s.radioSettings.volume === 0 || dialogueChannel.active)
    )
      return null;
    if (priority >= 5 && (name === 'warning' || name === 'loss')) dialogueChannel.interrupt();
    if (
      radio &&
      [...s.voices].some((v) => v.radio || v.dialogue || (v.feedback && v.priority >= 5))
    )
      return null;
    if (priority >= 5) {
      this.sound.humanReactions?.interrupt(c.currentTime);
      for (const voice of [...s.voices]) if (voice.humanReaction) voice.retire();
    }
    if (priority >= 5)
      for (const voice of [...s.voices]) if (voice.radio || voice.dialogue) voice.stop();
    if (priority >= 4)
      for (const voice of [...s.voices])
        if (voice.feedback && voice.movement && !voice.source?.loop) voice.stop();
    let buffer = this.buffers.get(name);
    if (!buffer) {
      this.load(name);
      // Optional variants may decode in any order. Use an already decoded
      // rendition of this family while preparing the selected variation.
      const ready = [cueFamily, `${cueFamily}-1`, `${cueFamily}-2`].find((candidate) =>
        this.buffers.has(candidate),
      );
      if (!ready) return null;
      name = ready;
      buffer = this.buffers.get(ready);
    }
    const owned = [...s.voices].filter((v) => v.feedback);
    // Reserve headroom for music and urgent one-shots; never steal music.
    if (owned.length >= 16 || s.voices.size >= 64) {
      const victim = owned
        .filter((v) => v.priority < priority)
        .sort((a, b) => a.priority - b.priority)[0];
      if (!victim) return null;
      victim.stop();
    }
    if (!loop) {
      const key = `${board}:${cueFamily}`;
      if (
        c.currentTime - (this.recent.get(key) ?? -Infinity) <
        (routine ? (ui ? 0.1 : 0.16) : 0.045)
      )
        return null;
      this.recent.set(key, c.currentTime);
      if (routine)
        for (const voice of [...s.voices])
          if (voice.board === board && voice.cueFamily === cueFamily) voice.retire();
    }
    const source = c.createBufferSource(),
      volume = c.createGain();
    const panner = c.createStereoPanner?.();
    source.buffer = buffer;
    source.loop = loop;
    source.playbackRate?.setValueAtTime(rate, c.currentTime);
    const excerpt = !loop && Number.isFinite(maxDuration) && maxDuration > 0,
      duration = Math.min(buffer.duration / rate, excerpt ? maxDuration : Infinity),
      start = c.currentTime + delay;
    volume.gain.setValueAtTime(loop || excerpt ? 0 : gain, c.currentTime);
    if (excerpt) {
      // Original periodic textures can be several seconds long. A short attack
      // and release make bounded material accents rather than stacked loops.
      volume.gain.setValueAtTime(0, start);
      volume.gain.linearRampToValueAtTime?.(gain, start + Math.min(0.006, duration / 4));
      volume.gain.setValueAtTime(gain, start + duration - Math.min(0.025, duration / 3));
      volume.gain.linearRampToValueAtTime?.(0, start + duration);
    }
    source.connect(volume);
    if (panner) {
      volume.connect(panner);
      panner.pan.setValueAtTime(pan, c.currentTime);
      panner.connect(
        movement ? (s.movementBus ?? s.sfxBus) : radio ? s.radioBus : ui ? s.menuBus : s.sfxBus,
      );
    } else
      volume.connect(
        movement ? (s.movementBus ?? s.sfxBus) : radio ? s.radioBus : ui ? s.menuBus : s.sfxBus,
      );
    let ended = false,
      retiring = false;
    const voice = {
      name,
      cueFamily,
      bus: ui ? 'menu' : 'sfx',
      feedback: true,
      radio,
      movement,
      priority,
      humanReaction,
      board,
      source,
      volume,
      panner,
      set: (level, position, rate = 1) => {
        if (ended) return;
        volume.gain.setTargetAtTime(level, c.currentTime, 0.027);
        source.playbackRate?.setTargetAtTime(rate, c.currentTime, 0.027);
        panner?.pan.setTargetAtTime(position, c.currentTime, 0.027);
      },
      retire: () => {
        if (ended || retiring) return;
        retiring = true;
        volume.gain.cancelScheduledValues?.(c.currentTime);
        volume.gain.setTargetAtTime(0, c.currentTime, 0.008);
        source.stop(c.currentTime + 0.04);
      },
      stop: () => {
        if (ended) return;
        ended = true;
        try {
          source.stop();
        } catch {}
        source.disconnect();
        volume.disconnect();
        panner?.disconnect();
        s.voices.delete(voice);
        dialogueChannel.release(voice);
      },
      get ended() {
        return ended || retiring;
      },
    };
    source.onended = voice.stop;
    if (radio) dialogueChannel.claim(voice);
    s.voices.add(voice);
    // Re-enter a periodic texture at its global phase, without an attack restart.
    try {
      source.start(c.currentTime + delay, loop ? (c.currentTime * rate) % buffer.duration : 0);
      if (!loop) source.stop(start + duration + (humanReaction ? 0 : 0.01));
    } catch {
      voice.stop();
      return null;
    }
    return voice;
  }
  events(events, run, theme = {}, options = {}) {
    if (!run || !Array.isArray(events)) return;
    let seen = this.seen.get(run);
    if (!seen) {
      seen = new Set();
      this.seen.set(run, seen);
    }
    const capturing = events.some((e) => e.type === 'cells.claimed');
    const final = events.some((e) => e.type === 'run.completed');
    events.forEach((event, index) => {
      const key = `${event.tick}:${event.time}:${index}:${event.type}`;
      if (seen.has(key)) return;
      if (options.mode === 'versus' && event.type === 'run.completed') return;
      seen.add(key);
      if (seen.size > 512) seen.delete(seen.values().next().value);
      const combatCue = {
        'combat.locked': 'warning',
        'combat.fired': 'fire',
        'combat.impact': 'impact',
        'combat.cancelled': 'recover',
        'combat.eliminated': 'catch',
        'enemy.defeated': 'catch',
        'encounter.defeated': 'catch',
        'core.defeated': 'catch',
      }[event.type];
      if (combatCue && this.sound.encounter) {
        const hunt =
          run.level?.hunt ??
          run.level?.runningEnemies?.hunt ??
          run.level?.classic?.hunt ??
          run.definition?.classic?.hunt;
        const identity = event.actorId ?? event.enemy ?? event.id;
        const actor = [
          ...(run.enemies ?? []),
          ...((run.runningEnemies ?? run.classic ?? run).combatPatrols?.actors ?? []),
        ].find((candidate) => candidate.id === identity);
        const humanoid = hunt?.targets?.find((target) => target.id === identity);
        const stronghold =
          event.type === 'core.defeated'
            ? run.strongholds?.find((candidate) => candidate.id === event.stronghold)
            : null;
        const rawFamily =
          event.family ??
          humanoid?.kind ??
          actor?.pursuit?.behavior ??
          actor?.family ??
          (stronghold ? 'relay-sentinel' : actor?.type) ??
          (['encounter.defeated', 'core.defeated'].includes(event.type)
            ? 'relay-sentinel'
            : undefined);
        const family = humanoid
          ? rawFamily
          : ({
              bouncer: 'utility-car',
              'claimed-rover': 'cargo-truck',
              'border-patrol': 'armored-carrier',
              'contour-patrol': 'scout-car',
              eroder: 'tracked-tank',
              'relay-sentinel': 'radar-truck',
            }[rawFamily] ?? rawFamily);
        const machineFamily =
          !family || /car|truck|tank|rover|vehicle|machine|lane-boss/.test(family);
        const machine =
          event.machine ??
          (combatCue === 'catch' && !humanoid && actor?.bodyId !== 'humanoid' && machineFamily
            ? ['eroder', 'lane-boss', 'tracked-tank'].includes(family)
              ? 'tracked'
              : 'wheeled'
            : false);
        const source = Number.isFinite(event.x) ? event : (stronghold?.core ?? actor);
        this.sound.encounter(combatCue, {
          board: options.board ?? 'solo',
          family,
          machine,
          material: event.material,
          humanoid:
            event.humanoid ??
            (humanoid ? true : actor?.bodyId ? actor.bodyId === 'humanoid' : undefined),
          flesh: event.flesh,
          vocals: (options.getDestruction?.() ?? this.sound.readDestruction?.())?.vocals,
          brutal: (options.getDestruction?.() ?? this.sound.readDestruction?.())?.brutal === true,
          pan: Number.isFinite(source?.x) ? screenPan(source.x, run.width, options.placement) : 0,
        });
        return;
      }
      if (event.type === 'run.completed' && event.won !== false && event.status !== 'lost') {
        // One victory owner, whether samples have decoded yet or not. This
        // preserves published cues and campaign phrases while giving every
        // ordinary win the same soft, audio-clocked picture reveal resolution.
        for (const voice of [...this.sound.voices]) if (voice.radio) voice.stop();
        this.sound.event?.(
          { ...event, board: options.board ?? 'solo', feedback: true },
          {},
          options.resultContext,
        );
        return;
      }
      const board = options.board ?? 'solo';
      const source = Number.isFinite(event.x)
        ? event
        : ([...(run.enemies ?? []), ...((run.classic ?? run).combatPatrols?.actors ?? [])].find(
            (actor) => actor.id === (event.actorId ?? event.enemy ?? event.id),
          ) ?? (Number.isInteger(event.player) ? run.players?.[event.player] : run.player));
      const pan = Number.isFinite(source?.x)
        ? screenPan(source.x, run.width, options.placement)
        : 0;
      // Each cue has its own readiness. One decoded menu effect must not
      // silence missing gameplay recordings. Keep board identity in fallback
      // too, so simultaneous Duel events do not share a cooldown bucket.
      const fallback = () =>
        this.sound.event?.({ ...event, board, pan, feedback: true }, {}, options.resultContext);
      if (event.type === 'cells.claimed') {
        if (!final) {
          const recipe = captureRecipe(event, run);
          this.play(`reveal-${recipe.tier}`, { priority: 4, board });
          if (!this.buffers.has(`reveal-${recipe.tier}`)) fallback();
          const [material, rate] = materialProfile(theme);
          const indices = event.indices ?? [];
          const center = indices.length
            ? indices.reduce((n, i) => n + (i % run.width) + 0.5, 0) / indices.length
            : run.width / 2;
          this.play(`contact-${material}`, {
            gain: 0.12,
            pan: screenPan(center, run.width, options.placement),
            board,
            rate,
          });
        }
      } else if (
        !(capturing && event.type === 'cut.closed') &&
        !(final && ['cut.closed', 'objective.captured', 'relay.opened'].includes(event.type))
      ) {
        const destruction = event.type === 'combat.eliminated';
        const fullDestruction =
          (options.getDestruction?.() ?? this.sound.readDestruction?.())?.brutal === true;
        const humanoid =
          run.level?.hunt?.targets?.some((target) => target.id === event.id) ||
          run.level?.runningEnemies?.hunt?.targets?.some((target) => target.id === event.id) ||
          run.level?.classic?.hunt?.targets?.some((target) => target.id === event.id) ||
          run.definition?.classic?.hunt?.targets?.some((target) => target.id === event.id);
        // One material accent replaces pickup; simultaneous removals remain throttled.
        const cue = destruction ? (humanoid ? 'contact-soft' : 'contact-metal') : eventCue(event);
        if (cue) {
          const voice = this.play(cue, {
            priority: cue === 'warning' || cue === 'win' || cue === 'loss' ? 5 : 3,
            board,
            pan: cue === 'warning' ? 0 : pan,
            gain: destruction ? (fullDestruction ? 0.55 : 0.22) : 0.55,
            rate: destruction ? (humanoid ? 0.8 : 0.72) : 1 + ((this.serial++ % 3) - 1) * 0.025,
          });
          // A ready cue denied by pause, cooldown or voice ownership stays
          // denied. Decoding completion never queues an expired event.
          if (!voice && ![cue, `${cue}-1`, `${cue}-2`].some((name) => this.buffers.has(name)))
            fallback();
        }
      }
      if (!final && terrainTransitionCaption(run, event))
        this.play(event.type === 'cells.claimed' ? 'neutralized' : 'reactivated', {
          gain: 0.35,
          priority: 4,
          board,
        });
    });
  }
  /** Shared explicit launch owner. Resume and decoding completion never call it. */
  launch({ board = 'solo', level, bodyId = 'fpv-scout-v1', theme = {}, retry } = {}) {
    const fpv =
      movementFor(bodyId, theme) === 'rotor' || /fixedwing|delta-interceptor/.test(bodyId);
    const again = retry ?? Boolean(level && this.lastLevels.get(board) === level);
    const intro = fpv ? (again ? 'esc-retry' : 'esc-start') : again ? 'retry' : 'start';
    const started = this.play(intro, { priority: 4, board });
    if (fpv && started)
      this.play(getLocale() === 'uk' ? 'radio-armed-uk' : 'radio-armed-en', {
        radio: true,
        gain: 0.7,
        priority: 2,
        board,
        delay: this.buffers.get(intro).duration + 0.08,
      });
    if (
      !started &&
      fpv &&
      !this.buffers.has(intro) &&
      !this.sound.audioMaster.muted &&
      this.sound.audioMaster.volume > 0 &&
      this.sound.play &&
      this.sound.voices.size <= 12
    ) {
      // First activation may still be decoding. Give immediate ESC-like note
      // feedback; its later recording never replays this launch.
      const notes = again
        ? [
            [0, 783.99, 0.09],
            [0.14, 1046.5, 0.12],
          ]
        : [
            [0, 523.25, 0.12],
            [0.17, 659.25, 0.12],
            [0.34, 783.99, 0.14],
            [0.58, 1046.5, 0.18],
          ];
      for (const [offset, frequency, duration] of notes)
        this.sound.play(
          {
            kind: 'tone',
            voice: 'lead',
            frequency,
            duration,
            volume: 0.012,
            encounter: true,
            cueName: intro,
            board,
            priority: 4,
          },
          (this.sound.context?.currentTime ?? 0) + offset,
        );
    } else if (!started && !fpv && this.buffers.size === 0) this.sound.tone?.(440, 0.08, 0.035);
    this.lastLevels.set(board, level);
    return started;
  }
  /** One owner per drone bed; no crowd or grid simulation adapter is required. */
  flight({
    board = 'overflight',
    active = false,
    bodyId = 'fpv-scout-v1',
    moving = true,
    boost = false,
  } = {}) {
    this.flightLoops ??= new Map();
    let voice = this.flightLoops.get(board);
    const sound = this.sound;
    if (
      !active ||
      !moving ||
      !sound.enabled ||
      sound.paused ||
      sound.gameplayPaused ||
      sound.audioMaster.muted ||
      sound.movementSettings?.enabled === false ||
      sound.movementSettings?.volume === 0
    ) {
      voice?.stop();
      this.flightLoops.delete(board);
      return;
    }
    if (voice && !sound.voices.has(voice)) {
      this.flightLoops.delete(board);
      voice = null;
    }
    const name = movementFor(bodyId, { family: 'fpv' });
    if (voice && voice.name !== name) {
      voice.stop();
      voice = null;
    }
    const foreground = [...sound.voices].some(
      (item) => item.radio || item.priority >= 5 || /esc-(start|retry)/.test(item.name ?? ''),
    );
    const gain = (boost ? 0.22 : 0.15) * (foreground ? 0.5 : 1);
    if (!voice) {
      voice = this.play(name, { board, movement: true, loop: true, priority: 0, gain });
      if (voice) this.flightLoops.set(board, voice);
    }
    voice?.set(gain, 0, boost ? 1.12 : 1);
  }
  update(active, theme, run, options = {}) {
    const board = options.board ?? 'solo';
    let state = this.boards.get(board);
    if (!state || state.run !== run || run?.tick < state.tick) {
      if (state) {
        this.stopBoard(board);
        if (run?.tick < state.tick) this.seen.delete(run);
        for (const key of this.recent.keys())
          if (key.startsWith(`${board}:`)) this.recent.delete(key);
      }
      state = { run, tick: run?.tick, loops: new Map(), previous: new Map(), started: false };
      this.boards.set(board, state);
    }
    const newTick = state.tick !== run?.tick;
    state.tick = run?.tick;
    const sound = this.sound;
    if (
      !active ||
      !run ||
      run.status !== 'running' ||
      !sound.enabled ||
      sound.paused ||
      sound.gameplayPaused ||
      sound.audioMaster.muted
    ) {
      if (!active && run?.status === 'running') this.stopBoard(board);
      for (const v of [...sound.voices]) if (v.radio && v.board === board) v.stop();
      for (const v of state.loops.values()) v.stop();
      state.loops.clear();
      return;
    }
    if (options.silentStart) state.started = true;
    if (!state.started) {
      this.launch({
        board,
        level: run.levelId ?? run.level?.id,
        bodyId: playerMovementBody(run.player ?? run.players?.[0] ?? {}, run, theme, options),
        theme,
      });
      state.started = true;
    }
    const players = (run.players ?? [run.player]).filter(
      (p) => p && !['downed', 'out', 'dead'].includes(p.status),
    );
    const distance = (actor) =>
      Math.min(...players.map((p) => Math.hypot(p.x - actor.x, p.y - actor.y)));
    const candidates = [],
      incidental = [];
    const details = new Map((run.classic?.enemies ?? []).map((actor) => [actor.id, actor]));
    for (const [i, actor] of [
      ...(run.enemies ?? []),
      ...((run.classic ?? run).combatPatrols?.actors ?? []).filter((a) => a.alive),
    ].entries()) {
      const key = `enemy:${actor.id ?? i}`,
        previous = state.previous.get(key);
      const hunt =
        run.level?.hunt ??
        run.level?.runningEnemies?.hunt ??
        run.level?.classic?.hunt ??
        run.definition?.classic?.hunt;
      const humanoid =
        actor.bodyId === 'humanoid' || hunt?.targets?.some((target) => target.id === actor.id);
      const phase = actor.pursuit?.phase ?? actor.phase;
      const family =
        actor.pursuit?.behavior ?? actor.family ?? (actor.role === 'sentry' ? 'guard' : 'runner');
      const phaseCue =
        options.phaseEvents !== false &&
        humanoid &&
        newTick &&
        actorPhaseSound(previous?.phase, phase);
      // Native Guard locked/fired events already own their audible warning.
      if (phaseCue && actor.role !== 'sentry') {
        this.sound.encounter?.(phaseCue, {
          family,
          board,
          pan: screenPan(actor.x, run.width, options.placement),
        });
        if (phaseCue !== 'warning')
          this.sound.encounter?.('equipment', {
            family,
            board,
            gainScale: distanceGain(distance(actor), Math.min(run.width, run.height)),
            pan: screenPan(actor.x, run.width, options.placement),
          });
      }
      const moved = newTick
        ? previous && Math.hypot(actor.x - previous.x, actor.y - previous.y) > 0.0001
        : previous?.moving;
      if (newTick || !previous)
        state.previous.set(key, { x: actor.x, y: actor.y, moving: moved, phase });
      const detail = details.get(actor.id);
      if (
        !moved ||
        actor.alive === false ||
        actor.active === false ||
        (actor.rover && actor.rover.mode !== 'active') ||
        actor.stunnedUntil > run.time ||
        actor.frozenUntil > run.time ||
        detail?.stunned ||
        detail?.frozen ||
        ['dormant', 'idle'].includes(detail?.mode)
      )
        continue;
      const d = distance(actor) / Math.min(run.width, run.height);
      if (d >= (state.loops.has(key) ? 0.8 : 0.74)) continue;
      const gainScale = distanceGain(distance(actor), Math.min(run.width, run.height)),
        machine = ['eroder', 'lane-boss'].includes(actor.type) ? 'tracked' : 'wheeled';
      if (newTick && (humanoid || (options.collectionId === 'military-field' && !previous?.moving)))
        incidental.push({
          type: humanoid ? 'step' : 'drive',
          family,
          machine: humanoid ? false : machine,
          gainScale,
          pan: screenPan(actor.x, run.width, options.placement),
        });
      // Actual moving footsteps replace the old undifferentiated grain loop.
      if (humanoid) continue;
      candidates.push({
        key,
        movement: true,
        rate: movementRate(actor.bodyId ?? '', actor.type ?? actor.role),
        name: movementFor(
          humanoid
            ? 'humanoid'
            : options.collectionId === 'military-field'
              ? ['eroder', 'lane-boss'].includes(actor.type)
                ? 'tracked-vehicle'
                : 'wheeled-vehicle'
              : (actor.bodyId ?? ''),
          options.actorStyle === 'fpv' ? { family: 'fpv' } : theme,
          actor.type ?? actor.role,
          options.actorSkins?.[actor.type] ?? actor.skinId,
        ),
        gain: distanceGain(distance(actor), Math.min(run.width, run.height)) * 0.3,
        pan: screenPan(actor.x, run.width, options.placement),
      });
    }
    for (const type of ['step', 'drive']) {
      const nearest = incidental
        .filter((cue) => cue.type === type)
        .sort((a, b) => b.gainScale - a.gainScale)[0];
      if (nearest) this.sound.encounter?.(type, { ...nearest, board });
    }
    // Player movement follows the selected body, independently of ability class.
    for (const [i, player] of players.entries()) {
      const key = `player:${player.id ?? i}`,
        old = state.previous.get(key);
      const moving = newTick
        ? old && Math.hypot(player.x - old.x, player.y - old.y) > 0.0001
        : old?.moving;
      const command = options.commands?.[i] ?? options.command;
      const vector = DIRECTIONS[command?.direction];
      const wall =
        vector &&
        player.speed === 0 &&
        run.cells?.[
          Math.floor(player.y + vector.y * 0.6) * run.width + Math.floor(player.x + vector.x * 0.6)
        ] === CELL.WALL;
      const blockedKey = `blocked:${player.id ?? i}`;
      if (command) {
        if (wall && !state.previous.get(blockedKey)) {
          const [material, rate] = materialProfile(theme);
          this.play(`contact-${material}`, { gain: 0.35, rate, board });
        }
        state.previous.set(blockedKey, !!wall);
      }
      const index = Math.floor(player.y) * run.width + Math.floor(player.x);
      const terrain = run.cells?.[index] === 0 ? (run.classic?.terrain ?? run.terrain)?.[index] : 0;
      if (newTick && old && terrain !== old.terrain)
        this.play(terrain === 1 ? 'paper' : 'cancel', { gain: 0.22, board });
      if (newTick || !old) state.previous.set(key, { x: player.x, y: player.y, moving, terrain });
      if (moving)
        candidates.push({
          key,
          movement: true,
          name: movementFor(playerMovementBody(player, run, theme, options), theme),
          rate: movementRate(playerMovementBody(player, run, theme, options)),
          gain: 0.25,
          pan: screenPan(player.x, run.width, options.placement),
        });
    }
    const terrainZones = run.level?.classic?.terrain ?? [];
    const flowZones = run.level?.directionalFields?.zones ?? [];
    for (const [zoneIndex, zone] of [...terrainZones, ...flowZones].entries()) {
      let nearest = Infinity,
        active = false;
      for (let y = zone.y; y < zone.y + zone.h; y++)
        for (let x = zone.x; x < zone.x + zone.w; x++) {
          if (run.cells?.[y * run.width + x] !== CELL.FIELD) continue;
          active = true;
          for (const p of players)
            nearest = Math.min(
              nearest,
              Math.hypot(Math.max(x - p.x, 0, p.x - x - 1), Math.max(y - p.y, 0, p.y - y - 1)),
            );
        }
      if (!active || zone.kind === 'lethal') continue;
      const player = players.find(
        (p) => p.x >= zone.x && p.x < zone.x + zone.w && p.y >= zone.y && p.y < zone.y + zone.h,
      );
      const factor =
        player && zone.direction
          ? directionalSpeedFactor(
              run,
              Math.floor(player.y) * run.width + Math.floor(player.x),
              player.direction,
            )
          : 1;
      const gain =
        distanceGain(nearest, Math.min(run.width, run.height)) * (zone.direction ? 0.045 : 0.07);
      if (gain > 0.005)
        candidates.push({
          key: `terrain:${zone.id ?? zoneIndex}`,
          name: zone.direction ? 'flow' : 'grain',
          gain,
          rate: factor,
          pan: screenPan(zone.x + zone.w / 2, run.width, options.placement),
        });
    }
    for (const zone of run.signalZones ?? []) {
      const key = `zone:${zone.id}`,
        suppressed = zone.suppressedUntil > run.time;
      const old = state.previous.get(key);
      if (newTick && old && old.suppressed !== suppressed)
        this.play(suppressed ? 'neutralized' : 'reactivated', { gain: 0.28, board });
      state.previous.set(key, { suppressed });
      if (suppressed) continue;
      // Closest boundary of each zone, never one source per terrain tile.
      const d = Math.min(
        ...players.map((p) =>
          Math.hypot(
            Math.max(zone.x - p.x, 0, p.x - zone.x - zone.w),
            Math.max(zone.y - p.y, 0, p.y - zone.y - zone.h),
          ),
        ),
      );
      const gain = distanceGain(d, Math.min(run.width, run.height)) * 0.07;
      if (gain > 0.005)
        candidates.push({
          key,
          name: 'flow',
          gain,
          pan: screenPan(zone.x + zone.w / 2, run.width, options.placement),
        });
    }
    // At most two decorative sources per Versus board, four globally.
    const quota = options.mode === 'versus' ? 2 : 4;
    const ranked = candidates
      .filter(
        (item) =>
          !item.movement ||
          (sound.movementSettings?.enabled !== false && sound.movementSettings?.volume !== 0),
      )
      .sort((a, b) => b.gain - a.gain);
    // Reserve the moving body and one nearby enemy before decorative zones.
    const selected = ranked.filter((a) => a.key.startsWith('player:')).slice(0, quota - 1);
    const nearestEnemy = ranked.find((a) => a.key.startsWith('enemy:'));
    if (nearestEnemy) selected.push(nearestEnemy);
    for (const item of ranked)
      if (selected.length < quota && !selected.includes(item)) selected.push(item);
    const keys = new Set(selected.map((a) => a.key));
    for (const [key, voice] of state.loops)
      if (!keys.has(key) || voice.ended) {
        voice.retire();
        state.loops.delete(key);
      }
    for (const item of selected) {
      let voice = state.loops.get(item.key);
      if (voice && voice.name !== item.name) {
        voice.stop();
        state.loops.delete(item.key);
        voice = null;
      }
      const count = [...sound.voices].filter((voice) => voice.feedback && voice.source.loop).length;
      if (!voice && count < 4) {
        voice = this.play(item.name, { ...item, loop: true, priority: 0, board });
        if (voice) state.loops.set(item.key, voice);
      }
      voice?.set(item.gain, item.pan, item.rate);
    }
  }
  stopBoard(board) {
    for (const voice of [...this.sound.voices])
      if (voice.feedback && voice.board === board && voice.bus !== 'menu') voice.stop();
  }
  reset() {
    for (const voice of [...this.sound.voices])
      if (voice.feedback && voice.bus !== 'menu') voice.stop();
    this.recent.clear();
    this.boards.clear();
    this.flightLoops?.clear();
    this.sound.humanReactions?.reset();
    this.seen = new WeakMap();
    this.generation++;
  }
  close() {
    this.closed = true;
    for (const controller of this.controllers) controller.abort();
    if (this.ownsPreparation) this.preparation.close();
    this.reset();
    this.buffers.clear();
    this.decodedBytes = 0;
    this.retryAfter.clear();
  }
}
