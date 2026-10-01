import { componentPose, rotorAnchors } from './animation.mjs';
import { paintRotor } from '../../game/ui/rotor-presentation.mjs';
import { paintBodyBacking } from '../../game/ui/body-backing.mjs';

const TAU = Math.PI * 2;
const polygon = (ctx, points) => {
  ctx.beginPath();
  points.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
  ctx.closePath();
  ctx.fill();
};

// Source anchors use the actual contained image rectangle, including any transparent source padding.
export function fittedBodySize(body, image, scale = 1) {
  const width = body.widthCells * scale,
    height = body.heightCells * scale;
  if (!image) return { width, height };
  const sourceWidth = image.naturalWidth ?? image.width,
    sourceHeight = image.naturalHeight ?? image.height;
  const factor = Math.min(width / sourceWidth, height / sourceHeight);
  return { width: sourceWidth * factor, height: sourceHeight * factor };
}

function drawEffect(ctx, component, animation, width, height, speedRatio, reduced, pixel) {
  const pose = componentPose(component, animation, speedRatio, reduced);
  for (const [x, y, side = 1] of component.anchors || []) {
    ctx.save();
    ctx.translate(x * width, y * height);
    if (component.type === 'wings') {
      ctx.scale(side, 1);
      ctx.rotate(pose.angle * side);
      const span = pose.span * width,
        chord = component.chord * height;
      ctx.fillStyle = component.color;
      polygon(ctx, [
        [0, -chord * 0.3],
        [span * 0.32, -chord * 0.5],
        [span * 0.78, -chord * 0.25],
        [span, 0],
        [span * 0.87, chord * 0.22],
        [span * 0.64, chord * 0.28],
        [span * 0.6, chord * 0.48],
        [span * 0.33, chord * 0.4],
        [0, chord * 0.25],
      ]);
      ctx.fillStyle = component.tipColor;
      polygon(ctx, [
        [span * 0.66, -chord * 0.25],
        [span, 0],
        [span * 0.87, chord * 0.22],
        [span * 0.64, chord * 0.28],
        [span * 0.6, chord * 0.48],
        [span * 0.5, chord * 0.32],
      ]);
    } else if (component.type === 'thruster') {
      const w = component.width * width,
        length = pose.length * height;
      ctx.fillStyle = component.color;
      polygon(ctx, [
        [-w / 2, 0],
        [w / 2, 0],
        [w / 2, length * 0.35],
        [w * 0.25, length * 0.35],
        [w * 0.25, length * 0.72],
        [0, length],
        [-w * 0.25, length * 0.72],
        [-w * 0.25, length * 0.35],
        [-w / 2, length * 0.35],
      ]);
      ctx.fillStyle = component.innerColor;
      ctx.fillRect(-w * 0.22, 0, w * 0.44, length * 0.48);
    } else if (component.type === 'pulse') {
      ctx.globalAlpha = pose.opacity;
      ctx.strokeStyle = component.color;
      ctx.lineWidth = Math.max(pixel, width * 0.013);
      ctx.beginPath();
      ctx.ellipse(0, 0, pose.radius * width, pose.radius * height * 0.7, 0, 0, TAU);
      ctx.stroke();
    } else if (component.type === 'blink') {
      ctx.globalAlpha = pose.opacity;
      ctx.fillStyle = component.color;
      const size = component.size * width;
      ctx.fillRect(-size / 2, -size / 2, size, size);
    }
    ctx.restore();
  }
}

function drawRotors(
  ctx,
  body,
  component,
  animation,
  width,
  height,
  reduced,
  pixel,
  slowInspection,
) {
  const rate = animation.rates[component.id];
  for (const anchor of rotorAnchors(body)) {
    const radius = component.radius * anchor.radiusScale * width;
    const phase = reduced ? 0 : animation.phases[component.id] || 0;
    const offset = ((anchor.phaseDegrees + component.phaseDegrees) * Math.PI) / 180;
    ctx.save();
    ctx.translate(anchor.x * width, anchor.y * height);
    paintRotor(ctx, {
      radius,
      phase: phase * component.direction * anchor.direction + offset,
      direction: component.direction * anchor.direction,
      bladeCount: anchor.bladeCount ?? component.bladeCount,
      bladeWidth: component.bladeWidth,
      bladeShape: component.bladeShape,
      fillColor: component.fillColor,
      tipColor: component.tipColor,
      hubColor: component.hubColor,
      blurOpacity:
        !reduced && !slowInspection && rate?.rawRps > 5
          ? component.blurOpacity * Math.min(rate.rawRps / 17, 1)
          : 0,
      pixel,
    });
    ctx.restore();
  }
}

export function paintCharacter(
  ctx,
  {
    body,
    image,
    recipe,
    animation,
    colors,
    scale = 1,
    x = 0,
    y = 0,
    heading = 0,
    bank = 0,
    speedRatio = 0,
    reducedMotion = false,
    showRotors = true,
    pixel = 0.05,
    inspectionSlow = false,
  },
) {
  const { width, height } = fittedBodySize(body, image, scale);
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(heading + (body.headingOffsetDegrees * Math.PI) / 180);
  const tilt = reducedMotion ? 0 : bank;
  ctx.transform(1, 0, tilt, 1 - Math.abs(tilt) * 0.35, 0, 0);
  ctx.fillStyle = 'rgba(0,0,0,.4)';
  ctx.beginPath();
  ctx.ellipse(0.04, 0.08, width * 0.23, height * 0.25, 0, 0, TAU);
  ctx.fill();
  // Attachments are omitted when their body image is unavailable: the neutral marker stays honest.
  if (image)
    for (const component of recipe.components.filter((c) =>
      ['wings', 'thruster', 'pulse'].includes(c.type),
    ))
      drawEffect(ctx, component, animation, width, height, speedRatio, reducedMotion, pixel);
  if (image) {
    paintBodyBacking(ctx, body, image, width, height);
    ctx.imageSmoothingEnabled = body.sampling === 'linear';
    ctx.shadowColor = colors.body;
    ctx.shadowBlur = 1.2;
    const pivot = body.presentationPivot || { x: 0.5, y: 0.5 };
    ctx.drawImage(image, -width * pivot.x, -height * pivot.y, width, height);
    ctx.shadowBlur = 0;
    if (body.centerMark) {
      const w = body.centerMark.widthCells * scale,
        h = body.centerMark.heightCells * scale;
      ctx.fillStyle = body.centerMark.topColor;
      ctx.fillRect(-w / 2, -h / 2, w, h / 2);
      ctx.fillStyle = body.centerMark.bottomColor;
      ctx.fillRect(-w / 2, 0, w, h / 2);
    }
  } else {
    ctx.fillStyle = colors.body;
    polygon(ctx, [
      [0, -height * 0.38],
      [width * 0.27, height * 0.28],
      [0, height * 0.13],
      [-width * 0.27, height * 0.28],
    ]);
    ctx.fillStyle = colors.accent;
    ctx.fillRect(-width * 0.04, -height * 0.22, width * 0.08, height * 0.2);
  }
  if (image)
    for (const component of recipe.components) {
      if (component.type === 'rotors' && showRotors)
        drawRotors(
          ctx,
          body,
          component,
          animation,
          width,
          height,
          reducedMotion,
          pixel,
          inspectionSlow,
        );
      if (component.type === 'blink')
        drawEffect(ctx, component, animation, width, height, speedRatio, reducedMotion, pixel);
    }
  ctx.restore();
}
