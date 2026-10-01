import { boundedJSON, canonicalJSON, required, stableId } from '../data-json.mjs';
import { createPresentationHost } from './host.mjs';
import {
  VISUAL_THEME_PIN_FORMAT,
  snapshotVisualThemePin,
  validateVisualThemePinForContent,
} from './visual-theme-pin.mjs';

const abort = (signal) => {
  if (signal?.aborted) throw new DOMException('Theme preparation cancelled.', 'AbortError');
};

/** A presentation dependency lease, not a complete attempt or save authority.
 * The host factory is trusted code and must return a new unused host. Never pass
 * the page host. Callers retain their own current run until all dependencies pass.
 */
export async function prepareVisualThemeLease(
  { catalogue, selection, content, requiredSlots: sourceSlots },
  { createHost = createPresentationHost, signal, onStatus = () => {} } = {},
) {
  abort(signal);
  const match = catalogue.resolve(selection, content);
  if (match.kind !== 'compatible') return match;
  const requiredSlots = boundedJSON(sourceSlots, {
    maxBytes: 65536,
    maxNodes: 1024,
    maxArray: 512,
    maxString: 128,
  });
  required(
    Array.isArray(requiredSlots) &&
      requiredSlots.length > 0 &&
      requiredSlots.every(stableId) &&
      new Set(requiredSlots).size === requiredSlots.length,
    'Use authoritative unique required presentation slots.',
  );
  required(typeof createHost === 'function', 'A fresh presentation host factory is required.');
  const host = createHost();
  // An accidentally supplied active host belongs to its caller: do not close it.
  required(host.current() === null, 'Stage themes in a fresh presentation host.');
  let closed = false;
  const release = () => {
    if (closed) return;
    closed = true;
    host.close();
  };
  const check = () => {
    abort(signal);
    required(!closed, 'Theme lease is released.');
  };
  const report = (value) => {
    if (signal?.aborted || closed) return;
    try {
      onStatus(value);
    } catch {
      /* Presentation observers do not own resources. */
    }
  };
  try {
    const snapshot = await host.load({
      signal,
      expectedManifestSha256: match.presentation.sha256,
      onStatus: (value) => {
        if (!['ready', 'error'].includes(value.status)) report(value);
      },
    });
    check();
    catalogue.verifyPresentationIdentity(
      match,
      {
        source: snapshot.source,
        theme: { id: snapshot.resolved.theme.id, revision: snapshot.resolved.theme.revision },
        collection: snapshot.resolved.collection,
        sha256: snapshot.manifestSha256,
        slots: Object.keys(snapshot.resolved.bindings),
      },
      requiredSlots,
    );
    report({
      status: 'ready',
      stage: 'ready',
      progress: null,
      message: 'The exact theme presentation is ready.',
    });
    check();
    // Return transfers ownership. Later signal changes must not kill an adopted
    // attempt; its owner explicitly calls release when this lease is retired.
    return Object.freeze({
      kind: 'prepared-presentation',
      match,
      snapshot,
      release,
      pin() {
        required(!closed, 'Theme lease is released.');
        return snapshotVisualThemePin({
          format: VISUAL_THEME_PIN_FORMAT,
          content: match.content,
          selection: match.selection,
          presentation: {
            source: snapshot.source,
            theme: { id: snapshot.resolved.theme.id, revision: snapshot.resolved.theme.revision },
            collection: snapshot.resolved.collection,
            sha256: snapshot.manifestSha256,
          },
        });
      },
      apply(element) {
        required(!closed, 'Theme lease is released.');
        return host.apply(element);
      },
      readPicture(slot, options = {}) {
        required(!closed, 'Theme lease is released.');
        return host.readPicture(slot, { ...options, snapshot });
      },
      readAudio(slot, options = {}) {
        required(!closed, 'Theme lease is released.');
        return host.readAudio(slot, { ...options, snapshot });
      },
    });
  } catch (error) {
    if (error.name !== 'AbortError')
      report({
        status: 'error',
        stage: 'error',
        progress: null,
        message: `Theme preparation failed: ${error.message}`,
      });
    release();
    throw error;
  }
}

/** Retained selection takes precedence over fresh-attempt preferences. Missing
 * exact catalogue coverage stays an explicit recovery outcome, never "latest".
 */
export async function prepareRetainedVisualThemeLease(
  { pin: source, catalogue, content, requiredSlots },
  options = {},
) {
  abort(options.signal);
  const pin = validateVisualThemePinForContent(source, content);
  const match = catalogue.resolve(pin.selection, pin.content);
  if (match.kind !== 'compatible') return match;
  required(
    canonicalJSON(match.presentation) === canonicalJSON(pin.presentation),
    'Retained presentation differs from the exact catalogue revision.',
  );
  return prepareVisualThemeLease(
    { catalogue, selection: pin.selection, content: pin.content, requiredSlots },
    options,
  );
}
