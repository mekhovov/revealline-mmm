import { campaignKey } from '../library.mjs';
import { isPackLibraryMetadata } from '../packs.mjs';
import { createMissionLibrary } from './library.mjs';
import { classicLibrarySources } from './classic-source.mjs';
import { metadataCustomLibrarySources } from './metadata-custom-source.mjs';

/** Metadata-backed sibling of installed-library. Callbacks receive metadataPack
 * or a metadata binding, never context.pack or a pretend prepared runtime owner.
 * Storage confirmation and genuine target preparation belong to the host's
 * deliberate launch transaction. This layer performs no storage or image IO.
 */
export async function createMetadataInstalledMissionLibrary({
  index,
  journeySources = [],
  getInventory,
  baseEntry,
  compatibility,
  describe,
  availabilityClassic,
  availabilityCustom,
  prepareClassic,
  launchClassic,
  launchCustom,
  progressClassic,
  progressStateClassic,
  progressCustom,
  progressStateCustom,
}) {
  if (
    !Array.isArray(journeySources) ||
    [
      getInventory,
      compatibility,
      describe,
      availabilityClassic,
      availabilityCustom,
      prepareClassic,
      launchClassic,
      launchCustom,
    ].some((fn) => typeof fn !== 'function') ||
    [progressClassic, progressStateClassic, progressCustom, progressStateCustom].some(
      (fn) => fn !== undefined && typeof fn !== 'function',
    )
  )
    throw new TypeError(
      'Metadata inventory browsing needs explicit readiness and launch adapters.',
    );
  const snapshot = () => {
    const value = getInventory();
    if (!isPackLibraryMetadata(value)) throw new TypeError('Use an inspected metadata inventory.');
    return value;
  };
  const current = (inventory) => {
    if (getInventory() !== inventory)
      throw new Error('Installed content changed. Refresh the mission library.');
  };
  const metadataContext = (context) => {
    const value = { ...context };
    // Never let a leftover prepared-factory context impersonate runtime ownership.
    delete value.pack;
    delete value.metadataPack;
    delete value.inventory;
    return value;
  };
  const selection = (row) =>
    Object.freeze({
      sourcePackId: row.packId,
      campaignId: row.campaignId,
      campaignKey: row.campaignKey,
      levelId: row.levelId,
      levelRevision: row.levelRevision,
      levelIndex: row.levelIndex,
      rulesEdition: row.rulesEdition,
    });
  const exactBase = (row) => {
    const level = baseEntry?.campaign?.levels?.[row.levelIndex];
    return Boolean(
      level &&
        campaignKey(baseEntry.campaign) === row.campaignKey &&
        level.id === row.levelId &&
        level.revision === row.levelRevision,
    );
  };
  const matches = (pack, row) => {
    if (
      !pack ||
      pack.id !== row.packId ||
      pack.version !== row.packVersion ||
      pack.identity.bytes !== row.packIdentity?.bytes ||
      pack.identity.sha256 !== row.packIdentity?.sha256
    )
      return false;
    const entry = pack.entries.find((item) => item.campaign.id === row.campaignId);
    const level = entry?.campaign.levels[row.levelIndex];
    return Boolean(
      level &&
        campaignKey(entry.campaign) === row.campaignKey &&
        level.id === row.levelId &&
        level.revision === row.levelRevision,
    );
  };
  function readiness(row, mode) {
    if (row.source === 'base')
      return exactBase(row)
        ? { state: 'ready' }
        : { state: 'unavailable', reason: 'This Base edition is not available in this host.' };
    const inventory = snapshot();
    const pack = inventory.packs.find((item) => item.id === row.packId) ?? null;
    if (pack && !matches(pack, row))
      return {
        state: 'unavailable',
        reason: 'A different edition is installed. Find it under Custom or restore the original.',
      };
    const state = availabilityClassic(row, pack, mode);
    current(inventory);
    return state;
  }
  const sources = classicLibrarySources(index, {
    availability: readiness,
    prepare: async (row, context) => {
      if (context.signal?.aborted) throw new DOMException('Preparation cancelled.', 'AbortError');
      await prepareClassic(row, context);
      if (context.signal?.aborted) throw new DOMException('Preparation cancelled.', 'AbortError');
      await refreshInstalled();
      if (context.signal?.aborted) throw new DOMException('Preparation cancelled.', 'AbortError');
      const state = readiness(row, context.mode);
      if (state.state !== 'ready')
        throw new Error(state.reason || 'The exact mission is not ready.');
    },
    launch: (row, context) => {
      const inventory = snapshot();
      const pack =
        row.source === 'base' ? null : inventory.packs.find((item) => item.id === row.packId);
      if (row.source !== 'base' && !matches(pack, row))
        throw new Error('The exact original edition is not installed.');
      const state = readiness(row, context.mode);
      current(inventory);
      if (state.state !== 'ready')
        throw new Error(state.reason || 'The exact mission is not ready.');
      return launchClassic(row, {
        ...metadataContext(context),
        inventory,
        metadataPack: pack,
        selection: selection(row),
      });
    },
    progress: progressClassic,
    progressState: progressStateClassic,
  });
  const rows = sources.flatMap((source) => source.entries);
  const library = createMissionLibrary([...journeySources, ...sources]);
  const customOwners = new Map(),
    cache = new WeakMap();
  let generation = 0;
  async function refreshInstalled() {
    const ticket = ++generation,
      inventory = snapshot();
    if (!cache.has(inventory)) {
      const pending = metadataCustomLibrarySources(inventory, {
        isCurrent: (value) => getInventory() === value,
        isOfficial: (pack) => {
          const peers = rows.filter(
            (row) => row.packId === pack.id && row.rulesEdition === 'original',
          );
          return (
            peers.length > 0 &&
            peers.every((row) => matches(pack, row)) &&
            peers.length === pack.entries.reduce((n, entry) => n + entry.campaign.levels.length, 0)
          );
        },
        compatibility,
        describe,
        availability: availabilityCustom,
        launch: (binding, context) =>
          launchCustom(binding, { ...metadataContext(context), inventory }),
        progress: progressCustom,
        progressState: progressStateCustom,
      });
      cache.set(inventory, pending);
      pending.catch(() => {
        if (cache.get(inventory) === pending) cache.delete(inventory);
      });
    }
    const next = await cache.get(inventory);
    current(inventory);
    if (ticket !== generation) throw new Error('Installed inventory refresh was superseded.');
    const ids = new Set(next.map((source) => source.id));
    for (const id of customOwners.keys())
      if (!ids.has(id)) {
        library.remove(id);
        customOwners.delete(id);
      }
    for (const source of next)
      if (customOwners.get(source.id) !== source) {
        library.register(source);
        customOwners.set(source.id, source);
      }
    return library;
  }
  await refreshInstalled();
  return Object.freeze({
    library,
    refreshInstalled,
    // A containing gameplay host may mirror these exact owners only after its
    // opening/input lease is still current. Metadata construction itself must
    // not mutate an unrelated visible registry while the player acts elsewhere.
    sources: () => Object.freeze([...journeySources, ...sources, ...customOwners.values()]),
  });
}
