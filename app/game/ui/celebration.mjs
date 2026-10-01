import { t } from '../i18n/index.mjs';
import { hashText } from './music.mjs';
const clamp = (v, a, b) => Math.min(b, Math.max(a, v)),
  TAU = Math.PI * 2;
const ease = (v) => 1 - (1 - clamp(v, 0, 1)) ** 3;
export const CELEBRATION_SECONDS = 3.8;
export function finaleKind(theme = {}) {
  return theme.family === 'fpv' || theme.id === 'fpv'
    ? 'signal-clear'
    : theme.family === 'atlas' || theme.scene === 'heritage'
      ? 'stitch-bloom'
      : theme.family === 'navi' || theme.scene === 'network'
        ? 'savings-nodes'
        : 'neon-fireworks';
}
export function createCelebration({ theme = {}, levelId = '', seed = 0, reduced = false } = {}) {
  return {
    kind: finaleKind(theme),
    levelId,
    seed: hashText(`${levelId}:${seed}:${theme.id || ''}`),
    elapsed: reduced ? CELEBRATION_SECONDS : 0,
    duration: CELEBRATION_SECONDS,
    reduced: !!reduced,
    skipped: false,
  };
}
export function advanceCelebration(state, dt, { paused = false, reduced = false } = {}) {
  if (!state) return null;
  if (!Number.isFinite(dt) || dt < 0)
    throw new TypeError(t('interface:celebrationDtMustBeFiniteAndNonnegative'));
  if (reduced) return { ...state, reduced: true, elapsed: state.duration };
  if (paused || state.elapsed >= state.duration) return state;
  return { ...state, elapsed: Math.min(state.duration, state.elapsed + Math.min(dt, 0.25)) };
}
export function skipCelebration(state) {
  return state ? { ...state, elapsed: state.duration, skipped: true } : null;
}
export function celebrationFrame(state) {
  if (!state)
    return {
      active: false,
      finished: true,
      reveal: 1,
      progress: 1,
      phase: 'picture',
      particles: [],
      equipment: [],
    };
  const time = state.elapsed,
    finished = time >= state.duration,
    fade = 1 - ease((time - 2.25) / 1.55),
    particles = [],
    equipment = [];
  if (!finished && !state.reduced) {
    if (state.kind === 'signal-clear') {
      for (let unit = 0; unit < 3; unit++) {
        const x = 0.23 + unit * 0.27,
          y = 0.76 + (unit % 2) * 0.07;
        equipment.push({ x, y, alpha: clamp(1 - time / 1.8, 0, 1) });
        for (let j = 0; j < 9; j++) {
          const age = time - j * 0.055 - unit * 0.1;
          if (age < 0 || age > 2.1) continue;
          particles.push({
            shape: 'smoke',
            x: x + Math.sin(j * 2 + unit) * 0.014 * age,
            y: y - age * 0.085 - j * 0.004,
            size: 5 + age * 11,
            alpha: Math.min(0.32, age * 0.8) * (1 - age / 2.1),
            tone: 'muted',
          });
        }
        for (let j = 0; j < 9; j++) {
          const age = time - 0.14 - unit * 0.09;
          if (age < 0 || age > 1.1) continue;
          const a = (j * TAU) / 9;
          particles.push({
            shape: 'spark',
            x: x + Math.cos(a) * age * 0.11,
            y: y + Math.sin(a) * age * 0.08 + age * age * 0.045,
            size: 2,
            alpha: (1 - age / 1.1) * 0.8,
            tone: j % 2 ? 'accent' : 'safe',
          });
        }
      }
    } else if (state.kind === 'stitch-bloom') {
      for (let j = 0; j < 64; j++) {
        const row = Math.floor(j / 16),
          col = j % 16,
          birth = (col % 8) * 0.045 + row * 0.12,
          age = time - birth;
        if (age < 0) continue;
        const onTop = row % 2 === 0;
        particles.push({
          shape: 'stitch',
          x: 0.08 + col * 0.056,
          y: onTop ? 0.12 + row * 0.018 : 0.88 - row * 0.018,
          size: 3 + ease(age / 0.45) * 5,
          alpha: fade * Math.min(1, age * 3) * 0.8,
          tone: j % 3 ? 'accent' : 'danger',
        });
      }
      for (let j = 0; j < 12; j++) {
        const angle = (j * TAU) / 12;
        particles.push({
          shape: 'petal',
          x: 0.5 + Math.cos(angle) * ease(time / 1.2) * 0.25,
          y: 0.48 + Math.sin(angle) * ease(time / 1.2) * 0.25,
          size: 4,
          alpha: fade * 0.55,
          tone: 'safe',
        });
      }
    } else if (state.kind === 'savings-nodes') {
      for (let j = 0; j < 12; j++) {
        const a = (j * TAU) / 12,
          age = time - (j % 4) * 0.1;
        if (age < 0) continue;
        particles.push({
          shape: 'node',
          x: 0.5 + Math.cos(a) * 0.3,
          y: 0.48 + Math.sin(a) * 0.3,
          size: 6 + ease(age / 0.45) * 3,
          alpha: fade * 0.8,
          tone: j % 2 ? 'accent' : 'safe',
        });
      }
      for (let j = 0; j < 32; j++) {
        const age = time - (j % 8) * 0.05;
        if (age < 0) continue;
        const angle = j * 2.399 + (state.seed % 13);
        particles.push({
          shape: 'spark',
          x: 0.5 + Math.cos(angle) * Math.max(0, 0.28 - age * 0.11),
          y: 0.48 + Math.sin(angle) * Math.max(0, 0.28 - age * 0.11),
          size: 2,
          alpha: fade * 0.6,
          tone: 'accent',
        });
      }
    } else {
      for (let burst = 0; burst < 4; burst++) {
        const age = time - 0.15 - burst * 0.24;
        if (age < 0 || age > 2) continue;
        const cx = [0.22, 0.72, 0.42, 0.81][burst],
          cy = [0.3, 0.23, 0.56, 0.62][burst];
        for (let j = 0; j < 16; j++) {
          const angle = (j * TAU) / 16;
          particles.push({
            shape: 'spark',
            x: cx + Math.cos(angle) * age * 0.1,
            y: cy + Math.sin(angle) * age * 0.13 + age * age * 0.035,
            size: 2 + (j % 3 === 0 ? 1 : 0),
            alpha: (1 - age / 2) * 0.8,
            tone: (j + burst) % 2 ? 'accent' : 'safe',
          });
        }
      }
    }
  }
  return {
    active: !finished,
    finished,
    reveal: ease(time / 0.85),
    progress: clamp(time / state.duration, 0, 1),
    phase: finished ? 'picture' : time < 0.85 ? 'reveal' : time < 2.25 ? 'celebrate' : 'settle',
    kind: state.kind,
    elapsed: time,
    duration: state.duration,
    particles,
    equipment,
  };
}
export function drawCelebration(ctx, frame, palette, width = 768, height = 576) {
  if (!frame.active) return;
  ctx.save();
  for (const unit of frame.equipment) {
    if (unit.alpha <= 0) continue;
    ctx.globalAlpha = unit.alpha;
    const x = Math.round(unit.x * width),
      y = Math.round(unit.y * height);
    ctx.fillStyle = palette.ink;
    ctx.fillRect(x - 15, y - 8, 30, 12);
    ctx.fillRect(x - 10, y - 13, 18, 6);
    ctx.fillRect(x + 5, y - 17, 3, 10);
    ctx.fillStyle = palette.muted;
    ctx.fillRect(x - 17, y + 3, 34, 4);
  }
  if (frame.kind === 'savings-nodes') {
    ctx.strokeStyle = palette.safe;
    ctx.lineWidth = 1;
    ctx.globalAlpha = (1 - frame.progress) * 0.3;
    for (const p of frame.particles.filter((p) => p.shape === 'node')) {
      ctx.beginPath();
      ctx.moveTo(width * 0.5, height * 0.48);
      ctx.lineTo(p.x * width, p.y * height);
      ctx.stroke();
    }
  }
  for (const p of frame.particles) {
    if (p.alpha <= 0) continue;
    const x = Math.round(p.x * width),
      y = Math.round(p.y * height),
      s = Math.max(2, Math.round(p.size));
    ctx.globalAlpha = clamp(p.alpha, 0, 1);
    ctx.fillStyle = palette[p.tone] || palette.accent;
    ctx.strokeStyle = ctx.fillStyle;
    ctx.lineWidth = 2;
    if (p.shape === 'smoke') {
      ctx.fillRect(x - s / 2, y - s / 2, s, s);
      ctx.fillRect(x - s * 0.7, y - s * 0.1, s * 0.9, s * 0.6);
    } else if (p.shape === 'stitch') {
      ctx.fillRect(x - s, y - 1, s * 2, 2);
      ctx.fillRect(x - 1, y - s, 2, s * 2);
      ctx.fillRect(x - 2, y - 2, 4, 4);
    } else if (p.shape === 'node') {
      ctx.strokeRect(x - s, y - s, s * 2, s * 2);
      ctx.beginPath();
      ctx.moveTo(x - 4, y);
      ctx.lineTo(x - 1, y + 3);
      ctx.lineTo(x + 5, y - 4);
      ctx.stroke();
    } else if (p.shape === 'petal') {
      ctx.fillRect(x - s, y - 2, s * 2, 4);
      ctx.fillRect(x - 2, y - s, 4, s * 2);
    } else ctx.fillRect(x, y, s, s);
  }
  ctx.restore();
}
