import { validateBodyBacking } from './body-motion.mjs';

/** Find only enclosed transparent regions. Flooding from the border preserves
 * exterior transparency, padding and every original antialiased outer edge. */
export function interiorAlphaMask(rgba, width, height) {
  if (
    !Number.isSafeInteger(width) ||
    !Number.isSafeInteger(height) ||
    width < 1 ||
    height < 1 ||
    width * height > 4 * 1024 * 1024 ||
    rgba.length !== width * height * 4
  )
    throw new TypeError('Invalid identity image bounds.');
  const size = width * height,
    outside = new Uint8Array(size),
    queue = new Uint32Array(size);
  let next = 0,
    end = 0;
  const visit = (i) => {
    if (!outside[i] && rgba[i * 4 + 3] < 255) {
      outside[i] = 1;
      queue[end++] = i;
    }
  };
  for (let x = 0; x < width; x++) {
    visit(x);
    visit((height - 1) * width + x);
  }
  for (let y = 0; y < height; y++) {
    visit(y * width);
    visit(y * width + width - 1);
  }
  while (next < end) {
    const i = queue[next++],
      x = i % width;
    if (x > 0) visit(i - 1);
    if (x + 1 < width) visit(i + 1);
    if (i >= width) visit(i - width);
    if (i + width < size) visit(i + width);
  }
  return outside.map((value, i) => (!value && rgba[i * 4 + 3] < 255 ? 255 : 0));
}

const masks = new WeakMap();
function interiorImage(image, color) {
  let variants = masks.get(image);
  if (!variants) {
    variants = new Map();
    masks.set(image, variants);
  }
  if (variants.has(color)) return variants.get(color);
  const width = image.naturalWidth ?? image.width,
    height = image.naturalHeight ?? image.height;
  const canvas =
    typeof OffscreenCanvas === 'function'
      ? new OffscreenCanvas(width, height)
      : document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  ctx.drawImage(image, 0, 0);
  const data = ctx.getImageData(0, 0, width, height),
    mask = interiorAlphaMask(data.data, width, height);
  const rgb = [1, 3, 5].map((at) => parseInt(color.slice(at, at + 2), 16));
  for (let i = 0; i < mask.length; i++) {
    data.data[i * 4] = rgb[0];
    data.data[i * 4 + 1] = rgb[1];
    data.data[i * 4 + 2] = rgb[2];
    data.data[i * 4 + 3] = mask[i];
  }
  ctx.putImageData(data, 0, 0);
  variants.set(color, canvas);
  return canvas;
}

export function paintBodyBacking(ctx, body, image, width, height) {
  const backing = validateBodyBacking(body);
  if (!backing) return;
  if (backing.kind === 'disc') {
    ctx.fillStyle = backing.color;
    ctx.beginPath();
    ctx.arc(0, 0, Math.min(width, height) * backing.radiusRatio, 0, Math.PI * 2);
    ctx.fill();
  } else {
    const pivot = body.presentationPivot ?? { x: 0.5, y: 0.5 };
    ctx.drawImage(
      interiorImage(image, backing.color),
      -width * pivot.x,
      -height * pivot.y,
      width,
      height,
    );
  }
}
