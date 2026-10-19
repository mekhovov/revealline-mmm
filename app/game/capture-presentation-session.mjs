import { MAX_REPLAY_TICKS } from './replay.mjs';
import { boundedJSON, exactKeys, required } from './data-json.mjs';
import {
  snapshotSession as snapshotNativeSession,
  restoreSession as restoreNativeSession,
  suspendSession as suspendNativeSession,
  SESSION_IMPORT_BYTES,
  SESSION_STORAGE_BYTES,
} from './sessions.mjs';
import { snapshotAttemptAppearance } from './presentation/attempt-appearance.mjs';

export const CAPTURE_PRESENTATION_SESSION_FORMAT = 'revealline-capture-presentation-session.v1';
// Presentation metadata shares the existing portable and local byte limits.
const importBytes = SESSION_IMPORT_BYTES;

/** Call with owned/validated session metadata, or for non-authoritative UI labels. */
export const nativeCaptureSession = (value) =>
  value?.format === CAPTURE_PRESENTATION_SESSION_FORMAT ? value.session : value;
export const captureSessionAppearance = (value) =>
  value?.format === CAPTURE_PRESENTATION_SESSION_FORMAT ? value.appearance : null;

/** Preserve the exact native format inside an independently versioned presentation envelope. */
export function snapshotCaptureSession(candidate) {
  const value = boundedJSON(candidate, {
    maxBytes: importBytes,
    // The bounded outer metadata adds nodes; native validation retains 3,100,000.
    maxNodes: 3100020,
    maxDepth: 30,
    maxArray: MAX_REPLAY_TICKS,
    maxString: 262144,
  });
  if (value.format !== CAPTURE_PRESENTATION_SESSION_FORMAT) return snapshotNativeSession(value);
  exactKeys(value, ['format', 'session', 'appearance'], 'Capture presentation session');
  const session = snapshotNativeSession(value.session);
  const appearance = snapshotAttemptAppearance(value.appearance);
  required(appearance !== null, 'A presentation session needs accepted artwork.');
  return { format: CAPTURE_PRESENTATION_SESSION_FORMAT, session, appearance };
}

export function withCaptureSessionAppearance(session, appearance) {
  const selected = snapshotAttemptAppearance(appearance);
  if (
    selected === null ||
    (selected.artRevision === null &&
      selected.collection === null &&
      selected.environmentPin === null)
  )
    return snapshotNativeSession(session);
  return snapshotCaptureSession({
    format: CAPTURE_PRESENTATION_SESSION_FORMAT,
    session,
    appearance: selected,
  });
}

export function suspendCaptureSession({ attemptAppearance = null, ...options }) {
  return withCaptureSessionAppearance(suspendNativeSession(options), attemptAppearance);
}

/** Native verification grants no environment authority; hosts restore artwork from
 * their authenticated source candidate before adopting this reconstructed run. */
export async function restoreCaptureSession(candidate, options) {
  const saved = snapshotCaptureSession(candidate);
  const restored = await restoreNativeSession(nativeCaptureSession(saved), options);
  return { ...restored, attemptAppearance: captureSessionAppearance(saved) };
}

export function saveCaptureSession(storage, key, candidate) {
  let text;
  try {
    text = JSON.stringify(snapshotCaptureSession(candidate));
  } catch (error) {
    return {
      ok: false,
      warning: `The saved attempt is invalid; your previous saved attempt is kept. ${error.message}`,
    };
  }
  if (new TextEncoder().encode(text).length > SESSION_STORAGE_BYTES)
    return {
      ok: false,
      warning:
        'This attempt exceeds the local save budget. Export it to a file; your previous saved attempt is kept.',
    };
  try {
    storage.setItem(key, text);
    // Keep the validated bytes for the caller's immediate storage readback.
    // A successful write alone does not establish readback or slot ownership.
    return { ok: true, warning: '', serialized: text };
  } catch {
    return {
      ok: false,
      warning: 'Browser storage is full or unavailable. Export the attempt to keep it.',
    };
  }
}
