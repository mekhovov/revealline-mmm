/** Explain an already accepted selection. This never chooses a successor. */
export function versusHomeRecommendation({ catalog, mission, initial = null, ready = false }) {
  if (!ready || !mission || catalog?.find(mission.id) !== mission) return null;
  if (!initial) return { kind: 'selected', mission };
  const { destination, cursor, cursorId, recordedClear } = initial;
  if (destination !== mission || (cursorId && !cursor)) return null;
  if (recordedClear)
    return cursor && cursor !== mission
      ? { kind: 'recordedNext', mission, previous: cursor }
      : null;
  if (cursor && cursor !== mission) return null;
  return {
    kind: !cursor && mission === catalog.missions[0] ? 'first' : 'selected',
    mission,
  };
}
