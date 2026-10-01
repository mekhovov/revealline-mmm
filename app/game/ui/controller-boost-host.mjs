/** Drop only the controller's Toggle contribution. Local input clears invoke
 * this without recursively clearing either input adapter or menu ownership. */
export function cancelControllerToggleBoost(controller, frame) {
  if (controller.boostState().mode !== 'toggle') return false;
  controller.cancelToggleBoost();
  if (frame?.flight) frame.flight.boost = false;
  return true;
}

/** A frame can contain recovery and its end. Remove the stale sampled controller
 * contribution before the next fixed tick; retain accepted keyboard/touch Boost. */
export function controllerBoostAfterRecovery({
  beforeStatus,
  run,
  controller,
  input,
  frame,
  controls,
}) {
  if (beforeStatus !== 'running' || run.status !== 'respawning') return controls;
  if (!cancelControllerToggleBoost(controller, frame)) return controls;
  return { ...controls, boost: input.localBoostActive() };
}
