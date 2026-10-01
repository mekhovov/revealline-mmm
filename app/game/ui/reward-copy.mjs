import { t } from '../i18n/index.mjs';

// These IDs are produced by progress.mjs, not read from imported content.
// Keep canonical derived records and their award rules outside presentation.
const milestoneNames = Object.freeze({
  'first-clear': 'common:rewards.firstClear',
  'chapter-explorer': 'common:rewards.chapterExplorer',
});
const achievementNames = Object.freeze({
  'first-light': 'interface:achievements.firstLight.name',
  'clear-skies': 'interface:achievements.clearSkies.name',
  pathfinder: 'interface:achievements.pathfinder.name',
  'golden-line': 'interface:achievements.goldenLine.name',
  'last-light': 'interface:achievements.lastLight.name',
});
const achievementDescriptions = Object.freeze({
  'first-light': 'interface:achievements.firstLight.description',
  'clear-skies': 'interface:achievements.clearSkies.description',
  pathfinder: 'interface:achievements.pathfinder.description',
  'golden-line': 'interface:achievements.goldenLine.description',
  'last-light': 'interface:achievements.lastLight.description',
});

export function milestoneName(milestone) {
  const key = milestoneNames[milestone.id];
  return key ? t(key) : milestone.name;
}
export function achievementName(achievement) {
  const key = achievementNames[achievement.id];
  return key ? t(key) : achievement.name;
}
export function achievementDescription(achievement, target) {
  const key = achievementDescriptions[achievement.id];
  return key ? t(key, { count: target }) : achievement.description;
}
