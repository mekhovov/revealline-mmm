import { boundedJSON, canonicalJSON, exactKeys } from '../data-json.mjs';
import { t } from '../i18n/index.mjs';
import { inspectJourneyPerformance } from './performance.mjs';
import { createJourneyPerformanceController } from './performance-store.mjs';
import { JOURNEY_MODES } from './catalog.mjs';
import {
  emptyJourneyPictures,
  validateJourneyPictures,
  validateJourneyPictureCompletions,
  applyJourneyPictureEvent,
} from './pictures.mjs';
import {
  emptyJourneyStars,
  validateJourneyStars,
  journeyStarsForProfile,
  applyJourneyStarsEvent,
} from './stars.mjs';

export const JOURNEY_PROFILE_VERSION = 'revealline-journey-profile.v1';
import { JOURNEY_PROFILE_DATABASE } from '../profile-database.mjs';
export { JOURNEY_PROFILE_DATABASE } from '../profile-database.mjs';
export const JOURNEY_BACKUP_VERSION = 'revealline-journey-backup.v1';
export const JOURNEY_SCOPED_BACKUP_VERSION = 'revealline-journey-backup.v2';
export const JOURNEY_PICTURE_BACKUP_VERSION = 'revealline-journey-backup.v3';
// Both exact v4 shapes were issued independently; keep their readers immutable.
export const JOURNEY_PERFORMANCE_BACKUP_VERSION = 'revealline-journey-backup.v4';
export const JOURNEY_STARS_BACKUP_VERSION = 'revealline-journey-backup.v4';
export const JOURNEY_COMBINED_BACKUP_VERSION = 'revealline-journey-backup.v5';
const emptyModes = (make) => Object.fromEntries(JOURNEY_MODES.map((mode) => [mode, make()]));
const text = (value) => typeof value === 'string' && value.length > 0 && value.length <= 1024;
const own = (object, key) => Object.hasOwn(object, key);
const journeyStructuralMessages = {
  object: () => t('errors:journey.objectRequired'),
  unsupported: ({ key }) => t('errors:journey.unsupportedField', { key }),
};
const exactJourneyKeys = (value, allowed, label) =>
  exactKeys(value, allowed, label, journeyStructuralMessages);
function validateProfileKey(key) {
  if (typeof key !== 'string' || !/^[a-z][a-z0-9-]{0,79}$/.test(key))
    throw new TypeError(t('errors:journey.stableProfileKeyRequired'));
}

function pictureEditionId(profileKey) {
  if (profileKey === 'journey') return null;
  for (const prefix of ['journey-', 'custom-'])
    if (profileKey.startsWith(prefix)) return profileKey.slice(prefix.length);
  return profileKey;
}

function inspectProfileBackup(source, profileKey) {
  const candidate = boundedJSON(source, { maxBytes: 16 * 1024 * 1024, maxNodes: 430032 });
  const legacySidecar = candidate?.format === JOURNEY_PERFORMANCE_BACKUP_VERSION,
    combined = candidate?.format === JOURNEY_COMBINED_BACKUP_VERSION;
  if (legacySidecar || combined || candidate?.format === JOURNEY_PICTURE_BACKUP_VERSION) {
    const hasStars = own(candidate, 'stars'),
      hasPerformance = own(candidate, 'performance');
    if (legacySidecar && hasStars === hasPerformance)
      throw new TypeError('Journey v4 backup requires exactly one historical sidecar.');
    if (combined && !hasStars) throw new TypeError('Journey v5 backup requires its stars sidecar.');
    exactJourneyKeys(
      candidate,
      [
        'format',
        'profileKey',
        'profile',
        'pictures',
        ...((legacySidecar || combined) && hasStars ? ['stars'] : []),
        ...((legacySidecar || combined) && hasPerformance ? ['performance'] : []),
      ],
      'Journey picture backup',
    );
    if (candidate.profileKey !== profileKey)
      throw new TypeError(t('errors:journey.differentEdition'));
    const profile = validateJourneyProfile(candidate.profile),
      pictures = validateJourneyPictureCompletions(profile, candidate.pictures, {
        editionId: pictureEditionId(profileKey),
      }),
      starResults = hasStars
        ? journeyStarsForProfile(candidate.stars, profile, { strict: true })
        : undefined,
      performance = hasPerformance ? inspectJourneyPerformance(candidate.performance) : undefined;
    return {
      backup: {
        ...candidate,
        profile,
        pictures,
        ...(hasStars ? { stars: starResults } : {}),
        ...(hasPerformance ? { performance } : {}),
      },
      normalized: { format: JOURNEY_BACKUP_VERSION, profile },
      pictures,
      ...(hasStars ? { starResults } : {}),
      ...(hasPerformance ? { performance } : {}),
    };
  }

  if (profileKey === 'journey') {
    const backup = inspectJourneyBackup(source);
    return { backup, normalized: backup };
  }
  const backup = boundedJSON(source, {
    maxBytes: 8 * 1024 * 1024,
    maxNodes: 100012,
    maxDepth: 12,
    maxArray: 4096,
    maxString: 1024,
  });
  if (backup?.format !== JOURNEY_SCOPED_BACKUP_VERSION || backup.profileKey !== profileKey)
    throw new TypeError(t('errors:journey.differentEdition'));
  exactJourneyKeys(backup, ['format', 'profileKey', 'profile'], 'Scoped Journey backup');
  const normalized = {
    format: JOURNEY_BACKUP_VERSION,
    profile: validateJourneyProfile(backup.profile),
  };
  return {
    backup: { format: JOURNEY_SCOPED_BACKUP_VERSION, profileKey, profile: normalized.profile },
    normalized,
  };
}

export function emptyJourneyProfile() {
  return {
    format: JOURNEY_PROFILE_VERSION,
    generation: 0,
    cursors: emptyModes(() => null),
    skipped: emptyModes(() => []),
    clears: emptyModes(() => ({})),
  };
}

export function validateJourneyProfile(source) {
  const profile = boundedJSON(source, {
    maxBytes: 4 * 1024 * 1024,
    maxNodes: 100000,
    maxDepth: 10,
    maxArray: 4096,
    maxString: 1024,
  });
  exactJourneyKeys(
    profile,
    ['format', 'generation', 'cursors', 'skipped', 'clears'],
    'Journey profile',
  );
  if (
    profile.format !== JOURNEY_PROFILE_VERSION ||
    !Number.isSafeInteger(profile.generation) ||
    profile.generation < 0
  )
    throw new TypeError(t('errors:journey.damagedProfile'));
  for (const field of ['cursors', 'skipped', 'clears'])
    exactJourneyKeys(profile[field], JOURNEY_MODES, `Journey ${field}`);
  for (const mode of JOURNEY_MODES) {
    if (
      !(profile.cursors[mode] === null || text(profile.cursors[mode])) ||
      !Array.isArray(profile.skipped[mode]) ||
      !profile.skipped[mode].every(text) ||
      new Set(profile.skipped[mode]).size !== profile.skipped[mode].length ||
      !profile.clears[mode] ||
      typeof profile.clears[mode] !== 'object' ||
      Array.isArray(profile.clears[mode])
    )
      throw new TypeError(t('errors:journey.invalidModeState'));
    for (const [id, receipt] of Object.entries(profile.clears[mode])) {
      exactJourneyKeys(
        receipt,
        ['runId', 'gameplayId', 'difficulty'],
        'Journey completion receipt',
      );
      if (
        !text(id) ||
        !text(receipt.runId) ||
        !text(receipt.gameplayId) ||
        !['gentle', 'standard', 'expert'].includes(receipt.difficulty)
      )
        throw new TypeError(t('errors:journey.invalidCompletionReceipt'));
    }
  }
  return profile;
}

export function inspectJourneyBackup(source) {
  const backup = boundedJSON(source, {
    maxBytes: 8 * 1024 * 1024,
    maxNodes: 100010,
    maxDepth: 12,
    maxArray: 4096,
    maxString: 1024,
  });
  exactJourneyKeys(backup, ['format', 'profile'], 'Journey backup');
  if (backup.format !== JOURNEY_BACKUP_VERSION)
    throw new TypeError(t('errors:journey.unsupportedBackup'));
  return { format: JOURNEY_BACKUP_VERSION, profile: validateJourneyProfile(backup.profile) };
}

/** Non-destructive restore: current receipts/cursors win, skips never replace a
 * clear, and unknown mission IDs survive future/previous release round trips.
 * These local progress records grant no score, unlock, replay or award authority. */
export function mergeJourneyBackup(source, backupSource) {
  const profile = validateJourneyProfile(source),
    backup = inspectJourneyBackup(backupSource).profile;
  const before = JSON.stringify(profile);
  for (const mode of JOURNEY_MODES) {
    profile.cursors[mode] ??= backup.cursors[mode];
    for (const [id, receipt] of Object.entries(backup.clears[mode])) {
      if (!own(profile.clears[mode], id)) profile.clears[mode][id] = receipt;
    }
    profile.skipped[mode] = [
      ...new Set([...profile.skipped[mode], ...backup.skipped[mode]]),
    ].filter((id) => !own(profile.clears[mode], id));
  }
  if (JSON.stringify(profile) !== before) profile.generation++;
  return validateJourneyProfile(profile);
}

/** Events contain no score authority: the host supplies only verified legal clears. */
export function applyJourneyEvent(source, event) {
  if (event?.type === 'restore') {
    exactJourneyKeys(event, ['type', 'backup'], 'Journey restore event');
    return mergeJourneyBackup(source, event.backup);
  }
  const profile = validateJourneyProfile(source);
  if (
    !event ||
    !JOURNEY_MODES.includes(event.mode) ||
    !text(event.missionId) ||
    !['select', 'skip', 'complete'].includes(event.type)
  )
    throw new TypeError(t('errors:journey.invalidProgressEvent'));
  const { mode, missionId } = event;
  if (event.type === 'select') profile.cursors[mode] = missionId;
  if (event.type === 'skip' && !profile.skipped[mode].includes(missionId))
    profile.skipped[mode].push(missionId);
  if (event.type === 'complete') {
    if (
      !text(event.runId) ||
      !text(event.gameplayId) ||
      !['gentle', 'standard', 'expert'].includes(event.difficulty) ||
      !(event.stars === undefined || [1, 2, 3].includes(event.stars))
    )
      throw new TypeError(t('errors:journey.exactReceiptRequired'));
    if (own(profile.clears[mode], missionId)) {
      const old = profile.clears[mode][missionId];
      if (old.runId === event.runId) {
        if (old.gameplayId !== event.gameplayId || old.difficulty !== event.difficulty)
          throw new TypeError(t('errors:journey.completionIdentityChanged'));
        return profile;
      }
    }
    Object.defineProperty(profile.clears[mode], missionId, {
      enumerable: true,
      configurable: true,
      writable: true,
      value: { runId: event.runId, gameplayId: event.gameplayId, difficulty: event.difficulty },
    });
    profile.skipped[mode] = profile.skipped[mode].filter((id) => id !== missionId);
  }
  profile.generation++;
  return validateJourneyProfile(profile);
}

/** Each read/modify/write is one IndexedDB transaction, including across tabs. */
export function createJourneyBackend({
  indexedDB = globalThis.indexedDB,
  profileKey = 'journey',
  canWrite = () => true,
} = {}) {
  // Content-review editions may isolate progress without changing the database
  // or historical default record. Never derive this key from a release version.
  validateProfileKey(profileKey);
  if (typeof canWrite !== 'function') throw new TypeError('A profile write guard is required.');
  const checkWrite = (events) => {
    if (events.length && !canWrite())
      throw new Error('The profile saving lease is no longer held.');
  };
  let opening;
  const open = () => {
    if (!indexedDB) return Promise.reject(new Error(t('errors:journey.storageUnavailable')));
    return (opening ??= new Promise((resolve, reject) => {
      const request = indexedDB.open(JOURNEY_PROFILE_DATABASE, 1);
      let failed = false;
      const fail = (error) => {
        failed = true;
        opening = null;
        reject(error || new Error(t('errors:journey.storageOpenFailed')));
      };
      request.onupgradeneeded = () => request.result.createObjectStore('profiles');
      request.onerror = () => fail(request.error);
      request.onblocked = () => fail(new Error(t('errors:journey.closeOlderTab')));
      request.onsuccess = () => {
        const db = request.result;
        if (failed) {
          db.close();
          return;
        }
        db.onversionchange = () => {
          db.close();
          opening = null;
        };
        resolve(db);
      };
    }));
  };
  async function transaction(events, { signal } = {}) {
    signal?.throwIfAborted();
    checkWrite(events);
    const db = await open();
    signal?.throwIfAborted();
    checkWrite(events);
    return new Promise((resolve, reject) => {
      const tx = db.transaction('profiles', events.length ? 'readwrite' : 'readonly'),
        store = tx.objectStore('profiles'),
        read = store.get(profileKey),
        pictureRead = store.get(`${profileKey}:pictures.v1`),
        starsRead = store.get(`${profileKey}:stars.v1`),
        performanceRead = store.get(`${profileKey}:performance.v1`);
      let next,
        failure,
        remaining = 4;
      const abort = () => {
        failure = signal.reason;
        try {
          tx.abort();
        } catch {
          // A transaction already committed before cancellation is confirmed by
          // oncomplete; callers must not report a rollback that did not happen.
        }
      };
      const cleanup = () => signal?.removeEventListener('abort', abort);
      signal?.addEventListener('abort', abort, { once: true });
      const loaded = () => {
        if (--remaining) return;
        try {
          signal?.throwIfAborted();
          checkWrite(events);
          next = {
            profile:
              read.result === undefined
                ? emptyJourneyProfile()
                : validateJourneyProfile(read.result),
            pictures:
              pictureRead.result === undefined
                ? emptyJourneyPictures()
                : validateJourneyPictures(pictureRead.result),
            stars:
              starsRead.result === undefined
                ? emptyJourneyStars()
                : validateJourneyStars(starsRead.result),
            ...(performanceRead.result === undefined
              ? {}
              : { performance: performanceRead.result }),
          };
          next.stars = journeyStarsForProfile(next.stars, next.profile);
          for (const event of events)
            next = applyStateEvent(next, event, pictureEditionId(profileKey));
          if (events.some((event) => event.type !== 'performance'))
            store.put(next.profile, profileKey);
          if (events.some((event) => event.type === 'performance'))
            store.put(next.performance, `${profileKey}:performance.v1`);
          if (events.some((event) => event.picture !== undefined || event.pictures !== undefined))
            store.put(next.pictures, `${profileKey}:pictures.v1`);
          if (events.some((event) => event.stars !== undefined || event.starResults !== undefined))
            store.put(next.stars, `${profileKey}:stars.v1`);
        } catch (error) {
          failure = error;
          tx.abort();
        }
      };
      read.onsuccess =
        pictureRead.onsuccess =
        starsRead.onsuccess =
        performanceRead.onsuccess =
          loaded;
      tx.oncomplete = () => {
        cleanup();
        resolve(next);
      };
      tx.onabort = tx.onerror = () => {
        cleanup();
        reject(failure || tx.error || new Error(t('errors:journey.saveFailed')));
      };
    });
  }
  return {
    profileKey,
    read: async () => (await transaction([])).profile,
    commit: async (events) => (await transaction(events)).profile,
    readState: () => transaction([]),
    commitState: transaction,
  };
}
function applyStateEvent(state, event, editionId = null) {
  if (event.type === 'performance') {
    exactJourneyKeys(event, ['type', 'previous', 'performance'], 'Journey performance transaction');
    if (event.previous !== canonicalJSON(state.performance ?? null))
      throw new Error(
        'Journey performance changed in another tab. Try the optional comparison again.',
      );
    const performance = inspectJourneyPerformance(event.performance);
    if (performance.generation !== (state.performance?.generation ?? 0) + 1)
      throw new Error('Journey performance generation changed.');
    return { ...state, performance };
  }
  const { pictures, starResults: _starResults, ...profileEvent } = event;
  const profile = applyJourneyEvent(state.profile, profileEvent);
  if (event.type === 'restore' && pictures !== undefined)
    validateJourneyPictureCompletions(profile, pictures, { editionId });
  return {
    ...state,
    profile,
    pictures: applyJourneyPictureEvent(state.pictures, event),
    stars: applyJourneyStarsEvent(state.stars ?? emptyJourneyStars(), event, profile),
  };
}
function validateState(state) {
  return {
    profile: validateJourneyProfile(state.profile),
    pictures: validateJourneyPictures(state.pictures),
    stars: journeyStarsForProfile(state.stars ?? emptyJourneyStars(), state.profile),
    ...(state.performance === undefined ? {} : { performance: state.performance }),
  };
}

/** In-memory adoption is immediate; persistence failure never prevents Next. */
export function createJourneyProfileStore({
  backend,
  profileKey = backend?.profileKey ?? 'journey',
  onStatus = () => {},
  operationTimeoutMs = 1500,
  canWrite = () => true,
  acceptPerformanceBinding,
} = {}) {
  validateProfileKey(profileKey);
  if (typeof canWrite !== 'function') throw new TypeError('A profile write guard is required.');
  backend ??= createJourneyBackend({ profileKey, canWrite });
  if (backend.profileKey !== undefined && backend.profileKey !== profileKey)
    throw new TypeError(t('errors:journey.backendEditionMismatch'));
  if (!Number.isFinite(operationTimeoutMs) || operationTimeoutMs <= 0)
    throw new TypeError(t('errors:journey.positiveTimeoutRequired'));
  const bounded = (operation) =>
    new Promise((resolve, reject) => {
      const timer = setTimeout(
        () => reject(new Error(t('errors:journey.storageTimeout'))),
        operationTimeoutMs,
      );
      Promise.resolve()
        .then(operation)
        .then(resolve, reject)
        .finally(() => clearTimeout(timer));
    });
  let profile = emptyJourneyProfile(),
    pictures = emptyJourneyPictures(),
    stars = emptyJourneyStars(),
    pending = [],
    saving = null,
    ready = false,
    durable = false,
    error = null,
    stateRevision = 0;
  const editionId = pictureEditionId(profileKey),
    applyEvent = (state, event) => applyStateEvent(state, event, editionId);
  const status = () => {
    const value = { ready, durable, pending: pending.length, error: error?.message ?? null };
    try {
      onStatus(value);
    } catch {
      // A presentation observer never owns persistence or progression.
    }
    return value;
  };
  const snapshot = () => structuredClone(profile);
  const pictureSnapshot = () => structuredClone(pictures);
  const starSnapshot = () => structuredClone(stars);
  const adopt = (state, { observePerformance = true } = {}) => {
    ({ profile, pictures, stars = emptyJourneyStars() } = state);
    stateRevision++;
    if (observePerformance) performance.observe(state);
  };
  const readState = async () =>
    backend.readState
      ? validateState(await backend.readState())
      : {
          profile: validateJourneyProfile(await backend.read()),
          pictures: emptyJourneyPictures(),
          stars: emptyJourneyStars(),
        };
  const commitState = async (events, { signal } = {}) => {
    signal?.throwIfAborted();
    if (!canWrite()) throw new Error('The profile saving lease is no longer held.');
    if (backend.commitState) return validateState(await backend.commitState(events, { signal }));
    if (events.some((event) => event.type === 'performance'))
      throw new Error('This Journey backend cannot retain optional performance evidence.');
    if (events.some((event) => event.picture !== undefined || event.pictures !== undefined))
      throw new Error(t('errors:journey.pictureReceiptsUnsupported'));
    if (events.some((event) => event.stars !== undefined || event.starResults !== undefined))
      throw new Error(t('errors:journey.saveFailed'));
    return {
      profile: validateJourneyProfile(await backend.commit(events)),
      pictures: emptyJourneyPictures(),
      stars: emptyJourneyStars(),
    };
  };
  async function flush() {
    if (saving) return saving;
    saving = (async () => {
      try {
        // Loading and saving share one queue. An older read must never replace
        // a newly committed clear, including when play starts before load ends.
        const latest = await bounded(readState);
        adopt(pending.reduce(applyEvent, latest));
        while (pending.length) {
          const batch = [...pending];
          const saved = await bounded(() => commitState(batch));
          pending = pending.slice(batch.length);
          adopt(pending.reduce(applyEvent, saved));
        }
        durable = true;
        error = null;
      } catch (failure) {
        durable = false;
        error = failure;
      } finally {
        ready = true;
        saving = null;
        status();
      }
      return durable;
    })();
    return saving;
  }
  const recordEvents = (events) => {
    if (!Array.isArray(events) || events.length < 1 || events.length > 256)
      throw new TypeError(t('errors:journey.eventBatchSize'));
    if (events.some((event) => event.type === 'performance'))
      throw new TypeError('Use the verified Journey performance adapter.');
    const owned = structuredClone(events);
    // Validate the whole transition before publishing either its cursor or skip.
    // One status notification cannot expose a partially applied transition.
    const next = owned.reduce(applyEvent, { profile, pictures, stars });
    adopt(next, { observePerformance: false });
    pending.push(...owned);
    durable = false;
    status();
    void flush();
    return snapshot();
  };
  async function recordWithReceiptFallback(event) {
    if (event?.type !== 'complete') throw new TypeError(t('errors:journey.exactReceiptRequired'));
    if (event.picture === undefined) {
      recordEvents([event]);
      const receiptDurable = await flush();
      return {
        durable: receiptDurable,
        picture: false,
        fallback: false,
        error: receiptDurable ? null : (error?.message ?? null),
      };
    }
    const { picture: _picture, ...receipt } = event,
      before = pending.length;
    recordEvents([event]);
    const primary = pending[before];
    if (await flush()) return { durable: true, picture: true, fallback: false, error: null };
    const primaryError = error;
    // A failed picture transaction keeps its event queued. Replace only this
    // completion with its exact receipt, preserving later events and rebuilding
    // from durable state before retrying. This makes the clear recoverable when
    // picture storage alone exceeds quota without claiming that the picture was
    // retained.
    const index = pending.indexOf(primary);
    if (index < 0) return { durable: true, picture: true, fallback: false, error: null };
    let latest;
    try {
      latest = await bounded(readState);
    } catch {
      return {
        durable: false,
        picture: true,
        fallback: false,
        error: primaryError?.message ?? null,
      };
    }
    const replacement = structuredClone(receipt),
      nextPending = [...pending];
    nextPending[index] = replacement;
    const next = nextPending.reduce(applyEvent, latest);
    pending = nextPending;
    adopt(next);
    durable = false;
    error = primaryError;
    status();
    const receiptDurable = await flush();
    if (!receiptDurable) {
      const receiptIndex = pending.indexOf(replacement);
      if (receiptIndex >= 0) {
        const restoredPending = [...pending];
        restoredPending[receiptIndex] = primary;
        pending = restoredPending;
        adopt(pending.reduce(applyEvent, latest));
        status();
      }
    }
    return {
      durable: receiptDurable,
      picture: !receiptDurable,
      fallback: receiptDurable,
      error: primaryError?.message ?? null,
    };
  }
  const commitPerformance = (events, { signal } = {}) =>
    new Promise((resolve, reject) => {
      const controller = new AbortController();
      let settled = false,
        timer;
      const finish = (callback, value) => {
        if (settled) return;
        settled = true;
        clearTimeout(timer);
        signal?.removeEventListener('abort', abort);
        callback(value);
      };
      const abort = () => {
        controller.abort(signal.reason);
        finish(reject, signal.reason);
      };
      signal?.addEventListener('abort', abort, { once: true });
      if (signal?.aborted) {
        abort();
        return;
      }
      timer = setTimeout(() => {
        const error = new Error(t('errors:journey.storageTimeout'));
        error.name = 'JourneyPerformanceSaveUnconfirmed';
        controller.abort(error);
        finish(reject, error);
      }, operationTimeoutMs);
      Promise.resolve()
        .then(() => commitState(events, { signal: controller.signal }))
        .then(
          (value) => finish(resolve, value),
          (error) => finish(reject, error),
        );
    });
  const performance = createJourneyPerformanceController({
    backend: {
      readState: () => bounded(readState),
      commitState: commitPerformance,
    },
    getProfile: snapshot,
    flushProfile: flush,
    acceptBinding: acceptPerformanceBinding,
    canWrite,
  });
  const inspectAsync = async (source, { signal } = {}) => {
    const inspected = inspectProfileBackup(source, profileKey);
    const merged = applyEvent(
      { profile, pictures, stars },
      {
        type: 'restore',
        backup: inspected.normalized,
        ...(inspected.pictures ? { pictures: inspected.pictures } : {}),
        ...(inspected.starResults ? { starResults: inspected.starResults } : {}),
      },
    );
    if (inspected.performance)
      await performance.inspect(inspected.performance, merged.profile, { signal });
    signal?.throwIfAborted();
    return {
      backup: inspected.backup,
      merged: merged.profile,
      pictures: merged.pictures,
      stars: merged.stars,
    };
  };
  return {
    performance,
    inspectBackupAsync: inspectAsync,
    async restoreAsync(source, { signal } = {}) {
      const checked = await inspectAsync(source, { signal });
      signal?.throwIfAborted();
      // The caller can mutate an object while replay verification yields. Apply
      // only the owned clone that actually passed asynchronous inspection.
      const inspected = inspectProfileBackup(checked.backup, profileKey);
      recordEvents([
        {
          type: 'restore',
          backup: inspected.normalized,
          ...(inspected.pictures ? { pictures: inspected.pictures } : {}),
          ...(inspected.starResults ? { starResults: inspected.starResults } : {}),
        },
      ]);
      let optional;
      if (inspected.performance) {
        try {
          optional = { durable: await performance.restore(inspected.performance, { signal }) };
        } catch (error) {
          signal?.throwIfAborted();
          optional = {
            durable: false,
            error: error.message,
            ...(error.name === 'JourneyPerformanceSaveUnconfirmed'
              ? { saveUnconfirmed: true }
              : {}),
          };
        }
      }
      return { profile: snapshot(), ...(optional ? { performance: optional } : {}) };
    },
    async load() {
      await flush();
      return snapshot();
    },
    snapshot,
    pictures: pictureSnapshot,
    stars: starSnapshot,
    bestStars: (mode, missionId) =>
      own(profile.clears[mode] ?? {}, missionId) && own(stars.best[mode] ?? {}, missionId)
        ? stars.best[mode][missionId]
        : null,
    stateRevision: () => stateRevision,
    status,
    flush,
    backupFilename:
      profileKey === 'journey'
        ? 'revealline-journey-progress.json'
        : `revealline-${profileKey}-progress.json`,
    inspectBackup(source) {
      const inspected = inspectProfileBackup(source, profileKey);
      if (inspected.performance)
        throw new TypeError('Inspect performance evidence asynchronously before restoring it.');
      const { backup, normalized, pictures: restored, starResults } = inspected;
      const merged = applyEvent(
        { profile, pictures, stars },
        {
          type: 'restore',
          backup: normalized,
          ...(restored ? { pictures: restored } : {}),
          ...(starResults ? { starResults } : {}),
        },
      );
      return { backup, merged: merged.profile, pictures: merged.pictures, stars: merged.stars };
    },
    restore(source) {
      const inspected = inspectProfileBackup(source, profileKey);
      if (inspected.performance)
        throw new TypeError(
          'Restore performance evidence through verified asynchronous inspection.',
        );
      return recordEvents([
        {
          type: 'restore',
          backup: inspected.normalized,
          ...(inspected.pictures ? { pictures: inspected.pictures } : {}),
          ...(inspected.starResults ? { starResults: inspected.starResults } : {}),
        },
      ]);
    },
    record(event) {
      return recordEvents([event]);
    },
    recordWithReceiptFallback,
    recordMany: recordEvents,
    export() {
      const evidence = performance.backup(),
        hasStars = JOURNEY_MODES.some((mode) => Object.keys(stars.best[mode]).length);
      return JSON.stringify(
        evidence || hasStars
          ? {
              format: JOURNEY_COMBINED_BACKUP_VERSION,
              profileKey,
              profile: snapshot(),
              pictures: pictureSnapshot(),
              stars: starSnapshot(),
              ...(evidence ? { performance: evidence } : {}),
            }
          : pictures.records.length
            ? {
                format: JOURNEY_PICTURE_BACKUP_VERSION,
                profileKey,
                profile: snapshot(),
                pictures: pictureSnapshot(),
              }
            : profileKey === 'journey'
              ? { format: JOURNEY_BACKUP_VERSION, profile: snapshot() }
              : { format: JOURNEY_SCOPED_BACKUP_VERSION, profileKey, profile: snapshot() },
        null,
        2,
      );
    },
  };
}
