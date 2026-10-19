import { t } from '../i18n/index.mjs';
// Keep the visual sampler independent of the music engine so optional games can
// project the exact same confetti implementation without loading an audio host.
function hashText(value) {
  let hash = 2166136261;
  for (const character of String(value)) hash = Math.imul(hash ^ character.charCodeAt(0), 16777619);
  return hash >>> 0;
}
const clamp = (v, a, b) => Math.min(b, Math.max(a, v)),
  TAU = Math.PI * 2;
const ease = (v) => 1 - (1 - clamp(v, 0, 1)) ** 3;
export const CELEBRATION_SECONDS = 5.2;
const PAPER_COUNT = 104;
const GLINT_COUNT = 16;
// Keep the family IDs stable for existing presentation consumers. Each now
// selects a paper palette; the firework-like bloom uses paper and stars only.
const CONFETTI_TONES = {
  'signal-clear': ['accent', 'safe', 'paper', 'danger', 'accent', 'safe'],
  'stitch-bloom': ['accent', 'danger', 'paper', 'safe', 'danger', 'accent'],
  'savings-nodes': ['safe', 'accent', 'paper', 'safe', 'danger', 'accent'],
  'neon-fireworks': ['danger', 'safe', 'paper', 'accent', 'safe', 'danger'],
};
// Stateless presentation randomness: sampling a frame never consumes gameplay
// randomness, accumulates particles or depends on the rendering frame rate.
function sample(seed, index, channel) {
  let value = seed ^ Math.imul(index + 1, 0x9e3779b1) ^ Math.imul(channel + 1, 0x85ebca6b);
  value = Math.imul(value ^ (value >>> 16), 0x7feb352d);
  value = Math.imul(value ^ (value >>> 15), 0x846ca68b);
  return ((value ^ (value >>> 16)) >>> 0) / 4294967296;
}
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
      pictureScale: 1,
      progress: 1,
      phase: 'picture',
      particles: [],
      equipment: [],
    };
  const time = state.elapsed,
    finished = time >= state.duration,
    fade = 1 - ease((time - 2.45) / (state.duration - 2.45)),
    particles = [];
  if (!finished && !state.reduced) {
    const tones = CONFETTI_TONES[state.kind] || CONFETTI_TONES['signal-clear'];
    // Three finite pops from the picture's center. Analytic drag gives a quick
    // launch and a floating finish, without integrating or consuming run RNG.
    for (let index = 0; index < PAPER_COUNT; index++) {
      const random = (channel) => sample(state.seed, index, channel),
        wave = index < 52 ? 0 : index < 84 ? 1 : 2,
        age = time - 0.08 - wave * 0.24 - random(0) * 0.07;
      if (age < 0) continue;
      const phase = random(1) * TAU,
        depth = random(2),
        angle = index * 2.399963229728653 + (random(3) - 0.5) * 0.4,
        speed = (0.85 + depth * 0.8) * (1 - wave * 0.12),
        distance = (speed * (1 - Math.exp(-2.5 * age))) / 2.5,
        flutter = (1 - Math.exp(-3 * age)) * 0.014,
        life = clamp(age / 0.08, 0, 1);
      particles.push({
        shape: 'paper',
        x: 0.5 + Math.cos(angle) * distance + Math.sin(age * 5 + phase) * flutter,
        y: 0.5 + Math.sin(angle) * distance + 0.012 * age * age,
        size: (5 + depth * 4.4) * ease(life),
        aspect: index % 6 === 0 ? 2.25 : 0.48 + random(6) * 0.46,
        rotation: angle + age * (2.2 + random(7) * 4) * (index % 2 ? 1 : -1),
        flip: 0.18 + Math.abs(Math.cos(phase + age * (3 + depth * 3))) * 0.82,
        alpha: ease(life) * fade * (0.76 + depth * 0.24),
        tone: tones[index % tones.length],
      });
    }
    // Sparse stars lead the bloom outwards. One smooth glow per star, no flash
    // or repeated twinkling, so the earned image quickly regains the center.
    for (let index = 0; index < GLINT_COUNT; index++) {
      const age = time - 0.1 - (index % 2) * 0.24,
        life = 1.05;
      if (age < 0 || age > life) continue;
      const angle = (index / GLINT_COUNT) * TAU + sample(state.seed, index, 9) * 0.2,
        distance = 0.52 * (1 - Math.exp(-3.8 * age)),
        bloom = Math.sin((age / life) * Math.PI);
      particles.push({
        shape: 'glint',
        x: 0.5 + Math.cos(angle) * distance,
        y: 0.5 + Math.sin(angle) * distance,
        size: 2 + bloom * 3.5,
        rotation: angle + age * 0.4,
        alpha: bloom * 0.75,
        tone: index % 3 ? 'paper' : 'accent',
      });
    }
  }
  return {
    active: !finished,
    finished,
    reveal: finished || state.reduced ? 1 : ease(time / 0.85),
    pictureScale: finished || state.reduced ? 1 : 1 + 0.014 * (1 - ease(time / 1.35)),
    progress: clamp(time / state.duration, 0, 1),
    phase: finished ? 'picture' : time < 0.85 ? 'reveal' : time < 2.45 ? 'celebrate' : 'settle',
    kind: state.kind,
    elapsed: time,
    duration: state.duration,
    particles,
    equipment: [],
  };
}
export function drawCelebration(ctx, frame, palette, width = 768, height = 576) {
  if (!frame.active) return;
  const span = Math.min(width, height),
    scale = Math.max(0.75, Math.min(width / 768, height / 576));
  ctx.save();
  // Use equal pixel distances on both axes: a circular burst stays circular
  // on a wide board or a portrait video viewport. Clip at the owning surface.
  ctx.beginPath();
  ctx.rect(0, 0, width, height);
  ctx.clip();
  for (const p of frame.particles) {
    if (p.alpha <= 0) continue;
    const size = p.size * scale;
    ctx.save();
    ctx.globalAlpha = clamp(p.alpha, 0, 1);
    ctx.fillStyle = palette[p.tone] || palette.accent;
    ctx.translate(width / 2 + (p.x - 0.5) * span, height / 2 + (p.y - 0.5) * span);
    ctx.rotate(p.rotation);
    if (p.shape === 'paper') {
      ctx.scale(p.flip, 1);
      ctx.fillRect(-size / 2, (-size * p.aspect) / 2, size, size * p.aspect);
      // A narrow lighter fold makes the paper feel tactile without glow or blur.
      ctx.globalAlpha *= 0.32;
      ctx.fillStyle = palette.paper || '#fff4dc';
      ctx.fillRect(-size / 2, (-size * p.aspect) / 2, size, Math.min(1, size * p.aspect * 0.22));
    } else if (p.shape === 'glint') {
      ctx.beginPath();
      ctx.moveTo(0, -size);
      ctx.lineTo(size * 0.22, -size * 0.22);
      ctx.lineTo(size, 0);
      ctx.lineTo(size * 0.22, size * 0.22);
      ctx.lineTo(0, size);
      ctx.lineTo(-size * 0.22, size * 0.22);
      ctx.lineTo(-size, 0);
      ctx.lineTo(-size * 0.22, -size * 0.22);
      ctx.closePath();
      ctx.fill();
    }
    ctx.restore();
  }
  ctx.restore();
}
