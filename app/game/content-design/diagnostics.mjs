import { createRun, CELL } from '../core/index.mjs';
import { fieldNeighbors, inspectCaptureSnapshot } from '../core/capture-regions.mjs';

/** Optimistic wall/relay connectivity only. Terrain, enemy timing, legal closure
 * and human execution can further restrict playability. Relay dependencies are
 * expanded only from reachable objectives or initially empty remote regions. */
export function inspectMissionTopology(level, geometry) {
  const run = createRun(level, { seed: 1, classId: 'scout' });
  return inspectRuntimeTopology(run, level, geometry, [level.spawn], level.objectives);
}

/** Shared spatial diagnostics, supplied with each mode's real initial engine.
 * Reachability is the union of explicit seats, not an assumed Solo start. */
export function inspectRuntimeTopology(run, level, geometry, spawns, objectives = []) {
  const capture = inspectCaptureSnapshot(run);
  const queue = spawns.map((spawn) => Math.floor(spawn.y) * run.width + Math.floor(spawn.x));
  const reachable = new Set(queue);
  const empty = new Set(capture.filledCells);
  const openedCells = new Set(),
    accessibleGates = new Set();
  const gates = run.relay?.gates ?? [];
  function flood() {
    for (let cursor = 0; cursor < queue.length; cursor++)
      for (const next of fieldNeighbors(queue[cursor], level.width, level.height)) {
        if (
          next >= 0 &&
          (geometry.cells[next] !== CELL.WALL || openedCells.has(next)) &&
          !reachable.has(next)
        ) {
          reachable.add(next);
          queue.push(next);
        }
      }
  }
  flood();
  const initialReachable = new Set(reachable);
  // At most one pass per authored gate plus the terminal no-change pass.
  for (let pass = 0; pass < gates.length; pass++) {
    let changed = false;
    for (const gate of gates) {
      if (accessibleGates.has(gate.id)) continue;
      const objective = objectives.find((entry) => entry.id === gate.objectiveId);
      const cell = Math.floor(objective.y) * level.width + Math.floor(objective.x);
      if (!reachable.has(cell) && !empty.has(cell)) continue;
      accessibleGates.add(gate.id);
      for (const index of gate.cells) openedCells.add(index);
      changed = true;
    }
    if (!changed) break;
    flood();
  }
  const diagnostics = [];
  if (capture.affectedCombatIds?.length)
    diagnostics.push({
      severity: 'warning',
      code: 'combat-auto-fill-removal',
      actorIds: capture.affectedCombatIds,
      message:
        'These optional actors start in an unretained region and may disappear at the next unrelated closure. They never retain field; confirm this is intentional.',
    });
  const inaccessibleRetained = new Set();
  for (const gate of gates)
    if (!accessibleGates.has(gate.id))
      diagnostics.push({
        severity: 'warning',
        code: 'blocked-relay-dependency',
        gateId: gate.id,
        objectiveId: gate.objectiveId,
        message:
          'This gate depends on a wall-isolated retained objective even after optimistic relay expansion. Check for a circular dependency.',
      });
  for (const component of capture.components) {
    const remote = !component.cells.some((cell) => reachable.has(cell));
    const initiallyRemote = !component.cells.some((cell) => initialReachable.has(cell));
    if (remote && component.retained) {
      for (const cell of component.cells) inaccessibleRetained.add(cell);
      diagnostics.push({
        severity: 'warning',
        code: 'inaccessible-retained-chamber',
        componentId: component.id,
        enemyIds: component.enemyIds,
        cells: component.cells.length,
        message:
          'Walls isolate an occupied field region from every mission spawn. Its cells cannot be earned with the current mechanics.',
      });
    } else if (!component.retained) {
      diagnostics.push({
        severity: 'warning',
        code: initiallyRemote ? 'remote-auto-fill' : 'unoccupied-auto-fill',
        componentId: component.id,
        cells: component.cells.length,
        message:
          'This empty region would fill at the first accepted closure if it remains unoccupied. Check that this is intentional.',
      });
    }
  }
  for (const objective of objectives) {
    const cell = Math.floor(objective.y) * level.width + Math.floor(objective.x);
    if (inaccessibleRetained.has(cell))
      diagnostics.push({
        severity: objective.required ? 'error' : 'warning',
        code: 'unreachable-objective',
        objectiveId: objective.id,
        message: `${objective.required ? 'Required' : 'Optional'} objective ${objective.id} lies in a wall-isolated, enemy-retained chamber.`,
      });
    else if (!initialReachable.has(cell) && empty.has(cell))
      diagnostics.push({
        severity: 'warning',
        code: 'remote-objective-auto-fill',
        objectiveId: objective.id,
        message: `Objective ${objective.id} is unreachable by movement but would be earned through remote empty-region fill.`,
      });
  }
  const optimisticCoverageCeiling =
    (geometry.eligibleCount - inaccessibleRetained.size) / geometry.eligibleCount;
  if (optimisticCoverageCeiling + 1e-12 < level.goal.coverage)
    diagnostics.push({
      severity: 'error',
      code: 'unreachable-coverage-quota',
      message: `Even an optimistic clear can earn at most ${(optimisticCoverageCeiling * 100).toFixed(1)}%; this mission requires ${(level.goal.coverage * 100).toFixed(1)}%.`,
    });
  return {
    assumption: gates.length
      ? 'Optimistic relay dependency reachability and initial enemy retention only; accessible objectives are not proven capturable. Not a solution, timing or enjoyment proof.'
      : 'Static wall connectivity and initial enemy retention only; not a solution, timing or enjoyment proof.',
    inaccessibleRetainedCells: inaccessibleRetained.size,
    optimisticCoverageCeiling,
    diagnostics,
    ...(run.relay
      ? {
          relays: {
            initiallyReachableCells: initialReachable.size,
            optimisticReachableCells: reachable.size,
            potentiallyOpenGateIds: [...accessibleGates].sort(),
            blockedGateIds: gates
              .filter((gate) => !accessibleGates.has(gate.id))
              .map((gate) => gate.id),
          },
        }
      : {}),
  };
}
