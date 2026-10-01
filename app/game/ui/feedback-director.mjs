import { campaignVictoryMotif } from '../journey/campaign-feedback.mjs';
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

/** Owns only presentation objects. Decoding never schedules an old event. */
export class FeedbackDirector {
  constructor(sound, { now = () => performance.now() } = {}) {
    this.sound = sound;
    this.buffers = new Map();
    this.pending = new Map();
    this.retryAfter = new Map();
    this.now = now;
    this.boards = new Map();
    this.seen = new WeakMap();
    this.serial = 0;
    this.lastLevels = new Map();
    this.recent = new Map();
    this.generation = 0;
    this.closed = false;
  }
  prepare() {
    if (!this.sound.context || this.closed || typeof globalThis.fetch !== 'function') return;
    // Explicit audio activation may follow installation or reconnection.
    this.retryAfter.clear();
    for (const name of Object.keys(EFFECT_BANK)) this.load(name);
  }
  load(name) {
    if (this.closed || this.buffers.has(name) || this.pending.has(name)) return;
    if (this.now() < (this.retryAfter.get(name) ?? -Infinity)) return;
    const entry = EFFECT_BANK[name];
    if (!entry) return;
    const promise = (async () => {
      const response = await fetch(new URL(`../audio/effects/${entry.file}`, import.meta.url));
      if (!response.ok) return;
      const bytes = await response.arrayBuffer();
      if (bytes.byteLength !== entry.bytes || this.closed) return;
      const context = this.sound.context;
      if (!context?.decodeAudioData) return;
      const buffer = await context.decodeAudioData(bytes);
      if (!this.closed && context === this.sound.context) this.buffers.set(name, buffer);
    })()
      .catch(() => {})
      .finally(() => {
        this.pending.delete(name);
        // Optional offline recordings may be absent. Do not retry each render frame.
        if (!this.closed && !this.buffers.has(name)) this.retryAfter.set(name, this.now() + 5000);
        else this.retryAfter.delete(name);
      });
    this.pending.set(name, promise);
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
    const s = this.sound,
      c = s.context;
    if (
      this.closed ||
      !s.enabled ||
      s.paused ||
      s.audioMaster.muted ||
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
    if (ui && !s.menuSettings.enabled) return null;
    if (radio && (!s.radioSettings?.enabled || s.radioSettings.volume === 0)) return null;
    if (radio && [...s.voices].some((v) => v.radio || (v.feedback && v.priority >= 5))) return null;
    if (priority >= 5) for (const voice of [...s.voices]) if (voice.radio) voice.stop();
    const buffer = this.buffers.get(name);
    if (!buffer) {
      this.load(name);
      return null;
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
    volume.gain.setValueAtTime(loop ? 0 : gain, c.currentTime);
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
      },
      get ended() {
        return ended || retiring;
      },
    };
    source.onended = voice.stop;
    s.voices.add(voice);
    // Re-enter a periodic texture at its global phase, without an attack restart.
    source.start(c.currentTime + delay, loop ? (c.currentTime * rate) % buffer.duration : 0);
    if (!loop) source.stop(c.currentTime + delay + buffer.duration / rate + 0.01);
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
      if (event.type === 'run.completed' && campaignVictoryMotif(options.resultContext)) {
        this.sound.event?.(event, {}, options.resultContext);
        return;
      }
      if (
        this.sound.enabled &&
        !this.sound.paused &&
        !this.sound.gameplayPaused &&
        !this.sound.audioMaster.muted &&
        this.buffers.size === 0
      ) {
        // A first interaction or a decode failure remains audible immediately.
        // Decoding only prepares future cues; it never queues this event.
        if (!(final && event.type !== 'run.completed'))
          this.sound.event?.(event, {}, options.resultContext);
        return;
      }
      const board = options.board ?? 'solo';
      const source = Number.isFinite(event.x)
        ? event
        : ([...(run.enemies ?? []), ...(run.classic?.combatPatrols?.actors ?? [])].find(
            (actor) => actor.id === (event.actorId ?? event.enemy ?? event.id),
          ) ?? (Number.isInteger(event.player) ? run.players?.[event.player] : run.player));
      const pan = Number.isFinite(source?.x)
        ? screenPan(source.x, run.width, options.placement)
        : 0;
      if (event.type === 'cells.claimed') {
        if (!final) {
          const recipe = captureRecipe(event, run);
          this.play(`reveal-${recipe.tier}`, { priority: 4, board });
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
        const cue = eventCue(event);
        if (cue)
          this.play(cue, {
            priority: cue === 'warning' || cue === 'win' || cue === 'loss' ? 5 : 3,
            board,
            pan: cue === 'warning' ? 0 : pan,
            rate: 1 + ((this.serial++ % 3) - 1) * 0.025,
          });
      }
      if (!final && terrainTransitionCaption(run, event))
        this.play(event.type === 'cells.claimed' ? 'neutralized' : 'reactivated', {
          gain: 0.35,
          priority: 4,
          board,
        });
    });
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
      const level = run.levelId ?? run.level?.id;
      const body = playerMovementBody(run.player ?? run.players?.[0] ?? {}, run, theme, options);
      const fpv = movementFor(body, theme) === 'rotor' || /fixedwing|delta-interceptor/.test(body);
      const retry = level && this.lastLevels.get(board) === level;
      const intro = fpv ? (retry ? 'esc-retry' : 'esc-start') : retry ? 'retry' : 'start';
      const started = this.play(intro, { priority: 4, board });
      // Scheduled now, owned by the normal SFX lifecycle; decoding never replays it later.
      if (fpv && started)
        this.play(getLocale() === 'uk' ? 'radio-armed-uk' : 'radio-armed-en', {
          radio: true,
          gain: 0.7,
          priority: 2,
          board,
          delay: this.buffers.get(intro).duration + 0.08,
        });
      if (!started && this.buffers.size === 0) this.sound.tone?.(440, 0.08, 0.035);
      this.lastLevels.set(board, level);
      state.started = true;
    }
    const players = (run.players ?? [run.player]).filter(
      (p) => p && !['downed', 'out', 'dead'].includes(p.status),
    );
    const distance = (actor) =>
      Math.min(...players.map((p) => Math.hypot(p.x - actor.x, p.y - actor.y)));
    const candidates = [];
    const details = new Map((run.classic?.enemies ?? []).map((actor) => [actor.id, actor]));
    for (const [i, actor] of [
      ...(run.enemies ?? []),
      ...(run.classic?.combatPatrols?.actors ?? []).filter((a) => a.alive),
    ].entries()) {
      const key = `enemy:${actor.id ?? i}`,
        previous = state.previous.get(key);
      const moved = newTick
        ? previous && Math.hypot(actor.x - previous.x, actor.y - previous.y) > 0.0001
        : previous?.moving;
      if (newTick || !previous) state.previous.set(key, { x: actor.x, y: actor.y, moving: moved });
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
      candidates.push({
        key,
        movement: true,
        rate: movementRate(actor.bodyId ?? '', actor.type ?? actor.role),
        name: movementFor(
          actor.bodyId ?? '',
          options.actorStyle === 'fpv' ? { family: 'fpv' } : theme,
          actor.type ?? actor.role,
          options.actorSkins?.[actor.type] ?? actor.skinId,
        ),
        gain: distanceGain(distance(actor), Math.min(run.width, run.height)) * 0.3,
        pan: screenPan(actor.x, run.width, options.placement),
      });
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
    this.seen = new WeakMap();
    this.generation++;
  }
  close() {
    this.closed = true;
    this.reset();
    this.buffers.clear();
    this.retryAfter.clear();
  }
}
