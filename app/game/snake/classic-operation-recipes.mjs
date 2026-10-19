/** Literal content helpers; no random generation or runtime adaptation of recipes. */
export const bi = (en, uk) => ({ en, uk });
export const at = (x, y) => ({ x, y });
export const rect = (x, y, w, h) =>
  Array.from({ length: w * h }, (_, i) => at(x + (i % w), y + Math.floor(i / w)));
export const stage = (id, catches, exit = null, deliveries = [], activations = []) => ({
  id,
  catches,
  exit,
  deliveries,
  activations,
});
export const activate = (kind, id, count = 1) => ({ kind, id, count });
export const parcel = (id, x, y, dockId = 'a') => ({ id, at: at(x, y), dockId });
export const dock = (id, x, y) => ({ id, at: at(x, y) });
export const plate = (id, pads, gates) => ({
  id,
  pads: pads.map((p) => at(...p)),
  gates: gates.map((p) => at(...p)),
});
export const prey = (kind = 'runner', every = 3, goals) => ({
  kind,
  every,
  ...(goals ? { goals: goals.map((p) => at(...p)) } : {}),
});
export const jammer = (x, y, broadcast = false) => ({
  kind: 'jammer',
  every: 3,
  at: at(x, y),
  signalProfile: broadcast ? 'broadcast-burst-v1' : 'local-burst-v2',
});
export const lane = (x, y, axis, from, to) => ({
  kind: 'lane',
  every: 3,
  at: at(x, y),
  lane: { axis, from, to },
});
export const guard = (x, y, heading) => ({ kind: 'guard', every: 3, at: at(x, y), heading });
export function loop(x, y, dx, dy, w, h) {
  const cells = [at(x, y)];
  for (let i = 1; i <= w; i++) cells.push(at(x + dx * i, y));
  for (let i = 1; i <= h; i++) cells.push(at(x + dx * w, y + dy * i));
  for (let i = w - 1; i >= 0; i--) cells.push(at(x + dx * i, y + dy * h));
  for (let i = h - 1; i > 0; i--) cells.push(at(x, y + dy * i));
  return cells;
}
export const junction = (id, policyIndex, x, y, switches, w = 4, h = 4, w2 = w, h2 = h) => ({
  id,
  policyIndex,
  switches: switches.map((p) => at(...p)),
  routes: [loop(x, y, -1, -1, w, h), loop(x, y, 1, 1, w2, h2)],
});
export const patrol = (group, every = 4) => ({ kind: 'patroller', every, path: group.routes[0] });
export function freeze(value) {
  if (value && typeof value === 'object') {
    Object.values(value).forEach(freeze);
    Object.freeze(value);
  }
  return value;
}
export function operationMission(
  chapter,
  {
    slug,
    title,
    description,
    walls = [],
    wrap = false,
    targets = [prey()],
    active = 1,
    stages,
    parcels = [],
    docks = [],
    switchyards = [],
    plates = [],
    pickups = [],
    shutters = [],
    composition,
  },
) {
  const id = `classic-operation-${slug}`;
  const cells = [
    ...new Map(walls.flatMap((r) => rect(...r)).map((p) => [`${p.x},${p.y}`, p])).values(),
  ].sort((a, b) => a.y - b.y || a.x - b.x);
  return {
    id,
    chapterId: `classic-snake-${chapter}`,
    title,
    description,
    composition,
    level: {
      version: 'classic-snake-level.v5',
      id,
      revision: 'operations-1',
      name: title.en,
      width: 24,
      height: 18,
      walls: cells,
      spawns: [
        { x: 5, y: 2, direction: 'right' },
        { x: 18, y: 15, direction: 'left' },
      ],
      goal: stages.at(-1).catches,
      stepMs: 200,
      minStepMs: 200,
      speedupEvery: 0,
      wrap,
      targetMovement: 'still',
      fleeEvery: 3,
      objective: 'mission',
      targets: { maxActive: active, required: targets, bonus: null },
      shutters,
      pickups,
      operation: { stages, parcels, docks, switchyards, plates },
    },
  };
}
