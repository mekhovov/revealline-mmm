import { t } from '../i18n/index.mjs';
import { PRESENTATION_INK, PRESENTATION_PLATE } from './actor-presentation.mjs';
import { isFoundationRuleset } from '../core/versions.mjs';

/** Keep authored actor roles distinct while preserving historical theme labels. */
export function laneWarningCaption(run, event, legacyLabel = t('interface:laneEmitter')) {
  if (
    event?.type !== 'boss.warning' ||
    !run.enemies.some((enemy) => enemy.id === event.id && enemy.type === 'lane-boss')
  )
    return '';
  const label = isFoundationRuleset(run.ruleset) ? t('interface:laneEmitter') : legacyLabel;
  return `${label}: the marked lane will activate shortly.`;
}

/** Functional lane cue only. No input, clocks or authoritative state are changed. */
export function drawLaneAttack(
  ctx,
  enemy,
  palette,
  { frozen = false, screenScale = 1, boardWidth = 1152, boardHeight = 576 } = {},
) {
  if (enemy.type !== 'lane-boss' || !['warning', 'active'].includes(enemy.bossPhase)) return false;
  const scale = Math.max(0.2, Math.min(1, screenScale));
  const horizontal = enemy.axis === 'horizontal';
  const center = enemy.lane ?? (horizontal ? enemy.y : enemy.x);
  const half = (enemy.laneWidth ?? 1.2) / 2;
  // Trail damage uses inclusive whole-cell overlap, not just the cell centre.
  // At an integer boundary the adjacent touching cell is also threatened.
  const start = Math.max(1, Math.ceil(center - half) - 1) * 16;
  const end =
    Math.min((horizontal ? boardHeight : boardWidth) / 16 - 1, Math.floor(center + half) + 1) * 16;
  const breadth = Math.max(0, end - start);
  const box = horizontal
    ? [16, start, boardWidth - 32, breadth]
    : [start, 16, breadth, boardHeight - 32];
  ctx.save();
  ctx.fillStyle = frozen ? palette.muted : palette.danger;
  ctx.globalAlpha = frozen ? 0.12 : enemy.bossPhase === 'active' ? 0.35 : 0.1;
  ctx.fillRect(...box);
  // Static dashed warning / solid active edges survive muted audio, reduced
  // effects and monochrome. Two inks keep either theme background legible.
  ctx.globalAlpha = 1;
  ctx.setLineDash(enemy.bossPhase === 'warning' ? [6 / scale, 4 / scale] : []);
  for (const [ink, width] of [
    [PRESENTATION_PLATE, 3 / scale],
    [PRESENTATION_INK, 1 / scale],
  ]) {
    ctx.strokeStyle = ink;
    ctx.lineWidth = width;
    ctx.strokeRect(...box);
  }
  ctx.restore();
  return true;
}
