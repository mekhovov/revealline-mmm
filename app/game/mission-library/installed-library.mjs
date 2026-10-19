import { campaignKey } from '../library.mjs';
import { resolvePackCampaign } from '../packs.mjs';
import { createMissionLibrary, LIBRARY_MODES } from './library.mjs';
import { classicLibrarySources } from './classic-source.mjs';
import { customLibrarySources } from './custom-source.mjs';
import { preparedPackIdentity, verifyIndexedInstalledPack } from './pack-identity.mjs';
import { isIncludedBundledMission } from './included-bundled-pack.mjs';

/** Shared installed-content registry. Metadata never installs, fetches or decodes
 * anything. Host adapters still own runtime validation and atomic picture adoption.
 * Refresh replaces Custom owners only; Classic rows and their operation tickets
 * survive the Download -> Play transition.
 */
export async function createInstalledMissionLibrary({
  index,
  journeySources = [],
  getPacks,
  baseEntry,
  mode = 'solo',
  compatibility,
  describe,
  prepareClassic,
  launchClassic,
  launchCustom,
  progressClassic,
  progressStateClassic,
  progressCustom,
  progressStateCustom,
  availabilityExternal,
  unavailableClassic,
  getProjectSources = async () => [],
  assertCurrent = () => {},
}) {
  if (
    !LIBRARY_MODES.includes(mode) ||
    !Array.isArray(journeySources) ||
    [
      getPacks,
      compatibility,
      describe,
      prepareClassic,
      launchClassic,
      launchCustom,
      assertCurrent,
      getProjectSources,
    ].some((fn) => typeof fn !== 'function') ||
    [
      progressClassic,
      progressStateClassic,
      progressCustom,
      progressStateCustom,
      availabilityExternal,
      unavailableClassic,
    ].some((fn) => fn !== undefined && typeof fn !== 'function')
  )
    throw new TypeError(
      'Installed mission browsing needs explicit host adapters and a valid mode.',
    );
  assertCurrent();
  const verified = new WeakMap(),
    customCache = new WeakMap();
  let accepted = null,
    generation = 0;
  const customOwners = new Map();
  function snapshot() {
    const value = getPacks();
    if (
      !value ||
      !Array.isArray(value.packs) ||
      value.packs.length > 12 ||
      new Set(value.packs.map((pack) => pack.id)).size !== value.packs.length
    )
      throw new TypeError('Installed mission browsing needs the current prepared pack library.');
    return value;
  }
  function current(value) {
    if (getPacks() !== value)
      throw new Error('Installed content changed. Refresh the mission library and try again.');
  }
  async function verify(pack, row, assertVisit = () => {}) {
    assertVisit();
    if (!verified.has(pack)) verified.set(pack, new Map());
    const rows = verified.get(pack);
    if (rows.has(row)) return rows.get(row).value;
    const value = await verifyIndexedInstalledPack(pack, row, {
      isCurrent() {
        assertVisit();
        return true;
      },
    });
    assertVisit();
    rows.set(row, { value });
    return value;
  }
  function exactBase(row) {
    if (!baseEntry?.campaign) return false;
    const level = baseEntry.campaign.levels?.[row.levelIndex];
    return (
      campaignKey(baseEntry.campaign) === row.campaignKey &&
      level?.id === row.levelId &&
      level?.revision === row.levelRevision
    );
  }
  const selection = (row) =>
    Object.freeze({
      campaignId: row.campaignId,
      campaignKey: row.campaignKey,
      levelId: row.levelId,
      levelRevision: row.levelRevision,
      levelIndex: row.levelIndex,
      rulesEdition: row.rulesEdition,
    });
  function classicAvailability(row, selectedMode = mode) {
    if (row.source === 'base')
      return exactBase(row)
        ? { state: 'ready' }
        : {
            state: 'unavailable',
            reason: 'This Base game edition is not available in this host.',
          };
    const packs = snapshot(),
      pack = packs.packs.find((item) => item.id === row.packId) ?? null;
    if (pack && verified.get(pack)?.get(row)?.value !== true)
      return {
        state: 'unavailable',
        reason:
          accepted === packs
            ? 'A different edition of this pack is installed. Find it under Custom or restore the original edition.'
            : 'Installed content changed. Refresh the mission library and try again.',
      };
    if (row.source === 'external') {
      if (availabilityExternal) return availabilityExternal(row, pack, selectedMode);
      return {
        state: 'unavailable',
        reason: 'Original picture readiness must be verified by this host.',
      };
    }
    // A host may lack an installer for an otherwise trusted edition. This
    // capability veto never promotes missing or mismatched content to ready.
    if (!pack) {
      const reason = unavailableClassic?.(row, selectedMode);
      if (reason !== undefined && reason !== null) {
        if (typeof reason !== 'string' || !reason.trim())
          throw new TypeError('An unsupported chapter needs an unavailable reason.');
        return { state: 'unavailable', reason };
      }
    }
    return pack
      ? { state: 'ready' }
      : {
          state: 'download',
          bytes: row.download?.bytes ?? row.sourceFile.bytes,
          ...(isIncludedBundledMission(row) ? { included: true } : {}),
        };
  }
  const classicSources = classicLibrarySources(index, {
    availability: classicAvailability,
    async prepare(row, context) {
      if (context.signal?.aborted)
        throw new DOMException('Mission preparation cancelled.', 'AbortError');
      await prepareClassic(row, context);
      if (context.signal?.aborted)
        throw new DOMException('Mission preparation cancelled.', 'AbortError');
      await refreshInstalled({
        assertCurrent() {
          if (context.signal?.aborted || context.isCurrent?.() === false)
            throw new DOMException('Mission preparation cancelled.', 'AbortError');
        },
      });
      if (context.signal?.aborted)
        throw new DOMException('Mission preparation cancelled.', 'AbortError');
      const state = classicAvailability(row, context.mode);
      if (state.state !== 'ready')
        throw new Error(state.reason || 'The exact mission is not ready. Retry preparation.');
    },
    async launch(row, context) {
      const packs = snapshot();
      let pack = null;
      if (row.source === 'base') {
        if (!exactBase(row)) throw new Error('The exact Base game mission changed.');
      } else {
        pack = packs.packs.find((item) => item.id === row.packId);
        if (!pack || !(await verify(pack, row)))
          throw new Error('The exact original pack edition is not installed.');
      }
      current(packs);
      const state = classicAvailability(row, context.mode);
      current(packs);
      if (state.state !== 'ready')
        throw new Error(state.reason || 'The exact mission is not ready.');
      return launchClassic(row, { ...context, pack, selection: selection(row) });
    },
    progress: progressClassic,
    progressState: progressStateClassic,
  });
  const classicRows = classicSources.flatMap((source) => source.entries);
  const library = createMissionLibrary([...journeySources, ...classicSources]);

  async function refreshInstalled({ assertCurrent: assertVisit = () => {} } = {}) {
    if (typeof assertVisit !== 'function')
      throw new TypeError('Installed refresh needs a synchronous current-owner guard.');
    assertVisit();
    const ticket = ++generation,
      packs = snapshot();
    function assertRefreshCurrent() {
      assertVisit();
      current(packs);
      if (ticket !== generation)
        throw new Error('Installed content refresh was superseded. Try again.');
    }
    const nextCustom = [];
    for (const pack of packs.packs) {
      assertRefreshCurrent();
      await preparedPackIdentity(pack); // Reject unprepared owner lookalikes, including unknown IDs.
      assertRefreshCurrent();
      const matching = classicRows.filter((row) => row.packId === pack.id);
      const matches = await Promise.all(
        matching.map((row) => verify(pack, row, assertRefreshCurrent)),
      );
      assertRefreshCurrent();
      if (matches.some(Boolean)) continue;
      if (!customCache.has(pack)) {
        const sources = await customLibrarySources(
          [
            {
              pack,
              entries: pack.campaigns.map((campaign) => resolvePackCampaign(pack, campaign.id)),
            },
          ],
          {
            assertCurrent: assertRefreshCurrent,
            compatibility,
            describe,
            availability(binding) {
              return snapshot().packs.includes(binding.pack)
                ? { state: 'ready' }
                : {
                    state: 'unavailable',
                    reason:
                      'This Custom pack was replaced or removed. Refresh the mission library.',
                  };
            },
            launch(binding, context) {
              if (!snapshot().packs.includes(binding.pack))
                throw new Error('This Custom pack was replaced or removed.');
              return launchCustom(binding, context);
            },
            progress: progressCustom,
            progressState: progressStateCustom,
          },
        );
        assertRefreshCurrent();
        // Only completed sources survive a visit. A pending promise must not keep
        // a retired visit's guard or reject a later visit that owns fresh work.
        customCache.set(pack, sources);
      }
      nextCustom.push(...customCache.get(pack));
    }
    assertRefreshCurrent();
    const projects = await getProjectSources({ assertCurrent: assertRefreshCurrent });
    assertRefreshCurrent();
    if (!Array.isArray(projects) || projects.some((source) => source.collection !== 'Custom'))
      throw new TypeError('Installed project sources must belong to Custom.');
    nextCustom.push(...projects);
    assertRefreshCurrent();
    accepted = packs;
    const nextIds = new Set(nextCustom.map((source) => source.id));
    for (const [id] of customOwners)
      if (!nextIds.has(id)) {
        assertRefreshCurrent();
        library.remove(id);
        customOwners.delete(id);
      }
    for (const source of nextCustom)
      if (customOwners.get(source.id) !== source) {
        assertRefreshCurrent();
        library.register(source);
        customOwners.set(source.id, source);
      }
    assertRefreshCurrent();
    return library;
  }
  try {
    await refreshInstalled({ assertCurrent });
  } catch (error) {
    library.dispose();
    throw error;
  }
  return Object.freeze({ library, refreshInstalled });
}
