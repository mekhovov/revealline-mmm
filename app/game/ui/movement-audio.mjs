export const MOVEMENT_AUDIO_KEY = 'revealline-mmm.movement-audio.v1';
export function readMovementAudio(storage) {
  try {
    storage ??= globalThis.localStorage;
    const value = JSON.parse(storage?.getItem(MOVEMENT_AUDIO_KEY) ?? 'null');
    return {
      enabled: typeof value?.enabled === 'boolean' ? value.enabled : true,
      volume:
        Number.isFinite(value?.volume) && value.volume >= 0 && value.volume <= 1
          ? value.volume
          : 0.5,
    };
  } catch {
    return { enabled: true, volume: 0.5 };
  }
}
