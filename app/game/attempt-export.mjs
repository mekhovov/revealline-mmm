import { boundedJSON, plainObject, required } from './data-json.mjs';
import { campaignKey } from './library.mjs';
import { verifyReplayAsync } from './replay.mjs';
import { snapshotSession, restoreSession } from './sessions.mjs';

function exportOptions(value) {
  required(plainObject(value), 'Attempt export options must be an object.');
  const options = {};
  for (const key of Reflect.ownKeys(value)) {
    required(
      ['campaign', 'signal', 'onProgress', 'mediaIdentityCatalog'].includes(key),
      'Unsupported attempt export option.',
    );
    const descriptor = Object.getOwnPropertyDescriptor(value, key);
    required(
      descriptor.enumerable && Object.hasOwn(descriptor, 'value'),
      'Attempt export options must have own enumerable data fields.',
    );
    options[key] = descriptor.value;
  }
  required(
    options.onProgress === undefined || typeof options.onProgress === 'function',
    'Attempt export onProgress must be a function.',
  );
  // The signal is a host capability, not portable JSON. Keep its live abort
  // state; do not copy it or require a same-realm AbortSignal constructor.
  required(
    options.signal === undefined ||
      (options.signal !== null &&
        typeof options.signal === 'object' &&
        typeof options.signal.aborted === 'boolean'),
    'Attempt export signal must expose a boolean aborted state.',
  );
  return options;
}

function checkAbort(signal) {
  if (signal?.aborted) {
    const error = new Error('Attempt export preparation was cancelled.');
    error.name = 'AbortError';
    throw error;
  }
}

function freeze(value) {
  if (value && typeof value === 'object') {
    for (const child of Object.values(value)) freeze(child);
    Object.freeze(value);
  }
  return value;
}

/**
 * Verify an owned unfinished-session file without adopting reconstructed state.
 * Supply an exact trusted campaign, including its actual classRecipes, when
 * available. Omission permits replay-only rescue; supplied invalid/mismatching
 * context always rejects. Neither result grants persistence or award authority.
 */
export async function prepareAttemptExport(candidate, options = {}) {
  const { campaign, signal, onProgress, mediaIdentityCatalog } = exportOptions(options);
  checkAbort(signal);
  // Own all portable data before yielding or calling host progress callbacks.
  const session = snapshotSession(candidate);
  const installed = campaign === undefined ? undefined : boundedJSON(campaign);
  let context;
  if (installed !== undefined) {
    const key = campaignKey(installed);
    required(
      key === session.campaignKey,
      'This saved attempt belongs to a different campaign or rules revision.',
    );
    // Restore verifies the actual map, entire roster, checkpoint and unfinished
    // state. Discard its run/recorder: resuspending would alter release markers.
    await restoreSession(session, {
      campaign: installed,
      campaignKey: key,
      signal,
      onProgress,
      mediaIdentityCatalog,
    });
    context = 'installed-campaign';
  } else {
    const checked = await verifyReplayAsync(session.replay, { signal, onProgress });
    checkAbort(signal);
    required(checked.match, 'Saved attempt replay verification failed.');
    required(
      ['running', 'respawning'].includes(checked.state.status),
      'This attempt has already ended.',
    );
    // A self-contained replay does not establish its outer campaign key.
    context = 'replay-only';
  }
  // A final progress callback may cancel after the verifier's last yield.
  checkAbort(signal);
  return freeze({ session, context });
}
