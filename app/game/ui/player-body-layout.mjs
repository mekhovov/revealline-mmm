import { fittedBodySize } from '../../authoring/motion-lab/render-character.mjs';
import { rotorAnchors } from '../../authoring/motion-lab/animation.mjs';

// Bounds are in cells, matching paintCharacter. Team uses a different painter.
export function playerBodyBounds({
  body,
  image,
  recipe,
  scale,
  heading,
  bank,
  reducedMotion,
  pixel = 1 / 16,
}) {
  const { width, height } = fittedBodySize(body, image, scale),
    angle = heading + (body.headingOffsetDegrees * Math.PI) / 180,
    cosine = Math.cos(angle),
    sine = Math.sin(angle),
    tilt = reducedMotion ? 0 : bank,
    squash = 1 - Math.abs(tilt) * 0.35;
  let left = Infinity,
    top = Infinity,
    right = -Infinity,
    bottom = -Infinity;
  const point = (x, y) => {
    const sx = x + tilt * y,
      sy = y * squash,
      xx = sx * cosine - sy * sine,
      yy = sx * sine + sy * cosine;
    left = Math.min(left, xx);
    top = Math.min(top, yy);
    right = Math.max(right, xx);
    bottom = Math.max(bottom, yy);
  };
  const rectangle = (x, y, w, h) => {
    for (const [xx, yy] of [
      [x, y],
      [x + w, y],
      [x, y + h],
      [x + w, y + h],
    ])
      point(xx, yy);
  };
  // Includes the shared renderer's small offset shadow, but not its diffuse glow.
  rectangle(0.04 - width * 0.23, 0.08 - height * 0.25, width * 0.46, height * 0.5);
  if (!image) {
    rectangle(-width * 0.27, -height * 0.38, width * 0.54, height * 0.66);
    return { left, top, right, bottom };
  }
  const pivot = body.presentationPivot || { x: 0.5, y: 0.5 };
  rectangle(-width * pivot.x, -height * pivot.y, width, height);
  if (body.centerMark) {
    const w = body.centerMark.widthCells * scale,
      h = body.centerMark.heightCells * scale;
    rectangle(-w / 2, -h / 2, w, h);
  }
  for (const component of recipe.components) {
    if (component.type === 'rotors') {
      for (const anchor of rotorAnchors(body)) {
        const radius = component.radius * anchor.radiusScale * width,
          // Every phase of all three blade polygons, blur disc, stroke and hub.
          reach = Math.max(
            radius * Math.hypot(1, component.bladeWidth * 0.7),
            radius + Math.max(pixel * 0.7, width * 0.006) / 2,
            Math.max(width * 0.027, pixel * 0.7) / 2,
          );
        rectangle(anchor.x * width - reach, anchor.y * height - reach, reach * 2, reach * 2);
      }
      continue;
    }
    // Reserve the complete animation envelope so effects cannot jiggle the body
    // against an edge. These maxima match componentPose's bounded speed/phase.
    for (const [x, y] of component.anchors || []) {
      const ox = x * width,
        oy = y * height;
      if (component.type === 'wings') {
        const reach = Math.hypot(component.span * width, component.chord * height * 0.5);
        rectangle(ox - reach, oy - reach, reach * 2, reach * 2);
      } else if (component.type === 'thruster')
        rectangle(
          ox - (component.width * width) / 2,
          oy,
          component.width * width,
          component.length * (0.25 + 2 * component.speedGain) * height,
        );
      else if (component.type === 'pulse') {
        const stroke = Math.max(pixel, width * 0.013) / 2,
          radius = component.radius + component.amplitude,
          rx = radius * width + stroke,
          ry = radius * height * 0.7 + stroke;
        rectangle(ox - rx, oy - ry, rx * 2, ry * 2);
      } else if (component.type === 'blink') {
        const size = component.size * width;
        rectangle(ox - size / 2, oy - size / 2, size, size);
      }
    }
  }
  return { left, top, right, bottom };
}

// Move only the illustration. Preserve fractional contact coordinates exactly.
export function playerBodyOffset(pose, { x, y, width, height, margin = 0 }) {
  const bounds = playerBodyBounds(pose);
  const inset = (position, low, high) =>
    low <= high ? Math.max(low, Math.min(high, position)) - position : (low + high) / 2 - position;
  if (![x, y, width, height, margin, ...Object.values(bounds)].every(Number.isFinite))
    return { x: 0, y: 0 };
  return {
    x: inset(x, margin - bounds.left, width - margin - bounds.right),
    y: inset(y, margin - bounds.top, height - margin - bounds.bottom),
  };
}
