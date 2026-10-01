import { exactKeys, required, stableId } from '../data-json.mjs';
import { CELL } from './registry.mjs';

/** Called only on bounded owned successor-level data before the shared compiler. */
export function relayGeometryDefinition(level) {
  const definition = level.relayGates;
  exactKeys(definition, ['version', 'gates'], 'relay gates');
  required(definition.version === 'relay-gates.v1', 'Expected relay-gates.v1.');
  required(
    Array.isArray(definition.gates) && definition.gates.length <= 32,
    'Relay gates need at most 32 entries.',
  );
  return definition.gates.map((gate) => {
    exactKeys(gate, ['id', 'x', 'y', 'w', 'h', 'objectiveId'], 'relay gate');
    required(stableId(gate.objectiveId), 'Gate needs a capture objective ID.');
    const objective = level.objectives?.find((objective) => objective.id === gate.objectiveId);
    required(objective, 'Gate capture objective is missing.');
    required(
      !(objective.required && objective.hidden),
      'A required relay capture objective must be visible.',
    );
    const { objectiveId: _objectiveId, ...rectangle } = gate;
    return rectangle;
  });
}

export function createRelayState(level, geometry) {
  return {
    version: 'relay-state.v1',
    gates: geometry.gates
      .map((gate) => ({
        id: gate.id,
        objectiveId: level.relayGates.gates.find((entry) => entry.id === gate.id).objectiveId,
        cells: [...gate.cells],
        openedTick: null,
      }))
      .sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0)),
  };
}

/** After one capture transaction, never a second flood or scoring transaction. */
export function openCapturedRelays(state) {
  if (!state.relay) return;
  const captured = new Set(state.objectives.filter((item) => item.captured).map((item) => item.id));
  let changed = false;
  for (const gate of state.relay.gates) {
    if (gate.openedTick !== null || !captured.has(gate.objectiveId)) continue;
    for (const index of gate.cells) {
      state.cells[index] = CELL.SAFE;
      state.foundation.permanent[index] = 1;
    }
    gate.openedTick = state.tick;
    changed = true;
    state.events.push({
      type: 'relay.opened',
      tick: state.tick,
      time: state.time,
      id: gate.id,
      objectiveId: gate.objectiveId,
      indices: [...gate.cells],
    });
  }
  if (changed) state.classic.topologyRevision++;
}
