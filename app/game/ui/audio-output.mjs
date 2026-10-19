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
    'musicBus',
    'sfxBus',
    'menuBus',
    'movementBus',
    'radioBus',
    'dialogueBus',
  ])
    output[key] = context.createGain();
  for (const key of ['musicBus', 'sfxBus', 'menuBus', 'dialogueBus'])
    output[key].connect(output.master);
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
