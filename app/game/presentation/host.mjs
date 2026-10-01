import { localizedMessage } from '../i18n/index.mjs';
import {
  isTeamRuntimeImageSlot,
  TEAM_PILOT_SLOTS,
  TEAM_ENEMY_SLOTS,
  TEAM_CORE_SLOTS,
} from './team-runtime-slots.mjs';
import { ASSET_SLOTS } from './catalog.mjs';
import { boundedJSON, canonicalJSON, exactKeys, required, stableId } from '../data-json.mjs';
import { inspectImageDataUrl } from '../content.mjs';
import {
  FORMATS,
  LIMITS,
  TOKEN_DEFAULTS,
  freezePresentation,
  validateAssetRevision,
  validatePresentationTheme,
} from './model.mjs';
import { hashPresentationBytes } from './bundle.mjs';
import { presentationManifestPath } from './manifest-path.mjs';
import { createPresentationDOMOwner } from './dom-ownership.mjs';
import {
  applyPresentation,
  canvasPresentation,
  imagePresentation,
  presentationCSSVariables,
  presentationFontDescriptors,
} from './runtime.mjs';

export const COMPILED_PRESENTATION_FORMAT = 'revealline-compiled-presentation.v1';
export const PRESENTATION_DECODE_PIXELS = 16 * 1024 * 1024;
// Fixed renderer vocabulary, never an uploaded prefix or arbitrary slot filter.
export const ACTOR_PRESENTATION_SLOTS = Object.freeze([
  ...ASSET_SLOTS.filter((slot) =>
    slot.recipes.some((recipe) =>
      ['actor.player.v1', 'actor.rotors.v1', 'actor.enemy.v1'].includes(recipe),
    ),
  ).map((slot) => slot.id),
  ...TEAM_PILOT_SLOTS,
  ...TEAM_ENEMY_SLOTS,
  ...TEAM_CORE_SLOTS,
]);
const actorSlots = new Set(ACTOR_PRESENTATION_SLOTS);
const extensions = {
  'image/png': 'png',
  'image/jpeg': 'jpg',
  'image/webp': 'webp',
  'font/ttf': 'ttf',
  'font/otf': 'otf',
  'font/woff2': 'woff2',
  'audio/wav': 'wav',
  'audio/ogg': 'ogg',
  'audio/mpeg': 'mp3',
};
const fields = (value, names, label) => {
  exactKeys(value, names, label);
  required(
    names.every((name) => Object.hasOwn(value, name)),
    `${label} is missing fields.`,
  );
};
const identity = (value) => {
  fields(value, ['id', 'revision'], 'compiled identity');
  required(
    stableId(value.id) && Number.isSafeInteger(value.revision) && value.revision > 0,
    'Invalid compiled identity.',
  );
};
/** A public compiler result is deliberately smaller than a theme authoring
 * document. Validate its own closed boundary; do not invent missing history. */
export function validateCompiledPresentation(source) {
  const value = boundedJSON(source, {
    maxBytes: LIMITS.manifestBytes,
    maxNodes: 100000,
    maxArray: 2048,
    maxDepth: 18,
    maxString: 8192,
  });
  fields(value, ['format', 'source', 'resolved', 'urls'], 'compiled presentation');
  required(value.format === COMPILED_PRESENTATION_FORMAT, 'Unsupported compiled presentation.');
  identity(value.source);
  const r = value.resolved;
  fields(r, ['theme', 'collection', 'tokens', 'bindings', 'assets'], 'compiled resolution');
  fields(r.theme, ['id', 'revision', 'name'], 'compiled theme');
  if (r.collection !== null) identity(r.collection);
  validatePresentationTheme({
    format: FORMATS.theme,
    ...r.theme,
    parent: null,
    tokens: r.tokens,
    bindings: r.bindings,
  });
  required(
    Object.keys(TOKEN_DEFAULTS).every((name) => Object.hasOwn(r.tokens, name)),
    'Compiled theme is missing tokens.',
  );
  exactKeys(r.assets, Object.keys(r.bindings), 'compiled assets');
  required(
    Object.keys(r.assets).length === Object.keys(r.bindings).length &&
      Object.keys(r.assets).length <= LIMITS.slots,
    'Incomplete compiled asset bindings.',
  );
  const facts = new Map(),
    revisions = new Map();
  for (const [slot, raw] of Object.entries(r.assets)) {
    required(stableId(slot), 'Invalid compiled slot.');
    const asset = validateAssetRevision(raw),
      reference = r.bindings[slot];
    required(
      asset.id === reference.id && asset.revision === reference.revision,
      'Compiled binding does not match its exact revision.',
    );
    const key = `${asset.id}@${asset.revision}`;
    required(
      !revisions.has(key) || canonicalJSON(revisions.get(key)) === canonicalJSON(asset),
      'Conflicting compiled immutable revision.',
    );
    revisions.set(key, asset);
    if (asset.file) {
      const old = facts.get(asset.file.sha256);
      required(
        !old || canonicalJSON(old) === canonicalJSON(asset.file),
        'Conflicting compiled file identity.',
      );
      facts.set(asset.file.sha256, asset.file);
    }
  }
  exactKeys(value.urls, [...facts.keys()], 'compiled URLs');
  required(Object.keys(value.urls).length === facts.size, 'Incomplete compiled URL table.');
  required(
    [...facts.values()].reduce((n, file) => n + file.bytes, 0) <= LIMITS.bundleBytes,
    'Compiled files exceed the release budget.',
  );
  for (const [hash, file] of facts)
    required(
      value.urls[hash] === `./assets/${hash}.${extensions[file.mime]}`,
      'Compiled asset paths must derive from the declared hash and MIME.',
    );
  canvasPresentation(r);
  return freezePresentation(value);
}
const cancelled = (signal) => {
  if (signal?.aborted) throw new DOMException('Presentation load cancelled.', 'AbortError');
};
const dataURL = (bytes, mime) => {
  let binary = '';
  for (let i = 0; i < bytes.length; i += 16384)
    binary += String.fromCharCode(...bytes.subarray(i, i + 16384));
  return `data:${mime};base64,${btoa(binary)}`;
};
const browserDecode = async (blob) => {
  required(typeof globalThis.createImageBitmap === 'function', 'Bitmap decoding is unavailable.');
  return globalThis.createImageBitmap(blob);
};
async function cropBitmap(image, frame) {
  return globalThis.createImageBitmap(image, frame.x, frame.y, frame.width, frame.height);
}
async function cropBlob(image, frame, document) {
  const canvas = document.createElement('canvas');
  canvas.width = frame.width;
  canvas.height = frame.height;
  canvas.getContext('2d').drawImage(image, 0, 0);
  try {
    return await new Promise((resolve, reject) =>
      canvas.toBlob(
        (blob) => (blob ? resolve(blob) : reject(new Error('Frame export failed.'))),
        'image/png',
      ),
    );
  } finally {
    canvas.width = canvas.height = 0;
  }
}
const visibleSlot = (id, asset) =>
  asset.kind === 'font' ||
  (asset.kind === 'image' &&
    (/^(ui|icon|hud|reward|control|screen|player|enemy|terrain|pickup)\./.test(id) ||
      isTeamRuntimeImageSlot(id)));
const controlIcons = {
  settings: '#shell-settings, #settings-button, #shell-options',
  play: '#shell-featured, #shell-continue, #shell-deploy, #start-button, #soundtrack-play, #race-start',
  retry: '#retry-button, #overlay-restart',
  fullscreen: '#shell-fullscreen, #overlay-fullscreen',
  menu: '#shell-menu, #overlay-menu',
  back: 'button[id$="-back"], [data-shell-back]',
  close: '.dialog-close, button[id$="-close"]',
  pause: '#pause-button, #race-pause, #soundtrack-pause',
  audio: '#race-audio, #sound-button',
  music: '#soundtrack-open, #music-preview',
  save: '#save-attempt-button, #soundtrack-save',
  load: '#resume-save, #import-save',
  download:
    '#export-backup, #export-library, #export-session, #export-packs, #download-replay, #soundtrack-export-bundle',
  upload: '#soundtrack-import-mp3, #soundtrack-import-bundle',
  copy: 'button[id$="-copy"]',
  check: '[data-presentation-action="check"]',
  warning: '[data-presentation-action="warning"]',
  info: '#help-button, #race-help, #overlay-brief',
  lock: '[data-presentation-action="lock"]',
  offline: '#offline-button',
  trash: '#soundtrack-delete-track, #soundtrack-delete-playlist',
  undo: '#undo-backup, #undo-library, #soundtrack-undo',
  redo: '[data-presentation-action="redo"]',
  keyboard: '#settings-tab-controls',
  controller: 'a[href="controller-lab/"], a[href="../controller-lab/"]',
  touch: '[data-presentation-action="touch"]',
};
const nativeInputs = {
  checkbox: 'input[type="checkbox"]:not([role="switch"])',
  radio: 'input[type="radio"]',
  toggle: '[role="switch"]',
  slider: 'input[type="range"]',
  scrollbar: 'body, dialog, .collection-grid, .mission-list',
};
const controlGlyphs = Object.fromEntries(
  ['up', 'right', 'down', 'left'].map((direction) => [
    direction,
    `[data-move="${direction}"], [data-direction="${direction}"]`,
  ]),
);
Object.assign(controlGlyphs, {
  boost: '#boost-button, [data-action="boost"]',
  ability: '#action-button, [data-action="action"]',
});
const hudGlyphs = {
  life: '#lives',
  score: '#score',
  time: '#time, #race-clock',
  coverage: '#coverage',
};

/** Read-only release host. The URL is anchored beside this module and can only
 * use hash-derived compiler asset names. It never reads Studio or player DBs.
 * Dependency overrides exist for tests/native hosts, never for uploaded URLs. */
export function createPresentationHost({
  profile = 'full',
  fetch: fetcher = globalThis.fetch,
  baseURL = new URL('./compiled/', import.meta.url),
  retainedManifestSha256 = null,
  decodeImage = browserDecode,
  cropImage = cropBitmap,
  document = globalThis.document,
  skipTitleArtwork = false,
  createObjectURL = (blob) => URL.createObjectURL(blob),
  revokeObjectURL = (url) => URL.revokeObjectURL(url),
  fontFactory = (name, bytes, descriptors) => new FontFace(name, bytes, descriptors),
} = {}) {
  required(['full', 'actors'].includes(profile), 'Use a registered presentation host profile.');
  const loadsSlot = (id, asset) =>
    profile === 'full'
      ? visibleSlot(id, asset) &&
        !(
          (id === 'screen.title.background' || id === 'screen.title.portrait') &&
          (skipTitleArtwork || document?.querySelector?.('.native-landing'))
        )
      : actorSlots.has(id) && asset.kind === 'image';
  const manifestPath = presentationManifestPath(retainedManifestSha256);
  const base = new URL(baseURL);
  required(
    (['http:', 'https:'].includes(base.protocol) ||
      (base.protocol === 'revealline:' && base.host === 'app') ||
      (base.protocol === 'capacitor:' && base.host === 'localhost')) &&
      !base.search &&
      !base.hash &&
      !base.username &&
      !base.password &&
      base.pathname.endsWith('/'),
    'Presentation release needs a registered web or native app directory.',
  );
  let current = null,
    pending = null,
    closed = false;
  const applications = new Set(),
    pictureReads = new Set(),
    audioReads = new Set(),
    audioBlobs = new Map();
  async function bytesAt(relative, max, signal, expected = null) {
    cancelled(signal);
    const url = new URL(relative, base);
    required(
      url.protocol === base.protocol &&
        url.host === base.host &&
        url.pathname.startsWith(base.pathname),
      'Presentation URL escaped its release.',
    );
    const response = await fetcher(url.href, {
      signal,
      redirect: 'error',
      credentials: 'same-origin',
    });
    try {
      cancelled(signal);
      required(
        response.ok && !response.redirected && (!response.url || response.url === url.href),
        `Presentation file unavailable: ${relative}.`,
      );
      const length = response.headers?.get('content-length');
      if (length !== null && length !== undefined)
        required(
          /^\d+$/.test(length) &&
            Number(length) > 0 &&
            Number(length) <= max &&
            (expected === null || Number(length) === expected),
          'Unexpected presentation byte length.',
        );
      required(response.body?.getReader, 'A bounded response stream is required.');
    } catch (error) {
      // A fetch can finish after its owner closed but before a reader exists.
      // Dispose that response too; its body must not remain downloading.
      try {
        await response.body?.cancel?.();
      } catch {
        /* Already aborted by fetch. */
      }
      throw error;
    }
    const reader = response.body.getReader(),
      chunks = [];
    let size = 0;
    const cancel = () => {
      void reader.cancel().catch(() => {});
    };
    signal.addEventListener('abort', cancel, { once: true });
    try {
      while (true) {
        cancelled(signal);
        const item = await reader.read();
        cancelled(signal);
        if (item.done) break;
        size += item.value.byteLength;
        required(size <= max, 'Presentation response exceeded its byte budget.');
        chunks.push(item.value);
      }
      required(
        size > 0 && (expected === null || size === expected),
        'Truncated presentation file.',
      );
      const bytes = new Uint8Array(size);
      let offset = 0;
      for (const chunk of chunks) {
        bytes.set(chunk, offset);
        offset += chunk.byteLength;
      }
      return bytes;
    } catch (error) {
      cancel();
      throw error;
    } finally {
      signal.removeEventListener('abort', cancel);
      reader.releaseLock();
    }
  }
  const clearApplications = () => {
    for (const cleanup of applications) cleanup();
    applications.clear();
  };
  return Object.freeze({
    current: () => current?.snapshot ?? null,
    /** Audio stays lazy. The existing sound transport owns playback, decoding,
     * user activation and any object URLs; this host authenticates original bytes. */
    async readAudio(slot, { signal, snapshot = current?.snapshot } = {}) {
      required(profile === 'full', 'An actor-only host cannot read audio.');
      required(!closed && snapshot && snapshot === current?.snapshot, 'No current audio release.');
      cancelled(signal);
      const asset = snapshot.resolved.assets[slot];
      required(
        /^audio\.(focus|confirm|cancel|capture|failure|victory|pickup|music)$/.test(slot) &&
          asset?.kind === 'audio',
        'No compiled audio for this slot.',
      );
      const file = asset.file,
        controller = new AbortController(),
        abort = () => controller.abort();
      if (audioBlobs.has(file.sha256))
        return Object.freeze({ asset, blob: audioBlobs.get(file.sha256) });
      signal?.addEventListener('abort', abort, { once: true });
      if (signal?.aborted) abort();
      audioReads.add(controller);
      try {
        const bytes = await bytesAt(
          `./assets/${file.sha256}.${extensions[file.mime]}`,
          file.bytes,
          controller.signal,
          file.bytes,
        );
        required(
          (await hashPresentationBytes(bytes)) === file.sha256,
          'Published audio hash mismatch.',
        );
        cancelled(controller.signal);
        required(
          !closed && snapshot === current?.snapshot,
          'Audio release changed during download.',
        );
        const blob = new Blob([bytes], { type: file.mime });
        audioBlobs.set(file.sha256, blob);
        return Object.freeze({ asset, blob });
      } finally {
        signal?.removeEventListener('abort', abort);
        audioReads.delete(controller);
      }
    },
    /** Original bytes are requested only by a new attempt/install. The still
     * media adapter owns full decoding, durable storage and immutable pins. */
    async readPicture(slot, { signal, snapshot = current?.snapshot, onStatus = () => {} } = {}) {
      required(profile === 'full', 'An actor-only host cannot read pictures.');
      required(
        !closed && snapshot && snapshot === current?.snapshot,
        'No current picture release.',
      );
      cancelled(signal);
      const asset = snapshot.resolved.assets[slot];
      required(
        (/^picture\.fpv\.[a-f0-9]{16}$/.test(slot) ||
          slot === 'scene.reveal.legacy' ||
          slot === 'scene.reveal.wide') &&
          asset?.kind === 'image',
        'No compiled FPV original for this slot.',
      );
      const file = asset.file,
        frame = asset.geometry.frame;
      required(
        ['image/png', 'image/jpeg', 'image/webp'].includes(file.mime) &&
          frame.x === 0 &&
          frame.y === 0 &&
          frame.width === file.width &&
          frame.height === file.height,
        'A picture original requires its complete PNG/JPEG/WebP frame.',
      );
      const controller = new AbortController(),
        abort = () => controller.abort();
      signal?.addEventListener('abort', abort, { once: true });
      if (signal?.aborted) abort();
      pictureReads.add(controller);
      const report = (stage, message) => {
        if (closed || controller.signal.aborted || snapshot !== current?.snapshot) return;
        try {
          onStatus({ status: 'preparing', stage, message, progress: null });
        } catch {}
      };
      try {
        report('downloading', localizedMessage('interface:presentation.downloadingOriginal'));
        const bytes = await bytesAt(
          `./assets/${file.sha256}.${extensions[file.mime]}`,
          file.bytes,
          controller.signal,
          file.bytes,
        );
        report('verifying', localizedMessage('interface:presentation.verifyingOriginal'));
        required(
          (await hashPresentationBytes(bytes)) === file.sha256,
          'Picture original hash mismatch.',
        );
        cancelled(controller.signal);
        required(
          !closed && snapshot === current?.snapshot,
          'Picture release changed during download.',
        );
        const header = inspectImageDataUrl(dataURL(bytes, file.mime));
        required(
          header.valid && header.width === file.width && header.height === file.height,
          'Picture original header disagrees with its release.',
        );
        return Object.freeze({ asset, blob: new Blob([bytes], { type: file.mime }) });
      } finally {
        signal?.removeEventListener('abort', abort);
        pictureReads.delete(controller);
      }
    },
    async load({ signal, onStatus = () => {}, expectedManifestSha256 = null } = {}) {
      required(!closed, 'Presentation host is closed.');
      required(
        expectedManifestSha256 === null ||
          (typeof expectedManifestSha256 === 'string' &&
            /^[a-f0-9]{64}$/.test(expectedManifestSha256)),
        'Use an exact SHA-256 presentation manifest pin.',
      );
      required(
        retainedManifestSha256 === null || expectedManifestSha256 === retainedManifestSha256,
        'A retained presentation requires its matching exact manifest pin.',
      );
      cancelled(signal);
      pending?.abort();
      const controller = new AbortController();
      pending = controller;
      const externalAbort = () => controller.abort();
      signal?.addEventListener('abort', externalAbort, { once: true });
      const releases = [],
        images = {},
        cssImages = {},
        fonts = [];
      let disposed = false;
      const dispose = () => {
        if (disposed) return;
        disposed = true;
        releases
          .splice(0)
          .reverse()
          .forEach((release) => release());
      };
      // Late codec completion after cancellation still registers its own release.
      const own = (release) => (disposed ? release() : releases.push(release));
      const report = (stage, message, status = 'preparing') => {
        if (closed || controller.signal.aborted || pending !== controller) return;
        try {
          onStatus({ status, stage, message, progress: null });
        } catch {}
      };
      controller.signal.addEventListener('abort', dispose, { once: true });
      try {
        report('reading', localizedMessage('interface:presentation.loadingRelease'));
        const bytes = await bytesAt(manifestPath, LIMITS.manifestBytes, controller.signal);
        report('verifying', localizedMessage('interface:presentation.checkingManifest'));
        const manifestSha256 = await hashPresentationBytes(bytes);
        cancelled(controller.signal);
        required(
          expectedManifestSha256 === null || manifestSha256 === expectedManifestSha256,
          'Presentation manifest differs from its pinned release.',
        );
        const manifest = validateCompiledPresentation(
          new TextDecoder('utf-8', { fatal: true }).decode(bytes),
        );
        const fullImages = new Map(),
          frames = new Map();
        for (const [slot, asset] of Object.entries(manifest.resolved.assets)) {
          if (!loadsSlot(slot, asset) || asset.kind !== 'image') continue;
          fullImages.set(asset.file.sha256, asset.file.width * asset.file.height);
          const frame = asset.geometry.frame;
          if (
            frame.x ||
            frame.y ||
            frame.width !== asset.file.width ||
            frame.height !== asset.file.height
          )
            frames.set(slot, frame.width * frame.height);
        }
        required(
          [...fullImages.values(), ...frames.values()].reduce((sum, n) => sum + n, 0) <=
            PRESENTATION_DECODE_PIXELS,
          'Presentation exceeds the decoded pixel budget.',
        );
        const sourceBlobs = new Map(),
          decoded = new Map();
        for (const [slot, asset] of Object.entries(manifest.resolved.assets)) {
          if (!loadsSlot(slot, asset)) continue;
          cancelled(controller.signal);
          const file = asset.file,
            hash = file.sha256;
          let blob = sourceBlobs.get(hash);
          if (!blob) {
            report('downloading', localizedMessage('interface:presentation.loadingRelease'));
            const content = await bytesAt(
              manifest.urls[hash],
              file.bytes,
              controller.signal,
              file.bytes,
            );
            report('verifying', localizedMessage('interface:presentation.verifyingRelease'));
            required(
              (await hashPresentationBytes(content)) === hash,
              'Presentation asset hash mismatch.',
            );
            cancelled(controller.signal);
            blob = new Blob([content], { type: file.mime });
            sourceBlobs.set(hash, blob);
          }
          if (asset.kind === 'font') {
            if (fonts.some((entry) => entry.family === `RLAsset-${hash}`)) continue;
            report('decoding', localizedMessage('interface:presentation.openingFonts'));
            const face = fontFactory(
              `RLAsset-${hash}`,
              await blob.arrayBuffer(),
              presentationFontDescriptors(manifest.resolved, hash),
            );
            await face.load();
            cancelled(controller.signal);
            fonts.push(face);
            continue;
          }
          let original = decoded.get(hash);
          if (!original) {
            report('decoding', localizedMessage('interface:presentation.openingArtwork'));
            const header = inspectImageDataUrl(
              dataURL(new Uint8Array(await blob.arrayBuffer()), file.mime),
            );
            required(
              header.valid && header.width === file.width && header.height === file.height,
              'Presentation image header disagrees with its dimensions.',
            );
            original = await decodeImage(blob, { signal: controller.signal });
            own(() => original.close?.());
            cancelled(controller.signal);
            required(
              (original.naturalWidth ?? original.width) === file.width &&
                (original.naturalHeight ?? original.height) === file.height,
              'Decoded presentation dimensions disagree.',
            );
            decoded.set(hash, original);
          }
          const frame = asset.geometry.frame;
          let image = original,
            visualBlob = blob;
          if (frame.x || frame.y || frame.width !== file.width || frame.height !== file.height) {
            report('decoding', localizedMessage('interface:presentation.preparingFrames'));
            image = await cropImage(original, frame, { signal: controller.signal });
            own(() => image.close?.());
            cancelled(controller.signal);
            required(
              image.width === frame.width && image.height === frame.height,
              'Decoded presentation frame disagrees.',
            );
            if (profile === 'full') visualBlob = await cropBlob(image, frame, document);
          }
          images[slot] = Object.freeze({ image, asset, geometry: imagePresentation(asset) });
          if (profile === 'full') {
            const url = createObjectURL(visualBlob);
            own(() => revokeObjectURL(url));
            cssImages[slot] = url;
          }
        }
        cancelled(controller.signal);
        required(!closed && pending === controller, 'Obsolete presentation load.');
        for (const face of fonts) {
          document?.fonts?.add(face);
          own(() => document?.fonts?.delete(face));
        }
        const css = presentationCSSVariables(manifest.resolved);
        const snapshot = Object.freeze({
          manifestSha256,
          source: manifest.source,
          resolved: manifest.resolved,
          canvas: canvasPresentation(manifest.resolved),
          fonts: Object.freeze({ ui: css['--fk-font-ui'], numeric: css['--fk-font-mono'] }),
          image: (slot) => images[slot] ?? null,
          cssImage: (slot) => cssImages[slot] ?? null,
          // Pictures intentionally stay with the exact flight/collection media host.
          picturePolicy: 'durable-defaults-for-new-attempts',
        });
        clearApplications();
        const prior = current;
        audioBlobs.clear();
        current = { snapshot, dispose, images, cssImages };
        prior?.dispose();
        report('ready', localizedMessage('interface:presentation.releaseReady'), 'ready');
        return snapshot;
      } catch (error) {
        if (error.name !== 'AbortError')
          report(
            'error',
            localizedMessage('interface:presentation.releaseUnavailable', { error: error.message }),
            'error',
          );
        dispose();
        throw error;
      } finally {
        controller.signal.removeEventListener('abort', dispose);
        signal?.removeEventListener('abort', externalAbort);
        if (pending === controller) pending = null;
      }
    },
    apply(element) {
      required(profile === 'full', 'An actor-only host cannot apply page presentation.');
      required(current && !closed, 'No accepted presentation is loaded.');
      const releaseTokens = applyPresentation(element, current.snapshot.resolved);
      const owner = createPresentationDOMOwner();
      let observer = null;
      try {
        const values = {};
        for (const [slot, url] of Object.entries(current.cssImages)) {
          const name = slot.replaceAll('.', '-');
          values[`--fk-asset-${name}`] = `url("${url}")`;
          values[`--fk-show-${name}`] = 'inline-block';
          const nine = current.images[slot].geometry.nineSlice;
          if (nine) {
            values[`--fk-border-slice-${name}`] =
              `${nine.top} ${nine.right} ${nine.bottom} ${nine.left}`;
            values[`--fk-slice-${name}`] = `${values[`--fk-border-slice-${name}`]} fill`;
            values[`--fk-slice-width-${name}`] =
              `${nine.top}px ${nine.right}px ${nine.bottom}px ${nine.left}px`;
          }
        }
        for (const [name, value] of Object.entries(values)) owner.style(element, name, value);
        const markControls = (scope = element) => {
          for (const [attribute, prefix, selectors] of [
            ['data-presentation-icon', 'icon', controlIcons],
            ['data-presentation-input', 'ui.input', nativeInputs],
            ['data-presentation-control', 'control', controlGlyphs],
            ['data-presentation-hud', 'hud', hudGlyphs],
            ['data-presentation-focus', 'ui', { focus: 'body' }],
            [
              'data-presentation-reward',
              'reward',
              { mastery: '.mastery-note', unlock: '.appearance-reward.earned' },
            ],
          ])
            for (const [icon, selector] of Object.entries(selectors)) {
              if (!current?.cssImages[`${prefix}.${icon}`]) continue;
              const controls = [
                ...(scope.matches?.(selector) ? [scope] : []),
                ...(scope.children?.length ? (scope.querySelectorAll?.(selector) ?? []) : []),
              ];
              for (const control of controls) {
                owner.attribute(control, attribute, icon);
              }
            }
        };
        markControls();
        const Observer =
          element.ownerDocument?.defaultView?.MutationObserver ?? globalThis.MutationObserver;
        observer =
          typeof Observer === 'function'
            ? new Observer((records) => {
                // HUD text may contain a new <small> every frame. Visit only
                // newly inserted element subtrees, never rescan the whole page.
                const inserted = new Set(
                  records.flatMap((record) =>
                    [...record.addedNodes].filter((node) => node.nodeType === 1),
                  ),
                );
                for (const node of inserted) {
                  if (node !== element && !element.contains?.(node)) continue;
                  let parent = node.parentElement;
                  while (parent && !inserted.has(parent)) parent = parent.parentElement;
                  if (!parent) markControls(node);
                }
              })
            : null;
        observer?.observe(element, { childList: true, subtree: true });
        let active = true;
        const cleanup = () => {
          if (!active) return;
          active = false;
          observer?.disconnect();
          releaseTokens();
          owner.release();
          applications.delete(cleanup);
        };
        applications.add(cleanup);
        return cleanup;
      } catch (error) {
        observer?.disconnect();
        releaseTokens();
        owner.release();
        throw error;
      }
    },
    close() {
      if (closed) return;
      closed = true;
      pending?.abort();
      for (const controller of pictureReads) controller.abort();
      pictureReads.clear();
      for (const controller of audioReads) controller.abort();
      audioReads.clear();
      audioBlobs.clear();
      pending = null;
      clearApplications();
      current?.dispose();
      current = null;
    },
  });
}
