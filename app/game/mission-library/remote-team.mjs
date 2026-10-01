import { createCandidateTeamHost } from '../content-design/team-host.mjs';
import { createTeamCulturalSpecialistV2OriginalCandidates } from '../content-design/team-cultural-specialist-v2-originals.mjs';
import { COOP_STARTER_PACK, coopGoalText } from '../coop/library.mjs';
import { validateCoopPack } from '../coop/recipes.mjs';
import { teamJourneyLibrarySource, teamArenaLibrarySource } from './team-source.mjs';

/** Trusted Team browsing for another gameplay host. This creates no Team run,
 * loads no image, and delegates every launch to an exact receiving-host handoff.
 * Visit-local .rlteam imports cannot be copied across hosts by their names/IDs.
 */
export function createRemoteTeamLibrarySources({ launch, difficulty = () => 'standard' }) {
  if (typeof launch !== 'function') throw new TypeError('Team browsing needs an exact handoff.');
  const source = createTeamCulturalSpecialistV2OriginalCandidates();
  const journey = createCandidateTeamHost(source, {
    corePackIds: source.packs.map((pack) => pack.id),
  });
  if (!validateCoopPack(COOP_STARTER_PACK).valid)
    throw new Error('The retained Team arenas failed validation.');
  const rows = COOP_STARTER_PACK.levels.map((level) =>
    Object.freeze({
      title: level.name,
      packName: COOP_STARTER_PACK.name,
      goal: coopGoalText(level),
      levelId: level.id,
      level,
      pack: COOP_STARTER_PACK,
      artworkSource: null,
    }),
  );
  return Object.freeze([
    teamJourneyLibrarySource({
      journey,
      difficulty,
      launch: (_row, context) => launch(context),
    }),
    teamArenaLibrarySource({
      rows,
      launch: (_row, context) => launch(context),
    }),
  ]);
}
