import { t, formatNumber } from '../i18n/index.mjs';
import { boundedJSON, exactKeys, required, stableId } from '../data-json.mjs';
import { validateTimedBonuses, TIMED_BONUS_TRAIL_VERSION } from '../core/timed-bonuses.mjs';
import {
  COOP_BONUS_LEVEL_VERSION,
  COOP_BONUS_RULESET,
  COOP_IMPACT_LEVEL_VERSION,
  COOP_IMPACT_RULESET,
} from '../coop/foundations.mjs';
import { drawClassicPickups } from '../ui/classic-view.mjs';
import { CLASSIC_EFFECTS } from '../core/classic-state.mjs';

const labels = Object.freeze({
  'extra-life': 'interface:sharedReserve',
  'player-speed': 'interface:pilotSpeed',
  'enemy-slow': 'interface:enemiesSlow',
  'enemy-freeze': 'interface:enemiesFrozen',
});
const bonusLabel = (kind, seat = null) =>
  seat === null ? t(labels[kind]) : t('gameplay:team.bonusPilotSpeed', { seat: seat + 1 });
const integer = (n) => Number.isSafeInteger(n) && n >= 0;
function own(object, key) {
  const property = Object.getOwnPropertyDescriptor(object, key);
  if (!property) return undefined;
  required(
    Object.hasOwn(property, 'value') && property.enumerable,
    t('interface:teamBonusViewRefusesAccessorsOrHiddenFields'),
  );
  return property.value;
}
const frozen = (value) => {
  if (value && typeof value === 'object') {
    Object.values(value).forEach(frozen);
    Object.freeze(value);
  }
  return value;
};

/** Small owned, bounded projection. Rendering never changes schedule time or
 * repairs malformed runtime state; unknown editions fail closed. */
export function coopBonusView(run) {
  const state = own(run, 'bonuses'),
    level = own(run, 'level');
  const definition = own(level, 'timedBonuses');
  if (state === undefined && definition === undefined) return null;
  required(
    state !== undefined && definition !== undefined,
    t('interface:teamBonusDefinitionStateMismatch'),
  );
  required(
    ((own(run, 'ruleset') === COOP_BONUS_RULESET &&
      own(level, 'version') === COOP_BONUS_LEVEL_VERSION) ||
      (own(run, 'ruleset') === COOP_IMPACT_RULESET &&
        own(level, 'version') === COOP_IMPACT_LEVEL_VERSION)) &&
      own(run, 'width') === 72 &&
      own(run, 'height') === 36,
    t('interface:unsupportedTeamBonusRuntime'),
  );
  const { recipe, data } = boundedJSON(
    { recipe: definition, data: state },
    { maxBytes: 65536, maxNodes: 4096, maxDepth: 8 },
  );
  required(
    recipe.version === TIMED_BONUS_TRAIL_VERSION,
    t('interface:unsupportedTeamBonusDescriptor'),
  );
  const ids = new Set(),
    empty = new Uint8Array(72 * 36);
  validateTimedBonuses(
    { width: 72, height: 36, classic: { timedBonuses: recipe } },
    {
      identity(item) {
        required(!ids.has(item.id), t('interface:duplicateTeamSchedule'));
        ids.add(item.id);
      },
      walls: empty,
      terrain: empty,
      powerupCells: [],
    },
  );
  exactKeys(
    data,
    ['version', 'timed', 'items', 'effects', 'lastDamageTime'],
    t('interface:teamBonusState'),
  );
  required(data.version === 'team-bonus-state.v1', t('interface:unsupportedTeamBonusState'));
  const tick = own(run, 'tick'),
    time = own(run, 'time'),
    status = own(run, 'status');
  required(
    integer(tick) &&
      Number.isFinite(time) &&
      time >= 0 &&
      ['ready', 'running', 'paused', 'won', 'lost'].includes(status),
    t('interface:invalidTeamBonusClockStatus'),
  );
  required(
    Array.isArray(data.lastDamageTime) &&
      data.lastDamageTime.length === 2 &&
      data.lastDamageTime.every(
        (n) => n === null || (Number.isFinite(n) && n >= 0 && n <= time + 1e-9),
      ),
    t('interface:invalidTeamDamageInstants'),
  );
  exactKeys(data.timed, ['version', 'clock', 'schedules'], t('interface:teamScheduleState'));
  required(
    data.timed.version === 'timed-bonus-state.v1' &&
      integer(data.timed.clock) &&
      data.timed.clock <= tick,
    t('interface:invalidTeamScheduleClock'),
  );
  required(
    Array.isArray(data.timed.schedules) &&
      data.timed.schedules.length === recipe.schedules.length &&
      Array.isArray(data.items) &&
      data.items.length <= 8,
    t('interface:invalidTeamScheduleItemCounts'),
  );
  const items = new Map();
  for (const item of data.items) {
    exactKeys(item, ['id', 'kind', 'x', 'y', 'collectedTick'], t('interface:teamPickup'));
    required(
      stableId(item.id) && !items.has(item.id) && item.collectedTick === null,
      t('interface:invalidLiveTeamPickup'),
    );
    items.set(item.id, item);
  }
  const timedBonuses = [],
    powerups = [],
    seen = new Set();
  for (const schedule of data.timed.schedules) {
    exactKeys(
      schedule,
      ['id', 'phase', 'deadline', 'currentAnchor', 'previousAnchor', 'appearances', 'collections'],
      t('interface:teamSchedule'),
    );
    const authored = recipe.schedules.find((entry) => entry.id === schedule.id);
    required(authored && !seen.has(schedule.id), t('interface:invalidTeamScheduleIdentity'));
    seen.add(schedule.id);
    required(
      ['cooldown', 'announce', 'available', 'exhausted'].includes(schedule.phase),
      t('interface:invalidTeamSchedulePhase'),
    );
    required(
      integer(schedule.appearances) &&
        schedule.appearances <= authored.maxAppearances &&
        integer(schedule.collections) &&
        schedule.collections <= authored.maxCollections &&
        schedule.collections <= schedule.appearances,
      t('interface:invalidTeamGrantCounters'),
    );
    const anchorIndex = (n) => integer(n) && n < authored.anchors.length;
    required(
      schedule.previousAnchor === null || anchorIndex(schedule.previousAnchor),
      t('interface:invalidPriorTeamAnchor'),
    );
    if (!['announce', 'available'].includes(schedule.phase)) {
      required(
        schedule.currentAnchor === null &&
          !items.has(schedule.id) &&
          (schedule.phase === 'exhausted'
            ? schedule.deadline === null
            : integer(schedule.deadline)),
        t('interface:invalidInactiveTeamSchedule'),
      );
      continue;
    }
    const duration =
      authored[schedule.phase === 'announce' ? 'announcementTicks' : 'availableTicks'];
    required(
      anchorIndex(schedule.currentAnchor) &&
        integer(schedule.deadline) &&
        schedule.deadline > data.timed.clock &&
        schedule.deadline - data.timed.clock <= duration,
      t('interface:invalidLiveTeamWindow'),
    );
    const anchor = authored.anchors[schedule.currentAnchor],
      item = items.get(schedule.id);
    required(
      schedule.phase === 'available'
        ? item && item.kind === authored.kind && item.x === anchor.x && item.y === anchor.y
        : !item,
      t('interface:teamPickupDoesNotMatchItsWindow'),
    );
    const visual = {
      id: schedule.id,
      kind: authored.kind,
      label: bonusLabel(authored.kind),
      ...anchor,
      timed: true,
      phase: schedule.phase,
      seconds: (schedule.deadline - data.timed.clock) / 120,
      remainingFraction: (schedule.deadline - data.timed.clock) / duration,
    };
    if (schedule.phase === 'available') {
      powerups.push(visual);
      items.delete(schedule.id);
    }
    timedBonuses.push(visual);
  }
  required(items.size === 0, t('interface:unownedTeamPickup'));
  exactKeys(
    data.effects,
    ['player-speed', 'enemy-slow', 'enemy-freeze'],
    t('interface:teamEffects'),
  );
  required(
    Array.isArray(data.effects['player-speed']) && data.effects['player-speed'].length === 2,
    t('interface:invalidTeamPilotEffects'),
  );
  const effects = [];
  for (const [kind, seat, effect] of [
    ...data.effects['player-speed'].map((effect, seat) => ['player-speed', seat, effect]),
    ['enemy-slow', null, data.effects['enemy-slow']],
    ['enemy-freeze', null, data.effects['enemy-freeze']],
  ]) {
    exactKeys(effect, ['from', 'until'], t('interface:teamEffect'));
    required(
      integer(effect.from) &&
        integer(effect.until) &&
        effect.until >= effect.from &&
        effect.from <= tick + 1 &&
        effect.until <= tick + 1 + CLASSIC_EFFECTS[kind],
      t('interface:invalidTeamEffectWindow'),
    );
    if (tick >= effect.from && tick < effect.until)
      effects.push({
        kind,
        seat,
        label: bonusLabel(kind, seat),
        seconds: (effect.until - tick) / 120,
      });
  }
  const terminal = ['won', 'lost'].includes(status);
  return frozen({
    powerups: terminal ? [] : powerups,
    timedBonuses: terminal ? [] : timedBonuses,
    effects: terminal ? [] : effects,
    erosion: [],
  });
}

export function drawCoopBonuses(ctx, view, { screenScale = 1 } = {}) {
  if (!view) return;
  ctx.save();
  try {
    ctx.scale(1 / 16, 1 / 16);
    drawClassicPickups(ctx, view, { danger: '#ff815c' }, {}, { screenScale });
  } finally {
    ctx.restore();
  }
}

export function coopBonusDetails(view) {
  if (!view) return '';
  const windows = view.timedBonuses.map((item) =>
    t(item.phase === 'announce' ? 'gameplay:team.bonusArrives' : 'gameplay:team.bonusExpires', {
      label: bonusLabel(item.kind),
      seconds: formatNumber(item.seconds, { minimumFractionDigits: 1, maximumFractionDigits: 1 }),
    }),
  );
  const effects = view.effects.map((effect) =>
    t('gameplay:team.bonusActive', {
      label: bonusLabel(effect.kind, effect.seat),
      seconds: formatNumber(effect.seconds, { minimumFractionDigits: 1, maximumFractionDigits: 1 }),
    }),
  );
  return [...windows, ...effects].join(' · ');
}

export function coopBonusLive(view) {
  if (!view) return '';
  const effects = view.effects.map((effect) =>
    t('gameplay:team.bonusSeconds', {
      label: bonusLabel(effect.kind, effect.seat),
      seconds: formatNumber(Math.ceil(effect.seconds)),
    }),
  );
  const count = view.powerups.length;
  if (count) effects.unshift(t('gameplay:team.bonusAvailable', { count }));
  else if (view.timedBonuses.length) effects.unshift(t('interface:pickupIncoming'));
  return effects.join(' · ');
}

export const teamBonusHelp = () =>
  t('interface:optionalSharedPickupsHollowSymbolsAnnounceTouchASolidSymbol');

export function coopBonusCaption(event, names) {
  if (event.type === 'powerup.collected') {
    const owner = event.players.map((seat) => names[seat]).join(' + ');
    return event.kind === 'extra-life'
      ? t(event.gain ? 'gameplay:team.bonusReserveGained' : 'gameplay:team.bonusReservesFull', {
          owner,
        })
      : t(
          event.kind === 'player-speed'
            ? 'gameplay:team.bonusCollectedSpeed'
            : event.kind === 'enemy-slow'
              ? 'gameplay:team.bonusCollectedSlow'
              : 'gameplay:team.bonusCollectedFreeze',
          { owner },
        );
  }
  if (event.type === 'bonus.announced')
    return t('gameplay:team.bonusAnnounced', { label: bonusLabel(event.kind) });
  if (event.type === 'bonus.appeared')
    return t('gameplay:team.bonusAppeared', { label: bonusLabel(event.kind) });
  if (event.type === 'bonus.expired')
    return t('gameplay:team.bonusExpired', { label: bonusLabel(event.kind) });
  if (event.type === 'bonus.cancelled')
    return t('interface:pickupWindowCancelledItsAnchorIsNoLongerEligible');
  return null;
}
