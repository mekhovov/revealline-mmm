const neutral = () => ({ direction: null, boost: false, support: false });
export const COOP_INPUT_CAPABILITIES = Object.freeze({
  heldActions: Object.freeze(['action']),
  steeringEdges: true,
});

/** A fresh gesture may arrive after reset but before the next fixed tick.
 * Give the core its release tick without discarding newly latched steering.
 */
export function createCoopCommandBatch() {
  const releases = new Set();
  const deferredSupport = [false, false];
  const deferredSteer = [false, false];
  return {
    release(player) {
      if (player === undefined) {
        releases.add(0);
        releases.add(1);
        deferredSupport.fill(false);
        deferredSteer.fill(false);
      } else if (player === 0 || player === 1) {
        releases.add(player);
        deferredSupport[player] = false;
        deferredSteer[player] = false;
      } else throw new TypeError('Co-op seat must be 0 or 1.');
    },
    consume(commands) {
      return commands.map((command, player) => {
        if (releases.delete(player)) {
          deferredSupport[player] = command.action;
          deferredSteer[player] = command.steer === true;
          return neutral();
        }
        const support = command.action || deferredSupport[player];
        const steer = command.steer === true || deferredSteer[player];
        deferredSupport[player] = false;
        deferredSteer[player] = false;
        return { direction: command.direction, boost: command.boost, support, steer };
      });
    },
  };
}
