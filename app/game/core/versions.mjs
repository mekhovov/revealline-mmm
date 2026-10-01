import { boundedJSON, exactKeys, plainObject } from '../data-json.mjs';

export const LEGACY_VERSIONS = Object.freeze({
  levelVersion: 'xonix-level.v1',
  ruleset: 'xonix-core.v2',
  replayVersion: 'xonix-replay.v3',
  checkpointAlgorithm: 'fnv1a64-state-v2',
});
export const ENCOUNTER_VERSIONS = Object.freeze({
  levelVersion: 'xonix-level.v2',
  ruleset: 'xonix-core.v3',
  replayVersion: 'xonix-replay.v4',
  checkpointAlgorithm: 'fnv1a64-state-v3',
});
export const WIDE_VERSIONS = Object.freeze({
  levelVersion: 'xonix-level.v3',
  ruleset: 'xonix-core.v4',
  replayVersion: 'xonix-replay.v5',
  checkpointAlgorithm: 'fnv1a64-state-v4',
});

export const CLASSIC_VERSIONS = Object.freeze({
  levelVersion: 'xonix-level.v4',
  ruleset: 'xonix-core.v5',
  replayVersion: 'xonix-replay.v6',
  checkpointAlgorithm: 'fnv1a64-state-v5',
});

export const FOUNDATION_VERSIONS = Object.freeze({
  levelVersion: 'xonix-level.v5',
  ruleset: 'xonix-core.v6',
  replayVersion: 'xonix-replay.v7',
  checkpointAlgorithm: 'fnv1a64-state-v6',
});
export const RELAY_VERSIONS = Object.freeze({
  levelVersion: 'xonix-level.v6',
  ruleset: 'xonix-core.v7',
  replayVersion: 'xonix-replay.v8',
  checkpointAlgorithm: 'fnv1a64-state-v7',
});
export const DIRECTIONAL_VERSIONS = Object.freeze({
  levelVersion: 'xonix-level.v7',
  ruleset: 'xonix-core.v8',
  replayVersion: 'xonix-replay.v9',
  checkpointAlgorithm: 'fnv1a64-state-v8',
});
export const SENTINEL_VERSIONS = Object.freeze({
  levelVersion: 'xonix-level.v8',
  ruleset: 'xonix-core.v9',
  replayVersion: 'xonix-replay.v10',
  checkpointAlgorithm: 'fnv1a64-state-v9',
});
export const isClassicRuleset = (ruleset) =>
  [
    CLASSIC_VERSIONS.ruleset,
    FOUNDATION_VERSIONS.ruleset,
    RELAY_VERSIONS.ruleset,
    DIRECTIONAL_VERSIONS.ruleset,
    SENTINEL_VERSIONS.ruleset,
  ].includes(ruleset);
export const isFoundationRuleset = (ruleset) =>
  [
    FOUNDATION_VERSIONS.ruleset,
    RELAY_VERSIONS.ruleset,
    DIRECTIONAL_VERSIONS.ruleset,
    SENTINEL_VERSIONS.ruleset,
  ].includes(ruleset);
export const isRelayRuleset = (ruleset) =>
  [RELAY_VERSIONS.ruleset, DIRECTIONAL_VERSIONS.ruleset, SENTINEL_VERSIONS.ruleset].includes(
    ruleset,
  );
export const isDirectionalRuleset = (ruleset) =>
  [DIRECTIONAL_VERSIONS.ruleset, SENTINEL_VERSIONS.ruleset].includes(ruleset);

/** An omitted pair remains legacy. Explicit fields must select exactly one supported pair. */
export function resolveVersions(value = {}) {
  if (!plainObject(value)) throw new TypeError('version request must be an object');
  const request = boundedJSON(value, { maxBytes: 1024, maxNodes: 8, maxDepth: 2, maxString: 80 });
  if (!plainObject(request)) throw new TypeError('version request must be an object');
  exactKeys(request, Object.keys(LEGACY_VERSIONS), 'version request');
  const keys = Object.keys(request);
  if (!keys.length) return { ...LEGACY_VERSIONS };
  const match = [
    LEGACY_VERSIONS,
    ENCOUNTER_VERSIONS,
    WIDE_VERSIONS,
    CLASSIC_VERSIONS,
    FOUNDATION_VERSIONS,
    RELAY_VERSIONS,
    DIRECTIONAL_VERSIONS,
    SENTINEL_VERSIONS,
  ].find((pair) => keys.every((key) => request[key] === pair[key]));
  if (!match) throw new TypeError('unsupported or mismatched simulation versions');
  return { ...match };
}

export function versionsForLevel(level) {
  if (!plainObject(level)) throw new TypeError('level must be an object');
  const property = Object.getOwnPropertyDescriptor(level, 'version');
  if (!property || !Object.hasOwn(property, 'value'))
    throw new TypeError('level must have an own data version');
  return resolveVersions({ levelVersion: property.value });
}

/** Campaigns choose a single core; mixed old/new maps need separate campaigns. */
export function versionsForCampaign(campaign) {
  if (!plainObject(campaign)) throw new TypeError('campaign must be an object');
  const property = Object.getOwnPropertyDescriptor(campaign, 'levels');
  if (!property || !Object.hasOwn(property, 'value') || !Array.isArray(property.value))
    throw new TypeError('campaign must have an own levels array');
  const levels = property.value;
  if (!levels.length || levels.length > 128) throw new TypeError('campaign needs 1..128 levels');
  let selected;
  for (let i = 0; i < levels.length; i++) {
    const entry = Object.getOwnPropertyDescriptor(levels, String(i));
    if (!entry || !Object.hasOwn(entry, 'value')) throw new TypeError('levels must be dense data');
    const pair = versionsForLevel(entry.value);
    if (selected && selected.ruleset !== pair.ruleset)
      throw new TypeError('campaign cannot mix simulation versions');
    selected = pair;
  }
  return selected;
}
