import { boundedJSON, exactKeys, required, stableId, plainObject } from '../data-json.mjs';
import { CELL } from './registry.mjs';
import { clamp } from './geometry.mjs';
import { cellIndex } from './movement.mjs';

const DESCRIPTOR_KEYS = [
  'version',
  'kind',
  'enemyId',
  'shieldObjectiveId',
  'coreObjectiveId',
  'minReleaseCutCells',
  'initialDelayTicks',
  'transitionTicks',
  'shielded',
  'exposed',
  'laneWidth',
];
const ticks = (value) => Number.isInteger(value) && value >= 1 && value <= 7200;
const actorTick = (state) => (state.classic ? state.classic.actorTick : state.tick);
export const encounterShieldIds = (descriptor) =>
  descriptor.version === 'xonix-encounter.v2'
    ? [...descriptor.shieldObjectiveIds]
    : [descriptor.shieldObjectiveId];

/** Called only after the surrounding staged level has passed ordinary geometry checks. */
export function resolveEncounterDescriptor(source, level, geometry = null) {
  required(plainObject(source), 'encounter must be an object');
  const value = boundedJSON(source, { maxBytes: 4096, maxNodes: 40, maxDepth: 3, maxString: 80 });
  const multiple = value.version === 'xonix-encounter.v2';
  const keys = multiple
    ? DESCRIPTOR_KEYS.map((key) => (key === 'shieldObjectiveId' ? 'shieldObjectiveIds' : key))
    : DESCRIPTOR_KEYS;
  exactKeys(value, keys, 'encounter');
  required(
    keys.every((key) => Object.hasOwn(value, key)),
    'encounter fields are required',
  );
  required(
    (value.version === 'xonix-encounter.v1' || multiple) && value.kind === 'relay-sentinel',
    'unsupported encounter',
  );
  for (const key of ['enemyId', ...(multiple ? [] : ['shieldObjectiveId']), 'coreObjectiveId'])
    required(stableId(value[key]), `encounter.${key} must be a stable ID`);
  if (multiple)
    required(
      Array.isArray(value.shieldObjectiveIds) &&
        value.shieldObjectiveIds.length >= 1 &&
        value.shieldObjectiveIds.length <= 4 &&
        value.shieldObjectiveIds.every(stableId) &&
        new Set(value.shieldObjectiveIds).size === value.shieldObjectiveIds.length,
      'encounter.shieldObjectiveIds needs one to four distinct stable IDs',
    );
  for (const key of ['initialDelayTicks', 'transitionTicks'])
    required(ticks(value[key]), `encounter.${key} must be 1..7200 ticks`);
  for (const [stage, keys] of [
    ['shielded', ['warningTicks', 'activeTicks', 'restTicks']],
    ['exposed', ['warningTicks', 'activeTicks', 'openTicks']],
  ]) {
    exactKeys(value[stage], keys, `encounter.${stage}`);
    required(
      keys.every((key) => ticks(value[stage][key])),
      `encounter.${stage} needs bounded integer timings`,
    );
  }
  required(
    Number.isFinite(value.laneWidth) && value.laneWidth >= 0.25 && value.laneWidth <= 5,
    'encounter.laneWidth must be 0.25..5',
  );
  const claimable = multiple
    ? geometry?.eligible.reduce((sum, cell) => sum + cell, 0)
    : (level.width - 2) * (level.height - 2) -
      (level.walls ?? []).reduce((sum, wall) => sum + wall.w * wall.h, 0);
  required(
    Number.isInteger(value.minReleaseCutCells) &&
      value.minReleaseCutCells >= 1 &&
      value.minReleaseCutCells <= Math.min(128, claimable),
    'encounter.minReleaseCutCells must fit 1..128 claimable cells',
  );
  const seeds = (level.enemies ?? []).filter((enemy) => enemy.type !== 'border-patrol');
  required(
    seeds.length === 1 && seeds[0].type === 'relay-sentinel' && seeds[0].id === value.enemyId,
    'relay-sentinel must be the sole field seed',
  );
  const sentinel = seeds[0];
  required(
    Number.isInteger(sentinel.x - 0.5) && Number.isInteger(sentinel.y - 0.5),
    'relay-sentinel must occupy an interior cell center',
  );
  exactKeys(sentinel, ['id', 'type', 'x', 'y', 'radius'], 'relay-sentinel');
  const shields = encounterShieldIds(value).map((id) =>
    (level.objectives ?? []).find((objective) => objective.id === id),
  );
  const core = (level.objectives ?? []).find((objective) => objective.id === value.coreObjectiveId);
  required(
    core &&
      core.required === true &&
      core.hidden !== true &&
      shields.every(
        (shield) => shield && shield !== core && shield.required === true && shield.hidden !== true,
      ),
    multiple
      ? 'encounter needs distinct visible required shield and core objectives'
      : 'encounter needs two distinct visible required objectives',
  );
  required(
    shields.every(
      (shield) =>
        Math.floor(shield.x) >= 1 &&
        Math.floor(shield.x) <= level.width - 2 &&
        Math.floor(shield.y) >= 1 &&
        Math.floor(shield.y) <= level.height - 2,
    ),
    'shield relay must occupy a claimable interior cell',
  );
  required(
    cellIndex(core.x, core.y, level) === cellIndex(sentinel.x, sentinel.y, level),
    'core must occupy the sentinel cell',
  );
  required(
    shields.every(
      (shield) => cellIndex(shield.x, shield.y, level) !== cellIndex(core.x, core.y, level),
    ),
    'shield relay must occupy another cell',
  );
  if (multiple)
    required(
      new Set(shields.map((shield) => cellIndex(shield.x, shield.y, level))).size ===
        shields.length,
      'shield relays must occupy distinct cells',
    );
  return value;
}

export function createEncounter(descriptor) {
  return {
    version: 'xonix-encounter-state.v1',
    kind: descriptor.kind,
    stage: 'shielded',
    phase: 'delay',
    phaseStartTick: 1,
    phaseEndTick: 1 + descriptor.initialDelayTicks,
    axis: 'horizontal',
    lane: null,
    cycle: 0,
    defeated: false,
    transitionTick: null,
    defeatTick: null,
    defeatCause: null,
    qualifyingCutCells: 0,
  };
}

function fact(state, type) {
  const e = state.encounter;
  return {
    type,
    tick: state.tick,
    time: state.time,
    id: state.level.encounter.enemyId,
    stage: e.stage,
    phase: e.phase,
    phaseStartTick: e.phaseStartTick,
    phaseEndTick: e.phaseEndTick,
    axis: e.axis,
    lane: e.lane,
    cycle: e.cycle,
  };
}

function warning(state) {
  const e = state.encounter;
  e.phase = 'warning';
  e.phaseStartTick = actorTick(state);
  e.phaseEndTick = actorTick(state) + state.level.encounter[e.stage].warningTicks;
  e.axis = e.stage === 'shielded' ? 'horizontal' : 'vertical';
  e.lane = clamp(
    Math.floor(e.axis === 'horizontal' ? state.player.y : state.player.x) + 0.5,
    1.5,
    e.axis === 'horizontal' ? state.height - 1.5 : state.width - 1.5,
  );
  e.cycle++;
}

/** Integer half-open phases resolve once, before all contacts/captures in a tick. */
export function updateEncounter(state) {
  const e = state.encounter;
  if (!e || e.defeated || actorTick(state) < e.phaseEndTick) return;
  if (e.phase === 'transition') {
    e.stage = 'exposed';
    warning(state);
    state.events.push(fact(state, 'encounter.stageChanged'));
  } else if (['delay', 'rest', 'open'].includes(e.phase)) warning(state);
  else {
    e.phase = e.phase === 'warning' ? 'active' : e.stage === 'shielded' ? 'rest' : 'open';
    e.phaseStartTick = actorTick(state);
    const key =
      e.phase === 'active' ? 'activeTicks' : e.phase === 'rest' ? 'restTicks' : 'openTicks';
    e.phaseEndTick = actorTick(state) + state.level.encounter[e.stage][key];
  }
  state.events.push(fact(state, 'encounter.phaseChanged'));
}

/** Derived, unbanked live-cut progress. Filled area and previous safe cells never count. */
export function encounterCutCells(state) {
  return new Set(
    state.trail.filter((cell) => state.cells[cell.index] === CELL.FIELD).map((cell) => cell.index),
  ).size;
}

export function releaseCutCells(state) {
  if (
    state.encounter?.stage !== 'exposed' ||
    state.encounter.phase !== 'open' ||
    state.status !== 'running' ||
    !state.player.cutting
  )
    return 0;
  const count = encounterCutCells(state);
  return count >= state.level.encounter.minReleaseCutCells ? count : 0;
}

/** Called after the ordinary capture/objective transaction, using pre-capture eligibility. */
export function finishEncounterCapture(state, releaseCells) {
  const e = state.encounter;
  if (!e || e.defeated) return;
  if (releaseCells) {
    defeatEncounter(state, 'cut-release', releaseCells);
    return;
  }
  if (
    e.stage === 'shielded' &&
    encounterShieldIds(state.level.encounter).every((id) =>
      state.objectives.some((objective) => objective.id === id && objective.captured),
    )
  ) {
    e.stage = 'transition';
    e.phase = 'transition';
    // A mid-tick closure cancels the old lane now; the full transition starts next tick.
    e.phaseStartTick = actorTick(state) + 1;
    e.phaseEndTick = actorTick(state) + 1 + state.level.encounter.transitionTicks;
    e.transitionTick = actorTick(state);
    e.axis = 'vertical';
    e.lane = null;
    e.cycle = 0;
    state.events.push(fact(state, 'encounter.stageChanged'));
  }
}

export function canReleaseIsolated(state) {
  const e = state.encounter;
  return (
    !!e &&
    e.stage === 'exposed' &&
    e.phase === 'open' &&
    !e.defeated &&
    state.status === 'running' &&
    !state.player.cutting &&
    state.trail.length === 0 &&
    state.cells[cellIndex(state.player.x, state.player.y, state)] === CELL.SAFE &&
    state.cells.reduce((sum, cell) => sum + Number(cell === CELL.FIELD), 0) <=
      state.level.encounter.minReleaseCutCells
  );
}

export function defeatEncounter(state, cause, cutCells = 0) {
  const e = state.encounter;
  if (!e || e.defeated) return;
  // The finite recipe has one field seed, so removing it must actually secure its objective.
  const core = state.objectives.find(
    (objective) => objective.id === state.level.encounter.coreObjectiveId,
  );
  if (!core?.captured) throw new Error('encounter release did not capture core');
  e.stage = 'defeated';
  e.phase = 'defeated';
  e.phaseStartTick = actorTick(state);
  e.phaseEndTick = null;
  e.defeated = true;
  e.defeatTick = actorTick(state);
  e.defeatCause = cause;
  e.qualifyingCutCells = cutCells;
  state.events.push({ ...fact(state, 'encounter.defeated'), cause, qualifyingCutCells: cutCells });
}
