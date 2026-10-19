/** Explain an already-owned prepared Team destination without selecting one. */
export function teamHomeRecommendation({ journey, row, initial = null, ready = false }) {
  if (!ready || !journey?.owns(row) || journey.catalog.find(row.mission.id) !== row.mission)
    return null;
  if (!initial) return { kind: 'selected', mission: row.mission };
  const { destination, cursor, cursorId, recordedClear, first } = initial;
  if (destination !== row || (cursorId && !cursor)) return null;
  if (recordedClear)
    return cursor && cursor !== row.mission
      ? { kind: 'recordedNext', mission: row.mission, previous: cursor }
      : null;
  if (cursor && cursor !== row.mission) return null;
  return { kind: !cursor && row.mission === first ? 'first' : 'selected', mission: row.mission };
}
