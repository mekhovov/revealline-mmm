import { required } from '../data-json.mjs';
import { ASSET_SLOTS } from './catalog.mjs';
import {
  createVisualThemeCatalogue,
  VISUAL_THEME_CATALOGUE_LIMITS,
} from './visual-theme-catalogue.mjs';
import { prepareCampaignVisualThemeContext } from './visual-theme-identities.mjs';
import { snapshotVisualThemePin } from './visual-theme-pin.mjs';
import { prepareRetainedVisualThemeLease } from './visual-theme-lease.mjs';
import { createPresentationHost } from './host.mjs';

const abort = (signal) => {
  if (signal?.aborted) throw new DOMException('Saved theme preparation cancelled.', 'AbortError');
};
export const SAVED_SOLO_VISUAL_SLOTS = Object.freeze(
  ASSET_SLOTS.filter(
    (slot) => slot.required && slot.group !== 'pictures' && slot.screens.includes('flight'),
  ).map((slot) => slot.id),
);

/** Read the code-owned same-build declaration. Saves never supply URLs. */
export async function readSavedVisualCatalogue({
  baseURL,
  fetch: request = globalThis.fetch,
  signal,
} = {}) {
  abort(signal);
  const base = new URL(baseURL),
    url = new URL('../visual-themes.json', base);
  required(
    ['http:', 'https:', 'revealline:', 'capacitor:'].includes(base.protocol) &&
      !base.username &&
      !base.password &&
      !base.search &&
      !base.hash &&
      base.pathname.endsWith('/compiled/'),
    'Use the matching game presentation directory.',
  );
  const response = await request(url.href, {
    signal,
    redirect: 'error',
    credentials: 'same-origin',
  });
  let reader,
    complete = false;
  try {
    abort(signal);
    required(
      response.ok && !response.redirected && (!response.url || response.url === url.href),
      'The saved theme catalogue is unavailable. Retry when connected to its matching release.',
    );
    const length = response.headers?.get('content-length');
    required(
      length == null ||
        (/^\d+$/.test(length) &&
          Number(length) > 0 &&
          Number(length) <= VISUAL_THEME_CATALOGUE_LIMITS.bytes),
      'The saved theme catalogue exceeds its budget.',
    );
    required(response.body?.getReader, 'A bounded saved theme response is required.');
    reader = response.body.getReader();
  } catch (error) {
    await response.body?.cancel?.().catch(() => {});
    throw error;
  }
  const cancel = () => {
    void reader.cancel().catch(() => {});
  };
  signal?.addEventListener('abort', cancel, { once: true });
  const chunks = [];
  let size = 0;
  try {
    for (;;) {
      abort(signal);
      const part = await reader.read();
      abort(signal);
      if (part.done) {
        complete = true;
        break;
      }
      size += part.value.byteLength;
      required(
        size <= VISUAL_THEME_CATALOGUE_LIMITS.bytes,
        'The saved theme catalogue exceeds its budget.',
      );
      chunks.push(part.value);
    }
  } finally {
    signal?.removeEventListener('abort', cancel);
    if (!complete) await reader.cancel().catch(() => {});
    reader.releaseLock();
  }
  required(size > 0, 'The saved theme catalogue is empty.');
  const bytes = new Uint8Array(size);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }
  abort(signal);
  return createVisualThemeCatalogue(new TextDecoder('utf-8', { fatal: true }).decode(bytes));
}

/** Prepare a separately owned exact release for an already verified Solo save.
 * The real host retains its current run/pictures until this and picture restore
 * both succeed. The shipped catalogue, not the save, grants compatibility. */
export async function prepareSavedVisualTheme(
  { pin: source, entry, currentManifestSha256 = null },
  {
    baseURL,
    signal,
    onStatus = () => {},
    fetch: request = globalThis.fetch,
    createHost = createPresentationHost,
    catalogue: preparedCatalogue = null,
    fresh = false,
  } = {},
) {
  abort(signal);
  const pin = snapshotVisualThemePin(source);
  required(
    pin.content.mode === 'solo' &&
      pin.content.contentThemeId === 'fpv' &&
      pin.content.editionId === 'field-kit' &&
      pin.content.owner.kind === 'campaign',
    'This saved theme needs its matching supported game edition.',
  );
  const content = await prepareCampaignVisualThemeContext(
    {
      entry,
      level: entry.campaign.levels.find((level) => level.id === pin.content.level.id),
      association: { editionId: 'field-kit', contentThemeId: 'fpv', mode: 'solo' },
    },
    { signal },
  );
  const report = (status) => {
    if (!signal?.aborted)
      try {
        onStatus(status);
      } catch {}
  };
  report({
    status: 'preparing',
    stage: 'verifying',
    message: fresh ? 'Checking the selected theme…' : 'Checking your saved theme…',
    progress: null,
  });
  const catalogue =
    preparedCatalogue ?? (await readSavedVisualCatalogue({ baseURL, fetch: request, signal }));
  const acquire = (retainedManifestSha256) =>
    prepareRetainedVisualThemeLease(
      { pin, catalogue, content, requiredSlots: SAVED_SOLO_VISUAL_SLOTS },
      {
        signal,
        onStatus: (status) => {
          if (status.status === 'preparing') report(status);
        },
        createHost: () => createHost({ baseURL, fetch: request, retainedManifestSha256 }),
      },
    );
  let lease;
  if (currentManifestSha256) {
    lease = await acquire(
      currentManifestSha256 === pin.presentation.sha256 ? null : pin.presentation.sha256,
    );
  } else {
    // A slow/failed decorative page load does not own restore readiness. When
    // its revision is unknown, authenticate current bytes without adopting them.
    // Only an exact hash mismatch tries the hash-named historical location;
    // both paths must still produce the identical retained revision.
    try {
      lease = await acquire(null);
    } catch (error) {
      abort(signal);
      if (error.message !== 'Presentation manifest differs from its pinned release.') throw error;
      lease = await acquire(pin.presentation.sha256);
    }
  }
  required(
    lease.kind === 'prepared-presentation',
    fresh
      ? 'This exact selected theme is not available in this release. Your current flight is unchanged.'
      : 'This exact saved theme is not available in this release. Your current flight is unchanged.',
  );
  try {
    // Verify the selected cues/music now. Playback/decoding still belongs to the
    // sound transport and user activation; do not autoplay during preparation.
    for (const [slot, asset] of Object.entries(lease.snapshot.resolved.assets))
      if (asset.kind === 'audio') {
        report({
          status: 'preparing',
          stage: 'downloading',
          message: fresh
            ? 'Preparing the selected theme sounds…'
            : 'Preparing your saved theme sounds…',
          progress: null,
        });
        await lease.readAudio(slot, { signal });
        abort(signal);
      }
    abort(signal);
    report({
      status: 'ready',
      stage: 'ready',
      message: fresh ? 'The selected theme is ready.' : 'Your saved theme is ready.',
      progress: null,
    });
    abort(signal);
    return lease;
  } catch (error) {
    lease.release();
    throw error;
  }
}
