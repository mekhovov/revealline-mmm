import {
  validateHuntDefinition,
  huntTargetKind,
  huntSummary,
  HUNT_STATE_VERSION,
  HUNT_MAX_RUNNER_SPEED,
} from '../hunt/rules.mjs';
import { t } from '../i18n/index.mjs';
import { plainObject, stableId, boundedJSON, exactKeys } from '../data-json.mjs';
import { CELL, FIXED_DT } from '../core/registry.mjs';
import { EPS, pointAt } from '../core/geometry.mjs';
import { classicDomainHit } from '../core/classic-motion.mjs';
import { fitsClassicDomain } from '../core/classic-topology.mjs';
import { COMBAT_RADIUS, COMBAT_SHOT_RADIUS } from '../core/combat-definition.mjs';
import { actorFacingRadians } from '../hunt/actor-facing.mjs';

const check = (condition, key = 'interface:malformedActiveCombatPresentationData') => {
  // Validation runs for every board projection; translate only an actual failure.
  if (!condition) throw new TypeError(t(key));
};
const own = (value, key) => {
  check(value !== null && typeof value === 'object');
  const descriptor = Object.getOwnPropertyDescriptor(value, key);
  if (!descriptor) return undefined;
  check(Object.hasOwn(descriptor, 'value'), 'interface:combatPresentationCannotContainAccessors');
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
      'interface:combatPresentationCannotContainAccessorsOrHiddenFields',
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
    check(row !== undefined, 'interface:combatPresentationArraysMustBeDense');
    return row;
  });
}
const finite = (value, min, max) => Number.isFinite(value) && value >= min && value <= max;
const integer = (value, min = 0, max = Number.MAX_SAFE_INTEGER) =>
  Number.isSafeInteger(value) && finite(value, min, max);
function point(value, width = 72) {
  const x = own(value, 'x'),
    y = own(value, 'y');
  check(
    finite(x, 0, width) && finite(y, 0, 36),
    'interface:combatPositionMustBeFiniteAndOnTheBoard',
  );
  return { x, y };
}
function id(value) {
  const result = own(value, 'id');
  check(stableId(result), 'interface:combatPresentationNeedsStableIds');
  return result;
}
function velocity(value, speed, canWait = false, boundedSpeed = false) {
  const vx = own(value, 'vx'),
    vy = own(value, 'vy'),
    limit = Math.max(12, speed);
  check(
    finite(vx, -limit, limit) &&
      finite(vy, -limit, limit) &&
      (Math.abs(Math.hypot(vx, vy) - speed) < 1e-7 ||
        (canWait && vx === 0 && vy === 0) ||
        (boundedSpeed && Math.hypot(vx, vy) <= speed + 1e-7)),
    'interface:invalidCombatVelocity',
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
    Object.getPrototypeOf(source) === Uint8Array.prototype &&
      typedLength.call(source) === own(run, 'width') * own(run, 'height'),
  );
  const cells = new Uint8Array(own(run, 'width') * own(run, 'height'));
  for (let i = 0; i < cells.length; i++) {
    const value = own(source, String(i));
    check(integer(value, CELL.FIELD, CELL.WALL));
    cells[i] = value;
  }
  return { width: own(run, 'width'), height: 36, cells };
}
function effect(state, kind, tick) {
  const value = record(own(own(state, 'effects'), kind));
  const from = own(value, 'from'),
    until = own(value, 'until');
  check(integer(from) && integer(until, from));
  return tick >= from && tick < until;
}
function recipes(definition, hunt, maximum = 24) {
  const values = dense(own(definition, 'actors'), maximum),
    result = new Map();
  let sentries = 0;
  for (const source of values) {
    record(source);
    const key = id(source),
      role = own(source, 'role'),
      speed = own(source, 'speed');
    check(
      !result.has(key) &&
        ['scout', 'sentry'].includes(role) &&
        finite(
          speed,
          0.25,
          huntTargetKind(hunt, key) === 'runner' ? (maximum > 24 ? 21 : HUNT_MAX_RUNNER_SPEED) : 8,
        ),
    );
    const headingX = own(source, 'headingX'),
      headingY = own(source, 'headingY');
    check(finite(headingX, -1, 1) && finite(headingY, -1, 1));
    const recipe = { id: key, role, speed, headingX, headingY, ...point(source) };
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
    const extension = level === undefined ? undefined : own(level, 'runningEnemies');
    const classicDefinition =
      extension ?? (level === undefined ? undefined : own(level, 'classic'));
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
      'xonix-core.v10': 'xonix-level.v9',
      'xonix-core.v11': 'xonix-level.v10',
      'xonix-core.v12': 'xonix-level.v11',
      'xonix-core.v13': 'xonix-level.v12',
      'xonix-core.v14': 'xonix-level.v13',
      'xonix-core.v15': 'xonix-level.v14',
      'xonix-core.v16': 'xonix-level.v15',
    };
    const ruleset = own(run, 'ruleset');
    check(
      typeof ruleset === 'string' &&
        Object.hasOwn(pairs, ruleset) &&
        pairs[ruleset] === own(level, 'version'),
      'interface:unsupportedCombatPresentationSchemaPair',
    );
    const supplemental = [
      'xonix-core.v11',
      'xonix-core.v13',
      'xonix-core.v14',
      'xonix-core.v15',
      'xonix-core.v16',
    ].includes(ruleset);
    const baseVersion = supplemental ? own(extension, 'baseVersion') : own(level, 'version');
    if (supplemental)
      check(
        (own(extension, 'version') === 'running-enemies.v1' &&
          /^xonix-level\.v[1-8]$/.test(baseVersion)) ||
          (['xonix-core.v13', 'xonix-core.v15'].includes(ruleset) &&
            own(extension, 'version') === 'running-enemies.v2' &&
            baseVersion === 'xonix-level.v9') ||
          (['xonix-core.v14', 'xonix-core.v16'].includes(ruleset) &&
            own(extension, 'version') === 'running-enemies.v3' &&
            baseVersion === 'xonix-level.v11'),
      );
    const legacyOwner = supplemental && /^xonix-level\.v[1-3]$/.test(baseVersion);
    const width =
      supplemental && ['xonix-level.v1', 'xonix-level.v2'].includes(baseVersion) ? 48 : 72;
    const maximum = supplemental ? 30 : 24;
    check(
      own(run, 'width') === width &&
        own(run, 'height') === 36 &&
        own(level, 'width') === width &&
        own(level, 'height') === 36,
    );
    const tick = own(run, 'tick'),
      status = own(run, 'status');
    const state = own(run, legacyOwner ? 'runningEnemies' : 'classic'),
      actorTick = own(state, 'actorTick');
    check(
      own(state, 'version') === (legacyOwner ? 'running-enemy-state.v1' : 'classic-state.v1') &&
        integer(tick) &&
        integer(actorTick, 0, tick),
    );
    check(['running', 'respawning', 'won', 'lost'].includes(status));
    const frozen = legacyOwner ? false : effect(state, 'enemy-freeze', tick),
      slow = legacyOwner ? false : effect(state, 'enemy-slow', tick);
    const hunt =
      ruleset === 'xonix-core.v10' || ruleset === 'xonix-core.v12' || supplemental
        ? validateHuntDefinition(own(classicDefinition, 'hunt'), own(definition, 'actors'), {
            supplemental,
          })
        : null;
    const definitions = recipes(definition, hunt, maximum),
      domain = geometry(run);
    const combat = record(own(state, 'combatPatrols'));
    check(own(combat, 'version') === 'combat-patrol-state.v1');
    const sourceActors = dense(own(combat, 'actors'), maximum);
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
      const policy = [
        'xonix-core.v13',
        'xonix-core.v14',
        'xonix-core.v15',
        'xonix-core.v16',
      ].includes(ruleset)
        ? dense(own(record(own(level, 'pursuit')), 'actors'), 6).find(
            (item) => own(record(item), 'id') === key,
          )
        : null;
      const pursuit = policy
        ? {
            behavior: own(policy, 'behavior'),
            phase: own(source, 'pursuit')
              ? own(record(own(source, 'pursuit')), 'phase')
              : 'walking',
          }
        : null;
      if (pursuit?.behavior === 'pair' && ['xonix-core.v15', 'xonix-core.v16'].includes(ruleset)) {
        const native = own(source, 'pursuit');
        if (native && own(record(native), 'partnerLost') === true) {
          check(
            own(native, 'behavior') === 'runner' &&
              sourceActors.some(
                (other) =>
                  own(record(other), 'id') === own(policy, 'partnerId') &&
                  own(other, 'alive') === false,
              ),
          );
          pursuit.behavior = 'runner';
        }
      }
      const specialist = pursuit && ['shield', 'brace'].includes(pursuit.behavior);
      if (pursuit) {
        if (pursuit.behavior === 'pair') {
          pursuit.partnerId = own(policy, 'partnerId');
          check(stableId(pursuit.partnerId));
        }
        const phases = specialist
          ? ['walking', 'blocked', 'turning', 'rest', 'warning', 'burst']
          : [
              'walking',
              'committed',
              'recovering',
              'blocked',
              ...(['xonix-core.v15', 'xonix-core.v16'].includes(ruleset)
                ? ['idle', 'warning', 'burst', 'waiting', 'fallback']
                : []),
            ];
        check(
          [
            'runner',
            ...(['xonix-core.v15', 'xonix-core.v16'].includes(ruleset) ? ['sprinter'] : []),
            'patroller',
            'courier',
            'refuge',
            'switchback',
            'pair',
            'shield',
            'brace',
          ].includes(pursuit.behavior) && phases.includes(pursuit.phase),
        );
        const nativeState = own(source, 'pursuit');
        if (nativeState) {
          record(nativeState);
          const goal = own(nativeState, 'goal'),
            cursor = own(nativeState, 'cursor');
          check(integer(cursor));
          pursuit.cursor = cursor;
          pursuit.goal = goal == null ? null : point(record(goal), width);
          if (['xonix-core.v15', 'xonix-core.v16'].includes(ruleset) && !specialist) {
            pursuit.heading = own(nativeState, 'heading');
            pursuit.nextHeading = own(nativeState, 'nextHeading');
            check(['up', 'right', 'down', 'left'].includes(pursuit.heading));
            check(
              pursuit.nextHeading === null ||
                ['up', 'right', 'down', 'left'].includes(pursuit.nextHeading),
            );
          }
        }
        if (specialist) {
          const state = record(own(source, 'pursuit'));
          pursuit.heading = own(state, 'heading');
          pursuit.nextHeading = own(state, 'nextHeading');
          check(['up', 'right', 'down', 'left'].includes(pursuit.heading));
          check(
            pursuit.nextHeading === null ||
              ['up', 'right', 'down', 'left'].includes(pursuit.nextHeading),
          );
          check(
            (pursuit.behavior === 'shield' &&
              ['walking', 'blocked', 'turning'].includes(pursuit.phase)) ||
              (pursuit.behavior === 'brace' &&
                ['rest', 'warning', 'burst'].includes(pursuit.phase)),
          );
          check(pursuit.phase !== 'turning' || pursuit.nextHeading !== null);
        }
      }
      const position = point(source, width),
        motion = velocity(
          source,
          recipe.speed *
            (['brace', 'sprinter'].includes(pursuit?.behavior) && pursuit.phase === 'burst'
              ? 2
              : 1),
          !!pursuit,
          !!specialist || ['xonix-core.v15', 'xonix-core.v16'].includes(ruleset),
        );
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
          aim = point(record(target), width);
          warningTotal = recipe.warningTicks;
          warningTicks = warningUntil - actorTick;
          const dx = aim.x - position.x,
            dy = aim.y - position.y,
            length = Math.hypot(dx, dy);
          check(length > EPS, 'interface:combatWarningNeedsADistinctLockedTarget');
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
      byId.set(key, { role, alive, ...position, ...(pursuit ? { family: pursuit.behavior } : {}) });
      if (alive) {
        const factor =
          phase !== 'cooldown' || frozen || ['won', 'lost'].includes(status) ? 0 : slow ? 0.5 : 1;
        actors.push({
          id: key,
          role,
          ...(pursuit ? { pursuit } : {}),
          ...(huntTargetKind(hunt, key) ? { kind: huntTargetKind(hunt, key) } : {}),
          ...position,
          facingRadians: actorFacingRadians({ ...position, ...motion, pursuit, aim }, recipe),
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
      const position = point(source, width),
        motion = velocity(source, recipe.shotSpeed);
      check(integer(own(source, 'expiresAtTick'), actorTick + 1, actorTick + recipe.shotLifeTicks));
      check(fitsClassicDomain(domain, position, COMBAT_SHOT_RADIUS, CELL.FIELD));
      return { id: key, actorId, ...position, ...motion, radius: COMBAT_SHOT_RADIUS };
    });
    const eliminatedIds = new Set();
    const eliminations = dense(own(combat, 'eliminations'), maximum).map((source) => {
      record(source);
      const key = id(source),
        actor = byId.get(key),
        cause = own(source, 'cause'),
        at = own(source, 'tick');
      const position = point(source, width);
      check(
        actor &&
          !actor.alive &&
          !eliminatedIds.has(key) &&
          ['ram', 'capture'].includes(cause) &&
          integer(at, 0, tick),
      );
      check(position.x === actor.x && position.y === actor.y);
      eliminatedIds.add(key);
      return {
        id: key,
        cause,
        ...position,
        tick: at,
        ...(actor.family ? { family: actor.family } : {}),
        ...(huntTargetKind(hunt, key) ? { kind: huntTargetKind(hunt, key) } : {}),
      };
    });
    check([...byId.values()].filter((actor) => !actor.alive).length === eliminatedIds.size);
    let huntState = null;
    if (hunt) {
      huntState = boundedJSON(own(state, 'hunt'), { maxBytes: 1024, maxNodes: 10, maxDepth: 1 });
      exactKeys(
        huntState,
        ['version', 'kills', 'touchKills', 'captureKills', 'score'],
        'Hunt state',
      );
      const removed = eliminations.filter((mark) => mark.kind);
      const touchKills = removed.filter((mark) => mark.cause === 'ram').length;
      check(
        huntState.version === HUNT_STATE_VERSION &&
          huntState.kills === removed.length &&
          huntState.touchKills === touchKills &&
          huntState.captureKills === removed.length - touchKills &&
          huntState.score === touchKills * 100 + (removed.length - touchKills) * 50,
      );
    }
    return freeze({
      valid: true,
      tick,
      actorTick,
      status,
      frozen,
      actors,
      projectiles,
      eliminations,
      ...(hunt ? { hunt: huntSummary(hunt, huntState) } : {}),
    });
  } catch (error) {
    return Object.freeze({
      valid: false,
      error:
        error instanceof TypeError ? error.message : t('interface:invalidCombatPresentationData'),
    });
  }
}
