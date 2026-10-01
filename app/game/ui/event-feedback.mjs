import { captureRecipe } from './feedback-cues.mjs';
import { t } from '../i18n/index.mjs';
import { PICKUP_COLORS, drawPickupIcon } from './classic-view.mjs';

const finitePoint = (value) => Number.isFinite(value?.x) && Number.isFinite(value?.y);
/** Copy event-time coordinates immediately. A later replay batch cannot invent a failure point. */
export function presentationEvent(event, run = null) {
  const known = [
    'cut.closed',
    'cells.claimed',
    'relay.opened',
    'player.failed',
    'run.completed',
    'craft.redeployed',
    'powerup.collected',
    'player.respawned',
    'shield.absorbed',
    'lineImpact.seeded',
  ];
  if (!known.includes(event?.type)) return null;
  const pickup =
    event.type === 'powerup.collected' &&
    run?.classic?.powerups?.find((item) => item.id === event.id);
  const point = finitePoint(event)
    ? event
    : finitePoint(pickup)
      ? pickup
      : event.tick === run?.tick && finitePoint(run?.player)
        ? run.player
        : null;
  return {
    type: event.type,
    age: 0,
    ...(event.type === 'relay.opened' ? { revealDuration: 0.4 } : {}),
    ...(event.type === 'cells.claimed'
      ? { revealDuration: captureRecipe(event, run).duration }
      : {}),
    tick: event.tick,
    ...(point ? { x: point.x, y: point.y } : {}),
    ...(PICKUP_COLORS[event.kind] ? { kind: event.kind } : {}),
    ...(Number.isFinite(event.gain) ? { gain: event.gain } : {}),
    ...(Number.isFinite(event.radius) ? { radius: event.radius } : {}),
    ...(Array.isArray(event.indices) ? { indices: event.indices.slice(0, 2592) } : {}),
  };
}

export function drawEventFeedback(
  ctx,
  event,
  palette,
  {
    themeId = 'fpv',
    themeFamily = null,
    reduced = false,
    screenScale = 1,
    width = 1152,
    height = 576,
    fonts = null,
  } = {},
) {
  if (!finitePoint(event) || event.age >= 0.7) return;
  const feedbackTheme =
      themeFamily === 'fpv'
        ? 'fpv'
        : themeFamily === 'atlas'
          ? 'ukraine'
          : themeFamily === 'navi'
            ? 'coupa'
            : themeId,
    pickup = event.type === 'powerup.collected' && PICKUP_COLORS[event.kind],
    failed = event.type === 'player.failed',
    lineHit = event.type === 'lineImpact.seeded',
    recovered = ['player.respawned', 'shield.absorbed'].includes(event.type);
  if (!pickup && !failed && !recovered && !lineHit) return;
  const unit = Math.min(4, Math.max(1, 1 / Math.max(0.1, screenScale))),
    radius = reduced ? 11 : 8 + Math.min(1, event.age / 0.35) * 10;
  ctx.save();
  ctx.translate(event.x * 16, event.y * 16);
  ctx.scale(unit, unit);
  ctx.globalAlpha = reduced ? 1 : Math.min(1, (0.7 - event.age) * 3);
  const color = pickup || (failed || lineHit ? palette.danger : palette.safe);
  ctx.strokeStyle = color;
  ctx.fillStyle = color;
  ctx.lineWidth = 1;
  if (lineHit) {
    for (const [x, y] of [
      [-1, -1],
      [1, -1],
      [-1, 1],
      [1, 1],
    ])
      ctx.fillRect((x * radius) / 2 - 1, (y * radius) / 2 - 1, 2, 2);
  } else if (pickup) {
    if (!reduced)
      for (const [x, y] of [
        [0, -1],
        [1, 0],
        [0, 1],
        [-1, 0],
      ])
        ctx.fillRect(x * radius - 1, y * radius - 1, 2, 2);
    ctx.save();
    ctx.scale(0.7, 0.7);
    drawPickupIcon(ctx, event.kind);
    ctx.restore();
  } else if (failed) {
    // Small themed debris stays local to the failed craft, never follows respawn.
    const offset = reduced ? 5 : 4 + Math.min(event.age, 0.35) * 15;
    if (feedbackTheme === 'fpv') {
      // Four solid rotor fragments communicate the broken FPV frame without
      // putting bright square brackets around the craft silhouette.
      for (const [x, y] of [
        [-1, -1],
        [1, -1],
        [-1, 1],
        [1, 1],
      ]) {
        ctx.fillRect(x * offset - 2, y * offset - 1, 4, 2);
        ctx.fillRect(x * (offset + 2) - 1, y * (offset + 2) - 1, 2, 2);
      }
      ctx.fillRect(-2, -4, 4, 8);
    } else if (feedbackTheme === 'ukraine') {
      for (let i = 0; i < 6; i++) {
        ctx.save();
        ctx.rotate((i * Math.PI) / 3);
        ctx.fillRect(-2, -offset - 3, 4, 5);
        ctx.restore();
      }
    } else if (feedbackTheme === 'coupa') {
      ctx.fillRect(-offset - 3, -6, 5, 12);
      ctx.fillRect(offset - 2, -4, 5, 10);
      ctx.fillRect(-2, -1, 3, 3);
    } else {
      for (const [x, y] of [
        [-1, 0],
        [1, 0],
        [0, -1],
        [0, 1],
      ])
        ctx.fillRect(x * offset - 2, y * offset - 2, 4, 4);
      ctx.strokeRect(-2, -2, 4, 4);
    }
  } else ctx.strokeRect(-radius, -radius, radius * 2, radius * 2);
  ctx.restore();
  if (lineHit) return;
  const label = pickup
    ? {
        'extra-life': event.gain === 0 ? t('interface:lifeFull') : '+1 LIFE',
        'player-speed': t('interface:speed25'),
        'enemy-slow': t('interface:enemiesSlow2'),
        'enemy-freeze': t('interface:enemiesFrozen2'),
      }[event.kind]
    : failed
      ? t('gameplay:1Life', {
          value1:
            feedbackTheme === 'fpv'
              ? t('interface:craftLost')
              : feedbackTheme === 'coupa'
                ? t('interface:linkLost')
                : t('interface:lifeLost'),
        })
      : event.type === 'shield.absorbed'
        ? t('interface:shieldUsed')
        : t('interface:ready2');
  const textWidth = Math.min(width - 16, label.length * 8.4 * unit + 12 * unit),
    x = Math.max(8, Math.min(width - textWidth - 8, event.x * 16 - textWidth / 2)),
    y = Math.max(18 * unit, Math.min(height - 18 * unit, event.y * 16 - 24 * unit));
  ctx.save();
  ctx.globalAlpha = 1;
  ctx.fillStyle = '#0c1423';
  ctx.fillRect(x, y - 15 * unit, textWidth, 22 * unit);
  ctx.fillStyle = color;
  ctx.font = `500 ${14 * unit}px ${fonts?.numeric || '"Field Kit Mono", monospace'}`;
  ctx.textBaseline = 'middle';
  ctx.textAlign = 'left';
  ctx.fillText(label, x + 6 * unit, y - 3 * unit);
  ctx.restore();
}

/** Remaining recovery is read from the simulation; no independent countdown. */
export function drawRecoveryCue(
  ctx,
  run,
  palette,
  { screenScale = 1, width = 1152, fonts = null } = {},
) {
  if (run.status !== 'respawning') return;
  const seconds = Math.max(0, run.respawnAt - run.time),
    unit = Math.min(4, Math.max(1, 1 / Math.max(0.1, screenScale)));
  if (!Number.isFinite(seconds)) return;
  ctx.save();
  ctx.font = `500 ${16 * unit}px ${fonts?.numeric || '"Field Kit Mono", monospace'}`;
  ctx.textBaseline = 'top';
  ctx.textAlign = 'center';
  ctx.fillStyle = '#0c1423';
  ctx.fillRect(width / 2 - 106 * unit, 18 * unit, 212 * unit, 26 * unit);
  ctx.fillStyle = palette.accent;
  ctx.fillText(t('gameplay:recoveryS', { value1: seconds.toFixed(1) }), width / 2, 21 * unit);
  ctx.restore();
}
