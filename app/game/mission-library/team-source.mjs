import { journeyLibrarySource } from './journey-source.mjs';
import { journeyMissionDetails, authoredJourneyMissionTags } from './journey-presentation.mjs';
import { COOP_STARTER_PACK } from '../coop/library.mjs';
import { t } from '../i18n/index.mjs';
import { classifyContent } from '../content-design/content-lifecycle.mjs';
import { canonicalMissionLevelKey, officialLevelNumber } from '../level-numbering.mjs';

export const TEAM_LIBRARY_JOURNEY_EDITION = 'team-cultural-specialist-originals-2';
export const TEAM_LIBRARY_CLASSIC_SOURCE = 'team-classic:relay-rescue-starter';
const difficultyKeys = Object.freeze({
  gentle: 'interface:missionLibrary.team.difficulty.gentle',
  standard: 'interface:missionLibrary.team.difficulty.standard',
  expert: 'interface:missionLibrary.team.difficulty.expert',
});

/** Team's runtime rows and opaque imported-art owner remain outside display
 * identities. Presets resolve at activation; they are not extra missions. */
export function teamJourneyLibrarySource({
  journey,
  editionId = TEAM_LIBRARY_JOURNEY_EDITION,
  edition = 'Team Journey',
  progress,
  // Hosts adopting new runtime pressure explicitly supply their edition hash.
  // Historical readers keep authored receipt semantics unless they opt in.
  gameplayIdentity = (row) => row.simulationIdentity,
  difficulty = () => 'standard',
  launch,
}) {
  const source = journeyLibrarySource({
    editionId,
    edition,
    lifecycle:
      classifyContent({ family: 'team', id: editionId }) === 'archived' ? 'archive' : 'current',
    editionLabel: () =>
      edition === 'Team Journey' ? t('interface:missionLibrary.team.journeyEdition') : edition,
    catalog: journey.catalog,
    profile: progress ?? { snapshot: () => ({ clears: {}, skipped: {} }) },
    tags: (mission) => authoredJourneyMissionTags(mission, journey.manifest(mission, difficulty())),
    card: (mission) => journey.card(mission, difficulty()),
    launch(mission, context) {
      const row = journey.row(mission, difficulty());
      if (!row || !journey.owns(row))
        throw new Error(t('errors:missionLibrary.teamMissionUnavailable'));
      return launch(row, context);
    },
  });
  return {
    ...source,
    details: (mission) => journeyMissionDetails(journey.manifest(mission, difficulty())),
    progress(mission) {
      if (!progress) return '';
      const profile = progress.snapshot(),
        receipt = profile.clears.team?.[mission.id];
      if (!receipt)
        return profile.skipped.team?.includes(mission.id)
          ? t('interface:skippedTryAgain')
          : t('interface:missionLibrary.team.notCleared');
      const cleared = journey.row(mission, receipt.difficulty);
      const exact = Boolean(cleared && receipt.gameplayId === gameplayIdentity(cleared));
      return t('interface:missionLibrary.team.clearStatus', {
        state: exact
          ? t('interface:cleared')
          : t('interface:missionLibrary.team.earlierEditionCleared'),
        difficulty: difficultyKeys[receipt.difficulty]
          ? t(difficultyKeys[receipt.difficulty])
          : receipt.difficulty,
        edition:
          exact && receipt.difficulty === difficulty()
            ? t('interface:missionLibrary.team.selectedEdition')
            : t('interface:missionLibrary.team.noSelectedEditionClear'),
      });
    },
  };
}

/** Only caller-validated Team pack rows may enter this source. A visit-local
 * import must use a unique visit identity even if every authored ID matches. */
export function teamArenaLibrarySource({
  rows,
  sourceId = TEAM_LIBRARY_CLASSIC_SOURCE,
  editionId = `${COOP_STARTER_PACK.id}@${COOP_STARTER_PACK.revision}`,
  edition = 'Relay Rescue · Classic arenas',
  collection = 'Classic',
  isCurrent = (row) => rows.includes(row),
  progress = () => '',
  progressState = () => ({ state: 'new', bestStars: null }),
  launch,
}) {
  const editionLabel = () => (typeof edition === 'function' ? edition() : edition);
  if (!['Classic', 'Custom'].includes(collection))
    throw new TypeError(t('errors:missionLibrary.unknownTeamCollection'));
  if (
    sourceId === TEAM_LIBRARY_CLASSIC_SOURCE &&
    (collection !== 'Classic' || rows.some((row) => row.pack !== COOP_STARTER_PACK))
  )
    throw new TypeError(t('errors:missionLibrary.classicTeamOwnerRequired'));
  const bindings = new Map(
    rows.map((row) => [
      row,
      {
        pack: row.pack,
        level: row.level,
        levelId: row.levelId,
        packId: row.pack.id,
        revision: row.pack.revision,
        artworkSource: row.artworkSource,
      },
    ]),
  );
  const current = (row) => {
    const owner = bindings.get(row);
    return Boolean(
      owner &&
        isCurrent(row) &&
        row.pack === owner.pack &&
        row.level === owner.level &&
        row.levelId === owner.levelId &&
        row.level.id === owner.levelId &&
        row.pack.id === owner.packId &&
        row.pack.revision === owner.revision &&
        row.pack.levels.includes(owner.level) &&
        row.artworkSource === owner.artworkSource,
    );
  };
  return {
    id: sourceId,
    editionId,
    edition: editionLabel(),
    collection,
    entries: rows,
    describe: (row) => {
      const canonicalLevelKey =
        sourceId === TEAM_LIBRARY_CLASSIC_SOURCE && collection === 'Classic'
          ? canonicalMissionLevelKey({
              packId: row.pack.id,
              campaignId: row.pack.id,
              levelId: row.levelId,
            })
          : undefined;
      return {
        id: row.levelId,
        revision: row.pack.revision,
        campaignKey: row.pack.id,
        campaignTitle: row.packName,
        name: row.title,
        levelIndex: row.pack.levels.indexOf(row.level),
        canonicalLevelKey,
        globalLevelNumber: officialLevelNumber(canonicalLevelKey),
        modes: ['team'],
        rules: row.goal,
      };
    },
    presentation: () => ({ edition: editionLabel() }),
    availability: (row) =>
      current(row)
        ? { state: 'ready' }
        : {
            state: 'unavailable',
            reason: t('interface:missionLibrary.team.packUnavailableThisVisit'),
          },
    progress: (row) => (current(row) ? progress(row) : ''),
    progressState: (row) => (current(row) ? progressState(row) : { state: 'new', bestStars: null }),
    launch(row, context) {
      if (!current(row)) throw new Error(t('errors:missionLibrary.teamPackSelectionChanged'));
      return launch(row, context);
    },
  };
}
