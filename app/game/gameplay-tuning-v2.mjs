import { boundedJSON, dataIdentity, exactKeys, required } from './data-json.mjs';
import { normalizedLevel } from './core/level.mjs';
import { foundationGeometry } from './core/foundations.mjs';
import { validateCoopLevel } from './coop/core.mjs';
import { compileCoopFoundationGeometry, isJourneyTeamLevel } from './coop/foundations.mjs';
import * as historical from './gameplay-tuning-v1.mjs';

export const GAMEPLAY_TUNING_VERSION = 'gameplay-pressure.v2';
// The preference format is unchanged; historical recipes have separate dispatch.
const PREFERENCE_VERSION = 'gameplay-pressure.v1';
export const GAMEPLAY_TUNING_STORAGE_KEY = 'revealline-mmm.gameplay-tuning.v1';
export const GAMEPLAY_TUNING_DEFAULTS = Object.freeze({
  enemySpeed: 1,
  playerSpeed: 1,
  enemyDensity: 1,
});
export const GAMEPLAY_TUNING_BOUNDS = Object.freeze({
  enemySpeed: Object.freeze([0.5, 2]),
  playerSpeed: Object.freeze([0.75, 1.5]),
  enemyDensity: Object.freeze([0, 2]),
});
export const GAMEPLAY_PRESSURE_PRESETS = Object.freeze({
  gentle: Object.freeze({ enemySpeed: 0.75, playerSpeed: 1, enemyDensity: 0 }),
  standard: Object.freeze({ enemySpeed: 1, playerSpeed: 1, enemyDensity: 0 }),
  expert: Object.freeze({ enemySpeed: 1.2, playerSpeed: 1, enemyDensity: 0.5 }),
});
// Approximate observations, not claimed Xposed source constants. See research.
// Units are original playable short-field lengths per second; never shrink as
// territory is captured. Unmeasured actor roles keep their v1 pressure policy.
export const REFERENCE_MOTION_RATES = Object.freeze({
  craft: 0.26,
  fieldKeeper: 0.325,
  boundaryPatrol: 0.24,
});
const freeze = (value) => {
  if (value && typeof value === 'object') {
    Object.values(value).forEach(freeze);
    Object.freeze(value);
  }
  return value;
};
const clamp = (value, low, high) => Math.max(low, Math.min(high, value));
const fields = Object.keys(GAMEPLAY_TUNING_DEFAULTS);
const copySmall = (value) => boundedJSON(value, { maxBytes: 4096, maxNodes: 40, maxDepth: 3 });

function checkedOverrides(value) {
  const copy = copySmall(value);
  exactKeys(copy, fields, 'gameplay tuning overrides');
  for (const [key, value] of Object.entries(copy)) {
    const [low, high] = GAMEPLAY_TUNING_BOUNDS[key];
    required(Number.isFinite(value) && value >= low && value <= high, `Invalid ${key} override.`);
  }
  return Object.freeze({ ...GAMEPLAY_TUNING_DEFAULTS, ...copy });
}

/** Relative to reference movement targets, on an explicitly selected edition.
 * This is an attempt recipe, never a mutation of a running simulation. */
export function resolveGameplayTuning(
  difficulty = 'standard',
  overrides = GAMEPLAY_TUNING_DEFAULTS,
) {
  required(
    Object.hasOwn(GAMEPLAY_PRESSURE_PRESETS, difficulty),
    'Unsupported gameplay difficulty.',
  );
  const owned = checkedOverrides(overrides),
    preset = GAMEPLAY_PRESSURE_PRESETS[difficulty];
  return freeze({
    version: GAMEPLAY_TUNING_VERSION,
    difficulty,
    enemySpeed: preset.enemySpeed * owned.enemySpeed,
    playerSpeed: preset.playerSpeed * owned.playerSpeed,
    enemyDensity: Math.max(0, (1 + preset.enemyDensity) * owned.enemyDensity - 1),
    adminOverride: fields.some((key) => owned[key] !== GAMEPLAY_TUNING_DEFAULTS[key]),
    overrides: owned,
  });
}

/** Own and re-derive the recipe; caller-provided resolved factors cannot disagree
 * with the visible difficulty or the practice/award classification. */
export function validateGameplayTuning(snapshot) {
  const owned = copySmall(snapshot);
  if (owned?.version === 'gameplay-pressure.v1') return historical.validateGameplayTuning(owned);
  exactKeys(
    owned,
    ['version', 'difficulty', ...fields, 'adminOverride', 'overrides'],
    'gameplay tuning',
  );
  const resolved = resolveGameplayTuning(owned.difficulty, owned.overrides);
  required(
    dataIdentity(owned) === dataIdentity(resolved),
    'Inconsistent gameplay tuning snapshot.',
  );
  return resolved;
}

/** Shared menu copy: measured roles use normalized units, not authored factors. */
export function gameplayTuningDescription(snapshot) {
  const tuning = validateGameplayTuning(snapshot);
  if (tuning.version === 'gameplay-pressure.v1')
    return `Historical pressure: enemy speed ×${tuning.enemySpeed.toFixed(2)}, craft speed ×${tuning.playerSpeed.toFixed(2)}.`;
  return (
    `Reference-paced targets: craft ${(REFERENCE_MOTION_RATES.craft * tuning.playerSpeed).toFixed(3)}, field enemies ${(REFERENCE_MOTION_RATES.fieldKeeper * tuning.enemySpeed).toFixed(3)}, boundary patrols ${(REFERENCE_MOTION_RATES.boundaryPatrol * tuning.enemySpeed).toFixed(3)} short-fields/s (runtime caps apply). ` +
    `${tuning.enemyDensity ? `Target +${Math.round(tuning.enemyDensity * 100)}% field keepers, rounded up where safe` : 'Authored enemy counts'}. Other threat roles keep their authored difficulty pressure.`
  );
}

const difficultyCodes = Object.freeze({ gentle: 'g', standard: 's', expert: 'e' });
function overrideBits(overrides) {
  const view = new DataView(new ArrayBuffer(24));
  fields.forEach((key, index) => view.setFloat64(index * 8, overrides[key]));
  return [...new Uint8Array(view.buffer)]
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('');
}

/** Recipe recovery is metadata, NOT authority. A save loader must reconstruct
 * from its installed original and compare the entire tuned level before adopt.
 * The 70-character revision preserves exact floating-point overrides. */
export function recoverGameplayTuning(level) {
  const previous = historical.recoverGameplayTuning(level);
  if (previous) return previous;
  const match =
    typeof level?.revision === 'string' &&
    /^gp2([gse])-([a-f0-9]{48})-([a-f0-9]{16})$/.exec(level.revision);
  if (!match) return null;
  try {
    const bytes = Uint8Array.from(match[2].match(/../g), (byte) => Number.parseInt(byte, 16));
    const view = new DataView(bytes.buffer);
    return resolveGameplayTuning(
      Object.keys(difficultyCodes).find((key) => difficultyCodes[key] === match[1]),
      Object.fromEntries(fields.map((key, index) => [key, view.getFloat64(index * 8)])),
    );
  } catch {
    return null;
  }
}

/** Browser-global preference only. Failed storage is explicit session-only state;
 * it does not prevent play or pretend the setting survived a reload. */
export function createGameplayTuningController({ storage, eventTarget } = {}) {
  let backend = storage,
    overrides = GAMEPLAY_TUNING_DEFAULTS,
    durable = false,
    error = null,
    disposed = false;
  const listeners = new Set();
  const fail = (reason) => {
    durable = false;
    error = `Gameplay tuning is session-only: ${reason?.message || 'browser storage is unavailable'}.`;
  };
  const read = (raw) => {
    if (raw === null) return GAMEPLAY_TUNING_DEFAULTS;
    const saved = copySmall(raw);
    exactKeys(saved, ['version', 'overrides'], 'saved gameplay tuning');
    required(saved.version === PREFERENCE_VERSION, 'Unsupported saved gameplay tuning.');
    return checkedOverrides(saved.overrides);
  };
  try {
    if (backend === undefined) backend = globalThis.localStorage;
    required(
      backend && typeof backend.getItem === 'function' && typeof backend.setItem === 'function',
      'browser storage is unavailable',
    );
    overrides = read(backend.getItem(GAMEPLAY_TUNING_STORAGE_KEY));
    durable = true;
  } catch (reason) {
    fail(reason);
  }
  const status = () => Object.freeze({ durable, error, overrides });
  const emit = () => {
    for (const listener of [...listeners]) {
      try {
        listener(status());
      } catch {
        /* Observers do not own preferences. */
      }
    }
  };
  const set = (patch) => {
    required(!disposed, 'Gameplay tuning controller is disposed.');
    // Validate the patch itself before spreading, so no accessor is invoked.
    const checked = copySmall(patch);
    exactKeys(checked, fields, 'gameplay tuning overrides');
    overrides = checkedOverrides({ ...overrides, ...checked });
    try {
      required(backend && typeof backend.setItem === 'function', 'browser storage is unavailable');
      backend.setItem(
        GAMEPLAY_TUNING_STORAGE_KEY,
        JSON.stringify({ version: PREFERENCE_VERSION, overrides }),
      );
      durable = true;
      error = null;
    } catch (reason) {
      fail(reason);
    }
    emit();
    return status();
  };
  const onStorage = (event) => {
    if (
      disposed ||
      (event.key !== GAMEPLAY_TUNING_STORAGE_KEY && event.key !== null) ||
      (event.storageArea && event.storageArea !== backend)
    )
      return;
    try {
      overrides = read(event.key === null ? null : event.newValue);
      durable = true;
      error = null;
    } catch (reason) {
      fail(reason);
    }
    emit();
  };
  const target = eventTarget ?? globalThis.window;
  target?.addEventListener?.('storage', onStorage);
  return Object.freeze({
    snapshot: (difficulty = 'standard') => resolveGameplayTuning(difficulty, overrides),
    set,
    reset: () => set(GAMEPLAY_TUNING_DEFAULTS),
    status,
    subscribe(listener) {
      required(!disposed && typeof listener === 'function', 'Gameplay tuning needs a listener.');
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    dispose() {
      disposed = true;
      target?.removeEventListener?.('storage', onStorage);
      listeners.clear();
    },
  });
}

function gridFor(level, team) {
  if (team && isJourneyTeamLevel(level)) return compileCoopFoundationGeometry(level).cells;
  if (!team && level.foundations) return foundationGeometry(level).cells;
  const cells = new Uint8Array(level.width * level.height);
  for (let y = 0; y < level.height; y++)
    for (let x = 0; x < level.width; x++)
      if (!x || !y || x === level.width - 1 || y === level.height - 1)
        cells[y * level.width + x] = 1;
  for (const [rects, kind] of [
    [level.safeRects ?? [], 1],
    [level.walls ?? [], 2],
  ])
    for (const rect of rects)
      for (let y = rect.y; y < rect.y + rect.h; y++)
        for (let x = rect.x; x < rect.x + rect.w; x++) cells[y * level.width + x] = kind;
  return cells;
}

function components(cells, width, height) {
  const labels = new Int32Array(cells.length).fill(-1);
  let nextLabel = 0;
  for (let start = 0; start < cells.length; start++) {
    if (cells[start] !== 0 || labels[start] !== -1) continue;
    const queue = [start];
    labels[start] = nextLabel;
    for (let head = 0; head < queue.length; head++) {
      const index = queue[head],
        x = index % width,
        y = Math.floor(index / width);
      for (const next of [
        y ? index - width : -1,
        x < width - 1 ? index + 1 : -1,
        y < height - 1 ? index + width : -1,
        x ? index - 1 : -1,
      ]) {
        if (next < 0 || cells[next] !== 0 || labels[next] !== -1) continue;
        labels[next] = nextLabel;
        queue.push(next);
      }
    }
    nextLabel++;
  }
  return labels;
}

function addKeepers(level, tuning, team) {
  // Boss isolation and zero-keeper puzzles must retain their authored contract.
  if (level.encounter && !team) return;
  const originals = level.enemies.filter(
    (enemy) => enemy.type === (team ? 'drifter' : 'bouncer') && Math.hypot(enemy.vx, enemy.vy) > 0,
  );
  const count = Math.min(
    6,
    (team ? 16 : 24) - level.enemies.length,
    Math.ceil(originals.length * tuning.enemyDensity),
  );
  if (!originals.length || count <= 0) return;
  const cells = gridFor(level, team),
    labels = components(cells, level.width, level.height);
  const at = (point) => Math.floor(point.y) * level.width + Math.floor(point.x);
  const spawns = team ? level.spawns : [level.spawn];
  const occupied = [
    ...level.enemies,
    ...(level.classic?.combatPatrols?.actors ?? []),
    ...(level.objectives ?? []),
    ...(level.classic?.powerups ?? []),
    ...(level.supplies ?? []),
    ...(level.strongholds ?? []).flatMap((hold) => [hold.core, ...hold.anchors]),
  ].filter((point) => Number.isFinite(point.x) && Number.isFinite(point.y));
  const identifiers = new Set();
  const collectIds = (value) => {
    if (!value || typeof value !== 'object') return;
    if (typeof value.id === 'string') identifiers.add(value.id);
    Object.values(value).forEach(collectIds);
  };
  collectIds(level);
  for (let n = 0; n < count; n++) {
    let best = null;
    // Prefer each authored keeper in turn, but safely allow another occupied
    // component when the preferred one has no spawn-clear position.
    for (let offset = 0; offset < originals.length && !best; offset++) {
      const template = originals[(n + offset) % originals.length];
      const component = labels[at(template)];
      if (component < 0) continue;
      const clearance = Math.max(8, Math.hypot(template.vx, template.vy) * 1.2);
      for (let y = 2; y < level.height - 2; y++)
        for (let x = 2; x < level.width - 2; x++) {
          const index = y * level.width + x;
          if (labels[index] !== component) continue;
          // A full 3x3 field footprint leaves room for the first departure;
          // authored narrow passages remain passages, not new ambush points.
          if (
            [-1, 0, 1].some((dy) =>
              [-1, 0, 1].some((dx) => cells[index + dy * level.width + dx] !== 0),
            )
          )
            continue;
          const point = { x: x + 0.5, y: y + 0.5 };
          if (spawns.some((spawn) => Math.hypot(point.x - spawn.x, point.y - spawn.y) < clearance))
            continue;
          const distance = Math.min(
            ...occupied.map((actor) => Math.hypot(point.x - actor.x, point.y - actor.y)),
          );
          if (distance < 3 || (best && distance <= best.distance)) continue;
          best = { ...point, distance, template };
        }
    }
    if (!best) break; // A skipped addition is safer than overlap or a new field anchor.
    let serial = n + 1,
      id;
    do {
      id = `pressure-extra-${serial++}`;
    } while (identifiers.has(id));
    identifiers.add(id);
    const enemy = {
      ...best.template,
      id,
      x: best.x,
      y: best.y,
      vx: n % 2 ? -best.template.vx : best.template.vy,
      vy: n % 2 ? best.template.vy : -best.template.vx,
    };
    level.enemies.push(enemy);
    // Preserve the source keeper's explicitly selected trail-impact contract.
    // Extra plain keepers do not silently gain pursuit/intercept behavior.
    const impact = level.classic?.lineImpact;
    if (impact?.version === 'line-impact.v2' && impact.actorIds.includes(best.template.id))
      impact.actorIds.push(id);
    occupied.push(enemy);
  }
}

/** Explicit runtime adaptation, never an ambient replay-engine policy. A restore
 * may reconstruct from its installed authored source plus the recovered recipe,
 * but must compare the entire result to the verified saved level before adopt.
 * The level embeds every change for recorder and paired-board determinism. */
export function applyGameplayTuning(source, snapshot) {
  const tuning = validateGameplayTuning(snapshot);
  const owned = boundedJSON(source);
  required(
    !/^gp[12][gse]-/.test(String(owned?.revision)),
    'Gameplay tuning must apply exactly once per attempt.',
  );
  if (tuning.version === 'gameplay-pressure.v1')
    return historical.applyGameplayTuning(owned, tuning);
  const team =
    typeof owned?.version === 'string' && owned.version.startsWith('revealline-coop-level.');
  const level = team ? owned : normalizedLevel(owned);
  if (team) {
    const validation = validateCoopLevel(level);
    required(validation.valid, `Invalid Team tuning source: ${validation.errors.join(' ')}`);
    required(
      !isJourneyTeamLevel(level) || level.journeyDifficulty === tuning.difficulty,
      'Tuning difficulty must match the compiled Team edition.',
    );
  }
  const sourceIdentity = dataIdentity(level);
  const shortField = Math.min(level.width - 2, level.height - 2);
  const unmeasuredSpeed = historical.resolveGameplayTuning(
    tuning.difficulty,
    tuning.overrides,
  ).enemySpeed;
  level.rules = {
    ...level.rules,
    moveSpeed: clamp(shortField * REFERENCE_MOTION_RATES.craft * tuning.playerSpeed, 1, 20),
  };
  for (const enemy of level.enemies) {
    if (Number.isFinite(enemy.vx) && Number.isFinite(enemy.vy)) {
      const magnitude = Math.hypot(enemy.vx, enemy.vy);
      // Arbitrary valid vector angles can otherwise round to more than 20 and
      // fail the strict Team cap. Keep a sub-nanocell numerical margin.
      const keeper = enemy.type === (team ? 'drifter' : 'bouncer');
      const target = keeper
        ? shortField * REFERENCE_MOTION_RATES.fieldKeeper * tuning.enemySpeed
        : magnitude * unmeasuredSpeed;
      const factor = magnitude ? Math.min(target, 20 - 1e-9) / magnitude : 1;
      enemy.vx *= factor;
      enemy.vy *= factor;
    }
    if (['border-patrol', 'contour-patrol'].includes(enemy.type))
      enemy.speed =
        (enemy.speed ?? 4) === 0
          ? 0
          : clamp(shortField * REFERENCE_MOTION_RATES.boundaryPatrol * tuning.enemySpeed, 0, 15);
    if (enemy.type === 'lane-boss') {
      const warning = enemy.warningSeconds ?? 1.5,
        active = enemy.activeSeconds ?? 0.7;
      enemy.period =
        warning +
        active +
        clamp(
          ((enemy.period ?? 6) - warning - active) / unmeasuredSpeed,
          0.25,
          60 - warning - active,
        );
    }
  }
  if (!team && level.encounter)
    level.encounter.shielded.restTicks = clamp(
      Math.round(level.encounter.shielded.restTicks / unmeasuredSpeed),
      1,
      7200,
    );
  if (team && level.enemies.some((enemy) => enemy.type === 'hunter'))
    level.encounter = {
      ...level.encounter,
      hunterAttackSpeed: clamp((level.encounter?.hunterAttackSpeed ?? 8) * unmeasuredSpeed, 6, 14),
    };
  for (const actor of level.classic?.combatPatrols?.actors ?? []) {
    actor.speed = clamp(actor.speed * unmeasuredSpeed, 0.25, 8);
    if (actor.role === 'sentry') actor.shotSpeed = clamp(actor.shotSpeed * unmeasuredSpeed, 4, 12);
  }
  if (level.classic?.lineImpact)
    level.classic.lineImpact.speed = clamp(level.classic.lineImpact.speed * unmeasuredSpeed, 4, 60);
  addKeepers(level, tuning, team);
  level.revision = `gp2${difficultyCodes[tuning.difficulty]}-${overrideBits(tuning.overrides)}-${dataIdentity({ sourceIdentity, tuning })}`;
  if (team) {
    const validation = validateCoopLevel(level);
    required(validation.valid, `Invalid tuned Team level: ${validation.errors.join(' ')}`);
    return freeze(level);
  }
  return freeze(normalizedLevel(level));
}
