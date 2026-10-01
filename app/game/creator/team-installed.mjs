import { boundedJSON, canonicalJSON, dataIdentity, exactKeys, required } from '../data-json.mjs';
import { COOP_PACK_MAX_BYTES } from '../coop/recipes.mjs';
import { createManagedMediaStore, MANAGED_MEDIA_LIMITS } from '../managed-media-store.mjs';
import { creatorAbort, creatorSHA256 } from './bytes.mjs';
import {
  createCreatorTeamAttempt,
  CREATOR_TEAM_PORTABLE_FORMAT,
  CREATOR_TEAM_PORTABLE_MIME,
  exportCreatorTeamCampaign,
  importCreatorTeamCampaign,
  validateCreatorTeamCampaign,
} from './team.mjs';
import { t } from '../i18n/index.mjs';
import {
  CREATOR_TEAM_MEDIA_LIMITS,
  CREATOR_TEAM_MEDIA_MIME,
  exportCreatorTeamMediaCampaign,
  importCreatorTeamMediaCampaign,
  isPreparedCreatorTeamMediaCampaign,
  creatorTeamMediaForLevel,
} from './team-media.mjs';
import { createCoop, startCoop, stepCoop } from '../coop/core.mjs';
import {
  applyGameplayTuning,
  resolveGameplayTuning,
  validateGameplayTuning,
} from '../gameplay-tuning.mjs';

export const CREATOR_TEAM_DATABASE = 'revealline-creator-team-v1';
export const CREATOR_TEAM_EDITION_FORMAT = 'revealline-installed-team-edition.v1';
export const CREATOR_TEAM_PROGRESS_FORMAT = 'revealline-installed-team-progress.v1';
export const CREATOR_TEAM_ATTEMPT_FORMAT = 'revealline-installed-team-attempt.v1';
const DATABASE_VERSION = 1;
const STORES = Object.freeze(['editions', 'progress', 'metadata']);
const STATE_KEY = 'state';
const STATE_FORMAT = 'revealline-installed-team-state.v1';
const MAX_EDITIONS = 128;
const difficulties = new Set(['gentle', 'standard', 'expert']);
const presets = new Set(['full', 'joint']);
const editionPattern = /^[a-f0-9]{64}$/;
const MAX_ATTEMPT_TICKS = 240000;
const MAX_ATTEMPT_SEGMENTS = 8192;
const MANAGED_USAGE_OWNER = 'creator-team';
const text = (value, maximum = 160) =>
  typeof value === 'string' && value.length > 0 && value.length <= maximum;

const cancelled = () => new DOMException(t('errors:creator.teamLibraryCancelled'), 'AbortError');
const requestResult = (request) =>
  new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () =>
      reject(request.error || new Error(t('errors:creator.teamLibraryRequestFailed')));
  });

function validateState(source) {
  if (source === undefined) return { format: STATE_FORMAT, generation: 0 };
  const state = boundedJSON(source, {
    maxBytes: 1024,
    maxNodes: 8,
    maxDepth: 2,
  });
  exactKeys(state, ['format', 'generation'], t('interface:creator.label.installedTeamState'));
  required(
    state.format === STATE_FORMAT &&
      Number.isSafeInteger(state.generation) &&
      state.generation >= 0,
    t('errors:creator.installedTeamStateDamaged'),
  );
  return state;
}

function emptyProgress(editionId) {
  return {
    format: CREATOR_TEAM_PROGRESS_FORMAT,
    editionId,
    generation: 0,
    clears: {},
    attempts: {},
  };
}

function validateCommand(source) {
  exactKeys(
    source,
    ['direction', 'boost', 'support', ...(Object.hasOwn(source, 'steer') ? ['steer'] : [])],
    'installed Team command',
  );
  required(
    (source.direction === null || ['up', 'down', 'left', 'right'].includes(source.direction)) &&
      typeof source.boost === 'boolean' &&
      typeof source.support === 'boolean' &&
      (!Object.hasOwn(source, 'steer') || typeof source.steer === 'boolean'),
    'Installed Team command is damaged.',
  );
  return source;
}

function checkpoint(run) {
  const state = boundedJSON(JSON.stringify(run), {
    maxBytes: 2 * 1024 * 1024,
    maxNodes: 250000,
    maxDepth: 24,
    maxArray: 200000,
    maxString: 4096,
  });
  return { tick: run.tick, stateIdentity: dataIdentity(state) };
}

function validateReward(source) {
  if (source === undefined) return undefined;
  exactKeys(
    source,
    ['kind', 'sourceKind', 'sha256', 'bytes', 'mime', 'width', 'height'],
    'installed Team reward',
  );
  required(
    source.kind === 'picture' &&
      text(source.sourceKind, 80) &&
      editionPattern.test(source.sha256) &&
      Number.isSafeInteger(source.bytes) &&
      source.bytes > 0 &&
      source.bytes <= 16 * 1024 * 1024 &&
      ['image/png', 'image/jpeg', 'image/webp'].includes(source.mime) &&
      Number.isSafeInteger(source.width) &&
      source.width > 0 &&
      source.width <= 8192 &&
      Number.isSafeInteger(source.height) &&
      source.height > 0 &&
      source.height <= 8192,
    'Installed Team picture reward is damaged.',
  );
  return source;
}

export function validateInstalledTeamAttempt(source, editionId, levelId) {
  const attempt = boundedJSON(source, {
    maxBytes: 1024 * 1024,
    maxNodes: 100000,
    maxDepth: 10,
    maxArray: MAX_ATTEMPT_SEGMENTS,
    maxString: 160,
  });
  exactKeys(
    attempt,
    [
      'format',
      'editionId',
      'levelId',
      'attemptId',
      'gameplayId',
      'difficulty',
      'presetId',
      'tuning',
      'segments',
      'checkpoint',
    ],
    'installed Team attempt',
  );
  const tuning = validateGameplayTuning(attempt.tuning);
  required(
    attempt.format === CREATOR_TEAM_ATTEMPT_FORMAT &&
      attempt.editionId === editionId &&
      attempt.levelId === levelId &&
      text(attempt.attemptId, 160) &&
      text(attempt.gameplayId, 160) &&
      difficulties.has(attempt.difficulty) &&
      presets.has(attempt.presetId) &&
      tuning.difficulty === attempt.difficulty &&
      tuning.adminOverride === false &&
      Array.isArray(attempt.segments) &&
      attempt.segments.length <= MAX_ATTEMPT_SEGMENTS,
    'Installed Team attempt is damaged.',
  );
  let ticks = 0;
  for (const segment of attempt.segments) {
    exactKeys(segment, ['ticks', 'commands'], 'installed Team input segment');
    required(
      Number.isSafeInteger(segment.ticks) && segment.ticks > 0,
      'Installed Team input segment is damaged.',
    );
    required(
      Array.isArray(segment.commands) && segment.commands.length === 2,
      'Installed Team input segment needs both players.',
    );
    segment.commands.forEach(validateCommand);
    ticks += segment.ticks;
    required(ticks <= MAX_ATTEMPT_TICKS, 'Installed Team attempt is too long to recover.');
  }
  exactKeys(attempt.checkpoint, ['tick', 'stateIdentity'], 'installed Team checkpoint');
  required(
    attempt.checkpoint.tick === ticks &&
      typeof attempt.checkpoint.stateIdentity === 'string' &&
      /^[a-f0-9]{16}$/.test(attempt.checkpoint.stateIdentity),
    'Installed Team checkpoint is damaged.',
  );
  return attempt;
}

function replayAttempt(pack, source, editionId, levelId, { terminal = false } = {}) {
  const attempt = validateInstalledTeamAttempt(source, editionId, levelId);
  const configured = installedTeamConfiguration(
      pack,
      attempt.levelId,
      attempt.difficulty,
      attempt.presetId,
      attempt.tuning,
    ),
    run = configured.run;
  required(
    attempt.gameplayId === configured.gameplayId,
    'Saved Team attempt does not match the installed configuration.',
  );
  for (const segment of attempt.segments)
    for (let index = 0; index < segment.ticks; index++) {
      required(run.status === 'running', 'Saved Team inputs continue after the attempt ended.');
      stepCoop(run, segment.commands);
    }
  const actual = checkpoint(run);
  required(
    canonicalJSON(actual) === canonicalJSON(attempt.checkpoint),
    'Saved Team attempt failed exact replay verification.',
  );
  required(
    terminal ? run.status === 'won' : run.status === 'running',
    terminal
      ? 'Only an exactly replayed Team win can earn progress.'
      : 'Only an unfinished Team attempt can be recovered.',
  );
  return { attempt, run };
}

function installedTeamConfiguration(
  pack,
  levelId,
  difficulty,
  presetId,
  tuning = resolveGameplayTuning(difficulty),
) {
  const base = createCreatorTeamAttempt(pack, levelId, difficulty, presetId),
    checkedTuning = validateGameplayTuning(tuning),
    level = applyGameplayTuning(
      pack.levels.find((candidate) => candidate.id === levelId),
      checkedTuning,
    );
  required(
    checkedTuning.difficulty === difficulty && checkedTuning.adminOverride === false,
    'Installed Team progress requires the reviewed gameplay pressure preset.',
  );
  const run = startCoop(
    createCoop(level, {
      seed: base.seed,
      difficulty,
      ...base.config,
    }),
  );
  return {
    run,
    gameplayId: dataIdentity({ ruleset: run.ruleset, level }),
  };
}

export function createInstalledTeamAttempt(pack, levelId, difficulty, presetId, tuning) {
  return installedTeamConfiguration(pack, levelId, difficulty, presetId, tuning).run;
}

export function installedTeamGameplayId(pack, levelId, difficulty, presetId, tuning) {
  return installedTeamConfiguration(pack, levelId, difficulty, presetId, tuning).gameplayId;
}

export function createInstalledTeamAttemptSnapshot({
  editionId,
  attemptId,
  gameplayId,
  presetId,
  run,
  tuning = resolveGameplayTuning(run?.difficulty),
  segments,
}) {
  const source = {
    format: CREATOR_TEAM_ATTEMPT_FORMAT,
    editionId,
    levelId: run?.level?.id,
    attemptId,
    gameplayId,
    difficulty: run?.difficulty,
    presetId,
    tuning,
    segments: structuredClone(segments),
    checkpoint: checkpoint(run),
  };
  return validateInstalledTeamAttempt(source, editionId, source.levelId);
}

export function validateInstalledTeamProgress(source, editionId) {
  if (source === undefined) return emptyProgress(editionId);
  const progress = boundedJSON(source, {
    maxBytes: 2 * 1024 * 1024,
    maxNodes: 100000,
    maxDepth: 12,
    maxArray: MAX_ATTEMPT_SEGMENTS,
    maxString: 160,
  });
  exactKeys(
    progress,
    [
      'format',
      'editionId',
      'generation',
      'clears',
      ...(Object.hasOwn(progress, 'attempts') ? ['attempts'] : []),
    ],
    t('interface:creator.label.installedTeamProgress'),
  );
  required(
    progress.format === CREATOR_TEAM_PROGRESS_FORMAT &&
      progress.editionId === editionId &&
      Number.isSafeInteger(progress.generation) &&
      progress.generation >= 0 &&
      progress.clears &&
      typeof progress.clears === 'object' &&
      !Array.isArray(progress.clears),
    t('errors:creator.installedTeamProgressDamaged'),
  );
  progress.attempts ??= {};
  for (const [levelId, receipt] of Object.entries(progress.clears)) {
    required(text(levelId, 80), t('errors:creator.teamProgressInvalidLevel'));
    exactKeys(
      receipt,
      [
        'runId',
        'gameplayId',
        'difficulty',
        'presetId',
        ...(Object.hasOwn(receipt, 'reward') ? ['reward'] : []),
      ],
      t('interface:creator.label.installedTeamCompletion'),
    );
    required(
      text(receipt.runId, 160) &&
        text(receipt.gameplayId, 160) &&
        difficulties.has(receipt.difficulty) &&
        presets.has(receipt.presetId),
      t('errors:creator.teamReceiptDamaged'),
    );
    validateReward(receipt.reward);
  }
  for (const [levelId, attempt] of Object.entries(progress.attempts)) {
    required(text(levelId, 80), 'Installed Team attempt has an invalid level identity.');
    validateInstalledTeamAttempt(attempt, editionId, levelId);
  }
  return progress;
}

async function inspectEdition(source, expectedId) {
  required(
    source && Object.getPrototypeOf(source) === Object.prototype,
    t('errors:creator.teamEditionDamaged'),
  );
  const media = Object.hasOwn(source, 'payload');
  exactKeys(
    source,
    media
      ? ['format', 'editionId', 'installedAt', 'bytes', 'gameplay', 'payload']
      : ['format', 'editionId', 'installedAt', 'bytes', 'portable'],
    t('interface:creator.label.installedTeamEdition'),
  );
  const row = source;
  required(
    row.format === CREATOR_TEAM_EDITION_FORMAT &&
      editionPattern.test(row.editionId) &&
      row.editionId === expectedId &&
      Number.isSafeInteger(row.installedAt) &&
      row.installedAt >= 0 &&
      Number.isSafeInteger(row.bytes) &&
      row.bytes > 0 &&
      row.bytes <= (media ? CREATOR_TEAM_MEDIA_LIMITS.bytes : COOP_PACK_MAX_BYTES) &&
      (media
        ? row.payload instanceof Blob && typeof row.gameplay === 'string'
        : typeof row.portable === 'string'),
    t('errors:creator.teamEditionDamaged'),
  );
  const exactPayload = media
      ? Blob.prototype.slice.call(row.payload, 0, row.payload.size, CREATOR_TEAM_MEDIA_MIME)
      : new Blob([row.portable], { type: CREATOR_TEAM_PORTABLE_MIME }),
    bytes = new Uint8Array(await exactPayload.arrayBuffer());
  required(bytes.byteLength === row.bytes, t('errors:creator.teamEditionByteCount'));
  required(
    (await creatorSHA256(bytes)) === row.editionId,
    t('errors:creator.teamEditionIntegrity'),
  );
  const gameplay = media ? row.gameplay : row.portable,
    document = boundedJSON(gameplay, {
      maxBytes: COOP_PACK_MAX_BYTES,
      maxNodes: 50000,
      maxDepth: 20,
      maxArray: 1024,
    });
  exactKeys(
    document,
    ['format', 'pack', 'provenance', 'evidence'],
    t('interface:creator.label.portableTeamCampaign'),
  );
  required(
    document.format === CREATOR_TEAM_PORTABLE_FORMAT,
    t('errors:creator.unsupportedInstalledTeamFormat'),
  );
  const validated = validateCreatorTeamCampaign(document.pack, document.provenance);
  return Object.freeze({
    editionId: row.editionId,
    installedAt: row.installedAt,
    bytes: row.bytes,
    portable: gameplay,
    hasMedia: media,
    ...(media ? { payload: exactPayload } : {}),
    pack: validated.pack,
    provenance: validated.provenance,
  });
}

/** Exact portable bytes and completion receipts share the Team IndexedDB
 * authority. A standard browser also journals those physical bytes in the
 * shared managed-media ledger; injected hosts can provide that manager.
 * Launch still runs the full importer and replay verifier before play. */
export function createInstalledTeamCampaignStore({
  indexedDB = globalThis.indexedDB,
  now = Date.now,
  decodeImage,
  inspectVideo,
  managedStore = typeof indexedDB?.deleteDatabase === 'function'
    ? createManagedMediaStore({
        indexedDB,
        now,
        richStillMedia: true,
        storyMedia: true,
        soundtrackCatalogue: true,
      })
    : null,
} = {}) {
  let opening = null,
    closed = false;
  function open(signal) {
    creatorAbort(signal);
    if (closed) return Promise.reject(new Error(t('errors:creator.teamLibraryClosed')));
    if (!indexedDB) return Promise.reject(new Error(t('errors:creator.teamStorageUnsupported')));
    if (opening) return opening;
    opening = new Promise((resolve, reject) => {
      const request = indexedDB.open(CREATOR_TEAM_DATABASE, DATABASE_VERSION);
      let failed = false;
      const fail = (error) => {
        failed = true;
        opening = null;
        reject(error || new Error(t('errors:creator.teamLibraryOpenFailed')));
      };
      request.onupgradeneeded = () => {
        try {
          for (const store of STORES)
            if (!request.result.objectStoreNames.contains(store))
              request.result.createObjectStore(store);
        } catch (error) {
          request.transaction?.abort();
          fail(error);
        }
      };
      request.onerror = () => fail(request.error);
      request.onblocked = () => fail(new Error(t('errors:creator.closeTabsForTeamStorage')));
      request.onsuccess = () => {
        const db = request.result;
        if (failed || closed || signal?.aborted) {
          db.close();
          fail(signal?.aborted ? cancelled() : new Error(t('errors:creator.teamLibraryClosed')));
          return;
        }
        db.onversionchange = () => {
          db.close();
          opening = null;
        };
        resolve(db);
      };
    });
    return opening;
  }
  async function transaction(names, mode, operation, signal) {
    creatorAbort(signal);
    const db = await open(signal);
    creatorAbort(signal);
    return new Promise((resolve, reject) => {
      const tx = db.transaction(names, mode);
      let value,
        failure,
        operationDone = false,
        transactionDone = false;
      const finish = () => {
        if (operationDone && transactionDone) resolve(value);
      };
      const abort = () => {
        failure = cancelled();
        try {
          tx.abort();
        } catch {}
      };
      signal?.addEventListener('abort', abort, { once: true });
      let result;
      try {
        // IndexedDB transactions may become inactive as soon as the current
        // task yields. Let the operation enqueue its first requests now.
        result = operation(tx);
      } catch (error) {
        failure = error;
        try {
          tx.abort();
        } catch {}
        return;
      }
      Promise.resolve(result)
        .then((result) => {
          value = result;
          operationDone = true;
          finish();
        })
        .catch((error) => {
          failure = error;
          operationDone = true;
          if (transactionDone) {
            reject(error);
            return;
          }
          try {
            tx.abort();
          } catch {}
        });
      tx.oncomplete = () => {
        signal?.removeEventListener('abort', abort);
        transactionDone = true;
        finish();
      };
      tx.onabort = tx.onerror = () => {
        signal?.removeEventListener('abort', abort);
        reject(failure || tx.error || new Error(t('errors:creator.teamTransactionFailed')));
      };
    });
  }
  async function updateProgress(editionId, mutate, signal) {
    const db = await open(signal);
    creatorAbort(signal);
    return new Promise((resolve, reject) => {
      const tx = db.transaction(['editions', 'progress'], 'readwrite'),
        editions = tx.objectStore('editions'),
        progressStore = tx.objectStore('progress'),
        editionRequest = editions.get(editionId),
        progressRequest = progressStore.get(editionId);
      let failure,
        ready = 0,
        result;
      const abort = () => {
        failure = cancelled();
        try {
          tx.abort();
        } catch {}
      };
      const stage = () => {
        if (++ready !== 2) return;
        try {
          result = mutate({
            edition: editionRequest.result,
            progress: progressRequest.result,
            put(progress) {
              progressStore.put(progress, editionId);
            },
          });
        } catch (error) {
          failure = error;
          try {
            tx.abort();
          } catch {}
        }
      };
      signal?.addEventListener('abort', abort, { once: true });
      editionRequest.onsuccess = stage;
      progressRequest.onsuccess = stage;
      tx.oncomplete = () => {
        signal?.removeEventListener('abort', abort);
        resolve(result);
      };
      tx.onabort = tx.onerror = () => {
        signal?.removeEventListener('abort', abort);
        reject(failure || tx.error || new Error('Team progress update failed.'));
      };
    });
  }
  async function installedUsage({ signal } = {}) {
    const snapshot = await transaction(
      ['editions'],
      'readonly',
      async (tx) => {
        const store = tx.objectStore('editions'),
          [keys, rows] = await Promise.all([
            requestResult(store.getAllKeys()),
            requestResult(store.getAll()),
          ]);
        return { keys, rows };
      },
      signal,
    );
    required(
      snapshot.keys.length === snapshot.rows.length && snapshot.rows.length <= MAX_EDITIONS,
      t('errors:creator.teamInventoryDamaged'),
    );
    const editions = [];
    for (let index = 0; index < snapshot.rows.length; index++) {
      const edition = await inspectEdition(snapshot.rows[index], snapshot.keys[index]);
      editions.push({ id: edition.editionId, bytes: edition.bytes });
      creatorAbort(signal);
    }
    const localBytes = editions.reduce((sum, edition) => sum + edition.bytes, 0);
    if (!managedStore)
      return Object.freeze({
        editions: Object.freeze(editions),
        bytes: localBytes,
        usedBytes: localBytes,
        reservedBytes: 0,
        limitBytes: CREATOR_TEAM_MEDIA_LIMITS.bytes,
        overBudget: localBytes > CREATOR_TEAM_MEDIA_LIMITS.bytes,
      });
    const reconciled = await managedStore.reconcileExternalUsage(MANAGED_USAGE_OWNER, editions, {
      signal,
    });
    const usage = await managedStore.usage({ signal });
    return Object.freeze({
      editions: Object.freeze(editions),
      bytes: reconciled.bytes,
      usedBytes: usage.usedBytes,
      reservedBytes: usage.reservedBytes,
      limitBytes: usage.limitBytes,
      overBudget: reconciled.overBudget,
    });
  }
  async function reviewInstall(prepared, { signal } = {}) {
    creatorAbort(signal);
    const portable = isPreparedCreatorTeamMediaCampaign(prepared)
        ? exportCreatorTeamMediaCampaign(prepared)
        : exportCreatorTeamCampaign(prepared),
      bytes = new Uint8Array(await portable.arrayBuffer()),
      editionId = await creatorSHA256(bytes),
      usage = await installedUsage({ signal }),
      alreadyInstalled = usage.editions.some((edition) => edition.id === editionId),
      stagingBytes = alreadyInstalled ? 0 : bytes.byteLength;
    return Object.freeze({
      editionId,
      packageBytes: bytes.byteLength,
      stagingBytes,
      usedBytes: usage.usedBytes,
      reservedBytes: usage.reservedBytes,
      limitBytes: usage.limitBytes,
      alreadyInstalled,
      enoughManagedSpace:
        !usage.overBudget &&
        usage.usedBytes + usage.reservedBytes + stagingBytes <= usage.limitBytes,
    });
  }
  async function install(prepared, { signal } = {}) {
    creatorAbort(signal);
    const media = isPreparedCreatorTeamMediaCampaign(prepared),
      portable = media
        ? exportCreatorTeamMediaCampaign(prepared)
        : exportCreatorTeamCampaign(prepared);
    const bytes = new Uint8Array(await portable.arrayBuffer());
    creatorAbort(signal);
    const editionId = await creatorSHA256(bytes);
    const portableText = media
        ? await exportCreatorTeamCampaign(prepared.gameplay).text()
        : new TextDecoder('utf-8', { fatal: true }).decode(bytes),
      exactPayload = media ? new Blob([bytes], { type: CREATOR_TEAM_MEDIA_MIME }) : null;
    const installedAt = now();
    required(
      Number.isSafeInteger(installedAt) && installedAt >= 0,
      t('errors:creator.teamClockInvalid'),
    );
    const row = {
      format: CREATOR_TEAM_EDITION_FORMAT,
      editionId,
      installedAt,
      bytes: bytes.byteLength,
      ...(media ? { gameplay: portableText, payload: exactPayload } : { portable: portableText }),
    };
    const usage = await installedUsage({ signal });
    const known = usage.editions.find((edition) => edition.id === editionId);
    if (known) required(known.bytes === row.bytes, t('errors:creator.teamEditionIdentityConflict'));
    else if (managedStore)
      await managedStore.claimExternalUsage({
        owner: MANAGED_USAGE_OWNER,
        id: editionId,
        bytes: row.bytes,
        signal,
      });
    else
      required(
        usage.bytes + row.bytes <= MANAGED_MEDIA_LIMITS.bytes,
        t('errors:creator.teamMediaBudgetExceeded'),
      );
    try {
      const db = await open(signal);
      creatorAbort(signal);
      const result = await new Promise((resolve, reject) => {
        const tx = db.transaction(STORES, 'readwrite'),
          editions = tx.objectStore('editions'),
          metadata = tx.objectStore('metadata'),
          existingRequest = editions.get(editionId),
          keysRequest = editions.getAllKeys(),
          rowsRequest = editions.getAll(),
          stateRequest = metadata.get(STATE_KEY);
        let failure,
          ready = 0,
          outcome;
        const abort = () => {
          failure = cancelled();
          try {
            tx.abort();
          } catch {}
        };
        const stage = () => {
          if (++ready !== 4) return;
          try {
            const existing = existingRequest.result;
            if (existing !== undefined) {
              outcome = { existing };
              return;
            }
            const keys = keysRequest.result;
            required(keys.length < MAX_EDITIONS, t('errors:creator.removeTeamCampaignFirst'));
            required(
              rowsRequest.result.reduce((sum, item) => sum + item.bytes, row.bytes) <=
                CREATOR_TEAM_MEDIA_LIMITS.bytes,
              t('errors:creator.teamMediaBudgetExceeded'),
            );
            const state = validateState(stateRequest.result);
            state.generation++;
            editions.put(row, editionId);
            metadata.put(state, STATE_KEY);
            outcome = { existing: null };
          } catch (error) {
            failure = error;
            try {
              tx.abort();
            } catch {}
          }
        };
        signal?.addEventListener('abort', abort, { once: true });
        existingRequest.onsuccess = stage;
        keysRequest.onsuccess = stage;
        rowsRequest.onsuccess = stage;
        stateRequest.onsuccess = stage;
        tx.oncomplete = () => {
          signal?.removeEventListener('abort', abort);
          resolve(outcome);
        };
        tx.onabort = tx.onerror = () => {
          signal?.removeEventListener('abort', abort);
          reject(failure || tx.error || new Error(t('errors:creator.teamInstallFailed')));
        };
      });
      creatorAbort(signal);
      if (result.existing) {
        const inspected = await inspectEdition(result.existing, editionId);
        required(inspected.bytes === row.bytes, t('errors:creator.teamEditionIdentityConflict'));
      }
      if (managedStore)
        await managedStore.finalizeExternalUsage({
          owner: MANAGED_USAGE_OWNER,
          id: editionId,
          bytes: row.bytes,
          signal,
        });
      return Object.freeze({ editionId, alreadyInstalled: Boolean(result.existing) });
    } catch (error) {
      if (managedStore)
        try {
          await installedUsage();
        } catch {
          /* The pending claim remains bounded and is reconciled on the next inventory/install. */
        }
      throw error;
    }
  }
  async function inventory({ signal } = {}) {
    const snapshot = await transaction(
      STORES,
      'readonly',
      async (tx) => {
        const editions = tx.objectStore('editions'),
          progress = tx.objectStore('progress'),
          metadata = tx.objectStore('metadata'),
          [keys, rows, progressRows, state] = await Promise.all([
            requestResult(editions.getAllKeys()),
            requestResult(editions.getAll()),
            requestResult(progress.getAll()),
            requestResult(metadata.get(STATE_KEY)),
          ]);
        return { keys, rows, progressRows, state };
      },
      signal,
    );
    creatorAbort(signal);
    required(
      snapshot.keys.length === snapshot.rows.length && snapshot.rows.length <= MAX_EDITIONS,
      t('errors:creator.teamInventoryDamaged'),
    );
    const byEdition = new Map(
      snapshot.progressRows.map((row) => {
        const editionId = row?.editionId;
        required(editionPattern.test(editionId), t('errors:creator.teamProgressMissingEdition'));
        return [editionId, validateInstalledTeamProgress(row, editionId)];
      }),
    );
    const editions = [];
    for (let index = 0; index < snapshot.rows.length; index++) {
      const edition = await inspectEdition(snapshot.rows[index], snapshot.keys[index]);
      creatorAbort(signal);
      editions.push(
        Object.freeze({
          ...edition,
          progress: Object.freeze(
            structuredClone(byEdition.get(edition.editionId) ?? emptyProgress(edition.editionId)),
          ),
        }),
      );
    }
    editions.sort(
      (a, b) => b.installedAt - a.installedAt || a.editionId.localeCompare(b.editionId),
    );
    const result = Object.freeze({
      generation: validateState(snapshot.state).generation,
      editions: Object.freeze(editions),
    });
    if (managedStore)
      await managedStore.reconcileExternalUsage(
        MANAGED_USAGE_OWNER,
        editions.map((edition) => ({ id: edition.editionId, bytes: edition.bytes })),
        { signal },
      );
    return result;
  }
  async function load(
    editionId,
    {
      signal,
      decodeImage: loadDecodeImage = decodeImage,
      inspectVideo: loadInspectVideo = inspectVideo,
    } = {},
  ) {
    required(editionPattern.test(editionId), t('errors:creator.chooseInstalledTeamEdition'));
    const source = await transaction(
      ['editions'],
      'readonly',
      (tx) => requestResult(tx.objectStore('editions').get(editionId)),
      signal,
    );
    required(source !== undefined, t('errors:creator.exactTeamEditionNotInstalled'));
    const inspected = await inspectEdition(source, editionId);
    creatorAbort(signal);
    const prepared = await importCreatorTeamCampaign(
        new Blob([inspected.portable], { type: CREATOR_TEAM_PORTABLE_MIME }),
        { signal },
      ),
      media = inspected.payload
        ? await importCreatorTeamMediaCampaign(inspected.payload, {
            signal,
            decodeImage: loadDecodeImage,
            inspectVideo: loadInspectVideo,
          })
        : null;
    required(
      canonicalJSON(prepared.pack) === canonicalJSON(inspected.pack),
      t('errors:creator.teamPackChanged'),
    );
    return Object.freeze({ editionId, prepared, media });
  }
  async function restoreAttempt(editionId, levelId, { signal } = {}) {
    required(
      editionPattern.test(editionId) && text(levelId, 80),
      'Choose a saved attempt from an installed Team edition.',
    );
    const snapshot = await transaction(
      ['editions', 'progress'],
      'readonly',
      async (tx) => {
        const [edition, progress] = await Promise.all([
          requestResult(tx.objectStore('editions').get(editionId)),
          requestResult(tx.objectStore('progress').get(editionId)),
        ]);
        return { edition, progress };
      },
      signal,
    );
    required(snapshot.edition !== undefined, 'This exact Team edition is not installed.');
    const edition = await inspectEdition(snapshot.edition, editionId),
      progress = validateInstalledTeamProgress(snapshot.progress, editionId),
      source = progress.attempts[levelId];
    required(source, 'This installed Team mission has no saved attempt.');
    creatorAbort(signal);
    const restored = replayAttempt(edition.pack, source, editionId, levelId);
    creatorAbort(signal);
    return Object.freeze({
      editionId,
      generation: progress.generation,
      snapshot: Object.freeze(structuredClone(restored.attempt)),
      run: restored.run,
    });
  }
  async function recordAttempt(source, { expectedGeneration, signal } = {}) {
    creatorAbort(signal);
    required(
      source && editionPattern.test(source.editionId) && text(source.levelId, 80),
      'Save an exact installed Team attempt.',
    );
    const editionSource = await transaction(
      ['editions'],
      'readonly',
      (tx) => requestResult(tx.objectStore('editions').get(source.editionId)),
      signal,
    );
    required(editionSource !== undefined, 'This exact Team edition is no longer installed.');
    const edition = await inspectEdition(editionSource, source.editionId),
      replayed = replayAttempt(edition.pack, source, source.editionId, source.levelId);
    creatorAbort(signal);
    return updateProgress(
      source.editionId,
      ({ edition: currentEdition, progress: currentProgress, put }) => {
        required(
          (currentEdition?.gameplay ?? currentEdition?.portable) === edition.portable,
          'The installed Team edition changed while its attempt was saving.',
        );
        const progress = validateInstalledTeamProgress(currentProgress, source.editionId);
        if (expectedGeneration !== undefined)
          required(
            progress.generation === expectedGeneration,
            'Installed Team progress changed in another tab. Reopen the mission library.',
          );
        const previous = progress.attempts[source.levelId];
        if (previous && canonicalJSON(previous) === canonicalJSON(replayed.attempt))
          return structuredClone(progress);
        progress.attempts[source.levelId] = replayed.attempt;
        progress.generation++;
        put(progress);
        return structuredClone(progress);
      },
      signal,
    );
  }
  async function clearAttempt(
    { editionId, levelId, attemptId, expectedGeneration },
    { signal } = {},
  ) {
    required(
      editionPattern.test(editionId) && text(levelId, 80) && text(attemptId, 160),
      'Clear an exact installed Team attempt.',
    );
    return updateProgress(
      editionId,
      ({ edition, progress: current, put }) => {
        required(edition !== undefined, 'This exact Team edition is no longer installed.');
        const progress = validateInstalledTeamProgress(current, editionId),
          previous = progress.attempts[levelId];
        if (!previous) return structuredClone(progress);
        required(
          previous.attemptId === attemptId,
          'A newer installed Team attempt replaced this checkpoint.',
        );
        if (expectedGeneration !== undefined)
          required(
            progress.generation === expectedGeneration,
            'Installed Team progress changed in another tab. Reopen the mission library.',
          );
        delete progress.attempts[levelId];
        progress.generation++;
        put(progress);
        return structuredClone(progress);
      },
      signal,
    );
  }
  async function recordCompletion(
    {
      editionId,
      levelId,
      runId,
      gameplayId,
      difficulty,
      presetId,
      attempt,
      reward,
      expectedGeneration,
    },
    { signal } = {},
  ) {
    required(
      editionPattern.test(editionId) &&
        text(levelId, 80) &&
        text(runId, 160) &&
        text(gameplayId, 160) &&
        difficulties.has(difficulty) &&
        presets.has(presetId),
      t('errors:creator.teamCompletionIdentityRequired'),
    );
    const installedSource = await transaction(
      ['editions'],
      'readonly',
      (tx) => requestResult(tx.objectStore('editions').get(editionId)),
      signal,
    );
    required(installedSource !== undefined, 'This exact Team edition is no longer installed.');
    const inspectedEdition = await inspectEdition(installedSource, editionId);
    if (inspectedEdition.payload) {
      const media = await importCreatorTeamMediaCampaign(inspectedEdition.payload, {
          signal,
          decodeImage,
          inspectVideo,
        }),
        expected = creatorTeamMediaForLevel(media, levelId).picture.descriptor,
        supplied = validateReward(reward);
      required(
        supplied &&
          supplied.sha256 === expected.sha256 &&
          supplied.bytes === expected.bytes &&
          supplied.mime === expected.mime &&
          supplied.width === expected.width &&
          supplied.height === expected.height,
        'Team completion reward differs from this exact media edition.',
      );
    }
    const db = await open(signal);
    creatorAbort(signal);
    return new Promise((resolve, reject) => {
      const tx = db.transaction(['editions', 'progress'], 'readwrite'),
        editions = tx.objectStore('editions'),
        progressStore = tx.objectStore('progress'),
        editionRequest = editions.get(editionId),
        progressRequest = progressStore.get(editionId);
      let failure,
        ready = 0,
        result;
      const abort = () => {
        failure = cancelled();
        try {
          tx.abort();
        } catch {}
      };
      const stage = () => {
        if (++ready !== 2) return;
        try {
          required(
            editionRequest.result !== undefined,
            t('errors:creator.teamEditionNoLongerInstalled'),
          );
          const document = boundedJSON(
            editionRequest.result.gameplay ?? editionRequest.result.portable,
            {
              maxBytes: COOP_PACK_MAX_BYTES,
              maxNodes: 50000,
              maxDepth: 20,
              maxArray: 1024,
            },
          );
          const validated = validateCreatorTeamCampaign(document.pack, document.provenance);
          required(
            validated.pack.levels.some((level) => level.id === levelId),
            t('errors:creator.levelNotInTeamEdition'),
          );
          const progress = validateInstalledTeamProgress(progressRequest.result, editionId),
            previous = progress.clears[levelId],
            picture = validateReward(reward),
            receipt = {
              runId,
              gameplayId,
              difficulty,
              presetId,
              ...(picture ? { reward: picture } : {}),
            };
          if (previous?.runId === runId) {
            required(
              canonicalJSON(previous) === canonicalJSON(receipt),
              t('errors:creator.teamRunIdentityChanged'),
            );
            result = structuredClone(progress);
            return;
          }
          if (expectedGeneration !== undefined)
            required(
              progress.generation === expectedGeneration,
              'Installed Team progress changed in another tab. Reopen the mission library.',
            );
          const replayed = replayAttempt(validated.pack, attempt, editionId, levelId, {
            terminal: true,
          });
          required(
            replayed.attempt.attemptId === runId &&
              replayed.attempt.gameplayId === gameplayId &&
              replayed.attempt.difficulty === difficulty &&
              replayed.attempt.presetId === presetId,
            'Team completion differs from its exact replayed attempt.',
          );
          progress.clears[levelId] = receipt;
          delete progress.attempts[levelId];
          progress.generation++;
          progressStore.put(progress, editionId);
          result = structuredClone(progress);
        } catch (error) {
          failure = error;
          try {
            tx.abort();
          } catch {}
        }
      };
      signal?.addEventListener('abort', abort, { once: true });
      editionRequest.onsuccess = stage;
      progressRequest.onsuccess = stage;
      tx.oncomplete = () => {
        signal?.removeEventListener('abort', abort);
        resolve(result);
      };
      tx.onabort = tx.onerror = () => {
        signal?.removeEventListener('abort', abort);
        reject(failure || tx.error || new Error(t('errors:creator.teamCompletionSaveFailed')));
      };
    });
  }
  return Object.freeze({
    reviewInstall,
    install,
    inventory,
    load,
    restoreAttempt,
    recordAttempt,
    clearAttempt,
    recordCompletion,
    close() {
      closed = true;
      managedStore?.close?.();
      void opening?.then(
        (db) => db.close(),
        () => {},
      );
      opening = null;
    },
  });
}
