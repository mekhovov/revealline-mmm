import { MOVEMENT_AUDIO_KEY } from './movement-audio.mjs';
import { RADIO_AUDIO_KEY } from './radio-audio.mjs';
import { t, localizedText } from '../i18n/index.mjs';
export const MENU_AUDIO_KEY = 'revealline-mmm.menu-audio.v1';
export function readMenuAudio(storage) {
  try {
    storage ??= globalThis.localStorage;
    const value = JSON.parse(storage?.getItem(MENU_AUDIO_KEY) ?? 'null');
    return {
      enabled: typeof value?.enabled === 'boolean' ? value.enabled : true,
      volume:
        Number.isFinite(value?.volume) && value.volume >= 0 && value.volume <= 1
          ? value.volume
          : 0.35,
    };
  } catch {
    return { enabled: true, volume: 0.35 };
  }
}
export function saveMenuAudio(value) {
  try {
    globalThis.localStorage?.setItem(MENU_AUDIO_KEY, JSON.stringify(value));
  } catch {
    /* Session intent stays on Soundscape. */
  }
}
export function attachMenuAudioSettings(sound, doc = globalThis.document) {
  const menu = attachPreference(
    sound,
    doc,
    'menu',
    'menuSettings',
    MENU_AUDIO_KEY,
    'menuSounds',
    'menuVolume',
  );
  const radio = attachPreference(
    sound,
    doc,
    'radio',
    'radioSettings',
    RADIO_AUDIO_KEY,
    'radioSounds',
    'radioVolume',
  );
  const movement = attachPreference(
    sound,
    doc,
    'movement',
    'movementSettings',
    MOVEMENT_AUDIO_KEY,
    'movementSounds',
    'movementVolume',
  );
  return () => {
    movement();
    menu();
    radio();
  };
}
function attachPreference(sound, doc, prefix, property, key, enableCopy, volumeCopy) {
  if (!sound[property] || !doc?.createElement) return () => {};
  const target =
    doc.getElementById('sfx-volume')?.parentElement?.parentElement ??
    doc.getElementById('race-settings-panel-audio') ??
    doc.getElementById('coop-settings-panel-audio') ??
    doc.getElementById('settings-panel-audio') ??
    doc.getElementById('settings-dialog');
  if (!target || target.querySelector(`[data-${prefix}-audio]`)) return () => {};
  const group = doc.createElement('div');
  group.dataset[`${prefix}Audio`] = '';
  group.style.display = 'grid';
  group.style.gap = '0.75rem';
  const enabledLabel = doc.createElement('label'),
    enabled = doc.createElement('input');
  enabled.id = `${prefix}-audio-enabled`;
  enabled.type = 'checkbox';
  enabled.style.width = 'auto';
  enabled.style.margin = '0';
  enabledLabel.style.display = 'flex';
  enabledLabel.style.alignItems = 'center';
  enabledLabel.style.gap = '0.6rem';
  enabled.checked = sound[property].enabled;
  const enabledText = doc.createElement('span');
  localizedText(enabledText, () => t(`common:${enableCopy}`));
  enabledLabel.append(enabled, enabledText);
  const volumeLabel = doc.createElement('label'),
    volume = doc.createElement('input');
  volume.id = `${prefix}-audio-volume`;
  volume.type = 'range';
  volumeLabel.style.display = 'grid';
  volumeLabel.style.gap = '0.35rem';
  volume.min = '0';
  volume.max = '100';
  volume.step = '1';
  volume.value = String(Math.round(sound[property].volume * 100));
  volume.setAttribute('aria-label', t(`common:${volumeCopy}`));
  const volumeText = doc.createElement('span');
  volumeText.id = `${prefix}-audio-volume-label`;
  const volumeCaption = () =>
    `${t(`common:${volumeCopy}`)} · ${Math.round(sound[property].volume * 100)}%`;
  localizedText(volumeText, volumeCaption);
  volumeLabel.append(volumeText, volume);
  const change = () => {
    sound[property] = { enabled: enabled.checked, volume: Number(volume.value) / 100 };
    try {
      globalThis.localStorage?.setItem(key, JSON.stringify(sound[property]));
    } catch {
      /* Preserve session intent. */
    }
    sound.applyVolumes();
    volumeText.textContent = volumeCaption();
  };
  enabled.addEventListener('change', change);
  volume.addEventListener('input', change);
  group.append(enabledLabel, volumeLabel);
  target.append(group);
  const restore = () => {
    enabled.checked = sound[property].enabled;
    volume.value = String(Math.round(sound[property].volume * 100));
    volumeText.textContent = volumeCaption();
  };
  globalThis.addEventListener?.('pageshow', restore);
  return () => {
    globalThis.removeEventListener?.('pageshow', restore);
    enabled.removeEventListener('change', change);
    volume.removeEventListener('input', change);
    group.remove();
  };
}
