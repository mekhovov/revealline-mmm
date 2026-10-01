import { LIBRARY_MODES } from './library.mjs';
import { CLASSIC_RULES_CURRENT, CLASSIC_RULES_ORIGINAL } from './classic-current-rules.mjs';

// Classic Solo/Versus owners encode their current-rules lane in the fourth
// component of a JSON identity. Team's retained arenas deliberately use an
// opaque source ID, so they belong to the original-rules lane. Owner IDs are
// registry provenance, not a format contract: malformed/opaque IDs must never
// make Next throw after a completed mission.
function classicRulesEdition(row) {
  try {
    const owner = JSON.parse(row.ownerId);
    return Array.isArray(owner) && typeof owner[3] === 'string' && owner[3] ? owner[3] : 'original';
  } catch {
    return 'original';
  }
}

/** Boundary continuation uses the complete registry, never the chooser's search
 * results. Original adapters still own preparation, launch and progress. */
export function librarySuccessor(library, currentRow, mode, { wrap = false } = {}) {
  if (!LIBRARY_MODES.includes(mode)) throw new TypeError('Unknown continuation mode.');
  if (!currentRow || library.find(currentRow.id) !== currentRow)
    throw new Error('The current mission edition changed. Your result is kept.');
  const rows = library.forMode(mode);
  const index = rows.indexOf(currentRow);
  if (index < 0) throw new Error('The current mission does not belong to this mode.');
  if (currentRow.automaticContinuation === false) return null;
  const edition = currentRow.collection === 'Classic' ? classicRulesEdition(currentRow) : null;
  const eligible = (row) =>
    row.automaticContinuation !== false &&
    !row.tags.includes('Practice') &&
    (edition === null || row.collection !== 'Classic' || classicRulesEdition(row) === edition);
  const next = rows.slice(index + 1).find(eligible);
  if (next || !wrap) return next ?? null;
  // A wrapped continuation is always a distinct row. A one-mission library
  // cannot turn Skip into an accidental restart of the same mission.
  return rows.slice(0, index).find(eligible) ?? null;
}

/** Runtime hosts supply their original campaign/pack identity, not a display
 * title or an execution-projection campaign key. Fail closed on ambiguity. */
export function retainedLibraryMission(
  library,
  { mode, levelId, campaignKey, sourcePackId = null, ownerId, editionId, rulesEdition },
) {
  if (![CLASSIC_RULES_ORIGINAL, CLASSIC_RULES_CURRENT].includes(rulesEdition))
    throw new Error('The exact current mission rules edition is unavailable. Your result is kept.');
  const rows = library.forMode(mode).filter((row) => {
    if (!['Classic', 'Custom'].includes(row.collection) || row.runtimeId !== levelId) return false;
    if (row.collection === 'Classic' && classicRulesEdition(row) !== rulesEdition) return false;
    if ((ownerId && row.ownerId !== ownerId) || (editionId && row.editionId !== editionId))
      return false;
    const campaign = JSON.parse(row.campaignKey);
    const owner = JSON.parse(row.ownerId);
    const packId = owner[0] === 'classic' ? owner[2] : owner[0] === 'custom' ? owner[1] : undefined;
    return campaign[2] === campaignKey && packId === sourcePackId;
  });
  if (rows.length !== 1)
    throw new Error('The exact current mission edition is unavailable. Your result is kept.');
  return rows[0];
}
