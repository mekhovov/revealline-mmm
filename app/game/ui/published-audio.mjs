import { attachMenuAudioSettings } from './menu-audio.mjs';
import { t } from '../i18n/index.mjs';
const cueNames = new Set(['focus', 'confirm', 'cancel', 'capture', 'failure', 'victory', 'pickup']);

/** Read-only session cache. An unavailable cue uses its existing procedural
 * fallback; a late decode never replays an event that has already happened. */
export function createPublishedCues({ sound, readAudio }) {
  const cache = new Map(),
    pending = new Set(),
    voices = new Set(),
    recent = new Map();
  let closed = false;
  const cancelPending = () => {
    for (const controller of pending) controller.abort();
    pending.clear();
    for (const [key, value] of cache) if (value === 'loading') cache.delete(key);
  };
  return Object.freeze({
    play(name, { ui = false } = {}) {
      if (
        closed ||
        !cueNames.has(name) ||
        !sound.enabled ||
        sound.paused ||
        sound.disposed ||
        !sound.context ||
        sound.context.state !== 'running' ||
        !sound.settings.master ||
        (!ui && !sound.settings.sfx) ||
        (ui && sound.menuSettings?.enabled === false) ||
        (!ui && sound.persistentMusic && sound.gameplayPaused)
      )
        return false;
      const buffer = cache.get(name);
      if (buffer === undefined && typeof sound.context.decodeAudioData === 'function') {
        const controller = new AbortController();
        pending.add(controller);
        cache.set(name, 'loading');
        void Promise.resolve()
          .then(() => readAudio(`audio.${name}`, { signal: controller.signal }))
          .then(async (result) => {
            if (!result || controller.signal.aborted || closed || !sound.enabled) return null;
            const decoded = await sound.context.decodeAudioData(await result.blob.arrayBuffer());
            if (closed || controller.signal.aborted || !sound.enabled) return null;
            if (
              !Number.isFinite(decoded.duration) ||
              decoded.duration <= 0 ||
              decoded.duration > 15 ||
              decoded.length * decoded.numberOfChannels > 4 * 1024 * 1024
            )
              throw new Error(t('interface:publishedCueExceedsItsDecodedBudget'));
            return decoded;
          })
          .then((decoded) => {
            if (!closed && !controller.signal.aborted) cache.set(name, decoded ?? false);
          })
          .catch(() => {
            if (!closed && !controller.signal.aborted) cache.set(name, false);
          })
          .finally(() => pending.delete(controller));
        return false;
      }
      if (!buffer || buffer === 'loading') return false;
      const now = sound.context.currentTime;
      if (ui && now - (recent.get(name) ?? -Infinity) < 0.08) return true;
      if (sound.voices.size >= 64) return false;
      recent.set(name, now);
      const source = sound.context.createBufferSource();
      source.buffer = buffer;
      source.connect(ui ? (sound.menuBus ?? sound.sfxBus) : sound.sfxBus);
      let stopped = false;
      const voice = {
        bus: ui ? 'menu' : 'sfx',
        stop() {
          if (stopped) return;
          stopped = true;
          try {
            source.stop();
          } catch {}
          source.disconnect();
          voices.delete(voice);
          sound.voices.delete(voice);
        },
      };
      source.onended = voice.stop;
      sound.voices.add(voice);
      voices.add(voice);
      source.start(now);
      source.stop(now + buffer.duration);
      return true;
    },
    cancelPending,
    close() {
      closed = true;
      for (const voice of [...voices]) voice.stop();
      cancelPending();
      cache.clear();
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
