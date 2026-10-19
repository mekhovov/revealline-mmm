import { drawTeamEmitterWarning } from '../couch/coop-emitter-presentation.mjs';
import { drawTeamAnchor } from '../couch/coop-anchor-presentation.mjs';

/** Functional overlays stay visible with any Studio picture/theme. Shapes,
 * numbers and patterns carry meaning independently of colour or motion. */
export function drawCoopExpedition(ctx, run, { palette, frames, anchorFrames } = {}) {
  const env = run.environment;
  if (!env) return;
  const accent = palette?.accent ?? '#ffd279',
    // Theme paper can be nearly black. Fixed pale ink on the fixed dark
    // marker backing keeps functional labels readable in every Studio theme.
    ink = '#fff4db',
    danger = palette?.danger ?? '#fc786f';
  ctx.save();
  try {
    ctx.lineWidth = 0.13;
    ctx.strokeStyle = accent;
    ctx.fillStyle = ink;
    const mark = (p, label, size = 0.8) => {
      ctx.fillStyle = '#07141c';
      ctx.fillRect(p.x - size, p.y - size, size * 2, size * 2);
      ctx.strokeRect(p.x - size, p.y - size, size * 2, size * 2);
      // Vector numerals remain readable at tiny occupied sizes, independently
      // of a Studio font's minimum raster size or missing arrow glyphs.
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.scale(size, size);
      ctx.strokeStyle = ink;
      ctx.lineWidth = 0.16;
      const line = (x1, y1, x2, y2) => {
        ctx.moveTo(x1, y1);
        ctx.lineTo(x2, y2);
      };
      ctx.beginPath();
      if (/^P?[1-4]$/.test(label)) {
        const segments = [
          [-0.35, -0.6, 0.35, -0.6],
          [0.35, -0.6, 0.35, 0],
          [0.35, 0, 0.35, 0.6],
          [-0.35, 0.6, 0.35, 0.6],
          [-0.35, 0, -0.35, 0.6],
          [-0.35, -0.6, -0.35, 0],
          [-0.35, 0, 0.35, 0],
        ];
        const active = { 1: [1, 2], 2: [0, 1, 6, 4, 3], 3: [0, 1, 6, 2, 3], 4: [5, 6, 1, 2] }[
          label.at(-1)
        ];
        for (const index of active) line(...segments[index]);
        if (label.startsWith('P')) {
          line(-0.65, -0.6, -0.65, 0.6);
          line(-0.65, -0.6, -0.45, -0.6);
          line(-0.45, -0.6, -0.45, -0.15);
          line(-0.45, -0.15, -0.65, -0.15);
        }
      } else if (label === '−') line(-0.5, 0, 0.5, 0);
      else {
        if (label === '↕') ctx.rotate(Math.PI / 2);
        line(-0.6, 0, 0.6, 0);
        line(-0.6, 0, -0.25, -0.35);
        line(-0.6, 0, -0.25, 0.35);
        line(0.6, 0, 0.25, -0.35);
        line(0.6, 0, 0.25, 0.35);
      }
      ctx.stroke();
      ctx.restore();
    };
    const rotations = { right: 0, down: Math.PI / 2, left: Math.PI, up: -Math.PI / 2 };
    for (const zone of env.currents)
      for (let y = zone.y + 1; y < zone.y + zone.h; y += 3)
        for (let x = zone.x + 1; x < zone.x + zone.w; x += 3) {
          if (run.cells[Math.floor(y) * run.width + Math.floor(x)] !== 0) continue;
          ctx.save();
          ctx.translate(x, y);
          ctx.rotate(rotations[zone.direction]);
          ctx.beginPath();
          ctx.moveTo(-0.6, -0.45);
          ctx.lineTo(0.1, 0);
          ctx.lineTo(-0.6, 0.45);
          ctx.moveTo(0, -0.45);
          ctx.lineTo(0.7, 0);
          ctx.lineTo(0, 0.45);
          ctx.stroke();
          ctx.restore();
        }
    env.relays.forEach((relay, i) => {
      drawTeamAnchor(
        ctx,
        anchorFrames,
        { ...relay.objective, captured: relay.open },
        { accent, paper: '#07141c', safe: palette?.safe ?? '#c9e4a0' },
        2.2,
      );
      if (relay.open) return;
      const g = relay.gate;
      ctx.setLineDash([0.3, 0.2]);
      ctx.strokeRect(g.x + 0.1, g.y + 0.1, g.w - 0.2, g.h - 0.2);
      ctx.setLineDash([]);
      mark(relay.objective, String(i + 1));
      mark({ x: g.x + g.w / 2, y: g.y + g.h / 2 }, String(i + 1), 0.6);
    });
    env.stages.forEach((p, i) => {
      if (i < env.stage) return;
      drawTeamAnchor(
        ctx,
        anchorFrames,
        { ...p, captured: false },
        { accent, paper: '#07141c' },
        2.2,
      );
      ctx.setLineDash(i === env.stage ? [] : [0.15, 0.2]);
      mark(p, String(i + 1));
      ctx.setLineDash([]);
      if (i !== env.stage) {
        ctx.beginPath();
        ctx.moveTo(p.x - 0.7, p.y - 0.7);
        ctx.lineTo(p.x + 0.7, p.y + 0.7);
        ctx.stroke();
      }
    });
    for (const emitter of env.emitters) {
      if (emitter.disabled) continue;
      mark(emitter, emitter.axis === 'horizontal' ? '↔' : '↕');
      if (emitter.phase !== 'warning') continue;
      const horizontal = emitter.axis === 'horizontal',
        line = emitter.line + 0.5;
      const target = horizontal
        ? { x: run.players[emitter.target].x, y: line }
        : { x: line, y: run.players[emitter.target].y };
      drawTeamEmitterWarning(ctx, frames, emitter, target, { accent });
      ctx.strokeStyle = danger;
      ctx.setLineDash([0.5, 0.3]);
      ctx.beginPath();
      ctx.moveTo(horizontal ? 1 : line, horizontal ? line : 1);
      ctx.lineTo(horizontal ? run.width - 1 : line, horizontal ? line : run.height - 1);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.strokeStyle = accent;
      mark(target, `P${emitter.target + 1}`, 0.75);
    }
    for (const eroder of env.erosion) {
      if (eroder.disabled) continue;
      mark(eroder, '−');
      for (const i of eroder.warning) {
        const x = i % run.width,
          y = Math.floor(i / run.width);
        ctx.strokeStyle = danger;
        ctx.strokeRect(x, y, 1, 1);
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.lineTo(x + 1, y + 1);
        ctx.moveTo(x + 1, y);
        ctx.lineTo(x, y + 1);
        ctx.stroke();
      }
      ctx.strokeStyle = accent;
    }
    for (const p of env.patrols) {
      ctx.fillStyle = danger;
      ctx.beginPath();
      ctx.moveTo(p.x, p.y - 0.6);
      ctx.lineTo(p.x + 0.6, p.y);
      ctx.lineTo(p.x, p.y + 0.6);
      ctx.lineTo(p.x - 0.6, p.y);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = ink;
      ctx.stroke();
      ctx.strokeStyle = accent;
    }
  } finally {
    ctx.restore();
  }
}
