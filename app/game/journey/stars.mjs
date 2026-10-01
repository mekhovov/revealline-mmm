import { boundedJSON, exactKeys, required } from '../data-json.mjs';
import { JOURNEY_MODES } from './catalog.mjs';

export const JOURNEY_STARS_VERSION = 'revealline-journey-stars.v1';
export const emptyJourneyStars = () => ({
  format: JOURNEY_STARS_VERSION,
  best: Object.fromEntries(JOURNEY_MODES.map((mode) => [mode, {}])),
});

/** Optional presentation metadata; the historical v1 completion stays unchanged. */
export function validateJourneyStars(source) {
  const stars = boundedJSON(source, {
    maxBytes: 2 * 1024 * 1024,
    maxNodes: 30000,
    maxDepth: 4,
    maxString: 1024,
  });
  exactKeys(stars, ['format', 'best'], 'Journey stars');
  required(stars.format === JOURNEY_STARS_VERSION, 'Unsupported Journey stars.');
  exactKeys(stars.best, JOURNEY_MODES, 'Journey star modes');
  for (const mode of JOURNEY_MODES) {
    const results = stars.best[mode];
    required(results && typeof results === 'object' && !Array.isArray(results), 'Invalid stars.');
    for (const [id, value] of Object.entries(results))
      required(id.length > 0 && id.length <= 1024 && [1, 2, 3].includes(value), 'Invalid stars.');
  }
  return stars;
}

/** An old tab may remove a completion without knowing about its sidecar. */
export function journeyStarsForProfile(source, profile, { strict = false } = {}) {
  const stars = validateJourneyStars(source);
  for (const mode of JOURNEY_MODES)
    for (const id of Object.keys(stars.best[mode]))
      if (!Object.hasOwn(profile.clears[mode], id)) {
        required(!strict, 'Journey stars require a completion in the same profile.');
        delete stars.best[mode][id];
      }
  return stars;
}

export function applyJourneyStarsEvent(source, event, profile) {
  const stars = journeyStarsForProfile(source, profile);
  const merge = (mode, id, value) => {
    Object.defineProperty(stars.best[mode], id, {
      value: Math.max(Object.hasOwn(stars.best[mode], id) ? stars.best[mode][id] : 0, value),
      enumerable: true,
      writable: true,
      configurable: true,
    });
  };
  if (event.type === 'restore' && event.starResults !== undefined) {
    const restored = journeyStarsForProfile(event.starResults, profile, { strict: true });
    for (const mode of JOURNEY_MODES)
      for (const [id, value] of Object.entries(restored.best[mode])) merge(mode, id, value);
  } else if (event.stars !== undefined) {
    required(event.type === 'complete' && [1, 2, 3].includes(event.stars), 'Invalid star result.');
    merge(event.mode, event.missionId, event.stars);
  }
  return validateJourneyStars(stars);
}
