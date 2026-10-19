const headings = Object.freeze({ up: 0, right: Math.PI / 2, down: Math.PI, left: -Math.PI / 2 });
const angle = (x, y) =>
  Number.isFinite(x) && Number.isFinite(y) && Math.hypot(x, y) > 1e-9
    ? Math.atan2(y, x) + Math.PI / 2
    : null;

/** Presentation only, clockwise from north. Native armor/aim takes precedence.
 * Restored stationary actors use their accepted goal or authored spawn heading;
 * this never needs a mutable last-frame cache or changes the simulation. */
export function actorFacingRadians(actor, definition = null) {
  const state = actor.pursuit;
  if (['shield', 'brace'].includes(state?.behavior) && Object.hasOwn(headings, state.heading))
    return headings[state.heading];
  if (actor.aim) {
    const facing = angle(actor.aim.x - actor.x, actor.aim.y - actor.y);
    if (facing !== null) return facing;
  }
  const motion = angle(actor.vx, actor.vy);
  if (motion !== null) return motion;
  // Ordinary goal policies may walk diagonally or fall back to native fleeing.
  // Their retained cardinal intent must not override actual movement direction.
  if (Object.hasOwn(headings, state?.heading)) return headings[state.heading];
  if (state?.goal) {
    const goal = angle(state.goal.x - actor.x, state.goal.y - actor.y);
    if (goal !== null) return goal;
  }
  // Resting goal policies clear the goal and retain only a visit count. That
  // count cannot reconstruct the incoming route after refuges/topology changes.
  // Use authored facing instead of inventing a historical movement direction.
  return angle(definition?.headingX, definition?.headingY) ?? 0;
}
