import test from 'node:test';
import assert from 'node:assert/strict';
import { COMPANY_LESSONS } from '../company-campaigns/lessons.mjs';
import {
  createLearningAttempt,
  reduceLearningAttempt,
  verifyLearningAttempt,
  validateCompanyLesson,
  validateCompanyLessons,
  createCompanyLearningStore,
} from '../company-campaigns/learning.mjs';
import { mountCompanyWorkbench } from '../company-campaigns/workbench.mjs';
import { Document } from './helpers/couch-dom.mjs';

const lesson = COMPANY_LESSONS.find((entry) => entry.missionId === 'coupa-source-to-pay-05');
const simulationIdentity = '1234567890abcdef';
function finish(source, options = {}) {
  let attempt = createLearningAttempt(source, options);
  for (const record of source.records)
    attempt = reduceLearningAttempt(source, attempt, {
      type: 'inspect',
      recordId: record.id,
      anchor: { kind: 'capture', tick: 120 },
    });
  for (const field of source.fields)
    attempt = reduceLearningAttempt(source, attempt, {
      type: 'configure',
      fieldId: field.id,
      value: field.expected ?? field.options[0].value,
      anchor: { kind: 'checkpoint', tick: 120 },
    });
  return reduceLearningAttempt(source, attempt, {
    type: 'commit',
    anchor: { kind: 'checkpoint', tick: 120 },
  });
}
function memoryStorage() {
  const values = new Map();
  return {
    values,
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, value),
  };
}

test('24 versioned lessons have concrete records, replayable handoffs and unscored culture reflection', () => {
  assert.equal(validateCompanyLessons(COMPANY_LESSONS).length, 24);
  assert.equal(COMPANY_LESSONS.filter((entry) => entry.kind === 'reflection').length, 6);
  for (const source of COMPANY_LESSONS) {
    const result = finish(source, { simulationIdentity, seed: 17 });
    assert.equal(result.status, 'complete', source.id);
    assert.equal(result.outcome, source.kind === 'reflection' ? 'reflected' : 'mastered');
    assert.equal(verifyLearningAttempt(source, result).valid, true);
    assert.deepEqual(result, finish(source, { simulationIdentity, seed: 17 }));
    assert(Object.isFrozen(result));
    assert.throws(
      () => reduceLearningAttempt(source, result, { type: 'commit' }),
      /already complete/,
    );
  }
  for (const source of COMPANY_LESSONS.filter((entry) => entry.kind === 'reflection'))
    for (const option of source.fields[0].options) {
      let result = createLearningAttempt(source);
      for (const record of source.records)
        result = reduceLearningAttempt(source, result, { type: 'inspect', recordId: record.id });
      result = reduceLearningAttempt(source, result, {
        type: 'configure',
        fieldId: source.fields[0].id,
        value: option.value,
      });
      result = reduceLearningAttempt(source, result, { type: 'commit' });
      assert.equal(result.outcome, 'reflected');
      assert(result.feedback.includes(option.consequence));
    }
});

test('commit needs inspected evidence and correct role-specific configuration; errors remain repairable', () => {
  let attempt = createLearningAttempt(lesson);
  const initial = attempt;
  attempt = reduceLearningAttempt(lesson, attempt, { type: 'commit' });
  assert.equal(attempt.status, 'working');
  assert.equal(attempt.feedback.length, 4);
  assert.equal(initial.commitCount, 0);
  for (const record of lesson.records)
    attempt = reduceLearningAttempt(lesson, attempt, { type: 'inspect', recordId: record.id });
  attempt = reduceLearningAttempt(lesson, attempt, {
    type: 'configure',
    fieldId: 'line',
    value: 'PO-204 / line 1',
  });
  attempt = reduceLearningAttempt(lesson, attempt, {
    type: 'configure',
    fieldId: 'received',
    value: '12',
  });
  attempt = reduceLearningAttempt(lesson, attempt, { type: 'commit' });
  assert.equal(attempt.status, 'working');
  assert.deepEqual(attempt.feedback, [
    'Recording 12 would claim the four undelivered kits arrived and hide the remaining delivery. Record the eight physically received today.',
  ]);
  attempt = reduceLearningAttempt(lesson, attempt, {
    type: 'configure',
    fieldId: 'received',
    value: '8',
  });
  attempt = reduceLearningAttempt(lesson, attempt, { type: 'commit' });
  assert.equal(attempt.outcome, 'mastered');
  assert.equal(attempt.commitCount, 3);
  assert.equal(verifyLearningAttempt(lesson, attempt).valid, true);
});

test('transcript validation rejects stale fixtures, fabricated outcomes, action smuggling and unordered anchors', () => {
  const complete = finish(lesson, { simulationIdentity, seed: 3 });
  for (const mutation of [
    (value) => {
      value.actions = [];
    },
    (value) => {
      value.configuration.received = '12';
    },
    (value) => {
      value.lessonIdentity = '0000000000000000';
    },
    (value) => {
      value.actions[0].anchor.tick = 200;
    },
    (value) => {
      value.extra = 'unexpected';
    },
  ]) {
    const changed = structuredClone(complete);
    mutation(changed);
    assert.equal(verifyLearningAttempt(lesson, changed).valid, false);
  }
  assert.equal(verifyLearningAttempt({ ...lesson, fixtureRevision: '2' }, complete).valid, false);
  const initial = createLearningAttempt(lesson);
  assert.throws(
    () => reduceLearningAttempt(lesson, initial, { type: 'inspect', recordId: 'missing' }),
    /Unknown evidence/,
  );
  assert.throws(
    () =>
      reduceLearningAttempt(lesson, initial, {
        type: 'configure',
        fieldId: 'received',
        value: '999',
      }),
    /Unknown configuration/,
  );
  assert.throws(
    () => reduceLearningAttempt(lesson, initial, { type: 'commit', paid: true }),
    /not supported/,
  );
  assert.throws(
    () => createLearningAttempt(lesson, { simulationIdentity, seed: null }),
    /supplied together/,
  );
  for (const seed of [0, 0xffffffff])
    assert.equal(createLearningAttempt(lesson, { simulationIdentity, seed }).seed, seed);
  assert.throws(
    () =>
      validateCompanyLesson({ ...lesson, sources: [{ title: 'bad', url: 'javascript:alert(1)' }] }),
    /HTTPS/,
  );
  let getterInvoked = false;
  assert.throws(
    () =>
      validateCompanyLesson({
        ...lesson,
        get records() {
          getterInvoked = true;
          return [];
        },
      }),
    /accessors/,
  );
  assert.equal(getterInvoked, false);
});

test('edition-scoped learning records revalidate on load and never imply an arcade clear', () => {
  const storage = memoryStorage();
  const a = createCompanyLearningStore({
    editionId: 'coupa-foundations',
    storage,
    lessons: [lesson],
  });
  const b = createCompanyLearningStore({
    editionId: 'another-edition',
    storage,
    lessons: [lesson],
  });
  const done = finish(lesson, { simulationIdentity, seed: 3 });
  assert.equal(a.save(done), true);
  assert.equal(b.load(lesson.missionId), null);
  assert.equal(a.load('constructor'), null);
  assert.equal(a.load(lesson.missionId, { simulationIdentity: '0000000000000000' }), null);
  assert.equal(a.load(lesson.missionId, { seed: 4 }), null);
  assert.deepEqual(a.progress(lesson.missionId), {
    arcadeCleared: false,
    practiceCompleted: true,
    mastered: true,
    reflected: false,
    complete: false,
  });
  assert.equal(a.progress(lesson.missionId, { arcadeCleared: true }).complete, true);
  assert.equal(a.save(createLearningAttempt(lesson)), true);
  assert.equal(a.load(lesson.missionId).status, 'complete');
  const stale = createCompanyLearningStore({
    editionId: 'coupa-foundations',
    storage,
    lessons: [{ ...lesson, revision: 'future' }],
  });
  assert.equal(stale.load(lesson.missionId), null);
  storage.setItem(a.key, '{"format":"bad"}');
  assert.equal(a.load(lesson.missionId), null);
  const quota = createCompanyLearningStore({
    editionId: 'quota',
    storage: {
      getItem: () => null,
      setItem: () => {
        throw Error('quota');
      },
    },
    lessons: [lesson],
  });
  assert.equal(quota.save(done), false);
});

test('workbench uses safe labeled DOM, keeps focus, emits replayable actions and cleans up', () => {
  const document = new Document();
  const container = document.createElement('div');
  document.body.append(container);
  const input = structuredClone(lesson);
  input.records[0].lines.push('<script>not executable</script>');
  const changes = [];
  let closed = 0;
  const workbench = mountCompanyWorkbench(container, {
    lesson: input,
    onChange: (attempt) => changes.push(attempt),
    onClose: () => closed++,
    anchor: { kind: 'checkpoint', tick: 90 },
  });
  const control = (id) => container.querySelector(`[data-control="${id}"]`);
  control('inspect-order').focus();
  control('inspect-order').click();
  assert.equal(document.activeElement, control('inspect-order'));
  assert(container.textContent.includes('<script>not executable</script>'));
  assert.equal(container.querySelector('script'), null);
  control('inspect-delivery').click();
  for (const field of input.fields) {
    const select = control(`field-${field.id}`);
    select.value = field.expected;
    select.emit('change');
    assert(container.querySelectorAll('label').some((label) => label.htmlFor === select.id));
  }
  control('commit').click();
  assert.equal(workbench.getAttempt().status, 'complete');
  assert.equal(document.activeElement, container.querySelector('[data-feedback]'));
  assert.equal(changes.length, 5);
  assert.equal(verifyLearningAttempt(input, changes.at(-1)).valid, true);
  assert.equal(control('commit').disabled, true);
  const close = control('close');
  close.click();
  assert.equal(closed, 1);
  workbench.destroy();
  close.click();
  assert.equal(closed, 1);
  assert.equal(container.children.length, 0);
});
