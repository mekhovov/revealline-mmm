import { createGameplayAudioPreferences } from '../gameplay-audio-preferences.mjs';
import { setGameEffectsMono } from './audio-output.mjs';

/** Presentation-only owner. Selecting a policy never constructs or resumes a
 * context. The engine attaches its already gesture-created graph explicitly. */
export function createGameplayAudioOutput(options = {}) {
  const preferences = createGameplayAudioPreferences(options),
    listeners = new Set();
  let output = null,
    state = preferences.snapshot(),
    status = 'inactive',
    disposed = false;
  const snapshot = () => ({ ...state, status });
  const apply = () => {
    if (disposed) return;
    status = !output
      ? 'inactive'
      : setGameEffectsMono(output, state.monoEffects)
        ? state.monoEffects
          ? 'mono'
          : 'original'
        : 'unsupported';
    for (const listener of [...listeners]) if (listeners.has(listener)) listener(snapshot());
  };
  const stop = preferences.subscribe((next) => {
    state = next;
    apply();
  });
  return Object.freeze({
    snapshot,
    choose: (enabled) => preferences.choose(enabled),
    retry: () => preferences.retry(),
    attach(graph) {
      if (!disposed) {
        output = graph;
        apply();
      }
    },
    subscribe(listener) {
      if (disposed) return () => {};
      listeners.add(listener);
      listener(snapshot());
      return () => listeners.delete(listener);
    },
    dispose() {
      if (disposed) return;
      disposed = true;
      stop();
      preferences.dispose();
      listeners.clear();
      output = null;
    },
  });
}
