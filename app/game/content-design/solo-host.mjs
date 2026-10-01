import { CLASSES } from '../core/index.mjs';
import { createJourneyCatalog } from '../journey/catalog.mjs';
import { createContentAttemptPreparer } from './attempt.mjs';
import { freezeDesign } from './catalogs.mjs';
import { createMissionCard } from './mission-card.mjs';
import { createCandidateSequence } from './sequence.mjs';

/** Explicit candidate rollout adapter. Identity membership, not imported flags,
 * controls this host path. Legacy catalogs and published media stay separate. */
export function createCandidateSoloHost(
  source,
  { themes, buildVersion, corePackIds = ['journey-opening'], optionalCampaignIds = [] } = {},
) {
  const preparer = createContentAttemptPreparer(source, { themes, buildVersion });
  const entries = preparer.catalog.entries.map((entry) =>
    freezeDesign({
      ...entry,
      // Never enter the historical two-preset access projection.
      baseCampaign: null,
      classRecipes: CLASSES,
      themes: themes.filter((theme) =>
        entry.manifests.some((manifest) => manifest.presentation.themeId === theme.id),
      ),
      visualOverrides: {},
      levelVisuals: [],
      music: [],
    }),
  );
  const owned = new Set(entries);
  const rawEntries = new Map(
    entries.map((entry, index) => [entry, preparer.catalog.entries[index]]),
  );
  const catalog = createJourneyCatalog(
    preparer.catalog.journey().campaigns.map(({ packId, runtime, manifests }) => ({
      source: 'candidate',
      packId,
      id: runtime.id,
      title: runtime.title,
      modes: ['solo'],
      levels: runtime.levels.map((level, index) => ({
        id: level.id,
        name: level.name,
        hook: manifests[index].design.routeDecision,
      })),
    })),
  );
  const sequence = createCandidateSequence(catalog, corePackIds, optionalCampaignIds);
  return Object.freeze({
    entries: Object.freeze(entries),
    catalog,
    preparer,
    owns: (entry) => owned.has(entry),
    visualThemeSelection(entry, level) {
      if (!owned.has(entry) || !entry.campaign.levels.includes(level)) return null;
      return Object.freeze({ entry: rawEntries.get(entry), level });
    },
    card(mission, difficulty = 'standard') {
      if (catalog.find(mission?.id) !== mission) return null;
      const manifest = entries
        .find(
          (entry) =>
            entry.sourcePackId === mission.packId &&
            entry.campaignId === mission.campaignId &&
            entry.difficulty === difficulty,
        )
        ?.manifests.find((item) => item.missionId === mission.levelId);
      return manifest ? createMissionCard(manifest) : null;
    },
    select(mission, difficulty) {
      if (catalog.find(mission?.id) !== mission) return null;
      return entries.find(
        (entry) =>
          entry.sourcePackId === mission.packId &&
          entry.campaignId === mission.campaignId &&
          entry.difficulty === difficulty,
      );
    },
    mission(entry, index) {
      if (!owned.has(entry)) return null;
      return (
        catalog.missions.find(
          (mission) =>
            mission.packId === entry.sourcePackId &&
            mission.campaignId === entry.campaignId &&
            mission.levelId === entry.campaign.levels[index]?.id,
        ) ?? null
      );
    },
    ...sequence,
  });
}
