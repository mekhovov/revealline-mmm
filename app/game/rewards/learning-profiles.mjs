import { exactKeys, required } from '../data-json.mjs';

/** Reading depth is presentation only. Base knowledge, instructions and sources
 * remain visible for every choice; no profile grants or removes completion. */
export const LEARNING_PROFILE_IDS = Object.freeze(['families', 'beginners', 'hobbyists']);
export const LEARNING_PROFILE_LABELS = Object.freeze({
  en: Object.freeze({
    families: 'Schools & families',
    beginners: 'New to the subject',
    hobbyists: 'Explore further',
  }),
  uk: Object.freeze({
    families: 'Школи й родини',
    beginners: 'Знайомство з темою',
    hobbyists: 'Дослідити глибше',
  }),
});
const text = (value) => typeof value === 'string' && value.trim() && value.length <= 2048;
export function validateKnowledgeProfiles(profiles) {
  exactKeys(profiles, LEARNING_PROFILE_IDS, 'knowledge profiles');
  for (const id of LEARNING_PROFILE_IDS) {
    const locales = profiles[id];
    exactKeys(locales, ['en', 'uk'], 'knowledge profile locales');
    for (const locale of ['en', 'uk']) {
      const value = locales[locale];
      exactKeys(value, ['title', 'paragraphs'], 'knowledge profile copy');
      required(
        text(value.title) &&
          Array.isArray(value.paragraphs) &&
          value.paragraphs.length >= 1 &&
          value.paragraphs.length <= 4 &&
          value.paragraphs.every(text),
        'A reading profile needs a title and one to four bounded paragraphs in both languages.',
      );
    }
  }
}
