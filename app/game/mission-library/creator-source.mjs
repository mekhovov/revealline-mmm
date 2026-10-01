import {
  installedCreatorManifests,
  loadInstalledCreatorBundle,
  createCreatorStore,
} from '../creator/installed.mjs';
import { createContentExecutionCatalog } from '../content-design/execution.mjs';
import { creatorProfileKey } from '../creator/runtime.mjs';
import { createJourneyBackend } from '../journey/profile.mjs';
import { emptyJourneyPictures, journeyPictureCompletion } from '../journey/pictures.mjs';
import { missionLibraryHref } from './handoff.mjs';

/** Modern project-backed content is always Custom, even when source IDs or
 * labels match official content. Browsing reads metadata; play verifies bytes. */
export async function installedCreatorLibrarySources({
  store: suppliedStore,
  profileForEdition,
  launchVersus,
  loadOptions = {},
  launch = (href) => {
    location.href = href;
  },
} = {}) {
  const store = suppliedStore ?? createCreatorStore();
  const sources = [];
  let manifests;
  try {
    manifests = await installedCreatorManifests(store);
  } finally {
    if (!suppliedStore) store.close();
  }
  for (const manifest of manifests) {
    const catalog = createContentExecutionCatalog(manifest.content.project, { mode: 'solo' });
    const entries = catalog.journey().missions;
    let progress = null;
    try {
      progress = profileForEdition
        ? await profileForEdition(manifest.editionId)
        : await createJourneyBackend({
            profileKey: creatorProfileKey(manifest.editionId),
          }).readState();
    } catch {
      /* Browsing remains available when progress storage is unavailable. */
    }
    const snapshot = () =>
      typeof progress?.snapshot === 'function'
        ? progress.snapshot()
        : (progress?.profile ?? progress);
    const pictures = () =>
      typeof progress?.pictures === 'function'
        ? progress.pictures()
        : (progress?.pictures ?? emptyJourneyPictures());
    sources.push({
      id: `creator:${manifest.editionId}`,
      editionId: manifest.editionId,
      edition: `${manifest.content.project.name.slice(0, 140)} · ${manifest.editionId.slice(0, 8)}`,
      collection: 'Custom',
      entries,
      describe(mission) {
        const campaign = manifest.content.project.campaigns.find(
          (c) => c.id === mission.campaignId,
        );
        const level = manifest.content.project.missions.find((m) => m.id === mission.levelId);
        return {
          id: level.id,
          revision: level.revision,
          campaignKey: campaign.id,
          campaignTitle: campaign.name,
          name: level.name,
          levelIndex: campaign.missionIds.indexOf(level.id),
          modes: manifest.content.compatibility.modes,
          tags: [],
          rules: 'Creator template · compiled difficulty presets · exact installed edition',
          hook: level.design.routeDecision,
        };
      },
      availability: () => ({ state: 'ready' }),
      progress: (mission, mode) => (snapshot()?.clears?.[mode]?.[mission.levelId] ? 'Cleared' : ''),
      progressState: (mission, mode) => {
        const receipt = snapshot()?.clears?.[mode]?.[mission.levelId];
        return receipt
          ? {
              state: 'completed',
              bestStars:
                progress?.bestStars?.(mode, mission.levelId) ??
                (Object.hasOwn(progress?.stars?.best?.[mode] ?? {}, mission.levelId)
                  ? progress.stars.best[mode][mission.levelId]
                  : null),
            }
          : { state: 'new', bestStars: null };
      },
      completion(mission, mode) {
        const current = snapshot();
        return current
          ? journeyPictureCompletion({
              profile: current,
              pictures: pictures(),
              mode,
              editionId: manifest.editionId,
              missionId: mission.levelId,
            })
          : null;
      },
      async launch(mission, context) {
        const launchStore = suppliedStore ?? createCreatorStore();
        let prepared;
        try {
          prepared = await loadInstalledCreatorBundle(launchStore, manifest.editionId, {
            ...loadOptions,
            signal: context.signal,
          });
        } finally {
          if (!suppliedStore) launchStore.close();
        }
        if (context.signal?.aborted)
          throw new DOMException('Custom mission cancelled.', 'AbortError');
        if (context.mode === 'versus') {
          if (typeof launchVersus === 'function') return launchVersus(prepared, mission, context);
          return launch(
            missionLibraryHref({
              baseURL: location.href,
              currentMode: 'solo',
              mode: 'versus',
              journey: 'legacy',
              sourceJourney: 'legacy',
              missionId: context.libraryMissionId,
            }),
          );
        }
        const href = new URL('./creator/player.html', new URL('../', import.meta.url));
        href.searchParams.set('edition', manifest.editionId);
        href.searchParams.set('mission', mission.levelId);
        return launch(href.href);
      },
    });
  }
  return sources;
}
