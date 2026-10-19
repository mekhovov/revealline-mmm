import { supplementalDuelSources } from './supplemental-hunt.mjs';
import {
  createTeamExpansionCandidates,
  createDuelExpansionCandidates,
  TEAM_EXPANSION_ROUTE,
  DUEL_EXPANSION_ROUTE,
} from '../content-design/multiplayer-expansion.mjs';
import { createCandidateTeamHost } from '../content-design/team-host.mjs';
import { createCandidateVersusHost } from '../content-design/versus-host.mjs';
import { teamJourneyLibrarySource } from './team-source.mjs';
import { journeyLibrarySource } from './journey-source.mjs';
import { journeyMissionDetails, authoredJourneyMissionTags } from './journey-presentation.mjs';
import { t } from '../i18n/index.mjs';
import { combineJourneyLibrarySources } from './cross-mode-journey.mjs';
import { authoredJourneyUsesActorMaterials } from '../content-design/mode-href.mjs';
import { journeyActorThemeCandidates } from '../presentation/journey-actor-materials.mjs';

/** The dedicated Duel route still offers the retained Journey in both of its
 * qualified modes. A browse row always hands off to that original owner. */
export async function retainedJourneyFromExpeditions({
  activeRouteId,
  themes,
  launch,
  difficulty = () => 'standard',
}) {
  if (activeRouteId !== DUEL_EXPANSION_ROUTE) return [];
  const { loadAuthoredJourneyRoute } = await import("../editions/standalone/route-loader.mjs");
  const { DEFAULT_JOURNEY_ROUTES } = await import('../content-design/default-entry.mjs');
  const { createCandidateSoloHost } = await import('../content-design/solo-host.mjs');
  // Packaged builds return lightweight default navigation unless the owning
  // host explicitly requests the complete source for these runtime adapters.
  const route = await loadAuthoredJourneyRoute(DEFAULT_JOURNEY_ROUTES.versus, {
    fullSource: true,
  });
  themes = authoredJourneyUsesActorMaterials(route.id)
    ? journeyActorThemeCandidates(themes, {
        includeOriginals: route.preserveOriginalThemes === true,
      })
    : themes;
  const modes = ['solo', 'versus'].map((mode) => {
    const host =
      mode === 'solo'
        ? createCandidateSoloHost(route.source, { themes, corePackIds: route.corePackIds })
        : createCandidateVersusHost(route.source, { themes, corePackIds: route.corePackIds });
    const manifest = (mission) =>
      mode === 'solo'
        ? host.select(mission, difficulty())?.manifests.find((m) => m.missionId === mission.levelId)
        : host.manifest(mission, difficulty());
    return {
      mode,
      source: journeyLibrarySource({
        editionId: route.id,
        edition: route.label,
        lifecycle: 'current',
        catalog: host.catalog,
        details: (m) => journeyMissionDetails(manifest(m)),
        tags: (m) => authoredJourneyMissionTags(m, manifest(m)),
        card: (m) => host.card(m, difficulty()),
        launch: (_m, context) => launch(context),
      }),
    };
  });
  return [combineJourneyLibrarySources(modes)];
}

export function teamExpeditionLibrarySource({ launch, difficulty = () => 'standard' }) {
  const source = createTeamExpansionCandidates();
  const journey = createCandidateTeamHost(source, { corePackIds: source.packs.map((p) => p.id) });
  return teamJourneyLibrarySource({
    journey,
    editionId: TEAM_EXPANSION_ROUTE,
    edition: t('interface:expeditions.team'),
    difficulty,
    launch: (_row, context) => launch(context),
  });
}

export function duelExpeditionLibrarySources({
  themes,
  launch,
  difficulty = () => 'standard',
  activeRouteId,
}) {
  const supplemental = supplementalDuelSources({ launch, themes, difficulty, activeRouteId });
  if (activeRouteId === DUEL_EXPANSION_ROUTE) return supplemental;
  const source = createDuelExpansionCandidates();
  const host = createCandidateVersusHost(source, {
    themes,
    corePackIds: source.packs.map((p) => p.id),
  });
  return [
    ...supplemental,
    journeyLibrarySource({
      editionId: DUEL_EXPANSION_ROUTE,
      edition: 'Duel Expeditions',
      editionLabel: () => t('interface:expeditions.duel'),
      catalog: host.catalog,
      details: (mission) => journeyMissionDetails(host.manifest(mission, difficulty())),
      tags: (mission) => authoredJourneyMissionTags(mission, host.manifest(mission)),
      card: (mission) => host.card(mission, difficulty()),
      launch: (_mission, context) => launch(context),
    }),
  ];
}
