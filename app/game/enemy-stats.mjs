import { boundedJSON, dataIdentity, exactKeys, required } from './data-json.mjs';
import { createProfileRecordBackend } from './profile-storage.mjs';

export const ENEMY_STATS_FORMAT = 'revealline-enemy-stats.v1';
export const ENEMY_STATS_BACKUP_FORMAT = 'revealline-enemy-stats-backup.v1';
export const ENEMY_STATS_SESSION_FORMAT = 'revealline-enemy-stats-session.v1';
export const ENEMY_STATS_KEY = 'revealline-mmm-enemy-stats.v1';
export const ENEMY_STATS_MAX_BYTES = 4 * 1024 * 1024;
export const ENEMY_STATS_LIMITS = Object.freeze({ lineages: 2048, buckets: 256, cursors: 64 });
export function canonicalEnemyFamily(family) {
  return (
    {
      still: 'lookout',
      humanoid: 'lookout',
      patrol: 'patroller',
      refuge: 'refuge-seeker',
      pair: 'rendezvous-pair',
      shield: 'shield-bearer',
      brace: 'brace-trooper',
      warden: 'relay-warden',
      sentry: 'guard',
      lane: 'lane-boss',
      'lane-attacker': 'lane-boss',
      relay: 'relay-sentinel',
      perimeter: 'border-patrol',
      contour: 'contour-patrol',
      rover: 'claimed-rover',
      ricochet: 'bouncer',
      'signal-jammer': 'jammer',
    }[family] ?? family
  );
}
const WRITER_KEY = `${ENEMY_STATS_KEY}:writer`;
// Hosts and the aggregate backup dialog can keep separate services open in the
// same document. Drain their optimistic writes before merging a portable copy.
const coordinators = new WeakMap();
function coordinatorFor(database, storage) {
  const key = database && typeof database === 'object' ? database : storage;
  if (!key || !['object', 'function'].includes(typeof key))
    return { members: new Set(), imports: Promise.resolve() };
  if (!coordinators.has(key))
    coordinators.set(key, { members: new Set(), imports: Promise.resolve() });
  return coordinators.get(key);
}
const id = (v) =>
  typeof v === 'string' &&
  /^[a-zA-Z0-9][a-zA-Z0-9_-]{0,127}$/.test(v) &&
  !['constructor', 'prototype', '__proto__'].includes(v);
const integer = (v) => Number.isSafeInteger(v) && v >= 0;
const map = (v) => v && typeof v === 'object' && !Array.isArray(v);
const own = (v, k) => Object.hasOwn(v, k);
const uid = () => globalThis.crypto.randomUUID();
export const emptyEnemyStats = () => ({ format: ENEMY_STATS_FORMAT, lineages: {}, cursors: {} });

function counts(value, { buckets = false } = {}) {
  required(
    map(value) && Object.keys(value).length <= ENEMY_STATS_LIMITS.buckets,
    'Invalid enemy count table.',
  );
  for (const [key, n] of Object.entries(value)) {
    const parts = buckets ? key.split('/') : [key];
    required(
      parts.length === (buckets ? 2 : 1) && parts.every(id) && integer(n),
      'Invalid enemy count.',
    );
  }
}
function cursor(value) {
  exactKeys(
    value,
    ['gameType', 'sequences', 'counts', 'boardCounts', 'updated'],
    'Enemy attempt cursor',
  );
  required(
    id(value.gameType) &&
      integer(value.updated) &&
      map(value.sequences) &&
      Object.keys(value.sequences).length <= 8,
    'Invalid enemy attempt cursor.',
  );
  for (const [board, sequence] of Object.entries(value.sequences))
    required(id(board) && integer(sequence), 'Invalid enemy board sequence.');
  counts(value.counts);
  required(
    map(value.boardCounts) && Object.keys(value.boardCounts).length <= 8,
    'Invalid enemy board totals.',
  );
  const total = {};
  for (const [board, row] of Object.entries(value.boardCounts)) {
    required(id(board), 'Invalid enemy board.');
    counts(row);
    for (const [family, n] of Object.entries(row)) add(total, family, n);
  }
  required(
    Object.keys(total).length === Object.keys(value.counts).length &&
      Object.keys(total).every((family) => total[family] === value.counts[family]),
    'Enemy board totals differ.',
  );
}
export function validateEnemyStats(source) {
  const value = boundedJSON(source, {
    maxBytes: ENEMY_STATS_MAX_BYTES,
    maxNodes: 250000,
    maxDepth: 6,
    maxString: 256,
  });
  exactKeys(value, ['format', 'lineages', 'cursors'], 'Enemy statistics');
  required(
    value.format === ENEMY_STATS_FORMAT && map(value.lineages) && map(value.cursors),
    'Unsupported enemy statistics.',
  );
  required(
    Object.keys(value.lineages).length <= ENEMY_STATS_LIMITS.lineages &&
      Object.keys(value.cursors).length <= ENEMY_STATS_LIMITS.cursors,
    'Enemy statistics capacity reached.',
  );
  for (const [lineage, row] of Object.entries(value.lineages)) {
    required(id(lineage), 'Invalid enemy statistics writer.');
    counts(row, { buckets: true });
  }
  for (const [attempt, row] of Object.entries(value.cursors)) {
    required(id(attempt), 'Invalid enemy statistics attempt.');
    cursor(row);
  }
  return value;
}

/** Backup counters are grow-only components. A repeated or older snapshot must
 * never be added to a lifetime total, and attempt cursors are local-only. */
export function inspectEnemyStatsBackup(source) {
  const value = boundedJSON(source, {
    maxBytes: ENEMY_STATS_MAX_BYTES,
    maxNodes: 250000,
    maxDepth: 6,
    maxString: 256,
  });
  exactKeys(value, ['format', 'statistics'], 'Enemy statistics backup');
  required(value.format === ENEMY_STATS_BACKUP_FORMAT, 'Unsupported enemy statistics backup.');
  value.statistics = validateEnemyStats(value.statistics);
  required(
    Object.keys(value.statistics.cursors).length === 0,
    'Portable enemy statistics cannot resume a live attempt.',
  );
  return value;
}
export function mergeEnemyStats(left, right) {
  const base = validateEnemyStats(left),
    incoming = validateEnemyStats(right);
  for (const [lineage, row] of Object.entries(incoming.lineages)) {
    base.lineages[lineage] ??= {};
    for (const [bucket, n] of Object.entries(row))
      base.lineages[lineage][bucket] = Math.max(base.lineages[lineage][bucket] ?? 0, n);
  }
  return validateEnemyStats(base);
}
export function validateEnemyStatsSession(source) {
  const value = boundedJSON(source, {
    maxBytes: 32768,
    maxNodes: 2048,
    maxDepth: 4,
    maxString: 256,
  });
  exactKeys(
    value,
    ['format', 'attemptId', 'gameType', 'sequences', 'counts', 'boardCounts'],
    'Enemy statistics session',
  );
  required(
    value.format === ENEMY_STATS_SESSION_FORMAT && id(value.attemptId),
    'Unsupported enemy statistics session.',
  );
  cursor({
    gameType: value.gameType,
    sequences: value.sequences,
    counts: value.counts,
    boardCounts: value.boardCounts,
    updated: 0,
  });
  return value;
}
/** A locally played branch retains its visible run totals and replay boundary,
 * but cannot share receipt identity with another tab's continued simulation.
 * This pure helper neither awards counters nor retires an existing token. */
export function forkEnemyStatsSession(source, { randomId = uid } = {}) {
  const fork = validateEnemyStatsSession(source);
  fork.attemptId = randomId();
  return validateEnemyStatsSession(fork);
}

function add(table, key, n = 1) {
  const next = (table[key] ?? 0) + n;
  required(integer(next), 'Enemy count exceeded its safe integer bound.');
  table[key] = next;
}
function applyObservation(source, event) {
  const next = structuredClone(source);
  const previous = next.cursors[event.attemptId];
  required(
    !previous || previous.gameType === event.gameType,
    'Enemy attempt belongs to another game.',
  );
  const row = previous ?? {
    gameType: event.gameType,
    sequences: { ...event.baseline.sequences },
    counts: { ...event.baseline.counts },
    boardCounts: structuredClone(event.baseline.boardCounts),
    updated: event.updated,
  };
  if (event.sequence <= (row.sequences[event.board] ?? -1)) return next;
  row.sequences[event.board] = event.sequence;
  row.updated = event.updated;
  const priorCounts = row.boardCounts[event.board] ?? {};
  for (const [family, n] of Object.entries(event.cumulative)) {
    const delta = Math.max(0, n - (priorCounts[family] ?? 0));
    if (!delta) continue;
    add((next.lineages[event.lineage] ??= {}), `${event.gameType}/${family}`, delta);
    add(row.counts, family, delta);
  }
  row.boardCounts[event.board] = structuredClone(event.cumulative);
  next.cursors[event.attemptId] = row;
  const ordered = Object.keys(next.cursors)
    .filter((key) => key !== event.attemptId)
    .sort((a, b) => next.cursors[a].updated - next.cursors[b].updated || a.localeCompare(b));
  while (Object.keys(next.cursors).length > ENEMY_STATS_LIMITS.cursors)
    delete next.cursors[ordered.shift()];
  return validateEnemyStats(next);
}
function storageDefault() {
  try {
    return globalThis.localStorage;
  } catch {
    return null;
  }
}
function databaseDefault() {
  try {
    return globalThis.indexedDB;
  } catch {
    return null;
  }
}

/** Live simulation calls only. Imported proofs/recordings cannot mint totals.
 * The caller supplies the entire defeat batch for one monotonic board tick.
 * Local Continue carries only a cursor; previous simulation is never counted. */
export function createEnemyStats({
  indexedDB = databaseDefault(),
  storage = storageDefault(),
  canWrite = () => true,
  onWarning = () => {},
  randomId = uid,
} = {}) {
  const ownsWrites = () => {
    try {
      return canWrite();
    } catch {
      return false;
    }
  };
  let lineage,
    sessionLineage = null;
  try {
    lineage = storage?.getItem(WRITER_KEY);
  } catch {
    /* Session writer below. */
  }
  if (!id(lineage)) {
    lineage = randomId();
    try {
      if (ownsWrites()) storage?.setItem(WRITER_KEY, lineage);
    } catch {
      /* Counters still use IndexedDB. */
    }
  }
  required(id(lineage), 'A unique statistics writer is required.');
  const backend = createProfileRecordBackend({
    key: ENEMY_STATS_KEY,
    empty: emptyEnemyStats,
    validate: validateEnemyStats,
    indexedDB,
    canWrite,
  });
  const attempts = new WeakMap(),
    listeners = new Set(),
    coordinator = coordinatorFor(indexedDB, storage);
  let state = emptyEnemyStats(),
    pending = new Map(),
    queue = Promise.resolve(),
    closed = false,
    memoryOnly = false,
    durable = true;
  const notify = (kind = 'refresh') => {
    for (const fn of listeners) fn({ kind });
  };
  const warning = (error) => {
    if (closed) return;
    durable = false;
    onWarning(error);
    notify();
  };
  const enqueue = (fn) => {
    const result = queue.then(fn);
    queue = result.catch(() => {});
    return result;
  };
  const flushNow = async () => {
    // A host can close between accepting a live event and this queued write.
    // Disposal retires that work without rejecting detached host callbacks.
    if (closed || memoryOnly) return state;
    if (!pending.size) return state;
    const batch = new Map(pending);
    try {
      const saved = await backend.update((base) =>
        [...batch.values()].reduce(applyObservation, base),
      );
      if (closed || memoryOnly) return state;
      for (const [key, event] of batch) if (pending.get(key) === event) pending.delete(key);
      state = [...pending.values()].reduce(applyObservation, saved);
      durable = true;
      notify();
    } catch (error) {
      warning(error);
    }
    return state;
  };
  const member = {
    async drain() {
      if (closed) return;
      required(!memoryOnly, 'Export session-only statistics and reload before importing.');
      await flushNow();
      required(!pending.size, 'Save pending enemy statistics before importing.');
    },
    rotate(writer) {
      lineage = writer;
    },
    adopt(snapshot) {
      if (closed) return;
      state = [...pending.values()].reduce(applyObservation, snapshot);
      durable = !pending.size;
      notify();
    },
  };
  coordinator.members.add(member);
  function tokenState(attempt) {
    const token = attempts.get(attempt);
    required(token, 'This statistics service does not own that attempt.');
    return token;
  }
  function session(attempt) {
    const token = tokenState(attempt),
      row = state.cursors[token.attemptId] ?? token.baseline;
    return {
      format: ENEMY_STATS_SESSION_FORMAT,
      attemptId: token.attemptId,
      gameType: token.gameType,
      sequences: { ...row.sequences },
      counts: { ...row.counts },
      boardCounts: structuredClone(row.boardCounts),
    };
  }
  return {
    read: () =>
      enqueue(async () => {
        if (closed || memoryOnly) return structuredClone(state);
        try {
          const saved = await backend.read();
          if (closed) return structuredClone(state);
          state = [...pending.values()].reduce(applyObservation, saved);
          durable = !pending.size;
          notify();
        } catch (error) {
          warning(error);
        }
        if (pending.size) await flushNow();
        return structuredClone(state);
      }),
    beginAttempt({ gameType, provenance = 'live', saved = null } = {}) {
      required(
        id(gameType) &&
          ['live', 'continue', 'import', 'replay', 'demo', 'preview'].includes(provenance),
        'Invalid statistics attempt.',
      );
      const restored = saved === null ? null : validateEnemyStatsSession(saved);
      required(
        !restored || restored.gameType === gameType,
        'Saved statistics belong to another game.',
      );
      const reuse = provenance === 'continue' && restored;
      const token = {
        attemptId: reuse ? restored.attemptId : randomId(),
        gameType,
        baseline: reuse ? restored : { sequences: {}, counts: {}, boardCounts: {} },
        active: ['live', 'continue'].includes(provenance),
      };
      required(id(token.attemptId), 'A unique statistics attempt is required.');
      const attempt = Object.freeze({ id: token.attemptId, gameType });
      attempts.set(attempt, token);
      return attempt;
    },
    observe(attempt, { board = '0', sequence, defeats = [] } = {}) {
      const token = tokenState(attempt);
      if (!token.active || closed) return Promise.resolve(false);
      // Another host/controller can restore a backup while this attempt is
      // paused. Same-document localStorage writes do not emit a storage event;
      // sample the current writer at the next real gameplay contribution.
      if (!ownsWrites()) {
        sessionLineage ??= randomId();
        required(id(sessionLineage), 'A unique session statistics writer is required.');
      } else {
        try {
          const latest = storage?.getItem(WRITER_KEY);
          if (id(latest)) lineage = latest;
        } catch {
          /* A private session retains its independently generated writer. */
        }
      }
      required(
        id(String(board)) && integer(sequence) && Array.isArray(defeats) && defeats.length <= 256,
        'Invalid live enemy batch.',
      );
      if (!defeats.length) return Promise.resolve(false);
      const ownedDefeats = defeats.map((event) => {
        exactKeys(
          event,
          ['family', ...(own(event, 'playerId') ? ['playerId'] : [])],
          'Enemy defeat',
        );
        required(
          id(event.family) &&
            (event.playerId === undefined ||
              event.playerId === null ||
              integer(event.playerId) ||
              id(event.playerId)),
          'Invalid enemy identity.',
        );
        return { family: canonicalEnemyFamily(event.family) };
      });
      const current = state.cursors[token.attemptId] ?? token.baseline;
      if (sequence <= (current.sequences[String(board)] ?? -1)) return Promise.resolve(false);
      const cumulative = { ...current.boardCounts[String(board)] };
      for (const { family } of ownedDefeats) add(cumulative, family);
      const event = {
        attemptId: token.attemptId,
        gameType: token.gameType,
        baseline: structuredClone(token.baseline),
        lineage: ownsWrites() ? lineage : sessionLineage,
        board: String(board),
        sequence,
        cumulative,
        updated: Date.now(),
      };
      state = applyObservation(state, event);
      if (memoryOnly) {
        notify('defeat');
        return Promise.resolve(true);
      }
      // Coalesce only consecutive contributions from this board's same writer.
      // A saving-lease transition must retain the old component: its optimistic
      // snapshot may already have been exported from the session-only window.
      const previous = [...pending.entries()]
        .reverse()
        .find(([, row]) => row.attemptId === token.attemptId && row.board === String(board));
      const key =
        previous?.[1].lineage === event.lineage
          ? previous[0]
          : `${token.attemptId}/${String(board)}/${sequence}`;
      pending.set(key, event);
      // Failed storage must not accumulate an unbounded per-attempt journal.
      // Keep the complete visible/exportable snapshot; a fresh page can import
      // that snapshot when storage recovers instead of losing these totals.
      if (pending.size > ENEMY_STATS_LIMITS.cursors * 8) {
        pending.clear();
        memoryOnly = true;
        warning(new Error('Enemy statistics are session-only. Export a backup before reloading.'));
        notify('defeat');
        return Promise.resolve(true);
      }
      notify('defeat');
      return enqueue(async () => {
        await flushNow();
        return true;
      });
    },
    session,
    finishAttempt(attempt) {
      tokenState(attempt).active = false;
      return session(attempt);
    },
    totals({ gameType = null, attempt = null } = {}) {
      const byFamily = {},
        byGame = {};
      let total = 0;
      for (const row of Object.values(state.lineages))
        for (const [bucket, n] of Object.entries(row)) {
          const [game, family] = bucket.split('/');
          if (gameType && game !== gameType) continue;
          add(byFamily, family, n);
          add(byGame, game, n);
          total += n;
        }
      const run = attempt ? session(attempt).counts : {};
      return {
        total,
        byFamily,
        byGame,
        run: { total: Object.values(run).reduce((sum, n) => sum + n, 0), byFamily: run },
        durable,
        countingSince: 'feature-introduction',
      };
    },
    subscribe(fn) {
      listeners.add(fn);
      return () => listeners.delete(fn);
    },
    snapshot: () => structuredClone(state),
    exportBackup: () => ({
      format: ENEMY_STATS_BACKUP_FORMAT,
      statistics: { ...structuredClone(state), cursors: {} },
    }),
    importBackup: (source) => {
      const incoming = inspectEnemyStatsBackup(source).statistics;
      const importing = coordinator.imports.then(() =>
        enqueue(async () => {
          try {
            required(!closed, 'Enemy statistics are closed.');
            // A backup can include an optimistic count from another paused host.
            // Persist its cursor first so that queued callbacks cannot add it again.
            // Call the drain directly: waiting on another service's import queue
            // would deadlock two simultaneous imports in the same document.
            for (const active of coordinator.members) {
              await active.drain();
              required(!closed, 'Enemy statistics are closed.');
            }
            required(ownsWrites(), 'This tab does not own the saving lease.');
            const writer = randomId();
            required(id(writer), 'A unique statistics writer is required.');
            for (const active of coordinator.members) active.rotate(writer);
            try {
              storage?.setItem(WRITER_KEY, writer);
            } catch {
              /* Same-document services still adopt the unique writer. */
            }
            const saved = await backend.update((base) => mergeEnemyStats(base, incoming));
            required(!closed, 'Enemy statistics are closed.');
            state = saved;
            for (const active of coordinator.members) active.adopt(state);
            return structuredClone(state);
          } catch (error) {
            warning(error);
            throw error;
          }
        }),
      );
      coordinator.imports = importing.catch(() => {});
      return importing;
    },
    flush: () => enqueue(flushNow),
    close() {
      closed = true;
      coordinator.members.delete(member);
      listeners.clear();
      backend.close();
    },
  };
}

/** Legacy hosts keep their existing session bytes. This bounded adjacent cursor
 * record binds their stable run identity to a genuine local Continue only. */
export function createEnemyStatsHost({
  gameType,
  stats: supplied = null,
  storage = storageDefault(),
  canWrite = () => true,
  ...options
} = {}) {
  required(id(gameType), 'An enemy statistics host needs a game identity.');
  const stats = supplied ?? createEnemyStats({ storage, canWrite, ...options });
  const key = `revealline-mmm-enemy-stats-session.v1:host:${gameType}`;
  let retained = {},
    attempt = null,
    identity = null,
    currentProvenance = null,
    readable = true;
  try {
    const raw = storage?.getItem(key);
    if (raw) {
      const rows = boundedJSON(raw, { maxBytes: 256 * 1024, maxNodes: 12000, maxDepth: 7 });
      required(map(rows) && Object.keys(rows).length <= 16, 'Too many saved enemy cursors.');
      for (const [name, row] of Object.entries(rows)) {
        required(id(name), 'Invalid saved enemy cursor identity.');
        retained[name] = validateEnemyStatsSession(row);
      }
    }
  } catch {
    retained = {};
    readable = false;
  }
  function save() {
    if (!attempt || !identity || !canWrite() || !readable) return;
    const rows = { ...retained };
    delete rows[identity];
    rows[identity] = stats.session(attempt);
    retained = Object.fromEntries(Object.entries(rows).slice(-16));
    try {
      storage?.setItem(key, JSON.stringify(retained));
    } catch {
      /* Stats service reports its own durability. */
    }
  }
  function begin(runIdentity, { provenance = 'live', saved = null } = {}) {
    required(
      typeof runIdentity === 'string' && runIdentity.length > 0 && runIdentity.length <= 4096,
      'A stable live run identity is required.',
    );
    const next = dataIdentity({ gameType, runIdentity });
    if (identity === next && attempt && provenance === currentProvenance) return attempt;
    if (attempt) {
      save();
      stats.finishAttempt(attempt);
    }
    identity = next;
    currentProvenance = provenance;
    const cursor = saved ?? (provenance === 'continue' ? (retained[next] ?? null) : null);
    attempt = stats.beginAttempt({ gameType, provenance, saved: cursor });
    save();
    return attempt;
  }
  return {
    stats,
    begin,
    getAttempt: () => attempt,
    observe(batch) {
      if (!attempt) return Promise.resolve(false);
      const result = stats.observe(attempt, batch);
      save();
      return result;
    },
    session: () => (attempt ? stats.session(attempt) : null),
    finish() {
      if (attempt) {
        save();
        stats.finishAttempt(attempt);
      }
    },
    close() {
      save();
      if (!supplied) stats.close();
    },
  };
}
