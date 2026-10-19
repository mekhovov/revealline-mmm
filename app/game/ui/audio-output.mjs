/** Shared output topology for Capture, Snake and native flight presentation.
 * A page owns one context. Construction is called only from its gesture owner. */
export function createGameAudioContext(host = globalThis) {
  const Context = host.AudioContext ?? host.webkitAudioContext;
  return Context ? new Context({ latencyHint: 'interactive' }) : null;
}

export function createGameAudioOutput(context) {
  const output = {};
  for (const key of [
    'master',
    'gameplayBus',
    'musicBus',
    'sfxBus',
    'menuBus',
    'movementBus',
    'radioBus',
    'dialogueBus',
  ])
    output[key] = context.createGain();
  output.musicBus.connect(output.master);
  for (const key of ['sfxBus', 'menuBus', 'dialogueBus']) output[key].connect(output.gameplayBus);
  output.gameplayBus.connect(output.master);
  for (const key of ['movementBus', 'radioBus']) output[key].connect(output.sfxBus);
  output.compressor = context.createDynamicsCompressor?.();
  if (output.compressor) {
    output.compressor.threshold.value = -12;
    output.compressor.knee.value = 12;
    output.compressor.ratio.value = 5;
    output.master.connect(output.compressor);
    output.compressor.connect(context.destination);
  } else output.master.connect(context.destination);
  return output;
}

/** Down-mix effects after their panners, without touching music, media elements,
 * the master fader, or recording taps. A rejected configuration is not a pass. */
export function setGameEffectsMono(output, enabled) {
  const node = output?.gameplayBus;
  if (!node || typeof enabled !== 'boolean') return false;
  const previous = {
    channelCount: node.channelCount,
    channelCountMode: node.channelCountMode,
    channelInterpretation: node.channelInterpretation,
  };
  try {
    node.channelInterpretation = 'speakers';
    node.channelCount = enabled ? 1 : 2;
    node.channelCountMode = enabled ? 'explicit' : 'max';
    if (
      node.channelCount !== (enabled ? 1 : 2) ||
      node.channelCountMode !== (enabled ? 'explicit' : 'max') ||
      node.channelInterpretation !== 'speakers'
    )
      throw new Error('Channel configuration was not applied.');
    return true;
  } catch {
    for (const [key, value] of Object.entries(previous)) {
      try {
        node[key] = value;
      } catch {
        /* Preserve the browser's accepted path. */
      }
    }
    return false;
  }
}

/** Request the same audible iOS playback category before creating/resuming audio. */
export function requestPlaybackAudioSession(audioSession = globalThis.navigator?.audioSession) {
  if (!audioSession || typeof audioSession !== 'object') return false;
  try {
    if (audioSession.type !== 'playback') audioSession.type = 'playback';
    return audioSession.type === 'playback';
  } catch {
    return false;
  }
}
export function releasePlaybackAudioSession(audioSession = globalThis.navigator?.audioSession) {
  if (!audioSession || typeof audioSession !== 'object') return false;
  try {
    if (audioSession.type === 'playback') audioSession.type = 'auto';
    return audioSession.type !== 'playback';
  } catch {
    return false;
  }
}
