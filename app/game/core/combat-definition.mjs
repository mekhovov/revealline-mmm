import { exactKeys, required, stableId } from '../data-json.mjs';
import { CELL } from './registry.mjs';
import { EPS } from './geometry.mjs';
import { classicSeedsField, fitsClassicDomain } from './classic-topology.mjs';

export const COMBAT_PATROLS_VERSION = 'combat-patrols.v1';
export const COMBAT_RADIUS = 0.22;
export const COMBAT_SHOT_RADIUS = 0.1;
export const COMBAT_MAX_ACTORS = 24;
export const COMBAT_MAX_SENTRIES = 8;
export const COMBAT_MAX_PROJECTILES = 8;

const commonFields = ['id', 'role', 'x', 'y', 'headingX', 'headingY', 'speed', 'turnTicks'];
const sentryFields = [
  'senseRadius',
  'scanTicks',
  'openingTicks',
  'warningTicks',
  'recoveryTicks',
  'restTicks',
  'shotSpeed',
  'shotLifeTicks',
];
const number = (value, low, high) => Number.isFinite(value) && value >= low && value <= high;
const integer = (value, low, high) => Number.isSafeInteger(value) && number(value, low, high);
function fields(value, keys, label) {
  exactKeys(value, keys, label);
  required(
    keys.every((key) => Object.hasOwn(value, key)),
    `${label} fields are required`,
  );
}

/** The level boundary has already copied dense bounded JSON without invoking code.
 * Disabled descriptors receive the same validation as enabled descriptors. */
export function validateCombatPatrols(level, { identity, walls, geometry }) {
  if (!Object.hasOwn(level.classic, 'combatPatrols')) return;
  required(
    ['xonix-level.v5', 'xonix-level.v6', 'xonix-level.v7', 'xonix-level.v8'].includes(
      level.version,
    ),
    'combat patrols require foundation-aware classic levels v5..v8',
  );
  const definition = level.classic.combatPatrols;
  fields(definition, ['version', 'enabled', 'actors'], 'combat patrols');
  required(definition.version === COMBAT_PATROLS_VERSION, 'unsupported combat patrol version');
  required(typeof definition.enabled === 'boolean', 'combat patrol enabled must be boolean');
  required(
    Array.isArray(definition.actors) && definition.actors.length <= COMBAT_MAX_ACTORS,
    'combat patrols require at most 24 actors',
  );
  required(
    geometry?.cells?.length === level.width * level.height,
    'combat patrols need foundation geometry',
  );
  const domain = { width: level.width, height: level.height, cells: geometry.cells };
  const geometryIds = new Set(
    [...(level.relayGates?.gates ?? []), ...(level.directionalFields?.zones ?? [])].map(
      (entry) => entry.id,
    ),
  );
  const occupied = (level.enemies ?? [])
    .filter(classicSeedsField)
    .map((enemy) => ({ ...enemy, radius: enemy.radius ?? 0.25 }));
  let sentries = 0;
  for (const actor of definition.actors) {
    fields(
      actor,
      [...commonFields, ...(actor?.role === 'sentry' ? sentryFields : [])],
      'combat patrol actor',
    );
    required(['scout', 'sentry'].includes(actor.role), 'unsupported combat patrol role');
    required(stableId(actor.id), 'combat patrol needs a stable ID');
    required(!geometryIds.has(actor.id), 'all entity IDs must be unique');
    identity(actor);
    required(
      number(actor.x, 1.5, level.width - 1.5) &&
        number(actor.y, 1.5, level.height - 1.5) &&
        Number.isInteger(actor.x - 0.5) &&
        Number.isInteger(actor.y - 0.5),
      'combat patrol starts must occupy interior cell centers',
    );
    required(
      integer(actor.headingX, -1, 1) &&
        integer(actor.headingY, -1, 1) &&
        (actor.headingX !== 0 || actor.headingY !== 0),
      'combat patrol heading components must be -1..1 integers and not both zero',
    );
    required(number(actor.speed, 0.25, 8), 'combat patrol speed must be 0.25..8');
    required(
      integer(actor.turnTicks, 30, 1200),
      'combat patrol turnTicks must be 30..1200 integer ticks',
    );
    if (actor.role === 'sentry') {
      required(++sentries <= COMBAT_MAX_SENTRIES, 'combat patrols require at most 8 sentries');
      required(number(actor.senseRadius, 4, 24), 'combat patrol senseRadius must be 4..24');
      required(number(actor.shotSpeed, 4, 12), 'combat patrol shotSpeed must be 4..12');
      for (const [key, low, high] of [
        ['scanTicks', 12, 120],
        ['openingTicks', 240, 2400],
        ['warningTicks', 120, 480],
        ['recoveryTicks', 120, 600],
        ['restTicks', 360, 3600],
        ['shotLifeTicks', 120, 600],
      ])
        required(
          integer(actor[key], low, high),
          `combat patrol ${key} must be ${low}..${high} integer ticks`,
        );
    }
    required(
      !walls[Math.floor(actor.y) * level.width + Math.floor(actor.x)] &&
        fitsClassicDomain(domain, actor, COMBAT_RADIUS, CELL.FIELD),
      'combat patrol start must fit unclaimed field clear of walls, foundations and gates',
    );
    required(
      Math.hypot(actor.x - level.spawn.x, actor.y - level.spawn.y) >= 2,
      'combat patrol needs two cells of spawn clearance',
    );
    required(
      occupied.every(
        (other) =>
          Math.hypot(actor.x - other.x, actor.y - other.y) + EPS >= COMBAT_RADIUS + other.radius,
      ),
      'combat patrol starts cannot overlap other patrols or field enemies',
    );
    occupied.push({ ...actor, radius: COMBAT_RADIUS });
  }
}
