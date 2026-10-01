import { boundedJSON, exactKeys, required, stableId, dataIdentity } from '../data-json.mjs';
import { CELL } from '../core/registry.mjs';
import { compileDirectionalZones } from '../core/directional-fields.mjs';

const geometryKeys = ['width', 'height', 'walls', 'foundations', 'terrain', 'spawns'];
const integer = (value, min, max) => Number.isInteger(value) && value >= min && value <= max;
const freeze = (value) => {
  if (value && typeof value === 'object') {
    for (const child of Object.values(value)) freeze(child);
    Object.freeze(value);
  }
  return value;
};
const copy = (source) =>
  boundedJSON(source, { maxBytes: 128 * 1024, maxNodes: 10000, maxDepth: 8, maxArray: 128 });

/** Compile once at an authoring/runtime boundary, never in the render loop.
 * Immutable plain arrays let every consumer inspect the same geometry without
 * sharing a mutable engine buffer. Historical editions do not use this compiler. */
export function compileMapGeometry(source) {
  return compileGeometry(source, false);
}

/** Explicit successor geometry; old maps never infer gates from artwork or walls. */
export function compileRelayMapGeometry(source) {
  return compileGeometry(source, true);
}

export function compileDirectionalMapGeometry(source) {
  return compileGeometry(source, true, true);
}

function compileGeometry(source, relays, directional = false) {
  const map = copy(source);
  exactKeys(
    map,
    [...geometryKeys, ...(relays ? ['gates'] : []), ...(directional ? ['speedZones'] : [])],
    'map geometry',
  );
  required(map.width === 72 && map.height === 36, 'Map geometry must be 72 × 36.');
  const { width, height } = map;
  const cells = Array(width * height).fill(CELL.FIELD);
  const permanent = Array(cells.length).fill(0);
  const terrain = Array(cells.length).fill(0);
  const diagnostics = [];
  for (let y = 0; y < height; y++)
    for (let x = 0; x < width; x++)
      if (!x || !y || x === width - 1 || y === height - 1) {
        cells[y * width + x] = CELL.SAFE;
        permanent[y * width + x] = 1;
      }
  function list(key) {
    const value = map[key] ?? [];
    required(Array.isArray(value) && value.length <= 128, `${key} must contain at most 128 items.`);
    return value;
  }
  function rectangle(rect, label, extra = []) {
    exactKeys(rect, ['x', 'y', 'w', 'h', ...extra], label);
    required(
      integer(rect.x, 1, width - 2) &&
        integer(rect.y, 1, height - 2) &&
        integer(rect.w, 1, width - 2) &&
        integer(rect.h, 1, height - 2) &&
        rect.x + rect.w <= width - 1 &&
        rect.y + rect.h <= height - 1,
      `${label} must be an integer interior rectangle.`,
    );
    const indexes = [];
    for (let y = rect.y; y < rect.y + rect.h; y++)
      for (let x = rect.x; x < rect.x + rect.w; x++) indexes.push(y * width + x);
    return indexes;
  }
  for (const [i, rect] of list('walls').entries())
    for (const index of rectangle(rect, `walls[${i}]`)) {
      required(cells[index] !== CELL.WALL, `walls[${i}] overlaps another wall.`);
      cells[index] = CELL.WALL;
    }
  let foundationCount = 0;
  for (const [i, rect] of list('foundations').entries())
    for (const index of rectangle(rect, `foundations[${i}]`)) {
      required(cells[index] !== CELL.WALL, `foundations[${i}] overlaps a wall.`);
      if (!permanent[index]) foundationCount++;
      cells[index] = CELL.SAFE;
      permanent[index] = 1;
    }
  const gates = [];
  if (relays) {
    required(Array.isArray(map.gates), 'Relay geometry requires explicit gates.');
    required(map.gates.length <= 32, 'At most 32 relay gates are supported.');
    const gateIds = new Set();
    for (const [i, gate] of map.gates.entries()) {
      const indexes = rectangle(gate, `gates[${i}]`, ['id']);
      required(stableId(gate.id) && !gateIds.has(gate.id), `gates[${i}] needs a unique id.`);
      gateIds.add(gate.id);
      for (const index of indexes) {
        required(cells[index] === CELL.FIELD, `gates[${i}] overlaps reserved geometry.`);
        cells[index] = CELL.WALL;
      }
      gates.push({ id: gate.id, cells: indexes });
    }
  }
  const eligible = cells.map((cell) => Number(cell === CELL.FIELD));
  const eligibleCount = eligible.reduce((sum, cell) => sum + cell, 0);
  required(eligibleCount > 0, 'At least one interior cell must remain eligible field.');
  const ids = new Set();
  for (const [i, area] of list('terrain').entries()) {
    const indexes = rectangle(area, `terrain[${i}]`, ['id', 'kind']);
    required(stableId(area.id) && !ids.has(area.id), `terrain[${i}] needs a unique id.`);
    ids.add(area.id);
    required(['slow', 'lethal'].includes(area.kind), `terrain[${i}] has an unsupported material.`);
    for (const index of indexes) {
      required(cells[index] !== CELL.WALL, `terrain[${i}] overlaps a wall.`);
      required(!terrain[index], `terrain[${i}] overlaps another terrain area.`);
      terrain[index] = area.kind === 'slow' ? 1 : 2;
    }
  }
  const neighbors = (index) => {
    const x = index % width,
      y = Math.floor(index / width);
    return [
      y ? index - width : -1,
      x + 1 < width ? index + 1 : -1,
      y + 1 < height ? index + width : -1,
      x ? index - 1 : -1,
    ].filter((n) => n >= 0);
  };
  const speedZones = directional
    ? compileDirectionalZones(map.speedZones, { width, height, cells, terrain })
    : null;
  const componentAt = Array(cells.length).fill(-1);
  function components(kind) {
    const groups = [];
    for (let start = 0; start < cells.length; start++) {
      if (cells[start] !== kind || componentAt[start] !== -1) continue;
      const members = [start],
        departures = new Set();
      componentAt[start] = start;
      for (let head = 0; head < members.length; head++)
        for (const next of neighbors(members[head])) {
          if (cells[next] === kind && componentAt[next] === -1) {
            componentAt[next] = start;
            members.push(next);
          } else if (kind === CELL.SAFE && cells[next] === CELL.FIELD) departures.add(next);
        }
      groups.push({ id: start, cells: members, departures: [...departures].sort((a, b) => a - b) });
    }
    return groups;
  }
  const safeComponents = components(CELL.SAFE);
  const fieldComponents = components(CELL.FIELD);
  if (safeComponents.length > 1)
    diagnostics.push({
      severity: 'warning',
      code: 'disconnected-foundations',
      componentIds: safeComponents.map((c) => c.id),
    });
  for (const component of fieldComponents)
    if (!component.cells.some((index) => neighbors(index).some((n) => cells[n] === CELL.SAFE)))
      diagnostics.push({
        severity: 'warning',
        code: 'remote-chamber',
        componentId: component.id,
        message:
          'No starting return surface touches this chamber; inspect enemy retention and remote fill.',
      });
  const spawns = list('spawns');
  required(spawns.length >= 1 && spawns.length <= 16, 'Map needs 1..16 named spawn candidates.');
  const spawnIds = new Set();
  for (const [i, spawn] of spawns.entries()) {
    exactKeys(spawn, ['id', 'x', 'y'], `spawns[${i}]`);
    required(stableId(spawn.id) && !spawnIds.has(spawn.id), `spawns[${i}] needs a unique id.`);
    spawnIds.add(spawn.id);
    required(
      integer(spawn.x - 0.5, 0, width - 1) && integer(spawn.y - 0.5, 0, height - 1),
      `spawns[${i}] must be an in-board cell center.`,
    );
    const index = Math.floor(spawn.y) * width + Math.floor(spawn.x);
    required(permanent[index] === 1, `spawns[${i}] must be on permanent reclaimed ground.`);
    const component = safeComponents.find((c) => c.id === componentAt[index]);
    required(component.departures.length > 0, `spawns[${i}] has no usable departure into field.`);
    if (component.departures.length === 1)
      diagnostics.push({
        severity: 'warning',
        code: 'single-departure',
        spawnId: spawn.id,
        cell: component.departures[0],
      });
  }
  return freeze({
    width,
    height,
    cells,
    permanent,
    terrain,
    eligible,
    eligibleCount,
    foundationCount,
    spawns,
    safeComponents,
    fieldComponents,
    diagnostics,
    ...(relays ? { gates } : {}),
    ...(directional ? { speedZones } : {}),
  });
}

export function compileMapDesign(source) {
  const map = copy(source);
  const directional = map.format === 'MapDesignV3';
  const relays = map.format === 'MapDesignV2' || directional;
  const keys = [
    ...geometryKeys,
    ...(relays ? ['gates'] : []),
    ...(directional ? ['speedZones'] : []),
  ];
  exactKeys(map, ['format', 'id', 'revision', 'name', ...keys], 'map');
  required(
    map.format === 'MapDesignV1' || relays,
    'Expected MapDesignV1, MapDesignV2 or MapDesignV3.',
  );
  required(stableId(map.id), 'Map needs a stable id.');
  required(
    typeof map.revision === 'string' && map.revision.length > 0 && map.revision.length <= 80,
    'Map needs a revision.',
  );
  required(
    typeof map.name === 'string' && map.name.trim().length > 0 && map.name.length <= 160,
    'Map needs a name.',
  );
  const geometry = (
    directional
      ? compileDirectionalMapGeometry
      : relays
        ? compileRelayMapGeometry
        : compileMapGeometry
  )(
    Object.fromEntries(keys.filter((key) => Object.hasOwn(map, key)).map((key) => [key, map[key]])),
  );
  const geometryIdentity = dataIdentity({
    width: geometry.width,
    height: geometry.height,
    cells: geometry.cells,
    terrain: geometry.terrain,
    spawns: geometry.spawns,
    ...(relays ? { gates: geometry.gates } : {}),
    ...(directional ? { speedZones: geometry.speedZones } : {}),
  });
  return freeze({
    format: directional ? 'ResolvedMapV3' : relays ? 'ResolvedMapV2' : 'ResolvedMapV1',
    source: map,
    geometryIdentity,
    geometry,
  });
}
