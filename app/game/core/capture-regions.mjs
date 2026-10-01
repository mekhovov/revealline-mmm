import { CELL } from './registry.mjs';
import { cellIndex } from './movement.mjs';
import { classicSeedsField, fitsClassicDomain } from './classic-topology.mjs';

/** Shared engine/Studio seed ownership. Historical rules retain their own branch. */
export function captureSeedEnemies(state, releaseBoss = false) {
  return state.enemies.filter(
    (enemy) =>
      (state.classic ? classicSeedsField(enemy) : enemy.type !== 'border-patrol') &&
      // Registered roamer-capable Team editions explicitly exclude reclaimed
      // roamers as field seeds. Earlier snapshots keep their historical contract.
      !(
        ['revealline-coop.v6', 'revealline-coop.v7', 'revealline-coop.v8'].includes(
          state.ruleset,
        ) && enemy.type === 'claimed-rover'
      ) &&
      !(enemy.type === 'relay-sentinel' && (releaseBoss || state.encounter?.defeated)),
  );
}

export function fieldNeighbors(index, width, height) {
  const x = index % width,
    y = Math.floor(index / width);
  return [
    x > 0 ? index - 1 : -1,
    x < width - 1 ? index + 1 : -1,
    y > 0 ? index - width : -1,
    y < height - 1 ? index + width : -1,
  ];
}

/** Four-direction flood, evaluated only at the exact accepted closure state. */
export function retainedCaptureCells(state, releaseBoss = false) {
  const retained = new Uint8Array(state.width * state.height);
  const queue = new Int32Array(retained.length);
  let head = 0,
    tail = 0;
  for (const enemy of captureSeedEnemies(state, releaseBoss)) {
    const index = cellIndex(enemy.x, enemy.y, state);
    if (state.cells[index] === CELL.FIELD && !retained[index]) {
      retained[index] = 1;
      queue[tail++] = index;
    }
  }
  while (head < tail) {
    const index = queue[head++];
    for (const next of fieldNeighbors(index, state.width, state.height)) {
      if (next >= 0 && state.cells[next] === CELL.FIELD && !retained[next]) {
        retained[next] = 1;
        queue[tail++] = next;
      }
    }
  }
  return retained;
}

/** A frozen-time explanation, not a promise about moving enemies or a validator
 * for whether a proposed trail can legally close. Never mutates the live board. */
export function inspectCaptureSnapshot(state, { trailCells = [], releaseBoss = false } = {}) {
  const cells = Uint8Array.from(state.cells),
    securedTrail = [];
  for (const index of trailCells) {
    if (!Number.isInteger(index) || index < 0 || index >= cells.length)
      throw new TypeError('Preview trail cell is outside the map.');
    if (cells[index] === CELL.WALL) throw new TypeError('A wall cannot be a capture trail.');
    if (cells[index] === CELL.FIELD) {
      cells[index] = CELL.SAFE;
      securedTrail.push(index);
    }
  }
  const snapshot = { ...state, cells };
  const retained = retainedCaptureCells(snapshot, releaseBoss);
  const seeds = captureSeedEnemies(snapshot, releaseBoss);
  const visited = new Uint8Array(cells.length),
    components = [];
  for (let start = 0; start < cells.length; start++) {
    if (cells[start] !== CELL.FIELD || visited[start]) continue;
    const indexes = [start];
    visited[start] = 1;
    for (let head = 0; head < indexes.length; head++) {
      for (const next of fieldNeighbors(indexes[head], state.width, state.height)) {
        if (next >= 0 && cells[next] === CELL.FIELD && !visited[next]) {
          visited[next] = 1;
          indexes.push(next);
        }
      }
    }
    const members = new Set(indexes);
    components.push({
      id: start,
      cells: indexes,
      retained: !!retained[start],
      enemyIds: seeds
        .filter((enemy) => members.has(cellIndex(enemy.x, enemy.y, snapshot)))
        .map((enemy) => enemy.id),
    });
  }
  const filledCells = components
    .filter((component) => !component.retained)
    .flatMap((component) => component.cells);
  const captured = new Set([...securedTrail, ...filledCells]);
  const affectedObjectiveIds = (state.objectives || [])
    .filter(
      (objective) =>
        !objective.captured && captured.has(cellIndex(objective.x, objective.y, snapshot)),
    )
    .map((objective) => objective.id);
  let combat = {};
  if (state.level?.classic?.combatPatrols) {
    const reclaimed = Uint8Array.from(cells);
    for (const index of filledCells) reclaimed[index] = CELL.SAFE;
    const after = { ...snapshot, cells: reclaimed };
    combat = {
      affectedCombatIds: (state.classic?.combatPatrols?.actors ?? [])
        .filter(
          (actor) => actor.alive && !fitsClassicDomain(after, actor, actor.radius, CELL.FIELD),
        )
        .map((actor) => actor.id),
    };
  }
  return {
    tick: state.tick ?? null,
    assumption:
      'Snapshot only. A legal closure must be verified; moving enemies may change the outcome.',
    securedTrail,
    filledCells,
    components,
    affectedObjectiveIds,
    ...combat,
    ...(state.relay
      ? {
          affectedGateIds: state.relay.gates
            .filter(
              (gate) => gate.openedTick === null && affectedObjectiveIds.includes(gate.objectiveId),
            )
            .map((gate) => gate.id),
          reservedGateCells: state.relay.gates.flatMap((gate) => gate.cells),
        }
      : {}),
    lineOnly: securedTrail.length > 0 && filledCells.length === 0,
  };
}
