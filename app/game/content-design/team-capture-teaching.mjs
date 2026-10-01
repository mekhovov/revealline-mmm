import { inspectCaptureSnapshot } from '../core/capture-regions.mjs';

/** Explain an accepted closure in an authored teaching arc. Uses the shared
 * frozen-state inspector, never predicts moving enemies or changes capture. */
export function createTeamCaptureTeaching(journey, missionIds) {
  const lessons = new Set(missionIds);
  for (const id of lessons)
    if (!journey.rows.some((row) => row.level.id === id))
      throw new TypeError('Team capture lesson must refer to an owned mission.');
  return (row, run, events) => {
    if (
      !journey.owns(row) ||
      !lessons.has(row.level.id) ||
      !run ||
      run.level.id !== row.level.id ||
      run.level.version !== row.level.version ||
      run.ruleset !== row.pack.ruleset ||
      run.difficulty !== row.difficulty ||
      !events.some((event) => event.type === 'cells.claimed' && event.cells > 0) ||
      !events.some((event) => event.type === 'cut.closed')
    )
      return null;
    // These explicitly qualified editions have field keepers, no strongholds.
    // Do not apply this contract to legacy Team core-retention encounters.
    if (run.strongholds.length) return null;
    const occupied = inspectCaptureSnapshot(run).components.filter((region) => region.retained),
      anchors = [...new Set(occupied.flatMap((region) => region.enemyIds))],
      names = anchors.slice(0, 3).map((id) => id.replaceAll('-', ' '));
    return (
      `Cut banked. ${occupied.length} enemy-held region${occupied.length === 1 ? ' remains' : 's remain'}` +
      (names.length
        ? ` (${names.join(', ')}${anchors.length > 3 ? ', and other field enemies' : ''})`
        : '') +
      '. Empty regions fill; occupied regions stay unclaimed. Choose a fresh direction.'
    );
  };
}
