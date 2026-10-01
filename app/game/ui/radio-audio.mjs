export const RADIO_AUDIO_KEY = 'revealline-mmm.radio-audio.v1';
export function readRadioAudio(storage) {
  try {
    storage ??= globalThis.localStorage;
    const value = JSON.parse(storage?.getItem(RADIO_AUDIO_KEY) ?? 'null');
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
