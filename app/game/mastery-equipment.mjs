import { boundedJSON, canonicalJSON, dataIdentity, plainObject, stableId } from './data-json.mjs';
import { FIXED_DT, MAX_CLASS_HISTORY, ABILITY_PRIMITIVES, loadoutHash } from './core/registry.mjs';
import { normalizedLevel } from './core/level.mjs';
import { EPS as SIGNAL_EPS } from './core/geometry.mjs';

export const EQUIPMENT_MASTERY_DEFINITION_VERSION = 'xonix-mastery-definition.v2';
const MAX_TICKS = 216000,
  EPS = 1e-8;
const SETUP_VERSION = 'xonix-mastery-setup.v2',
  FACT_VERSION = 'xonix-mastery-facts.v2';
const freeze = (value) => {
  for (const child of Object.values(value)) if (child && typeof child === 'object') freeze(child);
  return Object.freeze(value);
};
export const SUPPLY_LINE = freeze({
  version: EQUIPMENT_MASTERY_DEFINITION_VERSION,
  id: 'supply-line',
  revision: '1',
  campaignId: 'homeward-skies',
  levelId: 'homeward-02',
  name: 'Supply Line',
  description:
    'Refill at both supply pads, close a cut through two suppressed cells in each emitter region, switch to Heavy carrier at the southern hangar, then win.',
  all: [
    { type: 'supply-pickups', padIds: ['west-supply', 'south-supply'] },
    {
      type: 'suppressed-region-crossings',
      regions: [
        { zoneId: 'west-emitter', minCells: 2 },
        { zoneId: 'south-emitter', minCells: 2 },
      ],
    },
    { type: 'hangar-switch', hangarId: 'south-hangar', classId: 'carrier' },
  ],
});
export const SAFE_RETURN = freeze({
  version: EQUIPMENT_MASTERY_DEFINITION_VERSION,
  id: 'safe-return',
  revision: '1',
  campaignId: 'homeward-skies',
  levelId: 'homeward-03',
  name: 'Safe Return',
  description:
    'Use an impact pulse from a live cut of at least three cells to stun the cable-cutter, return home, then win without losing a life.',
  all: [
    { type: 'clean-win' },
    { type: 'live-cut-impact', actorId: 'cable-cutter', minTrailCells: 3 },
  ],
});
const ensure = (condition, message) => {
  if (!condition) throw new TypeError(message);
};
const keys = (value, allowed, label) => {
  ensure(
    plainObject(value) &&
      Object.keys(value).length === allowed.length &&
      allowed.every((key) => Object.hasOwn(value, key)),
    `${label} has missing or unsupported fields.`,
  );
};
const text = (value, max) =>
  typeof value === 'string' && value.trim().length > 0 && value.length <= max;
const integer = (value, min, max) => Number.isInteger(value) && value >= min && value <= max;
const finite = (value, min, max) => Number.isFinite(value) && value >= min && value <= max;
const time = (value) => finite(value, 0, MAX_TICKS * FIXED_DT + 60);
const same = (a, b) => canonicalJSON(a) === canonicalJSON(b);
const terminal = (status) => status === 'won' || status === 'lost';
const own = (value, { maxBytes = 8192, maxNodes = 256, maxDepth = 5, maxArray = 16 } = {}) => {
  ensure(plainObject(value), 'Equipment mastery data must be a plain object.');
  return boundedJSON(value, { maxBytes, maxNodes, maxDepth, maxArray, maxString: 512 });
};
const ids = (value, max, label, min = 0) => {
  ensure(
    Array.isArray(value) &&
      value.length >= min &&
      value.length <= max &&
      value.every(stableId) &&
      new Set(value).size === value.length,
    `Invalid ${label}.`,
  );
};
export function isEquipmentDefinition(value) {
  return (
    value !== null &&
    typeof value === 'object' &&
    Object.getOwnPropertyDescriptor(value, 'version')?.value ===
      EQUIPMENT_MASTERY_DEFINITION_VERSION
  );
}
export function resolveEquipmentDefinition(source) {
  const value = own(source, { maxArray: 4 });
  keys(
    value,
    ['version', 'id', 'revision', 'campaignId', 'levelId', 'name', 'description', 'all'],
    'Definition',
  );
  ensure(
    value.version === EQUIPMENT_MASTERY_DEFINITION_VERSION,
    'Unsupported equipment definition version.',
  );
  for (const key of ['id', 'campaignId', 'levelId'])
    ensure(stableId(value[key]), `Invalid definition ${key}.`);
  ensure(
    text(value.revision, 80) && text(value.name, 80) && text(value.description, 512),
    'Invalid mastery text.',
  );
  ensure(Array.isArray(value.all), 'Definition predicates must be an array.');
  if (value.all.length === 3) {
    const pickups = value.all.find((item) => item?.type === 'supply-pickups');
    const crossings = value.all.find((item) => item?.type === 'suppressed-region-crossings');
    const switched = value.all.find((item) => item?.type === 'hangar-switch');
    keys(pickups, ['type', 'padIds'], 'Supply predicate');
    ids(pickups.padIds, 4, 'supply references', 1);
    keys(crossings, ['type', 'regions'], 'Crossing predicate');
    ensure(
      Array.isArray(crossings.regions) &&
        crossings.regions.length >= 1 &&
        crossings.regions.length <= 4,
      'Invalid crossing regions.',
    );
    for (const region of crossings.regions) {
      keys(region, ['zoneId', 'minCells'], 'Crossing region');
      ensure(
        stableId(region.zoneId) && integer(region.minCells, 1, 1564),
        'Invalid crossing requirement.',
      );
    }
    ids(
      crossings.regions.map((region) => region.zoneId),
      4,
      'crossing references',
      1,
    );
    keys(switched, ['type', 'hangarId', 'classId'], 'Switch predicate');
    ensure(stableId(switched.hangarId) && stableId(switched.classId), 'Invalid switch references.');
    pickups.padIds.sort();
    crossings.regions.sort((a, b) => (a.zoneId < b.zoneId ? -1 : a.zoneId > b.zoneId ? 1 : 0));
    value.all = [pickups, crossings, switched];
  } else {
    ensure(value.all.length === 2, 'Unsupported equipment predicate composition.');
    const clean = value.all.find((item) => item?.type === 'clean-win');
    const impact = value.all.find((item) => item?.type === 'live-cut-impact');
    keys(clean, ['type'], 'Clean-win predicate');
    keys(impact, ['type', 'actorId', 'minTrailCells'], 'Impact predicate');
    ensure(
      stableId(impact.actorId) && integer(impact.minTrailCells, 1, 1564),
      'Invalid impact requirement.',
    );
    value.all = [clean, impact];
  }
  return value;
}
const definitionIdentity = (definition) => `mastery-v1-${dataIdentity(definition)}`;
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
const identityOf = (value) => Object.fromEntries(IDENTITY_KEYS.map((key) => [key, value[key]]));
function identityValid(value) {
  keys(value, IDENTITY_KEYS, 'Run identity');
  ensure(
    value.ruleset === 'xonix-core.v2' &&
      stableId(value.levelId) &&
      stableId(value.classId) &&
      text(value.revision, 80) &&
      text(value.classRevision, 80) &&
      integer(value.seed, 0, 0xffffffff) &&
      ['immediate', 'grid-center'].includes(value.turnPolicy) &&
      /^loadout-v1-[0-9a-f]{8}$/.test(value.loadoutHash) &&
      /^roster-v1-[0-9a-f]{8}$/.test(value.rosterHash),
    'Invalid equipment run identity.',
  );
}
const classFacts = (recipe) => ({
  id: recipe.id,
  revision: recipe.revision,
  loadoutHash: loadoutHash(recipe),
  primitive: recipe.primitive,
  radius: recipe.radius,
  duration: recipe.duration,
  capacity: recipe.capacity,
  resistant: !!recipe.signalResistance,
});
function classValid(value) {
  keys(
    value,
    ['id', 'revision', 'loadoutHash', 'primitive', 'radius', 'duration', 'capacity', 'resistant'],
    'Class facts',
  );
  const field = ['stun-field', 'slow-field'].includes(value.primitive);
  ensure(
    stableId(value.id) &&
      text(value.revision, 80) &&
      /^loadout-v1-[0-9a-f]{8}$/.test(value.loadoutHash) &&
      ABILITY_PRIMITIVES.includes(value.primitive) &&
      finite(value.duration, 0.1, 20) &&
      (value.primitive === 'shield' ? value.radius === 0 : finite(value.radius, 0.25, 60)) &&
      (field ? integer(value.capacity, 1, 8) : value.capacity === 0) &&
      typeof value.resistant === 'boolean',
    'Invalid class facts.',
  );
}
function ownSetup(source, rule) {
  const setup = own(source, { maxBytes: 32768, maxNodes: 2048, maxArray: 40 });
  keys(
    setup,
    [
      'version',
      'definitionIdentity',
      'campaignId',
      'campaignKey',
      'runId',
      'levelIdentity',
      ...IDENTITY_KEYS,
      'initialLives',
      'references',
    ],
    'Equipment setup',
  );
  identityValid(identityOf(setup));
  ensure(
    setup.version === SETUP_VERSION &&
      setup.definitionIdentity === definitionIdentity(rule) &&
      setup.campaignId === rule.campaignId &&
      setup.levelId === rule.levelId &&
      text(setup.campaignKey, 300) &&
      text(setup.runId, 159) &&
      /^level-v1-[0-9a-f]{16}$/.test(setup.levelIdentity) &&
      integer(setup.initialLives, 1, 9),
    'Invalid equipment setup binding.',
  );
  const refs = setup.references;
  keys(refs, ['padIds', 'hangarIds', 'regions', 'classes', 'actor'], 'Equipment references');
  ids(refs.padIds, 20, 'supply references');
  ids(refs.hangarIds, 12, 'hangar references');
  ensure(
    Array.isArray(refs.classes) && refs.classes.length >= 1 && refs.classes.length <= 40,
    'Invalid equipment roster.',
  );
  for (const recipe of refs.classes) classValid(recipe);
  ids(
    refs.classes.map((recipe) => recipe.id),
    40,
    'class references',
    1,
  );
  const first = refs.classes.find((recipe) => recipe.id === setup.classId);
  ensure(
    first && first.revision === setup.classRevision && first.loadoutHash === setup.loadoutHash,
    'Initial recipe differs from setup.',
  );
  ensure(Array.isArray(refs.regions) && refs.regions.length <= 4, 'Invalid selected regions.');
  for (const region of refs.regions) {
    keys(region, ['id', 'x', 'y', 'w', 'h'], 'Region reference');
    ensure(
      stableId(region.id) &&
        finite(region.x, 1, 46) &&
        finite(region.y, 1, 34) &&
        finite(region.w, 0.5, 46) &&
        finite(region.h, 0.5, 34) &&
        region.x + region.w <= 47 &&
        region.y + region.h <= 35,
      'Invalid region geometry.',
    );
  }
  ids(
    refs.regions.map((region) => region.id),
    4,
    'region identities',
  );
  if (rule.all.length === 3) {
    ensure(
      rule.all[0].padIds.every((id) => refs.padIds.includes(id)) &&
        same(
          rule.all[1].regions.map((region) => region.zoneId),
          refs.regions.map((region) => region.id),
        ) &&
        refs.hangarIds.includes(rule.all[2].hangarId) &&
        refs.classes.some((recipe) => recipe.id === rule.all[2].classId) &&
        refs.actor === null,
      'Missing supply, region, hangar or class reference.',
    );
  } else {
    const actor = refs.actor;
    keys(actor, ['id', 'type', 'radius'], 'Actor reference');
    ensure(
      refs.regions.length === 0 &&
        actor.id === rule.all[1].actorId &&
        ['bouncer', 'lane-boss'].includes(actor.type) &&
        finite(actor.radius, 0.05, 0.45),
      'Invalid impact actor reference.',
    );
  }
  return setup;
}
export function captureEquipmentSetup(state, { campaignId, campaignKey, runId, definition }) {
  const rule = resolveEquipmentDefinition(definition);
  ensure(
    state.tick === 0 &&
      state.time === 0 &&
      state.status === 'running' &&
      state.width === 48 &&
      state.height === 36,
    'Equipment setup needs a fresh 48×36 core run.',
  );
  const level = normalizedLevel(state.level),
    supply = rule.all.length === 3;
  const actor = supply ? null : state.enemies.find((entry) => entry.id === rule.all[1].actorId);
  const regions = supply
    ? rule.all[1].regions.map(({ zoneId }) => {
        const zone = level.signalZones.find((entry) => entry.id === zoneId);
        ensure(zone, 'Missing signal-zone reference.');
        return { id: zone.id, x: zone.x, y: zone.y, w: zone.w, h: zone.h };
      })
    : [];
  ensure(supply || actor, 'Missing impact actor reference.');
  return ownSetup(
    {
      version: SETUP_VERSION,
      definitionIdentity: definitionIdentity(rule),
      campaignId,
      campaignKey,
      runId,
      levelIdentity: `level-v1-${dataIdentity(level)}`,
      ...identityOf(state),
      initialLives: state.lives,
      references: {
        padIds: level.supplies.map((entry) => entry.id),
        hangarIds: level.hangars.map((entry) => entry.id),
        regions,
        classes: state.classRecipes.map(classFacts),
        actor: actor ? { id: actor.id, type: actor.type, radius: actor.radius } : null,
      },
    },
    rule,
  );
}
const PAYLOADS = Object.freeze({
  'cut.started': [],
  'cut.closed': [],
  'player.failed': [],
  'shield.absorbed': [],
  'run.completed': [],
  'player.respawned': [],
  'pickup.collected': ['id', 'ammo'],
  'class.switched': ['classId', 'hangarId'],
  'ability.used': ['primitive', 'ammo'],
  'craft.redeployed': ['x', 'y', 'radius'],
});
const ABORTS = ['player.failed', 'shield.absorbed', 'craft.redeployed'];
const pick = (object, names) => Object.fromEntries(names.map((key) => [key, object[key]]));
export function captureEquipmentFacts(state, { runId, definition }) {
  const rule = resolveEquipmentDefinition(definition),
    supply = rule.all.length === 3;
  const events = state.events
    .filter((event) => Object.hasOwn(PAYLOADS, event.type))
    .map((event) => pick(event, ['type', 'tick', 'time', ...PAYLOADS[event.type]]));
  const used = events.some(
    (event) => event.type === 'ability.used' && event.primitive === 'impact-pulse',
  );
  const field = used ? state.ability.fields.at(-1) : null;
  const actor = supply ? null : state.enemies.find((entry) => entry.id === rule.all[1].actorId);
  ensure(supply || actor, 'Missing selected impact actor.');
  return {
    version: FACT_VERSION,
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
      trailCellCount: state.trail.length,
    },
    activeClass: classFacts(state.classRecipe),
    classSequence: state.classHistory.length - 1,
    classChangedAt: state.classHistory.at(-1).tick,
    regions: supply
      ? rule.all[1].regions.map(({ zoneId }) => {
          const zone = state.signalZones.find((entry) => entry.id === zoneId);
          ensure(zone, 'Missing selected signal zone.');
          return { id: zone.id, suppressedUntil: zone.suppressedUntil };
        })
      : [],
    actor: actor ? pick(actor, ['id', 'type', 'x', 'y', 'radius', 'stunnedUntil']) : null,
    impactField: field ? pick(field, ['id', 'kind', 'x', 'y', 'radius', 'until']) : null,
    events,
  };
}
function ownFacts(source, setup) {
  const facts = own(source, { maxNodes: 512 });
  keys(
    facts,
    [
      'version',
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
      'regions',
      'actor',
      'impactField',
      'events',
    ],
    'Equipment facts',
  );
  identityValid(facts.identity);
  ensure(
    facts.version === FACT_VERSION &&
      facts.runId === setup.runId &&
      same(facts.identity, identityOf(setup)) &&
      integer(facts.tick, 0, MAX_TICKS) &&
      finite(facts.time, 0, MAX_TICKS * FIXED_DT + EPS) &&
      ['running', 'respawning', 'won', 'lost'].includes(facts.status) &&
      integer(facts.lives, 0, 9),
    'Invalid equipment tick binding.',
  );
  const player = facts.player;
  keys(player, ['x', 'y', 'cutting', 'cutStartedAt', 'trailCellCount'], 'Equipment player');
  ensure(
    finite(player.x, 0, 48 - Number.EPSILON * 48) &&
      finite(player.y, 0, 36 - Number.EPSILON * 36) &&
      typeof player.cutting === 'boolean' &&
      integer(player.trailCellCount, 0, 1564) &&
      (player.cutting
        ? player.trailCellCount > 0 && finite(player.cutStartedAt, 0, facts.time + EPS)
        : player.cutStartedAt === null && player.trailCellCount === 0),
    'Invalid equipment live cut.',
  );
  classValid(facts.activeClass);
  ensure(
    setup.references.classes.some((recipe) => same(recipe, facts.activeClass)) &&
      integer(facts.classSequence, 0, MAX_CLASS_HISTORY - 1) &&
      integer(facts.classChangedAt, 0, facts.tick),
    'Invalid bound equipment class.',
  );
  ensure(
    Array.isArray(facts.regions) && facts.regions.length === setup.references.regions.length,
    'Missing selected region facts.',
  );
  for (let i = 0; i < facts.regions.length; i++) {
    const region = facts.regions[i];
    keys(region, ['id', 'suppressedUntil'], 'Region facts');
    ensure(
      region.id === setup.references.regions[i].id && time(region.suppressedUntil),
      'Invalid region suppression.',
    );
  }
  if (setup.references.actor) {
    const actor = facts.actor,
      expected = setup.references.actor;
    keys(actor, ['id', 'type', 'x', 'y', 'radius', 'stunnedUntil'], 'Actor facts');
    ensure(
      actor.id === expected.id &&
        actor.type === expected.type &&
        actor.radius === expected.radius &&
        finite(actor.x, 0, 48) &&
        finite(actor.y, 0, 36) &&
        time(actor.stunnedUntil),
      'Invalid selected actor facts.',
    );
  } else ensure(facts.actor === null, 'Unexpected actor facts.');
  if (facts.impactField !== null) {
    const field = facts.impactField;
    keys(field, ['id', 'kind', 'x', 'y', 'radius', 'until'], 'Impact field');
    ensure(
      stableId(field.id) &&
        field.kind === 'impact-pulse' &&
        finite(field.x, 0, 48) &&
        finite(field.y, 0, 36) &&
        finite(field.radius, 0.25, 60) &&
        time(field.until),
      'Invalid impact field.',
    );
  }
  ensure(Array.isArray(facts.events) && facts.events.length <= 16, 'Invalid equipment event list.');
  for (const event of facts.events) {
    ensure(
      plainObject(event) && Object.hasOwn(PAYLOADS, event.type),
      'Unsupported equipment event.',
    );
    keys(event, ['type', 'tick', 'time', ...PAYLOADS[event.type]], 'Equipment event');
    ensure(
      event.tick === facts.tick && finite(event.time, 0, facts.time + EPS),
      'Invalid equipment event time.',
    );
    if (event.type === 'pickup.collected')
      ensure(
        setup.references.padIds.includes(event.id) &&
          event.ammo === facts.activeClass.capacity &&
          event.ammo > 0,
        'Invalid successful pickup.',
      );
    if (event.type === 'class.switched')
      ensure(
        event.classId === facts.activeClass.id &&
          setup.references.hangarIds.includes(event.hangarId),
        'Invalid successful class switch.',
      );
    if (event.type === 'ability.used')
      ensure(
        event.primitive === facts.activeClass.primitive &&
          integer(event.ammo, 0, facts.activeClass.capacity),
        'Invalid successful ability use.',
      );
    if (event.type === 'craft.redeployed')
      ensure(
        finite(event.x, 0, 48) && finite(event.y, 0, 36) && finite(event.radius, 0.25, 60),
        'Invalid redeployment geometry.',
      );
  }
  ensure(
    new Set(facts.events.map((event) => event.type)).size === facts.events.length,
    'Repeated equipment event within a tick.',
  );
  return facts;
}
const entryOf = (facts) => ({
  classId: facts.activeClass.id,
  classRevision: facts.activeClass.revision,
  loadoutHash: facts.activeClass.loadoutHash,
  tick: facts.classChangedAt,
});

/** Pure preview only; a caller's facts never authorize a stored award. */
export function createEquipmentObserver({ definition, setup: sourceSetup, initial }) {
  const rule = resolveEquipmentDefinition(definition),
    setup = ownSetup(sourceSetup, rule),
    supply = rule.all.length === 3;
  let last = ownFacts(initial, setup);
  ensure(
    last.tick === 0 &&
      last.time === 0 &&
      last.status === 'running' &&
      last.lives === setup.initialLives &&
      !last.player.cutting &&
      last.events.length === 0 &&
      last.impactField === null &&
      last.classSequence === 0 &&
      last.classChangedAt === 0 &&
      last.activeClass.id === setup.classId &&
      last.activeClass.revision === setup.classRevision &&
      last.activeClass.loadoutHash === setup.loadoutHash,
    'Equipment mastery must start with its fresh run.',
  );
  const classHistory = [entryOf(last)],
    collected = new Set();
  const regions = setup.references.regions.map((region) => ({
    ...region,
    pending: new Set(),
    best: 0,
  }));
  let clean = true,
    switched = false,
    impactPhase = 'not-started',
    pendingImpact = null,
    lastImpactId = null;
  function predicateProgress() {
    if (supply) {
      const visits = regions.map((region, i) => ({
        zoneId: region.id,
        minCells: rule.all[1].regions[i].minCells,
        pendingCells: region.pending.size,
        bestClosedCells: region.best,
        satisfied: region.best >= rule.all[1].regions[i].minCells,
      }));
      return [
        {
          ...structuredClone(rule.all[0]),
          collectedPadIds: [...collected].sort(),
          satisfied: rule.all[0].padIds.every((id) => collected.has(id)),
        },
        {
          type: 'suppressed-region-crossings',
          regions: visits,
          satisfied: visits.every((region) => region.satisfied),
        },
        { ...structuredClone(rule.all[2]), satisfied: switched },
      ];
    }
    return [
      { type: 'clean-win', satisfied: terminal(last.status) && last.status === 'won' && clean },
      {
        ...structuredClone(rule.all[1]),
        phase: impactPhase,
        satisfied: impactPhase === 'returned',
      },
    ];
  }
  const snapshot = () => {
    const predicates = predicateProgress();
    return {
      version: 'xonix-mastery-preview.v2',
      authority: 'preview-only',
      definitionId: rule.id,
      definitionRevision: rule.revision,
      definitionIdentity: definitionIdentity(rule),
      setup: structuredClone(setup),
      classHistory: structuredClone(classHistory),
      tick: last.tick,
      status: last.status,
      complete: terminal(last.status),
      qualified: last.status === 'won' && predicates.every((predicate) => predicate.satisfied),
      cleanSoFar: clean,
      predicates,
    };
  };
  function observe(source) {
    const facts = ownFacts(source, setup),
      has = (type) => facts.events.some((event) => event.type === type);
    ensure(
      !terminal(last.status) &&
        facts.tick === last.tick + 1 &&
        facts.time + EPS >= last.time &&
        facts.time <= last.time + FIXED_DT + EPS,
      'Observe one consecutive nonterminal equipment tick.',
    );
    ensure(
      facts.lives <= last.lives &&
        facts.lives < last.lives === has('player.failed') &&
        (!has('player.failed') || facts.lives === last.lives - 1),
      'Life loss and equipment failure disagree.',
    );
    const classChanged = facts.classSequence !== last.classSequence;
    ensure(
      facts.classSequence === last.classSequence || facts.classSequence === last.classSequence + 1,
      'Class history is not contiguous.',
    );
    ensure(
      classChanged === has('class.switched') &&
        (classChanged
          ? facts.classChangedAt === facts.tick &&
            facts.activeClass.id !== last.activeClass.id &&
            last.status === 'running' &&
            !last.player.cutting
          : same(entryOf(facts), entryOf(last)) && same(facts.activeClass, last.activeClass)),
      'Inconsistent equipment class history.',
    );
    ensure(
      has('run.completed') === terminal(facts.status) &&
        (facts.status !== 'won' || (has('cut.closed') && facts.lives > 0)) &&
        (facts.status !== 'respawning' || !facts.player.cutting),
      'Inconsistent terminal or recovery state.',
    );
    ensure(
      !has('player.respawned') ||
        (last.status === 'respawning' &&
          facts.status === 'running' &&
          facts.lives === last.lives &&
          !facts.player.cutting),
      'Invalid completed recovery.',
    );
    ensure(
      (last.status === 'respawning' && facts.status === 'running') === has('player.respawned') &&
        (facts.status !== 'respawning' || last.status === 'respawning' || ABORTS.some(has)) &&
        (!ABORTS.some(has) || last.status === 'running') &&
        facts.events.filter((event) => ABORTS.includes(event.type)).length <= 1,
      'Recovery transition is missing its matching event.',
    );
    let liveCut = last.player.cutting,
      cutStart = last.player.cutStartedAt,
      eventTime = last.time;
    for (const event of facts.events) {
      ensure(event.time + EPS >= eventTime, 'Equipment events must retain core order.');
      eventTime = event.time;
      if (event.type === 'cut.started') {
        ensure(!liveCut, 'A live cut cannot start twice.');
        liveCut = true;
        cutStart = event.time;
      } else if (event.type === 'cut.closed') {
        ensure(liveCut, 'A closure needs a live cut.');
        liveCut = false;
        cutStart = null;
      } else if (ABORTS.includes(event.type)) {
        liveCut = false;
        cutStart = null;
      }
    }
    ensure(
      facts.player.cutting === liveCut && facts.player.cutStartedAt === cutStart,
      'Equipment live-cut continuity is missing.',
    );
    const ability = facts.events.find((event) => event.type === 'ability.used');
    const redeploy = facts.events.find((event) => event.type === 'craft.redeployed');
    const pulse = ability?.primitive === 'impact-pulse',
      field = facts.impactField;
    ensure(
      pulse === !!redeploy && pulse === (field !== null),
      'Impact use, field and redeployment disagree.',
    );
    if (pulse)
      ensure(
        last.status === 'running' &&
          facts.events.indexOf(redeploy) < facts.events.indexOf(ability) &&
          Math.abs(redeploy.time - last.time) <= EPS &&
          Math.abs(ability.time - last.time) <= EPS &&
          field.id !== lastImpactId &&
          field.x === last.player.x &&
          field.y === last.player.y &&
          redeploy.x === field.x &&
          redeploy.y === field.y &&
          redeploy.radius === field.radius &&
          field.radius === facts.activeClass.radius &&
          Math.abs(field.until - (last.time + facts.activeClass.duration)) <= EPS &&
          ['respawning', 'lost'].includes(facts.status) &&
          facts.lives === last.lives,
        'Impact does not match its new field/recovery.',
      );
    // Rejecting checks precede mutations. Previous owned facts preserve the live cut erased by impact.
    if (classChanged) classHistory.push(entryOf(facts));
    clean &&= facts.lives === setup.initialLives && !has('player.failed');
    if (supply) {
      for (const event of facts.events) {
        if (event.type === 'pickup.collected' && rule.all[0].padIds.includes(event.id))
          collected.add(event.id);
        if (
          event.type === 'class.switched' &&
          event.classId === rule.all[2].classId &&
          event.hangarId === rule.all[2].hangarId
        )
          switched = true;
        for (const region of regions) {
          if (event.type === 'cut.closed') region.best = Math.max(region.best, region.pending.size);
          if (['cut.started', 'cut.closed', ...ABORTS].includes(event.type)) region.pending.clear();
        }
      }
      if (facts.status === 'running' && facts.player.cutting)
        for (let i = 0; i < regions.length; i++) {
          const region = regions[i],
            player = facts.player;
          if (
            facts.regions[i].suppressedUntil > facts.time + SIGNAL_EPS &&
            player.x >= region.x &&
            player.x < region.x + region.w &&
            player.y >= region.y &&
            player.y < region.y + region.h
          )
            region.pending.add(Math.floor(player.y) * 48 + Math.floor(player.x));
        }
    } else {
      if (has('player.failed') || has('shield.absorbed') || (redeploy && pendingImpact)) {
        pendingImpact = null;
        if (impactPhase === 'awaiting-return') impactPhase = 'not-started';
      }
      if (pulse && impactPhase !== 'returned') {
        const actor = last.actor,
          affected =
            Math.hypot(actor.x - field.x, actor.y - field.y) <= field.radius + actor.radius &&
            facts.actor.stunnedUntil + EPS >= field.until &&
            facts.actor.stunnedUntil > facts.time + SIGNAL_EPS;
        if (
          last.player.cutting &&
          last.player.trailCellCount >= rule.all[1].minTrailCells &&
          affected
        ) {
          pendingImpact = { fieldId: field.id, tick: facts.tick, lives: facts.lives };
          impactPhase = 'awaiting-return';
        }
      }
      if (
        pendingImpact &&
        has('player.respawned') &&
        facts.tick > pendingImpact.tick &&
        facts.lives === pendingImpact.lives
      ) {
        impactPhase = 'returned';
        pendingImpact = null;
      }
    }
    if (pulse) lastImpactId = field.id;
    if (terminal(facts.status)) {
      for (const region of regions) region.pending.clear();
      pendingImpact = null;
      if (impactPhase === 'awaiting-return') impactPhase = 'not-started';
    }
    last = facts;
  }
  return Object.freeze({ observe, snapshot });
}
