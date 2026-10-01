import { boundedJSON, canonicalJSON, dataIdentity, plainObject, stableId } from './data-json.mjs';
import { FIXED_DT, MAX_CLASS_HISTORY } from './core/registry.mjs';
import { normalizedLevel } from './core/level.mjs';
import {
  isEquipmentDefinition,
  resolveEquipmentDefinition,
  captureEquipmentSetup,
  captureEquipmentFacts,
  createEquipmentObserver,
} from './mastery-equipment.mjs';
export {
  EQUIPMENT_MASTERY_DEFINITION_VERSION,
  SUPPLY_LINE,
  SAFE_RETURN,
} from './mastery-equipment.mjs';

export const MASTERY_DEFINITION_VERSION = 'xonix-mastery-definition.v1';
export const MAX_MASTERY_TICKS = 30 * 60 * 120;
const EPS = 1e-8;
const freeze = (value) => {
  for (const child of Object.values(value)) if (child && typeof child === 'object') freeze(child);
  return Object.freeze(value);
};
export const STEADY_SIGNAL = freeze({
  version: MASTERY_DEFINITION_VERSION,
  id: 'steady-signal',
  revision: '1',
  campaignId: 'homeward-skies',
  levelId: 'homeward-01',
  name: 'Steady Signal',
  description:
    'Close one cut through eight distinct interference cells with signal resistance, then win without losing a life.',
  all: [{ type: 'clean-win' }, { type: 'resistant-cut-cells', zoneId: 'broad-band', minCells: 8 }],
});
const ensure = (condition, message) => {
  if (!condition) throw new TypeError(message);
};
const keys = (value, allowed, label) => {
  ensure(plainObject(value), `${label} must be a plain object.`);
  ensure(
    Object.keys(value).length === allowed.length &&
      allowed.every((key) => Object.hasOwn(value, key)),
    `${label} has missing or unsupported fields.`,
  );
};
const text = (value, length) =>
  typeof value === 'string' && value.trim().length > 0 && value.length <= length;
const integer = (value, min, max) => Number.isInteger(value) && value >= min && value <= max;
const finite = (value, min, max) => Number.isFinite(value) && value >= min && value <= max;
const copy = (value, maxArray = 16) => {
  ensure(plainObject(value), 'Mastery data must be a plain object.');
  return boundedJSON(value, {
    maxBytes: 8192,
    maxNodes: 256,
    maxDepth: 4,
    maxArray,
    maxString: 512,
  });
};

/** This first schema intentionally supports exactly the two Steady Signal predicates. */
export function resolveMasteryDefinition(source) {
  if (isEquipmentDefinition(source)) return resolveEquipmentDefinition(source);
  const value = copy(source, 2);
  keys(
    value,
    ['version', 'id', 'revision', 'campaignId', 'levelId', 'name', 'description', 'all'],
    'Definition',
  );
  ensure(value.version === MASTERY_DEFINITION_VERSION, 'Unsupported mastery definition version.');
  for (const key of ['id', 'campaignId', 'levelId'])
    ensure(stableId(value[key]), `Invalid definition ${key}.`);
  ensure(
    text(value.revision, 80) && text(value.name, 80) && text(value.description, 512),
    'Invalid mastery text.',
  );
  ensure(
    Array.isArray(value.all) && value.all.length === 2,
    'Exactly two mastery predicates are required.',
  );
  const clean = value.all.find((item) => item?.type === 'clean-win');
  const cut = value.all.find((item) => item?.type === 'resistant-cut-cells');
  keys(clean, ['type'], 'Clean-win predicate');
  keys(cut, ['type', 'zoneId', 'minCells'], 'Resistant-cut predicate');
  ensure(
    stableId(cut.zoneId) && integer(cut.minCells, 1, 46 * 34),
    'Invalid resistant-cut requirement.',
  );
  // Predicate order has no meaning in an all-of definition.
  value.all = [clean, cut];
  return value;
}
export function validateMasteryDefinition(source) {
  try {
    resolveMasteryDefinition(source);
    return { valid: true, errors: [] };
  } catch (error) {
    return { valid: false, errors: [error.message] };
  }
}
export function masteryDefinitionIdentity(source) {
  return `mastery-v1-${dataIdentity(resolveMasteryDefinition(source))}`;
}

const IDENTITY_KEYS = [
  'ruleset',
  'levelId',
  'revision',
  'seed',
  'turnPolicy',
  'classId',
  'classRevision',
  'loadoutHash',
  'rosterHash',
];
const identityOf = (state) => Object.fromEntries(IDENTITY_KEYS.map((key) => [key, state[key]]));
function validateIdentity(value) {
  keys(value, IDENTITY_KEYS, 'Run identity');
  ensure(value.ruleset === 'xonix-core.v2', 'This observer supports only xonix-core.v2.');
  ensure(
    stableId(value.levelId) &&
      stableId(value.classId) &&
      text(value.revision, 80) &&
      text(value.classRevision, 80),
    'Invalid run identity.',
  );
  ensure(
    integer(value.seed, 0, 0xffffffff) && ['immediate', 'grid-center'].includes(value.turnPolicy),
    'Invalid run setup.',
  );
  ensure(
    /^loadout-v1-[0-9a-f]{8}$/.test(value.loadoutHash) &&
      /^roster-v1-[0-9a-f]{8}$/.test(value.rosterHash),
    'Invalid recipe identity.',
  );
}
function ownSetup(source) {
  const setup = copy(source);
  keys(
    setup,
    [
      'campaignId',
      'campaignKey',
      'runId',
      'levelIdentity',
      ...IDENTITY_KEYS,
      'initialLives',
      'signalZoneIds',
    ],
    'Mastery setup',
  );
  validateIdentity(identityOf(setup));
  ensure(
    stableId(setup.campaignId) && text(setup.campaignKey, 300) && text(setup.runId, 159),
    'Invalid campaign or run binding.',
  );
  ensure(/^level-v1-[0-9a-f]{16}$/.test(setup.levelIdentity), 'Invalid normalized-level identity.');
  ensure(integer(setup.initialLives, 1, 9), 'Invalid initial lives.');
  ensure(
    Array.isArray(setup.signalZoneIds) &&
      setup.signalZoneIds.every(stableId) &&
      new Set(setup.signalZoneIds).size === setup.signalZoneIds.length,
    'Invalid signal-zone references.',
  );
  return setup;
}

/** Call once on a new, validated core run; campaignKey remains host supplied. */
export function captureMasterySetup(state, { campaignId, campaignKey, runId, definition }) {
  if (isEquipmentDefinition(definition))
    return captureEquipmentSetup(state, { campaignId, campaignKey, runId, definition });
  if (definition !== undefined) resolveMasteryDefinition(definition);
  ensure(
    state.tick === 0 &&
      state.status === 'running' &&
      state.time === 0 &&
      state.width === 48 &&
      state.height === 36,
    'Mastery setup needs a fresh 48×36 core run.',
  );
  const level = normalizedLevel(state.level);
  return ownSetup({
    campaignId,
    campaignKey,
    runId,
    levelIdentity: `level-v1-${dataIdentity(level)}`,
    ...identityOf(state),
    initialLives: state.lives,
    signalZoneIds: level.signalZones.map((zone) => zone.id),
  });
}

const EVENTS = [
  'cut.started',
  'cut.closed',
  'player.failed',
  'shield.absorbed',
  'craft.redeployed',
  'run.completed',
];
const ABORTS = ['player.failed', 'shield.absorbed', 'craft.redeployed'];
const terminal = (status) => status === 'won' || status === 'lost';
const entryOf = (facts) => ({
  classId: facts.activeClass.id,
  classRevision: facts.activeClass.revision,
  loadoutHash: facts.activeClass.loadoutHash,
  tick: facts.classChangedAt,
});

/** Owned projection from trusted core state, never a raw replay/award parser. */
export function captureMasteryFacts(state, { runId, definition }) {
  if (isEquipmentDefinition(definition)) return captureEquipmentFacts(state, { runId, definition });
  if (definition !== undefined) resolveMasteryDefinition(definition);
  const active = state.classHistory.at(-1);
  return {
    runId,
    identity: identityOf(state),
    tick: state.tick,
    time: state.time,
    status: state.status,
    lives: state.lives,
    player: {
      x: state.player.x,
      y: state.player.y,
      cutting: state.player.cutting,
      cutStartedAt: state.cutStartedAt,
    },
    activeClass: {
      id: active.classId,
      revision: active.classRevision,
      loadoutHash: active.loadoutHash,
      resistant: !!state.classRecipe.signalResistance && !!state.signal.resistant,
    },
    classSequence: state.classHistory.length - 1,
    classChangedAt: active.tick,
    signalZoneIds: [...state.signal.zoneIds],
    events: state.events
      .filter((event) => EVENTS.includes(event.type))
      .map(({ type, tick, time }) => ({ type, tick, time })),
  };
}
function ownFacts(source) {
  const facts = copy(source);
  keys(
    facts,
    [
      'runId',
      'identity',
      'tick',
      'time',
      'status',
      'lives',
      'player',
      'activeClass',
      'classSequence',
      'classChangedAt',
      'signalZoneIds',
      'events',
    ],
    'Tick facts',
  );
  validateIdentity(facts.identity);
  ensure(
    text(facts.runId, 159) &&
      integer(facts.tick, 0, MAX_MASTERY_TICKS) &&
      finite(facts.time, 0, MAX_MASTERY_TICKS * FIXED_DT + EPS),
    'Invalid tick identity/time.',
  );
  ensure(
    ['running', 'respawning', 'won', 'lost'].includes(facts.status) && integer(facts.lives, 0, 9),
    'Invalid run status/lives.',
  );
  keys(facts.player, ['x', 'y', 'cutting', 'cutStartedAt'], 'Player facts');
  ensure(
    finite(facts.player.x, 0, 48 - Number.EPSILON * 48) &&
      finite(facts.player.y, 0, 36 - Number.EPSILON * 36) &&
      typeof facts.player.cutting === 'boolean',
    'Invalid player endpoint.',
  );
  ensure(
    facts.player.cutting
      ? finite(facts.player.cutStartedAt, 0, facts.time + EPS)
      : facts.player.cutStartedAt === null,
    'Invalid live-cut identity.',
  );
  keys(facts.activeClass, ['id', 'revision', 'loadoutHash', 'resistant'], 'Active class facts');
  ensure(
    stableId(facts.activeClass.id) &&
      text(facts.activeClass.revision, 80) &&
      /^loadout-v1-[0-9a-f]{8}$/.test(facts.activeClass.loadoutHash) &&
      typeof facts.activeClass.resistant === 'boolean',
    'Invalid active class.',
  );
  ensure(
    integer(facts.classSequence, 0, MAX_CLASS_HISTORY - 1) &&
      integer(facts.classChangedAt, 0, facts.tick),
    'Invalid class route position.',
  );
  ensure(
    Array.isArray(facts.signalZoneIds) &&
      facts.signalZoneIds.every(stableId) &&
      new Set(facts.signalZoneIds).size === facts.signalZoneIds.length,
    'Invalid active signal-zone facts.',
  );
  ensure(Array.isArray(facts.events) && facts.events.length <= 16, 'Too many tick events.');
  for (const event of facts.events) {
    keys(event, ['type', 'tick', 'time'], 'Tick event');
    ensure(
      EVENTS.includes(event.type) &&
        event.tick === facts.tick &&
        finite(event.time, 0, facts.time + EPS),
      'Invalid mastery event.',
    );
  }
  ensure(
    new Set(facts.events.map((event) => event.type)).size === facts.events.length,
    'Repeated mastery event within one tick.',
  );
  return facts;
}

/** Preview only. A future trusted verifier must replay the entire run before any award. */
export function createMasteryObserver({ definition, setup: sourceSetup, initial }) {
  const rule = resolveMasteryDefinition(definition);
  if (isEquipmentDefinition(rule))
    return createEquipmentObserver({ definition: rule, setup: sourceSetup, initial });
  const setup = ownSetup(sourceSetup);
  const definitionIdentity = masteryDefinitionIdentity(rule),
    identity = identityOf(setup);
  const requirement = rule.all[1];
  ensure(
    rule.campaignId === setup.campaignId &&
      rule.levelId === setup.levelId &&
      setup.signalZoneIds.includes(requirement.zoneId),
    'Mastery definition does not reference this campaign/map/signal zone.',
  );
  let last = ownFacts(initial);
  const assertBinding = (facts) => {
    ensure(
      facts.runId === setup.runId && canonicalJSON(facts.identity) === canonicalJSON(identity),
      'Mastery facts belong to a different run/setup.',
    );
    ensure(
      facts.signalZoneIds.every((id) => setup.signalZoneIds.includes(id)),
      'Unknown signal-zone fact.',
    );
  };
  assertBinding(last);
  ensure(
    last.tick === 0 &&
      last.time === 0 &&
      last.status === 'running' &&
      last.lives === setup.initialLives &&
      !last.player.cutting &&
      last.events.length === 0,
    'Mastery must observe a fresh run from tick zero.',
  );
  ensure(
    last.classSequence === 0 &&
      last.classChangedAt === 0 &&
      last.activeClass.id === setup.classId &&
      last.activeClass.revision === setup.classRevision &&
      last.activeClass.loadoutHash === setup.loadoutHash,
    'Initial class does not match the retained setup.',
  );
  const classHistory = [entryOf(last)];
  let pending = new Set(),
    bestClosedCutCells = 0,
    closedCuts = 0,
    clean = true;
  const snapshot = () => ({
    version: 'xonix-mastery-preview.v1',
    authority: 'preview-only',
    definitionId: rule.id,
    definitionRevision: rule.revision,
    definitionIdentity,
    setup: structuredClone(setup),
    classHistory: structuredClone(classHistory),
    tick: last.tick,
    status: last.status,
    complete: terminal(last.status),
    qualified: last.status === 'won' && clean && bestClosedCutCells >= requirement.minCells,
    cleanSoFar: clean,
    pendingCutCells: pending.size,
    bestClosedCutCells,
    closedCuts,
    predicates: [
      { type: 'clean-win', satisfied: last.status === 'won' && clean },
      {
        type: 'resistant-cut-cells',
        zoneId: requirement.zoneId,
        minCells: requirement.minCells,
        cells: bestClosedCutCells,
        satisfied: bestClosedCutCells >= requirement.minCells,
      },
    ],
  });
  function observe(source) {
    const facts = ownFacts(source);
    assertBinding(facts);
    ensure(!terminal(last.status), 'Mastery cannot observe input after a terminal result.');
    ensure(
      facts.tick === last.tick + 1 &&
        facts.time + EPS >= last.time &&
        facts.time <= last.time + FIXED_DT + EPS,
      'Observe exactly one consecutive fixed tick.',
    );
    ensure(facts.lives <= last.lives, 'Core-v2 cannot restore lost lives.');
    ensure(
      facts.classSequence === last.classSequence || facts.classSequence === last.classSequence + 1,
      'Class history is not contiguous.',
    );
    const switched = facts.classSequence !== last.classSequence;
    ensure(
      switched
        ? facts.classChangedAt === facts.tick &&
            facts.activeClass.id !== last.activeClass.id &&
            !last.player.cutting
        : canonicalJSON(entryOf(facts)) === canonicalJSON(entryOf(last)) &&
            facts.activeClass.resistant === last.activeClass.resistant,
      'Inconsistent active class history.',
    );
    ensure(
      facts.events.every((event) => event.time + EPS >= last.time),
      'Event precedes this fixed tick.',
    );
    const has = (type) => facts.events.some((event) => event.type === type);
    const closed = has('cut.closed');
    ensure(
      has('run.completed') === terminal(facts.status),
      'Terminal status and completion event disagree.',
    );
    ensure(
      facts.lives < last.lives === has('player.failed') &&
        (!has('player.failed') || facts.lives === last.lives - 1),
      'Life loss and failure event disagree.',
    );
    ensure(
      facts.status !== 'won' || (closed && facts.lives > 0),
      'A winning run needs a successful closure.',
    );
    ensure(
      facts.status !== 'respawning' || !facts.player.cutting,
      'A recovering craft cannot retain a live cut.',
    );
    let liveCut = last.player.cutting,
      cutStart = last.player.cutStartedAt,
      eventTime = last.time;
    for (const event of facts.events) {
      ensure(event.time + EPS >= eventTime, 'Mastery events must retain their core order.');
      eventTime = event.time;
      if (event.type === 'cut.started') {
        ensure(!liveCut, 'A live cut cannot start twice.');
        liveCut = true;
        cutStart = event.time;
      } else if (event.type === 'cut.closed') {
        ensure(liveCut, 'A closed cut needs a live trail.');
        liveCut = false;
        cutStart = null;
      } else if (ABORTS.includes(event.type)) {
        liveCut = false;
        cutStart = null;
      }
    }
    ensure(
      facts.player.cutting === liveCut && facts.player.cutStartedAt === cutStart,
      'Live-cut continuity is missing.',
    );
    // All rejecting checks above precede mutations, so a bad sample is atomic.
    if (switched) classHistory.push(entryOf(facts));
    clean &&= facts.lives === setup.initialLives && !has('player.failed');
    for (const event of facts.events) {
      if (event.type === 'cut.started') pending = new Set();
      else if (event.type === 'cut.closed') {
        bestClosedCutCells = Math.max(bestClosedCutCells, pending.size);
        closedCuts++;
        pending.clear();
      } else if (ABORTS.includes(event.type)) pending.clear();
    }
    if (
      facts.status === 'running' &&
      facts.player.cutting &&
      facts.activeClass.resistant &&
      facts.signalZoneIds.includes(requirement.zoneId)
    )
      pending.add(Math.floor(facts.player.y) * 48 + Math.floor(facts.player.x));
    if (terminal(facts.status)) {
      pending.clear();
    }
    last = facts;
  }
  return Object.freeze({ observe, snapshot });
}
