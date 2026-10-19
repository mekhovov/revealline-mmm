import { boundedJSON, dataIdentity, exactKeys, required } from '../data-json.mjs';
import { huntSummary } from './rules.mjs';
import { combatOwner, huntDefinition } from './running-enemy-definition.mjs';
export const HUNT_RECORDS_KEY = 'revealline-mmm.hunt-records.v1';
export const HUNT_RECORDS_FORMAT = 'HuntRecordsV1';
const MAX_RECORDS = 128;
const peers = new Set();
const runIdentities = new WeakMap();
function identityFor(run) {
  if (run.huntRecordIdentity) return run.huntRecordIdentity;
  if (!runIdentities.has(run))
    runIdentities.set(
      run,
      dataIdentity({
        ruleset: run.ruleset,
        level: run.level,
        seed: run.seed,
        turnPolicy: run.turnPolicy,
        classId: run.classId,
        classes: run.classRecipes ?? run.level.supportRoles ?? null,
      }),
    );
  return runIdentities.get(run);
}
const summary = (run) =>
  huntSummary(
    (run.level ? huntDefinition(run.level) : null) ?? run.level?.hunt,
    combatOwner(run)?.hunt ?? run.hunt,
  );

export function validateHuntRecords(source) {
  const value = boundedJSON(source, {
    maxBytes: 65536,
    maxNodes: 4096,
    maxDepth: 5,
    maxArray: MAX_RECORDS,
  });
  exactKeys(value, ['format', 'records'], 'Hunt records');
  required(
    value.format === HUNT_RECORDS_FORMAT &&
      Array.isArray(value.records) &&
      value.records.length <= MAX_RECORDS,
    'Unsupported Hunt records. Existing saved data is kept.',
  );
  const ids = new Set();
  for (const item of value.records) {
    exactKeys(item, ['key', 'score', 'time', 'all', 'contact', 'clean'], 'Hunt record');
    required(
      typeof item.key === 'string' &&
        /^(solo|versus|team)\/[a-f0-9]{16}$/.test(item.key) &&
        !ids.has(item.key) &&
        Number.isSafeInteger(item.score) &&
        item.score >= 0 &&
        item.score <= 2400 &&
        Number.isFinite(item.time) &&
        item.time >= 0 &&
        item.time <= Number.MAX_SAFE_INTEGER &&
        ['all', 'contact', 'clean'].every((key) => typeof item[key] === 'boolean'),
      'Invalid Hunt record. Existing saved data is kept.',
    );
    ids.add(item.key);
  }
  return value;
}
function merge(...groups) {
  const rows = new Map();
  for (const group of groups)
    for (const item of group) {
      const previous = rows.get(item.key);
      rows.set(item.key, {
        key: item.key,
        score: Math.max(previous?.score ?? 0, item.score),
        time: Math.min(previous?.time ?? Infinity, item.time),
        all: !!previous?.all || item.all,
        contact: !!previous?.contact || item.contact,
        clean: !!previous?.clean || item.clean,
      });
    }
  // Deterministic retention prevents competing tabs from reordering the same
  // bounded store forever. Full exports retain this same 128-entry contract.
  return [...rows.values()]
    .sort((a, b) => (a.key < b.key ? -1 : a.key > b.key ? 1 : 0))
    .slice(-MAX_RECORDS);
}
const encode = (records) => JSON.stringify({ format: HUNT_RECORDS_FORMAT, records });

/** Cosmetic personal bests. Each write rereads and merges; a future/corrupt
 * format is never overwritten, and failures keep exportable session results. */
export function createHuntRecords({
  getStorage = () => globalThis.localStorage,
  window: target = globalThis.window,
} = {}) {
  let records = [],
    durable = true,
    warning = '',
    closed = false,
    writing = false;
  const listeners = new Set(),
    handled = new WeakSet();
  const read = () => {
    const storage = getStorage();
    if (!storage) throw new Error('Hunt record storage is unavailable.');
    const raw = storage.getItem(HUNT_RECORDS_KEY);
    return { storage, raw, records: raw === null ? [] : validateHuntRecords(raw).records };
  };
  const snapshot = () =>
    Object.freeze({
      durable,
      warning,
      records: Object.freeze(records.map((item) => Object.freeze({ ...item }))),
    });
  const notify = () => {
    const state = snapshot();
    for (const listener of [...listeners])
      try {
        listener(state);
      } catch {
        /* A view cannot veto a record. */
      }
    return state;
  };
  const sync = () => {
    if (closed || writing) return;
    try {
      const saved = read();
      records = merge(records, saved.records);
      durable = encode(records) === encode(merge(saved.records));
      warning = durable ? '' : 'Some Hunt records are active only for this session.';
    } catch (error) {
      durable = false;
      warning = error.message;
    }
    notify();
  };
  const save = () => {
    if (closed) throw new Error('Hunt records are closed.');
    if (writing) return snapshot();
    writing = true;
    try {
      const current = read();
      records = merge(current.records, records);
      const raw = encode(records);
      current.storage.setItem(HUNT_RECORDS_KEY, raw);
      if (current.storage.getItem(HUNT_RECORDS_KEY) !== raw)
        throw new Error('Hunt records changed while saving. Retry saving to merge them.');
      durable = true;
      warning = '';
    } catch (error) {
      durable = false;
      warning = error.message;
    } finally {
      writing = false;
    }
    if (durable) for (const peer of peers) if (peer !== sync) peer();
    return notify();
  };
  const changed = (event) => {
    if (closed || event.key !== HUNT_RECORDS_KEY) return;
    try {
      const current = read();
      if (event.storageArea !== current.storage || event.newValue !== current.raw) return;
      const combined = merge(records, current.records),
        pending = encode(combined) !== encode(merge(current.records));
      records = combined;
      if (pending) save();
      else {
        durable = true;
        warning = '';
        notify();
      }
    } catch (error) {
      durable = false;
      warning = error.message;
      notify();
    }
  };
  sync();
  peers.add(sync);
  target?.addEventListener?.('storage', changed);
  const keyFor = (run, mode) => `${mode}/${identityFor(run)}`;
  return Object.freeze({
    snapshot,
    subscribe(listener) {
      if (closed || typeof listener !== 'function')
        throw new TypeError('Active Hunt record listener required.');
      listeners.add(listener);
      listener(snapshot());
      return () => listeners.delete(listener);
    },
    best(run, mode = 'solo') {
      return records.find((item) => item.key === keyFor(run, mode)) ?? null;
    },
    complete(run, mode = 'solo') {
      const stats = summary(run);
      if (!stats || run.status !== 'won' || handled.has(run)) return null;
      required(['solo', 'versus', 'team'].includes(mode), 'Choose a supported Hunt record mode.');
      handled.add(run);
      const key = keyFor(run, mode),
        damage =
          run.classic?.livesLost ??
          run.huntDowns ??
          run.metrics?.downs ??
          run.stats?.downs ??
          (run.runningEnemies ? Math.max(0, run.rules.lives - run.lives) : 0);
      const item = {
        key,
        score: stats.score,
        time: run.time,
        all: stats.remaining === 0,
        contact: stats.touchKills === stats.total,
        clean: damage === 0,
      };
      records = merge(records, [item]);
      save();
      return { ...(records.find((row) => row.key === key) ?? item), durable };
    },
    export() {
      sync();
      return { format: HUNT_RECORDS_FORMAT, records: structuredClone(records) };
    },
    import(source) {
      const checked = validateHuntRecords(source);
      records = merge(records, checked.records);
      return save();
    },
    retry: save,
    dispose() {
      if (closed) return;
      closed = true;
      listeners.clear();
      peers.delete(sync);
      target?.removeEventListener?.('storage', changed);
    },
  });
}
export { summary as runHuntSummary };
