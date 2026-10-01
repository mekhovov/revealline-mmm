import { contentText } from '../i18n/content.mjs';
import { t } from '../i18n/index.mjs';
import { CELL, FIXED_DT } from '../core/registry.mjs';
import { TIMED_BONUS_VERSIONS } from '../core/timed-bonuses.mjs';
import {
  drawPresentedActor,
  drawTrailImpactFront,
  PRESENTATION_INK,
  PRESENTATION_PLATE,
} from './actor-presentation.mjs';
import { drawPresentationImage } from './presentation-draw-image.mjs';
import { traceContentActor } from '../content-design/actor-marker.mjs';
import { enemyCatalogRecord } from '../enemy-catalog.mjs';

const SIZE = 16;
const KINDS = ['extra-life', 'player-speed', 'enemy-slow', 'enemy-freeze'];
const LABELS = {
  get 'extra-life'() {
    return t('interface:life');
  },
  get 'player-speed'() {
    return t('interface:speed');
  },
  get 'enemy-slow'() {
    return t('interface:enemiesSlow');
  },
  get 'enemy-freeze'() {
    return t('interface:enemiesFrozen');
  },
};
const TYPES = [
  'bouncer',
  'border-patrol',
  'lane-boss',
  'relay-sentinel',
  'contour-patrol',
  'claimed-rover',
  'eroder',
];
const own = (value, key) => {
  if (!value || typeof value !== 'object')
    throw new TypeError(t('interface:expectedPresentationData'));
  const field = Object.getOwnPropertyDescriptor(value, key);
  if (!field) return undefined;
  if (!Object.hasOwn(field, 'value'))
    throw new TypeError(t('interface:presentationDataCannotContainGetters'));
  return field.value;
};
const check = (condition) => {
  if (!condition) throw new TypeError(t('interface:invalidClassicPresentation'));
};
const integer = (value) => Number.isSafeInteger(value) && value >= 0;
const typedLength = Object.getOwnPropertyDescriptor(
  Object.getPrototypeOf(Uint8Array.prototype),
  'length',
).get;
const dense = (value, max) => {
  check(Array.isArray(value) && value.length <= max);
  return Array.from({ length: value.length }, (_, i) => {
    const item = own(value, String(i));
    check(item !== undefined);
    return item;
  });
};
const freeze = (value) => {
  if (value && typeof value === 'object') {
    Object.values(value).forEach(freeze);
    Object.freeze(value);
  }
  return value;
};
const position = (value) => {
  const x = own(value, 'x'),
    y = own(value, 'y');
  check(Number.isFinite(x) && x >= 0 && x <= 72 && Number.isFinite(y) && y >= 0 && y <= 36);
  return { x, y };
};
const identity = (value) => {
  const id = own(value, 'id');
  check(typeof id === 'string' && id.length > 0 && id.length <= 80);
  return id;
};

/** A bounded owned projection. Missing/malformed guidance never changes gameplay. */
export function classicView(run) {
  try {
    if (own(run, 'ruleset') !== 'xonix-core.v5') return null;
    check(own(run, 'width') === 72 && own(run, 'height') === 36);
    const tick = own(run, 'tick'),
      time = own(run, 'time'),
      status = own(run, 'status');
    check(integer(tick) && Number.isFinite(time) && time >= 0);
    check(['running', 'respawning', 'won', 'lost'].includes(status));
    const state = own(run, 'classic'),
      actorTick = own(state, 'actorTick'),
      actorTime = own(state, 'actorTime');
    check(
      own(state, 'version') === 'classic-state.v1' &&
        integer(actorTick) &&
        Number.isFinite(actorTime) &&
        actorTime >= 0,
    );
    const cells = own(run, 'cells'),
      mask = own(state, 'terrain');
    check(
      Object.getPrototypeOf(cells) === Uint8Array.prototype &&
        Object.getPrototypeOf(mask) === Uint8Array.prototype,
    );
    check(typedLength.call(cells) === 2592 && typedLength.call(mask) === 2592);
    const terrain = [];
    for (let i = 0; i < 2592; i++) {
      check(cells[i] <= 2 && mask[i] <= 2);
      if (cells[i] === CELL.FIELD && mask[i])
        terrain.push({ x: i % 72, y: Math.floor(i / 72), kind: mask[i] === 1 ? 'slow' : 'lethal' });
    }
    const effects = [];
    for (const kind of KINDS.slice(1)) {
      const effect = own(own(state, 'effects'), kind),
        from = own(effect, 'from'),
        until = own(effect, 'until');
      check(integer(from) && integer(until) && until >= from);
      if (until <= tick || status === 'won' || status === 'lost') continue;
      effects.push({
        kind,
        label: LABELS[kind],
        phase: tick < from ? 'pending' : 'active',
        ticks: until - Math.max(tick, from),
        seconds: (until - Math.max(tick, from)) * FIXED_DT,
      });
    }
    const active = (kind) =>
      effects.some((effect) => effect.kind === kind && effect.phase === 'active');
    const powerups = [];
    for (const item of dense(
      own(state, 'powerups'),
      own(state, 'timedBonuses') === undefined ? 64 : 72,
    )) {
      const kind = own(item, 'kind'),
        collectedTick = own(item, 'collectedTick');
      check(
        KINDS.includes(kind) &&
          (collectedTick === null || (integer(collectedTick) && collectedTick <= tick)),
      );
      const id = identity(item),
        point = position(item);
      check(
        Number.isInteger(point.x - 0.5) &&
          point.x >= 0.5 &&
          point.x <= 71.5 &&
          Number.isInteger(point.y - 0.5) &&
          point.y >= 0.5 &&
          point.y <= 35.5,
      );
      if (collectedTick === null) powerups.push({ id, kind, label: LABELS[kind], ...point });
    }
    const lineImpacts = [];
    const impact = own(state, 'lineImpact');
    if (impact !== undefined) {
      check(own(impact, 'version') === 'line-impact-state.v1');
      for (const front of dense(own(impact, 'fronts'), 48)) {
        const id = identity(front),
          point = position(front),
          direction = own(front, 'direction');
        check(direction === -1 || direction === 1);
        lineImpacts.push({ id, ...point, direction });
      }
    }
    const level = own(run, 'level');
    const definition = level == null ? null : own(level, 'classic');
    const timedState = own(state, 'timedBonuses');
    const timedBonuses = [];
    if (timedState !== undefined) {
      check(own(timedState, 'version') === 'timed-bonus-state.v1');
      const clock = own(timedState, 'clock');
      check(integer(clock) && clock <= tick);
      const timedDefinition = own(definition, 'timedBonuses');
      check(TIMED_BONUS_VERSIONS.includes(own(timedDefinition, 'version')));
      const definitions = dense(own(timedDefinition, 'schedules'), 8);
      const schedules = dense(own(timedState, 'schedules'), 8);
      check(definitions.length > 0 && definitions.length === schedules.length);
      const ids = new Set();
      for (const schedule of schedules) {
        const id = identity(schedule),
          phase = own(schedule, 'phase');
        check(!ids.has(id) && ['cooldown', 'announce', 'available', 'exhausted'].includes(phase));
        ids.add(id);
        const recipe = definitions.find((entry) => identity(entry) === id);
        check(!!recipe);
        const kind = own(recipe, 'kind'),
          deadline = own(schedule, 'deadline');
        check(
          KINDS.includes(kind) && (phase === 'exhausted' ? deadline === null : integer(deadline)),
        );
        const current = own(schedule, 'currentAnchor');
        if (!['announce', 'available'].includes(phase)) {
          check(current === null);
          continue;
        }
        const anchors = dense(own(recipe, 'anchors'), 16);
        check(integer(current) && current < anchors.length && deadline > clock);
        const point = position(anchors[current]);
        const duration = own(recipe, phase === 'announce' ? 'announcementTicks' : 'availableTicks');
        check(
          integer(duration) && duration > 0 && duration <= 2400 && deadline - clock <= duration,
        );
        const visual = {
          id,
          kind,
          label: LABELS[kind],
          ...point,
          timed: true,
          phase,
          seconds: (deadline - clock) * FIXED_DT,
          remainingFraction: (deadline - clock) / duration,
        };
        const pickup = powerups.find((item) => item.id === id);
        if (phase === 'available') {
          check(!!pickup && pickup.kind === kind && pickup.x === point.x && pickup.y === point.y);
          Object.assign(pickup, visual);
        } else check(!pickup);
        if (!['won', 'lost'].includes(status)) timedBonuses.push(visual);
      }
      if (['won', 'lost'].includes(status))
        for (let i = powerups.length - 1; i >= 0; i--)
          if (ids.has(powerups[i].id)) powerups.splice(i, 1);
    }
    const impactDefinition = definition == null ? null : own(definition, 'lineImpact');
    const carrierIds = new Set();
    if (impactDefinition && own(impactDefinition, 'version') === 'line-impact.v2') {
      for (const id of dense(own(impactDefinition, 'actorIds'), 64)) {
        check(typeof id === 'string' && id.length > 0 && id.length <= 80 && !carrierIds.has(id));
        carrierIds.add(id);
      }
      check(carrierIds.size > 0);
    }
    const erosion = [];
    const enemies = dense(own(run, 'enemies'), 24).map((enemy) => {
      const id = identity(enemy),
        type = own(enemy, 'type'),
        point = position(enemy);
      check(TYPES.includes(type));
      const radius = own(enemy, 'radius');
      check(Number.isFinite(radius) && radius >= 0.05 && radius <= 0.45);
      const detail = own(enemy, 'classic');
      let mode = null,
        seconds = null;
      if (type === 'claimed-rover' || type === 'contour-patrol') {
        mode = own(detail, 'mode');
        check(
          (type === 'claimed-rover'
            ? ['dormant', 'warning', 'active']
            : ['patrolling', 'rejoining', 'idle']
          ).includes(mode),
        );
        if (mode === 'warning') {
          const at = own(detail, 'activationTick');
          check(integer(at));
          seconds = Math.max(0, at - actorTick) * FIXED_DT;
        }
      }
      if (type === 'eroder') {
        const target = own(detail, 'target');
        check(target === null || (integer(target) && target < 2592));
        if (target !== null) {
          const at = own(detail, 'erosionAt');
          check(integer(at));
          mode = 'warning';
          seconds = Math.max(0, at - actorTick) * FIXED_DT;
          if (cells[target] === CELL.SAFE)
            erosion.push({ id, x: target % 72, y: Math.floor(target / 72), seconds });
        }
      }
      const stunnedUntil = own(enemy, 'stunnedUntil') ?? 0,
        slowUntil = own(enemy, 'slowUntil') ?? 0;
      check(Number.isFinite(stunnedUntil) && Number.isFinite(slowUntil));
      const rawPressure = detail == null ? undefined : own(detail, 'pressure');
      let pressure;
      if (rawPressure !== undefined) {
        check(type === 'bouncer' && own(rawPressure, 'version') === 'enemy-pressure-state.v1');
        const recipe = dense(own(own(definition, 'enemyPressure'), 'actors'), 8).find(
          (entry) => identity(entry) === id,
        );
        const pressureMode = own(recipe, 'mode');
        check(['trail-pursuit', 'head-intercept'].includes(pressureMode));
        const phase = own(rawPressure, 'phase');
        check(['patrol', 'warning', 'committed', 'cooldown'].includes(phase));
        const rawTarget = own(rawPressure, 'target');
        check(rawTarget === null || ['warning', 'committed'].includes(phase));
        const target = rawTarget === null ? null : position(rawTarget);
        check(!['warning', 'committed'].includes(phase) || target !== null);
        const deadlineKey = {
          warning: 'warningUntil',
          committed: 'commitUntil',
          cooldown: 'cooldownUntil',
        }[phase];
        const deadline = deadlineKey ? own(rawPressure, deadlineKey) : null;
        check(deadline === null ? phase === 'patrol' : integer(deadline));
        pressure = {
          mode: pressureMode,
          phase,
          target,
          seconds: deadline === null ? 0 : Math.max(0, deadline - actorTick) * FIXED_DT,
        };
      }
      return {
        id,
        type,
        ...point,
        radius,
        mode,
        seconds,
        frozen: active('enemy-freeze'),
        stunned: stunnedUntil > time + 1e-8,
        slowed: !active('enemy-freeze') && (active('enemy-slow') || slowUntil > time + 1e-8),
        ...(pressure ? { pressure } : {}),
        ...(carrierIds.has(id) ? { impactCarrier: true } : {}),
      };
    });
    for (const id of carrierIds)
      check(enemies.some((enemy) => enemy.id === id && enemy.type === 'bouncer'));
    const roles = TYPES.flatMap((type) => {
      const label = enemyCatalogRecord(type).label.toLowerCase();
      const count = enemies.filter((enemy) => enemy.type === type && !enemy.impactCarrier).length;
      return count ? [`${count} ${label}${count === 1 ? '' : 's'}`] : [];
    });
    return freeze({
      actorTick,
      actorTime,
      lineImpacts,
      terrain,
      powerups,
      ...(timedState === undefined ? {} : { timedBonuses }),
      effects,
      enemies,
      erosion,
      summary: [
        ...roles,
        ...(carrierIds.size
          ? [`${carrierIds.size} trail-impact carrier${carrierIds.size === 1 ? '' : 's'}`]
          : []),
        ...(terrain.some((cell) => cell.kind === 'slow') ? ['Slow ground active'] : []),
        ...(terrain.some((cell) => cell.kind === 'lethal') ? ['Lethal ground active'] : []),
        ...(powerups.length
          ? [
              t('gameplay:contactPickup', {
                value1: powerups.length,
                value2: powerups.length === 1 ? '' : 's',
              }),
            ]
          : []),
        ...timedBonuses.map(
          (item) =>
            `${item.label} ${item.phase === 'announce' ? 'appears' : 'expires'} in ${item.seconds.toFixed(1)}s`,
        ),
        ...enemies
          .filter((enemy) => enemy.mode === 'warning')
          .map((enemy) =>
            t('gameplay:inS', {
              value1:
                enemy.type === 'eroder' ? t('interface:groundReopens') : t('interface:roverWakes'),
              value2: enemy.seconds.toFixed(1),
            }),
          ),
        ...effects.map(
          (effect) =>
            `${contentText(effect, 'label')}: ${effect.phase === 'pending' ? 'next tick' : `${effect.seconds.toFixed(1)}s`}`,
        ),
      ].join(' · '),
    });
  } catch {
    return null;
  }
}

const lines = (ctx, points) => {
  ctx.beginPath();
  for (const [a, b] of points) {
    ctx.moveTo(...a);
    ctx.lineTo(...b);
  }
  ctx.stroke();
};
const polygon = (ctx, points) => {
  ctx.beginPath();
  points.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
};
export const PICKUP_COLORS = Object.freeze({
  'extra-life': '#ff759e',
  'player-speed': '#f8d46d',
  'enemy-slow': '#bd9cff',
  'enemy-freeze': '#75e2f4',
});
const PICKUP_PIXELS = Object.freeze({
  'extra-life': ['0110110', '1111111', '1111111', '0111110', '0011100', '0001000'],
  'player-speed': ['1101100', '0110110', '0011011', '0110110', '1101100'],
  'enemy-slow': ['1111111', '0100010', '0010100', '0001000', '0011100', '0111110', '1111111'],
  'enemy-freeze': ['1001001', '0101010', '0011100', '1111111', '0011100', '0101010', '1001001'],
});
export function drawPickupIcon(ctx, kind) {
  const rows = PICKUP_PIXELS[kind];
  if (!rows) return;
  rows.forEach((row, y) =>
    [...row].forEach((pixel, x) => {
      if (pixel === '1') ctx.fillRect(x * 2 - 7, y * 2 - rows.length, 2, 2);
    }),
  );
}
const icon = drawPickupIcon;
export function pickupDiameter({ screenScale = 1, canvasCSSWidth = 1152 } = {}) {
  const scale = Number.isFinite(screenScale) && screenScale > 0 ? Math.max(0.1, screenScale) : 1;
  return Math.min(56, Math.max(24, (canvasCSSWidth < 480 ? 14 : 18) / scale));
}

/** Functional material is painted over the opaque art mask, only while FIELD. */
export function drawClassicTerrain(ctx, view, palette, images = {}) {
  if (!view) return;
  ctx.save();
  ctx.lineWidth = 1.5;
  for (const cell of view.terrain) {
    const x = cell.x * SIZE,
      y = cell.y * SIZE;
    const role = cell.kind === 'slow' ? 'slowTerrain' : 'lethalTerrain',
      image = images[role];
    if (image)
      drawPresentationImage(
        ctx,
        image,
        x + SIZE / 2,
        y + SIZE / 2,
        SIZE,
        SIZE,
        images.presentationSprites?.[role],
      );
    ctx.strokeStyle = cell.kind === 'slow' ? palette.safe : palette.danger;
    if (cell.kind === 'slow')
      lines(ctx, [
        [
          [x + 2, y + 5],
          [x + 7, y + 5],
        ],
        [
          [x + 9, y + 10],
          [x + 14, y + 10],
        ],
      ]);
    else {
      ctx.strokeRect(x + 1.5, y + 1.5, 13, 13);
      lines(ctx, [
        [
          [x + 5, y + 5],
          [x + 11, y + 11],
        ],
        [
          [x + 11, y + 5],
          [x + 5, y + 11],
        ],
      ]);
    }
  }
  ctx.restore();
}

export function drawClassicPickups(ctx, view, palette, images = {}, options = {}) {
  if (!view) return;
  for (const item of [
    ...view.powerups,
    ...(view.timedBonuses ?? []).filter((bonus) => bonus.phase === 'announce'),
  ]) {
    const diameter = pickupDiameter(options),
      color = PICKUP_COLORS[item.kind];
    ctx.save();
    try {
      ctx.translate(item.x * SIZE, item.y * SIZE);
      ctx.scale(diameter / 24, diameter / 24);
      ctx.fillStyle = '#0c1423';
      if (item.phase !== 'announce') ctx.fillRect(-12, -12, 24, 24);
      ctx.strokeStyle = color;
      ctx.lineWidth = 2;
      if (item.phase === 'announce') ctx.setLineDash([3, 3]);
      ctx.strokeRect(-11, -11, 22, 22);
      if (item.timed) {
        ctx.setLineDash([]);
        ctx.beginPath();
        ctx.arc(0, 0, 16, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * item.remainingFraction);
        ctx.stroke();
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 10px monospace';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'bottom';
        ctx.fillText(`${item.phase === 'announce' ? '+' : ''}${Math.ceil(item.seconds)}s`, 0, -18);
      }
      const role = {
        'extra-life': 'lifePickup',
        'player-speed': 'speedPickup',
        'enemy-slow': 'slowPickup',
        'enemy-freeze': 'freezePickup',
      }[item.kind];
      if (images[role]) {
        drawPresentationImage(ctx, images[role], 0, 0, 22, 22, images.presentationSprites?.[role]);
        ctx.translate(8, 8);
        ctx.scale(0.65, 0.65);
        ctx.fillRect(-10, -10, 20, 20);
      }
      ctx.fillStyle = color;
      icon(ctx, item.kind);
    } finally {
      ctx.restore();
    }
  }
  ctx.save();
  try {
    ctx.strokeStyle = palette.danger;
    ctx.lineWidth = 2;
    for (const cell of view.erosion) {
      const x = cell.x * SIZE,
        y = cell.y * SIZE;
      ctx.strokeRect(x + 1, y + 1, 14, 14);
      lines(ctx, [
        [
          [x + 4, y + 4],
          [x + 12, y + 12],
        ],
        [
          [x + 12, y + 4],
          [x + 4, y + 12],
        ],
      ]);
    }
  } finally {
    ctx.restore();
  }
}

/** The new role silhouette remains stable across themes and reduced effects. */
export function drawClassicEnemy(
  ctx,
  enemy,
  palette,
  images = {},
  presentation = null,
  body = null,
) {
  if ((enemy?.type === 'bouncer' && enemy.impactCarrier) || enemy?.type === 'lane-boss') {
    const laneImage = enemy.type === 'lane-boss' && (body?.image ?? images.boss);
    if (laneImage && presentation)
      drawPresentedActor(
        ctx,
        presentation,
        palette,
        laneImage,
        body?.geometry ?? images.presentationSprites?.boss,
        body?.record,
      );
    ctx.save();
    ctx.translate(enemy.x * SIZE, enemy.y * SIZE);
    // A stable functional cue accompanies an uploaded body rather than replacing it.
    ctx.fillStyle = enemy.stunned ? palette.muted : palette.danger;
    ctx.strokeStyle = PRESENTATION_INK;
    ctx.lineWidth = 2;
    ctx.beginPath();
    traceContentActor(
      ctx,
      enemy.type === 'lane-boss' ? 'lane-boss' : 'impact-carrier',
      0,
      0,
      Math.max(11, (presentation?.diameter ?? 22) / 2),
    );
    if (!laneImage || !presentation) ctx.fill();
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(0, 0, enemy.radius * SIZE, 0, Math.PI * 2);
    ctx.strokeStyle = PRESENTATION_PLATE;
    ctx.stroke();
    ctx.restore();
    return true;
  }
  if (!enemy || !['contour-patrol', 'claimed-rover', 'eroder'].includes(enemy.type)) return false;
  if (presentation) {
    const role = { 'contour-patrol': 'contour', 'claimed-rover': 'rover', eroder: 'eroder' }[
      enemy.type
    ];
    drawPresentedActor(
      ctx,
      presentation,
      palette,
      body?.image ?? images[role],
      body ? body.geometry : images.presentationSprites?.[role],
      body?.record,
    );
    ctx.save();
    ctx.translate(enemy.x * SIZE, enemy.y * SIZE);
    ctx.strokeStyle = PRESENTATION_INK;
    const radius = Math.max(12, presentation.diameter / 2 + 3);
    if (enemy.mode === 'dormant') {
      ctx.setLineDash([2, 2]);
      ctx.strokeRect(-radius, -radius, radius * 2, radius * 2);
    }
    if (enemy.mode === 'warning' || enemy.mode === 'rejoining') {
      ctx.strokeStyle = palette.accent;
      ctx.setLineDash([3, 2]);
      ctx.strokeRect(-radius, -radius, radius * 2, radius * 2);
    }
    ctx.restore();
    return true;
  }
  ctx.save();
  ctx.translate(enemy.x * SIZE, enemy.y * SIZE);
  ctx.fillStyle =
    enemy.stunned || enemy.mode === 'dormant' || enemy.mode === 'idle'
      ? palette.muted
      : palette.danger;
  ctx.strokeStyle = PRESENTATION_INK;
  ctx.lineWidth = 1.5;
  const image =
    images[{ 'contour-patrol': 'contour', 'claimed-rover': 'rover', eroder: 'eroder' }[enemy.type]];
  if (image) {
    ctx.save();
    if (enemy.stunned || enemy.mode === 'dormant' || enemy.mode === 'idle') ctx.globalAlpha = 0.45;
    ctx.drawImage(image, -11, -11, 22, 22);
    ctx.restore();
    ctx.beginPath();
    ctx.arc(0, 0, enemy.radius * SIZE, 0, Math.PI * 2);
    ctx.stroke();
  } else if (enemy.type === 'contour-patrol') {
    polygon(ctx, [
      [0, -10],
      [9, 0],
      [0, 10],
      [-9, 0],
    ]);
    ctx.strokeStyle = PRESENTATION_PLATE;
    lines(ctx, [
      [
        [-4, -3],
        [0, 2],
      ],
      [
        [0, 2],
        [4, -3],
      ],
    ]);
  } else if (enemy.type === 'claimed-rover') {
    ctx.fillRect(-7, -6, 14, 12);
    ctx.strokeRect(-7, -6, 14, 12);
    for (const x of [-10, 7]) {
      ctx.fillRect(x, -9, 3, 6);
      ctx.fillRect(x, 3, 3, 6);
    }
    ctx.fillStyle = PRESENTATION_PLATE;
    ctx.fillRect(-3, -2, 6, 4);
    if (enemy.mode === 'dormant') {
      ctx.strokeStyle = PRESENTATION_INK;
      ctx.setLineDash([2, 2]);
      ctx.strokeRect(-12, -11, 24, 22);
    }
  } else {
    polygon(ctx, [
      [-10, -7],
      [-3, -7],
      [0, -11],
      [4, -7],
      [10, -7],
      [7, 0],
      [11, 4],
      [7, 8],
      [0, 7],
      [-5, 11],
      [-8, 5],
      [-7, 0],
    ]);
    ctx.fillStyle = PRESENTATION_PLATE;
    ctx.fillRect(-3, -3, 6, 6);
  }
  if (image && enemy.mode === 'dormant') {
    ctx.setLineDash([2, 2]);
    ctx.strokeRect(-12, -11, 24, 22);
  }
  if (enemy.mode === 'warning' || enemy.mode === 'rejoining') {
    ctx.strokeStyle = palette.accent;
    ctx.setLineDash([3, 2]);
    ctx.strokeRect(-13, -13, 26, 26);
  }
  ctx.restore();
  return true;
}

export function drawClassicStatus(
  ctx,
  view,
  palette,
  { screenScale = 1, canvasCSSWidth = 1152, frames = new Map(), fonts = null } = {},
) {
  if (!view) return;
  for (const enemy of view.enemies) {
    if (!enemy.frozen && !enemy.slowed) continue;
    ctx.save();
    ctx.translate(enemy.x * SIZE, enemy.y * SIZE);
    ctx.strokeStyle = palette.safe;
    ctx.lineWidth = 2;
    const radius = Math.max(14, (frames.get(enemy.id)?.diameter ?? 22) / 2 + 3);
    if (enemy.frozen) {
      ctx.strokeRect(-radius, -radius, radius * 2, radius * 2);
      ctx.translate(0, -radius - 6);
      ctx.fillStyle = PICKUP_COLORS['enemy-freeze'];
      icon(ctx, 'enemy-freeze');
    } else
      lines(ctx, [
        [
          [-12, radius - 3],
          [12, radius - 3],
        ],
        [
          [-12, radius + 1],
          [12, radius + 1],
        ],
      ]);
    ctx.restore();
  }
  const unit = Math.min(4, Math.max(1, 1 / Math.max(0.1, screenScale))),
    compact = canvasCSSWidth < 700;
  view.effects.forEach((effect, i) => {
    ctx.save();
    const width = compact ? 94 : 174;
    ctx.translate((12 + i * width) * unit, 576 - 14 * unit);
    ctx.scale(unit, unit);
    ctx.fillStyle = '#0c1423';
    ctx.fillRect(-9, -11, width - 3, 22);
    ctx.fillStyle = PICKUP_COLORS[effect.kind];
    ctx.save();
    ctx.scale(0.65, 0.65);
    icon(ctx, effect.kind);
    ctx.restore();
    ctx.font = `500 14px ${fonts?.ui || '"Field Kit UI", "Field Kit Mono", sans-serif'}`;
    ctx.textBaseline = 'middle';
    ctx.textAlign = 'left';
    const label = compact
      ? {
          'player-speed': t('interface:speed2'),
          'enemy-slow': t('interface:slow'),
          'enemy-freeze': t('interface:freeze'),
        }[effect.kind]
      : effect.label;
    ctx.fillText(
      `${label} ${effect.phase === 'pending' ? 'next' : `${effect.seconds.toFixed(1)}s`}`,
      10,
      0,
    );
    ctx.restore();
  });
}

/** Original opt-in pressure extension: copy core targets, never predict a chase. */
export function drawEnemyPressure(
  ctx,
  view,
  palette,
  { screenScale = 1, frames = new Map(), fonts = null } = {},
) {
  if (!view) return;
  const unit = Math.min(4, Math.max(1, 1 / Math.max(0.1, screenScale)));
  for (const enemy of view.enemies) {
    const pressure = enemy.pressure;
    if (!pressure) continue;
    const warning = pressure.phase === 'warning',
      cooldown = pressure.phase === 'cooldown',
      color =
        pressure.phase === 'patrol'
          ? '#b9d5dc'
          : cooldown
            ? palette.safe
            : warning
              ? '#ffd17a'
              : '#ff866e';
    ctx.save();
    ctx.strokeStyle = color;
    ctx.lineWidth = unit;
    if (pressure.target) {
      const x = pressure.target.x * SIZE,
        y = pressure.target.y * SIZE,
        r = 4 * unit;
      if (warning) {
        // Dashed amber acquisition never resembles the continuous white live cut.
        ctx.globalAlpha = 0.5;
        ctx.setLineDash([3 * unit, 5 * unit]);
        lines(ctx, [
          [
            [enemy.x * SIZE, enemy.y * SIZE],
            [x, y],
          ],
        ]);
        ctx.setLineDash([]);
        ctx.globalAlpha = 1;
      }
      for (const [sx, sy] of [
        [-1, -1],
        [-1, 1],
        [1, -1],
        [1, 1],
      ])
        lines(ctx, [
          [
            [x + sx * r, y + (sy * r) / 2],
            [x + sx * r, y + sy * r],
            [x + (sx * r) / 2, y + sy * r],
          ],
        ]);
    }
    const role = pressure.mode === 'trail-pursuit' ? t('interface:trail') : t('interface:head');
    const label =
        pressure.phase === 'patrol'
          ? role
          : `${cooldown ? t('interface:rest') : warning ? t('interface:aim') : t('interface:chase')} ${role}`,
      textWidth = (label.length * 8.4 + 8) * unit,
      x = Math.max(0, Math.min(1152 - textWidth, enemy.x * SIZE - textWidth / 2)),
      y = Math.max(
        18 * unit,
        enemy.y * SIZE - (frames.get(enemy.id)?.diameter ?? 30) / 2 - 5 * unit,
      );
    ctx.fillStyle = PRESENTATION_PLATE;
    ctx.fillRect(x, y - 16 * unit, textWidth, 19 * unit);
    ctx.font = `500 ${14 * unit}px ${fonts?.numeric || '"Field Kit Mono", monospace'}`;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = color;
    ctx.fillText(label, x + 4 * unit, y - 6 * unit);
    ctx.restore();
  }
}

/** Front locations belong to the core. No interpolation, extrapolation or cosmetic hazard radius. */
export function drawLineImpacts(ctx, view, { screenScale = 1, time = 0, reduced = false } = {}) {
  if (!view?.lineImpacts?.length) return;
  for (const front of view.lineImpacts)
    drawTrailImpactFront(ctx, front, { screenScale, time, reduced });
}
