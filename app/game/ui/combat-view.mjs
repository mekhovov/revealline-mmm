import { t } from '../i18n/index.mjs';
import { plainObject, stableId } from '../data-json.mjs';
import { CELL, FIXED_DT } from '../core/registry.mjs';
import { EPS, pointAt } from '../core/geometry.mjs';
import { classicDomainHit } from '../core/classic-motion.mjs';
import { fitsClassicDomain } from '../core/classic-topology.mjs';
import { COMBAT_RADIUS, COMBAT_SHOT_RADIUS } from '../core/combat-definition.mjs';

const check = (condition, message = t('interface:malformedActiveCombatPresentationData')) => {
  if (!condition) throw new TypeError(message);
};
const own = (value, key) => {
  check(value !== null && typeof value === 'object');
  const descriptor = Object.getOwnPropertyDescriptor(value, key);
  if (!descriptor) return undefined;
  check(
    Object.hasOwn(descriptor, 'value'),
    t('interface:combatPresentationCannotContainAccessors'),
  );
  return descriptor.value;
};
// Inspect descriptors, including private fields, without reading their values.
// Only the presentation fields requested below are copied into the view.
function record(value) {
  check(plainObject(value));
  const keys = Reflect.ownKeys(value);
  check(keys.length <= 32);
  for (const key of keys) {
    const descriptor = Object.getOwnPropertyDescriptor(value, key);
    check(
      typeof key === 'string' && descriptor.enumerable && Object.hasOwn(descriptor, 'value'),
      t('interface:combatPresentationCannotContainAccessorsOrHiddenFields'),
    );
  }
  return value;
}
function dense(value, max) {
  check(Array.isArray(value) && Object.getPrototypeOf(value) === Array.prototype);
  const length = own(value, 'length');
  check(Number.isSafeInteger(length) && length >= 0 && length <= max);
  check(Reflect.ownKeys(value).length === length + 1);
  return Array.from({ length }, (_, i) => {
    const row = own(value, String(i));
    check(row !== undefined, t('interface:combatPresentationArraysMustBeDense'));
    return row;
  });
}
const finite = (value, min, max) => Number.isFinite(value) && value >= min && value <= max;
const integer = (value, min = 0, max = Number.MAX_SAFE_INTEGER) =>
  Number.isSafeInteger(value) && finite(value, min, max);
function point(value) {
  const x = own(value, 'x'),
    y = own(value, 'y');
  check(
    finite(x, 0, 72) && finite(y, 0, 36),
    t('interface:combatPositionMustBeFiniteAndOnTheBoard'),
  );
  return { x, y };
}
function id(value) {
  const result = own(value, 'id');
  check(stableId(result), t('interface:combatPresentationNeedsStableIds'));
  return result;
}
function velocity(value, speed) {
  const vx = own(value, 'vx'),
    vy = own(value, 'vy');
  check(
    finite(vx, -12, 12) && finite(vy, -12, 12) && Math.abs(Math.hypot(vx, vy) - speed) < 1e-7,
    t('interface:invalidCombatVelocity'),
  );
  return { vx, vy };
}
function freeze(value) {
  if (value && typeof value === 'object') {
    Object.values(value).forEach(freeze);
    Object.freeze(value);
  }
  return value;
}
const typedLength = Object.getOwnPropertyDescriptor(
  Object.getPrototypeOf(Uint8Array.prototype),
  'length',
).get;
function geometry(run) {
  const source = own(run, 'cells');
  check(
    Object.getPrototypeOf(source) === Uint8Array.prototype && typedLength.call(source) === 2592,
  );
  const cells = new Uint8Array(2592);
  for (let i = 0; i < cells.length; i++) {
    const value = own(source, String(i));
    check(integer(value, CELL.FIELD, CELL.WALL));
    cells[i] = value;
  }
  return { width: 72, height: 36, cells };
}
function effect(state, kind, tick) {
  const value = record(own(own(state, 'effects'), kind));
  const from = own(value, 'from'),
    until = own(value, 'until');
  check(integer(from) && integer(until, from));
  return tick >= from && tick < until;
}
function recipes(definition) {
  const values = dense(own(definition, 'actors'), 24),
    result = new Map();
  let sentries = 0;
  for (const source of values) {
    record(source);
    const key = id(source),
      role = own(source, 'role'),
      speed = own(source, 'speed');
    check(!result.has(key) && ['scout', 'sentry'].includes(role) && finite(speed, 0.25, 8));
    const recipe = { id: key, role, speed };
    if (role === 'sentry') {
      check(++sentries <= 8);
      for (const [key, min, max] of [
        ['warningTicks', 120, 480],
        ['recoveryTicks', 120, 600],
        ['shotLifeTicks', 120, 600],
      ]) {
        recipe[key] = own(source, key);
        check(integer(recipe[key], min, max));
      }
      recipe.shotSpeed = own(source, 'shotSpeed');
      check(finite(recipe.shotSpeed, 4, 12));
    }
    result.set(key, recipe);
  }
  return result;
}

/** Owned, bounded presentation only. Invalid active hazards must be surfaced by
 * the host; they must never masquerade as a successfully empty combat layer. */
export function combatView(run) {
  try {
    if (run === null || run === undefined) return null;
    const level = own(run, 'level');
    const classicDefinition = level === undefined ? undefined : own(level, 'classic');
    const definition =
      classicDefinition === undefined ? undefined : own(classicDefinition, 'combatPatrols');
    if (definition === undefined) return null;
    record(definition);
    check(own(definition, 'version') === 'combat-patrols.v1');
    const enabled = own(definition, 'enabled');
    check(typeof enabled === 'boolean');
    if (!enabled) return null;
    const pairs = {
      'xonix-core.v6': 'xonix-level.v5',
      'xonix-core.v7': 'xonix-level.v6',
      'xonix-core.v8': 'xonix-level.v7',
      'xonix-core.v9': 'xonix-level.v8',
    };
    const ruleset = own(run, 'ruleset');
    check(
      typeof ruleset === 'string' &&
        Object.hasOwn(pairs, ruleset) &&
        pairs[ruleset] === own(level, 'version'),
      t('interface:unsupportedCombatPresentationSchemaPair'),
    );
    check(
      own(run, 'width') === 72 &&
        own(run, 'height') === 36 &&
        own(level, 'width') === 72 &&
        own(level, 'height') === 36,
    );
    const tick = own(run, 'tick'),
      status = own(run, 'status');
    const state = own(run, 'classic'),
      actorTick = own(state, 'actorTick');
    check(
      own(state, 'version') === 'classic-state.v1' && integer(tick) && integer(actorTick, 0, tick),
    );
    check(['running', 'respawning', 'won', 'lost'].includes(status));
    const frozen = effect(state, 'enemy-freeze', tick),
      slow = effect(state, 'enemy-slow', tick);
    const definitions = recipes(definition),
      domain = geometry(run);
    const combat = record(own(state, 'combatPatrols'));
    check(own(combat, 'version') === 'combat-patrol-state.v1');
    const sourceActors = dense(own(combat, 'actors'), 24);
    check(sourceActors.length === definitions.size);
    const actors = [],
      byId = new Map();
    for (const source of sourceActors) {
      record(source);
      const key = id(source),
        recipe = definitions.get(key);
      const role = own(source, 'role'),
        alive = own(source, 'alive'),
        phase = own(source, 'phase');
      check(recipe && !byId.has(key) && role === recipe.role && typeof alive === 'boolean');
      check(
        alive
          ? role === 'scout'
            ? phase === 'cooldown'
            : ['cooldown', 'warning', 'recovery'].includes(phase)
          : phase === 'eliminated',
      );
      const position = point(source),
        motion = velocity(source, recipe.speed);
      check(own(source, 'radius') === COMBAT_RADIUS);
      if (alive) check(fitsClassicDomain(domain, position, COMBAT_RADIUS, CELL.FIELD));
      let warningTicks = 0,
        warningTotal = 0,
        aim = null,
        rayEnd = null;
      if (role === 'sentry') {
        const warningUntil = own(source, 'warningUntil'),
          recoveryUntil = own(source, 'recoveryUntil');
        const target = own(source, 'aim');
        if (phase === 'warning') {
          check(
            integer(warningUntil, actorTick + 1, actorTick + recipe.warningTicks) &&
              recoveryUntil === null,
          );
          aim = point(record(target));
          warningTotal = recipe.warningTicks;
          warningTicks = warningUntil - actorTick;
          const dx = aim.x - position.x,
            dy = aim.y - position.y,
            length = Math.hypot(dx, dy);
          check(length > EPS, t('interface:combatWarningNeedsADistinctLockedTarget'));
          const travel = recipe.shotSpeed * recipe.shotLifeTicks * FIXED_DT;
          const end = {
            x: position.x + (dx / length) * travel,
            y: position.y + (dy / length) * travel,
          };
          const hit = classicDomainHit(domain, position, end, COMBAT_SHOT_RADIUS, CELL.FIELD);
          rayEnd = pointAt(position, end, hit?.t ?? 1);
        } else {
          check(target === null && warningUntil === null);
          check(
            phase === 'recovery'
              ? // A terminal closure skips the end-tick AI pass. Its inert live
                // actor may therefore retain a recovery deadline reached now.
                integer(
                  recoveryUntil,
                  ['won', 'lost'].includes(status) ? 0 : actorTick + 1,
                  actorTick + recipe.recoveryTicks,
                )
              : recoveryUntil === null,
          );
        }
      }
      byId.set(key, { role, alive, ...position });
      if (alive) {
        const factor =
          phase !== 'cooldown' || frozen || ['won', 'lost'].includes(status) ? 0 : slow ? 0.5 : 1;
        actors.push({
          id: key,
          role,
          ...position,
          vx: motion.vx * factor,
          vy: motion.vy * factor,
          radius: COMBAT_RADIUS,
          phase,
          warningTicks,
          warningTotal,
          aim,
          rayEnd,
        });
      }
    }
    const projectileIds = new Set();
    const projectiles = dense(own(combat, 'projectiles'), 8).map((source) => {
      record(source);
      const key = id(source),
        actorId = own(source, 'actorId'),
        owner = byId.get(actorId),
        recipe = definitions.get(actorId);
      check(!projectileIds.has(key) && owner?.alive && owner.role === 'sentry');
      projectileIds.add(key);
      const position = point(source),
        motion = velocity(source, recipe.shotSpeed);
      check(integer(own(source, 'expiresAtTick'), actorTick + 1, actorTick + recipe.shotLifeTicks));
      check(fitsClassicDomain(domain, position, COMBAT_SHOT_RADIUS, CELL.FIELD));
      return { id: key, actorId, ...position, ...motion, radius: COMBAT_SHOT_RADIUS };
    });
    const eliminatedIds = new Set();
    const eliminations = dense(own(combat, 'eliminations'), 24).map((source) => {
      record(source);
      const key = id(source),
        actor = byId.get(key),
        cause = own(source, 'cause'),
        at = own(source, 'tick');
      const position = point(source);
      check(
        actor &&
          !actor.alive &&
          !eliminatedIds.has(key) &&
          ['ram', 'capture'].includes(cause) &&
          integer(at, 0, tick),
      );
      check(position.x === actor.x && position.y === actor.y);
      eliminatedIds.add(key);
      return { id: key, cause, ...position, tick: at };
    });
    check([...byId.values()].filter((actor) => !actor.alive).length === eliminatedIds.size);
    return freeze({
      valid: true,
      tick,
      actorTick,
      status,
      frozen,
      actors,
      projectiles,
      eliminations,
    });
  } catch (error) {
    return Object.freeze({
      valid: false,
      error:
        error instanceof TypeError ? error.message : t('interface:invalidCombatPresentationData'),
    });
  }
}
