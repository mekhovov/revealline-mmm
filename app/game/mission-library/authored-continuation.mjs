/** Next within one exact runtime campaign. This is not Continue, an unlock
 * projection, or a declaration that every mission has been cleared. Callers
 * retain authority over the entry and over adopting its next attempt.
 */
export function authoredMissionSuccessor(entry, currentLevelIndex) {
  const levels = entry?.campaign?.levels;
  if (
    !Array.isArray(levels) ||
    levels.length === 0 ||
    !Number.isSafeInteger(currentLevelIndex) ||
    currentLevelIndex < 0 ||
    currentLevelIndex >= levels.length ||
    !levels[currentLevelIndex]
  )
    throw new TypeError('Next needs the exact current mission in its authored campaign.');
  const levelIndex = currentLevelIndex + 1;
  if (levelIndex === levels.length) return Object.freeze({ levelIndex: null, atEnd: true });
  if (!levels[levelIndex])
    throw new TypeError('The authored successor is missing; no different mission was selected.');
  return Object.freeze({ levelIndex, atEnd: false });
}
