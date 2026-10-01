import { contentText } from '../i18n/content.mjs';
import { t } from '../i18n/index.mjs';

const sourceEditions = new WeakMap();

/** Retain the complete serializable edition separately from its host actions.
 * Translation identity includes the original gameplay and picture digests. */
export function presentSourceChapter(edition, actions) {
  const chapter = { ...actions };
  sourceEditions.set(chapter, edition);
  return chapter;
}

export function optionalChapterText(chapter, field) {
  const edition = sourceEditions.get(chapter);
  // A host changing the presented text must not inherit an older translation.
  return contentText(edition && edition[field] === chapter[field] ? edition : chapter, field);
}

const modeKeys = Object.freeze({
  Arcade: 'interface:arcade',
  Tactical: 'interface:tactical',
  Other: 'interface:otherMixed',
});
export const worldModeLabel = (mode) => (modeKeys[mode] ? t(modeKeys[mode]) : mode);

const themeKeys = Object.freeze({
  fpv: 'interface:fpvFront',
  ukraine: 'interface:ukraineAtlas',
  retro: 'content:1994Forever',
  coupa: 'interface:spendNetwork',
});
export const worldThemeLabel = (theme) => (themeKeys[theme] ? t(themeKeys[theme]) : theme);
