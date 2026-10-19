import { createMediaPreparation } from './media-preparation.mjs';
import { attachMenuAudioSettings } from './menu-audio.mjs';
import { t } from '../i18n/index.mjs';
import { DESTRUCTION_CUES, HUMAN_REACTION_CUES } from './destruction-audio.mjs';
import { destructionBufferGain } from './destruction-level.mjs';
import { inspectPublishedCue } from '../published-cue-inspection.mjs';
const cueNames = new Set([
  'focus',
  'confirm',
  'cancel',
  'capture',
  'failure',
  'victory',
  'pickup',
  ...DESTRUCTION_CUES,
  ...HUMAN_REACTION_CUES,
]);
export const CUE_CACHE_BYTES = 32 * 1024 * 1024;
// Match optional effect/reaction reads; queue wait and native decoding are separate.
const CUE_READ_TIMEOUT_MS = 10000;

/** Read-only session cache. An unavailable cue uses its existing procedural
 * fallback; a late decode never replays an event that has already happened. */
export function createPublishedCues({ sound, readAudio }) {
  const preparation = sound.mediaPreparation ?? createMediaPreparation();
  const ownsPreparation = !sound.mediaPreparation;
  const cache = new Map(),
    attenuation = new Map(),
    pending = new Set(),
    loads = new Map(),
    voices = new Set(),
    recent = new Map();
  let closed = false,
    decodedBytes = 0;
  const bufferBytes = (value) =>
    value && typeof value === 'object' ? value.length * value.numberOfChannels * 4 : 0;
  function retain(name, decoded) {
    const size = bufferBytes(decoded);
    for (const [key, value] of cache) {
      if (decodedBytes + size <= CUE_CACHE_BYTES) break;
      if (key === name || !bufferBytes(value)) continue;
      decodedBytes -= bufferBytes(value);
      cache.delete(key);
      attenuation.delete(key);
    }
    cache.set(name, decoded ?? false);
    decodedBytes += size;
  }
  const cancelPending = () => {
    for (const controller of pending) controller.abort();
    pending.clear();
    loads.clear();
    for (const [key, value] of cache) if (value === 'loading') cache.delete(key);
  };
  const available = (ui = false) =>
    !closed &&
    sound.enabled &&
    !sound.paused &&
    !sound.disposed &&
    !sound.audioMaster?.muted &&
    sound.audioMaster?.volume !== 0 &&
    sound.context?.state === 'running' &&
    sound.settings.master &&
    (ui ? sound.menuSettings?.enabled !== false : sound.settings.sfx) &&
    (ui || !sound.persistentMusic || !sound.gameplayPaused);
  function load(name, { priority = 'demand' } = {}) {
    if (cache.get(name) === 'loading') return loads.get(name);
    if (
      !cueNames.has(name) ||
      cache.has(name) ||
      typeof sound.context?.decodeAudioData !== 'function'
    )
      return;
    const controller = new AbortController(),
      context = sound.context;
    const eligible = () =>
      !closed &&
      !controller.signal.aborted &&
      sound.enabled &&
      sound.context === context &&
      !sound.audioMaster?.muted &&
      sound.audioMaster?.volume !== 0;
    const admission = { signal: controller.signal, priority, eligible };
    let timedOut = false;
    pending.add(controller);
    cache.set(name, 'loading');
    const promise = preparation
      .run(
        'fetch',
        async () => {
          // Start only after admission. Abort cooperative reads, but retain the
          // shared slot until the underlying promise actually settles.
          const timer = setTimeout(() => {
            timedOut = true;
            if (!closed && loads.get(name) === promise) cache.set(name, false);
            controller.abort();
          }, CUE_READ_TIMEOUT_MS);
          const clear = () => clearTimeout(timer);
          controller.signal.addEventListener('abort', clear, { once: true });
          try {
            return await readAudio(`audio.${name}`, { signal: controller.signal });
          } finally {
            clear();
            controller.signal.removeEventListener('abort', clear);
          }
        },
        admission,
      )
      .then(async (result) => {
        if (!result || !eligible()) return null;
        const seconds = HUMAN_REACTION_CUES.includes(name)
          ? 0.7
          : DESTRUCTION_CUES.includes(name)
            ? 1
            : 15;
        const inspected = await inspectPublishedCue(result.blob, {
          sampleRate: context.sampleRate,
          maxDuration: seconds,
          signal: controller.signal,
          scheduleScan: (work) => preparation.run('main', work, admission),
        });
        const decoded = await preparation.run(
          'decode',
          async () => {
            const bytes = await inspected.blob.arrayBuffer();
            if (!eligible()) throw new DOMException('Cue decode cancelled.', 'AbortError');
            return context.decodeAudioData(bytes);
          },
          { ...admission, bytes: inspected.reservedBytes },
        );
        if (closed || controller.signal.aborted || !sound.enabled) return null;
        if (
          !Number.isFinite(decoded.duration) ||
          decoded.duration <= 0 ||
          decoded.duration >
            (HUMAN_REACTION_CUES.includes(name) ? 0.7 : DESTRUCTION_CUES.includes(name) ? 1 : 15) ||
          !Number.isSafeInteger(decoded.length) ||
          decoded.length <= 0 ||
          decoded.length > inspected.outputFrames ||
          decoded.numberOfChannels !== inspected.channels ||
          decoded.length * decoded.numberOfChannels > 4 * 1024 * 1024
        )
          throw new Error(t('interface:publishedCueExceedsItsDecodedBudget'));
        if ([...DESTRUCTION_CUES, ...HUMAN_REACTION_CUES].includes(name))
          attenuation.set(name, destructionBufferGain(name, decoded));
        return decoded;
      })
      .then((decoded) => {
        if (!closed && !controller.signal.aborted) retain(name, decoded);
      })
      .catch((error) => {
        if (error?.name === 'AbortError') {
          if (!closed && loads.get(name) === promise) {
            if (timedOut) cache.set(name, false);
            else cache.delete(name);
          }
        } else if (!closed && !controller.signal.aborted) cache.set(name, false);
      })
      .finally(() => {
        pending.delete(controller);
        if (loads.get(name) === promise) loads.delete(name);
      });
    loads.set(name, promise);
    return promise;
  }
  return Object.freeze({
    resourceSnapshot: () => ({
      decodedBytes,
      decodedBytesLimit: CUE_CACHE_BYTES,
      // Entries also include unavailable/loading sentinels, not only PCM buffers.
      cacheEntries: cache.size,
      loading: loads.size,
    }),
    has(name) {
      const value = cache.get(name);
      return !!value && value !== 'loading';
    },
    prepare(names) {
      if (!available()) return Promise.resolve();
      return Promise.all(
        names
          .filter((name) => cueNames.has(name))
          .map((name) => load(name, { priority: 'background' })),
      );
    },
    play(
      name,
      {
        ui = false,
        board = 'solo',
        pan = 0,
        feedback = false,
        priority = 2,
        gain = 1,
        rate = 1,
        maxDuration = null,
        humanReaction = false,
      } = {},
    ) {
      if (!cueNames.has(name) || !available(ui)) return false;
      const buffer = cache.get(name);
      if (buffer === undefined) {
        void load(name);
        return false;
      }
      if (!buffer || buffer === 'loading') return false;
      const now = sound.context.currentTime;
      if (ui && now - (recent.get(name) ?? -Infinity) < 0.08) return true;
      const destruction = [...DESTRUCTION_CUES, ...HUMAN_REACTION_CUES].includes(name);
      const owned = [...sound.voices].filter((voice) => voice.feedback);
      if (feedback && (owned.length >= 16 || sound.voices.size >= 64)) {
        const victim = owned
          .filter((voice) => voice.priority < priority)
          .sort((a, b) => a.priority - b.priority)[0];
        if (!victim) return true; // A budget rejection must not trigger a synthetic duplicate.
        victim.stop();
      }
      if (sound.voices.size >= 64) return true;
      if (destruction && now - (recent.get(`${board}:${name}`) ?? -Infinity) < 0.09) return true;
      if (destruction) recent.set(`${board}:${name}`, now);
      recent.set(name, now);
      const source = sound.context.createBufferSource(),
        panner = pan ? sound.context.createStereoPanner?.() : null;
      source.buffer = buffer;
      const volume = sound.context.createGain();
      const playbackRate = Math.max(0.8, Math.min(1.2, Number.isFinite(rate) ? rate : 1));
      const duration = Math.min(
        buffer.duration / playbackRate,
        destruction ? (maxDuration ?? 0.85) : Infinity,
      );
      source.playbackRate?.setValueAtTime(playbackRate, now);
      const level =
        Math.max(0, Math.min(1, Number.isFinite(gain) ? gain : 1)) * (attenuation.get(name) ?? 1);
      volume.gain.setValueAtTime(level, now);
      if (destruction) {
        volume.gain.setValueAtTime(level, now + Math.max(0, duration - 0.02));
        volume.gain.linearRampToValueAtTime?.(0, now + duration);
      }
      source.connect(volume);
      const bus = ui ? (sound.menuBus ?? sound.sfxBus) : sound.sfxBus;
      if (panner) {
        volume.connect(panner);
        panner.pan.setValueAtTime(Math.max(-1, Math.min(1, pan)), now);
        panner.connect(bus);
      } else volume.connect(bus);
      let stopped = false;
      const voice = {
        bus: ui ? 'menu' : 'sfx',
        name,
        board,
        feedback,
        humanReaction,
        cueFamily: name,
        priority,
        source,
        retire() {
          if (!humanReaction) {
            voice.stop();
            return;
          }
          volume.gain.cancelScheduledValues?.(sound.context.currentTime);
          volume.gain.setTargetAtTime?.(0, sound.context.currentTime, 0.008);
          source.stop(sound.context.currentTime + 0.04);
        },
        stop() {
          if (stopped) return;
          stopped = true;
          try {
            source.stop();
          } catch {}
          source.disconnect();
          volume.disconnect();
          panner?.disconnect();
          voices.delete(voice);
          sound.voices.delete(voice);
        },
      };
      source.onended = voice.stop;
      sound.voices.add(voice);
      voices.add(voice);
      try {
        source.start(now);
        source.stop(now + duration);
      } catch {
        voice.stop();
        return false;
      }
      return true;
    },
    cancelPending,
    close() {
      closed = true;
      if (ownsPreparation) preparation.close();
      for (const voice of [...voices]) voice.stop();
      cancelPending();
      cache.clear();
      decodedBytes = 0;
      attenuation.clear();
      recent.clear();
    },
  });
}

/** The page supplies only its accepted release host. No playlist, preferences,
 * imported asset or progress database is read or written by this adapter. */
export function attachPublishedAudio({
  sound,
  ready,
  getHost,
  allowMusic = () => true,
  cues = true,
  document: doc = globalThis.document,
}) {
  let closed = false,
    snapshot = null,
    explicitPresentation = false,
    player = null;
  const readAudio = (slot, options) => {
    if (closed || !snapshot || snapshot.resolved.assets[slot]?.kind !== 'audio') return null;
    return getHost()?.readAudio(slot, { ...options, snapshot }) ?? null;
  };
  const syncPlayer = () => {
    const accepted = snapshot,
      host = !closed && accepted ? getHost() : null;
    const asset = accepted?.resolved.assets['audio.music'];
    player?.setPublishedTrack?.(
      !closed && asset?.kind === 'audio'
        ? {
            id: `published.${asset.file.sha256}`,
            title: asset.description,
            allowed: allowMusic,
            readBlob: async (options) => {
              if (closed || snapshot !== accepted)
                throw new DOMException(t('interface:publishedThemeChanged'), 'AbortError');
              const result = await host?.readAudio('audio.music', {
                ...options,
                snapshot: accepted,
              });
              if (closed || snapshot !== accepted)
                throw new DOMException(t('interface:publishedThemeChanged'), 'AbortError');
              return result?.blob;
            },
          }
        : null,
    );
  };
  const loaded = Promise.resolve(ready)
    .then((value) => {
      if (closed || explicitPresentation) return;
      snapshot = value;
      if (snapshot && cues) sound.setPublishedAudio(readAudio);
      syncPlayer();
    })
    .catch(() => {});
  const detachMenuSettings = attachMenuAudioSettings(sound, doc);
  let keyboardFocus = false;
  const onKey = (event) => {
    keyboardFocus = event.key === 'Tab' || event.key.startsWith('Arrow');
  };
  const onPointer = () => {
    keyboardFocus = false;
  };
  const onFocus = (event) => {
    if (!keyboardFocus) return;
    if (event.target?.closest?.('button, a[href], input, select, textarea'))
      sound.publishedCue('focus');
  };
  const onClick = (event) => {
    const control = event.target?.closest?.('button, a[href]');
    if (!control || control.disabled || control.getAttribute('aria-disabled') === 'true') return;
    const cancel = control.matches?.(
      '[data-close], [data-shell-back], [data-dismiss], [id$="-cancel"], [id$="-close"], [id$="-back"]',
    );
    sound.publishedCue(cancel ? 'cancel' : 'confirm');
  };
  const onChange = (event) => {
    if (
      event.target?.matches?.('select, input[type=checkbox], input[type=radio], input[type=range]')
    )
      sound.publishedCue('confirm');
  };
  if (cues) {
    doc?.addEventListener?.('change', onChange);
    doc?.addEventListener?.('keydown', onKey);
    doc?.addEventListener?.('pointerdown', onPointer);
    doc?.addEventListener?.('focusin', onFocus);
    doc?.addEventListener?.('click', onClick);
  }
  return Object.freeze({
    ready: loaded,
    setPresentation(value) {
      if (closed || (explicitPresentation && snapshot === value)) return;
      explicitPresentation = true;
      snapshot = value;
      if (cues) sound.setPublishedAudio(snapshot ? readAudio : null);
      syncPlayer();
    },
    setPlayer(value) {
      player = value;
      syncPlayer();
    },
    close() {
      if (closed) return;
      closed = true;
      syncPlayer();
      if (cues) sound.setPublishedAudio(null);
      detachMenuSettings();
      doc?.removeEventListener?.('change', onChange);
      doc?.removeEventListener?.('keydown', onKey);
      doc?.removeEventListener?.('pointerdown', onPointer);
      doc?.removeEventListener?.('focusin', onFocus);
      doc?.removeEventListener?.('click', onClick);
    },
  });
}
