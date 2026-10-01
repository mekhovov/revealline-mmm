import { t } from '../i18n/index.mjs';
const volumeValue = (value) => {
  if (!Number.isFinite(value) || value < 0 || value > 1)
    throw new TypeError(t('interface:audioVolumeMustBeBetweenZeroAndOne'));
  return value;
};
const mutedValue = (value) => {
  if (typeof value !== 'boolean') throw new TypeError(t('interface:audioMuteMustBeABoolean'));
  return value;
};

/** Shared output policy only. Hosts retain persistence, gestures and transport. */
export function createAudioMaster({ muted = true, volume = 1 } = {}) {
  let state = Object.freeze({ muted: mutedValue(muted), volume: volumeValue(volume), revision: 0 });
  let disposed = false;
  const listeners = new Set();
  function publish(next) {
    state = Object.freeze({ ...next, revision: state.revision + 1 });
    const errors = [];
    for (const listener of [...listeners]) {
      if (!listeners.has(listener)) continue;
      try {
        // A preceding observer may have applied a newer explicit intent.
        listener(state);
      } catch (error) {
        errors.push(error);
      }
    }
    if (errors.length)
      throw new AggregateError(errors, t('interface:audioMasterOutputCouldNotBeApplied'));
    return state;
  }
  function change(patch) {
    if (disposed) throw new Error(t('interface:audioMasterIsDisposed'));
    return publish({ ...state, ...patch });
  }
  return Object.freeze({
    snapshot: () => state,
    setMuted: (value) => change({ muted: mutedValue(value) }),
    setVolume: (value) => change({ volume: volumeValue(value) }),
    subscribe(listener) {
      if (disposed) throw new Error(t('interface:audioMasterIsDisposed'));
      if (typeof listener !== 'function')
        throw new TypeError(t('interface:audioMasterListenerRequired'));
      if (listeners.has(listener))
        throw new Error(t('interface:audioMasterListenerAlreadySubscribed'));
      listeners.add(listener);
      try {
        listener(state);
      } catch (error) {
        listeners.delete(listener);
        throw error;
      }
      return () => listeners.delete(listener);
    },
    dispose() {
      if (disposed) return;
      disposed = true;
      try {
        publish({ ...state, muted: true });
      } finally {
        listeners.clear();
      }
    },
  });
}

const mediaOwners = new WeakSet();
/** Native media keeps its own local fader. Queued native events cannot rewrite
 * master or local intent; explicit local controls call setLocal instead. */
export function bindAudioMasterMedia({ audioMaster, element, volume = 1, muted = false } = {}) {
  if (!audioMaster?.snapshot || !audioMaster?.subscribe)
    throw new TypeError(t('interface:audioMasterRequired'));
  if (!element?.addEventListener || !element?.removeEventListener)
    throw new TypeError(t('interface:audioMediaElementRequired'));
  if (mediaOwners.has(element))
    throw new Error(t('interface:audioMediaElementAlreadyHasAMasterOwner'));
  let local = { volume: volumeValue(volume), muted: mutedValue(muted) };
  let master = audioMaster.snapshot();
  let disposed = false;
  let applying = false;
  const attempted = new Map();
  const write = (key, value) => {
    const observed = element[key];
    const previous = attempted.get(key);
    if (observed === value || (previous?.value === value && previous.observed === observed)) return;
    element[key] = value;
    // Some native platforms ignore/quantize volume. Their queued notification
    // must not cause an endless attempt to write the same unsupported value.
    attempted.set(key, { value, observed: element[key] });
  };
  const apply = () => {
    if (disposed || applying) return;
    const muted = local.muted || master.muted || local.volume === 0 || master.volume === 0;
    const volume = local.volume * master.volume;
    // Setting an unchanged property may still enqueue a native volumechange.
    // Mute first so a simultaneous volume increase cannot escape the gate.
    applying = true;
    try {
      if (muted) write('muted', true);
      write('volume', volume);
      if (!muted) write('muted', false);
    } finally {
      applying = false;
    }
  };
  mediaOwners.add(element);
  let unsubscribe;
  try {
    unsubscribe = audioMaster.subscribe((next) => {
      master = next;
      apply();
    });
    element.addEventListener('volumechange', apply);
    element.addEventListener('play', apply);
  } catch (error) {
    unsubscribe?.();
    element.removeEventListener('volumechange', apply);
    element.removeEventListener('play', apply);
    mediaOwners.delete(element);
    throw error;
  }
  return Object.freeze({
    setLocal(patch) {
      if (disposed) return;
      if (!patch || typeof patch !== 'object' || Array.isArray(patch))
        throw new TypeError(t('interface:localAudioSettingsRequired'));
      const next = { ...local };
      for (const key of Object.keys(patch)) {
        if (key === 'volume') next.volume = volumeValue(patch.volume);
        else if (key === 'muted') next.muted = mutedValue(patch.muted);
        else throw new TypeError(t('interface:unknownLocalAudioSetting'));
      }
      local = next;
      apply();
    },
    dispose() {
      if (disposed) return;
      disposed = true;
      unsubscribe();
      element.removeEventListener('volumechange', apply);
      element.removeEventListener('play', apply);
      mediaOwners.delete(element);
      if (element.muted !== true) element.muted = true;
    },
  });
}
