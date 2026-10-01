const shown = Object.freeze({ showCombatScrap: true });
const hidden = Object.freeze({ showCombatScrap: false });

/** One practice launch's cosmetic choice. It is deliberately outside scenario,
 * replay and persisted display schemas. Ambiguous input keeps the usual view. */
export function readPracticeRemainsOverride(search, { practice = false } = {}) {
  if (practice !== true) return null;
  const params = new URLSearchParams(search);
  if (params.getAll('practice').length !== 1 || params.get('practice') !== '1') return null;
  const values = params.getAll('preview-remains');
  if (values.length !== 1) return null;
  return values[0] === 'hide' ? false : values[0] === 'show' ? true : null;
}

export function readPracticePresentation(search, options) {
  return readPracticeRemainsOverride(search, options) === false ? hidden : shown;
}
