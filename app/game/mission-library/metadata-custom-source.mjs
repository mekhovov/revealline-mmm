import { isPackLibraryMetadata } from '../packs.mjs';
import { campaignKey } from '../library.mjs';
import { LIBRARY_MODES } from './library.mjs';

/** Browse an inspected, non-runtime inventory without decoding installed art.
 * These bindings deliberately contain metadata, NOT prepared pack owners.
 * The host must confirm its storage snapshot and perform genuine preparation on
 * deliberate Play before handing any pack/entry to gameplay. Matching display
 * identities never grant runtime authority or original-picture readiness.
 */
export async function metadataCustomLibrarySources(
  metadata,
  {
    isCurrent,
    isOfficial = () => false,
    compatibility,
    describe,
    availability,
    launch,
    prepare,
    progress,
    progressState,
  } = {},
) {
  if (
    !isPackLibraryMetadata(metadata) ||
    [isCurrent, isOfficial, compatibility, describe, availability, launch].some(
      (fn) => typeof fn !== 'function',
    ) ||
    [prepare, progress, progressState].some((fn) => fn !== undefined && typeof fn !== 'function')
  )
    throw new TypeError(
      'Metadata browsing needs an inspected inventory and explicit owner adapters.',
    );
  const current = () => {
    if (isCurrent(metadata) !== true)
      throw new Error('Installed content changed. Refresh the mission library before playing.');
  };
  current();
  const sources = [];
  for (const pack of metadata.packs) {
    const official = await isOfficial(pack);
    current();
    if (typeof official !== 'boolean')
      throw new TypeError('Official verification must return an explicit boolean.');
    if (official) continue;
    const entries = [],
      descriptions = new WeakMap();
    for (const entry of pack.entries) {
      const key = campaignKey(entry.campaign);
      for (const [levelIndex, level] of entry.campaign.levels.entries()) {
        const selection = Object.freeze({
          sourcePackId: pack.id,
          campaignId: entry.campaign.id,
          campaignKey: key,
          levelId: level.id,
          levelRevision: level.revision,
          levelIndex,
          editionId: pack.identity.sha256,
        });
        const binding = Object.freeze({ pack, entry, level, levelIndex, selection });
        const modes = compatibility(binding);
        if (
          !Array.isArray(modes) ||
          new Set(modes).size !== modes.length ||
          modes.some((mode) => !LIBRARY_MODES.includes(mode))
        )
          throw new TypeError('Metadata mode compatibility must be explicit and supported.');
        if (!modes.length) continue;
        const info = describe(binding);
        if (!info || typeof info.rules !== 'string')
          throw new TypeError('Metadata mission descriptions need actual authored rules.');
        entries.push(binding);
        descriptions.set(
          binding,
          Object.freeze({
            id: level.id,
            revision: level.revision,
            campaignKey: key,
            campaignTitle: entry.campaign.title || entry.campaign.name || entry.campaign.id,
            name: level.name || level.id,
            levelIndex,
            modes: Object.freeze([...modes]),
            rules: info.rules,
            tags: Object.freeze([...(info.tags ?? [])]),
            hook: info.hook ?? '',
          }),
        );
      }
    }
    current();
    if (!entries.length) continue;
    const own = (binding) => {
      if (!descriptions.has(binding)) throw new TypeError('Unknown metadata mission owner.');
      current();
    };
    sources.push({
      id: JSON.stringify(['custom', pack.id]),
      collection: 'Custom',
      editionId: pack.identity.sha256,
      edition: `${pack.name} · ${pack.version}`.slice(0, 160),
      entries: Object.freeze(entries),
      describe(binding) {
        own(binding);
        return descriptions.get(binding);
      },
      availability(binding, mode) {
        if (!descriptions.has(binding)) throw new TypeError('Unknown metadata mission owner.');
        if (isCurrent(metadata) !== true)
          return {
            state: 'unavailable',
            reason: 'Installed content changed. Refresh the mission library.',
          };
        return availability(binding, mode);
      },
      prepare: prepare
        ? async (binding, context) => {
            own(binding);
            const result = await prepare(binding, context);
            own(binding);
            return result;
          }
        : undefined,
      launch(binding, context) {
        own(binding);
        return launch(binding, context);
      },
      progress: progress
        ? (binding, mode) => {
            if (!descriptions.has(binding)) throw new TypeError('Unknown metadata mission owner.');
            if (isCurrent(metadata) !== true) return '';
            return progress(binding, mode);
          }
        : undefined,
      progressState: progressState
        ? (binding, mode) => {
            if (!descriptions.has(binding)) throw new TypeError('Unknown metadata mission owner.');
            if (isCurrent(metadata) !== true) return { state: 'new', bestStars: null };
            return progressState(binding, mode);
          }
        : undefined,
    });
  }
  return sources;
}
