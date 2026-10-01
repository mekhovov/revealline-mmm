import { dataIdentity } from '../data-json.mjs';
import { validateCompanyLesson } from '../company-campaigns/learning.mjs';

/** Exact authored lesson reference, shared by admission, authoring and the host.
 * This describes a requirement; it never establishes learning completion. */
export function completionLearningReference(input) {
  const lesson = validateCompanyLesson(input);
  return Object.freeze({
    lessonId: lesson.id,
    lessonRevision: lesson.revision,
    fixtureRevision: lesson.fixtureRevision,
    lessonIdentity: dataIdentity(lesson),
    missionId: lesson.missionId,
  });
}
