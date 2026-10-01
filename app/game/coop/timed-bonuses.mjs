import { boundedJSON, required, plainObject } from '../data-json.mjs';
import {
  TIMED_BONUS_TRAIL_VERSION,
  validateTimedBonuses,
  createTimedBonusState,
  updateTimedBonuses,
  collectTimedBonus,
} from '../core/timed-bonuses.mjs';
import { CLASSIC_EFFECTS, CLASSIC_EFFECT_FACTORS } from '../core/classic-state.mjs';
import { EPS, movingCirclesTime } from '../core/geometry.mjs';
import { hasTeamBonusOpportunity } from './bonus-opportunity.mjs';

/** Validate an owned schedule using the same bounds/anchor contract as Solo.
 * Copy first: the shared validator must never receive untrusted accessors. */
export function validateCoopTimedBonuses(level, geometry) {
  if (!Object.hasOwn(level, 'timedBonuses')) return;
  required(
    plainObject(level.timedBonuses),
    'Team timed bonuses must be a plain descriptor object.',
  );
  const definition = boundedJSON(level.timedBonuses, {
    maxBytes: 32768,
    maxNodes: 2048,
    maxDepth: 6,
  });
  required(
    definition.version === TIMED_BONUS_TRAIL_VERSION,
    'Team requires trail-aware timed bonuses v2.',
  );
  const ids = new Set(level.enemies.map((enemy) => enemy.id));
  validateTimedBonuses(
    { ...level, classic: { timedBonuses: definition } },
    {
      identity(item) {
        required(!ids.has(item.id), 'Team bonus IDs must be unique across actors and schedules.');
        ids.add(item.id);
      },
      walls: Uint8Array.from(geometry.cells, (cell) => Number(cell === 2)),
      terrain: geometry.terrain,
      powerupCells: [],
      geometry,
    },
  );
}

export function createCoopBonusState(definition) {
  const inactive = () => ({ from: 0, until: 0 });
  return {
    version: 'team-bonus-state.v1',
    timed: createTimedBonusState(definition),
    items: [],
    lastDamageTime: [null, null],
    effects: {
      'player-speed': [inactive(), inactive()],
      'enemy-slow': inactive(),
      'enemy-freeze': inactive(),
    },
  };
}

function scheduleAdapter(run) {
  return {
    level: { classic: { timedBonuses: run.level.timedBonuses } },
    width: run.width,
    height: run.height,
    cells: run.cells,
    status: run.status,
    tick: run.tick,
    time: run.time,
    seed: run.seed,
    events: run.events,
    classic: { timedBonuses: run.bonuses.timed, powerups: run.bonuses.items, terrain: run.terrain },
  };
}

export function updateCoopTimedBonuses(run) {
  if (!run.bonuses) return;
  const adapter = scheduleAdapter(run);
  updateTimedBonuses(adapter, (_, definition, anchor) =>
    hasTeamBonusOpportunity(run, definition, anchor, adapter.classic.powerups),
  );
  run.bonuses.items = adapter.classic.powerups;
}

export function coopBonusActive(run, kind, player = null) {
  const effect =
    kind === 'player-speed' ? run.bonuses?.effects[kind][player] : run.bonuses?.effects[kind];
  return !!effect && run.tick >= effect.from && run.tick < effect.until;
}

export function coopBonusPlayerFactor(run, player) {
  return coopBonusActive(run, 'player-speed', player.id)
    ? CLASSIC_EFFECT_FACTORS['player-speed']
    : 1;
}

/** Support already scales stored velocity. Apply only the remaining factor so
 * slow effects do not multiply, while reflections retain the authored heading. */
export function coopBonusEnemyFactor(run, enemy) {
  if (coopBonusActive(run, 'enemy-freeze')) return 0;
  if (!coopBonusActive(run, 'enemy-slow')) return 1;
  const support = enemy.speedScale ?? 1;
  return support > 0 ? Math.min(support, CLASSIC_EFFECT_FACTORS['enemy-slow']) / support : 0;
}

export function clearCoopPlayerBonus(run, player) {
  if (run.bonuses) {
    run.bonuses.effects['player-speed'][player.id] = { from: 0, until: 0 };
    run.bonuses.lastDamageTime[player.id] = run.time;
  }
}

export function planCoopBonusContacts(run, velocities, horizon) {
  const contacts = [];
  for (const item of run.bonuses?.items ?? [])
    for (const player of run.players) {
      if (player.status !== 'active') continue;
      const velocity = velocities[player.id];
      const fraction = movingCirclesTime(
        player,
        { x: player.x + velocity.x * horizon, y: player.y + velocity.y * horizon },
        item,
        item,
        player.radius + 0.45,
      );
      if (fraction !== null && !(fraction * horizon <= EPS && damagedNow(run, player.id)))
        contacts.push({ time: fraction * horizon, player: player.id, item });
    }
  return contacts.sort(
    (a, b) =>
      a.time - b.time ||
      (a.item.id < b.item.id ? -1 : a.item.id > b.item.id ? 1 : 0) ||
      a.player - b.player,
  );
}

// Capture may revive a just-hit pilot inside the same zero-time event instant.
// That revival cannot retrospectively make the pilot an eligible collector.
function damagedNow(run, player) {
  const time = run.bonuses?.lastDamageTime[player];
  return time !== null && time !== undefined && Math.abs(time - run.time) <= EPS;
}

/** Called after all tied damage but before any capture-triggered revival. */
export function collectCoopBonuses(run, contacts, elapsed, emit) {
  if (!run.bonuses) return;
  const due = contacts.filter(
    (hit) =>
      hit.time <= elapsed + EPS &&
      run.players[hit.player].status === 'active' &&
      !damagedNow(run, hit.player),
  );
  const ids = [...new Set(due.map((hit) => hit.item.id))].sort();
  for (const id of ids) {
    const item = run.bonuses.items.find((candidate) => candidate.id === id);
    if (!item) continue;
    const collectors = [
      ...new Set(due.filter((hit) => hit.item.id === id).map((hit) => hit.player)),
    ].sort();
    let gain = null,
      activationTick = null,
      untilTick = null;
    if (item.kind === 'extra-life') {
      gain = Number(run.team.reserves < 8);
      run.team.reserves += gain;
    } else {
      activationTick = run.tick + 1;
      const effects =
        item.kind === 'player-speed'
          ? collectors.map((player) => run.bonuses.effects[item.kind][player])
          : [run.bonuses.effects[item.kind]];
      for (const effect of effects) {
        if (!(run.tick >= effect.from && run.tick < effect.until)) effect.from = activationTick;
        effect.until = Math.max(effect.until, activationTick + CLASSIC_EFFECTS[item.kind]);
        untilTick = effect.until;
      }
    }
    item.collectedTick = run.tick;
    const adapter = scheduleAdapter(run);
    collectTimedBonus(adapter, item);
    run.bonuses.items = adapter.classic.powerups;
    emit(run, 'powerup.collected', {
      id,
      kind: item.kind,
      players: collectors,
      gain,
      activationTick,
      untilTick,
    });
  }
}
