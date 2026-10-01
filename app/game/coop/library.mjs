import { COOP_RULESET } from './core.mjs';
import { FIRST_CONNECTION } from './first-connection.mjs';
import { RELAY_YARD } from './relay-yard.mjs';
import { COOP_PACK_VERSION, COOP_PACK_MAX_BYTES, validateCoopPack } from './recipes.mjs';

export const COOP_STARTER_PACK = {
  version: COOP_PACK_VERSION,
  ruleset: COOP_RULESET,
  id: 'relay-rescue-starter',
  revision: 2,
  name: 'Relay Rescue',
  levels: [FIRST_CONNECTION, RELAY_YARD],
};

/** Import is explicit and in-memory: invalid content never replaces the current library. */
export function readCoopPack(text) {
  if (typeof text !== 'string' || new TextEncoder().encode(text).length > COOP_PACK_MAX_BYTES)
    throw new TypeError('Choose a co-op pack smaller than 1 MiB.');
  let pack;
  try {
    pack = JSON.parse(text);
  } catch {
    throw new TypeError('This file is not valid JSON. Choose a compiled co-op pack.');
  }
  const result = validateCoopPack(pack);
  if (!result.valid) throw new TypeError(result.errors.join(' '));
  return structuredClone(pack);
}

/** Resolve only within an accepted pack snapshot, never a same-ID live catalogue. */
export function coopPackDestination(pack, level) {
  if (!validateCoopPack(pack).valid) return null;
  const identity = JSON.stringify(level);
  const index = pack.levels.findIndex((candidate) => JSON.stringify(candidate) === identity);
  if (index < 0) return null;
  return {
    next: pack.levels[index + 1] ? structuredClone(pack.levels[index + 1]) : null,
    final: index === pack.levels.length - 1,
  };
}

export function coopGoalText(level) {
  return level.goal.cores
    ? `Capture ${level.goal.cores.length === 1 ? 'both anchors, then the exposed core' : `the anchors and cores of ${level.goal.cores.length} strongholds`}`
    : `Reveal ${Math.ceil(level.goal.coverage * 10000 - 1e-9) / 100}% together`;
}
