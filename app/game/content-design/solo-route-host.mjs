import { createEncounterSoloHost } from './encounter-host.mjs';
import { publishedRouteViews } from './published-journey.mjs';
import { loadPublishedChapter } from './route-snapshot.mjs';
import { createCandidateSequence } from './sequence.mjs';
import { journeyMissionDetails } from '../mission-library/journey-presentation.mjs';

/** Old source hosts retain their exact contract; publication hosts materialize
 * complete packs into an append-only registry without replacing active entries. */
export async function createSoloRouteHost(route, options = {}) {
  options.assertCurrent?.();
  if (!route.navigation)
    return createEncounterSoloHost(route.source, {
      ...options,
      corePackIds: route.corePackIds,
      optionalCampaignIds: route.optionalCampaignIds,
    });
  const { ensurePackage, signal, fetchAsset, assertCurrent, ...hostOptions } = options;
  const view = publishedRouteViews(route).solo,
    catalog = view.catalog;
  const descriptors = new Map(route.navigation.chapters.map((item) => [item.packId, item]));
  const metadata = new Map(view.executionMetadata.map((entry) => [entry.key, entry]));
  const loaded = new Map(),
    owners = new Map(),
    rawOwners = new WeakMap();
  let entries = Object.freeze([]),
    disposed = false,
    generation = 0,
    pending = null,
    prepared = null;
  const check = (signal) => {
    signal?.throwIfAborted();
    if (disposed) throw new DOMException('Journey host is closed.', 'AbortError');
  };
  const syncEntries = (item) => {
    const additions = item.host.entries.filter((entry) => !owners.has(entry));
    for (const entry of additions) {
      owners.set(entry, item);
      if (!metadata.has(entry.executionKey))
        metadata.set(
          entry.executionKey,
          Object.freeze({
            key: entry.executionKey,
            difficulty: entry.difficulty,
            packId: entry.sourcePackId,
            campaignId: entry.campaignId,
            campaign: entry.campaign,
            encounterVariant: entry.encounterVariant,
            encounterVariants: entry.encounterVariants,
          }),
        );
    }
    if (additions.length) entries = Object.freeze([...entries, ...additions]);
  };
  const loadPack = async (packId, { signal, prepare = true, assertCurrent } = {}) => {
    assertCurrent?.();
    check(signal);
    const descriptor = descriptors.get(packId);
    if (!descriptor) return null;
    // Offline retention is an optional host integration. The chapter loader
    // verifies ordinary network responses without requiring a prepared package.
    if (prepare && typeof ensurePackage === 'function') {
      await ensurePackage(descriptor.groups.solo, { signal, retain: true });
      assertCurrent?.();
      check(signal);
    }
    if (loaded.has(packId)) return loaded.get(packId);
    const source = await loadPublishedChapter(route, descriptor, {
      fetchAsset,
      signal,
      assertCurrent,
    });
    assertCurrent?.();
    check(signal);
    const host = createEncounterSoloHost(source, {
      ...hostOptions,
      corePackIds: [packId],
      optionalCampaignIds: [],
    });
    check(signal);
    if (loaded.has(packId)) {
      host.preparer.dispose();
      return loaded.get(packId);
    }
    const item = { source, host };
    loaded.set(packId, item);
    syncEntries(item);
    return item;
  };
  const missionFor = (value) =>
    typeof value === 'string'
      ? catalog.find(value)
      : catalog.find(value?.id) === value
        ? value
        : null;
  const cancel = () => {
    generation++;
    const previous = pending,
      retired = prepared;
    pending = null;
    prepared = null;
    if (retired) rawOwners.get(retired)?.cancel();
    for (const item of loaded.values()) item.host.preparer.cancel();
    // Abort listeners may begin another action. Retire our fields first and
    // never clear a newer request after notifying the old controller.
    previous?.abort();
  };
  const facade = {
    catalog,
    get entries() {
      for (const item of loaded.values()) syncEntries(item);
      return entries;
    },
    owns: (entry) => owners.has(entry),
    executionMetadata: (key) => metadata.get(key) ?? null,
    ensureVariant(variant) {
      let available = false;
      for (const item of loaded.values()) {
        available = item.host.ensureVariant(variant) || available;
        syncEntries(item);
      }
      return available;
    },
    async ensureMission(value, options = {}) {
      const mission = missionFor(value);
      return mission ? loadPack(mission.packId, options) : null;
    },
    async ensureProgressMission(id, options = {}) {
      if (typeof id !== 'string') return null;
      const canonical = id.replace(
        /^candidate-encounter-(?:off|patrol|bonus|capture-quota|hunt)\//,
        'candidate/',
      );
      const mission = catalog.find(canonical);
      if (!mission) return null;
      const item = await loadPack(mission.packId, options);
      return item?.host.resolveProgressMission(id) ?? null;
    },
    async ensureExecution(key, options = {}) {
      const record = metadata.get(key);
      if (record) return loadPack(record.packId, options);
      // Save keys never choose a URL or package. Only an already admitted campaign
      // may nominate a chapter, and the derived key must subsequently match exactly.
      if (
        typeof key !== 'string' ||
        !/^[a-zA-Z0-9][a-zA-Z0-9._-]{0,79}\/[^/]{1,180}\/[0-9a-f]{16}$/.test(key)
      )
        return null;
      const campaignId = key.slice(0, key.indexOf('/'));
      const packs = new Set(
        view.executionMetadata
          .filter((entry) => entry.campaignId === campaignId)
          .map((entry) => entry.packId),
      );
      for (const packId of packs) {
        const item = await loadPack(packId, options);
        if (item?.host.ensureExecution(key)) {
          syncEntries(item);
          return item;
        }
      }
      return null;
    },
    availableVariants(value) {
      const mission = missionFor(value);
      const item = loaded.get(mission?.packId);
      return item
        ? item.host.availableVariants(item.host.catalog.find(mission.id))
        : Object.freeze(['authored']);
    },
    card(mission, difficulty = 'standard', options) {
      if (!missionFor(mission)) return null;
      const item = loaded.get(mission.packId);
      return item
        ? item.host.card(item.host.catalog.find(mission.id), difficulty, options)
        : view.card(mission, difficulty);
    },
    details(mission, difficulty = 'standard', options) {
      if (!missionFor(mission)) return null;
      const item = loaded.get(mission.packId);
      if (!item) return view.details(mission, difficulty);
      const entry = item.host.select(item.host.catalog.find(mission.id), difficulty, options),
        manifest = entry?.manifests.find((value) => value.missionId === mission.levelId);
      syncEntries(item);
      return manifest ? journeyMissionDetails(manifest) : view.details(mission, difficulty);
    },
    select(mission, difficulty, options) {
      if (!missionFor(mission)) return null;
      const item = loaded.get(mission.packId);
      const entry =
        item?.host.select(item.host.catalog.find(mission.id), difficulty, options) ?? null;
      if (item) syncEntries(item);
      return entry;
    },
    mission(entry, index) {
      const item = owners.get(entry);
      return catalog.find(item?.host.mission(entry, index)?.id) ?? null;
    },
    progressMission(entry, index) {
      return owners.get(entry)?.host.progressMission(entry, index) ?? null;
    },
    resolveProgressMission(id) {
      for (const item of loaded.values()) {
        const mission = item.host.resolveProgressMission(id);
        if (mission) return mission;
      }
      return catalog.find(id);
    },
    selectProgress(id, difficulty) {
      for (const item of loaded.values()) {
        const entry = item.host.selectProgress(id, difficulty);
        if (entry) {
          syncEntries(item);
          return entry;
        }
      }
      return null;
    },
    visualThemeSelection(entry, level) {
      return owners.get(entry)?.host.visualThemeSelection(entry, level) ?? null;
    },
    async prepareVisualIdentity({ selection, level, association }, options = {}) {
      const item = owners.get(selection);
      if (!item) throw new Error('Use an owned published selection.');
      return item.host.prepareVisualIdentity({ selection, level, association }, options);
    },
    ...createCandidateSequence(catalog, route.corePackIds, route.optionalCampaignIds),
  };
  facade.preparer = Object.freeze({
    async prepare(request, options = {}) {
      check(options.signal);
      const ticket = generation + 1;
      cancel();
      const controller = new AbortController();
      if (disposed || pending || generation !== ticket)
        throw new DOMException('Journey preparation cancelled.', 'AbortError');
      const abort = () => controller.abort();
      options.signal?.addEventListener('abort', abort, { once: true });
      pending = controller;
      let item;
      try {
        item = await facade.ensureMission(request.missionId, { signal: controller.signal });
        check(controller.signal);
        if (!item || generation !== ticket)
          throw new DOMException('Journey preparation cancelled.', 'AbortError');
        const result = await item.host.preparer.prepare(request, {
          ...options,
          signal: controller.signal,
        });
        check(controller.signal);
        if (generation !== ticket)
          throw new DOMException('Journey preparation cancelled.', 'AbortError');
        rawOwners.set(result, item.host.preparer);
        prepared = result;
        return result;
      } catch (error) {
        if (generation === ticket) item?.host.preparer.cancel();
        throw error;
      } finally {
        options.signal?.removeEventListener('abort', abort);
        if (pending === controller) pending = null;
      }
    },
    current: (value) =>
      !disposed && value != null && prepared === value && rawOwners.get(value)?.current(value),
    take(value) {
      if (disposed || value == null || prepared !== value)
        throw new Error('Candidate is no longer current.');
      const result = rawOwners.get(value).take(value);
      prepared = null;
      return result;
    },
    cancel,
    dispose() {
      cancel();
      disposed = true;
      for (const item of loaded.values()) item.host.preparer.dispose();
    },
  });
  try {
    await loadPack(route.navigation.starterPackId, { signal, prepare: false, assertCurrent });
    assertCurrent?.();
  } catch (error) {
    facade.preparer.dispose();
    throw error;
  }
  return Object.freeze(facade);
}
