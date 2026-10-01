import { COOP_LEVEL_VERSION, COOP_RULESET, validateCoopLevel } from './core.mjs';
import {
  COOP_FOUNDATION_LEVEL_VERSION,
  COOP_FOUNDATION_RULESET,
  COOP_FOUNDATION_PACK_VERSION,
  COOP_TERRAIN_LEVEL_VERSION,
  COOP_TERRAIN_RULESET,
  COOP_TERRAIN_PACK_VERSION,
  COOP_ROVER_LEVEL_VERSION,
  COOP_ROVER_RULESET,
  COOP_ROVER_PACK_VERSION,
  COOP_BONUS_LEVEL_VERSION,
  COOP_BONUS_RULESET,
  COOP_BONUS_PACK_VERSION,
  COOP_IMPACT_LEVEL_VERSION,
  COOP_IMPACT_RULESET,
  COOP_IMPACT_PACK_VERSION,
  COOP_SPECIALIST_LEVEL_VERSION,
  COOP_SPECIALIST_RULESET,
  COOP_SPECIALIST_PACK_VERSION,
} from './foundations.mjs';

export const COOP_RECIPE_VERSION = 'revealline-coop-level-recipe.v1';
export const COOP_PACK_RECIPE_VERSION = 'revealline-coop-pack-recipe.v1';
export const COOP_PACK_VERSION = 'revealline-coop-pack.v1';
export const COOP_PACK_MAX_BYTES = 1024 * 1024;
export const COOP_PACK_MAX_LEVELS = 24;

export const COOP_TEMPLATES = Object.freeze([
  Object.freeze({
    id: 'coverage',
    name: 'Open field · team territory',
    description: 'An open field contested above and below the opening cut. Win by shared coverage.',
  }),
  Object.freeze({
    id: 'stronghold',
    name: 'Relay yard · shield and core',
    description: 'Two pillar approaches lead to paired anchors and a separately captured core.',
  }),
]);

const plain = (value) =>
  value !== null && typeof value === 'object' && Object.getPrototypeOf(value) === Object.prototype;
const dataProperties = (value) =>
  Object.values(Object.getOwnPropertyDescriptors(value)).every((property) =>
    Object.hasOwn(property, 'value'),
  );
const keys = (value, allowed) =>
  plain(value) &&
  dataProperties(value) &&
  Reflect.ownKeys(value).every((key) => allowed.includes(key));
const array = (value, maximum) =>
  Array.isArray(value) &&
  Object.getPrototypeOf(value) === Array.prototype &&
  value.length <= maximum &&
  dataProperties(value) &&
  Reflect.ownKeys(value).length === value.length + 1 &&
  Object.keys(value).every((key, index) => key === String(index));
const identifier = (value) => typeof value === 'string' && /^[a-z][a-z0-9-]{0,79}$/.test(value);
const name = (value) => typeof value === 'string' && value.trim().length > 0 && value.length <= 100;
const revision = (value) => Number.isSafeInteger(value) && value > 0 && value <= 1000000;
const result = (errors) => ({ valid: errors.length === 0, errors });
const requireValid = (validation) => {
  if (!validation.valid) throw new TypeError(validation.errors.join('\n'));
};
const templateExists = (template) => COOP_TEMPLATES.some((item) => item.id === template);
const encounterKeys = [
  'hunterWakeStep',
  'hunterRecovery',
  'hunterRange',
  'hunterAttackSpeed',
  'hunterCommitMax',
  'emitterCooldown',
];

/** These are authored layouts. Difficulty is selected by the runtime, never rolled here. */
function templateLevel(template) {
  const stronghold = template === 'stronghold';
  return {
    version: COOP_LEVEL_VERSION,
    id: stronghold ? 'relay-yard' : 'first-connection',
    revision: 1,
    name: stronghold ? 'Relay Yard' : 'First Connection',
    width: 72,
    height: 36,
    spawns: [
      { x: 0.5, y: 18.5 },
      { x: 71.5, y: 18.5 },
    ],
    walls: stronghold
      ? [
          { x: 16, y: 14, w: 2, h: 8 },
          { x: 54, y: 14, w: 2, h: 8 },
        ]
      : [],
    safeRects: [],
    enemies: stronghold
      ? [
          { id: 'yard-hunter-left', type: 'hunter', x: 28.5, y: 15.5, vx: 0, vy: 0, radius: 0.35 },
          { id: 'yard-hunter-right', type: 'hunter', x: 43.5, y: 15.5, vx: 0, vy: 0, radius: 0.35 },
          {
            id: 'yard-drifter-left',
            type: 'drifter',
            x: 28.5,
            y: 7.5,
            vx: 2.4,
            vy: 0,
            radius: 0.35,
          },
          {
            id: 'yard-drifter-right',
            type: 'drifter',
            x: 43.5,
            y: 7.5,
            vx: -2.4,
            vy: 0,
            radius: 0.35,
          },
        ]
      : [
          {
            id: 'orchard-hunter-left',
            type: 'hunter',
            x: 20.5,
            y: 9.5,
            vx: 0,
            vy: 0,
            radius: 0.35,
          },
          {
            id: 'orchard-hunter-right',
            type: 'hunter',
            x: 51.5,
            y: 9.5,
            vx: 0,
            vy: 0,
            radius: 0.35,
          },
          {
            id: 'orchard-drifter-left',
            type: 'drifter',
            x: 20.5,
            y: 26.5,
            vx: 3.2,
            vy: 1.8,
            radius: 0.35,
          },
          {
            id: 'orchard-drifter-right',
            type: 'drifter',
            x: 51.5,
            y: 26.5,
            vx: -3.2,
            vy: 1.8,
            radius: 0.35,
          },
        ],
    strongholds: stronghold
      ? [
          {
            id: 'yard-relay',
            core: { x: 35.5, y: 6.5 },
            anchors: [
              { x: 23.5, y: 11.5 },
              { x: 48.5, y: 11.5 },
            ],
          },
        ]
      : [],
    goal: stronghold ? { cores: ['yard-relay'] } : { coverage: 0.65 },
    rules: { moveSpeed: 8, boostMultiplier: 1.5 },
    encounter: {
      hunterWakeStep: 0.45,
      hunterRecovery: stronghold ? 1.2 : 1.4,
      hunterRange: 28,
      hunterAttackSpeed: stronghold ? 11 : 10.5,
      hunterCommitMax: 2.4,
      emitterCooldown: 3,
    },
  };
}

function compileRecipe(recipe) {
  const level = templateLevel(recipe.template);
  Object.assign(level, recipe.layout || {}, {
    id: recipe.id,
    revision: recipe.revision,
    name: recipe.name,
    rules: { ...level.rules, ...(recipe.rules || {}) },
    encounter: { ...level.encounter, ...(recipe.encounter || {}) },
  });
  if (
    !array(level.strongholds, 8) ||
    !level.strongholds.every((hold) => keys(hold, ['id', 'core', 'anchors']))
  )
    throw new TypeError('Strongholds must be bounded authored data.');
  level.goal =
    recipe.goal ||
    (recipe.template === 'stronghold'
      ? { cores: level.strongholds.map((stronghold) => stronghold.id) }
      : level.goal);
  return level;
}

/** Check physical access, including the core's obstacle before the anchors open it. */
function objectiveAccess(level) {
  const walls = new Set();
  const index = (point) => Math.floor(point.y) * 72 + Math.floor(point.x);
  for (const rectangle of level.walls || [])
    for (let y = rectangle.y; y < rectangle.y + rectangle.h; y++)
      for (let x = rectangle.x; x < rectangle.x + rectangle.w; x++) walls.add(y * 72 + x);
  const cores = new Set((level.strongholds || []).map((hold) => index(hold.core)));
  const reachable = (shielded) => {
    const seen = new Set(level.spawns.map(index)),
      queue = [...seen];
    for (let head = 0; head < queue.length; head++) {
      const cell = queue[head],
        x = cell % 72,
        y = Math.floor(cell / 72);
      for (const next of [
        x > 0 ? cell - 1 : -1,
        x < 71 ? cell + 1 : -1,
        y > 0 ? cell - 72 : -1,
        y < 35 ? cell + 72 : -1,
      ]) {
        if (next < 0 || seen.has(next) || walls.has(next) || (shielded && cores.has(next)))
          continue;
        seen.add(next);
        queue.push(next);
      }
    }
    return seen;
  };
  const before = reachable(true),
    after = reachable(false),
    errors = [];
  for (const hold of level.strongholds || []) {
    if (!hold.anchors.every((anchor) => before.has(index(anchor))))
      errors.push(`Stronghold ${hold.id}: both anchors need a route before the shield opens.`);
    if (!after.has(index(hold.core)))
      errors.push(`Stronghold ${hold.id}: the exposed core needs a route around authored walls.`);
  }
  return errors;
}

function inspectLevel(level) {
  const validation = validateCoopLevel(level);
  return validation.valid ? result(objectiveAccess(level)) : validation;
}

export function validateCoopRecipe(recipe) {
  if (
    !keys(recipe, [
      'version',
      'template',
      'id',
      'revision',
      'name',
      'layout',
      'rules',
      'encounter',
      'goal',
    ])
  )
    return result(['A co-op recipe must be a plain data object with supported fields.']);
  const errors = [];
  if (recipe.version !== COOP_RECIPE_VERSION)
    errors.push('Unsupported co-op level recipe version.');
  if (!templateExists(recipe.template)) errors.push('Choose the coverage or stronghold template.');
  if (!identifier(recipe.id) || !name(recipe.name) || !revision(recipe.revision))
    errors.push('A recipe needs a local ID, a name, and a positive integer revision.');
  if (
    recipe.layout !== undefined &&
    !keys(recipe.layout, ['spawns', 'walls', 'safeRects', 'enemies', 'strongholds'])
  )
    errors.push(
      'Recipe layout accepts only authored spawns, walls, safe rectangles, enemies, and strongholds.',
    );
  if (recipe.rules !== undefined && !keys(recipe.rules, ['moveSpeed', 'boostMultiplier']))
    errors.push('Recipe movement rules contain unsupported fields.');
  if (recipe.encounter !== undefined && !keys(recipe.encounter, encounterKeys))
    errors.push('Recipe encounter contains unsupported fields.');
  if (
    recipe.goal !== undefined &&
    (!keys(recipe.goal, ['coverage', 'cores']) ||
      Object.keys(recipe.goal).length !== 1 ||
      !Object.hasOwn(recipe.goal, recipe.template === 'coverage' ? 'coverage' : 'cores'))
  )
    errors.push('The goal must match the explicitly selected template.');
  if (errors.length) return result(errors);
  try {
    return inspectLevel(compileRecipe(recipe));
  } catch {
    return result(['The authored layout is incomplete or is not valid co-op data.']);
  }
}

export function createCoopLevelRecipe(template, options = {}) {
  if (!templateExists(template)) throw new TypeError('Choose the coverage or stronghold template.');
  if (!keys(options, ['id', 'revision', 'name', 'layout', 'rules', 'encounter', 'goal']))
    throw new TypeError('Unsupported co-op recipe options.');
  const defaults = templateLevel(template);
  const recipe = {
    version: COOP_RECIPE_VERSION,
    template,
    id: defaults.id,
    revision: 1,
    name: defaults.name,
    ...options,
  };
  requireValid(validateCoopRecipe(recipe));
  return structuredClone(recipe);
}

export function buildCoopLevel(recipe) {
  requireValid(validateCoopRecipe(recipe));
  return structuredClone(compileRecipe(recipe));
}

export function validateCoopPack(pack) {
  if (!keys(pack, ['version', 'ruleset', 'id', 'revision', 'name', 'levels']))
    return result(['A co-op pack must be a plain data object with supported fields.']);
  const errors = [];
  const terrain = pack.version === COOP_TERRAIN_PACK_VERSION;
  const rover = pack.version === COOP_ROVER_PACK_VERSION;
  const bonus = pack.version === COOP_BONUS_PACK_VERSION;
  const impact = pack.version === COOP_IMPACT_PACK_VERSION;
  const specialist = pack.version === COOP_SPECIALIST_PACK_VERSION;
  const foundations =
    pack.version === COOP_FOUNDATION_PACK_VERSION ||
    terrain ||
    rover ||
    bonus ||
    impact ||
    specialist;
  if (pack.version !== COOP_PACK_VERSION && !foundations)
    errors.push('Unsupported co-op pack version; solo packs are a different format.');
  if (
    pack.ruleset !==
    (specialist
      ? COOP_SPECIALIST_RULESET
      : impact
        ? COOP_IMPACT_RULESET
        : bonus
          ? COOP_BONUS_RULESET
          : rover
            ? COOP_ROVER_RULESET
            : terrain
              ? COOP_TERRAIN_RULESET
              : foundations
                ? COOP_FOUNDATION_RULESET
                : COOP_RULESET)
  )
    errors.push('This co-op pack requires a different ruleset.');
  const validRevision = foundations
    ? typeof pack.revision === 'string' && pack.revision.length > 0 && pack.revision.length <= 80
    : revision(pack.revision);
  if (!identifier(pack.id) || !name(pack.name) || !validRevision)
    errors.push(
      foundations
        ? 'A Team foundation pack needs a local ID, a name, and a pinned revision string.'
        : 'A co-op pack needs a local ID, a name, and a positive integer revision.',
    );
  if (!array(pack.levels, COOP_PACK_MAX_LEVELS) || pack.levels.length === 0)
    return result([...errors, `A co-op pack needs 1–${COOP_PACK_MAX_LEVELS} levels.`]);
  const ids = new Set();
  for (const [i, level] of pack.levels.entries()) {
    const validation = inspectLevel(level);
    errors.push(...validation.errors.map((error) => `Level ${i + 1}: ${error}`));
    if (
      validation.valid &&
      level.version !==
        (specialist
          ? COOP_SPECIALIST_LEVEL_VERSION
          : impact
            ? COOP_IMPACT_LEVEL_VERSION
            : bonus
              ? COOP_BONUS_LEVEL_VERSION
              : rover
                ? COOP_ROVER_LEVEL_VERSION
                : terrain
                  ? COOP_TERRAIN_LEVEL_VERSION
                  : foundations
                    ? COOP_FOUNDATION_LEVEL_VERSION
                    : COOP_LEVEL_VERSION)
    )
      errors.push(
        `Level ${i + 1}: ${foundations ? 'This foundation pack requires a matching Team runtime edition.' : 'This historical pack cannot contain a newer Team runtime edition.'}`,
      );
    if (validation.valid) {
      if (ids.has(level.id)) errors.push(`Duplicate co-op level ID: ${level.id}.`);
      ids.add(level.id);
    }
  }
  if (
    foundations &&
    !errors.length &&
    new Set(pack.levels.map((level) => level.journeyDifficulty)).size !== 1
  )
    errors.push('A Team foundation pack must pin one consistent difficulty.');
  if (!errors.length && new TextEncoder().encode(JSON.stringify(pack)).length > COOP_PACK_MAX_BYTES)
    errors.push('The co-op pack exceeds its 1 MiB data budget.');
  return result(errors);
}

export function buildCoopPack(recipe) {
  if (
    !keys(recipe, ['version', 'id', 'revision', 'name', 'levels']) ||
    recipe.version !== COOP_PACK_RECIPE_VERSION
  )
    throw new TypeError('Unsupported co-op pack recipe.');
  if (!array(recipe.levels, COOP_PACK_MAX_LEVELS) || recipe.levels.length === 0)
    throw new TypeError(
      `A co-op pack recipe needs 1–${COOP_PACK_MAX_LEVELS} explicit level recipes.`,
    );
  const pack = {
    version: COOP_PACK_VERSION,
    ruleset: COOP_RULESET,
    id: recipe.id,
    revision: recipe.revision,
    name: recipe.name,
    levels: recipe.levels.map(buildCoopLevel),
  };
  requireValid(validateCoopPack(pack));
  return pack;
}
