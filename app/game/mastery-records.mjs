import { RULESET, TURN_POLICIES } from './core/registry.mjs';
import {
  boundedJSON,
  canonicalJSON,
  dataIdentity,
  exactKeys,
  required,
  stableId,
} from './data-json.mjs';

export const MASTERY_RECORD_VERSION = 'xonix-mastery-record.v1';
export const MASTERY_RECORD_LIMITS = Object.freeze({
  records: 4096,
  classHistory: 128,
  maxRecordBytes: 64 * 1024,
  maxBytes: 4 * 1024 * 1024,
});
export class MasteryCapacityError extends RangeError {
  constructor(resource, used, limit) {
    super(
      `Mastery ${resource} capacity exceeded${used === null ? '' : ` (${used}/${limit})`}. Existing records are preserved; no optional seal was discarded.`,
    );
    this.name = 'MasteryCapacityError';
    this.code = 'mastery-capacity';
    this.resource = resource;
    this.used = used;
    this.limit = limit;
  }
}
const capacity = (resource, used, limit) => {
  if (used > limit) throw new MasteryCapacityError(resource, used, limit);
};
const text = (value, max) =>
  typeof value === 'string' &&
  value.trim().length > 0 &&
  value.length <= max &&
  !/[\x00-\x1f\x7f]/.test(value);
const uint32 = (value) => Number.isInteger(value) && value >= 0 && value <= 0xffffffff;
const hash = (value, prefix, digits) =>
  typeof value === 'string' && new RegExp(`^${prefix}[0-9a-f]{${digits}}$`).test(value);
function campaignKeyValid(value) {
  if (typeof value !== 'string') return false;
  const parts = value.split('/');
  if (
    parts.length !== 3 ||
    !stableId(parts[0]) ||
    parts[1].length > 180 ||
    !/^[0-9a-f]{16}$/.test(parts[2])
  )
    return false;
  try {
    const revision = decodeURIComponent(parts[1]);
    return text(revision, 60) && encodeURIComponent(revision) === parts[1];
  } catch {
    return false;
  }
}
const stamp = (value) =>
  typeof value === 'string' &&
  /^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d\.\d{3}Z$/.test(value) &&
  Number.isFinite(Date.parse(value)) &&
  new Date(value).toISOString() === value;
function snapshot(value, collection) {
  const maxBytes = collection
    ? MASTERY_RECORD_LIMITS.maxBytes
    : MASTERY_RECORD_LIMITS.maxRecordBytes;
  try {
    return boundedJSON(value, {
      maxBytes,
      maxNodes: collection ? 500000 : 4096,
      maxDepth: collection ? 6 : 5,
      maxArray: MASTERY_RECORD_LIMITS.records + 1,
      maxString: 512,
    });
  } catch (error) {
    if (/byte budget/.test(error.message))
      throw new MasteryCapacityError(
        collection ? 'collection bytes' : 'record bytes',
        null,
        maxBytes,
      );
    throw error;
  }
}
function checkRecord(value) {
  exactKeys(
    value,
    [
      'format',
      'campaignKey',
      'levelId',
      'levelRevision',
      'levelIdentity',
      'definitionId',
      'definitionRevision',
      'definitionHash',
      'setup',
      'runId',
      'earnedAt',
    ],
    'mastery record',
  );
  required(value.format === MASTERY_RECORD_VERSION, 'Unsupported mastery record version.');
  required(campaignKeyValid(value.campaignKey), 'Mastery campaign key is invalid.');
  required(
    stableId(value.levelId) &&
      text(value.levelRevision, 80) &&
      hash(value.levelIdentity, 'level-v1-', 16),
    'Mastery level identity is invalid.',
  );
  required(
    stableId(value.definitionId) &&
      text(value.definitionRevision, 80) &&
      hash(value.definitionHash, 'mastery-v1-', 16),
    'Mastery definition identity is invalid.',
  );
  required(
    text(value.runId, 159) && stamp(value.earnedAt),
    'Mastery run or earned timestamp is invalid.',
  );
  const setup = value.setup;
  exactKeys(
    setup,
    [
      'ruleset',
      'seed',
      'turnPolicy',
      'classId',
      'classRevision',
      'loadoutHash',
      'rosterHash',
      'classHistory',
    ],
    'mastery setup',
  );
  required(
    setup.ruleset === RULESET && uint32(setup.seed) && TURN_POLICIES.includes(setup.turnPolicy),
    'Mastery rules, seed or turning policy is invalid.',
  );
  required(
    stableId(setup.classId) &&
      text(setup.classRevision, 80) &&
      hash(setup.loadoutHash, 'loadout-v1-', 8) &&
      hash(setup.rosterHash, 'roster-v1-', 8),
    'Mastery initial class or roster identity is invalid.',
  );
  required(
    Array.isArray(setup.classHistory) && setup.classHistory.length > 0,
    'Mastery class history must be a nonempty array.',
  );
  capacity('class history', setup.classHistory.length, MASTERY_RECORD_LIMITS.classHistory);
  let previousTick = -1,
    previousClass = null;
  const classes = new Map();
  const history = setup.classHistory.map((entry, index) => {
    exactKeys(
      entry,
      ['classId', 'classRevision', 'loadoutHash', 'tick'],
      'mastery class history entry',
    );
    required(
      stableId(entry.classId) &&
        text(entry.classRevision, 80) &&
        hash(entry.loadoutHash, 'loadout-v1-', 8) &&
        Number.isSafeInteger(entry.tick) &&
        entry.tick >= 0 &&
        entry.tick > previousTick &&
        entry.classId !== previousClass,
      'Mastery class history entry is invalid.',
    );
    if (index === 0)
      required(
        entry.tick === 0 &&
          entry.classId === setup.classId &&
          entry.classRevision === setup.classRevision &&
          entry.loadoutHash === setup.loadoutHash,
        'Mastery class history must start with the initial setup at tick zero.',
      );
    const recipe = canonicalJSON([entry.classRevision, entry.loadoutHash]);
    required(
      !classes.has(entry.classId) || classes.get(entry.classId) === recipe,
      'Mastery class history changes a recipe within the same roster.',
    );
    classes.set(entry.classId, recipe);
    previousTick = entry.tick;
    previousClass = entry.classId;
    return {
      classId: entry.classId,
      classRevision: entry.classRevision,
      loadoutHash: entry.loadoutHash,
      tick: entry.tick + 0,
    };
  });
  return {
    format: MASTERY_RECORD_VERSION,
    campaignKey: value.campaignKey,
    levelId: value.levelId,
    levelRevision: value.levelRevision,
    levelIdentity: value.levelIdentity,
    definitionId: value.definitionId,
    definitionRevision: value.definitionRevision,
    definitionHash: value.definitionHash,
    setup: {
      ruleset: setup.ruleset,
      seed: setup.seed + 0,
      turnPolicy: setup.turnPolicy,
      classId: setup.classId,
      classRevision: setup.classRevision,
      loadoutHash: setup.loadoutHash,
      rosterHash: setup.rosterHash,
      classHistory: history,
    },
    runId: value.runId,
    earnedAt: value.earnedAt,
  };
}
// Match the existing completionVariantKey route projection. Tick timing belongs
// to the retained attempt; changing it alone is not a different equipment setup.
function identity(record) {
  const { setup } = record;
  return {
    campaignKey: record.campaignKey,
    levelId: record.levelId,
    levelRevision: record.levelRevision,
    levelIdentity: record.levelIdentity,
    definitionId: record.definitionId,
    definitionRevision: record.definitionRevision,
    definitionHash: record.definitionHash,
    setup: {
      ruleset: setup.ruleset,
      seed: setup.seed,
      turnPolicy: setup.turnPolicy,
      classId: setup.classId,
      classRevision: setup.classRevision,
      loadoutHash: setup.loadoutHash,
      rosterHash: setup.rosterHash,
      classRoute: setup.classHistory.map(({ classId, classRevision, loadoutHash }) => ({
        classId,
        classRevision,
        loadoutHash,
      })),
    },
  };
}
const compare = (left, right) => (left < right ? -1 : left > right ? 1 : 0);
const identityKey = (record) => canonicalJSON(identity(record));
const order = (left, right) => compare(identityKey(left), identityKey(right));
const earliest = (left, right) =>
  compare(left.earnedAt, right.earnedAt) ||
  compare(left.runId, right.runId) ||
  compare(canonicalJSON(left), canonicalJSON(right));

/** Validates local portable metadata only. It does not prove a qualifying run. */
export function resolveMasteryRecord(value) {
  return checkRecord(snapshot(value, false));
}
export function validateMasteryRecord(value) {
  try {
    resolveMasteryRecord(value);
    return { valid: true, errors: [] };
  } catch (error) {
    return { valid: false, errors: [error.message] };
  }
}
/** Stable local display key, not a proof or signature. Union uses the complete
 * canonical identity rather than this short hash, avoiding collision merging. */
export function masteryRecordKey(value) {
  return `mastery-record-v1-${dataIdentity(identity(resolveMasteryRecord(value)))}`;
}
export function resolveMasteryRecords(value) {
  const array = snapshot(value, true);
  required(Array.isArray(array), 'Mastery records must be an array.');
  capacity('record count', array.length, MASTERY_RECORD_LIMITS.records);
  const seen = new Set();
  const records = array.map((entry) => {
    // Preserve the individual-record byte limit even inside a large collection.
    const record = resolveMasteryRecord(entry),
      key = identityKey(record);
    required(!seen.has(key), 'Mastery records contain a duplicate definition/setup identity.');
    seen.add(key);
    return record;
  });
  return records.sort(order);
}
export function validateMasteryRecords(value) {
  try {
    resolveMasteryRecords(value);
    return { valid: true, errors: [] };
  } catch (error) {
    return { valid: false, errors: [error.message] };
  }
}
/** Pure bounded union. Both inputs must be valid complete record collections;
 * malformed or over-capacity input never returns a partial result. */
export function mergeMasteryRecords(left, right) {
  const a = resolveMasteryRecords(left),
    b = resolveMasteryRecords(right),
    merged = new Map();
  for (const record of [...a, ...b]) {
    const key = identityKey(record),
      previous = merged.get(key);
    if (!previous || earliest(record, previous) < 0) merged.set(key, record);
  }
  capacity('record count', merged.size, MASTERY_RECORD_LIMITS.records);
  return resolveMasteryRecords([...merged.values()]);
}
