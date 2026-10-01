import { exactKeys, required, stableId } from '../data-json.mjs';
import { CELL, FIXED_DT } from './registry.mjs';
import { hasBonusOpportunity } from './bonus-opportunity.mjs';

export const TIMED_BONUS_VERSION = 'timed-bonuses.v1';
export const TIMED_BONUS_TRAIL_VERSION = 'timed-bonuses.v2';
export const TIMED_BONUS_VERSIONS = Object.freeze([TIMED_BONUS_VERSION, TIMED_BONUS_TRAIL_VERSION]);
export const TIMED_BONUS_KINDS = Object.freeze([
  'extra-life',
  'player-speed',
  'enemy-slow',
  'enemy-freeze',
]);
const fields = [
  'id',
  'kind',
  'anchors',
  'initialDelayTicks',
  'announcementTicks',
  'availableTicks',
  'cooldownTicks',
  'maxAppearances',
  'maxCollections',
];
const integer = (n, min, max) => Number.isInteger(n) && n >= min && n <= max;
const indexOf = (point, width) => Math.floor(point.y) * width + Math.floor(point.x);

/** Called only after the runtime boundary has made an owned bounded JSON copy. */
export function validateTimedBonuses(level, { identity, walls, terrain, powerupCells, geometry }) {
  if (!Object.hasOwn(level.classic, 'timedBonuses')) return;
  const definition = level.classic.timedBonuses;
  exactKeys(definition, ['version', 'schedules'], 'timed bonuses');
  required(TIMED_BONUS_VERSIONS.includes(definition.version), 'Unsupported timed bonus version.');
  required(
    Array.isArray(definition.schedules) &&
      definition.schedules.length >= 1 &&
      definition.schedules.length <= 8,
    'Timed bonuses need 1..8 schedules.',
  );
  const occupied = new Set(powerupCells);
  for (const schedule of definition.schedules) {
    exactKeys(schedule, fields, 'timed bonus schedule');
    required(
      fields.every((key) => Object.hasOwn(schedule, key)),
      'Timed bonus fields are required.',
    );
    required(stableId(schedule.id), 'Timed bonus needs a stable ID.');
    identity(schedule);
    required(TIMED_BONUS_KINDS.includes(schedule.kind), 'Unsupported timed bonus kind.');
    for (const [key, min, max] of [
      ['initialDelayTicks', 0, 7200],
      ['announcementTicks', 120, 600],
      ['availableTicks', 240, 2400],
      ['cooldownTicks', 240, 7200],
      ['maxAppearances', 1, 12],
      ['maxCollections', 1, 3],
    ])
      required(
        integer(schedule[key], min, max),
        `Timed bonus ${key} must be ${min}..${max} integer ticks/counts.`,
      );
    required(
      schedule.maxCollections <= schedule.maxAppearances &&
        (schedule.kind !== 'extra-life' || schedule.maxCollections === 1),
      'Timed bonus collection cap exceeds its finite grant budget.',
    );
    required(
      Array.isArray(schedule.anchors) &&
        schedule.anchors.length >= 2 &&
        schedule.anchors.length <= 16,
      'Timed bonus needs 2..16 anchors.',
    );
    for (const anchor of schedule.anchors) {
      exactKeys(anchor, ['x', 'y'], 'timed bonus anchor');
      required(
        Number.isInteger(anchor.x - 0.5) &&
          Number.isInteger(anchor.y - 0.5) &&
          anchor.x >= 1.5 &&
          anchor.y >= 1.5 &&
          anchor.x <= level.width - 1.5 &&
          anchor.y <= level.height - 1.5,
        'Timed bonus anchors need interior cell centres.',
      );
      const index = indexOf(anchor, level.width);
      required(
        !walls[index] &&
          terrain[index] !== 2 &&
          !occupied.has(index) &&
          (!geometry || geometry.cells[index] === CELL.FIELD),
        'Timed bonus anchor is blocked, lethal, reclaimed or duplicated.',
      );
      occupied.add(index);
    }
  }
}

export function createTimedBonusState(definition) {
  return {
    version: 'timed-bonus-state.v1',
    clock: 0,
    schedules: definition.schedules.map((schedule) => ({
      id: schedule.id,
      phase: 'cooldown',
      deadline: schedule.initialDelayTicks,
      currentAnchor: null,
      previousAnchor: null,
      appearances: 0,
      collections: 0,
    })),
  };
}

function offset(seed, id, length) {
  let hash = 2166136261;
  for (const char of `${seed}:${id}`) hash = Math.imul(hash ^ char.charCodeAt(0), 16777619) >>> 0;
  return hash % length;
}

/** Geometry-only opportunity check, never a prediction of moving enemy safety. */
function eligible(state, definition, anchor) {
  // V1 retains its historical comparison for exact old replay reconstruction.
  // Actual Solo trail entries are {x,y,index}, not numeric cell indices.
  const trail = new Set(
    state.level.classic.timedBonuses.version === TIMED_BONUS_TRAIL_VERSION
      ? state.trail.map((cell) => cell.index)
      : state.trail,
  );
  return hasBonusOpportunity(state, {
    anchor,
    trail,
    bodies: [{ ...state.player, radius: state.rules.playerRadius }, ...state.enemies],
    items: state.classic.powerups,
    starts: [indexOf(state.player, state.width)],
    maxDistance: Math.floor((definition.availableTicks * FIXED_DT * state.rules.moveSpeed) / 2),
    terrain: state.classic.terrain,
  });
}

function event(state, schedule, definition, type) {
  state.events.push({
    type,
    id: schedule.id,
    kind: definition.kind,
    tick: state.tick,
    time: state.time,
    ...(schedule.currentAnchor === null ? {} : definition.anchors[schedule.currentAnchor]),
  });
}
function rest(state, schedule, definition) {
  state.classic.powerups = state.classic.powerups.filter((item) => item.id !== schedule.id);
  schedule.currentAnchor = null;
  schedule.phase =
    schedule.appearances >= definition.maxAppearances ||
    schedule.collections >= definition.maxCollections
      ? 'exhausted'
      : 'cooldown';
  schedule.deadline =
    schedule.phase === 'exhausted'
      ? null
      : state.classic.timedBonuses.clock + definition.cooldownTicks;
}

export function cancelHazardousTimedBonuses(state) {
  const timed = state.classic.timedBonuses;
  if (!timed) return;
  for (const schedule of timed.schedules) {
    if (schedule.phase !== 'available') continue;
    const definition = state.level.classic.timedBonuses.schedules.find(
      (entry) => entry.id === schedule.id,
    );
    const index = indexOf(definition.anchors[schedule.currentAnchor], state.width);
    if (state.cells[index] === CELL.FIELD && state.classic.terrain[index] === 2) {
      event(state, schedule, definition, 'bonus.cancelled');
      rest(state, schedule, definition);
    }
  }
}

/** One call at the start of each active tick, before swept contact. Expiry wins
 * the expiry-tick boundary; recovery freezes this clock without refunding grants. */
export function updateTimedBonuses(state, opportunity = eligible) {
  const timed = state.classic.timedBonuses;
  if (!timed || state.status !== 'running') return;
  timed.clock++;
  cancelHazardousTimedBonuses(state);
  for (const schedule of timed.schedules) {
    if (schedule.phase === 'exhausted' || timed.clock < schedule.deadline) continue;
    const definition = state.level.classic.timedBonuses.schedules.find(
      (entry) => entry.id === schedule.id,
    );
    if (schedule.phase === 'available') {
      event(state, schedule, definition, 'bonus.expired');
      rest(state, schedule, definition);
    } else if (schedule.phase === 'announce') {
      if (!opportunity(state, definition, definition.anchors[schedule.currentAnchor])) {
        event(state, schedule, definition, 'bonus.cancelled');
        rest(state, schedule, definition);
        continue;
      }
      schedule.phase = 'available';
      schedule.deadline = timed.clock + definition.availableTicks;
      schedule.appearances++;
      schedule.previousAnchor = schedule.currentAnchor;
      state.classic.powerups.push({
        id: schedule.id,
        kind: definition.kind,
        ...definition.anchors[schedule.currentAnchor],
        collectedTick: null,
      });
      event(state, schedule, definition, 'bonus.appeared');
    } else {
      const start =
        schedule.previousAnchor === null
          ? offset(state.seed, schedule.id, definition.anchors.length)
          : (schedule.previousAnchor + 1) % definition.anchors.length;
      const index = Array.from(
        { length: definition.anchors.length },
        (_, n) => (start + n) % definition.anchors.length,
      ).find(
        (n) =>
          n !== schedule.previousAnchor && opportunity(state, definition, definition.anchors[n]),
      );
      if (index === undefined) {
        schedule.deadline = timed.clock + definition.cooldownTicks;
        continue;
      }
      schedule.currentAnchor = index;
      schedule.phase = 'announce';
      schedule.deadline = timed.clock + definition.announcementTicks;
      event(state, schedule, definition, 'bonus.announced');
    }
  }
}

export function collectTimedBonus(state, item) {
  const schedule = state.classic.timedBonuses?.schedules.find((entry) => entry.id === item.id);
  if (!schedule) return;
  const definition = state.level.classic.timedBonuses.schedules.find(
    (entry) => entry.id === item.id,
  );
  schedule.collections++;
  rest(state, schedule, definition);
}
