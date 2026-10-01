import { exactKeys, required } from '../data-json.mjs';

const text = (value) => typeof value === 'string' && value.trim() && value.length <= 2048;
const prose = ['title', 'role', 'brief', 'notice', 'success'];

/** Translations can describe the same fixture, never supply alternative IDs,
 * answers, option values, sources or completion semantics. */
export function validateLessonLocalization(lesson) {
  if (lesson.locales === undefined) return;
  exactKeys(lesson.locales, ['uk'], 'lesson translations');
  const copy = lesson.locales.uk;
  required(copy, 'A translated lesson needs its Ukrainian copy.');
  exactKeys(copy, [...prose, 'records', 'fields'], 'translated lesson');
  for (const field of prose) required(text(copy[field]), 'Missing translated lesson prose.');
  required(
    Array.isArray(copy.records) &&
      copy.records.length === lesson.records.length &&
      Array.isArray(copy.fields) &&
      copy.fields.length === lesson.fields.length,
    'Translations must cover the exact fixture records and fields.',
  );
  for (const [index, record] of copy.records.entries()) {
    exactKeys(record, ['id', 'title', 'lines'], 'translated evidence');
    required(
      record.id === lesson.records[index].id &&
        text(record.title) &&
        Array.isArray(record.lines) &&
        record.lines.length > 0 &&
        record.lines.length <= 12 &&
        record.lines.every(text),
      'Translated evidence must retain its exact record identity.',
    );
  }
  for (const [index, field] of copy.fields.entries()) {
    const original = lesson.fields[index];
    exactKeys(field, ['id', 'label', 'explanation', 'options'], 'translated decision');
    required(
      field.id === original.id &&
        text(field.label) &&
        text(field.explanation) &&
        Array.isArray(field.options) &&
        field.options.length === original.options.length,
      'Translated decisions must retain their exact field identity.',
    );
    for (const [optionIndex, option] of field.options.entries()) {
      exactKeys(option, ['value', 'label', 'consequence'], 'translated option');
      required(
        option.value === original.options[optionIndex].value &&
          text(option.label) &&
          (lesson.kind === 'reflection'
            ? text(option.consequence)
            : option.consequence === undefined),
        'Translated choices cannot change their value or completion behavior.',
      );
    }
  }
}

/** A read-only display projection. Always reduce/verify the original lesson. */
export function localizeCompanyLesson(lesson, locale) {
  const copy = locale === 'uk' ? lesson.locales?.uk : null;
  return copy ? { ...lesson, ...copy } : lesson;
}

export function localizeLearningFeedback(lesson, attempt, locale, translate) {
  if (attempt.actions.at(-1)?.type !== 'commit') return [];
  const copy = localizeCompanyLesson(lesson, locale),
    feedback = [];
  for (const record of copy.records)
    if (!attempt.inspected.includes(record.id))
      feedback.push(translate('inspectBefore', { title: record.title }));
  for (const [index, field] of copy.fields.entries()) {
    if (!Object.hasOwn(attempt.configuration, field.id))
      feedback.push(translate('chooseBefore', { label: field.label.toLowerCase() }));
    else if (
      lesson.kind === 'practice' &&
      attempt.configuration[field.id] !== lesson.fields[index].expected
    )
      feedback.push(field.explanation);
  }
  if (!feedback.length && attempt.status === 'complete') {
    if (lesson.kind === 'reflection')
      for (const field of copy.fields)
        feedback.push(
          field.options.find((option) => option.value === attempt.configuration[field.id])
            .consequence,
        );
    feedback.push(copy.success);
  }
  return feedback;
}
