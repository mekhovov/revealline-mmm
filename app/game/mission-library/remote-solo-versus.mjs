import { loadAuthoredJourneyRoute } from "../editions/standalone/route-loader.mjs";
import { DEFAULT_JOURNEY_ROUTES } from '../content-design/default-entry.mjs';
import { createCandidateSoloHost } from '../content-design/solo-host.mjs';
import { createCandidateVersusHost } from '../content-design/versus-host.mjs';
import { journeyActorThemeCandidates } from '../presentation/journey-actor-materials.mjs';
import { authoredJourneyUsesActorMaterials } from '../content-design/mode-href.mjs';
import { journeyLibrarySource } from './journey-source.mjs';
import { combineJourneyLibrarySources } from './cross-mode-journey.mjs';
import { journeyMissionDetails, authoredJourneyMissionTags } from './journey-presentation.mjs';
import { classicLibrarySources, prepareMissionLibraryIndex } from './classic-source.mjs';
import { boundedJSON } from '../data-json.mjs';
import { externalChapterHash } from '../external-chapter.mjs';
import { campaignKey } from '../library.mjs';
import { createRun } from '../core/index.mjs';
import { createDuel } from '../multiplayer.mjs';
import { normalizedLevel } from '../core/level.mjs';
import { createMetadataInstalledMissionLibrary } from './metadata-installed-library.mjs';
import { createMissionLibraryInventory } from './installed-inventory.mjs';
import { createExternalChapterInventoryReader } from '../external-chapter-pointer.mjs';
import { inspectPackLibraryMetadata, PACK_LIBRARY_VERSION } from '../packs.mjs';
import { createCouchChapterInstaller } from '../couch/couch-chapter-install.mjs';
import { loadOptionalCatalog } from '../optional-chapters.mjs';
import { createSpatialNextEditionSources } from './spatial-next-editions.mjs';
import { isIncludedBundledMission } from './included-bundled-pack.mjs';

/** Read-only remote browsing, with deliberate verified chapter preparation.
 * Compiler-qualified Journey and inspected installed metadata grant an exact
 * receiving-host lookup, never an in-Team run. Downloads use the existing
 * transactional installer; paired originals require explicit readiness checks.
 * No fake image decoder or prepared pack turns browsing into runtime authority.
 */
export async function createRemoteSoloVersusLibrarySources({
  baseURL,
  fetch: request = globalThis.fetch,
  launch,
  difficulty = () => 'standard',
  signal,
  installed,
}) {
  if (typeof launch !== 'function' || typeof request !== 'function')
    throw new TypeError('Remote browsing needs a metadata reader and exact handoff.');
  const root = new URL(baseURL);
  if (!['http:', 'https:', 'file:'].includes(root.protocol) || root.username || root.password)
    throw new TypeError('Remote browsing needs the fixed same-game content root.');
  const check = () => {
    if (signal?.aborted) throw new DOMException('Mission browsing cancelled.', 'AbortError');
  };
  async function read(path, maxBytes = 512 * 1024) {
    check();
    const response = await request(new URL(path, root), { signal });
    if (!response.ok) throw new Error(`Mission metadata is unavailable (${response.status}).`);
    const text = await response.text();
    check();
    const value = boundedJSON(text, {
      maxBytes,
      maxNodes: 50000,
      maxArray: 4096,
      maxDepth: 32,
      maxString: 4096,
    });
    return { text, value };
  }
  const [route, indexFile, themeFile, campaignFile, classesFile] = await Promise.all([
    loadAuthoredJourneyRoute(DEFAULT_JOURNEY_ROUTES.solo, {
      fullSource: true,
      signal,
      fetchAsset: (path, options) => request(new URL(`content-design/${path}`, root), options),
    }),
    read('content/mission-library-index.json'),
    read('content-design/themes.json'),
    read('content/campaign.json'),
    read('content/classes.json'),
  ]);
  check();
  const index = prepareMissionLibraryIndex(indexFile.value);
  const themes = authoredJourneyUsesActorMaterials(route.id)
    ? journeyActorThemeCandidates(themeFile.value.themes, {
        includeOriginals: route.preserveOriginalThemes === true,
      })
    : themeFile.value.themes;
  const options = {
    themes,
    corePackIds: route.corePackIds,
    optionalCampaignIds: route.optionalCampaignIds,
  };
  const solo = createCandidateSoloHost(route.source, options);
  let spatialEditions;
  try {
    spatialEditions = await createSpatialNextEditionSources({
      activeRouteId: route.id,
      originalThemes: themeFile.value.themes,
      difficulty,
      launch,
    });
    const versus = createCandidateVersusHost(route.source, options);
    const sourceFor = (host, manifest) => ({
      ...journeyLibrarySource({
        editionId: route.id,
        edition: 'New Journey',
        catalog: host.catalog,
        details: (mission) => journeyMissionDetails(manifest(mission, difficulty())),
        tags: (mission) => authoredJourneyMissionTags(mission, manifest(mission, 'standard')),
        card: (mission) => host.card(mission, difficulty()),
        launch: (_mission, context) => launch(context),
      }),
      // This host does not read another mode's saved progress or claim clears.
      progress: () => '',
    });
    const journey = combineJourneyLibrarySources([
      {
        mode: 'solo',
        source: sourceFor(solo, (mission, preset) =>
          solo
            .select(mission, preset)
            ?.manifests.find((item) => item.missionId === mission.levelId),
        ),
      },
      {
        mode: 'versus',
        source: sourceFor(versus, (mission, preset) => versus.manifest(mission, preset)),
      },
    ]);
    const baseCampaign = { ...campaignFile.value, classRecipes: classesFile.value };
    const hash = await externalChapterHash(campaignFile.text);
    const bytes = new TextEncoder().encode(campaignFile.text).length;
    const readyBase = new Map();
    for (const row of index.missions.filter((item) => item.source === 'base')) {
      const level = baseCampaign.levels[row.levelIndex];
      if (
        hash !== row.sourceFile.sha256 ||
        bytes !== row.sourceFile.bytes ||
        campaignKey(baseCampaign) !== row.campaignKey ||
        level?.id !== row.levelId ||
        level?.revision !== row.levelRevision
      )
        throw new Error('Base mission metadata differs from the retained source edition.');
      const modes = new Set();
      const config = { classRecipes: classesFile.value, classId: classesFile.value[0].id };
      for (const mode of row.modes) {
        if (mode === 'solo') createRun(level, config);
        else createDuel(level, config);
        modes.add(mode);
      }
      readyBase.set(row.id, modes);
    }
    check();
    if (installed) {
      // The Base execution wrapper is authored, not reconstructed from card
      // metadata or Journey materials. No pictures are decoded by this read.
      const owner = await installedSources({
        index,
        journeySources: [journey, ...spatialEditions.sources],
        baseEntry: {
          campaign: baseCampaign,
          classRecipes: classesFile.value,
          visualOverrides: {},
          levelVisuals: [],
          music: [],
          sourcePackId: null,
        },
        installed,
        loadBaseThemes: async () => (await read('content/themes.json')).value.themes,
        baseURL: new URL('../', root),
        request,
        launch,
        signal,
      });
      return Object.freeze({
        get sources() {
          return owner.sources();
        },
        refresh: owner.refresh,
        state: owner.state,
        dispose() {
          owner.dispose();
          spatialEditions.dispose();
          solo.preparer.dispose();
        },
      });
    }
    const retained = classicLibrarySources(index, {
      availability: (row, mode) =>
        readyBase.get(row.id)?.has(mode)
          ? { state: 'ready' }
          : {
              state: 'unavailable',
              reason:
                'Retained chapter: installation and original-picture readiness are not yet checked from Team. Open Solo or Versus to install or play this edition.',
            },
      launch: (_row, context) => launch(context),
      progress: () => '',
    });
    return Object.freeze({
      sources: Object.freeze([journey, ...spatialEditions.sources, ...retained]),
      refresh: async () => {},
      state: () => ({ ready: false, reason: 'Installed chapters have not been checked.' }),
      dispose() {
        spatialEditions.dispose();
        solo.preparer.dispose();
      },
    });
  } catch (error) {
    spatialEditions?.dispose();
    solo.preparer.dispose();
    throw error;
  }
}

/** Remote ownership ends at an exact handoff. Genuine pack/picture preparation
 * stays with the receiving host; this owner never treats a DTO as a runtime. */
async function installedSources({
  index,
  journeySources,
  baseEntry,
  installed,
  loadBaseThemes,
  baseURL,
  request,
  launch,
  signal,
}) {
  const empty = await inspectPackLibraryMetadata({ format: PACK_LIBRARY_VERSION, packs: [] });
  let inventory = null,
    installer = null,
    factory = null,
    error = '',
    closed = false,
    refreshEpoch = 0;
  const externalProofs = new Map();
  const currentInventory = () => inventory?.getInventory() ?? empty;
  const check = (operationSignal) => {
    if (closed || signal?.aborted || operationSignal?.aborted)
      throw new DOMException('Mission browsing cancelled.', 'AbortError');
  };
  const state = () =>
    error
      ? { ready: false, reason: error }
      : (inventory?.state() ?? {
          ready: false,
          reason: error || 'Installed chapter metadata has not been checked.',
        });
  async function refresh({ signal: operationSignal = signal } = {}) {
    check(operationSignal);
    const ticket = ++refreshEpoch;
    externalProofs.clear();
    try {
      inventory ??= await createMissionLibraryInventory({
        reader: createExternalChapterInventoryReader({
          ...installed,
          profileKey: `revealline-mmm.library.${installed.channel}.v1`,
          packsKey: `revealline-mmm.packs.${installed.channel}.v1`,
        }),
      });
      if (ticket !== refreshEpoch) return state();
      await inventory.refresh({ signal: operationSignal });
      check(operationSignal);
      if (ticket !== refreshEpoch) return state();
      if (!baseEntry.themes) {
        const themes = await loadBaseThemes();
        check(operationSignal);
        if (ticket !== refreshEpoch) return state();
        baseEntry.themes = themes;
      }
      check(operationSignal);
      if (ticket !== refreshEpoch) return state();
      error = '';
      if (factory) await factory.refreshInstalled();
      if (ticket !== refreshEpoch) return state();
    } catch (failure) {
      if (ticket !== refreshEpoch) return state();
      error = `Installed chapters could not be checked: ${failure.message}. Existing packs are kept. Reopen missions to retry.`;
      check(operationSignal);
      // Keep previously registered Custom owners stale, rather than removing
      // them because an unknown/locked inventory resembles an empty library.
    }
    return state();
  }
  function getInstaller() {
    return (installer ??= createCouchChapterInstaller({
      ...installed,
      registeredEntries: [baseEntry],
      missionIndex: index,
      baseURL,
      fetch: request,
    }));
  }
  function proofCurrent(row) {
    const proof = externalProofs.get(row.packId);
    return Boolean(proof && proof.epoch === refreshEpoch && proof.inventory === currentInventory());
  }
  async function confirm(row, context) {
    check(context.signal);
    if (context.isCurrent?.() === false) return false;
    if (row?.source === 'base') return true;
    await inventory.confirm(context.inventory, { signal: context.signal });
    check(context.signal);
    if (context.isCurrent?.() === false) return false;
    if (row?.source === 'external') {
      const ready = await getInstaller().inspectExternal(row, { signal: context.signal });
      check(context.signal);
      if (!ready.ready) throw new Error(ready.reason || 'Original pictures need preparation.');
      await inventory.confirm(context.inventory, { signal: context.signal });
    }
    return context.isCurrent?.() !== false;
  }
  const handoff = (row, context) =>
    launch({
      ...context,
      // The Team host invokes this again after its Stay/Replace decision. Keeping
      // it next to assign prevents a changed inventory from gaining authority.
      confirmInventory: () => confirm(row, context),
    });
  try {
    await refresh();
    factory = await createMetadataInstalledMissionLibrary({
      index,
      journeySources,
      getInventory: currentInventory,
      baseEntry,
      compatibility({ entry, level }) {
        const modes = [],
          config = { classRecipes: entry.classRecipes, classId: entry.classRecipes[0].id };
        try {
          createRun(level, config);
          modes.push('solo');
        } catch {}
        try {
          createDuel(level, config);
          modes.push('versus');
        } catch {}
        return modes;
      },
      describe({ level }) {
        const actual = normalizedLevel(level);
        return {
          rules: `${Math.round(actual.goal.coverage * 100)}% coverage · ${actual.rules.lives} lives · ${actual.rules.moveSpeed} cells/s · Authored rules`,
        };
      },
      availabilityClassic(row, pack) {
        if (!state().ready) return { state: 'unavailable', reason: state().reason };
        if (row.source === 'external' && pack)
          return proofCurrent(row)
            ? { state: 'ready' }
            : {
                state: 'unavailable',
                reason:
                  'Original pictures need checking. Retry checks the installed pair without starting a mission.',
                retry: true,
              };
        return pack
          ? { state: 'ready' }
          : {
              state: 'download',
              bytes: row.download?.bytes ?? row.sourceFile.bytes,
              ...(isIncludedBundledMission(row) ? { included: true } : {}),
            };
      },
      availabilityCustom() {
        return state().ready
          ? { state: 'ready' }
          : { state: 'unavailable', reason: state().reason };
      },
      async prepareClassic(row, context) {
        check(context.signal);
        // A failed explicit installation can create an empty content database.
        // Each deliberate Retry owns a fresh checked snapshot; do not reuse an
        // earlier absence proof or silently reinterpret changed installed data.
        await refresh({ signal: context.signal });
        check(context.signal);
        if (!state().ready) throw new Error(state().reason);
        const before = currentInventory(),
          epoch = refreshEpoch;
        await inventory.confirm(before, { signal: context.signal });
        let result;
        if (['bundled', 'archived'].includes(row.source))
          result = await getInstaller().installIndexed(row, { signal: context.signal });
        else if (row.source === 'optional') {
          const catalog = await loadOptionalCatalog({
            baseURL,
            fetch: request,
            signal: context.signal,
          });
          const summary = catalog.packs.find((entry) => entry.id === row.packId);
          if (!summary) throw new Error('This chapter is absent from the exact release catalogue.');
          result = await getInstaller().install(summary, { signal: context.signal });
        } else if (row.source === 'external')
          result = before.packs.some((pack) => pack.id === row.packId)
            ? await getInstaller().inspectExternal(row, { signal: context.signal })
            : await getInstaller().installExternal(row, { signal: context.signal });
        else throw new Error('This mission does not need installation.');
        // A durable commit can outlive cancellation. Refresh metadata using this
        // owner's lifetime, but never launch or manufacture a cancelled proof.
        if (result.committed) await refresh();
        check(context.signal);
        if (!result.committed && epoch !== refreshEpoch)
          throw new Error('Installed inventory changed while preparing. Retry this mission.');
        if (!result.committed) await inventory.confirm(before, { signal: context.signal });
        if (!state().ready) throw new Error(state().reason);
        if (row.source === 'external') {
          if (!result.ready) throw new Error(result.reason || 'Original pictures need checking.');
          externalProofs.set(row.packId, { inventory: currentInventory(), epoch: refreshEpoch });
        }
      },
      launchClassic: handoff,
      launchCustom: (_binding, context) => handoff(null, context),
      progressClassic: () => '',
      progressCustom: () => '',
    });
  } catch (failure) {
    inventory?.close();
    installer?.dispose();
    throw failure;
  }
  return Object.freeze({
    sources: () => factory.sources(),
    refresh,
    state,
    dispose() {
      closed = true;
      ++refreshEpoch;
      externalProofs.clear();
      factory.library.dispose();
      inventory?.close();
      installer?.dispose();
    },
  });
}
