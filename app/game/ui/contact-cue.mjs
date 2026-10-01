/** Developer-only prepared-player comparison. Keep the full bright contact
 * circle and its geometry; narrow only its dark backing stroke. No coercion or
 * numeric width input can hide the cue or turn it into another hitbox. */
export function contactCueUnderstroke(style) {
  return style === 'fine-outline' ? 2 : 3;
}
