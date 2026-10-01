import { boundedJSON, canonicalJSON, dataIdentity, exactKeys, required } from '../data-json.mjs';
import { snapshotReplay, verifyReplayAsync } from '../replay.mjs';
import { freezeDesign } from '../content-design/catalogs.mjs';

export const JOURNEY_PERFORMANCE_FORMAT = 'revealline-journey-performance.v1';
export const JOURNEY_PERFORMANCE_LIMITS = Object.freeze({
  records: 48,
  bytes: 2 * 1024 * 1024,
  recordBytes: 512 * 1024,
  totalTicks: 216000,
});
const limits = {
  maxBytes: JOURNEY_PERFORMANCE_LIMITS.bytes,
  maxNodes: 200000,
  maxDepth: 32,
  maxArray: 4096,
  maxString: 4096,
};
const text = (value) => typeof value === 'string' && value.length > 0 && value.length <= 1024;
const verified = new WeakMap();
export const emptyJourneyPerformance = () => ({
  format: JOURNEY_PERFORMANCE_FORMAT,
  generation: 0,
  records: [],
});
export const performanceRecordKey = (record) => `${record.missionId}/${record.runId}`;
export function inspectPerformanceRecord(input) {
  const record = boundedJSON(input, {
    ...limits,
    maxBytes: JOURNEY_PERFORMANCE_LIMITS.recordBytes,
  });
  exactKeys(
    record,
    ['mode', 'missionId', 'runId', 'gameplayId', 'difficulty', 'replay'],
    'Journey performance record',
  );
  required(
    record.mode === 'solo' &&
      text(record.missionId) &&
      text(record.runId) &&
      /^[a-f0-9]{16}$/.test(record.gameplayId) &&
      ['gentle', 'standard', 'expert'].includes(record.difficulty),
    'Invalid Solo Journey performance identity.',
  );
  record.replay = snapshotReplay(record.replay);
  return record;
}
export function inspectJourneyPerformance(input) {
  const value = boundedJSON(input, limits);
  exactKeys(value, ['format', 'generation', 'records'], 'Journey performance');
  required(
    value.format === JOURNEY_PERFORMANCE_FORMAT &&
      Number.isSafeInteger(value.generation) &&
      value.generation >= 0 &&
      Array.isArray(value.records) &&
      value.records.length <= JOURNEY_PERFORMANCE_LIMITS.records,
    'Invalid Journey performance envelope.',
  );
  const keys = new Set();
  let ticks = 0;
  value.records = value.records.map((input) => {
    const record = inspectPerformanceRecord(input),
      key = performanceRecordKey(record);
    required(!keys.has(key), 'Duplicate Journey performance run.');
    keys.add(key);
    ticks += record.replay.ticks;
    required(
      ticks <= JOURNEY_PERFORMANCE_LIMITS.totalTicks,
      'Journey performance replay budget exceeded.',
    );
    return record;
  });
  return value;
}
export async function verifyPerformanceRecord(input, { acceptBinding, signal, profile } = {}) {
  required(
    typeof acceptBinding === 'function',
    'Solo Journey performance verification is unavailable.',
  );
  signal?.throwIfAborted();
  const record = inspectPerformanceRecord(input);
  required(
    profile?.clears?.solo?.[record.missionId],
    'Performance evidence needs an accepted Journey mission.',
  );
  const result = await verifyReplayAsync(record.replay, { signal });
  signal?.throwIfAborted();
  required(
    result.match && result.state.status === 'won' && result.actual.summary.won === true,
    'Performance replay must reconstruct a completed win.',
  );
  const state = result.state;
  required(
    dataIdentity({ ruleset: state.ruleset, level: state.level, classes: state.classRecipes }) ===
      record.gameplayId,
    'Performance replay differs from its gameplay identity.',
  );
  required(
    (await acceptBinding(record, state, { signal })) === true,
    'Performance replay is not part of this selected Journey.',
  );
  signal?.throwIfAborted();
  const summary = result.actual.summary;
  const comparisonId = dataIdentity({
    mode: 'solo',
    missionId: record.missionId,
    gameplayId: record.gameplayId,
    difficulty: record.difficulty,
    seed: summary.seed,
    turnPolicy: summary.turnPolicy,
    classRoute: summary.classHistory.map(({ classId, classRevision, loadoutHash }) => ({
      classId,
      classRevision,
      loadoutHash,
    })),
  });
  const row = freezeDesign({ ...record });
  verified.set(
    row,
    freezeDesign({
      missionId: record.missionId,
      runId: record.runId,
      gameplayId: record.gameplayId,
      difficulty: record.difficulty,
      comparisonId,
      score: summary.score,
      time: summary.time,
      ticks: record.replay.ticks,
    }),
  );
  return row;
}
export function performanceSummary(record) {
  return verified.get(record) ?? null;
}
export function performanceComparison(record, previous) {
  const current = performanceSummary(record);
  required(current, 'Use verified Journey performance evidence.');
  const comparable = previous
    .map(performanceSummary)
    .filter(
      (row) => row && row.comparisonId === current.comparisonId && row.runId !== current.runId,
    );
  if (!comparable.length) return null;
  const scoreBest = [...comparable].sort(
    (a, b) => b.score - a.score || a.time - b.time || a.runId.localeCompare(b.runId),
  )[0];
  const fastest = [...comparable].sort(
    (a, b) => a.time - b.time || b.score - a.score || a.runId.localeCompare(b.runId),
  )[0];
  return freezeDesign({
    current,
    scoreBest,
    fastest,
    scoreGain: current.score - scoreBest.score,
    secondsFaster: fastest.time - current.time,
  });
}
/** Keep actual winning runs for both independent records. No synthetic combined run. */
export function selectPerformanceRecords(records) {
  const byRun = new Map();
  for (const record of records) {
    required(performanceSummary(record), 'Only verified performance records may be selected.');
    const key = performanceRecordKey(record),
      old = byRun.get(key);
    required(
      !old || canonicalJSON(old) === canonicalJSON(record),
      'Performance run identity changed.',
    );
    byRun.delete(key);
    byRun.set(key, record);
  }
  const groups = new Map();
  for (const record of byRun.values()) {
    const id = performanceSummary(record).comparisonId;
    if (!groups.has(id)) groups.set(id, []);
    groups.get(id).push(record);
  }
  const retained = [];
  for (const rows of groups.values()) {
    const score = [...rows].sort(
      (a, b) =>
        performanceSummary(b).score - performanceSummary(a).score ||
        performanceSummary(a).time - performanceSummary(b).time,
    )[0];
    const fastest = [...rows].sort(
      (a, b) =>
        performanceSummary(a).time - performanceSummary(b).time ||
        performanceSummary(b).score - performanceSummary(a).score,
    )[0];
    retained.push(score);
    if (fastest !== score) retained.push(fastest);
  }
  while (retained.length) {
    try {
      inspectJourneyPerformance({
        format: JOURNEY_PERFORMANCE_FORMAT,
        generation: 0,
        records: retained,
      });
      return retained;
    } catch {
      retained.shift();
    }
  }
  return retained;
}
