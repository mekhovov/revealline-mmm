import {
  routingObjectCells,
  validateOperationRouting,
  initializeOperationRouting,
  acceptOperationRouting,
  operationTargetPath,
  operationActivationsMet,
} from './classic-routing-v5.mjs';
/** Bounded continuous operations sharing the accepted v4 movement boundary. */
import { boundedJSON, dataIdentity, exactKeys, required } from '../data-json.mjs';
import {
  CLASSIC_SNAKE_V4_LEVEL,
  validateClassicSnakeLevelV4,
  createClassicSnakeV4,
  queueClassicSnakeTurnV4,
  stepClassicSnakeV4,
  classicSnakeSummaryV4,
  exportClassicSnakeReplayV4,
  restoreClassicSnakeReplayWithEngine,
} from './classic-core-v4.mjs';

export const CLASSIC_SNAKE_V5_LEVEL = 'classic-snake-level.v5';
export const CLASSIC_SNAKE_V5_CORE = 'classic-snake-core.v5';
export const CLASSIC_SNAKE_V5_REPLAY = 'classic-snake-replay.v5';
const integer = (v, a, b) => Number.isInteger(v) && v >= a && v <= b;
const key = (p) => `${p.x},${p.y}`;
const same = (a, b) => a.x === b.x && a.y === b.y;
const id = (value) => typeof value === 'string' && /^[a-z][a-z0-9-]{0,47}$/.test(value);
const freeze = (value) => {
  if (value && typeof value === 'object') {
    Object.values(value).forEach(freeze);
    Object.freeze(value);
  }
  return value;
};
function baseLevel(source) {
  const { operation: _operation, ...base } = source;
  return { ...base, version: CLASSIC_SNAKE_V4_LEVEL };
}
const objectCells = (operation) => [
  ...routingObjectCells(operation),
  ...operation.parcels.map((p) => p.at),
  ...operation.docks.map((d) => d.at),
  ...operation.stages.flatMap((s) => (s.exit ? [s.exit] : [])),
];

export function validateClassicSnakeLevelV5(source) {
  const input = boundedJSON(source, {
    maxBytes: 96 * 1024,
    maxNodes: 12000,
    maxArray: 1536,
    maxDepth: 8,
  });
  required(input.version === CLASSIC_SNAKE_V5_LEVEL, 'Unsupported Snake operation version.');
  const base = validateClassicSnakeLevelV4(baseLevel(input));
  required(
    base.objective === 'mission',
    'Continuous operations require Mission Race, not Score or Endless.',
  );
  const op = input.operation;
  exactKeys(op, ['stages', 'parcels', 'docks', 'switchyards', 'plates'], 'Snake operation');
  required(
    Array.isArray(op.stages) && integer(op.stages.length, 1, 3),
    'Use one to three continuous stages.',
  );
  required(
    Array.isArray(op.parcels) && (op.parcels.length === 0 || integer(op.parcels.length, 2, 4)),
    'Use two to four cargo parcels.',
  );
  required(
    Array.isArray(op.docks) &&
      integer(op.docks.length, op.parcels.length ? 1 : 0, op.parcels.length),
    'Invalid cargo docks.',
  );
  const forbidden = new Set([...base.walls, ...base.shutters.flatMap((s) => s.cells)].map(key));
  const occupied = new Set();
  const point = (p) => {
    exactKeys(p, ['x', 'y'], 'Operation cell');
    required(
      integer(p.x, 0, base.width - 1) && integer(p.y, 0, base.height - 1) && !forbidden.has(key(p)),
      'Operation objects need permanent walkable cells.',
    );
  };
  const unique = (rows) => {
    const seen = new Set();
    for (const row of rows) {
      required(id(row.id) && !seen.has(row.id), 'Operation IDs must be unique.');
      seen.add(row.id);
    }
  };
  unique(op.parcels);
  unique(op.docks);
  unique(op.stages);
  for (const dock of op.docks) {
    exactKeys(dock, ['id', 'at'], 'Cargo dock');
    point(dock.at);
    required(!occupied.has(key(dock.at)), 'Cargo objects cannot overlap.');
    occupied.add(key(dock.at));
  }
  for (const parcel of op.parcels) {
    exactKeys(parcel, ['id', 'at', 'dockId'], 'Cargo parcel');
    point(parcel.at);
    required(
      op.docks.some((d) => d.id === parcel.dockId),
      'Cargo needs a matching dock.',
    );
    required(!occupied.has(key(parcel.at)), 'Cargo objects cannot overlap.');
    occupied.add(key(parcel.at));
  }
  const assigned = new Set();
  let catches = 0;
  for (const stage of op.stages) {
    exactKeys(stage, ['id', 'catches', 'deliveries', 'exit', 'activations'], 'Operation stage');
    required(
      integer(stage.catches, catches, base.goal),
      'Stage catch thresholds must increase cumulatively.',
    );
    required(
      Array.isArray(stage.deliveries) && stage.deliveries.length <= 4,
      'Invalid stage deliveries.',
    );
    for (const parcelId of stage.deliveries) {
      required(
        op.parcels.some((p) => p.id === parcelId) && !assigned.has(parcelId),
        'Assign each parcel to exactly one stage.',
      );
      assigned.add(parcelId);
    }
    required(stage.exit === null || typeof stage.exit === 'object', 'Invalid extraction cell.');
    if (stage.exit !== null) point(stage.exit);
    required(
      stage.catches > catches || stage.deliveries.length || stage.exit || stage.activations?.length,
      'An empty stage has no objective.',
    );
    catches = stage.catches;
  }
  required(
    catches === base.goal && assigned.size === op.parcels.length,
    'Final stage must cover the finite encounter quota and every parcel.',
  );
  required(
    op.docks.every((d) => op.parcels.some((p) => p.dockId === d.id)),
    'Unused cargo dock.',
  );
  validateOperationRouting(base, op, occupied);
  // Supplies and fixed encounter anchors keep their distinct, readable role.
  const reserved = new Set(objectCells(op).map(key));
  required(
    base.pickups.every((p) => p.pads.every((at) => !reserved.has(key(at)))) &&
      base.targets.required.every((p) => !p.at || !reserved.has(key(p.at))),
    'Supplies and fixed enemies must not overlap operation objects.',
  );
  return { ...base, version: CLASSIC_SNAKE_V5_LEVEL, operation: op };
}

function availableParcel(run, at) {
  const stage = run.level.operation.stages[run.operation.stage];
  return run.level.operation.parcels.find(
    (p) =>
      stage?.deliveries.includes(p.id) &&
      same(p.at, at) &&
      run.operation.parcels.find((state) => state.id === p.id)?.state === 'waiting',
  );
}
const cargoFor = (run, snake) =>
  run.operation.parcels.filter((p) => p.state === 'carried' && p.carrier === snake.id);
function acceptOperation(run, plans) {
  for (const plan of plans) {
    const parcel = availableParcel(run, plan.next);
    // Two pickups on one move cannot create a duplicate tail cell. The extra
    // growth is accepted now and retained at the next movement boundary.
    plan.s.pendingGrowth = Math.max(
      0,
      plan.s.pendingGrowth +
        Number(Boolean(plan.target)) +
        Number(Boolean(parcel)) -
        Number(plan.grows),
    );
    if (parcel) {
      const state = run.operation.parcels.find((p) => p.id === parcel.id);
      state.state = 'carried';
      state.carrier = plan.s.id;
      run.events.push({
        type: 'cargo.collected',
        tick: run.tick,
        playerId: plan.s.id,
        parcelId: parcel.id,
      });
    }
    const dock = run.level.operation.docks.find((d) => same(d.at, plan.next));
    if (dock) {
      const deliveries = cargoFor(run, plan.s).filter(
        (state) => run.level.operation.parcels.find((p) => p.id === state.id).dockId === dock.id,
      );
      for (const state of deliveries) {
        state.state = 'delivered';
        state.carrier = null;
        if (plan.s.pendingGrowth) plan.s.pendingGrowth--;
        else plan.s.body.pop();
        run.events.push({
          type: 'cargo.delivered',
          tick: run.tick,
          playerId: plan.s.id,
          parcelId: state.id,
          dockId: dock.id,
        });
      }
    }
  }
  acceptOperationRouting(run, plans);
  const stage = run.level.operation.stages[run.operation.stage];
  if (
    stage &&
    operationActivationsMet(run, stage) &&
    run.catches >= stage.catches &&
    stage.deliveries.every((id) =>
      run.operation.parcels.some((p) => p.id === id && p.state === 'delivered'),
    ) &&
    (!stage.exit || run.snakes.some((s) => s.alive && same(s.body[0], stage.exit)))
  ) {
    run.operation.completed.push(stage.id);
    run.operation.stage++;
    run.events.push({ type: 'operation.stage-completed', tick: run.tick, stageId: stage.id });
  }
}
export const CLASSIC_SNAKE_V5_RULES = {
  targetPath: operationTargetPath,
  reservedCells: (run) => objectCells(run.level.operation),
  grows: (run, plan) =>
    Boolean(plan.target || plan.s.pendingGrowth || availableParcel(run, plan.next)),
  accept: acceptOperation,
  tailFloor: (run, snake) => Math.max(4, 4 + cargoFor(run, snake).length - snake.pendingGrowth),
  complete: (run) => run.operation.stage === run.level.operation.stages.length,
};
export function createClassicSnakeV5(source, options = {}, successorRules = {}) {
  const level = freeze(validateClassicSnakeLevelV5(source));
  const run = createClassicSnakeV4(baseLevel(level), options, {
    ...CLASSIC_SNAKE_V5_RULES,
    ...successorRules,
    reservedCells: () => objectCells(level.operation),
  });
  run.version = CLASSIC_SNAKE_V5_CORE;
  run.level = level;
  run.levelIdentity = dataIdentity(level);
  run.operation = {
    stage: 0,
    completed: [],
    parcels: level.operation.parcels.map((p) => ({ id: p.id, state: 'waiting', carrier: null })),
  };
  for (const snake of run.snakes) snake.pendingGrowth = 0;
  initializeOperationRouting(run);
  return run;
}
export const queueClassicSnakeTurnV5 = queueClassicSnakeTurnV4;
export const stepClassicSnakeV5 = (run) => stepClassicSnakeV4(run, CLASSIC_SNAKE_V5_RULES);
export function classicSnakeSummaryV5(run) {
  return {
    ...classicSnakeSummaryV4(run),
    operation: {
      stage: run.operation.stage,
      stages: run.level.operation.stages.length,
      completed: [...run.operation.completed],
      delivered: run.operation.parcels.filter((p) => p.state === 'delivered').length,
      carried: run.operation.parcels.filter((p) => p.state === 'carried').length,
      parcels: run.operation.parcels.length,
    },
  };
}
export function exportClassicSnakeReplayV5(run) {
  return {
    ...exportClassicSnakeReplayV4(run),
    version: CLASSIC_SNAKE_V5_REPLAY,
    ruleset: CLASSIC_SNAKE_V5_CORE,
  };
}
export function restoreClassicSnakeReplayV5(source, options = {}) {
  return restoreClassicSnakeReplayWithEngine(source, options, {
    replayVersion: CLASSIC_SNAKE_V5_REPLAY,
    coreVersion: CLASSIC_SNAKE_V5_CORE,
    create: createClassicSnakeV5,
    validate: validateClassicSnakeLevelV5,
    queue: queueClassicSnakeTurnV5,
    step: stepClassicSnakeV5,
  });
}
