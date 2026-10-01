import { boundedJSON, exactKeys, stableId } from '../data-json.mjs';
import { campaignKey } from '../library.mjs';

/** Local gameplay provenance, not anti-cheat or authentication. An imported copy
 * may share names/IDs but only the shipped gameplay may record official progress.
 * Presentation-only changes remain outside the existing gameplay identity. */
export function createJourneyAuthority({ baseCampaign, pins }) {
  const source = boundedJSON(pins, { maxBytes: 65536, maxNodes: 1000, maxArray: 128 });
  exactKeys(source, ['format', 'campaigns'], 'Journey campaign pins');
  if (source.format !== 'revealline-journey-campaign-pins.v1' || !Array.isArray(source.campaigns))
    throw new TypeError('Unsupported Journey campaign pin format.');
  const expected = new Map([[`_base/${baseCampaign.id}`, campaignKey(baseCampaign)]]);
  for (const row of source.campaigns) {
    exactKeys(row, ['packId', 'campaignId', 'gameplayKey'], 'Journey campaign pin');
    if (
      !stableId(row.packId) ||
      !stableId(row.campaignId) ||
      typeof row.gameplayKey !== 'string' ||
      !row.gameplayKey.startsWith(`${row.campaignId}/`) ||
      !/^[^/]+\/[^/]{1,180}\/[0-9a-f]{16}$/.test(row.gameplayKey)
    )
      throw new TypeError('Invalid Journey campaign pin identity.');
    const key = `${row.packId}/${row.campaignId}`;
    if (expected.has(key)) throw new TypeError('Duplicate Journey campaign pin.');
    expected.set(key, row.gameplayKey);
  }
  const cache = new WeakMap();
  return Object.freeze({
    matches(entry) {
      if (!entry || typeof entry !== 'object') return false;
      if (cache.has(entry)) return cache.get(entry);
      const authored = entry.baseCampaign || entry.campaign;
      const key = expected.get(`${entry.sourcePackId ?? '_base'}/${authored?.id}`);
      const matches = !!key && campaignKey(authored) === key;
      // Execution catalog entries are deep-frozen. Never cache mutable imports.
      if (Object.isFrozen(entry) && Object.isFrozen(authored)) cache.set(entry, matches);
      return matches;
    },
  });
}
