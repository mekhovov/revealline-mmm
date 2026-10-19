import test from 'node:test';
import assert from 'node:assert/strict';
import { COMPANY_LESSONS } from '../company-campaigns/lessons.mjs';
import { COMPANY_MISSIONS } from '../company-campaigns/catalog.mjs';
import {
  COMPANY_PLAYTEST_FIXTURES,
  companyPlaytestTask,
} from '../company-campaigns/playtest-fixtures.mjs';
import {
  createLearningAttempt,
  reduceLearningAttempt,
  verifyLearningAttempt,
  validateCompanyLessons,
} from '../company-campaigns/learning.mjs';

function attemptWith(lesson, configuration) {
  let attempt = createLearningAttempt(lesson);
  for (const record of lesson.records)
    attempt = reduceLearningAttempt(lesson, attempt, { type: 'inspect', recordId: record.id });
  for (const [fieldId, value] of Object.entries(configuration))
    attempt = reduceLearningAttempt(lesson, attempt, { type: 'configure', fieldId, value });
  return reduceLearningAttempt(lesson, attempt, { type: 'commit' });
}

test('four transfer fixtures have distinct identities, validate and cannot claim shipped lesson mastery', () => {
  assert.equal(
    validateCompanyLessons(COMPANY_PLAYTEST_FIXTURES.map((row) => row.lesson)).length,
    4,
  );
  for (const fixture of COMPANY_PLAYTEST_FIXTURES) {
    const lesson = fixture.lesson;
    const base = COMPANY_LESSONS.find((row) => row.missionId === fixture.baseMissionId);
    assert(base);
    assert.equal(fixture.baseLessonRevision, base.revision);
    assert.equal(fixture.baseLessonIdentity, createLearningAttempt(base).lessonIdentity);
    assert(!COMPANY_MISSIONS.some((row) => row.id === lesson.missionId));
    const configuration = Object.fromEntries(
      lesson.fields.map((field) => [field.id, field.expected ?? field.options[0].value]),
    );
    const attempt = attemptWith(lesson, configuration);
    assert.equal(attempt.status, 'complete');
    assert.equal(attempt.simulationIdentity, null);
    assert.equal(verifyLearningAttempt(lesson, attempt).valid, true);
    assert.equal(verifyLearningAttempt(base, attempt).valid, false);
    const task = companyPlaytestTask(fixture.id);
    assert(!JSON.stringify(task).includes('expected'));
    assert(!Object.hasOwn(task, 'success'));
    for (const field of task.fields) {
      assert(!Object.hasOwn(field, 'explanation'));
      assert(field.options.every((option) => !Object.hasOwn(option, 'consequence')));
    }
  }
});


test('repeating the first mission’s salient answer fails the changed transfer evidence', () => {
  const examples = [
    [
      'playtest-foundations-requirement',
      { item: 'Electronics kit', quantity: '12', needBy: '4 November' },
      /kits already exist|per shared workstation/,
    ],
    [
      'playtest-operations-owner',
      { record: 'R-301', action: 'Complete delivery address' },
      /requester Lee|assigned elsewhere/,
    ],
    [
      'playtest-developers-resource',
      { resource: 'suppliers', method: 'GET' },
      /invoice-status lookup/,
    ],
  ];
  for (const [id, configuration, reason] of examples) {
    const fixture = COMPANY_PLAYTEST_FIXTURES.find((row) => row.id === id);
    const attempt = attemptWith(fixture.lesson, configuration);
    assert.equal(attempt.status, 'working', id);
    assert.match(attempt.feedback.join(' '), reason);
    assert.equal(verifyLearningAttempt(fixture.lesson, attempt).valid, true);
  }
});

test('both culture transfer approaches remain unscored and preserve their different consequences', () => {
  const { lesson } = COMPANY_PLAYTEST_FIXTURES.find(
    (row) => row.id === 'playtest-culture-connection',
  );
  for (const option of lesson.fields[0].options) {
    const attempt = attemptWith(lesson, { connection: option.value });
    assert.equal(attempt.status, 'complete');
    assert.equal(attempt.outcome, 'reflected');
    assert(attempt.feedback.includes(option.consequence));
    assert(!Object.hasOwn(attempt, 'score'));
  }
});
