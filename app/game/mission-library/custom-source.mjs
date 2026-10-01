import { canonicalJSON } from '../data-json.mjs';
import { resolvePackCampaign } from '../packs.mjs';
import { campaignKey } from '../library.mjs';
import { preparedPackIdentity } from './pack-identity.mjs';
import { LIBRARY_MODES, LIBRARY_TAGS } from './library.mjs';

const ENTRY_FIELDS = [
  'campaign',
  'classRecipes',
  'themes',
  'visualOverrides',
  'levelVisuals',
  'music',
  'sourcePackFormat',
  'masteries',
  'sourcePackId',
];
function assertEntryCurrent(entry, original) {
  if (ENTRY_FIELDS.some((field) => canonicalJSON(entry[field]) !== canonicalJSON(original[field])))
    throw new Error('This Custom mission changed. Refresh the library before playing.');
}

/** owners: [{pack, entries}], using exact prepared installed pack objects and all
 * original resolved campaign entries. Do not pass Gentle execution projections.
 * Callbacks receive {pack,entry,level,levelIndex,selection} with original references
 * intact. selection is an immutable scalar target; use it after asynchronous work
 * and re-resolve through the exact prepared pack, not the mutable entry clones.
 * A host must explicitly return its supported modes; [] omits an unsupported map.
 * Official exclusion requires a positively verified boolean, never a name match.
 */
export async function customLibrarySources(
  owners,
  {
    isOfficial = () => false,
    compatibility,
    describe,
    availability,
    prepare,
    launch,
    progress,
    progressState,
    card,
  } = {},
) {
  if (
    !Array.isArray(owners) ||
    owners.length > 12 ||
    [isOfficial, compatibility, describe, availability, launch].some(
      (fn) => typeof fn !== 'function',
    ) ||
    [prepare, progress, progressState, card].some(
      (fn) => fn !== undefined && typeof fn !== 'function',
    )
  )
    throw new TypeError('Custom browsing needs bounded owners and explicit host adapters.');
  const sources = [],
    packIds = new Set();
  for (const owner of owners) {
    const { pack, entries } = owner ?? {};
    if (
      !pack ||
      !Array.isArray(pack.campaigns) ||
      !pack.campaigns.length ||
      !Array.isArray(entries) ||
      entries.length !== pack.campaigns.length ||
      packIds.has(pack.id)
    )
      throw new TypeError(
        'Custom browsing needs each exact installed pack and its authored campaigns once.',
      );
    // resolvePackCampaign rejects raw/unprepared lookalikes. This lookup performs
    // no fetch or image decode, and is never called while rendering a card.
    const resolved = pack.campaigns.map((campaign) => resolvePackCampaign(pack, campaign.id));
    packIds.add(pack.id);
    const byCampaign = new Map();
    for (const entry of entries) {
      if (!entry?.campaign || entry.sourcePackId !== pack.id || byCampaign.has(entry.campaign.id))
        throw new TypeError('Custom campaign entry belongs to another or duplicate pack owner.');
      byCampaign.set(entry.campaign.id, entry);
    }
    for (const reference of resolved) {
      const entry = byCampaign.get(reference.campaign.id);
      if (!entry || canonicalJSON(entry.campaign) !== canonicalJSON(reference.campaign))
        throw new TypeError('Custom campaign differs from its prepared installed pack.');
      for (const field of [
        'classRecipes',
        'themes',
        'visualOverrides',
        'levelVisuals',
        'music',
        'sourcePackFormat',
        'masteries',
      ]) {
        if (canonicalJSON(entry[field]) !== canonicalJSON(reference[field]))
          throw new TypeError(
            'Custom presentation or equipment differs from its prepared installed pack.',
          );
      }
    }
    const official = await isOfficial(pack);
    if (typeof official !== 'boolean')
      throw new TypeError('Official verification must return an explicit boolean.');
    if (official) continue;
    const { sha256: editionId } = await preparedPackIdentity(pack);
    const rows = [],
      descriptions = new WeakMap(),
      originals = new WeakMap();
    function assertBinding(binding) {
      const original = originals.get(binding);
      if (!original || binding.entry.campaign?.levels?.[binding.levelIndex] !== binding.level)
        throw new Error('This Custom mission changed. Refresh the library before playing.');
      // Full rule/presentation comparison happens only on deliberate action, not
      // while browsing cards. Original references remain intact and are not frozen.
      assertEntryCurrent(binding.entry, original);
    }
    for (const reference of resolved) {
      const entry = byCampaign.get(reference.campaign.id);
      assertEntryCurrent(entry, reference); // Async verification cannot adopt mutated clones.
      const key = campaignKey(reference.campaign);
      for (const [levelIndex, level] of entry.campaign.levels.entries()) {
        const authored = reference.campaign.levels[levelIndex];
        const selection = Object.freeze({
          sourcePackId: pack.id,
          campaignId: reference.campaign.id,
          campaignKey: key,
          levelId: authored.id,
          levelRevision: authored.revision,
          levelIndex,
          editionId,
        });
        const binding = Object.freeze({ pack, entry, level, levelIndex, selection });
        originals.set(binding, reference);
        const modes = compatibility(binding);
        if (
          !Array.isArray(modes) ||
          new Set(modes).size !== modes.length ||
          modes.some((mode) => !LIBRARY_MODES.includes(mode))
        )
          throw new TypeError('Custom mode compatibility must be an explicit supported-mode list.');
        if (!modes.length) continue;
        const info = describe(binding);
        if (
          !info ||
          typeof info.rules !== 'string' ||
          info.rules.length > 2048 ||
          (info.hook !== undefined && (typeof info.hook !== 'string' || info.hook.length > 2048)) ||
          (info.tags !== undefined &&
            (!Array.isArray(info.tags) ||
              info.tags.some(
                (tag) => !LIBRARY_TAGS.includes(tag) || ['Journey', 'Classic'].includes(tag),
              )))
        )
          throw new TypeError('Custom descriptions need actual rules and valid textual tags.');
        rows.push(binding);
        descriptions.set(
          binding,
          Object.freeze({
            id: selection.levelId,
            revision: selection.levelRevision,
            campaignKey: key,
            campaignTitle:
              reference.campaign.title || reference.campaign.name || reference.campaign.id,
            name: authored.name || authored.id,
            levelIndex,
            modes: Object.freeze([...modes]),
            rules: info.rules,
            tags: Object.freeze([...(info.tags ?? [])]),
            hook: info.hook ?? '',
          }),
        );
      }
    }
    if (!rows.length) continue;
    sources.push({
      id: JSON.stringify(['custom', pack.id]),
      collection: 'Custom',
      editionId,
      edition: `${pack.name} · ${pack.version}`.slice(0, 160),
      entries: Object.freeze(rows),
      describe(binding) {
        const info = descriptions.get(binding);
        if (!info) throw new TypeError('Custom mission does not belong to this source.');
        return info;
      },
      availability,
      prepare: prepare
        ? async (binding, context) => {
            assertBinding(binding);
            const result = await prepare(binding, context);
            assertBinding(binding);
            return result;
          }
        : undefined,
      launch(binding, context) {
        assertBinding(binding);
        return launch(binding, context);
      },
      progress,
      progressState,
      card,
    });
  }
  return sources;
}
