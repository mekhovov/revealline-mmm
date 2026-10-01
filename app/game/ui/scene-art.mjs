import { hashText } from './music.mjs';
const mix = (a, b, t) =>
  '#' +
  [1, 3, 5]
    .map((i) =>
      Math.round(parseInt(a.slice(i, i + 2), 16) * (1 - t) + parseInt(b.slice(i, i + 2), 16) * t)
        .toString(16)
        .padStart(2, '0'),
    )
    .join('');
const poly = (c, p, color) => {
  c.fillStyle = color;
  c.beginPath();
  p.forEach(([x, y], i) => (i ? c.lineTo(x, y) : c.moveTo(x, y)));
  c.closePath();
  c.fill();
};
export function sceneDescriptor(theme, level = {}, seed = 0) {
  const hash = hashText(`${theme.id}:${level.id || 'gallery'}:${level.revision || '1'}:${seed}`);
  return {
    hash,
    variant: hash % 8,
    sunX: 48 + (hash % 270),
    horizon: 112 + ((hash >>> 4) % 30),
    river: (hash >>> 8) % 3,
    scene: theme.scene,
    stars: (hash >>> 12) % 2,
  };
}
/** Draw at a fixed 384×288 pixel design grid, without game state or rewards. */
export function paintScene(ctx, theme, descriptor) {
  const p = theme.palette,
    d = descriptor;
  let random = d.hash || 1;
  const rand = () => {
    random ^= random << 13;
    random ^= random >>> 17;
    random ^= random << 5;
    return (random >>> 0) / 4294967296;
  };
  const sky = mix(p.sky, d.stars ? p.ink : p.accent, d.stars ? 0.32 : 0.08),
    land = mix(p.land, p.ink, 0.12 * (d.variant % 3));
  for (let y = 0; y < 288; y += 3) {
    ctx.fillStyle = mix(sky, land, Math.min(1, y / 270));
    ctx.fillRect(0, y, 384, 3);
  }
  ctx.fillStyle = mix(p.accent, '#ffffff', 0.35);
  ctx.fillRect(d.sunX, 32, 32, 30);
  ctx.fillRect(d.sunX - 4, 38, 40, 18);
  if (d.stars) {
    ctx.fillStyle = mix(p.paper, p.sky, 0.25);
    for (let i = 0; i < 45; i++) {
      const x = Math.floor(rand() * 384),
        y = Math.floor(rand() * 90);
      ctx.fillRect(x, y, 1 + (i % 4 === 0), 1);
    }
  } else
    for (let i = 0; i < 6; i++) {
      const x = Math.floor(rand() * 340),
        y = 20 + Math.floor(rand() * 70);
      ctx.fillStyle = mix(p.paper, sky, 0.6);
      ctx.fillRect(x, y, 28 + i * 3, 4);
      ctx.fillRect(x + 8, y - 4, 16 + i * 2, 4);
    }
  if (d.scene === 'dawn' || d.scene === 'heritage') {
    for (let band = 0; band < 3; band++) {
      const points = [
        [0, 288],
        [0, d.horizon + band * 33],
      ];
      for (let x = 0; x <= 400; x += 16)
        points.push([
          x,
          d.horizon + band * 33 + Math.round((Math.sin(x * 0.018 + band + d.variant) * 16) / 3) * 3,
        ]);
      points.push([384, 288]);
      poly(ctx, points, mix(land, p.ink, 0.15 + band * 0.13));
    }
    const bend = 70 + d.variant * 24;
    if (d.river !== 2)
      poly(
        ctx,
        [
          [bend, 142],
          [bend + 9, 142],
          [bend + 36, 182],
          [bend + 11, 224],
          [bend + 95, 288],
          [bend + 34, 288],
          [bend - 7, 222],
          [bend + 17, 180],
        ],
        mix(p.safe, p.ink, 0.13),
      );
    for (let i = 0; i < 10; i++) {
      const x = 14 + i * 37,
        y = 170 + Math.floor(rand() * 52),
        size = 8 + Math.floor(rand() * 9);
      ctx.fillStyle = mix(p.paper, land, 0.34);
      ctx.fillRect(x, y, size + 4, 12);
      poly(
        ctx,
        [
          [x - 3, y],
          [x + size / 2 + 2, y - 10],
          [x + size + 7, y],
        ],
        mix(p.danger, p.ink, 0.36),
      );
      ctx.fillStyle = p.accent;
      ctx.fillRect(x + 4, y + 4, 3, 4);
      ctx.fillStyle = p.ink;
      ctx.fillRect(x + size - 2, y + 5, 3, 7);
    }
    for (let row = 0; row < 7; row++) {
      ctx.fillStyle = mix(p.accent, land, 0.4 + row * 0.05);
      poly(
        ctx,
        [
          [0, 234 + row * 8],
          [118 + row * 7, 227 + row * 7],
          [130 + row * 6, 231 + row * 7],
          [0, 238 + row * 8],
        ],
        ctx.fillStyle,
      );
    }
    for (let i = 0; i < 22; i++) {
      const x = Math.floor(rand() * 384),
        y = 175 + Math.floor(rand() * 100);
      ctx.fillStyle = mix(land, p.ink, 0.45);
      ctx.fillRect(x, y, 3, 10);
      ctx.fillStyle = mix(p.safe, land, 0.65);
      ctx.fillRect(x - 4, y - 6, 11, 10);
      ctx.fillRect(x - 2, y - 10, 7, 5);
    }
    const landmark = 38 + (d.variant % 4) * 85;
    if (d.variant % 3 === 0) {
      ctx.fillStyle = mix(p.paper, land, 0.3);
      ctx.fillRect(landmark, 129, 12, 49);
      poly(
        ctx,
        [
          [landmark - 3, 129],
          [landmark + 6, 116],
          [landmark + 15, 129],
        ],
        p.ink,
      );
      ctx.strokeStyle = p.accent;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(landmark - 11, 120);
      ctx.lineTo(landmark + 23, 150);
      ctx.moveTo(landmark + 22, 119);
      ctx.lineTo(landmark - 10, 151);
      ctx.stroke();
    } else if (d.variant % 3 === 1) {
      ctx.fillStyle = mix(p.paper, land, 0.4);
      ctx.fillRect(landmark, 128, 25, 38);
      ctx.fillRect(landmark + 29, 140, 13, 26);
      poly(
        ctx,
        [
          [landmark - 2, 128],
          [landmark + 12, 119],
          [landmark + 27, 128],
        ],
        p.ink,
      );
      ctx.fillStyle = p.accent;
      ctx.fillRect(landmark + 5, 138, 5, 4);
      ctx.fillRect(landmark + 15, 150, 5, 4);
    } else {
      ctx.fillStyle = mix(p.paper, p.ink, 0.5);
      ctx.fillRect(landmark, 164, 71, 6);
      ctx.fillRect(landmark + 9, 168, 6, 25);
      ctx.fillRect(landmark + 54, 168, 6, 25);
      ctx.fillStyle = p.accent;
      for (let x = landmark; x < landmark + 72; x += 10) ctx.fillRect(x, 157, 3, 7);
    }
    if (d.scene === 'heritage')
      for (let y = 12; y < 288; y += 20)
        for (const x of [10, 370]) {
          ctx.fillStyle = p.danger;
          ctx.fillRect(x - 3, y, 6, 6);
          ctx.fillStyle = p.accent;
          ctx.fillRect(x - 6, y + 3, 3, 3);
          ctx.fillRect(x + 3, y + 3, 3, 3);
          ctx.fillRect(x - 1, y - 3, 2, 12);
        }
    ctx.fillStyle = mix(p.ink, land, 0.2);
    for (let i = 0; i < 12; i++) {
      const x = 270 + i * 10;
      ctx.fillRect(x, 257 + (i % 3) * 6, 2, 23);
      ctx.fillStyle = p.accent;
      ctx.fillRect(x - 3, 251 + (i % 3) * 6, 8, 7);
      ctx.fillStyle = mix(p.ink, land, 0.2);
    }
  } else {
    ctx.fillStyle = mix(p.ink, p.sky, 0.1);
    ctx.fillRect(0, d.horizon + 30, 384, 288);
    for (let i = 0; i < 20; i++) {
      const x = i * 20,
        height = 22 + Math.floor(rand() * 94);
      ctx.fillStyle = mix(p.ink, p.safe, 0.1 + (i % 3) * 0.08);
      ctx.fillRect(x, d.horizon + 30 - height, 16, height);
      ctx.fillStyle = i % 2 ? p.accent : p.safe;
      for (let wx = x + 3; wx < x + 15; wx += 5)
        for (let wy = d.horizon + 35 - height; wy < d.horizon + 25; wy += 8)
          if (rand() > 0.3) ctx.fillRect(wx, wy, 2, 3);
    }
    const vanish = 96 + d.variant * 22;
    ctx.strokeStyle = mix(p.safe, p.ink, 0.44);
    ctx.lineWidth = 1;
    for (let y = d.horizon + 43; y < 288; y += 12) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(384, y);
      ctx.stroke();
    }
    for (let x = -240; x < 700; x += 48) {
      ctx.beginPath();
      ctx.moveTo(vanish, d.horizon + 28);
      ctx.lineTo(x, 288);
      ctx.stroke();
    }
    if (d.scene === 'network') {
      const nodes = [];
      for (let i = 0; i < 12; i++)
        nodes.push({ x: 42 + (i % 4) * 94 + (i % 2) * 7, y: 181 + Math.floor(i / 4) * 35 });
      ctx.strokeStyle = p.safe;
      for (let i = 1; i < nodes.length; i++) {
        ctx.beginPath();
        ctx.moveTo(nodes[i - 1].x, nodes[i - 1].y);
        ctx.lineTo(nodes[i].x, nodes[i].y);
        ctx.stroke();
      }
      for (const [n, node] of nodes.entries()) {
        ctx.fillStyle = mix(p.paper, p.safe, 0.12);
        ctx.fillRect(node.x - 11, node.y - 8, 22, 16);
        ctx.fillStyle = p.ink;
        ctx.fillRect(node.x - 7, node.y - 4, 14, 2);
        ctx.fillStyle = n % 3 ? p.safe : p.accent;
        ctx.fillRect(node.x - 7, node.y + 1, 8 + (n % 3) * 2, 3);
      }
    } else {
      const x = 46 + (d.variant % 3) * 104,
        y = 207;
      ctx.fillStyle = p.ink;
      ctx.fillRect(x, y, 70, 37);
      ctx.fillStyle = p.safe;
      ctx.fillRect(x + 4, y + 4, 62, 20);
      ctx.fillStyle = mix(p.sky, p.danger, 0.25);
      ctx.fillRect(x + 8, y + 8, 54, 11);
      ctx.fillStyle = p.accent;
      ctx.fillRect(x + 23, y + 29, 22, 3);
      ctx.fillRect(x + 10, y + 43, 58, 4);
      ctx.fillStyle = p.danger;
      ctx.fillRect(x + 55, y + 31, 3, 3);
      for (let i = 0; i < 10; i++) {
        ctx.fillStyle = i % 2 ? p.safe : p.accent;
        ctx.fillRect(18 + Math.floor(rand() * 345), 180 + Math.floor(rand() * 93), 4, 2);
      }
    }
  }
  // A quiet border ties each authored composition together without covering it.
  ctx.strokeStyle = mix(p.accent, p.ink, 0.6);
  ctx.lineWidth = 1;
  ctx.strokeRect(3.5, 3.5, 377, 281);
}
export function createSceneArt(
  theme,
  level = {},
  seed = 0,
  canvasFactory = () => document.createElement('canvas'),
) {
  const canvas = canvasFactory();
  canvas.width = 384;
  canvas.height = 288;
  paintScene(canvas.getContext('2d'), theme, sceneDescriptor(theme, level, seed));
  return canvas;
}
