import { boundedJSON, exactKeys, required, stableId } from '../data-json.mjs';
import { CELL, DIRECTIONS } from './registry.mjs';

// One versioned vocabulary, not per-level player tuning. Units remain cells/second.
export const DIRECTIONAL_FIELD_RULES = Object.freeze({
  version: 'directional-fields.v1',
  withFlow: 1.25,
  againstFlow: 0.8,
  crossFlow: 1,
});

/** Level has already crossed the bounded-own-JSON validation boundary. */
export function directionalGeometryDefinition(level) {
  exactKeys(level.directionalFields, ['version', 'zones'], 'directional fields');
  required(
    level.directionalFields.version === DIRECTIONAL_FIELD_RULES.version,
    'Expected directional-fields.v1.',
  );
  return level.directionalFields.zones;
}

/** Shared authoring/runtime boundary. The geometry must already be compiler-owned. */
export function compileDirectionalZones(source, geometry) {
  const zones = boundedJSON(source, {
    maxBytes: 16 * 1024,
    maxNodes: 400,
    maxDepth: 3,
    maxArray: 32,
  });
  required(
    Array.isArray(zones) && zones.length <= 32,
    'At most 32 directional fields are supported.',
  );
  const { width, height, cells, terrain } = geometry,
    ids = new Set(),
    occupied = new Set();
  const integer = (value, max) => Number.isInteger(value) && value >= 1 && value <= max;
  return Object.freeze(
    zones.map((zone, index) => {
      exactKeys(zone, ['id', 'x', 'y', 'w', 'h', 'direction'], `speedZones[${index}]`);
      required(stableId(zone.id) && !ids.has(zone.id), 'Directional fields need unique IDs.');
      ids.add(zone.id);
      required(
        typeof zone.direction === 'string' && Object.hasOwn(DIRECTIONS, zone.direction),
        'Directional field needs up, right, down or left.',
      );
      required(
        integer(zone.x, width - 2) &&
          integer(zone.y, height - 2) &&
          integer(zone.w, width - 2) &&
          integer(zone.h, height - 2) &&
          zone.x + zone.w <= width - 1 &&
          zone.y + zone.h <= height - 1,
        'Directional fields must be integer interior rectangles.',
      );
      const indices = [];
      for (let y = zone.y; y < zone.y + zone.h; y++)
        for (let x = zone.x; x < zone.x + zone.w; x++) {
          const cell = y * width + x;
          required(
            cells[cell] === CELL.FIELD,
            'Directional fields cannot overlap walls, gates or foundations.',
          );
          required(!terrain[cell], 'Directional fields cannot overlap slow or lethal terrain.');
          required(!occupied.has(cell), 'Directional fields cannot overlap one another.');
          occupied.add(cell);
          indices.push(cell);
        }
      return Object.freeze({ ...zone, cells: Object.freeze(indices) });
    }),
  );
}

/** Core-owned state only. No force, velocity integration, enemy effect or persistence. */
export function directionalSpeedFactor(state, index, direction) {
  if (!state.level.directionalFields || state.cells[index] !== CELL.FIELD || !direction) return 1;
  const x = index % state.width,
    y = Math.floor(index / state.width);
  const zone = state.level.directionalFields.zones.find(
    (zone) => x >= zone.x && x < zone.x + zone.w && y >= zone.y && y < zone.y + zone.h,
  );
  if (!zone) return 1;
  const flow = DIRECTIONS[zone.direction],
    movement = DIRECTIONS[direction];
  const dot = flow.x * movement.x + flow.y * movement.y;
  return dot === 1
    ? DIRECTIONAL_FIELD_RULES.withFlow
    : dot === -1
      ? DIRECTIONAL_FIELD_RULES.againstFlow
      : DIRECTIONAL_FIELD_RULES.crossFlow;
}
