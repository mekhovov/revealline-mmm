import { canonicalJSON, exactKeys, required } from '../data-json.mjs';

const key = (p) => `${p.x},${p.y}`;
const same = (a, b) => a.x === b.x && a.y === b.y;
const integer = (v, low, high) => Number.isInteger(v) && v >= low && v <= high;
const validId = (v) => typeof v === 'string' && /^[a-z][a-z0-9-]{0,47}$/.test(v);
const directions = [
  [1, 0],
  [-1, 0],
  [0, 1],
  [0, -1],
];
function next(level, point, [dx, dy]) {
  const x = point.x + dx,
    y = point.y + dy;
  return level.wrap
    ? { x: (x + level.width) % level.width, y: (y + level.height) % level.height }
    : { x, y };
}
const inside = (level, p) => integer(p.x, 0, level.width - 1) && integer(p.y, 0, level.height - 1);
export function routingObjectCells(operation) {
  return [
    ...(operation.switchyards ?? []).flatMap((g) => g.switches),
    ...(operation.plates ?? []).flatMap((g) => [...g.pads, ...g.gates]),
  ];
}
export function validateOperationRouting(level, operation, occupied) {
  const groups = operation.switchyards ?? [],
    plates = operation.plates ?? [];
  required(
    Array.isArray(groups) && groups.length <= 2 && Array.isArray(plates) && plates.length <= 2,
    'Use at most two switchyards and two plate groups.',
  );
  const closed = new Set([...level.walls, ...level.shutters.flatMap((s) => s.cells)].map(key));
  const point = (p) => {
    exactKeys(p, ['x', 'y'], 'Routing cell');
    required(inside(level, p) && !closed.has(key(p)), 'Routing objects need walkable cells.');
  };
  const claim = (p) => {
    point(p);
    required(!occupied.has(key(p)), 'Routing objects must not overlap.');
    occupied.add(key(p));
  };
  const ids = new Set(),
    policies = new Set();
  for (const group of groups) {
    exactKeys(group, ['id', 'switches', 'policyIndex', 'routes'], 'Switchyard');
    required(validId(group.id) && !ids.has(group.id), 'Routing IDs must be distinct.');
    ids.add(group.id);
    required(
      integer(group.policyIndex, 0, level.targets.required.length - 1) &&
        !policies.has(group.policyIndex),
      'Each switchyard owns one distinct target policy.',
    );
    policies.add(group.policyIndex);
    const policy = level.targets.required[group.policyIndex];
    required(policy.kind === 'patroller', 'Switchyards redirect safe-contact patrollers only.');
    required(
      Array.isArray(group.switches) && integer(group.switches.length, 1, 2),
      'Use one or two linked switches.',
    );
    group.switches.forEach(claim);
    required(
      Array.isArray(group.routes) && group.routes.length === 2,
      'A junction selects two explicit routes.',
    );
    for (const route of group.routes) {
      required(
        Array.isArray(route) && integer(route.length, 4, 96),
        'Switchyard routes must be bounded closed loops.',
      );
      const seen = new Set();
      route.forEach((p, i) => {
        point(p);
        required(!seen.has(key(p)), 'A route must not repeat cells.');
        seen.add(key(p));
        required(
          directions.some((d) => same(next(level, p, d), route[(i + 1) % route.length])),
          'Routes need adjacent steps, including the return to their junction.',
        );
      });
    }
    required(
      same(group.routes[0][0], group.routes[1][0]),
      'Both branches must start at the same junction.',
    );
    required(
      canonicalJSON(group.routes[0]) === canonicalJSON(policy.path),
      'The initial patrol path must match branch zero.',
    );
    const first = new Set(group.routes[0].slice(1).map(key));
    required(
      group.routes[1].slice(1).every((p) => !first.has(key(p))),
      'Branches may meet only at their explicit junction.',
    );
  }
  const gateCells = new Set();
  const starting = new Set();
  const delta = { right: [1, 0], left: [-1, 0], up: [0, -1], down: [0, 1] };
  for (const spawn of level.spawns) {
    const [dx, dy] = delta[spawn.direction];
    for (let n = -1; n < 4; n++) {
      const p = { x: spawn.x - dx * n, y: spawn.y - dy * n };
      if (level.wrap) {
        p.x = (p.x + level.width) % level.width;
        p.y = (p.y + level.height) % level.height;
      }
      starting.add(key(p));
    }
  }
  for (const group of plates) {
    exactKeys(group, ['id', 'pads', 'gates'], 'Cable plate group');
    required(validId(group.id) && !ids.has(group.id), 'Routing IDs must be distinct.');
    ids.add(group.id);
    required(
      Array.isArray(group.pads) &&
        integer(group.pads.length, 1, 2) &&
        Array.isArray(group.gates) &&
        integer(group.gates.length, 1, 8),
      'Plate groups need one or two pads and one to eight gate cells.',
    );
    group.pads.forEach(claim);
    group.gates.forEach((p) => {
      claim(p);
      required(!starting.has(key(p)), 'Closed cable gates must leave both starts clear.');
      gateCells.add(key(p));
    });
  }
  // With every gate shut, one connected permanent field remains. No timed
  // shortcut can trap a snake or turn the sole route into an execution timer.
  if (gateCells.size) {
    const walls = new Set([...closed, ...gateCells]),
      visited = new Set([key(level.spawns[0])]),
      queue = [level.spawns[0]];
    for (let i = 0; i < queue.length; i++)
      for (const d of directions) {
        const p = next(level, queue[i], d),
          id = key(p);
        if (inside(level, p) && !walls.has(id) && !visited.has(id)) {
          visited.add(id);
          queue.push(p);
        }
      }
    required(
      visited.size === level.width * level.height - walls.size,
      'Closed cable gates need a connected permanent bypass.',
    );
    const permanentObjects = [
      ...operation.parcels.map((p) => p.at),
      ...operation.docks.map((d) => d.at),
      ...operation.stages.flatMap((s) => (s.exit ? [s.exit] : [])),
      ...level.pickups.flatMap((p) => p.pads),
      ...level.targets.required.flatMap((p) => (p.at ? [p.at] : [])),
    ];
    required(
      permanentObjects.every((p) => !gateCells.has(key(p))),
      'Objectives, supplies and fixed posts cannot sit inside a cable gate.',
    );
  }
  for (const stage of operation.stages) {
    if (!Object.hasOwn(stage, 'activations')) continue;
    required(
      Array.isArray(stage.activations) && stage.activations.length <= 4,
      'Invalid activation objectives.',
    );
    const seen = new Set();
    for (const goal of stage.activations) {
      exactKeys(goal, ['kind', 'id', 'count'], 'Activation objective');
      const list = goal.kind === 'switchyard' ? groups : goal.kind === 'plate' ? plates : [];
      required(
        list.some((g) => g.id === goal.id) && integer(goal.count, 1, 8) && !seen.has(goal.id),
        'Activation objectives must name a distinct routing group and bounded count.',
      );
      seen.add(goal.id);
    }
  }
}

export function initializeOperationRouting(run) {
  const op = run.level.operation;
  if (op.switchyards?.length)
    run.operation.switchyards = op.switchyards.map((g) => ({ id: g.id, selection: 0, toggles: 0 }));
  if (op.plates?.length) {
    run.operation.plates = op.plates.map((g) => ({
      id: g.id,
      held: false,
      closeAtMs: null,
      activations: 0,
    }));
    run.shutters.push(
      ...op.plates.map((g) => ({
        id: `cable-${g.id}`,
        kind: 'cable-plate',
        cells: g.gates,
        closed: true,
        warning: false,
        yielding: false,
      })),
    );
    // Starting on a plate opens its gate but does not grant an activation.
    for (const group of op.plates) {
      const state = run.operation.plates.find((p) => p.id === group.id);
      state.held = run.snakes.some((s) => s.body.some((at) => group.pads.some((p) => same(at, p))));
      if (state.held) run.shutters.find((g) => g.id === `cable-${group.id}`).closed = false;
    }
  }
}
export function acceptOperationRouting(run, plans) {
  for (const group of run.level.operation.switchyards ?? []) {
    // A shared group toggles once per accepted move, even when both heads
    // enter separate linked switches at the same time.
    if (plans.some((p) => group.switches.some((at) => same(p.next, at)))) {
      const state = run.operation.switchyards.find((s) => s.id === group.id);
      state.selection = 1 - state.selection;
      state.toggles++;
      run.events.push({
        type: 'switchyard.changed',
        tick: run.tick,
        groupId: group.id,
        selection: state.selection,
      });
    }
  }
  for (const group of run.level.operation.plates ?? []) {
    const state = run.operation.plates.find((s) => s.id === group.id),
      gate = run.shutters.find((g) => g.id === `cable-${group.id}`);
    const held = run.snakes.some((s) => s.body.some((at) => group.pads.some((p) => same(at, p))));
    if (held && !state.held) {
      state.activations++;
      run.events.push({ type: 'plate.activated', tick: run.tick, groupId: group.id });
    }
    if (!held && state.held) {
      state.closeAtMs = run.elapsedMs + 800;
      run.events.push({
        type: 'plate.released',
        tick: run.tick,
        groupId: group.id,
        closeAtMs: state.closeAtMs,
      });
    }
    state.held = held;
    gate.yielding = false;
    if (held) {
      state.closeAtMs = null;
      gate.closed = false;
      gate.warning = false;
      continue;
    }
    if (gate.closed) continue;
    gate.warning = true;
    if (run.elapsedMs < state.closeAtMs) continue;
    const actors = [
      ...run.snakes.flatMap((s) => s.body),
      ...run.targets,
      ...run.projectiles,
      ...(run.pickup ? [run.pickup] : []),
    ];
    gate.yielding = actors.some((p) => gate.cells.some((at) => same(p, at)));
    if (!gate.yielding) {
      gate.closed = true;
      gate.warning = false;
      run.events.push({ type: 'plate.gate-closed', tick: run.tick, groupId: group.id });
    }
  }
}
export function operationTargetPath(run, target, policy) {
  if (target.role === 'bonus') return policy.path;
  const group = run.level.operation.switchyards?.find((g) => g.policyIndex === target.policyIndex);
  if (!group) return policy.path;
  if (same(target, group.routes[0][0])) {
    target.switchyardBranch = run.operation.switchyards.find((s) => s.id === group.id).selection;
    target.routeIndex = 0;
  }
  return group.routes[target.switchyardBranch ?? 0];
}
export function operationActivationsMet(run, stage) {
  return (stage.activations ?? []).every((goal) => {
    const state = (
      goal.kind === 'switchyard' ? run.operation.switchyards : run.operation.plates
    )?.find((s) => s.id === goal.id);
    return (goal.kind === 'switchyard' ? state?.toggles : state?.activations) >= goal.count;
  });
}
