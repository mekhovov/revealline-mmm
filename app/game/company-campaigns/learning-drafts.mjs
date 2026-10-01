import { boundedJSON, dataIdentity, exactKeys, required, stableId } from '../data-json.mjs';
import { validateCompanyLessons, verifyLearningAttempt } from './learning.mjs';

export const LEARNING_DRAFT_FORMAT = 'revealline-learning-draft.v1';
const limits = { maxBytes: 2 * 1024 * 1024, maxNodes: 120000, maxArray: 512, maxDepth: 30 };
const recordLimits = { maxBytes: 256 * 1024, maxNodes: 6500, maxArray: 256, maxDepth: 24 };
const snapshot = (value) => boundedJSON(value, limits);

/** Drafts preserve choices, never replay authority. Even a completed imported
 * transcript is practice; only the separate proof store can establish a bonus. */
export function createCompanyLearningDraftStore({ editionId, lessons, simulations, storage }) {
  required(stableId(editionId), 'Invalid learning draft edition.');
  const catalog = validateCompanyLessons(lessons),
    contexts = new Map(),
    loaded = new Set(),
    blocked = new Set(),
    durable = new Set(),
    records = new Map();
  for (const lesson of catalog) {
    const lessonIdentity = dataIdentity(lesson);
    for (const gameplayIdentity of simulations.get(lesson.missionId) ?? []) {
      required(/^[a-f0-9]{16,64}$/.test(gameplayIdentity), 'Invalid learning draft gameplay.');
      const key = `${lessonIdentity}.${gameplayIdentity}`;
      contexts.set(key, { lesson, gameplayIdentity });
    }
  }
  required(contexts.size <= 512, 'Too many learning draft contexts.');
  const storageKey = (key) => `revealline-mmm.company-learning-draft.${editionId}.${key}.v1`;
  function inspectRecord(input) {
    const record = boundedJSON(input, recordLimits);
    exactKeys(record, ['format', 'editionId', 'gameplayIdentity', 'attempt'], 'learning draft');
    required(
      record.format === LEARNING_DRAFT_FORMAT && record.editionId === editionId,
      'This learning draft belongs to another edition.',
    );
    const key = `${record.attempt?.lessonIdentity}.${record.gameplayIdentity}`,
      context = contexts.get(key);
    required(context, 'The learning draft needs its exact lesson and gameplay revision.');
    const checked = verifyLearningAttempt(context.lesson, record.attempt);
    required(checked.valid, checked.reason ?? 'Invalid learning draft.');
    required(
      checked.attempt.simulationIdentity === null &&
        checked.attempt.seed === null &&
        checked.attempt.actions.every((action) => action.anchor === null),
      'A learning draft cannot carry replay evidence.',
    );
    return { key, record: { ...record, attempt: checked.attempt } };
  }
  function checkedUnion(incoming) {
    const merged = new Map(records);
    for (const { key, record } of incoming) merged.set(key, record);
    snapshot([...merged.values()]);
    return merged;
  }
  function load(key) {
    if (!loaded.has(key)) {
      loaded.add(key);
      try {
        const raw = storage.getItem(storageKey(key));
        if (raw !== null) {
          const checked = inspectRecord(raw);
          required(checked.key === key, 'Stored learning draft context differs.');
          checkedUnion([checked]);
          records.set(key, checked.record);
          durable.add(key);
        }
      } catch {
        // Keep the original bytes and prohibit overwriting this unreadable slot.
        blocked.add(key);
      }
    }
    return records.get(key) ?? null;
  }
  const contextKey = (lesson, gameplayIdentity) => `${dataIdentity(lesson)}.${gameplayIdentity}`;
  function persist(key, record) {
    durable.delete(key);
    if (blocked.has(key)) return false;
    try {
      // Another installation may have changed this exact slot since hydration.
      // A malformed replacement must not be mistaken for absent old data.
      const raw = storage.getItem(storageKey(key));
      if (raw !== null) {
        try {
          required(inspectRecord(raw).key === key, 'Stored learning draft context differs.');
        } catch {
          blocked.add(key);
          return false;
        }
      }
      storage.setItem(storageKey(key), JSON.stringify(record));
      durable.add(key);
      return true;
    } catch {
      return false;
    }
  }
  function inspect(input) {
    const rows = snapshot(input);
    required(Array.isArray(rows) && rows.length <= contexts.size, 'Invalid learning drafts.');
    const seen = new Set();
    return rows.map((row) => {
      const checked = inspectRecord(row);
      required(!seen.has(checked.key), 'Duplicate learning draft.');
      seen.add(checked.key);
      return checked;
    });
  }
  return Object.freeze({
    hydrate() {
      for (const key of contexts.keys()) load(key);
      return { rejected: blocked.size };
    },
    load(lesson, gameplayIdentity) {
      const key = contextKey(lesson, gameplayIdentity);
      if (!contexts.has(key)) return null;
      const record = load(key);
      return record ? snapshot(record.attempt) : null;
    },
    isDurable(lesson, gameplayIdentity) {
      return durable.has(contextKey(lesson, gameplayIdentity));
    },
    save(lesson, gameplayIdentity, source) {
      const checked = verifyLearningAttempt(lesson, source);
      required(checked.valid, checked.reason ?? 'Invalid learning draft.');
      // Strip evidence pins, not decisions. The standard verifier recomputes all
      // derived state against the same immutable lesson after this projection.
      const practice = {
        ...checked.attempt,
        simulationIdentity: null,
        seed: null,
        actions: checked.attempt.actions.map((action) => ({ ...action, anchor: null })),
      };
      const candidate = inspectRecord({
        format: LEARNING_DRAFT_FORMAT,
        editionId,
        gameplayIdentity,
        attempt: practice,
      });
      load(candidate.key);
      checkedUnion([candidate]);
      records.set(candidate.key, candidate.record);
      return persist(candidate.key, candidate.record);
    },
    inspect(input) {
      const checked = inspect(input);
      checkedUnion(checked);
      return snapshot(checked.map(({ record }) => record));
    },
    import(input) {
      const checked = inspect(input);
      for (const { key } of checked) load(key);
      const merged = checkedUnion(checked);
      // Validate every row and the aggregate before changing session or storage.
      for (const [key, record] of merged) records.set(key, record);
      let durable = true;
      for (const { key, record } of checked) if (!persist(key, record)) durable = false;
      return durable;
    },
    exportDrafts() {
      return snapshot([...records.values()]);
    },
  });
}
