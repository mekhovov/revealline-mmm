import { musicCreatorLinks, renderMusicCreatorLinks } from './music-credits.mjs';
import { t, getLocale, onLocaleChange, localizedText, localizedAttribute } from '../i18n/index.mjs';
const statusKeys = {
  idle: 'common:music.status.idle',
  loading: 'common:music.status.loading',
  playing: 'common:music.status.playing',
  paused: 'common:status.paused',
  blocked: 'common:music.status.blocked',
  error: 'common:music.status.error',
  ended: 'common:music.status.ended',
  suspended: 'common:music.status.suspended',
  disposed: 'common:music.status.disposed',
};
export const musicStatusLabel = (status) => (statusKeys[status] ? t(statusKeys[status]) : status);

/** Passive presentation only: transport, pause and navigation remain host-owned. */
export function attachMusicCredit({ document: doc, root, pauseButton, prefix }) {
  const details = doc.createElement('section');
  details.id = `${prefix}-music-details`;
  details.className = 'music-credit-details';
  localizedAttribute(details, 'aria-label', () => t('interface:currentSoundtrackDetails'));
  const title = doc.createElement('p'),
    artist = doc.createElement('p'),
    file = doc.createElement('p'),
    source = doc.createElement('p');
  details.append(title, artist, file, source);
  root.append(details);
  const previousDescription = pauseButton?.getAttribute('aria-description');
  pauseButton?.classList.add('compact-track-pause');
  let disposed = false,
    identity = null,
    description = null,
    lastPlayback = {},
    lastMaster = {};
  const text = (value, fallback) =>
    typeof value === 'string' && value.trim() ? value.trim() : fallback;
  function render(playback = {}, master = {}) {
    if (disposed) return;
    lastPlayback = playback;
    lastMaster = master;
    const track = playback.track,
      name = text(track?.title, t('interface:noTrackSelected')),
      performer = text(track?.artist, t('interface:artistNotRecorded')),
      filename = text(
        track?.fileName,
        track?.kind === 'synth'
          ? t('interface:builtInSynthesizedMusic')
          : t('interface:originalFilenameNotRecorded'),
      ),
      creatorLinks = musicCreatorLinks(track),
      muted = master.muted || master.volume === 0 || playback.volume === 0,
      caption = !track
        ? t('interface:musicOff')
        : muted
          ? t('common:music.muted', { title: name })
          : playback.playing
            ? `♪ ${name}`
            : t('common:music.paused', { title: name }),
      key = JSON.stringify([getLocale(), name, performer, filename, creatorLinks, caption]);
    if (key === identity) return;
    identity = key;
    localizedText(title, () => t('common:music.track', { title: name }));
    localizedText(artist, () => t('common:music.artist', { artist: performer }));
    localizedText(file, () => t('common:music.file', { filename }));
    renderMusicCreatorLinks(source, track, {
      document: doc,
      fallbackText: t('interface:sourceWebsiteNotRecorded'),
    });
    if (pauseButton) {
      pauseButton.setAttribute('data-track-caption', caption);
      description = t('common:music.pauseDescription', { caption });
      pauseButton.setAttribute('aria-description', description);
    }
  }
  const unsubscribeLocale = onLocaleChange(() => render(lastPlayback, lastMaster));
  render();
  return Object.freeze({
    render,
    element: details,
    dispose() {
      if (disposed) return;
      disposed = true;
      unsubscribeLocale();
      details.remove();
      pauseButton?.classList.remove('compact-track-pause');
      pauseButton?.removeAttribute('data-track-caption');
      if (pauseButton?.getAttribute('aria-description') === description) {
        if (previousDescription === null) pauseButton.removeAttribute('aria-description');
        else pauseButton.setAttribute('aria-description', previousDescription);
      }
    },
  });
}
