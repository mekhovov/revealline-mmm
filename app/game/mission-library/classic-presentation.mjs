import { contentText, isRegisteredContent } from '../i18n/content.mjs';
import { t, getLocale, formatNumber } from '../i18n/index.mjs';
import { CLASSIC_RULES_CURRENT } from './classic-current-rules.mjs';

const DIFFICULTY_KEYS = {
  standard: 'interface:missionLibrary.difficulty.standard',
  gentle: 'interface:missionLibrary.difficulty.gentle',
  expert: 'interface:missionLibrary.difficulty.expert',
};

function rulesText(original) {
  // The canonical English summary and every unregistered/edited record retain
  // their authored text. Only exact shipped metadata has a known numeric schema.
  if (getLocale() === 'en' || !isRegisteredContent(original)) return original.rules;
  const rules = original.ruleDetails;
  return [
    t('interface:missionLibrary.classic.coverage', {
      coverage: formatNumber(Math.round(rules.coverage * 1000) / 10),
    }),
    t('common:counts.lives', { count: rules.lives }),
    t('common:units.cellsPerSecond', { speed: formatNumber(rules.moveSpeed) }),
    rules.timeLimitSeconds
      ? t('interface:missionLibrary.classic.timeLimit', {
          seconds: formatNumber(rules.timeLimitSeconds),
        })
      : t('interface:missionLibrary.classic.noCountdown'),
    original.tags.includes('Arcade')
      ? t('interface:missionLibrary.classic.directionOnly')
      : t('interface:missionLibrary.classic.manualActions'),
    t('common:counts.enemies', {
      count: rules.enemies.reduce((sum, enemy) => sum + enemy.count, 0),
    }),
  ].join(' · ');
}

export function classicMissionPresentation(original, rulesEdition) {
  return {
    name: contentText(original, 'name'),
    campaignTitle: contentText(original, 'campaignTitle'),
    edition: t(
      rulesEdition === CLASSIC_RULES_CURRENT
        ? 'interface:missionLibrary.classic.editionCurrent'
        : 'interface:missionLibrary.classic.editionOriginal',
      { edition: contentText(original, 'edition') },
    ),
  };
}

export function classicMissionDetails(original, rulesEdition, mode) {
  const current = rulesEdition === CLASSIC_RULES_CURRENT;
  return {
    challenge: t(
      current
        ? mode === 'versus'
          ? 'interface:missionLibrary.classic.challengeCurrentVersus'
          : 'interface:missionLibrary.classic.challengeCurrent'
        : mode === 'versus'
          ? 'interface:missionLibrary.classic.challengeOriginalVersus'
          : 'interface:missionLibrary.classic.challengeOriginal',
      { rules: rulesText(original) },
    ),
    route: t('interface:missionLibrary.classic.difficultySettings', {
      difficulties: original.difficultiesByMode[mode]
        .map((preset) => t(DIFFICULTY_KEYS[preset]))
        .join(', '),
    }),
  };
}
