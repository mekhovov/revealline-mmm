import { boundedJSON, canonicalJSON, plainObject, required } from './data-json.mjs';
import { CLASSES } from './core/registry.mjs';
import { createDifficultyContext, resolveCampaignDifficulty } from './campaign-difficulty.mjs';

export const EXECUTION_CATALOG_LIMITS = Object.freeze({
  authoredEntries: 104,
  executionEntries: 208,
  entryBytes: 32 * 1024 * 1024,
  entryNodes: 400000,
});

// Read-only provenance for derived presentation caches. This cannot register an
// external array or grant execution ownership to a copied wrapper.
const ownedEntryArrays = new WeakSet();
export const isOwnedExecutionEntries = (entries) => ownedEntryArrays.has(entries);

const freeze = (value) => {
  if (value && typeof value === 'object') {
    for (const child of Object.values(value)) freeze(child);
    Object.freeze(value);
  }
  return value;
};

function arrayValues(source) {
  required(
    Array.isArray(source) &&
      Object.getPrototypeOf(source) === Array.prototype &&
      source.length <= EXECUTION_CATALOG_LIMITS.authoredEntries,
    'Execution catalog needs at most 104 authored entries.',
  );
  const descriptors = Object.getOwnPropertyDescriptors(source);
  required(
    Reflect.ownKeys(descriptors).length === source.length + 1,
    'Execution catalog entries must be a dense JSON array.',
  );
  return Array.from({ length: source.length }, (_, index) => {
    const descriptor = descriptors[String(index)];
    required(
      descriptor?.enumerable && Object.hasOwn(descriptor, 'value'),
      'Execution catalog entries must be own data.',
    );
    return descriptor.value;
  });
}

function ownEntry(source) {
  required(plainObject(source), 'Execution catalog needs resolved entry objects.');
  // Per-entry bounds accommodate repeated resolved artwork metadata without
  // imposing a new aggregate limit on an already validated pack library.
  const entry = boundedJSON(source, {
    maxBytes: EXECUTION_CATALOG_LIMITS.entryBytes,
    maxNodes: EXECUTION_CATALOG_LIMITS.entryNodes,
    maxDepth: 24,
    maxArray: 4096,
    maxString: 6 * 1024 * 1024,
  });
  required(plainObject(entry.campaign), 'Execution entry needs a campaign.');
  return entry;
}

/** Trusted resolved wrappers in catalog order; no image decode or registration. */
export function createExecutionCatalog(authoredEntries) {
  const entries = [],
    byKey = new Map(),
    byBase = new Map();
  for (const source of arrayValues(authoredEntries)) {
    const owned = ownEntry(source),
      standard = createDifficultyContext(owned.campaign),
      gentle = createDifficultyContext(owned.campaign, 'gentle');
    if (Object.hasOwn(owned, 'classRecipes'))
      required(
        canonicalJSON(owned.classRecipes) ===
          canonicalJSON(standard.campaign.classRecipes ?? CLASSES),
        'Execution entry equipment differs from its campaign.',
      );
    for (const context of [standard, gentle]) {
      const previous = byKey.get(context.campaignKey);
      if (previous) {
        required(
          previous.baseCampaignKey === context.baseCampaignKey &&
            previous.difficulty === context.mode,
          'Execution campaign key belongs to different base/difficulty owners.',
        );
        // Same owner retains the first resolved metadata, as the authored
        // catalog already does. Equal execution data never excuses new owners.
        continue;
      }
      const entry = freeze({
        ...owned,
        campaign: context.campaign,
        baseCampaign: standard.campaign,
        baseCampaignKey: context.baseCampaignKey,
        difficulty: context.mode,
        policyVersion: context.policyVersion,
        executionKey: context.campaignKey,
      });
      entries.push(entry);
      byKey.set(entry.executionKey, entry);
      if (!byBase.has(entry.baseCampaignKey)) byBase.set(entry.baseCampaignKey, new Map());
      byBase.get(entry.baseCampaignKey).set(entry.difficulty, entry);
    }
  }
  Object.freeze(entries);
  ownedEntryArrays.add(entries);
  return Object.freeze({
    entries,
    find(executionKey) {
      return typeof executionKey === 'string' ? (byKey.get(executionKey) ?? null) : null;
    },
    select(baseCampaignKey, mode) {
      resolveCampaignDifficulty(mode);
      return typeof baseCampaignKey === 'string'
        ? (byBase.get(baseCampaignKey)?.get(mode) ?? null)
        : null;
    },
  });
}

/** Trusted backup hook: same ownership checks, full campaigns, no runtime handles. */
export function expandDifficultyCampaigns(authoredCampaigns) {
  const wrappers = arrayValues(authoredCampaigns).map((campaign) => ({ campaign }));
  return Object.freeze(createExecutionCatalog(wrappers).entries.map((entry) => entry.campaign));
}
