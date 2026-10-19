import { missionLibraryHref } from './handoff.mjs';

/** Only published registry owners can be opened on another player's device.
 * Local imports and archive-only downloads must not acquire a public-looking URL.
 */
export function playedLevelHref(row, { baseURL, mode = 'solo' }) {
  if (!row?.modes.includes(mode)) return null;
  let journey;
  if (row.collection === 'Journey' && row.lifecycle === 'current') {
    journey = row.editionId;
  } else if (row.collection === 'Classic') {
    let owner;
    try {
      owner = JSON.parse(row.ownerId);
    } catch {
      return null;
    }
    if (
      !Array.isArray(owner) ||
      owner[0] !== 'classic' ||
      !['base', 'bundled', 'optional', 'external'].includes(owner[1])
    )
      return null;
    journey = 'legacy';
  } else return null;
  return missionLibraryHref({ baseURL, currentMode: mode, mode, journey, missionId: row.id });
}
