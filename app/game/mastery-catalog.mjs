import { boundedJSON, canonicalJSON, dataIdentity, plainObject, stableId } from './data-json.mjs';
import { CLASSES, rosterHash, validateClassRecipes } from './core/registry.mjs';
import {
  LEGACY_VERSIONS,
  ENCOUNTER_VERSIONS,
  WIDE_VERSIONS,
  CLASSIC_VERSIONS,
  FOUNDATION_VERSIONS,
  RELAY_VERSIONS,
  DIRECTIONAL_VERSIONS,
  SENTINEL_VERSIONS,
  versionsForCampaign,
} from './core/versions.mjs';
import { normalizedLevel } from './core/level.mjs';
import { createRun } from './core/index.mjs';
import {
  STEADY_SIGNAL,
  SUPPLY_LINE,
  SAFE_RETURN,
  resolveMasteryDefinition,
  masteryDefinitionIdentity,
  captureMasterySetup,
  captureMasteryFacts,
  createMasteryObserver,
} from './mastery.mjs';

export const MASTERY_CATALOG_LIMITS = Object.freeze({
  entries: 104,
  levels: 1664,
  campaignLevels: 128,
  campaignDefinitions: 128,
  maxBytes: 64 * 1024 * 1024,
  maxNodes: 400000,
});
const freeze = (value) => {
  if (value && typeof value === 'object') {
    for (const child of Object.values(value)) freeze(child);
    Object.freeze(value);
  }
  return value;
};
const requireValue = (condition, message) => {
  if (!condition) throw new TypeError(message);
};
const text = (value, max) =>
  typeof value === 'string' && value.trim().length > 0 && value.length <= max;
const exact = (value, required, optional, label) => {
  requireValue(
    plainObject(value) &&
      required.every((key) => Object.hasOwn(value, key)) &&
      Object.keys(value).every((key) => required.includes(key) || optional.includes(key)),
    `${label} has missing or unsupported fields.`,
  );
};
const copy = (source) =>
  boundedJSON(source, {
    maxBytes: MASTERY_CATALOG_LIMITS.maxBytes,
    maxNodes: MASTERY_CATALOG_LIMITS.maxNodes,
    maxDepth: 20,
    maxArray: MASTERY_CATALOG_LIMITS.levels,
    maxString: 65536,
  });
const HOMEWARD = Object.freeze({
  campaignKey: 'homeward-skies/1/0d01f5687b3c38ff',
  levelRevision: '1',
  rosterHash: 'roster-v1-e159e435',
  ruleset: 'xonix-core.v2',
});

/** Immutable shipped fallbacks. Original definition references and hashes are retained. */
export const BUILTIN_MASTERY_REGISTRATIONS = freeze(
  [
    [STEADY_SIGNAL, 'level-v1-5983ec4eaf745012'],
    [SUPPLY_LINE, 'level-v1-f1c1d86b070b5419'],
    [SAFE_RETURN, 'level-v1-03b703a6160004fc'],
  ].map(([definition, levelIdentity]) => ({
    ...HOMEWARD,
    levelId: definition.levelId,
    levelIdentity,
    definition,
    definitionIdentity: masteryDefinitionIdentity(definition),
  })),
);

export function builtinMasteryRegistration(campaignKey, levelId) {
  return (
    BUILTIN_MASTERY_REGISTRATIONS.find(
      (entry) => entry.campaignKey === campaignKey && entry.levelId === levelId,
    ) ?? null
  );
}

function campaignContext(source) {
  exact(
    source,
    ['version', 'id', 'revision', 'title', 'levels'],
    ['classRecipes', 'classIds', 'themeId', 'musicId', 'briefs'],
    'Mastery campaign',
  );
  requireValue(
    source.version === 'xonix-campaign.v1' &&
      stableId(source.id) &&
      text(source.revision, 60) &&
      text(source.title, 160),
    'Invalid mastery campaign identity.',
  );
  for (const key of ['themeId', 'musicId'])
    requireValue(source[key] === undefined || stableId(source[key]), `Invalid campaign ${key}.`);
  requireValue(
    Array.isArray(source.levels) &&
      source.levels.length >= 1 &&
      source.levels.length <= MASTERY_CATALOG_LIMITS.campaignLevels,
    'Campaign must contain 1..128 maps.',
  );
  requireValue(
    source.briefs === undefined ||
      (Array.isArray(source.briefs) &&
        source.briefs.length <= source.levels.length &&
        source.briefs.every((brief) => text(brief, 4096))),
    'Invalid built-in campaign briefs.',
  );
  const recipes = source.classRecipes ?? CLASSES,
    checked = validateClassRecipes(recipes);
  requireValue(checked.valid, `Invalid mastery equipment: ${checked.errors.join('; ')}`);
  requireValue(
    recipes.every((recipe) => stableId(recipe.id)),
    'Invalid mastery recipe ID.',
  );
  if (source.classIds !== undefined) {
    requireValue(
      Array.isArray(source.classIds) &&
        source.classIds.length >= 1 &&
        source.classIds.length <= 40 &&
        source.classIds.every((id) => stableId(id) && recipes.some((recipe) => recipe.id === id)) &&
        new Set(source.classIds).size === source.classIds.length,
      'Invalid filtered mastery roster.',
    );
  }
  // This is exactly resolvePackCampaign's filtering policy: preserve recipe order.
  const classRecipes = recipes.filter(
    (recipe) => !source.classIds || source.classIds.includes(recipe.id),
  );
  const levels = source.levels.map((level) => {
    requireValue(
      plainObject(level) && stableId(level.id) && text(level.revision, 80),
      'Invalid mastery map identity.',
    );
    return normalizedLevel(level);
  });
  requireValue(
    new Set(levels.map((level) => level.id)).size === levels.length,
    'Duplicate map ID in mastery campaign.',
  );
  // Keep the existing library.campaignKey projection byte-compatible. Importing
  // the library here would tie pack validation back to persistence; tests pin both.
  const versions = versionsForCampaign(source);
  const campaignKey = `${source.id}/${encodeURIComponent(source.revision)}/${dataIdentity({ ruleset: versions.ruleset, levels, classRecipes })}`;
  return {
    id: source.id,
    levels,
    classRecipes,
    campaignKey,
    versions,
    rosterHash: rosterHash(classRecipes),
  };
}
const boardMetadata = (context, level) => ({
  campaignKey: context.campaignKey,
  levelId: level.id,
  levelIdentity: `${context.versions.ruleset === LEGACY_VERSIONS.ruleset ? 'level-v1' : 'level-v2'}-${dataIdentity(level)}`,
  levelRevision: level.revision,
  rosterHash: context.rosterHash,
  ruleset: context.versions.ruleset,
});
const registrationIdentity = (value) =>
  canonicalJSON({
    ...value,
    definition: value.definition ? resolveMasteryDefinition(value.definition) : null,
  });

function registration(context, source) {
  requireValue(
    context.versions.ruleset === LEGACY_VERSIONS.ruleset,
    'Optional mastery definitions are supported only for legacy core v2 maps.',
  );
  const definition = resolveMasteryDefinition(source);
  const level = context.levels.find((item) => item.id === definition.levelId);
  requireValue(
    definition.campaignId === context.id && level,
    'Mastery definition belongs to another campaign or map.',
  );
  const predicates = definition.all,
    recipes = context.classRecipes;
  if (predicates.some((item) => item.type === 'resistant-cut-cells'))
    requireValue(
      recipes.some((recipe) => recipe.signalResistance === true),
      'Mastery needs signal-resistant equipment in this campaign roster.',
    );
  else if (predicates.some((item) => item.type === 'live-cut-impact'))
    requireValue(
      recipes.some((recipe) => recipe.primitive === 'impact-pulse'),
      'Mastery needs impact-pulse equipment in this campaign roster.',
    );
  else {
    const target = predicates.find((item) => item.type === 'hangar-switch').classId;
    requireValue(
      recipes.some((recipe) => recipe.id === target) &&
        recipes.some((recipe) => recipe.id !== target),
      'Mastery needs the target and a distinct switchable recipe.',
    );
    requireValue(
      recipes.some(
        (recipe) => ['stun-field', 'slow-field'].includes(recipe.primitive) && recipe.capacity > 0,
      ),
      'Mastery needs supply-consuming equipment in this campaign roster.',
    );
    requireValue(
      recipes.some((recipe) => ['stun-field', 'impact-pulse'].includes(recipe.primitive)),
      'Mastery needs equipment that can suppress signal regions.',
    );
  }
  // Reuse the current observer's exact reference validation and normalized
  // default-hangar semantics. Creating a fresh state executes no gameplay ticks.
  const state = createRun(level, {
    seed: 1,
    classId: recipes[0].id,
    classRecipes: recipes,
    turnPolicy: 'immediate',
  });
  const binding = {
    campaignId: context.id,
    campaignKey: context.campaignKey,
    runId: 'mastery-context-validation',
    definition,
  };
  createMasteryObserver({
    definition,
    setup: captureMasterySetup(state, binding),
    initial: captureMasteryFacts(state, binding),
  });
  return {
    ...boardMetadata(context, level),
    definition,
    definitionIdentity: masteryDefinitionIdentity(definition),
  };
}

/** Owned context metadata, not award authority or a proof that the route is solvable. */
export function resolveMasteryContext(source) {
  const value = copy(source);
  exact(value, ['campaign', 'definition'], [], 'Mastery context');
  return freeze(registration(campaignContext(value.campaign), value.definition));
}

/** Preflight campaign entries only. Never pass images, pack objects or earned records. */
export function createMasteryCatalog(source) {
  const entries = copy(source);
  requireValue(
    Array.isArray(entries) && entries.length <= MASTERY_CATALOG_LIMITS.entries,
    'Mastery catalog has too many campaign entries.',
  );
  const boards = new Map(),
    registrations = [];
  let totalLevels = 0;
  for (const entry of entries) {
    exact(
      entry,
      ['campaign', 'sourcePackId'],
      ['sourcePackFormat', 'masteries'],
      'Mastery catalog entry',
    );
    requireValue(
      entry.sourcePackId === null || stableId(entry.sourcePackId),
      'Invalid mastery source pack ID.',
    );
    const format = entry.sourcePackFormat ?? 'xonix-pack.v1';
    requireValue(
      [
        'xonix-pack.v1',
        'xonix-pack.v2',
        'xonix-pack.v3',
        'xonix-pack.v4',
        'xonix-pack.v5',
        'xonix-pack.v6',
        'xonix-pack.v7',
        'xonix-pack.v8',
        'xonix-pack.v9',
      ].includes(format),
      'Unsupported mastery source pack format.',
    );
    requireValue(
      !Object.hasOwn(entry, 'sourcePackFormat') || entry.sourcePackFormat === format,
      'A source format must be explicit text or omitted.',
    );
    const directional = format === 'xonix-pack.v8' || format === 'xonix-pack.v9';
    const relays = format === 'xonix-pack.v7' || directional;
    const foundations = format === 'xonix-pack.v6' || relays;
    const classic = format === 'xonix-pack.v5' || foundations;
    const wide = format === 'xonix-pack.v4';
    const encounter = format === 'xonix-pack.v3';
    const authored = format === 'xonix-pack.v2' || encounter || wide || classic;
    requireValue(
      authored ? Array.isArray(entry.masteries) : !Object.hasOwn(entry, 'masteries'),
      authored
        ? 'A v2/v3/v4/v5 mastery catalog entry requires its explicit masteries array.'
        : 'A v1 entry cannot declare masteries.',
    );
    const context = campaignContext(entry.campaign),
      byLevel = new Map(),
      definitionIds = new Set();
    requireValue(
      context.versions.ruleset ===
        (format === 'xonix-pack.v9'
          ? SENTINEL_VERSIONS.ruleset
          : directional
            ? DIRECTIONAL_VERSIONS.ruleset
            : relays
              ? RELAY_VERSIONS.ruleset
              : foundations
                ? FOUNDATION_VERSIONS.ruleset
                : classic
                  ? CLASSIC_VERSIONS.ruleset
                  : wide
                    ? WIDE_VERSIONS.ruleset
                    : encounter
                      ? ENCOUNTER_VERSIONS.ruleset
                      : LEGACY_VERSIONS.ruleset),
      'Pack format and campaign simulation versions differ.',
    );
    requireValue(
      !(encounter || wide || classic) || entry.masteries.length === 0,
      classic
        ? 'Classic pack v5 requires masteries: []; optional goals are not supported.'
        : wide
          ? 'Wide pack v4 requires masteries: []; optional goals are not supported.'
          : 'Encounter pack v3 requires masteries: []; encounter goals are not supported.',
    );
    totalLevels += context.levels.length;
    requireValue(
      totalLevels <= MASTERY_CATALOG_LIMITS.levels,
      'Mastery catalog has too many maps.',
    );
    if (authored) {
      requireValue(
        entry.masteries.length <= MASTERY_CATALOG_LIMITS.campaignDefinitions,
        'Too many campaign mastery definitions.',
      );
      for (const definition of entry.masteries) {
        const resolved = registration(context, definition);
        requireValue(
          !byLevel.has(resolved.levelId) && !definitionIds.has(resolved.definition.id),
          'Duplicate mastery map or definition ID in campaign.',
        );
        byLevel.set(resolved.levelId, resolved);
        definitionIds.add(resolved.definition.id);
      }
    } else {
      for (const level of context.levels) {
        const fallback = builtinMasteryRegistration(context.campaignKey, level.id);
        if (!fallback) continue;
        const resolved = registration(context, fallback.definition);
        requireValue(
          registrationIdentity(resolved) === registrationIdentity(fallback),
          'Built-in mastery content differs from its pinned registration.',
        );
        byLevel.set(level.id, fallback);
      }
    }
    for (const level of context.levels) {
      const key = `${context.campaignKey}\n${level.id}`,
        effective = byLevel.get(level.id) ?? null;
      const value = {
        ...boardMetadata(context, level),
        definition: effective?.definition ?? null,
        definitionIdentity: effective?.definitionIdentity ?? null,
      };
      const previous = boards.get(key);
      if (previous) {
        requireValue(
          registrationIdentity(previous.value) === registrationIdentity(value),
          `Conflicting mastery for ${context.campaignKey}/${level.id} between ${previous.sourcePackId ?? 'base campaign'} and ${entry.sourcePackId ?? 'base campaign'} (${previous.value.definition?.id ?? 'none'} versus ${value.definition?.id ?? 'none'}).`,
        );
      } else {
        boards.set(key, { value, registration: effective, sourcePackId: entry.sourcePackId });
        if (effective) registrations.push(effective);
      }
    }
  }
  freeze(registrations);
  return Object.freeze({
    registrations,
    get(campaignKey, levelId) {
      if (typeof campaignKey !== 'string' || typeof levelId !== 'string') return null;
      return boards.get(`${campaignKey}\n${levelId}`)?.registration ?? null;
    },
  });
}
