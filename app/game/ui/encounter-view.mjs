import { encounterCopy } from './encounter-copy.mjs';
import { geometryForRun } from '../core/geometry.mjs';
import { CELL, FIXED_DT } from '../core/registry.mjs';
import { encounterCutCells, encounterShieldIds } from '../core/encounter.mjs';
import { classicEffectActive } from '../core/classic-state.mjs';
import { isClassicRuleset } from '../core/versions.mjs';

const frozenActors = (state) =>
  isClassicRuleset(state.ruleset) && classicEffectActive(state, 'enemy-freeze');

/** Read-only cues shared by live play and replay rendering. No presentation clock owns a phase. */
export function encounterView(state) {
  const e = state?.encounter;
  if (!e) return null;
  const recipe = state.level.encounter;
  const multiple = recipe.version === 'xonix-encounter.v2';
  const shieldIds = multiple ? encounterShieldIds(recipe) : [];
  const remainingShieldIds = shieldIds.filter(
    (id) => !state.objectives.some((o) => o.id === id && o.captured),
  );
  const shields = multiple
    ? Object.freeze({
        total: shieldIds.length,
        captured: shieldIds.length - remainingShieldIds.length,
        remainingIds: Object.freeze(remainingShieldIds),
      })
    : null;
  const shieldPlural = multiple && shieldIds.length > 1;
  const min = recipe.minReleaseCutCells;
  const remaining = state.cells.reduce((sum, cell) => sum + Number(cell === CELL.FIELD), 0);
  const cutCells = encounterCutCells(state);
  const ended = state.status === 'lost';
  const clock = isClassicRuleset(state.ruleset) ? state.classic.actorTick : state.tick;
  const seconds = ended ? 0 : Math.max(0, ((e.phaseEndTick ?? clock) - clock) * FIXED_DT);
  const enemy = state.enemies.find((item) => item.id === recipe.enemyId);
  const frozen = frozenActors(state);
  const suppressed = frozen || (!!enemy && enemy.stunnedUntil > state.time + 1e-8);
  const isolated = remaining <= min;
  // Presentation facts are detached from the run so an open reader can change
  // language while retaining its accepted clock, stage and shield progress.
  const copyFacts = Object.freeze({
    status: state.status,
    phase: e.phase,
    stage: e.stage,
    seconds,
    multiple,
    shieldPlural,
    shields: multiple ? Object.freeze({ total: shields.total, captured: shields.captured }) : null,
    lane: Number.isFinite(e.lane) ? e.lane : null,
    axis: e.axis ?? null,
    min,
    remaining,
    cutCells,
    isolated,
    frozen,
    suppressed,
    defeated: !!e.defeated,
    defeatCause: e.defeatCause ?? null,
  });
  const { title, instruction, lane } = encounterCopy(copyFacts);
  return Object.freeze({
    title,
    instruction,
    copyFacts,
    phase: e.phase,
    stage: e.stage,
    seconds,
    lane,
    cutCells,
    min,
    remaining,
    isolated,
    suppressed,
    ...(multiple ? { shields } : {}),
  });
}

/** Hatched warning and solid active lane remain distinct with motion and sound disabled. */
export function drawEncounterLane(ctx, state, palette) {
  const e = state.encounter;
  if (!e || e.defeated || !['warning', 'active'].includes(e.phase) || !Number.isFinite(e.lane))
    return;
  const geometry = geometryForRun(state);
  const W = geometry.width * 16,
    H = geometry.height * 16;
  const width = state.level.encounter.laneWidth * 16;
  const horizontal = e.axis === 'horizontal';
  const x = horizontal ? 16 : e.lane * 16 - width / 2;
  const y = horizontal ? e.lane * 16 - width / 2 : 16;
  const w = horizontal ? W - 32 : width,
    h = horizontal ? width : H - 32;
  const enemy = state.enemies.find((item) => item.id === state.level.encounter.enemyId);
  const suppressed = frozenActors(state) || (!!enemy && enemy.stunnedUntil > state.time + 1e-8);
  ctx.save();
  ctx.beginPath();
  ctx.rect(16, 16, W - 32, H - 32);
  ctx.clip();
  ctx.fillStyle = suppressed ? palette.muted : palette.danger;
  ctx.globalAlpha = e.phase === 'active' && !suppressed ? 0.48 : 0.14;
  ctx.fillRect(x, y, w, h);
  ctx.globalAlpha = 1;
  ctx.strokeStyle = palette.paper;
  ctx.lineWidth = e.phase === 'active' ? 2 : 1;
  ctx.setLineDash(e.phase === 'warning' || suppressed ? [5, 4] : []);
  ctx.strokeRect(x, y, w, h);
  ctx.setLineDash([]);
  if (e.phase === 'warning' || suppressed) {
    ctx.beginPath();
    ctx.rect(x, y, w, h);
    ctx.clip();
    ctx.globalAlpha = 0.65;
    ctx.strokeStyle = suppressed ? palette.muted : palette.danger;
    ctx.lineWidth = 2;
    ctx.beginPath();
    for (let n = -H; n < W; n += 12) {
      ctx.moveTo(n, 0);
      ctx.lineTo(n + H, H);
    }
    ctx.stroke();
  }
  ctx.restore();
}

export function drawEncounterCore(ctx, state, enemy, palette, reduced) {
  const e = state.encounter;
  if (!e || enemy.id !== state.level.encounter.enemyId || e.defeated) return;
  const open = e.phase === 'open';
  const spread = open ? 24 : e.stage === 'transition' ? 21 : 18;
  const time = isClassicRuleset(state.ruleset) ? state.classic.actorTime : state.time;
  const offset = spread + (open && !reduced ? Math.round(Math.sin(time * 3) * 2) : 0);
  const x = enemy.x * 16,
    y = enemy.y * 16;
  ctx.save();
  ctx.strokeStyle = open ? palette.safe : palette.paper;
  ctx.lineWidth = 3;
  ctx.beginPath();
  for (const [dx, dy] of [
    [-1, -1],
    [1, -1],
    [-1, 1],
    [1, 1],
  ]) {
    ctx.moveTo(x + dx * (offset - 8), y + dy * offset);
    ctx.lineTo(x + dx * offset, y + dy * offset);
    ctx.lineTo(x + dx * offset, y + dy * (offset - 8));
  }
  ctx.stroke();
  ctx.fillStyle = open ? palette.safe : palette.paper;
  // Two stable progress blocks distinguish shielded and exposed stages without color.
  ctx.fillRect(x - 7, y + offset + 4, 5, 4);
  if (e.stage !== 'shielded') ctx.fillRect(x + 2, y + offset + 4, 5, 4);
  else {
    ctx.lineWidth = 1;
    ctx.strokeRect(x + 2, y + offset + 4, 5, 4);
  }
  ctx.restore();
}
