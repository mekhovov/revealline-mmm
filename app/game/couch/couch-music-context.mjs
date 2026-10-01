import { t } from '../i18n/index.mjs';
import { boundedJSON, canonicalJSON, required, stableId } from '../data-json.mjs';
import { throwIfSoundtrackAborted } from '../mp3.mjs';
import { hashPresentationBytes } from '../presentation/bundle.mjs';
import { emptySoundtrackLibrary, resolveSoundtrackSelection } from '../soundtrack.mjs';
import { COOP_PACK_MAX_BYTES, validateCoopPack } from '../coop/recipes.mjs';

function context(campaignKey, level, themeId) {
  const value = {
    campaignKey,
    mapKey: JSON.stringify([campaignKey, level.id, level.revision, themeId]),
    themeId,
  };
  resolveSoundtrackSelection(emptySoundtrackLibrary(), value);
  required(
    typeof campaignKey === 'string' && typeof themeId === 'string',
    t('interface:anAcceptedCampaignAndThemeAreRequired'),
  );
  return Object.freeze(value);
}
/** Use the accepted Solo baseCampaignKey/campaignKey, never a display name,
 * execution-key substring or merely a level ID. Compatible Versus uses this
 * exact existing Solo assignment format. This helper does not accept content.
 */
export function soloCompatibleMusicContext({ campaignKey, level, themeId }) {
  required(
    stableId(level?.id) &&
      typeof level.revision === 'string' &&
      level.revision.trim() &&
      level.revision.length <= 80,
    t('interface:anAcceptedSoloLevelIdAndRevisionAreRequired'),
  );
  return context(campaignKey, level, themeId);
}
/** Prepare outside the gesture/frame loop. The host must still fence obsolete
 * preparations before player.setContext and commit only an accepted attempt.
 * Plain imports and extracted, verified envelopes use the same pack hash.
 */
export async function prepareTeamMusicContext({ pack, level, themeId, signal }) {
  throwIfSoundtrackAborted(signal);
  const source = boundedJSON(pack, {
    maxBytes: COOP_PACK_MAX_BYTES,
    maxNodes: 200000,
    maxDepth: 18,
    maxArray: 4096,
    maxString: 8192,
  });
  const validation = validateCoopPack(source);
  required(validation.valid, validation.errors.join(' '));
  const current = boundedJSON(level, {
    maxBytes: COOP_PACK_MAX_BYTES,
    maxNodes: 200000,
    maxDepth: 18,
    maxArray: 4096,
    maxString: 8192,
  });
  required(
    source.levels.some((candidate) => canonicalJSON(candidate) === canonicalJSON(current)),
    t('interface:theMusicLevelDoesNotMatchTheAcceptedPack'),
  );
  const hash = await hashPresentationBytes(new TextEncoder().encode(canonicalJSON(source)));
  throwIfSoundtrackAborted(signal);
  const campaignKey = JSON.stringify([
    'team-music.v1',
    source.version,
    source.ruleset,
    source.id,
    source.revision,
    hash,
  ]);
  return context(campaignKey, current, themeId);
}
