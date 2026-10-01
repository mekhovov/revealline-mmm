/** Authored opt-in. Missing policy keeps every historical manual action available. */
export const ARCADE_ACTIONS_VERSION = 'arcade-actions.v1';

const manual = Object.freeze({ manualAbility: true, manualPickup: true, manualBoost: true });
const arcade = Object.freeze({ manualAbility: false, manualPickup: false, manualBoost: false });

/** Read capabilities from an already validated level; never infer mode from labels or IDs. */
export function arcadeActionCapabilities(level) {
  return level?.classic?.arcadeActions?.version === ARCADE_ACTIONS_VERSION ? arcade : manual;
}

/** Core authority applies this to each fixed tick, including imported replay commands. */
export function arcadeCommand(level, input) {
  return arcadeActionCapabilities(level) === arcade
    ? { ...input, action: false, pickup: false, boost: false }
    : input;
}
