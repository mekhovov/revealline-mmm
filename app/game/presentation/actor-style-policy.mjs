export const ACTOR_STYLES = Object.freeze(['fpv', 'campaign']);
export const DEFAULT_ACTOR_STYLE = 'fpv';

export function resolveActorStyle(value = DEFAULT_ACTOR_STYLE) {
  if (!ACTOR_STYLES.includes(value)) throw new TypeError('Unsupported actor style.');
  return value;
}

const fresh = Object.freeze(['launch', 'next']);
const retained = Object.freeze(['retry', 'continue', 'replay']);

/** A boundary decision, not a pin validator or asset resolver. The host supplies
 * an already accepted retained choice. Null preserves the historical rendering
 * path; never infer its style from a theme ID or substitute current preferences.
 * This decision neither reads nor rewrites a lease, save, picture or simulation.
 */
export function resolveActorStyleForBoundary({
  requested = DEFAULT_ACTOR_STYLE,
  boundary,
  retainedStyle = null,
} = {}) {
  resolveActorStyle(requested);
  if (retainedStyle !== null) resolveActorStyle(retainedStyle);
  if (![...fresh, ...retained, 'authored-preview'].includes(boundary))
    throw new TypeError('Choose an explicit actor-style boundary.');
  const source = fresh.includes(boundary)
    ? 'preference'
    : boundary === 'authored-preview'
      ? 'authored'
      : 'retained';
  const actorStyle =
    source === 'preference' ? requested : source === 'retained' ? retainedStyle : null;
  return Object.freeze({
    requested,
    actorStyle,
    source,
    deferred: source !== 'preference' && actorStyle !== requested,
  });
}
