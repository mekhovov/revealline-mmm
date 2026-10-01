// Matches the admitted surface-part rate bound in createEnemyPresentations.
// Keep every accepted part below a quarter-cycle per observed frame, without
// limiting the separate gait, body or rotor clocks. The catalog-bound test
// intentionally fails if that schema admits a faster part in the future.
export const ENEMY_SURFACE_MOTION_RATE_LIMIT = 8;
// The sampler owns these clocks; invalid elapsed input must hold, not rephase.
export function advanceEnemySurfacePhase(previous, step) {
  const phase = Number.isFinite(previous) ? previous : 0;
  const advance = Number.isFinite(step) ? Math.max(0, step) : 0;
  return phase + Math.min(advance, 0.22 / ENEMY_SURFACE_MOTION_RATE_LIMIT);
}

// Surface accents only. The immutable body, contact cues and simulation stay unchanged.
export function drawEnemyBodyMotion(ctx, frame, record, diameter) {
  if (!record || frame.reduced || !Number.isFinite(diameter) || diameter <= 0) return;
  for (const part of record.motion) {
    const traveling = part.kind === 'travel-glint';
    const sampled = traveling ? frame.surfaceTravelPhase : frame.surfacePhase;
    // Legacy direct callers keep their finite supplied pose. Current runtime
    // frames always carry the independent sampled surface clocks.
    const phase = Number.isFinite(sampled) ? sampled : traveling ? frame.travelPhase : frame.phase;
    if (!Number.isFinite(phase)) continue;
    // Locked frames retain their existing phase; no independent clock advances here.
    const unit = (((phase * part.rate) % 1) + 1) % 1;
    const width = part.width * diameter;
    const height = part.height * diameter;
    const x = (part.x - 0.5) * diameter;
    const y = (part.y - 0.5) * diameter;
    ctx.save();
    ctx.fillStyle = part.color;
    ctx.globalAlpha *= 0.55;
    if (part.kind === 'travel-glint') {
      const mark = Math.min(height, Math.max(1, height * 0.2));
      ctx.fillRect(x - width / 2, y - height / 2 + unit * (height - mark), width, mark);
    } else {
      const mark = Math.min(width, Math.max(1, width * 0.12));
      ctx.fillRect(x - width / 2 + unit * (width - mark), y - height / 2, mark, height);
    }
    ctx.restore();
  }
}
