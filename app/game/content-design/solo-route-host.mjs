import { createCandidateSoloHost } from './solo-host.mjs';
import { publishedRouteViews } from './published-journey.mjs';
import { loadPublishedChapter } from './route-snapshot.mjs';
import { createCandidateSequence } from './sequence.mjs';
import { createJourneyVisualThemeIdentityAdapter } from '../presentation/journey-visual-theme-identities.mjs';

/** Old source hosts retain their exact contract; publication hosts materialize
 * complete packs into an append-only registry without replacing active entries. */
export async function createSoloRouteHost(route, options = {}) {
  if (!route.navigation)
    return createCandidateSoloHost(route.source, {
      ...options,
      corePackIds: route.corePackIds,
      optionalCampaignIds: route.optionalCampaignIds,
    });
  const { ensurePackage, signal, fetchAsset, ...hostOptions } = options;
  const view = publishedRouteViews(route).solo,
    catalog = view.catalog;
  const descriptors = new Map(route.navigation.chapters.map((item) => [item.packId, item]));
  const metadata = new Map(view.executionMetadata.map((entry) => [entry.key, entry]));
  const loaded = new Map(),
    owners = new Map(),
    rawOwners = new WeakMap(),
    identity = new Map();
  let entries = Object.freeze([]),
    disposed = false,
    generation = 0,
    pending = null,
    prepared = null;
  const check = (signal) => {
    signal?.throwIfAborted();
    if (disposed) throw new DOMException('Journey host is closed.', 'AbortError');
  };
  const loadPack = async (packId, { signal, prepare = true } = {}) => {
    check(signal);
    const descriptor = descriptors.get(packId);
    if (!descriptor) return null;
    // Offline retention is an optional host integration. The chapter loader
    // verifies ordinary network responses without requiring a prepared package.
    if (prepare && typeof ensurePackage === 'function') {
      await ensurePackage(descriptor.groups.solo, { signal, retain: true });
      check(signal);
    }
    if (loaded.has(packId)) return loaded.get(packId);
    const source = await loadPublishedChapter(route, descriptor, { fetchAsset, signal });
    check(signal);
    const host = createCandidateSoloHost(source, {
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
    for (const entry of host.entries) owners.set(entry, item);
    entries = Object.freeze([...entries, ...host.entries]);
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
      return entries;
    },
    owns: (entry) => owners.has(entry),
    executionMetadata: (key) => metadata.get(key) ?? null,
    async ensureMission(value, options = {}) {
      const mission = missionFor(value);
      return mission ? loadPack(mission.packId, options) : null;
    },
    async ensureExecution(key, options = {}) {
      const record = metadata.get(key);
      return record ? loadPack(record.packId, options) : null;
    },
    card: view.card,
    select(mission, difficulty) {
      if (!missionFor(mission)) return null;
      const item = loaded.get(mission.packId);
      return item?.host.select(item.host.catalog.find(mission.id), difficulty) ?? null;
    },
    mission(entry, index) {
      const item = owners.get(entry);
      return catalog.find(item?.host.mission(entry, index)?.id) ?? null;
    },
    visualThemeSelection(entry, level) {
      return owners.get(entry)?.host.visualThemeSelection(entry, level) ?? null;
    },
    async prepareVisualIdentity({ selection, level, association }, options = {}) {
      const item = owners.get(selection);
      if (!item) throw new Error('Use an owned published selection.');
      if (!identity.has(item))
        identity.set(item, createJourneyVisualThemeIdentityAdapter(item.source, { mode: 'solo' }));
      return (await identity.get(item)).prepareHostSelection(
        { host: facade, selection, level, association },
        options,
      );
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
  await loadPack(route.navigation.starterPackId, { signal, prepare: false });
  return Object.freeze(facade);
}
