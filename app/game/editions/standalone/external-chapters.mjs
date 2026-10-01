/** Generic import facilities remain available; no unrelated official registry ships. */
export const SOURCE_EXTERNAL_CHAPTER = null;
export const SOURCE_EXTERNAL_CHAPTERS = Object.freeze([]);
export const SOURCE_EXTERNAL_EDITIONS = Object.freeze([]);
export function sourceExternalChapter() {
  return null;
}
export function prepareSourceExternalChapter() {
  throw new Error('This official chapter is not included in the selected edition.');
}
