const oneOf = (value, choices, fallback = 'unavailable') =>
  choices.includes(value) ? value : fallback;
const boolean = (value) => (typeof value === 'boolean' ? value : null);
const available = (value) => (value ? 'available' : 'unavailable');
const version = (value) =>
  typeof value === 'string' && /^[a-z0-9][a-z0-9.+-]{0,63}$/i.test(value) ? value : null;
const mib = (value) =>
  Number.isFinite(value) && value >= 0 && value <= 2 ** 50
    ? Math.ceil(value / (1024 * 1024))
    : null;
const controllerStates = [
  'disposed',
  'unavailable',
  'disconnected',
  'unsupported',
  'waiting-controller',
  'ready-to-join',
  'waiting-neutral',
  'joined',
  'connected',
];

/** A fixed projection of current owners. No raw URL, identity, input history,
 * game data, storage key or exception text is accepted into this document. */
export function supportSnapshot(host = {}, env = globalThis, clock = {}) {
  const navigator = env.navigator,
    doc = env.document,
    now = clock.monotonic ?? env.performance?.now?.(),
    capturedAt = clock.wall ?? Date.now(),
    sampledAt = host.controller?.sampledAt,
    sampleAgeMs =
      Number.isFinite(now) && Number.isFinite(sampledAt) && sampledAt >= 0 && now >= sampledAt
        ? Math.min(86400000, Math.round(now - sampledAt))
        : null,
    visible = typeof doc?.hidden === 'boolean' ? !doc.hidden : null,
    focused = typeof doc?.hasFocus === 'function' ? boolean(doc.hasFocus()) : null,
    freshness =
      sampleAgeMs === null || visible === null || focused === null
        ? 'unavailable'
        : visible && focused && sampleAgeMs <= 2000
          ? 'recent'
          : 'stale';
  return {
    format: 'revealline-local-support-summary.v1',
    capturedAt:
      Number.isSafeInteger(capturedAt) && capturedAt >= 1e12 && capturedAt < 1e13
        ? new Date(capturedAt).toISOString()
        : null,
    scope: 'primary-game-shell',
    build: {
      version: version(host.version),
      sourceRevision:
        typeof host.sourceRevision === 'string' && /^[0-9a-f]{40,64}$/.test(host.sourceRevision)
          ? host.sourceRevision
          : null,
      packaged: boolean(host.packaged),
    },
    game: {
      host: oneOf(host.kind, ['solo', 'journey', 'installed-edition', 'practice']),
      state: oneOf(host.state, ['idle', 'running', 'paused', 'won', 'lost']),
      locale: oneOf(host.locale, ['en', 'uk']),
      saving: {
        writable: boolean(host.writable),
        reason: oneOf(host.writerReason, ['owned', 'occupied', 'unavailable', 'practice']),
      },
    },
    environment: {
      platform: oneOf(host.platform, ['browser', 'desktop', 'ios']),
      secureContext: boolean(env.isSecureContext),
      onlineHint:
        typeof navigator?.onLine === 'boolean'
          ? navigator.onLine
            ? 'online'
            : 'offline'
          : 'unavailable',
      standalone:
        typeof env.matchMedia === 'function'
          ? env.matchMedia('(display-mode: standalone)').matches === true ||
            navigator?.standalone === true
          : boolean(navigator?.standalone),
      visible,
      focused,
      capabilities: {
        gamepad: available(typeof navigator?.getGamepads === 'function'),
        indexedDB: available(typeof env.indexedDB?.open === 'function'),
        webLocks: available(typeof navigator?.locks?.request === 'function'),
        webAudio: available(typeof (env.AudioContext ?? env.webkitAudioContext) === 'function'),
        webCrypto: available(typeof env.crypto?.subtle?.digest === 'function'),
        serviceWorker: available(Boolean(navigator?.serviceWorker)),
      },
    },
    controller: {
      freshness,
      sampleAgeMs,
      status: oneOf(host.controller?.status, controllerStates),
      assigned: boolean(host.controller?.assigned),
      neutral: boolean(host.controller?.neutral),
      confirmBlocked: boolean(host.controller?.blocked),
      confirmReason: oneOf(host.controller?.reason, [
        'disposed',
        'unavailable',
        'unassigned',
        'assignment-lost',
        'scope-change',
        'flight',
        'waiting-neutral',
        'ready',
      ]),
    },
    offline: {
      support: oneOf(host.offline, ['configured', 'bundled', 'development', 'unsupported']),
      worker: !navigator?.serviceWorker
        ? 'unavailable'
        : navigator.serviceWorker.controller
          ? 'controlling'
          : 'not-controlling',
      files: 'not-verified-here',
    },
  };
}

async function observe(operation, { signal, timeoutMs }) {
  if (!operation) return { status: 'unavailable' };
  if (signal?.aborted) return { status: 'cancelled' };
  let timer, cancel;
  try {
    return await Promise.race([
      Promise.resolve()
        .then(() => {
          if (signal?.aborted) throw new DOMException('Cancelled', 'AbortError');
          return operation();
        })
        .then(
          (value) => ({ status: 'observed', value }),
          () => ({ status: 'unavailable' }),
        ),
      new Promise((resolve) => {
        timer = setTimeout(() => resolve({ status: 'timeout' }), timeoutMs);
        cancel = () => resolve({ status: 'cancelled' });
        signal?.addEventListener('abort', cancel, { once: true });
      }),
    ]);
  } finally {
    clearTimeout(timer);
    signal?.removeEventListener('abort', cancel);
  }
}

/** Explicit read-only browser observations. Never requests persistence, opens a
 * database, samples a controller, verifies files, downloads or contacts a server. */
export async function collectSupportSummary({
  host,
  env = globalThis,
  clock,
  signal,
  timeoutMs = 1500,
} = {}) {
  if (!Number.isInteger(timeoutMs) || timeoutMs < 1 || timeoutMs > 5000)
    throw new RangeError('Support observation deadline must be between 1 and 5000 ms.');
  const snapshot = supportSnapshot(host, env, clock),
    storage = env.navigator?.storage,
    [retention, estimate] = await Promise.all([
      observe(typeof storage?.persisted === 'function' ? () => storage.persisted() : null, {
        signal,
        timeoutMs,
      }),
      observe(typeof storage?.estimate === 'function' ? () => storage.estimate() : null, {
        signal,
        timeoutMs,
      }),
    ]);
  return {
    ...snapshot,
    storage: {
      retention:
        retention.status === 'observed'
          ? typeof retention.value === 'boolean'
            ? retention.value
              ? 'granted'
              : 'not-granted'
            : 'unavailable'
          : retention.status,
      estimate: {
        status:
          estimate.status === 'observed'
            ? mib(estimate.value?.usage) !== null && mib(estimate.value?.quota) !== null
              ? 'observed'
              : 'unavailable'
            : estimate.status,
        usageMiB: estimate.status === 'observed' ? mib(estimate.value?.usage) : null,
        quotaMiB: estimate.status === 'observed' ? mib(estimate.value?.quota) : null,
      },
    },
  };
}
