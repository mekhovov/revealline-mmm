import { DEFAULT_RULES } from './registry.mjs';
import { boundedJSON, exactKeys } from '../data-json.mjs';
import { resolveEncounterDescriptor } from './encounter.mjs';
import { resolveClassicDefinition } from './classic-definition.mjs';
import { foundationGeometry, validateFoundationOccupants } from './foundations.mjs';
import { validFieldCourse } from './field-course.mjs';

const number = (v, lo, hi) => Number.isFinite(v) && v >= lo && v <= hi;
const integer = (v, lo, hi) => Number.isInteger(v) && v >= lo && v <= hi;
const id = (v) => typeof v === 'string' && /^[a-zA-Z0-9][a-zA-Z0-9._-]{0,79}$/.test(v);
const object = (v) => v !== null && typeof v === 'object' && !Array.isArray(v);

/** Validate data without mutating it. Unknown presentation metadata is ignored. */
function validateShape(
  level,
  encounterBranch = false,
  wideBranch = false,
  classicBranch = false,
  foundations = null,
) {
  const width = wideBranch ? 72 : 48,
    height = 36;
  const errors = [];
  const check = (value, message) => {
    if (!value) errors.push(message);
  };
  if (!object(level)) return { valid: false, errors: ['level must be an object'] };
  check(
    level.version ===
      (wideBranch ? 'xonix-level.v3' : encounterBranch ? 'xonix-level.v2' : 'xonix-level.v1'),
    wideBranch
      ? 'version must be xonix-level.v3'
      : encounterBranch
        ? 'version must be xonix-level.v2'
        : 'version must be xonix-level.v1',
  );
  check(id(level.id), 'id must be a stable identifier');
  check(
    typeof level.revision === 'string' && level.revision.length > 0,
    'revision must be a nonempty string',
  );
  check(
    level.width === width && level.height === height,
    `board must be exactly ${width} × ${height}`,
  );
  const x = (v) => number(v, 0.5, width - 0.5),
    y = (v) => number(v, 0.5, height - 0.5);
  const onBorder = (p) =>
    object(p) &&
    x(p.x) &&
    y(p.y) &&
    (p.x === 0.5 || p.x === width - 0.5 || p.y === 0.5 || p.y === height - 0.5);
  check(
    (foundations !== null || onBorder(level.spawn)) &&
      Number.isInteger(level.spawn.x - 0.5) &&
      Number.isInteger(level.spawn.y - 0.5),
    'spawn must be an outer safe cell center',
  );
  check(
    object(level.goal) && number(level.goal.coverage, 0.01, 1),
    'goal.coverage must be between 0.01 and 1',
  );
  for (const key of ['walls', 'enemies', 'objectives', 'supplies', 'signalZones', 'hangars'])
    check(level[key] === undefined || Array.isArray(level[key]), `${key} must be an array`);
  if (errors.some((e) => e.endsWith('must be an array'))) return { valid: false, errors };
  const walls = level.walls ?? [],
    enemies = level.enemies ?? [],
    objectives = level.objectives ?? [],
    supplies = level.supplies ?? [];
  check(walls.length <= 100, 'at most 100 walls');
  check(enemies.length <= 24, 'at most 24 enemies');
  check(objectives.length <= 40, 'at most 40 objectives');
  check(supplies.length <= 20, 'at most 20 supplies');
  const cells = new Uint8Array(width * height);
  for (let i = 0; i < walls.length; i++) {
    const w = walls[i];
    const valid =
      object(w) &&
      integer(w.x, 1, width - 2) &&
      integer(w.y, 1, height - 2) &&
      integer(w.w, 1, width - 2) &&
      integer(w.h, 1, height - 2) &&
      w.x + w.w <= width - 1 &&
      w.y + w.h <= height - 1;
    check(valid, `walls[${i}] must be an integer interior rectangle`);
    if (valid)
      for (let y = w.y; y < w.y + w.h; y++)
        for (let x = w.x; x < w.x + w.w; x++) {
          check(!cells[y * width + x], `walls[${i}] overlaps another wall`);
          cells[y * width + x] = 2;
        }
  }
  check(
    cells.filter((v) => v === 2).length < (width - 2) * (height - 2),
    'at least one interior cell must be claimable',
  );
  const clear = (p, r = 0) => {
    if (!object(p) || !number(p.x, 1 + r, width - 1 - r) || !number(p.y, 1 + r, height - 1 - r))
      return false;
    for (let y = Math.floor(p.y - r); y <= Math.floor(p.y + r); y++)
      for (let x = Math.floor(p.x - r); x <= Math.floor(p.x + r); x++)
        if (cells[y * width + x] === 2) return false;
    return true;
  };
  const seen = new Set();
  for (const [i, e] of enemies.entries()) {
    check(object(e) && id(e.id) && !seen.has(e.id), `enemies[${i}] needs a unique id`);
    if (!object(e)) continue;
    check(validFieldCourse(e), `enemies[${i}] has an invalid field course`);
    seen.add(e.id);
    check(
      (encounterBranch
        ? ['relay-sentinel', 'border-patrol']
        : ['bouncer', 'border-patrol', 'lane-boss']
      ).includes(e.type),
      `enemies[${i}] unsupported type`,
    );
    check(
      e.radius === undefined || number(e.radius, 0.05, 0.45),
      `enemies[${i}].radius must be 0.05..0.45`,
    );
    if (e.type === 'border-patrol') {
      check(onBorder(e), `enemies[${i}] patrol must lie on outer center-line`);
      check(e.speed === undefined || number(e.speed, 0, 15), `enemies[${i}].speed must be 0..15`);
      check(
        e.clockwise === undefined || typeof e.clockwise === 'boolean',
        `enemies[${i}].clockwise must be boolean`,
      );
      if (onBorder(level.spawn) && onBorder(e))
        check(
          Math.hypot(e.x - level.spawn.x, e.y - level.spawn.y) > 2,
          `enemies[${i}] patrol too close to spawn`,
        );
    } else {
      const radius = e.radius ?? 0.25;
      check(number(radius, 0.05, 0.45), `enemies[${i}].radius must be 0.05..0.45`);
      check(clear(e, radius), `enemies[${i}] must fit in unclaimed interior clear of walls`);
      if (e.type === 'bouncer')
        check(
          number(e.vx, -20, 20) && number(e.vy, -20, 20),
          `enemies[${i}] needs finite vx/vy in -20..20`,
        );
      if (e.type === 'lane-boss') {
        check(['horizontal', 'vertical'].includes(e.axis), `enemies[${i}].axis invalid`);
        const warning = e.warningSeconds ?? 1.5,
          active = e.activeSeconds ?? 0.7,
          period = e.period ?? 6;
        check(
          number(warning, 0.25, 10) &&
            number(active, 0.1, 10) &&
            number(period, warning + active + 0.25, 60),
          `enemies[${i}] invalid lane timing`,
        );
        check(
          e.laneWidth === undefined || number(e.laneWidth, 0.25, 5),
          `enemies[${i}].laneWidth must be 0.25..5`,
        );
      }
    }
  }
  for (const [kind, list] of [
    ['objectives', objectives],
    ['supplies', supplies],
  ])
    for (const [i, p] of list.entries()) {
      check(object(p) && id(p.id) && !seen.has(p.id), `${kind}[${i}] needs a unique id`);
      if (!object(p)) continue;
      seen.add(p.id);
      check(
        x(p.x) && y(p.y) && cells[Math.floor(p.y) * width + Math.floor(p.x)] !== 2,
        `${kind}[${i}] invalid position`,
      );
      if (kind === 'objectives') {
        check(clear(p), `objectives[${i}] must be in claimable interior`);
        for (const key of ['required', 'hidden'])
          check(
            p[key] === undefined || typeof p[key] === 'boolean',
            `objectives[${i}].${key} must be boolean`,
          );
      } else
        check(
          p.radius === undefined || number(p.radius, 0.25, 4),
          `supplies[${i}].radius must be 0.25..4`,
        );
    }
  const zones = level.signalZones ?? [];
  check(zones.length <= 16, 'at most 16 signal zones');
  for (const [i, z] of zones.entries()) {
    check(object(z) && id(z.id) && !seen.has(z.id), `signalZones[${i}] needs a unique id`);
    if (!object(z)) continue;
    seen.add(z.id);
    check(
      number(z.x, 1, width - 2) &&
        number(z.y, 1, height - 2) &&
        number(z.w, 0.5, width - 2) &&
        number(z.h, 0.5, height - 2) &&
        z.x + z.w <= width - 1 &&
        z.y + z.h <= height - 1,
      `signalZones[${i}] must be an interior rectangle`,
    );
    check(number(z.speedFactor, 0.25, 1), `signalZones[${i}].speedFactor must be 0.25..1`);
    for (const key of ['disableBoost', 'lockAbility'])
      check(
        z[key] === undefined || typeof z[key] === 'boolean',
        `signalZones[${i}].${key} must be boolean`,
      );
  }
  const hangars = level.hangars ?? [];
  check(hangars.length <= 12, 'at most 12 hangars');
  for (const [i, h] of hangars.entries()) {
    check(object(h) && id(h.id) && !seen.has(h.id), `hangars[${i}] needs a unique id`);
    if (!object(h)) continue;
    seen.add(h.id);
    check(
      x(h.x) && y(h.y) && cells[Math.floor(h.y) * width + Math.floor(h.x)] !== 2,
      `hangars[${i}] invalid position`,
    );
    check(
      h.radius === undefined || number(h.radius, 0.25, 4),
      `hangars[${i}].radius must be 0.25..4`,
    );
  }
  if (level.rules !== undefined && !object(level.rules)) errors.push('rules must be an object');
  if (object(level.rules)) {
    const ranges = {
      lives: [1, 9],
      moveSpeed: [1, 20],
      boostMultiplier: [1, 3],
      respawnSeconds: [0.1, 5],
      graceSeconds: [0, 5],
      playerRadius: [0.05, 0.3],
      pointsPerCell: [0, 1000],
      objectivePoints: [0, 10000],
      switchCooldownSeconds: [0.1, 30],
      timeLimitSeconds: [0, 1800],
      cutTimeLimitSeconds: [0, 120],
      maxTrailCells: [0, (width - 2) * (height - 2)],
    };
    for (const [key, value] of Object.entries(level.rules)) {
      if (key === 'timeMedals')
        check(
          Array.isArray(value) &&
            value.length === 2 &&
            number(value[0], 1, 7200) &&
            number(value[1], value[0], 7200),
          'rules.timeMedals must be [goldSeconds,silverSeconds]',
        );
      else if (classicBranch && key === 'stopOnCapture')
        check(typeof value === 'boolean', 'rules.stopOnCapture must be boolean');
      else
        check(
          Object.hasOwn(ranges, key) &&
            number(value, ...(Object.hasOwn(ranges, key) ? ranges[key] : [0, 0])),
          `unsupported or invalid rule ${key}`,
        );
    }
    if (level.rules.maxTrailCells !== undefined)
      check(Number.isInteger(level.rules.maxTrailCells), 'rules.maxTrailCells must be integer');
    if (level.rules.lives !== undefined)
      check(Number.isInteger(level.rules.lives), 'rules.lives must be integer');
  }
  return { valid: errors.length === 0, errors: [...new Set(errors)] };
}

/** Legacy metadata and normalization stay unchanged; the new recipe is strict own JSON. */
export function validateLevel(level) {
  try {
    const version =
      level && typeof level === 'object' ? Object.getOwnPropertyDescriptor(level, 'version') : null;
    if (version && !Object.hasOwn(version, 'value'))
      return { valid: false, errors: ['level version must be own data'] };
    const sentinel = version?.value === 'xonix-level.v8';
    const directional = version?.value === 'xonix-level.v7' || sentinel;
    const relays = version?.value === 'xonix-level.v6' || directional;
    const foundations = version?.value === 'xonix-level.v5' || relays;
    const classic = version?.value === 'xonix-level.v4' || foundations;
    const wide = version?.value === 'xonix-level.v3' || classic;
    const oldClassic =
      level && typeof level === 'object' ? Object.getOwnPropertyDescriptor(level, 'classic') : null;
    if (
      !foundations &&
      oldClassic &&
      Object.hasOwn(oldClassic, 'value') &&
      oldClassic.value &&
      Object.hasOwn(oldClassic.value, 'combatPatrols')
    )
      return { valid: false, errors: ['combat patrols require foundation levels v5–v8'] };
    if (version?.value !== 'xonix-level.v2' && !wide) {
      if (level && Object.hasOwn(level, 'encounter'))
        return { valid: false, errors: ['encounter requires xonix-level.v2'] };
      return validateShape(level);
    }
    const owned = boundedJSON(level, {
      maxBytes: 128 * 1024,
      maxNodes: 10000,
      maxDepth: 12,
      maxArray: 100,
    });
    exactKeys(
      owned,
      [
        'version',
        'id',
        'revision',
        'name',
        'width',
        'height',
        'spawn',
        'goal',
        'walls',
        'enemies',
        'objectives',
        'supplies',
        'rules',
        'metadata',
        'signalZones',
        'hangars',
        'themeId',
        'musicId',
        'encounter',
        ...(classic ? ['classic'] : []),
        ...(foundations ? ['foundations'] : []),
        ...(relays ? ['relayGates'] : []),
        ...(directional ? ['directionalFields'] : []),
      ],
      'level',
    );
    if (wide && !Object.hasOwn(owned, 'encounter'))
      return { valid: false, errors: ['wide levels require an explicit nullable encounter'] };
    if (
      owned.encounter !== null &&
      owned.encounter?.version !== (sentinel ? 'xonix-encounter.v2' : 'xonix-encounter.v1')
    )
      return { valid: false, errors: ['Encounter and level editions must match.'] };
    const geometry = foundations ? foundationGeometry(owned) : null;
    const shape = classic
      ? {
          ...owned,
          version: 'xonix-level.v3',
          enemies: (owned.enemies ?? [])
            .filter(
              (enemy) =>
                enemy.type !== 'contour-patrol' &&
                !(owned.encounter !== null && enemy.type === 'claimed-rover'),
            )
            .map((enemy) =>
              ['claimed-rover', 'eroder'].includes(enemy.type)
                ? { ...enemy, type: 'bouncer' }
                : enemy,
            ),
        }
      : owned;
    const result = validateShape(shape, !wide || owned.encounter !== null, wide, classic, geometry);
    if (!result.valid) return result;
    if (classic) {
      if ((owned.enemies ?? []).length > 24) throw new TypeError('at most 24 enemies');
      // Claimed actors in encounter maps still need ordinary radius/wall checks.
      const actors = validateShape(
        {
          ...shape,
          encounter: null,
          enemies: (owned.enemies ?? [])
            .filter((enemy) => ['claimed-rover', 'eroder'].includes(enemy.type))
            .map((enemy) => ({ ...enemy, type: 'bouncer' })),
        },
        false,
        true,
        true,
        geometry,
      );
      if (!actors.valid) return actors;
      resolveClassicDefinition(owned, geometry);
      if (foundations) validateFoundationOccupants(owned, geometry);
    }
    if (!wide || owned.encounter !== null)
      resolveEncounterDescriptor(owned.encounter, shape, geometry);
    return result;
  } catch (error) {
    return { valid: false, errors: [error.message] };
  }
}

export function normalizedLevel(level) {
  if (
    [
      'xonix-level.v4',
      'xonix-level.v5',
      'xonix-level.v6',
      'xonix-level.v7',
      'xonix-level.v8',
    ].includes(Object.getOwnPropertyDescriptor(level ?? {}, 'version')?.value)
  )
    level = boundedJSON(level, {
      maxBytes: 128 * 1024,
      maxNodes: 10000,
      maxDepth: 12,
      maxArray: 100,
    });
  const result = validateLevel(level);
  if (!result.valid) throw new TypeError(`Invalid level: ${result.errors.join('; ')}`);
  const ids = new Set(
    ['enemies', 'objectives', 'supplies', 'signalZones'].flatMap((key) =>
      (level[key] ?? []).map((p) => p.id),
    ),
  );
  if (
    [
      'xonix-level.v4',
      'xonix-level.v5',
      'xonix-level.v6',
      'xonix-level.v7',
      'xonix-level.v8',
    ].includes(level.version)
  )
    for (const item of [
      ...level.classic.terrain,
      ...level.classic.powerups,
      ...(level.classic.timedBonuses?.schedules ?? []),
      ...(level.classic.combatPatrols?.actors ?? []),
    ])
      ids.add(item.id);
  let homeId = 'home-hangar';
  for (let n = 1; ids.has(homeId); n++) homeId = `home-hangar-${n}`;
  return {
    ...structuredClone(level),
    rules: structuredClone({ ...DEFAULT_RULES, ...level.rules }),
    walls: structuredClone(level.walls ?? []),
    enemies: structuredClone(level.enemies ?? []),
    objectives: structuredClone(level.objectives ?? []),
    supplies: structuredClone(level.supplies ?? []),
    signalZones: structuredClone(level.signalZones ?? []),
    hangars: structuredClone(level.hangars ?? [{ id: homeId, ...level.spawn, radius: 2 }]),
  };
}
