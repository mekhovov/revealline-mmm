import { boundedJSON, required } from '../data-json.mjs';
import { validateTheme } from '../content.mjs';
import { loadAuthoredJourneyRoute } from "../editions/standalone/route-loader.mjs";
import { createContentExecutionCatalog } from '../content-design/execution.mjs';
import { compileContentProject } from '../content-design/project.mjs';
import { createJourneyCatalog } from '../journey/catalog.mjs';
import { createMissionCard } from '../content-design/mission-card.mjs';
import { journeyActorThemeCandidates } from '../presentation/journey-actor-materials.mjs';
import { journeyLibrarySource } from './journey-source.mjs';
import { combineJourneyLibrarySources } from './cross-mode-journey.mjs';
import { authoredJourneyMissionTags, journeyMissionDetails } from './journey-presentation.mjs';
import { UKRAINIAN_ORNAMENT_ATLAS_IDS } from '../content-design/ukrainian-ornament-atlas-registry.mjs';
import { t } from '../i18n/index.mjs';

const SPATIAL_V9_MISSIONS = Object.freeze(['stepping-stones', 'return-pocket', 'neutral-ground']);
const HORIZON_V10_MISSIONS = Object.freeze(['island-outpost', 'long-way-home', 'horizon-remix']);
const BORDER_V11_MISSIONS = Object.freeze(['second-landing', 'long-rail', 'new-frontier']);
const BORDER_SIGNAL_V12_MISSIONS = Object.freeze(['border-remix', 'dry-spine', 'wide-approach']);
const EARLY_CULTURAL_V13_MISSIONS = Object.freeze([
  'nearby-shore',
  'two-bays',
  'behind-the-patrol',
]);
const SIGNAL_CULTURAL_V14_MISSIONS = Object.freeze([
  'soft-crossing',
  'cool-the-crossing',
  'signal-remix',
]);
const NEON_CULTURAL_V15_MISSIONS = Object.freeze(['folded-corner', 'inside-out', 'side-door-bays']);
const NEON_CULTURAL_V16_MISSIONS = Object.freeze([
  'dogleg-return',
  'staggered-circuit',
  'neon-remix',
]);
const ROVER_CULTURAL_V17_MISSIONS = Object.freeze([
  'wake-the-yard',
  'between-the-rows',
  'rover-remix',
]);
const FRACTURE_CULTURAL_V18_MISSIONS = Object.freeze([
  'first-fracture',
  'two-districts',
  'fracture-remix',
]);
const PHASEWORKS_CULTURAL_V19_MISSIONS = Object.freeze([
  'return-in-reserve',
  'two-ways-home',
  'dogleg-transfer',
]);
const LIVEWIRE_CULTURAL_V20_MISSIONS = Object.freeze([
  'read-the-lock',
  'switchyard',
  'split-junction',
]);
const RELAY_CULTURAL_V21_MISSIONS = Object.freeze([
  'first-link',
  'second-approach',
  'three-compounds',
]);
const CROSSWIND_CULTURAL_V22_MISSIONS = Object.freeze([
  'read-the-arrows',
  'windbreak-weave',
  'long-wave',
]);
const SENTINEL_CULTURAL_V23_MISSIONS = Object.freeze([
  'first-relay',
  'relay-perimeter',
  'crown-audience',
]);
const APEX_CULTURAL_V24_MISSIONS = Object.freeze([
  'crossing-complete',
  'returning-light',
  'home-signal',
]);
const ORNAMENT_V1_MISSIONS = Object.freeze([
  'cross-stitch-crossings',
  'rushnyk-bands',
  'pysanka-sections',
]);
const EDITION_HISTORY = Object.freeze({
  'whole-spatial-v25': Object.freeze([
    Object.freeze({ routeId: 'whole-spatial-v24', missionIds: APEX_CULTURAL_V24_MISSIONS }),
    Object.freeze({ routeId: 'whole-spatial-v23', missionIds: SENTINEL_CULTURAL_V23_MISSIONS }),
    Object.freeze({ routeId: 'whole-spatial-v22', missionIds: CROSSWIND_CULTURAL_V22_MISSIONS }),
    Object.freeze({ routeId: 'whole-spatial-v21', missionIds: RELAY_CULTURAL_V21_MISSIONS }),
    Object.freeze({ routeId: 'whole-spatial-v20', missionIds: LIVEWIRE_CULTURAL_V20_MISSIONS }),
    Object.freeze({ routeId: 'whole-spatial-v19', missionIds: PHASEWORKS_CULTURAL_V19_MISSIONS }),
    Object.freeze({ routeId: 'whole-spatial-v18', missionIds: FRACTURE_CULTURAL_V18_MISSIONS }),
    Object.freeze({ routeId: 'whole-spatial-v17', missionIds: ROVER_CULTURAL_V17_MISSIONS }),
    Object.freeze({ routeId: 'whole-spatial-v16', missionIds: NEON_CULTURAL_V16_MISSIONS }),
    Object.freeze({ routeId: 'whole-spatial-v15', missionIds: NEON_CULTURAL_V15_MISSIONS }),
    Object.freeze({ routeId: 'whole-spatial-v14', missionIds: SIGNAL_CULTURAL_V14_MISSIONS }),
    Object.freeze({ routeId: 'whole-spatial-v13', missionIds: EARLY_CULTURAL_V13_MISSIONS }),
    Object.freeze({ routeId: 'whole-spatial-v12', missionIds: BORDER_SIGNAL_V12_MISSIONS }),
    Object.freeze({ routeId: 'whole-spatial-v11', missionIds: BORDER_V11_MISSIONS }),
    Object.freeze({ routeId: 'whole-spatial-v10', missionIds: HORIZON_V10_MISSIONS }),
    Object.freeze({ routeId: 'whole-spatial-v9', missionIds: SPATIAL_V9_MISSIONS }),
  ]),
  'whole-spatial-v24': Object.freeze([
    Object.freeze({ routeId: 'whole-spatial-v23', missionIds: SENTINEL_CULTURAL_V23_MISSIONS }),
    Object.freeze({ routeId: 'whole-spatial-v22', missionIds: CROSSWIND_CULTURAL_V22_MISSIONS }),
    Object.freeze({ routeId: 'whole-spatial-v21', missionIds: RELAY_CULTURAL_V21_MISSIONS }),
    Object.freeze({ routeId: 'whole-spatial-v20', missionIds: LIVEWIRE_CULTURAL_V20_MISSIONS }),
    Object.freeze({ routeId: 'whole-spatial-v19', missionIds: PHASEWORKS_CULTURAL_V19_MISSIONS }),
    Object.freeze({ routeId: 'whole-spatial-v18', missionIds: FRACTURE_CULTURAL_V18_MISSIONS }),
    Object.freeze({ routeId: 'whole-spatial-v17', missionIds: ROVER_CULTURAL_V17_MISSIONS }),
    Object.freeze({ routeId: 'whole-spatial-v16', missionIds: NEON_CULTURAL_V16_MISSIONS }),
    Object.freeze({ routeId: 'whole-spatial-v15', missionIds: NEON_CULTURAL_V15_MISSIONS }),
    Object.freeze({ routeId: 'whole-spatial-v14', missionIds: SIGNAL_CULTURAL_V14_MISSIONS }),
    Object.freeze({ routeId: 'whole-spatial-v13', missionIds: EARLY_CULTURAL_V13_MISSIONS }),
    Object.freeze({ routeId: 'whole-spatial-v12', missionIds: BORDER_SIGNAL_V12_MISSIONS }),
    Object.freeze({ routeId: 'whole-spatial-v11', missionIds: BORDER_V11_MISSIONS }),
    Object.freeze({ routeId: 'whole-spatial-v10', missionIds: HORIZON_V10_MISSIONS }),
    Object.freeze({ routeId: 'whole-spatial-v9', missionIds: SPATIAL_V9_MISSIONS }),
  ]),
  'whole-spatial-v23': Object.freeze([
    Object.freeze({ routeId: 'whole-spatial-v22', missionIds: CROSSWIND_CULTURAL_V22_MISSIONS }),
    Object.freeze({ routeId: 'whole-spatial-v21', missionIds: RELAY_CULTURAL_V21_MISSIONS }),
    Object.freeze({ routeId: 'whole-spatial-v20', missionIds: LIVEWIRE_CULTURAL_V20_MISSIONS }),
    Object.freeze({ routeId: 'whole-spatial-v19', missionIds: PHASEWORKS_CULTURAL_V19_MISSIONS }),
    Object.freeze({ routeId: 'whole-spatial-v18', missionIds: FRACTURE_CULTURAL_V18_MISSIONS }),
    Object.freeze({ routeId: 'whole-spatial-v17', missionIds: ROVER_CULTURAL_V17_MISSIONS }),
    Object.freeze({ routeId: 'whole-spatial-v16', missionIds: NEON_CULTURAL_V16_MISSIONS }),
    Object.freeze({ routeId: 'whole-spatial-v15', missionIds: NEON_CULTURAL_V15_MISSIONS }),
    Object.freeze({ routeId: 'whole-spatial-v14', missionIds: SIGNAL_CULTURAL_V14_MISSIONS }),
    Object.freeze({ routeId: 'whole-spatial-v13', missionIds: EARLY_CULTURAL_V13_MISSIONS }),
    Object.freeze({ routeId: 'whole-spatial-v12', missionIds: BORDER_SIGNAL_V12_MISSIONS }),
    Object.freeze({ routeId: 'whole-spatial-v11', missionIds: BORDER_V11_MISSIONS }),
    Object.freeze({ routeId: 'whole-spatial-v10', missionIds: HORIZON_V10_MISSIONS }),
    Object.freeze({ routeId: 'whole-spatial-v9', missionIds: SPATIAL_V9_MISSIONS }),
  ]),
  'whole-spatial-v22': Object.freeze([
    Object.freeze({ routeId: 'whole-spatial-v21', missionIds: RELAY_CULTURAL_V21_MISSIONS }),
    Object.freeze({ routeId: 'whole-spatial-v20', missionIds: LIVEWIRE_CULTURAL_V20_MISSIONS }),
    Object.freeze({ routeId: 'whole-spatial-v19', missionIds: PHASEWORKS_CULTURAL_V19_MISSIONS }),
    Object.freeze({ routeId: 'whole-spatial-v18', missionIds: FRACTURE_CULTURAL_V18_MISSIONS }),
    Object.freeze({ routeId: 'whole-spatial-v17', missionIds: ROVER_CULTURAL_V17_MISSIONS }),
    Object.freeze({ routeId: 'whole-spatial-v16', missionIds: NEON_CULTURAL_V16_MISSIONS }),
    Object.freeze({ routeId: 'whole-spatial-v15', missionIds: NEON_CULTURAL_V15_MISSIONS }),
    Object.freeze({ routeId: 'whole-spatial-v14', missionIds: SIGNAL_CULTURAL_V14_MISSIONS }),
    Object.freeze({ routeId: 'whole-spatial-v13', missionIds: EARLY_CULTURAL_V13_MISSIONS }),
    Object.freeze({ routeId: 'whole-spatial-v12', missionIds: BORDER_SIGNAL_V12_MISSIONS }),
    Object.freeze({ routeId: 'whole-spatial-v11', missionIds: BORDER_V11_MISSIONS }),
    Object.freeze({ routeId: 'whole-spatial-v10', missionIds: HORIZON_V10_MISSIONS }),
    Object.freeze({ routeId: 'whole-spatial-v9', missionIds: SPATIAL_V9_MISSIONS }),
  ]),
  'whole-spatial-v21': Object.freeze([
    Object.freeze({ routeId: 'whole-spatial-v20', missionIds: LIVEWIRE_CULTURAL_V20_MISSIONS }),
    Object.freeze({ routeId: 'whole-spatial-v19', missionIds: PHASEWORKS_CULTURAL_V19_MISSIONS }),
    Object.freeze({ routeId: 'whole-spatial-v18', missionIds: FRACTURE_CULTURAL_V18_MISSIONS }),
    Object.freeze({ routeId: 'whole-spatial-v17', missionIds: ROVER_CULTURAL_V17_MISSIONS }),
    Object.freeze({ routeId: 'whole-spatial-v16', missionIds: NEON_CULTURAL_V16_MISSIONS }),
    Object.freeze({ routeId: 'whole-spatial-v15', missionIds: NEON_CULTURAL_V15_MISSIONS }),
    Object.freeze({ routeId: 'whole-spatial-v14', missionIds: SIGNAL_CULTURAL_V14_MISSIONS }),
    Object.freeze({ routeId: 'whole-spatial-v13', missionIds: EARLY_CULTURAL_V13_MISSIONS }),
    Object.freeze({ routeId: 'whole-spatial-v12', missionIds: BORDER_SIGNAL_V12_MISSIONS }),
    Object.freeze({ routeId: 'whole-spatial-v11', missionIds: BORDER_V11_MISSIONS }),
    Object.freeze({ routeId: 'whole-spatial-v10', missionIds: HORIZON_V10_MISSIONS }),
    Object.freeze({ routeId: 'whole-spatial-v9', missionIds: SPATIAL_V9_MISSIONS }),
  ]),
  'whole-spatial-v20': Object.freeze([
    Object.freeze({ routeId: 'whole-spatial-v19', missionIds: PHASEWORKS_CULTURAL_V19_MISSIONS }),
    Object.freeze({ routeId: 'whole-spatial-v18', missionIds: FRACTURE_CULTURAL_V18_MISSIONS }),
    Object.freeze({ routeId: 'whole-spatial-v17', missionIds: ROVER_CULTURAL_V17_MISSIONS }),
    Object.freeze({ routeId: 'whole-spatial-v16', missionIds: NEON_CULTURAL_V16_MISSIONS }),
    Object.freeze({ routeId: 'whole-spatial-v15', missionIds: NEON_CULTURAL_V15_MISSIONS }),
    Object.freeze({ routeId: 'whole-spatial-v14', missionIds: SIGNAL_CULTURAL_V14_MISSIONS }),
    Object.freeze({ routeId: 'whole-spatial-v13', missionIds: EARLY_CULTURAL_V13_MISSIONS }),
    Object.freeze({ routeId: 'whole-spatial-v12', missionIds: BORDER_SIGNAL_V12_MISSIONS }),
    Object.freeze({ routeId: 'whole-spatial-v11', missionIds: BORDER_V11_MISSIONS }),
    Object.freeze({ routeId: 'whole-spatial-v10', missionIds: HORIZON_V10_MISSIONS }),
    Object.freeze({ routeId: 'whole-spatial-v9', missionIds: SPATIAL_V9_MISSIONS }),
  ]),
  'whole-spatial-v19': Object.freeze([
    Object.freeze({ routeId: 'whole-spatial-v18', missionIds: FRACTURE_CULTURAL_V18_MISSIONS }),
    Object.freeze({ routeId: 'whole-spatial-v17', missionIds: ROVER_CULTURAL_V17_MISSIONS }),
    Object.freeze({ routeId: 'whole-spatial-v16', missionIds: NEON_CULTURAL_V16_MISSIONS }),
    Object.freeze({ routeId: 'whole-spatial-v15', missionIds: NEON_CULTURAL_V15_MISSIONS }),
    Object.freeze({ routeId: 'whole-spatial-v14', missionIds: SIGNAL_CULTURAL_V14_MISSIONS }),
    Object.freeze({ routeId: 'whole-spatial-v13', missionIds: EARLY_CULTURAL_V13_MISSIONS }),
    Object.freeze({ routeId: 'whole-spatial-v12', missionIds: BORDER_SIGNAL_V12_MISSIONS }),
    Object.freeze({ routeId: 'whole-spatial-v11', missionIds: BORDER_V11_MISSIONS }),
    Object.freeze({ routeId: 'whole-spatial-v10', missionIds: HORIZON_V10_MISSIONS }),
    Object.freeze({ routeId: 'whole-spatial-v9', missionIds: SPATIAL_V9_MISSIONS }),
  ]),
  'whole-spatial-v18': Object.freeze([
    Object.freeze({ routeId: 'whole-spatial-v17', missionIds: ROVER_CULTURAL_V17_MISSIONS }),
    Object.freeze({ routeId: 'whole-spatial-v16', missionIds: NEON_CULTURAL_V16_MISSIONS }),
    Object.freeze({ routeId: 'whole-spatial-v15', missionIds: NEON_CULTURAL_V15_MISSIONS }),
    Object.freeze({ routeId: 'whole-spatial-v14', missionIds: SIGNAL_CULTURAL_V14_MISSIONS }),
    Object.freeze({ routeId: 'whole-spatial-v13', missionIds: EARLY_CULTURAL_V13_MISSIONS }),
    Object.freeze({ routeId: 'whole-spatial-v12', missionIds: BORDER_SIGNAL_V12_MISSIONS }),
    Object.freeze({ routeId: 'whole-spatial-v11', missionIds: BORDER_V11_MISSIONS }),
    Object.freeze({ routeId: 'whole-spatial-v10', missionIds: HORIZON_V10_MISSIONS }),
    Object.freeze({ routeId: 'whole-spatial-v9', missionIds: SPATIAL_V9_MISSIONS }),
  ]),
  'whole-spatial-v17': Object.freeze([
    Object.freeze({ routeId: 'whole-spatial-v16', missionIds: NEON_CULTURAL_V16_MISSIONS }),
    Object.freeze({ routeId: 'whole-spatial-v15', missionIds: NEON_CULTURAL_V15_MISSIONS }),
    Object.freeze({ routeId: 'whole-spatial-v14', missionIds: SIGNAL_CULTURAL_V14_MISSIONS }),
    Object.freeze({ routeId: 'whole-spatial-v13', missionIds: EARLY_CULTURAL_V13_MISSIONS }),
    Object.freeze({ routeId: 'whole-spatial-v12', missionIds: BORDER_SIGNAL_V12_MISSIONS }),
    Object.freeze({ routeId: 'whole-spatial-v11', missionIds: BORDER_V11_MISSIONS }),
    Object.freeze({ routeId: 'whole-spatial-v10', missionIds: HORIZON_V10_MISSIONS }),
    Object.freeze({ routeId: 'whole-spatial-v9', missionIds: SPATIAL_V9_MISSIONS }),
  ]),
  'whole-spatial-v16': Object.freeze([
    Object.freeze({ routeId: 'whole-spatial-v15', missionIds: NEON_CULTURAL_V15_MISSIONS }),
    Object.freeze({ routeId: 'whole-spatial-v14', missionIds: SIGNAL_CULTURAL_V14_MISSIONS }),
    Object.freeze({ routeId: 'whole-spatial-v13', missionIds: EARLY_CULTURAL_V13_MISSIONS }),
    Object.freeze({ routeId: 'whole-spatial-v12', missionIds: BORDER_SIGNAL_V12_MISSIONS }),
    Object.freeze({ routeId: 'whole-spatial-v11', missionIds: BORDER_V11_MISSIONS }),
    Object.freeze({ routeId: 'whole-spatial-v10', missionIds: HORIZON_V10_MISSIONS }),
    Object.freeze({ routeId: 'whole-spatial-v9', missionIds: SPATIAL_V9_MISSIONS }),
  ]),
  'whole-spatial-v15': Object.freeze([
    Object.freeze({ routeId: 'whole-spatial-v14', missionIds: SIGNAL_CULTURAL_V14_MISSIONS }),
    Object.freeze({ routeId: 'whole-spatial-v13', missionIds: EARLY_CULTURAL_V13_MISSIONS }),
    Object.freeze({ routeId: 'whole-spatial-v12', missionIds: BORDER_SIGNAL_V12_MISSIONS }),
    Object.freeze({ routeId: 'whole-spatial-v11', missionIds: BORDER_V11_MISSIONS }),
    Object.freeze({ routeId: 'whole-spatial-v10', missionIds: HORIZON_V10_MISSIONS }),
    Object.freeze({ routeId: 'whole-spatial-v9', missionIds: SPATIAL_V9_MISSIONS }),
  ]),
  'whole-spatial-v14': Object.freeze([
    Object.freeze({ routeId: 'whole-spatial-v13', missionIds: EARLY_CULTURAL_V13_MISSIONS }),
    Object.freeze({ routeId: 'whole-spatial-v12', missionIds: BORDER_SIGNAL_V12_MISSIONS }),
    Object.freeze({ routeId: 'whole-spatial-v11', missionIds: BORDER_V11_MISSIONS }),
    Object.freeze({ routeId: 'whole-spatial-v10', missionIds: HORIZON_V10_MISSIONS }),
    Object.freeze({ routeId: 'whole-spatial-v9', missionIds: SPATIAL_V9_MISSIONS }),
  ]),
  'whole-spatial-v10': Object.freeze([
    Object.freeze({ routeId: 'whole-spatial-v9', missionIds: SPATIAL_V9_MISSIONS }),
  ]),
  'whole-spatial-v11': Object.freeze([
    Object.freeze({ routeId: 'whole-spatial-v10', missionIds: HORIZON_V10_MISSIONS }),
    Object.freeze({ routeId: 'whole-spatial-v9', missionIds: SPATIAL_V9_MISSIONS }),
  ]),
  'whole-spatial-v12': Object.freeze([
    Object.freeze({ routeId: 'whole-spatial-v11', missionIds: BORDER_V11_MISSIONS }),
    Object.freeze({ routeId: 'whole-spatial-v10', missionIds: HORIZON_V10_MISSIONS }),
    Object.freeze({ routeId: 'whole-spatial-v9', missionIds: SPATIAL_V9_MISSIONS }),
  ]),
  'whole-spatial-v13': Object.freeze([
    Object.freeze({ routeId: 'whole-spatial-v12', missionIds: BORDER_SIGNAL_V12_MISSIONS }),
    Object.freeze({ routeId: 'whole-spatial-v11', missionIds: BORDER_V11_MISSIONS }),
    Object.freeze({ routeId: 'whole-spatial-v10', missionIds: HORIZON_V10_MISSIONS }),
    Object.freeze({ routeId: 'whole-spatial-v9', missionIds: SPATIAL_V9_MISSIONS }),
  ]),
  'whole-ornament-v1': Object.freeze([
    Object.freeze({ routeId: 'whole-spatial-v11', missionIds: ORNAMENT_V1_MISSIONS }),
  ]),
  'whole-ornament-v2': Object.freeze([
    Object.freeze({ routeId: 'whole-ornament-v1', missionIds: UKRAINIAN_ORNAMENT_ATLAS_IDS }),
    Object.freeze({ routeId: 'whole-spatial-v11', missionIds: ORNAMENT_V1_MISSIONS }),
  ]),
});

// Each successor retains only the missions it changes from its immediate
// predecessor. Inheriting the existing list keeps older distinct versions
// selectable without adding every unchanged mission from every edition.
const CANDIDATE_EDITION_HISTORY = { ...EDITION_HISTORY };
for (const [version, missionIds] of [
  [26, ['spiral-stores', 'nested-relays', 'watchpost-exchange']],
  [27, ['survey-markers', 'compass-array', 'outer-loop']],
  [28, ['bank-the-crossing', 'five-anchors', 'final-broadcast']],
  [29, ['folded-corner', 'inside-out', 'four-quarters']],
  [30, ['split-berths', 'stepped-return']],
  [31, ['second-landing', 'long-rail', 'new-frontier']],
  [32, ['turn-the-corner', 'return-pocket']],
  [33, ['two-ways-home', 'read-the-lock', 'returning-light']],
  [34, ['garden-refuges', 'broken-yard', 'island-reserve']],
  [35, ['phase-remix', 'livewire-remix']],
  [36, ['side-door-bays', 'staggered-reserve', 'crossbar-depot']],
  [37, ['pressure-ladder', 'cooling-loop', 'relay-remix']],
  [38, ['cooling-loop']],
]) {
  const predecessor = `whole-spatial-v${version - 1}`;
  CANDIDATE_EDITION_HISTORY[`whole-spatial-v${version}`] = Object.freeze([
    Object.freeze({ routeId: predecessor, missionIds: Object.freeze(missionIds) }),
    ...CANDIDATE_EDITION_HISTORY[predecessor],
  ]);
}
Object.freeze(CANDIDATE_EDITION_HISTORY);

/** Shared registration for the prior cards the current route actually exposes. */
export function spatialNextPriorEditions(activeRouteId) {
  return CANDIDATE_EDITION_HISTORY[activeRouteId] || Object.freeze([]);
}

/** Bound the display projection before compilation. compileContentProject
 * resolves every mission/preset/mode it receives, so filtering only after an
 * execution catalog is built would make a small historical card set pay for
 * the complete 91-mission edition twice. The full prior route remains the
 * launch authority; this projection owns card/details qualification only. */
export function spatialNextPriorEditionProjection(source, missionIds = SPATIAL_V9_MISSIONS) {
  const selectedIds = new Set(missionIds);
  required(
    source &&
      Array.isArray(missionIds) &&
      missionIds.length > 0 &&
      missionIds.length <= 12 &&
      selectedIds.size === missionIds.length &&
      ['maps', 'missions', 'campaigns', 'packs', 'assets'].every((key) =>
        Array.isArray(source[key]),
      ),
    'Spatial edition needs a complete prior source.',
  );
  const missions = source.missions.filter((mission) => selectedIds.has(mission.id));
  required(
    missions.length === selectedIds.size &&
      new Set(missions.map((mission) => mission.id)).size === selectedIds.size,
    'Spatial edition must project each prior mission exactly once.',
  );
  const mapKeys = new Set(missions.map((mission) => JSON.stringify(mission.map)));
  const maps = source.maps.filter((map) =>
    mapKeys.has(JSON.stringify({ id: map.id, revision: map.revision })),
  );
  required(maps.length === mapKeys.size, 'Spatial edition map projection is incomplete.');

  const campaigns = source.campaigns.flatMap((campaign) => {
    const selectedMissionIds = campaign.missionIds.filter((id) => selectedIds.has(id));
    return selectedMissionIds.length ? [{ ...campaign, missionIds: selectedMissionIds }] : [];
  });
  for (const mission of missions)
    required(
      campaigns.filter((campaign) => campaign.missionIds.includes(mission.id)).length === 1,
      'Spatial edition mission needs one prior campaign owner.',
    );
  const campaignIds = new Set(campaigns.map((campaign) => campaign.id));
  const packs = source.packs.flatMap((pack) => {
    const owned = pack.campaignIds.filter((id) => campaignIds.has(id));
    return owned.length ? [{ ...pack, campaignIds: owned }] : [];
  });
  for (const campaign of campaigns)
    required(
      packs.filter((pack) => pack.campaignIds.includes(campaign.id)).length === 1,
      'Spatial edition campaign needs one prior pack owner.',
    );

  const assetIds = new Set(
    missions.map((mission) => mission.presentation.backgroundAssetId).filter((id) => id !== null),
  );
  const assets = source.assets.filter((asset) => assetIds.has(asset.id));
  required(assets.length === assetIds.size, 'Spatial edition asset projection is incomplete.');
  return {
    ...source,
    maps,
    missions,
    campaigns,
    packs,
    assets,
  };
}

/** Add only curated prior-edition cards beside the active Journey. They remain
 * manual launches into each complete receiving route and never become an
 * automatic Next sequence or cross-edition progress owner. */
export async function createSpatialNextEditionSources({
  activeRouteId,
  originalThemes,
  difficulty = () => 'standard',
  launch,
  profile,
} = {}) {
  const history = spatialNextPriorEditions(activeRouteId);
  if (!history.length) return Object.freeze({ sources: Object.freeze([]), dispose() {} });
  required(typeof launch === 'function', 'Spatial editions need an exact mission handoff.');
  required(typeof difficulty === 'function', 'Spatial editions need the selected preset.');
  required(
    profile === undefined || typeof profile?.snapshot === 'function',
    'Spatial edition progress needs its own profile.',
  );
  const originals = boundedJSON(originalThemes, {
    maxBytes: 262144,
    maxNodes: 8192,
    maxDepth: 12,
  });
  required(Array.isArray(originals) && originals.length > 0, 'Candidate themes are required.');
  let disposed = false;
  const sources = [];
  for (const [historyIndex, edition] of history.entries()) {
    const route = await loadAuthoredJourneyRoute(edition.routeId, { fullSource: true });
    const themes = journeyActorThemeCandidates(originals, {
      includeOriginals: route.preserveOriginalThemes === true,
    });
    required(
      new Set(themes.map((theme) => theme.id)).size === themes.length &&
        themes.every((theme) => validateTheme(theme).valid),
      'Spatial editions need valid, unique candidate themes.',
    );
    const themeIds = new Set(themes.map((theme) => theme.id));
    const project = compileContentProject(
      spatialNextPriorEditionProjection(route.source, edition.missionIds),
    );
    const selectedIds = new Set(edition.missionIds);
    const qualified = ['solo', 'versus'].map((mode) => {
      const executions = createContentExecutionCatalog(project, { mode });
      const fullCatalog = createJourneyCatalog(
        executions.journey().campaigns.map(({ packId, runtime, manifests }) => ({
          source: 'candidate',
          packId,
          id: runtime.id,
          title: runtime.title,
          modes: [mode],
          levels: runtime.levels.map((level, index) => ({
            id: level.id,
            name: level.name,
            hook: manifests[index].design.routeDecision,
          })),
        })),
      );
      const missions = fullCatalog.missions
        .filter((mission) => selectedIds.has(mission.levelId))
        .map((mission) => {
          const campaign = route.source.campaigns.find(
            (item) => item.id === mission.campaignId && item.missionIds.includes(mission.levelId),
          );
          const levelIndex = campaign?.missionIds.indexOf(mission.levelId);
          return Number.isInteger(levelIndex) && levelIndex >= 0
            ? Object.freeze({ ...mission, levelIndex })
            : mission;
        });
      required(
        missions.length === selectedIds.size &&
          new Set(missions.map((mission) => mission.levelId)).size === selectedIds.size,
        'Spatial edition must contain each prior mission owner exactly once.',
      );
      const manifestFor = (mission, preset = difficulty()) =>
        executions
          .select(mission.packId, mission.campaignId, preset)
          ?.manifests.find((item) => item.missionId === mission.levelId);
      for (const mission of missions)
        for (const preset of ['gentle', 'standard', 'expert']) {
          const manifest = manifestFor(mission, preset);
          required(
            manifest?.background && themeIds.has(manifest.presentation.themeId),
            'Spatial edition needs its exact authored theme and original.',
          );
        }
      const source = journeyLibrarySource({
        lifecycle: 'archive',
        editionId: route.id,
        edition: `Previous Journey · v${route.id.split('v').at(-1)}`,
        editionLabel: () =>
          t('interface:missionLibrary.previousJourney', { version: route.id.split('v').at(-1) }),
        catalog: { missions },
        profile: historyIndex === 0 ? profile : undefined,
        details: (mission) => journeyMissionDetails(manifestFor(mission)),
        tags: (mission) => authoredJourneyMissionTags(mission, manifestFor(mission, 'standard')),
        card: (mission) => createMissionCard(manifestFor(mission)),
        launch: (_mission, context) => {
          if (disposed || context?.isCurrent?.() === false) return false;
          return launch(context);
        },
      });
      return {
        mode,
        source: {
          ...source,
          ...(profile === undefined ? { progress: () => '' } : {}),
          availability: () =>
            disposed
              ? {
                  state: 'unavailable',
                  reason: t('interface:missionLibrary.closedReopen'),
                }
              : { state: 'ready' },
        },
      };
    });
    sources.push(
      Object.freeze({
        ...combineJourneyLibrarySources(qualified),
        automaticContinuation: false,
      }),
    );
  }
  return Object.freeze({
    sources: Object.freeze(sources),
    dispose() {
      disposed = true;
    },
  });
}
