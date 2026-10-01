import { SOUNDTRACK_MODES } from '../soundtrack.mjs';
import { onLocaleChange, t } from '../i18n/index.mjs';
import { musicStatusLabel } from './music-credit.mjs';

function sourceWebsite(track) {
  for (const value of [
    ...(Array.isArray(track?.websites) ? track.websites.map((site) => site?.url) : []),
    track?.rights?.source,
  ]) {
    try {
      const url = new URL(value);
      if (['https:', 'http:'].includes(url.protocol) && !url.username && !url.password)
        return url.href;
    } catch {
      // Older credits can contain plain text instead of a website.
    }
  }
  return null;
}

/** A view over the host's shared audio transport; owns no shortcuts, player or settings. */
export function attachDemoAudio({
  root,
  document: doc = root?.ownerDocument ?? globalThis.document,
  audio = null,
  getGameSounds = () => false,
  onGameSoundsChange = () => {},
  active = () => true,
  onError = () => {},
} = {}) {
  if (!root) return { render() {}, reset() {}, contains: () => false, dispose() {} };
  const prefix = root.id || 'demo-audio';
  const node = (tag, name, className = '') => {
    const element = doc.createElement(tag);
    element.id = `${prefix}-${name}`;
    element.className = className;
    return element;
  };
  const main = node('div', 'main', 'demo-audio-main'),
    transport = node('div', 'transport', 'demo-audio-transport'),
    credit = node('div', 'credit', 'demo-audio-credit'),
    title = node('span', 'title'),
    artist = node('span', 'artist'),
    source = node('a', 'source'),
    settings = node('details', 'settings', 'demo-audio-settings'),
    summary = node('summary', 'options'),
    status = node('p', 'status', 'demo-audio-status');
  const button = (name) => {
    const element = node('button', name, 'button secondary');
    element.type = 'button';
    return element;
  };
  const mute = button('mute'),
    toggle = button('toggle'),
    next = button('next'),
    playStyle = button('play-style');
  function field(tag, name) {
    const label = node('label', `${name}-field`, 'demo-audio-field'),
      copy = node('span', `${name}-label`),
      control = node(tag, name);
    label.setAttribute('for', control.id);
    label.append(copy, control);
    settings.append(label);
    return { label: copy, control };
  }
  settings.append(summary);
  const volume = field('input', 'volume'),
    style = field('select', 'style'),
    sounds = field('select', 'sounds');
  volume.control.type = 'range';
  volume.control.min = '0';
  volume.control.max = '1';
  volume.control.step = '0.01';
  const option = (parent, value) => {
    const element = doc.createElement('option');
    element.value = value;
    parent.append(element);
    return element;
  };
  const styleOptions = SOUNDTRACK_MODES.map((mode) => [mode, option(style.control, mode)]),
    musicOnly = option(sounds.control, 'music'),
    musicAndGame = option(sounds.control, 'game');
  settings.insertBefore(playStyle, sounds.control.parentElement);
  source.setAttribute('target', '_blank');
  source.setAttribute('rel', 'noopener noreferrer');
  root.setAttribute('data-demo-ui', '');
  root.setAttribute('role', 'group');
  status.setAttribute('role', 'status');
  status.setAttribute('aria-live', 'polite');
  transport.append(mute, toggle, next);
  credit.append(title, artist, source);
  main.append(credit, transport);
  root.append(main, settings, status);
  let disposed = false,
    operation = 0,
    warning = false,
    draftStyle = null,
    observedStyle = null;
  const state = () => audio?.snapshot?.() ?? null;
  const pausable = (snapshot) =>
    snapshot?.desired && !['blocked', 'error', 'ended'].includes(snapshot.status);
  function render() {
    if (disposed) return;
    const snapshot = state(),
      playbackAvailable = !!snapshot && snapshot.playbackAvailable !== false,
      currentStyle = SOUNDTRACK_MODES.includes(snapshot?.style) ? snapshot.style : 'auto';
    if (draftStyle === null || currentStyle !== observedStyle) draftStyle = currentStyle;
    observedStyle = currentStyle;
    root.setAttribute('aria-label', t('demo:audio.controls'));
    mute.textContent = t(snapshot?.muted ? 'demo:audio.soundOn' : 'demo:audio.soundOff');
    mute.setAttribute('aria-pressed', String(!!snapshot?.muted));
    toggle.textContent = t(pausable(snapshot) ? 'demo:audio.pause' : 'demo:audio.play');
    next.textContent = t('demo:audio.next');
    summary.textContent = t('demo:audio.options');
    volume.label.textContent = t('demo:audio.volume');
    style.label.textContent = t('demo:audio.style');
    sounds.label.textContent = t('demo:audio.soundMode');
    playStyle.textContent = t('demo:audio.playStyle');
    for (const [mode, element] of styleOptions)
      element.textContent = t(
        mode === 'auto'
          ? 'interface:automaticMatchThisWorld'
          : mode === 'fusion'
            ? 'interface:fusion'
            : mode === 'mix'
              ? 'interface:myMix'
              : `interface:soundtrack.genre.${mode}`,
      );
    style.control.value = draftStyle;
    musicOnly.textContent = t('demo:audio.musicOnly');
    musicAndGame.textContent = t('demo:audio.musicAndGame');
    sounds.control.value = getGameSounds() ? 'game' : 'music';
    volume.control.value = String(Math.max(0, Math.min(1, snapshot?.volume ?? 0)));
    volume.control.setAttribute(
      'aria-valuetext',
      `${Math.round(Number(volume.control.value) * 100)}%`,
    );
    mute.disabled = !snapshot || !audio?.setMuted;
    toggle.disabled = !playbackAvailable || !audio?.play || !audio?.pause;
    next.disabled = !playbackAvailable || !snapshot?.queue?.length || !audio?.next;
    volume.control.disabled = !snapshot || !audio?.setVolume;
    style.control.disabled = playStyle.disabled = !playbackAvailable || !audio?.selectStyle;
    title.textContent = snapshot?.track?.title || t('interface:noTrackSelected');
    artist.textContent = snapshot?.track?.artist || t('interface:artistNotRecorded');
    const url = sourceWebsite(snapshot?.track);
    source.textContent = t('demo:audio.source');
    source.hidden = !url;
    if (url) source.setAttribute('href', url);
    else source.removeAttribute('href');
    status.textContent = !playbackAvailable
      ? t('demo:audio.unavailable')
      : warning
        ? t('demo:audio.failed')
        : snapshot.notice || musicStatusLabel(snapshot.status);
  }
  function run(action) {
    if (disposed || !active()) return;
    const ticket = ++operation,
      current = () => !disposed && ticket === operation && active();
    warning = false;
    const failed = (error) => {
      if (!current()) return;
      warning = true;
      onError(error);
    };
    try {
      const pending = action();
      render();
      Promise.resolve(pending)
        .catch(failed)
        .finally(() => {
          if (current()) render();
        });
    } catch (error) {
      failed(error);
      render();
    }
  }
  function withWake(action) {
    // Both calls stay in the original user activation task.
    const wake = audio?.wake?.();
    try {
      return Promise.all([wake, action()]);
    } catch (error) {
      return Promise.all([wake, Promise.reject(error)]);
    }
  }
  mute.onclick = () =>
    run(() => {
      const muted = !state()?.muted,
        changed = audio?.setMuted?.(muted);
      return muted ? changed : withWake(() => changed);
    });
  toggle.onclick = () =>
    run(() => (pausable(state()) ? audio?.pause?.() : withWake(() => audio?.play?.())));
  next.onclick = () => run(() => withWake(() => audio?.next?.()));
  volume.control.oninput = () => run(() => audio?.setVolume?.(Number(volume.control.value)));
  style.control.onchange = () => {
    if (SOUNDTRACK_MODES.includes(style.control.value)) draftStyle = style.control.value;
  };
  playStyle.onclick = () => run(() => withWake(() => audio?.selectStyle?.(draftStyle)));
  sounds.control.onchange = () => run(() => onGameSoundsChange(sounds.control.value === 'game'));
  const unsubscribe = audio?.subscribe?.(render),
    unsubscribeLocale = onLocaleChange(render);
  render();
  return {
    render,
    reset() {
      operation++;
      warning = false;
      draftStyle = null;
    },
    contains: (target) => !disposed && !!target && root.contains(target),
    dispose() {
      if (disposed) return;
      disposed = true;
      operation++;
      unsubscribe?.();
      unsubscribeLocale();
      for (const element of [mute, toggle, next, playStyle]) element.onclick = null;
      volume.control.oninput = style.control.onchange = sounds.control.onchange = null;
      main.remove();
      settings.remove();
      status.remove();
    },
  };
}
