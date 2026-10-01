// Standalone general-flight course content is excluded from this community app.
import { denyBrandedImport } from './branded-isolation.mjs';
export const FIRST_FLIGHT_LESSONS = Object.freeze([]);
export function resolveCourseRequest() { return null; }
export const getFirstFlightLesson = denyBrandedImport;
export const createLessonScenario = denyBrandedImport;
export const captureLessonFacts = denyBrandedImport;
export const createLessonObserver = denyBrandedImport;
