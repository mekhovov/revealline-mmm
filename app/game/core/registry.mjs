export const RULESET = 'xonix-core.v2';
export const FIXED_DT = 1 / 120;
export const MAX_CLASS_HISTORY = 4096;
export const TURN_POLICIES = Object.freeze(['immediate', 'grid-center']);
export const CELL = Object.freeze({ FIELD: 0, SAFE: 1, WALL: 2 });
export const DIRECTIONS = Object.freeze({
  up: { x: 0, y: -1 },
  right: { x: 1, y: 0 },
  down: { x: 0, y: 1 },
  left: { x: -1, y: 0 },
});

/** Cosmetic IDs are deliberately absent. Values are fictional game units. */
export const CLASSES = Object.freeze(
  [
    {
      id: 'scout',
      label: 'Scout',
      description:
        'Mark hidden objectives permanently; show enemy direction hints for four seconds. No slowing.',
      primitive: 'scan',
      capacity: 0,
      cooldown: 6,
      duration: 4,
      radius: 48,
    },
    {
      id: 'bomber',
      label: 'Light carrier',
      description:
        'Pick up one charge at a supply pad; drop a field that stuns nearby field enemies.',
      primitive: 'stun-field',
      capacity: 1,
      cooldown: 2,
      duration: 2.5,
      radius: 3,
    },
    {
      id: 'carrier',
      label: 'Heavy carrier',
      description: 'Carry two charges; each creates the same temporary stun field.',
      primitive: 'stun-field',
      capacity: 2,
      cooldown: 2,
      duration: 2.5,
      radius: 3,
    },
    {
      id: 'interceptor',
      label: 'Interceptor',
      description:
        'Absorb one enemy or lane contact: cancel the cut and recover at spawn without losing a life. Self-crossing remains dangerous.',
      primitive: 'shield',
      capacity: 0,
      cooldown: 9,
      duration: 1.5,
      radius: 0,
    },
    {
      id: 'fiber',
      label: 'Fiber relay',
      description:
        'Ignore signal interference and scan for hidden relays. Your cable is the live trail: enemy contact still breaks it.',
      primitive: 'scan',
      capacity: 0,
      cooldown: 7,
      duration: 3,
      radius: 30,
      signalResistance: true,
      moveSpeedMultiplier: 1,
    },
    {
      id: 'impact',
      label: 'Impact craft',
      description:
        'Release a close-range stun pulse, abandon the unfinished cut and redeploy at home without losing a life. The pulse never captures territory.',
      primitive: 'impact-pulse',
      capacity: 0,
      cooldown: 10,
      duration: 3,
      radius: 5,
    },
    {
      id: 'trapper',
      label: 'Trapper',
      description:
        'Pick up one charge and place a four-second field that slows field enemies to one quarter speed.',
      primitive: 'slow-field',
      capacity: 1,
      cooldown: 2,
      duration: 4,
      radius: 4,
      slowFactor: 0.25,
    },
  ].map((entry) => Object.freeze({ ...entry, revision: '1' })),
);
export const ABILITY_PRIMITIVES = Object.freeze([
  'scan',
  'stun-field',
  'shield',
  'slow-field',
  'impact-pulse',
]);
export const DEFAULT_RULES = Object.freeze({
  lives: 3,
  moveSpeed: 8,
  boostMultiplier: 1.5,
  respawnSeconds: 0.65,
  graceSeconds: 1,
  playerRadius: 0.18,
  pointsPerCell: 10,
  objectivePoints: 500,
  timeMedals: [90, 150],
  switchCooldownSeconds: 2,
  timeLimitSeconds: 0,
  cutTimeLimitSeconds: 0,
  maxTrailCells: 0,
});

/** JSON recipes configure registered effects; an unknown behavior never falls back. */
export function validateClassRecipes(recipes) {
  const errors = [],
    seen = new Set(),
    finite = (v, min, max) => Number.isFinite(v) && v >= min && v <= max;
  if (!Array.isArray(recipes) || recipes.length === 0 || recipes.length > 40)
    return { valid: false, errors: ['classRecipes must contain 1..40 recipes'] };
  for (const [i, c] of recipes.entries()) {
    if (!c || typeof c !== 'object' || Array.isArray(c)) {
      errors.push(`classRecipes[${i}] must be an object`);
      continue;
    }
    if (
      typeof c.id !== 'string' ||
      !/^[a-zA-Z0-9][a-zA-Z0-9._-]{0,79}$/.test(c.id) ||
      seen.has(c.id)
    )
      errors.push(`classRecipes[${i}] needs a unique stable id`);
    seen.add(c.id);
    for (const key of ['revision', 'label', 'description'])
      if (typeof c[key] !== 'string' || !c[key].length)
        errors.push(`${c.id}.${key} must be a nonempty string`);
    if (!ABILITY_PRIMITIVES.includes(c.primitive))
      errors.push(`${c.id} has an unsupported primitive`);
    const field = c.primitive === 'stun-field' || c.primitive === 'slow-field';
    if (!Number.isInteger(c.capacity) || (field ? !finite(c.capacity, 1, 8) : c.capacity !== 0))
      errors.push(`${c.id}.capacity invalid for primitive`);
    if (!finite(c.cooldown, 0.1, 60) || !finite(c.duration, 0.1, 20))
      errors.push(`${c.id} cooldown/duration out of range`);
    if (c.primitive === 'shield' ? c.radius !== 0 : !finite(c.radius, 0.25, 60))
      errors.push(`${c.id}.radius invalid for primitive`);
    if (
      c.primitive === 'slow-field' ? !finite(c.slowFactor, 0.05, 0.95) : c.slowFactor !== undefined
    )
      errors.push(`${c.id}.slowFactor invalid for primitive`);
    if (c.signalResistance !== undefined && typeof c.signalResistance !== 'boolean')
      errors.push(`${c.id}.signalResistance must be boolean`);
    if (c.moveSpeedMultiplier !== undefined && !finite(c.moveSpeedMultiplier, 0.5, 1.5))
      errors.push(`${c.id}.moveSpeedMultiplier must be 0.5..1.5`);
    for (const key of Object.keys(c))
      if (
        ![
          'id',
          'revision',
          'label',
          'description',
          'primitive',
          'capacity',
          'cooldown',
          'duration',
          'radius',
          'slowFactor',
          'signalResistance',
          'moveSpeedMultiplier',
        ].includes(key)
      )
        errors.push(`${c.id} unsupported field ${key}`);
  }
  return { valid: errors.length === 0, errors };
}

export function loadoutHash(recipe) {
  const physics = {};
  for (const key of [
    'id',
    'revision',
    'primitive',
    'capacity',
    'cooldown',
    'duration',
    'radius',
    'slowFactor',
    'signalResistance',
    'moveSpeedMultiplier',
  ])
    if (recipe[key] !== undefined) physics[key] = recipe[key];
  let hash = 2166136261;
  for (const char of JSON.stringify(physics))
    hash = Math.imul(hash ^ char.charCodeAt(0), 16777619) >>> 0;
  return `loadout-v1-${hash.toString(16).padStart(8, '0')}`;
}

/** The complete available roster affects a switched run, even when the starting craft is unchanged. */
export function rosterHash(recipes) {
  let hash = 2166136261;
  for (const char of recipes.map(loadoutHash).sort().join('/'))
    hash = Math.imul(hash ^ char.charCodeAt(0), 16777619) >>> 0;
  return `roster-v1-${hash.toString(16).padStart(8, '0')}`;
}
