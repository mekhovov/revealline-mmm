import { boundedJSON, canonicalJSON, exactKeys } from '../data-json.mjs';
import { t } from '../i18n/index.mjs';
import { inspectJourneyPerformance } from './performance.mjs';
import {
  createJourneyPerformanceController,
  JourneyBackupEvidenceUnavailable,
} from './performance-store.mjs';
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
  return transitionJourneyProfile(profile, event) ? validateJourneyProfile(profile) : profile;
}

// Only the store/backend's already validated profile reaches this private path.
// Copy the transition's writable containers; final validation still owns the
// complete result and enforces the original byte/node/depth/array budgets.
function applyOwnedJourneyEvent(source, event) {
  if (event?.type === 'restore') return applyJourneyEvent(source, event);
  const mode = event?.mode;
  const profile = {
    ...source,
    cursors: { ...source.cursors },
    skipped: { ...source.skipped },
    clears: { ...source.clears },
  };
  if (JOURNEY_MODES.includes(mode)) {
    profile.skipped[mode] = [...source.skipped[mode]];
    profile.clears[mode] = { ...source.clears[mode] };
  }
  transitionJourneyProfile(profile, event);
  return validateJourneyProfile(profile);
}

// Mutates only its owned writable containers. False is the historical
// idempotent completion, for which the public entry returns its input copy.
function transitionJourneyProfile(profile, event) {
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
        return false;
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
  return true;
}

/** Each read/modify/write is one IndexedDB transaction, including across tabs. */
export function createJourneyBackend(options = {}) {
  return journeyBackend(options);
}

// Only the store-created backend receives these private capabilities.
function journeyBackend(
  {
    indexedDB = globalThis.indexedDB,
    profileKey = 'journey',
    canWrite = () => true,
    canRunProgressWork = () => true,
  } = {},
  access = null,
) {
  // Content-review editions may isolate progress without changing the database
  // or historical default record. Never derive this key from a release version.
  validateProfileKey(profileKey);
  if (typeof canWrite !== 'function') throw new TypeError('A profile write guard is required.');
  if (typeof canRunProgressWork !== 'function')
    throw new TypeError('A progress phase predicate is required.');
  const checkProgress = (policy) => {
    if (!policy?.optional && !canRunProgressWork())
      throw new Error('Journey progress remains pending until gameplay is paused.');
  };
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
  async function transaction(events, { signal } = {}, policy = null) {
    signal?.throwIfAborted();
    checkWrite(events);
    checkProgress(policy);
    const db = await open();
    signal?.throwIfAborted();
    checkWrite(events);
    checkProgress(policy);
    if (policy?.optional && !access.canRun()) throw access.deferred;
    return new Promise((resolve, reject) => {
      const tx = db.transaction('profiles', events.length ? 'readwrite' : 'readonly'),
        store = tx.objectStore('profiles'),
        read = store.get(profileKey),
        pictureRead = store.get(`${profileKey}:pictures.v1`),
        starsRead = store.get(`${profileKey}:stars.v1`),
        performanceRead = policy?.progressOnly ? null : store.get(`${profileKey}:performance.v1`);
      let next,
        failure,
        remaining = performanceRead ? 4 : 3;
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
          checkProgress(policy);
          if (policy?.optional && !access.canRun()) throw access.deferred;
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
            ...(!performanceRead || performanceRead.result === undefined
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
          try {
            tx.abort();
          } catch (abortError) {
            // Only the terminal abort event can authorize a deferred retry.
            if (error === access?.deferred) failure = abortError;
          }
        }
      };
      read.onsuccess = pictureRead.onsuccess = starsRead.onsuccess = loaded;
      if (performanceRead) performanceRead.onsuccess = loaded;
      tx.oncomplete = () => {
        cleanup();
        if (!next) {
          reject(failure || new Error(t('errors:journey.saveFailed')));
          return;
        }
        access?.states.set(
          next,
          Object.freeze({
            performanceRead: Boolean(performanceRead),
            performance: next.performance,
          }),
        );
        resolve(next);
      };
      tx.onerror = () => {
        if (!policy?.optional) {
          cleanup();
          reject(failure || tx.error || new Error(t('errors:journey.saveFailed')));
        }
        // Explicit abort may first bubble request AbortError events. Await the
        // transaction's terminal event; an error event is not a retry receipt.
      };
      tx.onabort = () => {
        cleanup();
        if (policy?.optional && failure === access.deferred && !tx.error && !signal?.aborted)
          reject(access.deferred);
        else
          reject(
            signal?.aborted
              ? signal.reason
              : (failure === access?.deferred ? tx.error : failure) ||
                  tx.error ||
                  new Error(t('errors:journey.saveFailed')),
          );
      };
    });
  }
  if (access) {
    access.readProgress = (options) => transaction([], options, { progressOnly: true });
    access.commitProgress = (events, options) => {
      if (events.some((event) => event.type === 'performance'))
        throw new TypeError('Optional evidence cannot enter a progress-only transaction.');
      return transaction(events, options, { progressOnly: true });
    };
    access.readOptional = (options) => transaction([], options, { optional: true });
    access.commitOptional = (events, options) => transaction(events, options, { optional: true });
  }
  return {
    profileKey,
    read: async () => (await transaction([])).profile,
    commit: async (events) => (await transaction(events)).profile,
    readState: (options) => transaction([], options),
    commitState: (events, options) => transaction(events, options),
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
  const profile = applyOwnedJourneyEvent(state.profile, profileEvent);
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
  schedulePerformanceChunk,
  canRunPerformanceWork = () => true,
  canRunProgressWork = () => true,
} = {}) {
  validateProfileKey(profileKey);
  if (typeof canWrite !== 'function') throw new TypeError('A profile write guard is required.');
  if (typeof canRunPerformanceWork !== 'function')
    throw new TypeError('An optional performance phase predicate is required.');
  if (typeof canRunProgressWork !== 'function')
    throw new TypeError('A progress phase predicate is required.');
  const checkProgress = () => {
    if (!canRunProgressWork())
      throw new Error('Journey progress remains pending until gameplay is paused.');
  };
  // These identities are private to the default backend. Neither injected
  // backends nor public observations can mint a validation/read receipt.
  const access =
    backend === undefined && schedulePerformanceChunk
      ? {
          states: new WeakMap(),
          canRun: canRunPerformanceWork,
          deferred: Object.freeze({ phaseDeferred: true }),
        }
      : null;
  const ownedPerformanceStates = access ? new WeakMap() : null;
  const retainOwnedPerformanceState = (state) => {
    const receipt = access?.states.get(state);
    if (receipt)
      ownedPerformanceStates.set(
        state,
        Object.freeze(
          receipt.performanceRead
            ? { performance: receipt.performance }
            : { unread: true, read: readPerformanceState },
        ),
      );
    return state;
  };
  backend ??= journeyBackend({ profileKey, canWrite, canRunProgressWork }, access);
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
  // A timed-out required read/write must not validate a late native result
  // after the app has resumed. Abort is best effort: a committed transaction
  // remains committed, and the next read reconciles an unconfirmed result.
  const boundedProgress = (operation) => {
    const controller = new AbortController();
    return bounded(() => operation({ signal: controller.signal })).catch((error) => {
      controller.abort(error);
      throw error;
    });
  };
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
    applyEvent = (state, event) => {
      const next = applyStateEvent(state, event, editionId),
        receipt = access?.states.get(state);
      if (receipt) access.states.set(next, receipt);
      return next;
    };
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
    if (observePerformance) performance.observe(retainOwnedPerformanceState(state));
  };
  const acceptedState = (state) =>
    retainOwnedPerformanceState(access?.states.has(state) ? state : validateState(state));
  const readState = async ({ signal } = {}) => {
    signal?.throwIfAborted();
    checkProgress();
    const value = backend.readState
      ? await (access ? access.readProgress({ signal }) : backend.readState({ signal }))
      : {
          profile: await backend.read(),
          pictures: emptyJourneyPictures(),
          stars: emptyJourneyStars(),
        };
    signal?.throwIfAborted();
    checkProgress();
    return acceptedState(value);
  };
  const commitState = async (events, { signal, deferValidation = false } = {}) => {
    signal?.throwIfAborted();
    if (!canWrite()) throw new Error('The profile saving lease is no longer held.');
    const optional = events.some((event) => event.type === 'performance');
    if (!optional) checkProgress();
    let value;
    if (backend.commitState) {
      value = await (access
        ? (optional ? access.commitOptional : access.commitProgress)(events, { signal })
        : backend.commitState(events, { signal }));
    } else {
      if (optional)
        throw new Error('This Journey backend cannot retain optional performance evidence.');
      if (events.some((event) => event.picture !== undefined || event.pictures !== undefined))
        throw new Error(t('errors:journey.pictureReceiptsUnsupported'));
      if (events.some((event) => event.stars !== undefined || event.starResults !== undefined))
        throw new Error(t('errors:journey.saveFailed'));
      value = {
        profile: await backend.commit(events),
        pictures: emptyJourneyPictures(),
        stars: emptyJourneyStars(),
      };
    }
    // flush consumes only the exact confirmed prefix before its phase check.
    // No validation or publication may run during play after this I/O boundary.
    if (deferValidation) return value;
    return acceptedState(value);
  };
  async function flush() {
    if (saving) return saving;
    saving = (async () => {
      try {
        // Loading and saving share one queue. An older read must never replace
        // a newly committed clear, including when play starts before load ends.
        const latest = await boundedProgress(readState);
        checkProgress();
        adopt(pending.reduce(applyEvent, latest));
        while (pending.length) {
          const batch = [...pending];
          const saved = await boundedProgress(({ signal }) =>
            commitState(batch, { signal, deferValidation: true }),
          );
          // Only the private native receipt confirms a validated commit before
          // phase admission. Injected results keep defensive validation and may
          // not discard retryable events on an invalid/unbounded response.
          let accepted;
          if (!access?.states.has(saved)) {
            checkProgress();
            accepted = acceptedState(saved);
          }
          if (!batch.every((event, index) => pending[index] === event))
            throw new Error('Journey progress changed while saving.');
          pending = pending.slice(batch.length);
          checkProgress();
          adopt(pending.reduce(applyEvent, accepted ?? acceptedState(saved)));
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
      latest = await boundedProgress(readState);
      checkProgress();
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
        // Restore the queued original even if play began after the failed
        // receipt write; the already adopted in-memory clear remains valid.
        if (canRunProgressWork()) adopt(pending.reduce(applyEvent, latest));
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
  // Admission only starts I/O; it never holds the main slot across a native
  // transaction or across another admission. One deadline covers every attempt.
  const runOptionalStorage = async (startAttempt, { signal, write = false } = {}) => {
    const controller = new AbortController();
    let timer,
      deadline = null,
      closed = false,
      stop,
      timeoutError;
    const stopped = new Promise((_, reject) => {
      stop = reject;
    });
    stopped.catch(() => {});
    const cancel = (reason) => {
      controller.abort(reason);
      stop(reason);
    };
    const abort = () => cancel(signal.reason);
    const expired = () => {
      timeoutError ??= new Error(t('errors:journey.storageTimeout'));
      if (write) timeoutError.name = 'JourneyPerformanceSaveUnconfirmed';
      cancel(timeoutError);
      return timeoutError;
    };
    const check = () => {
      controller.signal.throwIfAborted();
      if (deadline !== null && globalThis.performance.now() >= deadline) throw expired();
    };
    signal?.addEventListener('abort', abort, { once: true });
    if (signal?.aborted) abort();
    try {
      for (;;) {
        let called = false,
          retired = false,
          failure,
          attempt;
        try {
          check();
          const admitted = Promise.resolve().then(() =>
            schedulePerformanceChunk(
              () => {
                try {
                  if (closed || retired || called)
                    throw new Error('Optional storage admission must run exactly once.');
                  called = true;
                  check();
                  if (!canRunPerformanceWork())
                    throw new Error('Optional storage admission did not grant a safe phase.');
                  if (deadline === null) {
                    deadline = globalThis.performance.now() + operationTimeoutMs;
                    timer = setTimeout(expired, operationTimeoutMs);
                  }
                  attempt = Promise.resolve(startAttempt(controller.signal));
                  attempt.catch(() => {});
                  // Intentionally return undefined: native settlement owns no main slot.
                } catch (error) {
                  failure = error;
                  throw error;
                }
              },
              { signal: controller.signal },
            ),
          );
          await Promise.race([admitted, stopped]);
          if (failure) throw failure;
          if (!called) throw new Error('Optional storage admission did not run work.');
          check();
          const value = await Promise.race([attempt, stopped]);
          check();
          return value;
        } catch (error) {
          check();
          if (error !== access.deferred) throw error;
          // The private sentinel is returned only before opening a transaction
          // or after its confirmed phase abort. The next attempt queues afresh.
        } finally {
          retired = true;
        }
      }
    } finally {
      closed = true;
      clearTimeout(timer);
      signal?.removeEventListener('abort', abort);
      controller.abort();
    }
  };
  const readPerformanceState = ({ signal } = {}) =>
    access
      ? runOptionalStorage((signal) => access.readOptional({ signal }), { signal }).then(
          acceptedState,
        )
      : bounded(readState);
  const commitPerformance = (events, { signal } = {}) =>
    access
      ? runOptionalStorage((signal) => commitState(events, { signal }), { signal, write: true })
      : new Promise((resolve, reject) => {
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
      readState: readPerformanceState,
      commitState: commitPerformance,
    },
    getProfile: snapshot,
    flushProfile: () =>
      access && durable && !pending.length && !saving ? Promise.resolve(true) : flush(),
    acceptBinding: acceptPerformanceBinding,
    scheduleChunk: schedulePerformanceChunk,
    ...(ownedPerformanceStates
      ? {
          consumeOwnedState(state) {
            const receipt = ownedPerformanceStates.get(state);
            ownedPerformanceStates.delete(state);
            return receipt;
          },
        }
      : {}),
    canWrite,
  });
  const serializeBackup = (evidence) => {
    const hasStars = JOURNEY_MODES.some((mode) => Object.keys(stars.best[mode]).length);
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
  };
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
      return serializeBackup(performance.backup());
    },
    async exportAsync({ signal } = {}) {
      signal?.throwIfAborted();
      checkProgress();
      if (!canRunPerformanceWork())
        throw new Error('Journey progress remains pending until gameplay is paused.');
      let evidence,
        partial = false;
      try {
        evidence = await performance.backupAsync({ signal });
      } catch (error) {
        signal?.throwIfAborted();
        checkProgress();
        if (!canRunPerformanceWork())
          throw new Error('Journey progress remains pending until gameplay is paused.');
        if (!(error instanceof JourneyBackupEvidenceUnavailable)) throw error;
        // Storage failure must not remove the existing session-recovery action.
        // Keep all currently available evidence, but never label it complete.
        evidence = performance.backup();
        partial = true;
      }
      signal?.throwIfAborted();
      checkProgress();
      if (!canRunPerformanceWork())
        throw new Error('Journey progress remains pending until gameplay is paused.');
      return { raw: serializeBackup(evidence), partial };
    },
  };
}
