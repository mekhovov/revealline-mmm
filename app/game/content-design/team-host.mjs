import { createContentExecutionCatalog } from './execution.mjs';
import { createJourneyCatalog } from '../journey/catalog.mjs';
import { createCandidateSequence } from './sequence.mjs';
import { createMissionCard } from './mission-card.mjs';
import { freezeDesign } from './catalogs.mjs';
import { deriveEncounterLevel } from '../hunt/variants.mjs';
import { encounterVariantManifest } from '../hunt/variant-guidance.mjs';
import { ENCOUNTER_VARIANTS } from '../hunt/preferences.mjs';

/** Navigation adapter for an explicitly selected Team candidate library. Packs
 * remain homogeneous immutable runtime editions; crossing a campaign selects
 * the next pack, never flattens/upgrades old levels. The real host still owns
 * input, createCoop, transactional preparation, progress receipts and storage.
 * Greybox membership is not artwork, playtest or official-award qualification. */
export function createCandidateTeamHost(source, { corePackIds } = {}) {
  const executions = createContentExecutionCatalog(source, { mode: 'team' });
  const catalog = createJourneyCatalog(
    executions.journey().campaigns.map(({ packId, runtime, manifests }) => ({
      source: 'candidate',
      packId,
      id: runtime.id,
      title: runtime.name,
      modes: ['team'],
      levels: runtime.levels.map((level, index) => ({
        id: level.id,
        name: level.name,
        hook: manifests[index].design.routeDecision,
      })),
    })),
  );
  const sequence = createCandidateSequence(catalog, corePackIds);
  const manifests = new WeakMap();
  const rows = executions.entries.flatMap((entry) =>
    entry.manifests.map((manifest, index) => {
      const mission = catalog.missions.find(
        (candidate) =>
          candidate.packId === entry.sourcePackId &&
          candidate.campaignId === entry.campaignId &&
          candidate.levelId === manifest.missionId,
      );
      const row = freezeDesign({
        key: `${mission.id}/${entry.difficulty}`,
        mission,
        ...(entry.campaignFeedback ? { campaignFeedback: entry.campaignFeedback } : {}),
        difficulty: entry.difficulty,
        pack: entry.campaign,
        level: entry.campaign.levels[index],
        executionKey: entry.executionKey,
        simulationIdentity: manifest.simulationIdentity,
        background: manifest.background,
        presentation: manifest.presentation,
        officialProgressEligible: false,
        validation: manifest.validation,
      });
      manifests.set(row, manifest);
      return row;
    }),
  );
  const owned = new Set(rows),
    byKey = new Map(rows.map((row) => [row.key, row]));
  const presentations = new WeakMap();
  const rowFor = (mission, difficulty = 'standard') =>
    mission && catalog.find(mission.id) === mission
      ? (byKey.get(`${mission.id}/${difficulty}`) ?? null)
      : null;
  return Object.freeze({
    catalog,
    rows: Object.freeze(rows),
    owns: (row) => owned.has(row),
    row: rowFor,
    officialProgressEligible: false,
    manifest(mission, difficulty = 'standard') {
      const row = rowFor(mission, difficulty);
      return row ? manifests.get(row) : null;
    },
    presentation(mission, difficulty = 'standard', { encounterVariant = 'authored' } = {}) {
      const row = rowFor(mission, difficulty);
      if (!row) return null;
      if (!ENCOUNTER_VARIANTS.includes(encounterVariant)) encounterVariant = 'authored';
      const authored = manifests.get(row);
      let editions = presentations.get(row);
      if (!editions) presentations.set(row, (editions = new Map()));
      if (!editions.has(encounterVariant)) {
        let level = row.level;
        try {
          level = deriveEncounterLevel(row.level, encounterVariant, { mode: 'team' }) ?? level;
        } catch {
          // Match freshRecipe's authored fallback for an unavailable preference.
        }
        editions.set(
          encounterVariant,
          level === row.level ? authored : Object.freeze({ ...authored, level }),
        );
      }
      const selected = editions.get(encounterVariant),
        display = encounterVariantManifest(
          selected,
          selected === authored ? 'authored' : encounterVariant,
        );
      // This display-only view never replaces the canonical manifest, row,
      // simulation identity, artwork owner or journal source.
      return Object.freeze({
        get card() {
          return createMissionCard(display);
        },
        design: display.design,
      });
    },
    card(mission, difficulty = 'standard') {
      const row = rowFor(mission, difficulty);
      return row ? createMissionCard(manifests.get(row)) : null;
    },
    destination(row) {
      if (!owned.has(row)) return null;
      const mission = sequence.next(row.mission.id),
        next = mission ? rowFor(mission, row.difficulty) : null;
      return Object.freeze({
        next,
        final: !next,
        crossesCampaign: !!next && next.pack !== row.pack,
      });
    },
    ...sequence,
  });
}
