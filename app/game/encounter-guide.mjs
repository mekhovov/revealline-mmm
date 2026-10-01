import { t, localizedMessage } from './i18n/index.mjs';
import { CLASSES } from './core/registry.mjs';
import { validateLevel } from './core/level.mjs';
import { boundedJSON } from './data-json.mjs';
import {
  CLASSIC_SCENARIO_VERSION,
  FOUNDATION_SCENARIO_VERSION,
  RELAY_SCENARIO_VERSION,
  DIRECTIONAL_SCENARIO_VERSION,
  SENTINEL_SCENARIO_VERSION,
  validateScenario,
} from './content.mjs';

const lessons = Object.freeze({
  'optional-scout': Object.freeze({
    label: 'interface:encounterGuide.scout',
    form: 'patrolForm',
    spot: 'scoutSpot',
    risk: 'scoutRisk',
    counterplay: 'scout',
    role: 'scout',
  }),
  'optional-sentry': Object.freeze({
    label: 'interface:encounterGuide.sentry',
    form: 'patrolForm',
    spot: 'sentrySpot',
    risk: 'sentryRisk',
    counterplay: 'sentry',
    role: 'sentry',
  }),
  'trail-pursuit': Object.freeze({
    label: 'interface:trailPursuer',
    form: 'pressureForm',
    spot: 'pursuitSpot',
    risk: 'pressureRisk',
    counterplay: 'trailPursuer',
  }),
  'head-intercept': Object.freeze({
    label: 'interface:headingInterceptor',
    form: 'pressureForm',
    spot: 'interceptSpot',
    risk: 'pressureRisk',
    counterplay: 'headingInterceptor',
  }),
});
export const ENCOUNTER_GUIDE_TOPICS = Object.freeze(
  Object.entries(lessons).map(([id, lesson]) =>
    Object.freeze({ id, label: localizedMessage(lesson.label) }),
  ),
);
export const isEncounterGuideTopic = (topic) => Object.hasOwn(lessons, topic);

export function encounterGuideEntry(topic) {
  const lesson = lessons[topic];
  if (!isEncounterGuideTopic(topic)) throw new TypeError(t('errors:chooseARegisteredEnemyLesson'));
  return Object.freeze({
    id: topic,
    label: t(lesson.label),
    form: t(`interface:encounterGuide.${lesson.form}`),
    spot: t(`interface:encounterGuide.${lesson.spot}`, {
      trail: t('interface:trail'),
      head: t('interface:head'),
      aim: t('interface:aim'),
    }),
    risk: t(`interface:encounterGuide.${lesson.risk}`),
    try: t(`content:studio.actor.counterplay.${lesson.counterplay}`),
    note: t('interface:encounterGuide.note'),
  });
}

/** Authored/effective level rules decide availability; prose and current enemy
 * animation phases cannot enable a lesson. Validate before reading extensions. */
export function encounterGuideAvailability(topic, level) {
  encounterGuideEntry(topic);
  let reason = 'unavailable';
  if (level != null) {
    if (!validateLevel(level).valid) reason = 'invalid';
    else {
      const role = lessons[topic].role,
        combat = level.classic?.combatPatrols,
        present = role
          ? combat?.enabled === true && combat.actors.some((actor) => actor.role === role)
          : level.classic?.enemyPressure?.actors.some((actor) => actor.mode === topic);
      if (present) reason = 'available';
    }
  }
  return Object.freeze({ available: reason === 'available', reason });
}

/** A fresh no-awards attempt of the exact loaded level, never a new mission or
 * another tuning pass. Combined optional/pressure rules and identities survive. */
export function createEncounterGuideScenario({ topic, level, theme, turnPolicy, runOptions }) {
  const availability = encounterGuideAvailability(topic, level);
  if (!availability.available)
    throw new TypeError(t(`interface:encounterGuide.${availability.reason}`));
  const options = boundedJSON(runOptions ?? { seed: 1, classId: 'scout', classRecipes: CLASSES });
  const formats = {
    'xonix-level.v4': CLASSIC_SCENARIO_VERSION,
    'xonix-level.v5': FOUNDATION_SCENARIO_VERSION,
    'xonix-level.v6': RELAY_SCENARIO_VERSION,
    'xonix-level.v7': DIRECTIONAL_SCENARIO_VERSION,
    'xonix-level.v8': SENTINEL_SCENARIO_VERSION,
  };
  const candidate = {
    format: formats[level.version],
    level,
    theme,
    classRecipes: options.classRecipes,
    masteryDefinition: null,
    settings: { classId: options.classId, seed: options.seed, turnPolicy },
    presentation: { style: 'hybrid', showGrid: false },
    visualOverrides: {},
  };
  const checked = validateScenario(candidate);
  if (!checked.valid) throw new TypeError(checked.errors.join('\n'));
  return structuredClone(candidate);
}
