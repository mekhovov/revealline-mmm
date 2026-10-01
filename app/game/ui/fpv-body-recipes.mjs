// Bounded decorative quadcopter bodies. These immutable drawing recipes know
// neither company IDs nor simulation state; the caller retains role/contact cues.
const define = (value) =>
  Object.freeze({
    ...value,
    motors: Object.freeze(value.motors.map((point) => Object.freeze(point))),
  });

export const FPV_BODY_RECIPES = Object.freeze({
  'fpv-whoop': define({
    motors: [
      [-7, -7],
      [7, -7],
      [-7, 7],
      [7, 7],
    ],
    propRadius: 4.2,
    guardRadius: 5.5,
    bodyWidth: 6,
    bodyLength: 10,
    detail: 'ducts',
  }),
  'fpv-open-x': define({
    motors: [
      [-8.5, -8],
      [8.5, -8],
      [-8.5, 8],
      [8.5, 8],
    ],
    propRadius: 4,
    bodyWidth: 5,
    bodyLength: 12,
    detail: 'carbon-x',
  }),
  'fpv-stretched': define({
    motors: [
      [-6, -9],
      [6, -9],
      [-6, 9],
      [6, 9],
    ],
    propRadius: 3.8,
    bodyWidth: 5.5,
    bodyLength: 16,
    detail: 'twin-rails',
  }),
  'fpv-caged': define({
    motors: [
      [-6.5, -6.5],
      [6.5, -6.5],
      [-6.5, 6.5],
      [6.5, 6.5],
    ],
    propRadius: 3.5,
    bodyWidth: 6,
    bodyLength: 10,
    detail: 'transport-cage',
  }),
  'fpv-antenna': define({
    motors: [
      [-8, -7],
      [8, -7],
      [-8, 6],
      [8, 6],
    ],
    propRadius: 4,
    bodyWidth: 7,
    bodyLength: 10,
    detail: 'orange-antenna',
  }),
  'fpv-survey': define({
    motors: [
      [-9, -6],
      [9, -6],
      [-5, 9],
      [5, 9],
    ],
    propRadius: 3.6,
    bodyWidth: 8,
    bodyLength: 12,
    detail: 'wide-front',
  }),
});

const TAU = Math.PI * 2;
function line(ctx, color, width, points) {
  ctx.strokeStyle = color;
  ctx.lineWidth = width;
  ctx.beginPath();
  points.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
  ctx.stroke();
}
function disc(ctx, color, x, y, radius) {
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.arc(x, y, radius, 0, TAU);
  ctx.fill();
}

function motor(ctx, spec, [x, y], index, frame, colors) {
  if (spec.guardRadius) {
    ctx.strokeStyle = colors.dark;
    ctx.lineWidth = 2.4;
    ctx.beginPath();
    ctx.arc(x, y, spec.guardRadius, 0, TAU);
    ctx.stroke();
    ctx.strokeStyle = colors.light;
    ctx.lineWidth = 1.2;
    ctx.stroke();
  }
  // Use the same alias-safe clock and props-in diagonal pairs as the shared
  // FPV renderer. Legacy frames without that clock retain a finite stopped pose.
  const phase = frame.reduced || !Number.isFinite(frame.rotorPhase) ? 0 : frame.rotorPhase,
    direction = x * y > 0 ? 1 : -1;
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(phase * direction + index * 0.7);
  ctx.scale(1, direction);
  for (let blade = 0; blade < 3; blade++) {
    ctx.rotate(TAU / 3);
    ctx.fillStyle = index < 2 ? colors.light : colors.trim;
    ctx.beginPath();
    ctx.moveTo(-0.5, 0);
    ctx.lineTo(spec.propRadius * 0.55, -1.25);
    ctx.lineTo(spec.propRadius, -0.55);
    ctx.lineTo(spec.propRadius * 0.85, 0.75);
    ctx.lineTo(0, 0.6);
    ctx.closePath();
    ctx.fill();
  }
  // Four separate bright motor hubs remain legible with stopped propellers.
  disc(ctx, colors.dark, 0, 0, 1.6);
  disc(ctx, colors.body, 0, 0, 1.05);
  ctx.restore();
}

export function drawFpvBodyRecipe(ctx, frame, colors) {
  const spec = FPV_BODY_RECIPES[frame.bodyRecipe];
  if (!spec || !Object.hasOwn(FPV_BODY_RECIPES, frame.bodyRecipe)) return false;
  ctx.save();
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  if (spec.detail === 'transport-cage') {
    // Open protective case, with the complete quad visible inside it.
    ctx.fillStyle = colors.dark;
    ctx.fillRect(-13, -12, 26, 24);
    ctx.strokeStyle = colors.trim;
    ctx.lineWidth = 1.5;
    ctx.strokeRect(-12, -11, 24, 22);
    for (const x of [-12, 9]) {
      ctx.fillStyle = colors.light;
      ctx.fillRect(x, -11, 3, 3);
      ctx.fillRect(x, 8, 3, 3);
    }
    line(ctx, colors.trim, 2, [
      [-3, 12],
      [-3, 13],
      [3, 13],
      [3, 12],
    ]);
  }
  for (const [x, y] of spec.motors) {
    line(ctx, colors.light, 4.1, [
      [0, y * 0.15],
      [x, y],
    ]);
    line(ctx, colors.dark, 2.8, [
      [0, y * 0.15],
      [x, y],
    ]);
    // A restrained weave accent keeps the four arms visibly carbon-like.
    line(ctx, colors.trim, 0.7, [
      [x * 0.45 - 0.6, y * 0.55],
      [x * 0.45 + 0.6, y * 0.55 - 1],
    ]);
  }
  if (spec.detail === 'twin-rails')
    for (const x of [-3.7, 3.7])
      line(ctx, colors.light, 1.2, [
        [x, -8],
        [x, 8],
      ]);
  if (spec.detail === 'wide-front')
    line(ctx, colors.light, 2, [
      [-9, -6],
      [-4, -8.5],
      [4, -8.5],
      [9, -6],
    ]);
  ctx.fillStyle = colors.dark;
  ctx.fillRect(
    -spec.bodyWidth / 2 - 1,
    -spec.bodyLength / 2 - 1,
    spec.bodyWidth + 2,
    spec.bodyLength + 2,
  );
  ctx.fillStyle = colors.body;
  ctx.fillRect(-spec.bodyWidth / 2, -spec.bodyLength / 2, spec.bodyWidth, spec.bodyLength);
  ctx.fillStyle = colors.trim;
  ctx.fillRect(-spec.bodyWidth / 2, -1.5, spec.bodyWidth, 3);
  // Lens at the nose, opposite rear antenna/strap details; no aiming ray.
  ctx.fillStyle = colors.light;
  ctx.fillRect(-2.8, -spec.bodyLength / 2 - 2.5, 5.6, 3.5);
  disc(ctx, colors.dark, 0, -spec.bodyLength / 2 - 0.8, 1.4);
  if (spec.detail === 'orange-antenna') {
    line(ctx, '#FF9748', 1.8, [
      [0, 5],
      [0, 11],
      [-4, 12.5],
    ]);
    line(ctx, '#FF9748', 1.8, [
      [0, 11],
      [4, 12.5],
    ]);
    disc(ctx, '#FF9748', -4, 12.5, 1.2);
    disc(ctx, '#FF9748', 4, 12.5, 1.2);
  } else if (spec.detail === 'carbon-x')
    line(ctx, colors.trim, 1.5, [
      [0, 6],
      [0, 11],
    ]);
  spec.motors.forEach((anchor, index) => motor(ctx, spec, anchor, index, frame, colors));
  ctx.restore();
  return true;
}
