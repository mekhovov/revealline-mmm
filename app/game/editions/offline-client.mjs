import {
  resolveEditionContext,
  validateCompanyInstallationReference,
} from '../edition-context.mjs';

const defaultScope = () => new URL('../../', import.meta.url).href;
function exactScope(scope) {
  const url = new URL(scope);
  if (
    !/^https?:$/.test(url.protocol) ||
    url.username ||
    url.password ||
    url.search ||
    url.hash ||
    !url.pathname.endsWith('/')
  )
    throw new Error('Offline preparation requires a valid edition directory.');
  return url.href;
}
function timeout(value) {
  if (!Number.isSafeInteger(value) || value < 1 || value > 120000)
    throw new Error('Offline verification needs a bounded timeout.');
  return value;
}
function browserOperation(operation, { signal, timeoutMs }) {
  signal?.throwIfAborted();
  return new Promise((resolve, reject) => {
    let settled = false;
    const finish = (error, result) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      signal?.removeEventListener('abort', aborted);
      error ? reject(error) : resolve(result);
    };
    const aborted = () =>
      finish(signal.reason || new DOMException('Offline preparation cancelled.', 'AbortError'));
    const timer = setTimeout(
      () => finish(new Error('Offline preparation timed out. Existing editions are preserved.')),
      timeoutMs,
    );
    signal?.addEventListener('abort', aborted, { once: true });
    Promise.resolve()
      .then(() => {
        signal?.throwIfAborted();
        return operation();
      })
      .then(
        (result) => finish(null, result),
        (error) => finish(error),
      );
  });
}
function receipt(data, { scope, editionId, version, buildId }) {
  if (!data || data.status !== 'ready')
    throw new Error(data?.message || 'Offline files need repair.');
  resolveEditionContext({ editionId: data.editionId, version: data.version });
  if (
    typeof data.editionId !== 'string' ||
    data.version === 'DEV' ||
    typeof data.buildId !== 'string' ||
    !/^[a-f0-9]{64}$/.test(data.buildId) ||
    !Number.isSafeInteger(data.count) ||
    data.count < 1 ||
    data.count > 2000 ||
    !Number.isSafeInteger(data.bytes) ||
    data.bytes < 0 ||
    data.bytes > 64 * 1024 * 1024 ||
    (editionId !== undefined && data.editionId !== editionId) ||
    (version !== undefined && data.version.replace(/^v/, '') !== version.replace(/^v/, '')) ||
    (buildId !== undefined && data.buildId !== buildId)
  )
    throw new Error('Offline verification returned a different edition or build.');
  const url = new URL(scope),
    match = /^(.*\/editions\/[^/]+\/)releases\/[^/]+\/site\/$/.exec(url.pathname);
  if (match)
    validateCompanyInstallationReference(
      { ...data, scope, entry: 'game/company.html' },
      {
        editionId: data.editionId,
        baseURL: scope,
        editionRoot: match[1],
      },
    );
  return Object.freeze({
    status: 'ready',
    editionId: data.editionId,
    version: data.version,
    buildId: data.buildId,
    count: data.count,
    bytes: data.bytes,
  });
}
function inspect(worker, options) {
  if (!worker) throw new Error('Prepare this edition before verifying offline files.');
  const { signal, timeoutMs } = options;
  signal?.throwIfAborted();
  return new Promise((resolve, reject) => {
    const channel = new MessageChannel();
    let settled = false;
    const finish = (error, value) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      signal?.removeEventListener('abort', aborted);
      channel.port1.close();
      channel.port2.close();
      error ? reject(error) : resolve(value);
    };
    const aborted = () =>
      finish(signal.reason || new DOMException('Offline verification cancelled.', 'AbortError'));
    const timer = setTimeout(
      () => finish(new Error('Offline verification timed out. Retry when the browser is ready.')),
      timeoutMs,
    );
    signal?.addEventListener('abort', aborted, { once: true });
    channel.port1.onmessage = ({ data }) => {
      try {
        finish(null, receipt(data, options));
      } catch (error) {
        finish(error);
      }
    };
    channel.port1.onmessageerror = () =>
      finish(new Error('Offline verification returned unreadable data.'));
    try {
      worker.postMessage(
        { type: options.repair ? 'repair-company-edition' : 'verify-company-edition' },
        [channel.port2],
      );
    } catch (error) {
      finish(error);
    }
  });
}

export async function verifyEditionOffline({
  scope = defaultScope(),
  serviceWorker = globalThis.navigator?.serviceWorker,
  signal,
  timeoutMs = 120000,
  editionId,
  version,
  buildId,
  requireActive = false,
} = {}) {
  const expected = exactScope(scope);
  timeout(timeoutMs);
  signal?.throwIfAborted();
  if (!serviceWorker?.getRegistration)
    throw new Error('This browser does not support offline preparation.');
  const registration = await browserOperation(() => serviceWorker.getRegistration(expected), {
    signal,
    timeoutMs,
  });
  signal?.throwIfAborted();
  if (registration?.scope !== expected)
    throw new Error('This edition has not been prepared offline.');
  if (requireActive && registration.waiting)
    throw new Error(
      'The prepared update is waiting. Close other tabs for this edition, reopen it, then select it.',
    );
  return inspect(registration.waiting || registration.active, {
    scope: expected,
    signal,
    timeoutMs,
    editionId,
    version,
    buildId,
  });
}

/** Explicit launcher selection never copies or rewrites campaign progress. */
export async function selectPreparedEdition({
  scope = defaultScope(),
  serviceWorker = globalThis.navigator?.serviceWorker,
  storage = globalThis.localStorage,
  entry = 'game/company.html',
  signal,
  timeoutMs = 120000,
  editionId,
  version,
  buildId,
  locks = globalThis.navigator?.locks,
} = {}) {
  const expected = exactScope(scope);
  const verified = await verifyEditionOffline({
    scope: expected,
    serviceWorker,
    signal,
    timeoutMs,
    editionId,
    version,
    buildId,
    requireActive: true,
  });
  const url = new URL(expected),
    match = /^(.*\/editions\/[^/]+\/)releases\/[^/]+\/site\/$/.exec(url.pathname);
  if (!match) throw new Error('Install from the published edition address.');
  const options = { editionId: verified.editionId, baseURL: expected, editionRoot: match[1] };
  const active = validateCompanyInstallationReference(
    { ...verified, scope: expected, entry },
    options,
  );
  const key = `revealline-mmm.company-installed.${verified.editionId}.v1`;
  if (!locks?.request)
    throw new Error('This browser cannot reserve the installed edition for safe selection.');
  return locks.request(`${key}.writer`, { mode: 'exclusive', ifAvailable: true }, (lock) => {
    signal?.throwIfAborted();
    if (!lock) throw new Error('Another tab is selecting this edition. Retry after it finishes.');
    const raw = storage.getItem(key);
    if (raw?.length > 8192) throw new Error('The installed edition record needs recovery.');
    const state = JSON.parse(raw || '{}');
    if (
      !state ||
      typeof state !== 'object' ||
      Array.isArray(state) ||
      Object.keys(state).some((field) => !['active', 'previous'].includes(field))
    )
      throw new Error('The installed edition record needs recovery.');
    const old = state.active ? validateCompanyInstallationReference(state.active, options) : null;
    const previous = state.previous
      ? validateCompanyInstallationReference(state.previous, options)
      : null;
    storage.setItem(
      key,
      JSON.stringify({ active, previous: old?.scope === active.scope ? previous : old }),
    );
    return active;
  });
}

/** Cancellation stops observation; it never removes an existing registration,
 * cache or previous installation. A browser-owned install can safely finish. */
export async function prepareEditionOffline({
  scope = defaultScope(),
  serviceWorker = globalThis.navigator?.serviceWorker,
  onStatus = () => {},
  signal,
  timeoutMs = 120000,
  editionId,
  version,
  buildId,
} = {}) {
  const expected = exactScope(scope);
  timeout(timeoutMs);
  signal?.throwIfAborted();
  if (!serviceWorker?.register)
    throw new Error('This browser does not support offline preparation.');
  onStatus({ status: 'downloading' });
  const registration = await browserOperation(
    () =>
      serviceWorker.register(new URL('service-worker.js', expected).href, {
        scope: expected,
        updateViaCache: 'none',
      }),
    { signal, timeoutMs },
  );
  signal?.throwIfAborted();
  if (registration?.scope !== expected)
    throw new Error('Offline preparation returned a different edition scope.');
  const installing = registration.installing;
  if (installing && !['installed', 'activated'].includes(installing.state))
    await new Promise((resolve, reject) => {
      let settled = false;
      const finish = (error) => {
        if (settled) return;
        settled = true;
        clearTimeout(timer);
        installing.removeEventListener('statechange', changed);
        signal?.removeEventListener('abort', aborted);
        error ? reject(error) : resolve();
      };
      const changed = () => {
        if (['installed', 'activated'].includes(installing.state)) finish();
        else if (installing.state === 'redundant')
          finish(new Error('Offline download failed. Reconnect and retry.'));
      };
      const aborted = () =>
        finish(signal.reason || new DOMException('Offline preparation cancelled.', 'AbortError'));
      const timer = setTimeout(
        () => finish(new Error('Offline preparation timed out. Existing editions are preserved.')),
        timeoutMs,
      );
      installing.addEventListener('statechange', changed);
      signal?.addEventListener('abort', aborted, { once: true });
      changed();
    });
  const result = await inspect(registration.waiting || registration.active || installing, {
    scope: expected,
    signal,
    timeoutMs,
    editionId,
    version,
    buildId,
    repair: true,
  });
  const ready = { ...result, status: registration.waiting ? 'waiting' : 'ready' };
  onStatus(ready);
  return ready;
}
