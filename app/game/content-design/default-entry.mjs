export const DEFAULT_JOURNEY_ROUTES = Object.freeze({
  solo: 'whole-spatial-v25',
  versus: 'whole-spatial-v25',
  team: 'team-cultural-specialist-originals-2',
});

// An explicit legacy launch must reach its existing validator, even when its
// value is empty or malformed. Presence is intent, not proof of validity.
const LEGACY_ENTRY_KEYS = Object.freeze([
  'pack',
  'campaign',
  'level',
  'play',
  'practice',
  'course',
  'lesson',
  'workshop',
  'return-token',
  'return-token-v2',
  'mode-return',
  'mode-return-v2',
]);

/** Resolve only the normal entry default. Route factories retain their exact
 * historical readers and explicit query semantics; no storage is inspected. */
export function resolveJourneyRequest(params, { mode = 'solo', auxiliary = false } = {}) {
  if (!(params instanceof URLSearchParams) || !Object.hasOwn(DEFAULT_JOURNEY_ROUTES, mode))
    throw new TypeError('Journey entry needs URL parameters and a supported mode.');
  if (auxiliary) return null;
  if (params.has('journey')) {
    // Solo and Versus historically use get(); Team accepts exactly one value.
    if (mode === 'team' && params.getAll('journey').length !== 1) return null;
    return params.get('journey');
  }
  if (LEGACY_ENTRY_KEYS.some((key) => params.has(key))) return null;
  return DEFAULT_JOURNEY_ROUTES[mode];
}
