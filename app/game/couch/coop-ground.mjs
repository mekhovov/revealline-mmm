import { t } from '../i18n/index.mjs';
import { isJourneyTeamLevel } from '../coop/foundations.mjs';

/** Presentation vocabulary only. Historical Team editions keep their wording;
 * all Journey editions name the surface consistently, not by present enemies. */
export const coopGroundName = (level) =>
  level && isJourneyTeamLevel(level) ? 'reclaimed ground' : 'safe ground';

/** Context chooses a complete sentence, allowing Ukrainian case and agreement. */
export const coopGroundContext = (level) => (isJourneyTeamLevel(level) ? 'reclaimed' : undefined);
export const coopGroundLabel = (level) =>
  t('gameplay:team.ground', { context: coopGroundContext(level) });
