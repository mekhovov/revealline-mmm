import { enemyCatalogRecord, resolveEnemySkin } from '../enemy-catalog.mjs';
// Cosmetic poses, pixel silhouettes and cut effects. No simulation objects are changed.
const TAU = Math.PI * 2;
const CELL = 16;
// Functional information must stay luminous even when a dark UI theme swaps
// its ink/paper tokens. These do not recolor authored body-image pixels.
export const PRESENTATION_INK = '#f1f7ed';
export const PRESENTATION_PLATE = '#07111c';
const clamp = (n, a, b) => Math.max(a, Math.min(b, n));
const finite = (n, fallback = 0) => (Number.isFinite(n) ? n : fallback);
const angleDelta = (a, b) => ((((a - b + Math.PI) % TAU) + TAU) % TAU) - Math.PI;
const family = (id, fallback) =>
  ['fpv', 'ukraine', 'retro', 'coupa'].includes(id)
    ? id
    : ({ fpv: 'fpv', atlas: 'ukraine', retro: 'retro', navi: 'coupa' }[fallback] ?? 'retro');
export const ACTOR_PRESENTATION_LIMITS = Object.freeze({
  actors: 64,
  tailPoints: 3,
  maximumLogicalSize: 64,
  maximumBossSize: 80,
  desktopMinimum: 24,
  phoneMinimum: 16,
  maximumCSSSize: 32,
});

export function actorRole(type) {
  return (
    {
      'contour-patrol': 'contour',
      'claimed-rover': 'rover',
      eroder: 'eroder',
      'border-patrol': 'patrol',
      'lane-boss': 'boss',
      'relay-sentinel': 'boss',
    }[type] ?? 'enemy'
  );
}
export function actorDiameter({
  role = 'enemy',
  style = 'hybrid',
  screenScale = 1,
  canvasCSSWidth = 1152,
  scale = 1,
} = {}) {
  const s = clamp(finite(screenScale, 1), 0.1, 4),
    boss = role === 'boss';
  const base = (style === 'microtile' ? 26 : style === 'props' ? 34 : 30) * (boss ? 1.3 : 1);
  const desired = base * clamp(finite(scale, 1), 0.75, 1.5);
  const minimum = canvasCSSWidth >= 480 ? 24 : 16;
  return clamp(clamp(desired, minimum / s, (boss ? 40 : 32) / s), 18, boss ? 80 : 64);
}

/** Retain only previous observed positions and cosmetic clocks, never entity references. */
export function createActorPresentation() {
  let prior = new Map();
  return {
    reset() {
      prior = new Map();
    },
    sample(
      enemies,
      {
        tick = 0,
        time = 0,
        dt = 0,
        paused = false,
        reduced = false,
        classic = null,
        themeId = 'fpv',
        themeFamily = null,
        style = 'hybrid',
        screenScale = 1,
        canvasCSSWidth = 1152,
        scale = 1,
        actorSkins = {},
      } = {},
    ) {
      const next = new Map(),
        frames = new Map(),
        details = new Map((classic?.enemies ?? []).map((e) => [e.id, e]));
      const elapsed = clamp(finite(dt), 0, 0.1);
      for (const actor of enemies.slice(0, ACTOR_PRESENTATION_LIMITS.actors)) {
        if (!Number.isFinite(actor.x) || !Number.isFinite(actor.y)) continue;
        const old = prior.get(actor.id),
          detail = details.get(actor.id),
          role = actorRole(actor.type);
        const stunned = Boolean(detail?.stunned) || (actor.stunnedUntil ?? 0) > time;
        const locked =
          paused ||
          Boolean(detail?.frozen) ||
          stunned ||
          ['dormant', 'idle'].includes(detail?.mode);
        let speed = old?.speed ?? Math.hypot(finite(actor.vx), finite(actor.vy));
        let heading =
          old?.heading ??
          (speed > 0 ? Math.atan2(finite(actor.vy), finite(actor.vx)) + Math.PI / 2 : 0);
        let target = old?.target ?? heading;
        if (!locked && old && old.tick !== tick) {
          const dx = actor.x - old.x,
            dy = actor.y - old.y,
            distance = Math.hypot(dx, dy);
          speed = distance / Math.max(1 / 120, time - old.time);
          if (distance > 0.00001) target = Math.atan2(dy, dx) + Math.PI / 2;
        }
        const delta = angleDelta(target, heading);
        if (!locked)
          heading = reduced ? target : heading + clamp(delta, -elapsed * 12, elapsed * 12);
        const phase =
          (old?.phase ?? 0) + (locked || reduced ? 0 : elapsed * (1 + Math.min(speed, 12) * 0.13));
        const travelPhase =
          (old?.travelPhase ?? 0) + (locked || reduced ? 0 : elapsed * Math.min(speed, 12) * 0.45);
        const tail = old?.tail ? [...old.tail] : [];
        if (
          !locked &&
          !reduced &&
          old &&
          old.tick !== tick &&
          Math.hypot(actor.x - old.x, actor.y - old.y) > 0.025
        )
          tail.unshift({ x: old.x, y: old.y });
        const keptTail =
          reduced || speed < 0.05
            ? []
            : tail.filter((p) => Math.hypot(p.x - actor.x, p.y - actor.y) < 1.15).slice(0, 3);
        const bank = reduced ? 0 : locked ? (old?.bank ?? 0) : clamp(delta * 0.12, -0.15, 0.15);
        const record = {
          x: actor.x,
          y: actor.y,
          tick,
          time,
          phase,
          travelPhase,
          heading,
          target,
          speed,
          tail: keptTail,
          bank,
        };
        next.set(actor.id, record);
        frames.set(
          actor.id,
          Object.freeze({
            id: actor.id,
            x: actor.x * CELL,
            y: actor.y * CELL,
            role,
            type: actor.type,
            themeId:
              resolveEnemySkin(actor.type, actorSkins[actor.type]) ?? family(themeId, themeFamily),
            style,
            heading,
            phase,
            travelPhase,
            speed: locked ? 0 : speed,
            bank,
            locked,
            reduced,
            stunned,
            dormant: ['dormant', 'idle'].includes(detail?.mode),
            diameter: actorDiameter({ role, style, screenScale, canvasCSSWidth, scale }),
            radius: clamp(finite(actor.radius, 0.25), 0.05, 0.75) * CELL,
            tail: Object.freeze(keptTail.map((p) => Object.freeze({ ...p }))),
          }),
        );
      }
      prior = next;
      return frames;
    },
  };
}

const rect = (c, color, x, y, w, h) => {
  c.fillStyle = color;
  c.fillRect(Math.round(x), Math.round(y), w, h);
};
function rotor(c, x, y, phase, colors, compact) {
  rect(c, colors.dark, x - 4, y - 4, 8, 8);
  c.save();
  c.translate(x, y);
  c.rotate(phase % TAU);
  for (let i = 0; i < 3; i++) {
    c.rotate(TAU / 3);
    rect(c, colors.light, -1, -5, 2, compact ? 3 : 4);
    rect(c, colors.body, -1, -5, 1, 2);
  }
  c.restore();
  rect(c, colors.light, x - 1, y - 1, 2, 2);
}
function treads(c, colors, phase, compact) {
  for (const x of [-13, 9]) {
    rect(c, colors.dark, x, -11, 4, 24);
    rect(c, colors.body, x + 1, -10, 2, 22);
    // Microtile is a simpler material treatment, not a motion-off setting.
    for (let y = -7; y < 8; y += compact ? 8 : 5)
      rect(c, colors.light, x + 1, y + (Math.floor(phase * 9) % 3), 2, 2);
  }
}
function fpv(c, f, colors) {
  const compact = f.style === 'microtile',
    phase = f.phase;
  if (f.role === 'patrol' || f.role === 'contour') {
    for (const x of [-7, 7])
      for (const y of [-7, 7]) {
        rect(c, colors.body, Math.min(0, x), Math.min(0, y), Math.abs(x) + 1, 2);
        rotor(c, x, y, phase * 7 * (x * y > 0 ? 1 : -1), colors, compact);
      }
    rect(c, colors.dark, -4, -7, 8, 14);
    rect(c, colors.body, -3, -6, 6, 12);
    rect(c, colors.light, -2, -6, 4, 2);
    rect(c, colors.trim, -2, 3, 4, 2);
  } else if (f.role === 'boss') {
    treads(c, colors, f.travelPhase, compact);
    rect(c, colors.body, -7, -6, 14, 15);
    rect(c, colors.dark, -5, -4, 10, 5);
    c.save();
    c.rotate(f.reduced ? 0 : Math.sin(phase * 1.5) * 0.45);
    rect(c, colors.dark, -10, -12, 20, 5);
    rect(c, colors.light, -8, -11, 16, 2);
    rect(c, colors.body, -1, -10, 2, 10);
    c.restore();
  } else {
    treads(c, colors, f.travelPhase, compact);
    rect(c, colors.dark, -7, -10, 14, 21);
    rect(c, colors.body, -6, -9, 12, 18);
    rect(c, colors.light, -5, -8, 10, 2);
    rect(c, colors.trim, -4, 5, 8, 2);
    rect(c, colors.dark, -4, -5, 8, 9);
    rect(c, colors.body, -3, -4, 6, 7);
    if (f.role === 'eroder') {
      for (let x = -8; x <= 8; x += 4)
        rect(c, colors.light, x, -12 + (Math.floor(phase * 8) % 2), 2, 4);
    } else if (f.role === 'rover') {
      rect(c, colors.light, -4, -6, 3, 2);
      rect(c, colors.light, 1, -6, 3, 2);
    } else {
      rect(c, colors.dark, -2, -14, 4, 11);
      rect(c, colors.light, -1, -13, 2, 9);
    }
  }
}
function ukraine(c, f, colors) {
  const flap = f.reduced ? 0 : Math.sin(f.phase * 5),
    compact = f.style === 'microtile';
  if (f.role === 'patrol' || f.role === 'contour') {
    for (const side of [-1, 1]) {
      c.save();
      c.scale(side, 1);
      rect(c, colors.dark, 1, -7, 11, 14);
      rect(c, colors.body, 2, -6 + flap * 2, 9, 7);
      rect(c, colors.trim, 3, 2 - flap * 2, 6, 5);
      if (!compact) rect(c, colors.light, 5, -4, 3, 3);
      c.restore();
    }
    rect(c, colors.dark, -2, -10, 4, 21);
    rect(c, colors.light, -1, -9, 2, 16);
  } else if (f.role === 'boss' || f.role === 'eroder') {
    for (let i = 0; i < 8; i++) {
      c.save();
      c.rotate((i * TAU) / 8);
      rect(c, colors.dark, -3, -13, 6, 8);
      rect(c, i % 2 ? colors.trim : colors.body, -2, -12 + (compact ? 0 : flap), 4, 7);
      if (!compact) rect(c, colors.light, -1, -11, 2, 2);
      c.restore();
    }
    rect(c, colors.dark, -5, -5, 10, 10);
    rect(c, colors.body, -3, -3, 6, 6);
  } else {
    for (const side of [-1, 1])
      for (let i = 0; i < 3; i++)
        rect(
          c,
          colors.trim,
          side < 0 ? -12 : 6,
          -6 + i * 6 + Math.round(Math.sin(f.travelPhase * 8 + i) * 2),
          6,
          2,
        );
    rect(c, colors.dark, -8, -10, 16, 22);
    rect(c, colors.body, -6, -8, 12, 18);
    rect(c, colors.trim, -1, -8, 2, 18);
    for (const x of [-4, 2]) {
      rect(c, colors.light, x, -11, 2, 3);
      if (!compact) {
        rect(c, colors.dark, x, -4, 2, 3);
        rect(c, colors.light, x, 4, 2, 2);
      }
    }
  }
}
function retro(c, f, colors) {
  const step = f.reduced ? 0 : Math.floor(f.travelPhase * 7) % 2,
    compact = f.style === 'microtile';
  if (f.role === 'patrol' || f.role === 'contour') {
    rect(c, colors.dark, -5, -14, 10, 25);
    rect(c, colors.body, -4, -13, 8, 23);
    rect(c, colors.light, -2, -9, 4, 8);
    rect(c, colors.trim, -7, -3, 3, 9);
    rect(c, colors.trim, 4, -3, 3, 9);
    rect(c, colors.body, -2, 9, 4, 3 + step * 2);
  } else if (f.role === 'eroder') {
    for (let i = 0; i < 4; i++) {
      c.save();
      c.rotate((i * Math.PI) / 2);
      rect(c, colors.dark, -4, -13, 8, 10);
      rect(c, colors.body, -3, -12 + step, 6, 8);
      rect(c, colors.light, -2, -11, 4, 2);
      c.restore();
    }
    rect(c, colors.trim, -5, -5, 10, 10);
  } else {
    rect(c, colors.dark, -13, -9, 26, 18);
    rect(c, colors.body, -12, -8, 24, 15);
    rect(c, colors.trim, -7, -11, 4, 4);
    rect(c, colors.trim, 3, -11, 4, 4);
    rect(c, colors.dark, -7, -4, 14, 6);
    rect(c, colors.light, -6, -3, 4, 2);
    rect(c, colors.light, 2, -3, 4, 2);
    for (const x of [-12, 7]) rect(c, colors.trim, x, 8 + (x < 0 ? step : 1 - step) * 2, 5, 3);
    if (!compact) for (let x = -5; x <= 4; x += 3) rect(c, colors.light, x, 4, 2, 1);
    if (f.role === 'boss') {
      rect(c, colors.trim, -14, -4, 3, 9);
      rect(c, colors.trim, 11, -4, 3, 9);
    }
  }
}
function coupa(c, f, colors) {
  const compact = f.style === 'microtile',
    step = f.reduced ? 0 : Math.floor(f.travelPhase * 6) % 2;
  if (f.role === 'boss' || f.role === 'eroder') {
    for (let i = 0; i < 4; i++) {
      c.save();
      c.rotate((i * Math.PI) / 2);
      rect(c, colors.dark, -4, -13, 8, 8);
      rect(c, colors.trim, -3, -12, 6, 6);
      if (!compact) rect(c, colors.light, -2, -11, 2, 2);
      c.restore();
    }
    rect(c, colors.dark, -7, -7, 14, 14);
    rect(c, colors.body, -5, -5, 10, 10);
  } else if (f.role === 'patrol' || f.role === 'contour') {
    rect(c, colors.dark, -13, -13, 26, 26);
    rect(c, colors.body, -12, -12, 24, 24);
    rect(c, colors.light, -12, -12, 24, 2);
    rect(c, colors.trim, -2, -12, 4, 24);
    rect(c, colors.dark, -4, -2, 8, 4);
    rect(c, colors.light, -2, -2, 4, 2);
    rect(c, colors.trim, -5, 10 + step, 3, 2);
    rect(c, colors.trim, 2, 11 - step, 3, 2);
  } else {
    rect(c, colors.dark, -9, -12, 18, 24);
    rect(c, colors.light, -7, -12, 14, 24);
    rect(c, colors.body, -7, -10, 14, 4);
    rect(c, colors.trim, 3, -10, 4, 4);
    for (let y = -2; y < 7; y += 4) rect(c, colors.dark, -4, y, compact ? 6 : 8, 1);
    rect(c, colors.body, -11, 4 + step, 3, 6);
    rect(c, colors.body, 8, 5 - step, 3, 6);
    if (f.role === 'rover') {
      rect(c, colors.dark, -10, 11, 7, 3);
      rect(c, colors.dark, 3, 11, 7, 3);
    }
  }
}

export function roleColor(type) {
  return (
    {
      bouncer: '#ff6d91',
      'border-patrol': '#ffac69',
      'contour-patrol': '#60dedc',
      'claimed-rover': '#b69aff',
      eroder: '#edc15c',
      'lane-boss': '#ff805e',
      'relay-sentinel': '#ff70ba',
    }[type] ?? '#ff6d91'
  );
}
const BADGES = Object.freeze({
  diamond: ['00100', '01110', '11011', '01110', '00100'],
  frame: ['11111', '10001', '10001', '10001', '11111'],
  corner: ['11111', '10000', '10111', '10100', '10100'],
  feet: ['01110', '11111', '01010', '11011', '11011'],
  bite: ['11111', '11000', '11110', '11000', '11111'],
  lane: ['10101', '10101', '10101', '10101', '10101'],
  lock: ['01110', '01010', '11111', '11011', '11111'],
});
function drawRoleBadge(c, f, colors) {
  const badge = BADGES[enemyCatalogRecord(f.type)?.badge];
  if (!badge) return;
  c.save();
  const unit = Math.max(1, f.diameter / 28);
  c.translate(Math.round(f.diameter * 0.22), Math.round(f.diameter * 0.2));
  c.scale(unit, unit);
  rect(c, colors.dark, -1, -1, 7, 7);
  badge.forEach((row, y) =>
    [...row].forEach((v, x) => {
      if (v === '1') rect(c, roleColor(f.type), x, y, 1, 1);
    }),
  );
  c.restore();
}
// Role-exclusive original silhouettes. Palette changes cannot merge these outlines.
function distinctBody(c, f, k) {
  const phase = f.reduced ? 0 : Math.sin(f.phase * 5),
    step = f.reduced ? 0 : Math.floor(f.travelPhase * 8) % 2;
  if (f.role === 'contour') {
    if (f.themeId === 'fpv') {
      rect(c, k.dark, -4, -13, 8, 25);
      rect(c, k.body, -3, -12, 6, 23);
      rect(c, k.trim, -10, -2, 20, 3);
      rotor(c, -8, 0, f.phase * 8, k, f.style === 'microtile');
      rotor(c, 8, 0, -f.phase * 8, k, f.style === 'microtile');
      rect(c, k.light, -2, -11, 4, 3);
      rect(c, k.body, -6, 9, 12, 3);
    } else if (f.themeId === 'ukraine') {
      for (let i = 0; i < 5; i++) {
        const x = Math.round(Math.sin(i * 1.2 + phase * 0.25) * 5);
        rect(c, k.dark, x - 4, -12 + i * 5, 9, 7);
        rect(c, k.body, x - 3, -11 + i * 5, 7, 5);
      }
      rect(c, k.light, -2, -12, 2, 2);
      rect(c, k.trim, 2, -13, 4, 2);
    } else if (f.themeId === 'retro') {
      rect(c, k.dark, -11, -13, 22, 27);
      rect(c, k.body, -10, -12, 20, 6);
      for (const x of [-10, 5]) {
        rect(c, k.body, x, -6, 5, 20);
        rect(c, k.light, x + 1, 8 + step, 3, 4);
      }
      rect(c, k.trim, -4, -9, 8, 3);
    } else {
      rect(c, k.dark, -9, -12, 18, 24);
      rect(c, k.light, -7, -12, 3, 24);
      rect(c, k.body, -4, -12, 12, 4);
      rect(c, k.body, -4, 8, 12, 4);
      rect(c, k.trim, -2, -5, 3, 10);
      rect(c, k.trim, 1, -2, 9, 3);
      rect(c, k.body, 8, -4, 4, 7);
    }
  } else if (f.role === 'rover') {
    if (f.themeId === 'fpv') {
      for (const x of [-12, 8])
        for (const y of [-9, 5]) {
          rect(c, k.dark, x, y, 4, 7);
          rect(c, k.light, x + 1, y + step, 2, 3);
        }
      rect(c, k.dark, -8, -12, 16, 24);
      rect(c, k.body, -7, -11, 14, 22);
      rect(c, k.dark, -5, -8, 10, 6);
      rect(c, k.light, -4, -7, 8, 3);
      rect(c, k.trim, -5, 5, 10, 3);
    } else if (f.themeId === 'ukraine') {
      for (const x of [-7, 3]) {
        rect(c, k.dark, x, -14, 5, 13);
        rect(c, k.trim, x + 1, -13, 3, 10);
      }
      rect(c, k.dark, -9, -3, 18, 15);
      rect(c, k.body, -8, -2, 16, 12);
      for (const x of [-12, 7]) rect(c, k.trim, x, 5 + (x < 0 ? step : -step), 5, 8);
      rect(c, k.light, -5, -1, 3, 3);
      rect(c, k.light, 2, -1, 3, 3);
    } else if (f.themeId === 'retro') {
      rect(c, k.dark, -8, -13, 16, 24);
      rect(c, k.body, -7, -12, 14, 22);
      rect(c, k.dark, -5, -9, 10, 9);
      rect(c, k.light, -4, -8, 8, 6);
      rect(c, k.trim, -11, -1, 4, 6);
      rect(c, k.trim, 7, -1, 4, 6);
      rect(c, k.body, -10, 9 + step, 6, 4);
      rect(c, k.body, 4, 10 - step, 6, 4);
    } else {
      rect(c, k.dark, -11, -9, 22, 17);
      rect(c, k.body, -10, -8, 20, 15);
      rect(c, k.light, -7, -6, 14, 8);
      rect(c, k.trim, -13, -12, 4, 12);
      for (const x of [-9, 5]) {
        rect(c, k.dark, x, 8, 5, 6);
        rect(c, k.light, x + 1, 9 + step, 3, 2);
      }
    }
  } else if (f.type === 'lane-boss') {
    if (f.themeId === 'fpv') {
      treads(c, k, f.travelPhase, f.style === 'microtile');
      rect(c, k.body, -7, -2, 14, 13);
      c.save();
      c.rotate(f.reduced ? 0 : phase * 0.18);
      rect(c, k.dark, -13, -12, 26, 7);
      rect(c, k.light, -12, -11, 24, 3);
      rect(c, k.trim, -1, -9, 2, 9);
      c.restore();
    } else if (f.themeId === 'ukraine') {
      for (const x of [-12, 7]) {
        rect(c, k.dark, x, -12, 5, 25);
        rect(c, k.body, x + 1, -11, 3, 22);
      }
      rect(c, k.trim, -9, -10, 18, 4);
      rect(c, k.light, -2, -7, 4, 14);
      rect(c, k.trim, -6, 0, 12, 3);
    } else if (f.themeId === 'retro') {
      rect(c, k.dark, -6, -14, 12, 28);
      rect(c, k.body, -5, -13, 10, 26);
      for (const y of [-9, -1, 7]) {
        rect(c, k.trim, -12, y, 24, 4);
        rect(c, k.light, -3, y, 6, 3);
      }
    } else {
      for (const x of [-13, 6]) {
        rect(c, k.dark, x, -13, 7, 26);
        rect(c, k.body, x + 1, -12, 5, 24);
      }
      rect(c, k.trim, -8, -3, 16, 6);
      rect(c, k.light, -5, -1, 10, 2);
    }
  } else if (f.role === 'eroder') {
    if (f.themeId === 'fpv') {
      rect(c, k.dark, -8, -9, 16, 21);
      rect(c, k.body, -7, -8, 14, 19);
      for (let i = 0; i < 3; i++) {
        const w = 12 - i * 4;
        rect(c, i % 2 ? k.light : k.trim, -w / 2, -10 - i * 2, w, 3);
      }
      // Auger teeth idle while mobile tread highlights follow travel only.
      rect(c, k.dark, -4 + (Math.floor(f.phase * 6) % 3) * 2, -13, 2, 7);
      for (const x of [-12, 7]) {
        rect(c, k.dark, x, -3, 5, 15);
        for (const y of [0, 7]) rect(c, k.trim, x + 1, y + step, 3, 2);
      }
      rect(c, k.light, -3, -5, 6, 2);
    } else if (f.themeId === 'ukraine') {
      for (let i = 0; i < 6; i++) {
        c.save();
        c.rotate((i * Math.PI) / 3);
        rect(c, k.dark, -3, -13, 6, 8);
        rect(c, k.trim, -2, -12 + phase, 4, 6);
        c.restore();
      }
      rect(c, k.body, -6, -6, 12, 12);
      rect(c, k.dark, -3, -3, 6, 6);
    } else if (f.themeId === 'retro') {
      for (let i = 0; i < 8; i++) {
        c.save();
        c.rotate((i * Math.PI) / 4 + (f.reduced ? 0 : f.phase));
        rect(c, k.dark, -3, -13, 6, 8);
        rect(c, k.body, -2, -12, 4, 6);
        c.restore();
      }
      rect(c, k.trim, -5, -5, 10, 10);
      rect(c, k.light, -2, -2, 4, 4);
    } else {
      rect(c, k.dark, -12, -10, 24, 22);
      rect(c, k.body, -11, -9, 22, 20);
      rect(c, k.light, -8, -13, 16, 11);
      rect(c, k.dark, -9, -3, 18, 5);
      for (let x = -8; x < 9; x += 4) rect(c, k.trim, x, 5 + step, 2, 8);
    }
  } else return false;
  return true;
}

/** Original body-only skin; caller owns placement/size and functional badges. */
export function drawEnemySilhouette(ctx, frame, colors) {
  if (!distinctBody(ctx, frame, colors))
    (({ fpv, ukraine, retro, coupa })[frame.themeId] ?? retro)(ctx, frame, colors);
}

/** Image roles override only the body; collision-center cues retain their physical size. */
export function drawPresentedActor(ctx, frame, palette, image = null) {
  if (!frame) return;
  const colors = {
    dark: PRESENTATION_PLATE,
    body: frame.dormant ? palette.muted : roleColor(frame.type),
    trim: palette.accent,
    light: PRESENTATION_INK,
  };
  ctx.save();
  ctx.imageSmoothingEnabled = false;
  if (!frame.reduced)
    for (let i = frame.tail.length - 1; i >= 0; i--) {
      const point = frame.tail[i];
      ctx.globalAlpha = 0.12 + (3 - i) * 0.035;
      rect(ctx, colors.body, point.x * CELL - 1, point.y * CELL - 1, 2, 2);
    }
  ctx.globalAlpha = frame.stunned ? 0.45 : frame.dormant ? 0.65 : 1;
  ctx.translate(Math.round(frame.x), Math.round(frame.y));
  ctx.save();
  ctx.rotate(frame.heading);
  ctx.scale(1 - frame.bank * 0.35, 1 + frame.bank * 0.2);
  const d = frame.diameter;
  if (image) ctx.drawImage(image, -d / 2, -d / 2, d, d);
  else {
    ctx.scale(d / 28, d / 28);
    drawEnemySilhouette(ctx, frame, colors);
  }
  if (image) ctx.scale(d / 28, d / 28);
  // Two small nose pixels give rounded/compact and uploaded bodies a stable
  // heading cue. They remain within the body envelope, never a targeting ray.
  if (frame.role !== 'boss') {
    rect(ctx, colors.dark, -4, -13, 8, 4);
    rect(ctx, colors.light, -3, -12, 2, 2);
    rect(ctx, colors.light, 1, -12, 2, 2);
  }
  ctx.restore();
  drawRoleBadge(ctx, frame, colors);
  // The luminous center is the contact footprint; larger body art is cosmetic.
  ctx.globalAlpha = 0.8;
  ctx.strokeStyle = colors.dark;
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.arc(0, 0, frame.radius, 0, TAU);
  ctx.stroke();
  ctx.strokeStyle = colors.light;
  ctx.lineWidth = 1;
  ctx.stroke();
  rect(ctx, colors.dark, -2, -2, 4, 4);
  rect(ctx, colors.light, -1, -1, 2, 2);
  ctx.restore();
}

export function drawActiveTrail(
  ctx,
  segments,
  points,
  player,
  palette,
  { time = 0, reduced = false, screenScale = 1 } = {},
) {
  const s = clamp(finite(screenScale, 1), 0.1, 4),
    accent = clamp(3 / s, 3, 12),
    outline = accent + clamp(2 / s, 2, 8),
    core = clamp(1 / s, 1, 4),
    head = clamp(5 / s, 8, 24);
  ctx.save();
  ctx.lineCap = 'square';
  ctx.lineJoin = 'miter';
  for (const [color, width, alpha] of [
    [PRESENTATION_PLATE, outline, 1],
    [palette.accent, accent, 1],
    [PRESENTATION_INK, core, 1],
  ]) {
    ctx.strokeStyle = color;
    ctx.lineWidth = width;
    ctx.globalAlpha = alpha;
    ctx.beginPath();
    for (const s of segments) {
      ctx.moveTo(s.x1 * CELL, s.y1 * CELL);
      ctx.lineTo(s.x2 * CELL, s.y2 * CELL);
    }
    ctx.stroke();
  }
  ctx.fillStyle = palette.accent;
  ctx.globalAlpha = 0.12;
  for (const p of points) ctx.fillRect(Math.floor(p.x) * CELL, Math.floor(p.y) * CELL, CELL, CELL);
  if (segments.length) {
    ctx.globalAlpha = 1;
    rect(ctx, palette.accent, player.x * CELL - head / 2, player.y * CELL - head / 2, head, head);
    rect(
      ctx,
      PRESENTATION_INK,
      player.x * CELL - head / 4,
      player.y * CELL - head / 4,
      head / 2,
      head / 2,
    );
    if (!reduced) {
      let remaining = 0.3 + ((time * 3) % 1) * 0.65;
      for (let i = segments.length - 1; i >= 0; i--) {
        const s = segments[i],
          length = Math.hypot(s.x2 - s.x1, s.y2 - s.y1);
        if (length >= remaining) {
          const a = remaining / Math.max(length, 0.00001);
          rect(
            ctx,
            PRESENTATION_INK,
            (s.x2 + (s.x1 - s.x2) * a) * CELL - 1,
            (s.y2 + (s.y1 - s.y2) * a) * CELL - 1,
            3,
            3,
          );
          break;
        }
        remaining -= length;
      }
    }
  }
  ctx.restore();
}

export function drawCapturePulse(ctx, effect, columns, cells, palette, reduced = false) {
  if (reduced || effect.age < 0 || effect.age >= 0.65 || !Array.isArray(effect.indices)) return;
  ctx.save();
  const age = effect.age / 0.65;
  const claimed = new Set(effect.indices.slice(0, 2592));
  for (const index of claimed) {
    if (!Number.isInteger(index) || index < 0 || index >= cells.length || cells[index] !== 1)
      continue;
    const x = index % columns,
      y = Math.floor(index / columns),
      phase = (x / columns + y / (cells.length / columns)) / 2;
    const alpha = Math.max(0, 1 - Math.abs(age - phase) * 5) * (1 - age) * 0.2;
    if (alpha < 0.015) continue;
    ctx.globalAlpha = alpha;
    ctx.fillStyle = palette.accent;
    ctx.fillRect(x * CELL, y * CELL, CELL, CELL);
    // A crisp edge gives the short reveal a readable perimeter. Every pixel
    // remains inside a newly claimed, still-safe cell; no arena-wide flash.
    ctx.fillStyle = PRESENTATION_INK;
    if (!claimed.has(index - columns)) ctx.fillRect(x * CELL, y * CELL, CELL, 2);
    if (!claimed.has(index + columns)) ctx.fillRect(x * CELL, (y + 1) * CELL - 2, CELL, 2);
    if (x === 0 || !claimed.has(index - 1)) ctx.fillRect(x * CELL, y * CELL, 2, CELL);
    if (x === columns - 1 || !claimed.has(index + 1))
      ctx.fillRect((x + 1) * CELL - 2, y * CELL, 2, CELL);
  }
  ctx.restore();
}
