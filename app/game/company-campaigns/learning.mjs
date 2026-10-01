import {
  boundedJSON,
  canonicalJSON,
  dataIdentity,
  exactKeys,
  required,
  stableId,
} from '../data-json.mjs';
import { freezeDesign } from '../content-design/catalogs.mjs';
import { validateLessonLocalization } from './lesson-localization.mjs';

const text = (value) => typeof value === 'string' && value.length > 0 && value.length <= 2048;
const unique = (items) => new Set(items).size === items.length;
const pin = (value) =>
  value === null || (typeof value === 'string' && /^[a-f0-9]{16,64}$/.test(value));
const ATTEMPT_KEYS = [
  'format',
  'id',
  'lessonId',
  'lessonRevision',
  'fixtureRevision',
  'lessonIdentity',
  'missionId',
  'simulationIdentity',
  'seed',
  'actions',
  'inspected',
  'configuration',
  'commitCount',
  'status',
  'feedback',
  'outcome',
];

/** Validate selected edition data; this generic module never imports other campaigns. */
export function validateCompanyLesson(input) {
  const lesson = boundedJSON(input, { maxBytes: 65536, maxNodes: 4096, maxArray: 64 });
  exactKeys(
    lesson,
    [
      'format',
      'id',
      'revision',
      'fixtureRevision',
      'missionId',
      'campaignId',
      'title',
      'role',
      'brief',
      'kind',
      'notice',
      'sourceReviewedAt',
      'sources',
      'records',
      'fields',
      'success',
      'locales',
    ],
    'lesson',
  );
  required(lesson.format === 'revealline-learning-lesson.v1', 'Unsupported learning lesson.');
  for (const name of ['id', 'missionId', 'campaignId'])
    required(stableId(lesson[name]), `Invalid lesson ${name}.`);
  for (const name of ['revision', 'fixtureRevision', 'title', 'role', 'brief', 'notice', 'success'])
    required(text(lesson[name]), `Missing lesson ${name}.`);
  required(['practice', 'reflection'].includes(lesson.kind), 'Unknown lesson kind.');
  required(
    typeof lesson.sourceReviewedAt === 'string' &&
      /^\d{4}-\d{2}-\d{2}$/.test(lesson.sourceReviewedAt),
    'Missing source review date.',
  );
  required(
    Array.isArray(lesson.sources) && lesson.sources.length > 0 && lesson.sources.length <= 8,
    'A lesson needs its sources.',
  );
  for (const source of lesson.sources) {
    exactKeys(source, ['title', 'url'], 'lesson source');
    required(text(source.title) && text(source.url), 'Invalid lesson source.');
    let url;
    try {
      url = new URL(source.url);
    } catch {
      throw new TypeError('Invalid source URL.');
    }
    required(
      url.protocol === 'https:' && !url.username && !url.password,
      'Sources must use HTTPS without credentials.',
    );
  }
  required(
    Array.isArray(lesson.records) && lesson.records.length > 0 && lesson.records.length <= 12,
    'A lesson needs bounded evidence records.',
  );
  for (const record of lesson.records) {
    exactKeys(record, ['id', 'title', 'lines'], 'evidence record');
    required(stableId(record.id) && text(record.title), 'Invalid evidence record.');
    required(
      Array.isArray(record.lines) &&
        record.lines.length > 0 &&
        record.lines.length <= 12 &&
        record.lines.every(text),
      'Invalid evidence lines.',
    );
  }
  required(unique(lesson.records.map((record) => record.id)), 'Duplicate evidence record.');
  required(
    Array.isArray(lesson.fields) && lesson.fields.length > 0 && lesson.fields.length <= 8,
    'A lesson needs bounded configuration fields.',
  );
  for (const field of lesson.fields) {
    exactKeys(field, ['id', 'label', 'options', 'expected', 'explanation'], 'configuration field');
    required(
      stableId(field.id) && text(field.label) && text(field.explanation),
      'Invalid configuration field.',
    );
    required(
      Array.isArray(field.options) && field.options.length >= 2 && field.options.length <= 12,
      'Invalid configuration options.',
    );
    for (const option of field.options) {
      exactKeys(option, ['value', 'label', 'consequence'], 'configuration option');
      required(text(option.value) && text(option.label), 'Invalid configuration option.');
      if (lesson.kind === 'reflection')
        required(text(option.consequence), 'Reflection choices need a consequence.');
      else
        required(
          !Object.hasOwn(option, 'consequence'),
          'Practice options cannot override feedback.',
        );
    }
    required(
      unique(field.options.map((option) => option.value)),
      'Duplicate configuration option.',
    );
    required(
      lesson.kind === 'reflection'
        ? field.expected === null
        : field.options.some((option) => option.value === field.expected),
      'Invalid expected outcome.',
    );
  }
  required(unique(lesson.fields.map((field) => field.id)), 'Duplicate configuration field.');
  validateLessonLocalization(lesson);
  return freezeDesign(lesson);
}

export function validateCompanyLessons(input) {
  const source = boundedJSON(input, { maxBytes: 2 * 1024 * 1024, maxArray: 256, maxNodes: 50000 });
  required(Array.isArray(source) && source.length <= 128, 'Expected a bounded lesson array.');
  const lessons = source.map(validateCompanyLesson);
  required(
    unique(lessons.map((lesson) => lesson.id)) && unique(lessons.map((lesson) => lesson.missionId)),
    'Duplicate lesson or mission.',
  );
  return freezeDesign(lessons);
}

export function createLearningAttempt(
  input,
  { attemptId, simulationIdentity = null, seed = null } = {},
) {
  const lesson = validateCompanyLesson(input);
  const id = attemptId ?? `${lesson.missionId}-attempt`;
  required(stableId(id), 'Invalid learning attempt ID.');
  required(pin(simulationIdentity), 'Invalid simulation identity.');
  required(
    simulationIdentity === null
      ? seed === null
      : Number.isSafeInteger(seed) && seed >= 0 && seed <= 0xffffffff,
    'Simulation pin and seed must be supplied together.',
  );
  return freezeDesign({
    format: 'revealline-learning-attempt.v1',
    id,
    lessonId: lesson.id,
    lessonRevision: lesson.revision,
    fixtureRevision: lesson.fixtureRevision,
    lessonIdentity: dataIdentity(lesson),
    missionId: lesson.missionId,
    simulationIdentity,
    seed,
    actions: [],
    inspected: [],
    configuration: {},
    commitCount: 0,
    status: 'working',
    feedback: [],
    outcome: null,
  });
}

function normalizeAction(input, attempt) {
  const action = boundedJSON(input, { maxBytes: 4096, maxNodes: 32, maxArray: 8 });
  const allowed = {
    inspect: ['type', 'recordId', 'anchor'],
    configure: ['type', 'fieldId', 'value', 'anchor'],
    commit: ['type', 'anchor'],
  };
  required(Object.hasOwn(allowed, action?.type), 'Unknown learning action.');
  exactKeys(action, allowed[action.type], 'learning action');
  if (action.type === 'inspect') required(stableId(action.recordId), 'Invalid evidence ID.');
  if (action.type === 'configure')
    required(stableId(action.fieldId) && text(action.value), 'Invalid configuration action.');
  const anchor = action.anchor ?? null;
  if (anchor !== null) {
    exactKeys(anchor, ['tick', 'kind'], 'learning anchor');
    required(
      Number.isSafeInteger(anchor.tick) && anchor.tick >= 0 && anchor.tick <= 10000000,
      'Invalid anchor tick.',
    );
    required(
      ['checkpoint', 'capture', 'result', 'practice'].includes(anchor.kind),
      'Invalid anchor kind.',
    );
    const previous = attempt.actions.filter((entry) => entry.anchor !== null).at(-1)?.anchor;
    required(!previous || anchor.tick >= previous.tick, 'Learning anchors must be ordered.');
  }
  return { ...action, anchor };
}

function applyAction(lesson, attempt, input) {
  required(attempt.status === 'working', 'This attempt is already complete.');
  required(attempt.actions.length < 256, 'Learning attempt action budget exceeded.');
  const action = normalizeAction(input, attempt);
  const next = structuredClone(attempt);
  next.actions.push(action);
  next.feedback = [];
  if (action.type === 'inspect') {
    required(
      lesson.records.some((record) => record.id === action.recordId),
      'Unknown evidence record.',
    );
    if (!next.inspected.includes(action.recordId)) next.inspected.push(action.recordId);
  } else if (action.type === 'configure') {
    const field = lesson.fields.find((entry) => entry.id === action.fieldId);
    required(
      field?.options.some((option) => option.value === action.value),
      'Unknown configuration choice.',
    );
    next.configuration[action.fieldId] = action.value;
  } else {
    next.commitCount++;
    for (const record of lesson.records)
      if (!next.inspected.includes(record.id))
        next.feedback.push(`Inspect ${record.title} before committing.`);
    for (const field of lesson.fields) {
      if (!Object.hasOwn(next.configuration, field.id))
        next.feedback.push(`Choose ${field.label.toLowerCase()} before committing.`);
      else if (lesson.kind === 'practice' && next.configuration[field.id] !== field.expected)
        next.feedback.push(field.explanation);
    }
    if (!next.feedback.length) {
      next.status = 'complete';
      next.outcome = lesson.kind === 'reflection' ? 'reflected' : 'mastered';
      if (lesson.kind === 'reflection')
        for (const field of lesson.fields)
          next.feedback.push(
            field.options.find((option) => option.value === next.configuration[field.id])
              .consequence,
          );
      next.feedback.push(lesson.success);
    }
  }
  return freezeDesign(next);
}

/** Transcript replay is a local consistency check, not signed achievement evidence. */
export function verifyLearningAttempt(input, source) {
  try {
    const lesson = validateCompanyLesson(input);
    const attempt = boundedJSON(source, { maxBytes: 128 * 1024, maxArray: 256, maxNodes: 6000 });
    exactKeys(attempt, ATTEMPT_KEYS, 'learning attempt');
    required(
      attempt.format === 'revealline-learning-attempt.v1' && Array.isArray(attempt.actions),
      'Unsupported learning attempt.',
    );
    let replayed = createLearningAttempt(lesson, {
      attemptId: attempt.id,
      simulationIdentity: attempt.simulationIdentity,
      seed: attempt.seed,
    });
    for (const action of attempt.actions) replayed = applyAction(lesson, replayed, action);
    required(
      canonicalJSON(replayed) === canonicalJSON(attempt),
      'Learning attempt does not match its pinned lesson and transcript.',
    );
    return { valid: true, attempt: replayed };
  } catch (error) {
    return { valid: false, reason: error.message };
  }
}

export function reduceLearningAttempt(lesson, attempt, action) {
  const verified = verifyLearningAttempt(lesson, attempt);
  required(verified.valid, verified.reason ?? 'Invalid learning attempt.');
  return applyAction(validateCompanyLesson(lesson), verified.attempt, action);
}

/** Independent edition-scoped local progress; never writes arcade medals/clears. */
export function createCompanyLearningStore({ editionId, storage, lessons }) {
  required(stableId(editionId), 'Invalid learning edition ID.');
  const catalog = validateCompanyLessons(lessons);
  const key = `revealline-mmm.company-learning.${editionId}.v1`;
  let cachedRaw,
    cachedRecords = {};
  const read = () => {
    try {
      const raw = storage?.getItem(key) ?? null;
      if (raw === cachedRaw) return cachedRecords;
      cachedRaw = raw;
      cachedRecords = {};
      if (!raw) return cachedRecords;
      const data = boundedJSON(raw, { maxBytes: 1024 * 1024, maxArray: 256, maxNodes: 60000 });
      exactKeys(data, ['format', 'editionId', 'attempts'], 'learning storage');
      required(
        data.format === 'revealline-learning-store.v1' && data.editionId === editionId,
        'Wrong learning storage edition.',
      );
      required(
        Array.isArray(data.attempts) && data.attempts.length <= catalog.length,
        'Invalid learning storage records.',
      );
      const out = {};
      for (const attempt of data.attempts) {
        const lesson = catalog.find((entry) => entry.missionId === attempt?.missionId);
        if (!lesson || Object.hasOwn(out, lesson.missionId)) continue;
        const verified = verifyLearningAttempt(lesson, attempt);
        if (verified.valid) out[lesson.missionId] = verified.attempt;
      }
      cachedRecords = out;
      return cachedRecords;
    } catch {
      cachedRecords = {};
      return cachedRecords;
    }
  };
  const load = (missionId, pins = {}) => {
    if (!catalog.some((lesson) => lesson.missionId === missionId)) return null;
    const attempt = read()[missionId] ?? null;
    if (!attempt) return null;
    if (
      Object.hasOwn(pins, 'simulationIdentity') &&
      pins.simulationIdentity !== attempt.simulationIdentity
    )
      return null;
    if (Object.hasOwn(pins, 'seed') && pins.seed !== attempt.seed) return null;
    return attempt;
  };
  return Object.freeze({
    key,
    load,
    save(attempt) {
      const lesson = catalog.find((entry) => entry.missionId === attempt?.missionId);
      if (!lesson || !verifyLearningAttempt(lesson, attempt).valid) return false;
      const records = { ...read() };
      // Replaying arcade content must not erase an already completed practice.
      if (records[lesson.missionId]?.status === 'complete' && attempt.status !== 'complete')
        return true;
      records[lesson.missionId] = attempt;
      try {
        if (!storage?.setItem) return false;
        const serialized = JSON.stringify({
          format: 'revealline-learning-store.v1',
          editionId,
          attempts: Object.values(records),
        });
        boundedJSON(serialized, { maxBytes: 1024 * 1024, maxArray: 256, maxNodes: 60000 });
        storage.setItem(key, serialized);
        return true;
      } catch {
        return false;
      }
    },
    progress(missionId, { arcadeCleared = false } = {}) {
      const lesson = catalog.find((entry) => entry.missionId === missionId);
      const attempt = load(missionId);
      const practiceCompleted = attempt?.status === 'complete';
      return {
        arcadeCleared: Boolean(arcadeCleared),
        practiceCompleted,
        mastered: attempt?.outcome === 'mastered',
        reflected: attempt?.outcome === 'reflected',
        complete: Boolean(arcadeCleared) && (!lesson || practiceCompleted),
      };
    },
  });
}
