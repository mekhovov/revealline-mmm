import test from 'node:test';
import assert from 'node:assert/strict';
import { COMPANY_LESSONS } from '../company-campaigns/lessons.mjs';
import {
  createLearningAttempt,
  reduceLearningAttempt,
  verifyLearningAttempt,
} from '../company-campaigns/learning.mjs';
import { createCompanyLearningDraftStore } from '../company-campaigns/learning-drafts.mjs';
import { createCompanyStorage } from '../company-storage.mjs';

const lesson = COMPANY_LESSONS.find((row) => row.kind === 'practice'),
  gameplay = 'a'.repeat(16),
  alternate = 'b'.repeat(16),
  editionId = 'draft-test';
function memory() {
  const data = new Map(),
    writes = [];
  return {
    data,
    writes,
    getItem: (key) => data.get(key) ?? null,
    setItem(key, value) {
      data.set(key, value);
      writes.push(key);
    },
  };
}
function store(storage, selected = lesson) {
  return createCompanyLearningDraftStore({
    editionId,
    lessons: [selected],
    simulations: new Map([[selected.missionId, new Set([gameplay, alternate])]]),
    storage,
  });
}
function wrongAttempt() {
  let attempt = createLearningAttempt(lesson, { simulationIdentity: gameplay, seed: 7 });
  const action = (input) => {
    attempt = reduceLearningAttempt(lesson, attempt, {
      ...input,
      anchor: { tick: 42, kind: 'result' },
    });
  };
  for (const record of lesson.records) action({ type: 'inspect', recordId: record.id });
  for (const field of lesson.fields)
    action({
      type: 'configure',
      fieldId: field.id,
      value: field.options.find((option) => option.value !== field.expected).value,
    });
  action({ type: 'commit' });
  assert.equal(attempt.status, 'working');
  return attempt;
}

test('wrong choices survive exact-context reload as replayed practice, never as evidence', () => {
  const storage = memory(),
    original = wrongAttempt(),
    before = structuredClone(original),
    first = store(storage);
  assert.equal(first.save(lesson, gameplay, original), true);
  assert.equal(first.isDurable(lesson, gameplay), true);
  assert.deepEqual(original, before);
  const reloaded = store(storage);
  assert.deepEqual(reloaded.hydrate(), { rejected: 0 });
  let recovered = reloaded.load(lesson, gameplay);
  assert.deepEqual(recovered.configuration, original.configuration);
  assert.deepEqual(recovered.feedback, original.feedback);
  assert.equal(recovered.simulationIdentity, null);
  assert.equal(recovered.seed, null);
  assert.ok(recovered.actions.every((action) => action.anchor === null));
  assert.equal(verifyLearningAttempt(lesson, recovered).valid, true);
  assert.equal(reloaded.load(lesson, alternate), null);
  for (const field of lesson.fields)
    recovered = reduceLearningAttempt(lesson, recovered, {
      type: 'configure',
      fieldId: field.id,
      value: field.expected,
    });
  recovered = reduceLearningAttempt(lesson, recovered, { type: 'commit' });
  assert.equal(recovered.status, 'complete');
  assert.equal(reloaded.save(lesson, gameplay, recovered), true);
  const next = store(storage);
  next.hydrate();
  assert.deepEqual(next.load(lesson, gameplay), recovered);
  assert.ok(storage.writes.every((key) => key.startsWith('revealline.company-learning-draft.')));
});

test('draft import validates the entire bounded exact transcript before changing session or storage', () => {
  const storage = memory(),
    draft = store(storage);
  draft.save(lesson, gameplay, wrongAttempt());
  const valid = draft.exportDrafts(),
    before = new Map(storage.data),
    writes = [...storage.writes];
  for (const change of [
    (row) => {
      row.editionId = 'foreign';
    },
    (row) => {
      row.gameplayIdentity = 'c'.repeat(16);
    },
    (row) => {
      row.attempt.lessonRevision = 'new';
    },
    (row) => {
      row.attempt.fixtureRevision = 'new';
    },
    (row) => {
      row.attempt.lessonIdentity = 'c'.repeat(16);
    },
    (row) => {
      row.attempt.configuration[lesson.fields[0].id] = lesson.fields[0].expected;
    },
    (row) => {
      row.attempt.status = 'complete';
    },
    (row) => {
      row.attempt.simulationIdentity = gameplay;
      row.attempt.seed = 7;
    },
    (row) => {
      row.attempt.actions[0].anchor = { tick: 42, kind: 'result' };
    },
  ]) {
    const bad = structuredClone(valid);
    change(bad[0]);
    assert.throws(() => draft.import(bad));
    assert.deepEqual(draft.exportDrafts(), valid);
    assert.deepEqual(storage.data, before);
    assert.deepEqual(storage.writes, writes);
  }
  assert.throws(() => draft.import([...valid, ...valid]), /Duplicate/);
  assert.throws(() => draft.import('x'.repeat(2 * 1024 * 1024 + 1)), /budget|JSON/);
  const destination = store(memory());
  assert.equal(destination.import(valid), true);
  assert.deepEqual(destination.exportDrafts(), valid);
});

test('lesson revisions and gameplay contexts have separate keys and preserve historical stored bytes', () => {
  const storage = memory(),
    first = store(storage);
  first.save(lesson, gameplay, wrongAttempt());
  const historical = new Map(storage.data),
    newerLesson = { ...lesson, revision: 'draft-successor' },
    newer = store(storage, newerLesson);
  assert.deepEqual(newer.hydrate(), { rejected: 0 });
  assert.equal(newer.load(newerLesson, gameplay), null);
  newer.save(newerLesson, gameplay, createLearningAttempt(newerLesson));
  first.save(lesson, alternate, createLearningAttempt(lesson));
  assert.equal(storage.data.size, 3);
  for (const [key, value] of historical) assert.equal(storage.data.get(key), value);
});

test('unreadable or corrupt records cannot be overwritten; quota failure leaves an exportable session draft', () => {
  const raw = memory(),
    first = store(raw);
  first.save(lesson, gameplay, wrongAttempt());
  const key = raw.writes[0];
  raw.data.set(key, '{bad');
  const corrupt = store(raw);
  assert.deepEqual(corrupt.hydrate(), { rejected: 1 });
  assert.equal(corrupt.load(lesson, gameplay), null);
  assert.equal(corrupt.save(lesson, gameplay, wrongAttempt()), false);
  assert.equal(raw.data.get(key), '{bad');
  assert.equal(corrupt.exportDrafts().length, 1);
  const lateRaw = memory(),
    late = store(lateRaw);
  late.save(lesson, gameplay, wrongAttempt());
  const lateKey = lateRaw.writes[0];
  lateRaw.data.set(lateKey, '{changed after hydration');
  assert.equal(late.save(lesson, gameplay, wrongAttempt()), false);
  assert.equal(lateRaw.data.get(lateKey), '{changed after hydration');
  let writes = 0;
  const unreadable = store(
    createCompanyStorage({
      getStorage: () => ({
        getItem() {
          throw new Error('read unavailable');
        },
        setItem() {
          writes++;
        },
      }),
    }),
  );
  unreadable.hydrate();
  assert.equal(unreadable.save(lesson, gameplay, wrongAttempt()), false);
  assert.equal(writes, 0);
  assert.equal(unreadable.exportDrafts().length, 1);
  const quota = store({
    getItem: () => null,
    setItem() {
      throw new Error('quota');
    },
  });
  assert.equal(quota.save(lesson, gameplay, wrongAttempt()), false);
  assert.equal(quota.isDurable(lesson, gameplay), false);
  const exported = quota.exportDrafts();
  assert.equal(exported.length, 1);
  exported[0].attempt.status = 'complete';
  assert.equal(quota.exportDrafts()[0].attempt.status, 'working', 'Exports are detached copies.');
});
