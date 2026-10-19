import { validateProgress } from './progress.mjs';

// Reviewed membership-only successors. Keys cover the full normalized levels
// and class recipes; an edited or imported lookalike cannot use this migration.
const PREDECESSORS = Object.freeze({
  'equipment-workshop/1/7bbeedba8b221cf4': 'equipment-workshop/1/3fc2cf073da368b4',
  'neon-mosaic/2/56d7451c6b50ab4b': 'neon-mosaic/2/68f10772f1871b8b',
});

/** Project only surviving clears. Historical scores, pictures and replay proofs
 * retain their original identities and are never relabeled as new evidence. */
export function retainedCampaignProgress(library, campaign, key) {
  const predecessor = PREDECESSORS[key];
  if (!predecessor || !Object.hasOwn(library.campaigns, predecessor)) return null;
  const previous = library.campaigns[predecessor];
  if (!previous || typeof previous.clears !== 'object' || previous.clears === null) return null;
  const ids = new Set(campaign.levels.map(level => level.id));
  const next = {
    ...structuredClone(previous),
    clears: Object.fromEntries(Object.entries(previous.clears).filter(([id]) => ids.has(id))),
  };
  return validateProgress(next, campaign) ? next : null;
}
