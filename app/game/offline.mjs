import { nativePlatform } from './platform.mjs';
import { CONTENT_PROJECT_ITEM_LIMITS, CONTENT_ASSET_MAX_BYTES } from './content-design/limits.mjs';
/** Explicit preparation of a generated distribution's declared core cache. */
const MARKER = 'meta[name="revealline-offline"]';
const OPTIONAL_ARTWORK_NAMES = new Set(['Opening Journey artwork', 'Journey candidate artwork']);
function optionalNote(config) {
  if (config.downloadCatalogue)
    return ' This verifies the shared runtime. Use Game and soundtrack downloads to prepare all missions and original artwork; recorded music remains optional.';
  const packs = config.optionalPacks;
  const packNote =
    !Array.isArray(packs) || !packs.length
      ? ''
      : ` ${packs.map((pack) => pack.name).join(', ')} ${packs.length === 1 ? 'is' : 'are'} optional: install once while online for offline play. Already-installed packs remain in device storage; keep a complete backup.`;
  const artNote = config.optionalArtwork
    ? ` ${config.optionalArtwork.name} is not included in offline preparation. Its web preview needs an online connection; a full downloaded distribution includes the original pictures.`
    : '';
  return packNote + artNote;
}
function withOptionalNote(config, summary, messageCode) {
  return { summary, message: summary + optionalNote(config), messageCode };
}
function configFromPage(documentRef = globalThis.document, locationRef = globalThis.location) {
  const marker = documentRef?.querySelector(MARKER)?.content;
  if (!marker || !locationRef?.href) return null;
  let config;
  try {
    config = JSON.parse(marker);
  } catch {
    return null;
  }
  if (config.format !== 'revealline-offline.v1' || !/^[0-9a-f]{64}$/.test(config.buildId))
    return null;
  if (
    config.optionalPacks !== undefined &&
    (!Array.isArray(config.optionalPacks) ||
      config.optionalPacks.length > 12 ||
      config.optionalPacks.some(
        (p) => !p || typeof p.name !== 'string' || !p.name.length || p.name.length > 120,
      ))
  )
    return null;
  if (
    config.optionalArtwork !== undefined &&
    (!config.optionalArtwork ||
      !OPTIONAL_ARTWORK_NAMES.has(config.optionalArtwork.name) ||
      config.optionalArtwork.availability !== 'online-only' ||
      !Number.isSafeInteger(config.optionalArtwork.count) ||
      config.optionalArtwork.count < 1 ||
      config.optionalArtwork.count > CONTENT_PROJECT_ITEM_LIMITS.assets ||
      !Number.isSafeInteger(config.optionalArtwork.bytes) ||
      config.optionalArtwork.bytes < 1 ||
      // These bytes describe excluded online-only originals, never a cache
      // allocation. Use the same finite count and per-image bound as authoring.
      config.optionalArtwork.bytes > config.optionalArtwork.count * CONTENT_ASSET_MAX_BYTES)
  )
    return null;
  const page = new URL(locationRef.href),
    scope = new URL(config.scope, page),
    worker = new URL(config.worker, page);
  if (
    scope.origin !== page.origin ||
    worker.origin !== page.origin ||
    !page.pathname.startsWith(scope.pathname) ||
    worker.pathname !== `${scope.pathname}service-worker.js`
  )
    return null;
  return { ...config, scope: scope.href, worker: worker.href };
}
export function offlineAvailability({
  documentRef = globalThis.document,
  locationRef = globalThis.location,
  navigatorRef = globalThis.navigator,
  secure = globalThis.isSecureContext,
} = {}) {
  const platform = nativePlatform(locationRef);
  if (platform)
    return {
      available: false,
      bundled: true,
      messageCode: 'bundled',
      reason:
        'This app includes its game files for offline play. No additional download is needed. Export a complete backup to protect your saved collection.',
    };
  const config = configFromPage(documentRef, locationRef);
  if (!config)
    return {
      available: false,
      messageCode: 'development',
      reason:
        'Offline preparation is available in a packaged release. The live development page keeps using fresh files.',
    };
  if (!secure || !navigatorRef?.serviceWorker)
    return {
      available: false,
      messageCode: 'unsupported',
      reason: 'Offline play needs a browser with service workers on HTTPS or localhost.',
    };
  return {
    available: true,
    version: config.version,
    buildId: config.buildId,
    scope: config.scope,
    packageConsent: config.packageConsent === true,
    optionalPacks: config.optionalPacks ?? [],
    optionalArtwork: config.optionalArtwork ?? null,
    ...(optionalNote(config) ? { note: optionalNote(config).trim() } : {}),
  };
}
const PROTOCOL = 'revealline.offline-progress.v1';
let requestSequence = 0;
const phaseMessages = {
  connecting: 'Connecting to this version’s offline worker…',
  checking: 'Checking saved core files before preparation…',
  downloading: 'Downloading and verifying core offline files…',
  saving: 'Saving verified core files on this device…',
  verifying: 'Verifying every saved core file…',
};
function offlineError(code, message) {
  return Object.assign(new Error(message), { offlineCode: code });
}
function abortError() {
  return new DOMException(
    'Stopped waiting. Shared offline preparation can continue.',
    'AbortError',
  );
}
function throwIfAborted(signal) {
  if (signal?.aborted) throw abortError();
}
function observePromise(promise, signal) {
  if (!signal) return promise;
  return new Promise((resolve, reject) => {
    const aborted = () => reject(abortError());
    signal.addEventListener('abort', aborted, { once: true });
    if (signal.aborted) aborted();
    promise.then(resolve, reject).finally(() => signal.removeEventListener('abort', aborted));
  });
}
function selectedWorker(registration) {
  return registration?.installing ?? registration?.waiting ?? registration?.active;
}
function workerMatches(worker, registration, config) {
  return (
    registration.scope === config.scope &&
    selectedWorker(registration) === worker &&
    (!worker.scriptURL || worker.scriptURL === config.worker)
  );
}
function unfinished(worker, latest) {
  // The browser can confirm that installation is still pending. An active
  // worker's old progress alone cannot prove whether a repair is still running.
  const running = worker.state === 'installing';
  return {
    status: running ? 'still-running' : 'unconfirmed',
    messageCode: running ? 'stillRunning' : 'unconfirmed',
    stage: latest?.stage ?? 'connecting',
    progress: latest?.progress ?? null,
    message: running
      ? 'Offline preparation is still running. Keep this page online; check progress to reconnect to it.'
      : 'Stopped waiting for the offline report. Completion is not yet confirmed; check progress again.',
  };
}
function requestReport(worker, registration, config, options) {
  const {
    MessageChannelImpl = globalThis.MessageChannel,
    timeout = 30000,
    installTimeout = 60000,
    signal,
    messageType,
    onStatus,
  } = options;
  const preparing = messageType === 'revealline.offline-prepare';
  throwIfAborted(signal);
  return new Promise((resolve, reject) => {
    const channel = new MessageChannelImpl(),
      requestId = `offline-${++requestSequence}`;
    let timer,
      latest,
      terminal,
      settled = false;
    const finish = (result, error) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      signal?.removeEventListener('abort', aborted);
      worker.removeEventListener?.('statechange', changed);
      channel.port1.onmessage = null;
      channel.port1.onmessageerror = null;
      try {
        channel.port1.postMessage({ type: 'revealline.offline-detach', requestId });
      } catch {}
      channel.port1.close();
      channel.port2.close();
      error ? reject(error) : resolve(result);
    };
    const resetTimer = () => {
      clearTimeout(timer);
      // Measured progress renews an observation, rather than imposing a total
      // download deadline. A stalled observation ends without cancelling work.
      timer = setTimeout(
        () => {
          changed();
          if (!settled) finish(unfinished(worker, latest));
        },
        worker.state === 'installing' || (preparing && latest) ? installTimeout : timeout,
      );
    };
    const aborted = () => {
      if (preparing && config.downloadCatalogue && options.cancelPreparation)
        worker.postMessage({ type: 'revealline.offline-pause', buildId: config.buildId });
      finish(null, abortError());
    };
    const changed = () => {
      if (worker.state === 'redundant')
        finish(
          null,
          offlineError(
            'downloadFailed',
            'Offline download failed or the browser could not save every file.',
          ),
        );
      else if (!workerMatches(worker, registration, config))
        finish(
          null,
          offlineError(
            'workerChanged',
            'Offline worker changed. Reopen this version online and try again.',
          ),
        );
      else if (terminal && worker.state !== 'installing') finish(terminal);
    };
    channel.port1.onmessageerror = () => {
      changed();
      if (!settled) finish(unfinished(worker, latest));
    };
    channel.port1.onmessage = (event) => {
      if (settled) return;
      const report = event.data;
      if (!report || typeof report !== 'object') return;
      const streaming = report.format === PROTOCOL;
      if (streaming && report.requestId !== requestId) return;
      if (report.format && !streaming) return;
      if (!workerMatches(worker, registration, config)) {
        finish(
          null,
          offlineError(
            'workerChanged',
            'Offline worker changed. Reopen this version online and try again.',
          ),
        );
        return;
      }
      if (
        (streaming && report.scope !== config.scope) ||
        (report.buildId && report.buildId !== config.buildId)
      ) {
        finish({
          status: 'not-ready',
          messageCode: 'differentBuild',
          message:
            'Cached worker belongs to a different build. Reconnect and prepare this version again.',
        });
        return;
      }
      if (streaming && report.kind === 'progress') {
        if (report.buildId !== config.buildId || !phaseMessages[report.stage]) return;
        const measured = report.progress;
        const progress =
          measured &&
          measured.unit === 'files' &&
          Number.isSafeInteger(measured.completed) &&
          Number.isSafeInteger(measured.total) &&
          measured.total > 0 &&
          measured.total <= 2000 &&
          measured.completed >= 0 &&
          measured.completed <= measured.total
            ? measured
            : null;
        const update = {
          ...report,
          status: preparing ? 'preparing' : 'checking',
          progress,
          ...withOptionalNote(config, phaseMessages[report.stage], report.stage),
        };
        // Duplicate snapshots cannot keep a dead operation alive indefinitely.
        const advanced =
          !latest ||
          latest.operationId !== update.operationId ||
          latest.stage !== update.stage ||
          latest.progress?.completed !== progress?.completed;
        latest = update;
        if (advanced) resetTimer();
        onStatus(update);
        return;
      }
      if (streaming && report.kind !== 'terminal') return;
      if (!['ready', 'not-ready', 'error'].includes(report.status)) return;
      if (report.status === 'ready' && report.buildId !== config.buildId) {
        finish({
          status: 'not-ready',
          messageCode: 'unconfirmedBuild',
          message: 'Offline report could not confirm this build.',
        });
        return;
      }
      if (report.status === 'ready' && worker.state === 'installing') {
        terminal = report;
        resetTimer();
        changed();
      } else finish(report);
    };
    signal?.addEventListener('abort', aborted, { once: true });
    worker.addEventListener?.('statechange', changed);
    resetTimer();
    changed();
    if (settled) return;
    try {
      // Old workers ignore these added fields and still return exactly one
      // terminal report. New workers only stream for an explicit opt-in.
      worker.postMessage(
        {
          type: messageType,
          protocol: PROTOCOL,
          requestId,
          buildId: config.buildId,
          scope: config.scope,
        },
        [channel.port2],
      );
    } catch (error) {
      finish(null, error);
    }
  });
}
async function registered(config, navigatorRef) {
  const registration = await navigatorRef.serviceWorker.getRegistration(config.scope);
  return registration?.scope === config.scope ? registration : null;
}
function environment(options) {
  return {
    documentRef: options.documentRef ?? globalThis.document,
    locationRef: options.locationRef ?? globalThis.location,
    navigatorRef: options.navigatorRef ?? globalThis.navigator,
    secure: options.secure ?? globalThis.isSecureContext,
  };
}
function requireConfig(env) {
  const available = offlineAvailability(env);
  if (!available.available) throw offlineError(available.messageCode, available.reason);
  return configFromPage(env.documentRef, env.locationRef);
}
/** The caller must connect this function to a deliberate player action. No startup side effects.
 * signal normally detaches this observer. The downloads screen explicitly opts
 * into cancelPreparation for the durable worker, whose verified files survive.
 */
export async function prepareOffline(options = {}) {
  const env = environment(options),
    config = requireConfig(env),
    status = options.onStatus ?? (() => {});
  throwIfAborted(options.signal);
  status({
    status: 'preparing',
    stage: 'connecting',
    progress: null,
    ...withOptionalNote(config, phaseMessages.connecting, 'connecting'),
  });
  const registering = env.navigatorRef.serviceWorker.register(config.worker, {
    scope: config.scope,
    updateViaCache: 'none',
  });
  if (config.downloadCatalogue && options.cancelPreparation)
    registering
      .then((registration) => {
        if (options.signal?.aborted)
          selectedWorker(registration)?.postMessage({
            type: 'revealline.offline-pause',
            buildId: config.buildId,
          });
      })
      .catch(() => {});
  const registration = await observePromise(registering, options.signal);
  throwIfAborted(options.signal);
  const worker = selectedWorker(registration);
  if (!worker || !workerMatches(worker, registration, config))
    throw offlineError(
      'workerMismatch',
      'Offline worker does not match this version. Reopen it online and try again.',
    );
  const report = await requestReport(worker, registration, config, {
    ...options,
    onStatus: status,
    messageType: 'revealline.offline-prepare',
  });
  throwIfAborted(options.signal);
  if (report.status === 'still-running' || report.status === 'unconfirmed') {
    status(report);
    return report;
  }
  if (report.status !== 'ready' || report.buildId !== config.buildId)
    throw offlineError(
      report.messageCode ?? 'verificationFailed',
      report.message ?? 'Offline files could not be verified. Reconnect and try again.',
    );
  const waiting = registration.waiting === worker || worker.state === 'installed';
  const result = {
    ...report,
    status: waiting ? 'waiting' : 'ready',
    ...withOptionalNote(
      config,
      waiting
        ? 'Update saved. Close all tabs of this version to use it; your current game continues unchanged.'
        : 'Offline files verified. This version can open without a connection while the browser retains its storage.',
      waiting ? 'waiting' : 'ready',
    ),
  };
  status(result);
  return result;
}
/** Checks cached bytes through the worker; it does not fetch, install, or request storage permission. */
export async function checkOffline(options = {}) {
  const env = environment(options),
    config = requireConfig(env),
    status = options.onStatus ?? (() => {});
  throwIfAborted(options.signal);
  status({
    status: 'checking',
    stage: 'verifying',
    progress: null,
    message: phaseMessages.verifying,
    messageCode: 'verifying',
  });
  const registration = await observePromise(registered(config, env.navigatorRef), options.signal);
  throwIfAborted(options.signal);
  const worker = selectedWorker(registration);
  if (!worker) {
    const result = {
      status: 'not-ready',
      messageCode: 'prepareFirst',
      message: 'Prepare offline play first.',
      verified: 0,
    };
    status(result);
    return result;
  }
  if (!workerMatches(worker, registration, config))
    throw offlineError(
      'workerMismatch',
      'Offline worker does not match this version. Reopen it online and try again.',
    );
  const report = await requestReport(worker, registration, config, {
    ...options,
    onStatus: status,
    messageType: 'revealline.offline-check',
  });
  throwIfAborted(options.signal);
  const waiting =
    report.status === 'ready' && (registration.waiting === worker || worker.state === 'installed');
  const result = {
    ...report,
    ...(report.status === 'ready'
      ? {
          status: waiting ? 'waiting' : 'ready',
          ...withOptionalNote(
            config,
            waiting
              ? 'Update saved. Close all tabs of this version to use it; your current game continues unchanged.'
              : report.message || 'Core offline files verified.',
            waiting ? 'waiting' : 'coreVerified',
          ),
        }
      : {}),
  };
  status(result);
  return result;
}
