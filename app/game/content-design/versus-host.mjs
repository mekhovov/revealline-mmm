import { CLASSES } from '../core/index.mjs';
import { createJourneyCatalog } from '../journey/catalog.mjs';
import { validateTheme } from '../content.mjs';
import { boundedJSON, required } from '../data-json.mjs';
import { createContentExecutionCatalog } from './execution.mjs';
import { freezeDesign } from './catalogs.mjs';
import { createMissionCard } from './mission-card.mjs';
import { createCandidateSequence } from './sequence.mjs';

/** Uses the shared compiler in Versus mode. The real host still owns createDuel,
 * controllers, paired ticks and race results; no Solo run substitutes for them. */
export function createCandidateVersusHost(
  source,
  { themes, corePackIds = ['journey-opening'], optionalCampaignIds = [] } = {},
) {
  const executions = createContentExecutionCatalog(source, { mode: 'versus' });
  const ownedThemes = boundedJSON(themes, { maxBytes: 262144, maxNodes: 8192, maxDepth: 12 });
  required(Array.isArray(ownedThemes), 'Candidate themes are required.');
  required(
    new Set(ownedThemes.map((theme) => theme.id)).size === ownedThemes.length,
    'Duplicate candidate theme.',
  );
  for (const theme of ownedThemes) required(validateTheme(theme).valid, 'Invalid candidate theme.');
  const catalog = createJourneyCatalog(
    executions.journey().campaigns.map(({ packId, runtime, manifests }) => ({
      source: 'candidate',
      packId,
      id: runtime.id,
      title: runtime.title,
      modes: ['versus'],
      levels: runtime.levels.map((level, index) => ({
        id: level.id,
        name: level.name,
        hook: manifests[index].design.routeDecision,
      })),
    })),
  );
  const sequence = createCandidateSequence(catalog, corePackIds, optionalCampaignIds);
  const rawEntries = new WeakMap();
  const rows = executions.entries.flatMap((entry) =>
    entry.manifests.map((manifest, index) => {
      const mission = catalog.missions.find(
        (candidate) =>
          candidate.packId === entry.sourcePackId &&
          candidate.campaignId === entry.campaignId &&
          candidate.levelId === manifest.level.id,
      );
      const theme = ownedThemes.find((candidate) => candidate.id === manifest.presentation.themeId);
      required(
        theme && manifest.background,
        'Candidate needs its exact authored theme and original.',
      );
      const row = freezeDesign({
        key: `${mission.id}/${entry.difficulty}`,
        chapter: mission.campaignTitle,
        mission,
        ...(entry.campaignFeedback ? { campaignFeedback: entry.campaignFeedback } : {}),
        difficulty: entry.difficulty,
        level: entry.campaign.levels[index],
        classes: CLASSES,
        themes: [theme],
        defaultThemeId: theme.id,
        visualOverrides: {},
        track: null,
        asset: manifest.background,
        executionKey: entry.executionKey,
        musicCampaignKey: entry.baseCampaignKey,
      });
      rawEntries.set(row, entry);
      return row;
    }),
  );
  const owned = new Set(rows);
  return Object.freeze({
    catalog,
    rows: Object.freeze(rows),
    owns: (row) => owned.has(row),
    manifest(mission, difficulty = 'standard') {
      if (!mission || catalog.find(mission.id) !== mission) return null;
      return (
        executions
          .select(mission.packId, mission.campaignId, difficulty)
          ?.manifests.find((item) => item.missionId === mission.levelId) ?? null
      );
    },
    visualThemeSelection(row, level) {
      if (!owned.has(row) || row.level !== level) return null;
      return Object.freeze({ entry: rawEntries.get(row), level });
    },
    card(mission, difficulty = 'standard') {
      if (catalog.find(mission?.id) !== mission) return null;
      const manifest = executions
        .select(mission.packId, mission.campaignId, difficulty)
        ?.manifests.find((item) => item.missionId === mission.levelId);
      return manifest ? createMissionCard(manifest) : null;
    },
    row(mission, difficulty) {
      if (catalog.find(mission?.id) !== mission) return null;
      return rows.find((row) => row.mission === mission && row.difficulty === difficulty) ?? null;
    },
    ...sequence,
  });
}
