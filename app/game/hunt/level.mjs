import { boundedJSON, required } from '../data-json.mjs';
import { validateLevel } from '../core/level.mjs';
import { HUNT_VERSIONS } from '../core/versions.mjs';

/** Prepare one immutable, explicitly authored successor. `actors` is the entire
 * accepted optional population, not a random injection into a live attempt. */
export function prepareHuntLevel(source, { id, revision, actors, hunt }) {
  const checked = validateLevel(source);
  required(checked.valid, checked.errors.join('; '));
  required(
    [
      'xonix-level.v5',
      'xonix-level.v6',
      'xonix-level.v7',
      'xonix-level.v8',
      'xonix-level.v9',
    ].includes(source.version),
    'Choose an existing foundation-aware mission before preparing its Hunt edition.',
  );
  required(
    source.encounter === null || source.encounter?.version === 'xonix-encounter.v2',
    'Historical staged encounters require a separately authored successor before Hunt admission.',
  );
  const level = boundedJSON(source, {
    maxBytes: 128 * 1024,
    maxNodes: 10000,
    maxDepth: 12,
    maxArray: 512,
  });
  level.version = HUNT_VERSIONS.levelVersion;
  level.id = id;
  level.revision = revision;
  level.relayGates ??= { version: 'relay-gates.v1', gates: [] };
  level.directionalFields ??= { version: 'directional-fields.v1', zones: [] };
  level.classic.combatPatrols = {
    version: 'combat-patrols.v1',
    enabled: true,
    actors: boundedJSON(actors),
  };
  level.classic.hunt = boundedJSON(hunt);
  const result = validateLevel(level);
  required(result.valid, result.errors.join('; '));
  return level;
}

export function upgradeHuntLevel(
  source,
  hunt,
  { actors, id = source.id, revision = source.revision } = {},
) {
  return prepareHuntLevel(source, { id, revision, actors, hunt });
}
